import React from 'react'
import { XMarkIcon, DocumentTextIcon, BellIcon, BeakerIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

export default function ConditionPresetDetailsModal({ preset, isOpen, onClose }) {
  if (!isOpen || !preset) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Background overlay */}
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white" id="modal-title">
                  {preset.name}
                </h3>
                {preset.description && (
                  <p className="mt-2 text-sm text-indigo-100">
                    {preset.description}
                  </p>
                )}
                <div className="mt-3 flex items-center space-x-2">
                  {preset.isStandardized && !preset.isCustomized && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white border border-white border-opacity-30">
                      ⭐ Standardized
                    </span>
                  )}
                  {preset.isCustomized && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white border border-white border-opacity-30">
                      🏥 Custom
                    </span>
                  )}
                  {preset.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="ml-4 rounded-md bg-white bg-opacity-20 p-2 text-white hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-white"
                onClick={onClose}
              >
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6 max-h-[calc(100vh-250px)] overflow-y-auto">

            {/* Diagnoses Section */}
            {preset.diagnoses && preset.diagnoses.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <BeakerIcon className="h-5 w-5 text-blue-600 mr-2" />
                  Associated Diagnoses ({preset.diagnoses.length})
                </h4>
                <div className="space-y-2">
                  {preset.diagnoses.map((diagnosis, index) => (
                    <div key={index} className="flex items-start bg-white rounded p-3 border border-blue-100">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{diagnosis.label}</span>
                          {diagnosis.isPrimary && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Primary
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center space-x-3 text-xs text-gray-600">
                          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">ICD-10: {diagnosis.icd10}</span>
                          {diagnosis.snomed && (
                            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">SNOMED: {diagnosis.snomed}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assessment Templates Section */}
            {preset.templates && preset.templates.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-purple-600 mr-2" />
                  Assessment Templates ({preset.templates.length})
                </h4>
                <div className="space-y-2">
                  {preset.templates.map((templateLink, index) => (
                    <div key={index} className="flex items-start bg-white rounded p-3 border border-purple-100">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{templateLink.template.name}</div>
                        {templateLink.template.description && (
                          <p className="mt-1 text-xs text-gray-600">{templateLink.template.description}</p>
                        )}
                        <div className="mt-2 flex items-center space-x-3 text-xs">
                          {templateLink.isRequired && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800">
                              Required
                            </span>
                          )}
                          {templateLink.frequency && (
                            <span className="text-gray-600">
                              Frequency: {templateLink.frequency}
                            </span>
                          )}
                          {templateLink.template.clinicalUse && (
                            <span className="text-gray-600 italic">
                              {templateLink.template.clinicalUse}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alert Rules Section */}
            {preset.alertRules && preset.alertRules.length > 0 && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <BellIcon className="h-5 w-5 text-amber-600 mr-2" />
                  Alert Rules ({preset.alertRules.length})
                </h4>
                <div className="space-y-2">
                  {preset.alertRules.map((ruleLink, index) => (
                    <div key={index} className="flex items-start bg-white rounded p-3 border border-amber-100">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{ruleLink.rule.name}</span>
                          {ruleLink.rule.severity && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              ruleLink.rule.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              ruleLink.rule.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              ruleLink.rule.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {ruleLink.rule.severity}
                            </span>
                          )}
                        </div>
                        {ruleLink.rule.description && (
                          <p className="mt-1 text-xs text-gray-600">{ruleLink.rule.description}</p>
                        )}
                        <div className="mt-2 flex items-center space-x-3 text-xs">
                          {ruleLink.isEnabled ? (
                            <span className="text-green-600 font-medium">Enabled</span>
                          ) : (
                            <span className="text-gray-500">Disabled</span>
                          )}
                          {ruleLink.priority > 0 && (
                            <span className="text-gray-600">
                              Priority: {ruleLink.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Guidelines Section */}
            {preset.clinicalGuidelines && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Clinical Guidelines
                </h4>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {typeof preset.clinicalGuidelines === 'string'
                    ? preset.clinicalGuidelines
                    : JSON.stringify(preset.clinicalGuidelines, null, 2)}
                </div>
              </div>
            )}

            {/* Standard Coding Section */}
            {preset.standardCoding && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Standard Coding Information
                </h4>
                <div className="text-sm text-gray-700 font-mono bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                  <pre>{JSON.stringify(preset.standardCoding, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!preset.diagnoses || preset.diagnoses.length === 0) &&
             (!preset.templates || preset.templates.length === 0) &&
             (!preset.alertRules || preset.alertRules.length === 0) &&
             !preset.clinicalGuidelines &&
             !preset.standardCoding && (
              <div className="text-center py-8 text-gray-500">
                <p>No detailed information available for this condition preset.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              type="button"
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border border-gray-300"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
