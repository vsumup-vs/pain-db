import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  ArrowLeftIcon,
  UserIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import Modal from '../components/Modal'

export default function EnrollmentDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showAddMedicationModal, setShowAddMedicationModal] = useState(false)
  const [showRecordObservationModal, setShowRecordObservationModal] = useState(false)

  // Fetch enrollment details
  const { data: enrollmentResponse, isLoading } = useQuery({
    queryKey: ['enrollment', id],
    queryFn: () => api.getEnrollment(id),
  })

  // Fetch enrollment medication summary
  const { data: medicationSummaryResponse } = useQuery({
    queryKey: ['enrollment-medications', id],
    queryFn: () => api.getEnrollmentMedicationSummary(id),
    enabled: !!id
  })

  // Fetch recent alerts for this enrollment
  const { data: alertsResponse } = useQuery({
    queryKey: ['enrollment-alerts', id],
    queryFn: () => api.getAlerts({ enrollmentId: id, limit: 10 }),
    enabled: !!id
  })

  // Fetch drugs for medication form
  const { data: drugsResponse } = useQuery({
    queryKey: ['drugs'],
    queryFn: () => api.getDrugs({ limit: 100 }),
    enabled: showAddMedicationModal
  })

  // Fetch enrollment with filtered metric definitions for observation form
  const { data: filteredMetricsResponse } = useQuery({
    queryKey: ['enrollment-filtered-metrics', id],
    queryFn: () => api.getEnrollmentWithFilteredMetrics(id),
    enabled: showRecordObservationModal && !!id
  })

  const enrollment = enrollmentResponse?.data
  const medicationSummary = medicationSummaryResponse?.data
  const alerts = alertsResponse?.data || []
  const drugs = drugsResponse?.data || []
  const filteredMetricsData = filteredMetricsResponse?.data
  const metricDefinitions = filteredMetricsData?.filteredMetricDefinitions || []

  // Add medication mutation
  const addMedicationMutation = useMutation({
    mutationFn: (medicationData) => api.addMedicationToEnrollment(id, medicationData),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollment-medications', id])
      setShowAddMedicationModal(false)
      toast.success('Medication added successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to add medication')
    },
  })

  // Record observation mutation
  // Optimize the mutation with better error handling and caching
  const recordObservationMutation = useMutation({
    mutationFn: (observationData) => api.createObservation(observationData),
    onSuccess: (response) => {
      // OPTIMIZATION: Only invalidate specific queries instead of all
      queryClient.invalidateQueries(['enrollment-filtered-metrics', id])
      queryClient.invalidateQueries(['enrollment-alerts', id])
      setShowRecordObservationModal(false)
      toast.success('Observation recorded successfully')
    },
    onError: (error) => {
      console.error('Observation recording error:', error)
      toast.error(error.response?.data?.message || 'Failed to record observation')
    },
    // OPTIMIZATION: Add retry logic for network issues
    retry: (failureCount, error) => {
      if (error.response?.status >= 400 && error.response?.status < 500) {
        return false // Don't retry client errors
      }
      return failureCount < 2 // Retry up to 2 times for server errors
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!enrollment) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Enrollment not found</h2>
        <p className="mt-2 text-gray-600">The enrollment you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/enrollments')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Enrollments
        </button>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'ended': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAlertSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAddMedication = (medicationData) => {
    addMedicationMutation.mutate(medicationData)
  }

  const handleRecordObservation = (observationData) => {
    const dataWithEnrollment = {
      ...observationData,
      enrollmentId: id,
      patientId: enrollment.patientId,
      source: 'clinician'
    }
    recordObservationMutation.mutate(dataWithEnrollment)
  }

  const handleViewAssessments = () => {
    navigate(`/observations?enrollmentId=${id}`)
  }

  const handleScheduleAssessment = () => {
    navigate('/assessment-templates')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/enrollments')}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Enrollments
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {enrollment.patient?.firstName} {enrollment.patient?.lastName}
              </h1>
              <p className="text-gray-600">{enrollment.preset?.name}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(enrollment.status)}`}>
              {enrollment.status}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Enrollment Overview */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Enrollment Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Patient Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">
                      {enrollment.patient?.firstName} {enrollment.patient?.lastName}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">{enrollment.patient?.email}</div>
                  {enrollment.patient?.phone && (
                    <div className="text-sm text-gray-600">{enrollment.patient?.phone}</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Clinician</h3>
                <div className="space-y-2">
                  <div className="text-sm text-gray-900">
                    {enrollment.clinician?.firstName} {enrollment.clinician?.lastName}
                  </div>
                  <div className="text-sm text-gray-600">{enrollment.clinician?.email}</div>
                  {enrollment.clinician?.specialization && (
                    <div className="text-sm text-gray-600">{enrollment.clinician?.specialization}</div>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Care Program</h3>
                <div className="text-sm text-gray-900">{enrollment.preset?.name}</div>
                {enrollment.preset?.description && (
                  <div className="text-sm text-gray-600 mt-1">{enrollment.preset?.description}</div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Timeline</h3>
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-900">
                    <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                    Started: {new Date(enrollment.startDate).toLocaleDateString()}
                  </div>
                  {enrollment.endDate && (
                    <div className="flex items-center text-sm text-gray-900">
                      <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                      Ends: {new Date(enrollment.endDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {enrollment.diagnosisCode && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Diagnosis</h3>
                <div className="text-sm text-gray-900">{enrollment.diagnosisCode}</div>
              </div>
            )}

            {enrollment.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                <div className="text-sm text-gray-900">{enrollment.notes}</div>
              </div>
            )}

            {/* Reminder Settings */}
            {enrollment.reminderSettings && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                  <BellIcon className="h-4 w-4 mr-2" />
                  Daily Assessment Reminders
                </h3>
                {enrollment.reminderSettings.dailyAssessment ? (
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-900">
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                      Enabled
                    </div>
                    {enrollment.reminderSettings.reminderTime && (
                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4 text-gray-400 mr-2" />
                        Reminder time: {enrollment.reminderSettings.reminderTime}
                      </div>
                    )}
                    {enrollment.reminderSettings.methods && enrollment.reminderSettings.methods.length > 0 && (
                      <div className="text-sm text-gray-600">
                        Notification methods: {enrollment.reminderSettings.methods.join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Daily reminders are disabled for this enrollment
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Medications */}
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Current Medications</h2>
              <button
                onClick={() => setShowAddMedicationModal(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Medication
              </button>
            </div>

            {medicationSummary?.medicationSummary?.length > 0 ? (
              <div className="space-y-4">
                {medicationSummary.medicationSummary.map((medSummary) => (
                  <div key={medSummary.medication.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {medSummary.medication.drug.name} {medSummary.medication.dosage}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {medSummary.medication.frequency} • {medSummary.medication.route}
                        </p>
                        {medSummary.medication.instructions && (
                          <p className="text-sm text-gray-600 mt-1">{medSummary.medication.instructions}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          {medSummary.adherenceStats.adherenceRate}% adherence
                        </div>
                        <div className="text-xs text-gray-500">Last 7 days</div>
                        {medSummary.adherenceStats.lastTaken && (
                          <div className="text-xs text-gray-500">
                            Last taken: {new Date(medSummary.adherenceStats.lastTaken).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {medicationSummary.overallAdherence !== undefined && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-md">
                    <div className="text-sm font-medium text-gray-900">
                      Overall Adherence: {medicationSummary.overallAdherence}%
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p>No medications prescribed yet.</p>
                <p className="text-sm">Click "Add Medication" to prescribe medications for this patient.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Alerts */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Alerts</h3>
            {alerts.length > 0 ? (
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {alert.rule?.severity === 'CRITICAL' || alert.rule?.severity === 'HIGH' || alert.severity === 'HIGH' || alert.severity === 'high' ? (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircleIcon className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {alert.title}
                        </p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getAlertSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{alert.message}</p>
                      <div className="flex items-center mt-1 text-xs text-gray-400">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No recent alerts</p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={handleViewAssessments}
                className="w-full inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <EyeIcon className="h-4 w-4 mr-2" />
                View Assessments
              </button>
              <button 
                onClick={() => setShowRecordObservationModal(true)}
                className="w-full inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Record Observation
              </button>
              <button 
                onClick={handleScheduleAssessment}
                className="w-full inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Schedule Assessment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Medication Modal */}
      <Modal
        isOpen={showAddMedicationModal}
        onClose={() => setShowAddMedicationModal(false)}
        title="Add Medication"
      >
        <AddMedicationForm
          drugs={drugs}
          onSubmit={handleAddMedication}
          isLoading={addMedicationMutation.isPending}
        />
      </Modal>

      {/* Record Observation Modal */}
      <Modal
        isOpen={showRecordObservationModal}
        onClose={() => setShowRecordObservationModal(false)}
        title="Record Observation"
      >
        <RecordObservationForm
          metricDefinitions={metricDefinitions}
          filteredMetricsData={filteredMetricsData}
          onSubmit={handleRecordObservation}
          isLoading={recordObservationMutation.isPending}
        />
      </Modal>
    </div>
  )
}

// Add Medication Form Component
function AddMedicationForm({ drugs, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    drugId: '',
    dosage: '',
    frequency: '',
    route: 'oral',
    instructions: '',
    startDate: new Date().toISOString().split('T')[0],
    isPRN: false
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Medication</label>
        <select
          name="drugId"
          value={formData.drugId}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select a medication</option>
          {drugs.map((drug) => (
            <option key={drug.id} value={drug.id}>
              {drug.name} {drug.strength} ({drug.dosageForm})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Dosage</label>
          <input
            type="text"
            name="dosage"
            value={formData.dosage}
            onChange={handleChange}
            required
            placeholder="e.g., 10mg"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Frequency</label>
          <select
            name="frequency"
            value={formData.frequency}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select frequency</option>
            <option value="Once daily">Once daily</option>
            <option value="Twice daily">Twice daily</option>
            <option value="Three times daily">Three times daily</option>
            <option value="Four times daily">Four times daily</option>
            <option value="As needed">As needed</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Route</label>
        <select
          name="route"
          value={formData.route}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="oral">Oral</option>
          <option value="topical">Topical</option>
          <option value="injection">Injection</option>
          <option value="inhalation">Inhalation</option>
          <option value="sublingual">Sublingual</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Instructions</label>
        <textarea
          name="instructions"
          value={formData.instructions}
          onChange={handleChange}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          placeholder="Special instructions for taking this medication..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Start Date</label>
        <input
          type="date"
          name="startDate"
          value={formData.startDate}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          name="isPRN"
          checked={formData.isPRN}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          PRN (As needed)
        </label>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300"
        >
          {isLoading ? 'Adding...' : 'Add Medication'}
        </button>
      </div>
    </form>
  )
}

function RecordObservationForm({ metricDefinitions, filteredMetricsData, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    metricDefinitionId: '',
    valueNumeric: '',
    valueCode: '',
    valueText: '',
    notes: ''
  })
  const [selectedMetric, setSelectedMetric] = useState(null)

  const handleMetricChange = (metricId) => {
    const metric = metricDefinitions.find(m => m.id === metricId)
    setSelectedMetric(metric)
    setFormData({
      ...formData,
      metricDefinitionId: metricId,
      valueNumeric: '',
      valueCode: '',
      valueText: ''
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Determine the value based on metric type
    let value;
    if (selectedMetric?.valueType === 'numeric') {
      value = parseFloat(formData.valueNumeric)
    } else if (selectedMetric?.valueType === 'categorical' || selectedMetric?.valueType === 'ordinal') {
      value = formData.valueCode
    } else {
      value = formData.valueText
    }

    // Prepare the observation data with single value field
    const observationData = {
      metricDefinitionId: formData.metricDefinitionId,
      value: value,
      notes: formData.notes
    }

    onSubmit(observationData)
  }

  const getMetricGuidance = (metric) => {
    if (!metric) return null

    const guidance = []

    // Add description if available
    if (metric.description) {
      guidance.push({
        type: 'description',
        content: metric.description
      })
    }

    // Helper function to handle different options formats
    const getOptionsArray = (options) => {
      if (!options) return [];
      if (Array.isArray(options)) return options;
      if (options.values && Array.isArray(options.values)) {
        return options.values.map(opt => 
          typeof opt === 'object' ? (opt.display || opt.label || opt.code || opt.value) : opt
        );
      }
      return [];
    };

    // Add specific guidance based on metric type
    switch (metric.valueType) {
      case 'numeric':
        if (metric.scaleMin !== null && metric.scaleMax !== null) {
          guidance.push({
            type: 'range',
            content: `Enter a value between ${metric.scaleMin} and ${metric.scaleMax}${metric.unit ? ` ${metric.unit}` : ''}`
          })
        }
        if (metric.decimalPrecision !== null) {
          guidance.push({
            type: 'precision',
            content: `Use up to ${metric.decimalPrecision} decimal places`
          })
        }
        break
      
      case 'categorical':
      case 'ordinal':
        const optionsArray = getOptionsArray(metric.options);
        if (optionsArray.length > 0) {
          guidance.push({
            type: 'options',
            content: `Select one of the following options: ${optionsArray.join(', ')}`
          })
        }
        break
    }

    // Add common guidance based on metric key patterns
    if (metric.key?.includes('pain')) {
      guidance.push({
        type: 'clinical',
        content: 'Rate your current pain level. Consider both intensity and how it affects your daily activities.'
      })
    } else if (metric.key?.includes('fatigue')) {
      guidance.push({
        type: 'clinical',
        content: 'Rate your current fatigue level. Consider both physical tiredness and mental exhaustion.'
      })
    } else if (metric.key?.includes('sleep')) {
      guidance.push({
        type: 'clinical',
        content: 'Rate the quality of your sleep last night. Consider how rested you feel upon waking.'
      })
    } else if (metric.key?.includes('mood')) {
      guidance.push({
        type: 'clinical',
        content: 'Rate your overall mood today. Consider your emotional state and outlook.'
      })
    } else if (metric.key?.includes('medication')) {
      guidance.push({
        type: 'clinical',
        content: 'Record information about your medication as accurately as possible.'
      })
    }

    return guidance
  }

  const renderGuidancePanel = (metric) => {
    const guidance = getMetricGuidance(metric)
    if (!guidance || guidance.length === 0) return null

    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-amber-800">
              Guidance for {metric.displayName}
            </h3>
            <div className="mt-2 text-sm text-amber-700 space-y-2">
              {guidance.map((item, index) => (
                <div key={index} className={`${item.type === 'clinical' ? 'font-medium' : ''}`}>
                  {item.type === 'range' && (
                    <div className="flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {item.content}
                    </div>
                  )}
                  {item.type === 'clinical' && (
                    <div className="flex items-start">
                      <svg className="h-4 w-4 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {item.content}
                    </div>
                  )}
                  {item.type === 'description' && (
                    <div className="italic">{item.content}</div>
                  )}
                  {item.type === 'options' && (
                    <div className="flex items-start">
                      <svg className="h-4 w-4 mr-1 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                      {item.content}
                    </div>
                  )}
                  {item.type === 'precision' && (
                    <div className="text-xs">{item.content}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderValueInput = () => {
    if (!selectedMetric) return null

    switch (selectedMetric.valueType) {
      case 'numeric':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value {selectedMetric.unit && `(${selectedMetric.unit})`}
              {selectedMetric.scaleMin !== null && selectedMetric.scaleMax !== null && (
                <span className="text-xs text-gray-500 ml-2">
                  Range: {selectedMetric.scaleMin} - {selectedMetric.scaleMax}
                </span>
              )}
            </label>
            <input
              type="number"
              step={selectedMetric.decimalPrecision ? `0.${'0'.repeat(selectedMetric.decimalPrecision - 1)}1` : "any"}
              min={selectedMetric.scaleMin}
              max={selectedMetric.scaleMax}
              value={formData.valueNumeric}
              onChange={(e) => setFormData({ ...formData, valueNumeric: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={`Enter value${selectedMetric.scaleMin !== null && selectedMetric.scaleMax !== null ? ` (${selectedMetric.scaleMin}-${selectedMetric.scaleMax})` : ''}`}
              required
            />
          </div>
        )
      case 'categorical':
      case 'ordinal':
        // Handle different options formats
        const getOptionsArray = (options) => {
          if (!options) return [];
          if (Array.isArray(options)) return options;
          if (options.values && Array.isArray(options.values)) {
            return options.values.map(opt => 
              typeof opt === 'object' ? (opt.display || opt.label || opt.code || opt.value) : opt
            );
          }
          return [];
        };

        const optionsArray = getOptionsArray(selectedMetric.options);

        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value
            </label>
            <select
              value={formData.valueCode}
              onChange={(e) => setFormData({ ...formData, valueCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a value</option>
              {optionsArray.map((value, index) => (
                <option key={index} value={value}>
                  {value}
                </option>
              ))}
            </select>
            {optionsArray.length > 0 && (
              <div className="mt-1 text-xs text-gray-500">
                Available options: {optionsArray.join(', ')}
              </div>
            )}
          </div>
        )
      default:
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Value
            </label>
            <input
              type="text"
              value={formData.valueText}
              onChange={(e) => setFormData({ ...formData, valueText: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your response"
              required
            />
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Contextual Information */}
      {filteredMetricsData?.context && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Contextual Metrics for {filteredMetricsData.context.conditionPreset}
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>{filteredMetricsData.context.message}</p>
                {filteredMetricsData.assessmentTemplates?.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Based on assessment templates:</p>
                    <ul className="list-disc list-inside mt-1">
                      {filteredMetricsData.assessmentTemplates.map((template) => (
                        <li key={template.id}>
                          {template.name} ({template.itemCount} metrics)
                          {template.isStandardized && (
                            <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 rounded">
                              Standardized
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Metric
          </label>
          <select
            value={formData.metricDefinitionId}
            onChange={(e) => handleMetricChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select a metric</option>
            {metricDefinitions.map((metric) => (
              <option key={metric.id} value={metric.id}>
                {metric.displayName}
                {metric.unit && ` (${metric.unit})`}
                {metric.valueType === 'numeric' && metric.scaleMin !== null && metric.scaleMax !== null && 
                  ` [${metric.scaleMin}-${metric.scaleMax}]`}
              </option>
            ))}
          </select>
          {metricDefinitions.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">
              No metrics available for this condition preset. Please contact your administrator.
            </p>
          )}
        </div>

        {/* Guidance Panel */}
        {selectedMetric && renderGuidancePanel(selectedMetric)}

        {renderValueInput()}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Additional notes about this observation..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={() => setFormData({ metricDefinitionId: '', valueNumeric: '', valueCode: '', valueText: '', notes: '' })}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isLoading || metricDefinitions.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Recording...' : 'Record Observation'}
          </button>
        </div>
      </form>
    </div>
  )
}