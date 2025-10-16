const { describe, test, expect, beforeAll, afterAll } = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('../../src/routes/authRoutes');

const prisma = new PrismaClient();
const app = express();

app.use(express.json());
app.use('/auth', authRoutes);

describe('Authentication Integration Tests', () => {
  let testOrganization;
  let userToken;
  let userId;

  beforeAll(async () => {
    // Create test organization
    testOrganization = await prisma.organization.create({
      data: {
        name: 'Integration Test Healthcare',
        type: 'CLINIC',
        email: 'integration-test@example.com',
        settings: {
          requireMFA: false, // Disable MFA for integration tests
          allowSocialLogin: true
        }
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    // Delete refresh tokens first (due to foreign key constraints)
    if (userId) {
      await prisma.refreshToken.deleteMany({
        where: { userId: userId }
      });
    }
    await prisma.user.deleteMany({
      where: { email: { contains: 'integration-test' } }
    });
    if (testOrganization) {
      await prisma.organization.delete({
        where: { id: testOrganization.id }
      });
    }
    await prisma.$disconnect();
  });

  describe('Complete User Journey', () => {
    test('should register new user', async () => {
      // Register new user
      const registrationData = {
        email: 'integration-test@example.com',
        password: 'SecurePassword123!',
        firstName: 'Integration',
        lastName: 'Test',
        role: 'CLINICIAN',
        organizationId: testOrganization.id
      };

      const registerResponse = await request(app)
        .post('/auth/register')
        .send(registrationData)
        .expect(201);

      expect(registerResponse.body.token).toBeDefined();
      expect(registerResponse.body.user).toBeDefined();
      userId = registerResponse.body.user.id;
      userToken = registerResponse.body.token;
    });

    test('should login with registered user', async () => {
      // Wait a moment to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1000));

      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'integration-test@example.com',
          password: 'SecurePassword123!',
          organizationId: testOrganization.id
        })
        .expect(200);

      expect(loginResponse.body.token).toBeDefined();
      expect(loginResponse.body.user).toBeDefined();
      expect(loginResponse.body.refreshToken).toBeDefined();
      userToken = loginResponse.body.token;
    });

    test('should refresh token', async () => {
      // First login to get a refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'integration-test@example.com',
          password: 'SecurePassword123!',
          organizationId: testOrganization.id
        })
        .expect(200);

      const refreshToken = loginResponse.body.refreshToken;

      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(refreshResponse.body.token).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();
    });

    test('should logout', async () => {
      // First login to get tokens
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'integration-test@example.com',
          password: 'SecurePassword123!',
          organizationId: testOrganization.id
        })
        .expect(200);

      const token = loginResponse.body.token;
      const refreshToken = loginResponse.body.refreshToken;

      const logoutResponse = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .send({ refreshToken })
        .expect(200);

      expect(logoutResponse.body.message).toBeDefined();
    });

    // TODO: Implement password reset endpoints before enabling this test
    test.skip('should handle password reset flow', async () => {
      // Request password reset
      const resetResponse = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'integration-test@example.com' })
        .expect(200);

      expect(resetResponse.body.message).toContain('reset');
    });
  });

  describe('Security Tests', () => {
    test('should reject requests without valid token', async () => {
      await request(app)
        .post('/auth/select-organization')
        .send({ organizationId: testOrganization.id })
        .expect(401);
    });

    test('should reject requests with invalid token', async () => {
      await request(app)
        .post('/auth/select-organization')
        .set('Authorization', 'Bearer invalid-token')
        .send({ organizationId: testOrganization.id })
        .expect(401);
    });

    test('should sanitize input data', async () => {
      const maliciousData = {
        email: '<script>alert("xss")</script>@example.com',
        password: 'SecurePassword123!',
        firstName: '<script>alert("xss")</script>',
        lastName: 'Test',
        role: 'CLINICIAN',
        organizationId: testOrganization.id
      };

      const response = await request(app)
        .post('/auth/register')
        .send(maliciousData)
        .expect(400); // Should be rejected due to validation

      // If it somehow passes validation, ensure XSS is sanitized
      if (response.status === 201) {
        expect(response.body.user.firstName).not.toContain('<script>');
      }
    });
  });
});