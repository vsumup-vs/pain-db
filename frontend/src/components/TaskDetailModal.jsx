import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  XMarkIcon,
  CheckCircleIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BellIcon,
  DocumentTextIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'

export default function TaskDetailModal({ isOpen, onClose, taskId }) {
  const [showCompleteForm, setShowCompleteForm] = useState(false)
  const [showReassignForm, setShowReassignForm] = useState(false)
  const [completionNotes, setCompletionNotes] = useState('')
  const [selectedClinicianId, setSelectedClinicianId] = useState('')

  const queryClient = useQueryClient()

  // Fetch task details
  const { data: taskData, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.getTask(taskId),
    enabled: isOpen && !!taskId
  })

  // Fetch clinicians for reassignment
  const { data: cliniciansData } = useQuery({
    queryKey: ['clinicians', { limit: 1000 }],
    queryFn: () => api.getClinicians({ limit: 1000, sortBy: 'lastName', sortOrder: 'asc' }),
    enabled: showReassignForm
  })

  const task = taskData
  const clinicians = cliniciansData?.data?.clinicians || []

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: ({ id, completionNotes }) => api.completeTask(id, { completionNotes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      queryClient.invalidateQueries(['task', taskId])
      toast.success('Task completed successfully')
      setShowCompleteForm(false)
      setCompletionNotes('')
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to complete task')
    }
  })

  // Update task mutation (for reassignment)
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      queryClient.invalidateQueries(['task', taskId])
      toast.success('Task reassigned successfully')
      setShowReassignForm(false)
      setSelectedClinicianId('')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to reassign task')
    }
  })

  // Cancel task mutation
  const cancelTaskMutation = useMutation({
    mutationFn: (id) => api.cancelTask(id, {}),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks'])
      queryClient.invalidateQueries(['task', taskId])
      toast.success('Task cancelled successfully')
      onClose()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to cancel task')
    }
  })

  const handleComplete = () => {
    if (!showCompleteForm) {
      setShowCompleteForm(true)
    } else {
      completeTaskMutation.mutate({ id: taskId, completionNotes })
    }
  }

  const handleReassign = () => {
    if (!showReassignForm) {
      setShowReassignForm(true)
    } else if (selectedClinicianId) {
      updateTaskMutation.mutate({
        id: taskId,
        data: { assignedTo: [selectedClinicianId] }
      })
    }
  }

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this task? This action cannot be undone.')) {
      cancelTaskMutation.mutate(taskId)
    }
  }

  const handleClose = () => {
    setShowCompleteForm(false)
    setShowReassignForm(false)
    setCompletionNotes('')
    setSelectedClinicianId('')
    onClose()
  }

  if (!isOpen) return null

  // Get priority color classes
  const getPriorityBadge = (priority) => {
    const badges = {
      URGENT: 'bg-red-100 text-red-800 border-red-300',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      LOW: 'bg-gray-100 text-gray-800 border-gray-300'
    }
    return badges[priority] || badges.LOW
  }

  // Get status badge classes
  const getStatusBadge = (status) => {
    const badges = {
      PENDING: 'bg-blue-100 text-blue-800 border-blue-300',
      IN_PROGRESS: 'bg-purple-100 text-purple-800 border-purple-300',
      COMPLETED: 'bg-green-100 text-green-800 border-green-300',
      CANCELLED: 'bg-gray-100 text-gray-800 border-gray-300'
    }
    return badges[status] || badges.PENDING
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Task Details</h3>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : task ? (
              <div className="space-y-6">
                {/* Task Header */}
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <h2 className="text-2xl font-bold text-gray-900">{task.title}</h2>
                    <div className="flex space-x-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getPriorityBadge(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Task Type: {task.taskType.replace(/_/g, ' ')}</p>
                </div>

                {/* Description */}
                {task.description && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">Description</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{task.description}</p>
                  </div>
                )}

                {/* Patient Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <UserCircleIcon className="h-5 w-5 text-blue-600 mr-2" />
                      <h4 className="text-sm font-semibold text-blue-900">Patient</h4>
                    </div>
                    {task.patient ? (
                      <>
                        <p className="text-gray-900 font-medium">
                          {task.patient.firstName} {task.patient.lastName}
                        </p>
                        {task.patient.medicalRecordNumber && (
                          <p className="text-sm text-gray-600">MRN: {task.patient.medicalRecordNumber}</p>
                        )}
                        {task.patient.phone && (
                          <p className="text-sm text-gray-600">Phone: {task.patient.phone}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500">No patient assigned</p>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <CalendarIcon className="h-5 w-5 text-orange-600 mr-2" />
                      <h4 className="text-sm font-semibold text-orange-900">Due Date</h4>
                    </div>
                    <p className="text-gray-900 font-medium">
                      {new Date(task.dueDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(task.dueDate).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>

                {/* Assignment Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <UserIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <h4 className="text-sm font-semibold text-gray-700">Assigned To</h4>
                    </div>
                    {task.assignedUsers && task.assignedUsers.length > 0 ? (
                      task.assignedUsers.map(user => (
                        <div key={user.id} className="text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500">Unassigned</p>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center mb-2">
                      <UserIcon className="h-5 w-5 text-gray-500 mr-2" />
                      <h4 className="text-sm font-semibold text-gray-700">Assigned By</h4>
                    </div>
                    {task.assignedBy ? (
                      <p className="text-gray-900">
                        {task.assignedBy.firstName} {task.assignedBy.lastName}
                      </p>
                    ) : (
                      <p className="text-gray-500">N/A</p>
                    )}
                  </div>
                </div>

                {/* Linked Alert */}
                {task.alert && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <BellIcon className="h-5 w-5 text-yellow-600 mr-2" />
                      <h4 className="text-sm font-semibold text-yellow-900">Linked Alert</h4>
                    </div>
                    <p className="text-gray-900">{task.alert.message}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Severity: <span className="font-medium">{task.alert.severity}</span>
                    </p>
                  </div>
                )}

                {/* Linked Assessment */}
                {task.assessment && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <DocumentTextIcon className="h-5 w-5 text-purple-600 mr-2" />
                      <h4 className="text-sm font-semibold text-purple-900">Linked Assessment</h4>
                    </div>
                    <p className="text-gray-900">Assessment #{task.assessment.id}</p>
                  </div>
                )}

                {/* Completion Info */}
                {task.status === 'COMPLETED' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-green-900 mb-2">Completion Details</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <ClockIcon className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-sm text-gray-700">
                          Completed: {new Date(task.completedAt).toLocaleString()}
                        </span>
                      </div>
                      {task.completedBy && (
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 text-green-600 mr-2" />
                          <span className="text-sm text-gray-700">
                            By: {task.completedBy.firstName} {task.completedBy.lastName}
                          </span>
                        </div>
                      )}
                      {task.completionNotes && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-700">Notes:</p>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                            {task.completionNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cancellation Info */}
                {task.status === 'CANCELLED' && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Task Cancelled</h4>
                    <p className="text-sm text-gray-600">This task has been cancelled and is no longer active.</p>
                  </div>
                )}

                {/* Complete Form */}
                {showCompleteForm && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-900 mb-3">Complete Task</h4>
                    <label htmlFor="completionNotes" className="block text-sm font-medium text-gray-700 mb-2">
                      Completion Notes (Optional)
                    </label>
                    <textarea
                      id="completionNotes"
                      value={completionNotes}
                      onChange={(e) => setCompletionNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Add any notes about completing this task..."
                    />
                  </div>
                )}

                {/* Reassign Form */}
                {showReassignForm && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-purple-900 mb-3">Reassign Task</h4>
                    <label htmlFor="reassignTo" className="block text-sm font-medium text-gray-700 mb-2">
                      Assign To <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="reassignTo"
                      value={selectedClinicianId}
                      onChange={(e) => setSelectedClinicianId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Select a clinician...</option>
                      {clinicians.map(clinician => (
                        <option key={clinician.id} value={clinician.id}>
                          {clinician.lastName}, {clinician.firstName} {clinician.specialization ? `- ${clinician.specialization}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center">
                <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Task not found</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {task && task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              {!showCompleteForm && !showReassignForm && (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={cancelTaskMutation.isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                  >
                    Cancel Task
                  </button>
                  <button
                    onClick={handleReassign}
                    disabled={updateTaskMutation.isLoading}
                    className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                  >
                    Reassign
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={completeTaskMutation.isLoading}
                    className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                  >
                    <CheckCircleIcon className="inline h-5 w-5 mr-1 -mt-1" />
                    Mark Complete
                  </button>
                </>
              )}

              {showCompleteForm && (
                <>
                  <button
                    onClick={() => {
                      setShowCompleteForm(false)
                      setCompletionNotes('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={completeTaskMutation.isLoading}
                    className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                  >
                    {completeTaskMutation.isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Completing...
                      </span>
                    ) : (
                      'Confirm Complete'
                    )}
                  </button>
                </>
              )}

              {showReassignForm && (
                <>
                  <button
                    onClick={() => {
                      setShowReassignForm(false)
                      setSelectedClinicianId('')
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReassign}
                    disabled={!selectedClinicianId || updateTaskMutation.isLoading}
                    className="px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                  >
                    {updateTaskMutation.isLoading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Reassigning...
                      </span>
                    ) : (
                      'Confirm Reassign'
                    )}
                  </button>
                </>
              )}
            </div>
          )}

          {task && (task.status === 'COMPLETED' || task.status === 'CANCELLED') && (
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
