import React, { Fragment } from 'react'
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
  CalendarIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import TimerWidget from './TimerWidget'

export default function PatientContextPanel({ isOpen, onClose, patientId, clinicianId, days = 30 }) {
  const queryClient = useQueryClient()

  // Fetch patient context data
  const { data: contextData, isLoading } = useQuery({
    queryKey: ['patientContext', patientId, days],
    queryFn: () => api.getPatientContext(patientId, { days }),
    enabled: isOpen && !!patientId,
    refetchInterval: 60000 // Refresh every minute when open
  })

  const context = contextData?.data || {}
  const patient = context.patient || {}
  const vitals = context.vitals || {}
  const medications = context.medications || {}
  const conditions = context.conditions || []
  const alerts = context.alerts || {}
  const assessments = context.assessments || {}
  const summary = context.summary || {}

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

  return (
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
                <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white shadow-xl">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-6 sm:px-6">
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
                        <div className="mt-4">
                          <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0">
                              <div className="h-16 w-16 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                                <UserIcon className="h-8 w-8 text-white" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-2xl font-bold text-white truncate">
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
                          <div className="mt-4 grid grid-cols-2 gap-3">
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
                    <div className="flex-1 px-4 py-6 sm:px-6">
                      {isLoading ? (
                        <div className="space-y-6">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className="animate-pulse">
                              <div className="h-4 bg-gray-200 rounded w-1/4 mb-3"></div>
                              <div className="h-20 bg-gray-200 rounded"></div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* Timer Widget */}
                          {patient.id && (
                            <TimerWidget
                              patientId={patientId}
                              patientName={`${patient.firstName} ${patient.lastName}`}
                              onTimeStopped={() => queryClient.invalidateQueries(['patientContext', patientId, days])}
                            />
                          )}

                          {/* Summary Cards */}
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                              <HeartIcon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                              <div className="text-2xl font-bold text-blue-900">{summary.totalActiveConditions || 0}</div>
                              <div className="text-xs text-blue-600">Active Conditions</div>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                              <BeakerIcon className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                              <div className="text-2xl font-bold text-purple-900">{summary.totalActiveMedications || 0}</div>
                              <div className="text-xs text-purple-600">Medications</div>
                            </div>
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                              <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mx-auto mb-2" />
                              <div className="text-2xl font-bold text-red-900">{summary.totalActiveAlerts || 0}</div>
                              <div className="text-xs text-red-600">Active Alerts</div>
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
                          {alerts.active && alerts.active.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                                Active Alerts ({alerts.totalActive})
                              </h4>
                              <div className="space-y-2">
                                {alerts.active.slice(0, 5).map((alert) => (
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
                                        <p className="text-sm font-medium text-gray-900">{alert.rule.name}</p>
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
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Vitals Trends */}
                          {vitals.lastReadings && Object.keys(vitals.lastReadings).length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                <ChartBarIcon className="h-5 w-5 text-blue-500 mr-2" />
                                Recent Vitals
                              </h4>
                              <div className="grid grid-cols-2 gap-3">
                                {Object.entries(vitals.lastReadings).slice(0, 6).map(([key, reading]) => (
                                  <div key={key} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                    <div className="text-xs text-gray-600 mb-1">{reading.displayName}</div>
                                    <div className="flex items-baseline justify-between">
                                      <div className="text-lg font-bold text-gray-900">
                                        {typeof reading.value === 'object' ? JSON.stringify(reading.value) : reading.value}
                                        {reading.unit && <span className="text-sm text-gray-500 ml-1">{reading.unit}</span>}
                                      </div>
                                      <span className="text-xs text-gray-500">{getTimeAgo(reading.lastReading)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Active Medications */}
                          {medications.active && medications.active.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                <BeakerIcon className="h-5 w-5 text-purple-500 mr-2" />
                                Active Medications ({medications.totalActive})
                              </h4>
                              <div className="space-y-3">
                                {medications.active.map((med) => (
                                  <div key={med.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
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
                              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                                <HeartIcon className="h-5 w-5 text-red-500 mr-2" />
                                Active Conditions
                              </h4>
                              <div className="space-y-3">
                                {conditions.map((condition, index) => (
                                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
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
  )
}
