const { PrismaClient } = require('../../generated/prisma');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

// Create a new observation
const createObservation = async (req, res) => {
  try {
    const {
      patientId,
      metricDefinitionId,
      enrollmentId, // Add this required field
      value,
      notes,
      recordedAt,
      recordedBy,
      location,
      context
    } = req.body;

    // Validate required fields
    if (!patientId || !metricDefinitionId || !enrollmentId || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'PatientId, metricDefinitionId, enrollmentId, and value are required'
      });
    }

    // Validate UUID formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(patientId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid patientId format. Must be a valid UUID.'
      });
    }
    if (!uuidRegex.test(metricDefinitionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid metricDefinitionId format. Must be a valid UUID.'
      });
    }
    if (!uuidRegex.test(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollmentId format. Must be a valid UUID.'
      });
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }

    // Verify enrollment exists and is active
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { patient: true }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    if (enrollment.patientId !== patientId) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment does not belong to the specified patient'
      });
    }

    if (enrollment.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Enrollment is not active'
      });
    }

    // Verify metric definition exists and is active
    const metricDefinition = await prisma.metricDefinition.findUnique({
      where: { id: metricDefinitionId }
    });

    if (!metricDefinition) {
      return res.status(404).json({
        success: false,
        message: 'Metric definition not found'
      });
    }

    // Check if metric definition is currently active
    const now = new Date();
    if (metricDefinition.activeTo && metricDefinition.activeTo < now) {
      return res.status(400).json({
        success: false,
        message: 'Metric definition is no longer active'
      });
    }

    if (metricDefinition.activeFrom && metricDefinition.activeFrom > now) {
      return res.status(400).json({
        success: false,
        message: 'Metric definition is not yet active'
      });
    }

    // Validate value against metric definition
    const validationResult = validateValueAgainstMetric(value, metricDefinition);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid value for metric definition',
        errors: validationResult.errors
      });
    }

    // Prepare value fields based on valueType
    let valueFields = {};
    switch (metricDefinition.valueType) {
      case 'numeric':
        valueFields.valueNumeric = validationResult.processedValue;
        break;
      case 'text':
        valueFields.valueText = validationResult.processedValue;
        break;
      case 'categorical':
      case 'ordinal':
      case 'boolean':
        valueFields.valueCode = validationResult.processedValue;
        break;
      default:
        valueFields.valueText = validationResult.processedValue;
    }

    // Create observation
    const observation = await prisma.observation.create({
      data: {
        patientId: patientId,
        enrollmentId: enrollmentId,
        metricDefinitionId: metricDefinitionId,
        metricKey: metricDefinition.key, // Required field from schema
        metricDefinitionVersion: metricDefinition.version,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        source: recordedBy === 'device' ? 'device' : recordedBy === 'staff' ? 'staff' : 'patient',
        ...valueFields, // Spread the appropriate value field
        unit: metricDefinition.unit,
        context: context,
        raw: {
          notes: notes,
          location: location,
          originalRecordedBy: recordedBy
        }
      },
      include: {
        patient: {
          select: { id: true, mrn: true }
        },
        metricDefinition: {
          select: { 
            id: true, 
            key: true, 
            displayName: true, 
            valueType: true, 
            unit: true 
          }
        },
        enrollment: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Observation created successfully',
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

    // Build filter conditions
    const where = {};
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
          metricDefinition: {
            select: { id: true, displayName: true, valueType: true, unit: true }
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
        metricDefinition: {
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
        metricDefinition: true
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
        metricDefinition: {
          select: { id: true, name: true, dataType: true, unit: true }
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
        metricDefinition: {
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
          metricDefinition: {
            select: { id: true, displayName: true, valueType: true, unit: true }
          }
        }
      })
    ]);

    // Get metric names for the grouped data
    const metricIds = observationsByMetric.map(item => item.metricDefinitionId);
    const metrics = await prisma.metricDefinition.findMany({
      where: { id: { in: metricIds } },
      select: { id: true, displayName: true, unit: true }
    });

    const enrichedStats = observationsByMetric.map(stat => {
      const metric = metrics.find(m => m.id === stat.metricDefinitionId);
      return {
        ...stat,
        metricName: metric?.name || 'Unknown',
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
            metricDefinition: {
              select: { id: true, name: true, dataType: true, unit: true }
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
    const metricName = obs.metricDefinition.name;
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
        metricDefinition: {
          select: { id: true, displayName: true, valueType: true, unit: true }
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

module.exports = {
  createObservation,
  getAllObservations,
  getObservationById,
  updateObservation,
  deleteObservation,
  getPatientObservationHistory,
  getObservationStats,
  bulkCreateObservations,
  getObservationsByEnrollment  // Add the new function
};