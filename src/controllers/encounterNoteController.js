const { PrismaClient } = require('@prisma/client');

// Use global prisma client in test environment
const prisma = global.prisma || new PrismaClient();

/**
 * Encounter Note Controller
 *
 * Smart documentation templates with auto-populated clinical context
 * SOAP format (Subjective, Objective, Assessment, Plan)
 * Attestation workflow for finalization
 *
 * Phase 1a: Workflow Optimizer - Task 4
 */

/**
 * Get all encounter notes with filtering
 * GET /api/encounter-notes
 */
const getEncounterNotes = async (req, res) => {
  try {
    const {
      patientId,
      clinicianId,
      encounterType,
      isLocked,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = { organizationId };

    if (patientId) where.patientId = patientId;
    if (clinicianId) where.clinicianId = clinicianId;
    if (encounterType) where.encounterType = encounterType;
    if (isLocked !== undefined) where.isLocked = isLocked === 'true';

    const [notes, total] = await Promise.all([
      prisma.encounterNote.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true
            }
          },
          clinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true
            }
          },
          attestedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          alert: {
            select: {
              id: true,
              severity: true,
              message: true
            }
          }
        }
      }),
      prisma.encounterNote.count({ where })
    ]);

    res.json({
      data: notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching encounter notes:', error);
    res.status(500).json({
      error: 'Internal server error while fetching encounter notes'
    });
  }
};

/**
 * Get single encounter note by ID
 * GET /api/encounter-notes/:id
 */
const getEncounterNote = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const note = await prisma.encounterNote.findFirst({
      where: {
        id,
        organizationId // SECURITY: Verify note belongs to user's organization
      },
      include: {
        patient: true,
        clinician: true,
        attestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        alert: {
          include: {
            rule: true
          }
        }
      }
    });

    if (!note) {
      return res.status(404).json({
        error: 'Encounter note not found or access denied'
      });
    }

    res.json({ data: note });
  } catch (error) {
    console.error('Error fetching encounter note:', error);
    res.status(500).json({
      error: 'Internal server error while fetching encounter note'
    });
  }
};

/**
 * Create new encounter note with auto-population
 * POST /api/encounter-notes
 */
const createEncounterNote = async (req, res) => {
  try {
    const {
      patientId,
      clinicianId,
      encounterType,
      subjective,
      objective,
      assessment,
      plan,
      additionalNotes,
      alertId
    } = req.body;

    // SECURITY: Get organizationId and userId
    const organizationId = req.organizationId || req.user?.currentOrganization;
    const userId = req.user?.userId;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check organization type - block PLATFORM organizations from creating encounter notes
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        type: true,
        name: true
      }
    });

    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Block PLATFORM organizations from creating encounter notes (patient-care feature)
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Clinical documentation is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Validate required fields
    if (!patientId || !clinicianId || !encounterType) {
      return res.status(400).json({
        error: 'patientId, clinicianId, and encounterType are required'
      });
    }

    // Verify patient and clinician belong to organization
    const [patient, clinician] = await Promise.all([
      prisma.patient.findFirst({
        where: { id: patientId, organizationId }
      }),
      prisma.clinician.findFirst({
        where: { id: clinicianId, organizationId }
      })
    ]);

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    if (!clinician) {
      return res.status(404).json({ error: 'Clinician not found' });
    }

    // Auto-populate: Get recent vitals, assessments, alerts
    const [recentVitals, recentAssessments, recentAlerts] = await Promise.all([
      // Last 5 vital readings
      prisma.observation.findMany({
        where: {
          patientId,
          organizationId,
          metric: {
            category: { in: ['Vitals', 'Clinical Measurements'] }
          }
        },
        include: {
          metric: {
            select: {
              displayName: true,
              unit: true
            }
          }
        },
        orderBy: { recordedAt: 'desc' },
        take: 5
      }),
      // Last 3 assessments
      prisma.assessment.findMany({
        where: { patientId },
        include: {
          template: {
            select: {
              name: true
            }
          }
        },
        orderBy: { completedAt: 'desc' },
        take: 3
      }),
      // Recent active alerts
      prisma.alert.findMany({
        where: {
          patientId,
          organizationId,
          status: { in: ['PENDING', 'ACKNOWLEDGED'] }
        },
        include: {
          rule: {
            select: {
              name: true,
              severity: true
            }
          }
        },
        orderBy: { triggeredAt: 'desc' },
        take: 5
      })
    ]);

    // Auto-populate vitalsSnapshot
    const vitalsSnapshot = recentVitals.map(obs => ({
      metric: obs.metric.displayName,
      value: obs.value,
      unit: obs.metric.unit,
      recordedAt: obs.recordedAt
    }));

    // Auto-populate assessmentSummary
    const assessmentSummary = recentAssessments.length > 0
      ? recentAssessments.map(a =>
          `${a.template.name}: Score ${JSON.stringify(a.score)} (${new Date(a.completedAt).toLocaleDateString()})`
        ).join('\n')
      : null;

    // Auto-populate alertsSummary
    const alertsSummary = recentAlerts.length > 0
      ? recentAlerts.map(a =>
          `${a.rule.name} (${a.rule.severity}): ${a.message}`
        ).join('\n')
      : null;

    // Create encounter note
    const note = await prisma.encounterNote.create({
      data: {
        organizationId,
        patientId,
        clinicianId,
        encounterType,
        vitalsSnapshot,
        assessmentSummary,
        alertsSummary,
        subjective,
        objective,
        assessment,
        plan,
        additionalNotes,
        alertId: alertId || null
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Encounter note created successfully',
      data: note
    });
  } catch (error) {
    console.error('Error creating encounter note:', error);
    res.status(500).json({
      error: 'Internal server error while creating encounter note'
    });
  }
};

/**
 * Update encounter note (only if not locked)
 * PUT /api/encounter-notes/:id
 */
const updateEncounterNote = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      subjective,
      objective,
      assessment,
      plan,
      additionalNotes
    } = req.body;

    // SECURITY: Get organizationId
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if note exists and is not locked
    const existingNote = await prisma.encounterNote.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingNote) {
      return res.status(404).json({
        error: 'Encounter note not found or access denied'
      });
    }

    if (existingNote.isLocked) {
      return res.status(403).json({
        error: 'Cannot edit locked encounter note. Note has been attested and is read-only.'
      });
    }

    // Update note (only editable fields)
    const updatedNote = await prisma.encounterNote.update({
      where: { id },
      data: {
        subjective,
        objective,
        assessment,
        plan,
        additionalNotes
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      message: 'Encounter note updated successfully',
      data: updatedNote
    });
  } catch (error) {
    console.error('Error updating encounter note:', error);
    res.status(500).json({
      error: 'Internal server error while updating encounter note'
    });
  }
};

/**
 * Attest (finalize and lock) encounter note
 * POST /api/encounter-notes/:id/attest
 */
const attestEncounterNote = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: Get organizationId and userId
    const organizationId = req.organizationId || req.user?.currentOrganization;
    const userId = req.user?.userId;

    if (!organizationId || !userId) {
      return res.status(403).json({
        error: 'Organization context and user authentication required'
      });
    }

    // Check if note exists and is not already locked
    const existingNote = await prisma.encounterNote.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingNote) {
      return res.status(404).json({
        error: 'Encounter note not found or access denied'
      });
    }

    if (existingNote.isLocked) {
      return res.status(400).json({
        error: 'Encounter note is already attested and locked'
      });
    }

    // Validate required fields before attestation
    if (!existingNote.subjective || !existingNote.objective ||
        !existingNote.assessment || !existingNote.plan) {
      return res.status(400).json({
        error: 'Cannot attest incomplete encounter note. All SOAP fields (Subjective, Objective, Assessment, Plan) are required.'
      });
    }

    // Attest and lock note
    const attestedNote = await prisma.encounterNote.update({
      where: { id },
      data: {
        isLocked: true,
        attestedById: userId,
        attestedAt: new Date()
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        clinician: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        attestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      message: 'Encounter note attested and locked successfully',
      data: attestedNote
    });
  } catch (error) {
    console.error('Error attesting encounter note:', error);
    res.status(500).json({
      error: 'Internal server error while attesting encounter note'
    });
  }
};

/**
 * Delete encounter note (only if not locked)
 * DELETE /api/encounter-notes/:id
 */
const deleteEncounterNote = async (req, res) => {
  try {
    const { id } = req.params;

    // SECURITY: Get organizationId
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if note exists and is not locked
    const existingNote = await prisma.encounterNote.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingNote) {
      return res.status(404).json({
        error: 'Encounter note not found or access denied'
      });
    }

    if (existingNote.isLocked) {
      return res.status(403).json({
        error: 'Cannot delete locked encounter note. Attested notes are read-only for compliance.'
      });
    }

    await prisma.encounterNote.delete({
      where: { id }
    });

    res.json({
      message: 'Encounter note deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting encounter note:', error);
    res.status(500).json({
      error: 'Internal server error while deleting encounter note'
    });
  }
};

module.exports = {
  getEncounterNotes,
  getEncounterNote,
  createEncounterNote,
  updateEncounterNote,
  attestEncounterNote,
  deleteEncounterNote
};
