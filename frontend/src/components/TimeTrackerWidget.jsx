/**
 * Time Tracker Widget Component (Phase 1a - Auto-Start/Stop Time Tracking)
 *
 * Features:
 * - Displays active timer with elapsed time
 * - Auto-starts when user engages with patient
 * - "Stop & Document" workflow for time log creation
 * - Shows in Patient Context Panel
 */

import { useState, useEffect } from 'react'
import { ClockIcon, StopIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'

export default function TimeTrackerWidget({ patientId, clinicianId, onTimerStop }) {
  const queryClient = useQueryClient()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [showStopModal, setShowStopModal] = useState(false)
  const [cptCode, setCptCode] = useState('')
  const [notes, setNotes] = useState('')

  // Get active timer for this patient
  const { data: timerData, isLoading } = useQuery({
    queryKey: ['active-timer', patientId],
    queryFn: () => api.getActiveTimer(patientId),
    refetchInterval: 1000, // Update every second
    enabled: !!patientId
  })

  const timer = timerData?.data

  // Calculate elapsed time
  useEffect(() => {
    if (timer?.active) {
      const startTime = new Date(timer.timer.startedAt)
      const updateElapsed = () => {
        const now = new Date()
        const elapsed = Math.floor((now - startTime) / 1000)
        setElapsedSeconds(elapsed)
      }

      updateElapsed()
      const interval = setInterval(updateElapsed, 1000)

      return () => clearInterval(interval)
    }
  }, [timer])

  // Stop timer mutation
  const stopTimerMutation = useMutation({
    mutationFn: (data) => api.stopTimer(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['active-timer', patientId])
      queryClient.invalidateQueries(['billing-readiness'])
      setShowStopModal(false)
      setCptCode('')
      setNotes('')
      if (onTimerStop) onTimerStop()
    }
  })

  // Cancel timer mutation
  const cancelTimerMutation = useMutation({
    mutationFn: (data) => api.cancelTimer(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['active-timer', patientId])
    }
  })

  // Format elapsed time as HH:MM:SS
  const formatElapsed = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle stop & document
  const handleStopAndDocument = () => {
    stopTimerMutation.mutate({
      patientId,
      clinicianId,
      cptCode: cptCode || null,
      notes,
      billable: true
    })
  }

  // Handle cancel
  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this timer? No time will be logged.')) {
      cancelTimerMutation.mutate({ patientId })
    }
  }

  if (isLoading) return null
  if (!timer?.active) return null

  const elapsedMinutes = Math.floor(elapsedSeconds / 60)

  return (
    <>
      {/* Timer Widget */}
      <div className="bg-blue-50 dark:bg-blue-900 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ClockIcon className="h-6 w-6 text-blue-600 dark:text-blue-300 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Timer Running
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-300">
                {formatElapsed(elapsedSeconds)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {elapsedMinutes} {elapsedMinutes === 1 ? 'minute' : 'minutes'} elapsed
              </p>
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              onClick={() => setShowStopModal(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
            >
              <StopIcon className="h-5 w-5" />
              <span>Stop & Document</span>
            </button>

            <button
              onClick={handleCancel}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition"
              title="Cancel timer"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Activity: {timer.timer.activity}
        </div>
      </div>

      {/* Stop & Document Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={() => setShowStopModal(false)} />

            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Stop Timer & Document Time
              </h3>

              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total time: <span className="font-bold">{elapsedMinutes} minutes</span>
                </p>
              </div>

              <div className="space-y-4">
                {/* CPT Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CPT Code (Optional)
                  </label>
                  <select
                    value={cptCode}
                    onChange={(e) => setCptCode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select CPT Code</option>
                    <option value="CODE_99453">99453 - RTM: Setup and patient education</option>
                    <option value="CODE_99454">99454 - RTM: Device supply with daily recording</option>
                    <option value="CODE_99457">99457 - RTM: Interactive communication (20+ min)</option>
                    <option value="CODE_99458">99458 - RTM: Additional 20 minutes</option>
                    <option value="CODE_99091">99091 - CCM: Collection and interpretation</option>
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Optional notes about this clinical time..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowStopModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition"
                >
                  Cancel
                </button>

                <button
                  onClick={handleStopAndDocument}
                  disabled={stopTimerMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {stopTimerMutation.isPending ? 'Saving...' : 'Stop & Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
