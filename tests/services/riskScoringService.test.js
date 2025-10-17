/**
 * Unit Tests for Risk Scoring Service
 *
 * Tests all risk score calculation components:
 * - Vitals deviation (50% weight)
 * - Trend velocity (30% weight)
 * - Adherence penalty (20% weight)
 * - Severity multiplier (CRITICAL: 2.0x, HIGH: 1.5x, MEDIUM: 1.0x, LOW: 0.5x)
 * - Overall risk score calculation
 * - Alert risk score updates
 *
 * Target: >90% code coverage
 */

const {
  calculateRiskScore,
  calculateVitalsDeviation,
  calculateTrendVelocity,
  calculateAdherencePenalty,
  getSeverityMultiplier,
  extractValue,
  calculateMedicationAdherence,
  updateAlertRiskScores
} = require('../../src/services/riskScoringService');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Mock Prisma for database operations
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    alert: {
      findMany: jest.fn(),
      update: jest.fn()
    },
    metricDefinition: {
      findUnique: jest.fn()
    },
    observation: {
      findMany: jest.fn()
    },
    patientMedication: {
      findMany: jest.fn()
    }
  };
  return {
    PrismaClient: jest.fn(() => mockPrisma)
  };
});

describe('Risk Scoring Service - Component Functions', () => {
  describe('calculateVitalsDeviation', () => {
    it('should return 0 for value within normal range', () => {
      const result = calculateVitalsDeviation(80, { min: 60, max: 100 });
      expect(result).toBe(0);
    });

    it('should calculate deviation for value below normal range', () => {
      const result = calculateVitalsDeviation(40, { min: 60, max: 100 });
      // (60 - 40) / 60 = 0.33, * 10 = 3.33
      expect(result).toBeCloseTo(3.33, 2);
    });

    it('should calculate deviation for value above normal range', () => {
      const result = calculateVitalsDeviation(120, { min: 60, max: 100 });
      // (120 - 100) / 100 = 0.2, * 10 = 2.0
      expect(result).toBeCloseTo(2.0, 2);
    });

    it('should cap deviation at 10', () => {
      const result = calculateVitalsDeviation(300, { min: 60, max: 100 });
      expect(result).toBe(10);
    });

    it('should return 0 for missing normal range', () => {
      expect(calculateVitalsDeviation(100, null)).toBe(0);
      expect(calculateVitalsDeviation(100, {})).toBe(0);
      expect(calculateVitalsDeviation(100, { min: undefined })).toBe(0);
    });

    it('should handle boundary values at min', () => {
      const result = calculateVitalsDeviation(60, { min: 60, max: 100 });
      expect(result).toBe(0);
    });

    it('should handle boundary values at max', () => {
      const result = calculateVitalsDeviation(100, { min: 60, max: 100 });
      expect(result).toBe(0);
    });
  });

  describe('calculateTrendVelocity', () => {
    it('should return 0 for insufficient data (< 2 observations)', () => {
      expect(calculateTrendVelocity([])).toBe(0);
      expect(calculateTrendVelocity([{ value: 5, recordedAt: new Date() }])).toBe(0);
    });

    it('should return 0 for improving trend (negative slope)', () => {
      const now = new Date();
      const observations = [
        { value: 10, recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { value: 8, recordedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { value: 6, recordedAt: now }
      ];
      const result = calculateTrendVelocity(observations);
      expect(result).toBe(0);
    });

    it('should calculate positive velocity for worsening trend', () => {
      const now = new Date();
      const observations = [
        { value: 5, recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { value: 6, recordedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { value: 7, recordedAt: now }
      ];
      const result = calculateTrendVelocity(observations);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(10);
    });

    it('should handle JSONB format observations', () => {
      const now = new Date();
      const observations = [
        { value: { value: 5 }, recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { value: { value: 6 }, recordedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { value: { value: 7 }, recordedAt: now }
      ];
      const result = calculateTrendVelocity(observations);
      expect(result).toBeGreaterThan(0);
    });

    it('should cap velocity at 10', () => {
      const now = new Date();
      const observations = [
        { value: 1, recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { value: 50, recordedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) },
        { value: 100, recordedAt: now }
      ];
      const result = calculateTrendVelocity(observations);
      expect(result).toBe(10);
    });

    it('should sort observations by timestamp', () => {
      const now = new Date();
      // Out of order observations
      const observations = [
        { value: 7, recordedAt: now },
        { value: 5, recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
        { value: 6, recordedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000) }
      ];
      const result = calculateTrendVelocity(observations);
      expect(result).toBeGreaterThan(0); // Should detect worsening trend after sorting
    });
  });

  describe('calculateAdherencePenalty', () => {
    it('should return 0 penalty for 100% adherence', () => {
      const result = calculateAdherencePenalty(100);
      expect(result).toBe(0);
    });

    it('should return 10 penalty for 0% adherence', () => {
      const result = calculateAdherencePenalty(0);
      expect(result).toBe(10);
    });

    it('should return 5 penalty for 50% adherence', () => {
      const result = calculateAdherencePenalty(50);
      expect(result).toBe(5);
    });

    it('should return 0 for null adherence (no data)', () => {
      expect(calculateAdherencePenalty(null)).toBe(0);
      expect(calculateAdherencePenalty(undefined)).toBe(0);
    });

    it('should handle partial adherence percentages', () => {
      expect(calculateAdherencePenalty(75)).toBe(2.5);
      expect(calculateAdherencePenalty(25)).toBe(7.5);
      expect(calculateAdherencePenalty(90)).toBe(1);
    });
  });

  describe('getSeverityMultiplier', () => {
    it('should return correct multiplier for CRITICAL', () => {
      expect(getSeverityMultiplier('CRITICAL')).toBe(2.0);
    });

    it('should return correct multiplier for HIGH', () => {
      expect(getSeverityMultiplier('HIGH')).toBe(1.5);
    });

    it('should return correct multiplier for MEDIUM', () => {
      expect(getSeverityMultiplier('MEDIUM')).toBe(1.0);
    });

    it('should return correct multiplier for LOW', () => {
      expect(getSeverityMultiplier('LOW')).toBe(0.5);
    });

    it('should return 1.0 for unknown severity', () => {
      expect(getSeverityMultiplier('UNKNOWN')).toBe(1.0);
      expect(getSeverityMultiplier(null)).toBe(1.0);
      expect(getSeverityMultiplier(undefined)).toBe(1.0);
    });
  });

  describe('extractValue', () => {
    it('should extract numeric value', () => {
      expect(extractValue({ value: 42 })).toBe(42);
    });

    it('should extract value from JSONB format', () => {
      expect(extractValue({ value: { value: 42 } })).toBe(42);
    });

    it('should return 0 for missing data', () => {
      expect(extractValue(null)).toBe(0);
      expect(extractValue({})).toBe(0);
      expect(extractValue({ value: undefined })).toBe(0);
    });

    it('should convert string numbers to numbers', () => {
      expect(extractValue({ value: '42' })).toBe(42);
      expect(extractValue({ value: { value: '42' } })).toBe(42);
    });
  });
});

describe('Risk Scoring Service - Main calculateRiskScore Function', () => {
  it('should calculate risk score with all components', () => {
    const alert = {
      severity: 'HIGH',
      data: { value: 120 } // Above normal range
    };
    const patient = { id: 'patient1' };
    const metric = { normalRange: { min: 60, max: 100 } };
    const observations = [
      { value: 105, recordedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
      { value: 110, recordedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      { value: 120, recordedAt: new Date() }
    ];
    const adherence = { percentage: 80 };

    const result = calculateRiskScore(alert, patient, metric, observations, adherence);

    expect(result).toHaveProperty('riskScore');
    expect(result).toHaveProperty('components');
    expect(result.riskScore).toBeGreaterThan(0);
    expect(result.riskScore).toBeLessThanOrEqual(10);
    expect(result.components).toHaveProperty('vitalsDeviation');
    expect(result.components).toHaveProperty('trendVelocity');
    expect(result.components).toHaveProperty('adherencePenalty');
    expect(result.components).toHaveProperty('severityMultiplier');
    expect(result.components.severityMultiplier).toBe(1.5); // HIGH
  });

  it('should apply correct formula weights (50%, 30%, 20%)', () => {
    const alert = {
      severity: 'MEDIUM', // 1.0x multiplier
      data: { value: 120 }
    };
    const patient = { id: 'patient1' };
    const metric = { normalRange: { min: 60, max: 100 } };

    // Create observations with zero trend
    const now = new Date();
    const observations = [
      { value: 120, recordedAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000) },
      { value: 120, recordedAt: now }
    ];
    const adherence = { percentage: 100 }; // No penalty

    const result = calculateRiskScore(alert, patient, metric, observations, adherence);

    // Expected: vitals deviation = 2.0, trend = 0, adherence = 0
    // Base score = (2.0 * 0.5) + (0 * 0.3) + (0 * 0.2) = 1.0
    // Risk score = 1.0 * 1.0 (MEDIUM) = 1.0
    expect(result.components.vitalsDeviation).toBe(2.0);
    expect(result.components.trendVelocity).toBe(0);
    expect(result.components.adherencePenalty).toBe(0);
    expect(result.riskScore).toBe(1.0);
  });

  it('should apply severity multiplier correctly', () => {
    const baseAlert = {
      data: { value: 80 }, // Within range
      severity: 'MEDIUM'
    };
    const patient = { id: 'patient1' };
    const metric = { normalRange: { min: 60, max: 100 } };

    // Test with different severities
    const criticalResult = calculateRiskScore(
      { ...baseAlert, severity: 'CRITICAL' },
      patient,
      metric
    );
    const highResult = calculateRiskScore(
      { ...baseAlert, severity: 'HIGH' },
      patient,
      metric
    );
    const mediumResult = calculateRiskScore(
      { ...baseAlert, severity: 'MEDIUM' },
      patient,
      metric
    );
    const lowResult = calculateRiskScore(
      { ...baseAlert, severity: 'LOW' },
      patient,
      metric
    );

    expect(criticalResult.components.severityMultiplier).toBe(2.0);
    expect(highResult.components.severityMultiplier).toBe(1.5);
    expect(mediumResult.components.severityMultiplier).toBe(1.0);
    expect(lowResult.components.severityMultiplier).toBe(0.5);
  });

  it('should cap final risk score at 10', () => {
    const alert = {
      severity: 'CRITICAL', // 2.0x multiplier
      data: { value: 300 } // Extreme deviation
    };
    const patient = { id: 'patient1' };
    const metric = { normalRange: { min: 60, max: 100 } };
    const adherence = { percentage: 0 }; // Max penalty

    const result = calculateRiskScore(alert, patient, metric, [], adherence);

    expect(result.riskScore).toBeLessThanOrEqual(10);
  });

  it('should handle minimal data gracefully', () => {
    const alert = {
      severity: 'LOW',
      data: { value: 80 }
    };
    const patient = { id: 'patient1' };
    const metric = { normalRange: { min: 60, max: 100 } };

    const result = calculateRiskScore(alert, patient, metric);

    expect(result.riskScore).toBe(0); // All components = 0, within range
    expect(result.components.vitalsDeviation).toBe(0);
    expect(result.components.trendVelocity).toBe(0);
    expect(result.components.adherencePenalty).toBe(0);
  });

  it('should round results to 2 decimal places', () => {
    const alert = {
      severity: 'MEDIUM',
      data: { value: 121 } // Should create fractional deviation
    };
    const patient = { id: 'patient1' };
    const metric = { normalRange: { min: 60, max: 100 } };

    const result = calculateRiskScore(alert, patient, metric);

    // Check riskScore has max 2 decimal places
    expect(result.riskScore.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
    // Check components have max 2 decimal places
    expect(result.components.vitalsDeviation.toString().split('.')[1]?.length || 0).toBeLessThanOrEqual(2);
  });
});

describe('Risk Scoring Service - Database Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateMedicationAdherence', () => {
    it('should return 100% for patient with no medications', async () => {
      prisma.patientMedication.findMany.mockResolvedValue([]);

      const result = await calculateMedicationAdherence('patient1', 30);

      expect(result.percentage).toBe(100);
      expect(result.taken).toBe(0);
      expect(result.expected).toBe(0);
    });

    it('should calculate adherence percentage correctly', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      prisma.patientMedication.findMany.mockResolvedValue([
        {
          id: 'med1',
          patientId: 'patient1',
          frequency: 'twice daily',
          startDate: startDate,
          isActive: true,
          medicationAdherence: new Array(50).fill({ id: 'adherence1', takenAt: new Date() })
        }
      ]);

      const result = await calculateMedicationAdherence('patient1', 30);

      expect(result.taken).toBe(50);
      expect(result.expected).toBe(60); // 30 days * 2 doses/day
      expect(result.percentage).toBeCloseTo(83.3, 1);
    });

    it('should parse frequency strings correctly', async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 10);

      prisma.patientMedication.findMany.mockResolvedValue([
        {
          frequency: 'three times daily',
          startDate: startDate,
          isActive: true,
          medicationAdherence: new Array(25).fill({})
        }
      ]);

      const result = await calculateMedicationAdherence('patient1', 30);

      expect(result.expected).toBe(30); // 10 days * 3 doses/day
    });

    it('should cap adherence at 100%', async () => {
      prisma.patientMedication.findMany.mockResolvedValue([
        {
          frequency: 'once daily',
          startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          isActive: true,
          medicationAdherence: new Array(10).fill({}) // More than expected
        }
      ]);

      const result = await calculateMedicationAdherence('patient1', 30);

      expect(result.percentage).toBeLessThanOrEqual(100);
    });

    it('should handle database errors gracefully', async () => {
      prisma.patientMedication.findMany.mockRejectedValue(new Error('Database error'));

      const result = await calculateMedicationAdherence('patient1', 30);

      expect(result.percentage).toBe(100); // Default fallback
      expect(result.taken).toBe(0);
      expect(result.expected).toBe(0);
    });
  });

  describe('updateAlertRiskScores', () => {
    it('should return 0 updates for no matching alerts', async () => {
      prisma.alert.findMany.mockResolvedValue([]);

      const result = await updateAlertRiskScores('patient1', 'metric1');

      expect(result.updated).toBe(0);
      expect(result.alerts).toEqual([]);
    });

    it('should update risk scores for matching alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert1',
          patientId: 'patient1',
          severity: 'HIGH',
          status: 'PENDING',
          data: { value: 120, metricId: 'metric1' },
          patient: { id: 'patient1' },
          rule: { id: 'rule1', severity: 'HIGH' }
        }
      ];

      const mockMetric = {
        id: 'metric1',
        normalRange: { min: 60, max: 100 }
      };

      const mockObservations = [
        { value: 110, recordedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { value: 115, recordedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        { value: 120, recordedAt: new Date() }
      ];

      prisma.alert.findMany.mockResolvedValue(mockAlerts);
      prisma.metricDefinition.findUnique.mockResolvedValue(mockMetric);
      prisma.observation.findMany.mockResolvedValue(mockObservations);
      prisma.alert.update.mockResolvedValue({ ...mockAlerts[0], riskScore: 5.5 });
      prisma.patientMedication.findMany.mockResolvedValue([]);

      const result = await updateAlertRiskScores('patient1', 'metric1');

      expect(result.updated).toBe(1);
      expect(result.alerts.length).toBe(1);
      expect(prisma.alert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert1' },
          data: expect.objectContaining({
            riskScore: expect.any(Number)
          })
        })
      );
    });

    it('should handle metric not found', async () => {
      prisma.alert.findMany.mockResolvedValue([{ id: 'alert1' }]);
      prisma.metricDefinition.findUnique.mockResolvedValue(null);

      const result = await updateAlertRiskScores('patient1', 'metric1');

      expect(result.updated).toBe(0);
    });

    it('should handle database errors gracefully', async () => {
      prisma.alert.findMany.mockRejectedValue(new Error('Database error'));

      const result = await updateAlertRiskScores('patient1', 'metric1');

      expect(result.updated).toBe(0);
      expect(result.alerts).toEqual([]);
    });

    it('should only update PENDING and ACKNOWLEDGED alerts', async () => {
      prisma.alert.findMany.mockResolvedValue([]);

      await updateAlertRiskScores('patient1', 'metric1');

      expect(prisma.alert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['PENDING', 'ACKNOWLEDGED'] }
          })
        })
      );
    });

    it('should filter observations to last 7 days', async () => {
      prisma.alert.findMany.mockResolvedValue([]);
      prisma.metricDefinition.findUnique.mockResolvedValue({ id: 'metric1' });

      await updateAlertRiskScores('patient1', 'metric1');

      expect(prisma.observation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recordedAt: expect.objectContaining({
              gte: expect.any(Date)
            })
          })
        })
      );
    });
  });
});

describe('Risk Scoring Service - Edge Cases and Error Handling', () => {
  it('should handle null/undefined inputs gracefully', () => {
    const result = calculateRiskScore(
      { severity: 'MEDIUM', data: {} },
      {},
      { normalRange: null },
      null,
      null
    );

    expect(result.riskScore).toBeGreaterThanOrEqual(0);
    expect(result.riskScore).toBeLessThanOrEqual(10);
  });

  it('should handle non-numeric observation values', () => {
    const observations = [
      { value: 'invalid', recordedAt: new Date() },
      { value: NaN, recordedAt: new Date() }
    ];

    const result = calculateTrendVelocity(observations);
    expect(result).toBe(0); // Should handle gracefully
  });

  it('should handle extreme vitals deviations', () => {
    const result = calculateVitalsDeviation(10000, { min: 60, max: 100 });
    expect(result).toBe(10); // Capped at 10
  });

  it('should handle zero normal range', () => {
    const result = calculateVitalsDeviation(50, { min: 0, max: 0 });
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(10);
  });
});
