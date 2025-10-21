import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { XMarkIcon, NoSymbolIcon } from '@heroicons/react/24/outline'

/**
 * SuppressModal Component
 *
 * Modal for permanently suppressing alerts with documented reason codes.
 * Suppressed alerts are dismissed and do not reappear in the triage queue.
 *
 * Suppress Reasons:
 * - FALSE_POSITIVE: Alert triggered incorrectly
 * - PATIENT_CONTACTED: Already contacted patient, no action needed
 * - DUPLICATE_ALERT: Duplicate of another alert
 * - PLANNED_INTERVENTION: Intervention already planned
 * - PATIENT_HOSPITALIZED: Patient currently hospitalized
 * - DEVICE_MALFUNCTION: Alert caused by device issue
 * - DATA_ENTRY_ERROR: Alert caused by data entry error
 * - CLINICAL_JUDGMENT: Clinical judgment determined no action needed
 * - OTHER: Other reason (requires detailed notes)
 */
export default function SuppressModal({ alert, isOpen, onClose, onSubmit, isSubmitting }) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      suppressReason: '',
      suppressNotes: '',
    },
  })

  const selectedReason = watch('suppressReason')

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const handleFormSubmit = (data) => {
    onSubmit(data)
  }

  if (!isOpen || !alert) return null

  // Suppress reason options with descriptions
  const suppressReasons = [
    { value: 'FALSE_POSITIVE', label: 'False Positive', description: 'Alert triggered incorrectly' },
    { value: 'PATIENT_CONTACTED', label: 'Patient Contacted', description: 'Already contacted patient, no action needed' },
    { value: 'DUPLICATE_ALERT', label: 'Duplicate Alert', description: 'Duplicate of another alert' },
    { value: 'PLANNED_INTERVENTION', label: 'Planned Intervention', description: 'Intervention already planned' },
    { value: 'PATIENT_HOSPITALIZED', label: 'Patient Hospitalized', description: 'Patient currently hospitalized' },
    { value: 'DEVICE_MALFUNCTION', label: 'Device Malfunction', description: 'Alert caused by device issue' },
    { value: 'DATA_ENTRY_ERROR', label: 'Data Entry Error', description: 'Alert caused by data entry error' },
    { value: 'CLINICAL_JUDGMENT', label: 'Clinical Judgment', description: 'Clinical judgment determined no action needed' },
    { value: 'OTHER', label: 'Other', description: 'Other reason (requires detailed notes)' },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          {/* Header */}
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
              <NoSymbolIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Suppress Alert
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Permanently dismiss this alert. This action should be used when the alert is not actionable or is a false positive.
                </p>
              </div>
            </div>
          </div>

          {/* Alert Info */}
          <div className="mt-4 bg-gray-50 rounded-lg p-3">
            <div className="text-sm">
              <div className="font-medium text-gray-900">{alert.rule?.name}</div>
              <div className="text-gray-600 mt-1">{alert.message}</div>
              <div className="text-gray-500 mt-1">
                Patient: {alert.patient?.firstName} {alert.patient?.lastName}
              </div>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-3">
            <div className="flex">
              <div className="flex-shrink-0">
                <XMarkIcon className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Warning:</strong> Suppressed alerts cannot be recovered. This action creates a permanent audit log entry.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-5">
            {/* Suppress Reason */}
            <div className="mb-4">
              <label htmlFor="suppressReason" className="block text-sm font-medium text-gray-700">
                Suppress Reason <span className="text-red-500">*</span>
              </label>
              <select
                id="suppressReason"
                {...register('suppressReason', {
                  required: 'Suppress reason is required',
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
              >
                <option value="">Select a reason...</option>
                {suppressReasons.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label} - {reason.description}
                  </option>
                ))}
              </select>
              {errors.suppressReason && (
                <p className="mt-1 text-sm text-red-600">{errors.suppressReason.message}</p>
              )}
            </div>

            {/* Suppress Notes */}
            <div className="mb-4">
              <label htmlFor="suppressNotes" className="block text-sm font-medium text-gray-700">
                Notes {selectedReason === 'OTHER' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                id="suppressNotes"
                rows={4}
                {...register('suppressNotes', {
                  required: selectedReason === 'OTHER' ? 'Notes are required when reason is "Other"' : false,
                  minLength: selectedReason === 'OTHER' ? {
                    value: 10,
                    message: 'Notes must be at least 10 characters when reason is "Other"',
                  } : undefined,
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-red-500 focus:border-red-500 sm:text-sm"
                placeholder="Enter detailed notes explaining why this alert is being suppressed..."
              />
              {errors.suppressNotes && (
                <p className="mt-1 text-sm text-red-600">{errors.suppressNotes.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {selectedReason === 'OTHER'
                  ? 'Required when reason is "Other" (min 10 characters)'
                  : 'Optional: Provide additional context for audit trail'}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Suppressing...' : 'Suppress Alert'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
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
