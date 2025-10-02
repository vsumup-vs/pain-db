import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PlusIcon,
  TrashIcon,
  LightBulbIcon,
  WrenchScrewdriverIcon,
  PlayIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import RuleTester from './RuleTester'
import RuleBuilder from './RuleBuilder'

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-blue-600' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
  { value: 'high', label: 'High', color: 'text-orange-600' },
  { value: 'critical', label: 'Critical', color: 'text-red-600' }
]

const ACTION_TYPES = [
  { value: 'notify', label: 'Send Notification' },
  { value: 'escalate', label: 'Escalate to Supervisor' },
  { value: 'reminder', label: 'Send Reminder' },
  { value: 'autoResolve', label: 'Auto-resolve after time' }
]

export default function AlertRuleForm({ rule, onSubmit, onCancel, isLoading }) {
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [useVisualBuilder, setUseVisualBuilder] = useState(true)
  const [isExpressionValid, setIsExpressionValid] = useState(false)
  const [showTester, setShowTester] = useState(false)

  const { data: templatesResponse } = useQuery({
    queryKey: ['alert-rule-templates'],
    queryFn: () => api.getAlertRuleTemplates(),
  })

  const templates = templatesResponse?.data || []

  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.category || 'Other'
    if (!acc[category]) acc[category] = []
    acc[category].push(template)
    return acc
  }, {})

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
    reset
  } = useForm({
    defaultValues: {
      name: '',
      severity: 'medium',
      window: '1d',
      expression: {
        condition: '',
        operator: 'greater_than',
        threshold: '',
        timeWindow: '',
        occurrences: ''
      },
      dedupeKey: '',
      cooldown: '1h',
      actions: {
        notify: [],
        escalate: false,
        reminder: false,
        autoResolve: false
      }
    }
  })

  const { fields: notifyFields, append: appendNotify, remove: removeNotify } = useFieldArray({
    control,
    name: 'actions.notify'
  })

  const watchedExpression = watch('expression')

  useEffect(() => {
    if (rule) {
      reset({
        name: rule.name || '',
        severity: rule.severity || 'medium',
        window: rule.window || '1d',
        expression: rule.expression || {
          condition: '',
          operator: 'greater_than',
          threshold: '',
          timeWindow: '',
          occurrences: ''
        },
        dedupeKey: rule.dedupeKey || '',
        cooldown: rule.cooldown || '1h',
        actions: {
          notify: rule.actions?.notify || [],
          escalate: rule.actions?.escalate || false,
          reminder: rule.actions?.reminder || false,
          autoResolve: rule.actions?.autoResolve || false
        }
      })
    }
  }, [rule, reset])

  const applyTemplate = (template) => {
    setValue('name', template.name)
    setValue('severity', template.severity)
    setValue('window', template.window)
    setValue('expression', template.expression)
    setValue('cooldown', template.cooldown)
    setValue('actions', template.actions)
    setSelectedTemplate(template)
    setShowTemplates(false)
  }

  const handleExpressionChange = (newExpression) => {
    setValue('expression', newExpression)
  }

  const handleExpressionValidation = (isValid) => {
    setIsExpressionValid(isValid)
  }

  const onFormSubmit = (data) => {
    onSubmit(data)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            {rule ? 'Edit Alert Rule' : 'Create Alert Rule'}
          </h2>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setShowTester(!showTester)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <PlayIcon className="h-4 w-4 mr-2" />
              Test Rule
            </button>
            <button
              type="button"
              onClick={() => setShowTemplates(!showTemplates)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <LightBulbIcon className="h-4 w-4 mr-2" />
              Use Template
            </button>
          </div>
        </div>

        {/* Rule Tester */}
        {showTester && (
          <RuleTester
            rule={{
              expression: watchedExpression,
              ...watch()
            }}
            onTest={(result) => {
              console.log('Test result:', result);
            }}
          />
        )}

        {/* Templates Panel */}
        {showTemplates && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Choose a Template</h3>
            <div className="space-y-6">
              {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
                <div key={category}>
                  <h4 className="text-md font-medium text-gray-700 mb-3">{category}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryTemplates.map((template) => (
                      <div
                        key={template.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer transition-colors"
                        onClick={() => applyTemplate(template)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-gray-900">{template.name}</h5>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            template.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            template.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            template.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {template.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        <p className="text-xs text-gray-500">
                          Window: {template.window} | Cooldown: {template.cooldown}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="rule-name" className="block text-sm font-medium text-gray-700 mb-2">
                Rule Name *
              </label>
              <input
                id="rule-name"
                type="text"
                {...register('name', { required: 'Rule name is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter rule name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="rule-severity" className="block text-sm font-medium text-gray-700 mb-2">
                Severity *
              </label>
              <select
                id="rule-severity"
                {...register('severity', { required: 'Severity is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select severity...</option>
                {SEVERITY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="rule-window" className="block text-sm font-medium text-gray-700 mb-2">
                Evaluation Window *
              </label>
              <select
                id="rule-window"
                {...register('window', { required: 'Evaluation window is required' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1h">1 hour</option>
                <option value="6h">6 hours</option>
                <option value="12h">12 hours</option>
                <option value="1d">1 day</option>
                <option value="3d">3 days</option>
                <option value="7d">7 days</option>
                <option value="14d">14 days</option>
                <option value="30d">30 days</option>
              </select>
            </div>

            <div>
              <label htmlFor="rule-cooldown" className="block text-sm font-medium text-gray-700 mb-2">
                Cooldown Period
              </label>
              <select
                id="rule-cooldown"
                {...register('cooldown')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="30m">30 minutes</option>
                <option value="1h">1 hour</option>
                <option value="4h">4 hours</option>
                <option value="12h">12 hours</option>
                <option value="24h">24 hours</option>
                <option value="48h">48 hours</option>
                <option value="72h">72 hours</option>
              </select>
            </div>
          </div>
        </div>

        {/* Rule Expression */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Rule Expression</h3>
            <button
              type="button"
              onClick={() => setUseVisualBuilder(!useVisualBuilder)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <WrenchScrewdriverIcon className="h-4 w-4 mr-2" />
              {useVisualBuilder ? 'Manual Entry' : 'Visual Builder'}
            </button>
          </div>

          {useVisualBuilder ? (
            <RuleBuilder
              expression={watchedExpression}
              onChange={handleExpressionChange}
              onValidate={handleExpressionValidation}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expression-condition" className="block text-sm font-medium text-gray-700 mb-2">
                    Condition *
                  </label>
                  <input
                    id="expression-condition"
                    type="text"
                    {...register('expression.condition', { required: 'Condition is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., pain_scale_0_10"
                  />
                </div>

                <div>
                  <label htmlFor="expression-operator" className="block text-sm font-medium text-gray-700 mb-2">
                    Operator *
                  </label>
                  <input
                    id="expression-operator"
                    type="text"
                    {...register('expression.operator', { required: 'Operator is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., greater_than"
                  />
                </div>

                <div>
                  <label htmlFor="expression-threshold" className="block text-sm font-medium text-gray-700 mb-2">
                    Threshold
                  </label>
                  <input
                    id="expression-threshold"
                    type="number"
                    step="0.1"
                    {...register('expression.threshold')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 8"
                  />
                </div>

                <div>
                  <label htmlFor="expression-timeWindow" className="block text-sm font-medium text-gray-700 mb-2">
                    Time Window
                  </label>
                  <input
                    id="expression-timeWindow"
                    type="text"
                    {...register('expression.timeWindow')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 24h"
                  />
                </div>

                <div>
                  <label htmlFor="expression-occurrences" className="block text-sm font-medium text-gray-700 mb-2">
                    Occurrences
                  </label>
                  <input
                    id="expression-occurrences"
                    type="number"
                    {...register('expression.occurrences')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 3"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Actions</h3>
          
          <div className="space-y-6">
            {/* Notifications */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notify Recipients
              </label>
              <div className="space-y-2">
                {notifyFields.map((field, index) => (
                  <div key={field.id} className="flex items-center space-x-2">
                    <input
                      type="text"
                      {...register(`actions.notify.${index}`)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., clinician, patient, care_team"
                    />
                    <button
                      type="button"
                      onClick={() => removeNotify(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => appendNotify('')}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Recipient
                </button>
              </div>
            </div>

            {/* Action Checkboxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('actions.escalate')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Escalate to supervisor</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('actions.reminder')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Send reminder</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  {...register('actions.autoResolve')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Auto-resolve</span>
              </label>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Advanced Settings</h3>
          
          <div>
            <label htmlFor="rule-dedupeKey" className="block text-sm font-medium text-gray-700 mb-2">
              Deduplication Key
            </label>
            <input
              id="rule-dedupeKey"
              type="text"
              {...register('dedupeKey')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional: Key for deduplicating similar alerts"
            />
            <p className="mt-1 text-sm text-gray-500">
              Alerts with the same deduplication key will be grouped together
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || (useVisualBuilder && !isExpressionValid)}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
          </button>
        </div>
      </form>
    </div>
  )
}