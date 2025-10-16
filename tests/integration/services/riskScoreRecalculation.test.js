/**
 * Risk Score Recalculation Integration Tests
 *
 * Tests for automatic risk score updates when new observations are created.
 * Verifies that existing alerts get their risk scores recalculated based on updated trends.
 */

const { PrismaClient } = require('@prisma/client');
const { updateAlertRiskScores } = require('../../../src/services/riskScoringService');

const prisma = global.prisma || new PrismaClient();

describe('Risk Score Recalculation Integration', () => {
  let testOrg, testPatient, testClinician, testMetric, testConditionPreset, testAlertRule, testEnrollment;

  beforeAll(async () => {
    // Create test organization with unique name
    const timestamp = Date.now();
    testOrg = await prisma.organization.create({
      data: {
        name: `Test Risk Recalc Org ${timestamp}`,
        type: 'CLINIC',
        email: `test-recalc-${timestamp}@riskscore.com`
      }
    });

    // Create test clinician
    testClinician = await prisma.user.create({
      data: {
        email: `clinician-recalc-${timestamp}@riskscore.com`,
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'Clinician',
        userOrganizations: {
          create: {
            organizationId: testOrg.id,
            role: 'CLINICIAN'
          }
        }
      }
    });

    // Create test patient
    testPatient = await prisma.patient.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1980-01-01'),
        email: `patient-recalc-${timestamp}@riskscore.com`,
        phone: '555-0100'
      }
    });

    // Create test metric definition
    testMetric = await prisma.metricDefinition.create({
      data: {
        key: `pain_recalc_metric_${timestamp}`,
        displayName: 'Pain Recalc Metric',
        category: 'PAIN',
        valueType: 'numeric',
        unit: 'points',
        normalRange: { min: 0, max: 3 },
        validationInfo: {}
      }
    });

    // Create test condition preset
    testConditionPreset = await prisma.conditionPreset.create({
      data: {
        organization: {
          connect: { id: testOrg.id }
        },
        name: 'Test Pain Recalc',
        category: 'PAIN',
        description: 'Test condition preset',
        clinicalGuidelines: { guidelines: 'Test guidelines' }
      }
    });

    // Create test alert rule
    testAlertRule = await prisma.alertRule.create({
      data: {
        organizationId: testOrg.id,
        name: 'High Pain Alert Recalc',
        description: 'Pain score above 7',
        severity: 'HIGH',
        conditions: {
          metric: `pain_recalc_metric_${timestamp}`,
          operator: 'gt',
          value: 7
        },
        actions: ['NOTIFY_CLINICIAN'],
        priority: 1,
        isActive: true
      }
    });

    // Link alert rule to condition preset
    await prisma.conditionPresetAlertRule.create({
      data: {
        conditionPresetId: testConditionPreset.id,
        alertRuleId: testAlertRule.id,
        isEnabled: true,
        priority: 1
      }
    });

    // Create test enrollment
    testEnrollment = await prisma.enrollment.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        conditionPresetId: testConditionPreset.id,
        clinicianId: testClinician.id,
        status: 'ACTIVE',
        startDate: new Date()
      }
    });
  });

  afterAll(async () => {
    if (!testOrg) return;

    // Clean up in reverse order of creation
    await prisma.observation.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.alert.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.enrollment.deleteMany({ where: { organizationId: testOrg.id } });
    if (testConditionPreset) {
      await prisma.conditionPresetAlertRule.deleteMany({ where: { conditionPresetId: testConditionPreset.id } });
    }
    await prisma.alertRule.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.conditionPreset.deleteMany({ where: { organization: { id: testOrg.id } } });
    if (testMetric) {
      await prisma.metricDefinition.deleteMany({ where: { key: testMetric.key } });
    }
    await prisma.patient.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.userOrganization.deleteMany({ where: { organizationId: testOrg.id } });
    if (testClinician) {
      await prisma.user.deleteMany({ where: { email: testClinician.email } });
    }
    await prisma.organization.deleteMany({ where: { id: testOrg.id } });
  });

  test('recalculates risk scores for existing alerts when new observation is added', async () => {
    // Create initial observation that triggers alert
    const initialObservation = await prisma.observation.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        metricId: testMetric.id,
        value: { value: 8 },
        source: 'MANUAL',
        recordedAt: new Date()
      }
    });

    // Manually create alert (simulating evaluateObservation result)
    const initialAlert = await prisma.alert.create({
      data: {
        organizationId: testOrg.id,
        ruleId: testAlertRule.id,
        patientId: testPatient.id,
        clinicianId: testClinician.id,
        severity: 'HIGH',
        status: 'PENDING',
        message: 'Pain score above 7',
        data: {
          observationId: initialObservation.id,
          metricId: testMetric.id,
          value: { value: 8 }
        },
        riskScore: 5.0, // Initial risk score
        slaBreachTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
      }
    });

    // Verify initial risk score
    expect(initialAlert.riskScore).toBe(5.0);

    // Create a new observation with worsening trend
    const newObservation = await prisma.observation.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        metricId: testMetric.id,
        value: { value: 9 },
        source: 'MANUAL',
        recordedAt: new Date()
      }
    });

    // Call updateAlertRiskScores (this is what observationController does)
    const result = await updateAlertRiskScores(testPatient.id, testMetric.id);

    // Verify result
    expect(result.updated).toBe(1);
    expect(result.alerts).toHaveLength(1);

    // Fetch updated alert from database
    const updatedAlert = await prisma.alert.findUnique({
      where: { id: initialAlert.id }
    });

    // Verify risk score was updated (should be higher due to worsening trend)
    expect(updatedAlert.riskScore).toBeGreaterThan(5.0);
    expect(updatedAlert.riskScore).toBeLessThanOrEqual(10);
  });

  test('does not update RESOLVED or DISMISSED alerts', async () => {
    // Create observation and alert
    const observation = await prisma.observation.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        metricId: testMetric.id,
        value: { value: 8 },
        source: 'MANUAL',
        recordedAt: new Date()
      }
    });

    const resolvedAlert = await prisma.alert.create({
      data: {
        organizationId: testOrg.id,
        ruleId: testAlertRule.id,
        patientId: testPatient.id,
        clinicianId: testClinician.id,
        severity: 'HIGH',
        status: 'RESOLVED',
        message: 'Pain score above 7',
        data: {
          observationId: observation.id,
          metricId: testMetric.id,
          value: { value: 8 }
        },
        riskScore: 5.0,
        slaBreachTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
      }
    });

    // Create new observation
    await prisma.observation.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        metricId: testMetric.id,
        value: { value: 9 },
        source: 'MANUAL',
        recordedAt: new Date()
      }
    });

    // Call updateAlertRiskScores
    const result = await updateAlertRiskScores(testPatient.id, testMetric.id);

    // Should not update RESOLVED alerts
    expect(result.updated).toBe(0);

    // Verify alert risk score unchanged
    const unchangedAlert = await prisma.alert.findUnique({
      where: { id: resolvedAlert.id }
    });
    expect(unchangedAlert.riskScore).toBe(5.0);
  });

  test('updates multiple pending alerts for same patient/metric', async () => {
    // Create two pending alerts
    const obs1 = await prisma.observation.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        metricId: testMetric.id,
        value: { value: 8 },
        source: 'MANUAL',
        recordedAt: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
      }
    });

    const alert1 = await prisma.alert.create({
      data: {
        organizationId: testOrg.id,
        ruleId: testAlertRule.id,
        patientId: testPatient.id,
        clinicianId: testClinician.id,
        severity: 'HIGH',
        status: 'PENDING',
        message: 'Pain score above 7',
        data: {
          observationId: obs1.id,
          metricId: testMetric.id,
          value: { value: 8 }
        },
        riskScore: 5.0,
        slaBreachTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
      }
    });

    const obs2 = await prisma.observation.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        metricId: testMetric.id,
        value: { value: 8.5 },
        source: 'MANUAL',
        recordedAt: new Date(Date.now() - 1 * 60 * 60 * 1000) // 1 hour ago
      }
    });

    const alert2 = await prisma.alert.create({
      data: {
        organizationId: testOrg.id,
        ruleId: testAlertRule.id,
        patientId: testPatient.id,
        clinicianId: testClinician.id,
        severity: 'HIGH',
        status: 'ACKNOWLEDGED',
        message: 'Pain score above 7',
        data: {
          observationId: obs2.id,
          metricId: testMetric.id,
          value: { value: 8.5 }
        },
        riskScore: 5.5,
        slaBreachTime: new Date(Date.now() + 2 * 60 * 60 * 1000)
      }
    });

    // Create new observation
    await prisma.observation.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        metricId: testMetric.id,
        value: { value: 9 },
        source: 'MANUAL',
        recordedAt: new Date()
      }
    });

    // Call updateAlertRiskScores
    const result = await updateAlertRiskScores(testPatient.id, testMetric.id);

    // Should update both PENDING and ACKNOWLEDGED alerts
    expect(result.updated).toBe(2);
    expect(result.alerts).toHaveLength(2);

    // Verify both alerts were updated
    const updatedAlert1 = await prisma.alert.findUnique({ where: { id: alert1.id } });
    const updatedAlert2 = await prisma.alert.findUnique({ where: { id: alert2.id } });

    expect(updatedAlert1.riskScore).toBeGreaterThan(5.0);
    expect(updatedAlert2.riskScore).toBeGreaterThan(5.5);
  });

  test('returns empty result when no alerts exist for patient/metric', async () => {
    // Create a different patient
    const otherPatient = await prisma.patient.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Other',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        email: `other-${Date.now()}@test.com`,
        phone: '555-0200'
      }
    });

    // Call updateAlertRiskScores for patient with no alerts
    const result = await updateAlertRiskScores(otherPatient.id, testMetric.id);

    expect(result.updated).toBe(0);
    expect(result.alerts).toHaveLength(0);

    // Cleanup
    await prisma.patient.delete({ where: { id: otherPatient.id } });
  });

  test('handles errors gracefully and returns empty result', async () => {
    // Call with invalid IDs
    const result = await updateAlertRiskScores('invalid-patient-id', 'invalid-metric-id');

    expect(result.updated).toBe(0);
    expect(result.alerts).toHaveLength(0);
  });
});
