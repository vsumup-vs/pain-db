import React, { useState } from 'react'
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
  ChartBarIcon
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

const StatusBadge = ({ status }) => {
  const statusConfig = {
    ELIGIBLE: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: CheckCircleIcon,
      label: 'Eligible'
    },
    CLOSE: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: ClockIcon,
      label: 'Close (80%+)'
    },
    NOT_ELIGIBLE: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: XCircleIcon,
      label: 'Not Eligible'
    }
  }

  const config = statusConfig[status] || statusConfig.NOT_ELIGIBLE
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

  // Generate year options (current year and 2 years back)
  const yearOptions = Array.from({ length: 3 }, (_, i) => currentDate.getFullYear() - i)

  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Fetch billing readiness data
  const { data: billingResponse, isLoading, refetch } = useQuery({
    queryKey: ['billing-readiness', selectedYear, selectedMonth],
    queryFn: () => api.getBillingReadiness({ year: selectedYear, month: selectedMonth }),
  })

  const billingData = billingResponse?.data || {}
  const summary = billingData.summary || {}
  const patients = billingData.patients || []

  // Calculate eligibility percentage
  const eligibilityPercentage = summary.totalPatients > 0
    ? Math.round((summary.eligible / summary.totalPatients) * 100)
    : 0

  // Handle CSV export
  const handleExport = async () => {
    try {
      const response = await fetch(
        `http://localhost:3000/api/billing/readiness/export?year=${selectedYear}&month=${selectedMonth}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `billing-readiness-${monthNames[selectedMonth - 1]}-${selectedYear}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting billing data:', error)
    }
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
              CMS billing eligibility for CCM, RPM, and RTM programs
            </p>
          </div>
          <button
            onClick={handleExport}
            disabled={isLoading || patients.length === 0}
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

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Patients"
            value={summary.totalPatients || 0}
            subtitle="Active enrollments"
            icon={UserIcon}
            color="blue"
            isLoading={isLoading}
          />
          <StatCard
            title="Eligible for Billing"
            value={summary.eligible || 0}
            subtitle={`${eligibilityPercentage}% eligibility rate`}
            icon={CheckCircleIcon}
            color="green"
            isLoading={isLoading}
          />
          <StatCard
            title="Close to Eligible"
            value={summary.close || 0}
            subtitle="80%+ requirements met"
            icon={ClockIcon}
            color="yellow"
            isLoading={isLoading}
          />
          <StatCard
            title="Not Eligible"
            value={summary.notEligible || 0}
            subtitle="Below 80% threshold"
            icon={ExclamationCircleIcon}
            color="red"
            isLoading={isLoading}
          />
        </div>

        {/* Billing Code Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">CCM (99091)</h3>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {summary.ccmEligible || 0} eligible
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Chronic Care Management: 20+ minutes clinical time
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Required:</span>
                <span className="font-semibold text-gray-900">20 minutes</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">RPM (99454)</h3>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
                {summary.rpmEligible || 0} eligible
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Remote Patient Monitoring: 16+ days of device readings
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Required:</span>
                <span className="font-semibold text-gray-900">16 days</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">RTM (99457)</h3>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                {summary.rtmEligible || 0} eligible
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-2">
              Remote Therapeutic Monitoring: 20+ min + 16+ days
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">Required:</span>
                <span className="font-semibold text-gray-900">20 min + 16 days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Patient Eligibility Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ChartBarIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Patient Eligibility Details</h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {patients.length} patients
                </span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : patients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Patient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Overall Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CCM (99091)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RPM (99454)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RTM (99457)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {patients.map((patient) => (
                    <tr key={patient.patientId} className="hover:bg-gray-50 transition-colors">
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
                              MRN: {patient.medicalRecordNumber || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={patient.overallStatus} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{patient.ccm.totalMinutes} min</div>
                          <div className="text-xs text-gray-500">{patient.ccm.percentage}% of 20 min</div>
                          <div className="mt-1">
                            <StatusBadge status={patient.ccm.status} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">{patient.rpm.daysWithReadings} days</div>
                          <div className="text-xs text-gray-500">{patient.rpm.percentage}% of 16 days</div>
                          <div className="mt-1">
                            <StatusBadge status={patient.rpm.status} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {patient.rtm.interactiveMinutes} min / {patient.rtm.daysWithReadings} days
                          </div>
                          <div className="text-xs text-gray-500">
                            {patient.rtm.percentageTime}% time / {patient.rtm.percentageData}% data
                          </div>
                          <div className="mt-1">
                            <StatusBadge status={patient.rtm.status} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {patient.enrollments.map((enrollment, idx) => (
                            <div key={idx} className="mb-1">
                              <div className="font-medium text-gray-900">{enrollment.programName}</div>
                              <div className="text-xs text-gray-500">
                                {enrollment.clinician.firstName} {enrollment.clinician.lastName}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CurrencyDollarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No billing data available for this period</p>
              <p className="text-sm text-gray-400 mt-2">Try selecting a different month or year</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
