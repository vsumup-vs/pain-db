import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  MapPinIcon,
  XMarkIcon,
  ListBulletIcon,
  Squares2X2Icon,
  ChevronUpIcon,
  ChevronDownIcon,
  SparklesIcon,
  XCircleIcon,
  EyeIcon,
  ChartBarIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import Modal from '../components/Modal'
import PatientContextPanel from '../components/PatientContextPanel'
import { useDefaultView } from '../hooks/useDefaultView'

export default function Patients() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const queryClient = useQueryClient()

  // Filter states - matching FilterBuilder fields for PATIENT_LIST
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGender, setFilterGender] = useState('')
  const [filterAgeMin, setFilterAgeMin] = useState('')
  const [filterAgeMax, setFilterAgeMax] = useState('')

  // Saved Views integration
  const { defaultView, hasDefaultView } = useDefaultView('PATIENT_LIST')
  const [appliedViewName, setAppliedViewName] = useState(null)
  const [isViewCleared, setIsViewCleared] = useState(false) // Track if user explicitly cleared view

  // Patient Context Panel state
  const [isPatientContextOpen, setIsPatientContextOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState(null)

  console.log('[Patients] useDefaultView result:', { defaultView, hasDefaultView, appliedViewName })

  // View mode state with localStorage persistence
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('patients-view-mode') || 'card'
  })

  // Table sorting state
  const [sortConfig, setSortConfig] = useState({ key: 'firstName', direction: 'asc' })

  // Handle view mode change
  const handleViewChange = (mode) => {
    setViewMode(mode)
    localStorage.setItem('patients-view-mode', mode)
  }

  // Handle column sort
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  // Apply default view filters on page load
  useEffect(() => {
    console.log('[Patients] useEffect triggered - checking conditions:', {
      hasDefaultView: !!defaultView,
      appliedViewName,
      isViewCleared,
      defaultView
    })

    // Only apply default view if:
    // 1. A default view exists
    // 2. No view is currently applied
    // 3. User hasn't explicitly cleared the view
    if (defaultView && !appliedViewName && !isViewCleared) {
      const savedFilters = defaultView.filters || {}

      console.log('[Patients] Applying default view:', defaultView.name)
      console.log('[Patients] Saved filters:', savedFilters)

      // Helper function to extract simple values from complex filter objects
      const extractFilterValue = (filterValue, defaultValue = '') => {
        if (!filterValue) return defaultValue

        // Handle arrays (take first element)
        if (Array.isArray(filterValue)) {
          const firstValue = filterValue[0]
          if (typeof firstValue === 'object' && firstValue.not) {
            console.log('[Patients] NOT operator detected, using default:', defaultValue)
            return defaultValue
          }
          return typeof firstValue === 'string' ? firstValue : defaultValue
        }

        // Handle negation operators: { not: 'value' }
        if (typeof filterValue === 'object' && filterValue.not) {
          console.log('[Patients] NOT operator detected, using default:', defaultValue)
          return defaultValue
        }

        // Handle FilterBuilder format: { operator: 'equals', value: 'ACTIVE' }
        if (typeof filterValue === 'object' && filterValue.value) {
          return filterValue.value
        }

        // Handle simple strings
        if (typeof filterValue === 'string') {
          return filterValue
        }

        return defaultValue
      }

      // Apply all saved filters with complex object handling
      if (savedFilters.searchTerm) {
        setSearchTerm(extractFilterValue(savedFilters.searchTerm, ''))
      }
      if (savedFilters.status) {
        setFilterStatus(extractFilterValue(savedFilters.status, ''))
      }
      if (savedFilters.gender) {
        setFilterGender(extractFilterValue(savedFilters.gender, ''))
      }
      if (savedFilters.ageMin !== undefined) {
        setFilterAgeMin(savedFilters.ageMin.toString())
      }
      if (savedFilters.ageMax !== undefined) {
        setFilterAgeMax(savedFilters.ageMax.toString())
      }

      console.log('[Patients] Applied filters')
      setAppliedViewName(defaultView.name)
      toast.info(`Applied saved view: "${defaultView.name}"`, { autoClose: 3000 })
    }
  }, [defaultView, appliedViewName, isViewCleared])

  // Function to clear saved view and reset filters
  const clearSavedView = () => {
    setSearchTerm('')
    setFilterStatus('')
    setFilterGender('')
    setFilterAgeMin('')
    setFilterAgeMax('')
    setSortConfig({ key: 'firstName', direction: 'asc' })
    setAppliedViewName(null)
    setIsViewCleared(true) // Prevent default view from re-applying
    toast.success('Cleared saved view filters')
  }

  const { data: patientsResponse, isLoading } = useQuery({
    queryKey: ['patients', searchTerm, filterStatus, filterGender, filterAgeMin, filterAgeMax],
    queryFn: () => api.getPatients({
      search: searchTerm,
      status: filterStatus || undefined,
      gender: filterGender || undefined,
      ageMin: filterAgeMin ? parseInt(filterAgeMin) : undefined,
      ageMax: filterAgeMax ? parseInt(filterAgeMax) : undefined
    }),
  })

  // Extract patients array and pagination from response
  const patients = patientsResponse?.data || []
  const pagination = patientsResponse?.pagination || {}

  // DEBUG: Log patient count
  console.log('[Patients] API Response:', {
    totalPatients: patients.length,
    patientsResponse,
    searchTerm,
    filterStatus,
    filterGender
  })

  const createMutation = useMutation({
    mutationFn: api.createPatient,
    onSuccess: () => {
      queryClient.invalidateQueries(['patients'])
      setIsModalOpen(false)
      toast.success('Patient created successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create patient')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updatePatient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['patients'])
      setIsModalOpen(false)
      setEditingPatient(null)
      toast.success('Patient updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update patient')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deletePatient,
    onSuccess: () => {
      queryClient.invalidateQueries(['patients'])
      toast.success('Patient deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete patient')
    },
  })

  const handleCreate = () => {
    setEditingPatient(null)
    setIsModalOpen(true)
  }

  const handleEdit = (patient) => {
    setEditingPatient(patient)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this patient?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleSubmit = (data) => {
    if (editingPatient) {
      updateMutation.mutate({ id: editingPatient.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const getGenderColor = (gender) => {
    switch (gender?.toLowerCase()) {
      case 'male':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'female':
        return 'bg-pink-100 text-pink-800 border-pink-200'
      case 'other':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatAddress = (address) => {
    if (!address) return ''
    
    // If address is already a string, return it
    if (typeof address === 'string') return address
    
    // If address is an object, format it properly
    if (typeof address === 'object') {
      const parts = []
      if (address.street) parts.push(address.street)
      if (address.city) parts.push(address.city)
      if (address.state) parts.push(address.state)
      if (address.zipCode) parts.push(address.zipCode)
      return parts.join(', ')
    }
    
    return ''
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="flex items-center justify-center h-64">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200"></div>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent absolute top-0 left-0"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="space-y-8 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
              Patients
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Manage patient information and medical records
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* View Toggle */}
            <div className="flex items-center space-x-2 bg-white px-2 py-2 rounded-xl shadow-lg">
              <button
                onClick={() => handleViewChange('table')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title="Table view"
              >
                <ListBulletIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleViewChange('card')}
                className={`p-2 rounded-lg transition-all ${
                  viewMode === 'card'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                }`}
                title="Card view"
              >
                <Squares2X2Icon className="h-5 w-5" />
              </button>
            </div>

            {/* Add Patient Button */}
            <button
              onClick={handleCreate}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Patient</span>
            </button>
          </div>
        </div>

        {/* Saved View Indicator */}
        {defaultView && (
          <div className={`border rounded-xl p-4 flex items-center justify-between ${
            appliedViewName
              ? 'bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200'
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center">
              <SparklesIcon className={`h-5 w-5 mr-2 ${appliedViewName ? 'text-purple-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${appliedViewName ? 'text-purple-900' : 'text-gray-600'}`}>
                {appliedViewName ? (
                  <>Active View: <span className="font-bold">{appliedViewName}</span></>
                ) : (
                  <>Default view available: <span className="font-semibold">{defaultView.name}</span> (not applied)</>
                )}
              </span>
            </div>
            {appliedViewName ? (
              <button
                onClick={clearSavedView}
                className="inline-flex items-center px-3 py-1.5 bg-white border border-purple-300 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200"
              >
                <XCircleIcon className="h-4 w-4 mr-1" />
                Clear View
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsViewCleared(false)
                  setAppliedViewName(null) // This will trigger the useEffect to apply the view
                }}
                className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200"
              >
                <SparklesIcon className="h-4 w-4 mr-1" />
                Apply View
              </button>
            )}
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients by name, email, or MRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
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
          
          {searchTerm && (
            <div className="mt-3 text-sm text-gray-600">
              <span>Searching for "{searchTerm}" • {patients.length} results found</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="DECEASED">Deceased</option>
              </select>
            </div>

            {/* Gender Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Age Min Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Age
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={filterAgeMin}
                onChange={(e) => setFilterAgeMin(e.target.value)}
                placeholder="e.g., 18"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Age Max Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Age
              </label>
              <input
                type="number"
                min="0"
                max="120"
                value={filterAgeMax}
                onChange={(e) => setFilterAgeMax(e.target.value)}
                placeholder="e.g., 65"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          {(filterStatus || filterGender || filterAgeMin || filterAgeMax) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setFilterStatus('')
                  setFilterGender('')
                  setFilterAgeMin('')
                  setFilterAgeMax('')
                }}
                className="inline-flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                <XCircleIcon className="h-4 w-4 mr-1" />
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Patients List/Grid */}
        {patients.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
            <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No patients found</h3>
            <p className="text-gray-600 mb-6">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first patient.'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleCreate}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-2 mx-auto"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Add First Patient</span>
              </button>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => handleSort('firstName')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Name</span>
                        {sortConfig.key === 'firstName' && (
                          sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      MRN
                    </th>
                    <th
                      onClick={() => handleSort('email')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Contact</span>
                        {sortConfig.key === 'email' && (
                          sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort('dateOfBirth')}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      <div className="flex items-center space-x-1">
                        <span>Date of Birth</span>
                        {sortConfig.key === 'dateOfBirth' && (
                          sortConfig.direction === 'asc' ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...patients].sort((a, b) => {
                    const { key, direction } = sortConfig
                    let aVal, bVal

                    if (key === 'firstName') {
                      aVal = `${a.firstName} ${a.lastName}`.toLowerCase()
                      bVal = `${b.firstName} ${b.lastName}`.toLowerCase()
                    } else if (key === 'email') {
                      aVal = a.email?.toLowerCase() || ''
                      bVal = b.email?.toLowerCase() || ''
                    } else if (key === 'dateOfBirth') {
                      aVal = a.dateOfBirth ? new Date(a.dateOfBirth).getTime() : 0
                      bVal = b.dateOfBirth ? new Date(b.dateOfBirth).getTime() : 0
                    }

                    if (aVal < bVal) return direction === 'asc' ? -1 : 1
                    if (aVal > bVal) return direction === 'asc' ? 1 : -1
                    return 0
                  }).map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                          <div className="text-sm font-medium text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.mrn || 'Not assigned'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{patient.email || '-'}</div>
                        {patient.phone && (
                          <div className="text-xs text-gray-500">{patient.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getGenderColor(patient.gender)}`}>
                          {patient.gender || 'Not specified'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedPatientId(patient.id)
                              setIsPatientContextOpen(true)
                            }}
                            className="text-purple-600 hover:text-purple-800"
                            title="View Patient Context"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(patient)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit Patient"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(patient.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete Patient"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Card View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {patients.map((patient) => (
              <div key={patient.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-green-500 p-4">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                        <UserIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {patient.firstName} {patient.lastName}
                        </h3>
                        <p className="text-blue-100 text-sm">
                          MRN: {patient.mrn || 'Not assigned'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <div className="space-y-3">
                    {patient.email && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{patient.email}</span>
                      </div>
                    )}
                    
                    {patient.phone && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <PhoneIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{patient.phone}</span>
                      </div>
                    )}
                    
                    {patient.dateOfBirth && (
                      <div className="flex items-center space-x-3 text-gray-600">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {new Date(patient.dateOfBirth).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {patient.address && (
                      <div className="flex items-start space-x-3 text-gray-600">
                        <MapPinIcon className="h-4 w-4 text-gray-400 mt-0.5" />
                        <span className="text-sm">{formatAddress(patient.address)}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {patient.gender && (
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full border ${getGenderColor(patient.gender)}`}>
                        {patient.gender}
                      </span>
                    )}

                    {patient.observationCount !== undefined && patient.observationCount > 0 && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border border-blue-200 bg-blue-50 text-blue-700">
                        <ChartBarIcon className="h-3 w-3 mr-1" />
                        {patient.observationCount} observations
                      </span>
                    )}

                    {patient.activeAlertCount !== undefined && patient.activeAlertCount > 0 && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border border-red-200 bg-red-50 text-red-700">
                        <BellIcon className="h-3 w-3 mr-1" />
                        {patient.activeAlertCount} active alerts
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-2 mt-6 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => {
                        setSelectedPatientId(patient.id)
                        setIsPatientContextOpen(true)
                      }}
                      className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-lg transition-colors duration-200"
                      title="View Patient Context"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(patient)}
                      className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors duration-200"
                      title="Edit Patient"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(patient.id)}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                      title="Delete Patient"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  disabled={pagination.page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-sm text-gray-700 bg-gray-50 border border-gray-300 rounded-lg">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  disabled={pagination.page === pagination.pages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingPatient(null)
          }}
          title={editingPatient ? 'Edit Patient' : 'Add Patient'}
        >
          <PatientForm
            patient={editingPatient}
            onSubmit={handleSubmit}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </Modal>

        {/* Patient Context Panel */}
        <PatientContextPanel
          isOpen={isPatientContextOpen}
          onClose={() => setIsPatientContextOpen(false)}
          patientId={selectedPatientId}
          clinicianId={null}
          alert={null}
          days={30}
        />
      </div>
    </div>
  )
}

function PatientForm({ patient, onSubmit, isLoading }) {
  // Helper function to format address for editing
  const formatAddressForEdit = (address) => {
    if (!address) return ''
    
    // If address is already a string, return it
    if (typeof address === 'string') return address
    
    // If address is an object, format it properly
    if (typeof address === 'object') {
      const parts = []
      if (address.street) parts.push(address.street)
      if (address.city) parts.push(address.city)
      if (address.state) parts.push(address.state)
      if (address.zipCode) parts.push(address.zipCode)
      return parts.join(', ')
    }
    
    return ''
  }

  const [formData, setFormData] = useState({
    firstName: patient?.firstName || '',
    lastName: patient?.lastName || '',
    email: patient?.email || '',
    phone: patient?.phone || '',
    dateOfBirth: patient?.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '',
    gender: patient?.gender || '',
    address: formatAddressForEdit(patient?.address),
    emergencyContact: patient?.emergencyContact || '',
    insuranceProvider: patient?.insuranceInfo?.provider || '',
    insurancePolicyNumber: patient?.insuranceInfo?.policyNumber || '',
    insuranceGroupNumber: patient?.insuranceInfo?.groupNumber || '',
    insurancePhone: patient?.insuranceInfo?.phone || '',
  })

  const [diagnosisCodes, setDiagnosisCodes] = useState(
    patient?.diagnosisCodes || []
  )

  const [newDiagnosis, setNewDiagnosis] = useState({
    code: '',
    codingSystem: 'ICD-10',
    display: '',
    isPrimary: false
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    // Combine insurance fields into JSON structure
    const insuranceInfo = (formData.insuranceProvider || formData.insurancePolicyNumber) ? {
      provider: formData.insuranceProvider || null,
      policyNumber: formData.insurancePolicyNumber || null,
      groupNumber: formData.insuranceGroupNumber || null,
      phone: formData.insurancePhone || null,
    } : null

    // Prepare data for submission
    const submitData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      address: formData.address,
      emergencyContact: formData.emergencyContact || null,
      insuranceInfo: insuranceInfo,
      diagnosisCodes: diagnosisCodes.length > 0 ? diagnosisCodes : null,
    }

    onSubmit(submitData)
  }

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleAddDiagnosis = () => {
    if (!newDiagnosis.code || !newDiagnosis.display) {
      return
    }

    setDiagnosisCodes([...diagnosisCodes, { ...newDiagnosis }])
    setNewDiagnosis({
      code: '',
      codingSystem: 'ICD-10',
      display: '',
      isPrimary: false
    })
  }

  const handleRemoveDiagnosis = (index) => {
    setDiagnosisCodes(diagnosisCodes.filter((_, i) => i !== index))
  }

  const handleDiagnosisChange = (e) => {
    setNewDiagnosis({ ...newDiagnosis, [e.target.name]: e.target.value })
  }

  const handleDiagnosisCheckbox = (e) => {
    setNewDiagnosis({ ...newDiagnosis, isPrimary: e.target.checked })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
        >
          <option value="">Select Gender</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          placeholder="Enter full address..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Emergency Contact
        </label>
        <input
          type="text"
          name="emergencyContact"
          value={formData.emergencyContact}
          onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
          placeholder="Name, relationship, phone (e.g., Jane Doe, Spouse, 555-0123)"
        />
      </div>

      {/* Insurance Information Section */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Insurance Information</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Provider</label>
            <input
              type="text"
              name="insuranceProvider"
              value={formData.insuranceProvider}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="e.g., Blue Cross Blue Shield"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Policy Number</label>
            <input
              type="text"
              name="insurancePolicyNumber"
              value={formData.insurancePolicyNumber}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Policy/Member ID"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Group Number (optional)</label>
            <input
              type="text"
              name="insuranceGroupNumber"
              value={formData.insuranceGroupNumber}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Group ID"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Insurance Phone (optional)</label>
            <input
              type="tel"
              name="insurancePhone"
              value={formData.insurancePhone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="Customer service phone"
            />
          </div>
        </div>
      </div>

      {/* Diagnosis Codes Section */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Diagnosis Codes</h3>
        <p className="text-sm text-gray-600 mb-4">
          Add ICD-10 or SNOMED diagnosis codes to enable automatic billing package suggestions.
        </p>

        {/* Existing Diagnosis Codes List */}
        {diagnosisCodes.length > 0 && (
          <div className="mb-4 space-y-2">
            {diagnosisCodes.map((dx, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-semibold text-blue-700">
                      {dx.code}
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {dx.codingSystem}
                    </span>
                    {dx.isPrimary && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                        Primary
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mt-1">{dx.display}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDiagnosis(index)}
                  className="ml-4 text-red-600 hover:text-red-800 transition-colors"
                  title="Remove diagnosis"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Diagnosis Form */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diagnosis Code *
              </label>
              <input
                type="text"
                name="code"
                value={newDiagnosis.code}
                onChange={handleDiagnosisChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="e.g., J44.0, E11.9"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Coding System
              </label>
              <select
                name="codingSystem"
                value={newDiagnosis.codingSystem}
                onChange={handleDiagnosisChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="ICD-10">ICD-10</option>
                <option value="SNOMED">SNOMED CT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <input
              type="text"
              name="display"
              value={newDiagnosis.display}
              onChange={handleDiagnosisChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              placeholder="e.g., COPD with acute lower respiratory infection"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isPrimary"
                name="isPrimary"
                checked={newDiagnosis.isPrimary}
                onChange={handleDiagnosisCheckbox}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPrimary" className="ml-2 text-sm text-gray-700">
                Mark as primary diagnosis
              </label>
            </div>
            <button
              type="button"
              onClick={handleAddDiagnosis}
              disabled={!newDiagnosis.code || !newDiagnosis.display}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Diagnosis
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Saving...</span>
            </div>
          ) : (
            patient ? 'Update Patient' : 'Create Patient'
          )}
        </button>
      </div>
    </form>
  )
}