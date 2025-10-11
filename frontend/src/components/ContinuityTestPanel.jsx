import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  BeakerIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'
import { api } from '../services/api'

export default function ContinuityTestPanel() {
  const [selectedPatient, setSelectedPatient] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [testResults, setTestResults] = useState([])
  const queryClient = useQueryClient()

  // Fetch patients for testing
  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.getPatients({ page: 1, limit: 10 }),
    select: (data) => data?.data || []
  })

  // Fetch assessment templates for testing
  const { data: templates } = useQuery({
    queryKey: ['assessment-templates'],
    queryFn: () => api.getAssessmentTemplates({ page: 1, limit: 10 }),
    select: (data) => data?.data || []
  })

  // Fetch continuity suggestions
  const { data: suggestions, refetch: refetchSuggestions } = useQuery({
    queryKey: ['continuity-suggestions', selectedPatient],
    queryFn: () => api.getContinuitySuggestions(selectedPatient),
    enabled: !!selectedPatient,
    select: (data) => data?.data || []
  })

  // Fetch continuity history
  const { data: history, refetch: refetchHistory } = useQuery({
    queryKey: ['continuity-history', selectedPatient],
    queryFn: () => api.getContinuityHistory(selectedPatient),
    enabled: !!selectedPatient,
    select: (data) => data?.data || []
  })

  // Test assessment creation with continuity
  const createAssessmentMutation = useMutation({
    mutationFn: (data) => api.createAssessmentWithContinuity(data),
    onSuccess: (result) => {
      const testResult = {
        id: Date.now(),
        type: 'Assessment Creation',
        status: 'success',
        message: `Assessment created successfully with ${result.data?.continuityScore || 0}% continuity score`,
        timestamp: new Date().toLocaleTimeString(),
        data: result.data
      }
      setTestResults(prev => [testResult, ...prev])
      toast.success('Assessment created with continuity analysis!')
      queryClient.invalidateQueries(['continuity-suggestions'])
      queryClient.invalidateQueries(['continuity-history'])
    },
    onError: (error) => {
      const testResult = {
        id: Date.now(),
        type: 'Assessment Creation',
        status: 'error',
        message: error.response?.data?.message || 'Failed to create assessment',
        timestamp: new Date().toLocaleTimeString(),
        error: error
      }
      setTestResults(prev => [testResult, ...prev])
      toast.error('Failed to create assessment with continuity')
    }
  })

  // Test observation creation with context
  const createObservationMutation = useMutation({
    mutationFn: (data) => api.createObservationWithContext(data),
    onSuccess: (result) => {
      const testResult = {
        id: Date.now(),
        type: 'Observation Creation',
        status: 'success',
        message: `Observation created with context: ${result.data?.context || 'Unknown'}`,
        timestamp: new Date().toLocaleTimeString(),
        data: result.data
      }
      setTestResults(prev => [testResult, ...prev])
      toast.success('Observation created with context!')
      queryClient.invalidateQueries(['continuity-suggestions'])
      queryClient.invalidateQueries(['continuity-history'])
    },
    onError: (error) => {
      const testResult = {
        id: Date.now(),
        type: 'Observation Creation',
        status: 'error',
        message: error.response?.data?.message || 'Failed to create observation',
        timestamp: new Date().toLocaleTimeString(),
        error: error
      }
      setTestResults(prev => [testResult, ...prev])
      toast.error('Failed to create observation with context')
    }
  })

  const handleTestAssessment = () => {
    if (!selectedPatient || !selectedTemplate) {
      toast.warning('Please select both patient and assessment template')
      return
    }

    const testData = {
      patientId: selectedPatient,
      templateId: selectedTemplate,
      responses: {
        pain_level: Math.floor(Math.random() * 10) + 1,
        pain_location: 'Lower back',
        pain_duration: 'Chronic (>3 months)',
        functional_impact: 'Moderate'
      },
      notes: 'Test assessment for continuity system validation'
    }

    createAssessmentMutation.mutate(testData)
  }

  const handleTestObservation = () => {
    if (!selectedPatient) {
      toast.warning('Please select a patient')
      return
    }

    const testData = {
      patientId: selectedPatient,
      metricId: 1, // Assuming pain level metric exists
      value: Math.floor(Math.random() * 10) + 1,
      unit: 'scale',
      context: 'ROUTINE_FOLLOWUP',
      notes: 'Test observation for continuity context validation'
    }

    createObservationMutation.mutate(testData)
  }

  const clearTestResults = () => {
    setTestResults([])
    toast.info('Test results cleared')
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BeakerIcon className="h-8 w-8 text-purple-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Smart Assessment Continuity Test Panel</h2>
            <p className="text-gray-600">Test frontend integration with continuity API endpoints</p>
          </div>
        </div>
        <button
          onClick={clearTestResults}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Clear Results
        </button>
      </div>

      {/* Test Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Test Configuration</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Patient
            </label>
            <select
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Choose a patient...</option>
              {patients?.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} (ID: {patient.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Assessment Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Choose a template...</option>
              {templates?.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.isStandardized ? '(Standardized)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={handleTestAssessment}
              disabled={createAssessmentMutation.isPending || !selectedPatient || !selectedTemplate}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createAssessmentMutation.isPending ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                'Test Assessment'
              )}
            </button>
            <button
              onClick={handleTestObservation}
              disabled={createObservationMutation.isPending || !selectedPatient}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createObservationMutation.isPending ? (
                <ArrowPathIcon className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                'Test Observation'
              )}
            </button>
          </div>
        </div>

        {/* Continuity Data Display */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Continuity Data</h3>
          
          {selectedPatient && (
            <>
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Continuity Suggestions</h4>
                {suggestions?.length > 0 ? (
                  <ul className="space-y-1 text-sm text-blue-800">
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <li key={index}>• {suggestion.suggestion || suggestion.message}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-blue-600">No suggestions available</p>
                )}
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Recent History</h4>
                {history?.length > 0 ? (
                  <ul className="space-y-1 text-sm text-green-800">
                    {history.slice(0, 3).map((item, index) => (
                      <li key={index}>
                        • {item.action || 'Assessment'} - {new Date(item.createdAt).toLocaleDateString()}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-green-600">No history available</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Test Results */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Results</h3>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No test results yet. Run some tests to see results here.</p>
            </div>
          ) : (
            testResults.map((result) => (
              <div
                key={result.id}
                className={`p-4 rounded-lg border-l-4 ${
                  result.status === 'success'
                    ? 'bg-green-50 border-green-400'
                    : 'bg-red-50 border-red-400'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    {result.status === 'success' ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                    )}
                    <div>
                      <h4 className={`font-medium ${
                        result.status === 'success' ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {result.type}
                      </h4>
                      <p className={`text-sm ${
                        result.status === 'success' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {result.message}
                      </p>
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-600 cursor-pointer">View Details</summary>
                          <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs ${
                    result.status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {result.timestamp}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}