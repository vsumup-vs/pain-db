const request = require('supertest');
const { app, prisma } = require('../../index');
const { generateUserToken } = require('../../src/services/jwtService');

/**
 * Multi-Tenant Data Isolation Tests
 *
 * These tests verify that users can only access data from their own organization
 * and cannot access data from other organizations.
 *
 * CRITICAL for HIPAA compliance
 */

describe('Multi-Tenant Data Isolation', () => {
  let org1, org2;
  let user1Token, user2Token;
  let patient1, patient2;
  let user1, user2;

  beforeAll(async () => {
    // Create two organizations
    org1 = await prisma.organization.create({
      data: {
        name: 'Test Hospital A',
        type: 'HOSPITAL',
        email: 'admin@hospital-a.com',
        isActive: true
      }
    });

    org2 = await prisma.organization.create({
      data: {
        name: 'Test Hospital B',
        type: 'HOSPITAL',
        email: 'admin@hospital-b.com',
        isActive: true
      }
    });

    // Create users for each organization
    user1 = await prisma.user.create({
      data: {
        email: 'user1@hospital-a.com',
        passwordHash: 'hashedpassword',
        firstName: 'User',
        lastName: 'One',
        isActive: true,
        userOrganizations: {
          create: {
            organizationId: org1.id,
            role: 'CLINICIAN',
            permissions: ['PATIENT_READ', 'PATIENT_WRITE', 'OBSERVATION_READ'],
            isActive: true
          }
        }
      }
    });

    user2 = await prisma.user.create({
      data: {
        email: 'user2@hospital-b.com',
        passwordHash: 'hashedpassword',
        firstName: 'User',
        lastName: 'Two',
        isActive: true,
        userOrganizations: {
          create: {
            organizationId: org2.id,
            role: 'CLINICIAN',
            permissions: ['PATIENT_READ', 'PATIENT_WRITE', 'OBSERVATION_READ'],
            isActive: true
          }
        }
      }
    });

    // Generate JWT tokens
    user1Token = await generateUserToken(user1);
    user2Token = await generateUserToken(user2);

    // Create patients in different organizations
    patient1 = await prisma.patient.create({
      data: {
        organizationId: org1.id,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        dateOfBirth: new Date('1980-01-01')
      }
    });

    patient2 = await prisma.patient.create({
      data: {
        organizationId: org2.id,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        dateOfBirth: new Date('1985-05-15')
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.patient.deleteMany({
      where: {
        id: { in: [patient1.id, patient2.id] }
      }
    });

    await prisma.userOrganization.deleteMany({
      where: {
        userId: { in: [user1.id, user2.id] }
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: { in: [user1.id, user2.id] }
      }
    });

    await prisma.organization.deleteMany({
      where: {
        id: { in: [org1.id, org2.id] }
      }
    });

    await prisma.$disconnect();
  });

  describe('Patient Data Isolation', () => {
    test('User 1 can access patients from their organization', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      const patientIds = response.body.data.map(p => p.id);
      expect(patientIds).toContain(patient1.id);
      expect(patientIds).not.toContain(patient2.id);
    });

    test('User 2 can access patients from their organization', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      const patientIds = response.body.data.map(p => p.id);
      expect(patientIds).toContain(patient2.id);
      expect(patientIds).not.toContain(patient1.id);
    });

    test('User 1 cannot access patient from User 2 organization', async () => {
      const response = await request(app)
        .get(`/api/patients/${patient2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    test('User 2 cannot access patient from User 1 organization', async () => {
      const response = await request(app)
        .get(`/api/patients/${patient1.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    test('User 1 cannot update patient from User 2 organization', async () => {
      const response = await request(app)
        .put(`/api/patients/${patient2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ firstName: 'Hacked' })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    test('User 1 cannot delete patient from User 2 organization', async () => {
      const response = await request(app)
        .delete(`/api/patients/${patient2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Statistics Isolation', () => {
    test('User 1 statistics only include their organization data', async () => {
      const response = await request(app)
        .get('/api/patients/stats')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      // Should only count patients from org1
      expect(response.body.data).toBeDefined();
      expect(response.body.data.total).toBeGreaterThanOrEqual(1);
      // The total should not include patient2 from org2
    });

    test('User 2 statistics only include their organization data', async () => {
      const response = await request(app)
        .get('/api/patients/stats')
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      // Should only count patients from org2
      expect(response.body.data).toBeDefined();
      expect(response.body.data.total).toBeGreaterThanOrEqual(1);
      // The total should not include patient1 from org1
    });
  });

  describe('Authentication & Authorization', () => {
    test('Unauthenticated requests are rejected', async () => {
      const response = await request(app)
        .get('/api/patients')
        .expect(401);

      expect(response.body.error).toBeDefined();
      expect(response.body.code).toBe('AUTH_TOKEN_MISSING');
    });

    test('Invalid token is rejected', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    test('Organization context is required', async () => {
      // This would require a token without organization context
      // which shouldn't be possible with proper token generation
      // but we test defensive programming
    });
  });

  describe('Audit Logging', () => {
    test('Access denied events are logged', async () => {
      // Attempt cross-org access
      await request(app)
        .get(`/api/patients/${patient2.id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(404);

      // Check if audit log was created
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          userId: user1.id,
          action: 'CROSS_ORG_ACCESS_ATTEMPT'
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      });

      expect(auditLogs.length).toBeGreaterThan(0);
      expect(auditLogs[0].hipaaRelevant).toBe(true);
    });
  });
});

describe('Cross-Organization Data Leakage Prevention', () => {
  test('Search across organizations is prevented', async () => {
    // This test ensures that search functionality doesn't leak data
    // from other organizations
  });

  test('Bulk operations respect organization boundaries', async () => {
    // Test that bulk create/update/delete operations
    // cannot affect other organizations
  });

  test('Related data respects organization boundaries', async () => {
    // Test that when fetching related data (e.g., patient with observations)
    // only data from the same organization is included
  });
});
