import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import AssessmentModal from '../components/AssessmentModal'
import AssessmentDetailsModal from '../components/AssessmentDetailsModal'
import { useDefaultView } from '../hooks/useDefaultView'

const Assessments = () => {
  const [filters, setFilters] = useState({
    status: 'all', // all, PENDING, OVERDUE, IN_PROGRESS, COMPLETED, CANCELLED
    priority: 'all', // all, LOW, MEDIUM, HIGH
    frequency: 'all' // all, DAILY, WEEKLY, BIWEEKLY, MONTHLY, QUARTERLY, AS_NEEDED
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false)
  const [viewingAssessment, setViewingAssessment] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const queryClient = useQueryClient()

  // Saved Views integration
  const { defaultView, hasDefaultView } = useDefaultView('ASSESSMENT_LIST')
  const [appliedViewName, setAppliedViewName] = useState(null)
  const [isViewCleared, setIsViewCleared] = useState(false) // Track if user explicitly cleared view

  console.log('[Assessments] useDefaultView result:', { defaultView, hasDefaultView, appliedViewName })

  // Fetch scheduled assessments
  const { data: assessmentsData, isLoading } = useQuery({
    queryKey: ['scheduledAssessments', filters],
    queryFn: () => {
      console.log('[Assessments] Fetching with filters:', filters)
      return api.getScheduledAssessments({
        status: filters.status !== 'all' ? filters.status : undefined,
        priority: filters.priority !== 'all' ? filters.priority : undefined,
        frequency: filters.frequency !== 'all' ? filters.frequency : undefined
      })
    },
    refetchInterval: 60000 // Refresh every minute
  })

  const assessments = assessmentsData?.data || []
  console.log('[Assessments] API returned assessments count:', assessments.length)
  console.log('[Assessments] Current filter state:', filters)

  // Filter assessments by search term
  const filteredAssessments = assessments.filter(assessment => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      assessment.patient?.firstName?.toLowerCase().includes(searchLower) ||
      assessment.patient?.lastName?.toLowerCase().includes(searchLower) ||
      assessment.template?.name?.toLowerCase().includes(searchLower)
    )
  })

  // Apply default view filters on page load
  useEffect(() => {
    console.log('[Assessments] useEffect triggered - checking conditions:', {
      hasDefaultView: !!defaultView,
      appliedViewName,
      isViewCleared,
      defaultView
    })

    // Only apply default view if:
    // 1. A default view exists
    // 2. No view is currently applied
    // 3. User hasn't explicitly cleared the view
    if (defaultView && !appliedViewName && !isViewCleared) {
      const savedFilters = defaultView.filters || {}

      console.log('[Assessments] Applying default view:', defaultView.name)
      console.log('[Assessments] Saved filters:', savedFilters)
      console.log('[Assessments] Current filters before:', filters)

      // Helper function to extract simple values from complex filter objects
      const extractFilterValue = (filterValue, defaultValue = 'all') => {
        if (!filterValue) return defaultValue

        // Handle arrays (take first element)
        if (Array.isArray(filterValue)) {
          const firstValue = filterValue[0]
          if (typeof firstValue === 'object' && firstValue.not) {
            // Negation operator: { not: 'COMPLETED' } - return default
            console.log('[Assessments] NOT operator detected, using default:', defaultValue)
            return defaultValue
          }
          return typeof firstValue === 'string' ? firstValue : defaultValue
        }

        // Handle negation operators: { not: 'COMPLETED' }
        if (typeof filterValue === 'object' && filterValue.not) {
          console.log('[Assessments] NOT operator detected, using default:', defaultValue)
          return defaultValue
        }

        // Handle FilterBuilder format: { operator: 'equals', value: 'PENDING' }
        if (typeof filterValue === 'object' && filterValue.value) {
          return filterValue.value
        }

        // Handle simple strings
        if (typeof filterValue === 'string') {
          return filterValue
        }

        return defaultValue
      }

      // Build new filters object directly from saved filters (avoids stale closure)
      const newFilters = {
        status: extractFilterValue(savedFilters.completionStatus, 'all'),
        priority: extractFilterValue(savedFilters.priority, 'all'),
        frequency: extractFilterValue(savedFilters.frequency, 'all')
      }

      console.log('[Assessments] New filters to apply:', newFilters)

      setFilters(newFilters)
      setAppliedViewName(defaultView.name)
      toast.info(`Applied saved view: "${defaultView.name}"`, { autoClose: 3000 })
    }
  }, [defaultView, appliedViewName, isViewCleared])

  // Function to clear saved view and reset filters
  const clearSavedView = () => {
    setFilters({
      status: 'all',
      priority: 'all',
      frequency: 'all'
    })
    setSearchTerm('')
    setAppliedViewName(null)
    setIsViewCleared(true) // Prevent default view from re-applying
    toast.success('Cleared saved view filters')
  }

  // Cancel assessment mutation
  const cancelAssessmentMutation = useMutation({
    mutationFn: ({ id, reason }) => api.cancelScheduledAssessment(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledAssessments'])
      toast.success('Assessment cancelled successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to cancel assessment')
    }
  })

  const handleCancelAssessment = (assessment) => {
    if (window.confirm(`Are you sure you want to cancel this assessment for ${assessment.patient?.firstName} ${assessment.patient?.lastName}?`)) {
      const reason = prompt('Please provide a reason for cancellation:')
      if (reason) {
        cancelAssessmentMutation.mutate({ id: assessment.id, reason })
      }
    }
  }

  const handleStartAssessment = (assessment) => {
    setSelectedAssessment(assessment)
    setIsAssessmentModalOpen(true)
  }

  // Fetch full assessment details for viewing
  const fetchAssessmentDetailsMutation = useMutation({
    mutationFn: async (scheduledAssessment) => {
      // Get the completed assessment ID from the scheduled assessment
      const completedAssessmentId = scheduledAssessment.completedAssessmentId
      if (!completedAssessmentId) {
        throw new Error('No completed assessment found')
      }
      // Fetch full assessment details with template items
      const response = await api.getAssessment(completedAssessmentId)
      // Extract the assessment data from the response
      return response.data
    },
    onSuccess: (data) => {
      setViewingAssessment(data)
      setIsDetailsModalOpen(true)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to load assessment details')
    }
  })

  const handleViewDetails = (assessment) => {
    fetchAssessmentDetailsMutation.mutate(assessment)
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      PENDING: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: ClockIcon, label: 'Pending' },
      OVERDUE: { color: 'bg-red-100 text-red-800 border-red-300', icon: ExclamationTriangleIcon, label: 'Overdue' },
      IN_PROGRESS: { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: DocumentTextIcon, label: 'In Progress' },
      COMPLETED: { color: 'bg-green-100 text-green-800 border-green-300', icon: CheckCircleIcon, label: 'Completed' },
      CANCELLED: { color: 'bg-gray-100 text-gray-800 border-gray-300', icon: XCircleIcon, label: 'Cancelled' }
    }

    const config = statusConfig[status] || statusConfig.PENDING
    const Icon = config.icon

    return (
      <span className={`inline-flex items-center px-3 py-1 text-sm font-semibold rounded-full border ${config.color}`}>
        <Icon className="h-4 w-4 mr-1" />
        {config.label}
      </span>
    )
  }

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-blue-100 text-blue-800',
      HIGH: 'bg-red-100 text-red-800'
    }

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${priorityConfig[priority] || priorityConfig.MEDIUM}`}>
        {priority}
      </span>
    )
  }

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const groupAssessmentsByStatus = () => {
    const groups = {
      OVERDUE: [],
      PENDING: [],
      IN_PROGRESS: [],
      COMPLETED: [],
      CANCELLED: []
    }

    filteredAssessments.forEach(assessment => {
      if (groups[assessment.status]) {
        groups[assessment.status].push(assessment)
      }
    })

    return groups
  }

  const groupedAssessments = groupAssessmentsByStatus()

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Scheduled Assessments</h1>
        <p className="text-gray-600">Manage and track patient assessments across all programs</p>
      </div>

      {/* Saved View Indicator */}
      {defaultView && (
        <div className={`border rounded-xl p-4 mb-6 flex items-center justify-between ${
          appliedViewName
            ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center">
            <SparklesIcon className={`h-5 w-5 mr-2 ${appliedViewName ? 'text-purple-600' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${appliedViewName ? 'text-purple-900' : 'text-gray-600'}`}>
              {appliedViewName ? (
                <>Active View: <span className="font-bold">{appliedViewName}</span></>
              ) : (
                <>Default view available: <span className="font-semibold">{defaultView.name}</span> (not applied)</>
              )}
            </span>
          </div>
          {appliedViewName ? (
            <button
              onClick={clearSavedView}
              className="inline-flex items-center px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200"
            >
              <XCircleIcon className="h-4 w-4 mr-1" />
              Clear View
            </button>
          ) : (
            <button
              onClick={() => {
                setIsViewCleared(false)
                setAppliedViewName(null) // This will trigger the useEffect to apply the view
              }}
              className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
            >
              <SparklesIcon className="h-4 w-4 mr-1" />
              Apply View
            </button>
          )}
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient name or assessment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="OVERDUE">Overdue</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Overdue</p>
              <p className="text-2xl font-bold text-red-900">{groupedAssessments.OVERDUE.length}</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Pending</p>
              <p className="text-2xl font-bold text-yellow-900">{groupedAssessments.PENDING.length}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">In Progress</p>
              <p className="text-2xl font-bold text-blue-900">{groupedAssessments.IN_PROGRESS.length}</p>
            </div>
            <DocumentTextIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Completed</p>
              <p className="text-2xl font-bold text-green-900">{groupedAssessments.COMPLETED.length}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 font-medium">Cancelled</p>
              <p className="text-2xl font-bold text-gray-900">{groupedAssessments.CANCELLED.length}</p>
            </div>
            <XCircleIcon className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Assessments List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {filteredAssessments.length} Assessment{filteredAssessments.length !== 1 ? 's' : ''}
          </h2>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading assessments...</p>
          </div>
        ) : filteredAssessments.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-4 text-lg text-gray-600">No assessments found</p>
            <p className="mt-2 text-sm text-gray-500">
              {searchTerm || Object.values(filters).some(f => f !== 'all')
                ? 'Try adjusting your search or filters'
                : 'No scheduled assessments available'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAssessments.map((assessment) => (
              <div key={assessment.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assessment.template?.name || 'Assessment'}
                      </h3>
                      {getStatusBadge(assessment.status)}
                      {assessment.priority && assessment.priority !== 'MEDIUM' && getPriorityBadge(assessment.priority)}
                      {assessment.isRequired && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          Required
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                      <div className="flex items-center text-sm text-gray-600">
                        <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="font-medium">{assessment.patient?.firstName} {assessment.patient?.lastName}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <CalendarIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Due: {formatDate(assessment.dueDate)}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Frequency: {assessment.frequency?.replace('_', ' ')}</span>
                      </div>
                    </div>

                    {assessment.scheduledBy && (
                      <p className="text-xs text-gray-500 mt-2">
                        Scheduled by: {assessment.scheduledBy}
                      </p>
                    )}

                    {assessment.notes && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        Note: {assessment.notes}
                      </p>
                    )}

                    {assessment.completedAt && (
                      <p className="text-xs text-green-600 mt-2">
                        Completed: {formatDate(assessment.completedAt)}
                      </p>
                    )}

                    {assessment.cancelledAt && assessment.cancellationReason && (
                      <p className="text-xs text-gray-500 mt-2">
                        Cancelled: {assessment.cancellationReason}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {(assessment.status === 'PENDING' || assessment.status === 'OVERDUE') && (
                      <>
                        <button
                          onClick={() => handleStartAssessment(assessment)}
                          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                        >
                          Start Assessment
                        </button>
                        <button
                          onClick={() => handleCancelAssessment(assessment)}
                          disabled={cancelAssessmentMutation.isLoading}
                          className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors whitespace-nowrap disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {assessment.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleStartAssessment(assessment)}
                        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
                      >
                        Continue
                      </button>
                    )}
                    {assessment.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleViewDetails(assessment)}
                        disabled={fetchAssessmentDetailsMutation.isLoading}
                        className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap flex items-center gap-2 disabled:opacity-50"
                      >
                        <EyeIcon className="h-4 w-4" />
                        {fetchAssessmentDetailsMutation.isLoading ? 'Loading...' : 'View Details'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment Modal */}
      <AssessmentModal
        scheduledAssessment={selectedAssessment}
        isOpen={isAssessmentModalOpen}
        onClose={() => {
          setIsAssessmentModalOpen(false)
          setSelectedAssessment(null)
        }}
        onSuccess={() => {
          queryClient.invalidateQueries(['scheduledAssessments'])
          toast.success('Assessment completed successfully')
        }}
      />

      {/* Assessment Details Modal */}
      <AssessmentDetailsModal
        assessment={viewingAssessment}
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false)
          setViewingAssessment(null)
        }}
      />
    </div>
  )
}

export default Assessments
