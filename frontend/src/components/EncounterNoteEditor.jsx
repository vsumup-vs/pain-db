import { useState, useEffect } from 'react'
import { Dialog, Combobox } from '@headlessui/react'
import { XMarkIcon, CheckCircleIcon, ExclamationTriangleIcon, ChevronUpDownIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import api from '../services/api'

const ENCOUNTER_TYPES = [
  { value: 'RPM', label: 'Remote Patient Monitoring (RPM)' },
  { value: 'RTM', label: 'Remote Therapeutic Monitoring (RTM)' },
  { value: 'CCM', label: 'Chronic Care Management (CCM)' },
  { value: 'TCM', label: 'Transitional Care Management (TCM)' },
  { value: 'GENERAL', label: 'General Encounter' }
]

export default function EncounterNoteEditor({
  isOpen,
  onClose,
  patientId: initialPatientId,
  clinicianId: initialClinicianId,
  alertId = null,
  existingNote = null
}) {
  const queryClient = useQueryClient()
  const isEditMode = !!existingNote
  const isLocked = existingNote?.isLocked || false

  // Form state
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [selectedClinician, setSelectedClinician] = useState(null)
  const [patientQuery, setPatientQuery] = useState('')
  const [clinicianQuery, setClinicianQuery] = useState('')
  const [encounterType, setEncounterType] = useState(existingNote?.encounterType || 'GENERAL')
  const [subjective, setSubjective] = useState(existingNote?.subjective || '')
  const [objective, setObjective] = useState(existingNote?.objective || '')
  const [assessment, setAssessment] = useState(existingNote?.assessment || '')
  const [plan, setPlan] = useState(existingNote?.plan || '')
  const [additionalNotes, setAdditionalNotes] = useState(existingNote?.additionalNotes || '')

  // Fetch patients
  const { data: patientsData } = useQuery({
    queryKey: ['patients', { limit: 100 }],
    queryFn: () => api.getPatients({ limit: 100 }),
    enabled: isOpen && !isEditMode
  })

  // Fetch clinicians
  const { data: cliniciansData } = useQuery({
    queryKey: ['clinicians', { limit: 100 }],
    queryFn: () => api.getClinicians({ limit: 100 }),
    enabled: isOpen && !isEditMode
  })

  const patients = patientsData?.data || []
  const clinicians = cliniciansData?.data || []

  // Filter patients and clinicians based on search query
  const filteredPatients = patientQuery === ''
    ? patients
    : patients.filter((patient) => {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
        const mrn = patient.medicalRecordNumber?.toLowerCase() || ''
        const query = patientQuery.toLowerCase()
        return fullName.includes(query) || mrn.includes(query)
      })

  const filteredClinicians = clinicianQuery === ''
    ? clinicians
    : clinicians.filter((clinician) => {
        const fullName = `${clinician.firstName} ${clinician.lastName}`.toLowerCase()
        const query = clinicianQuery.toLowerCase()
        return fullName.includes(query)
      })

  // Initialize selected patient and clinician from props or existing note
  useEffect(() => {
    if (existingNote) {
      setSelectedPatient(existingNote.patient)
      setSelectedClinician(existingNote.clinician)
    } else if (initialPatientId && patients.length > 0) {
      const patient = patients.find(p => p.id === initialPatientId)
      if (patient) setSelectedPatient(patient)
    }
  }, [existingNote, initialPatientId, patients])

  useEffect(() => {
    if (existingNote) {
      return // Already set above
    } else if (initialClinicianId && clinicians.length > 0) {
      const clinician = clinicians.find(c => c.id === initialClinicianId)
      if (clinician) setSelectedClinician(clinician)
    }
  }, [existingNote, initialClinicianId, clinicians])

  // Auto-populated context (read-only)
  const vitalsSnapshot = existingNote?.vitalsSnapshot || []
  const assessmentSummary = existingNote?.assessmentSummary || ''
  const alertsSummary = existingNote?.alertsSummary || ''

  // Validation state
  const [validationErrors, setValidationErrors] = useState([])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => api.createEncounterNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['encounterNotes'])
      queryClient.invalidateQueries(['encounterNote', existingNote?.id])
      onClose()
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateEncounterNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['encounterNotes'])
      queryClient.invalidateQueries(['encounterNote', existingNote?.id])
      onClose()
    }
  })

  // Attest mutation
  const attestMutation = useMutation({
    mutationFn: (id) => api.attestEncounterNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['encounterNotes'])
      queryClient.invalidateQueries(['encounterNote', existingNote?.id])
      onClose()
    }
  })

  const validateSOAPFields = () => {
    const errors = []
    if (!subjective?.trim()) errors.push('Subjective field is required')
    if (!objective?.trim()) errors.push('Objective field is required')
    if (!assessment?.trim()) errors.push('Assessment field is required')
    if (!plan?.trim()) errors.push('Plan field is required')
    return errors
  }

  const handleSaveDraft = async () => {
    if (isLocked) return

    if (!selectedPatient || !selectedClinician) {
      setValidationErrors(['Please select both a patient and a clinician'])
      return
    }

    const data = {
      patientId: selectedPatient.id,
      clinicianId: selectedClinician.id,
      encounterType,
      subjective,
      objective,
      assessment,
      plan,
      additionalNotes,
      alertId
    }

    if (isEditMode) {
      updateMutation.mutate({ id: existingNote.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleAttest = async () => {
    const errors = validateSOAPFields()

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    // Save first if not saved yet
    if (!isEditMode) {
      await handleSaveDraft()
    }

    // Then attest
    if (existingNote?.id) {
      attestMutation.mutate(existingNote.id)
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending || attestMutation.isPending
  const error = createMutation.error || updateMutation.error || attestMutation.error

  return (
    <Dialog open={isOpen} onClose={isLocked ? onClose : () => onClose()} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
        <Dialog.Panel className="mx-auto max-w-4xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl
                                 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700
                          sticky top-0 bg-white dark:bg-gray-800 z-10">
            <div>
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
                {isEditMode ? 'Edit Encounter Note' : 'New Encounter Note'}
              </Dialog.Title>
              {isLocked && (
                <div className="flex items-center mt-1 text-sm text-green-600 dark:text-green-400">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Attested and Locked
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="m-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error.response?.data?.error || error.message || 'An error occurred'}
                </p>
              </div>
            </div>
          )}

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="m-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Cannot attest incomplete note:
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300">
                    {validationErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Patient Selection */}
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Patient <span className="text-red-500">*</span>
                </label>
                <Combobox value={selectedPatient} onChange={setSelectedPatient} disabled={isLocked}>
                  <div className="relative">
                    <Combobox.Input
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      displayValue={(patient) => patient ? `${patient.firstName} ${patient.lastName}` : ''}
                      onChange={(event) => setPatientQuery(event.target.value)}
                      placeholder="Search patients..."
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </Combobox.Button>
                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700
                                                 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      {filteredPatients.length === 0 && patientQuery !== '' ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                          No patients found
                        </div>
                      ) : (
                        filteredPatients.map((patient) => (
                          <Combobox.Option
                            key={patient.id}
                            value={patient}
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                                active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-100'
                              }`
                            }
                          >
                            {({ selected, active }) => (
                              <>
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                  {patient.firstName} {patient.lastName}
                                  {patient.medicalRecordNumber && (
                                    <span className="text-sm ml-2">
                                      (MRN: {patient.medicalRecordNumber})
                                    </span>
                                  )}
                                </span>
                                {selected ? (
                                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                    active ? 'text-white' : 'text-blue-600'
                                  }`}>
                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                ) : null}
                              </>
                            )}
                          </Combobox.Option>
                        ))
                      )}
                    </Combobox.Options>
                  </div>
                </Combobox>
              </div>
            )}

            {/* Clinician Selection */}
            {!isEditMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Clinician <span className="text-red-500">*</span>
                </label>
                <Combobox value={selectedClinician} onChange={setSelectedClinician} disabled={isLocked}>
                  <div className="relative">
                    <Combobox.Input
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               focus:ring-2 focus:ring-blue-500 focus:border-transparent
                               disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                      displayValue={(clinician) => clinician ? `${clinician.firstName} ${clinician.lastName}` : ''}
                      onChange={(event) => setClinicianQuery(event.target.value)}
                      placeholder="Search clinicians..."
                    />
                    <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </Combobox.Button>
                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700
                                                 py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                      {filteredClinicians.length === 0 && clinicianQuery !== '' ? (
                        <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-300">
                          No clinicians found
                        </div>
                      ) : (
                        filteredClinicians.map((clinician) => (
                          <Combobox.Option
                            key={clinician.id}
                            value={clinician}
                            className={({ active }) =>
                              `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                                active ? 'bg-blue-600 text-white' : 'text-gray-900 dark:text-gray-100'
                              }`
                            }
                          >
                            {({ selected, active }) => (
                              <>
                                <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                                  {clinician.firstName} {clinician.lastName}
                                  {clinician.specialization && (
                                    <span className="text-sm ml-2">
                                      ({clinician.specialization})
                                    </span>
                                  )}
                                </span>
                                {selected ? (
                                  <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                    active ? 'text-white' : 'text-blue-600'
                                  }`}>
                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                  </span>
                                ) : null}
                              </>
                            )}
                          </Combobox.Option>
                        ))
                      )}
                    </Combobox.Options>
                  </div>
                </Combobox>
              </div>
            )}

            {/* Display selected patient and clinician in edit mode */}
            {isEditMode && selectedPatient && (
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md p-3">
                <div className="text-sm">
                  <p className="text-gray-700 dark:text-gray-300">
                    <span className="font-medium">Patient:</span> {selectedPatient.firstName} {selectedPatient.lastName}
                    {selectedPatient.medicalRecordNumber && ` (MRN: ${selectedPatient.medicalRecordNumber})`}
                  </p>
                  {selectedClinician && (
                    <p className="text-gray-700 dark:text-gray-300 mt-1">
                      <span className="font-medium">Clinician:</span> {selectedClinician.firstName} {selectedClinician.lastName}
                      {selectedClinician.specialization && ` (${selectedClinician.specialization})`}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Encounter Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Encounter Type
              </label>
              <select
                value={encounterType}
                onChange={(e) => setEncounterType(e.target.value)}
                disabled={isLocked}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed">
                {ENCOUNTER_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* Auto-Populated Context (Read-Only) */}
            {(vitalsSnapshot?.length > 0 || assessmentSummary || alertsSummary) && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  Clinical Context (Auto-Populated)
                </h3>

                {/* Vitals Snapshot */}
                {vitalsSnapshot?.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Recent Vitals:</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {vitalsSnapshot.map((vital, idx) => (
                        <div key={idx} className="text-xs text-blue-700 dark:text-blue-300 bg-white dark:bg-gray-800 p-2 rounded">
                          <span className="font-medium">{vital.metric}:</span> {vital.value} {vital.unit}
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">
                            {new Date(vital.recordedAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assessment Summary */}
                {assessmentSummary && (
                  <div className="mb-3">
                    <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Recent Assessments:</h4>
                    <pre className="text-xs text-blue-700 dark:text-blue-300 whitespace-pre-wrap bg-white dark:bg-gray-800 p-2 rounded">
                      {assessmentSummary}
                    </pre>
                  </div>
                )}

                {/* Alerts Summary */}
                {alertsSummary && (
                  <div>
                    <h4 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Active Alerts:</h4>
                    <pre className="text-xs text-blue-700 dark:text-blue-300 whitespace-pre-wrap bg-white dark:bg-gray-800 p-2 rounded">
                      {alertsSummary}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* SOAP Format Fields */}
            <div className="space-y-4">
              {/* Subjective */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subjective <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Patient's reported symptoms/concerns)</span>
                </label>
                <textarea
                  value={subjective}
                  onChange={(e) => setSubjective(e.target.value)}
                  disabled={isLocked}
                  rows={4}
                  placeholder="Patient reports..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Objective */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Objective <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Clinician's observations and vital signs)</span>
                </label>
                <textarea
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                  disabled={isLocked}
                  rows={4}
                  placeholder="Vital signs: BP 120/80, HR 72..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Assessment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assessment <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Clinical assessment and diagnosis)</span>
                </label>
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  disabled={isLocked}
                  rows={4}
                  placeholder="Assessment findings..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Plan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Plan <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">(Treatment plan and next steps)</span>
                </label>
                <textarea
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  disabled={isLocked}
                  rows={4}
                  placeholder="Continue current medications, follow up in 2 weeks..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes
                  <span className="text-xs text-gray-500 ml-2">(Optional free-form notes)</span>
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  disabled={isLocked}
                  rows={3}
                  placeholder="Additional clinical notes..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed
                           placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Attestation Info */}
            {isLocked && existingNote?.attestedBy && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md p-4">
                <h4 className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  Attestation Details
                </h4>
                <div className="text-xs text-green-800 dark:text-green-200 space-y-1">
                  <p>
                    <span className="font-medium">Attested By:</span> {existingNote.attestedBy.firstName} {existingNote.attestedBy.lastName}
                  </p>
                  <p>
                    <span className="font-medium">Attested At:</span> {new Date(existingNote.attestedAt).toLocaleString()}
                  </p>
                  <p className="text-green-700 dark:text-green-300 mt-2">
                    This note is locked and cannot be edited or deleted.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700
                          sticky bottom-0 bg-white dark:bg-gray-800">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors">
              {isLocked ? 'Close' : 'Cancel'}
            </button>

            {!isLocked && (
              <>
                <button
                  onClick={handleSaveDraft}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700
                           rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? 'Saving...' : 'Save Draft'}
                </button>

                <button
                  onClick={handleAttest}
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700
                           rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4" />
                  {isLoading ? 'Attesting...' : 'Attest & Lock'}
                </button>
              </>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
