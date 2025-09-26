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
  UserGroupIcon
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal'
import AssessmentTemplateForm from '../components/AssessmentTemplateForm'
import EnhancedAssessmentTemplateSelector from '../components/EnhancedAssessmentTemplateSelector'

export default function AssessmentTemplatesEnhanced() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
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

      {/* Modal for Create/Edit */}
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