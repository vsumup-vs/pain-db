/**
 * Risk Scoring Service Unit Tests
 *
 * Tests for calculating alert risk scores based on:
 * - Vitals deviation from normal range (50% weight)
 * - Trend velocity over 7 days (30% weight)
 * - Medication adherence penalty (20% weight)
 * - Severity multiplier (CRITICAL: 2.0x, HIGH: 1.5x, MEDIUM: 1.0x, LOW: 0.5x)
 */

const {
  calculateRiskScore,
  calculateVitalsDeviation,
  calculateTrendVelocity,
  calculateAdherencePenalty,
  updateAlertRiskScores
} = require('../../../src/services/riskScoringService');

// Mock Prisma client
const mockPrisma = {
  observation: {
    findMany: jest.fn()
  },
  patientMedication: {
    findMany: jest.fn()
  },
  medicationAdherence: {
    findMany: jest.fn()
  },
  alert: {
    findMany: jest.fn(),
    update: jest.fn()
  },
  metricDefinition: {
    findUnique: jest.fn()
  }
};

// Mock the Prisma client globally
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma)
}));

describe('calculateVitalsDeviation', () => {
  test('returns 0 for value within normal range', () => {
    const value = 105;
    const normalRange = { min: 90, max: 120 };

    const deviation = calculateVitalsDeviation(value, normalRange);

    expect(deviation).toBe(0);
  });

  test('calculates deviation for value above normal range', () => {
    const value = 150;
    const normalRange = { min: 90, max: 120 };

    const deviation = calculateVitalsDeviation(value, normalRange);

    // (150 - 120) / 120 = 0.25 → 2.5 on 0-10 scale
    expect(deviation).toBeCloseTo(2.5, 1);
  });

  test('calculates deviation for value below normal range', () => {
    const value = 50;
    const normalRange = { min: 90, max: 120 };

    const deviation = calculateVitalsDeviation(value, normalRange);

    // (90 - 50) / 90 = 0.444 → 4.44 on 0-10 scale
    expect(deviation).toBeCloseTo(4.44, 1);
  });

  test('caps deviation at 10', () => {
    const value = 300;
    const normalRange = { min: 90, max: 120 };

    const deviation = calculateVitalsDeviation(value, normalRange);

    expect(deviation).toBe(10);
  });

  test('returns 0 if normalRange is null', () => {
    const value = 150;
    const normalRange = null;

    const deviation = calculateVitalsDeviation(value, normalRange);

    expect(deviation).toBe(0);
  });

  test('returns 0 if normalRange is missing min/max', () => {
    const value = 150;
    const normalRange = {};

    const deviation = calculateVitalsDeviation(value, normalRange);

    expect(deviation).toBe(0);
  });
});

describe('calculateTrendVelocity', () => {
  test('returns 0 for insufficient observations (< 2)', () => {
    const observations = [
      { value: 5, recordedAt: new Date('2025-10-15') }
    ];

    const velocity = calculateTrendVelocity(observations);

    expect(velocity).toBe(0);
  });

  test('returns 0 for empty observations', () => {
    const observations = [];

    const velocity = calculateTrendVelocity(observations);

    expect(velocity).toBe(0);
  });

  test('calculates positive velocity for worsening trend (increasing pain)', () => {
    const observations = [
      { value: 5, recordedAt: new Date('2025-10-09T12:00:00Z') },
      { value: 6, recordedAt: new Date('2025-10-11T12:00:00Z') },
      { value: 7, recordedAt: new Date('2025-10-13T12:00:00Z') },
      { value: 8, recordedAt: new Date('2025-10-15T12:00:00Z') }
    ];

    const velocity = calculateTrendVelocity(observations);

    // Positive slope (increasing values) = worsening
    expect(velocity).toBeGreaterThan(0);
    expect(velocity).toBeLessThanOrEqual(10);
  });

  test('returns 0 for improving trend (negative slope)', () => {
    const observations = [
      { value: 8, recordedAt: new Date('2025-10-09T12:00:00Z') },
      { value: 7, recordedAt: new Date('2025-10-11T12:00:00Z') },
      { value: 6, recordedAt: new Date('2025-10-13T12:00:00Z') },
      { value: 5, recordedAt: new Date('2025-10-15T12:00:00Z') }
    ];

    const velocity = calculateTrendVelocity(observations);

    // Negative slope (decreasing values) = improving, should be 0
    expect(velocity).toBe(0);
  });

  test('returns 0 for flat trend (no change)', () => {
    const observations = [
      { value: 5, recordedAt: new Date('2025-10-09T12:00:00Z') },
      { value: 5, recordedAt: new Date('2025-10-11T12:00:00Z') },
      { value: 5, recordedAt: new Date('2025-10-13T12:00:00Z') },
      { value: 5, recordedAt: new Date('2025-10-15T12:00:00Z') }
    ];

    const velocity = calculateTrendVelocity(observations);

    expect(velocity).toBe(0);
  });

  test('caps velocity at 10', () => {
    const observations = [
      { value: 1, recordedAt: new Date('2025-10-09T12:00:00Z') },
      { value: 100, recordedAt: new Date('2025-10-15T12:00:00Z') }
    ];

    const velocity = calculateTrendVelocity(observations);

    expect(velocity).toBe(10);
  });

  test('handles JSONB value format (value.value)', () => {
    const observations = [
      { value: { value: 5 }, recordedAt: new Date('2025-10-09T12:00:00Z') },
      { value: { value: 8 }, recordedAt: new Date('2025-10-15T12:00:00Z') }
    ];

    const velocity = calculateTrendVelocity(observations);

    expect(velocity).toBeGreaterThan(0);
  });
});

describe('calculateAdherencePenalty', () => {
  test('returns 0 penalty for 100% adherence', () => {
    const adherencePercentage = 100;

    const penalty = calculateAdherencePenalty(adherencePercentage);

    expect(penalty).toBe(0);
  });

  test('returns 10 penalty for 0% adherence', () => {
    const adherencePercentage = 0;

    const penalty = calculateAdherencePenalty(adherencePercentage);

    expect(penalty).toBe(10);
  });

  test('calculates penalty for 50% adherence', () => {
    const adherencePercentage = 50;

    const penalty = calculateAdherencePenalty(adherencePercentage);

    // 10 - (50 / 10) = 5.0
    expect(penalty).toBeCloseTo(5.0, 1);
  });

  test('calculates penalty for 75% adherence', () => {
    const adherencePercentage = 75;

    const penalty = calculateAdherencePenalty(adherencePercentage);

    // 10 - (75 / 10) = 2.5
    expect(penalty).toBeCloseTo(2.5, 1);
  });

  test('returns 0 if adherencePercentage is null', () => {
    const adherencePercentage = null;

    const penalty = calculateAdherencePenalty(adherencePercentage);

    expect(penalty).toBe(0);
  });

  test('returns 0 if adherencePercentage is undefined', () => {
    const adherencePercentage = undefined;

    const penalty = calculateAdherencePenalty(adherencePercentage);

    expect(penalty).toBe(0);
  });
});

describe('calculateRiskScore', () => {
  const mockPatient = {
    id: 'patient1',
    firstName: 'John',
    lastName: 'Doe'
  };

  const mockMetric = {
    id: 'metric1',
    key: 'pain_scale_0_10',
    displayName: 'Pain Scale (0-10)',
    normalRange: { min: 0, max: 3 }
  };

  test('calculates risk score with all components', () => {
    const alert = {
      id: 'alert1',
      severity: 'MEDIUM',
      data: { value: 8 }
    };

    const observations = [
      { value: 5, recordedAt: new Date('2025-10-09') },
      { value: 6, recordedAt: new Date('2025-10-11') },
      { value: 7, recordedAt: new Date('2025-10-13') }
    ];

    const adherence = { percentage: 60 };

    const result = calculateRiskScore(alert, mockPatient, mockMetric, observations, adherence);

    expect(result).toHaveProperty('riskScore');
    expect(result).toHaveProperty('components');
    expect(result.components).toHaveProperty('vitalsDeviation');
    expect(result.components).toHaveProperty('trendVelocity');
    expect(result.components).toHaveProperty('adherencePenalty');
    expect(result.components).toHaveProperty('severityMultiplier');

    expect(result.riskScore).toBeGreaterThan(0);
    expect(result.riskScore).toBeLessThanOrEqual(10);
  });

  test('applies CRITICAL severity multiplier (2.0x)', () => {
    const alert = {
      id: 'alert1',
      severity: 'CRITICAL',
      data: { value: 8 }
    };

    const result = calculateRiskScore(alert, mockPatient, mockMetric, [], { percentage: 100 });

    expect(result.components.severityMultiplier).toBe(2.0);
    expect(result.riskScore).toBeGreaterThan(0);
  });

  test('applies HIGH severity multiplier (1.5x)', () => {
    const alert = {
      id: 'alert1',
      severity: 'HIGH',
      data: { value: 8 }
    };

    const result = calculateRiskScore(alert, mockPatient, mockMetric, [], { percentage: 100 });

    expect(result.components.severityMultiplier).toBe(1.5);
  });

  test('applies MEDIUM severity multiplier (1.0x)', () => {
    const alert = {
      id: 'alert1',
      severity: 'MEDIUM',
      data: { value: 8 }
    };

    const result = calculateRiskScore(alert, mockPatient, mockMetric, [], { percentage: 100 });

    expect(result.components.severityMultiplier).toBe(1.0);
  });

  test('applies LOW severity multiplier (0.5x)', () => {
    const alert = {
      id: 'alert1',
      severity: 'LOW',
      data: { value: 8 }
    };

    const result = calculateRiskScore(alert, mockPatient, mockMetric, [], { percentage: 100 });

    expect(result.components.severityMultiplier).toBe(0.5);
  });

  test('CRITICAL severity has 2x risk score of MEDIUM', () => {
    const baseAlert = {
      id: 'alert1',
      severity: 'MEDIUM',
      data: { value: 8 }
    };

    const mediumResult = calculateRiskScore(baseAlert, mockPatient, mockMetric, [], { percentage: 100 });

    const criticalAlert = { ...baseAlert, severity: 'CRITICAL' };
    const criticalResult = calculateRiskScore(criticalAlert, mockPatient, mockMetric, [], { percentage: 100 });

    expect(criticalResult.riskScore).toBeCloseTo(mediumResult.riskScore * 2, 1);
  });

  test('caps risk score at 10', () => {
    const alert = {
      id: 'alert1',
      severity: 'CRITICAL',
      data: { value: 300 }  // Extreme deviation
    };

    const metric = {
      ...mockMetric,
      normalRange: { min: 0, max: 10 }
    };

    const observations = [
      { value: 1, recordedAt: new Date('2025-10-09') },
      { value: 200, recordedAt: new Date('2025-10-15') }
    ];

    const adherence = { percentage: 0 };  // No adherence

    const result = calculateRiskScore(alert, mockPatient, metric, observations, adherence);

    expect(result.riskScore).toBe(10);
  });

  test('returns low risk score for value in normal range with good adherence', () => {
    const alert = {
      id: 'alert1',
      severity: 'LOW',
      data: { value: 2 }  // Within normal range 0-3
    };

    const result = calculateRiskScore(alert, mockPatient, mockMetric, [], { percentage: 100 });

    expect(result.components.vitalsDeviation).toBe(0);
    expect(result.components.adherencePenalty).toBe(0);
    expect(result.riskScore).toBeLessThan(1);
  });

  test('handles alert.data with nested value format', () => {
    const alert = {
      id: 'alert1',
      severity: 'MEDIUM',
      data: { value: { value: 8 } }  // JSONB format
    };

    const result = calculateRiskScore(alert, mockPatient, mockMetric, [], { percentage: 100 });

    expect(result.riskScore).toBeGreaterThan(0);
  });

  test('uses correct formula: (vitals*0.5 + trend*0.3 + adherence*0.2) * severity', () => {
    const alert = {
      id: 'alert1',
      severity: 'MEDIUM',
      data: { value: 8 }
    };

    const metric = {
      ...mockMetric,
      normalRange: { min: 0, max: 5 }
    };

    // No trend, no adherence issue
    const result = calculateRiskScore(alert, mockPatient, metric, [], { percentage: 100 });

    // vitalsDeviation = (8-5)/5 = 0.6 → 6.0
    // trendVelocity = 0 (no observations)
    // adherencePenalty = 0 (100% adherence)
    // severityMultiplier = 1.0 (MEDIUM)
    // riskScore = (6.0 * 0.5 + 0 * 0.3 + 0 * 0.2) * 1.0 = 3.0

    expect(result.components.vitalsDeviation).toBeCloseTo(6.0, 1);
    expect(result.components.trendVelocity).toBe(0);
    expect(result.components.adherencePenalty).toBe(0);
    expect(result.riskScore).toBeCloseTo(3.0, 1);
  });
});

describe('updateAlertRiskScores', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // NOTE: These are integration tests that will be moved to integration test suite
  // They require actual Prisma client with database connection
  test.skip('updates risk scores for PENDING and ACKNOWLEDGED alerts only', async () => {
    const patientId = 'patient1';
    const metricId = 'metric1';

    const mockAlerts = [
      {
        id: 'alert1',
        status: 'PENDING',
        severity: 'HIGH',
        riskScore: 5.0,
        data: { value: 8 },
        patientId,
        ruleId: 'rule1'
      },
      {
        id: 'alert2',
        status: 'ACKNOWLEDGED',
        severity: 'MEDIUM',
        riskScore: 4.0,
        data: { value: 7 },
        patientId,
        ruleId: 'rule2'
      },
      {
        id: 'alert3',
        status: 'RESOLVED',
        severity: 'LOW',
        riskScore: 3.0,
        data: { value: 6 },
        patientId,
        ruleId: 'rule3'
      }
    ];

    const mockMetric = {
      id: metricId,
      key: 'pain_scale_0_10',
      normalRange: { min: 0, max: 3 }
    };

    const mockObservations = [
      { value: 5, recordedAt: new Date('2025-10-09') },
      { value: 6, recordedAt: new Date('2025-10-11') }
    ];

    mockPrisma.alert.findMany.mockResolvedValue(mockAlerts.slice(0, 2)); // Only PENDING and ACKNOWLEDGED
    mockPrisma.metricDefinition.findUnique.mockResolvedValue(mockMetric);
    mockPrisma.observation.findMany.mockResolvedValue(mockObservations);
    mockPrisma.patientMedication.findMany.mockResolvedValue([{ id: 'med1' }]);
    mockPrisma.medicationAdherence.findMany.mockResolvedValue([
      { takenAt: new Date(), patientMedicationId: 'med1' }
    ]);
    mockPrisma.alert.update.mockResolvedValue({});

    const result = await updateAlertRiskScores(patientId, metricId);

    expect(mockPrisma.alert.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          patientId,
          data: expect.objectContaining({
            path: ['observationId'],
            // Should filter by observation that matches metricId
          }),
          status: {
            in: ['PENDING', 'ACKNOWLEDGED']
          }
        })
      })
    );

    expect(result).toHaveProperty('updated');
    expect(result).toHaveProperty('alerts');
    expect(result.updated).toBe(2);
  });

  // NOTE: These are integration tests that will be moved to integration test suite
  // They require actual Prisma client with database connection
  test.skip('returns empty result if no alerts found', async () => {
    mockPrisma.alert.findMany.mockResolvedValue([]);

    const result = await updateAlertRiskScores('patient1', 'metric1');

    expect(result.updated).toBe(0);
    expect(result.alerts).toEqual([]);
  });

  test.skip('skips alerts without sufficient data', async () => {
    const mockAlerts = [
      {
        id: 'alert1',
        status: 'PENDING',
        severity: 'HIGH',
        data: { value: 8 },
        patientId: 'patient1',
        ruleId: 'rule1'
      }
    ];

    const mockMetric = {
      id: 'metric1',
      key: 'test_metric',
      normalRange: null  // No normal range
    };

    mockPrisma.alert.findMany.mockResolvedValue(mockAlerts);
    mockPrisma.metricDefinition.findUnique.mockResolvedValue(mockMetric);
    mockPrisma.observation.findMany.mockResolvedValue([]);
    mockPrisma.patientMedication.findMany.mockResolvedValue([]);
    mockPrisma.medicationAdherence.findMany.mockResolvedValue([]);

    const result = await updateAlertRiskScores('patient1', 'metric1');

    // Should still update with components it can calculate
    expect(result.updated).toBeGreaterThan(0);
  });
});
