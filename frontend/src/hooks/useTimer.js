import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Custom hook for auto-start/stop time tracking
 *
 * Features:
 * - Fetches active timer for current patient
 * - Automatically updates elapsed time every second
 * - Provides start/stop/cancel mutations
 *
 * Usage:
 * const { timer, elapsedTime, startTimer, stopTimer, cancelTimer, isLoading } = useTimer(patientId);
 */
export function useTimer(patientId) {
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState({ minutes: 0, seconds: 0 });

  // Fetch active timer for patient
  const { data: timerData, isLoading, error } = useQuery({
    queryKey: ['active-timer', patientId],
    queryFn: () => api.getActiveTimer(patientId),
    enabled: !!patientId,
    refetchInterval: 30000, // Refetch every 30 seconds to stay synchronized
    staleTime: 10000 // Consider data stale after 10 seconds
  });

  const timer = timerData?.data;
  const isActive = timer?.active || false;

  // Update elapsed time every second when timer is active
  useEffect(() => {
    if (!isActive || !timer?.timer?.startedAt) {
      setElapsedTime({ minutes: 0, seconds: 0 });
      return;
    }

    const updateElapsedTime = () => {
      const startTime = new Date(timer.timer.startedAt);
      const now = new Date();
      const elapsedMs = now - startTime;
      const minutes = Math.floor(elapsedMs / 60000);
      const seconds = Math.floor((elapsedMs % 60000) / 1000);
      setElapsedTime({ minutes, seconds });
    };

    // Update immediately
    updateElapsedTime();

    // Then update every second
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [isActive, timer?.timer?.startedAt]);

  // Start timer mutation
  const startTimerMutation = useMutation({
    mutationFn: (data) => api.startTimer({
      patientId,
      activity: data.activity || 'Patient engagement',
      source: data.source || 'manual',
      sourceId: data.sourceId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['active-timer', patientId]);
    }
  });

  // Stop timer mutation
  const stopTimerMutation = useMutation({
    mutationFn: (data) => api.stopTimer({
      patientId,
      cptCode: data.cptCode,
      notes: data.notes,
      billable: data.billable !== false
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['active-timer', patientId]);
      queryClient.invalidateQueries(['time-logs']); // Refresh time logs list
    }
  });

  // Cancel timer mutation
  const cancelTimerMutation = useMutation({
    mutationFn: () => api.cancelTimer({ patientId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['active-timer', patientId]);
    }
  });

  // Wrapper functions for easier usage
  const startTimer = useCallback((options = {}) => {
    return startTimerMutation.mutateAsync(options);
  }, [startTimerMutation]);

  const stopTimer = useCallback((options) => {
    return stopTimerMutation.mutateAsync(options);
  }, [stopTimerMutation]);

  const cancelTimer = useCallback(() => {
    return cancelTimerMutation.mutateAsync();
  }, [cancelTimerMutation]);

  return {
    timer: timer?.timer,
    isActive,
    elapsedTime,
    startTimer,
    stopTimer,
    cancelTimer,
    isLoading,
    error,
    isStarting: startTimerMutation.isPending,
    isStopping: stopTimerMutation.isPending,
    isCancelling: cancelTimerMutation.isPending
  };
}

/**
 * Hook to get all active timers for current user
 * Useful for displaying timer summary across all patients
 */
export function useAllTimers() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['active-timers-all'],
    queryFn: () => api.getAllActiveTimers(),
    refetchInterval: 60000 // Refetch every minute
  });

  const timers = data?.data || [];

  return {
    timers,
    count: timers.length,
    isLoading,
    error
  };
}
