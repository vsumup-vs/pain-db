import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  AcademicCapIcon,
  BuildingOfficeIcon,
  IdentificationIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import Modal from '../components/Modal'

export default function Clinicians() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClinician, setEditingClinician] = useState(null)
  const queryClient = useQueryClient()

  const { data: cliniciansResponse, isLoading, error } = useQuery({
    queryKey: ['clinicians', searchTerm],
    queryFn: () => api.getClinicians({ search: searchTerm }),
  })

  const clinicians = cliniciansResponse?.data || []

  const createMutation = useMutation({
    mutationFn: api.createClinician,
    onSuccess: () => {
      queryClient.invalidateQueries(['clinicians'])
      setIsModalOpen(false)
      toast.success('Clinician created successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create clinician')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateClinician(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['clinicians'])
      setIsModalOpen(false)
      setEditingClinician(null)
      toast.success('Clinician updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update clinician')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteClinician,
    onSuccess: () => {
      queryClient.invalidateQueries(['clinicians'])
      toast.success('Clinician deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete clinician')
    },
  })

  const handleCreate = () => {
    setEditingClinician(null)
    setIsModalOpen(true)
  }

  const handleEdit = (clinician) => {
    setEditingClinician(clinician)
    setIsModalOpen(true)
  }

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this clinician?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (data) => {
    if (editingClinician) {
      updateMutation.mutate({ id: editingClinician.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const filteredClinicians = clinicians.filter(clinician =>
    `${clinician.firstName} ${clinician.lastName} ${clinician.email} ${clinician.specialty} ${clinician.department}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-200"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg">Error loading clinicians: {error.message}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Clinicians
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Manage healthcare providers and their credentials
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Clinician</span>
          </button>
        </div>

        {/* Search and Stats */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search clinicians by name, specialty, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="ml-6 text-sm text-gray-600">
              {searchTerm ? (
                <span>Found {filteredClinicians.length} of {clinicians.length} clinicians</span>
              ) : (
                <span>{clinicians.length} total clinicians</span>
              )}
            </div>
          </div>
        </div>

        {/* Clinicians Grid */}
        {filteredClinicians.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <UserIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchTerm ? 'No clinicians found' : 'No clinicians yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm 
                ? 'Try adjusting your search terms or clear the search to see all clinicians.'
                : 'Get started by adding your first clinician to the system.'
              }
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreate}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center space-x-2 mx-auto"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add First Clinician</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClinicians.map((clinician) => (
              <div key={clinician.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="bg-gradient-to-r from-green-500 to-blue-600 px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-white font-bold text-lg">
                      {clinician.firstName?.[0]}{clinician.lastName?.[0]}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {clinician.firstName} {clinician.lastName}
                      </h3>
                      <p className="text-green-100 text-sm">{clinician.specialty}</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-gray-600">
                      <EnvelopeIcon className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">{clinician.email}</span>
                    </div>
                    {clinician.phone && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <PhoneIcon className="h-4 w-4 text-green-500" />
                        <span className="text-sm">{clinician.phone}</span>
                      </div>
                    )}
                    {clinician.department && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <BuildingOfficeIcon className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">{clinician.department}</span>
                      </div>
                    )}
                    {clinician.licenseNumber && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <IdentificationIcon className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">License: {clinician.licenseNumber}</span>
                      </div>
                    )}
                    {clinician.npiNumber && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <IdentificationIcon className="h-4 w-4 text-green-500" />
                        <span className="text-sm">NPI: {clinician.npiNumber}</span>
                      </div>
                    )}
                    {clinician.credentials && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <AcademicCapIcon className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm">{clinician.credentials}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      <AcademicCapIcon className="h-3 w-3 mr-1" />
                      {clinician.specialty || 'General'}
                    </span>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(clinician)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit clinician"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(clinician.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete clinician"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingClinician(null)
          }}
          title={editingClinician ? 'Edit Clinician' : 'Add Clinician'}
        >
          <ClinicianForm
            clinician={editingClinician}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </Modal>
      </div>
    </div>
  )
}

function ClinicianForm({ clinician, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    firstName: clinician?.firstName || '',
    lastName: clinician?.lastName || '',
    email: clinician?.email || '',
    phone: clinician?.phone || '',
    specialty: clinician?.specialty || '',
    licenseNumber: clinician?.licenseNumber || '',
    npiNumber: clinician?.npiNumber || '',
    department: clinician?.department || '',
    credentials: clinician?.credentials || '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">License Number</label>
          <input
            type="text"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">NPI Number</label>
          <input
            type="text"
            name="npiNumber"
            value={formData.npiNumber}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="10-digit National Provider Identifier"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Specialty</label>
          <input
            type="text"
            name="specialty"
            value={formData.specialty}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="e.g., Cardiology, Internal Medicine"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Credentials</label>
          <input
            type="text"
            name="credentials"
            value={formData.credentials}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            placeholder="e.g., MD, DO, NP, PA"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
        <input
          type="text"
          name="department"
          value={formData.department}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-6">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? 'Saving...' : clinician ? 'Update Clinician' : 'Create Clinician'}
        </button>
      </div>
    </form>
  )
}