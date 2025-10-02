import React, { useState } from 'react'
import {
  InformationCircleIcon,
  DocumentTextIcon,
  ScaleIcon,
  HashtagIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ListBulletIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import EnhancedOrdinalOptionsSelector from '../selectors/EnhancedOrdinalOptionsSelector'

export default function MetricDefinitionForm({ metric, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    name: metric?.displayName || metric?.name || '',
    description: metric?.description || '',
    valueType: metric?.valueType || 'numeric',
    unit: metric?.unit || '',
    minValue: metric?.scaleMin || metric?.minValue || '',
    maxValue: metric?.scaleMax || metric?.maxValue || '',
    decimalPrecision: metric?.decimalPrecision || '',
    requiredDefault: metric?.requiredDefault || false,
    defaultFrequency: metric?.defaultFrequency || '',
    category: metric?.category || 'General',
    options: metric?.options ? (Array.isArray(metric.options) ? metric.options.map(opt => 
      typeof opt === 'object' ? opt.label || opt.value : opt
    ).join('\n') : '') : '',
  })

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  // Category options for the dropdown
  const categoryOptions = [
    { value: 'General', label: 'General', icon: '📊', description: 'General health metrics' },
    { value: 'Pain Management', label: 'Pain Management', icon: '🩹', description: 'Pain-related measurements' },
    { value: 'Diabetes', label: 'Diabetes', icon: '🩸', description: 'Blood sugar and diabetes care' },
    { value: 'Fibromyalgia', label: 'Fibromyalgia', icon: '💪', description: 'Fibromyalgia symptoms' },
    { value: 'Mental Health', label: 'Mental Health', icon: '🧠', description: 'Mood and mental wellness' },
    { value: 'Cardiovascular', label: 'Cardiovascular', icon: '❤️', description: 'Heart and circulation' },
    { value: 'Respiratory', label: 'Respiratory', icon: '🫁', description: 'Breathing and lung function' },
    { value: 'Medication', label: 'Medication', icon: '💊', description: 'Medication tracking' }
  ]

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return formData.name && formData.valueType
      case 2:
        if (formData.valueType === 'numeric') {
          return formData.minValue !== '' && formData.maxValue !== ''
        }
        if (formData.valueType === 'categorical' || formData.valueType === 'ordinal') {
          return formData.options.trim().length > 0
        }
        return true
      case 3:
        return true
      default:
        return false
    }
  }

  const getStepTitle = (step) => {
    switch (step) {
      case 1: return 'Basic Information'
      case 2: return 'Configuration'
      case 3: return 'Final Settings'
      default: return ''
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.target.type !== 'textarea') {
      e.preventDefault()
      if (currentStep < totalSteps && isStepValid(currentStep)) {
        nextStep()
      } else if (currentStep === totalSteps && isStepValid(currentStep)) {
        handleSubmit(e)
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
            </div>
            {step < totalSteps && (
              <div className={`w-16 h-0.5 ml-4 ${
                step < currentStep ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Getting Started</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Define the basic properties of your metric. This information will be visible to patients when they enter data.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-500" />
                  Metric Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="e.g., Pain Quality, Mood Level, Sleep Quality"
                />
                <p className="text-xs text-gray-500 mt-1">This is what patients will see when entering data</p>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <DocumentTextIcon className="w-4 h-4 mr-2 text-gray-500" />
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  placeholder="Describe what this metric measures and how patients should interpret it..."
                />
                <p className="text-xs text-gray-500 mt-1">Help patients understand what they're measuring</p>
              </div>

              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                  <ListBulletIcon className="w-4 h-4 mr-2 text-gray-500" />
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                >
                  {categoryOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.icon} {option.label} - {option.description}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Choose the category that best describes this metric</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <ScaleIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Value Type *
                  </label>
                  <select
                    name="valueType"
                    value={formData.valueType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                  >
                    <option value="numeric">📊 Numeric (numbers)</option>
                    <option value="text">📝 Text (free text)</option>
                    <option value="boolean">✅ Boolean (yes/no)</option>
                    <option value="categorical">📋 Categorical (multiple choice)</option>
                    <option value="ordinal">🔢 Ordinal (ranked options)</option>
                  </select>
                </div>
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                    <HashtagIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Unit
                  </label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="e.g., points, mg, cm, hours, N/A"
                  />
                  <p className="text-xs text-gray-500 mt-1">Unit of measurement (if applicable)</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-amber-900">Configuration Settings</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Configure how patients will interact with this metric. These settings affect data validation and user experience.
                  </p>
                </div>
              </div>
            </div>

            {formData.valueType === 'numeric' && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ScaleIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  Numeric Configuration
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Value *</label>
                    <input
                      type="number"
                      name="minValue"
                      value={formData.minValue}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      step="any"
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Value *</label>
                    <input
                      type="number"
                      name="maxValue"
                      value={formData.maxValue}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      step="any"
                      placeholder="10"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Decimal Precision</label>
                    <input
                      type="number"
                      name="decimalPrecision"
                      value={formData.decimalPrecision}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      min="0"
                      max="10"
                      placeholder="0"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Set the valid range for numeric values. Decimal precision determines how many decimal places are allowed.
                </p>
              </div>
            )}

            {(formData.valueType === 'categorical' || formData.valueType === 'ordinal') && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ListBulletIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  {formData.valueType === 'categorical' ? 'Categorical' : 'Ordinal'} Options
                </h4>
                
                {formData.valueType === 'ordinal' && (
                  <EnhancedOrdinalOptionsSelector
                    value={formData.options}
                    onChange={(value) => setFormData(prev => ({ ...prev, options: value }))}
                  />
                )}
                
                {formData.valueType === 'categorical' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Options *
                    </label>
                    <textarea
                      name="options"
                      value={formData.options}
                      onChange={handleChange}
                      rows={6}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                      placeholder={`Enter one option per line, for example:\nOption 1\nOption 2\nOption 3`}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Enter each option on a new line. Order does not matter for categorical data.
                    </p>
                  </div>
                )}
              </div>
            )}

            {(formData.valueType === 'text' || formData.valueType === 'boolean') && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  {formData.valueType === 'text' ? 'Text' : 'Boolean'} Configuration
                </h4>
                <p className="text-gray-600">
                  {formData.valueType === 'text' 
                    ? 'Text metrics allow patients to enter free-form text responses. No additional configuration is needed.'
                    : 'Boolean metrics allow patients to select Yes/No or True/False responses. No additional configuration is needed.'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Final Settings */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-green-900">Final Settings</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Configure additional settings for data collection frequency and requirements.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <ClockIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  Collection Settings
                </h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        name="requiredDefault"
                        checked={formData.requiredDefault}
                        onChange={handleChange}
                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Required by Default</span>
                        <p className="text-xs text-gray-500">Patients must provide this metric when submitting data</p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Default Collection Frequency</label>
                    <select
                      name="defaultFrequency"
                      value={formData.defaultFrequency}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Select frequency...</option>
                      <option value="daily">📅 Daily</option>
                      <option value="weekly">📆 Weekly</option>
                      <option value="monthly">🗓️ Monthly</option>
                      <option value="as_needed">🔔 As Needed</option>
                      <option value="custom">⚙️ Custom</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">How often should patients typically report this metric?</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
              >
                Previous
              </button>
            )}
          </div>

          <div className="text-sm text-gray-500">
            Step {currentStep} of {totalSteps}
          </div>

          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Next button clicked. Current step:', currentStep)
                  nextStep()
                }}
                disabled={!isStepValid(currentStep)}
                className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading || !isStepValid(currentStep)}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>{metric ? 'Update Metric' : 'Create Metric'}</span>
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