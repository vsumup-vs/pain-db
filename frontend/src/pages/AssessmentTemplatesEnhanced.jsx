import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  TagIcon,
  BeakerIcon,
  UserGroupIcon,
  CalendarIcon,
  ListBulletIcon
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal'
import AssessmentTemplateForm from '../components/AssessmentTemplateForm'
import EnhancedAssessmentTemplateSelector from '../components/EnhancedAssessmentTemplateSelector'

export default function AssessmentTemplatesEnhanced() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [previewingTemplate, setPreviewingTemplate] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [viewMode, setViewMode] = useState('enhanced') // 'enhanced' or 'manage'
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

  const handleSubmit = (data) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template)
    // You can add additional logic here for what happens when a template is selected
    console.log('Selected template:', template)
  }

  const handlePreview = async (template) => {
    try {
      // Fetch full template details including metrics from the enhanced endpoint
      const response = await fetch(`/api/assessment-templates-v2/${template.id}`)
      const data = await response.json()
      setPreviewingTemplate(data)
      setIsPreviewModalOpen(true)
    } catch (error) {
      console.error('Error fetching template details:', error)
      toast.error('Failed to load template details')
    }
  }

  // Filter templates for management view (only custom templates can be edited)
  const customTemplates = templates?.data?.filter(template => !template.isStandardized) || []

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
                {viewMode === 'enhanced' 
                  ? 'Browse and select standardized clinical assessment forms and custom templates'
                  : 'Create and manage custom assessment templates'
                }
              </p>
            </div>
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('enhanced')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'enhanced'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BeakerIcon className="h-4 w-4 inline mr-2" />
                  Browse Templates
                </button>
                <button
                  onClick={() => setViewMode('manage')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'manage'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <DocumentTextIcon className="h-4 w-4 inline mr-2" />
                  Manage Custom
                </button>
              </div>
              
              {viewMode === 'manage' && (
                <button
                  onClick={handleCreate}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create New Template
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'enhanced' ? (
          /* Enhanced Template Selector View */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <EnhancedAssessmentTemplateSelector
              onSelect={handleTemplateSelect}
              selectedTemplateId={selectedTemplate?.id}
              onPreview={handlePreview}
            />
          </div>
        ) : (
          /* Management View for Custom Templates */
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Custom Templates</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your custom assessment templates. Standardized templates cannot be edited.
                </p>
              </div>
              
              <div className="p-6">
                {customTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No custom templates</h3>
                    <p className="text-gray-600 mb-6">Get started by creating your first custom assessment template.</p>
                    <button
                      onClick={handleCreate}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center mx-auto"
                    >
                      <PlusIcon className="h-5 w-5 mr-2" />
                      Create Template
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {customTemplates.map(template => (
                      <div key={template.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Custom
                              </span>
                              <span className="text-sm text-gray-500">Version {template.version}</span>
                            </div>
                            {template.description && (
                              <p className="text-gray-600 mb-3">{template.description}</p>
                            )}
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <TagIcon className="h-4 w-4 mr-1" />
                                {template.items?.length || 0} items
                              </span>
                              <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <button
                              onClick={() => handleEdit(template)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Edit template"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete template"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      previewingTemplate.isActive 
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-gray-50 text-gray-700 border-gray-200'
                    }`}>
                      {previewingTemplate.isActive ? 'Active' : 'Inactive'}
                    </span>
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
                      {previewingTemplate.items?.filter(item => item.isRequired).length || 0}
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
                              {item.metricDefinition?.displayName || item.name || 'Unnamed Metric'}
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