const request = require('supertest');
const express = require('express');
const enrollmentRoutes = require('../../src/routes/enrollmentRoutes');
const observationRoutes = require('../../src/routes/observationRoutes');

const app = express();
app.use(express.json());
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/observations', observationRoutes);

describe('Enrollment → Observation Integration', () => {
  let testPatient, testClinician, testMetricDefinition, testPreset;

  beforeEach(async () => {
    // Create unique emails to avoid constraint violations
    const timestamp = Date.now();
    
    testPatient = await global.prisma.patient.create({
      data: {
        firstName: 'Integration',
        lastName: 'Test',
        email: `integration.test.${timestamp}@example.com`,
        dateOfBirth: new Date('1985-01-01'),
        phone: '9876543210'
      }
    });

    testClinician = await global.prisma.clinician.create({
      data: {
        firstName: 'Integration',
        lastName: 'Clinician',
        email: `integration.clinician.${timestamp}@example.com`,
        specialization: 'Pain Management'
      }
    });

    // Create test condition preset
    testPreset = await global.prisma.conditionPreset.create({
      data: {
        name: `Integration Test Protocol ${timestamp}`
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

  it('should complete full enrollment and observation workflow', async () => {
    // Step 1: Create enrollment
    const enrollmentData = {
      patientId: testPatient.id,
      presetId: testPreset.id,
      diagnosisCode: 'M79.3',
      clinicianId: testClinician.id,
      startDate: new Date().toISOString(),
      status: 'active'
    };

    const enrollmentResponse = await request(app)
      .post('/api/enrollments')
      .send(enrollmentData)
      .expect(201);

    expect(enrollmentResponse.body.success).toBe(true);
    const enrollmentId = enrollmentResponse.body.data.id;

    // Step 2: Create multiple observations
    const observations = [
      { value: '8', notes: 'High pain level' },
      { value: '6', notes: 'Moderate pain' },
      { value: '4', notes: 'Improving' }
    ];

    for (const obs of observations) {
      const observationData = {
        patientId: testPatient.id,           // Added required field
        enrollmentId,
        metricDefinitionId: testMetricDefinition.id,  // Added required field
        metricKey: testMetricDefinition.key,
        value: obs.value,
        recordedAt: new Date().toISOString(),
        notes: obs.notes
      };

      const obsResponse = await request(app)
        .post('/api/observations')
        .send(observationData)
        .expect(201);

      expect(obsResponse.body.success).toBe(true);
    }

    // Step 3: Retrieve all observations for patient (since enrollment route doesn't exist)
    const getObsResponse = await request(app)
      .get(`/api/observations/patient/${testPatient.id}/history`)
      .expect(200);

    expect(getObsResponse.body.success).toBe(true);
    expect(getObsResponse.body.data.observations.length).toBeGreaterThanOrEqual(3);

    // Step 4: Deactivate enrollment
    const deactivateResponse = await request(app)
      .put(`/api/enrollments/${enrollmentId}/deactivate`)
      .expect(200);

    expect(deactivateResponse.body.success).toBe(true);
    expect(deactivateResponse.body.data.status).toBe('ended');

    // Step 5: Verify cannot create observations on ended enrollment
    const newObservationData = {
      patientId: testPatient.id,           // Added required field
      enrollmentId,
      metricDefinitionId: testMetricDefinition.id,  // Added required field
      metricKey: testMetricDefinition.key,
      value: '5',
      recordedAt: new Date().toISOString()
    };

    await request(app)
      .post('/api/observations')
      .send(newObservationData)
      .expect(400);
  });
});