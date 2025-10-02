const request = require('supertest');
const { app } = require('../../index');

describe('Alert Controller', () => {
  let testPatient, testClinician, testEnrollment, testAlert;

  beforeEach(async () => {
    // Clean up before each test
    await global.prisma.alert.deleteMany({});
    await global.prisma.enrollment.deleteMany({});
    await global.prisma.patient.deleteMany({});
    await global.prisma.clinician.deleteMany({});

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

    // Create test enrollment
    testEnrollment = await global.prisma.enrollment.create({
      data: {
        patientId: testPatient.id,
        clinicianId: testClinician.id,
        diagnosisCode: 'M79.3',
        startDate: new Date(),
        status: 'active'
      }
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await global.prisma.alert.deleteMany({});
    await global.prisma.enrollment.deleteMany({});
    await global.prisma.patient.deleteMany({});
    await global.prisma.clinician.deleteMany({});
  });

  describe('POST /api/alerts', () => {
    it('should create a new alert successfully', async () => {
      const alertData = {
        patientId: testPatient.id,
        enrollmentId: testEnrollment.id,
        type: 'high_pain',
        severity: 'high',
        title: 'High Pain Alert',
        message: 'Patient reported pain level above threshold',
        triggerValue: '8'
      };

      const response = await request(app)
        .post('/api/alerts')
        .send(alertData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        type: 'high_pain',
        severity: 'high',
        title: 'High Pain Alert',
        status: 'open'
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/alerts')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/alerts', () => {
    beforeEach(async () => {
      // Create test alerts
      await global.prisma.alert.createMany({
        data: [
          {
            patientId: testPatient.id,
            enrollmentId: testEnrollment.id,
            type: 'high_pain',
            severity: 'high',
            title: 'High Pain Alert 1',
            message: 'Test alert 1',
            status: 'open'
          },
          {
            patientId: testPatient.id,
            enrollmentId: testEnrollment.id,
            type: 'medication',
            severity: 'medium',
            title: 'Medication Alert',
            message: 'Test alert 2',
            status: 'acknowledged'
          }
        ]
      });
    });

    it('should get all alerts with pagination', async () => {
      const response = await request(app)
        .get('/api/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.alerts).toHaveLength(2);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2
      });
    });

    it('should filter alerts by status', async () => {
      const response = await request(app)
        .get('/api/alerts?status=open')
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].status).toBe('open');
    });

    it('should filter alerts by severity', async () => {
      const response = await request(app)
        .get('/api/alerts?severity=high')
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].severity).toBe('high');
    });

    it('should search alerts by title', async () => {
      const response = await request(app)
        .get('/api/alerts?search=Medication')
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].title).toContain('Medication');
    });
  });

  describe('GET /api/alerts/:id', () => {
    beforeEach(async () => {
      testAlert = await global.prisma.alert.create({
        data: {
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          type: 'test_alert',
          severity: 'medium',
          title: 'Test Alert',
          message: 'Test alert message',
          status: 'open'
        }
      });
    });

    it('should get alert by ID', async () => {
      const response = await request(app)
        .get(`/api/alerts/${testAlert.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testAlert.id);
      expect(response.body.data.title).toBe('Test Alert');
    });

    it('should return 404 for non-existent alert', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .get(`/api/alerts/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/alerts/:id', () => {
    beforeEach(async () => {
      testAlert = await global.prisma.alert.create({
        data: {
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          type: 'update_test',
          severity: 'medium',
          title: 'Update Test Alert',
          message: 'Test alert for updating',
          status: 'open'
        }
      });
    });

    it('should update alert status successfully', async () => {
      const updateData = {
        status: 'acknowledged',
        acknowledgedBy: testClinician.id,
        notes: 'Alert acknowledged by clinician'
      };

      const response = await request(app)
        .put(`/api/alerts/${testAlert.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('acknowledged');
      expect(response.body.data.acknowledgedBy).toBe(testClinician.id);
    });

    it('should return 404 for non-existent alert', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .put(`/api/alerts/${nonExistentId}`)
        .send({ status: 'acknowledged' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/alerts/:id', () => {
    beforeEach(async () => {
      testAlert = await global.prisma.alert.create({
        data: {
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          type: 'delete_test',
          severity: 'low',
          title: 'Delete Test Alert',
          message: 'Test alert for deletion',
          status: 'resolved'
        }
      });
    });

    it('should delete alert successfully', async () => {
      const response = await request(app)
        .delete(`/api/alerts/${testAlert.id}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent alert', async () => {
      const nonExistentId = '550e8400-e29b-41d4-a716-446655440000';
      
      const response = await request(app)
        .delete(`/api/alerts/${nonExistentId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/alerts/stats', () => {
    beforeEach(async () => {
      await global.prisma.alert.createMany({
        data: [
          {
            patientId: testPatient.id,
            enrollmentId: testEnrollment.id,
            type: 'high_pain',
            severity: 'high',
            title: 'High Pain Alert',
            message: 'Test alert',
            status: 'open'
          },
          {
            patientId: testPatient.id,
            enrollmentId: testEnrollment.id,
            type: 'medication',
            severity: 'medium',
            title: 'Medication Alert',
            message: 'Test alert',
            status: 'acknowledged'
          },
          {
            patientId: testPatient.id,
            enrollmentId: testEnrollment.id,
            type: 'reminder',
            severity: 'low',
            title: 'Reminder Alert',
            message: 'Test alert',
            status: 'resolved'
          }
        ]
      });
    });

    it('should get alert statistics', async () => {
      const response = await request(app)
        .get('/api/alerts/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('byStatus');
      expect(response.body.data).toHaveProperty('bySeverity');
      expect(response.body.data.total).toBe(3);
    });
  });
});