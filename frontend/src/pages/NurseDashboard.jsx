import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  FireIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

const StatCard = ({ title, value, icon: Icon, color = 'blue', isLoading, linkTo }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600',
    green: 'from-green-500 to-green-600 bg-green-50 text-green-600',
    red: 'from-red-500 to-red-600 bg-red-50 text-red-600',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-600',
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

export default function NurseDashboard() {
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

  // Fetch pending assessments
  const { data: assessmentsResponse, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['pending-assessments-stats'],
    queryFn: () => api.getAssessments({ status: 'scheduled', limit: 1 }),
  })

  // Fetch observations needing review
  const { data: observationsResponse, isLoading: observationsLoading } = useQuery({
    queryKey: ['observations-review-stats'],
    queryFn: () => api.getObservations({ flaggedForReview: true, limit: 1 }),
  })

  const unclaimedAlerts = triageResponse?.data?.pagination?.total || 0
  const pendingTasks = tasksResponse?.data?.pagination?.total || 0
  const pendingAssessments = assessmentsResponse?.data?.pagination?.total || 0
  const flaggedObservations = observationsResponse?.data?.pagination?.total || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Nurse Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Patient care and monitoring overview
          </p>
        </div>

        {/* Quick Actions Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Unclaimed Alerts"
            value={unclaimedAlerts}
            icon={FireIcon}
            color="red"
            isLoading={triageLoading}
            linkTo="/triage-queue"
          />
          <StatCard
            title="My Tasks"
            value={pendingTasks}
            icon={CheckCircleIcon}
            color="blue"
            isLoading={tasksLoading}
            linkTo="/tasks"
          />
          <StatCard
            title="Pending Assessments"
            value={pendingAssessments}
            icon={ClipboardDocumentCheckIcon}
            color="purple"
            isLoading={assessmentsLoading}
            linkTo="/assessments"
          />
          <StatCard
            title="Flagged Observations"
            value={flaggedObservations}
            icon={EyeIcon}
            color="green"
            isLoading={observationsLoading}
            linkTo="/observation-review"
          />
        </div>

        {/* Priority Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Priority Actions</h3>
          <div className="space-y-3">
            {unclaimedAlerts > 0 && (
              <Link
                to="/triage-queue"
                className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FireIcon className="h-6 w-6 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-900">{unclaimedAlerts} Unclaimed Alert{unclaimedAlerts > 1 ? 's' : ''}</p>
                    <p className="text-sm text-red-700">Require immediate attention</p>
                  </div>
                </div>
                <span className="text-red-600 font-medium">Review →</span>
              </Link>
            )}
            {pendingTasks > 0 && (
              <Link
                to="/tasks"
                className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">{pendingTasks} Pending Task{pendingTasks > 1 ? 's' : ''}</p>
                    <p className="text-sm text-blue-700">Assigned to you</p>
                  </div>
                </div>
                <span className="text-blue-600 font-medium">View →</span>
              </Link>
            )}
            {flaggedObservations > 0 && (
              <Link
                to="/observation-review"
                className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <EyeIcon className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">{flaggedObservations} Observation{flaggedObservations > 1 ? 's' : ''} Flagged</p>
                    <p className="text-sm text-green-700">Need clinical review</p>
                  </div>
                </div>
                <span className="text-green-600 font-medium">Review →</span>
              </Link>
            )}
            {unclaimedAlerts === 0 && pendingTasks === 0 && flaggedObservations === 0 && (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-12 w-12 text-green-300 mx-auto mb-3" />
                <p className="text-gray-500">All caught up! No urgent actions needed.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/patients"
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <h3 className="text-xl font-bold mb-2">Patients</h3>
            <p className="text-blue-100">View patient records and vitals</p>
          </Link>
          <Link
            to="/observations"
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6 hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <h3 className="text-xl font-bold mb-2">Observations</h3>
            <p className="text-purple-100">Record patient observations</p>
          </Link>
          <Link
            to="/assessments"
            className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <h3 className="text-xl font-bold mb-2">Assessments</h3>
            <p className="text-green-100">Complete scheduled assessments</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
