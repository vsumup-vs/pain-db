import React, { Fragment, useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  XMarkIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  HeartIcon,
  BeakerIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
  DocumentTextIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import TimerWidget from './TimerWidget'
import AssessmentModal from './AssessmentModal'

export default function PatientContextPanel({ isOpen, onClose, patientId, clinicianId, alert = null, days = 30 }) {
  const queryClient = useQueryClient()
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false)

  // Fetch patient context data
  const { data: contextData, isLoading } = useQuery({
    queryKey: ['patientContext', patientId, days],
    queryFn: () => api.getPatientContext(patientId, { days }),
    enabled: isOpen && !!patientId,
    refetchInterval: 60000 // Refresh every minute when open
  })

  // Fetch pending assessments
  const { data: pendingAssessmentsData } = useQuery({
    queryKey: ['pendingAssessments', patientId],
    queryFn: () => api.getPendingAssessmentsForPatient(patientId),
    enabled: isOpen && !!patientId,
    refetchInterval: 60000
  })

  const pendingAssessments = pendingAssessmentsData?.data || []

  const context = contextData?.data || {}
  const patient = context.patient || {}
  const vitals = context.vitals || {}
  const medications = context.medications || {}
  const conditions = context.conditions || []
  const alerts = context.alerts || {}
  const assessments = context.assessments || {}
  const summary = context.summary || {}

  // Debug: Log vitals data structure
  React.useEffect(() => {
    if (isOpen && vitals) {
      console.log('PatientContextPanel - vitals data:', {
        hasTrends: !!vitals.trends,
        trendsKeys: vitals.trends ? Object.keys(vitals.trends) : [],
        hasLastReadings: !!vitals.lastReadings,
        lastReadingsKeys: vitals.lastReadings ? Object.keys(vitals.lastReadings) : []
      });

      if (vitals.trends) {
        console.log('vitals.trends:', vitals.trends);
      }
    }
  }, [isOpen, vitals]);

  // Find active enrollment with billing program for CPT code context
  const billingEnrollment = conditions.find(c => c.status === 'ACTIVE' && c.billingProgramId)
  const enrollmentId = billingEnrollment?.enrollmentId

  // Debug: Log conditions and enrollment data
  React.useEffect(() => {
    if (isOpen) {
      console.log('PatientContextPanel - conditions:', conditions);
      console.log('PatientContextPanel - billingEnrollment:', billingEnrollment);
      console.log('PatientContextPanel - enrollmentId:', enrollmentId);
    }
  }, [isOpen, conditions, billingEnrollment, enrollmentId]);

  // Calculate adherence badge color
  const getAdherenceBadgeColor = (percentage) => {
    if (percentage === null) return 'bg-gray-100 text-gray-800'
    if (percentage >= 90) return 'bg-green-100 text-green-800'
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  // Format datetime
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  // Get time ago
  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  // Calculate trend direction from readings array
  const calculateTrendDirection = (readings) => {
    if (!readings || readings.length < 3) return 'stable'

    // Sort readings by date (newest first)
    const sortedReadings = [...readings].sort((a, b) =>
      new Date(b.recordedAt) - new Date(a.recordedAt)
    )

    // Take recent readings (last 7 days or half of available data, whichever is smaller)
    const recentCount = Math.min(Math.ceil(sortedReadings.length / 2),
      sortedReadings.filter(r => {
        const daysDiff = (new Date() - new Date(r.recordedAt)) / (1000 * 60 * 60 * 24)
        return daysDiff <= 7
      }).length
    )

    if (recentCount < 2) return 'stable'

    const recentReadings = sortedReadings.slice(0, recentCount)
    const olderReadings = sortedReadings.slice(recentCount)

    if (olderReadings.length === 0) return 'stable'

    // Calculate averages
    const recentAvg = recentReadings.reduce((sum, r) => {
      const val = typeof r.value === 'object' ? parseFloat(r.value.value || 0) : parseFloat(r.value || 0)
      return sum + val
    }, 0) / recentReadings.length

    const olderAvg = olderReadings.reduce((sum, r) => {
      const val = typeof r.value === 'object' ? parseFloat(r.value.value || 0) : parseFloat(r.value || 0)
      return sum + val
    }, 0) / olderReadings.length

    // Calculate percent change
    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100

    // Threshold for considering significant change (5%)
    if (Math.abs(percentChange) < 5) return 'stable'

    return percentChange > 0 ? 'increasing' : 'decreasing'
  }

  // Get trend indicator with clinical context
  const getTrendIndicator = (metricKey, direction, alertCategory) => {
    if (direction === 'stable') {
      return {
        arrow: '→',
        color: 'text-gray-500',
        label: 'Stable'
      }
    }

    // Determine if increasing is clinically good or bad based on metric type
    const lowerIsBetter = [
      'pain_level', 'pain_intensity', 'pain_interference',
      'systolic_bp', 'diastolic_bp', 'blood_pressure',
      'blood_glucose', 'glucose', 'weight',
      'heart_rate', 'respiratory_rate',
      'fatigue', 'distress', 'anxiety', 'depression'
    ]

    const higherIsBetter = [
      'oxygen_saturation', 'o2_sat', 'spo2',
      'activity_level', 'sleep_quality',
      'peak_flow', 'fev1'
    ]

    const metricLower = metricKey.toLowerCase()
    const isLowerBetter = lowerIsBetter.some(key => metricLower.includes(key))
    const isHigherBetter = higherIsBetter.some(key => metricLower.includes(key))

    // Also use alert category context if available
    if (alertCategory === 'Pain' && metricLower.includes('pain')) {
      // For pain metrics, decreasing is good
      if (direction === 'decreasing') {
        return { arrow: '↘', color: 'text-green-600', label: 'Improving' }
      } else {
        return { arrow: '↗', color: 'text-red-600', label: 'Worsening' }
      }
    }

    if (alertCategory === 'Cardiovascular' && (metricLower.includes('bp') || metricLower.includes('heart'))) {
      // For BP and heart rate, depends on if it's high or low
      if (direction === 'decreasing') {
        return { arrow: '↘', color: 'text-green-600', label: 'Improving' }
      } else {
        return { arrow: '↗', color: 'text-red-600', label: 'Worsening' }
      }
    }

    // Default logic based on metric type
    if (isLowerBetter) {
      if (direction === 'decreasing') {
        return { arrow: '↘', color: 'text-green-600', label: 'Improving' }
      } else {
        return { arrow: '↗', color: 'text-red-600', label: 'Worsening' }
      }
    }

    if (isHigherBetter) {
      if (direction === 'increasing') {
        return { arrow: '↗', color: 'text-green-600', label: 'Improving' }
      } else {
        return { arrow: '↘', color: 'text-red-600', label: 'Worsening' }
      }
    }

    // Neutral trend (direction unknown)
    return {
      arrow: direction === 'increasing' ? '↗' : '↘',
      color: 'text-blue-500',
      label: direction === 'increasing' ? 'Increasing' : 'Decreasing'
    }
  }

  return (
    <>
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-300"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-200"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-4xl">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <Dialog.Title className="text-xl font-semibold text-white">
                          Patient Context
                        </Dialog.Title>
                        <button
                          type="button"
                          className="rounded-md text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white"
                          onClick={onClose}
                        >
                          <span className="sr-only">Close panel</span>
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>

                      {/* Patient Header */}
                      {!isLoading && patient && (
                        <div className="mt-3">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              <div className="h-12 w-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-xl font-bold text-white truncate">
                                {patient.firstName} {patient.lastName}
                              </h3>
                              <p className="text-sm text-blue-100">
                                {patient.age ? `${patient.age} years old` : ''} {patient.gender ? `• ${patient.gender}` : ''}
                              </p>
                              <p className="text-xs text-blue-100 mt-1">
                                MRN: {patient.medicalRecordNumber || 'N/A'}
                              </p>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {patient.phone && (
                              <a
                                href={`tel:${patient.phone}`}
                                className="flex items-center px-3 py-2 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all duration-200"
                              >
                                <PhoneIcon className="h-4 w-4 text-white mr-2" />
                                <span className="text-sm text-white truncate">{patient.phone}</span>
                              </a>
                            )}
                            {patient.email && (
                              <a
                                href={`mailto:${patient.email}`}
                                className="flex items-center px-3 py-2 bg-white bg-opacity-10 rounded-lg hover:bg-opacity-20 transition-all duration-200"
                              >
                                <EnvelopeIcon className="h-4 w-4 text-white mr-2" />
                                <span className="text-sm text-white truncate">{patient.email}</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 px-4 py-3 sm:px-6">
                      {isLoading ? (
                        <div className="space-y-3">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                              <div className="h-20 bg-gray-200 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Alert-Aware Context Section */}
                          {alert && (
                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm">
                              {/* Alert Header */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                  <h3 className="text-sm font-bold text-gray-900 flex items-center">
                                    <ExclamationTriangleIcon className="h-5 w-5 text-blue-600 mr-2" />
                                    Alert Context: {alert.rule?.name || 'Active Alert'}
                                  </h3>
                                  <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                      alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                                      alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                      alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-green-100 text-green-800'
                                    }`}>
                                      {alert.severity}
                                    </span>
                                    {alert.riskScore && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                                        Risk Score: {alert.riskScore.toFixed(1)}
                                      </span>
                                    )}
                                    {alert.rule?.category && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                        {alert.rule.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Similar Past Alerts with Resolutions */}
                              {alerts.recent && alerts.recent.filter(a =>
                                a.ruleId === alert.ruleId &&
                                a.status === 'RESOLVED' &&
                                a.id !== alert.id
                              ).length > 0 && (
                                <div className="mb-4 bg-white rounded-lg p-3 border border-blue-200">
                                  <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                    <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                                    Similar Past Alerts (Same Rule)
                                  </h4>
                                  <div className="space-y-2">
                                    {alerts.recent
                                      .filter(a =>
                                        a.ruleId === alert.ruleId &&
                                        a.status === 'RESOLVED' &&
                                        a.id !== alert.id
                                      )
                                      .slice(0, 3)
                                      .map((pastAlert) => (
                                        <div key={pastAlert.id} className="bg-gray-50 rounded p-2 text-xs">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <p className="font-medium text-gray-800">{pastAlert.message}</p>
                                              {pastAlert.resolutionNotes && (
                                                <p className="text-gray-600 mt-1">
                                                  <span className="font-semibold">Resolution:</span> {pastAlert.resolutionNotes}
                                                </p>
                                              )}
                                              {pastAlert.resolvedBy && (
                                                <p className="text-gray-500 mt-1">
                                                  Resolved by: {pastAlert.resolvedBy.firstName} {pastAlert.resolvedBy.lastName}
                                                </p>
                                              )}
                                            </div>
                                            <span className="text-gray-400 ml-2">{getTimeAgo(pastAlert.resolvedAt)}</span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}

                              {/* Relevant Vitals Based on Alert Category */}
                              {alert.rule?.category && vitals.lastReadings && Object.keys(vitals.lastReadings).length > 0 && (
                                <div className="bg-white rounded-lg p-3 border border-blue-200">
                                  <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center">
                                    <ChartBarIcon className="h-4 w-4 text-blue-500 mr-1" />
                                    Relevant Vitals for {alert.rule.category}
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(vitals.lastReadings)
                                      .filter(([key]) => {
                                        // Filter vitals based on alert category
                                        const category = alert.rule.category.toLowerCase()
                                        if (category.includes('cardiovascular') || category.includes('hypertension')) {
                                          return key.toLowerCase().includes('blood') || key.toLowerCase().includes('heart') || key.toLowerCase().includes('bp')
                                        }
                                        if (category.includes('diabetes') || category.includes('glucose')) {
                                          return key.toLowerCase().includes('glucose') || key.toLowerCase().includes('sugar')
                                        }
                                        if (category.includes('respiratory') || category.includes('copd')) {
                                          return key.toLowerCase().includes('o2') || key.toLowerCase().includes('oxygen') || key.toLowerCase().includes('respiratory')
                                        }
                                        if (category.includes('pain')) {
                                          return key.toLowerCase().includes('pain')
                                        }
                                        return true // Show all if no specific filter
                                      })
                                      .slice(0, 4)
                                      .map(([key, reading]) => (
                                        <div key={key} className="bg-gray-50 rounded p-2">
                                          <div className="text-xs text-gray-600">{reading.displayName}</div>
                                          <div className="flex items-baseline justify-between">
                                            <div className="text-sm font-bold text-gray-900">
                                              {typeof reading.value === 'object' ? JSON.stringify(reading.value) : reading.value}
                                              {reading.unit && <span className="text-xs text-gray-500 ml-1">{reading.unit}</span>}
                                            </div>
                                            <span className="text-xs text-gray-400">{getTimeAgo(reading.lastReading)}</span>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Timer Widget */}
                          {patient.id && (
                            <TimerWidget
                              patientId={patientId}
                              patientName={`${patient.firstName} ${patient.lastName}`}
                              enrollmentId={enrollmentId}
                              onTimeStopped={() => queryClient.invalidateQueries(['patientContext', patientId, days])}
                            />
                          )}

                          {/* Summary Cards */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                              <HeartIcon className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                              <div className="text-xl font-bold text-blue-900">{summary.totalActiveConditions || 0}</div>
                              <div className="text-xs text-blue-600">Conditions</div>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-center">
                              <BeakerIcon className="h-5 w-5 text-purple-600 mx-auto mb-1" />
                              <div className="text-xl font-bold text-purple-900">{summary.totalActiveMedications || 0}</div>
                              <div className="text-xs text-purple-600">Medications</div>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-center">
                              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mx-auto mb-1" />
                              <div className="text-xl font-bold text-red-900">{summary.totalActiveAlerts || 0}</div>
                              <div className="text-xs text-red-600">Alerts</div>
                            </div>
                          </div>

                          {/* Last Reading */}
                          {summary.lastObservation && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                                  <span className="text-sm font-medium text-gray-700">Last Reading</span>
                                </div>
                                <span className="text-sm text-gray-600">{getTimeAgo(summary.lastObservation)}</span>
                              </div>
                            </div>
                          )}

                          {/* Active Alerts */}
                          {alerts.recent && alerts.recent.filter(a => a.status !== 'RESOLVED').length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                                Active Alerts ({alerts.totalActive || 0})
                              </h4>
                              <div className="space-y-2">
                                {alerts.recent.filter(a => a.status !== 'RESOLVED').slice(0, 5).map((alert) => {
                                  // Map alert category to metric key to show trend
                                  const getCategoryMetricKey = (category) => {
                                    const categoryMap = {
                                      'Pain': 'pain_level_nrs',
                                      'Cardiovascular': ['systolic_bp', 'heart_rate'],
                                      'Respiratory': 'o2_saturation',
                                      'Metabolic': 'blood_glucose'
                                    };
                                    return categoryMap[category];
                                  };

                                  // Get trend for alert's metric
                                  const metricKey = getCategoryMetricKey(alert.rule.category);
                                  let alertTrend = null;

                                  if (metricKey && vitals.trends) {
                                    // Handle single or multiple metric keys
                                    const keys = Array.isArray(metricKey) ? metricKey : [metricKey];
                                    for (const key of keys) {
                                      const trendData = vitals.trends[key];
                                      if (trendData?.readings && trendData.readings.length >= 3) {
                                        const direction = calculateTrendDirection(trendData.readings);
                                        alertTrend = getTrendIndicator(key, direction, alert.rule.category);
                                        break;
                                      }
                                    }
                                  }

                                  return (
                                    <div
                                      key={alert.id}
                                      className={`border-l-4 p-3 rounded-r-lg ${
                                        alert.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                                        alert.severity === 'HIGH' ? 'border-orange-500 bg-orange-50' :
                                        alert.severity === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
                                        'border-green-500 bg-green-50'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2">
                                            <p className="text-sm font-medium text-gray-900">{alert.rule.name}</p>
                                            {alertTrend && (
                                              <span
                                                className={`text-lg font-bold ${alertTrend.color}`}
                                                title={`${alertTrend.label} trend`}
                                              >
                                                {alertTrend.arrow}
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-xs text-gray-600 mt-1">{alert.message}</p>
                                          <p className="text-xs text-gray-500 mt-1">{getTimeAgo(alert.triggeredAt)}</p>
                                        </div>
                                        {alert.riskScore && (
                                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                                            Risk: {alert.riskScore.toFixed(1)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Vitals with Trends */}
                          {vitals.lastReadings && Object.keys(vitals.lastReadings).length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                                <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
                                Recent Vitals (30-Day Trends)
                              </h4>
                              <div className="grid grid-cols-3 gap-2">
                                {Object.entries(vitals.lastReadings).slice(0, 6).map(([key, reading]) => {
                                  // Calculate trend from historical data if available
                                  const trendData = vitals.trends?.[key]

                                  // Debug logging
                                  console.log(`Vital ${key}:`, {
                                    hasTrendData: !!trendData,
                                    readingsCount: trendData?.readings?.length || 0
                                  });

                                  const trendDirection = trendData?.readings
                                    ? calculateTrendDirection(trendData.readings)
                                    : 'stable'
                                  const trendIndicator = getTrendIndicator(key, trendDirection, alert?.rule?.category)

                                  console.log(`Trend for ${key}:`, {
                                    direction: trendDirection,
                                    indicator: trendIndicator
                                  });

                                  return (
                                    <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                                      <div className="text-xs text-gray-600 mb-1">{reading.displayName}</div>
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-baseline space-x-1">
                                          <div className="text-base font-bold text-gray-900">
                                            {typeof reading.value === 'object' ? JSON.stringify(reading.value) : reading.value}
                                            {reading.unit && <span className="text-sm text-gray-500 ml-1">{reading.unit}</span>}
                                          </div>
                                          {trendData?.readings && trendData.readings.length >= 3 ? (
                                            <span
                                              className={`text-xl font-bold ${trendIndicator.color}`}
                                              title={`${trendIndicator.label} (${trendData.readings.length} readings over ${days} days)`}
                                            >
                                              {trendIndicator.arrow}
                                            </span>
                                          ) : (
                                            <span className="text-xs text-gray-400" title="Insufficient data for trend">
                                              (No trend)
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-xs text-gray-500">{getTimeAgo(reading.lastReading)}</span>
                                      </div>
                                      {trendData?.readings && trendData.readings.length >= 3 && (
                                        <div className={`text-xs mt-1 font-medium ${trendIndicator.color}`}>
                                          {trendIndicator.label} ({trendData.readings.length} readings)
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Active Medications */}
                          {medications.active && medications.active.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                                <BeakerIcon className="h-5 w-5 text-purple-500 mr-2" />
                                Active Medications ({medications.totalActive})
                              </h4>
                              <div className="space-y-2">
                                {medications.active.map((med) => (
                                  <div key={med.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">
                                          {med.drug.name || med.drug.genericName}
                                        </p>
                                        <p className="text-xs text-gray-600 mt-1">
                                          {med.dosage} • {med.frequency} • {med.route}
                                        </p>
                                      </div>
                                      {med.adherencePercentage !== null && (
                                        <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getAdherenceBadgeColor(med.adherencePercentage)}`}>
                                          {med.adherencePercentage}%
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Active Conditions */}
                          {conditions && conditions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                                <HeartIcon className="h-5 w-5 text-red-500 mr-2" />
                                Active Conditions
                              </h4>
                              <div className="space-y-2">
                                {conditions.map((condition, index) => (
                                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                                    <p className="text-sm font-medium text-gray-900">{condition.program.name}</p>
                                    {condition.condition && (
                                      <p className="text-xs text-gray-600 mt-1">{condition.condition.name}</p>
                                    )}
                                    {condition.clinician && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        Clinician: {condition.clinician.firstName} {condition.clinician.lastName}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Pending Assessments */}
                          {pendingAssessments && pendingAssessments.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                <BellAlertIcon className="h-5 w-5 text-orange-500 mr-2" />
                                Pending Assessments ({pendingAssessments.length})
                              </h4>
                              <div className="space-y-2">
                                {pendingAssessments.map((assessment) => (
                                  <div key={assessment.id} className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{assessment.template?.name || 'Assessment'}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          Due: {formatDate(assessment.dueDate)}
                                        </p>
                                        {assessment.status === 'OVERDUE' && (
                                          <span className="inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                            Overdue
                                          </span>
                                        )}
                                        {assessment.priority && assessment.priority !== 'MEDIUM' && (
                                          <span className={`inline-flex mt-1 ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                                            assessment.priority === 'HIGH' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                                          }`}>
                                            {assessment.priority}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={() => {
                                          setSelectedAssessment(assessment)
                                          setIsAssessmentModalOpen(true)
                                        }}
                                        className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                                      >
                                        Start
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Recent Assessments */}
                          {assessments.recent && assessments.recent.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                <CalendarIcon className="h-5 w-5 text-green-500 mr-2" />
                                Recent Assessments
                              </h4>
                              <div className="space-y-2">
                                {assessments.recent.map((assessment) => (
                                  <div key={assessment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <div className="flex items-start justify-between">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{assessment.template.name}</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                          {assessment.completedAt ? formatDateTime(assessment.completedAt) : 'In Progress'}
                                        </p>
                                      </div>
                                      {assessment.completedAt && (
                                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>

      </Dialog>
    </Transition.Root>

    {/* Assessment Modal - Rendered outside Dialog to prevent z-index/overlay conflicts */}
    <AssessmentModal
      scheduledAssessment={selectedAssessment}
      isOpen={isAssessmentModalOpen}
      onClose={() => {
        setIsAssessmentModalOpen(false)
        setSelectedAssessment(null)
      }}
      onSuccess={() => {
        queryClient.invalidateQueries(['patientContext', patientId])
        queryClient.invalidateQueries(['pendingAssessments', patientId])
      }}
    />
  </>
  )
}
