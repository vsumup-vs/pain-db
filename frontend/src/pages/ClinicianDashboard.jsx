import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  FireIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

const StatCard = ({ title, value, icon: Icon, color = 'blue', isLoading, linkTo }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600',
    green: 'from-green-500 to-green-600 bg-green-50 text-green-600',
    red: 'from-red-500 to-red-600 bg-red-50 text-red-600',
    orange: 'from-orange-500 to-orange-600 bg-orange-50 text-orange-600',
  }

  const Card = ({ children }) => linkTo ? (
    <Link to={linkTo} className="block hover:scale-105 transition-transform duration-200">
      {children}
    </Link>
  ) : <div>{children}</div>

  return (
    <Card>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${colorClasses[color]?.split(' ')[1]} ${colorClasses[color]?.split(' ')[2]}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
              ) : (
                <p className="text-3xl font-bold text-gray-900">{value}</p>
              )}
            </div>
          </div>
        </div>
        <div className={`h-1 bg-gradient-to-r ${colorClasses[color]?.split(' ')[0]} ${colorClasses[color]?.split(' ')[1]}`}></div>
      </div>
    </Card>
  )
}

export default function ClinicianDashboard() {
  // Fetch triage queue stats
  const { data: triageResponse, isLoading: triageLoading } = useQuery({
    queryKey: ['triage-queue-stats'],
    queryFn: () => api.getTriageQueue({ status: 'PENDING', limit: 1 }),
  })

  // Fetch my tasks
  const { data: tasksResponse, isLoading: tasksLoading } = useQuery({
    queryKey: ['my-tasks-stats'],
    queryFn: () => api.getTasks({ status: 'PENDING', limit: 1 }),
  })

  // Fetch my patients count
  const { data: patientsResponse, isLoading: patientsLoading } = useQuery({
    queryKey: ['my-patients-count'],
    queryFn: () => api.getPatients({ limit: 1 }),
  })

  // Fetch recent alerts
  const { data: alertsResponse, isLoading: alertsLoading } = useQuery({
    queryKey: ['recent-alerts'],
    queryFn: () => api.getRecentAlerts({ limit: 5 }),
  })

  const unclaimedAlerts = triageResponse?.data?.pagination?.total || 0
  const myTasks = tasksResponse?.data?.pagination?.total || 0
  const myPatients = patientsResponse?.data?.pagination?.total || 0
  const recentAlerts = alertsResponse?.data?.alerts || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Clinician Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Your clinical workflow overview
          </p>
        </div>

        {/* Quick Actions Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Unclaimed Alerts"
            value={unclaimedAlerts}
            icon={FireIcon}
            color="red"
            isLoading={triageLoading}
            linkTo="/triage-queue"
          />
          <StatCard
            title="My Pending Tasks"
            value={myTasks}
            icon={CheckCircleIcon}
            color="orange"
            isLoading={tasksLoading}
            linkTo="/tasks"
          />
          <StatCard
            title="My Patients"
            value={myPatients}
            icon={UserGroupIcon}
            color="blue"
            isLoading={patientsLoading}
            linkTo="/patients"
          />
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
              </div>
              <Link
                to="/alerts"
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                View all
              </Link>
            </div>
          </div>
          <div className="p-6">
            {alertsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse h-20 bg-gray-100 rounded"></div>
                ))}
              </div>
            ) : recentAlerts.length > 0 ? (
              <div className="space-y-4">
                {recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg px-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`h-2 w-2 rounded-full ${
                          alert.status === 'PENDING' ? 'bg-red-500' :
                          alert.status === 'ACKNOWLEDGED' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`}></div>
                        <p className="font-semibold text-gray-900">
                          {alert.rule?.name || 'Alert'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Patient: {alert.patient?.firstName} {alert.patient?.lastName}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          alert.status === 'PENDING' ? 'bg-red-100 text-red-800' :
                          alert.status === 'ACKNOWLEDGED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {alert.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center space-x-1 text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4" />
                        <span>{new Date(alert.triggeredAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-300 mx-auto mb-3" />
                <p className="text-gray-500">No pending alerts</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/triage-queue"
            className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl p-6 hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <FireIcon className="h-8 w-8 mb-3" />
            <h3 className="text-xl font-bold mb-2">Triage Queue</h3>
            <p className="text-red-100">Review unclaimed alerts and respond to urgent patient needs</p>
          </Link>
          <Link
            to="/tasks"
            className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl p-6 hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <CheckCircleIcon className="h-8 w-8 mb-3" />
            <h3 className="text-xl font-bold mb-2">My Tasks</h3>
            <p className="text-orange-100">View and complete your assigned clinical tasks</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
