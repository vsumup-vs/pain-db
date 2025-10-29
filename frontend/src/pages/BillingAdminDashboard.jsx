import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

const StatCard = ({ title, value, icon: Icon, color = 'blue', isLoading, linkTo, subtitle }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600',
    green: 'from-green-500 to-green-600 bg-green-50 text-green-600',
    orange: 'from-orange-500 to-orange-600 bg-orange-50 text-orange-600',
    red: 'from-red-500 to-red-600 bg-red-50 text-red-600',
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

export default function BillingAdminDashboard() {
  const currentDate = new Date()
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0')
  const currentYear = currentDate.getFullYear()
  const billingMonth = `${currentYear}-${currentMonth}`

  // Get current organization from user
  const { data: userResponse } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => api.getCurrentUserProfile(),
  })

  const organizationId = userResponse?.currentOrganization

  // Fetch billing readiness summary
  const { data: billingResponse, isLoading: billingLoading } = useQuery({
    queryKey: ['billing-summary', organizationId, billingMonth],
    queryFn: () => api.getOrganizationBillingSummary(organizationId, billingMonth),
    enabled: !!organizationId,
  })

  // Fetch patients for compliance count
  const { data: patientsResponse, isLoading: patientsLoading } = useQuery({
    queryKey: ['patients-count'],
    queryFn: () => api.getPatients({ limit: 1 }),
  })

  const billingSummary = billingResponse?.data?.summary || {}
  const totalEnrollments = billingSummary.totalEnrollments || 0
  const eligibleEnrollments = billingSummary.eligibleEnrollments || 0
  const notEligibleEnrollments = billingSummary.notEligibleEnrollments || 0
  const totalReimbursement = billingSummary.totalReimbursement || '0.00'
  const eligibilityRate = totalEnrollments > 0 ? Math.round((eligibleEnrollments / totalEnrollments) * 100) : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Billing Dashboard
          </h1>
          <p className="text-lg text-gray-600">
            Revenue cycle management for {new Date(currentYear, currentMonth - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Billing Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Revenue"
            value={`$${parseFloat(totalReimbursement).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            icon={CurrencyDollarIcon}
            color="green"
            isLoading={billingLoading}
            linkTo="/billing-readiness"
            subtitle="Projected for this month"
          />
          <StatCard
            title="Billing Eligible"
            value={`${eligibilityRate}%`}
            icon={CheckCircleIcon}
            color={eligibilityRate >= 90 ? 'green' : eligibilityRate >= 70 ? 'orange' : 'red'}
            isLoading={billingLoading}
            linkTo="/billing-readiness"
            subtitle={`${eligibleEnrollments} of ${totalEnrollments} enrollments`}
          />
          <StatCard
            title="Not Eligible"
            value={notEligibleEnrollments}
            icon={ExclamationCircleIcon}
            color="orange"
            isLoading={billingLoading}
            linkTo="/billing-readiness"
            subtitle="Need attention"
          />
          <StatCard
            title="Clinician Analytics"
            value="View"
            icon={ChartBarIcon}
            color="blue"
            isLoading={false}
            linkTo="/analytics/clinician-workflow"
            subtitle="Time tracking & productivity"
          />
        </div>

        {/* Billing Status Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Readiness Status</h3>

          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Eligible: {eligibleEnrollments}</span>
              <span>Not Eligible: {notEligibleEnrollments}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full ${
                  eligibilityRate >= 90 ? 'bg-green-500' :
                  eligibilityRate >= 70 ? 'bg-orange-500' :
                  'bg-red-500'
                } transition-all duration-500`}
                style={{ width: `${eligibilityRate}%` }}
              ></div>
            </div>
          </div>

          {notEligibleEnrollments > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <ExclamationCircleIcon className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-900 mb-1">Action Required</h4>
                  <p className="text-sm text-orange-800 mb-3">
                    {notEligibleEnrollments} enrollment{notEligibleEnrollments > 1 ? 's are' : ' is'} not meeting billing requirements this month.
                  </p>
                  <Link
                    to="/billing-readiness"
                    className="inline-flex items-center px-3 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            to="/billing-readiness"
            className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-6 hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <CurrencyDollarIcon className="h-8 w-8 mb-3" />
            <h3 className="text-xl font-bold mb-2">Billing Readiness</h3>
            <p className="text-emerald-100">Detailed view of all enrollments and CPT codes eligibility</p>
          </Link>
          <Link
            to="/analytics/clinician-workflow"
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl p-6 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <ChartBarIcon className="h-8 w-8 mb-3" />
            <h3 className="text-xl font-bold mb-2">Clinician Analytics</h3>
            <p className="text-blue-100">Review time logging and productivity metrics for compliance</p>
          </Link>
        </div>

        {/* Helpful Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Billing Tips for This Month</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>RPM:</strong> Ensure patients have 16+ days of device readings and 20+ minutes clinical time</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>RTM:</strong> Verify 16+ days of therapeutic data and 20+ minutes treatment time</span>
            </li>
            <li className="flex items-start space-x-2">
              <CheckCircleIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>CCM:</strong> Confirm 20+ minutes care coordination time and comprehensive care plan documented</span>
            </li>
            <li className="flex items-start space-x-2">
              <ClockIcon className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <span><strong>Deadline:</strong> Submit claims by the {new Date(currentYear, currentMonth, 15).toLocaleDateString()}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
