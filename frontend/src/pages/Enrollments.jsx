import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { 
  PlusIcon, 
  EyeIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  UserIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  CloudArrowUpIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import Modal from '../components/Modal'
import BulkEnrollmentUpload from '../components/BulkEnrollmentUpload'

export default function Enrollments() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  const { data: enrollmentsResponse, isLoading } = useQuery({
    queryKey: ['enrollments', statusFilter],
    queryFn: () => api.getEnrollments({ 
      status: statusFilter !== 'all' ? statusFilter : undefined 
    }),
  })

  const { data: patientsResponse } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.getPatients(),
  })

  const { data: cliniciansResponse } = useQuery({
    queryKey: ['clinicians'],
    queryFn: () => api.getClinicians(),
  })

  const { data: conditionPresetsResponse } = useQuery({
    queryKey: ['condition-presets'],
    queryFn: () => api.getConditionPresets(),
  })

  // Extract arrays from responses
  const enrollments = enrollmentsResponse?.data || []
  const patients = patientsResponse?.data || []
  const clinicians = cliniciansResponse?.data || []
  const conditionPresets = conditionPresetsResponse?.data || []

  // Filter enrollments based on search term
  const filteredEnrollments = enrollments.filter(enrollment => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      enrollment.patient?.firstName?.toLowerCase().includes(searchLower) ||
      enrollment.patient?.lastName?.toLowerCase().includes(searchLower) ||
      enrollment.patient?.email?.toLowerCase().includes(searchLower) ||
      enrollment.clinician?.firstName?.toLowerCase().includes(searchLower) ||
      enrollment.clinician?.lastName?.toLowerCase().includes(searchLower)
    )
  })

  const createMutation = useMutation({
    mutationFn: api.createEnrollment,
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollments'])
      setIsModalOpen(false)
      toast.success('Enrollment created successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create enrollment')
    },
  })

  const bulkCreateMutation = useMutation({
    mutationFn: api.createBulkEnrollments,
    onSuccess: (result) => {
      queryClient.invalidateQueries(['enrollments'])
      queryClient.invalidateQueries(['patients'])
      queryClient.invalidateQueries(['clinicians'])
      
      const { created, warnings, errors } = result
      let message = `Successfully created ${created.enrollments} enrollments`
      if (created.patients > 0) message += `, ${created.patients} patients`
      if (created.clinicians > 0) message += `, ${created.clinicians} clinicians`
      
      toast.success(message)
      
      if (warnings.length > 0) {
        warnings.forEach(warning => toast.warn(warning))
      }
      
      if (errors.length > 0) {
        errors.forEach(error => toast.error(error))
      }
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create bulk enrollments')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateEnrollment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['enrollments'])
      toast.success('Enrollment updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update enrollment')
    },
  })

  const handleSubmit = (formData) => {
    createMutation.mutate(formData)
  }

  const handleBulkSubmit = (enrollmentData) => {
    bulkCreateMutation.mutate(enrollmentData)
  }

  const handleStatusChange = (enrollmentId, newStatus) => {
    updateMutation.mutate({
      id: enrollmentId,
      data: { status: newStatus }
    })
  }

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'ended':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'paused':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'ended':
        return 'bg-red-100 text-red-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
              <p className="text-gray-600">Manage patient enrollments in care programs</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            <button
              onClick={() => setIsBulkUploadOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-teal-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-2" />
              Bulk Upload
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Enrollment
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search enrollments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
                <option value="paused">Paused</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enrollments Grid */}
        <div className="grid gap-6">
          {filteredEnrollments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No enrollments found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first enrollment'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <div className="flex justify-center space-x-3">
                  <button
                    onClick={() => setIsBulkUploadOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </button>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Create Enrollment
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-200">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <UserIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {enrollment.patient?.firstName} {enrollment.patient?.lastName}
                        </h3>
                        <p className="text-gray-600">{enrollment.patient?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(enrollment.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                        {enrollment.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Clinician</label>
                      <p className="text-sm text-gray-900">
                        {enrollment.clinician?.firstName} {enrollment.clinician?.lastName}
                      </p>
                      <p className="text-xs text-gray-500">{enrollment.clinician?.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Care Program</label>
                      <p className="text-sm text-gray-900">{enrollment.preset?.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                      <p className="text-sm text-gray-900">{enrollment.diagnosisCode}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Started: {new Date(enrollment.startDate).toLocaleDateString()}</span>
                      </div>
                      {enrollment.endDate && (
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>Ends: {new Date(enrollment.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <select
                        value={enrollment.status}
                        onChange={(e) => handleStatusChange(enrollment.id, e.target.value)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="ended">Ended</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Enrollment">
        <EnrollmentForm
          patients={patients}
          clinicians={clinicians}
          conditionPresets={conditionPresets}
          onSubmit={handleSubmit}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <BulkEnrollmentUpload
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSubmit={handleBulkSubmit}
        patients={patients}
        clinicians={clinicians}
        conditionPresets={conditionPresets}
      />
    </div>
  )
}

function EnrollmentForm({ patients, clinicians, conditionPresets, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    patientId: '',
    clinicianId: '',
    presetId: '',
    diagnosisCode: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Patient *
          </label>
          <select
            name="patientId"
            value={formData.patientId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName} ({patient.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clinician *
          </label>
          <select
            name="clinicianId"
            value={formData.clinicianId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a clinician</option>
            {clinicians.map((clinician) => (
              <option key={clinician.id} value={clinician.id}>
                {clinician.firstName} {clinician.lastName} ({clinician.email})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Care Program *
          </label>
          <select
            name="presetId"
            value={formData.presetId}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a care program</option>
            {conditionPresets.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Diagnosis Code *
          </label>
          <input
            type="text"
            name="diagnosisCode"
            value={formData.diagnosisCode}
            onChange={handleChange}
            required
            placeholder="e.g., M79.3"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date *
          </label>
          <input
            type="date"
            name="startDate"
            value={formData.startDate}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            name="endDate"
            value={formData.endDate}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Additional notes about this enrollment..."
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Creating...' : 'Create Enrollment'}
        </button>
      </div>
    </form>
  )
}