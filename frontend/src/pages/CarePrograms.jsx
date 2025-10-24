import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import Modal from '../components/Modal'

// Program type badge colors
const PROGRAM_TYPE_COLORS = {
  PAIN_MANAGEMENT: 'bg-red-100 text-red-800',
  DIABETES: 'bg-purple-100 text-purple-800',
  HYPERTENSION: 'bg-blue-100 text-blue-800',
  MENTAL_HEALTH: 'bg-green-100 text-green-800',
  CARDIAC_REHAB: 'bg-orange-100 text-orange-800',
  GENERAL_WELLNESS: 'bg-teal-100 text-teal-800'
}

// Program type labels
const PROGRAM_TYPE_LABELS = {
  PAIN_MANAGEMENT: 'Pain Management',
  DIABETES: 'Diabetes',
  HYPERTENSION: 'Hypertension',
  MENTAL_HEALTH: 'Mental Health',
  CARDIAC_REHAB: 'Cardiac Rehab',
  GENERAL_WELLNESS: 'General Wellness'
}

export default function CarePrograms() {
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    isActive: true,
    settings: ''
  })

  const queryClient = useQueryClient()

  // Fetch care programs
  const { data: programsResponse, isLoading } = useQuery({
    queryKey: ['care-programs', typeFilter, statusFilter],
    queryFn: () => api.getCarePrograms({
      type: typeFilter || undefined,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active'
    })
  })

  const programs = programsResponse?.data || []

  // Filter programs based on search
  const filteredPrograms = programs.filter(program =>
    program.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    program.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => api.createCareProgram(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['care-programs'])
      setIsModalOpen(false)
      resetForm()
      toast.success('Care program created successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create care program')
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateCareProgram(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['care-programs'])
      setIsModalOpen(false)
      setEditingProgram(null)
      resetForm()
      toast.success('Care program updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update care program')
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteCareProgram(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['care-programs'])
      toast.success('Care program deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete care program')
    }
  })

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      description: '',
      isActive: true,
      settings: ''
    })
  }

  const handleCreate = () => {
    setEditingProgram(null)
    resetForm()
    setIsModalOpen(true)
  }

  const handleEdit = (program) => {
    setEditingProgram(program)
    setFormData({
      name: program.name,
      type: program.type,
      description: program.description || '',
      isActive: program.isActive,
      settings: program.settings ? JSON.stringify(program.settings, null, 2) : ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (program) => {
    if (!window.confirm(
      `Are you sure you want to delete "${program.name}"? ` +
      `${program._count?.enrollments > 0 ? `This program has ${program._count.enrollments} active enrollment(s).` : ''}`
    )) {
      return
    }
    deleteMutation.mutate(program.id)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validate
    if (!formData.name.trim()) {
      toast.error('Program name is required')
      return
    }
    if (!formData.type) {
      toast.error('Program type is required')
      return
    }

    // Parse settings JSON if provided
    let parsedSettings = null
    if (formData.settings.trim()) {
      try {
        parsedSettings = JSON.parse(formData.settings)
      } catch (error) {
        toast.error('Invalid JSON in settings field')
        return
      }
    }

    const submitData = {
      name: formData.name.trim(),
      type: formData.type,
      description: formData.description.trim() || null,
      isActive: formData.isActive,
      settings: parsedSettings
    }

    if (editingProgram) {
      updateMutation.mutate({ id: editingProgram.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  // Calculate statistics
  const stats = {
    total: programs.length,
    active: programs.filter(p => p.isActive).length,
    inactive: programs.filter(p => !p.isActive).length,
    totalEnrollments: programs.reduce((sum, p) => sum + (p._count?.enrollments || 0), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Care Programs</h1>
          <p className="text-gray-600">Manage care programs and monitor enrollments</p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          New Program
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Programs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Programs</p>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive Programs</p>
              <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
            </div>
            <XCircleIcon className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Enrollments</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalEnrollments}</p>
            </div>
            <UserGroupIcon className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="relative">
            <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="">All Types</option>
              <option value="PAIN_MANAGEMENT">Pain Management</option>
              <option value="DIABETES">Diabetes</option>
              <option value="HYPERTENSION">Hypertension</option>
              <option value="MENTAL_HEALTH">Mental Health</option>
              <option value="CARDIAC_REHAB">Cardiac Rehab</option>
              <option value="GENERAL_WELLNESS">General Wellness</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Programs List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No care programs found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || typeFilter || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first care program.'}
            </p>
            {!searchTerm && !typeFilter && statusFilter === 'all' && (
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create First Program
              </button>
            )}
          </div>
        ) : (
          filteredPrograms.map((program) => (
            <div
              key={program.id}
              className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-medium text-gray-900">{program.name}</h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${PROGRAM_TYPE_COLORS[program.type]}`}>
                      {PROGRAM_TYPE_LABELS[program.type]}
                    </span>
                    {program.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircleIcon className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        <XCircleIcon className="h-3 w-3 mr-1" />
                        Inactive
                      </span>
                    )}
                  </div>
                  {program.description && (
                    <p className="text-sm text-gray-600 mb-3">{program.description}</p>
                  )}
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <UserGroupIcon className="h-4 w-4 mr-1" />
                      {program._count?.enrollments || 0} enrollment{program._count?.enrollments !== 1 ? 's' : ''}
                    </div>
                    {program.settings && (
                      <div className="flex items-center">
                        <ChartBarIcon className="h-4 w-4 mr-1" />
                        Custom settings configured
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleEdit(program)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit program"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(program)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete program"
                    disabled={program._count?.enrollments > 0}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {program.settings && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <details className="text-sm">
                    <summary className="text-gray-700 font-medium cursor-pointer hover:text-gray-900">
                      View Settings
                    </summary>
                    <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(program.settings, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingProgram(null)
          resetForm()
        }}
        title={editingProgram ? 'Edit Care Program' : 'Create Care Program'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Remote Blood Pressure Monitoring"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Program Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select type...</option>
              <option value="PAIN_MANAGEMENT">Pain Management</option>
              <option value="DIABETES">Diabetes</option>
              <option value="HYPERTENSION">Hypertension</option>
              <option value="MENTAL_HEALTH">Mental Health</option>
              <option value="CARDIAC_REHAB">Cardiac Rehab</option>
              <option value="GENERAL_WELLNESS">General Wellness</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder="Describe the program's purpose and goals..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Settings (JSON)
            </label>
            <textarea
              value={formData.settings}
              onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows={6}
              placeholder={`{\n  "frequency": "daily",\n  "alerts": { "threshold": 180 },\n  "billingCode": "99454"\n}`}
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional: Custom program settings in JSON format
            </p>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              Active (program is available for new enrollments)
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false)
                setEditingProgram(null)
                resetForm()
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isLoading || updateMutation.isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isLoading || updateMutation.isLoading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {editingProgram ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                editingProgram ? 'Update Program' : 'Create Program'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
