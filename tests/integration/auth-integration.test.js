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
        type: 'HEALTHCARE_PROVIDER',
        domain: 'integration-test.com',
        settings: {
          requireMFA: false, // Disable MFA for integration tests
          allowSocialLogin: true
        }
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: { email: { contains: 'integration-test' } }
    });
    await prisma.organization.delete({
      where: { id: testOrganization.id }
    });
    await prisma.$disconnect();
  });

  describe('Complete User Journey', () => {
    test('should complete full registration and login flow', async () => {
      // Step 1: Register new user
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

      expect(registerResponse.body.success).toBe(true);
      userId = registerResponse.body.user.id;

      // Step 2: Login with registered user
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: registrationData.email,
          password: registrationData.password
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.token).toBeDefined();
      userToken = loginResponse.body.token;

      // Step 3: Select organization
      const orgResponse = await request(app)
        .post('/auth/select-organization')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ organizationId: testOrganization.id })
        .expect(200);

      expect(orgResponse.body.success).toBe(true);
      userToken = orgResponse.body.token; // Update token with org context

      // Step 4: Refresh token
      const refreshResponse = await request(app)
        .post('/auth/refresh')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.token).toBeDefined();

      // Step 5: Logout
      const logoutResponse = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
    });

    test('should handle password reset flow', async () => {
      // Request password reset
      const resetResponse = await request(app)
        .post('/auth/forgot-password')
        .send({ email: 'integration-test@example.com' })
        .expect(200);

      expect(resetResponse.body.success).toBe(true);
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