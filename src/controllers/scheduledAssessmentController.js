const { PrismaClient } = require('@prisma/client');
const prisma = global.prisma || new PrismaClient();
const { scheduleNextRecurringAssessment } = require('../services/assessmentScheduler');

/**
 * Get all scheduled assessments (with filtering)
 * Query params: status, patientId, enrollmentId, priority, dueDate
 */
const getAllScheduledAssessments = async (req, res) => {
  try {
    const {
      status,
      patientId,
      enrollmentId,
      priority,
      overdue,
      page = 1,
      limit = 50
    } = req.query;

    const organizationId = req.user.currentOrganization;
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context required'
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {
      organizationId,
      ...(status && {
        status: {
          in: status.split(',').map(s => s.trim())
        }
      }),
      ...(patientId && { patientId }),
      ...(enrollmentId && { enrollmentId }),
      ...(priority !== undefined && { priority: parseInt(priority) })
    };

    // Filter for overdue assessments
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    const [scheduledAssessments, total] = await Promise.all([
      prisma.scheduledAssessment.findMany({
        where,
        skip,
        take,
        orderBy: [
          { priority: 'desc' },
          { dueDate: 'asc' }
        ],
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              dateOfBirth: true
            }
          },
          template: {
            select: {
              id: true,
              name: true,
              category: true
            }
          },
          enrollment: {
            select: {
              id: true,
              careProgram: {
                select: {
                  id: true,
                  name: true,
                  type: true
                }
              }
            }
          },
          scheduledByClinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          completedByClinician: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.scheduledAssessment.count({ where })
    ]);

    res.json({
      success: true,
      data: scheduledAssessments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching scheduled assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching scheduled assessments'
    });
  }
};

/**
 * Get scheduled assessment by ID
 */
const getScheduledAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.currentOrganization;

    const scheduledAssessment = await prisma.scheduledAssessment.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        patient: true,
        template: {
          include: {
            items: {
              include: {
                metricDefinition: true
              },
              orderBy: {
                displayOrder: 'asc'
              }
            }
          }
        },
        enrollment: {
          include: {
            careProgram: true,
            conditionPreset: true
          }
        },
        conditionPreset: true,
        scheduledByClinician: true,
        completedByClinician: true,
        completedAssessment: true
      }
    });

    if (!scheduledAssessment) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled assessment not found'
      });
    }

    res.json({
      success: true,
      data: scheduledAssessment
    });
  } catch (error) {
    console.error('Error fetching scheduled assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching scheduled assessment'
    });
  }
};

/**
 * Get pending assessments for a patient
 */
const getPendingAssessmentsForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const organizationId = req.user.currentOrganization;

    const pendingAssessments = await prisma.scheduledAssessment.findMany({
      where: {
        patientId,
        organizationId,
        status: { in: ['PENDING', 'IN_PROGRESS', 'OVERDUE'] }
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ],
      include: {
        template: {
          select: {
            id: true,
            name: true,
            category: true
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
      }
    });

    res.json({
      success: true,
      data: pendingAssessments
    });
  } catch (error) {
    console.error('Error fetching pending assessments:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching pending assessments'
    });
  }
};

/**
 * Create scheduled assessment
 */
const createScheduledAssessment = async (req, res) => {
  try {
    const {
      patientId,
      enrollmentId,
      templateId,
      conditionPresetId,
      frequency,
      dueDate,
      priority = 0,
      isRequired = true,
      notes
    } = req.body;

    const organizationId = req.user.currentOrganization;
    const clinicianId = req.user.clinicianId;

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'Organization context required'
      });
    }

    // Validate required fields
    if (!patientId || !enrollmentId || !templateId || !frequency || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: patientId, enrollmentId, templateId, frequency, dueDate'
      });
    }

    // Verify enrollment belongs to organization
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        organizationId,
        patientId
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found or does not belong to this organization'
      });
    }

    const scheduledAssessment = await prisma.scheduledAssessment.create({
      data: {
        organizationId,
        patientId,
        enrollmentId,
        templateId,
        conditionPresetId,
        frequency,
        dueDate: new Date(dueDate),
        scheduledBy: clinicianId,
        priority: parseInt(priority),
        isRequired,
        notes,
        status: 'PENDING'
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        template: {
          select: {
            id: true,
            name: true
          }
        },
        enrollment: {
          select: {
            id: true,
            careProgram: {
              select: {
                name: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: scheduledAssessment,
      message: 'Scheduled assessment created successfully'
    });
  } catch (error) {
    console.error('Error creating scheduled assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating scheduled assessment'
    });
  }
};

/**
 * Update scheduled assessment
 */
const updateScheduledAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      frequency,
      dueDate,
      priority,
      isRequired,
      notes,
      status
    } = req.body;

    const organizationId = req.user.currentOrganization;

    // Check if scheduled assessment exists and belongs to organization
    const existing = await prisma.scheduledAssessment.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled assessment not found'
      });
    }

    // Prevent modification of completed assessments
    if (existing.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify completed assessments'
      });
    }

    const updatedAssessment = await prisma.scheduledAssessment.update({
      where: { id },
      data: {
        ...(frequency && { frequency }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(priority !== undefined && { priority: parseInt(priority) }),
        ...(isRequired !== undefined && { isRequired }),
        ...(notes !== undefined && { notes }),
        ...(status && { status })
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        template: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: updatedAssessment,
      message: 'Scheduled assessment updated successfully'
    });
  } catch (error) {
    console.error('Error updating scheduled assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating scheduled assessment'
    });
  }
};

/**
 * Start scheduled assessment (mark as IN_PROGRESS)
 */
const startScheduledAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.currentOrganization;

    const scheduledAssessment = await prisma.scheduledAssessment.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!scheduledAssessment) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled assessment not found'
      });
    }

    if (scheduledAssessment.status !== 'PENDING' && scheduledAssessment.status !== 'OVERDUE') {
      return res.status(400).json({
        success: false,
        message: 'Assessment can only be started from PENDING or OVERDUE status'
      });
    }

    const updated = await prisma.scheduledAssessment.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS'
      },
      include: {
        patient: true,
        template: {
          include: {
            items: {
              include: {
                metricDefinition: true
              },
              orderBy: {
                displayOrder: 'asc'
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Assessment started successfully'
    });
  } catch (error) {
    console.error('Error starting scheduled assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while starting assessment'
    });
  }
};

/**
 * Complete scheduled assessment (link to actual Assessment)
 */
const completeScheduledAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { assessmentId } = req.body;

    const organizationId = req.user.currentOrganization;
    const clinicianId = req.user.clinicianId;

    if (!assessmentId) {
      return res.status(400).json({
        success: false,
        message: 'assessmentId is required'
      });
    }

    const scheduledAssessment = await prisma.scheduledAssessment.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!scheduledAssessment) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled assessment not found'
      });
    }

    // Verify the assessment exists and belongs to the same patient
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        patientId: scheduledAssessment.patientId
      }
    });

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found or patient mismatch'
      });
    }

    const updated = await prisma.scheduledAssessment.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedBy: clinicianId,
        completedAssessmentId: assessmentId
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        template: {
          select: {
            id: true,
            name: true
          }
        },
        completedAssessment: true
      }
    });

    // Auto-schedule next recurring assessment if frequency is not AS_NEEDED
    try {
      await scheduleNextRecurringAssessment(id);
      console.log(`[scheduledAssessmentController] Next recurring assessment scheduled for assessment ${id}`);
    } catch (error) {
      console.error('[scheduledAssessmentController] Failed to schedule next recurring assessment:', error);
      // Don't fail the completion if scheduling fails - log and continue
    }

    res.json({
      success: true,
      data: updated,
      message: 'Assessment completed successfully'
    });
  } catch (error) {
    console.error('Error completing scheduled assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while completing assessment'
    });
  }
};

/**
 * Cancel scheduled assessment
 */
const cancelScheduledAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const organizationId = req.user.currentOrganization;

    const scheduledAssessment = await prisma.scheduledAssessment.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!scheduledAssessment) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled assessment not found'
      });
    }

    if (scheduledAssessment.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel completed assessments'
      });
    }

    const updated = await prisma.scheduledAssessment.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelled: ${reason}` : scheduledAssessment.notes
      }
    });

    res.json({
      success: true,
      data: updated,
      message: 'Assessment cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling scheduled assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while cancelling assessment'
    });
  }
};

/**
 * Delete scheduled assessment
 */
const deleteScheduledAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.currentOrganization;

    const scheduledAssessment = await prisma.scheduledAssessment.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!scheduledAssessment) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled assessment not found'
      });
    }

    // Prevent deletion of completed assessments
    if (scheduledAssessment.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete completed assessments. Use cancel instead.'
      });
    }

    await prisma.scheduledAssessment.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Scheduled assessment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting scheduled assessment:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting scheduled assessment'
    });
  }
};

module.exports = {
  getAllScheduledAssessments,
  getScheduledAssessmentById,
  getPendingAssessmentsForPatient,
  createScheduledAssessment,
  updateScheduledAssessment,
  startScheduledAssessment,
  completeScheduledAssessment,
  cancelScheduledAssessment,
  deleteScheduledAssessment
};
