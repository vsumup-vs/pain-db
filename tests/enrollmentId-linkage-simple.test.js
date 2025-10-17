/**
 * Simple Test Suite: enrollmentId Linkage for Billing Calculations
 *
 * Purpose: Verify that the findBillingEnrollment helper function works correctly
 * and that TimeLogs/Observations can be created with enrollmentId linkage.
 */

const { PrismaClient } = require('@prisma/client');
const { findBillingEnrollment } = require('../src/utils/billingHelpers');

const prisma = new PrismaClient();

describe('enrollmentId Linkage - Simple Tests', () => {
  let testOrg, testPatient, testClinician, rpmProgram, rtmProgram, rpmEnrollment, rtmEnrollment;

  beforeAll(async () => {
    // Get existing billing programs (these should always exist from seed data)
    rpmProgram = await prisma.billingProgram.findFirst({
      where: { code: 'CMS_RPM_2025' }
    });

    rtmProgram = await prisma.billingProgram.findFirst({
      where: { code: 'CMS_RTM_2025' }
    });

    if (!rpmProgram || !rtmProgram) {
      throw new Error('Billing programs not found. Please run seed script first.');
    }

    // Create test organization with unique name
    testOrg = await prisma.organization.create({
      data: {
        name: `Test Billing Clinic ${Date.now()}`,
        type: 'CLINIC'
      }
    });

    // Create test patient
    testPatient = await prisma.patient.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'John',
        lastName: 'BillingTest',
        dateOfBirth: new Date('1970-01-01'),
        medicalRecordNumber: `MRN-BILL-${Date.now()}`
      }
    });

    // Create test clinician
    testClinician = await prisma.clinician.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Dr. Sarah',
        lastName: 'BillingTest',
        email: `billing-test-${Date.now()}@example.com`
      }
    });

    // Create RPM enrollment (older) - no careProgramId required for this test
    rpmEnrollment = await prisma.enrollment.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        clinicianId: testClinician.id,
        billingProgramId: rpmProgram.id,
        status: 'ACTIVE',
        startDate: new Date('2025-01-01')
      }
    });

    // Create RTM enrollment (more recent)
    rtmEnrollment = await prisma.enrollment.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        clinicianId: testClinician.id,
        billingProgramId: rtmProgram.id,
        status: 'ACTIVE',
        startDate: new Date('2025-02-01')
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.timeLog.deleteMany({ where: { patientId: testPatient.id } });
    await prisma.observation.deleteMany({ where: { patientId: testPatient.id } });
    await prisma.alert.deleteMany({ where: { patientId: testPatient.id } });
    await prisma.enrollment.deleteMany({ where: { patientId: testPatient.id } });
    await prisma.patient.delete({ where: { id: testPatient.id } });
    await prisma.clinician.delete({ where: { id: testClinician.id } });
    await prisma.organization.delete({ where: { id: testOrg.id } });
    await prisma.$disconnect();
  });

  describe('findBillingEnrollment Helper Function', () => {
    test('should return most recent active enrollment with billing program', async () => {
      const enrollmentId = await findBillingEnrollment(testPatient.id, testOrg.id);

      expect(enrollmentId).toBeTruthy();
      expect(enrollmentId).toBe(rtmEnrollment.id); // RTM is more recent
    });

    test('should return null for patient with no billing enrollments', async () => {
      // Create patient without billing enrollment
      const noBillingPatient = await prisma.patient.create({
        data: {
          organizationId: testOrg.id,
          firstName: 'Jane',
          lastName: 'NoBilling',
          dateOfBirth: new Date('1980-01-01'),
          medicalRecordNumber: `MRN-NOBILL-${Date.now()}`
        }
      });

      const enrollmentId = await findBillingEnrollment(noBillingPatient.id, testOrg.id);
      expect(enrollmentId).toBeNull();

      // Clean up
      await prisma.patient.delete({ where: { id: noBillingPatient.id } });
    });

    test('should return null for patient with inactive enrollment', async () => {
      // Make all enrollments inactive
      await prisma.enrollment.updateMany({
        where: { patientId: testPatient.id },
        data: { status: 'COMPLETED' }
      });

      const enrollmentId = await findBillingEnrollment(testPatient.id, testOrg.id);
      expect(enrollmentId).toBeNull();

      // Restore active status for other tests
      await prisma.enrollment.updateMany({
        where: { patientId: testPatient.id },
        data: { status: 'ACTIVE' }
      });
    });
  });

  describe('TimeLog Creation with enrollmentId', () => {
    test('should create TimeLog with enrollmentId', async () => {
      // Auto-detect enrollmentId
      const enrollmentId = await findBillingEnrollment(testPatient.id, testOrg.id);

      const timeLog = await prisma.timeLog.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          enrollmentId,
          activity: 'Test activity',
          duration: 15,
          cptCode: '99457',
          notes: 'Test time log',
          billable: true,
          loggedAt: new Date()
        }
      });

      expect(timeLog.enrollmentId).toBeTruthy();
      expect(timeLog.enrollmentId).toBe(rtmEnrollment.id);

      // Clean up
      await prisma.timeLog.delete({ where: { id: timeLog.id } });
    });
  });

  describe('Observation Creation with enrollmentId', () => {
    test('should create Observation with enrollmentId', async () => {
      // Get any metric definition
      const metric = await prisma.metricDefinition.findFirst();

      if (!metric) {
        console.warn('Skipping test: No metric definitions found');
        return;
      }

      // Auto-detect enrollmentId
      const enrollmentId = await findBillingEnrollment(testPatient.id, testOrg.id);

      const observation = await prisma.observation.create({
        data: {
          organizationId: testOrg.id,
          patientId: testPatient.id,
          enrollmentId,
          metricId: metric.id,
          value: { numeric: 120 },
          unit: metric.unit || 'units',
          source: 'MANUAL',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      expect(observation.enrollmentId).toBeTruthy();
      expect(observation.enrollmentId).toBe(rtmEnrollment.id);

      // Clean up
      await prisma.observation.delete({ where: { id: observation.id } });
    });
  });

  describe('Multi-Enrollment Scenario', () => {
    test('should correctly distinguish between RPM and RTM enrollments', async () => {
      // Create time logs for both enrollments
      const rpmTimeLog = await prisma.timeLog.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          enrollmentId: rpmEnrollment.id, // Explicitly link to RPM
          activity: 'RPM activity',
          duration: 10,
          billable: true,
          loggedAt: new Date()
        }
      });

      const rtmTimeLog = await prisma.timeLog.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          enrollmentId: rtmEnrollment.id, // Explicitly link to RTM
          activity: 'RTM activity',
          duration: 15,
          billable: true,
          loggedAt: new Date()
        }
      });

      // Verify counts per enrollment
      const rpmCount = await prisma.timeLog.count({
        where: {
          patientId: testPatient.id,
          enrollmentId: rpmEnrollment.id
        }
      });

      const rtmCount = await prisma.timeLog.count({
        where: {
          patientId: testPatient.id,
          enrollmentId: rtmEnrollment.id
        }
      });

      expect(rpmCount).toBeGreaterThanOrEqual(1);
      expect(rtmCount).toBeGreaterThanOrEqual(1);

      // Clean up
      await prisma.timeLog.delete({ where: { id: rpmTimeLog.id } });
      await prisma.timeLog.delete({ where: { id: rtmTimeLog.id } });
    });
  });
});
