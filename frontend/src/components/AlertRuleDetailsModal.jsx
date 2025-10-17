import React from 'react'
import { XMarkIcon, BellIcon, ExclamationTriangleIcon, DocumentTextIcon, BeakerIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon } from '@heroicons/react/24/solid'

export default function AlertRuleDetailsModal({ rule, isOpen, onClose }) {
  if (!isOpen || !rule) return null

  // Format condition expression
  const formatExpression = (expression) => {
    if (!expression) return 'No condition'

    // Handle composite conditions (OR/AND)
    if (expression.operator === 'or' || expression.operator === 'and') {
      const subConditions = expression.conditions || []
      if (subConditions.length > 0) {
        return subConditions.map(c => formatExpression(c)).join(` ${expression.operator.toUpperCase()} `)
      }
    }

    // Handle type-based conditions
    if (expression.type === 'missed_assessment') {
      return 'No assessment completed'
    }

    const { condition, metric, operator, threshold, value, evaluationWindow, unit, note } = expression
    const metricName = condition || metric

    const conditionNames = {
      'systolic_blood_pressure': 'Systolic BP',
      'diastolic_blood_pressure': 'Diastolic BP',
      'blood_glucose': 'Blood Glucose',
      'oxygen_saturation': 'Oxygen Saturation',
      'heart_rate': 'Heart Rate',
      'pain_level_nrs': 'Pain Level (NRS)',
      'weight_lbs': 'Weight',
      'assessment_completion': 'Assessment Completion',
    }

    const operatorNames = {
      'gte': '≥',
      'gt': '>',
      'lte': '≤',
      'lt': '<',
      'eq': '=',
    }

    const conditionName = conditionNames[metricName] || metricName || 'Unknown condition'
    const operatorName = operatorNames[operator] || operator || ''

    let formatted = `${conditionName} ${operatorName}`

    const numericValue = threshold !== undefined ? threshold : value
    if (numericValue !== undefined) {
      formatted += ` ${numericValue}`
    }

    if (unit) {
      formatted += ` ${unit}`
    }

    if (evaluationWindow) {
      formatted += ` (${evaluationWindow})`
    }

    if (note) {
      formatted += ` - ${note}`
    }

    return formatted
  }

  // Parse actions from JSON if needed
  const getActions = () => {
    if (!rule.actions) return []
    if (typeof rule.actions === 'string') {
      try {
        return JSON.parse(rule.actions)
      } catch {
        return []
      }
    }
    return rule.actions
  }

  const actions = getActions()

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Background overlay */}
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* Center modal */}
        <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white flex items-center" id="modal-title">
                  <BellIcon className="h-6 w-6 mr-2" />
                  {rule.name}
                </h3>
                {rule.description && (
                  <p className="mt-2 text-sm text-amber-100">
                    {rule.description}
                  </p>
                )}
                <div className="mt-3 flex items-center space-x-2">
                  {rule.severity && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rule.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      rule.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                      rule.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {rule.severity}
                    </span>
                  )}
                  {rule.priority > 0 && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white border border-white border-opacity-30">
                      Priority: {rule.priority}
                    </span>
                  )}
                  {rule.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Inactive
                    </span>
                  )}
                  {rule.isStandardized && !rule.isCustomized && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-20 text-white border border-white border-opacity-30">
                      ⭐ Standardized
                    </span>
                  )}
                  {rule.isCustomized && (
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

            {/* Condition Expression Section */}
            {rule.conditions && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                  Alert Condition
                </h4>
                <div className="bg-white rounded p-3 border border-red-100">
                  <code className="text-sm text-gray-800 font-mono">
                    {formatExpression(rule.conditions)}
                  </code>
                </div>
              </div>
            )}

            {/* Actions Section */}
            {actions && actions.length > 0 && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <BellIcon className="h-5 w-5 text-blue-600 mr-2" />
                  Actions ({actions.length})
                </h4>
                <div className="space-y-2">
                  {actions.map((action, index) => (
                    <div key={index} className="flex items-start bg-white rounded p-3 border border-blue-100">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{action.type || 'Action'}</div>
                        {action.description && (
                          <p className="mt-1 text-xs text-gray-600">{action.description}</p>
                        )}
                        {action.notification && (
                          <div className="mt-2 text-xs">
                            <span className="text-gray-600">Notify: </span>
                            <span className="font-medium">{action.notification}</span>
                          </div>
                        )}
                        {action.escalation && (
                          <div className="mt-1 text-xs">
                            <span className="text-gray-600">Escalate to: </span>
                            <span className="font-medium">{action.escalation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clinical Evidence Section */}
            {(rule.clinicalEvidence || rule.guidelines || rule.rationale || rule.sources) && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-green-600 mr-2" />
                  Clinical Evidence
                </h4>
                <div className="space-y-3 text-sm text-gray-700">
                  {rule.guidelines && (
                    <div>
                      <span className="font-medium text-gray-900">Guidelines:</span>
                      <p className="mt-1 whitespace-pre-wrap">
                        {typeof rule.guidelines === 'string'
                          ? rule.guidelines
                          : JSON.stringify(rule.guidelines, null, 2)}
                      </p>
                    </div>
                  )}
                  {rule.rationale && (
                    <div>
                      <span className="font-medium text-gray-900">Rationale:</span>
                      <p className="mt-1">{rule.rationale}</p>
                    </div>
                  )}
                  {rule.clinicalEvidence && (
                    <div>
                      <span className="font-medium text-gray-900">Evidence:</span>
                      <p className="mt-1 whitespace-pre-wrap">
                        {typeof rule.clinicalEvidence === 'string'
                          ? rule.clinicalEvidence
                          : JSON.stringify(rule.clinicalEvidence, null, 2)}
                      </p>
                    </div>
                  )}
                  {rule.sources && (
                    <div>
                      <span className="font-medium text-gray-900">Sources:</span>
                      <p className="mt-1 whitespace-pre-wrap">
                        {typeof rule.sources === 'string'
                          ? rule.sources
                          : JSON.stringify(rule.sources, null, 2)}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Associated Condition Presets Section */}
            {rule.presets && rule.presets.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                  <BeakerIcon className="h-5 w-5 text-purple-600 mr-2" />
                  Associated Condition Presets ({rule.presets.length})
                </h4>
                <div className="space-y-2">
                  {rule.presets.map((presetLink, index) => (
                    <div key={index} className="flex items-start bg-white rounded p-3 border border-purple-100">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{presetLink.preset.name}</div>
                        {presetLink.preset.description && (
                          <p className="mt-1 text-xs text-gray-600">{presetLink.preset.description}</p>
                        )}
                        <div className="mt-2 flex items-center space-x-3 text-xs">
                          {presetLink.isEnabled ? (
                            <span className="text-green-600 font-medium">Enabled</span>
                          ) : (
                            <span className="text-gray-500">Disabled</span>
                          )}
                          {presetLink.priority > 0 && (
                            <span className="text-gray-600">
                              Priority: {presetLink.priority}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!rule.conditions &&
             (!actions || actions.length === 0) &&
             !rule.clinicalEvidence &&
             !rule.guidelines &&
             !rule.rationale &&
             !rule.sources &&
             (!rule.presets || rule.presets.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                <p>No detailed information available for this alert rule.</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex justify-end">
            <button
              type="button"
              className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 border border-gray-300"
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
