import React from 'react'
import { XMarkIcon, UserIcon, CalendarIcon, DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

const AssessmentDetailsModal = ({ assessment, isOpen, onClose }) => {
  if (!isOpen || !assessment) return null

  const formatDate = (date) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Parse responses from JSON
  const responses = assessment.responses || {}
  const templateItems = assessment.template?.items || []

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-8 w-8 text-white" />
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Completed Assessment
                  </h2>
                  <p className="text-blue-100 text-sm">
                    {assessment.template?.name || 'Assessment Details'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Patient and Completion Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Patient</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {assessment.patient?.firstName} {assessment.patient?.lastName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <CalendarIcon className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Completed</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {formatDate(assessment.completedAt)}
                    </p>
                  </div>
                </div>

                {assessment.clinician && (
                  <div className="flex items-center space-x-3">
                    <DocumentTextIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Clinician</p>
                      <p className="text-sm font-semibold text-gray-900">
                        {assessment.clinician.firstName} {assessment.clinician.lastName}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Questions and Answers */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DocumentTextIcon className="h-5 w-5 mr-2 text-blue-600" />
                Responses
              </h3>

              <div className="space-y-4">
                {templateItems.length > 0 ? (
                  templateItems.map((item, index) => {
                    const metricId = item.metricDefinition?.id
                    const answer = responses[metricId]

                    return (
                      <div
                        key={item.id || index}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-500">
                              Question {index + 1}
                            </p>
                            <p className="text-base font-semibold text-gray-900 mt-1">
                              {item.metricDefinition?.displayName || 'Unknown Question'}
                            </p>
                            {item.helpText && (
                              <p className="text-xs text-gray-500 mt-1 italic">
                                {item.helpText}
                              </p>
                            )}
                          </div>
                          <span className="ml-4 px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                            {item.metricDefinition?.valueType || 'N/A'}
                          </span>
                        </div>

                        <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <p className="text-xs text-blue-600 font-medium mb-1">Answer:</p>
                          {answer !== undefined && answer !== null ? (
                            <p className="text-base font-semibold text-gray-900">
                              {answer}
                              {item.metricDefinition?.unit && (
                                <span className="text-sm text-gray-600 ml-1">
                                  {item.metricDefinition.unit}
                                </span>
                              )}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 italic">Not answered</p>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No questions available for this assessment</p>
                  </div>
                )}
              </div>
            </div>

            {/* Score Section */}
            {assessment.score && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <CheckCircleIcon className="h-5 w-5 mr-2 text-green-600" />
                  Score
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                    {JSON.stringify(assessment.score, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Clinician Notes */}
            {assessment.notes && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 mr-2 text-purple-600" />
                  Clinician Notes
                </h3>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {assessment.notes}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <p className="text-xs text-gray-500">
                Assessment ID: {assessment.id}
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssessmentDetailsModal
