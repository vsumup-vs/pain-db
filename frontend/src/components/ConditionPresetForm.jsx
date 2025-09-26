import React, { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  TagIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export default function ConditionPresetForm({
  preset,
  assessmentTemplates,
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
      name: preset?.name || '',
      description: preset?.description || '',
      diagnoses: preset?.diagnoses || [],
      templateIds: preset?.templates?.map(t => t.templateId) || [],
    },
  })

  const { fields: diagnosisFields, append: appendDiagnosis, remove: removeDiagnosis } = useFieldArray({
    control,
    name: 'diagnoses',
  })

  const watchedValues = watch()
  const selectedTemplateIds = watch('templateIds') || []

  const handleFormSubmit = (data) => {
    // Transform the data to match the API expectations
    const submitData = {
      name: data.name,
      description: data.description,
      diagnoses: data.diagnoses,
      templateIds: data.templateIds || [],
    }
    onSubmit(submitData)
  }

  const nextStep = async () => {
    const isValid = await trigger()
    if (isValid && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const addDiagnosis = () => {
    appendDiagnosis({
      icd10: '',
      snomed: '',
      label: ''
    })
  }

  const getStepTitle = (step) => {
    switch (step) {
      case 1: return 'Basic Information'
      case 2: return 'Diagnoses'
      case 3: return 'Assessment Templates'
      default: return ''
    }
  }

  const getStepDescription = (step) => {
    switch (step) {
      case 1: return 'Set up the basic information for the condition preset'
      case 2: return 'Add relevant diagnoses and ICD-10 codes'
      case 3: return 'Select assessment templates to associate with this preset'
      default: return ''
    }
  }

  const isStepComplete = (step) => {
    switch (step) {
      case 1: return watchedValues.name && watchedValues.name.trim() !== ''
      case 2: return true // Diagnoses are optional
      case 3: return true // Templates are optional but recommended
      default: return false
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (currentStep < totalSteps) {
        nextStep()
      } else {
        handleSubmit(handleFormSubmit)()
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
              step === currentStep 
                ? 'border-indigo-600 bg-indigo-600 text-white' 
                : step < currentStep 
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-300 bg-white text-gray-500'
            }`}>
              {step < currentStep ? (
                <CheckCircleIcon className="w-6 h-6" />
              ) : (
                <span className="text-sm font-medium">{step}</span>
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm font-medium ${
                step === currentStep ? 'text-indigo-600' : step < currentStep ? 'text-green-600' : 'text-gray-500'
              }`}>
                {getStepTitle(step)}
              </p>
              <p className="text-xs text-gray-500">{getStepDescription(step)}</p>
            </div>
            {step < totalSteps && (
              <div className={`w-16 h-0.5 ml-4 ${
                step < currentStep ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-lg bg-indigo-100">
                <InformationCircleIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
                <p className="text-sm text-gray-600">Set up the basic details for your condition preset</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preset Name *
                </label>
                <input
                  type="text"
                  {...register('name', { 
                    required: 'Preset name is required',
                    minLength: { value: 3, message: 'Name must be at least 3 characters' }
                  })}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="e.g., Chronic Pain Management"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Describe the purpose and scope of this condition preset..."
                />
              </div>

              {/* Preview Card */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-6 border border-indigo-200">
                <div className="flex items-center mb-2">
                  <DocumentTextIcon className="h-5 w-5 text-indigo-600 mr-2" />
                  <span className="text-sm font-medium text-indigo-900">Preset Preview</span>
                </div>
                <div className="text-sm text-indigo-800">
                  <p className="font-medium">{watchedValues.name || 'Preset Name'}</p>
                  <p className="text-indigo-600 mt-1">{watchedValues.description || 'Preset description will appear here'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Diagnoses */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-100">
                  <TagIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Diagnoses</h3>
                  <p className="text-sm text-gray-600">Add relevant diagnoses and ICD-10 codes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={addDiagnosis}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Diagnosis
              </button>
            </div>

            <div className="space-y-4">
              {diagnosisFields.map((field, index) => (
                <div key={field.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-900">
                      Diagnosis {index + 1}
                    </h4>
                    <button
                      type="button"
                      onClick={() => removeDiagnosis(index)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        ICD-10 Code *
                      </label>
                      <input
                        type="text"
                        {...register(`diagnoses.${index}.icd10`, {
                          required: 'ICD-10 code is required'
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., M79.3"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        SNOMED Code
                      </label>
                      <input
                        type="text"
                        {...register(`diagnoses.${index}.snomed`)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., 82423001"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Label *
                      </label>
                      <input
                        type="text"
                        {...register(`diagnoses.${index}.label`, {
                          required: 'Label is required'
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="e.g., Chronic pain syndrome"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {diagnosisFields.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <TagIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No diagnoses added yet</h3>
                  <p className="text-sm text-gray-500 mb-4">Add relevant diagnoses to categorize this condition preset</p>
                  <button
                    type="button"
                    onClick={addDiagnosis}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Your First Diagnosis
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Assessment Templates */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center mb-6">
              <div className="p-3 rounded-lg bg-purple-100">
                <DocumentTextIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Assessment Templates</h3>
                <p className="text-sm text-gray-600">Select templates to associate with this condition preset</p>
              </div>
            </div>

            <div className="space-y-4">
              {assessmentTemplates.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No assessment templates available</h3>
                  <p className="text-sm text-gray-500">Create assessment templates first to associate them with condition presets</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {assessmentTemplates.map((template) => (
                    <label
                      key={template.id}
                      className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                        selectedTemplateIds.includes(template.id)
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        value={template.id}
                        {...register('templateIds')}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{template.name}</p>
                            <p className="text-xs text-gray-500">{template.description}</p>
                          </div>
                          <div className="text-xs text-gray-500">
                            {template.items?.length || 0} metrics
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Selected Templates Summary */}
              {selectedTemplateIds.length > 0 && (
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <h4 className="text-sm font-medium text-indigo-900 mb-2">
                    Selected Templates ({selectedTemplateIds.length})
                  </h4>
                  <div className="space-y-1">
                    {selectedTemplateIds.map((templateId) => {
                      const template = assessmentTemplates.find(t => t.id === templateId)
                      return (
                        <div key={templateId} className="flex items-center text-sm text-indigo-800">
                          <CheckCircleIcon className="h-4 w-4 text-indigo-600 mr-2" />
                          {template?.name || 'Unknown Template'}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!isStepComplete(currentStep)}
                className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isStepComplete(currentStep)
                    ? 'bg-indigo-600 hover:bg-indigo-700'
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {isLoading ? 'Saving...' : preset ? 'Update Preset' : 'Create Preset'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}