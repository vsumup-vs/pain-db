import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  BellAlertIcon,
  UserIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  TrophyIcon
} from '@heroicons/react/24/outline'

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', isLoading }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600 border-blue-200',
    green: 'from-green-500 to-green-600 bg-green-50 text-green-600 border-green-200',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-600 border-purple-200',
    orange: 'from-orange-500 to-orange-600 bg-orange-50 text-orange-600 border-orange-200',
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

const PerformanceTrendChart = ({ trendData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">7-Day Performance Trend</h3>
        <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
      </div>
    )
  }

  if (!trendData || trendData.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">7-Day Performance Trend</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No trend data available
        </div>
      </div>
    )
  }

  // Simple ASCII chart visualization
  const maxValue = Math.max(...trendData.map(d => d.alertsResolved || 0))
  const barHeight = (value) => value > 0 ? Math.max((value / maxValue) * 100, 5) : 0

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <ArrowTrendingUpIcon className="h-5 w-5 mr-2 text-blue-600" />
        7-Day Performance Trend
      </h3>
      <div className="flex items-end justify-between h-64 space-x-2">
        {trendData.map((day, index) => (
          <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
            <div className="w-full relative" style={{ height: `${barHeight(day.alertsResolved)}%` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-blue-500 to-blue-400 rounded-t hover:from-blue-600 hover:to-blue-500 transition-colors cursor-pointer"></div>
            </div>
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold text-gray-700">{day.alertsResolved || 0}</p>
              <p className="text-xs text-gray-500">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center text-sm text-gray-600">
        <BellAlertIcon className="h-4 w-4 mr-1" />
        Alerts Resolved per Day
      </div>
    </div>
  )
}

const DetailedMetrics = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Detailed Metrics</h3>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <ChartBarIcon className="h-5 w-5 mr-2 text-purple-600" />
        Detailed Metrics
      </h3>

      {/* Alerts by Severity */}
      {data.alertMetrics?.bySeverity && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Alerts by Severity</h4>
          <div className="space-y-2">
            {Object.entries(data.alertMetrics.bySeverity).map(([severity, count]) => {
              const severityColors = {
                CRITICAL: 'bg-red-500',
                HIGH: 'bg-orange-500',
                MEDIUM: 'bg-yellow-500',
                LOW: 'bg-blue-500'
              }
              const total = Object.values(data.alertMetrics.bySeverity).reduce((sum, c) => sum + c, 0)
              const percentage = total > 0 ? Math.round((count / total) * 100) : 0

              return (
                <div key={severity}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-600">{severity}</span>
                    <span className="text-sm font-semibold text-gray-900">{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className={`${severityColors[severity]} h-2 rounded-full transition-all duration-300`} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Time by Activity */}
      {data.timeMetrics?.byActivity && Object.keys(data.timeMetrics.byActivity).length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Time by Activity</h4>
          <div className="space-y-2">
            {Object.entries(data.timeMetrics.byActivity)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([activity, minutes]) => {
                const total = Object.values(data.timeMetrics.byActivity).reduce((sum, m) => sum + m, 0)
                const percentage = total > 0 ? Math.round((minutes / total) * 100) : 0

                return (
                  <div key={activity}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-600">{activity.replace(/_/g, ' ')}</span>
                      <span className="text-sm font-semibold text-gray-900">{minutes} min ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}

const ClinicianWorkflowAnalytics = () => {
  const [timeframe, setTimeframe] = useState('7d')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  // Fetch workflow analytics for current user
  // Note: Backend expects User ID (from auth), not Clinician model ID
  // Organization context is validated by backend middleware via JWT token
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: ['clinician-workflow-analytics', user.id, timeframe],
    queryFn: () => api.getClinicianWorkflowAnalytics({
      clinicianId: user.id, // Pass User ID (from auth token)
      timeframe
    }),
    enabled: !!user.id, // Backend validates organization from JWT token
    refetchInterval: 300000 // Refetch every 5 minutes
  })

  const metrics = analyticsData?.data

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading analytics: {error.message}</p>
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
                <ChartBarIcon className="h-8 w-8 mr-3 text-blue-600" />
                Clinician Workflow Analytics
              </h1>
              <p className="text-gray-600 mt-2">Performance metrics and productivity insights</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {/* User Info */}
            <div className="flex items-center space-x-2">
              <UserIcon className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email}
                </div>
                <div className="text-xs text-gray-500">Your Performance Metrics</div>
              </div>
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
                        ? 'bg-blue-600 text-white'
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

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Productivity Score"
            value={metrics?.summary?.productivityScore ? `${Math.round(metrics.summary.productivityScore)}/100` : 'N/A'}
            subtitle={metrics?.summary?.productivityScore >= 80 ? 'Excellent' : metrics?.summary?.productivityScore >= 60 ? 'Good' : 'Needs Improvement'}
            icon={TrophyIcon}
            color="purple"
            isLoading={isLoading}
          />
          <StatCard
            title="Alerts Resolved"
            value={metrics?.alertMetrics?.total || 0}
            subtitle={metrics?.alertMetrics?.avgResolutionTimeMinutes
              ? `Avg: ${Math.round(metrics.alertMetrics.avgResolutionTimeMinutes)} min`
              : ''}
            icon={BellAlertIcon}
            color="blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Task Completion Rate"
            value={metrics?.taskMetrics?.completionRate
              ? `${Math.round(metrics.taskMetrics.completionRate)}%`
              : 'N/A'}
            subtitle={`${metrics?.taskMetrics?.completed || 0} of ${metrics?.taskMetrics?.total || 0} tasks`}
            icon={CheckCircleIcon}
            color="green"
            isLoading={isLoading}
          />
          <StatCard
            title="Avg Time per Patient"
            value={metrics?.patientMetrics?.avgTimePerPatientMinutes
              ? `${Math.round(metrics.patientMetrics.avgTimePerPatientMinutes)} min`
              : 'N/A'}
            subtitle={`${metrics?.patientMetrics?.uniquePatients || 0} patients served`}
            icon={ClockIcon}
            color="orange"
            isLoading={isLoading}
          />
        </div>

        {/* Charts and Detailed Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <PerformanceTrendChart
            trendData={metrics?.trend}
            isLoading={isLoading}
          />
          <DetailedMetrics
            data={metrics}
            isLoading={isLoading}
          />
        </div>

        {/* Time Logging Summary */}
        {metrics?.timeMetrics && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <ClockIcon className="h-5 w-5 mr-2 text-orange-600" />
              Time Logging Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Clinical Time</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(metrics.timeMetrics.totalClinicalMinutes || 0)} min</p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((metrics.timeMetrics.totalClinicalMinutes || 0) / 60 * 10) / 10} hours
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Billable Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metrics.timeMetrics.billablePercentage ? `${Math.round(metrics.timeMetrics.billablePercentage)}%` : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(metrics.timeMetrics.billableMinutes || 0)} of {Math.round(metrics.timeMetrics.totalClinicalMinutes || 0)} min
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Non-Billable Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round((metrics.timeMetrics.totalClinicalMinutes || 0) - (metrics.timeMetrics.billableMinutes || 0))} min
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {metrics.timeMetrics.totalClinicalMinutes > 0
                    ? Math.round(((metrics.timeMetrics.totalClinicalMinutes - metrics.timeMetrics.billableMinutes) / metrics.timeMetrics.totalClinicalMinutes) * 100)
                    : 0}% of total
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ClinicianWorkflowAnalytics
