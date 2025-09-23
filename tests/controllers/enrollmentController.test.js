const request = require('supertest');
const express = require('express');
const enrollmentRoutes = require('../../src/routes/enrollmentRoutes');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/enrollments', enrollmentRoutes);

describe('Enrollment Controller', () => {
  let testPatient, testClinician, testPreset;

  beforeEach(async () => {
    // Create unique emails to avoid constraint violations
    const timestamp = Date.now();
    
    // Create test patient
    testPatient = await global.prisma.patient.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        email: `test.patient.${timestamp}@example.com`,
        dateOfBirth: new Date('1990-01-01'),
        phone: '1234567890'
      }
    });

    // Create test clinician
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
  });

  describe('POST /api/enrollments', () => {
    it('should create a new enrollment successfully', async () => {
      const enrollmentData = {
        patientId: testPatient.id,
        presetId: testPreset.id,
        diagnosisCode: 'M79.3',
        clinicianId: testClinician.id,
        startDate: new Date().toISOString(),
        notes: 'Test enrollment'
      };

      const response = await request(app)
        .post('/api/enrollments')
        .send(enrollmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.patientId).toBe(testPatient.id);
      expect(response.body.data.clinicianId).toBe(testClinician.id);
      expect(response.body.data.status).toBe('active');
    });

    it('should prevent duplicate active enrollments for same patient-clinician pair', async () => {
      const enrollmentData = {
        patientId: testPatient.id,
        presetId: testPreset.id,
        diagnosisCode: 'M79.3',
        clinicianId: testClinician.id,
        startDate: new Date().toISOString(),
        notes: 'First enrollment'
      };

      // Create first enrollment
      await request(app)
        .post('/api/enrollments')
        .send(enrollmentData)
        .expect(201);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/enrollments')
        .send(enrollmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('active enrollment');
    });

    it('should return validation error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/enrollments')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/enrollments/:id', () => {
    it('should retrieve enrollment by ID', async () => {
      const enrollment = await global.prisma.enrollment.create({
        data: {
          patientId: testPatient.id,
          presetId: testPreset.id,
          diagnosisCode: 'M79.3',
          clinicianId: testClinician.id,
          startDate: new Date(),
          status: 'active'
        }
      });

      const response = await request(app)
        .get(`/api/enrollments/${enrollment.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(enrollment.id);
    });

    it('should return 404 for non-existent enrollment', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';
      
      const response = await request(app)
        .get(`/api/enrollments/${fakeId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Enrollment not found');
    });
  });

  describe('PUT /api/enrollments/:id/deactivate', () => {
    it('should deactivate an active enrollment', async () => {
      const enrollment = await global.prisma.enrollment.create({
        data: {
          patientId: testPatient.id,
          presetId: testPreset.id,
          diagnosisCode: 'M79.3',
          clinicianId: testClinician.id,
          startDate: new Date(),
          status: 'active'
        }
      });

      const response = await request(app)
        .put(`/api/enrollments/${enrollment.id}/deactivate`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('ended');
    });

    it('should not deactivate already ended enrollment', async () => {
      const enrollment = await global.prisma.enrollment.create({
        data: {
          patientId: testPatient.id,
          presetId: testPreset.id,
          diagnosisCode: 'M79.3',
          clinicianId: testClinician.id,
          startDate: new Date(),
          status: 'ended'
        }
      });

      const response = await request(app)
        .put(`/api/enrollments/${enrollment.id}/deactivate`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});