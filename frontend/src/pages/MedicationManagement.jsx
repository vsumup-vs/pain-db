import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import Modal from '../components/Modal'

export default function MedicationManagement() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedMedication, setSelectedMedication] = useState(null)
  const queryClient = useQueryClient()

  // Fetch patients with medications
  const { data: patients, isLoading } = useQuery({
    queryKey: ['patients-with-medications'],
    queryFn: async () => {
      const response = await api.get('/patients?include=medications')
      return response.data
    }
  })

  // Fetch drugs for prescription
  const { data: drugs } = useQuery({
    queryKey: ['drugs'],
    queryFn: async () => {
      const response = await api.get('/drugs')
      return response.data
    }
  })

  const addMedicationMutation = useMutation({
    mutationFn: async (medicationData) => {
      const response = await api.post('/patient-medications', medicationData)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['patients-with-medications'])
      toast.success('Medication added successfully')
      setShowAddModal(false)
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to add medication')
    }
  })

  const recordAdherenceMutation = useMutation({
    mutationFn: async ({ patientMedicationId, adherenceData }) => {
      const response = await api.post('/medication-observations', {
        patientMedicationId,
        metricKey: 'medication_adherence',
        value: adherenceData.status,
        context: adherenceData
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['patients-with-medications'])
      toast.success('Adherence recorded successfully')
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Medication Management</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage patient medications, track adherence, and monitor effectiveness.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Add Medication
          </button>
        </div>
      </div>

      {/* Patient Medication Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {patients?.data?.map((patient) => (
          <PatientMedicationCard 
            key={patient.id} 
            patient={patient}
            onRecordAdherence={(medicationId, adherenceData) => 
              recordAdherenceMutation.mutate({ patientMedicationId: medicationId, adherenceData })
            }
          />
        ))}
      </div>

      {/* Add Medication Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Medication"
      >
        <AddMedicationForm
          patients={patients?.data || []}
          drugs={drugs?.data || []}
          onSubmit={(data) => addMedicationMutation.mutate(data)}
          isLoading={addMedicationMutation.isLoading}
        />
      </Modal>
    </div>
  )
}

function PatientMedicationCard({ patient, onRecordAdherence }) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {patient.firstName} {patient.lastName}
          </h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            {patient.patientMedications?.filter(m => m.isActive).length || 0} Active
          </span>
        </div>

        <div className="space-y-3">
          {patient.patientMedications?.filter(m => m.isActive).map((medication) => (
            <MedicationItem 
              key={medication.id} 
              medication={medication}
              onRecordAdherence={onRecordAdherence}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MedicationItem({ medication, onRecordAdherence }) {
  const [showAdherenceModal, setShowAdherenceModal] = useState(false)

  const adherenceRate = medication.adherenceRecords?.length > 0 
    ? (medication.adherenceRecords.filter(r => r.wasTaken).length / medication.adherenceRecords.length) * 100
    : 0

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium text-gray-900">
            {medication.drug.name} {medication.dosage}
          </h4>
          <p className="text-sm text-gray-500">
            {medication.frequency} • {medication.route}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              {Math.round(adherenceRate)}% adherence
            </div>
            <div className="text-xs text-gray-500">Last 7 days</div>
          </div>
          <button
            onClick={() => setShowAdherenceModal(true)}
            className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
          >
            <ClockIcon className="h-4 w-4 mr-1" />
            Record
          </button>
        </div>
      </div>

      {/* Adherence Modal */}
      <Modal
        isOpen={showAdherenceModal}
        onClose={() => setShowAdherenceModal(false)}
        title="Record Medication Adherence"
      >
        <AdherenceForm
          medication={medication}
          onSubmit={(data) => {
            onRecordAdherence(medication.id, data)
            setShowAdherenceModal(false)
          }}
        />
      </Modal>
    </div>
  )
}

function AddMedicationForm({ patients, drugs, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    patientId: '',
    drugId: '',
    dosage: '',
    frequency: '',
    route: 'oral',
    instructions: '',
    startDate: new Date().toISOString().split('T')[0],
    isPRN: false
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Patient</label>
        <select
          value={formData.patientId}
          onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        >
          <option value="">Select a patient</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.firstName} {patient.lastName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Medication</label>
        <select
          value={formData.drugId}
          onChange={(e) => setFormData({ ...formData, drugId: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          required
        >
          <option value="">Select a medication</option>
          {drugs.map((drug) => (
            <option key={drug.id} value={drug.id}>
              {drug.name} {drug.strength} ({drug.dosageForm})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Dosage</label>
          <input
            type="text"
            value={formData.dosage}
            onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            placeholder="e.g., 200mg"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Frequency</label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            required
          >
            <option value="">Select frequency</option>
            <option value="once daily">Once daily</option>
            <option value="twice daily">Twice daily</option>
            <option value="three times daily">Three times daily</option>
            <option value="four times daily">Four times daily</option>
            <option value="every 4 hours">Every 4 hours</option>
            <option value="every 6 hours">Every 6 hours</option>
            <option value="every 8 hours">Every 8 hours</option>
            <option value="as needed">As needed</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Route</label>
        <select
          value={formData.route}
          onChange={(e) => setFormData({ ...formData, route: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="oral">Oral</option>
          <option value="topical">Topical</option>
          <option value="injection">Injection</option>
          <option value="inhalation">Inhalation</option>
          <option value="sublingual">Sublingual</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Instructions</label>
        <textarea
          value={formData.instructions}
          onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Special instructions for taking this medication..."
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={formData.isPRN}
          onChange={(e) => setFormData({ ...formData, isPRN: e.target.checked })}
          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          PRN (As needed)
        </label>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Adding...' : 'Add Medication'}
        </button>
      </div>
    </form>
  )
}

function AdherenceForm({ medication, onSubmit }) {
  const [adherenceData, setAdherenceData] = useState({
    status: 'Taken as prescribed',
    takenAt: new Date().toISOString().slice(0, 16),
    notes: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(adherenceData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-gray-50 p-3 rounded-md">
        <h4 className="font-medium text-gray-900">
          {medication.drug.name} {medication.dosage}
        </h4>
        <p className="text-sm text-gray-600">{medication.frequency}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <select
          value={adherenceData.status}
          onChange={(e) => setAdherenceData({ ...adherenceData, status: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        >
          <option value="Taken as prescribed">Taken as prescribed</option>
          <option value="Missed dose">Missed dose</option>
          <option value="Partial dose">Partial dose</option>
          <option value="Wrong time">Wrong time</option>
          <option value="Skipped intentionally">Skipped intentionally</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Time Taken</label>
        <input
          type="datetime-local"
          value={adherenceData.takenAt}
          onChange={(e) => setAdherenceData({ ...adherenceData, takenAt: e.target.value })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notes</label>
        <textarea
          value={adherenceData.notes}
          onChange={(e) => setAdherenceData({ ...adherenceData, notes: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          placeholder="Any additional notes about taking this medication..."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Record Adherence
        </button>
      </div>
    </form>
  )
}