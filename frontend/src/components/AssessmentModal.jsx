import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  XMarkIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import api from '../services/api'

/**
 * AssessmentModal Component
 *
 * Modal for completing scheduled assessments
 *
 * Flow:
 * 1. Display scheduled assessment details (patient, template, due date)
 * 2. Render assessment form with all metric items
 * 3. Allow clinician to enter responses for each item
 * 4. Add clinician notes
 * 5. Submit assessment and link to scheduled assessment
 *
 * @param {Object} scheduledAssessment - The scheduled assessment to complete
 * @param {boolean} isOpen - Whether the modal is open
 * @param {Function} onClose - Function to close the modal
 * @param {Function} onSuccess - Function called after successful completion
 */
export default function AssessmentModal({ scheduledAssessment, isOpen, onClose, onSuccess }) {
  const queryClient = useQueryClient()
  const [currentStep, setCurrentStep] = useState(1) // 1: Info, 2: Questions, 3: Review

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      responses: {},
      clinicianNotes: '',
    },
  })

  // Fetch the scheduled assessment details with template
  const { data: assessmentData, isLoading: isLoadingAssessment } = useQuery({
    queryKey: ['scheduledAssessment', scheduledAssessment?.id],
    queryFn: () => api.getScheduledAssessmentById(scheduledAssessment.id),
    enabled: isOpen && !!scheduledAssessment?.id,
  })

  // Extract assessment details
  const assessment = assessmentData?.data
  const template = assessment?.template
  const patient = assessment?.patient
  const enrollment = assessment?.enrollment

  // Mutation to start the assessment (mark as IN_PROGRESS)
  const startAssessmentMutation = useMutation({
    mutationFn: (assessmentId) => {
      console.log('[AssessmentModal] Starting assessment:', assessmentId)
      return api.startScheduledAssessment(assessmentId)
    },
    onSuccess: () => {
      console.log('[AssessmentModal] Assessment started successfully')
      queryClient.invalidateQueries(['scheduledAssessment', scheduledAssessment.id])
      setCurrentStep(2) // Move to questions
    },
    onError: (error) => {
      console.error('[AssessmentModal] Error starting assessment:', error)
      alert(`Failed to start assessment: ${error.message || 'Unknown error'}`)
    },
  })

  // Mutation to create the completed assessment
  const createAssessmentMutation = useMutation({
    mutationFn: (assessmentData) => api.createAssessment(assessmentData),
  })

  // Mutation to complete the scheduled assessment
  const completeScheduledAssessmentMutation = useMutation({
    mutationFn: ({ scheduledAssessmentId, assessmentId }) =>
      api.completeScheduledAssessment(scheduledAssessmentId, { assessmentId }),
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledAssessments'])
      queryClient.invalidateQueries(['scheduledAssessment', scheduledAssessment.id])
      queryClient.invalidateQueries(['pendingAssessments'])
      if (onSuccess) onSuccess()
      handleClose()
    },
  })

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      console.log('[AssessmentModal] Modal opened, resetting to step 1')
      reset({
        responses: {},
        clinicianNotes: '',
      })
      setCurrentStep(1)
    }
  }, [isOpen, reset])

  // Log when currentStep changes (disabled for production)
  // useEffect(() => {
  //   console.log('[AssessmentModal] currentStep changed to:', currentStep)
  //   console.log('[AssessmentModal] template:', template)
  //   console.log('[AssessmentModal] template.items:', template?.items)
  // }, [currentStep, template])

  // Auto-calculate PHQ-9 total score
  useEffect(() => {
    if (template?.name?.includes('PHQ-9') && template?.items) {
      // Find the total score metric
      const totalScoreItem = template.items.find(item =>
        item.metricDefinition?.key === 'phq9_total_score' ||
        item.helpText?.toLowerCase().includes('total')
      )

      if (totalScoreItem) {
        // Get all question items (excluding the total score)
        const questionItems = template.items.filter(item =>
          item.id !== totalScoreItem.id &&
          item.metricDefinition?.key?.startsWith('phq9_q')
        )

        // Create array of question metric IDs to watch
        const questionMetricIds = questionItems.map(item => `responses.${item.metricDefinition.id}`)

        // Watch only the question fields (not the total)
        const subscription = watch((formData, { name }) => {
          // Only recalculate if a question field changed (not the total)
          if (name && name.includes('responses.') && !name.includes(totalScoreItem.metricDefinition.id)) {
            let sum = 0

            questionItems.forEach(item => {
              const metricId = item.metricDefinition.id
              const value = formData.responses?.[metricId]

              if (value !== undefined && value !== null && value !== '') {
                sum += parseInt(value, 10)
              }
            })

            // Update total score without triggering another watch cycle
            setValue(`responses.${totalScoreItem.metricDefinition.id}`, sum, { shouldValidate: false })
          }
        })

        return () => subscription.unsubscribe()
      }
    }
  }, [template, watch, setValue])

  // Handle starting the assessment
  const handleStart = () => {
    console.log('[AssessmentModal] handleStart called, assessment:', assessment)
    console.log('[AssessmentModal] template:', template)
    console.log('[AssessmentModal] template.items:', template?.items)
    console.log('[AssessmentModal] template.items.length:', template?.items?.length)

    if (!assessment) {
      console.error('[AssessmentModal] No assessment data available')
      alert('Assessment data is not loaded. Please try closing and reopening this assessment.')
      return
    }

    if (!assessment.id) {
      console.error('[AssessmentModal] Assessment ID is missing:', assessment)
      alert('Assessment ID is missing. Please try again.')
      return
    }

    // Check if template and items are loaded
    if (!template) {
      console.error('[AssessmentModal] Template data not loaded yet')
      alert('Assessment template is loading. Please wait a moment and try again.')
      return
    }

    if (!template.items || template.items.length === 0) {
      console.error('[AssessmentModal] Template has no items:', template)
      alert('Assessment template has no questions. Please contact support.')
      return
    }

    console.log('[AssessmentModal] Assessment status:', assessment.status)
    console.log('[AssessmentModal] About to check status and set step')

    try {
      if (assessment?.status === 'PENDING' || assessment?.status === 'OVERDUE') {
        console.log('[AssessmentModal] Starting assessment with ID:', assessment.id)
        startAssessmentMutation.mutate(assessment.id)
      } else {
        console.log('[AssessmentModal] Assessment already started, moving to step 2')
        console.log('[AssessmentModal] Current step before setState:', currentStep)
        setCurrentStep(2)
        console.log('[AssessmentModal] setState(2) called successfully')
      }
    } catch (error) {
      console.error('[AssessmentModal] Error in handleStart:', error)
      alert(`Error: ${error.message}`)
    }
  }

  // Handle form submission
  const onSubmit = async (formData) => {
    try {
      // Extract clinicianId from the scheduled assessment
      const clinicianId = assessment.scheduledByClinicianId || assessment.scheduledByClinician?.id

      if (!clinicianId) {
        console.error('No clinician ID found in scheduled assessment')
        throw new Error('Clinician information is missing from this assessment')
      }

      // Step 1: Create the Assessment record
      const assessmentResponse = await createAssessmentMutation.mutateAsync({
        patientId: patient.id,
        clinicianId: clinicianId,
        templateId: template.id,
        responses: formData.responses,
        notes: formData.clinicianNotes,
      })

      // Step 2: Link the scheduled assessment to the completed assessment
      await completeScheduledAssessmentMutation.mutateAsync({
        scheduledAssessmentId: assessment.id,
        assessmentId: assessmentResponse.data.id,
      })
    } catch (error) {
      console.error('Error completing assessment:', error)
      // Show user-friendly error message
      alert(error.message || 'Failed to complete assessment. Please try again.')
    }
  }

  const handleClose = () => {
    reset()
    setCurrentStep(1)
    onClose()
  }

  const isLoading =
    startAssessmentMutation.isPending ||
    createAssessmentMutation.isPending ||
    completeScheduledAssessmentMutation.isPending

  // Debug logs (disabled for production)
  // console.log('[AssessmentModal] Rendering - isOpen:', isOpen, 'currentStep:', currentStep)

  if (!isOpen) {
    // console.log('[AssessmentModal] Not rendering - modal is closed')
    return null
  }

  // Loading state
  if (isLoadingAssessment) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleClose} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading assessment...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                {template?.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Patient: {patient?.firstName} {patient?.lastName}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            {/* Step 1: Assessment Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <DocumentTextIcon className="h-6 w-6 text-blue-600 mt-0.5" />
                    <div className="ml-3 flex-1">
                      <h4 className="text-sm font-medium text-blue-900">
                        Assessment Details
                      </h4>
                      <div className="mt-2 text-sm text-blue-700 space-y-1">
                        <p><strong>Frequency:</strong> {assessment?.frequency}</p>
                        <p><strong>Due Date:</strong> {new Date(assessment?.dueDate).toLocaleString()}</p>
                        <p><strong>Status:</strong> <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          assessment?.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          assessment?.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          assessment?.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>{assessment?.status}</span></p>
                        {assessment?.priority > 0 && (
                          <p><strong>Priority:</strong> {assessment.priority}</p>
                        )}
                        {assessment?.notes && (
                          <p><strong>Notes:</strong> {assessment.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Program Information
                  </h4>
                  <p className="text-sm text-gray-600">
                    <strong>Care Program:</strong> {enrollment?.careProgram?.name}
                  </p>
                  {enrollment?.careProgram?.type && (
                    <p className="text-sm text-gray-600">
                      <strong>Type:</strong> {enrollment.careProgram.type}
                    </p>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Assessment Description
                  </h4>
                  <p className="text-sm text-gray-600">
                    {template?.description || 'No description available'}
                  </p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-900">
                        Before You Begin
                      </h4>
                      <p className="mt-1 text-sm text-yellow-700">
                        This assessment contains {template?.items?.length || 0} questions.
                        Please ensure you have adequate time to complete it in one session.
                        {assessment?.isRequired && ' This assessment is required.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={isLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Starting...
                      </>
                    ) : (
                      <>
                        <ClockIcon className="h-4 w-4 mr-2" />
                        Begin Assessment
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Assessment Questions */}
            {currentStep === 2 && (
              <div>
                {!template || !template.items || template.items.length === 0 ? (
                  <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-red-900 mb-2">
                      Error: Assessment Template Not Loaded
                    </h3>
                    <p className="text-sm text-red-700 mb-4">
                      The assessment template data is not available. This should not happen.
                    </p>
                    <p className="text-xs text-red-600">
                      Template: {template ? 'Loaded' : 'NULL'} |
                      Items: {template?.items ? `${template.items.length} items` : 'NULL'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        console.log('[AssessmentModal] Resetting to step 1 due to missing template data')
                        setCurrentStep(1)
                      }}
                      className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Go Back
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-6">
                      {template.items.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-900">
                            {index + 1}. {item.metricDefinition?.name}
                            {item.isRequired && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </label>
                          {item.helpText && (
                            <p className="mt-1 text-sm text-gray-500">{item.helpText}</p>
                          )}
                          {item.metricDefinition?.description && (
                            <p className="mt-1 text-xs text-gray-400">
                              {item.metricDefinition.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        {/* Numeric input */}
                        {item.metricDefinition?.valueType === 'numeric' && (
                          <div>
                            <input
                              type="number"
                              step="any"
                              {...register(`responses.${item.metricDefinition.id}`, {
                                required: item.isRequired ? 'This field is required' : false,
                                min: item.metricDefinition.validationRules?.min || undefined,
                                max: item.metricDefinition.validationRules?.max || undefined,
                              })}
                              readOnly={item.metricDefinition.key === 'phq9_total_score'}
                              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                                item.metricDefinition.key === 'phq9_total_score' ? 'bg-gray-50 cursor-not-allowed' : ''
                              }`}
                              placeholder={
                                item.metricDefinition.key === 'phq9_total_score'
                                  ? 'Auto-calculated'
                                  : item.metricDefinition.unit
                                    ? `Enter value (${item.metricDefinition.unit})`
                                    : 'Enter value'
                              }
                            />
                            {item.metricDefinition.key === 'phq9_total_score' && (
                              <p className="mt-1 text-xs text-blue-600">
                                ✓ This field is automatically calculated from questions 1-9
                              </p>
                            )}
                            {item.metricDefinition.unit && item.metricDefinition.key !== 'phq9_total_score' && (
                              <p className="mt-1 text-xs text-gray-500">
                                Unit: {item.metricDefinition.unit}
                              </p>
                            )}
                            {item.metricDefinition.normalRange && (
                              <p className="mt-1 text-xs text-gray-500">
                                Normal range: {item.metricDefinition.normalRange.min} - {item.metricDefinition.normalRange.max}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Text input */}
                        {item.metricDefinition?.valueType === 'text' && (
                          <textarea
                            {...register(`responses.${item.metricDefinition.id}`, {
                              required: item.isRequired ? 'This field is required' : false,
                            })}
                            rows={3}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            placeholder="Enter your response"
                          />
                        )}

                        {/* Boolean (Yes/No) input */}
                        {item.metricDefinition?.valueType === 'boolean' && (
                          <div className="flex items-center space-x-4">
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                {...register(`responses.${item.metricDefinition.id}`, {
                                  required: item.isRequired ? 'This field is required' : false,
                                })}
                                value="true"
                                className="form-radio h-4 w-4 text-blue-600"
                              />
                              <span className="ml-2 text-sm text-gray-700">Yes</span>
                            </label>
                            <label className="inline-flex items-center">
                              <input
                                type="radio"
                                {...register(`responses.${item.metricDefinition.id}`, {
                                  required: item.isRequired ? 'This field is required' : false,
                                })}
                                value="false"
                                className="form-radio h-4 w-4 text-blue-600"
                              />
                              <span className="ml-2 text-sm text-gray-700">No</span>
                            </label>
                          </div>
                        )}

                        {/* Categorical (Select) input */}
                        {item.metricDefinition?.valueType === 'categorical' && (
                          <div>
                            {(() => {
                              // Extract options from metricDefinition
                              // Options can be in different formats:
                              // 1. options.values (JSON object): {"values": ["Head", "Neck", ...]}
                              // 2. options (JSON array): ["Head/Neck", "Shoulder", ...]
                              // 3. validationInfo.allowedValues (JSON array): ["Option 1", "Option 2", ...]
                              let optionsList = []

                              if (item.metricDefinition.options) {
                                if (Array.isArray(item.metricDefinition.options)) {
                                  // Case 2: Direct array
                                  optionsList = item.metricDefinition.options
                                } else if (item.metricDefinition.options.values && Array.isArray(item.metricDefinition.options.values)) {
                                  // Case 1: Object with values property
                                  optionsList = item.metricDefinition.options.values
                                }
                              }

                              // Case 3: Check validationInfo.allowedValues if options not found
                              if (optionsList.length === 0 && item.metricDefinition.validationInfo?.allowedValues && Array.isArray(item.metricDefinition.validationInfo.allowedValues)) {
                                optionsList = item.metricDefinition.validationInfo.allowedValues
                              }

                              console.log('[AssessmentModal] Categorical field:', item.metricDefinition.name, 'raw options:', item.metricDefinition.options, 'validationInfo:', item.metricDefinition.validationInfo, 'extracted:', optionsList)

                              return (
                                <>
                                  <select
                                    {...register(`responses.${item.metricDefinition.id}`, {
                                      required: item.isRequired ? 'This field is required' : false,
                                    })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                  >
                                    <option value="">Select an option</option>
                                    {optionsList.map((opt, idx) => {
                                      // Handle both string options and {label, value} object options
                                      const optLabel = typeof opt === 'string' ? opt : opt.label
                                      const optValue = typeof opt === 'string' ? opt : opt.value

                                      return (
                                        <option key={idx} value={optValue}>
                                          {optLabel}
                                        </option>
                                      )
                                    })}
                                  </select>
                                  {optionsList.length === 0 && (
                                    <p className="mt-1 text-xs text-red-600">
                                      ⚠️ No options configured for this field
                                    </p>
                                  )}
                                </>
                              )
                            })()}
                          </div>
                        )}

                        {/* Ordinal (Scale) input */}
                        {item.metricDefinition?.valueType === 'ordinal' && (
                          <div>
                            {/* Show as radio buttons if options are provided */}
                            {item.metricDefinition.options && item.metricDefinition.options.length > 0 ? (
                              <div className="space-y-2">
                                {item.metricDefinition.options.map((option, optionIndex) => {
                                  // Handle both string options and {label, value} object options
                                  const optionLabel = typeof option === 'string' ? option : option.label
                                  const optionValue = typeof option === 'string' ? optionIndex : option.value

                                  return (
                                    <label key={optionIndex} className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer">
                                      <input
                                        type="radio"
                                        {...register(`responses.${item.metricDefinition.id}`, {
                                          required: item.isRequired ? 'This field is required' : false,
                                        })}
                                        value={optionValue}
                                        className="form-radio h-4 w-4 text-blue-600"
                                      />
                                      <span className="ml-3 text-sm text-gray-900">
                                        <span className="font-medium">{optionValue}:</span> {optionLabel}
                                      </span>
                                    </label>
                                  )
                                })}
                              </div>
                            ) : (
                              /* Show as slider if no options provided */
                              <div>
                                <input
                                  type="range"
                                  {...register(`responses.${item.metricDefinition.id}`, {
                                    required: item.isRequired ? 'This field is required' : false,
                                  })}
                                  min={item.metricDefinition.validationRules?.min || 0}
                                  max={item.metricDefinition.validationRules?.max || 10}
                                  step="1"
                                  className="w-full"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>{item.metricDefinition.validationRules?.min || 0}</span>
                                  <span className="font-medium">
                                    {watch(`responses.${item.metricDefinition.id}`) || item.metricDefinition.validationRules?.min || 0}
                                  </span>
                                  <span>{item.metricDefinition.validationRules?.max || 10}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Date input */}
                        {item.metricDefinition?.valueType === 'date' && (
                          <input
                            type="date"
                            {...register(`responses.${item.metricDefinition.id}`, {
                              required: item.isRequired ? 'This field is required' : false,
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        )}

                        {/* Time input */}
                        {item.metricDefinition?.valueType === 'time' && (
                          <input
                            type="time"
                            {...register(`responses.${item.metricDefinition.id}`, {
                              required: item.isRequired ? 'This field is required' : false,
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        )}

                        {/* Datetime input */}
                        {item.metricDefinition?.valueType === 'datetime' && (
                          <input
                            type="datetime-local"
                            {...register(`responses.${item.metricDefinition.id}`, {
                              required: item.isRequired ? 'This field is required' : false,
                            })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        )}

                        {/* Validation errors */}
                        {errors.responses?.[item.metricDefinition?.id] && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.responses[item.metricDefinition.id].message}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Clinician Notes */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <label htmlFor="clinicianNotes" className="block text-sm font-medium text-gray-900">
                      Clinician Notes
                    </label>
                    <p className="mt-1 text-sm text-gray-500">
                      Add any additional observations or context about this assessment
                    </p>
                    <textarea
                      id="clinicianNotes"
                      {...register('clinicianNotes')}
                      rows={4}
                      className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Optional notes..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    disabled={isLoading}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Complete Assessment
                      </>
                    )}
                  </button>
                </div>
              </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
