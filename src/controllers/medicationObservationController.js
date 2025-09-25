const { PrismaClient } = require('../../generated/prisma');

const prisma = global.prisma || new PrismaClient();

// Create medication-related observation
const createMedicationObservation = async (req, res) => {
  try {
    const {
      patientId,
      enrollmentId,
      patientMedicationId,
      metricKey,
      value,
      templateId,
      context = {}
    } = req.body;

    // Get the metric definition
    const metricDefinition = await prisma.metricDefinition.findFirst({
      where: { key: metricKey }
    });

    if (!metricDefinition) {
      return res.status(404).json({
        error: 'Metric definition not found'
      });
    }

    // Get patient medication details
    const patientMedication = await prisma.patientMedication.findUnique({
      where: { id: patientMedicationId },
      include: { drug: true }
    });

    if (!patientMedication) {
      return res.status(404).json({
        error: 'Patient medication not found'
      });
    }

    // Prepare observation data based on value type
    let observationData = {
      patientId,
      enrollmentId,
      templateId,
      metricKey,
      metricDefinitionId: metricDefinition.id,
      recordedAt: new Date(),
      context: {
        ...context,
        patientMedicationId,
        drugName: patientMedication.drug.name,
        dosage: patientMedication.dosage,
        frequency: patientMedication.frequency
      }
    };

    // Set the appropriate value field based on metric type
    switch (metricDefinition.valueType) {
      case 'numeric':
        observationData.valueNumeric = parseFloat(value);
        break;
      case 'categorical':
      case 'ordinal':
        observationData.valueCode = value;
        break;
      case 'text':
        observationData.valueText = value;
        break;
      case 'boolean':
        observationData.valueCode = value.toString();
        break;
    }

    const observation = await prisma.observation.create({
      data: observationData,
      include: {
        metricDefinition: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Also create medication adherence record if this is an adherence observation
    if (metricKey === 'medication_adherence') {
      await prisma.medicationAdherence.create({
        data: {
          patientMedicationId,
          patientId,
          scheduledDate: new Date(),
          wasTaken: value === 'Taken as prescribed',
          wasSkipped: ['Missed dose', 'Skipped intentionally'].includes(value),
          skipReason: value !== 'Taken as prescribed' ? value : null,
          reportedBy: 'patient'
        }
      });
    }

    res.status(201).json({
      message: 'Medication observation created successfully',
      data: observation
    });
  } catch (error) {
    console.error('Error creating medication observation:', error);
    res.status(500).json({
      error: 'Internal server error while creating medication observation'
    });
  }
};

// Get medication observations for a patient
const getPatientMedicationObservations = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      medicationId,
      metricKey,
      startDate,
      endDate,
      limit = 50 
    } = req.query;

    const where = {
      patientId,
      metricKey: {
        in: [
          'medication_adherence',
          'medication_effectiveness',
          'side_effects_severity',
          'pain_before_medication',
          'pain_after_medication',
          'medication_timing'
        ]
      }
    };

    if (medicationId) {
      where.context = {
        path: ['patientMedicationId'],
        equals: medicationId
      };
    }

    if (metricKey) {
      where.metricKey = metricKey;
    }

    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) where.recordedAt.gte = new Date(startDate);
      if (endDate) where.recordedAt.lte = new Date(endDate);
    }

    const observations = await prisma.observation.findMany({
      where,
      orderBy: { recordedAt: 'desc' },
      take: parseInt(limit),
      include: {
        metricDefinition: true
      }
    });

    res.json({ data: observations });
  } catch (error) {
    console.error('Error fetching medication observations:', error);
    res.status(500).json({
      error: 'Internal server error while fetching medication observations'
    });
  }
};

module.exports = {
  createMedicationObservation,
  getPatientMedicationObservations
};