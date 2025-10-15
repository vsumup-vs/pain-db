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
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal'
import AssessmentTemplateForm from '../components/AssessmentTemplateForm'

export default function AssessmentTemplates() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [previewingTemplate, setPreviewingTemplate] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const queryClient = useQueryClient()

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['assessment-templates'],
    queryFn: () => api.getAssessmentTemplates(),
  })

  const { data: metricDefinitions } = useQuery({
    queryKey: ['metric-definitions'],
    queryFn: () => api.getMetricDefinitions(),
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.createAssessmentTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['assessment-templates'])
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
      queryClient.invalidateQueries(['assessment-templates'])
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
      queryClient.invalidateQueries(['assessment-templates'])
      toast.success('Assessment template deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete template')
    },
  })

  const customizeMutation = useMutation({
    mutationFn: (id) => api.customizeAssessmentTemplate(id),
    onSuccess: (response) => {
      queryClient.invalidateQueries(['assessment-templates'])
      const templateName = response.data?.name || response.name || 'Template'
      toast.success(`Template customized successfully! You can now edit "${templateName}"`)
    },
    onError: (error) => {
      const message = error.response?.data?.message || error.message
      toast.error(`Failed to customize template: ${message}`)
    },
  })

  const handleCreate = () => {
    setEditingTemplate(null)
    setIsModalOpen(true)
  }

  const handleEdit = (template) => {
    setEditingTemplate(template)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this assessment template?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCustomize = async (template) => {
    if (window.confirm(`Create a customizable copy of "${template.name}" for your organization?`)) {
      customizeMutation.mutate(template.id)
    }
  }

  const handlePreview = async (template) => {
    try {
      console.log('🔍 Starting preview for template:', template);
      
      // Fetch full template details including metrics using the proper API method
      const response = await api.getAssessmentTemplate(template.id);
      
      console.log('📡 Full API Response:', response);
      console.log('📊 Response.data:', response.data);
      console.log('🆔 Template ID:', template.id);
      console.log('🔍 Type of response:', typeof response);
      console.log('🔍 Type of response.data:', typeof response.data);
      
      // Check if response.data exists and has the expected structure
      if (response && response.data) {
        console.log('✅ Setting previewingTemplate to:', response.data);
        setPreviewingTemplate(response.data);
      } else if (response) {
        console.log('⚠️ No response.data, setting previewingTemplate to response:', response);
        setPreviewingTemplate(response);
      } else {
        console.log('❌ No response received');
        toast.error('No template data received');
        return;
      }
      
      setIsPreviewModalOpen(true);
    } catch (error) {
      console.error('❌ Error fetching template details:', error);
      toast.error('Failed to load template details');
    }
  }

  const handleSubmit = (data) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  // Filter templates based on search
  const filteredTemplates = templates?.data?.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  }) || []

  // Helper function to get template status color
  const getTemplateStatusColor = (template) => {
    const metricCount = template.items?.length || 0
    if (metricCount === 0) return 'text-red-600 bg-red-50 border-red-200'
    if (metricCount < 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getTemplateStatusText = (template) => {
    const metricCount = template.items?.length || 0
    if (metricCount === 0) return 'Empty'
    if (metricCount < 3) return 'Basic'
    return 'Complete'
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <ClipboardDocumentListIcon className="h-8 w-8 text-indigo-600 mr-3" />
                Assessment Templates
              </h1>
              <p className="mt-2 text-gray-600">
                Create and manage standardized assessment forms for patient evaluations
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform transition-all duration-200 hover:scale-105"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Create New Template
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
                placeholder="Search templates by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>
          
          {/* Stats */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredTemplates.length} of {templates?.data?.length || 0} templates
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
                {searchTerm ? 'No matching templates found' : 'No assessment templates yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Create your first assessment template to get started'
                }
              </p>
              {!searchTerm && (
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
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-6 py-4 border-b border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-white border border-indigo-200">
                          <DocumentTextIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                              {template.name}
                            </h3>
                            {template.isStandardized && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                ⭐ Standardized
                              </span>
                            )}
                            {template.isCustomized && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                🏥 Custom
                              </span>
                            )}
                          </div>
                          <div className="flex items-center mt-1 space-x-2">
                            <span className="text-xs text-gray-500">Version {template.version}</span>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                              {statusText}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        {template.isStandardized && !template.isCustomized && (
                          <button
                            onClick={() => handleCustomize(template)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Customize for your organization"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handlePreview(template)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview template"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {/* Only show Edit/Delete for customized (org-specific) templates */}
                        {template.isCustomized && (
                          <>
                            <button
                              onClick={() => handleEdit(template)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit template"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
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
                      {template.description || 'No description provided'}
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

                      {/* Metrics Preview */}
                      {template.items && template.items.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-3 mt-3">
                          <div className="flex items-center mb-2">
                            <TagIcon className="h-4 w-4 text-gray-500 mr-2" />
                            <span className="text-xs font-medium text-gray-700">
                              Included Metrics
                            </span>
                          </div>
                          <div className="space-y-1">
                            {template.items.slice(0, 3).map((item, index) => {
                              const metric = metricDefinitions?.data?.find(m => m.id === item.metricDefinitionId)
                              return (
                                <div key={index} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600 truncate">
                                    {metric?.displayName || 'Unknown Metric'}
                                  </span>
                                  {item.required && (
                                    <span className="text-red-500 ml-2">*</span>
                                  )}
                                </div>
                              )
                            })}
                            {template.items.length > 3 && (
                              <div className="text-xs text-gray-500 pt-1">
                                +{template.items.length - 3} more metrics
                              </div>
                            )}
                          </div>
                        </div>
                      )}

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
                  <span className="text-sm text-gray-500">
                    Version {previewingTemplate.version || 'Custom'}
                  </span>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      previewingTemplate.isStandardized 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {previewingTemplate.isStandardized ? 'Standardized' : 'Custom'}
                    </span>
                    {previewingTemplate.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border-green-200 ml-1">
                        {previewingTemplate.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                      {previewingTemplate.items?.filter(item => item.isRequired || item.required).length || 0}
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
                      {previewingTemplate.createdAt 
                        ? new Date(previewingTemplate.createdAt).toLocaleDateString()
                        : 'Unknown'
                      }
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
                              {item.metricDefinition?.name || item.name || 'Unnamed Metric'}
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
                            {item.metricDefinition?.standardCoding && (
                              <div className="text-sm text-gray-600">
                                <span className="font-medium">Coding:</span>
                                <div className="ml-4 mt-1 space-y-1">
                                  {item.metricDefinition.standardCoding.primary && (
                                    <div className="text-xs text-blue-700">
                                      LOINC: {item.metricDefinition.standardCoding.primary.code} - {item.metricDefinition.standardCoding.primary.display}
                                    </div>
                                  )}
                                  {item.metricDefinition.standardCoding.secondary?.[0] && (
                                    <div className="text-xs text-green-700">
                                      SNOMED: {item.metricDefinition.standardCoding.secondary[0].code} - {item.metricDefinition.standardCoding.secondary[0].display}
                                    </div>
                                  )}
                                  {item.metricDefinition.standardCoding.mappings?.icd10 && (
                                    <div className="text-xs text-purple-700">
                                      ICD-10: {item.metricDefinition.standardCoding.mappings.icd10}
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
                          <span className="text-xs text-gray-500">Order: {item.order || index + 1}</span>
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
        size="xl"
      >
        <AssessmentTemplateForm
          template={editingTemplate}
          metricDefinitions={metricDefinitions?.data || []}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false)
            setEditingTemplate(null)
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>
    </div>
  )
}