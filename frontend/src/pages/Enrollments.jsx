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
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import Modal from '../components/Modal'

export default function Enrollments() {
  const [isModalOpen, setIsModalOpen] = useState(false)
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

  // Extract arrays from responses
  const enrollments = enrollmentsResponse?.data || []
  const patients = patientsResponse?.data || []
  const clinicians = cliniciansResponse?.data || []

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

  const handleSubmit = (data) => {
    createMutation.mutate(data)
  }

  const handleStatusChange = (enrollmentId, newStatus) => {
    updateMutation.mutate({
      id: enrollmentId,
      data: { status: newStatus }
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border border-green-300'
      case 'INACTIVE':
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
      case 'COMPLETED':
        return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border border-blue-300'
      case 'WITHDRAWN':
        return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border border-red-300'
      default:
        return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border border-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'INACTIVE':
        return <ClockIcon className="h-5 w-5 text-gray-500" />
      case 'COMPLETED':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />
      case 'WITHDRAWN':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getEnrollmentStats = () => {
    const activeEnrollments = enrollments.filter(e => e.status === 'ACTIVE').length
    const completedEnrollments = enrollments.filter(e => e.status === 'COMPLETED').length
    const inactiveEnrollments = enrollments.filter(e => e.status === 'INACTIVE').length
    const withdrawnEnrollments = enrollments.filter(e => e.status === 'WITHDRAWN').length
    
    return { activeEnrollments, completedEnrollments, inactiveEnrollments, withdrawnEnrollments }
  }

  const stats = getEnrollmentStats()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Patient Enrollments
              </h1>
              <p className="mt-2 text-gray-600">Manage patient-clinician enrollments</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Enrollment
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.activeEnrollments}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-blue-600">{stats.completedEnrollments}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <DocumentTextIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-3xl font-bold text-gray-600">{stats.inactiveEnrollments}</p>
              </div>
              <div className="p-3 bg-gray-100 rounded-full">
                <ClockIcon className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Withdrawn</p>
                <p className="text-3xl font-bold text-red-600">{stats.withdrawnEnrollments}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <XCircleIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search enrollments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="COMPLETED">Completed</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enrollments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEnrollments.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-lg border border-gray-100 p-12 text-center">
              <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No enrollments found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Get started by creating your first enrollment'}
              </p>
              {!searchTerm && statusFilter === 'all' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Enrollment
                </button>
              )}
            </div>
          ) : (
            filteredEnrollments.map((enrollment) => (
              <div key={enrollment.id} className="bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(enrollment.status)}
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(enrollment.status)}`}>
                        {enrollment.status}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <button className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200">
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      {enrollment.status === 'ACTIVE' && (
                        <select
                          value={enrollment.status}
                          onChange={(e) => handleStatusChange(enrollment.id, e.target.value)}
                          className="text-xs border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="COMPLETED">Completed</option>
                          <option value="WITHDRAWN">Withdrawn</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-full">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Patient</p>
                        <p className="font-semibold text-gray-900">
                          {enrollment.patient?.firstName} {enrollment.patient?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{enrollment.patient?.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <UserGroupIcon className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Clinician</p>
                        <p className="font-semibold text-gray-900">
                          {enrollment.clinician?.firstName} {enrollment.clinician?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{enrollment.clinician?.specialization}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <CalendarIcon className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Enrolled Date</p>
                        <p className="font-semibold text-gray-900">
                          {new Date(enrollment.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="New Enrollment"
        >
          <EnrollmentForm
            patients={patients}
            clinicians={clinicians}
            onSubmit={handleSubmit}
            isLoading={createMutation.isLoading}
          />
        </Modal>
      </div>
    </div>
  )
}

function EnrollmentForm({ patients, clinicians, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    patientId: '',
    clinicianId: '',
    notes: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Patient</label>
          <select
            name="patientId"
            value={formData.patientId}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="">Select Patient</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.firstName} {patient.lastName} - {patient.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Clinician</label>
          <select
            name="clinicianId"
            value={formData.clinicianId}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          >
            <option value="">Select Clinician</option>
            {clinicians.map((clinician) => (
              <option key={clinician.id} value={clinician.id}>
                {clinician.firstName} {clinician.lastName} - {clinician.specialty}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            placeholder="Optional enrollment notes..."
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Enrollment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}