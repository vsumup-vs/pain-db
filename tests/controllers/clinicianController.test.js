const request = require('supertest');
const { app } = require('../../index');

// Use global prisma client for test isolation
const prisma = global.prisma;

describe('Clinician Controller', () => {
  // Global cleanup before all tests
  beforeAll(async () => {
    await prisma.clinician.deleteMany({});
  });

  // Clean up after all tests are done
  afterAll(async () => {
    await prisma.clinician.deleteMany({});
  });

  describe('POST /api/clinicians', () => {
    let testClinician;
    
    beforeEach(async () => {
      // Clean up before each POST test to ensure isolation
      await prisma.clinician.deleteMany({});
    });

    afterEach(async () => {
      // Clean up after each POST test to prevent interference
      await prisma.clinician.deleteMany({});
    });
    
    it('should create a new clinician with valid data', async () => {
      const clinicianData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@hospital.com',
        specialization: 'Cardiology',
        licenseNumber: 'MD123456',
        department: 'Cardiology Department'
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
        email: 'duplicate.email@hospital.com',
        specialization: 'Cardiology',
        licenseNumber: 'MD111111'
      };

      // Create first clinician
      await request(app)
        .post('/api/clinicians')
        .send(clinicianData)
        .expect(201);

      // Try to create second clinician with same email
      const response = await request(app)
        .post('/api/clinicians')
        .send({
          ...clinicianData,
          licenseNumber: 'MD222222'
        })
        .expect(409);

      expect(response.body.error).toBe('Clinician with this email already exists');
    });

    it('should return 409 for duplicate license number', async () => {
      const clinicianData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'duplicate.license@hospital.com',
        specialization: 'Neurology',
        licenseNumber: 'MD333333'
      };

      // Create first clinician
      await request(app)
        .post('/api/clinicians')
        .send(clinicianData)
        .expect(201);

      // Try to create second clinician with same license number
      const response = await request(app)
        .post('/api/clinicians')
        .send({
          ...clinicianData,
          email: 'different.email@hospital.com'
        })
        .expect(409);

      expect(response.body.error).toBe('Clinician with this license number already exists');
    });

    it('should return 409 for duplicate license number (second test)', async () => {
      const clinicianData = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith.unique@hospital.com',
        specialization: 'Cardiology',
        licenseNumber: 'MD999999'
      };

      // Create first clinician
      await request(app)
        .post('/api/clinicians')
        .send(clinicianData)
        .expect(201);

      // Try to create second clinician with same license number
      const response = await request(app)
        .post('/api/clinicians')
        .send({
          ...clinicianData,
          email: 'different.email.unique@hospital.com'
        })
        .expect(409);

      expect(response.body.error).toBe('Clinician with this license number already exists');
    });
  });

  describe('GET /api/clinicians', () => {
    let testClinicians = [];

    beforeEach(async () => {
      // Clean up and create fresh test data for GET tests
      await prisma.clinician.deleteMany({});
      
      // Create exactly 2 test clinicians for consistent testing
      const clinician1 = await prisma.clinician.create({
        data: {
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.johnson@hospital.com',
          specialization: 'Cardiology',
          licenseNumber: 'MD001',
          department: 'Cardiology'
        }
      });

      const clinician2 = await prisma.clinician.create({
        data: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane.smith@hospital.com',
          specialization: 'Neurology',
          licenseNumber: 'MD002',
          department: 'Neurology'
        }
      });

      testClinicians = [clinician1, clinician2];
    });

    afterEach(async () => {
      await prisma.clinician.deleteMany({});
      testClinicians = [];
    });

    it('should get all clinicians with default pagination', async () => {
      const response = await request(app)
        .get('/api/clinicians')
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2
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
        .get('/api/clinicians?page=invalid&limit=invalid')
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/clinicians/:id', () => {
    let testClinicianForGet;

    beforeEach(async () => {
      await prisma.clinician.deleteMany({});
      
      testClinicianForGet = await prisma.clinician.create({
        data: {
          firstName: 'Test',
          lastName: 'Clinician',
          email: 'test.get@hospital.com',
          specialization: 'Cardiology',
          licenseNumber: 'MD999',
          department: 'Cardiology'
        }
      });
    });

    afterEach(async () => {
      await prisma.clinician.deleteMany({});
    });

    it('should get clinician by valid ID', async () => {
      const response = await request(app)
        .get(`/api/clinicians/${testClinicianForGet.id}`)
        .expect(200);

      expect(response.body.data).toMatchObject({
        id: testClinicianForGet.id,
        firstName: 'Test',
        lastName: 'Clinician',
        email: 'test.get@hospital.com'
      });
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/clinicians/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid clinician ID format');
    });

    it('should return 404 for non-existent clinician', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/clinicians/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Clinician not found');
    });
  });

  describe('PUT /api/clinicians/:id', () => {
    let testClinicianForUpdate;

    beforeEach(async () => {
      await prisma.clinician.deleteMany({});
      
      testClinicianForUpdate = await prisma.clinician.create({
        data: {
          firstName: 'Update',
          lastName: 'Test',
          email: 'update.test@hospital.com',
          specialization: 'Cardiology',
          licenseNumber: 'MD888',
          department: 'Cardiology Department'
        }
      });
    });

    afterEach(async () => {
      await prisma.clinician.deleteMany({});
    });

    it('should update clinician with valid data', async () => {
      const updateData = {
        firstName: 'Johnny',
        department: 'Updated Cardiology Department'
      };

      const response = await request(app)
        .put(`/api/clinicians/${testClinicianForUpdate.id}`)
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

      expect(response.body.error).toBe('Invalid clinician ID format');
    });

    it('should return 404 for non-existent clinician', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .put(`/api/clinicians/${nonExistentId}`)
        .send({ firstName: 'Updated' })
        .expect(404);

      expect(response.body.error).toBe('Clinician not found');
    });
  });

  describe('DELETE /api/clinicians/:id', () => {
    let testClinicianForDelete;

    beforeEach(async () => {
      await prisma.clinician.deleteMany({});
      
      testClinicianForDelete = await prisma.clinician.create({
        data: {
          firstName: 'Delete',
          lastName: 'Test',
          email: 'delete.test@hospital.com',
          specialization: 'Cardiology',
          licenseNumber: 'MD777',
          department: 'Cardiology'
        }
      });
    });

    afterEach(async () => {
      await prisma.clinician.deleteMany({});
    });

    it('should delete clinician with valid ID', async () => {
      const response = await request(app)
        .delete(`/api/clinicians/${testClinicianForDelete.id}`)
        .expect(200);

      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/clinicians/invalid-id')
        .expect(400);

      expect(response.body.error).toBe('Invalid clinician ID format');
    });

    it('should return 404 for non-existent clinician', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .delete(`/api/clinicians/${nonExistentId}`)
        .expect(404);

      expect(response.body.error).toBe('Clinician not found');
    });
  });

  describe('GET /api/clinicians/stats', () => {
    beforeEach(async () => {
      // Clean up and create specific test data for stats
      await prisma.clinician.deleteMany({});
      
      // Create exactly 3 clinicians with known specializations and departments
      await prisma.clinician.createMany({
        data: [
          {
            firstName: 'Dr. Alice',
            lastName: 'Smith',
            email: 'alice.smith@test.com',
            specialization: 'Cardiology',
            department: 'Cardiology',
            licenseNumber: 'MD001'
          },
          {
            firstName: 'Dr. Bob',
            lastName: 'Johnson',
            email: 'bob.johnson@test.com',
            specialization: 'Cardiology',
            department: 'Cardiology',
            licenseNumber: 'MD002'
          },
          {
            firstName: 'Dr. Carol',
            lastName: 'Williams',
            email: 'carol.williams@test.com',
            specialization: 'Neurology',
            department: 'Neurology',
            licenseNumber: 'MD003'
          }
        ]
      });
    });

    afterEach(async () => {
      await prisma.clinician.deleteMany({});
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