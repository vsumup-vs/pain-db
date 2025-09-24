import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ClipboardDocumentListIcon,
  ListBulletIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SparklesIcon,
  CogIcon,
  TagIcon,
  QuestionMarkCircleIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

export default function AssessmentTemplateForm({
  template,
  metricDefinitions,
  onSubmit,
  onCancel,
  isLoading,
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm({
    defaultValues: {
      name: template?.name || '',
      description: template?.description || '',
      items: template?.items || [],
    },
  })

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'items',
  })

  const watchedValues = watch()

  const addMetric = () => {
    append({
      metricDefinitionId: '',
      required: false,
      displayOrder: fields.length,
      helpText: '',
      defaultValue: '',
    })
  }

  const moveItem = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex >= 0 && newIndex < fields.length) {
      move(index, newIndex)
    }
  }

  const onFormSubmit = (data) => {
    // Update display orders based on current order
    const itemsWithOrder = data.items.map((item, index) => ({
      ...item,
      displayOrder: index,
    }))
    
    onSubmit({
      ...data,
      items: itemsWithOrder,
    })
  }

  const nextStep = async () => {
    let fieldsToValidate = []
    
    if (currentStep === 1) {
      fieldsToValidate = ['name']
    } else if (currentStep === 2) {
      fieldsToValidate = ['items']
    }
    
    const isValid = await trigger(fieldsToValidate)
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getStepTitle = (step) => {
    switch (step) {
      case 1: return 'Basic Information'
      case 2: return 'Configure Metrics'
      case 3: return 'Review & Finalize'
      default: return ''
    }
  }

  const getStepDescription = (step) => {
    switch (step) {
      case 1: return 'Set up the template name and description'
      case 2: return 'Add and configure metrics for the assessment'
      case 3: return 'Review your template and make final adjustments'
      default: return ''
    }
  }

  const isStepComplete = (step) => {
    switch (step) {
      case 1: return watchedValues.name && watchedValues.name.trim() !== ''
      case 2: return watchedValues.items && watchedValues.items.length > 0
      case 3: return true
      default: return false
    }
  }

  const getMetricTypeInfo = (metricId) => {
    const metric = metricDefinitions.find(m => m.id === metricId)
    if (!metric) return { icon: QuestionMarkCircleIcon, color: 'text-gray-500', bgColor: 'bg-gray-50' }
    
    switch (metric.valueType?.toLowerCase()) {
      case 'numeric':
        return { icon: AdjustmentsHorizontalIcon, color: 'text-blue-600', bgColor: 'bg-blue-50' }
      case 'categorical':
        return { icon: TagIcon, color: 'text-green-600', bgColor: 'bg-green-50' }
      case 'ordinal':
        return { icon: ListBulletIcon, color: 'text-purple-600', bgColor: 'bg-purple-50' }
      case 'boolean':
        return { icon: CheckCircleIcon, color: 'text-indigo-600', bgColor: 'bg-indigo-50' }
      default:
        return { icon: DocumentTextIcon, color: 'text-gray-600', bgColor: 'bg-gray-50' }
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
              step === currentStep 
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg' 
                : step < currentStep 
                  ? 'border-green-500 bg-green-500 text-white'
                  : isStepComplete(step)
                    ? 'border-green-300 bg-green-100 text-green-600'
                    : 'border-gray-300 bg-white text-gray-500'
            }`}>
              {step < currentStep || (step === currentStep && isStepComplete(step)) ? (
                <CheckCircleIcon className="w-6 h-6" />
              ) : (
                <span className="text-sm font-medium">{step}</span>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium transition-colors ${
                step === currentStep ? 'text-indigo-600' : step < currentStep ? 'text-green-600' : 'text-gray-500'
              }`}>
                {getStepTitle(step)}
              </p>
              <p className="text-xs text-gray-500">
                {getStepDescription(step)}
              </p>
            </div>
            {step < totalSteps && (
              <div className={`w-16 h-0.5 ml-4 transition-colors ${
                step < currentStep ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-lg bg-indigo-100">
                <ClipboardDocumentListIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Template Information</h3>
                <p className="text-sm text-gray-600">Define the basic details for your assessment template</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-500" />
                  Template Name *
                </label>
                <input
                  type="text"
                  {...register('name', { required: 'Template name is required' })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="e.g., Daily Pain Assessment, Weekly Mood Check"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                    {errors.name.message}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">Choose a clear, descriptive name for your assessment template</p>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <InformationCircleIcon className="w-4 h-4 mr-2 text-gray-500" />
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Describe the purpose and scope of this assessment template..."
                />
                <p className="text-xs text-gray-500 mt-1">Help clinicians understand when and how to use this template</p>
              </div>

              {/* Template Preview */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
                <div className="flex items-center mb-2">
                  <SparklesIcon className="w-5 h-5 text-indigo-600 mr-2" />
                  <span className="text-sm font-medium text-indigo-900">Template Preview</span>
                </div>
                <div className="text-sm text-indigo-800">
                  <p className="font-medium">{watchedValues.name || 'Template Name'}</p>
                  <p className="text-indigo-600 mt-1">{watchedValues.description || 'Template description will appear here'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Configure Metrics */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <CogIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Configure Metrics</h3>
                  <p className="text-sm text-gray-600">Add and arrange the metrics for your assessment</p>
                </div>
              </div>
              <button
                type="button"
                onClick={addMetric}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Metric
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const selectedMetric = metricDefinitions.find(m => m.id === watchedValues.items?.[index]?.metricDefinitionId)
                const typeInfo = getMetricTypeInfo(watchedValues.items?.[index]?.metricDefinitionId)
                const TypeIcon = typeInfo.icon

                return (
                  <div key={field.id} className="border-2 border-gray-200 rounded-xl p-6 hover:border-indigo-300 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-lg ${typeInfo.bgColor} border border-gray-200`}>
                          <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                        </div>
                        <div className="ml-3">
                          <h4 className="text-sm font-medium text-gray-900">
                            Metric {index + 1}
                            {selectedMetric && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({selectedMetric.valueType})
                              </span>
                            )}
                          </h4>
                          {selectedMetric && (
                            <p className="text-xs text-gray-500">{selectedMetric.displayName}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => moveItem(index, 'up')}
                          disabled={index === 0}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Move up"
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 'down')}
                          disabled={index === fields.length - 1}
                          className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Move down"
                        >
                          <ArrowDownIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove metric"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <label className="form-label">Metric Definition *</label>
                        <select
                          {...register(`items.${index}.metricDefinitionId`, {
                            required: 'Metric definition is required',
                          })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        >
                          <option value="">Select a metric</option>
                          {metricDefinitions.map((metric) => (
                            <option key={metric.id} value={metric.id}>
                              {metric.displayName} ({metric.valueType})
                            </option>
                          ))}
                        </select>
                        {errors.items?.[index]?.metricDefinitionId && (
                          <p className="mt-1 text-sm text-red-600 flex items-center">
                            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
                            {errors.items[index].metricDefinitionId.message}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          {...register(`items.${index}.required`)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm text-gray-700 flex items-center">
                          <ExclamationTriangleIcon className="w-4 h-4 text-red-500 mr-1" />
                          Required field
                        </label>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="form-label">Help Text</label>
                        <input
                          type="text"
                          {...register(`items.${index}.helpText`)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          placeholder="Instructions or guidance for this metric"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="form-label">Default Value</label>
                        <input
                          type="text"
                          {...register(`items.${index}.defaultValue`)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                          placeholder="Optional default value"
                        />
                      </div>
                    </div>

                    {/* Metric Info */}
                    {selectedMetric && (
                      <div className="mt-4 bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600">
                          <p><strong>Description:</strong> {selectedMetric.description || 'No description available'}</p>
                          {selectedMetric.unit && <p><strong>Unit:</strong> {selectedMetric.unit}</p>}
                          {selectedMetric.scaleMin !== null && selectedMetric.scaleMax !== null && (
                            <p><strong>Range:</strong> {selectedMetric.scaleMin} - {selectedMetric.scaleMax}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {fields.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <ListBulletIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No metrics added yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Add metrics to create a functional assessment template</p>
                  <button
                    type="button"
                    onClick={addMetric}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Your First Metric
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Review & Finalize */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-lg bg-purple-100">
                <CheckCircleIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Review & Finalize</h3>
                <p className="text-sm text-gray-600">Review your template configuration before saving</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Template Summary */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-6 border border-purple-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">{watchedValues.name}</h4>
                <p className="text-gray-600 mb-4">{watchedValues.description}</p>
                <div className="flex items-center text-sm text-purple-700">
                  <ListBulletIcon className="w-4 h-4 mr-2" />
                  {watchedValues.items?.length || 0} metrics configured
                </div>
              </div>

              {/* Metrics List */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Configured Metrics</h4>
                <div className="space-y-3">
                  {watchedValues.items?.map((item, index) => {
                    const metric = metricDefinitions.find(m => m.id === item.metricDefinitionId)
                    const typeInfo = getMetricTypeInfo(item.metricDefinitionId)
                    const TypeIcon = typeInfo.icon

                    return (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className={`p-2 rounded-lg ${typeInfo.bgColor} border border-gray-200 mr-3`}>
                            <TypeIcon className={`h-4 w-4 ${typeInfo.color}`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {metric?.displayName || 'Unknown Metric'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {metric?.valueType} • Order: {index + 1}
                              {item.required && ' • Required'}
                            </p>
                          </div>
                        </div>
                        {item.required && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Required
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                disabled={isLoading}
              >
                <ChevronLeftIcon className="h-4 w-4 mr-2" />
                Previous
              </button>
            )}
          </div>

          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center px-6 py-3 border border-transparent text-white font-medium rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
                disabled={isLoading}
              >
                Next
                <ChevronRightIcon className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center px-6 py-3 border border-transparent text-white font-medium rounded-lg bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200 transform hover:scale-105"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    {template ? 'Update Template' : 'Create Template'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}