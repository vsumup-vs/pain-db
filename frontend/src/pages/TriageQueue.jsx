import React, { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  ExclamationTriangleIcon,
  ClockIcon,
  UserIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  FireIcon,
  BellIcon,
  ChartBarIcon,
  FunnelIcon,
  PlusCircleIcon,
  SignalIcon,
  SignalSlashIcon,
  BellSlashIcon,
  NoSymbolIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import TaskModal from '../components/TaskModal'
import ResolutionModal from '../components/ResolutionModal'
import SnoozeModal from '../components/SnoozeModal'
import SuppressModal from '../components/SuppressModal'
import PatientContextPanel from '../components/PatientContextPanel'
import TimerWidget from '../components/TimerWidget'
import { useRealTimeAlerts } from '../hooks/useRealTimeAlerts'
import { useAllTimers } from '../hooks/useTimer'

export default function TriageQueue() {
  const [filters, setFilters] = useState({
    status: 'PENDING',
    severity: 'all',
    riskLevel: 'all',
    claimedBy: 'all',
    slaStatus: 'all',
    escalationStatus: 'all', // Supervisor escalation filter
    sortBy: 'priorityRank',
    sortOrder: 'asc'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const limit = 20

  // Task creation state
  const [createTaskForAlert, setCreateTaskForAlert] = useState({}) // { alertId: boolean }
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [taskPrefillData, setTaskPrefillData] = useState(null)

  // Resolution modal state
  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false)
  const [selectedAlertForResolution, setSelectedAlertForResolution] = useState(null)

  // Snooze modal state
  const [isSnoozeModalOpen, setIsSnoozeModalOpen] = useState(false)
  const [selectedAlertForSnooze, setSelectedAlertForSnooze] = useState(null)

  // Suppress modal state
  const [isSuppressModalOpen, setIsSuppressModalOpen] = useState(false)
  const [selectedAlertForSuppress, setSelectedAlertForSuppress] = useState(null)

  // Patient Context Panel state
  const [isPatientContextOpen, setIsPatientContextOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [selectedClinicianId, setSelectedClinicianId] = useState(null)

  const queryClient = useQueryClient()

  // Fetch current user profile to determine clinical access
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: api.getCurrentUserProfile
  })

  // Real-time SSE connection for instant alert updates
  const { alerts: sseAlerts, connectionStatus, error: sseError, reconnect } = useRealTimeAlerts()

  // Active timers for all patients
  const { timers } = useAllTimers()

  // Track previous alert count for notification
  const prevAlertCountRef = useRef(0)

  // Fetch triage queue data (with reduced polling since SSE provides real-time updates)
  const { data: triageData, isLoading } = useQuery({
    queryKey: ['triageQueue', filters, page],
    queryFn: () => api.getTriageQueue({
      ...filters,
      severity: filters.severity !== 'all' ? filters.severity : undefined,
      minRiskScore: filters.riskLevel === 'critical' ? 8 : filters.riskLevel === 'high' ? 6 : filters.riskLevel === 'medium' ? 4 : undefined,
      maxRiskScore: filters.riskLevel === 'critical' ? 10 : filters.riskLevel === 'high' ? 7.99 : filters.riskLevel === 'medium' ? 5.99 : filters.riskLevel === 'low' ? 3.99 : undefined,
      claimedBy: filters.claimedBy !== 'all' ? filters.claimedBy : undefined,
      slaStatus: filters.slaStatus !== 'all' ? filters.slaStatus : undefined,
      escalationStatus: filters.escalationStatus !== 'all' ? filters.escalationStatus : undefined, // Supervisor escalation filter
      page,
      limit
    }),
    refetchInterval: 120000 // Reduced to 2 minutes since SSE provides real-time updates
  })

  // Merge SSE alerts with query alerts (SSE takes precedence for real-time updates)
  const queryAlerts = triageData?.data?.alerts || []
  const alertsMap = new Map()

  // First, add query alerts to map
  queryAlerts.forEach(alert => alertsMap.set(alert.id, alert))

  // Then, overlay SSE alerts (they're more up-to-date)
  sseAlerts.forEach(alert => alertsMap.set(alert.id, alert))

  // Convert back to array
  const alerts = Array.from(alertsMap.values())

  const pagination = triageData?.data?.pagination || {}
  const summary = triageData?.data?.summary || {}

  // Filter by search term (client-side for UX responsiveness)
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

  // Show toast notification when new alerts arrive via SSE
  useEffect(() => {
    const currentAlertCount = sseAlerts.length
    if (prevAlertCountRef.current > 0 && currentAlertCount > prevAlertCountRef.current) {
      const newAlertCount = currentAlertCount - prevAlertCountRef.current
      const latestAlert = sseAlerts[0] // SSE alerts are prepended (newest first)

      toast.info(
        <div>
          <div className="font-semibold">
            {newAlertCount === 1 ? 'New Alert!' : `${newAlertCount} New Alerts!`}
          </div>
          {newAlertCount === 1 && latestAlert && (
            <div className="text-sm mt-1">
              {latestAlert.patient?.firstName} {latestAlert.patient?.lastName}: {latestAlert.rule?.name}
            </div>
          )}
        </div>,
        {
          autoClose: 5000,
          icon: <BellIcon className="h-5 w-5 text-blue-500" />
        }
      )
    }
    prevAlertCountRef.current = currentAlertCount
  }, [sseAlerts])

  // Show error toast if SSE connection fails
  useEffect(() => {
    if (sseError) {
      toast.error(sseError, {
        autoClose: false,
        toastId: 'sse-error' // Prevent duplicate error toasts
      })
    }
  }, [sseError])

  // Claim alert mutation (with auto-start timer)
  const claimAlertMutation = useMutation({
    mutationFn: async (data) => {
      // First claim the alert
      await api.claimAlert(data.alertId)

      // Then auto-start timer for time tracking
      try {
        await api.startTimer({
          patientId: data.patientId,
          activity: `Addressing alert: ${data.alertName}`,
          source: 'alert',
          sourceId: data.alertId
        })
      } catch (timerError) {
        // Non-critical: Timer start failure shouldn't block alert claim
        console.warn('Failed to auto-start timer:', timerError)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['triageQueue'])
      queryClient.invalidateQueries(['active-timer']) // Refresh individual timer state
      queryClient.invalidateQueries(['active-timers-all']) // Refresh all timers list (CRITICAL FIX)
      toast.success('Alert claimed - timer started automatically')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to claim alert')
    }
  })

  // Unclaim alert mutation
  const unclaimAlertMutation = useMutation({
    mutationFn: (alertId) => api.unclaimAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries(['triageQueue'])
      toast.success('Alert unclaimed successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to unclaim alert')
    }
  })

  // Update alert status mutation
  const updateAlertMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateAlert(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['triageQueue'])
      toast.success('Alert updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update alert')
    }
  })

  // Acknowledge alert mutation (Critical Fix #3)
  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId) => api.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries(['triageQueue'])
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
      queryClient.invalidateQueries(['triageQueue'])
      queryClient.invalidateQueries(['tasks']) // Refresh tasks if follow-up created
      toast.success('Alert resolved successfully with complete documentation')
      setIsResolutionModalOpen(false)
      setSelectedAlertForResolution(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to resolve alert')
    }
  })

  // Snooze alert mutation (Phase 1b)
  const snoozeAlertMutation = useMutation({
    mutationFn: ({ id, data }) => api.snoozeAlert(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['triageQueue'])
      toast.success('Alert snoozed successfully')
      setIsSnoozeModalOpen(false)
      setSelectedAlertForSnooze(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to snooze alert')
    }
  })

  // Suppress alert mutation (Phase 1b)
  const suppressAlertMutation = useMutation({
    mutationFn: ({ id, data }) => api.suppressAlert(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['triageQueue'])
      toast.success('Alert suppressed successfully')
      setIsSuppressModalOpen(false)
      setSelectedAlertForSuppress(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to suppress alert')
    }
  })

  const handleClaim = (alert) => {
    claimAlertMutation.mutate({
      alertId: alert.id,
      patientId: alert.patient?.id,
      alertName: alert.rule?.name || 'Alert'
    })
  }

  const handleUnclaim = (alertId) => {
    unclaimAlertMutation.mutate(alertId)
  }

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

  const handleResolutionSubmit = async (resolutionData) => {
    if (!selectedAlertForResolution) return

    // Check if there's an active timer for this patient
    const patientId = selectedAlertForResolution.patient?.id
    const activeTimer = timers?.find(t => t.patientId === patientId)

    // If there's an active timer, stop it before resolving the alert
    if (activeTimer && patientId) {
      try {
        // Stop the timer with the resolution data
        await api.stopTimer({
          patientId,
          cptCode: resolutionData.cptCode || null,
          notes: resolutionData.resolutionNotes,
          billable: true
        })

        // Invalidate timer queries to refresh the UI
        queryClient.invalidateQueries(['active-timer', patientId])
        queryClient.invalidateQueries(['active-timers-all'])
      } catch (error) {
        console.error('Error stopping timer:', error)
        // Continue with resolution even if timer stop fails
      }
    }

    // Proceed with alert resolution
    resolveAlertMutation.mutate({
      id: selectedAlertForResolution.id,
      data: resolutionData
    })
  }

  const handleResolutionModalClose = () => {
    setIsResolutionModalOpen(false)
    setSelectedAlertForResolution(null)
  }

  // Snooze alert handler (Phase 1b)
  const handleSnooze = (alertId) => {
    const alert = alerts.find(a => a.id === alertId)
    if (alert) {
      setSelectedAlertForSnooze(alert)
      setIsSnoozeModalOpen(true)
    }
  }

  const handleSnoozeSubmit = (snoozeData) => {
    if (!selectedAlertForSnooze) return

    snoozeAlertMutation.mutate({
      id: selectedAlertForSnooze.id,
      data: snoozeData
    })
  }

  const handleSnoozeModalClose = () => {
    setIsSnoozeModalOpen(false)
    setSelectedAlertForSnooze(null)
  }

  // Suppress alert handler (Phase 1b)
  const handleSuppress = (alertId) => {
    const alert = alerts.find(a => a.id === alertId)
    if (alert) {
      setSelectedAlertForSuppress(alert)
      setIsSuppressModalOpen(true)
    }
  }

  const handleSuppressSubmit = (suppressData) => {
    if (!selectedAlertForSuppress) return

    suppressAlertMutation.mutate({
      id: selectedAlertForSuppress.id,
      data: suppressData
    })
  }

  const handleSuppressModalClose = () => {
    setIsSuppressModalOpen(false)
    setSelectedAlertForSuppress(null)
  }

  const handleViewPatientContext = (patientId, clinicianId) => {
    setSelectedPatientId(patientId)
    setSelectedClinicianId(clinicianId)
    setIsPatientContextOpen(true)
  }

  const handleTaskModalClose = (taskCreated = false) => {
    // If task was created successfully, resolve the alert
    if (taskCreated && taskPrefillData?.alertId) {
      updateAlertMutation.mutate({
        id: taskPrefillData.alertId,
        data: { status: 'RESOLVED' }
      })
      // Clear the checkbox state for this alert
      setCreateTaskForAlert({
        ...createTaskForAlert,
        [taskPrefillData.alertId]: false
      })
    }

    setIsTaskModalOpen(false)
    setTaskPrefillData(null)
  }

  // Get risk level color classes
  const getRiskLevelColor = (riskLevel) => {
    switch (riskLevel) {
      case 'critical':
        return 'bg-red-600 text-white border-red-700'
      case 'high':
        return 'bg-orange-500 text-white border-orange-600'
      case 'medium':
        return 'bg-yellow-500 text-white border-yellow-600'
      case 'low':
        return 'bg-green-500 text-white border-green-600'
      default:
        return 'bg-gray-500 text-white border-gray-600'
    }
  }

  // Get SLA status color and icon (Enhanced for Phase 1b escalation visibility)
  const getSLAStatusBadge = (slaStatus, timeRemainingMinutes, alert) => {
    // Check if alert has been escalated (based on slaBreachTime and escalation delay rules)
    const minutesSinceBreach = alert.slaBreachTime && slaStatus === 'breached'
      ? Math.abs(timeRemainingMinutes)
      : 0;

    let isEscalated = false;
    if (alert.severity === 'CRITICAL' && minutesSinceBreach >= 30) {
      isEscalated = true; // CRITICAL: escalated 30 min after breach
    } else if (alert.severity === 'HIGH' && minutesSinceBreach >= 120) {
      isEscalated = true; // HIGH: escalated 2 hours after breach
    } else if (alert.severity === 'MEDIUM' && minutesSinceBreach >= 240) {
      isEscalated = true; // MEDIUM: escalated 4 hours after breach
    }

    if (slaStatus === 'breached') {
      return (
        <div className="flex flex-col items-end space-y-1">
          <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-300">
            <ClockIcon className="h-3 w-3 mr-1" />
            SLA BREACHED {minutesSinceBreach > 0 && `${minutesSinceBreach}m ago`}
          </span>
          {isEscalated && (
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-300">
              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
              Escalated to Supervisor
            </span>
          )}
        </div>
      )
    } else if (slaStatus === 'approaching') {
      return (
        <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 border border-yellow-300">
          <ClockIcon className="h-3 w-3 mr-1 animate-pulse" />
          {timeRemainingMinutes}m remaining
        </span>
      )
    } else {
      return (
        <span className="inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 border border-green-300">
          <ClockIcon className="h-3 w-3 mr-1" />
          {timeRemainingMinutes}m
        </span>
      )
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return <FireIcon className="h-5 w-5 text-red-500" />
      case 'HIGH':
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />
      case 'MEDIUM':
        return <BellIcon className="h-5 w-5 text-yellow-500" />
      case 'LOW':
        return <BellIcon className="h-5 w-5 text-green-500" />
      default:
        return <BellIcon className="h-5 w-5 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
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
                Prioritized Triage Queue
              </h1>
              <p className="mt-2 text-gray-600">Risk-scored alerts sorted by priority</p>
            </div>
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row items-end sm:items-center gap-3">
              {/* SSE Connection Status */}
              <div className="flex items-center space-x-2">
                {connectionStatus === 'connected' ? (
                  <>
                    <SignalIcon className="h-5 w-5 text-green-500 animate-pulse" />
                    <span className="text-sm font-medium text-green-600">Live Updates</span>
                  </>
                ) : connectionStatus === 'connecting' ? (
                  <>
                    <SignalIcon className="h-5 w-5 text-yellow-500 animate-spin" />
                    <span className="text-sm font-medium text-yellow-600">Connecting...</span>
                  </>
                ) : connectionStatus === 'error' ? (
                  <>
                    <SignalSlashIcon className="h-5 w-5 text-red-500" />
                    <button
                      onClick={reconnect}
                      className="text-sm font-medium text-red-600 hover:text-red-800 underline"
                    >
                      Reconnect
                    </button>
                  </>
                ) : (
                  <>
                    <SignalSlashIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-500">Disconnected</span>
                  </>
                )}
              </div>

              {/* Pending Alerts Count */}
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <FireIcon className="h-5 w-5 text-red-500 animate-pulse" />
                <span className="font-medium">{summary.pending || 0} pending alerts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Timers Section */}
        {timers && timers.length > 0 && (
          <div className="mb-8 space-y-4">
            {timers.map(timerData => {
              // Find alert/patient name from alerts array
              const alert = alerts.find(a => a.patientId === timerData.patientId)
              const patientName = alert?.patient ?
                `${alert.patient.firstName} ${alert.patient.lastName}` :
                'Unknown Patient'

              return (
                <TimerWidget
                  key={timerData.patientId}
                  patientId={timerData.patientId}
                  patientName={patientName}
                  onTimeStopped={() => {
                    queryClient.invalidateQueries(['triageQueue'])
                  }}
                />
              )
            })}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pending</p>
                <p className="text-3xl font-bold text-blue-600">{summary.pending || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <BellIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SLA Breached</p>
                <p className="text-3xl font-bold text-red-600">{summary.breached || 0}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <ClockIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Approaching</p>
                <p className="text-3xl font-bold text-yellow-600">{summary.approaching || 0}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unclaimed</p>
                <p className="text-3xl font-bold text-purple-600">{summary.unclaimed || 0}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <UserIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">My Claims</p>
                <p className="text-3xl font-bold text-green-600">{summary.claimedByMe || 0}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="flex items-center mb-4">
            <FunnelIcon className="h-5 w-5 text-gray-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

            <select
              value={filters.severity}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical (8-10)</option>
              <option value="high">High (6-8)</option>
              <option value="medium">Medium (4-6)</option>
              <option value="low">Low (0-4)</option>
            </select>

            <select
              value={filters.slaStatus}
              onChange={(e) => setFilters({ ...filters, slaStatus: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All SLA Status</option>
              <option value="breached">Breached</option>
              <option value="approaching">Approaching</option>
              <option value="ok">OK</option>
            </select>

            <select
              value={filters.claimedBy}
              onChange={(e) => setFilters({ ...filters, claimedBy: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Claims</option>
              <option value="me">My Claims</option>
              <option value="unclaimed">Unclaimed</option>
            </select>

            <select
              value={filters.escalationStatus}
              onChange={(e) => setFilters({ ...filters, escalationStatus: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-purple-50 border-purple-200"
            >
              <option value="all">All Alerts</option>
              <option value="escalated-to-me">🚨 Escalated to Me</option>
              <option value="all-escalated">⚠️ All Escalated</option>
              <option value="sla-breached-only">🔥 SLA Breached Only</option>
            </select>
          </div>
        </div>

        {/* Alerts List */}
        <div className="space-y-4">
          {filteredAlerts.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts in queue</h3>
              <p className="text-gray-500">
                {searchTerm || Object.values(filters).some(f => f !== 'all' && f !== 'PENDING')
                  ? 'Try adjusting your search or filters'
                  : 'All alerts have been addressed'}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`bg-white rounded-xl shadow-lg border-2 hover:shadow-2xl transition-all duration-300 overflow-hidden ${
                  alert.computed.slaStatus === 'breached' ? 'border-red-500 animate-pulse' :
                  alert.computed.slaStatus === 'approaching' ? 'border-yellow-500' :
                  'border-gray-200'
                }`}
              >
                <div className="p-6">
                  {/* Priority Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold text-lg">
                        #{alert.priorityRank}
                      </span>
                      <div>
                        <div className="flex items-center space-x-2">
                          {getSeverityIcon(alert.severity)}
                          <h3 className="text-xl font-semibold text-gray-900">
                            {alert.rule?.name || 'Alert'}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end space-y-2">
                      <span className={`inline-flex items-center px-4 py-2 text-sm font-bold rounded-full ${getRiskLevelColor(alert.computed.riskLevel)}`}>
                        Risk: {alert.riskScore?.toFixed(1) || 'N/A'}
                      </span>
                      {getSLAStatusBadge(alert.computed.slaStatus, alert.computed.timeRemainingMinutes, alert)}
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Patient</p>
                      <button
                        onClick={() => handleViewPatientContext(alert.patient?.id, alert.clinician?.id)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-200 text-left"
                      >
                        {alert.patient?.firstName} {alert.patient?.lastName}
                      </button>
                      {alert.patient?.phone && (
                        <a href={`tel:${alert.patient.phone}`} className="block text-xs text-blue-600 hover:underline">
                          {alert.patient.phone}
                        </a>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Triggered</p>
                      <p className="text-sm text-gray-900">
                        {new Date(alert.triggeredAt).toLocaleString()}
                      </p>
                    </div>

                    {alert.clinician && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Assigned To</p>
                        <p className="text-sm text-gray-900">
                          {alert.clinician.firstName} {alert.clinician.lastName}
                        </p>
                        {alert.clinician.specialization && (
                          <p className="text-xs text-gray-600">{alert.clinician.specialization}</p>
                        )}
                      </div>
                    )}

                    {alert.computed.isClaimed && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Claimed By</p>
                        <p className="text-sm text-gray-900">
                          {alert.computed.isClaimedByMe ? (
                            <span className="text-green-600 font-semibold">You</span>
                          ) : (
                            `${alert.claimedBy?.firstName} ${alert.claimedBy?.lastName}`
                          )}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(alert.claimedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {currentUser?.hasClinician ? (
                        // User has clinician access - show clinical action buttons
                        <>
                          {!alert.computed.isClaimed ? (
                            <button
                              onClick={() => handleClaim(alert)}
                              disabled={claimAlertMutation.isLoading}
                              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                            >
                              <UserIcon className="h-4 w-4 mr-2" />
                              Claim Alert
                            </button>
                          ) : alert.computed.isClaimedByMe ? (
                            <>
                              <button
                                onClick={() => handleUnclaim(alert.id)}
                                disabled={unclaimAlertMutation.isLoading}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white text-sm font-medium rounded-lg hover:from-gray-600 hover:to-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                              >
                                <XMarkIcon className="h-4 w-4 mr-2" />
                                Unclaim
                              </button>
                              <button
                                onClick={() => handleAcknowledge(alert.id)}
                                disabled={acknowledgeAlertMutation.isLoading}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white text-sm font-medium rounded-lg hover:from-yellow-600 hover:to-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                              >
                                <CheckIcon className="h-4 w-4 mr-2" />
                                Acknowledge
                              </button>
                              <button
                                onClick={() => handleResolve(alert.id)}
                                disabled={resolveAlertMutation.isLoading}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm font-medium rounded-lg hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                              >
                                <CheckIcon className="h-4 w-4 mr-2" />
                                Resolve
                              </button>
                              <button
                                onClick={() => handleSnooze(alert.id)}
                                disabled={snoozeAlertMutation.isLoading}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                              >
                                <BellSlashIcon className="h-4 w-4 mr-2" />
                                Snooze
                              </button>
                              <button
                                onClick={() => handleSuppress(alert.id)}
                                disabled={suppressAlertMutation.isLoading}
                                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-lg hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                              >
                                <NoSymbolIcon className="h-4 w-4 mr-2" />
                                Suppress
                              </button>
                            </>
                          ) : (
                            <span className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg">
                              <UserIcon className="h-4 w-4 mr-2" />
                              Claimed by {alert.claimedBy?.firstName}
                            </span>
                          )}
                        </>
                      ) : (
                        // User is admin without clinician access - show informative message
                        <div className="inline-flex items-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                          <div className="text-sm">
                            <span className="font-medium text-blue-900">Admin View Only</span>
                            <span className="text-blue-700 ml-1">- Clinical actions require a clinician account</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex items-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700">
                Page {page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.pages}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={handleTaskModalClose}
        prefillData={taskPrefillData}
      />

      {/* Resolution Modal (Critical Fixes #1, #2, #3, #4) */}
      <ResolutionModal
        isOpen={isResolutionModalOpen}
        onClose={handleResolutionModalClose}
        onSubmit={handleResolutionSubmit}
        alert={selectedAlertForResolution}
        isSubmitting={resolveAlertMutation.isLoading}
        activeTimerMinutes={
          selectedAlertForResolution?.patient?.id
            ? timers?.find(t => t.patientId === selectedAlertForResolution.patient.id)?.elapsedTime?.minutes
            : undefined
        }
      />

      {/* Snooze Modal (Phase 1b) */}
      <SnoozeModal
        isOpen={isSnoozeModalOpen}
        onClose={handleSnoozeModalClose}
        onSubmit={handleSnoozeSubmit}
        alert={selectedAlertForSnooze}
        isSubmitting={snoozeAlertMutation.isLoading}
      />

      {/* Suppress Modal (Phase 1b) */}
      <SuppressModal
        isOpen={isSuppressModalOpen}
        onClose={handleSuppressModalClose}
        onSubmit={handleSuppressSubmit}
        alert={selectedAlertForSuppress}
        isSubmitting={suppressAlertMutation.isLoading}
      />

      {/* Patient Context Panel */}
      <PatientContextPanel
        isOpen={isPatientContextOpen}
        onClose={() => setIsPatientContextOpen(false)}
        patientId={selectedPatientId}
        clinicianId={selectedClinicianId}
        days={30}
      />
    </div>
  )
}
