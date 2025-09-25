import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  InformationCircleIcon,
  HashtagIcon,
  DocumentTextIcon,
  ScaleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon,
  ListBulletIcon,
  NumberedListIcon,
  CalculatorIcon,
  TagIcon,
  CalendarIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import Modal from '../components/Modal'

export default function MetricDefinitions() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const queryClient = useQueryClient()

  const { data: metricDefinitions, isLoading, error } = useQuery({
    queryKey: ['metricDefinitions'],
    queryFn: api.getMetricDefinitions
  })

  const createMutation = useMutation({
    mutationFn: api.createMetricDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries(['metricDefinitions'])
      setIsModalOpen(false)
      toast.success('Metric definition created successfully')
    },
    onError: (error) => {
      console.error('Create error:', error)
      toast.error(error.response?.data?.message || 'Failed to create metric definition')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateMetricDefinition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['metricDefinitions'])
      setIsModalOpen(false)
      setEditingMetric(null)
      toast.success('Metric definition updated successfully')
    },
    onError: (error) => {
      console.error('Update error:', error)
      toast.error(error.response?.data?.message || 'Failed to update metric definition')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteMetricDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries(['metricDefinitions'])
      toast.success('Metric definition deleted successfully')
    },
    onError: (error) => {
      console.error('Delete error:', error)
      toast.error(error.response?.data?.message || 'Failed to delete metric definition')
    }
  })

  const handleSubmit = (data) => {
    // Validate required fields
    if (!data.name) {
      toast.error('Name is required')
      return
    }

    // Additional validation for numeric metrics
    if (data.valueType === 'numeric') {
      if (!data.minValue || !data.maxValue) {
        toast.error('Min Value and Max Value are required for numeric metrics')
        return
      }
      if (parseFloat(data.minValue) >= parseFloat(data.maxValue)) {
        toast.error('Min Value must be less than Max Value')
        return
      }
    }

    // Validation for categorical/ordinal metrics
    if ((data.valueType === 'categorical' || data.valueType === 'ordinal') && (!data.options || data.options.length === 0)) {
      toast.error('Options are required for categorical and ordinal metrics')
      return
    }

    // Generate a key from the name if not provided
    const key = data.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

    // Map frontend field names to backend field names
    const backendData = {
      key: key,
      displayName: data.name,
      description: data.description || '',
      valueType: data.valueType.toLowerCase(),
      unit: data.unit || null,
      requiredDefault: data.requiredDefault || false,
      defaultFrequency: data.defaultFrequency || null,
    }

    // Only include numeric-specific fields for numeric metrics
    if (data.valueType === 'numeric') {
      backendData.scaleMin = parseFloat(data.minValue)
      backendData.scaleMax = parseFloat(data.maxValue)
      if (data.decimalPrecision) {
        backendData.decimalPrecision = parseInt(data.decimalPrecision)
      }
    }

    // Include options for categorical/ordinal metrics
    if ((data.valueType === 'categorical' || data.valueType === 'ordinal') && data.options) {
      backendData.options = data.options
    }

    // Add debugging
    console.log('Submitting metric definition:', backendData)

    if (editingMetric) {
      updateMutation.mutate({ id: editingMetric.id, data: backendData })
    } else {
      createMutation.mutate(backendData)
    }
  }

  const handleEdit = (metric) => {
    // Map backend field names to frontend field names
    const frontendMetric = {
      ...metric,
      name: metric.displayName,
      minValue: metric.scaleMin,
      maxValue: metric.scaleMax,
    }
    setEditingMetric(frontendMetric)
    setIsModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this metric definition?')) {
      deleteMutation.mutate(id)
    }
  }

  // Helper function to get metric type icon and color
  const getMetricTypeInfo = (valueType) => {
    switch (valueType?.toLowerCase()) {
      case 'numeric':
        return { icon: CalculatorIcon, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' }
      case 'categorical':
        return { icon: TagIcon, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
      case 'ordinal':
        return { icon: NumberedListIcon, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' }
      case 'boolean':
        return { icon: CheckCircleIcon, color: 'text-indigo-600', bgColor: 'bg-indigo-50', borderColor: 'border-indigo-200' }
      default:
        return { icon: DocumentTextIcon, color: 'text-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' }
    }
  }

  // Filter metrics based on search and type
  const filteredMetrics = metricDefinitions?.data?.filter(metric => {
    const matchesSearch = metric.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         metric.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         metric.key.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || metric.valueType === filterType
    return matchesSearch && matchesType
  }) || []

  // Get unique metric types for filter
  const metricTypes = [...new Set(metricDefinitions?.data?.map(m => m.valueType) || [])]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading metric definitions...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">Error loading metric definitions: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ChartBarIcon className="h-8 w-8 text-indigo-600 mr-3" />
                Metric Definitions
              </h1>
              <p className="mt-2 text-gray-600">
                Manage and configure metrics for patient data collection
              </p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all duration-200 hover:scale-105"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add New Metric
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search metrics by name, description, or key..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white min-w-[150px]"
              >
                <option value="all">All Types</option>
                {metricTypes.map(type => (
                  <option key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredMetrics.length} of {metricDefinitions?.data?.length || 0} metrics
            </span>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-indigo-600 hover:text-indigo-800"
              >
                Clear search
              </button>
            )}
          </div>
        </div>

        {/* Metrics Grid */}
        {filteredMetrics.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm || filterType !== 'all' ? 'No matching metrics found' : 'No metric definitions yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || filterType !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Create your first metric definition to get started'
                }
              </p>
              {!searchTerm && filterType === 'all' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Your First Metric
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredMetrics.map((metric) => {
              const typeInfo = getMetricTypeInfo(metric.valueType)
              const TypeIcon = typeInfo.icon
              
              return (
                <div 
                  key={metric.id} 
                  className={`bg-white rounded-xl shadow-sm border-2 ${typeInfo.borderColor} hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 overflow-hidden`}
                >
                  {/* Card Header */}
                  <div className={`${typeInfo.bgColor} px-6 py-4 border-b border-gray-100`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${typeInfo.bgColor} border ${typeInfo.borderColor}`}>
                          <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                            {metric.displayName}
                          </h3>
                          <div className="flex items-center mt-1">
                            <HashtagIcon className="h-3 w-3 text-gray-400 mr-1" />
                            <span className="text-xs text-gray-500 font-mono">{metric.key}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handleEdit(metric)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit metric"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(metric.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete metric"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {metric.description || 'No description provided'}
                    </p>

                    {/* Metric Details */}
                    <div className="space-y-3">
                      {/* Type Badge */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Type</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeInfo.bgColor} ${typeInfo.color}`}>
                          {metric.valueType}
                        </span>
                      </div>

                      {/* Unit */}
                      {metric.unit && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Unit</span>
                          <span className="text-sm font-medium text-gray-900">{metric.unit}</span>
                        </div>
                      )}

                      {/* Required Status */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Required</span>
                        <div className="flex items-center">
                          {metric.requiredDefault ? (
                            <>
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-500 mr-1" />
                              <span className="text-sm font-medium text-red-600">Yes</span>
                            </>
                          ) : (
                            <>
                              <CheckCircleIcon className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-sm font-medium text-green-600">No</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Frequency */}
                      {metric.defaultFrequency && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-500">Frequency</span>
                          <div className="flex items-center">
                            <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                            <span className="text-sm font-medium text-gray-900">{metric.defaultFrequency}</span>
                          </div>
                        </div>
                      )}

                      {/* Numeric Range */}
                      {(metric.scaleMin !== null || metric.scaleMax !== null) && (
                        <div className="bg-gray-50 rounded-lg p-3 mt-3">
                          <div className="flex items-center mb-2">
                            <ScaleIcon className="h-4 w-4 text-gray-500 mr-2" />
                            <span className="text-xs font-medium text-gray-700">Range</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              {metric.scaleMin !== null ? metric.scaleMin : '−∞'}
                            </span>
                            <div className="flex-1 mx-3 border-t border-gray-300"></div>
                            <span className="text-gray-600">
                              {metric.scaleMax !== null ? metric.scaleMax : '+∞'}
                            </span>
                          </div>
                          {metric.decimalPrecision !== null && (
                            <div className="mt-2 text-xs text-gray-500">
                              Precision: {metric.decimalPrecision} decimal places
                            </div>
                          )}
                        </div>
                      )}

                      {/* Options for categorical/ordinal */}
                      {metric.options && Array.isArray(metric.options) && metric.options.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 mt-3">
                          <div className="flex items-center mb-2">
                            <ListBulletIcon className="h-4 w-4 text-gray-500 mr-2" />
                            <span className="text-xs font-medium text-gray-700">
                              Options ({metric.options.length})
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {metric.options.slice(0, 3).map((option, index) => (
                              <span 
                                key={index} 
                                className="inline-block bg-white text-gray-700 text-xs px-2 py-1 rounded border"
                              >
                                {typeof option === 'object' ? option.label || option.value : option}
                              </span>
                            ))}
                            {metric.options.length > 3 && (
                              <span className="inline-block bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">
                                +{metric.options.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingMetric(null)
        }}
        title={editingMetric ? 'Edit Metric Definition' : 'Add New Metric Definition'}
        size="xl"
      >
        <MetricDefinitionForm
          metric={editingMetric}
          onSubmit={handleSubmit}
          isLoading={createMutation.isLoading || updateMutation.isLoading}
        />
      </Modal>
    </div>
  )
}

function MetricDefinitionForm({ metric, onSubmit, isLoading }) {
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
    options: metric?.options ? (Array.isArray(metric.options) ? metric.options.map(opt => 
      typeof opt === 'object' ? opt.label || opt.value : opt
    ).join('\n') : '') : '',
  })

  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 3

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormData({ ...formData, [e.target.name]: value })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Only allow submission if we're on the final step
    if (currentStep !== totalSteps) {
      return
    }
    
    // Process options for categorical/ordinal types
    let processedOptions = null
    if ((formData.valueType === 'categorical' || formData.valueType === 'ordinal') && formData.options.trim()) {
      processedOptions = formData.options.split('\n').filter(opt => opt.trim()).map(opt => opt.trim())
    }
    
    const submitData = {
      ...formData,
      options: processedOptions
    }
    
    onSubmit(submitData)
  }

  // Handle form submission prevention for Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && currentStep !== totalSteps) {
      e.preventDefault()
      // If we're not on the last step and Enter is pressed, go to next step if valid
      if (isStepValid(currentStep)) {
        nextStep()
      }
    }
  }

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  const getStepTitle = (step) => {
    switch (step) {
      case 1: return 'Basic Information'
      case 2: return 'Configuration'
      case 3: return 'Advanced Settings'
      default: return ''
    }
  }

  const isStepValid = (step) => {
    switch (step) {
      case 1:
        return formData.name.trim() !== ''
      case 2:
        if (formData.valueType === 'numeric') {
          return formData.minValue !== '' && formData.maxValue !== ''
        }
        if (formData.valueType === 'categorical' || formData.valueType === 'ordinal') {
          return formData.options.trim() !== ''
        }
        return true
      case 3:
        return true
      default:
        return false
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
                      max="4"
                      placeholder="2"
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-3">
                  Set the valid range for numeric values. Patients won't be able to enter values outside this range.
                </p>
              </div>
            )}

            {(formData.valueType === 'categorical' || formData.valueType === 'ordinal') && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  {formData.valueType === 'categorical' ? 'Multiple Choice Options' : 'Ranked Options'}
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Options * (one per line)
                  </label>
                  <textarea
                    name="options"
                    value={formData.options}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder={formData.valueType === 'categorical' 
                      ? "Enter options that patients can select from:\nMild\nModerate\nSevere\nExtreme"
                      : "Enter options in order from lowest to highest:\nNone\nMild\nModerate\nSevere\nExtreme"
                    }
                    required
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    {formData.valueType === 'categorical' 
                      ? "Enter each option on a new line. Patients will be able to select one of these choices."
                      : "Enter each option on a new line in order from lowest to highest value. This creates a ranked scale."
                    }
                  </p>
                </div>
              </div>
            )}

            {(formData.valueType === 'text' || formData.valueType === 'boolean') && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <DocumentTextIcon className="w-5 h-5 mr-2 text-indigo-600" />
                  {formData.valueType === 'text' ? 'Text Input Configuration' : 'Boolean Configuration'}
                </h4>
                <p className="text-gray-600">
                  {formData.valueType === 'text' 
                    ? "Patients will be able to enter free-form text responses for this metric."
                    : "Patients will be able to select Yes/No or True/False for this metric."
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Advanced Settings */}
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