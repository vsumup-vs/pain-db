import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  BookmarkIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  StarIcon,
  EyeIcon,
  ShareIcon,
  UserGroupIcon,
  ChartBarIcon,
  DocumentDuplicateIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { api } from '../services/api'
import FilterBuilder from '../components/FilterBuilder'

export default function SavedViews() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterViewType, setFilterViewType] = useState('')
  const [filterIsShared, setFilterIsShared] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [showTemplates, setShowTemplates] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingView, setEditingView] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    viewType: 'PATIENT_LIST',
    filters: {},
    displayConfig: {},
    isShared: false,
    sharedWithIds: [],
    isDefault: false
  })

  const queryClient = useQueryClient()

  // Build query params
  const getParams = () => {
    const params = {}
    if (filterViewType) params.viewType = filterViewType
    if (filterIsShared !== '') params.isShared = filterIsShared
    return params
  }

  // Fetch saved views
  const { data: savedViewsData, isLoading } = useQuery({
    queryKey: ['saved-views', filterViewType, filterIsShared],
    queryFn: () => api.getSavedViews(getParams())
  })

  const savedViews = savedViewsData || []

  // Separate templates from user views
  const templates = savedViews.filter((view) => view.isTemplate)
  const userViews = savedViews.filter((view) => !view.isTemplate)

  // Filter templates by search term and role
  const filteredTemplates = templates.filter((view) => {
    if (!searchTerm && !filterRole) return true
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      !searchTerm ||
      view.name.toLowerCase().includes(searchLower) ||
      view.description?.toLowerCase().includes(searchLower)
    const matchesRole = !filterRole || view.suggestedRole === filterRole
    return matchesSearch && matchesRole
  })

  // Filter user views by search term
  const filteredUserViews = userViews.filter((view) => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      view.name.toLowerCase().includes(searchLower) ||
      view.description?.toLowerCase().includes(searchLower)
    )
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => api.createSavedView(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-views'])
      toast.success('Saved view created successfully')
      resetForm()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create saved view')
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateSavedView(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-views'])
      toast.success('Saved view updated successfully')
      resetForm()
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update saved view')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteSavedView(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-views'])
      toast.success('Saved view deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete saved view')
    }
  })

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id) => api.setDefaultView(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['saved-views'])
      toast.success('Default view set successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to set default view')
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      viewType: 'PATIENT_LIST',
      filters: {},
      displayConfig: {},
      isShared: false,
      sharedWithIds: [],
      isDefault: false
    })
    setEditingView(null)
    setIsCreateModalOpen(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingView) {
      updateMutation.mutate({ id: editingView.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (view) => {
    setEditingView(view)
    setFormData({
      name: view.name,
      description: view.description || '',
      viewType: view.viewType,
      filters: view.filters,
      displayConfig: view.displayConfig || {},
      isShared: view.isShared,
      sharedWithIds: view.sharedWithIds || [],
      isDefault: view.isDefault
    })
    setIsCreateModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this saved view?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSetDefault = (id) => {
    setDefaultMutation.mutate(id)
  }

  const handleCloneTemplate = (template) => {
    // Clone template as a new user view
    const clonedData = {
      name: template.name + ' (My Copy)',
      description: template.description || '',
      viewType: template.viewType,
      filters: template.filters,
      displayConfig: template.displayConfig || {},
      isShared: false,
      sharedWithIds: [],
      isDefault: false
    }
    createMutation.mutate(clonedData)
  }

  const viewTypeLabels = {
    PATIENT_LIST: 'Patient List',
    TRIAGE_QUEUE: 'Triage Queue',
    ASSESSMENT_LIST: 'Assessment List',
    ENROLLMENT_LIST: 'Enrollment List',
    ALERT_LIST: 'Alert List',
    TASK_LIST: 'Task List'
  }

  const viewTypeColors = {
    PATIENT_LIST: 'bg-blue-100 text-blue-800',
    TRIAGE_QUEUE: 'bg-red-100 text-red-800',
    ASSESSMENT_LIST: 'bg-green-100 text-green-800',
    ENROLLMENT_LIST: 'bg-purple-100 text-purple-800',
    ALERT_LIST: 'bg-yellow-100 text-yellow-800',
    TASK_LIST: 'bg-pink-100 text-pink-800'
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center">
            <BookmarkIcon className="h-8 w-8 text-indigo-600 mr-3" />
            Saved Views & Filters
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Save and manage your custom views and filter configurations for quick access.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Saved View
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search saved views..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <select
          value={filterViewType}
          onChange={(e) => setFilterViewType(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All View Types</option>
          <option value="PATIENT_LIST">Patient List</option>
          <option value="TRIAGE_QUEUE">Triage Queue</option>
          <option value="ASSESSMENT_LIST">Assessment List</option>
          <option value="ENROLLMENT_LIST">Enrollment List</option>
          <option value="ALERT_LIST">Alert List</option>
          <option value="TASK_LIST">Task List</option>
        </select>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Roles</option>
          <option value="CARE_MANAGER">Care Manager</option>
          <option value="CLINICIAN">Clinician</option>
          <option value="BILLING_ADMIN">Billing Admin</option>
          <option value="NURSE">Nurse</option>
          <option value="ALL">General/All</option>
        </select>
        <select
          value={filterIsShared}
          onChange={(e) => setFilterIsShared(e.target.value)}
          className="border border-gray-300 rounded-md px-4 py-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Views</option>
          <option value="false">My Views Only</option>
          <option value="true">Shared Views</option>
        </select>
      </div>

      {/* Template/User Views Toggle */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => setShowTemplates(!showTemplates)}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            showTemplates
              ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
              : 'bg-gray-100 text-gray-700 border border-gray-300'
          }`}
        >
          <SparklesIcon className="h-4 w-4 inline mr-1" />
          {showTemplates ? 'Hide Templates' : 'Show Templates'}
        </button>
        {showTemplates && filteredTemplates.length > 0 && (
          <span className="text-sm text-gray-500">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} available
          </span>
        )}
      </div>

      {/* Templates Section */}
      {showTemplates && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <SparklesIcon className="h-6 w-6 text-indigo-600 mr-2" />
            Template Library
          </h2>
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <SparklesIcon className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">No templates match your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((view) => (
                <div
                  key={view.id}
                  className="bg-gradient-to-br from-indigo-50 to-white rounded-lg shadow-sm border-2 border-indigo-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                        <h3 className="text-lg font-medium text-gray-900">{view.name}</h3>
                      </div>
                      {view.description && (
                        <p className="mt-1 text-sm text-gray-600">{view.description}</p>
                      )}
                      <div className="mt-3 flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            viewTypeColors[view.viewType]
                          }`}
                        >
                          {viewTypeLabels[view.viewType]}
                        </span>
                        {view.suggestedRole && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            {view.suggestedRole.replace('_', ' ')}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Template
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => handleCloneTemplate(view)}
                      className="w-full inline-flex items-center justify-center px-4 py-2 border border-indigo-300 rounded-md text-sm font-medium text-indigo-700 bg-white hover:bg-indigo-50"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4 mr-2" />
                      Use as Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* User Views List */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BookmarkIcon className="h-6 w-6 text-gray-900 mr-2" />
          My Saved Views
        </h2>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-indigo-600"></div>
            <p className="mt-2 text-sm text-gray-500">Loading saved views...</p>
          </div>
        ) : filteredUserViews.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <BookmarkIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No saved views</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new saved view or cloning a template.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Saved View
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredUserViews.map((view) => (
              <div
                key={view.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-medium text-gray-900">{view.name}</h3>
                      {view.isDefault && (
                        <StarIconSolid className="h-5 w-5 text-yellow-500" title="Default View" />
                      )}
                    </div>
                    {view.description && (
                      <p className="mt-1 text-sm text-gray-500">{view.description}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          viewTypeColors[view.viewType]
                        }`}
                      >
                        {viewTypeLabels[view.viewType]}
                      </span>
                      {view.isShared && (
                        <span className="inline-flex items-center text-xs text-gray-500">
                          <ShareIcon className="h-4 w-4 mr-1" />
                          Shared
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center text-xs text-gray-500">
                      <ChartBarIcon className="h-4 w-4 mr-1" />
                      Used {view.usageCount} times
                    </div>
                    {view.user && (
                      <p className="mt-2 text-xs text-gray-400">
                        Created by {view.user.firstName} {view.user.lastName}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {!view.isDefault && (
                    <button
                      onClick={() => handleSetDefault(view.id)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      title="Set as default"
                    >
                      <StarIcon className="h-4 w-4 mr-1" />
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(view)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(view.id)}
                    className="inline-flex items-center justify-center px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {editingView ? 'Edit Saved View' : 'Create Saved View'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., AM Hypertension Round"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Optional description of this view..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  View Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.viewType}
                  onChange={(e) => setFormData({ ...formData, viewType: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="PATIENT_LIST">Patient List</option>
                  <option value="TRIAGE_QUEUE">Triage Queue</option>
                  <option value="ASSESSMENT_LIST">Assessment List</option>
                  <option value="ENROLLMENT_LIST">Enrollment List</option>
                  <option value="ALERT_LIST">Alert List</option>
                  <option value="TASK_LIST">Task List</option>
                </select>
              </div>

              {/* Visual Filter Builder */}
              <div>
                <FilterBuilder
                  viewType={formData.viewType}
                  filters={formData.filters}
                  onChange={(filters) => setFormData({ ...formData, filters })}
                  showJson={true}
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isShared}
                    onChange={(e) => setFormData({ ...formData, isShared: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Share with organization</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Set as default</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  {editingView ? 'Update View' : 'Create View'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
