const request = require('supertest');
const { app } = require('../../index');

describe('Complete Workflow Integration Tests', () => {
  let testData = {};

  beforeAll(async () => {
    // Clean up all test data
    await global.prisma.observation.deleteMany({});
    await global.prisma.alert.deleteMany({});
    await global.prisma.enrollment.deleteMany({});
    await global.prisma.patient.deleteMany({});
    await global.prisma.clinician.deleteMany({});
    await global.prisma.metricDefinition.deleteMany({});
    await global.prisma.conditionPreset.deleteMany({});
  });

  afterAll(async () => {
    // Clean up all test data
    await global.prisma.observation.deleteMany({});
    await global.prisma.alert.deleteMany({});
    await global.prisma.enrollment.deleteMany({});
    await global.prisma.patient.deleteMany({});
    await global.prisma.clinician.deleteMany({});
    await global.prisma.metricDefinition.deleteMany({});
    await global.prisma.conditionPreset.deleteMany({});
  });

  describe('Complete Patient Management Workflow', () => {
    it('should complete full patient enrollment and observation workflow', async () => {
      const timestamp = Date.now();

      // Step 1: Create a clinician
      const clinicianResponse = await request(app)
        .post('/api/clinicians')
        .send({
          firstName: 'Dr. Jane',
          lastName: 'Smith',
          email: `dr.jane.smith.${timestamp}@hospital.com`,
          specialization: 'Pain Management',
          licenseNumber: `MD${timestamp}`,
          department: 'Pain Management'
        })
        .expect(201);

      testData.clinician = clinicianResponse.body.data;
      expect(testData.clinician).toHaveProperty('id');

      // Step 2: Create a patient
      const patientResponse = await request(app)
        .post('/api/patients')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: `john.doe.${timestamp}@example.com`,
          dateOfBirth: '1985-06-15',
          phone: '555-0123',
          address: '123 Main St, City, State 12345'
        })
        .expect(201);

      testData.patient = patientResponse.body.data;
      expect(testData.patient).toHaveProperty('id');

      // Step 3: Create metric definitions
      const painMetricResponse = await request(app)
        .post('/api/metric-definitions')
        .send({
          key: `pain_level_${timestamp}`,
          displayName: 'Pain Level',
          valueType: 'numeric',
          unit: 'scale',
          minValue: 0,
          maxValue: 10,
          description: 'Patient reported pain level on 0-10 scale'
        })
        .expect(201);

      testData.painMetric = painMetricResponse.body.data;

      const moodMetricResponse = await request(app)
        .post('/api/metric-definitions')
        .send({
          key: `mood_${timestamp}`,
          displayName: 'Mood',
          valueType: 'text',
          description: 'Patient reported mood'
        })
        .expect(201);

      testData.moodMetric = moodMetricResponse.body.data;

      // Step 4: Create condition preset
      const presetResponse = await request(app)
        .post('/api/condition-presets')
        .send({
          name: `Chronic Pain Protocol ${timestamp}`,
          description: 'Standard protocol for chronic pain management',
          condition: 'Chronic Pain'
        })
        .expect(201);

      testData.preset = presetResponse.body.data;

      // Step 5: Create enrollment
      const enrollmentResponse = await request(app)
        .post('/api/enrollments')
        .send({
          patientId: testData.patient.id,
          presetId: testData.preset.id,
          clinicianId: testData.clinician.id,
          diagnosisCode: 'M79.3',
          startDate: new Date().toISOString(),
          status: 'active'
        })
        .expect(201);

      testData.enrollment = enrollmentResponse.body.data;
      expect(testData.enrollment).toHaveProperty('id');

      // Step 6: Create observations
      const painObservationResponse = await request(app)
        .post('/api/observations')
        .send({
          patientId: testData.patient.id,
          metricDefinitionId: testData.painMetric.id,
          enrollmentId: testData.enrollment.id,
          value: '8',
          recordedAt: new Date().toISOString(),
          notes: 'High pain level reported'
        })
        .expect(201);

      testData.painObservation = painObservationResponse.body.data;

      const moodObservationResponse = await request(app)
        .post('/api/observations')
        .send({
          patientId: testData.patient.id,
          metricDefinitionId: testData.moodMetric.id,
          enrollmentId: testData.enrollment.id,
          value: 'anxious',
          recordedAt: new Date().toISOString(),
          notes: 'Patient reports feeling anxious'
        })
        .expect(201);

      testData.moodObservation = moodObservationResponse.body.data;

      // Step 7: Create alert for high pain
      const alertResponse = await request(app)
        .post('/api/alerts')
        .send({
          patientId: testData.patient.id,
          enrollmentId: testData.enrollment.id,
          type: 'high_pain',
          severity: 'high',
          title: 'High Pain Alert',
          message: 'Patient reported pain level 8/10',
          triggerValue: '8'
        })
        .expect(201);

      testData.alert = alertResponse.body.data;

      // Step 8: Verify data relationships
      // Get patient with enrollments
      const patientWithDataResponse = await request(app)
        .get(`/api/patients/${testData.patient.id}`)
        .expect(200);

      expect(patientWithDataResponse.body.data).toHaveProperty('enrollments');
      expect(patientWithDataResponse.body.data.enrollments).toHaveLength(1);

      // Get enrollment with observations
      const enrollmentWithDataResponse = await request(app)
        .get(`/api/enrollments/${testData.enrollment.id}`)
        .expect(200);

      expect(enrollmentWithDataResponse.body.data).toHaveProperty('observations');
      expect(enrollmentWithDataResponse.body.data.observations.length).toBeGreaterThan(0);

      // Get alerts for patient
      const alertsResponse = await request(app)
        .get(`/api/alerts?patientId=${testData.patient.id}`)
        .expect(200);

      expect(alertsResponse.body.alerts).toHaveLength(1);
      expect(alertsResponse.body.alerts[0].severity).toBe('high');

      // Step 9: Update alert status
      const alertUpdateResponse = await request(app)
        .put(`/api/alerts/${testData.alert.id}`)
        .send({
          status: 'acknowledged',
          acknowledgedBy: testData.clinician.id,
          notes: 'Alert reviewed by clinician'
        })
        .expect(200);

      expect(alertUpdateResponse.body.data.status).toBe('acknowledged');

      // Step 10: Get statistics
      const patientStatsResponse = await request(app)
        .get('/api/patients/stats')
        .expect(200);

      expect(patientStatsResponse.body.data.total).toBeGreaterThan(0);

      const alertStatsResponse = await request(app)
        .get('/api/alerts/stats')
        .expect(200);

      expect(alertStatsResponse.body.data.total).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid patient enrollment', async () => {
      const invalidEnrollmentResponse = await request(app)
        .post('/api/enrollments')
        .send({
          patientId: '550e8400-e29b-41d4-a716-446655440000', // Non-existent
          presetId: testData.preset?.id || '550e8400-e29b-41d4-a716-446655440000',
          clinicianId: testData.clinician?.id || '550e8400-e29b-41d4-a716-446655440000',
          diagnosisCode: 'M79.3',
          startDate: new Date().toISOString(),
          status: 'active'
        })
        .expect(404);

      expect(invalidEnrollmentResponse.body.success).toBe(false);
    });

    it('should handle invalid observation creation', async () => {
      const invalidObservationResponse = await request(app)
        .post('/api/observations')
        .send({
          patientId: '550e8400-e29b-41d4-a716-446655440000', // Non-existent
          metricDefinitionId: testData.painMetric?.id || '550e8400-e29b-41d4-a716-446655440000',
          enrollmentId: testData.enrollment?.id || '550e8400-e29b-41d4-a716-446655440000',
          value: '5',
          recordedAt: new Date().toISOString()
        })
        .expect(404);

      expect(invalidObservationResponse.body.success).toBe(false);
    });
  });

  describe('Data Consistency and Constraints', () => {
    it('should enforce unique constraints', async () => {
      const timestamp = Date.now();

      // Try to create duplicate clinician with same license number
      await request(app)
        .post('/api/clinicians')
        .send({
          firstName: 'Dr. John',
          lastName: 'Duplicate',
          email: `dr.john.duplicate.${timestamp}@hospital.com`,
          specialization: 'Cardiology',
          licenseNumber: testData.clinician?.licenseNumber || `MD${timestamp}`,
          department: 'Cardiology'
        })
        .expect(409);

      // Try to create duplicate metric definition with same key
      await request(app)
        .post('/api/metric-definitions')
        .send({
          key: testData.painMetric?.key || `pain_level_${timestamp}`,
          displayName: 'Duplicate Pain Level',
          valueType: 'numeric'
        })
        .expect(400);
    });
  });
});