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
import EnhancedEnrollmentForm from '../components/EnhancedEnrollmentForm'
import { useNavigate } from 'react-router-dom'

export default function Enrollments() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()
  const navigate = useNavigate()

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

  const { data: careProgramsResponse } = useQuery({
    queryKey: ['care-programs'],
    queryFn: () => api.getCarePrograms(),
  })

  const { data: conditionPresetsResponse } = useQuery({
    queryKey: ['condition-presets'],
    queryFn: () => api.getConditionPresets(),
  })

  // Extract arrays from responses
  const enrollments = enrollmentsResponse?.data || []
  const patients = patientsResponse?.data || []
  const clinicians = cliniciansResponse?.data || []
  const carePrograms = careProgramsResponse?.data || []
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
    mutationFn: async (formData) => {
      // Create the enrollment first
      const enrollmentResponse = await api.createEnrollment({
        patientId: formData.patientId,
        clinicianId: formData.clinicianId,
        careProgramId: formData.careProgramId,
        conditionPresetId: formData.conditionPresetId || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        notes: formData.notes
      })

      // If medications were added, create them
      if (formData.medications && formData.medications.length > 0) {
        const enrollmentId = enrollmentResponse.data.id
        
        // Create medications for the enrollment
        await Promise.all(
          formData.medications.map(medication => 
            api.addMedicationToEnrollment(enrollmentId, {
              ...medication,
              startDate: medication.startDate || formData.startDate
            })
          )
        )
      }

      return enrollmentResponse
    },
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
      toast.error(error.response?.data?.message || 'Failed to create enrollments')
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

  const handleViewDetails = (enrollmentId) => {
    navigate(`/enrollments/${enrollmentId}`)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'ended': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <CheckCircleIcon className="h-4 w-4 text-green-600" />
      case 'paused': return <ClockIcon className="h-4 w-4 text-yellow-600" />
      case 'ended': return <XCircleIcon className="h-4 w-4 text-gray-600" />
      default: return <ClockIcon className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Enrollments</h1>
          <p className="text-gray-600">Manage patient enrollments and care programs</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <CloudArrowUpIcon className="h-4 w-4 mr-2" />
            Bulk Upload
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Enrollment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search enrollments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="ended">Ended</option>
          </select>
        </div>
        <div className="text-sm text-gray-600">
          {filteredEnrollments.length} enrollment{filteredEnrollments.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Enrollments List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredEnrollments.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No enrollments found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first enrollment.'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create First Enrollment
              </button>
            )}
          </div>
        ) : (
          filteredEnrollments.map((enrollment) => (
            <div key={enrollment.id} className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {enrollment.patient?.firstName} {enrollment.patient?.lastName}
                    </h3>
                    <p className="text-gray-600">{enrollment.patient?.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(enrollment.status)}`}>
                    {getStatusIcon(enrollment.status)}
                    <span className="ml-1 capitalize">{enrollment.status}</span>
                  </span>
                  <button 
                    onClick={() => handleViewDetails(enrollment.id)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Clinician</p>
                  <p className="text-sm text-gray-900">
                    {enrollment.clinician?.firstName} {enrollment.clinician?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Care Program</p>
                  <p className="text-sm text-gray-900">{enrollment.careProgram?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Start Date</p>
                  <p className="text-sm text-gray-900">
                    {enrollment.startDate ? new Date(enrollment.startDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {enrollment.diagnosisCode && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500">Diagnosis</p>
                  <p className="text-sm text-gray-900">{enrollment.diagnosisCode}</p>
                </div>
              )}

              {enrollment.notes && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="text-sm text-gray-900">{enrollment.notes}</p>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Created {enrollment.createdAt ? new Date(enrollment.createdAt).toLocaleDateString() : 'N/A'}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={enrollment.status}
                    onChange={(e) => handleStatusChange(enrollment.id, e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Enrollment"
        size="lg"
      >
        <EnhancedEnrollmentForm
          patients={patients}
          clinicians={clinicians}
          carePrograms={carePrograms}
          conditionPresets={conditionPresets}
          onSubmit={handleSubmit}
          isLoading={createMutation.isLoading}
        />
      </Modal>

      <Modal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        title="Bulk Upload Enrollments"
        size="xl"
      >
        <BulkEnrollmentUpload
          onSubmit={handleBulkSubmit}
          isLoading={bulkCreateMutation.isLoading}
          onClose={() => setIsBulkUploadOpen(false)}
        />
      </Modal>
    </div>
  )
}