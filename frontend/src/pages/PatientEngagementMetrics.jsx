import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  HeartIcon,
  BellAlertIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CalendarIcon
} from '@heroicons/react/24/outline'

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', isLoading }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600 border-blue-200',
    green: 'from-green-500 to-green-600 bg-green-50 text-green-600 border-green-200',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-600 border-purple-200',
    red: 'from-red-500 to-red-600 bg-red-50 text-red-600 border-red-200',
    yellow: 'from-yellow-500 to-yellow-600 bg-yellow-50 text-yellow-600 border-yellow-200',
  }

  return (
    <div className="relative overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 group">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-lg ${colorClasses[color].split(' ')[2]} ${colorClasses[color].split(' ')[3]} ${colorClasses[color].split(' ')[4]}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                {isLoading ? (
                  <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                  <>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} opacity-60 group-hover:opacity-100 transition-opacity duration-200`}></div>
    </div>
  )
}

const EngagementScoreBadge = ({ score }) => {
  let config
  if (score >= 80) {
    config = { bg: 'bg-green-100', text: 'text-green-800', label: 'Highly Engaged', icon: CheckCircleIcon }
  } else if (score >= 60) {
    config = { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Engaged', icon: HeartIcon }
  } else if (score >= 40) {
    config = { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Moderate', icon: ClockIcon }
  } else {
    config = { bg: 'bg-red-100', text: 'text-red-800', label: 'At Risk', icon: ExclamationTriangleIcon }
  }

  const Icon = config.icon

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${config.bg} ${config.text}`}>
      <Icon className="h-4 w-4 mr-1.5" />
      {config.label} ({Math.round(score)})
    </span>
  )
}

const EngagementTrendChart = ({ trendData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">7-Day Engagement Trend</h3>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!trendData || trendData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">7-Day Engagement Trend</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No trend data available
        </div>
      </div>
    )
  }

  const maxValue = Math.max(...trendData.map(d => d.engagementScore || 0), 100)
  const barHeight = (value) => value > 0 ? Math.max((value / maxValue) * 100, 5) : 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-blue-600" />
        7-Day Engagement Trend
      </h3>
      <div className="flex items-end justify-between h-64 space-x-2">
        {trendData.map((day, index) => {
          const score = day.engagementScore || 0
          let barColor = 'from-red-500 to-red-400'
          if (score >= 80) barColor = 'from-green-500 to-green-400'
          else if (score >= 60) barColor = 'from-blue-500 to-blue-400'
          else if (score >= 40) barColor = 'from-yellow-500 to-yellow-400'

          return (
            <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="w-full relative" style={{ height: `${barHeight(score)}%` }}>
                <div className={`absolute inset-0 bg-gradient-to-t ${barColor} rounded-t hover:opacity-80 transition-opacity cursor-pointer`}></div>
              </div>
              <div className="mt-2 text-center">
                <p className="text-xs font-semibold text-gray-700">{Math.round(score)}</p>
                <p className="text-xs text-gray-500">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
        <ChartBarIcon className="h-4 w-4 mr-1" />
        Engagement Score (0-100)
      </div>
    </div>
  )
}

const PatientList = ({ patients, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Patient Engagement Overview</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!patients || patients.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Patient Engagement Overview</h3>
        <div className="text-center py-8 text-gray-500">
          No patient engagement data available
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <UserGroupIcon className="h-5 w-5 mr-2 text-blue-600" />
        Top 20 Patients by Engagement
      </h3>
      <div className="space-y-3">
        {patients.map((patient, index) => (
          <div key={patient.patientId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <div className="flex items-center space-x-3 flex-1">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index < 3 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'
                }`}>
                  {index + 1}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{patient.patientName}</p>
                <div className="flex items-center space-x-4 mt-1 text-xs text-gray-600">
                  <span>📋 {Math.round(patient.assessmentAdherence?.adherenceRate || 0)}% assessments</span>
                  <span>💊 {Math.round(patient.medicationAdherence?.overallRate || 0)}% medications</span>
                  <span>📊 {patient.observationMetrics?.daysWithSubmissions || 0} days data</span>
                </div>
              </div>
              <div className="flex-shrink-0">
                <EngagementScoreBadge score={patient.engagementScore || 0} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const DetailedAdherenceMetrics = ({ patient, isLoading }) => {
  if (isLoading || !patient) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Adherence Details</h3>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <HeartIcon className="h-5 w-5 mr-2 text-purple-600" />
        Adherence Details - {patient.patientName}
      </h3>

      {/* Assessment Adherence */}
      {patient.assessmentAdherence && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Assessment Adherence</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completed</span>
              <span className="text-sm font-semibold text-gray-900">
                {patient.assessmentAdherence.completed} of {patient.assessmentAdherence.expected}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.round(patient.assessmentAdherence.adherenceRate || 0)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {Math.round(patient.assessmentAdherence.adherenceRate || 0)}% adherence rate
            </p>
          </div>
        </div>
      )}

      {/* Medication Adherence */}
      {patient.medicationAdherence?.byMedication && patient.medicationAdherence.byMedication.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Medication Adherence</h4>
          <div className="space-y-3">
            {patient.medicationAdherence.byMedication.slice(0, 5).map((med, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{med.medicationName}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {Math.round(med.adherenceRate || 0)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      med.adherenceRate >= 80 ? 'bg-green-500' :
                      med.adherenceRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.round(med.adherenceRate || 0)}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observation Metrics */}
      {patient.observationMetrics && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Observation Patterns</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Days with Data</p>
              <p className="text-xl font-bold text-blue-900">
                {patient.observationMetrics.daysWithSubmissions}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Total Observations</p>
              <p className="text-xl font-bold text-green-900">
                {patient.observationMetrics.totalObservations}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const PatientEngagementMetrics = () => {
  const [timeframe, setTimeframe] = useState('30d')
  const [selectedPatientId, setSelectedPatientId] = useState('')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Fetch patients for dropdown
  // Note: Backend validates organization from JWT token via middleware
  const { data: patientsData } = useQuery({
    queryKey: ['patients', user.id],
    queryFn: () => api.getPatients({ page: 1, limit: 100 }),
    enabled: !!user.id
  })

  // Fetch engagement metrics (org-wide or patient-specific)
  // Note: Backend validates organization from JWT token via middleware
  const { data: metricsData, isLoading, error } = useQuery({
    queryKey: ['patient-engagement-metrics', selectedPatientId, timeframe],
    queryFn: () => api.getPatientEngagementMetrics({
      patientId: selectedPatientId || undefined,
      timeframe
    }),
    enabled: !!user.id, // Backend validates organization from JWT token
    refetchInterval: 300000 // Refetch every 5 minutes
  })

  const patients = patientsData?.data || []
  const metrics = metricsData?.data

  // Determine if showing org-wide or patient-specific view
  const isOrgView = !selectedPatientId
  const orgSummary = isOrgView ? metrics?.summary : null
  const topPatients = isOrgView ? metrics?.topPatients : null
  const patientDetails = !isOrgView ? metrics : null

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading engagement metrics: {error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <HeartIcon className="h-8 w-8 mr-3 text-purple-600" />
                Patient Engagement Metrics
              </h1>
              <p className="text-gray-600 mt-2">Track assessment adherence, medication compliance, and engagement patterns</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Patient Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserGroupIcon className="h-4 w-4 inline mr-1" />
                Patient
              </label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Organization Overview</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName} - {patient.dateOfBirth}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                Timeframe
              </label>
              <div className="flex space-x-2">
                {['7d', '30d', '90d'].map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      timeframe === tf
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tf === '7d' ? 'Last 7 Days' : tf === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Organization View */}
        {isOrgView && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                title="Total Patients"
                value={orgSummary?.totalPatients || 0}
                subtitle="Enrolled in programs"
                icon={UserGroupIcon}
                color="blue"
                isLoading={isLoading}
              />
              <StatCard
                title="Avg Engagement"
                value={orgSummary?.avgEngagementScore ? `${Math.round(orgSummary.avgEngagementScore)}/100` : 'N/A'}
                subtitle={orgSummary?.avgEngagementScore >= 70 ? 'Good' : 'Needs attention'}
                icon={ChartBarIcon}
                color="purple"
                isLoading={isLoading}
              />
              <StatCard
                title="Highly Engaged"
                value={orgSummary?.highlyEngaged || 0}
                subtitle={`${orgSummary?.totalPatients > 0 ? Math.round((orgSummary.highlyEngaged / orgSummary.totalPatients) * 100) : 0}% of patients`}
                icon={CheckCircleIcon}
                color="green"
                isLoading={isLoading}
              />
              <StatCard
                title="At Risk"
                value={orgSummary?.atRisk || 0}
                subtitle={`${orgSummary?.totalPatients > 0 ? Math.round((orgSummary.atRisk / orgSummary.totalPatients) * 100) : 0}% of patients`}
                icon={ExclamationTriangleIcon}
                color="red"
                isLoading={isLoading}
              />
            </div>

            {/* Patient List */}
            <PatientList patients={topPatients} isLoading={isLoading} />
          </>
        )}

        {/* Patient-Specific View */}
        {!isOrgView && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <StatCard
                title="Engagement Score"
                value={patientDetails?.summary?.engagementScore ? `${Math.round(patientDetails.summary.engagementScore)}/100` : 'N/A'}
                subtitle={
                  patientDetails?.summary?.engagementScore >= 80 ? 'Highly Engaged' :
                  patientDetails?.summary?.engagementScore >= 60 ? 'Engaged' :
                  patientDetails?.summary?.engagementScore >= 40 ? 'Moderate' : 'At Risk'
                }
                icon={HeartIcon}
                color="purple"
                isLoading={isLoading}
              />
              <StatCard
                title="Assessment Adherence"
                value={patientDetails?.assessmentMetrics?.adherenceRate
                  ? `${Math.round(patientDetails.assessmentMetrics.adherenceRate)}%`
                  : 'N/A'}
                subtitle={`${patientDetails?.assessmentMetrics?.completed || 0} of ${patientDetails?.assessmentMetrics?.expected || 0} completed`}
                icon={CheckCircleIcon}
                color="blue"
                isLoading={isLoading}
              />
              <StatCard
                title="Medication Adherence"
                value={patientDetails?.medicationMetrics?.avgAdherenceRate
                  ? `${Math.round(patientDetails.medicationMetrics.avgAdherenceRate)}%`
                  : 'N/A'}
                subtitle={`${patientDetails?.medicationMetrics?.totalMedications || 0} medications`}
                icon={HeartIcon}
                color="green"
                isLoading={isLoading}
              />
              <StatCard
                title="Critical Alerts"
                value={patientDetails?.alertMetrics?.critical || 0}
                subtitle={`${patientDetails?.alertMetrics?.total || 0} total alerts`}
                icon={BellAlertIcon}
                color="red"
                isLoading={isLoading}
              />
            </div>

            {/* Charts and Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EngagementTrendChart
                trendData={patientDetails?.trend}
                isLoading={isLoading}
              />
              <DetailedAdherenceMetrics
                patient={patientDetails}
                isLoading={isLoading}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default PatientEngagementMetrics
