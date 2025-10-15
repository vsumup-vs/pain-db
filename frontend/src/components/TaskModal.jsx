import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { api } from '../services/api'

export default function TaskModal({ isOpen, onClose, prefillData = null }) {
  const queryClient = useQueryClient()

  // Get current user for auto-assignment
  const { data: currentUserData } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => api.getCurrentUserProfile(),
    staleTime: Infinity // User profile doesn't change during session
  })

  const currentUserId = currentUserData?.id

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      type: 'FOLLOW_UP_CALL',
      title: '',
      description: '',
      patientId: '',
      assignedTo: '',
      priority: 'MEDIUM',
      dueDate: '',
      dueTime: '09:00'
    }
  })

  // Fetch patients for dropdown
  const { data: patientsData, isLoading: isPatientsLoading } = useQuery({
    queryKey: ['patients', { limit: 100 }],
    queryFn: () => api.getPatients({ limit: 100 }),
    enabled: isOpen
  })

  const patients = patientsData?.data || []

  // For now, just use current user for assignment dropdown
  // In the future, we can fetch all users if USER_READ permission is available
  const users = currentUserData ? [currentUserData] : []

  // Pre-fill form when prefillData changes and data is loaded
  useEffect(() => {
    if (prefillData && !isPatientsLoading && currentUserId) {
      if (prefillData.patientId) setValue('patientId', prefillData.patientId)
      if (prefillData.alertId) setValue('alertId', prefillData.alertId)
      if (prefillData.title) setValue('title', prefillData.title)
      if (prefillData.description) setValue('description', prefillData.description)
      if (prefillData.priority) setValue('priority', prefillData.priority)
      if (prefillData.dueDate) {
        // Split date and time
        const dueDateObj = new Date(prefillData.dueDate)
        const dateStr = dueDateObj.toISOString().split('T')[0]
        const timeStr = dueDateObj.toTimeString().slice(0, 5)
        setValue('dueDate', dateStr)
        setValue('dueTime', timeStr)
      }
      // Auto-assign to current user (can be changed by user)
      setValue('assignedTo', currentUserId)
    }
  }, [prefillData, isPatientsLoading, currentUserId, setValue])

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data) => api.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      toast.success('Task created successfully')
      reset()
      onClose(true) // Pass true to indicate task was created successfully
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create task')
    }
  })

  const onSubmit = (data) => {
    // Combine date and time into ISO datetime
    const dueDateTime = new Date(`${data.dueDate}T${data.dueTime}:00`)

    const taskData = {
      taskType: data.type,
      title: data.title,
      description: data.description || null,
      patientId: data.patientId,
      assignedToId: data.assignedTo, // Backend expects assignedToId (singular)
      priority: data.priority,
      dueDate: dueDateTime.toISOString(),
      alertId: data.alertId || null
    }

    createTaskMutation.mutate(taskData)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Create New Task</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6">
            <div className="space-y-4">
              {/* Task Type */}
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Task Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="type"
                  {...register('type', { required: 'Task type is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="FOLLOW_UP_CALL">Follow-Up Call</option>
                  <option value="MED_REVIEW">Medication Review</option>
                  <option value="ADHERENCE_CHECK">Adherence Check</option>
                  <option value="LAB_ORDER">Lab Order</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="CUSTOM">Custom</option>
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type.message}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  {...register('title', {
                    required: 'Title is required',
                    maxLength: { value: 200, message: 'Title must be 200 characters or less' }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the task"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Additional details about the task (optional)"
                />
              </div>

              {/* Patient */}
              <div>
                <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-1">
                  Patient <span className="text-red-500">*</span>
                </label>
                <select
                  id="patientId"
                  {...register('patientId', { required: 'Patient is required' })}
                  disabled={isPatientsLoading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="">{isPatientsLoading ? 'Loading patients...' : 'Select a patient...'}</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.lastName}, {patient.firstName} - MRN: {patient.medicalRecordNumber || 'N/A'}
                    </option>
                  ))}
                </select>
                {errors.patientId && (
                  <p className="mt-1 text-sm text-red-600">{errors.patientId.message}</p>
                )}
              </div>

              {/* Assigned To */}
              <div>
                <label htmlFor="assignedTo" className="block text-sm font-medium text-gray-700 mb-1">
                  Assign To <span className="text-red-500">*</span>
                </label>
                <select
                  id="assignedTo"
                  {...register('assignedTo', { required: 'Assignment is required' })}
                  disabled={!currentUserData}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  <option value="">{!currentUserData ? 'Loading user...' : 'Select a user...'}</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.lastName}, {user.firstName} {user.email ? `(${user.email})` : ''}
                    </option>
                  ))}
                </select>
                {errors.assignedTo && (
                  <p className="mt-1 text-sm text-red-600">{errors.assignedTo.message}</p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { value: 'LOW', label: 'Low', color: 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200' },
                    { value: 'MEDIUM', label: 'Medium', color: 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200' },
                    { value: 'HIGH', label: 'High', color: 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200' },
                    { value: 'URGENT', label: 'Urgent', color: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200' }
                  ].map(priority => (
                    <label key={priority.value} className="relative flex cursor-pointer">
                      <input
                        type="radio"
                        value={priority.value}
                        {...register('priority', { required: 'Priority is required' })}
                        className="sr-only peer"
                      />
                      <div className={`flex-1 px-4 py-2 border-2 rounded-lg text-center text-sm font-medium transition-all duration-200 peer-checked:ring-2 peer-checked:ring-blue-500 ${priority.color}`}>
                        {priority.label}
                      </div>
                    </label>
                  ))}
                </div>
                {errors.priority && (
                  <p className="mt-1 text-sm text-red-600">{errors.priority.message}</p>
                )}
              </div>

              {/* Due Date and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    {...register('dueDate', { required: 'Due date is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.dueDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="dueTime"
                    type="time"
                    {...register('dueTime', { required: 'Due time is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.dueTime && (
                    <p className="mt-1 text-sm text-red-600">{errors.dueTime.message}</p>
                  )}
                </div>
              </div>

              {/* Hidden field for alertId if pre-filled */}
              <input type="hidden" {...register('alertId')} />
            </div>

            {/* Form Actions */}
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createTaskMutation.isLoading}
                className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
              >
                {isSubmitting || createTaskMutation.isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Task'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
