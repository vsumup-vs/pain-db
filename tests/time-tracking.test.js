/**
 * Time Tracking Service Tests (Phase 1a)
 * Tests auto-start/stop time tracking functionality
 */

const timeTrackingService = require('../src/services/timeTrackingService');

describe('Time Tracking Service', () => {
  const mockUserId = 'user-123';
  const mockPatientId = 'patient-456';
  const mockClinicianId = 'clinician-789';

  beforeEach(() => {
    // Clean up any active timers before each test
    timeTrackingService.cleanupStaleTimers();
  });

  describe('startTimer', () => {
    it('should start a new timer successfully', async () => {
      const result = await timeTrackingService.startTimer({
        userId: mockUserId,
        patientId: mockPatientId,
        activity: 'Patient engagement',
        source: 'alert',
        sourceId: 'alert-123'
      });

      expect(result.success).toBe(true);
      expect(result.timer).toBeDefined();
      expect(result.timer.userId).toBe(mockUserId);
      expect(result.timer.patientId).toBe(mockPatientId);
      expect(result.timer.activity).toBe('Patient engagement');
      expect(result.timer.source).toBe('alert');
      expect(result.timer.sourceId).toBe('alert-123');
      expect(result.timer.startedAt).toBeInstanceOf(Date);
    });

    it('should not start timer if one already exists', async () => {
      // Start first timer
      await timeTrackingService.startTimer({
        userId: mockUserId,
        patientId: mockPatientId,
        activity: 'Test activity'
      });

      // Try to start second timer for same user-patient
      const result = await timeTrackingService.startTimer({
        userId: mockUserId,
        patientId: mockPatientId,
        activity: 'Another activity'
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('already running');
    });
  });

  describe('getActiveTimer', () => {
    it('should return active timer with elapsed time', async () => {
      await timeTrackingService.startTimer({
        userId: mockUserId,
        patientId: mockPatientId,
        activity: 'Test activity'
      });

      // Wait 1 second
      await new Promise(resolve => setTimeout(resolve, 1000));

      const result = timeTrackingService.getActiveTimer(mockUserId, mockPatientId);

      expect(result.active).toBe(true);
      expect(result.timer).toBeDefined();
      expect(result.elapsed).toBeDefined();
      expect(result.elapsed.totalMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should return inactive status when no timer exists', () => {
      const result = timeTrackingService.getActiveTimer('nonexistent-user', 'nonexistent-patient');

      expect(result.active).toBe(false);
      expect(result.timer).toBeUndefined();
    });
  });

  describe('cancelTimer', () => {
    it('should cancel active timer without creating time log', async () => {
      await timeTrackingService.startTimer({
        userId: mockUserId,
        patientId: mockPatientId,
        activity: 'Test activity'
      });

      const result = timeTrackingService.cancelTimer(mockUserId, mockPatientId);

      expect(result.success).toBe(true);

      // Verify timer is gone
      const checkTimer = timeTrackingService.getActiveTimer(mockUserId, mockPatientId);
      expect(checkTimer.active).toBe(false);
    });

    it('should fail to cancel non-existent timer', () => {
      const result = timeTrackingService.cancelTimer('nonexistent-user', 'nonexistent-patient');

      expect(result.success).toBe(false);
      expect(result.message).toContain('No active timer found');
    });
  });

  describe('getUserActiveTimers', () => {
    it('should return all active timers for a user', async () => {
      // Start timers for multiple patients
      await timeTrackingService.startTimer({
        userId: mockUserId,
        patientId: 'patient-1',
        activity: 'Activity 1'
      });

      await timeTrackingService.startTimer({
        userId: mockUserId,
        patientId: 'patient-2',
        activity: 'Activity 2'
      });

      const timers = timeTrackingService.getUserActiveTimers(mockUserId);

      expect(timers).toHaveLength(2);
      expect(timers[0].userId).toBe(mockUserId);
      expect(timers[1].userId).toBe(mockUserId);
    });

    it('should return empty array when user has no active timers', () => {
      const timers = timeTrackingService.getUserActiveTimers('nonexistent-user');

      expect(timers).toHaveLength(0);
    });
  });
});

// Note: stopTimer and adjustTimeLog tests require database connection and are integration tests
// Those should be tested in a separate integration test suite with proper database setup
