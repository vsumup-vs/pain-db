/**
 * Test Suite: enrollmentId Linkage for Billing Calculations
 *
 * Purpose: Verify that TimeLogs and Observations are correctly linked to
 * billing enrollments for accurate billing readiness calculations.
 *
 * Tests:
 * 1. findBillingEnrollment helper function
 * 2. TimeLog creation with enrollmentId (via alert resolution)
 * 3. Observation creation with enrollmentId
 * 4. Multi-program enrollment scenario
 * 5. Billing readiness calculation with enrollmentId
 */

const { PrismaClient } = require('@prisma/client');
const { findBillingEnrollment } = require('../src/utils/billingHelpers');

const prisma = new PrismaClient();

describe('enrollmentId Linkage Tests', () => {
  let testOrg, testPatient, testClinician, rpmProgram, rtmProgram, rpmEnrollment, rtmEnrollment, rpmProgramRecord, rtmProgramRecord;

  beforeAll(async () => {
    // Get existing billing programs
    rpmProgram = await prisma.billingProgram.findFirst({
      where: { code: 'CMS_RPM_2025' }
    });

    rtmProgram = await prisma.billingProgram.findFirst({
      where: { code: 'CMS_RTM_2025' }
    });

    // Get existing care programs
    rpmProgramRecord = await prisma.careProgram.findFirst({
      where: { name: 'Remote Patient Monitoring (RPM)' }
    });

    rtmProgramRecord = await prisma.careProgram.findFirst({
      where: { name: 'Remote Therapeutic Monitoring (RTM)' }
    });

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
        medicalRecordNumber: 'MRN-BILL-001'
      }
    });

    // Create test clinician
    testClinician = await prisma.clinician.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Dr. Sarah',
        lastName: 'BillingTest',
        email: 'billing-test@example.com'
      }
    });

    // Create RPM enrollment (older)
    rpmEnrollment = await prisma.enrollment.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        clinicianId: testClinician.id,
        careProgramId: rpmProgramRecord.id,
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
        careProgramId: rtmProgramRecord.id,
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
          medicalRecordNumber: 'MRN-NOBILL-001'
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

      // Restore active status
      await prisma.enrollment.updateMany({
        where: { patientId: testPatient.id },
        data: { status: 'ACTIVE' }
      });
    });
  });

  describe('TimeLog Creation with enrollmentId', () => {
    test('should create TimeLog with enrollmentId via alert resolution', async () => {
      // Create alert
      const alert = await prisma.alert.create({
        data: {
          organizationId: testOrg.id,
          patientId: testPatient.id,
          severity: 'MEDIUM',
          message: 'Test alert for billing',
          status: 'PENDING'
        }
      });

      // Simulate alert resolution (this would normally go through alertController)
      const enrollmentId = await findBillingEnrollment(testPatient.id, testOrg.id);

      const timeLog = await prisma.timeLog.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          enrollmentId,
          activity: 'Alert resolution',
          duration: 15,
          cptCode: '99457',
          notes: 'Resolved test alert',
          billable: true,
          loggedAt: new Date()
        }
      });

      expect(timeLog.enrollmentId).toBeTruthy();
      expect(timeLog.enrollmentId).toBe(rtmEnrollment.id);

      // Clean up
      await prisma.timeLog.delete({ where: { id: timeLog.id } });
      await prisma.alert.delete({ where: { id: alert.id } });
    });
  });

  describe('Observation Creation with enrollmentId', () => {
    test('should create Observation with enrollmentId', async () => {
      // Get a metric definition (blood pressure systolic)
      const metric = await prisma.metricDefinition.findFirst({
        where: { name: { contains: 'Blood Pressure Systolic' } }
      });

      if (!metric) {
        console.warn('Skipping test: No blood pressure metric found');
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
          value: { numeric: 135 },
          unit: 'mmHg',
          source: 'DEVICE',
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

  describe('Multi-Program Enrollment Scenario', () => {
    test('should correctly link observations and time logs to respective enrollments', async () => {
      // Create blood pressure observation (should link to RPM)
      const bpMetric = await prisma.metricDefinition.findFirst({
        where: { name: { contains: 'Blood Pressure Systolic' } }
      });

      if (bpMetric) {
        const bpObservation = await prisma.observation.create({
          data: {
            organizationId: testOrg.id,
            patientId: testPatient.id,
            enrollmentId: rpmEnrollment.id, // Explicitly link to RPM
            metricId: bpMetric.id,
            value: { numeric: 140 },
            unit: 'mmHg',
            source: 'DEVICE',
            context: 'CLINICAL_MONITORING',
            recordedAt: new Date()
          }
        });

        expect(bpObservation.enrollmentId).toBe(rpmEnrollment.id);
      }

      // Create pain assessment time log (should link to RTM)
      const painTimeLog = await prisma.timeLog.create({
        data: {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          enrollmentId: rtmEnrollment.id, // Explicitly link to RTM
          activity: 'Pain therapy session',
          duration: 25,
          cptCode: '98975',
          notes: 'Pain management consultation',
          billable: true,
          loggedAt: new Date()
        }
      });

      expect(painTimeLog.enrollmentId).toBe(rtmEnrollment.id);

      // Verify observations count per enrollment
      const rpmObservations = await prisma.observation.count({
        where: {
          patientId: testPatient.id,
          enrollmentId: rpmEnrollment.id
        }
      });

      const rtmTimeLogs = await prisma.timeLog.count({
        where: {
          patientId: testPatient.id,
          enrollmentId: rtmEnrollment.id
        }
      });

      expect(rpmObservations).toBeGreaterThan(0);
      expect(rtmTimeLogs).toBeGreaterThan(0);

      // Clean up
      await prisma.observation.deleteMany({ where: { patientId: testPatient.id } });
      await prisma.timeLog.deleteMany({ where: { patientId: testPatient.id } });
    });
  });

  describe('Billing Readiness Calculation with enrollmentId', () => {
    test('should calculate billing readiness per enrollment', async () => {
      // Create 18 observations for RPM enrollment (16+ required)
      const bpMetric = await prisma.metricDefinition.findFirst({
        where: { name: { contains: 'Blood Pressure Systolic' } }
      });

      if (!bpMetric) {
        console.warn('Skipping test: No blood pressure metric found');
        return;
      }

      const observations = [];
      for (let i = 0; i < 18; i++) {
        observations.push({
          organizationId: testOrg.id,
          patientId: testPatient.id,
          enrollmentId: rpmEnrollment.id,
          metricId: bpMetric.id,
          value: { numeric: 120 + i },
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) // One per day
        });
      }

      await prisma.observation.createMany({ data: observations });

      // Create time logs totaling 25 minutes for RTM enrollment (20+ required)
      const timeLogs = [
        {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          enrollmentId: rtmEnrollment.id,
          activity: 'Pain assessment',
          duration: 15,
          cptCode: '98975',
          billable: true,
          loggedAt: new Date()
        },
        {
          patientId: testPatient.id,
          clinicianId: testClinician.id,
          enrollmentId: rtmEnrollment.id,
          activity: 'Treatment planning',
          duration: 10,
          cptCode: '98975',
          billable: true,
          loggedAt: new Date()
        }
      ];

      await prisma.timeLog.createMany({ data: timeLogs });

      // Calculate billing readiness for RPM enrollment
      const rpmObservationCount = await prisma.observation.count({
        where: {
          enrollmentId: rpmEnrollment.id,
          recordedAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        }
      });

      // Calculate unique days with observations
      const rpmDaysWithData = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT DATE(recorded_at)) as days
        FROM observations
        WHERE enrollment_id = ${rpmEnrollment.id}
          AND recorded_at >= NOW() - INTERVAL '30 days'
      `;

      const rpmDays = parseInt(rpmDaysWithData[0]?.days || 0);

      // Calculate billing readiness for RTM enrollment
      const rtmTimeTotal = await prisma.timeLog.aggregate({
        where: {
          enrollmentId: rtmEnrollment.id,
          billable: true,
          loggedAt: {
            gte: new Date(new Date().setDate(new Date().getDate() - 30))
          }
        },
        _sum: {
          duration: true
        }
      });

      const rtmMinutes = rtmTimeTotal._sum.duration || 0;

      // Verify billing eligibility
      expect(rpmDays).toBeGreaterThanOrEqual(16); // RPM: 16+ days of readings
      expect(rtmMinutes).toBeGreaterThanOrEqual(20); // RTM: 20+ minutes of clinical time

      console.log('\n=== Billing Readiness Summary ===');
      console.log(`RPM Enrollment: ${rpmDays} days of data (16+ required) ✓`);
      console.log(`RTM Enrollment: ${rtmMinutes} minutes logged (20+ required) ✓`);
      console.log('================================\n');

      // Clean up
      await prisma.observation.deleteMany({ where: { patientId: testPatient.id } });
      await prisma.timeLog.deleteMany({ where: { patientId: testPatient.id } });
    });
  });
});
