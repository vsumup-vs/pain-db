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
  ExclamationCircleIcon,
  SparklesIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import Modal from '../components/Modal'
import MetricTemplateSelector from '../components/MetricTemplateSelector'
import StandardizedMetricSelector from '../components/StandardizedMetricSelector'
import StandardMetricEditor from '../components/StandardMetricEditor'

export default function MetricDefinitions() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMetric, setEditingMetric] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [creationFlow, setCreationFlow] = useState('type-selection') // 'type-selection', 'template-selection', 'standard-editor', 'custom-form'
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const queryClient = useQueryClient()

  const { data: metricDefinitions, isLoading, error } = useQuery({
    queryKey: ['metricDefinitions'],
    queryFn: api.getMetricDefinitions
  })

  const createMutation = useMutation({
    mutationFn: api.createMetricDefinition,
    onSuccess: () => {
      queryClient.invalidateQueries(['metricDefinitions'])
      handleCloseModal()
      toast.success('Metric definition created successfully')
    },
    onError: (error) => {
      console.error('Create error:', error)
      toast.error(error.response?.data?.message || 'Failed to create metric definition')
    }
  })

  const createFromTemplateMutation = useMutation({
    mutationFn: (data) => api.post('/metric-definitions/templates/create', data),
    onSuccess: () => {
      queryClient.invalidateQueries(['metricDefinitions'])
      handleCloseModal()
      toast.success('Standardized metric created successfully')
    },
    onError: (error) => {
      console.error('Create from template error:', error)
      toast.error(error.response?.data?.message || 'Failed to create metric from template')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateMetricDefinition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['metricDefinitions'])
      handleCloseModal()
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

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingMetric(null)
    setCreationFlow('type-selection')
    setSelectedTemplate(null)
  }

  const handleOpenCreateModal = () => {
    setEditingMetric(null)
    setCreationFlow('type-selection')
    setIsModalOpen(true)
  }

  const handleSelectMetricType = (type) => {
    if (type === 'standardized') {
      setCreationFlow('template-selection')
    } else {
      setCreationFlow('custom-form')
    }
  }

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template)
    setCreationFlow('standard-editor')
  }

  const handleBackToTypeSelection = () => {
    setCreationFlow('type-selection')
    setSelectedTemplate(null)
  }

  const handleBackToTemplateSelection = () => {
    setCreationFlow('template-selection')
    setSelectedTemplate(null)
  }

  const handleSubmitStandardized = (data) => {
    createFromTemplateMutation.mutate(data)
  }

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
    setCreationFlow('custom-form')
    setIsModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this metric definition?')) {
      deleteMutation.mutate(id)
    }
  }

  // Get type icon and info
  const getTypeInfo = (valueType) => {
    const types = {
      numeric: { icon: CalculatorIcon, label: 'Numeric', color: 'text-blue-600' },
      text: { icon: DocumentTextIcon, label: 'Text', color: 'text-green-600' },
      boolean: { icon: CheckCircleIcon, label: 'Boolean', color: 'text-purple-600' },
      categorical: { icon: ListBulletIcon, label: 'Categorical', color: 'text-orange-600' },
      ordinal: { icon: NumberedListIcon, label: 'Ordinal', color: 'text-red-600' }
    }
    return types[valueType] || { icon: TagIcon, label: valueType, color: 'text-gray-600' }
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

  // Render modal content based on creation flow
  const renderModalContent = () => {
    switch (creationFlow) {
      case 'type-selection':
        return (
          <MetricTemplateSelector
            onSelectType={handleSelectMetricType}
            onClose={handleCloseModal}
          />
        )
      case 'template-selection':
        return (
          <StandardizedMetricSelector
            onSelectTemplate={handleSelectTemplate}
            onBack={handleBackToTypeSelection}
          />
        )
      case 'standard-editor':
        return (
          <StandardMetricEditor
            template={selectedTemplate}
            onSubmit={handleSubmitStandardized}
            onBack={handleBackToTemplateSelection}
            isLoading={createFromTemplateMutation.isLoading}
          />
        )
      case 'custom-form':
        return (
          <MetricDefinitionForm
            metric={editingMetric}
            onSubmit={handleSubmit}
            isLoading={createMutation.isLoading || updateMutation.isLoading}
          />
        )
      default:
        return null
    }
  }

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
              onClick={handleOpenCreateModal}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
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
                    {getTypeInfo(type).label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        {filteredMetrics.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
                onClick={handleOpenCreateModal}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create First Metric
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMetrics.map((metric) => {
              const typeInfo = getTypeInfo(metric.valueType)
              const TypeIcon = typeInfo.icon
              const isStandardized = !!metric.coding

              return (
                <div key={metric.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className={`p-2 rounded-lg bg-gray-100`}>
                          <TypeIcon className={`h-5 w-5 ${typeInfo.color}`} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                              {metric.displayName}
                            </h3>
                            {isStandardized && (
                              <ShieldCheckIcon className="h-4 w-4 text-blue-600" title="Standardized Metric" />
                            )}
                          </div>
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

                    {/* Description */}
                    {metric.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {metric.description}
                      </p>
                    )}

                    {/* Standardization Info */}
                    {isStandardized && (
                      <div className="bg-blue-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center mb-2">
                          <SparklesIcon className="h-4 w-4 text-blue-600 mr-2" />
                          <span className="text-xs font-medium text-blue-900">Standardized Codes</span>
                        </div>
                        <div className="space-y-1 text-xs">
                          {metric.coding?.primary?.code && (
                            <div className="text-blue-700">
                              LOINC: {metric.coding.primary.code}
                            </div>
                          )}
                          {metric.coding?.secondary?.[0]?.code && (
                            <div className="text-green-700">
                              SNOMED: {metric.coding.secondary[0].code}
                            </div>
                          )}
                          {metric.coding?.mappings?.icd10 && (
                            <div className="text-purple-700">
                              ICD-10: {metric.coding.mappings.icd10}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Metric Details */}
                    <div className="space-y-3">
                      {/* Type and Unit */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            typeInfo.color === 'text-blue-600' ? 'bg-blue-100 text-blue-800' :
                            typeInfo.color === 'text-green-600' ? 'bg-green-100 text-green-800' :
                            typeInfo.color === 'text-purple-600' ? 'bg-purple-100 text-purple-800' :
                            typeInfo.color === 'text-orange-600' ? 'bg-orange-100 text-orange-800' :
                            typeInfo.color === 'text-red-600' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {typeInfo.label}
                          </span>
                          {metric.unit && (
                            <span className="text-gray-500">• {metric.unit}</span>
                          )}
                        </div>
                        {metric.requiredDefault && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Required
                          </span>
                        )}
                      </div>

                      {/* Numeric range */}
                      {metric.valueType === 'numeric' && metric.scaleMin !== null && metric.scaleMax !== null && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center mb-2">
                            <ScaleIcon className="h-4 w-4 text-gray-500 mr-2" />
                            <span className="text-xs font-medium text-gray-700">Range</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span className="text-gray-600">
                              {metric.scaleMin !== null ? metric.scaleMin : '-∞'}
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
                                className="inline-flex items-center px-2 py-1 rounded text-xs bg-white text-gray-700 border border-gray-200"
                              >
                                {typeof option === 'object' ? option.label || option.value : option}
                              </span>
                            ))}
                            {metric.options.length > 3 && (
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-200 text-gray-600">
                                +{metric.options.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Frequency */}
                      {metric.defaultFrequency && (
                        <div className="flex items-center text-xs text-gray-500">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          Default frequency: {metric.defaultFrequency}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          creationFlow === 'type-selection' ? 'Create New Metric' :
          creationFlow === 'template-selection' ? 'Select Template' :
          creationFlow === 'standard-editor' ? 'Customize Metric' :
          editingMetric ? 'Edit Metric Definition' : 'Create Custom Metric'
        }
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
                    placeholder={`Enter one option per line, for example:\nMild\nModerate\nSevere\nVery Severe`}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    {formData.valueType === 'ordinal' 
                      ? 'Enter options in order from lowest to highest. Order matters for ordinal data.'
                      : 'Enter each option on a new line. Order does not matter for categorical data.'
                    }
                  </p>
                </div>
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