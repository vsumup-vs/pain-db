import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import api from '../services/api'

/**
 * ResolutionModal Component
 *
 * Modal for resolving clinical alerts with required documentation fields.
 * Implements best practices for clinical, billing, and compliance purposes.
 *
 * Required Fields:
 * - resolutionNotes (min 10 chars): Clinical documentation of what was done
 * - interventionType: Type of intervention (PHONE_CALL, VIDEO_CALL, etc.)
 * - patientOutcome: Outcome after intervention (IMPROVED, STABLE, etc.)
 * - timeSpentMinutes: Time spent for billing documentation
 *
 * Optional Fields:
 * - createFollowUpTask: Whether to create a follow-up task
 * - followUpTaskType, followUpTaskTitle, followUpTaskDescription, followUpTaskDueDate
 */
export default function ResolutionModal({ alert, isOpen, onClose, onSubmit, isLoading, activeTimerMinutes, enrollmentId, isBulkMode = false, bulkCount = 0 }) {
  // Fetch clinicians for task assignment (includes nurses, care coordinators, etc.)
  const { data: cliniciansResponse } = useQuery({
    queryKey: ['clinicians'],
    queryFn: () => api.getClinicians({ limit: 100 }),
    enabled: isOpen,
  })

  // Extract clinicians array from response
  const users = cliniciansResponse?.clinicians || []

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      resolutionNotes: '',
      interventionType: '',
      patientOutcome: '',
      timeSpentMinutes: 20, // Default to 20 min threshold for CPT billing
      cptCode: '', // NEW: CPT code for billing
      createFollowUpTask: false,
      followUpTaskType: 'FOLLOW_UP_CALL',
      followUpTaskTitle: '',
      followUpTaskDescription: '',
      followUpTaskDueDate: '',
      followUpTaskPriority: 'MEDIUM',
      followUpTaskAssignedToId: '', // User to assign the task to
      createEncounterNote: false,
      encounterNoteType: 'GENERAL',
    },
  })

  const createFollowUpTask = watch('createFollowUpTask')
  const createEncounterNote = watch('createEncounterNote')
  const selectedPatientOutcome = watch('patientOutcome')
  const selectedInterventionType = watch('interventionType')
  const timeSpentMinutes = watch('timeSpentMinutes')
  const selectedCptCode = watch('cptCode')

  // Get current billing month (YYYY-MM format)
  const getBillingMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  // Fetch available CPT codes when modal opens (only if enrollmentId provided)
  const { data: availableCPTData, isLoading: isLoadingCPTCodes } = useQuery({
    queryKey: ['availableCPTCodes', enrollmentId, getBillingMonth(), timeSpentMinutes],
    queryFn: () => api.getAvailableCPTCodes(enrollmentId, getBillingMonth(), timeSpentMinutes),
    enabled: isOpen && !!enrollmentId && timeSpentMinutes > 0,
    staleTime: 30000 // Cache for 30 seconds
  });

  // Debug: Log enrollmentId when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('ResolutionModal opened - enrollmentId:', enrollmentId);
      console.log('Alert data:', alert?.data);
    }
  }, [isOpen, enrollmentId, alert]);

  // Auto-select recommended CPT code when available
  useEffect(() => {
    if (availableCPTData?.recommendedCode && !selectedCptCode) {
      setValue('cptCode', availableCPTData.recommendedCode);
    }
  }, [availableCPTData, selectedCptCode, setValue]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset({
        resolutionNotes: '',
        interventionType: '',
        patientOutcome: '',
        timeSpentMinutes: activeTimerMinutes || 20, // Use timer minutes if available, otherwise default to 20
        cptCode: '', // NEW: Reset CPT code
        createFollowUpTask: false,
        followUpTaskType: 'FOLLOW_UP_CALL',
        followUpTaskTitle: '',
        followUpTaskDescription: '',
        followUpTaskDueDate: '',
        followUpTaskPriority: 'MEDIUM',
        followUpTaskAssignedToId: '',
        createEncounterNote: false,
        encounterNoteType: 'GENERAL',
      })
    }
  }, [isOpen, reset, activeTimerMinutes])

  const handleFormSubmit = (data) => {
    onSubmit(data)
  }

  if (!isOpen) return null
  if (!isBulkMode && !alert) return null

  // Intervention type options
  const interventionTypes = [
    { value: 'PHONE_CALL', label: 'Phone Call', billable: true },
    { value: 'VIDEO_CALL', label: 'Video Call', billable: true },
    { value: 'IN_PERSON_VISIT', label: 'In-Person Visit', billable: true },
    { value: 'SECURE_MESSAGE', label: 'Secure Message', billable: true },
    { value: 'MEDICATION_ADJUSTMENT', label: 'Medication Adjustment', billable: true },
    { value: 'REFERRAL', label: 'Referral', billable: true },
    { value: 'PATIENT_EDUCATION', label: 'Patient Education', billable: true },
    { value: 'CARE_COORDINATION', label: 'Care Coordination', billable: true },
    { value: 'MEDICATION_RECONCILIATION', label: 'Medication Reconciliation', billable: true },
    { value: 'NO_PATIENT_CONTACT', label: 'No Patient Contact', billable: false },
  ]

  // Patient outcome options
  const patientOutcomes = [
    { value: 'IMPROVED', label: 'Improved', color: 'text-green-700 bg-green-50 border-green-200' },
    { value: 'STABLE', label: 'Stable', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    { value: 'DECLINED', label: 'Declined', color: 'text-red-700 bg-red-50 border-red-200' },
    { value: 'NO_CHANGE', label: 'No Change', color: 'text-gray-700 bg-gray-50 border-gray-200' },
    { value: 'PATIENT_UNREACHABLE', label: 'Patient Unreachable', color: 'text-orange-700 bg-orange-50 border-orange-200' },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <form onSubmit={handleSubmit(handleFormSubmit)}>
            <div className="sm:flex sm:items-start mb-4">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                <CheckCircleIcon className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {isBulkMode ? `Bulk Resolve ${bulkCount} Alerts` : 'Resolve Alert'}
                </h3>
                {!isBulkMode && alert && (
                  <p className="text-sm text-gray-500 mt-1">
                    {alert.rule?.name || 'Alert'} - {alert.patient?.firstName} {alert.patient?.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Alert Information - only show for single alert mode */}
            {!isBulkMode && alert && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Alert Details</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Severity:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                      alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Triggered:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(alert.triggeredAt).toLocaleDateString()} {new Date(alert.triggeredAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-gray-500 text-sm">Message:</span>
                  <p className="text-gray-900 text-sm mt-1">{alert.message}</p>
                </div>
              </div>
            )}

            {/* Required Documentation Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-yellow-800">Required Documentation</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    All fields below are required for clinical, billing, and HIPAA compliance purposes.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Resolution Notes */}
              <div>
                <label htmlFor="resolutionNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Clinical Resolution Notes *
                  <span className="text-xs text-gray-500 ml-2">(min 10 characters)</span>
                </label>
                <textarea
                  id="resolutionNotes"
                  rows={4}
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    errors.resolutionNotes ? 'border-red-300' : ''
                  }`}
                  placeholder="Document what was done, findings, and any follow-up planned..."
                  {...register('resolutionNotes', {
                    required: 'Clinical resolution notes are required',
                    minLength: {
                      value: 10,
                      message: 'Resolution notes must be at least 10 characters',
                    },
                  })}
                />
                {errors.resolutionNotes && (
                  <p className="mt-1 text-sm text-red-600">{errors.resolutionNotes.message}</p>
                )}
              </div>

              {/* Intervention Type */}
              <div>
                <label htmlFor="interventionType" className="block text-sm font-medium text-gray-700 mb-1">
                  Type of Intervention *
                </label>
                <select
                  id="interventionType"
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    errors.interventionType ? 'border-red-300' : ''
                  }`}
                  {...register('interventionType', {
                    required: 'Intervention type is required for billing documentation',
                  })}
                >
                  <option value="">Select intervention type...</option>
                  {interventionTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} {type.billable && '(Billable)'}
                    </option>
                  ))}
                </select>
                {errors.interventionType && (
                  <p className="mt-1 text-sm text-red-600">{errors.interventionType.message}</p>
                )}
              </div>

              {/* Patient Outcome */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Patient Outcome *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {patientOutcomes.map((outcome) => (
                    <label
                      key={outcome.value}
                      className={`relative flex cursor-pointer rounded-lg border p-3 focus:outline-none transition-all ${
                        selectedPatientOutcome === outcome.value
                          ? `ring-2 ring-blue-500 ${outcome.color}`
                          : `hover:bg-gray-50 ${outcome.color}`
                      }`}
                    >
                      <input
                        type="radio"
                        value={outcome.value}
                        className="sr-only"
                        {...register('patientOutcome', {
                          required: 'Patient outcome is required',
                        })}
                      />
                      <span className="flex items-center text-sm font-medium">{outcome.label}</span>
                    </label>
                  ))}
                </div>
                {errors.patientOutcome && (
                  <p className="mt-1 text-sm text-red-600">{errors.patientOutcome.message}</p>
                )}
              </div>

              {/* Time Spent */}
              <div>
                <label htmlFor="timeSpentMinutes" className="block text-sm font-medium text-gray-700 mb-1">
                  Time Spent (minutes) *
                  <span className="text-xs text-gray-500 ml-2">(for billing documentation)</span>
                </label>
                {activeTimerMinutes && (
                  <div className="mb-2 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Timer running: {activeTimerMinutes} minutes elapsed</span>
                  </div>
                )}
                <input
                  type="number"
                  id="timeSpentMinutes"
                  min="1"
                  className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    errors.timeSpentMinutes ? 'border-red-300' : ''
                  }`}
                  {...register('timeSpentMinutes', {
                    required: 'Time spent is required for billing',
                    min: {
                      value: 1,
                      message: 'Time must be at least 1 minute',
                    },
                  })}
                />
                {errors.timeSpentMinutes && (
                  <p className="mt-1 text-sm text-red-600">{errors.timeSpentMinutes.message}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {activeTimerMinutes
                    ? 'Time pre-filled from active timer. You can adjust if needed.'
                    : 'Note: 20+ minutes qualifies for CPT 99457 billing'}
                </p>
              </div>

              {/* CPT Code - Contextual Selection */}
              <div>
                <label htmlFor="cptCode" className="block text-sm font-medium text-gray-700 mb-1">
                  CPT Code (optional)
                  <span className="text-xs text-gray-500 ml-2">(for billing documentation)</span>
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
                      id="cptCode"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                      {...register('cptCode')}
                    >
                      <option value="">Select CPT Code (optional)</option>

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
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Recommended: {availableCPTData.recommendedCode} based on {timeSpentMinutes} minutes
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
                                <ExclamationTriangleIcon className="h-4 w-4 text-gray-400 mr-1 flex-shrink-0 mt-0.5" />
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
                  <div className="text-sm text-gray-500 py-2 bg-yellow-50 border border-yellow-200 rounded p-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 inline mr-2" />
                    No enrollment found - CPT code selection unavailable
                  </div>
                )}

                {!isLoadingCPTCodes && enrollmentId && availableCPTData?.error && (
                  <div className="text-sm text-gray-500 py-2 bg-yellow-50 border border-yellow-200 rounded p-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 inline mr-2" />
                    {availableCPTData.error}
                  </div>
                )}
              </div>

              {/* Follow-up Task Creation */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="createFollowUpTask"
                      type="checkbox"
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      {...register('createFollowUpTask')}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="createFollowUpTask" className="font-medium text-gray-700">
                      Create Follow-up Task
                    </label>
                    <p className="text-gray-500">Schedule a follow-up action related to this alert</p>
                  </div>
                </div>

                {createFollowUpTask && (
                  <div className="mt-4 space-y-4 pl-7">
                    <div>
                      <label htmlFor="followUpTaskTitle" className="block text-sm font-medium text-gray-700 mb-1">
                        Task Title
                      </label>
                      <input
                        type="text"
                        id="followUpTaskTitle"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        {...register('followUpTaskTitle', {
                          required: createFollowUpTask ? 'Task title is required' : false,
                        })}
                      />
                    </div>

                    <div>
                      <label htmlFor="followUpTaskAssignedToId" className="block text-sm font-medium text-gray-700 mb-1">
                        Assign To
                      </label>
                      <select
                        id="followUpTaskAssignedToId"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        {...register('followUpTaskAssignedToId', {
                          required: createFollowUpTask ? 'Please select who to assign this task to' : false,
                        })}
                      >
                        <option value="">Select a user...</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.firstName} {user.lastName} - {user.email}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="followUpTaskType" className="block text-sm font-medium text-gray-700 mb-1">
                          Task Type
                        </label>
                        <select
                          id="followUpTaskType"
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          {...register('followUpTaskType')}
                        >
                          <option value="FOLLOW_UP_CALL">Follow-up Call</option>
                          <option value="MED_REVIEW">Medication Review</option>
                          <option value="ADHERENCE_CHECK">Adherence Check</option>
                          <option value="LAB_ORDER">Lab Order</option>
                          <option value="REFERRAL">Referral</option>
                          <option value="CUSTOM">Custom</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="followUpTaskDueDate" className="block text-sm font-medium text-gray-700 mb-1">
                          Due Date
                        </label>
                        <input
                          type="date"
                          id="followUpTaskDueDate"
                          className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          {...register('followUpTaskDueDate', {
                            required: createFollowUpTask ? 'Due date is required' : false,
                          })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                      <div className="flex space-x-4">
                        {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((priority) => (
                          <label key={priority} className="inline-flex items-center">
                            <input
                              type="radio"
                              value={priority}
                              className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                              {...register('followUpTaskPriority')}
                            />
                            <span className="ml-2 text-sm text-gray-700">{priority}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="followUpTaskDescription" className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        id="followUpTaskDescription"
                        rows={3}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        {...register('followUpTaskDescription')}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Encounter Note Creation */}
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="createEncounterNote"
                      type="checkbox"
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      {...register('createEncounterNote')}
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="createEncounterNote" className="font-medium text-gray-700">
                      Create Encounter Note
                    </label>
                    <p className="text-gray-500">Document this encounter with a SOAP format clinical note</p>
                  </div>
                </div>

                {createEncounterNote && (
                  <div className="mt-4 space-y-4 pl-7">
                    <div>
                      <label htmlFor="encounterNoteType" className="block text-sm font-medium text-gray-700 mb-1">
                        Encounter Type
                      </label>
                      <select
                        id="encounterNoteType"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        {...register('encounterNoteType')}
                      >
                        <option value="RPM">Remote Patient Monitoring (RPM)</option>
                        <option value="RTM">Remote Therapeutic Monitoring (RTM)</option>
                        <option value="CCM">Chronic Care Management (CCM)</option>
                        <option value="TCM">Transitional Care Management (TCM)</option>
                        <option value="GENERAL">General Encounter</option>
                      </select>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <strong>Note:</strong> The encounter note will auto-populate with patient context (recent vitals, assessments, alerts).
                        You can edit and complete the SOAP fields after creation.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 sm:flex sm:flex-row-reverse gap-3">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Resolving...' : 'Resolve Alert'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
