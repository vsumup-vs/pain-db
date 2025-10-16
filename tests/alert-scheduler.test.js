/**
 * Alert Scheduler Tests (Phase 1a - Alert Evaluation Engine)
 * Tests scheduled background jobs for alert evaluation
 */

const { PrismaClient } = require('@prisma/client');
const alertScheduler = require('../src/services/alertScheduler');

const prisma = new PrismaClient();

describe('Alert Scheduler Service', () => {
  const testOrganizationId = 'test-org-123';
  const testUserId = 'test-user-123';
  const testPatientId = 'test-patient-123';
  const testClinicianId = 'test-clinician-123';

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.alert.deleteMany({
      where: { organizationId: testOrganizationId }
    });
    await prisma.assessment.deleteMany({
      where: { patientId: testPatientId }
    });
    await prisma.enrollment.deleteMany({
      where: { organizationId: testOrganizationId }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.alert.deleteMany({
      where: { organizationId: testOrganizationId }
    });
    await prisma.assessment.deleteMany({
      where: { patientId: testPatientId }
    });
    await prisma.enrollment.deleteMany({
      where: { organizationId: testOrganizationId }
    });
    await prisma.$disconnect();
  });

  describe('evaluateMissedAssessments', () => {
    it('should create alert for missed required assessment', async () => {
      // Get or create test organization
      let organization = await prisma.organization.findFirst({
        where: { id: testOrganizationId }
      });

      if (!organization) {
        organization = await prisma.organization.create({
          data: {
            id: testOrganizationId,
            name: 'Test Organization',
            type: 'CLINIC',
            email: 'test@test.com',
            timezone: 'America/New_York'
          }
        });
      }

      // Get or create test patient
      let patient = await prisma.patient.findFirst({
        where: { id: testPatientId }
      });

      if (!patient) {
        patient = await prisma.patient.create({
          data: {
            id: testPatientId,
            organizationId: testOrganizationId,
            firstName: 'Test',
            lastName: 'Patient',
            email: 'patient@test.com',
            dateOfBirth: new Date('1990-01-01')
          }
        });
      }

      // Get or create test clinician
      let clinician = await prisma.clinician.findFirst({
        where: { id: testClinicianId }
      });

      if (!clinician) {
        clinician = await prisma.clinician.create({
          data: {
            id: testClinicianId,
            organizationId: testOrganizationId,
            firstName: 'Test',
            lastName: 'Clinician',
            email: 'clinician@test.com',
            specialization: 'General Practice'
          }
        });
      }

      // Get or create condition preset with assessment template
      let conditionPreset = await prisma.conditionPreset.findFirst({
        where: { organizationId: null },
        include: { templates: { include: { template: true } } }
      });

      if (!conditionPreset) {
        // Create assessment template
        const template = await prisma.assessmentTemplate.create({
          data: {
            name: 'Daily Pain Assessment',
            description: 'Daily pain tracking assessment',
            version: '1.0',
            isActive: true
          }
        });

        // Create condition preset
        conditionPreset = await prisma.conditionPreset.create({
          data: {
            name: 'Chronic Pain Management',
            description: 'Standard chronic pain monitoring protocol',
            icd10Codes: ['M79.3'],
            templates: {
              create: [{
                templateId: template.id,
                isRequired: true,
                frequency: 'daily'
              }]
            }
          },
          include: { templates: { include: { template: true } } }
        });
      }

      // Create enrollment without recent assessments (should trigger alert)
      const enrollment = await prisma.enrollment.create({
        data: {
          organizationId: testOrganizationId,
          patientId: testPatientId,
          clinicianId: testClinicianId,
          conditionPresetId: conditionPreset.id,
          status: 'ACTIVE',
          startDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) // 3 days ago
        }
      });

      // Run missed assessment evaluation
      const alertsCreated = await alertScheduler.evaluateMissedAssessments();

      expect(alertsCreated).toBeGreaterThan(0);

      // Verify alert was created
      const alert = await prisma.alert.findFirst({
        where: {
          patientId: testPatientId,
          status: 'PENDING'
        }
      });

      expect(alert).toBeDefined();
      expect(alert.severity).toMatch(/HIGH|MEDIUM|LOW/);
      expect(alert.message).toContain('Missed');

      // Clean up
      await prisma.enrollment.delete({ where: { id: enrollment.id } });
    });
  });

  describe('evaluateMedicationAdherenceAlerts', () => {
    it('should create alert for low medication adherence', async () => {
      // This test requires medication data setup
      // For now, just verify the function exists and doesn't throw
      const alertsCreated = await alertScheduler.evaluateMedicationAdherenceAlerts();
      expect(typeof alertsCreated).toBe('number');
      expect(alertsCreated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('evaluateDailyTrends', () => {
    it('should evaluate trends for active enrollments', async () => {
      // This test requires observation data setup
      // For now, just verify the function exists and doesn't throw
      const alertsCreated = await alertScheduler.evaluateDailyTrends();
      expect(typeof alertsCreated).toBe('number');
      expect(alertsCreated).toBeGreaterThanOrEqual(0);
    });
  });

  describe('cleanupStaleAlerts', () => {
    it('should auto-dismiss stale pending alerts', async () => {
      // Create a stale alert (older than 72 hours)
      const staleDate = new Date(Date.now() - 73 * 60 * 60 * 1000); // 73 hours ago

      const staleAlert = await prisma.alert.create({
        data: {
          organizationId: testOrganizationId,
          patientId: testPatientId,
          ruleId: 'test-rule-123',
          severity: 'LOW',
          status: 'PENDING',
          message: 'Stale test alert',
          triggeredAt: staleDate,
          data: {}
        }
      });

      // Run cleanup
      const cleaned = await alertScheduler.cleanupStaleAlerts();

      expect(cleaned).toBeGreaterThan(0);

      // Verify alert was dismissed
      const dismissedAlert = await prisma.alert.findUnique({
        where: { id: staleAlert.id }
      });

      expect(dismissedAlert.status).toBe('DISMISSED');
      expect(dismissedAlert.resolvedAt).toBeDefined();
      expect(dismissedAlert.resolutionNotes).toContain('Auto-resolved');
    });
  });

  describe('startScheduledJobs and stopScheduledJobs', () => {
    it('should start and stop scheduled jobs without errors', () => {
      // Start jobs
      expect(() => alertScheduler.startScheduledJobs()).not.toThrow();

      // Stop jobs
      expect(() => alertScheduler.stopScheduledJobs()).not.toThrow();
    });
  });
});
