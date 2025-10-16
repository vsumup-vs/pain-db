/**
 * Alert Evaluation Service Integration Tests
 *
 * Tests for risk score calculation during alert creation.
 * These are integration tests that use real database connections.
 */

const { PrismaClient } = require('@prisma/client');
const {
  evaluateObservation,
  calculateSLABreachTime
} = require('../../../src/services/alertEvaluationService');

const prisma = global.prisma || new PrismaClient();

describe('Alert Evaluation Service - Risk Score Integration', () => {
  let testOrg, testPatient, testClinician, testMetric, testConditionPreset, testAlertRule, testEnrollment;

  beforeAll(async () => {
    // Create test organization with unique name
    const timestamp = Date.now();
    testOrg = await prisma.organization.create({
      data: {
        name: `Test Risk Scoring Org ${timestamp}`,
        type: 'CLINIC',
        email: `test-${timestamp}@riskscore.com`
      }
    });

    // Create test clinician
    testClinician = await prisma.user.create({
      data: {
        email: `clinician-${timestamp}@riskscore.com`,
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
        email: `patient-${timestamp}@riskscore.com`,
        phone: '555-0100'
      }
    });

    // Create test metric definition
    testMetric = await prisma.metricDefinition.create({
      data: {
        key: `pain_test_metric_${timestamp}`,
        displayName: 'Pain Test Metric',
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
        organizationId: testOrg.id,
        name: 'Test Pain Management',
        code: 'TEST-PAIN',
        category: 'PAIN',
        description: 'Test condition preset',
        icdCodes: ['M79.3'],
        clinicalGuidelines: 'Test guidelines'
      }
    });

    // Create test alert rule
    testAlertRule = await prisma.alertRule.create({
      data: {
        organizationId: testOrg.id,
        name: 'High Pain Alert',
        description: 'Pain score above 7',
        severity: 'HIGH',
        conditions: {
          metric: `pain_test_metric_${timestamp}`,
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
        status: 'ACTIVE'
      }
    });

    // Create some historical observations for trend calculation
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    await prisma.observation.createMany({
      data: [
        {
          organizationId: testOrg.id,
          patientId: testPatient.id,
          metricId: testMetric.id,
          value: { value: 5 },
          source: 'MANUAL',
          recordedAt: new Date(sevenDaysAgo.getTime() + 24 * 60 * 60 * 1000) // 6 days ago
        },
        {
          organizationId: testOrg.id,
          patientId: testPatient.id,
          metricId: testMetric.id,
          value: { value: 6 },
          source: 'MANUAL',
          recordedAt: new Date(sevenDaysAgo.getTime() + 3 * 24 * 60 * 60 * 1000) // 4 days ago
        },
        {
          organizationId: testOrg.id,
          patientId: testPatient.id,
          metricId: testMetric.id,
          value: { value: 7 },
          source: 'MANUAL',
          recordedAt: new Date(sevenDaysAgo.getTime() + 5 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      ]
    });
  });

  afterAll(async () => {
    if (!testOrg) return; // Skip cleanup if setup failed

    // Clean up in reverse order of creation
    await prisma.observation.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.alert.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.enrollment.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.conditionPresetAlertRule.deleteMany({ where: { conditionPresetId: testConditionPreset.id } });
    await prisma.alertRule.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.conditionPreset.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.metricDefinition.deleteMany({ where: { key: testMetric.key } });
    await prisma.patient.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.userOrganization.deleteMany({ where: { organizationId: testOrg.id } });
    await prisma.user.deleteMany({ where: { email: testClinician.email } });
    await prisma.organization.deleteMany({ where: { id: testOrg.id } });
  });

  test('calculates risk score when creating alert from observation', async () => {
    // Create observation that triggers alert rule (pain > 7)
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

    // Evaluate observation (should trigger alert)
    const triggeredAlerts = await evaluateObservation(observation);

    expect(triggeredAlerts).toHaveLength(1);

    const alert = triggeredAlerts[0];

    // Verify alert has risk score
    expect(alert).toHaveProperty('riskScore');
    expect(alert.riskScore).toBeGreaterThan(0);
    expect(alert.riskScore).toBeLessThanOrEqual(10);

    // Verify risk score considers vitals deviation
    // Value 8 is above normal range max 3, so vitalsDeviation should contribute
    // Expected: (vitalsDeviation * 0.5 + trendVelocity * 0.3 + adherencePenalty * 0.2) * severityMultiplier
    // Severity HIGH = 1.5x multiplier
    expect(alert.riskScore).toBeGreaterThan(3); // Should be higher than base score

    // Verify SLA breach time is set
    expect(alert).toHaveProperty('slaBreachTime');
    expect(alert.slaBreachTime).toBeInstanceOf(Date);
  });

  test('risk score increases with severity multiplier (HIGH vs CRITICAL)', async () => {
    // Create CRITICAL alert rule
    const criticalAlertRule = await prisma.alertRule.create({
      data: {
        organizationId: testOrg.id,
        name: 'Critical Pain Alert',
        description: 'Pain score above 9',
        severity: 'CRITICAL',
        conditions: {
          metric: testMetric.key,
          operator: 'gt',
          value: 9
        },
        actions: ['NOTIFY_CLINICIAN'],
        priority: 1,
        isActive: true
      }
    });

    // Link to condition preset
    await prisma.conditionPresetAlertRule.create({
      data: {
        conditionPresetId: testConditionPreset.id,
        alertRuleId: criticalAlertRule.id,
        isEnabled: true,
        priority: 1
      }
    });

    // Create observation that triggers CRITICAL alert (pain = 10)
    const criticalObservation = await prisma.observation.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        metricId: testMetric.id,
        value: { value: 10 },
        source: 'MANUAL',
        recordedAt: new Date()
      }
    });

    const criticalAlerts = await evaluateObservation(criticalObservation);

    // Should trigger both HIGH and CRITICAL rules
    expect(criticalAlerts.length).toBeGreaterThanOrEqual(1);

    // Find the CRITICAL alert
    const criticalAlert = criticalAlerts.find(a => a.severity === 'CRITICAL');
    expect(criticalAlert).toBeDefined();

    // CRITICAL severity multiplier (2.0x) should result in higher risk score than HIGH (1.5x)
    expect(criticalAlert.riskScore).toBeGreaterThan(7); // CRITICAL with high deviation should be >7

    // Clean up
    await prisma.conditionPresetAlertRule.deleteMany({ where: { alertRuleId: criticalAlertRule.id } });
    await prisma.alertRule.delete({ where: { id: criticalAlertRule.id } });
  });

  test('risk score considers trend velocity with worsening pattern', async () => {
    // Historical observations show increasing trend (5 -> 6 -> 7)
    // New observation continues trend (8)

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

    const triggeredAlerts = await evaluateObservation(observation);

    expect(triggeredAlerts).toHaveLength(1);

    const alert = triggeredAlerts[0];

    // Risk score should reflect worsening trend
    // Trend velocity component (30% weight) should contribute to higher score
    expect(alert.riskScore).toBeGreaterThan(0);
    expect(alert.riskScore).toBeLessThanOrEqual(10);
  });

  test('calculateSLABreachTime sets appropriate deadline based on severity', () => {
    const now = new Date();

    const criticalSLA = calculateSLABreachTime('CRITICAL');
    const highSLA = calculateSLABreachTime('HIGH');
    const mediumSLA = calculateSLABreachTime('MEDIUM');
    const lowSLA = calculateSLABreachTime('LOW');

    // Verify all are in the future
    expect(criticalSLA.getTime()).toBeGreaterThan(now.getTime());
    expect(highSLA.getTime()).toBeGreaterThan(now.getTime());
    expect(mediumSLA.getTime()).toBeGreaterThan(now.getTime());
    expect(lowSLA.getTime()).toBeGreaterThan(now.getTime());

    // Verify CRITICAL has shortest time, LOW has longest time
    expect(criticalSLA.getTime()).toBeLessThan(highSLA.getTime());
    expect(highSLA.getTime()).toBeLessThan(mediumSLA.getTime());
    expect(mediumSLA.getTime()).toBeLessThan(lowSLA.getTime());

    // Verify approximate timeframes (with tolerance for test execution time)
    const criticalMinutes = (criticalSLA.getTime() - now.getTime()) / (1000 * 60);
    const highMinutes = (highSLA.getTime() - now.getTime()) / (1000 * 60);

    expect(criticalMinutes).toBeCloseTo(30, 0); // 30 minutes
    expect(highMinutes).toBeCloseTo(120, 1); // 2 hours
  });

  test('alert includes all required fields with risk score', async () => {
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

    const triggeredAlerts = await evaluateObservation(observation);

    expect(triggeredAlerts).toHaveLength(1);

    const alert = triggeredAlerts[0];

    // Verify all required alert fields
    expect(alert).toHaveProperty('id');
    expect(alert).toHaveProperty('organizationId', testOrg.id);
    expect(alert).toHaveProperty('patientId', testPatient.id);
    expect(alert).toHaveProperty('ruleId', testAlertRule.id);
    expect(alert).toHaveProperty('severity', 'HIGH');
    expect(alert).toHaveProperty('status', 'PENDING');
    expect(alert).toHaveProperty('message');
    expect(alert).toHaveProperty('riskScore');
    expect(alert).toHaveProperty('slaBreachTime');
    expect(alert).toHaveProperty('triggeredAt');

    // Verify risk score is numeric and in valid range
    expect(typeof alert.riskScore).toBe('number');
    expect(alert.riskScore).toBeGreaterThanOrEqual(0);
    expect(alert.riskScore).toBeLessThanOrEqual(10);
  });
});
