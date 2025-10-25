import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'

export default function EnhancedEnrollmentForm({
  patients,
  clinicians,
  carePrograms,  // Changed from conditionPresets
  conditionPresets,  // Optional condition presets
  onSubmit,
  isLoading
}) {
  const [formData, setFormData] = useState({
    patientId: '',
    clinicianId: '',
    careProgramId: '',  // Changed from presetId
    conditionPresetId: '',  // Optional condition preset
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
    medications: []
  })

  const [selectedPreset, setSelectedPreset] = useState(null)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [medicationSearch, setMedicationSearch] = useState('')
  const [showMedicationForm, setShowMedicationForm] = useState(false)

  // Fetch drugs for medication selection
  const { data: drugsResponse } = useQuery({
    queryKey: ['drugs', medicationSearch],
    queryFn: () => api.getDrugs({ 
      search: medicationSearch,
      limit: 20 
    }),
    enabled: showMedicationForm
  })

  const drugs = drugsResponse?.data || []

  // Update selected program when care program changes
  useEffect(() => {
    if (formData.careProgramId && carePrograms) {
      const program = carePrograms.find(p => p.id === formData.careProgramId)
      setSelectedProgram(program)
    } else {
      setSelectedProgram(null)
    }
  }, [formData.careProgramId, carePrograms])

  // Auto-populate default preset when program is selected
  useEffect(() => {
    if (selectedProgram?.settings?.presetConfiguration?.defaultPresetId) {
      const defaultPresetId = selectedProgram.settings.presetConfiguration.defaultPresetId
      setFormData(prev => ({
        ...prev,
        conditionPresetId: defaultPresetId
      }))
    }
  }, [selectedProgram])

  // Update selected preset when conditionPresetId changes
  useEffect(() => {
    if (formData.conditionPresetId && conditionPresets) {
      const preset = conditionPresets.find(p => p.id === formData.conditionPresetId)
      setSelectedPreset(preset)
    } else {
      setSelectedPreset(null)
    }
  }, [formData.conditionPresetId, conditionPresets])

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

  const addMedication = () => {
    setFormData(prev => ({
      ...prev,
      medications: [...prev.medications, {
        id: Date.now(), // temporary ID
        drugId: '',
        dosage: '',
        frequency: '',
        route: 'oral',
        instructions: '',
        startDate: prev.startDate,
        isPRN: false
      }]
    }))
    setShowMedicationForm(true)
  }

  const updateMedication = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }))
  }

  const removeMedication = (index) => {
    setFormData(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }))
  }

  const getDrugName = (drugId) => {
    const drug = drugs.find(d => d.id === drugId)
    return drug ? `${drug.name} ${drug.strength}` : 'Select medication'
  }

  // Filter available presets based on program configuration
  const getAvailablePresets = () => {
    if (!conditionPresets) return []

    // No program selected or no preset configuration - show all presets
    if (!selectedProgram?.settings?.presetConfiguration) {
      return conditionPresets
    }

    const config = selectedProgram.settings.presetConfiguration

    // If recommended presets are specified, filter to only those (plus default)
    if (config.recommendedPresetIds && config.recommendedPresetIds.length > 0) {
      return conditionPresets.filter(p =>
        p.id === config.defaultPresetId ||
        config.recommendedPresetIds.includes(p.id)
      )
    }

    // No filtering - show all presets
    return conditionPresets
  }

  // Check if preset dropdown should be disabled
  const isPresetLocked = () => {
    if (!selectedProgram?.settings?.presetConfiguration) return false
    const config = selectedProgram.settings.presetConfiguration
    return config.defaultPresetId && config.allowOverride === false
  }

  // Check if preset field is required
  const isPresetRequired = () => {
    // If there's a default preset configured, it's auto-populated so not required from user
    if (selectedProgram?.settings?.presetConfiguration?.defaultPresetId) {
      return false
    }
    // Otherwise, require preset selection
    return true
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Enrollment Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Enrollment Details</h3>
        
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
              name="careProgramId"
              value={formData.careProgramId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a care program</option>
              {carePrograms && carePrograms.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} ({program.type})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition Preset {isPresetRequired() && '*'}
              {isPresetLocked() && (
                <span className="ml-2 text-xs text-gray-500 italic">
                  (Pre-configured by program)
                </span>
              )}
            </label>
            <select
              name="conditionPresetId"
              value={formData.conditionPresetId}
              onChange={handleChange}
              required={isPresetRequired()}
              disabled={isPresetLocked()}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isPresetLocked() ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            >
              <option value="">Select a condition preset</option>
              {getAvailablePresets().map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            {isPresetLocked() && (
              <p className="mt-1 text-xs text-gray-500">
                This care program requires a specific condition preset. Contact your administrator if you need to change it.
              </p>
            )}
            {selectedPreset && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">{selectedPreset.name}</p>
                    <p className="mt-1">{selectedPreset.description}</p>
                  </div>
                </div>
              </div>
            )}
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

        <div className="mt-6">
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
      </div>

      {/* Medications Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Initial Medications</h3>
          <button
            type="button"
            onClick={addMedication}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Medication
          </button>
        </div>

        {formData.medications.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>No medications added yet.</p>
            <p className="text-sm">Click "Add Medication" to prescribe initial medications for this enrollment.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {formData.medications.map((medication, index) => (
              <div key={medication.id} className="bg-white p-4 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-900">Medication {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeMedication(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2 lg:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medication *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search medications..."
                        value={medicationSearch}
                        onChange={(e) => setMedicationSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <MagnifyingGlassIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                    </div>
                    {medicationSearch && drugs.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {drugs.map((drug) => (
                          <button
                            key={drug.id}
                            type="button"
                            onClick={() => {
                              updateMedication(index, 'drugId', drug.id)
                              setMedicationSearch('')
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                          >
                            <div className="font-medium">{drug.name} {drug.strength}</div>
                            <div className="text-sm text-gray-500">{drug.dosageForm} • {drug.drugClass}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 text-sm text-gray-600">
                      Selected: {getDrugName(medication.drugId)}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dosage *
                    </label>
                    <input
                      type="text"
                      value={medication.dosage}
                      onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                      placeholder="e.g., 10mg"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency *
                    </label>
                    <select
                      value={medication.frequency}
                      onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select frequency</option>
                      <option value="Once daily">Once daily</option>
                      <option value="Twice daily">Twice daily</option>
                      <option value="Three times daily">Three times daily</option>
                      <option value="Four times daily">Four times daily</option>
                      <option value="Every 4 hours">Every 4 hours</option>
                      <option value="Every 6 hours">Every 6 hours</option>
                      <option value="Every 8 hours">Every 8 hours</option>
                      <option value="Every 12 hours">Every 12 hours</option>
                      <option value="As needed">As needed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Route *
                    </label>
                    <select
                      value={medication.route}
                      onChange={(e) => updateMedication(index, 'route', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="oral">Oral</option>
                      <option value="topical">Topical</option>
                      <option value="injection">Injection</option>
                      <option value="inhalation">Inhalation</option>
                      <option value="sublingual">Sublingual</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Instructions
                    </label>
                    <textarea
                      value={medication.instructions}
                      onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                      rows={2}
                      placeholder="Special instructions for taking this medication..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={medication.isPRN}
                      onChange={(e) => updateMedication(index, 'isPRN', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      PRN (As needed)
                    </label>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Button */}
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