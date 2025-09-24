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
  FunnelIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'

export default function Observations() {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  })

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
    if (observation.valueNumeric !== null && observation.valueNumeric !== undefined) return observation.valueNumeric
    if (observation.valueCode !== null && observation.valueCode !== undefined) return observation.valueCode
    if (observation.valueText !== null && observation.valueText !== undefined) return observation.valueText
    return 'N/A'
  }

  const formatSource = (source) => {
    if (!source) return 'Unknown'
    return source.charAt(0).toUpperCase() + source.slice(1)
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

  const filteredObservations = observations.filter(observation =>
    !searchTerm || 
    observation.patient?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    observation.patient?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    observation.metricDefinition?.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const clearFilters = () => {
    setSearchTerm('')
    setDateRange({ startDate: '', endDate: '' })
  }

  const hasActiveFilters = searchTerm || dateRange.startDate || dateRange.endDate

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
              Observations
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Monitor patient data and health metrics
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="Start Date"
              />
            </div>
            
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                placeholder="End Date"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 text-sm text-gray-600">
              {searchTerm && (
                <span>Searching for "{searchTerm}" • </span>
              )}
              {dateRange.startDate && (
                <span>From {new Date(dateRange.startDate).toLocaleDateString()} • </span>
              )}
              {dateRange.endDate && (
                <span>To {new Date(dateRange.endDate).toLocaleDateString()}</span>
              )}
            </div>
          )}
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
                          {observation.metricDefinition?.displayName}
                        </h3>
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getMetricTypeColor(observation.metricDefinition?.valueType)}`}>
                          {observation.metricDefinition?.valueType}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-3xl font-bold text-gray-900">
                          {getObservationValue(observation)}
                          {observation.metricDefinition?.unit && (
                            <span className="text-lg text-gray-500 ml-1">
                              {observation.metricDefinition.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Source */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getSourceColor(observation.source)}`}>
                          <SourceIcon className="h-3 w-3 mr-1" />
                          {formatSource(observation.source)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(observation.recordedAt).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}