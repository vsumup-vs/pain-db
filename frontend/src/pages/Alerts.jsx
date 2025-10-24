import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  ExclamationTriangleIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BellIcon,
  ClockIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import ResolutionModal from '../components/ResolutionModal'

export default function Alerts() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false)
  const [selectedAlertForResolution, setSelectedAlertForResolution] = useState(null)
  const queryClient = useQueryClient()

  const { data: alertsResponse, isLoading } = useQuery({
    queryKey: ['alerts', statusFilter, severityFilter],
    queryFn: () => api.getAlerts({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      severity: severityFilter !== 'all' ? severityFilter : undefined,
    }),
  })

  // Extract alerts array from response - API returns {alerts: [...]}
  const alerts = alertsResponse?.alerts || []

  // Filter alerts based on search term
  const filteredAlerts = alerts.filter(alert => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      alert.rule?.name?.toLowerCase().includes(searchLower) ||
      alert.patient?.firstName?.toLowerCase().includes(searchLower) ||
      alert.patient?.lastName?.toLowerCase().includes(searchLower) ||
      alert.message?.toLowerCase().includes(searchLower)
    )
  })

  // Acknowledge alert mutation (Critical Fix #3)
  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId) => api.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts'])
      toast.success('Alert acknowledged successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to acknowledge alert')
    }
  })

  // Resolve alert mutation (Critical Fixes #1, #2, #3, #4)
  const resolveAlertMutation = useMutation({
    mutationFn: ({ id, data }) => api.resolveAlert(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['alerts'])
      queryClient.invalidateQueries(['tasks'])
      toast.success('Alert resolved successfully with complete documentation')
      setIsResolutionModalOpen(false)
      setSelectedAlertForResolution(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to resolve alert')
    }
  })

  const handleAcknowledge = (alertId) => {
    acknowledgeAlertMutation.mutate(alertId)
  }

  const handleResolve = (alertId) => {
    // Find the alert to pass to modal
    const alert = alerts.find(a => a.id === alertId)
    if (alert) {
      setSelectedAlertForResolution(alert)
      setIsResolutionModalOpen(true)
    }
  }

  const handleResolutionSubmit = (resolutionData) => {
    if (!selectedAlertForResolution) return
    resolveAlertMutation.mutate({
      id: selectedAlertForResolution.id,
      data: resolutionData
    })
  }

  const handleResolutionModalClose = () => {
    setIsResolutionModalOpen(false)
    setSelectedAlertForResolution(null)
  }

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-gradient-to-r from-red-500 to-red-600 text-white'
      case 'high':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
      case 'medium':
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
      case 'low':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white'
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
      case 'ACKNOWLEDGED':
        return 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border border-yellow-300'
      case 'RESOLVED':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300'
      case 'DISMISSED':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
      case 'high':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
      case 'medium':
        return <BellIcon className="h-5 w-5 text-yellow-500" />
      case 'low':
        return <BellIcon className="h-5 w-5 text-green-500" />
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const formatStatus = (status) => {
    if (status === 'ACKNOWLEDGED') return 'Acknowledged'
    if (status === 'PENDING') return 'Pending'
    if (status === 'RESOLVED') return 'Resolved'
    if (status === 'DISMISSED') return 'Dismissed'
    return status || 'Unknown'
  }

  const getAlertStats = () => {
    const openAlerts = alerts.filter(a => a.status === 'PENDING').length
    const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length
    const acknowledgedAlerts = alerts.filter(a => a.status === 'ACKNOWLEDGED').length
    const resolvedAlerts = alerts.filter(a => a.status === 'RESOLVED').length

    return { openAlerts, criticalAlerts, acknowledgedAlerts, resolvedAlerts }
  }

  const stats = getAlertStats()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Alert Management
              </h1>
              <p className="mt-2 text-gray-600">Monitor and manage system alerts</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-sm text-gray-500">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
              <span className="font-medium">{stats.openAlerts} active alerts</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Open Alerts</p>
                <p className="text-3xl font-bold text-red-600">{stats.openAlerts}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-3xl font-bold text-orange-600">{stats.criticalAlerts}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <BellIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Acknowledged</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.acknowledgedAlerts}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <CheckIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-3xl font-bold text-green-600">{stats.resolvedAlerts}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <XMarkIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            
            <div>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' || severityFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'No alerts have been triggered yet'}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div key={alert.id} className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        {getSeverityIcon(alert.severity)}
                        <h3 className="text-xl font-semibold text-gray-900">
                          {alert.rule?.name || 'Alert'}
                        </h3>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                          {alert.severity || 'Unknown'}
                        </span>
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.status)}`}>
                          {formatStatus(alert.status)}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4 text-lg">
                        {alert.message || 'No description available'}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center space-x-2 text-gray-600">
                          <UserIcon className="h-4 w-4" />
                          <div>
                            <span className="font-medium">Patient:</span>
                            <p className="text-sm">{alert.patient?.firstName} {alert.patient?.lastName}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-gray-600">
                          <ClockIcon className="h-4 w-4" />
                          <div>
                            <span className="font-medium">Triggered:</span>
                            <p className="text-sm">{new Date(alert.triggeredAt).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        {alert.facts?.painLevel && (
                          <div className="flex items-center space-x-2 text-gray-600">
                            <ChartBarIcon className="h-4 w-4" />
                            <div>
                              <span className="font-medium">Pain Level:</span>
                              <p className="text-sm font-bold text-red-600">{alert.facts.painLevel}/10</p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-center space-x-2 text-gray-600">
                          <span className="font-medium">MRN:</span>
                          <p className="text-sm">{alert.patient?.medicalRecordNumber}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-2 ml-6">
                      {alert.status === 'PENDING' && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-sm font-medium rounded-lg hover:from-yellow-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                          disabled={acknowledgeAlertMutation.isLoading}
                        >
                          <CheckIcon className="h-4 w-4 mr-2" />
                          Acknowledge
                        </button>
                      )}
                      {alert.status !== 'RESOLVED' && alert.status !== 'DISMISSED' && (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                          disabled={resolveAlertMutation.isLoading}
                        >
                          <XMarkIcon className="h-4 w-4 mr-2" />
                          Resolve
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resolution Modal */}
      <ResolutionModal
        isOpen={isResolutionModalOpen}
        onClose={handleResolutionModalClose}
        onSubmit={handleResolutionSubmit}
        alert={selectedAlertForResolution}
        isSubmitting={resolveAlertMutation.isLoading}
        enrollmentId={selectedAlertForResolution?.data?.enrollmentId}
      />
    </div>
  )
}