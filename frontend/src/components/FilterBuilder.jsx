import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * Visual Query Builder Component
 * Allows non-technical users to build filter criteria through a UI
 * Generates JSON filter object automatically
 */

// Field definitions per view type
const FIELD_DEFINITIONS = {
  PATIENT_LIST: [
    { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE', 'DECEASED'] },
    { key: 'gender', label: 'Gender', type: 'select', options: ['MALE', 'FEMALE', 'OTHER'] },
    { key: 'ageMin', label: 'Age (Minimum)', type: 'number', min: 0, max: 120 },
    { key: 'ageMax', label: 'Age (Maximum)', type: 'number', min: 0, max: 120 },
    { key: 'hasOpenAlerts', label: 'Has Open Alerts', type: 'boolean' },
    { key: 'alertSeverity', label: 'Alert Severity', type: 'multiselect', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    { key: 'enrolledPrograms', label: 'Enrolled Programs', type: 'multiselect', options: ['RPM', 'RTM', 'CCM', 'General Wellness'] },
    { key: 'riskScore', label: 'Risk Score', type: 'number-comparison', min: 0, max: 10 },
    { key: 'billingProgress', label: 'Billing Progress %', type: 'number-comparison', min: 0, max: 100 },
    { key: 'lastAssessmentDays', label: 'Last Assessment (days ago)', type: 'number-comparison', min: 0 },
    { key: 'medicationAdherence', label: 'Medication Adherence %', type: 'number-comparison', min: 0, max: 100 }
  ],
  TRIAGE_QUEUE: [
    { key: 'severity', label: 'Severity', type: 'multiselect', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    { key: 'status', label: 'Status', type: 'multiselect', options: ['PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'] },
    { key: 'claimedBy', label: 'Claimed By', type: 'select', options: ['me', 'unclaimed', 'anyone'] },
    { key: 'riskScore', label: 'Risk Score', type: 'number-comparison', min: 0, max: 10 },
    { key: 'slaBreached', label: 'SLA Breached', type: 'boolean' },
    { key: 'category', label: 'Category', type: 'select', options: ['VITAL_SIGNS', 'PAIN_MANAGEMENT', 'MEDICATION', 'ASSESSMENT', 'OTHER'] }
  ],
  ASSESSMENT_LIST: [
    { key: 'completionStatus', label: 'Completion Status', type: 'select', options: ['PENDING', 'COMPLETED', 'OVERDUE'] },
    { key: 'templateType', label: 'Template Type', type: 'multiselect', options: ['PROMIS_PAIN', 'PHQ9', 'GAD7', 'DAILY_TRACKER'] },
    { key: 'dueStatus', label: 'Due Status', type: 'select', options: ['DUE_TODAY', 'OVERDUE', 'UPCOMING'] },
    { key: 'daysPastDue', label: 'Days Past Due', type: 'number-comparison', min: 0 }
  ],
  ENROLLMENT_LIST: [
    { key: 'programType', label: 'Program Type', type: 'multiselect', options: ['RPM', 'RTM', 'CCM', 'TCM', 'General Wellness'] },
    { key: 'status', label: 'Status', type: 'multiselect', options: ['PENDING', 'ACTIVE', 'INACTIVE', 'COMPLETED', 'WITHDRAWN'] },
    { key: 'billingEligible', label: 'Billing Eligible', type: 'boolean' },
    { key: 'dataCollectionDays', label: 'Data Collection Days', type: 'number-comparison', min: 0 },
    { key: 'clinicalTimeMinutes', label: 'Clinical Time (minutes)', type: 'number-comparison', min: 0 }
  ],
  ALERT_LIST: [
    { key: 'severity', label: 'Severity', type: 'multiselect', options: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    { key: 'status', label: 'Status', type: 'multiselect', options: ['PENDING', 'ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'] },
    { key: 'category', label: 'Category', type: 'select', options: ['VITAL_SIGNS', 'PAIN_MANAGEMENT', 'MEDICATION', 'ASSESSMENT', 'OTHER'] },
    { key: 'createdAfter', label: 'Created After', type: 'date' }
  ],
  TASK_LIST: [
    { key: 'taskType', label: 'Task Type', type: 'multiselect', options: ['FOLLOW_UP_CALL', 'MED_REVIEW', 'ADHERENCE_CHECK', 'LAB_ORDER', 'REFERRAL', 'CUSTOM'] },
    { key: 'status', label: 'Status', type: 'multiselect', options: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
    { key: 'priority', label: 'Priority', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    { key: 'assignedTo', label: 'Assigned To', type: 'select', options: ['me', 'anyone'] },
    { key: 'dueDate', label: 'Due Date', type: 'select', options: ['today', 'tomorrow', 'this-week', 'overdue'] }
  ]
};

const OPERATORS = [
  { value: '>=', label: 'Greater than or equal to (≥)' },
  { value: '>', label: 'Greater than (>)' },
  { value: '<=', label: 'Less than or equal to (≤)' },
  { value: '<', label: 'Less than (<)' },
  { value: '==', label: 'Equal to (=)' }
];

const FilterBuilder = ({ viewType, filters, onChange, showJson = false }) => {
  // Define available fields first (before convertFiltersToRules is called)
  const availableFields = FIELD_DEFINITIONS[viewType] || [];

  // Convert existing JSON filters to UI rules
  function convertFiltersToRules(filters) {
    const rules = [];
    let ruleIndex = 0;

    Object.entries(filters).forEach(([key, value]) => {
      const fieldDef = availableFields.find(f => f.key === key);
      if (!fieldDef) return;

      if (fieldDef.type === 'number-comparison' && typeof value === 'object') {
        // Handle range structures with min/max
        if (value.min !== undefined) {
          rules.push({
            id: Date.now() + ruleIndex++,
            field: key,
            operator: '>=',
            value: value.min
          });
        }
        if (value.max !== undefined) {
          rules.push({
            id: Date.now() + ruleIndex++,
            field: key,
            operator: '<=',
            value: value.max
          });
        }
        // Handle standard operator/value structure
        if (value.operator && value.value !== undefined) {
          rules.push({
            id: Date.now() + ruleIndex++,
            field: key,
            operator: value.operator,
            value: value.value
          });
        }
      } else if (Array.isArray(value)) {
        rules.push({
          id: Date.now() + ruleIndex++,
          field: key,
          operator: 'in',
          value: value
        });
      } else {
        rules.push({
          id: Date.now() + ruleIndex++,
          field: key,
          operator: '==',
          value: value
        });
      }
    });

    return rules;
  }

  // Initialize rules state with existing filters or default rule
  const [rules, setRules] = useState(
    filters && Object.keys(filters).length > 0
      ? convertFiltersToRules(filters)
      : [{ id: Date.now(), field: '', operator: '>=', value: '' }]
  );

  // Update rules when filters prop changes (e.g., when editing a saved view)
  useEffect(() => {
    if (filters && Object.keys(filters).length > 0) {
      const convertedRules = convertFiltersToRules(filters);
      if (convertedRules.length > 0) {
        setRules(convertedRules);
      }
    }
  }, [filters]);

  // Convert UI rules to JSON filters
  function convertRulesToFilters(rules) {
    const filters = {};
    rules.forEach(rule => {
      if (!rule.field || rule.value === '' || rule.value === null || rule.value === undefined) return;

      const fieldDef = availableFields.find(f => f.key === rule.field);
      if (!fieldDef) return;

      if (fieldDef.type === 'number-comparison') {
        filters[rule.field] = {
          operator: rule.operator,
          value: parseFloat(rule.value)
        };
      } else if (fieldDef.type === 'multiselect') {
        filters[rule.field] = Array.isArray(rule.value) ? rule.value : [rule.value];
      } else if (fieldDef.type === 'boolean') {
        filters[rule.field] = rule.value === true || rule.value === 'true';
      } else {
        filters[rule.field] = rule.value;
      }
    });
    return filters;
  }

  const handleAddRule = () => {
    const newRule = { id: Date.now(), field: '', operator: '>=', value: '' };
    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
  };

  const handleRemoveRule = (ruleId) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    setRules(updatedRules);
    onChange(convertRulesToFilters(updatedRules));
  };

  const handleRuleChange = (ruleId, updates) => {
    const updatedRules = rules.map(r =>
      r.id === ruleId ? { ...r, ...updates } : r
    );
    setRules(updatedRules);
    onChange(convertRulesToFilters(updatedRules));
  };

  const getFieldDefinition = (fieldKey) => {
    return availableFields.find(f => f.key === fieldKey);
  };

  const renderValueInput = (rule) => {
    const fieldDef = getFieldDefinition(rule.field);
    if (!fieldDef) return null;

    switch (fieldDef.type) {
      case 'select':
        return (
          <select
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={rule.value}
            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
          >
            <option value="">Select...</option>
            {fieldDef.options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="flex-1">
            <select
              multiple
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              value={Array.isArray(rule.value) ? rule.value : []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                handleRuleChange(rule.id, { value: selected });
              }}
              size={Math.min(fieldDef.options.length, 4)}
            >
              {fieldDef.options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>
        );

      case 'number':
      case 'number-comparison':
        return (
          <input
            type="number"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={rule.value}
            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
            min={fieldDef.min}
            max={fieldDef.max}
            placeholder={`Enter ${fieldDef.label.toLowerCase()}`}
          />
        );

      case 'boolean':
        return (
          <select
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={rule.value}
            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      case 'date':
        return (
          <input
            type="date"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={rule.value}
            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
          />
        );

      default:
        return (
          <input
            type="text"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            value={rule.value}
            onChange={(e) => handleRuleChange(rule.id, { value: e.target.value })}
            placeholder={`Enter ${fieldDef.label.toLowerCase()}`}
          />
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Filter Rules</h3>
        <button
          type="button"
          onClick={handleAddRule}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Rule
        </button>
      </div>

      {/* Rules */}
      <div className="space-y-3">
        {rules.map((rule, index) => {
          const fieldDef = getFieldDefinition(rule.field);
          const showOperator = fieldDef?.type === 'number-comparison';

          return (
            <div key={rule.id} className="flex items-start gap-2 p-3 bg-gray-50 rounded-md">
              {/* AND label for subsequent rules */}
              {index > 0 && (
                <div className="flex items-center justify-center w-12 h-10 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded">
                  AND
                </div>
              )}

              {/* Field selector */}
              <select
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={rule.field}
                onChange={(e) => handleRuleChange(rule.id, { field: e.target.value, value: '' })}
              >
                <option value="">Select field...</option>
                {availableFields.map(field => (
                  <option key={field.key} value={field.key}>
                    {field.label}
                  </option>
                ))}
              </select>

              {/* Operator (for number comparisons) */}
              {showOperator && (
                <select
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={rule.operator}
                  onChange={(e) => handleRuleChange(rule.id, { operator: e.target.value })}
                >
                  {OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Value input */}
              {rule.field && renderValueInput(rule)}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveRule(rule.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Remove rule"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          );
        })}

        {rules.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-md border-2 border-dashed border-gray-300">
            <p className="text-sm">No filter rules yet</p>
            <p className="text-xs mt-1">Click "Add Rule" to start building filters</p>
          </div>
        )}
      </div>

      {/* JSON Preview (for advanced users) */}
      {showJson && (
        <div className="mt-4">
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-gray-700 flex items-center gap-2">
              <ChevronDownIcon className="h-4 w-4 transition-transform group-open:rotate-180" />
              Advanced: View Generated JSON
            </summary>
            <div className="mt-2 p-3 bg-gray-900 rounded-md">
              <pre className="text-xs text-green-400 font-mono overflow-x-auto">
                {JSON.stringify(convertRulesToFilters(rules), null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}

      {/* Helper text */}
      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="font-medium text-blue-900 mb-1">💡 How filters work:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li>All rules are combined with AND (all conditions must match)</li>
          <li>For multi-select fields, items are combined with OR (any selected value matches)</li>
          <li>Number comparisons support ≥, {'>'}, ≤, {'<'}, and = operators</li>
        </ul>
      </div>
    </div>
  );
};

export default FilterBuilder;
