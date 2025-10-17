/**
 * Integration Tests for Alert Evaluation Service - Risk Score on Creation
 *
 * Tests that alerts are created with calculated risk scores and SLA breach times
 * when observations trigger alert rules.
 *
 * Part of Task 2: Alert Evaluation Enhancement - Risk Score on Creation
 */

const { PrismaClient } = require('@prisma/client');
const alertEvaluationService = require('../../src/services/alertEvaluationService');
const riskScoringService = require('../../src/services/riskScoringService');

// Use test database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Store global prisma for service usage
global.prisma = prisma;

describe('Alert Evaluation Service - Risk Score Integration Tests', () => {
  let testOrganization;
  let testPatient;
  let testClinician;
  let testMetric;
  let testAlertRule;
  let testConditionPreset;
  let testEnrollment;
  let testCareProgram;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.alert.deleteMany({ where: { patient: { lastName: 'RiskScoreTest' } } });
    await prisma.observation.deleteMany({ where: { patient: { lastName: 'RiskScoreTest' } } });
    await prisma.enrollment.deleteMany({ where: { patient: { lastName: 'RiskScoreTest' } } });
    await prisma.patient.deleteMany({ where: { lastName: 'RiskScoreTest' } });
    await prisma.alertRule.deleteMany({ where: { name: 'Test Risk Score Rule' } });
    await prisma.conditionPreset.deleteMany({ where: { name: 'Test Risk Condition' } });

    // Create test organization
    testOrganization = await prisma.organization.findFirst({
      where: { name: 'Default Healthcare Organization' }
    }) || await prisma.organization.create({
      data: {
        name: 'Test Healthcare Org',
        type: 'CLINIC'
      }
    });

    // Create test clinician
    testClinician = await prisma.clinician.create({
      data: {
        organizationId: testOrganization.id,
        firstName: 'Test',
        lastName: 'Clinician',
        email: `test-clinician-${Date.now()}@test.com`,
        specialization: 'Internal Medicine'
      }
    });

    // Create test patient
    testPatient = await prisma.patient.create({
      data: {
        organizationId: testOrganization.id,
        firstName: 'Test',
        lastName: 'RiskScoreTest',
        dateOfBirth: new Date('1980-01-01'),
        medicalRecordNumber: `TEST-RISK-${Date.now()}`
      }
    });

    // Create test metric with normal range
    testMetric = await prisma.metricDefinition.create({
      data: {
        key: `test_blood_pressure_${Date.now()}`,
        displayName: 'Test Blood Pressure Systolic',
        category: 'VITALS',
        valueType: 'numeric',
        unit: 'mmHg',
        normalRange: {
          min: 90,
          max: 120
        }
      }
    });

    // Create test alert rule with CRITICAL severity and threshold condition
    testAlertRule = await prisma.alertRule.create({
      data: {
        organizationId: testOrganization.id,
        name: 'Test Risk Score Rule',
        description: 'High blood pressure alert for risk scoring test',
        severity: 'CRITICAL',
        isActive: true,
        conditions: {
          metric: testMetric.key,
          operator: 'gt',
          value: 140
        },
        actions: {
          notify: ['clinician']
        },
        priority: 1
      }
    });

    // Create test condition preset
    testConditionPreset = await prisma.conditionPreset.create({
      data: {
        organizationId: testOrganization.id,
        name: 'Test Risk Condition',
        description: 'Condition preset for risk scoring test',
        category: 'HYPERTENSION'
      }
    });

    // Link alert rule to condition preset
    await prisma.conditionPresetAlertRule.create({
      data: {
        conditionPresetId: testConditionPreset.id,
        alertRuleId: testAlertRule.id,
        priority: 1
      }
    });

    // Create care program
    testCareProgram = await prisma.careProgram.findFirst({
      where: { organizationId: testOrganization.id }
    }) || await prisma.careProgram.create({
      data: {
        organizationId: testOrganization.id,
        name: 'Test Care Program',
        type: 'GENERAL_WELLNESS',
        description: 'Test care program for risk scoring',
        isActive: true
      }
    });

    // Create test enrollment
    testEnrollment = await prisma.enrollment.create({
      data: {
        organizationId: testOrganization.id,
        patientId: testPatient.id,
        clinicianId: testClinician.id,
        careProgramId: testCareProgram.id,
        conditionPresetId: testConditionPreset.id,
        status: 'ACTIVE',
        startDate: new Date(),
        billingEligibility: {
          eligible: true,
          insurance: { type: 'Medicare' }
        }
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.alert.deleteMany({ where: { patientId: testPatient.id } });
    await prisma.observation.deleteMany({ where: { patientId: testPatient.id } });
    await prisma.enrollment.deleteMany({ where: { patientId: testPatient.id } });
    await prisma.conditionPresetAlertRule.deleteMany({ where: { conditionPresetId: testConditionPreset.id } });
    await prisma.conditionPreset.deleteMany({ where: { id: testConditionPreset.id } });
    await prisma.alertRule.deleteMany({ where: { id: testAlertRule.id } });
    await prisma.metricDefinition.deleteMany({ where: { id: testMetric.id } });
    await prisma.patient.deleteMany({ where: { id: testPatient.id } });
    await prisma.clinician.deleteMany({ where: { id: testClinician.id } });
    await prisma.careProgram.deleteMany({ where: { id: testCareProgram?.id } });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clear alerts and observations before each test
    await prisma.alert.deleteMany({ where: { patientId: testPatient.id } });
    await prisma.observation.deleteMany({ where: { patientId: testPatient.id } });
  });

  describe('Risk Score Calculation on Alert Creation', () => {
    test('should create alert with calculated risk score when threshold exceeded', async () => {
      // Create observation that triggers alert (BP > 140)
      const observation = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: testMetric.id,
          value: { numeric: 160 }, // Above threshold of 140
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      // Evaluate observation to trigger alert
      const triggeredAlerts = await alertEvaluationService.evaluateObservation(observation);

      // Verify alert was triggered
      expect(triggeredAlerts).toHaveLength(1);
      const alert = triggeredAlerts[0];

      // Verify risk score is calculated and stored
      expect(alert.riskScore).toBeDefined();
      expect(typeof alert.riskScore).toBe('number');
      expect(alert.riskScore).toBeGreaterThanOrEqual(0);
      expect(alert.riskScore).toBeLessThanOrEqual(10);

      // Verify SLA breach time is calculated and stored
      expect(alert.slaBreachTime).toBeDefined();
      expect(alert.slaBreachTime).toBeInstanceOf(Date);

      // For CRITICAL severity, SLA should be 30 minutes from now
      const expectedSLATime = new Date();
      expectedSLATime.setMinutes(expectedSLATime.getMinutes() + 30);
      const timeDiff = Math.abs(alert.slaBreachTime.getTime() - expectedSLATime.getTime());
      expect(timeDiff).toBeLessThan(60000); // Within 1 minute tolerance
    });

    test('should calculate higher risk score for severe vital deviation', async () => {
      // Create observation with severe deviation (BP = 200, normal max = 120)
      const observation = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: testMetric.id,
          value: { numeric: 200 }, // Severely elevated
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      const triggeredAlerts = await alertEvaluationService.evaluateObservation(observation);

      expect(triggeredAlerts).toHaveLength(1);
      const alert = triggeredAlerts[0];

      // Risk score should be high (>7) due to:
      // - Severe vitals deviation (200 vs max 120 = 66% deviation)
      // - CRITICAL severity (2.0x multiplier)
      expect(alert.riskScore).toBeGreaterThan(7);
      expect(alert.riskScore).toBeLessThanOrEqual(10);
    });

    test('should calculate lower risk score for moderate vital deviation', async () => {
      // Create observation with moderate deviation (BP = 145, normal max = 120, threshold = 140)
      const observation = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: testMetric.id,
          value: { numeric: 145 }, // Moderately elevated
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      const triggeredAlerts = await alertEvaluationService.evaluateObservation(observation);

      expect(triggeredAlerts).toHaveLength(1);
      const alert = triggeredAlerts[0];

      // Risk score should be moderate (4-7) due to:
      // - Moderate vitals deviation (145 vs max 120 = 21% deviation)
      // - CRITICAL severity (2.0x multiplier)
      expect(alert.riskScore).toBeGreaterThanOrEqual(4);
      expect(alert.riskScore).toBeLessThanOrEqual(7);
    });

    test('should include trend velocity in risk score calculation', async () => {
      // Create series of observations showing worsening trend
      const baseTime = new Date();
      baseTime.setHours(baseTime.getHours() - 24); // Start 24 hours ago

      // Create 5 observations with increasing values (worsening trend)
      for (let i = 0; i < 5; i++) {
        const timestamp = new Date(baseTime);
        timestamp.setHours(timestamp.getHours() + (i * 6)); // 6-hour intervals

        await prisma.observation.create({
          data: {
            organizationId: testOrganization.id,
            patientId: testPatient.id,
            enrollmentId: testEnrollment.id,
            metricId: testMetric.id,
            value: { numeric: 130 + (i * 5) }, // 130, 135, 140, 145, 150
            unit: 'mmHg',
            source: 'DEVICE',
            context: 'CLINICAL_MONITORING',
            recordedAt: timestamp
          }
        });
      }

      // Create final observation that triggers alert
      const observation = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: testMetric.id,
          value: { numeric: 155 }, // Continuing trend
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      const triggeredAlerts = await alertEvaluationService.evaluateObservation(observation);

      expect(triggeredAlerts).toHaveLength(1);
      const alert = triggeredAlerts[0];

      // Risk score should be elevated due to worsening trend velocity component
      expect(alert.riskScore).toBeGreaterThan(5);

      // Verify trend velocity was calculated (indirectly through risk score)
      // With upward trend, risk score should be higher than static observation
    });

    test('should store risk score in database for retrieval', async () => {
      const observation = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: testMetric.id,
          value: { numeric: 165 },
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      const triggeredAlerts = await alertEvaluationService.evaluateObservation(observation);
      expect(triggeredAlerts).toHaveLength(1);

      const alertId = triggeredAlerts[0].id;

      // Retrieve alert from database
      const storedAlert = await prisma.alert.findUnique({
        where: { id: alertId }
      });

      // Verify risk score is persisted
      expect(storedAlert).not.toBeNull();
      expect(storedAlert.riskScore).toBeDefined();
      expect(storedAlert.riskScore).toBe(triggeredAlerts[0].riskScore);
      expect(storedAlert.slaBreachTime).toEqual(triggeredAlerts[0].slaBreachTime);
    });
  });

  describe('SLA Breach Time Calculation', () => {
    test('CRITICAL severity should have 30-minute SLA', async () => {
      const observation = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: testMetric.id,
          value: { numeric: 180 },
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      const triggeredAlerts = await alertEvaluationService.evaluateObservation(observation);
      expect(triggeredAlerts).toHaveLength(1);

      const alert = triggeredAlerts[0];
      expect(alert.severity).toBe('CRITICAL');

      const now = new Date();
      const timeDiff = alert.slaBreachTime.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      // Should be approximately 30 minutes (allow 1-minute tolerance)
      expect(minutesDiff).toBeGreaterThan(29);
      expect(minutesDiff).toBeLessThan(31);
    });

    test('HIGH severity should have 2-hour SLA', async () => {
      // Create HIGH severity alert rule
      const highSeverityRule = await prisma.alertRule.create({
        data: {
          organizationId: testOrganization.id,
          name: 'Test HIGH Severity Rule',
          description: 'HIGH severity test',
          severity: 'HIGH',
          isActive: true,
          conditions: {
            metric: testMetric.key,
            operator: 'gt',
            value: 130
          },
          actions: {
            notify: ['clinician']
          },
          priority: 2
        }
      });

      // Link to condition preset
      await prisma.conditionPresetAlertRule.create({
        data: {
          conditionPresetId: testConditionPreset.id,
          alertRuleId: highSeverityRule.id,
          priority: 2
        }
      });

      const observation = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: testMetric.id,
          value: { numeric: 135 },
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      const triggeredAlerts = await alertEvaluationService.evaluateObservation(observation);

      // Should trigger both CRITICAL and HIGH rules
      const highAlert = triggeredAlerts.find(a => a.severity === 'HIGH');
      expect(highAlert).toBeDefined();

      const now = new Date();
      const timeDiff = highAlert.slaBreachTime.getTime() - now.getTime();
      const minutesDiff = timeDiff / (1000 * 60);

      // Should be approximately 120 minutes (2 hours)
      expect(minutesDiff).toBeGreaterThan(118);
      expect(minutesDiff).toBeLessThan(122);

      // Clean up
      await prisma.conditionPresetAlertRule.deleteMany({ where: { alertRuleId: highSeverityRule.id } });
      await prisma.alertRule.delete({ where: { id: highSeverityRule.id } });
    });
  });

  describe('Alert Cooldown with Risk Scores', () => {
    test('should not create duplicate alerts during cooldown period', async () => {
      // Create first observation
      const observation1 = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: testMetric.id,
          value: { numeric: 170 },
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      const firstAlerts = await alertEvaluationService.evaluateObservation(observation1);
      expect(firstAlerts).toHaveLength(1);
      const firstRiskScore = firstAlerts[0].riskScore;

      // Create second observation immediately (within cooldown)
      const observation2 = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: testMetric.id,
          value: { numeric: 175 }, // Even higher value
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      const secondAlerts = await alertEvaluationService.evaluateObservation(observation2);

      // Should not create duplicate alert due to cooldown
      expect(secondAlerts).toHaveLength(0);

      // Verify only one alert exists in database
      const allAlerts = await prisma.alert.findMany({
        where: { patientId: testPatient.id }
      });
      expect(allAlerts).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle missing normal range gracefully', async () => {
      // Create metric without normal range
      const metricNoRange = await prisma.metricDefinition.create({
        data: {
          key: `test_no_range_${Date.now()}`,
          displayName: 'Test Metric No Range',
          category: 'VITALS',
          valueType: 'numeric',
          unit: 'units'
          // No normalRange defined
        }
      });

      const ruleNoRange = await prisma.alertRule.create({
        data: {
          organizationId: testOrganization.id,
          name: 'Test No Range Rule',
          description: 'Alert for metric without normal range',
          severity: 'MEDIUM',
          isActive: true,
          conditions: {
            metric: metricNoRange.key,
            operator: 'gt',
            value: 100
          },
          actions: {
            notify: ['clinician']
          },
          priority: 1
        }
      });

      await prisma.conditionPresetAlertRule.create({
        data: {
          conditionPresetId: testConditionPreset.id,
          alertRuleId: ruleNoRange.id,
          priority: 1
        }
      });

      const observation = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: metricNoRange.id,
          value: { numeric: 150 },
          unit: 'units',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      const triggeredAlerts = await alertEvaluationService.evaluateObservation(observation);

      // Should still create alert with risk score
      expect(triggeredAlerts).toHaveLength(1);
      expect(triggeredAlerts[0].riskScore).toBeDefined();
      expect(triggeredAlerts[0].riskScore).toBeGreaterThanOrEqual(0);
      expect(triggeredAlerts[0].riskScore).toBeLessThanOrEqual(10);

      // Clean up
      await prisma.conditionPresetAlertRule.deleteMany({ where: { alertRuleId: ruleNoRange.id } });
      await prisma.alertRule.delete({ where: { id: ruleNoRange.id } });
      await prisma.metricDefinition.delete({ where: { id: metricNoRange.id } });
    });

    test('should handle first observation (no trend data) gracefully', async () => {
      // Clear all observations to simulate first reading
      await prisma.observation.deleteMany({ where: { patientId: testPatient.id } });

      const observation = await prisma.observation.create({
        data: {
          organizationId: testOrganization.id,
          patientId: testPatient.id,
          enrollmentId: testEnrollment.id,
          metricId: testMetric.id,
          value: { numeric: 150 },
          unit: 'mmHg',
          source: 'DEVICE',
          context: 'CLINICAL_MONITORING',
          recordedAt: new Date()
        }
      });

      const triggeredAlerts = await alertEvaluationService.evaluateObservation(observation);

      // Should create alert with risk score (trend velocity = 0 when no history)
      expect(triggeredAlerts).toHaveLength(1);
      expect(triggeredAlerts[0].riskScore).toBeDefined();

      // Risk score should be based primarily on vitals deviation and severity
      // since trend velocity should be 0
      expect(triggeredAlerts[0].riskScore).toBeGreaterThan(0);
    });
  });
});
