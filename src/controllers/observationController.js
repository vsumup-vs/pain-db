const { PrismaClient } = require('@prisma/client');
const { evaluateObservation } = require('../services/alertEvaluationService');
const { updateAlertRiskScores } = require('../services/riskScoringService');
const { findBillingEnrollment } = require('../utils/billingHelpers');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

// Create a new observation
// Optimized createObservation function
const createObservation = async (req, res) => {
  try {
    const {
      patientId,
      metricDefinitionId,
      enrollmentId,
      value,
      notes,
      recordedAt,
      recordedBy,
      location,
      context
    } = req.body;

    // Validate required fields (enrollmentId is now optional - will auto-detect)
    if (!patientId || !metricDefinitionId || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'PatientId, metricDefinitionId, and value are required'
      });
    }

    // OPTIMIZATION 1: Batch all validation queries into a single Promise.all
    const queries = [
      prisma.patient.findUnique({
        where: { id: patientId },
        select: {
          id: true,
          medicalRecordNumber: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              type: true,
              name: true
            }
          }
        }
      }),
      prisma.metricDefinition.findUnique({
        where: { id: metricDefinitionId },
        select: {
          id: true,
          key: true,
          displayName: true,
          valueType: true,
          unit: true,
          scaleMin: true,
          scaleMax: true,
          normalRange: true
        }
      })
    ];

    // Only fetch enrollment if enrollmentId is provided
    if (enrollmentId) {
      queries.push(
        prisma.enrollment.findUnique({
          where: { id: enrollmentId },
          select: { id: true, patientId: true, status: true } // Only select needed fields
        })
      );
    }

    const results = await Promise.all(queries);
    const patient = results[0];
    const metricDefinition = results[1];
    const enrollment = enrollmentId ? results[2] : null;

    // OPTIMIZATION 2: Batch validation checks
    const validationErrors = [];

    if (!patient) validationErrors.push('Patient not found');
    if (!metricDefinition) validationErrors.push('Metric definition not found');

    // Block PLATFORM organizations from creating observations (patient-care feature)
    if (patient && patient.organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Observation creation is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Only validate enrollment if it was provided
    if (enrollmentId) {
      if (!enrollment) validationErrors.push('Enrollment not found');

      if (enrollment && enrollment.patientId !== patientId) {
        validationErrors.push('Enrollment does not belong to the specified patient');
      }

      if (enrollment && enrollment.status !== 'ACTIVE') {
        validationErrors.push('Enrollment is not active');
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: validationErrors.join(', ')
      });
    }

    // OPTIMIZATION 3: Simplified value validation
    const validationResult = validateValueAgainstMetric(value, metricDefinition);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid value for metric definition',
        errors: validationResult.errors
      });
    }

    // Get organizationId from request context (for creating the observation record)
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Organization context required'
      });
    }

    // Auto-detect billing enrollment if not provided
    // IMPORTANT: Use patient's organizationId for finding billing enrollment,
    // not the clinician's organizationId from the request context.
    // This handles cross-organization scenarios where a clinician manages patients in different orgs.
    let finalEnrollmentId = enrollmentId;
    if (!finalEnrollmentId && patient.organizationId) {
      finalEnrollmentId = await findBillingEnrollment(patientId, patient.organizationId);
    }

    // OPTIMIZATION 4: Create observation with minimal includes
    const observation = await prisma.observation.create({
      data: {
        organizationId,  // SECURITY: Always include organizationId
        patientId: patientId,
        enrollmentId: finalEnrollmentId,  // Link to billing enrollment for accurate billing
        metricId: metricDefinitionId,  // Schema uses metricId, not metricDefinitionId
        value: validationResult.processedValue,  // Schema uses single JSON value field
        unit: metricDefinition.unit,
        source: recordedBy === 'DEVICE' ? 'DEVICE' : recordedBy === 'API' ? 'API' : 'MANUAL',
        context: context || 'CLINICAL_MONITORING',
        notes: notes,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date()
      },
      select: {
        id: true,
        patientId: true,
        metricId: true,
        recordedAt: true,
        value: true,
        organizationId: true
      }
    });

    // ALERT EVALUATION: Automatically evaluate observation against alert rules
    // This runs asynchronously to avoid blocking the response
    // Construct full observation object for evaluation
    const fullObservation = {
      ...observation,
      metricId: observation.metricId,
      value: observation.value
    };

    setImmediate(async () => {
      try {
        const triggeredAlerts = await evaluateObservation(fullObservation);
        if (triggeredAlerts.length > 0) {
          console.log(`🚨 ${triggeredAlerts.length} alert(s) triggered for observation ${observation.id}`);
        }

        // Update risk scores for existing alerts with new observation data
        const riskUpdateResult = await updateAlertRiskScores(
          observation.patientId,
          observation.metricId
        );
        if (riskUpdateResult.updated > 0) {
          console.log(`📊 Updated risk scores for ${riskUpdateResult.updated} existing alert(s)`);
        }
      } catch (error) {
        console.error('Error evaluating observation for alerts:', error);
        // Don't fail the observation creation if alert evaluation fails
      }
    });

    res.status(201).json({
      success: true,
      message: 'Observation recorded successfully',
      data: observation
    });
  } catch (error) {
    console.error('Error creating observation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all observations with filtering and pagination
const getAllObservations = async (req, res) => {
  try {
    const {
      patientId,
      metricDefinitionId,
      startDate,
      endDate,
      recordedBy,
      page = 1,
      limit = 20,
      sortBy = 'recordedAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Build filter conditions
    const where = {
      organizationId  // SECURITY: Always filter by organization
    };
    if (patientId) where.patientId = patientId;
    if (metricDefinitionId) where.metricDefinitionId = metricDefinitionId;
    if (recordedBy) where.recordedBy = recordedBy;
    
    // Fix date filtering to handle empty strings properly
    const validStartDate = startDate && startDate.trim() !== '';
    const validEndDate = endDate && endDate.trim() !== '';
    
    if (validStartDate || validEndDate) {
      where.recordedAt = {};
      if (validStartDate) {
        const parsedStartDate = new Date(startDate);
        if (!isNaN(parsedStartDate.getTime())) {
          where.recordedAt.gte = parsedStartDate;
        }
      }
      if (validEndDate) {
        const parsedEndDate = new Date(endDate);
        if (!isNaN(parsedEndDate.getTime())) {
          where.recordedAt.lte = parsedEndDate;
        }
      }
    }

    const [observations, total] = await Promise.all([
      prisma.observation.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true }
          },
          metric: {
            select: { id: true, key: true, displayName: true, valueType: true, unit: true }
          }
        }
      }),
      prisma.observation.count({ where })
    ]);

    res.json({
      success: true,
      data: observations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching observations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get observation by ID
const getObservationById = async (req, res) => {
  try {
    const { id } = req.params;

    const observation = await prisma.observation.findUnique({
      where: { id },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, dateOfBirth: true }
        },
        metric: {
          select: {
            id: true,
            key: true,
            displayName: true,
            valueType: true,
            unit: true,
            scaleMin: true,
            scaleMax: true
          }
        }
      }
    });

    if (!observation) {
      return res.status(404).json({
        success: false,
        message: 'Observation not found'
      });
    }

    res.json({
      success: true,
      data: observation
    });
  } catch (error) {
    console.error('Error fetching observation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update observation
const updateObservation = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if observation exists
    const existingObservation = await prisma.observation.findUnique({
      where: { id: parseInt(id) },
      include: {
        metric: true
      }
    });

    if (!existingObservation) {
      return res.status(404).json({
        success: false,
        message: 'Observation not found'
      });
    }

    // If value is being updated, validate it
    if (updateData.value !== undefined) {
      const validationResult = validateValueAgainstMetric(
        updateData.value, 
        existingObservation.metricDefinition
      );
      
      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid value for metric definition',
          errors: validationResult.errors
        });
      }
      
      updateData.value = validationResult.processedValue;
    }

    // Convert recordedAt to Date if provided
    if (updateData.recordedAt) {
      updateData.recordedAt = new Date(updateData.recordedAt);
    }

    const updatedObservation = await prisma.observation.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true }
        },
        metric: {
          select: { id: true, key: true, displayName: true, valueType: true, unit: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Observation updated successfully',
      data: updatedObservation
    });
  } catch (error) {
    console.error('Error updating observation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete observation
const deleteObservation = async (req, res) => {
  try {
    const { id } = req.params;

    const existingObservation = await prisma.observation.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingObservation) {
      return res.status(404).json({
        success: false,
        message: 'Observation not found'
      });
    }

    await prisma.observation.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Observation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting observation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get patient observation history
const getPatientObservationHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const {
      metricDefinitionId,
      startDate,
      endDate,
      limit = 50,
      groupBy = 'day'
    } = req.query;

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId } // Remove parseInt()
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    const where = {
      patientId: patientId // Remove parseInt()
    };

    if (metricDefinitionId) {
      where.metricDefinitionId = metricDefinitionId; // Remove parseInt()
    }

    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) where.recordedAt.gte = new Date(startDate);
      if (endDate) where.recordedAt.lte = new Date(endDate);
    }

    const observations = await prisma.observation.findMany({
      where,
      take: parseInt(limit),
      orderBy: { recordedAt: 'desc' },
      include: {
        metric: {
          select: {
            id: true,
            key: true,
            displayName: true,
            valueType: true,
            scaleMin: true,
            scaleMax: true
          }
        }
      }
    });

    // Group observations by metric and time period
    const groupedData = groupObservationsByMetricAndTime(observations, groupBy);

    res.json({
      success: true,
      data: {
        patient: {
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName
        },
        observations,
        groupedData,
        summary: {
          totalObservations: observations.length,
          dateRange: {
            earliest: observations.length > 0 ? observations[observations.length - 1].recordedAt : null,
            latest: observations.length > 0 ? observations[0].recordedAt : null
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching patient observation history:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get observation statistics
const getObservationStats = async (req, res) => {
  try {
    const {
      patientId,
      metricDefinitionId,
      startDate,
      endDate
    } = req.query;

    const where = {};
    if (patientId) where.patientId = patientId; // Remove parseInt()
    if (metricDefinitionId) where.metricDefinitionId = metricDefinitionId; // Remove parseInt()
    
    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) where.recordedAt.gte = new Date(startDate);
      if (endDate) where.recordedAt.lte = new Date(endDate);
    }

    const [totalObservations, observationsByMetric, recentObservations] = await Promise.all([
      prisma.observation.count({ where }),
      prisma.observation.groupBy({
        by: ['metricDefinitionId'],
        where,
        _count: { id: true },
        _avg: { valueNumeric: true },
        _min: { valueNumeric: true },
        _max: { valueNumeric: true }
      }),
      prisma.observation.findMany({
        where,
        take: 10,
        orderBy: { recordedAt: 'desc' },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true }
          },
          metric: {
            select: { id: true, key: true, displayName: true, valueType: true, unit: true }
          }
        }
      })
    ]);

    // Get metric names for the grouped data
    const metricIds = observationsByMetric.map(item => item.metricDefinitionId);
    const metrics = await prisma.metricDefinition.findMany({
      where: { id: { in: metricIds } },
      select: { id: true, key: true, displayName: true, unit: true }
    });

    const enrichedStats = observationsByMetric.map(stat => {
      const metric = metrics.find(m => m.id === stat.metricDefinitionId);
      return {
        ...stat,
        metricName: metric?.displayName || 'Unknown',
        unit: metric?.unit
      };
    });

    res.json({
      success: true,
      data: {
        totalObservations,
        observationsByMetric: enrichedStats,
        recentObservations
      }
    });
  } catch (error) {
    console.error('Error fetching observation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Bulk create observations
const bulkCreateObservations = async (req, res) => {
  try {
    const { observations } = req.body;

    if (!Array.isArray(observations) || observations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Observations array is required and must not be empty'
      });
    }

    if (observations.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 100 observations allowed per bulk operation'
      });
    }

    // Validate all observations
    const validationErrors = [];
    const processedObservations = [];

    for (let i = 0; i < observations.length; i++) {
      const obs = observations[i];
      
      if (!obs.patientId || !obs.metricDefinitionId || obs.value === undefined) {
        validationErrors.push({
          index: i,
          error: 'PatientId, metricDefinitionId, and value are required'
        });
        continue;
      }

      // Get metric definition for validation
      const metricDefinition = await prisma.metricDefinition.findUnique({
        where: { id: parseInt(obs.metricDefinitionId) }
      });

      if (!metricDefinition) {
        validationErrors.push({
          index: i,
          error: 'Metric definition not found'
        });
        continue;
      }

      if (!metricDefinition.isActive) {
        validationErrors.push({
          index: i,
          error: 'Metric definition is not active'
        });
        continue;
      }

      const validationResult = validateValueAgainstMetric(obs.value, metricDefinition);
      if (!validationResult.isValid) {
        validationErrors.push({
          index: i,
          error: 'Invalid value for metric definition',
          details: validationResult.errors
        });
        continue;
      }

      processedObservations.push({
        patientId: parseInt(obs.patientId),
        metricDefinitionId: parseInt(obs.metricDefinitionId),
        value: validationResult.processedValue,
        notes: obs.notes,
        recordedAt: obs.recordedAt ? new Date(obs.recordedAt) : new Date(),
        recordedBy: obs.recordedBy,
        location: obs.location,
        context: obs.context
      });
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors found',
        errors: validationErrors
      });
    }

    // Create all observations in a transaction
    const createdObservations = await prisma.$transaction(
      processedObservations.map(obs => 
        prisma.observation.create({
          data: obs,
          include: {
            patient: {
              select: { id: true, firstName: true, lastName: true }
            },
            metric: {
              select: { id: true, key: true, displayName: true, valueType: true, unit: true }
            }
          }
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `${createdObservations.length} observations created successfully`,
      data: createdObservations
    });
  } catch (error) {
    console.error('Error bulk creating observations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Helper function to validate value against metric definition
function validateValueAgainstMetric(value, metricDefinition) {
  let isValid = true;
  let errors = [];
  let processedValue = value;

  switch (metricDefinition.dataType) {
    case 'NUMERIC':
      const numValue = parseFloat(value);
      if (isNaN(numValue)) {
        isValid = false;
        errors.push('Value must be a number');
      } else {
        processedValue = numValue;
        if (numValue < metricDefinition.minValue) {
          isValid = false;
          errors.push(`Value must be >= ${metricDefinition.minValue}`);
        }
        if (numValue > metricDefinition.maxValue) {
          isValid = false;
          errors.push(`Value must be <= ${metricDefinition.maxValue}`);
        }
      }
      break;

    case 'CATEGORICAL':
      if (!metricDefinition.validValues.includes(value)) {
        isValid = false;
        errors.push(`Value must be one of: ${metricDefinition.validValues.join(', ')}`);
      }
      break;

    case 'TEXT':
      if (typeof value !== 'string') {
        isValid = false;
        errors.push('Value must be a string');
      }
      break;

    case 'BOOLEAN':
      if (typeof value !== 'boolean') {
        isValid = false;
        errors.push('Value must be a boolean');
      }
      break;
  }

  return { isValid, errors, processedValue };
}

// Helper function to group observations by metric and time
function groupObservationsByMetricAndTime(observations, groupBy) {
  const grouped = {};

  observations.forEach(obs => {
    const metricName = obs.metric?.displayName || obs.metricDefinition?.displayName || 'Unknown';
    const date = new Date(obs.recordedAt);
    
    let timeKey;
    switch (groupBy) {
      case 'hour':
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
        break;
      case 'day':
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        timeKey = `${weekStart.getFullYear()}-W${Math.ceil((weekStart.getDate()) / 7)}`;
        break;
      case 'month':
        timeKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      default:
        timeKey = date.toISOString().split('T')[0];
    }

    if (!grouped[metricName]) {
      grouped[metricName] = {};
    }
    
    if (!grouped[metricName][timeKey]) {
      grouped[metricName][timeKey] = [];
    }
    
    grouped[metricName][timeKey].push({
      value: obs.value,
      recordedAt: obs.recordedAt,
      notes: obs.notes
    });
  });

  return grouped;
}

// Get observations by enrollment ID
const getObservationsByEnrollment = async (req, res) => {
  try {
    const { enrollmentId } = req.params;

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollmentId format. Must be a valid UUID.'
      });
    }

    // Verify enrollment exists
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const observations = await prisma.observation.findMany({
      where: { enrollmentId },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true }
        },
        metric: {
          select: { id: true, key: true, displayName: true, valueType: true, unit: true }
        }
      },
      orderBy: { recordedAt: 'desc' }
    });

    res.json({
      success: true,
      data: observations
    });
  } catch (error) {
    console.error('Error getting observations by enrollment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get unreviewed observations (for Review Queue)
 * GET /api/observations/review/unreviewed
 */
const getUnreviewedObservations = async (req, res) => {
  try {
    const organizationId = req.organizationId || req.user?.currentOrganization;
    const { enrollmentId, metricId, limit = 50, offset = 0 } = req.query;

    if (!organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Organization context required'
      });
    }

    // Build where clause
    const where = {
      organizationId,
      review_status: 'PENDING',
      // Exclude observations that have active (PENDING or ACKNOWLEDGED) alerts
      alerts_alerts_observation_idToobservations: {
        none: {
          status: { in: ['PENDING', 'ACKNOWLEDGED'] }
        }
      }
    };

    if (enrollmentId) {
      where.enrollmentId = enrollmentId;
    }

    if (metricId) {
      where.metricId = metricId;
    }

    // Get unreviewed observations
    const observations = await prisma.observation.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true
          }
        },
        metric: {
          select: {
            id: true,
            displayName: true,
            unit: true,
            normalRange: true
          }
        },
        enrollment: {
          select: {
            id: true,
            careProgram: {
              select: {
                name: true,
                type: true
              }
            }
          }
        }
      },
      orderBy: { recordedAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    // Count total
    const total = await prisma.observation.count({ where });

    res.json({
      success: true,
      data: observations,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error getting unreviewed observations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Mark single observation as reviewed
 * POST /api/observations/review/:id
 */
const reviewObservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    const currentUserId = req.user?.userId;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!currentUserId || !organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Find clinician ID for current user (match by email)
    const userEmail = req.user?.userData?.email || req.user?.email;
    const clinician = await prisma.clinician.findFirst({
      where: {
        email: userEmail,
        organizationId
      },
      select: { id: true }
    });

    if (!clinician) {
      return res.status(403).json({
        success: false,
        error: 'Clinician profile required to review observations'
      });
    }

    // Check observation exists and belongs to organization
    const observation = await prisma.observation.findFirst({
      where: { id, organizationId }
    });

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: 'Observation not found'
      });
    }

    // Update observation as reviewed
    const updatedObservation = await prisma.observation.update({
      where: { id },
      data: {
        review_status: 'REVIEWED',
        reviewed_at: new Date(),
        reviewed_by: clinician.id,
        review_method: 'MANUAL',
        review_notes: reviewNotes || 'Reviewed via Review Queue'
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        metric: {
          select: {
            displayName: true,
            unit: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedObservation,
      message: 'Observation marked as reviewed'
    });
  } catch (error) {
    console.error('Error reviewing observation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Bulk review multiple observations
 * POST /api/observations/review/bulk
 */
const bulkReviewObservations = async (req, res) => {
  try {
    const { observationIds, reviewNotes } = req.body;
    const currentUserId = req.user?.userId;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!currentUserId || !organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!observationIds || !Array.isArray(observationIds) || observationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'observationIds array is required'
      });
    }

    // Find clinician ID for current user (match by email)
    const userEmail = req.user?.userData?.email || req.user?.email;
    const clinician = await prisma.clinician.findFirst({
      where: {
        email: userEmail,
        organizationId
      },
      select: { id: true }
    });

    if (!clinician) {
      return res.status(403).json({
        success: false,
        error: 'Clinician profile required to review observations'
      });
    }

    // Bulk update observations
    const result = await prisma.observation.updateMany({
      where: {
        id: { in: observationIds },
        organizationId,
        review_status: 'PENDING' // Only update pending observations
      },
      data: {
        review_status: 'REVIEWED',
        reviewed_at: new Date(),
        reviewed_by: clinician.id,
        review_method: 'BULK',
        review_notes: reviewNotes || 'Bulk reviewed via Review Queue'
      }
    });

    res.json({
      success: true,
      message: `${result.count} observations marked as reviewed`,
      count: result.count
    });
  } catch (error) {
    console.error('Error bulk reviewing observations:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

/**
 * Flag observation for follow-up
 * POST /api/observations/review/:id/flag
 */
const flagObservation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    const currentUserId = req.user?.userId;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!currentUserId || !organizationId) {
      return res.status(403).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // Validate review notes are provided for flagged observations
    if (!reviewNotes || reviewNotes.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: 'Review notes are required when flagging observations (minimum 10 characters)'
      });
    }

    // Find clinician ID for current user (match by email)
    const userEmail = req.user?.userData?.email || req.user?.email;
    const clinician = await prisma.clinician.findFirst({
      where: {
        email: userEmail,
        organizationId
      },
      select: { id: true }
    });

    if (!clinician) {
      return res.status(403).json({
        success: false,
        error: 'Clinician profile required to flag observations'
      });
    }

    // Check observation exists and belongs to organization
    const observation = await prisma.observation.findFirst({
      where: { id, organizationId }
    });

    if (!observation) {
      return res.status(404).json({
        success: false,
        error: 'Observation not found'
      });
    }

    // Update observation as flagged
    const updatedObservation = await prisma.observation.update({
      where: { id },
      data: {
        review_status: 'FLAGGED',
        reviewed_at: new Date(),
        reviewed_by: clinician.id,
        review_method: 'MANUAL',
        review_notes: reviewNotes.trim()
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        metric: {
          select: {
            displayName: true,
            unit: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedObservation,
      message: 'Observation flagged for follow-up'
    });
  } catch (error) {
    console.error('Error flagging observation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

module.exports = {
  createObservation,
  getAllObservations,
  getObservationById,
  updateObservation,
  deleteObservation,
  getPatientObservationHistory,
  getObservationStats,
  bulkCreateObservations,
  getObservationsByEnrollment,
  // Review endpoints
  getUnreviewedObservations,
  reviewObservation,
  bulkReviewObservations,
  flagObservation
};