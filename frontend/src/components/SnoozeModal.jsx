import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline'

/**
 * SnoozeModal Component
 *
 * Modal for temporarily snoozing alerts for a specified duration.
 * The alert will be hidden from the triage queue until the snooze period expires.
 */
export default function SnoozeModal({ alert, isOpen, onClose, onSubmit, isSubmitting, isBulkMode = false, bulkCount = 0 }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      snoozeMinutes: 60, // Default 1 hour
    },
  })

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const handleFormSubmit = (data) => {
    onSubmit(data)
  }

  if (!isOpen) return null
  if (!isBulkMode && !alert) return null

  // Quick duration options
  const quickOptions = [
    { label: '15 minutes', value: 15 },
    { label: '30 minutes', value: 30 },
    { label: '1 hour', value: 60 },
    { label: '2 hours', value: 120 },
    { label: '4 hours', value: 240 },
    { label: '8 hours', value: 480 },
    { label: '24 hours', value: 1440 },
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
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <ClockIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {isBulkMode ? `Snooze ${bulkCount} Alerts` : 'Snooze Alert'}
              </h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Temporarily hide {isBulkMode ? 'these alerts' : 'this alert'} from the triage queue. {isBulkMode ? 'The alerts' : 'The alert'} will reappear after the specified duration.
                </p>
              </div>
            </div>
          </div>

          {/* Alert Info - only show for single alert mode */}
          {!isBulkMode && alert && (
            <div className="mt-4 bg-gray-50 rounded-lg p-3">
              <div className="text-sm">
                <div className="font-medium text-gray-900">{alert.rule?.name}</div>
                <div className="text-gray-600 mt-1">{alert.message}</div>
                <div className="text-gray-500 mt-1">
                  Patient: {alert.patient?.firstName} {alert.patient?.lastName}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit(handleFormSubmit)} className="mt-5">
            {/* Quick Duration Options */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Select
              </label>
              <div className="grid grid-cols-2 gap-2">
                {quickOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      // Update form value manually
                      const form = document.getElementById('snoozeMinutes')
                      if (form) {
                        form.value = option.value
                      }
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Duration Input */}
            <div className="mb-4">
              <label htmlFor="snoozeMinutes" className="block text-sm font-medium text-gray-700">
                Snooze Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <input
                id="snoozeMinutes"
                type="number"
                {...register('snoozeMinutes', {
                  required: 'Duration is required',
                  min: { value: 1, message: 'Duration must be at least 1 minute' },
                  max: { value: 10080, message: 'Duration cannot exceed 1 week (10080 minutes)' },
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter minutes"
              />
              {errors.snoozeMinutes && (
                <p className="mt-1 text-sm text-red-600">{errors.snoozeMinutes.message}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Max: 1 week (10080 minutes)
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Snoozing...' : 'Snooze Alert'}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm disabled:opacity-50"
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
