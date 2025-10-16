import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api'
import PatientContextPanel from '../components/PatientContextPanel'
import { UserIcon } from '@heroicons/react/24/outline'

export default function TestPatientContext() {
  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [isPanelOpen, setIsPanelOpen] = useState(false)

  // Fetch patients for testing
  const { data: patientsData, isLoading } = useQuery({
    queryKey: ['patients'],
    queryFn: () => api.getPatients({ limit: 10 })
  })

  const patients = patientsData?.data || []

  const handleViewContext = (patientId) => {
    setSelectedPatientId(patientId)
    setIsPanelOpen(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Patient Context Panel Test
          </h1>
          <p className="text-gray-600">
            Click on any patient to view their comprehensive context panel
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">Test Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>Select a patient from the list below to open the Patient Context Panel</li>
            <li>The panel should slide in from the right side of the screen</li>
            <li>Verify that patient demographics, vitals, medications, conditions, and alerts are displayed</li>
            <li>Check that contact info (phone/email) is clickable</li>
            <li>Verify the panel refreshes data every 60 seconds (watch for query refetch in React Query DevTools)</li>
            <li>Close the panel by clicking the X button or clicking outside the panel</li>
          </ol>
        </div>

        {/* Patient List */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Available Patients</h3>
          </div>

          {isLoading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          ) : patients.length === 0 ? (
            <div className="p-12 text-center">
              <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No patients found. Please create some patients first.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                  onClick={() => handleViewContext(patient.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                          <UserIcon className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {patient.email}
                          {patient.medicalRecordNumber && ` • MRN: ${patient.medicalRecordNumber}`}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleViewContext(patient.id)
                      }}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
                    >
                      View Context
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Status */}
        <div className="mt-8 bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Backend Endpoint:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">GET /api/patients/:id/context</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Component:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">PatientContextPanel.jsx</code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Selected Patient:</span>
              <span className={`text-xs font-medium ${selectedPatientId ? 'text-green-600' : 'text-gray-400'}`}>
                {selectedPatientId || 'None'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Panel State:</span>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                isPanelOpen ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {isPanelOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Context Panel */}
      <PatientContextPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        patientId={selectedPatientId}
        days={30}
      />
    </div>
  )
}
