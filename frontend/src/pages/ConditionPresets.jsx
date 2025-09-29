import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  BellIcon,
  UserGroupIcon,
  CalendarIcon,
  TagIcon,
  ClipboardDocumentCheckIcon,
  HeartIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import Modal from '../components/Modal'
import ConditionPresetForm from '../components/ConditionPresetForm'

export default function ConditionPresets() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const queryClient = useQueryClient()

  const { data: presets, isLoading, error } = useQuery({
    queryKey: ['condition-presets'],
    queryFn: () => api.getConditionPresets(),
  })

  const { data: assessmentTemplates } = useQuery({
    queryKey: ['assessment-templates'],
    queryFn: () => api.getAssessmentTemplates({ limit: 1000 }), // Fetch all templates
  })

  const createMutation = useMutation({
    mutationFn: (data) => api.createConditionPreset(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['condition-presets'])
      setIsModalOpen(false)
      toast.success('Condition preset created successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create condition preset')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateConditionPreset(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['condition-presets'])
      setIsModalOpen(false)
      setEditingPreset(null)
      toast.success('Condition preset updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update condition preset')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteConditionPreset(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['condition-presets'])
      toast.success('Condition preset deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete condition preset')
    },
  })

  const handleCreate = () => {
    setEditingPreset(null)
    setIsModalOpen(true)
  }

  const handleEdit = (preset) => {
    setEditingPreset(preset)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this condition preset?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (data) => {
    if (editingPreset) {
      updateMutation.mutate({ id: editingPreset.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  // Filter presets based on search and type
  const filteredPresets = presets?.data?.filter(preset => {
    const matchesSearch = preset.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || 
      (filterType === 'pain' && preset.name.toLowerCase().includes('pain')) ||
      (filterType === 'medication' && preset.name.toLowerCase().includes('medication')) ||
      (filterType === 'condition' && (preset.name.toLowerCase().includes('arthritis') || preset.name.toLowerCase().includes('fibromyalgia')))
    return matchesSearch && matchesType
  }) || []

  const getPresetIcon = (presetName) => {
    const name = presetName.toLowerCase()
    if (name.includes('pain')) return HeartIcon
    if (name.includes('medication') || name.includes('opioid')) return ShieldCheckIcon
    if (name.includes('arthritis') || name.includes('fibromyalgia')) return ClipboardDocumentCheckIcon
    return DocumentTextIcon
  }

  const getPresetColor = (presetName) => {
    const name = presetName.toLowerCase()
    if (name.includes('pain')) return 'text-red-600 bg-red-100'
    if (name.includes('medication') || name.includes('opioid')) return 'text-blue-600 bg-blue-100'
    if (name.includes('arthritis') || name.includes('fibromyalgia')) return 'text-green-600 bg-green-100'
    return 'text-gray-600 bg-gray-100'
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading condition presets...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ExclamationCircleIcon className="h-12 w-12 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600">Error loading condition presets: {error.message}</p>
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
                <ClipboardDocumentCheckIcon className="h-8 w-8 text-indigo-600 mr-3" />
                Condition Presets
              </h1>
              <p className="mt-2 text-gray-600">
                Manage care programs and their associated assessment templates
              </p>
            </div>
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Create Condition Preset
            </button>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search condition presets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <FunnelIcon className="h-5 w-5 text-gray-400 mr-2" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">All Types</option>
                  <option value="pain">Pain Management</option>
                  <option value="medication">Medication</option>
                  <option value="condition">Specific Conditions</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {filteredPresets.length} of {presets?.data?.length || 0} condition presets
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

        {/* Presets Grid */}
        {filteredPresets.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
              <ClipboardDocumentCheckIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No matching condition presets found' : 'No condition presets yet'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? 'Try adjusting your search criteria'
                  : 'Create your first condition preset to get started'
                }
              </p>
              {!searchTerm && (
                <button
                  onClick={handleCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Your First Condition Preset
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPresets.map((preset) => {
              const PresetIcon = getPresetIcon(preset.name)
              const colorClasses = getPresetColor(preset.name)
              const templateCount = preset.templates?.length || 0
              const diagnosisCount = preset.diagnoses?.length || 0
              const enrollmentCount = preset._count?.enrollments || 0

              return (
                <div
                  key={preset.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        <div className={`p-3 rounded-lg ${colorClasses}`}>
                          <PresetIcon className="h-6 w-6" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {preset.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Care Program
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(preset)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(preset.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="space-y-3 mb-4">
                      {/* Assessment Templates */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Assessment Templates</span>
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {templateCount} {templateCount === 1 ? 'template' : 'templates'}
                          </span>
                        </div>
                      </div>

                      {/* Diagnoses */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Diagnoses</span>
                        <div className="flex items-center">
                          <TagIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {diagnosisCount} {diagnosisCount === 1 ? 'diagnosis' : 'diagnoses'}
                          </span>
                        </div>
                      </div>

                      {/* Active Enrollments */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Active Enrollments</span>
                        <div className="flex items-center">
                          <UserGroupIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {enrollmentCount} {enrollmentCount === 1 ? 'patient' : 'patients'}
                          </span>
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">Created</span>
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 text-gray-400 mr-1" />
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(preset.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Assessment Templates Preview */}
                    {preset.templates && preset.templates.length > 0 && (
                      <div className="bg-gray-50 rounded-lg p-3 mt-3">
                        <div className="flex items-center mb-2">
                          <DocumentTextIcon className="h-4 w-4 text-gray-500 mr-2" />
                          <span className="text-xs font-medium text-gray-700">
                            Associated Templates
                          </span>
                        </div>
                        <div className="space-y-1">
                          {preset.templates.slice(0, 3).map((templateLink, index) => (
                          <div key={index} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 truncate">
                              {templateLink.template?.name || `Template ID: ${templateLink.templateId} (Missing)`}
                            </span>
                            <CheckCircleIcon className="h-3 w-3 text-green-500 ml-2" />
                          </div>
                          ))}
                          {preset.templates.length > 3 && (
                            <div className="text-xs text-gray-500 pt-1">
                              +{preset.templates.length - 3} more templates
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Empty State for Templates */}
                    {templateCount === 0 && (
                      <div className="bg-yellow-50 rounded-lg p-3 mt-3">
                        <div className="flex items-center">
                          <ExclamationCircleIcon className="h-4 w-4 text-yellow-500 mr-2" />
                          <span className="text-xs font-medium text-yellow-700">
                            No assessment templates configured
                          </span>
                        </div>
                        <p className="text-xs text-yellow-600 mt-1">
                          Add templates to make this preset functional
                        </p>
                      </div>
                    )}
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
        onClose={() => {
          setIsModalOpen(false)
          setEditingPreset(null)
        }}
        title={editingPreset ? 'Edit Condition Preset' : 'Create Condition Preset'}
        size="xl"
      >
        <ConditionPresetForm
          preset={editingPreset}
          assessmentTemplates={assessmentTemplates?.data || []}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false)
            setEditingPreset(null)
          }}
          isLoading={createMutation.isLoading || updateMutation.isLoading}
        />
      </Modal>
    </div>
  )
}