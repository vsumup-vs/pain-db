import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  UserGroupIcon,
  UserIcon,
  BellIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import ContinuityTestPanel from '../components/ContinuityTestPanel'

const StatCard = ({ title, value, icon: Icon, color = 'blue', trend, isLoading }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600 border-blue-200',
    green: 'from-green-500 to-green-600 bg-green-50 text-green-600 border-green-200',
    red: 'from-red-500 to-red-600 bg-red-50 text-red-600 border-red-200',
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
                  <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
                )}
              </div>
            </div>
            {trend && (
              <div className="mt-3 flex items-center space-x-1">
                <ArrowTrendingUpIcon className={`h-4 w-4 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {Math.abs(trend)}%
                </span>
                <span className="text-sm text-gray-500">vs last month</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${colorClasses[color].split(' ')[0]} ${colorClasses[color].split(' ')[1]} opacity-60 group-hover:opacity-100 transition-opacity duration-200`}></div>
    </div>
  )
}

const RecentItemCard = ({ children, title, viewAllLink, icon: Icon, count }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
    <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {Icon && <Icon className="h-5 w-5 text-gray-600" />}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {count !== undefined && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {count}
            </span>
          )}
        </div>
        <a 
          href={viewAllLink} 
          className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors duration-200 flex items-center space-x-1"
        >
          <span>View all</span>
          <ArrowTrendingUpIcon className="h-4 w-4" />
        </a>
      </div>
    </div>
    <div className="p-6">
      {children}
    </div>
  </div>
)

export default function Dashboard() {
  // Fetch statistics
  const { data: patientsStatsResponse, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients-stats'],
    queryFn: () => api.getPatientsStats(),
  })

  const { data: cliniciansStatsResponse, isLoading: cliniciansLoading } = useQuery({
    queryKey: ['clinicians-stats'],
    queryFn: () => api.getCliniciansStats(),
  })

  const { data: alertsStatsResponse, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts-stats'],
    queryFn: () => api.getAlertsStats(),
  })

  // Fetch recent data using optimized endpoints
  const { data: recentPatientsResponse, isLoading: recentPatientsLoading } = useQuery({
    queryKey: ['recent-patients'],
    queryFn: () => api.getRecentPatients({ limit: 5 }),
  })

  const { data: recentAlertsResponse, isLoading: recentAlertsLoading } = useQuery({
    queryKey: ['recent-alerts'],
    queryFn: () => api.getRecentAlerts({ limit: 5 }),
  })

  // Extract data from responses
  const patientsStats = patientsStatsResponse?.data || {}
  const cliniciansStats = cliniciansStatsResponse?.data || {}
  const alertsStats = alertsStatsResponse?.data || {}
  const recentPatients = recentPatientsResponse?.data || []
  const recentAlerts = recentAlertsResponse?.alerts || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Welcome to ClinMetrics Pro - Precision Healthcare Analytics. Empower your clinical team with data-driven insights and streamlined patient care
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Patients"
            value={patientsStats?.total || 0}
            icon={UserGroupIcon}
            color="blue"
            trend={12}
            isLoading={patientsLoading}
          />
          <StatCard
            title="Active Clinicians"
            value={cliniciansStats?.active || 0}
            icon={UserIcon}
            color="green"
            trend={5}
            isLoading={cliniciansLoading}
          />
          <StatCard
            title="Active Alerts"
            value={alertsStats?.active || 0}
            icon={BellIcon}
            color="red"
            trend={-8}
            isLoading={alertsLoading}
          />
          <StatCard
            title="Total Observations"
            value={patientsStats?.totalObservations || 0}
            icon={ChartBarIcon}
            color="purple"
            trend={23}
            isLoading={patientsLoading}
          />
        </div>

        {/* Smart Assessment Continuity Test Panel */}
        <ContinuityTestPanel />

        {/* Recent Data Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Patients */}
          <RecentItemCard
            title="Recent Patients"
            viewAllLink="/patients"
            icon={UserGroupIcon}
            count={recentPatients.length}
          >
            {recentPatientsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="h-4 w-32 bg-gray-200 rounded mb-1"></div>
                          <div className="h-3 w-24 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="h-3 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentPatients.length > 0 ? (
              <div className="space-y-4">
                {recentPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg px-3 transition-colors duration-200">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                        <UserIcon className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center space-x-1">
                          <span>MRN: {patient.mrn}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4" />
                        <span>{new Date(patient.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent patients</p>
              </div>
            )}
          </RecentItemCard>

          {/* Recent Alerts */}
          <RecentItemCard
            title="Recent Alerts"
            viewAllLink="/alerts"
            icon={ExclamationTriangleIcon}
            count={recentAlerts.filter(a => a.status === 'open').length}
          >
            {recentAlertsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-start justify-between py-3">
                      <div className="flex-1">
                        <div className="h-4 w-48 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="flex space-x-2">
                          <div className="h-5 w-16 bg-gray-200 rounded-full"></div>
                          <div className="h-5 w-20 bg-gray-200 rounded-full"></div>
                        </div>
                      </div>
                      <div className="h-3 w-16 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentAlerts.length > 0 ? (
              <div className="space-y-4">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg px-3 transition-colors duration-200">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`h-2 w-2 rounded-full ${
                          alert.status === 'open' ? 'bg-red-500' :
                          alert.status === 'ack' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}></div>
                        <p className="font-semibold text-gray-900">
                          {alert.rule?.name || 'Alert'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Patient: {alert.enrollment?.patient?.firstName} {alert.enrollment?.patient?.lastName}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          alert.rule?.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          alert.rule?.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          alert.rule?.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {alert.rule?.severity || 'UNKNOWN'}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          alert.status === 'open' ? 'bg-red-100 text-red-800' :
                          alert.status === 'ack' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {alert.status === 'ack' ? 'ACKNOWLEDGED' : alert.status?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4" />
                        <span>{new Date(alert.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent alerts</p>
                <p className="text-sm text-gray-400">All systems running smoothly</p>
              </div>
            )}
          </RecentItemCard>
        </div>
      </div>
    </div>
  )
}