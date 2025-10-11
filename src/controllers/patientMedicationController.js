const { PrismaClient } = require('@prisma/client');

const prisma = global.prisma || new PrismaClient();

// Get all patient medications
const getPatientMedications = async (req, res) => {
  try {
    const { 
      patientId,
      isActive,
      page = 1, 
      limit = 50 
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {
      ...(patientId && { patientId }),
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    };

    const [medications, total] = await Promise.all([
      prisma.patientMedication.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          drug: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          prescriber: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              specialization: true
            }
          },
          _count: {
            select: { adherenceRecords: true }
          }
        }
      }),
      prisma.patientMedication.count({ where })
    ]);

    res.json({
      data: medications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching patient medications:', error);
    res.status(500).json({
      error: 'Internal server error while fetching patient medications'
    });
  }
};

// Get medications for a specific patient
const getPatientMedicationsById = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { isActive } = req.query;

    const where = {
      patientId,
      ...(isActive !== undefined && { isActive: isActive === 'true' })
    };

    const medications = await prisma.patientMedication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        drug: true,
        prescriber: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true
          }
        },
        adherenceRecords: {
          where: {
            scheduledDate: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          },
          orderBy: { scheduledDate: 'desc' }
        }
      }
    });

    res.json({ data: medications });
  } catch (error) {
    console.error('Error fetching patient medications:', error);
    res.status(500).json({
      error: 'Internal server error while fetching patient medications'
    });
  }
};

// Create a new patient medication
const createPatientMedication = async (req, res) => {
  try {
    const {
      patientId,
      drugId,
      prescribedBy,
      dosage,
      frequency,
      route,
      instructions,
      startDate,
      endDate,
      isPRN = false,
      maxDailyDose,
      refillsRemaining,
      pharmacyInfo,
      notes
    } = req.body;

    // Validate required fields
    if (!patientId || !drugId || !dosage || !frequency || !route || !startDate) {
      return res.status(400).json({
        error: 'Validation failed: patientId, drugId, dosage, frequency, route, and startDate are required'
      });
    }

    // Verify patient exists
    const patient = await prisma.patient.findUnique({
      where: { id: patientId }
    });

    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found'
      });
    }

    // Verify drug exists
    const drug = await prisma.drug.findUnique({
      where: { id: drugId }
    });

    if (!drug) {
      return res.status(404).json({
        error: 'Drug not found'
      });
    }

    // Verify prescriber exists if provided
    if (prescribedBy) {
      const prescriber = await prisma.clinician.findUnique({
        where: { id: prescribedBy }
      });

      if (!prescriber) {
        return res.status(404).json({
          error: 'Prescriber not found'
        });
      }
    }

    const medication = await prisma.patientMedication.create({
      data: {
        patientId,
        drugId,
        prescribedBy,
        dosage,
        frequency,
        route,
        instructions,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isPRN,
        maxDailyDose,
        refillsRemaining,
        pharmacyInfo,
        notes
      },
      include: {
        drug: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        prescriber: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Patient medication created successfully',
      data: medication
    });
  } catch (error) {
    console.error('Error creating patient medication:', error);
    res.status(500).json({
      error: 'Internal server error while creating patient medication'
    });
  }
};

// Update a patient medication
const updatePatientMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.patientId;
    delete updateData.drugId;
    
    // Set updatedAt
    updateData.updatedAt = new Date();

    // Handle date fields
    if (updateData.startDate) {
      updateData.startDate = new Date(updateData.startDate);
    }
    if (updateData.endDate) {
      updateData.endDate = new Date(updateData.endDate);
    }

    const medication = await prisma.patientMedication.update({
      where: { id },
      data: updateData,
      include: {
        drug: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        prescriber: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            specialization: true
          }
        }
      }
    });

    res.json({
      message: 'Patient medication updated successfully',
      data: medication
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Patient medication not found'
      });
    }
    console.error('Error updating patient medication:', error);
    res.status(500).json({
      error: 'Internal server error while updating patient medication'
    });
  }
};

// Deactivate a patient medication
const deactivatePatientMedication = async (req, res) => {
  try {
    const { id } = req.params;
    const { endDate, notes } = req.body;

    const medication = await prisma.patientMedication.update({
      where: { id },
      data: {
        isActive: false,
        endDate: endDate ? new Date(endDate) : new Date(),
        notes: notes || 'Medication discontinued',
        updatedAt: new Date()
      },
      include: {
        drug: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json({
      message: 'Patient medication deactivated successfully',
      data: medication
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        error: 'Patient medication not found'
      });
    }
    console.error('Error deactivating patient medication:', error);
    res.status(500).json({
      error: 'Internal server error while deactivating patient medication'
    });
  }
};

module.exports = {
  getPatientMedications,
  getPatientMedicationsById,
  createPatientMedication,
  updatePatientMedication,
  deactivatePatientMedication
};