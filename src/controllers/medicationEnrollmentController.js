const { PrismaClient } = require('@prisma/client');

const prisma = global.prisma || new PrismaClient();

// Add medication management to an enrollment
const addMedicationToEnrollment = async (req, res) => {
  try {
    const { id: enrollmentId } = req.params;
    const {
      drugId,
      dosage,
      frequency,
      route,
      instructions,
      startDate,
      endDate,
      isPRN = false
    } = req.body;

    // Get enrollment details
    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        patient: true,
        clinician: true
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        error: 'Enrollment not found'
      });
    }

    // Create patient medication
    const patientMedication = await prisma.patientMedication.create({
      data: {
        patientId: enrollment.patientId,
        drugId,
        prescribedBy: enrollment.clinicianId,
        dosage,
        frequency,
        route,
        instructions,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isPRN,
        notes: `Prescribed as part of enrollment ${enrollmentId}`
      },
      include: {
        drug: true,
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
      data: patientMedication,
      message: 'Medication added to enrollment successfully'
    });
  } catch (error) {
    console.error('Error adding medication to enrollment:', error);
    res.status(500).json({
      error: 'Internal server error while adding medication to enrollment'
    });
  }
};

// Get medication summary for an enrollment
const getEnrollmentMedicationSummary = async (req, res) => {
  try {
    const { id: enrollmentId } = req.params;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        patient: {
          include: {
            patientMedications: {
              where: { isActive: true },
              include: {
                drug: true,
                adherenceRecords: {
                  where: {
                    scheduledDate: {
                      gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                    }
                  },
                  orderBy: { scheduledDate: 'desc' }
                }
              }
            }
          }
        }
      }
    });

    if (!enrollment) {
      return res.status(404).json({
        error: 'Enrollment not found'
      });
    }

    // Calculate adherence statistics
    const medicationSummary = enrollment.patient.patientMedications.map(med => {
      const totalScheduled = med.adherenceRecords.length;
      const totalTaken = med.adherenceRecords.filter(record => record.wasTaken).length;
      const adherenceRate = totalScheduled > 0 ? (totalTaken / totalScheduled) * 100 : 0;

      return {
        medication: med,
        adherenceStats: {
          totalScheduled,
          totalTaken,
          adherenceRate: Math.round(adherenceRate),
          lastTaken: med.adherenceRecords.find(record => record.wasTaken)?.takenAt || null
        }
      };
    });

    res.json({
      data: {
        enrollment,
        medicationSummary,
        overallAdherence: medicationSummary.length > 0 
          ? Math.round(medicationSummary.reduce((sum, med) => sum + med.adherenceStats.adherenceRate, 0) / medicationSummary.length)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching enrollment medication summary:', error);
    res.status(500).json({
      error: 'Internal server error while fetching enrollment medication summary'
    });
  }
};

module.exports = {
  addMedicationToEnrollment,
  getEnrollmentMedicationSummary
};