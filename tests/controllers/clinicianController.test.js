const request = require('supertest');
const { app } = require('../../index');
const { PrismaClient } = require('../../generated/prisma');

const prisma = new PrismaClient();

describe('Clinician Controller', () => {
  let testClinician;

  beforeEach(async () => {
    // Clean up clinicians table
    await prisma.clinician.deleteMany({});
  });

  afterAll(async () => {
    await prisma.clinician.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/clinicians', () => {
    it('should create a new clinician with valid data', async () => {
      const clinicianData = {
        npi: '1234567890',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@hospital.com',
        phone: '+1-555-123-4567',
        specialization: 'Cardiology',
        licenseNumber: 'MD123456',
        department: 'Cardiology Department',
        address: {
          street: '123 Medical Center Dr',
          city: 'Boston',
          state: 'MA',
          zipCode: '02101',
          country: 'USA'
        },
        emergencyContact: {
          name: 'Jane Doe',
          phone: '+1-555-987-6543',
          relationship: 'Spouse'
        },
        credentials: ['MD', 'FACC']
      };

      const response = await request(app)
        .post('/api/clinicians')
        .send(clinicianData)
        .expect(201);

      expect(response.body.message).toBe('Clinician created successfully');
      expect(response.body.data).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@hospital.com',
        specialization: 'Cardiology'
      });

      testClinician = response.body.data;
    });

    it('should return 400 for missing required fields', async () => {
      const incompleteData = {
        firstName: 'John',
        lastName: 'Doe'
        // Missing email, specialization, licenseNumber
      };

      const response = await request(app)
        .post('/api/clinicians')
        .send(incompleteData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        specialization: 'Cardiology',
        licenseNumber: 'MD123456'
      };

      const response = await request(app)
        .post('/api/clinicians')
        .send(invalidData)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      const clinicianData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@hospital.com',
        specialization: 'Cardiology',
        licenseNumber: 'MD123456'
      };

      // Create first clinician
      await request(app)
        .post('/api/clinicians')
        .send(clinicianData)
        .expect(201);

      // Try to create second clinician with same email
      const duplicateData = {
        ...clinicianData,
        licenseNumber: 'MD789012' // Different license number
      };

      const response = await request(app)
        .post('/api/clinicians')
        .send(duplicateData)
        .expect(409);

      expect(response.body.error).toContain('email already exists');
    });

    it('should return 409 for duplicate license number', async () => {
      const clinicianData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@hospital.com',
        specialization: 'Cardiology',
        licenseNumber: 'MD123456'
      };

      // Create first clinician
      await request(app)
        .post('/api/clinicians')
        .send(clinicianData)
        .expect(201);

      // Try to create second clinician with same license number
      const duplicateData = {
        ...clinicianData,
        email: 'jane.doe@hospital.com' // Different email
      };

      const response = await request(app)
        .post('/api/clinicians')
        .send(duplicateData)
        .expect(409);

      expect(response.body.error).toContain('license number already exists');
    });
  });

  describe('GET /api/clinicians', () => {
    beforeEach(async () => {
      // Create test clinicians
      await prisma.clinician.createMany({
        data: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@hospital.com',
            specialization: 'Cardiology',
            licenseNumber: 'MD123456',
            department: 'Cardiology'
          },
          {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@hospital.com',
            specialization: 'Neurology',
            licenseNumber: 'MD789012',
            department: 'Neurology'
          }
        ]
      });
    });

    it('should get all clinicians with default pagination', async () => {
      const response = await request(app)
        .get('/api/clinicians')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1
      });
    });

    it('should filter clinicians by specialization', async () => {
      const response = await request(app)
        .get('/api/clinicians?specialization=Cardiology')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].specialization).toBe('Cardiology');
    });

    it('should search clinicians by name', async () => {
      const response = await request(app)
        .get('/api/clinicians?search=Jane')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].firstName).toBe('Jane');
    });

    it('should return 400 for invalid pagination parameters', async () => {
      const response = await request(app)
        .get('/api/clinicians?page=invalid&limit=abc')
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/clinicians/:id', () => {
    beforeEach(async () => {
      const clinician = await prisma.clinician.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@hospital.com',
          specialization: 'Cardiology',
          licenseNumber: 'MD123456'
        }
      });
      testClinician = clinician;
    });

    it('should get clinician by valid ID', async () => {
      const response = await request(app)
        .get(`/api/clinicians/${testClinician.id}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: testClinician.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@hospital.com'
      });
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/clinicians/invalid-id')
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 404 for non-existent clinician', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/clinicians/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /api/clinicians/:id', () => {
    beforeEach(async () => {
      const clinician = await prisma.clinician.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@hospital.com',
          specialization: 'Cardiology',
          licenseNumber: 'MD123456'
        }
      });
      testClinician = clinician;
    });

    it('should update clinician with valid data', async () => {
      const updateData = {
        firstName: 'Johnny',
        department: 'Updated Cardiology Department'
      };

      const response = await request(app)
        .put(`/api/clinicians/${testClinician.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.firstName).toBe('Johnny');
      expect(response.body.data.department).toBe('Updated Cardiology Department');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .put('/api/clinicians/invalid-id')
        .send({ firstName: 'Updated' })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 404 for non-existent clinician', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .put(`/api/clinicians/${nonExistentId}`)
        .send({ firstName: 'Updated' })
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('DELETE /api/clinicians/:id', () => {
    beforeEach(async () => {
      const clinician = await prisma.clinician.create({
        data: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@hospital.com',
          specialization: 'Cardiology',
          licenseNumber: 'MD123456'
        }
      });
      testClinician = clinician;
    });

    it('should delete clinician with valid ID', async () => {
      const response = await request(app)
        .delete(`/api/clinicians/${testClinician.id}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');

      // Verify clinician is deleted
      const deletedClinician = await prisma.clinician.findUnique({
        where: { id: testClinician.id }
      });
      expect(deletedClinician).toBeNull();
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/clinicians/invalid-id')
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should return 404 for non-existent clinician', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .delete(`/api/clinicians/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/clinicians/stats', () => {
    beforeEach(async () => {
      await prisma.clinician.createMany({
        data: [
          {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@hospital.com',
            specialization: 'Cardiology',
            licenseNumber: 'MD123456',
            department: 'Cardiology'
          },
          {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane.smith@hospital.com',
            specialization: 'Cardiology',
            licenseNumber: 'MD789012',
            department: 'Cardiology'
          },
          {
            firstName: 'Bob',
            lastName: 'Johnson',
            email: 'bob.johnson@hospital.com',
            specialization: 'Neurology',
            licenseNumber: 'MD345678',
            department: 'Neurology'
          }
        ]
      });
    });

    it('should get clinician statistics', async () => {
      const response = await request(app)
        .get('/api/clinicians/stats')
        .expect(200);

      expect(response.body.data).toMatchObject({
        total: 3,
        bySpecialization: {
          Cardiology: 2,
          Neurology: 1
        },
        byDepartment: {
          Cardiology: 2,
          Neurology: 1
        }
      });
    });
  });
});