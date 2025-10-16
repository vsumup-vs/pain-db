import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { toast } from 'react-toastify'

export default function TestAlertEvaluation() {
  const queryClient = useQueryClient()
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedEnrollment, setSelectedEnrollment] = useState('')
  const [selectedMetric, setSelectedMetric] = useState('')
  const [value, setValue] = useState('')

  // Fetch patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.getPatients({ limit: 100 })
  })

  // Fetch enrollments for selected patient
  const { data: enrollmentsData } = useQuery({
    queryKey: ['enrollments', selectedPatient],
    queryFn: () => api.getEnrollments({ patientId: selectedPatient }),
    enabled: !!selectedPatient
  })

  // Fetch metrics
  const { data: metricsData } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => api.getMetricDefinitions({ limit: 100 })
  })

  // Fetch recent alerts
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['recentAlerts'],
    queryFn: () => api.getAlerts({ limit: 10, sortBy: 'triggeredAt', sortOrder: 'desc' }),
    refetchInterval: 3000 // Auto-refresh every 3 seconds
  })

  // Create observation mutation
  const createObservationMutation = useMutation({
    mutationFn: (data) => api.createObservation(data),
    onSuccess: () => {
      toast.success('Observation created! Checking for alerts...')
      setTimeout(() => {
        refetchAlerts()
      }, 1000) // Wait 1 second for alert evaluation
      setValue('')
    },
    onError: (error) => {
      toast.error(`Error: ${error.response?.data?.message || error.message}`)
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!selectedPatient || !selectedEnrollment || !selectedMetric || !value) {
      toast.error('Please fill in all fields')
      return
    }

    createObservationMutation.mutate({
      patientId: selectedPatient,
      enrollmentId: selectedEnrollment,
      metricDefinitionId: selectedMetric,
      value: parseFloat(value),
      recordedBy: 'staff',
      context: 'CLINICAL_MONITORING',
      recordedAt: new Date().toISOString()
    })
  }

  const patients = patientsData?.data || []
  const enrollments = enrollmentsData?.data || []
  const metrics = metricsData?.data || []
  const alerts = alertsData?.data || []

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">
        Test Alert Evaluation Engine
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Observation Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create Test Observation
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Patient
              </label>
              <select
                value={selectedPatient}
                onChange={(e) => {
                  setSelectedPatient(e.target.value)
                  setSelectedEnrollment('') // Reset enrollment when patient changes
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a patient...</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enrollment
              </label>
              <select
                value={selectedEnrollment}
                onChange={(e) => setSelectedEnrollment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
                disabled={!selectedPatient}
              >
                <option value="">Select enrollment...</option>
                {enrollments.map((enrollment) => (
                  <option key={enrollment.id} value={enrollment.id}>
                    {enrollment.careProgram?.name || 'Unknown Program'} - {enrollment.status}
                  </option>
                ))}
              </select>
              {selectedPatient && enrollments.length === 0 && (
                <p className="text-sm text-red-600 mt-1">
                  No enrollments found. Create an enrollment first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Metric
              </label>
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a metric...</option>
                {metrics.map((metric) => (
                  <option key={metric.id} value={metric.id}>
                    {metric.displayName} ({metric.key})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Value
              </label>
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 9 for high pain"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Try entering <strong>8 or higher</strong> for Pain Scale to trigger an alert
              </p>
            </div>

            <button
              type="submit"
              disabled={createObservationMutation.isPending}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {createObservationMutation.isPending ? 'Creating...' : 'Create Observation & Trigger Alert Check'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Test Tips:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Pain Scale ≥8 should trigger HIGH severity alert</li>
              <li>• Blood Glucose &gt;180 triggers MEDIUM alert</li>
              <li>• Alerts appear in the right panel within 1-3 seconds</li>
              <li>• Check backend logs for: 🚨 alert triggered</li>
            </ul>
          </div>
        </div>

        {/* Recent Alerts */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Recent Alerts
            </h2>
            <span className="text-sm text-gray-500">
              Auto-refreshing every 3s
            </span>
          </div>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No alerts yet</p>
                <p className="text-xs mt-2">Create an observation to trigger an alert</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`border-l-4 p-4 rounded-r-lg ${
                    alert.severity === 'CRITICAL' ? 'border-red-500 bg-red-50' :
                    alert.severity === 'HIGH' ? 'border-orange-500 bg-orange-50' :
                    alert.severity === 'MEDIUM' ? 'border-yellow-500 bg-yellow-50' :
                    'border-green-500 bg-green-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                          alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {alert.severity}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(alert.triggeredAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mt-2">
                        {alert.rule?.name}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {alert.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Patient: {alert.patient?.firstName} {alert.patient?.lastName}
                      </p>
                      {alert.riskScore && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-800">
                            Risk Score: {alert.riskScore.toFixed(1)}/10
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Alert Status Counts</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {alerts.filter(a => a.status === 'PENDING').length}
                </div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {alerts.filter(a => a.status === 'ACKNOWLEDGED').length}
                </div>
                <div className="text-xs text-gray-600">Acknowledged</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {alerts.filter(a => a.status === 'RESOLVED').length}
                </div>
                <div className="text-xs text-gray-600">Resolved</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backend Logs Instructions */}
      <div className="mt-8 bg-gray-900 text-gray-100 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">📋 Check Backend Logs</h3>
        <p className="text-sm mb-2">To see alert evaluation in real-time, run:</p>
        <code className="block bg-black text-green-400 p-3 rounded-md text-sm">
          tail -f backend.log | grep -E "(alert|🚨|evaluating)"
        </code>
        <p className="text-xs text-gray-400 mt-2">
          Look for: "🚨 X alert(s) triggered for observation Y"
        </p>
      </div>
    </div>
  )
}
