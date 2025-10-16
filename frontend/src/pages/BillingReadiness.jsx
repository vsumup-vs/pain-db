import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import {
  CurrencyDollarIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  XCircleIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', isLoading }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 bg-blue-50 text-blue-600 border-blue-200',
    green: 'from-green-500 to-green-600 bg-green-50 text-green-600 border-green-200',
    yellow: 'from-yellow-500 to-yellow-600 bg-yellow-50 text-yellow-600 border-yellow-200',
    red: 'from-red-500 to-red-600 bg-red-50 text-red-600 border-red-200',
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

const StatusBadge = ({ eligible }) => {
  const config = eligible
    ? {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircleIcon,
        label: 'Eligible'
      }
    : {
        bg: 'bg-red-100',
        text: 'text-red-800',
        icon: XCircleIcon,
        label: 'Not Eligible'
      }

  const Icon = config.icon

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
      <Icon className="h-3.5 w-3.5 mr-1" />
      {config.label}
    </span>
  )
}

export default function BillingReadiness() {
  const currentDate = new Date()
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [organizationId, setOrganizationId] = useState(null)

  // Get organization ID from user context
  useEffect(() => {
    const user = api.getCurrentUser()
    console.log('BillingReadiness - Current user:', user)

    // Try multiple possible user object structures
    let orgId = null

    if (user?.organizations && user.organizations.length > 0) {
      // Standard structure: user.organizations[0].id
      orgId = user.organizations[0].id
    } else if (user?.organizationId) {
      // Alternative structure: user.organizationId
      orgId = user.organizationId
    } else if (user?.id) {
      // Organization object stored directly (from organization selector)
      orgId = user.id
    }

    console.log('BillingReadiness - Organization ID:', orgId)
    setOrganizationId(orgId)
  }, [])

  // Generate year options (current year and 2 years back)
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentDate.getFullYear() - i)

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Format billing month as YYYY-MM
  const billingMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  // Fetch organization billing summary
  const { data: summaryData, isLoading, error } = useQuery({
    queryKey: ['billing-summary', organizationId, billingMonth],
    queryFn: () => api.getOrganizationBillingSummary(organizationId, billingMonth),
    enabled: !!organizationId,
  })

  const summary = summaryData?.summary || {}
  const byProgram = summaryData?.byProgram || {}
  const eligiblePatients = summaryData?.eligiblePatients || []
  const notEligiblePatients = summaryData?.notEligiblePatients || []

  // Calculate stats
  const totalPatients = (summary.eligibleEnrollments || 0) + (summary.notEligibleEnrollments || 0)
  const eligibilityPercentage = summary.eligibilityRate || '0.0'

  // Handle CSV export
  const handleExport = async () => {
    if (!organizationId) return

    try {
      const blob = await api.exportBillingSummaryCSV(organizationId, billingMonth)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `billing-summary-${billingMonth}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting billing data:', error)
      alert('Failed to export billing data. Please try again.')
    }
  }

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <div className="text-center">
          <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No organization context available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent mb-2">
              Billing Readiness Dashboard
            </h1>
            <p className="text-lg text-gray-600">
              Configurable billing eligibility across all programs
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={isLoading || totalPatients === 0}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
            Export CSV
          </button>
        </div>

        {/* Month/Year Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-4">
            <CalendarIcon className="h-6 w-6 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">Select Period:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700"
            >
              {monthNames.map((name, index) => (
                <option key={index} value={index + 1}>{name}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium text-gray-700"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <span className="text-sm text-gray-500">
              Showing: <span className="font-semibold text-gray-700">{monthNames[selectedMonth - 1]} {selectedYear}</span>
            </span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">Failed to load billing data: {error.message}</p>
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Enrollments"
            value={totalPatients}
            subtitle="Active enrollments"
            icon={UserIcon}
            color="blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Eligible for Billing"
            value={summary.eligibleEnrollments || 0}
            subtitle={`${eligibilityPercentage}% eligibility rate`}
            icon={CheckCircleIcon}
            color="green"
            isLoading={isLoading}
          />
          <StatCard
            title="Not Eligible"
            value={summary.notEligibleEnrollments || 0}
            subtitle="Requirements not met"
            icon={ExclamationCircleIcon}
            color="red"
            isLoading={isLoading}
          />
          <StatCard
            title="Total Reimbursement"
            value={`$${summary.totalReimbursement || '0.00'}`}
            subtitle={summary.currency || 'USD'}
            icon={CurrencyDollarIcon}
            color="green"
            isLoading={isLoading}
          />
        </div>

        {/* By Program Breakdown */}
        {Object.keys(byProgram).length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <ChartBarIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">By Billing Program</h3>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {Object.entries(byProgram).map(([code, programData]) => (
                <div key={code} className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-900">{programData.programName}</h4>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {programData.count}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-600">Total Revenue:</span>
                    <span className="text-lg font-bold text-green-600">
                      ${programData.totalReimbursement?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Eligible Patients Table */}
        {eligiblePatients.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-green-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Eligible Patients</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {eligiblePatients.length} patients
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Eligible CPT Codes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reimbursement
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {eligiblePatients.map((patient) => (
                    <tr key={patient.enrollmentId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-white" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.patientName}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {patient.patientId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{patient.billingProgram}</div>
                          <div className="text-xs text-gray-500">{patient.billingProgramCode}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge eligible={patient.eligible} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          <span className="font-medium">{patient.summary.eligibleCPTCodes}</span> of{' '}
                          <span className="text-gray-500">{patient.summary.totalCPTCodes}</span>
                        </div>
                        {patient.cptCodes && patient.cptCodes.filter(c => c.eligible).length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {patient.cptCodes
                              .filter(c => c.eligible)
                              .map((code, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800"
                                >
                                  {code.code}
                                </span>
                              ))}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-600">
                          ${patient.totalReimbursement}
                        </div>
                        <div className="text-xs text-gray-500">{patient.currency || 'USD'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Not Eligible Patients */}
        {notEligiblePatients.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-red-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <XCircleIcon className="h-5 w-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Not Eligible Patients</h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {notEligiblePatients.length} patients
                  </span>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {notEligiblePatients.map((patient) => (
                    <tr key={patient.enrollmentId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                            <UserIcon className="h-4 w-4 text-white" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {patient.patientName}
                            </div>
                            <div className="text-xs text-gray-500">
                              ID: {patient.patientId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{patient.billingProgram || 'N/A'}</div>
                          {patient.billingProgramCode && (
                            <div className="text-xs text-gray-500">{patient.billingProgramCode}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-700">
                          {patient.reason || 'Requirements not met'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && eligiblePatients.length === 0 && notEligiblePatients.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="text-center py-12">
              <CurrencyDollarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No billing data available for this period</p>
              <p className="text-sm text-gray-400 mt-2">Try selecting a different month or year</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
