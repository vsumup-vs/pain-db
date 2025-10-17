import React from 'react'
import { XMarkIcon, ChartBarIcon, DocumentTextIcon, BeakerIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

export default function MetricDefinitionDetailsModal({ metric, isOpen, onClose }) {
  if (!isOpen || !metric) return null

  // Parse scale info from JSON if needed
  const getScaleInfo = () => {
    if (!metric.scaleInfo) return null
    if (typeof metric.scaleInfo === 'string') {
      try {
        return JSON.parse(metric.scaleInfo)
      } catch {
        return null
      }
    }
    return metric.scaleInfo
  }

  // Parse validation info from JSON if needed
  const getValidationInfo = () => {
    if (!metric.validationInfo) return null
    if (typeof metric.validationInfo === 'string') {
      try {
        return JSON.parse(metric.validationInfo)
      } catch {
        return null
      }
    }
    return metric.validationInfo
  }

  // Parse normal range from JSON if needed
  const getNormalRange = () => {
    if (!metric.normalRange) return null
    if (typeof metric.normalRange === 'string') {
      try {
        return JSON.parse(metric.normalRange)
      } catch {
        return null
      }
    }
    return metric.normalRange
  }

  // Parse standard coding from JSON if needed
  const getStandardCoding = () => {
    if (!metric.standardCoding) return null
    if (typeof metric.standardCoding === 'string') {
      try {
        return JSON.parse(metric.standardCoding)
      } catch {
        return null
      }
    }
    return metric.standardCoding
  }

  const scaleInfo = getScaleInfo()
  const validationInfo = getValidationInfo()
  const normalRange = getNormalRange()
  const standardCoding = getStandardCoding()

  // Get value type display name
  const getValueTypeDisplay = (type) => {
    const types = {
      'numeric': 'Numeric',
      'text': 'Text',
      'boolean': 'Boolean (Yes/No)',
      'categorical': 'Categorical (Select One)',
      'ordinal': 'Ordinal (Ordered Scale)',
      'date': 'Date',
      'time': 'Time',
      'datetime': 'Date & Time',
      'json': 'JSON Data'
    }
    return types[type] || type
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Background overlay */}
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white flex items-center" id="modal-title">
                  <ChartBarIcon className="h-6 w-6 mr-2" />
                  {metric.name}
                </h3>
                {metric.description && (
                  <p className="mt-2 text-sm text-teal-100">
                    {metric.description}
                  </p>
                )}
                <div className="mt-3 flex items-center space-x-2 flex-wrap gap-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white border border-white border-opacity-30">
                    {getValueTypeDisplay(metric.valueType)}
                  </span>
                  {metric.unit && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white border border-white border-opacity-30">
                      Unit: {metric.unit}
                    </span>
                  )}
                  {metric.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                  {metric.isStandardized && !metric.isCustomized && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white border border-white border-opacity-30">
                      ⭐ Standardized
                    </span>
                  )}
                  {metric.isCustomized && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white border border-white border-opacity-30">
                      🏥 Custom
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

            {/* Metric Key Section */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">
                Metric Key (for API/Database)
              </h4>
              <code className="text-sm text-gray-800 font-mono bg-white px-3 py-1 rounded border border-gray-200">
                {metric.key}
              </code>
            </div>

            {/* Scale Information Section */}
            {scaleInfo && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <ChartBarIcon className="h-5 w-5 text-blue-600 mr-2" />
                  Scale Information
                </h4>
                <div className="bg-white rounded p-3 border border-blue-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {scaleInfo.min !== undefined && (
                      <div>
                        <span className="font-medium text-gray-900">Minimum:</span>
                        <span className="ml-2 text-gray-700">{scaleInfo.min}</span>
                      </div>
                    )}
                    {scaleInfo.max !== undefined && (
                      <div>
                        <span className="font-medium text-gray-900">Maximum:</span>
                        <span className="ml-2 text-gray-700">{scaleInfo.max}</span>
                      </div>
                    )}
                    {scaleInfo.precision !== undefined && (
                      <div>
                        <span className="font-medium text-gray-900">Precision:</span>
                        <span className="ml-2 text-gray-700">{scaleInfo.precision} decimal places</span>
                      </div>
                    )}
                    {scaleInfo.step !== undefined && (
                      <div>
                        <span className="font-medium text-gray-900">Step:</span>
                        <span className="ml-2 text-gray-700">{scaleInfo.step}</span>
                      </div>
                    )}
                  </div>
                  {scaleInfo.options && Array.isArray(scaleInfo.options) && (
                    <div className="mt-3">
                      <span className="font-medium text-gray-900 text-sm">Options:</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {scaleInfo.options.map((option, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                          >
                            {typeof option === 'object' ? option.label || option.value : option}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Normal Range Section */}
            {normalRange && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Normal Range
                </h4>
                <div className="bg-white rounded p-3 border border-green-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {normalRange.min !== undefined && (
                      <div>
                        <span className="font-medium text-gray-900">Minimum Normal:</span>
                        <span className="ml-2 text-gray-700">{normalRange.min} {metric.unit}</span>
                      </div>
                    )}
                    {normalRange.max !== undefined && (
                      <div>
                        <span className="font-medium text-gray-900">Maximum Normal:</span>
                        <span className="ml-2 text-gray-700">{normalRange.max} {metric.unit}</span>
                      </div>
                    )}
                  </div>
                  {normalRange.note && (
                    <p className="mt-2 text-xs text-gray-600 italic">{normalRange.note}</p>
                  )}
                </div>
              </div>
            )}

            {/* Validation Rules Section */}
            {validationInfo && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Validation Rules
                </h4>
                <div className="bg-white rounded p-3 border border-amber-100">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {JSON.stringify(validationInfo, null, 2)}
                  </div>
                </div>
              </div>
            )}

            {/* Standard Coding Section */}
            {standardCoding && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <BeakerIcon className="h-5 w-5 text-purple-600 mr-2" />
                  Standard Coding
                </h4>
                <div className="bg-white rounded p-3 border border-purple-100">
                  <div className="space-y-2 text-sm">
                    {standardCoding.loinc && (
                      <div>
                        <span className="font-medium text-gray-900">LOINC:</span>
                        <span className="ml-2 font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {standardCoding.loinc}
                        </span>
                      </div>
                    )}
                    {standardCoding.snomed && (
                      <div>
                        <span className="font-medium text-gray-900">SNOMED CT:</span>
                        <span className="ml-2 font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {standardCoding.snomed}
                        </span>
                      </div>
                    )}
                    {standardCoding.ucum && (
                      <div>
                        <span className="font-medium text-gray-900">UCUM:</span>
                        <span className="ml-2 font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                          {standardCoding.ucum}
                        </span>
                      </div>
                    )}
                    {!standardCoding.loinc && !standardCoding.snomed && !standardCoding.ucum && (
                      <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono">
                        {JSON.stringify(standardCoding, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Associated Assessment Templates Section */}
            {metric.assessmentTemplateItems && metric.assessmentTemplateItems.length > 0 && (
              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-indigo-600 mr-2" />
                  Used in Assessment Templates ({metric.assessmentTemplateItems.length})
                </h4>
                <div className="space-y-2">
                  {metric.assessmentTemplateItems.map((item, index) => (
                    <div key={index} className="flex items-start bg-white rounded p-3 border border-indigo-100">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.template.name}</div>
                        {item.template.description && (
                          <p className="mt-1 text-xs text-gray-600">{item.template.description}</p>
                        )}
                        <div className="mt-2 flex items-center space-x-3 text-xs">
                          {item.isRequired && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-800">
                              Required
                            </span>
                          )}
                          {item.displayOrder && (
                            <span className="text-gray-600">
                              Order: {item.displayOrder}
                            </span>
                          )}
                        </div>
                        {item.helpText && (
                          <p className="mt-2 text-xs text-gray-600 italic">{item.helpText}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!scaleInfo &&
             !validationInfo &&
             !normalRange &&
             !standardCoding &&
             (!metric.assessmentTemplateItems || metric.assessmentTemplateItems.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <p>No detailed information available for this metric definition.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              type="button"
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 border border-gray-300"
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
