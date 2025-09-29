import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  PlusIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  InformationCircleIcon,
  BellIcon 
} from '@heroicons/react/24/outline'
import { api } from '../services/api'

export default function EnhancedEnrollmentForm({ 
  patients, 
  clinicians, 
  conditionPresets, 
  onSubmit, 
  isLoading 
}) {
  const [formData, setFormData] = useState({
    patientId: '',
    clinicianId: '',
    presetId: '',
    diagnosisCode: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
    medications: [],
    reminderSettings: {
      dailyAssessment: false,
      reminderTime: '09:00',
      methods: []
    }
  })

  const [selectedPreset, setSelectedPreset] = useState(null)
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

  // Update selected preset when presetId changes
  useEffect(() => {
    if (formData.presetId) {
      const preset = conditionPresets.find(p => p.id === formData.presetId)
      setSelectedPreset(preset)
    } else {
      setSelectedPreset(null)
    }
  }, [formData.presetId, conditionPresets])

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

  // Add method change handler for reminder settings
  const handleMethodChange = (method, checked) => {
    setFormData(prev => ({
      ...prev,
      reminderSettings: {
        ...prev.reminderSettings,
        methods: checked 
          ? [...prev.reminderSettings.methods, method]
          : prev.reminderSettings.methods.filter(m => m !== method)
      }
    }))
  }

  const setReminderSettings = (newSettings) => {
    setFormData(prev => ({
      ...prev,
      reminderSettings: newSettings
    }))
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
            {selectedPreset && (
              <div className="mt-2 p-3 bg-blue-50 rounded-md">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5 mr-2" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">{selectedPreset.name}</p>
                    <p className="mt-1">{selectedPreset.description}</p>
                    {selectedPreset.diagnosisCodes && (
                      <p className="mt-1">
                        <span className="font-medium">Diagnosis codes:</span> {selectedPreset.diagnosisCodes.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
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

      {/* Reminder Settings Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center mb-4">
          <BellIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Daily Assessment Reminders</h3>
        </div>
        
        <div className="flex items-center mb-4">
          <input
            type="checkbox"
            id="enableReminders"
            checked={formData.reminderSettings.dailyAssessment}
            onChange={(e) => setReminderSettings({
              ...formData.reminderSettings,
              dailyAssessment: e.target.checked
            })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="enableReminders" className="ml-2 text-sm font-medium text-gray-700">
            Enable daily pain assessment reminders
          </label>
        </div>

        {formData.reminderSettings.dailyAssessment && (
          <div className="space-y-4 pl-6 border-l-2 border-blue-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Time
              </label>
              <input
                type="time"
                value={formData.reminderSettings.reminderTime}
                onChange={(e) => setReminderSettings({
                  ...formData.reminderSettings,
                  reminderTime: e.target.value
                })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">
                Time when daily reminders will be sent to the patient
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notification Methods
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.reminderSettings.methods.includes('email')}
                    onChange={(e) => handleMethodChange('email', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Email notifications</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.reminderSettings.methods.includes('sms')}
                    onChange={(e) => handleMethodChange('sms', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">SMS notifications</span>
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Choose how the patient will receive reminder notifications
              </p>
            </div>
          </div>
        )}

        {!formData.reminderSettings.dailyAssessment && (
          <div className="text-center py-4 text-gray-500">
            <p className="text-sm">Enable reminders to help patients stay on track with their daily assessments.</p>
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