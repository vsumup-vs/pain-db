const request = require('supertest');
const express = require('express');
const patientRoutes = require('../../src/routes/patientRoutes');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/patients', patientRoutes);

describe('Patient Controller', () => {
  let testPatient;

  beforeEach(async () => {
    // Create unique email to avoid constraint violations
    const timestamp = Date.now();
    
    // Create test patient for update/delete tests
    testPatient = await global.prisma.patient.create({
      data: {
        firstName: 'Existing',
        lastName: 'Patient',
        email: `existing.patient.${timestamp}@example.com`,
        dateOfBirth: new Date('1985-05-15'),
        gender: 'MALE'
      }
    });
  });

  describe('POST /api/patients', () => {
    it('should create a new patient successfully', async () => {
      const timestamp = Date.now();
      const patientData = {
        firstName: 'John',
        lastName: 'Doe',
        email: `john.doe.${timestamp}@example.com`,
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        address: '123 Main St, City, State 12345'
      };

      const response = await request(app)
        .post('/api/patients')
        .send(patientData);

      console.log('Create patient response status:', response.status);
      console.log('Create patient response body:', response.body);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Patient created successfully');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.firstName).toBe(patientData.firstName);
      expect(response.body.data.lastName).toBe(patientData.lastName);
      expect(response.body.data.email).toBe(patientData.email);
    });

    it('should prevent duplicate email addresses', async () => {
      const patientData = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: testPatient.email, // Use existing email
        dateOfBirth: '1992-03-15',
        gender: 'FEMALE'
      };

      const response = await request(app)
        .post('/api/patients')
        .send(patientData);

      console.log('Duplicate email response status:', response.status);
      console.log('Duplicate email response body:', response.body);

      expect(response.status).toBe(409);
      expect(response.body.error).toBe('Patient with this email already exists');
    });

    it('should return validation error for missing required fields', async () => {
      const patientData = {
        firstName: 'John'
        // Missing lastName and dateOfBirth (required by validation)
      };

      const response = await request(app)
        .post('/api/patients')
        .send(patientData)
        .expect(400);

      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('GET /api/patients', () => {
    it('should retrieve all patients with pagination', async () => {
      const response = await request(app)
        .get('/api/patients')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
    });

    it('should filter patients by search term', async () => {
      const response = await request(app)
        .get('/api/patients')
        .query({ search: testPatient.firstName })
        .expect(200);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      const foundPatient = response.body.data.find(p => p.id === testPatient.id);
      expect(foundPatient).toBeDefined();
    });
  });

  describe('GET /api/patients/:id', () => {
    it('should retrieve patient by ID', async () => {
      const response = await request(app)
        .get(`/api/patients/${testPatient.id}`)
        .expect(200);

      expect(response.body.data.id).toBe(testPatient.id);
      expect(response.body.data.firstName).toBe(testPatient.firstName);
      expect(response.body.data.lastName).toBe(testPatient.lastName);
      expect(response.body.data).toHaveProperty('enrollments');
      expect(response.body.data).toHaveProperty('observations');
    });

    it('should return 404 for non-existent patient', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/patients/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Patient not found');
    });
  });

  describe('PUT /api/patients/:id', () => {
    it('should update patient successfully', async () => {
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const response = await request(app)
        .put(`/api/patients/${testPatient.id}`)
        .send(updateData);

      console.log('Update patient response status:', response.status);
      console.log('Update patient response body:', response.body);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Patient updated successfully');
      expect(response.body.data.firstName).toBe(updateData.firstName);
      expect(response.body.data.lastName).toBe(updateData.lastName);
    });

    it('should return 404 for non-existent patient update', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const updateData = { firstName: 'Updated' };

      const response = await request(app)
        .put(`/api/patients/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Patient not found');
    });
  });

  describe('GET /api/patients/:id/stats', () => {
    it('should retrieve patient statistics', async () => {
      const response = await request(app)
        .get(`/api/patients/${testPatient.id}/stats`)
        .expect(200);

      expect(response.body.data).toHaveProperty('patientId');
      expect(response.body.data).toHaveProperty('totalObservations');
      expect(response.body.data).toHaveProperty('totalAlerts');
      expect(response.body.data).toHaveProperty('activeEnrollments');
      expect(response.body.data).toHaveProperty('recentPainLevels');
      expect(response.body.data.patientId).toBe(testPatient.id);
    });

    it('should return 404 for non-existent patient stats', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/patients/${nonExistentId}/stats`)
        .expect(404);

      expect(response.body.error).toBe('Patient not found');
    });
  });

  describe('DELETE /api/patients/:id', () => {
    it('should delete patient successfully when no active enrollments', async () => {
      // Create a patient with no enrollments for deletion
      const timestamp = Date.now();
      const patientToDelete = await global.prisma.patient.create({
        data: {
          firstName: 'Delete',
          lastName: 'Me',
          email: `delete.me.${timestamp}@example.com`,
          dateOfBirth: new Date('1990-01-01'),
          gender: 'OTHER'
        }
      });

      const response = await request(app)
        .delete(`/api/patients/${patientToDelete.id}`)
        .expect(200);

      expect(response.body.message).toBe('Patient deleted successfully');

      // Verify patient is deleted
      const deletedPatient = await global.prisma.patient.findUnique({
        where: { id: patientToDelete.id }
      });
      expect(deletedPatient).toBeNull();
    });

    it('should return 404 for non-existent patient deletion', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .delete(`/api/patients/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Patient not found');
    });
  });
});