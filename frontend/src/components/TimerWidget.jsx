import React, { useState } from 'react';
import { ClockIcon, StopIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useTimer } from '../hooks/useTimer';
import { toast } from 'react-toastify';

/**
 * Timer Widget Component
 *
 * Displays active timer for a patient with:
 * - Real-time elapsed time counter
 * - Stop & Document button
 * - Cancel button
 * - "Stop & Document" modal with notes and CPT code
 *
 * Auto-starts when alert/task is claimed
 * Displays prominently to ensure clinicians remember to log time
 *
 * Note: clinicianId is determined on backend from authenticated user
 */
export default function TimerWidget({ patientId, patientName, onTimeStopped }) {
  const { isActive, elapsedTime, timer, stopTimer, cancelTimer, isStopping, isCancelling } = useTimer(patientId);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopFormData, setStopFormData] = useState({
    notes: '',
    cptCode: '',
    billable: true
  });

  // Don't render if no active timer
  if (!isActive) {
    return null;
  }

  // Format elapsed time as MM:SS
  const formatTime = () => {
    const minutes = String(elapsedTime.minutes).padStart(2, '0');
    const seconds = String(elapsedTime.seconds).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  // Handle Stop & Document button click
  const handleStopClick = () => {
    setShowStopModal(true);
  };

  // Handle actual time log submission
  const handleStopSubmit = async (e) => {
    e.preventDefault();

    try {
      await stopTimer({
        notes: stopFormData.notes,
        cptCode: stopFormData.cptCode || null,
        billable: stopFormData.billable
      });

      toast.success(`Time logged: ${elapsedTime.minutes} minutes`);
      setShowStopModal(false);
      setStopFormData({ notes: '', cptCode: '', billable: true });

      // Notify parent component
      if (onTimeStopped) {
        onTimeStopped({ minutes: elapsedTime.minutes });
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
      toast.error('Failed to stop timer');
    }
  };

  // Handle cancel timer
  const handleCancelClick = async () => {
    if (!window.confirm('Are you sure you want to cancel this timer without logging time?')) {
      return;
    }

    try {
      await cancelTimer();
      toast.success('Timer cancelled');
    } catch (error) {
      console.error('Error cancelling timer:', error);
      toast.error('Failed to cancel timer');
    }
  };

  return (
    <>
      {/* Timer Display Widget */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg shadow-md">
        <div className="flex items-center justify-between">
          {/* Timer Icon + Time */}
          <div className="flex items-center space-x-3">
            <ClockIcon className="h-6 w-6 text-blue-600 animate-pulse" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Active Timer: {patientName}
              </p>
              <p className="text-2xl font-bold text-blue-700 font-mono">
                {formatTime()}
              </p>
              <p className="text-xs text-gray-500">
                {timer?.activity || 'Patient engagement'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              onClick={handleStopClick}
              disabled={isStopping}
              className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <StopIcon className="h-4 w-4 mr-1" />
              {isStopping ? 'Stopping...' : 'Stop & Document'}
            </button>
            <button
              onClick={handleCancelClick}
              disabled={isCancelling}
              className="flex items-center px-3 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 disabled:opacity-50"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stop & Document Modal */}
      {showStopModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Stop Timer & Log Time
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                You spent <span className="font-bold text-blue-600">{elapsedTime.minutes} minutes</span> on this patient
              </p>
            </div>

            <form onSubmit={handleStopSubmit} className="px-6 py-4 space-y-4">
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={stopFormData.notes}
                  onChange={(e) => setStopFormData({ ...stopFormData, notes: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What did you do during this time?"
                />
              </div>

              {/* CPT Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPT Code (optional)
                </label>
                <select
                  value={stopFormData.cptCode}
                  onChange={(e) => setStopFormData({ ...stopFormData, cptCode: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select CPT Code</option>

                  {/* Alert-related timers: Show only clinical time codes */}
                  {timer?.source === 'alert' && (
                    <>
                      <option value="99457">99457 - First 20 min clinical time (RPM)</option>
                      <option value="99458">99458 - Additional 20 min (RPM)</option>
                      <option value="98977">98977 - First 20 min treatment (RTM)</option>
                      <option value="98980">98980 - Additional 20 min (RTM - respiratory)</option>
                      <option value="98981">98981 - Additional 20 min (RTM - musculoskeletal)</option>
                      <option value="99490">99490 - CCM first 20 min</option>
                      <option value="99439">99439 - CCM additional 20 min</option>
                    </>
                  )}

                  {/* Task-related timers: Show clinical time codes */}
                  {timer?.source === 'task' && (
                    <>
                      <option value="99457">99457 - First 20 min clinical time (RPM)</option>
                      <option value="99458">99458 - Additional 20 min (RPM)</option>
                      <option value="98977">98977 - First 20 min treatment (RTM)</option>
                      <option value="98980">98980 - Additional 20 min (RTM - respiratory)</option>
                      <option value="98981">98981 - Additional 20 min (RTM - musculoskeletal)</option>
                      <option value="99490">99490 - CCM first 20 min</option>
                      <option value="99439">99439 - CCM additional 20 min</option>
                    </>
                  )}

                  {/* Manual timers or enrollment-related: Show all codes */}
                  {(timer?.source === 'manual' || !timer?.source) && (
                    <>
                      {/* Setup codes - for enrollment/device activation */}
                      <optgroup label="Setup & Device Supply">
                        <option value="99453">99453 - Initial setup (RPM)</option>
                        <option value="99454">99454 - Device supply (RPM)</option>
                        <option value="98975">98975 - Initial setup (RTM)</option>
                        <option value="98976">98976 - Device supply (RTM)</option>
                      </optgroup>

                      {/* Clinical time codes */}
                      <optgroup label="Clinical Time">
                        <option value="99457">99457 - First 20 min clinical time (RPM)</option>
                        <option value="99458">99458 - Additional 20 min (RPM)</option>
                        <option value="98977">98977 - First 20 min treatment (RTM)</option>
                        <option value="98980">98980 - Additional 20 min (RTM - respiratory)</option>
                        <option value="98981">98981 - Additional 20 min (RTM - musculoskeletal)</option>
                        <option value="99490">99490 - CCM first 20 min</option>
                        <option value="99439">99439 - CCM additional 20 min</option>
                      </optgroup>
                    </>
                  )}
                </select>

                {/* Help text based on timer source */}
                {timer?.source === 'alert' && (
                  <p className="mt-1 text-xs text-gray-500">
                    💡 Showing clinical time codes relevant for alert resolution
                  </p>
                )}
                {timer?.source === 'manual' && (
                  <p className="mt-1 text-xs text-gray-500">
                    💡 Setup codes (99453, 98975) should be used during enrollment/device activation
                  </p>
                )}
              </div>

              {/* Billable */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="billable"
                  checked={stopFormData.billable}
                  onChange={(e) => setStopFormData({ ...stopFormData, billable: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="billable" className="ml-2 text-sm text-gray-700">
                  Mark as billable
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isStopping}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  <CheckIcon className="h-5 w-5 mr-1" />
                  {isStopping ? 'Logging...' : 'Log Time'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowStopModal(false)}
                  disabled={isStopping}
                  className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
