import React, { useState, useEffect } from 'react';
import { ClockIcon, StopIcon, XMarkIcon, CheckIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useTimer } from '../hooks/useTimer';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import api from '../services/api';

/**
 * Timer Widget Component
 *
 * Displays active timer for a patient with:
 * - Real-time elapsed time counter
 * - Stop & Document button with CONTEXTUAL CPT code selection
 * - Cancel button
 * - "Stop & Document" modal with notes and CPT code
 *
 * Auto-starts when alert/task is claimed
 * Displays prominently to ensure clinicians remember to log time
 *
 * Contextual CPT Code Features:
 * - Fetches available CPT codes based on patient's enrollment and billing program
 * - Shows only eligible codes (e.g., no "additional 20 min" until "first 20 min" is billed)
 * - Auto-recommends appropriate code based on elapsed time
 * - Visual feedback for unavailable codes with reasons
 *
 * Note: clinicianId is determined on backend from authenticated user
 */
export default function TimerWidget({ patientId, patientName, enrollmentId, onTimeStopped }) {
  const { isActive, elapsedTime, timer, stopTimer, cancelTimer, isStopping, isCancelling } = useTimer(patientId);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopFormData, setStopFormData] = useState({
    notes: '',
    cptCode: '',
    billable: true
  });

  // Get current billing month (YYYY-MM format)
  const getBillingMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Fetch available CPT codes when modal opens (only if enrollmentId provided)
  const { data: availableCPTData, isLoading: isLoadingCPTCodes } = useQuery({
    queryKey: ['availableCPTCodes', enrollmentId, getBillingMonth(), elapsedTime.minutes],
    queryFn: () => api.getAvailableCPTCodes(enrollmentId, getBillingMonth(), elapsedTime.minutes),
    enabled: showStopModal && !!enrollmentId,
    staleTime: 30000 // Cache for 30 seconds
  });

  // Auto-select recommended CPT code when available
  useEffect(() => {
    if (availableCPTData?.recommendedCode && !stopFormData.cptCode) {
      setStopFormData(prev => ({ ...prev, cptCode: availableCPTData.recommendedCode }));
    }
  }, [availableCPTData]);

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

              {/* CPT Code - Contextual Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CPT Code (optional)
                </label>

                {/* Show loading state while fetching codes */}
                {isLoadingCPTCodes && enrollmentId && (
                  <div className="text-sm text-gray-500 py-2">
                    Loading available CPT codes...
                  </div>
                )}

                {/* Show CPT codes if enrollment has billing program */}
                {!isLoadingCPTCodes && availableCPTData?.availableCodes && (
                  <>
                    <select
                      value={stopFormData.cptCode}
                      onChange={(e) => setStopFormData({ ...stopFormData, cptCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select CPT Code</option>

                      {/* Available codes */}
                      {availableCPTData.availableCodes
                        .filter(code => code.available)
                        .map(code => (
                          <option
                            key={code.code}
                            value={code.code}
                            className={code.code === availableCPTData.recommendedCode ? 'font-bold bg-green-50' : ''}
                          >
                            {code.code === availableCPTData.recommendedCode && '⭐ '}
                            {code.code} - {code.description}
                            {code.reimbursementRate && ` ($${code.reimbursementRate})`}
                          </option>
                        ))}
                    </select>

                    {/* Show recommended code hint */}
                    {availableCPTData.recommendedCode && (
                      <p className="mt-1 text-xs text-green-600 flex items-center">
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Recommended: {availableCPTData.recommendedCode} based on {elapsedTime.minutes} minutes
                      </p>
                    )}

                    {/* Show unavailable codes with reasons */}
                    {availableCPTData.availableCodes.filter(code => !code.available).length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                          Show unavailable codes ({availableCPTData.availableCodes.filter(c => !c.available).length})
                        </summary>
                        <div className="mt-2 space-y-1">
                          {availableCPTData.availableCodes
                            .filter(code => !code.available)
                            .map(code => (
                              <div key={code.code} className="text-xs text-gray-500 bg-gray-50 p-2 rounded flex items-start">
                                <ExclamationCircleIcon className="h-4 w-4 text-gray-400 mr-1 flex-shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-medium">{code.code}</span> - {code.description}
                                  <br />
                                  <span className="text-red-600">{code.unavailableReason}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </details>
                    )}

                    {/* Show billing program info */}
                    <p className="mt-1 text-xs text-gray-500">
                      Program: {availableCPTData.billingProgram} ({availableCPTData.billingProgramCode})
                    </p>
                  </>
                )}

                {/* Fallback: No enrollment or no billing program */}
                {!enrollmentId && (
                  <div className="text-sm text-gray-500 py-2 bg-yellow-50 p-3 rounded">
                    <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 inline mr-2" />
                    No enrollment found - CPT code selection unavailable
                  </div>
                )}

                {!isLoadingCPTCodes && enrollmentId && availableCPTData?.error && (
                  <div className="text-sm text-gray-500 py-2 bg-yellow-50 p-3 rounded">
                    <ExclamationCircleIcon className="h-5 w-5 text-yellow-600 inline mr-2" />
                    {availableCPTData.error}
                  </div>
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
