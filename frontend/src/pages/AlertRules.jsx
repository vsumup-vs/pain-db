import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  BellIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  FunnelIcon,
  XMarkIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline'
import { api } from '../services/api'
import Modal from '../components/Modal'
import AlertRuleForm from '../components/AlertRuleForm'

export default function AlertRules() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const queryClient = useQueryClient()

  const { data: rulesResponse, isLoading } = useQuery({
    queryKey: ['alert-rules', searchTerm, severityFilter],
    queryFn: () => api.getAlertRules({ 
      search: searchTerm,
      severity: severityFilter !== 'all' ? severityFilter : undefined
    }),
  })

  const { data: statsResponse } = useQuery({
    queryKey: ['alert-rules-stats'],
    queryFn: () => api.getAlertRuleStats(),
  })

  const rules = rulesResponse?.data || []
  const stats = statsResponse?.data || {}

  const createMutation = useMutation({
    mutationFn: api.createAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries(['alert-rules'])
      queryClient.invalidateQueries(['alert-rules-stats'])
      setIsModalOpen(false)
      toast.success('Alert rule created successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create alert rule')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateAlertRule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['alert-rules'])
      queryClient.invalidateQueries(['alert-rules-stats'])
      setIsModalOpen(false)
      setEditingRule(null)
      toast.success('Alert rule updated successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update alert rule')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: api.deleteAlertRule,
    onSuccess: () => {
      queryClient.invalidateQueries(['alert-rules'])
      queryClient.invalidateQueries(['alert-rules-stats'])
      toast.success('Alert rule deleted successfully')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete alert rule')
    },
  })

  const customizeMutation = useMutation({
    mutationFn: (id) => api.customizeAlertRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['alert-rules'])
      queryClient.invalidateQueries(['alert-rules-stats'])
      toast.success('Alert rule customized successfully! You can now edit it.')
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to customize alert rule')
    },
  })

  const handleSubmit = (data) => {
    if (editingRule) {
      updateMutation.mutate({ id: editingRule.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (rule) => {
    setEditingRule(rule)
    setIsModalOpen(true)
  }

  const handleDelete = (rule) => {
    if (window.confirm(`Are you sure you want to delete the rule "${rule.name}"?`)) {
      deleteMutation.mutate(rule.id)
    }
  }

  const handleCustomize = (rule) => {
    if (window.confirm(`Create a customizable copy of "${rule.name}" for your organization? You will be able to modify the customized version.`)) {
      customizeMutation.mutate(rule.id)
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'high': return <ExclamationTriangleIcon className="h-4 w-4" />
      case 'medium': return <ShieldCheckIcon className="h-4 w-4" />
      case 'low': return <BellIcon className="h-4 w-4" />
      default: return <BellIcon className="h-4 w-4" />
    }
  }

  const formatExpression = (expression) => {
    if (!expression) return 'No condition'

    // Handle both 'condition' and 'metric' field names for backwards compatibility
    const { condition, metric, operator, threshold, value, timeWindow, duration, occurrences, consecutiveDays, description } = expression
    const metricName = condition || metric

    // If there's a description field, use it
    if (description) {
      return description
    }

    // Create human-readable condition names
    const conditionNames = {
      'pain_scale_0_10': 'Pain Scale (0-10)',
      'blood_glucose': 'Blood Glucose',
      'mood_rating': 'Mood Rating',
      'medication_adherence_rate': 'Medication Adherence Rate',
      'medication_adherence': 'Medication Adherence',
      'side_effects_severity': 'Side Effects Severity',
      'medication_effectiveness': 'Medication Effectiveness',
      'no_assessment_for': 'Assessment Missing',
      'missed_medication_doses': 'Missed Medication Doses',
      'mood_scale': 'Mood Scale',
      'sleep_quality': 'Sleep Quality',
      'activity_level': 'Activity Level'
    }

    // Create human-readable operator names
    const operatorNames = {
      'greater_than': '>',
      'greater_than_or_equal': '≥',
      'less_than': '<',
      'less_than_or_equal': '≤',
      'equal': '=',
      'equals': '=',
      'not_equal': '≠',
      'trend_increasing': 'trending upward',
      'trend_decreasing': 'trending downward',
      'missing_data': 'has missing data',
      'contains': 'contains'
    }

    const conditionName = conditionNames[metricName] || metricName || 'Unknown condition'
    const operatorName = operatorNames[operator] || operator
    
    // Handle special cases first
    if (metricName === 'no_assessment_for') {
      const hours = threshold || 24
      return `No assessment for ${hours}+ hours`
    }

    if (metricName === 'medication_adherence' && operator === 'equals' && value) {
      let result = `${conditionName} = "${value}"`
      if (occurrences) {
        result += ` (${occurrences} times)`
      }
      return result
    }

    // Standard formatting
    let formatted = `${conditionName} ${operatorName}`

    // Add threshold or value
    if (threshold !== undefined && threshold !== null) {
      if (metricName === 'medication_adherence_rate' && threshold <= 1) {
        formatted += ` ${(threshold * 100).toFixed(0)}%`
      } else {
        formatted += ` ${threshold}`
      }
    } else if (value !== undefined) {
      formatted += ` "${value}"`
    }

    // Add time context (handle both 'timeWindow' and 'duration')
    const timeContext = timeWindow || duration
    if (timeContext && timeContext !== 'immediate') {
      formatted += ` (${timeContext})`
    }
    
    // Add occurrence/consecutive day context
    if (consecutiveDays) {
      formatted += ` for ${consecutiveDays} consecutive days`
    } else if (occurrences && !value) {
      if (operator === 'trend_increasing' || operator === 'trend_decreasing') {
        formatted += ` for ${occurrences} consecutive periods`
      } else {
        formatted += ` (${occurrences} times)`
      }
    }
    
    return formatted
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alert Rules</h1>
          <p className="text-gray-600">Manage automated alert rules for patient monitoring</p>
        </div>
        <button
          onClick={() => {
            setEditingRule(null)
            setIsModalOpen(true)
          }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Create Rule
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BellIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Rules</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Rules</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Critical Rules</p>
              <p className="text-2xl font-bold text-gray-900">{stats.critical || stats.severityBreakdown?.CRITICAL || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ShieldCheckIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-gray-900">{stats.highPriority || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search rules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 form-input"
              />
            </div>
          </div>
          <div className="sm:w-48">
            <div className="relative">
              <FunnelIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="pl-10 form-input"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Rules Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Condition
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Window
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cooldown
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Presets
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <BellIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">{rule.name}</span>
                          {rule.isStandardized && !rule.isCustomized && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              ⭐ Standardized
                            </span>
                          )}
                          {rule.isCustomized && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              🏥 Custom
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">ID: {rule.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(rule.severity)}`}>
                      {getSeverityIcon(rule.severity)}
                      <span className="ml-1 capitalize">{rule.severity}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {formatExpression(rule.conditions)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.conditions?.timeWindow || rule.conditions?.duration || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.conditions?.cooldown || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.conditionPresets?.length || 0} preset{rule.conditionPresets?.length !== 1 ? 's' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {/* Show Customize button for standardized (non-customized) items */}
                      {rule.isStandardized && !rule.isCustomized && (
                        <button
                          onClick={() => handleCustomize(rule)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Customize for your organization"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                      )}

                      {/* Only show Edit/Delete for customized (org-specific) items */}
                      {rule.isCustomized && (
                        <>
                          <button
                            onClick={() => handleEdit(rule)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit rule"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rule)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete rule"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rules.length === 0 && (
            <div className="text-center py-12">
              <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No alert rules</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first alert rule.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setEditingRule(null)
                    setIsModalOpen(true)
                  }}
                  className="btn-primary"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Alert Rule
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingRule(null)
        }}
        title={editingRule ? 'Edit Alert Rule' : 'Create Alert Rule'}
        size="lg"
      >
        <AlertRuleForm
          rule={editingRule}
          onSubmit={handleSubmit}
          onCancel={() => {
            setIsModalOpen(false)
            setEditingRule(null)
          }}
          isLoading={createMutation.isLoading || updateMutation.isLoading}
        />
      </Modal>
    </div>
  )
}