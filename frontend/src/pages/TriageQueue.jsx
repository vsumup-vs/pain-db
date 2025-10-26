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
  NoSymbolIcon,
  DocumentTextIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import TaskModal from '../components/TaskModal'
import ResolutionModal from '../components/ResolutionModal'
import SnoozeModal from '../components/SnoozeModal'
import SuppressModal from '../components/SuppressModal'
import PatientContextPanel from '../components/PatientContextPanel'
import TimerWidget from '../components/TimerWidget'
import AssessmentModal from '../components/AssessmentModal'
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
  const limit = 50 // Increased from 20 for better triage workflow visibility

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
  const [selectedAlert, setSelectedAlert] = useState(null)

  // Multi-select state for bulk actions (Phase 1b)
  const [selectedAlerts, setSelectedAlerts] = useState(new Set())
  const [isBulkActionMode, setIsBulkActionMode] = useState(false)

  // Bulk action modal states
  const [isBulkResolveModalOpen, setIsBulkResolveModalOpen] = useState(false)
  const [isBulkSnoozeModalOpen, setIsBulkSnoozeModalOpen] = useState(false)
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false)
  const [selectedClinicianForBulkAssign, setSelectedClinicianForBulkAssign] = useState('')

  // Force claim modal state (Phase 1b - Option 3 Hybrid)
  const [isForceClaimModalOpen, setForceClaimModalOpen] = useState(false)
  const [selectedAlertForForceClaim, setSelectedAlertForForceClaim] = useState(null)
  const [forceClaimReason, setForceClaimReason] = useState('')

  // Assessment modal state
  const [selectedAssessmentForModal, setSelectedAssessmentForModal] = useState(null)
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false)

  const queryClient = useQueryClient()

  // Fetch current user profile to determine clinical access
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: api.getCurrentUserProfile
  })

  // Fetch clinicians for bulk assign dropdown
  const { data: cliniciansData, isLoading: cliniciansLoading } = useQuery({
    queryKey: ['clinicians'],
    queryFn: () => api.getClinicians({ limit: 100 }),
    enabled: isBulkAssignModalOpen // Only fetch when needed
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

  // Fetch all pending assessments for patients in queue
  const { data: allPendingAssessmentsData } = useQuery({
    queryKey: ['allPendingAssessments'],
    queryFn: () => api.getScheduledAssessments({ status: 'PENDING,OVERDUE' }),
    refetchInterval: 120000 // Refresh every 2 minutes
  })

  // Create map of pending assessments by patientId for quick lookup
  const pendingAssessmentsMap = new Map()
  allPendingAssessmentsData?.data?.forEach(assessment => {
    const patientId = assessment.patientId
    if (!pendingAssessmentsMap.has(patientId)) {
      pendingAssessmentsMap.set(patientId, [])
    }
    pendingAssessmentsMap.get(patientId).push(assessment)
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

  // Force claim alert mutation (Phase 1b - Option 3 Hybrid)
  const forceClaimAlertMutation = useMutation({
    mutationFn: ({ alertId, reason }) => api.forceClaimAlert(alertId, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries(['triageQueue'])
      toast.success('Alert force claimed successfully')
      setForceClaimModalOpen(false)
      setForceClaimReason('')
      setSelectedAlertForForceClaim(null)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to force claim alert')
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

  const handleForceClaim = (alert) => {
    // Open modal to ask for reason
    setSelectedAlertForForceClaim(alert)
    setForceClaimModalOpen(true)
  }

  const handleForceClaimSubmit = () => {
    if (!forceClaimReason || forceClaimReason.trim().length < 10) {
      toast.error('Please provide a reason (minimum 10 characters)')
      return
    }

    forceClaimAlertMutation.mutate({
      alertId: selectedAlertForForceClaim.id,
      reason: forceClaimReason.trim()
    })
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

    console.log('Resolution submit - Patient ID:', patientId)
    console.log('All timers:', timers)

    const activeTimer = timers?.find(t => t.patientId === patientId)
    console.log('Found active timer:', activeTimer)

    // If there's an active timer, stop it before resolving the alert
    if (activeTimer && patientId) {
      console.log('Attempting to stop timer for patient:', patientId)
      try {
        // Stop the timer with the resolution data
        // Only include cptCode if it has a value (backend rejects null)
        const stopTimerPayload = {
          patientId,
          notes: resolutionData.resolutionNotes,
          billable: true
        }
        if (resolutionData.cptCode) {
          stopTimerPayload.cptCode = resolutionData.cptCode
        }
        await api.stopTimer(stopTimerPayload)

        console.log('Timer stopped successfully')

        // Invalidate timer queries to refresh the UI
        queryClient.invalidateQueries(['active-timer', patientId])
        queryClient.invalidateQueries(['active-timers-all'])
      } catch (error) {
        console.error('Error stopping timer:', error)
        // Continue with resolution even if timer stop fails
      }
    } else {
      console.log('No active timer found, skipping timer stop')
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

  const handleViewPatientContext = (patientId, clinicianId, alert = null) => {
    setSelectedPatientId(patientId)
    setSelectedClinicianId(clinicianId)
    setSelectedAlert(alert)
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

  // Multi-select handlers (Phase 1b - Bulk Actions)
  const toggleAlertSelection = (alertId) => {
    const newSelected = new Set(selectedAlerts)
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId)
    } else {
      newSelected.add(alertId)
    }
    setSelectedAlerts(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedAlerts.size === filteredAlerts.length) {
      setSelectedAlerts(new Set())
    } else {
      setSelectedAlerts(new Set(filteredAlerts.map(a => a.id)))
    }
  }

  const clearSelection = () => {
    setSelectedAlerts(new Set())
    setIsBulkActionMode(false)
  }

  // Bulk action handlers (Phase 1b - Bulk Actions)
  const handleBulkAcknowledge = async () => {
    if (selectedAlerts.size === 0) return

    const confirmed = window.confirm(
      `Are you sure you want to acknowledge ${selectedAlerts.size} alert(s)?`
    )

    if (!confirmed) return

    try {
      await api.bulkAlertActions('acknowledge', Array.from(selectedAlerts))
      queryClient.invalidateQueries(['triage-queue'])
      clearSelection()
      alert(`Successfully acknowledged ${selectedAlerts.size} alert(s)`)
    } catch (error) {
      console.error('Bulk acknowledge failed:', error)
      alert('Failed to acknowledge alerts. Please try again.')
    }
  }

  const handleBulkResolve = () => {
    if (selectedAlerts.size === 0) return
    setIsBulkResolveModalOpen(true)
  }

  const handleBulkResolveSubmit = async (resolutionData) => {
    try {
      await api.bulkAlertActions('resolve', Array.from(selectedAlerts), resolutionData)
      queryClient.invalidateQueries(['triageQueue'])
      setIsBulkResolveModalOpen(false)
      clearSelection()
      toast.success(`Successfully resolved ${selectedAlerts.size} alert(s)`)
    } catch (error) {
      console.error('Bulk resolve failed:', error)
      toast.error('Failed to resolve alerts. Please try again.')
    }
  }

  const handleBulkSnooze = () => {
    if (selectedAlerts.size === 0) return
    setIsBulkSnoozeModalOpen(true)
  }

  const handleBulkSnoozeSubmit = async (snoozeData) => {
    try {
      await api.bulkAlertActions('snooze', Array.from(selectedAlerts), snoozeData)
      queryClient.invalidateQueries(['triageQueue'])
      setIsBulkSnoozeModalOpen(false)
      clearSelection()
      toast.success(`Successfully snoozed ${selectedAlerts.size} alert(s)`)
    } catch (error) {
      console.error('Bulk snooze failed:', error)
      toast.error('Failed to snooze alerts. Please try again.')
    }
  }

  const handleBulkAssign = () => {
    if (selectedAlerts.size === 0) return
    setIsBulkAssignModalOpen(true)
  }

  const handleBulkAssignSubmit = async () => {
    if (!selectedClinicianForBulkAssign) {
      toast.error('Please select a clinician')
      return
    }

    try {
      // Find the clinician to get their associated user ID
      const selectedClinician = cliniciansData?.data?.find(
        c => c.id === selectedClinicianForBulkAssign
      )

      if (!selectedClinician || !selectedClinician.userId) {
        toast.error('Selected clinician does not have a user account')
        return
      }

      await api.bulkAlertActions('assign', Array.from(selectedAlerts), {
        assignToId: selectedClinician.userId
      })
      queryClient.invalidateQueries(['triageQueue'])
      setIsBulkAssignModalOpen(false)
      setSelectedClinicianForBulkAssign('')
      clearSelection()
      toast.success(`Successfully assigned ${selectedAlerts.size} alert(s) to ${selectedClinician.firstName} ${selectedClinician.lastName}`)
    } catch (error) {
      console.error('Bulk assign failed:', error)
      toast.error('Failed to assign alerts. Please try again.')
    }
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

              // Extract enrollmentId from alert data for contextual CPT code selection
              const enrollmentId = alert?.data?.enrollmentId

              return (
                <TimerWidget
                  key={timerData.patientId}
                  patientId={timerData.patientId}
                  patientName={patientName}
                  enrollmentId={enrollmentId}
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

        {/* Multi-Select Toolbar (Phase 1b - Bulk Actions) */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg border-2 border-indigo-200 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setIsBulkActionMode(!isBulkActionMode)
                  if (isBulkActionMode) {
                    clearSelection()
                  }
                }}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  isBulkActionMode
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-white text-indigo-600 border-2 border-indigo-600 hover:bg-indigo-50'
                }`}
              >
                {isBulkActionMode ? 'Exit Select Mode' : 'Select Mode'}
              </button>

              {isBulkActionMode && (
                <>
                  <label className="flex items-center space-x-3 bg-white px-4 py-3 rounded-lg border-2 border-indigo-300 cursor-pointer hover:bg-indigo-50 transition-all">
                    <input
                      type="checkbox"
                      checked={selectedAlerts.size === filteredAlerts.length && filteredAlerts.length > 0}
                      onChange={toggleSelectAll}
                      className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="font-medium text-gray-700">Select All</span>
                  </label>

                  <span className="bg-white px-4 py-3 rounded-lg border-2 border-indigo-300 font-semibold text-indigo-700">
                    {selectedAlerts.size} selected
                  </span>
                </>
              )}
            </div>

            {isBulkActionMode && selectedAlerts.size > 0 && (
              <div className="text-sm text-indigo-700 font-medium">
                <span className="bg-white px-3 py-1.5 rounded-full border border-indigo-300">
                  📋 Bulk actions available for {selectedAlerts.size} alert{selectedAlerts.size !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bulk Action Toolbar (Phase 1b - Action Buttons) */}
        {isBulkActionMode && selectedAlerts.size > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl shadow-lg border-2 border-green-200 p-6 mb-8">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold text-gray-800">
                    Bulk Actions
                  </span>
                  <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {selectedAlerts.size} selected
                  </span>
                </div>
                <button
                  onClick={clearSelection}
                  className="text-gray-600 hover:text-gray-800 font-medium text-sm underline"
                >
                  Clear Selection
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Bulk Acknowledge */}
                <button
                  onClick={() => handleBulkAcknowledge()}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Acknowledge</span>
                </button>

                {/* Bulk Resolve */}
                <button
                  onClick={() => handleBulkResolve()}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Resolve</span>
                </button>

                {/* Bulk Snooze */}
                <button
                  onClick={() => handleBulkSnooze()}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Snooze</span>
                </button>

                {/* Bulk Assign */}
                <button
                  onClick={() => handleBulkAssign()}
                  className="flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Assign</span>
                </button>
              </div>
            </div>
          </div>
        )}

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
                      {/* Multi-select checkbox (Phase 1b - Bulk Actions) */}
                      {isBulkActionMode && (
                        <input
                          type="checkbox"
                          checked={selectedAlerts.has(alert.id)}
                          onChange={() => toggleAlertSelection(alert.id)}
                          className="h-6 w-6 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
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
                      {alert.computed.totalTimeLoggedMinutes > 0 && (
                        <span className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          Time logged: {alert.computed.totalTimeLoggedMinutes} min
                        </span>
                      )}
                      {pendingAssessmentsMap.get(alert.patientId)?.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const assessments = pendingAssessmentsMap.get(alert.patientId)
                            setSelectedAssessmentForModal(assessments[0])
                            setIsAssessmentModalOpen(true)
                          }}
                          className="inline-flex items-center px-4 py-2 text-sm font-semibold rounded-full bg-orange-100 text-orange-800 border border-orange-300 hover:bg-orange-200 transition-colors cursor-pointer"
                          title="Click to start pending assessment"
                        >
                          <BellAlertIcon className="h-4 w-4 mr-1" />
                          {pendingAssessmentsMap.get(alert.patientId).length} pending assessment{pendingAssessmentsMap.get(alert.patientId).length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Patient Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">Patient</p>
                      <button
                        onClick={() => handleViewPatientContext(alert.patient?.id, alert.clinician?.id, alert)}
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-800 rounded px-2 py-1 -ml-2 transition-colors duration-200 group"
                        title="View patient context & clinical data"
                      >
                        {alert.patient?.firstName} {alert.patient?.lastName}
                        <ChartBarIcon className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                      </button>
                      {alert.patient?.phone && (
                        <a href={`tel:${alert.patient.phone}`} className="block text-xs text-blue-600 hover:underline ml-2">
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
                            <>
                              <span className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg">
                                <UserIcon className="h-4 w-4 mr-2" />
                                Claimed by {alert.claimedBy?.firstName}
                              </span>
                              {/* Force claim button for supervisors/admins (Phase 1b - Option 3 Hybrid) */}
                              {(currentUser?.role === 'ORG_ADMIN' || currentUser?.role === 'SUPERVISOR') && (
                                <button
                                  onClick={() => handleForceClaim(alert)}
                                  disabled={forceClaimAlertMutation.isLoading}
                                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium rounded-lg hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
                                  title="Supervisor override: Force claim this alert"
                                >
                                  <UserIcon className="h-4 w-4 mr-2" />
                                  Force Claim
                                </button>
                              )}
                            </>
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
        enrollmentId={selectedAlertForResolution?.data?.enrollmentId}
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

      {/* Force Claim Modal (Phase 1b - Option 3 Hybrid) */}
      {isForceClaimModalOpen && selectedAlertForForceClaim && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Force Claim Alert</h3>
                <button
                  onClick={() => {
                    setForceClaimModalOpen(false)
                    setForceClaimReason('')
                    setSelectedAlertForForceClaim(null)
                  }}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>Warning:</strong> This alert is currently claimed by{' '}
                        <strong>{selectedAlertForForceClaim.claimedBy?.firstName} {selectedAlertForForceClaim.claimedBy?.lastName}</strong>.
                        Force claiming will reassign it to you and notify the previous claimer.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient: {selectedAlertForForceClaim.patient?.firstName} {selectedAlertForForceClaim.patient?.lastName}
                  </label>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert: {selectedAlertForForceClaim.rule?.name}
                  </label>
                </div>

                <div>
                  <label htmlFor="force-claim-reason" className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Force Claim <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="force-claim-reason"
                    rows={4}
                    className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Explain why you need to force claim this alert (minimum 10 characters)..."
                    value={forceClaimReason}
                    onChange={(e) => setForceClaimReason(e.target.value)}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {forceClaimReason.length}/10 characters minimum
                  </p>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleForceClaimSubmit}
                    disabled={forceClaimAlertMutation.isLoading || forceClaimReason.trim().length < 10}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {forceClaimAlertMutation.isLoading ? 'Processing...' : 'Force Claim Alert'}
                  </button>
                  <button
                    onClick={() => {
                      setForceClaimModalOpen(false)
                      setForceClaimReason('')
                      setSelectedAlertForForceClaim(null)
                    }}
                    disabled={forceClaimAlertMutation.isLoading}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Resolve Modal */}
      <ResolutionModal
        isOpen={isBulkResolveModalOpen}
        onClose={() => setIsBulkResolveModalOpen(false)}
        onSubmit={handleBulkResolveSubmit}
        alert={null}
        isBulkMode={true}
        bulkCount={selectedAlerts.size}
      />

      {/* Bulk Snooze Modal */}
      <SnoozeModal
        isOpen={isBulkSnoozeModalOpen}
        onClose={() => setIsBulkSnoozeModalOpen(false)}
        onSubmit={handleBulkSnoozeSubmit}
        isBulkMode={true}
        bulkCount={selectedAlerts.size}
      />

      {/* Bulk Assign Modal */}
      {isBulkAssignModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium mb-4">
              Assign {selectedAlerts.size} Alert(s) to Clinician
            </h3>
            <select
              value={selectedClinicianForBulkAssign}
              onChange={(e) => setSelectedClinicianForBulkAssign(e.target.value)}
              className="w-full border rounded p-2 mb-4"
              disabled={cliniciansLoading}
            >
              <option value="">
                {cliniciansLoading ? 'Loading clinicians...' : 'Select Clinician...'}
              </option>
              {!cliniciansLoading && cliniciansData?.data?.map(clinician => (
                <option key={clinician.id} value={clinician.id}>
                  {clinician.firstName} {clinician.lastName} - {clinician.specialization}
                </option>
              ))}
            </select>
            {/* Debug info */}
            {!cliniciansLoading && (
              <p className="text-xs text-gray-500 mb-2">
                {cliniciansData?.data?.length || 0} clinicians loaded
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleBulkAssignSubmit}
                disabled={!selectedClinicianForBulkAssign}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Assign
              </button>
              <button
                onClick={() => {
                  setIsBulkAssignModalOpen(false)
                  setSelectedClinicianForBulkAssign('')
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient Context Panel */}
      <PatientContextPanel
        isOpen={isPatientContextOpen}
        onClose={() => setIsPatientContextOpen(false)}
        patientId={selectedPatientId}
        clinicianId={selectedClinicianId}
        alert={selectedAlert}
        days={30}
      />

      {/* Assessment Modal */}
      <AssessmentModal
        scheduledAssessment={selectedAssessmentForModal}
        isOpen={isAssessmentModalOpen}
        onClose={() => {
          setIsAssessmentModalOpen(false)
          setSelectedAssessmentForModal(null)
        }}
        onSuccess={() => {
          queryClient.invalidateQueries(['triageQueue'])
          queryClient.invalidateQueries(['allPendingAssessments'])
          toast.success('Assessment completed successfully')
        }}
      />
    </div>
  )
}
