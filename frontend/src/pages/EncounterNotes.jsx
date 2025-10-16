import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  DocumentTextIcon,
  PlusIcon,
  CheckCircleIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import api from '../services/api'
import EncounterNoteEditor from '../components/EncounterNoteEditor'

const ENCOUNTER_TYPE_LABELS = {
  RPM: 'Remote Patient Monitoring',
  RTM: 'Remote Therapeutic Monitoring',
  CCM: 'Chronic Care Management',
  TCM: 'Transitional Care Management',
  GENERAL: 'General Encounter'
}

export default function EncounterNotes() {
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState(null)
  const [filters, setFilters] = useState({
    patientId: '',
    clinicianId: '',
    encounterType: '',
    isLocked: '',
    page: 1,
    limit: 20
  })

  // Fetch encounter notes
  const { data, isLoading, error } = useQuery({
    queryKey: ['encounterNotes', filters],
    queryFn: () => api.getEncounterNotes(filters)
  })

  const notes = data?.data || []
  const pagination = data?.pagination || {}

  const handleCreateNew = () => {
    setSelectedNote(null)
    setIsEditorOpen(true)
  }

  const handleEdit = (note) => {
    setSelectedNote(note)
    setIsEditorOpen(true)
  }

  const handleView = (note) => {
    setSelectedNote(note)
    setIsEditorOpen(true)
  }

  const handleCloseEditor = () => {
    setIsEditorOpen(false)
    setSelectedNote(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <DocumentTextIcon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
              Encounter Notes
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Document clinical encounters with SOAP format
            </p>
          </div>

          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700
                     text-white rounded-lg transition-colors text-sm font-medium">
            <PlusIcon className="h-4 w-4" />
            New Encounter Note
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Patient ID
              </label>
              <input
                type="text"
                value={filters.patientId}
                onChange={(e) => setFilters({ ...filters, patientId: e.target.value, page: 1 })}
                placeholder="Filter by patient..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600
                         rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Clinician ID
              </label>
              <input
                type="text"
                value={filters.clinicianId}
                onChange={(e) => setFilters({ ...filters, clinicianId: e.target.value, page: 1 })}
                placeholder="Filter by clinician..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600
                         rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Encounter Type
              </label>
              <select
                value={filters.encounterType}
                onChange={(e) => setFilters({ ...filters, encounterType: e.target.value, page: 1 })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600
                         rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">All Types</option>
                <option value="RPM">RPM</option>
                <option value="RTM">RTM</option>
                <option value="CCM">CCM</option>
                <option value="TCM">TCM</option>
                <option value="GENERAL">General</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={filters.isLocked}
                onChange={(e) => setFilters({ ...filters, isLocked: e.target.value, page: 1 })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600
                         rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option value="">All Notes</option>
                <option value="true">Attested</option>
                <option value="false">Draft</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">Loading encounter notes...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-200">
              Error loading encounter notes: {error.message}
            </p>
          </div>
        )}

        {/* Notes List */}
        {!isLoading && !error && (
          <>
            {notes.length === 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No encounter notes found</p>
                <button
                  onClick={handleCreateNew}
                  className="mt-4 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium">
                  Create your first encounter note
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow">
                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              note.encounterType === 'RPM' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                              note.encounterType === 'RTM' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                              note.encounterType === 'CCM' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              note.encounterType === 'TCM' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                            }`}>
                              {ENCOUNTER_TYPE_LABELS[note.encounterType]}
                            </span>

                            {note.isLocked && (
                              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                                Attested
                              </span>
                            )}

                            {!note.isLocked && (
                              <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                Draft
                              </span>
                            )}
                          </div>

                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {note.patient.firstName} {note.patient.lastName}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            DOB: {new Date(note.patient.dateOfBirth).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleView(note)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20
                                     rounded-md transition-colors"
                            title="View Note">
                            <EyeIcon className="h-5 w-5" />
                          </button>

                          {!note.isLocked && (
                            <button
                              onClick={() => handleEdit(note)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700
                                       rounded-md transition-colors"
                              title="Edit Note">
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Clinician */}
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Clinician:</span> {note.clinician.firstName} {note.clinician.lastName}
                          {note.clinician.specialization && ` - ${note.clinician.specialization}`}
                        </p>
                      </div>

                      {/* SOAP Preview */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Subjective</p>
                          <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                            {note.subjective || <span className="italic">Not documented</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Objective</p>
                          <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                            {note.objective || <span className="italic">Not documented</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Assessment</p>
                          <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                            {note.assessment || <span className="italic">Not documented</span>}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</p>
                          <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                            {note.plan || <span className="italic">Not documented</span>}
                          </p>
                        </div>
                      </div>

                      {/* Alert Link */}
                      {note.alert && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Related Alert:</span> {note.alert.message}
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              note.alert.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              note.alert.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                              note.alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {note.alert.severity}
                            </span>
                          </p>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div>
                          Created: {new Date(note.createdAt).toLocaleString()}
                        </div>
                        {note.isLocked && note.attestedBy && (
                          <div>
                            Attested by {note.attestedBy.firstName} {note.attestedBy.lastName} on {new Date(note.attestedAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {notes.length} of {pagination.total} notes
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                    disabled={filters.page === 1}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300
                             bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                             rounded-md hover:bg-gray-50 dark:hover:bg-gray-600
                             disabled:opacity-50 disabled:cursor-not-allowed">
                    Previous
                  </button>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Page {filters.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                    disabled={filters.page >= pagination.pages}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300
                             bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                             rounded-md hover:bg-gray-50 dark:hover:bg-gray-600
                             disabled:opacity-50 disabled:cursor-not-allowed">
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Encounter Note Editor Modal */}
      {isEditorOpen && (
        <EncounterNoteEditor
          isOpen={isEditorOpen}
          onClose={handleCloseEditor}
          patientId={selectedNote?.patientId || ''}
          clinicianId={selectedNote?.clinicianId || ''}
          alertId={selectedNote?.alertId}
          existingNote={selectedNote}
        />
      )}
    </div>
  )
}
