import React, { useState } from 'react'
import { 
  PlusIcon, 
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ListBulletIcon,
  NumberedListIcon,
  CalculatorIcon,
  TagIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  BeakerIcon,
  HeartIcon,
  BoltIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
  ArrowPathIcon,
  // Additional RTM-specific icons
  AcademicCapIcon,
  BanknotesIcon,
  CpuChipIcon,
  FireIcon,
  GlobeAltIcon,
  HomeIcon,
  LifebuoyIcon,
  LightBulbIcon,
  MoonIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  SunIcon,
  TrophyIcon,
  UserGroupIcon,
  WifiIcon
} from '@heroicons/react/24/outline'

// Import refactored components and hooks
import { useMetricDefinitions } from '../components/MetricDefinitions/hooks/useMetricDefinitions'
import { useMetricFilters } from '../components/MetricDefinitions/hooks/useMetricFilters'
import { SearchAndFilters } from '../components/MetricDefinitions/components/SearchAndFilters'
import { MetricsList } from '../components/MetricDefinitions/components/MetricsList'
import { GroupedMetricsList } from '../components/MetricDefinitions/components/GroupedMetricsList'
import MetricDefinitionForm from '../components/MetricDefinitions/forms/MetricDefinitionForm'
import MetricDefinitionDetailsModal from '../components/MetricDefinitionDetailsModal'

export default function MetricDefinitions() {
  // State management
  const [showModal, setShowModal] = useState(false)
  const [editingMetric, setEditingMetric] = useState(null)
  const [currentFlow, setCurrentFlow] = useState('typeSelection') // 'typeSelection', 'templateSelection', 'standardizedSelection', 'customForm'
  const [selectedType, setSelectedType] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [selectedMetricForDetails, setSelectedMetricForDetails] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  // Custom hooks
  const {
    metricDefinitions,
    isLoading,
    error,
    refetch,
    createMetric,
    updateMetric,
    deleteMetric,
    customizeMetric,
    isCreating,
    isUpdating,
    isDeleting,
    isCustomizing
  } = useMetricDefinitions()

  const {
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    filterCategory,
    setFilterCategory,
    viewMode,
    setViewMode,
    uniqueTypes,
    uniqueCategories,
    filteredMetrics
  } = useMetricFilters(metricDefinitions)

  // Modal handlers
  const openCreateModal = () => {
    setEditingMetric(null)
    setCurrentFlow('typeSelection')
    setSelectedType('')
    setSelectedTemplate(null)
    setShowModal(true)
  }

  const openEditModal = (metric) => {
    console.log('openEditModal - received metric:', metric)
    console.log('openEditModal - metric.id:', metric?.id)
    setEditingMetric(metric)
    setCurrentFlow('customForm')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingMetric(null)
    setCurrentFlow('typeSelection')
    setSelectedType('')
    setSelectedTemplate(null)
  }

  // Form handlers
  const handleSubmit = async (formData) => {
    try {
      console.log('handleSubmit - editingMetric:', editingMetric)
      console.log('handleSubmit - editingMetric.id:', editingMetric?.id)
      console.log('handleSubmit - formData:', formData)

      if (editingMetric) {
        console.log('Calling updateMetric with ID:', editingMetric.id)
        // updateMetric expects an object with { id, data } structure
        await updateMetric({ id: editingMetric.id, data: formData })
      } else {
        console.log('Calling createMetric')
        await createMetric(formData)
      }
      closeModal()
    } catch (error) {
      console.error('Error saving metric:', error)
    }
  }

  const handleDelete = async (metric) => {
    if (window.confirm(`Are you sure you want to delete "${metric.displayName || metric.key}"?`)) {
      try {
        await deleteMetric(metric.id)
      } catch (error) {
        console.error('Error deleting metric:', error)
      }
    }
  }

  const handleCustomize = async (metric) => {
    if (window.confirm(`Create a customizable copy of "${metric.displayName || metric.key}" for your organization?`)) {
      try {
        await customizeMetric(metric.id)
      } catch (error) {
        console.error('Error customizing metric:', error)
      }
    }
  }

  const handleViewDetails = (metric) => {
    setSelectedMetricForDetails(metric)
    setIsDetailsModalOpen(true)
  }

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false)
    setSelectedMetricForDetails(null)
  }

  // Flow handlers
  const handleTypeSelection = (type) => {
    setSelectedType(type)
    if (type === 'standardized') {
      setCurrentFlow('standardizedSelection')
    } else {
      setCurrentFlow('templateSelection')
    }
  }

  const handleTemplateSelection = (template) => {
    setSelectedTemplate(template)
    setCurrentFlow('customForm')
  }

  const handleStandardizedSelection = (metric) => {
    setEditingMetric(metric)
    setCurrentFlow('customForm')
  }

  const goBackToTypeSelection = () => {
    setCurrentFlow('typeSelection')
    setSelectedType('')
    setSelectedTemplate(null)
  }

  const goBackToTemplateSelection = () => {
    setCurrentFlow('templateSelection')
    setSelectedTemplate(null)
  }

  // Loading and error states
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading metrics</h3>
          <p className="mt-1 text-sm text-gray-500">{error.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Metric Definitions</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and configure metric definitions for patient monitoring
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Create Metric
        </button>
      </div>

      {/* Search and Filters */}
      <SearchAndFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterType={filterType}
        setFilterType={setFilterType}
        filterCategory={filterCategory}
        setFilterCategory={setFilterCategory}
        viewMode={viewMode}
        setViewMode={setViewMode}
        uniqueTypes={uniqueTypes}
        uniqueCategories={uniqueCategories}
      />

      {/* Metrics List */}
      {viewMode === 'grouped' ? (
        <GroupedMetricsList
          metrics={filteredMetrics}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onCustomize={handleCustomize}
          onViewDetails={handleViewDetails}
          onCreateFirst={openCreateModal}
        />
      ) : (
        <MetricsList
          metrics={filteredMetrics}
          onEdit={openEditModal}
          onDelete={handleDelete}
          onCustomize={handleCustomize}
          onViewDetails={handleViewDetails}
          onCreateFirst={openCreateModal}
        />
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingMetric ? 'Edit Metric Definition' : 'Create New Metric Definition'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              {currentFlow === 'typeSelection' && !editingMetric && (
                <TypeSelectionFlow onSelectType={handleTypeSelection} />
              )}

              {currentFlow === 'templateSelection' && (
                <TemplateSelectionFlow
                  selectedType={selectedType}
                  onSelectTemplate={handleTemplateSelection}
                  onBack={goBackToTypeSelection}
                />
              )}

              {currentFlow === 'standardizedSelection' && (
                <StandardizedSelectionFlow
                  onSelectMetric={handleStandardizedSelection}
                  onBack={goBackToTypeSelection}
                />
              )}

              {currentFlow === 'customForm' && (
                <MetricDefinitionForm
                  metric={editingMetric}
                  selectedType={selectedType}
                  selectedTemplate={selectedTemplate}
                  onSubmit={handleSubmit}
                  onBack={editingMetric ? null : (selectedTemplate ? goBackToTemplateSelection : goBackToTypeSelection)}
                  isLoading={isCreating || isUpdating}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedMetricForDetails && (
        <MetricDefinitionDetailsModal
          metric={selectedMetricForDetails}
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
        />
      )}
    </div>
  )
}

// Type Selection Flow Component
function TypeSelectionFlow({ onSelectType }) {
  const metricTypes = [
    {
      type: 'numeric',
      title: 'Numeric',
      description: 'Numbers with optional units (e.g., weight, blood pressure)',
      icon: CalculatorIcon,
      color: 'blue'
    },
    {
      type: 'text',
      title: 'Text',
      description: 'Free-form text responses',
      icon: TagIcon,
      color: 'green'
    },
    {
      type: 'boolean',
      title: 'Boolean',
      description: 'Yes/No or True/False responses',
      icon: CheckCircleIcon,
      color: 'purple'
    },
    {
      type: 'categorical',
      title: 'Categorical',
      description: 'Multiple choice with unordered options',
      icon: ListBulletIcon,
      color: 'orange'
    },
    {
      type: 'ordinal',
      title: 'Ordinal',
      description: 'Multiple choice with ordered options (e.g., pain scales)',
      icon: NumberedListIcon,
      color: 'indigo'
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <h4 className="text-lg font-medium text-gray-900 mb-2">Select Metric Type</h4>
        <p className="text-sm text-gray-500">Choose the type of data this metric will collect</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metricTypes.map((type) => {
          const IconComponent = type.icon
          return (
            <button
              key={type.type}
              onClick={() => onSelectType(type.type)}
              className={`p-4 border-2 border-gray-200 rounded-lg hover:border-${type.color}-300 hover:bg-${type.color}-50 transition-colors text-left`}
            >
              <div className="flex items-center mb-2">
                <IconComponent className={`h-6 w-6 text-${type.color}-600 mr-3`} />
                <h5 className="font-medium text-gray-900">{type.title}</h5>
              </div>
              <p className="text-sm text-gray-600">{type.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Template Selection Flow Component
function TemplateSelectionFlow({ selectedType, onSelectTemplate, onBack }) {
  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 text-sm mb-4"
        >
          ← Back to type selection
        </button>
        <h4 className="text-lg font-medium text-gray-900 mb-2">Choose Template</h4>
        <p className="text-sm text-gray-500">
          Select a pre-configured template or create a custom {selectedType} metric
        </p>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => onSelectTemplate(null)}
          className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
        >
          <div className="flex items-center mb-2">
            <BeakerIcon className="h-6 w-6 text-blue-600 mr-3" />
            <h5 className="font-medium text-gray-900">Custom {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}</h5>
          </div>
          <p className="text-sm text-gray-600">Create a custom {selectedType} metric from scratch</p>
        </button>

        {selectedType === 'ordinal' && (
          <button
            onClick={() => onSelectTemplate('standardized')}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors text-left"
          >
            <div className="flex items-center mb-2">
              <ShieldCheckIcon className="h-6 w-6 text-green-600 mr-3" />
              <h5 className="font-medium text-gray-900">Standardized Templates</h5>
            </div>
            <p className="text-sm text-gray-600">Use pre-configured RTM-compliant ordinal scales</p>
          </button>
        )}
      </div>
    </div>
  )
}

// Standardized Selection Flow Component
function StandardizedSelectionFlow({ onSelectMetric, onBack }) {
  // This would typically fetch from an API
  const standardizedMetrics = [
    {
      id: 'pain-scale-0-10',
      name: 'Pain Scale (0-10)',
      description: 'Standard numeric pain rating scale',
      category: 'Pain Management'
    },
    {
      id: 'mood-scale-1-5',
      name: 'Mood Scale (1-5)',
      description: 'Simple mood assessment scale',
      category: 'Mental Health'
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="text-blue-600 hover:text-blue-800 text-sm mb-4"
        >
          ← Back to template selection
        </button>
        <h4 className="text-lg font-medium text-gray-900 mb-2">Standardized Metrics</h4>
        <p className="text-sm text-gray-500">Select from RTM-compliant standardized metrics</p>
      </div>

      <div className="space-y-3">
        {standardizedMetrics.map((metric) => (
          <button
            key={metric.id}
            onClick={() => onSelectMetric(metric)}
            className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">{metric.name}</h5>
                <p className="text-sm text-gray-600">{metric.description}</p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-2">
                  {metric.category}
                </span>
              </div>
              <ChevronDownIcon className="h-5 w-5 text-gray-400 transform rotate-[-90deg]" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}