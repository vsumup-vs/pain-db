import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  HashtagIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ListBulletIcon,
  UserGroupIcon,
  ClockIcon,
  TagIcon,
  EyeIcon,
  StarIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal'
import AssessmentTemplateForm from '../components/AssessmentTemplateForm'

export default function AssessmentTemplatesEnhanced() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [previewingTemplate, setPreviewingTemplate] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [activeTab, setActiveTab] = useState('all') // 'all', 'standardized', 'custom'
  const queryClient = useQueryClient()

  // Fetch all templates using enhanced API
  const { data: templatesData, isLoading, error } = useQuery({
    queryKey: ['assessment-templates-v2'],
    queryFn: () => api.getAssessmentTemplatesV2(),
  })

  // Fetch standardized templates
  const { data: standardizedTemplates } = useQuery({
    queryKey: ['standardized-templates'],
    queryFn: () => api.getStandardizedTemplates(),
  })

  // Fetch custom templates
  const { data: customTemplates } = useQuery({
    queryKey: ['custom-templates'],
    queryFn: () => api.getCustomTemplates(),
  })

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['template-categories'],
    queryFn: () => api.getTemplateCategories(),
  })

  const { data: metricDefinitions } = useQuery({
    queryKey: ['metric-definitions'],
    queryFn: () => api.getMetricDefinitions(),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.createAssessmentTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessment-templates-v2'])
      queryClient.invalidateQueries(['custom-templates'])
      setIsModalOpen(false)
      toast.success('Assessment template created successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create template')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateAssessmentTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessment-templates-v2'])
      queryClient.invalidateQueries(['custom-templates'])
      setIsModalOpen(false)
      setEditingTemplate(null)
      toast.success('Assessment template updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update template')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteAssessmentTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessment-templates-v2'])
      queryClient.invalidateQueries(['custom-templates'])
      toast.success('Assessment template deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete template')
    },
  })

  // Get templates based on active tab
  const getTemplatesForTab = () => {
    switch (activeTab) {
      case 'standardized':
        return standardizedTemplates || []
      case 'custom':
        return customTemplates || []
      default:
        return templatesData?.templates || []
    }
  }

  const templates = getTemplatesForTab()

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !selectedCategory || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const handleCreate = () => {
    setEditingTemplate(null)
    setIsModalOpen(true)
  }

  const handleEdit = (template) => {
    // Only allow editing of custom templates
    if (template.isStandardized) {
      toast.warning('Standardized templates cannot be edited')
      return
    }
    setEditingTemplate(template)
    setIsModalOpen(true)
  }

  const handleDelete = async (id, template) => {
    // Only allow deletion of custom templates
    if (template.isStandardized) {
      toast.warning('Standardized templates cannot be deleted')
      return
    }
    
    if (window.confirm('Are you sure you want to delete this assessment template?')) {
      deleteMutation.mutate(id)
    }
  }

  const handlePreview = async (template) => {
    try {
      const response = await api.getAssessmentTemplateV2(template.id)
      setPreviewingTemplate(response.data)
      setIsPreviewModalOpen(true)
    } catch (error) {
      toast.error('Failed to load template details')
    }
  }

  const handleSubmit = (data) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const getTemplateStatusColor = (template) => {
    if (template.isStandardized) {
      return 'bg-green-50 text-green-700 border-green-200'
    }
    return 'bg-blue-50 text-blue-700 border-blue-200'
  }

  const getTemplateStatusText = (template) => {
    if (template.isStandardized) {
      return 'Standardized'
    }
    return 'Custom'
  }

  const getCategoryBadgeColor = (category) => {
    const colors = {
      'pain_management': 'bg-red-100 text-red-800',
      'mental_health': 'bg-blue-100 text-blue-800',
      'fibromyalgia': 'bg-purple-100 text-purple-800',
      'diabetes': 'bg-green-100 text-green-800',
      'general': 'bg-gray-100 text-gray-800'
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  const formatCategoryName = (category) => {
    return category?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading assessment templates...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">Error loading assessment templates: {error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600 mr-3" />
                Assessment Templates
              </h1>
              <p className="mt-2 text-gray-600">
                Manage standardized clinical assessments and custom templates
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Custom Template
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'all'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                All Templates
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {templatesData?.templates?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('standardized')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'standardized'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <StarIcon className="h-4 w-4 inline mr-1" />
                Standardized
                <span className="ml-2 bg-green-100 text-green-900 py-0.5 px-2.5 rounded-full text-xs">
                  {standardizedTemplates?.length || 0}
                </span>
              </button>
              <button
                onClick={() => setActiveTab('custom')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'custom'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CogIcon className="h-4 w-4 inline mr-1" />
                Custom
                <span className="ml-2 bg-blue-100 text-blue-900 py-0.5 px-2.5 rounded-full text-xs">
                  {customTemplates?.length || 0}
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="sm:w-64">
              <div className="relative">
                <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Categories</option>
                  {categories?.map((category) => (
                    <option key={category} value={category}>
                      {formatCategoryName(category)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredTemplates.length} of {templates.length} templates
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

        {/* Templates Grid */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <ClipboardDocumentListIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No matching templates found' : 
                 activeTab === 'standardized' ? 'No standardized templates available' :
                 activeTab === 'custom' ? 'No custom templates yet' :
                 'No assessment templates yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : activeTab === 'standardized' 
                    ? 'Standardized templates need to be created by running the setup scripts'
                    : 'Create your first custom assessment template to get started'
                }
              </p>
              {!searchTerm && activeTab !== 'standardized' && (
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Your First Template
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => {
              const statusColor = getTemplateStatusColor(template)
              const statusText = getTemplateStatusText(template)
              const metricCount = template.items?.length || 0
              
              return (
                <div 
                  key={template.id} 
                  className="bg-white rounded-xl shadow-sm border-2 border-gray-200 hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 overflow-hidden"
                >
                  {/* Card Header */}
                  <div className={`px-6 py-4 border-b border-gray-100 ${
                    template.isStandardized 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50' 
                      : 'bg-gradient-to-r from-indigo-50 to-purple-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg bg-white border ${
                          template.isStandardized ? 'border-green-200' : 'border-indigo-200'
                        }`}>
                          {template.isStandardized ? (
                            <StarIcon className="h-6 w-6 text-green-600" />
                          ) : (
                            <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                            {template.name}
                          </h3>
                          <div className="flex items-center mt-1 space-x-2">
                            <span className="text-xs text-gray-500">Version {template.version}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                              {statusText}
                            </span>
                            {template.category && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(template.category)}`}>
                                {formatCategoryName(template.category)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => handlePreview(template)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview template"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {!template.isStandardized && (
                          <>
                            <button
                              onClick={() => handleEdit(template)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit template"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id, template)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete template"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6">
                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {template.description || template.clinicalUse || 'No description provided'}
                    </p>

                    {/* Template Details */}
                    <div className="space-y-3">
                      {/* Metrics Count */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Metrics</span>
                        <div className="flex items-center">
                          <ListBulletIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {metricCount} {metricCount === 1 ? 'metric' : 'metrics'}
                          </span>
                        </div>
                      </div>

                      {/* Validation Info for Standardized Templates */}
                      {template.isStandardized && template.validationInfo && (
                        <div className="bg-green-50 rounded-lg p-3 mt-3">
                          <div className="flex items-center mb-2">
                            <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-xs font-medium text-green-700">
                              Validated Instrument
                            </span>
                          </div>
                          <div className="space-y-1">
                            {template.validationInfo.instrument && (
                              <div className="text-xs text-green-600">
                                <span className="font-medium">Instrument:</span> {template.validationInfo.instrument}
                              </div>
                            )}
                            {template.validationInfo.sensitivity && (
                              <div className="text-xs text-green-600">
                                <span className="font-medium">Sensitivity:</span> {template.validationInfo.sensitivity}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Created Date */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Created</span>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(template.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Empty State for Metrics */}
                      {metricCount === 0 && (
                        <div className="bg-red-50 rounded-lg p-3 mt-3">
                          <div className="flex items-center">
                            <ExclamationCircleIcon className="h-4 w-4 text-red-500 mr-2" />
                            <span className="text-xs font-medium text-red-700">
                              No metrics configured
                            </span>
                          </div>
                          <p className="text-xs text-red-600 mt-1">
                            Add metrics to make this template functional
                          </p>
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

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false)
          setPreviewingTemplate(null)
        }}
        title="Template Preview"
        size="xl"
      >
        {previewingTemplate && (
          <div className="space-y-6">
            {/* Template Header */}
            <div className="border-b border-gray-200 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {previewingTemplate.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {previewingTemplate.description || 'No description provided'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm text-gray-500">Version {previewingTemplate.version}</span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getTemplateStatusColor(previewingTemplate)}`}>
                      {getTemplateStatusText(previewingTemplate)}
                    </span>
                    {previewingTemplate.category && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryBadgeColor(previewingTemplate.category)}`}>
                        {formatCategoryName(previewingTemplate.category)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Template Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <ListBulletIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Total Metrics</p>
                    <p className="text-lg font-semibold text-blue-700">
                      {previewingTemplate.items?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-900">Required</p>
                    <p className="text-lg font-semibold text-green-700">
                      {previewingTemplate.items?.filter(item => item.required).length || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CalendarIcon className="h-5 w-5 text-gray-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Created</p>
                    <p className="text-lg font-semibold text-gray-700">
                      {new Date(previewingTemplate.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Assessment Metrics */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-4">Assessment Metrics</h4>
              {previewingTemplate.items && previewingTemplate.items.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {previewingTemplate.items.map((item, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h5 className="font-medium text-gray-900">
                              {item.metricDefinition?.displayName || 'Unknown Metric'}
                            </h5>
                            {item.isRequired && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Required
                              </span>
                            )}
                          </div>
                          
                          <div className="mt-2 space-y-1">
                            {item.metricDefinition?.type && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Type:</span> {item.metricDefinition.type}
                              </p>
                            )}
                            {item.metricDefinition?.unit && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Unit:</span> {item.metricDefinition.unit}
                              </p>
                            )}
                            {item.metricDefinition?.coding && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Coding:</span>
                                <div className="ml-4 mt-1 space-y-1">
                                  {item.metricDefinition.coding.primary && (
                                    <div className="text-xs text-blue-700">
                                      LOINC: {item.metricDefinition.coding.primary.code} - {item.metricDefinition.coding.primary.display}
                                    </div>
                                  )}
                                  {item.metricDefinition.coding.secondary?.[0] && (
                                    <div className="text-xs text-green-700">
                                      SNOMED: {item.metricDefinition.coding.secondary[0].code} - {item.metricDefinition.coding.secondary[0].display}
                                    </div>
                                  )}
                                  {item.metricDefinition.coding.mappings?.icd10 && (
                                    <div className="text-xs text-purple-700">
                                      ICD-10: {item.metricDefinition.coding.mappings.icd10}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            {item.metricDefinition?.helpText && (
                              <p className="text-sm text-gray-500 italic">
                                {item.metricDefinition.helpText}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="ml-4 text-right">
                          <span className="text-xs text-gray-500">Order: {item.displayOrder || index + 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No metrics defined for this template</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Existing Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTemplate(null)
        }}
        title={editingTemplate ? 'Edit Assessment Template' : 'Create Assessment Template'}
      >
        <AssessmentTemplateForm
          template={editingTemplate}
          metricDefinitions={metricDefinitions?.data || []}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false)
            setEditingTemplate(null)
          }}
        />
      </Modal>
    </div>
  )
}