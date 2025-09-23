const request = require('supertest');
const express = require('express');
const observationRoutes = require('../../src/routes/observationRoutes');

const app = express();
app.use(express.json());
app.use('/api/observations', observationRoutes);

describe('Observation Controller', () => {
  let testPatient, testClinician, testEnrollment, testMetricDefinition, testPreset;

  beforeEach(async () => {
    // Create unique emails to avoid constraint violations
    const timestamp = Date.now();
    
    // Create test data
    testPatient = await global.prisma.patient.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        email: `test.patient.${timestamp}@example.com`,
        dateOfBirth: new Date('1990-01-01'),
        phone: '1234567890'
      }
    });

    testClinician = await global.prisma.clinician.create({
      data: {
        firstName: 'Test',
        lastName: 'Clinician',
        email: `test.clinician.${timestamp}@example.com`,
        specialization: 'Pain Management'
      }
    });

    // Create test condition preset
    testPreset = await global.prisma.conditionPreset.create({
      data: {
        name: `Test Pain Management Protocol ${timestamp}`
      }
    });

    testEnrollment = await global.prisma.enrollment.create({
      data: {
        patientId: testPatient.id,
        presetId: testPreset.id,
        diagnosisCode: 'M79.3',
        clinicianId: testClinician.id,
        startDate: new Date(),
        status: 'active'
      }
    });

    testMetricDefinition = await global.prisma.metricDefinition.create({
      data: {
        key: `pain_level_${timestamp}`,
        displayName: 'Pain Level',
        valueType: 'numeric',
        unit: 'scale'
      }
    });
  });

  describe('POST /api/observations', () => {
    it('should create observation successfully', async () => {
      const observationData = {
        patientId: testPatient.id,
        metricDefinitionId: testMetricDefinition.id,
        enrollmentId: testEnrollment.id,
        value: '7',
        recordedAt: new Date().toISOString(),
        notes: 'Patient reported moderate pain'
      };

      const response = await request(app)
        .post('/api/observations')
        .send(observationData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enrollmentId).toBe(testEnrollment.id);
      expect(response.body.data.metricDefinitionId).toBe(testMetricDefinition.id);
      expect(response.body.data.valueNumeric).toBe('7');
    });

    it('should return error for non-existent enrollment', async () => {
      const fakeEnrollmentId = '123e4567-e89b-12d3-a456-426614174000';
      
      const observationData = {
        patientId: testPatient.id, // Use valid patient ID
        metricDefinitionId: testMetricDefinition.id,
        enrollmentId: fakeEnrollmentId, // Use fake enrollment ID
        value: '5',
        recordedAt: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/observations')
        .send(observationData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Enrollment not found');
    });

    it('should return error for inactive enrollment', async () => {
      // Update enrollment to ended status
      await global.prisma.enrollment.update({
        where: { id: testEnrollment.id },
        data: { status: 'ended' }
      });

      const observationData = {
        patientId: testPatient.id,
        metricDefinitionId: testMetricDefinition.id,
        enrollmentId: testEnrollment.id,
        value: '5',
        recordedAt: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/observations')
        .send(observationData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not active');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/observations')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/observations/enrollment/:enrollmentId', () => {
    it('should retrieve observations for enrollment', async () => {
      // Create test observations using the correct field names for Prisma
      await global.prisma.observation.createMany({
        data: [
          {
            patientId: testPatient.id,
            metricDefinitionId: testMetricDefinition.id,
            enrollmentId: testEnrollment.id,
            metricKey: testMetricDefinition.key,
            valueNumeric: 5, // Use valueNumeric instead of value for numeric type
            recordedAt: new Date()
          },
          {
            patientId: testPatient.id,
            metricDefinitionId: testMetricDefinition.id,
            enrollmentId: testEnrollment.id,
            metricKey: testMetricDefinition.key,
            valueNumeric: 7, // Use valueNumeric instead of value for numeric type
            recordedAt: new Date()
          }
        ]
      });

      const response = await request(app)
        .get(`/api/observations/enrollment/${testEnrollment.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });
});