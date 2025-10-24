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

  // Fetch continuity suggestions FIRST (needed for template filtering)
  const { data: suggestions } = useQuery({
    queryKey: ['continuity-suggestions', selectedPatient],
    queryFn: () => api.getContinuitySuggestions(selectedPatient),
    enabled: !!selectedPatient,
    select: (data) => data?.data || []
  })

  // Fetch assessment templates that match patient's observations
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['matching-templates', selectedPatient, suggestions],
    queryFn: async () => {
      // If no patient selected, return all templates (without filtering)
      if (!selectedPatient) {
        const response = await api.getAssessmentTemplates({ page: 1, limit: 100 })
        return response?.data || []
      }

      // Use continuity suggestions data which already has patient's reusable observations
      console.log('Template filtering - suggestions data:', {
        hasSuggestions: !!suggestions,
        hasReusableObservations: !!suggestions?.reusableObservations,
        observationsCount: suggestions?.reusableObservations?.length || 0
      })

      const patientMetrics = new Set()

      // Extract metric IDs from reusable observations in suggestions
      if (suggestions?.reusableObservations) {
        suggestions.reusableObservations.forEach(obs => {
          if (obs.metricId) {
            console.log('Adding metric ID:', obs.metricId, 'from observation:', obs.metric?.displayName)
            patientMetrics.add(obs.metricId)
          }
        })
      }

      console.log('Patient metric IDs collected:', Array.from(patientMetrics))

      // If no patient metrics found, return empty array
      if (patientMetrics.size === 0) {
        console.log('No patient metrics found - returning empty templates list')
        return []
      }

      // Get all templates with their items
      const templatesResponse = await api.getAssessmentTemplates({ page: 1, limit: 100 })
      const allTemplates = templatesResponse?.data || []
      console.log('Total templates fetched:', allTemplates.length)

      // Fetch each template individually to get items (since list endpoint doesn't include them)
      // Try V2 endpoint first which should include items
      const templatesWithItems = await Promise.all(
        allTemplates.map(async (template) => {
          try {
            console.log(`Fetching template ${template.id} (${template.name})...`)
            const response = await api.getAssessmentTemplateV2(template.id)
            // Backend returns { success: true, data: template }, unwrap the data field
            const detailedTemplate = response.data || response
            console.log(`  → V2 returned ${detailedTemplate.items?.length || 0} items`)
            return detailedTemplate
          } catch (error) {
            console.warn(`V2 failed for ${template.id}, trying V1...`, error.message)
            // Try fallback to V1 endpoint
            try {
              const fallbackResponse = await api.getAssessmentTemplate(template.id)
              // Backend returns { success: true, data: template }, unwrap the data field
              const fallbackTemplate = fallbackResponse.data || fallbackResponse
              console.log(`  → V1 returned ${fallbackTemplate.items?.length || 0} items`)
              return fallbackTemplate
            } catch (fallbackError) {
              console.error(`Both V1 and V2 failed for ${template.id}`)
              return template // Return original if both fail
            }
          }
        })
      )

      console.log('Templates with items fetched:', templatesWithItems.filter(t => t.items?.length > 0).length)

      // Calculate match percentage for each template
      const templatesWithMatches = templatesWithItems.map(template => {
        const templateMetrics = template.items?.map(item => item.metricDefinitionId) || []
        const matches = templateMetrics.filter(id => patientMetrics.has(id))
        const matchPercentage = templateMetrics.length > 0
          ? Math.round((matches.length / templateMetrics.length) * 100)
          : 0

        if (template.name.includes('Pain') || template.name.includes('Daily')) {
          console.log(`Template "${template.name}":`, {
            templateMetrics,
            matches,
            matchPercentage,
            hasItems: !!template.items,
            itemsCount: template.items?.length
          })
        }

        return {
          ...template,
          matchPercentage,
          matchCount: matches.length,
          totalCount: templateMetrics.length
        }
      })

      console.log('Templates with matches > 0:', templatesWithMatches.filter(t => t.matchPercentage > 0).length)

      // Filter to only templates with at least some match (> 0%)
      // and sort by match percentage (best matches first)
      const filtered = templatesWithMatches
        .filter(t => t.matchPercentage > 0)
        .sort((a, b) => b.matchPercentage - a.matchPercentage)

      console.log('Filtered templates:', filtered.map(t => ({ name: t.name, match: t.matchPercentage })))
      return filtered
    },
    enabled: !!selectedPatient && !!suggestions // Only run when patient selected AND suggestions loaded
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

  const handleTestAssessment = async () => {
    if (!selectedPatient || !selectedTemplate) {
      toast.warning('Please select both patient and assessment template')
      return
    }

    try {
      // Get a clinician ID (use first available clinician)
      const cliniciansResponse = await api.getClinicians()
      const clinicians = cliniciansResponse.data || []

      if (clinicians.length === 0) {
        toast.error('No clinicians found in the system')
        return
      }

      const testData = {
        patientId: selectedPatient,
        clinicianId: clinicians[0].id, // Use first available clinician
        templateId: selectedTemplate,
        forceNew: false,
        reuseOptions: {
          allowObservationReuse: true,
          allowAssessmentReuse: true,
          validityHours: 168
        }
      }

      createAssessmentMutation.mutate(testData)
    } catch (error) {
      toast.error('Failed to prepare assessment test data')
      console.error('Assessment test preparation error:', error)
    }
  }

  const handleTestObservation = async () => {
    if (!selectedPatient) {
      toast.warning('Please select a patient')
      return
    }

    try {
      // Get a metric definition ID (use Pain Level metric)
      const metricsResponse = await api.getMetricDefinitions()
      const metrics = metricsResponse.data || []

      // Find Pain Level metric or use first available
      const painMetric = metrics.find(m => m.displayName?.includes('Pain Level')) || metrics[0]

      if (!painMetric) {
        toast.error('No metrics found in the system')
        return
      }

      const testData = {
        patientId: selectedPatient,
        metricDefinitionId: painMetric.id, // Use proper metric ID string
        value: { numeric: Math.floor(Math.random() * 10) + 1 }, // Proper value format
        source: 'MANUAL',
        context: 'CLINICAL_MONITORING',
        notes: 'Test observation for continuity context validation'
      }

      createObservationMutation.mutate(testData)
    } catch (error) {
      toast.error('Failed to prepare observation test data')
      console.error('Observation test preparation error:', error)
    }
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
              {selectedPatient && templatesLoading && (
                <span className="ml-2 text-xs text-gray-500">(Loading matching templates...)</span>
              )}
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={templatesLoading}
            >
              <option value="">
                {!selectedPatient
                  ? 'Select a patient first...'
                  : templatesLoading
                    ? 'Loading...'
                    : templates?.length === 0
                      ? 'No matching templates found'
                      : 'Choose a template...'}
              </option>
              {templates?.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.matchPercentage !== undefined && ` - ${template.matchPercentage}% match`}
                  {template.matchPercentage === 100 && ' ✓'}
                  {template.isStandardized ? ' (Standardized)' : ''}
                </option>
              ))}
            </select>

            {selectedPatient && templates?.length === 0 && !templatesLoading && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ No templates match this patient's observations.
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  The patient needs to have recorded observations that match at least one assessment template's metrics.
                </p>
              </div>
            )}

            {selectedTemplate && templates && (
              (() => {
                const selected = templates.find(t => t.id === selectedTemplate)
                if (selected?.matchPercentage === 100) {
                  return (
                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800">
                        ✓ Perfect match! Expected continuity: ~100%
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        All {selected.totalCount} template metric{selected.totalCount !== 1 ? 's' : ''} have recent observations.
                      </p>
                    </div>
                  )
                } else if (selected?.matchPercentage > 0) {
                  return (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Partial match: {selected.matchCount} of {selected.totalCount} metrics
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Expected continuity: ~{selected.matchPercentage}%
                      </p>
                    </div>
                  )
                }
              })()
            )}
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
                {suggestions?.reusableObservations?.length > 0 || suggestions?.recommendations?.length > 0 ? (
                  <div className="space-y-2">
                    {suggestions.reusableObservations?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-1">Reusable Observations ({suggestions.reusableObservations.length})</p>
                        <ul className="space-y-1 text-sm text-blue-800">
                          {suggestions.reusableObservations.slice(0, 3).map((obs, index) => {
                            // Extract value from JSON structure
                            const displayValue = typeof obs.value === 'object' && obs.value !== null
                              ? (obs.value.numeric ?? obs.value.text ?? obs.value.boolean ?? JSON.stringify(obs.value))
                              : obs.value;

                            return (
                              <li key={index}>
                                • {obs.metric?.displayName || 'Observation'}: {displayValue}
                                ({new Date(obs.recordedAt).toLocaleDateString()})
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {suggestions.recommendations?.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-blue-900 mb-1">Recommendations</p>
                        <ul className="space-y-1 text-sm text-blue-800">
                          {suggestions.recommendations.slice(0, 3).map((rec, index) => (
                            <li key={index}>• {rec.message || rec.action}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
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
                        • {item.template_name || 'Assessment'} - {new Date(item.completed_at || item.created_at).toLocaleDateString()}
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