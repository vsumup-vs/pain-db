import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  ChartBarIcon, 
  CalendarIcon, 
  MagnifyingGlassIcon,
  UserIcon,
  ClockIcon,
  TagIcon,
  XMarkIcon,
  FunnelIcon,
  EyeIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import PatientContextPanel from '../components/PatientContextPanel'

export default function Observations() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('') // New: Program filter
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })
  const [selectedObservation, setSelectedObservation] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null) // New: For patient context panel
  const [showPatientContext, setShowPatientContext] = useState(false) // New: Show patient context

  const { data: observationsResponse, isLoading, error } = useQuery({
    queryKey: ['observations', searchTerm, dateRange],
    queryFn: () => {
      // Only include date parameters if they have values
      const params = { search: searchTerm }
      if (dateRange.startDate && dateRange.startDate.trim() !== '') {
        params.startDate = dateRange.startDate
      }
      if (dateRange.endDate && dateRange.endDate.trim() !== '') {
        params.endDate = dateRange.endDate
      }
      return api.getObservations(params)
    },
  })

  const observations = observationsResponse?.data || []

  const getObservationValue = (observation) => {
    if (observation.value !== null && observation.value !== undefined) {
      // value is a Json field, could be a number, string, or object
      if (typeof observation.value === 'object' && observation.value !== null) {
        // Extract value based on metric valueType
        const valueType = observation.metric?.valueType

        // Try to extract the actual value from the structured JSON
        if (valueType === 'numeric' && observation.value.numeric !== undefined) {
          return observation.value.numeric
        }
        if (valueType === 'text' && observation.value.text !== undefined) {
          return observation.value.text
        }
        if (valueType === 'boolean' && observation.value.boolean !== undefined) {
          return observation.value.boolean ? 'Yes' : 'No'
        }
        if (valueType === 'categorical' && observation.value.categorical !== undefined) {
          return observation.value.categorical
        }
        if (valueType === 'ordinal' && observation.value.ordinal !== undefined) {
          return observation.value.ordinal
        }
        if (valueType === 'date' && observation.value.date !== undefined) {
          return new Date(observation.value.date).toLocaleDateString()
        }
        if (valueType === 'time' && observation.value.time !== undefined) {
          return observation.value.time
        }
        if (valueType === 'datetime' && observation.value.datetime !== undefined) {
          return new Date(observation.value.datetime).toLocaleString()
        }
        if (valueType === 'json' && observation.value.json !== undefined) {
          return JSON.stringify(observation.value.json, null, 2)
        }

        // Fallback: if structure doesn't match expected format, show first available value
        const firstKey = Object.keys(observation.value)[0]
        if (firstKey) {
          return observation.value[firstKey]
        }

        // Last resort: stringify
        return JSON.stringify(observation.value)
      }
      return observation.value
    }
    return 'N/A'
  }

  const formatSource = (source) => {
    if (!source) return 'Unknown'
    return source.charAt(0).toUpperCase() + source.slice(1)
  }

  // Calculate observation frequency for data completeness badge
  const getObservationFrequency = (observation) => {
    if (!observations) return { count: 0, daysInMonth: 0 }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    // Count observations for this patient and metric in current month
    const monthlyObservations = observations.filter(obs =>
      obs.patientId === observation.patientId &&
      obs.metricId === observation.metricId &&
      new Date(obs.recordedAt) >= startOfMonth &&
      new Date(obs.recordedAt) <= endOfMonth
    )

    // Count unique days with observations
    const uniqueDays = new Set(
      monthlyObservations.map(obs =>
        new Date(obs.recordedAt).toDateString()
      )
    ).size

    const daysInMonth = endOfMonth.getDate()

    return {
      count: monthlyObservations.length,
      uniqueDays,
      daysInMonth
    }
  }

  const getSourceIcon = (source) => {
    switch (source?.toLowerCase()) {
      case 'patient':
        return UserIcon
      case 'clinician':
        return UserIcon
      case 'system':
        return ChartBarIcon
      default:
        return TagIcon
    }
  }

  const getSourceColor = (source) => {
    switch (source?.toLowerCase()) {
      case 'patient':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'clinician':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'system':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMetricTypeColor = (valueType) => {
    switch (valueType?.toLowerCase()) {
      case 'numeric':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'categorical':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'ordinal':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'boolean':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const getValueSeverityColor = (observation) => {
    const value = getObservationValue(observation)
    const metricKey = observation.metric?.key || observation.metricKey

    // Pain scale indicators
    if (metricKey?.includes('pain') && observation.metric?.valueType === 'numeric') {
      const numValue = parseFloat(value)
      if (numValue >= 7) return 'text-red-600 bg-red-50'
      if (numValue >= 4) return 'text-yellow-600 bg-yellow-50'
      return 'text-green-600 bg-green-50'
    }
    
    // Mood/anxiety indicators
    if (metricKey?.includes('mood') || metricKey?.includes('anxiety')) {
      if (value?.toLowerCase().includes('severe') || value?.toLowerCase().includes('high')) {
        return 'text-red-600 bg-red-50'
      }
      if (value?.toLowerCase().includes('moderate') || value?.toLowerCase().includes('medium')) {
        return 'text-yellow-600 bg-yellow-50'
      }
      return 'text-green-600 bg-green-50'
    }
    
    return 'text-gray-900 bg-gray-50'
  }

  const formatObservationContext = (observation) => {
    const context = observation.context || {}
    const raw = observation.raw || {}
    
    const details = []
    
    if (raw.notes) details.push(`Notes: ${raw.notes}`)
    if (raw.location) details.push(`Location: ${raw.location}`)
    if (context.assessmentType) details.push(`Assessment: ${context.assessmentType}`)
    if (context.enrollmentId) details.push(`Enrollment: ${context.enrollmentId}`)
    
    return details
  }

  const handleViewDetails = (observation) => {
    setSelectedObservation(observation)
    setShowDetailModal(true)
  }

  const handleViewPatient = (patient) => {
    setSelectedPatient(patient)
    setShowPatientContext(true)
  }

  const filteredObservations = observations.filter(observation => {
    // Search term filter
    const matchesSearch = !searchTerm ||
      observation.patient?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      observation.patient?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      observation.metric?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())

    // Program filter (check enrollment context if available)
    const matchesProgram = !selectedProgram ||
      observation.enrollment?.program?.type === selectedProgram ||
      observation.context === selectedProgram

    return matchesSearch && matchesProgram
  })

  const clearFilters = () => {
    setSearchTerm('')
    setSelectedProgram('')
    setDateRange({ startDate: '', endDate: '' })
  }

  const hasActiveFilters = searchTerm || selectedProgram || dateRange.startDate || dateRange.endDate

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg">Error loading observations: {error.message}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Patient Observations
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Detailed view of patient-recorded health metrics and assessment data
            </p>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600 bg-white px-4 py-2 rounded-xl shadow-lg">
            <ChartBarIcon className="h-5 w-5 text-purple-500" />
            <span className="font-medium">{filteredObservations.length} observations</span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center space-x-2 mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-500" />
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient or metric..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={selectedProgram}
                onChange={(e) => setSelectedProgram(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 appearance-none bg-white"
              >
                <option value="">All Programs</option>
                <option value="RPM">Remote Patient Monitoring (RPM)</option>
                <option value="RTM">Remote Therapeutic Monitoring (RTM)</option>
                <option value="CCM">Chronic Care Management (CCM)</option>
                <option value="WELLNESS">General Wellness</option>
              </select>
            </div>

            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="Start date"
              />
            </div>
            
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="End date"
              />
            </div>
          </div>
        </div>

        {/* Observations Grid */}
        {filteredObservations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No observations found</h3>
            <p className="text-gray-600">
              {hasActiveFilters ? 'Try adjusting your filters to see more results.' : 'No observations have been recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredObservations.map((observation) => {
              const SourceIcon = getSourceIcon(observation.source)
              const contextDetails = formatObservationContext(observation)
              const valueSeverityColor = getValueSeverityColor(observation)
              const frequency = getObservationFrequency(observation)

              return (
                <div key={observation.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-4">
                    <div className="flex items-center justify-between text-white">
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-5 w-5" />
                        <span className="font-semibold">
                          {observation.patient?.firstName} {observation.patient?.lastName}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 text-purple-100">
                        <ClockIcon className="h-4 w-4" />
                        <span className="text-sm">
                          {new Date(observation.recordedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {observation.metric?.displayName}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getMetricTypeColor(observation.metric?.valueType)}`}>
                          {observation.metric?.valueType}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className={`text-3xl font-bold px-3 py-2 rounded-lg ${valueSeverityColor}`}>
                          {getObservationValue(observation)}
                          {observation.metric?.unit && (
                            <span className="text-lg text-gray-500 ml-1">
                              {observation.metric.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Assessment Context */}
                      {contextDetails.length > 0 && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-2 mb-2">
                            <DocumentTextIcon className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Assessment Details</span>
                          </div>
                          <div className="space-y-1">
                            {contextDetails.slice(0, 2).map((detail, index) => (
                              <div key={index} className="text-xs text-gray-600">
                                {detail}
                              </div>
                            ))}
                            {contextDetails.length > 2 && (
                              <button
                                onClick={() => handleViewDetails(observation)}
                                className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                              >
                                View all details...
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getSourceColor(observation.source)}`}>
                          <SourceIcon className="h-3 w-3 mr-1" />
                          {formatSource(observation.source)}
                        </span>
                        {frequency.uniqueDays > 0 && (
                          <span
                            className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border border-green-200 bg-green-50 text-green-700"
                            title={`${frequency.count} observations on ${frequency.uniqueDays} different days this month`}
                          >
                            <ChartBarIcon className="h-3 w-3 mr-1" />
                            Day {frequency.uniqueDays}/{frequency.daysInMonth}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => handleViewPatient(observation.patient)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center space-x-1"
                        >
                          <UserIcon className="h-4 w-4" />
                          <span>View Patient</span>
                        </button>
                        <button
                          onClick={() => handleViewDetails(observation)}
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium flex items-center space-x-1"
                        >
                          <EyeIcon className="h-4 w-4" />
                          <span>Details</span>
                        </button>
                        <div className="text-sm text-gray-500">
                          {new Date(observation.recordedAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedObservation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Observation Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Patient Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Patient Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Name:</span>
                      <div className="text-sm text-gray-900">
                        {selectedObservation.patient?.firstName} {selectedObservation.patient?.lastName}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Patient ID:</span>
                      <div className="text-sm text-gray-900">{selectedObservation.patient?.id}</div>
                    </div>
                  </div>
                </div>

                {/* Metric Details */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Metric Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Metric:</span>
                      <div className="text-sm text-gray-900">{selectedObservation.metric?.displayName}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Type:</span>
                      <div className="text-sm text-gray-900">{selectedObservation.metric?.valueType}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Value:</span>
                      <div className="text-lg font-bold text-gray-900">
                        {getObservationValue(selectedObservation)}
                        {selectedObservation.metric?.unit && (
                          <span className="text-sm text-gray-500 ml-1">
                            {selectedObservation.metric.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Source:</span>
                      <div className="text-sm text-gray-900">{formatSource(selectedObservation.source)}</div>
                    </div>
                  </div>
                </div>

                {/* Context & Notes */}
                {(selectedObservation.context || selectedObservation.raw) && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Additional Details</h3>
                    <div className="space-y-3">
                      {selectedObservation.raw?.notes && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Notes:</span>
                          <div className="text-sm text-gray-900 mt-1">{selectedObservation.raw.notes}</div>
                        </div>
                      )}
                      {selectedObservation.raw?.location && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Location:</span>
                          <div className="text-sm text-gray-900">{selectedObservation.raw.location}</div>
                        </div>
                      )}
                      {selectedObservation.context && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">Context:</span>
                          <pre className="text-xs text-gray-600 mt-1 bg-white p-2 rounded border overflow-x-auto">
                            {JSON.stringify(selectedObservation.context, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamp */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Timing Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Recorded At:</span>
                      <div className="text-sm text-gray-900">
                        {new Date(selectedObservation.recordedAt).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-700">Created At:</span>
                      <div className="text-sm text-gray-900">
                        {new Date(selectedObservation.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Patient Context Panel */}
      {showPatientContext && selectedPatient && (
        <PatientContextPanel
          isOpen={showPatientContext}
          patientId={selectedPatient.id}
          onClose={() => setShowPatientContext(false)}
        />
      )}
    </div>
  )
}

// Example of how medication adherence observations appear
const medicationAdherenceCard = {
  // Header with patient info and date
  header: "Sarah Johnson - Dec 15, 2024",
  
  // Main content
  metricName: "Medication Adherence",
  valueType: "categorical",
  
  // Color-coded value based on adherence status
  value: "Taken as prescribed", // Green background
  // OR "Missed dose",          // Red background  
  // OR "Partial dose",         // Yellow background
  // OR "Wrong time",           // Orange background
  // OR "Skipped intentionally" // Red background
  
  // Assessment context showing medication details
  assessmentDetails: [
    "Medication: Ibuprofen 400mg",
    "Frequency: Three times daily", 
    "Route: Oral",
    "Taken at: 2:30 PM",
    "Notes: Took with food as instructed"
  ],
  
  // Source indicator
  source: "patient", // Shows patient icon
  
  // Timestamp
  recordedAt: "2024-12-15T14:30:00Z"
}