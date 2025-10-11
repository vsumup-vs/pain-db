const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const authRoutes = require('../../src/routes/authRoutes');
const jwtService = require('../../src/services/jwtService');
const socialAuthService = require('../../src/services/socialAuthService');

const prisma = new PrismaClient();
const app = express();

// Setup express app for testing
app.use(express.json());
app.use('/auth', authRoutes);

describe('Authentication Service Tests', () => {
  let testUser;
  let testOrganization;

  beforeAll(async () => {
    // Create test organization
    testOrganization = await prisma.organization.create({
      data: {
        name: 'Test Healthcare Organization',
        type: 'HEALTHCARE_PROVIDER',
        domain: 'test-healthcare.com',
        settings: {
          requireMFA: true,
          allowSocialLogin: true
        }
      }
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    });
    await prisma.organization.delete({
      where: { id: testOrganization.id }
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up any existing test users
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    });
  });

  describe('JWT Service', () => {
    test('should generate valid JWT token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'CLINICIAN',
        organizationId: testOrganization.id
      };

      const token = jwtService.generateToken(payload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should verify JWT token', () => {
      const payload = {
        userId: 'test-user-id',
        email: 'test@example.com',
        role: 'CLINICIAN',
        organizationId: testOrganization.id
      };

      const token = jwtService.generateToken(payload);
      const decoded = jwtService.verifyToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    test('should reject invalid JWT token', () => {
      expect(() => {
        jwtService.verifyToken('invalid-token');
      }).toThrow();
    });
  });

  describe('User Registration', () => {
    test('should register new user successfully', async () => {
      const userData = {
        email: 'test-user@example.com',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'CLINICIAN',
        organizationId: testOrganization.id
      };

      const response = await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user.password).toBeUndefined(); // Password should not be returned
    });

    test('should reject registration with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'CLINICIAN',
        organizationId: testOrganization.id
      };

      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });

    test('should reject registration with weak password', async () => {
      const userData = {
        email: 'test-user2@example.com',
        password: '123',
        firstName: 'Test',
        lastName: 'User',
        role: 'CLINICIAN',
        organizationId: testOrganization.id
      };

      await request(app)
        .post('/auth/register')
        .send(userData)
        .expect(400);
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Create test user for login tests
      testUser = await socialAuthService.createUser({
        email: 'test-login@example.com',
        firstName: 'Test',
        lastName: 'Login',
        role: 'CLINICIAN',
        organizationId: testOrganization.id,
        password: 'SecurePassword123!'
      });
    });

    test('should login with valid credentials', async () => {
      const loginData = {
        email: 'test-login@example.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.email).toBe(loginData.email);
    });

    test('should reject login with invalid credentials', async () => {
      const loginData = {
        email: 'test-login@example.com',
        password: 'WrongPassword'
      };

      await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });

    test('should reject login with non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'SecurePassword123!'
      };

      await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);
    });
  });

  describe('MFA (Multi-Factor Authentication)', () => {
    beforeEach(async () => {
      testUser = await socialAuthService.createUser({
        email: 'test-mfa@example.com',
        firstName: 'Test',
        lastName: 'MFA',
        role: 'CLINICIAN',
        organizationId: testOrganization.id,
        password: 'SecurePassword123!'
      });
    });

    test('should setup MFA successfully', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test-mfa@example.com',
          password: 'SecurePassword123!'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .post('/auth/mfa/setup')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.qrCode).toBeDefined();
      expect(response.body.secret).toBeDefined();
    });
  });

  describe('Organization Access', () => {
    test('should select organization successfully', async () => {
      testUser = await socialAuthService.createUser({
        email: 'test-org@example.com',
        firstName: 'Test',
        lastName: 'Org',
        role: 'CLINICIAN',
        organizationId: testOrganization.id,
        password: 'SecurePassword123!'
      });

      // Login first
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'test-org@example.com',
          password: 'SecurePassword123!'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .post('/auth/select-organization')
        .set('Authorization', `Bearer ${token}`)
        .send({ organizationId: testOrganization.id })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limiting on login attempts', async () => {
      const loginData = {
        email: 'test-rate-limit@example.com',
        password: 'WrongPassword'
      };

      // Make multiple failed login attempts
      for (let i = 0; i < 6; i++) {
        await request(app)
          .post('/auth/login')
          .send(loginData);
      }

      // The 6th attempt should be rate limited
      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(429); // Too Many Requests
    });
  });
});