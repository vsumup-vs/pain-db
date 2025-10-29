import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  ChartBarIcon,
  PresentationChartLineIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  EyeIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

const StatCard = ({ title, value, icon: Icon, color = 'blue', isLoading, linkTo, subtitle }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600',
    purple: 'from-purple-500 to-purple-600 bg-purple-50 text-purple-600',
    green: 'from-green-500 to-green-600 bg-green-50 text-green-600',
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
                <>
                  <p className="text-3xl font-bold text-gray-900">{value}</p>
                  {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </>
              )}
            </div>
          </div>
        </div>
        <div className={`h-1 bg-gradient-to-r ${colorClasses[color]?.split(' ')[0]} ${colorClasses[color]?.split(' ')[1]}`}></div>
      </div>
    </Card>
  )
}

export default function ResearcherDashboard() {
  // Fetch patient engagement metrics
  const { data: engagementResponse, isLoading: engagementLoading } = useQuery({
    queryKey: ['patient-engagement-overview'],
    queryFn: () => api.getPatientEngagementMetrics({ limit: 1 }),
  })

  // Fetch patients count
  const { data: patientsResponse, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients-count'],
    queryFn: () => api.getPatients({ limit: 1 }),
  })

  // Fetch assessments
  const { data: assessmentsResponse, isLoading: assessmentsLoading } = useQuery({
    queryKey: ['assessments-count'],
    queryFn: () => api.getAssessments({ limit: 1 }),
  })

  // Fetch observations
  const { data: observationsResponse, isLoading: observationsLoading } = useQuery({
    queryKey: ['observations-count'],
    queryFn: () => api.getObservations({ limit: 1 }),
  })

  const totalPatients = patientsResponse?.data?.pagination?.total || 0
  const totalAssessments = assessmentsResponse?.data?.pagination?.total || 0
  const totalObservations = observationsResponse?.data?.pagination?.total || 0

  // Calculate average engagement score from top patients
  const topPatients = engagementResponse?.data?.patients || []
  const avgEngagementScore = topPatients.length > 0
    ? Math.round(topPatients.reduce((sum, p) => sum + (p.engagementScore || 0), 0) / topPatients.length)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Research Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Data collection, analysis, and patient engagement metrics
          </p>
        </div>

        {/* Research Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Patients"
            value={totalPatients}
            icon={UserGroupIcon}
            color="blue"
            isLoading={patientsLoading}
            linkTo="/patients"
            subtitle="In research cohort"
          />
          <StatCard
            title="Assessments Completed"
            value={totalAssessments}
            icon={ClipboardDocumentCheckIcon}
            color="purple"
            isLoading={assessmentsLoading}
            linkTo="/assessments"
            subtitle="Total data points"
          />
          <StatCard
            title="Observations Recorded"
            value={totalObservations}
            icon={EyeIcon}
            color="green"
            isLoading={observationsLoading}
            linkTo="/observations"
            subtitle="Clinical measurements"
          />
          <StatCard
            title="Avg Engagement"
            value={`${avgEngagementScore}%`}
            icon={PresentationChartLineIcon}
            color="orange"
            isLoading={engagementLoading}
            linkTo="/analytics/patient-engagement"
            subtitle="Patient participation rate"
          />
        </div>

        {/* Data Collection Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Collection Overview</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm text-purple-600 font-medium mb-2">Assessment Completion</p>
              <p className="text-3xl font-bold text-purple-900">{totalAssessments}</p>
              <p className="text-xs text-purple-600 mt-1">Total completed</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-600 font-medium mb-2">Observations</p>
              <p className="text-3xl font-bold text-green-900">{totalObservations}</p>
              <p className="text-xs text-green-600 mt-1">Clinical data points</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-600 font-medium mb-2">Avg per Patient</p>
              <p className="text-3xl font-bold text-blue-900">
                {totalPatients > 0 ? Math.round((totalAssessments + totalObservations) / totalPatients) : 0}
              </p>
              <p className="text-xs text-blue-600 mt-1">Data points</p>
            </div>
          </div>
        </div>

        {/* Quick Access Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/analytics/patient-engagement"
            className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl p-6 hover:from-purple-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <PresentationChartLineIcon className="h-8 w-8 mb-3" />
            <h3 className="text-xl font-bold mb-2">Patient Engagement Analytics</h3>
            <p className="text-purple-100">Detailed engagement metrics, adherence rates, and trend analysis</p>
          </Link>
          <Link
            to="/observations"
            className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 hover:from-green-600 hover:to-green-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <EyeIcon className="h-8 w-8 mb-3" />
            <h3 className="text-xl font-bold mb-2">Observations</h3>
            <p className="text-green-100">Review all clinical observations and measurements</p>
          </Link>
        </div>

        {/* Data Quality & Templates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/assessment-templates"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start space-x-3">
              <ClipboardDocumentCheckIcon className="h-8 w-8 text-purple-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Assessment Templates</h3>
                <p className="text-sm text-gray-600">Configure and review validated assessment instruments for data collection</p>
              </div>
            </div>
          </Link>
          <Link
            to="/metric-definitions"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start space-x-3">
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Metric Definitions</h3>
                <p className="text-sm text-gray-600">Review standardized metrics and measurement specifications</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Research Tips */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">Data Collection Best Practices</h3>
          <ul className="space-y-2 text-sm text-purple-800">
            <li className="flex items-start space-x-2">
              <span className="font-bold">•</span>
              <span>Monitor patient engagement metrics weekly to identify participants needing follow-up</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-bold">•</span>
              <span>Review observation consistency to ensure data quality and protocol compliance</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-bold">•</span>
              <span>Use saved views to quickly access cohort-specific patient lists</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="font-bold">•</span>
              <span>Export data regularly for offline analysis using your preferred statistical software</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
