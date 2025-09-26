import React, { useState, useEffect, useCallback } from 'react';

// Move conditions object outside component to prevent recreation on every render
const conditions = {
  'pain_scale_0_10': {
    label: 'Pain Scale (0-10)',
    type: 'numeric',
    operators: ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'equal', 'trend_increasing', 'trend_decreasing'],
    thresholdRange: { min: 0, max: 10 },
    description: 'Patient-reported pain level on a scale of 0-10'
  },
  'medication_adherence_rate': {
    label: 'Medication Adherence Rate',
    type: 'percentage',
    operators: ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'equal'],
    thresholdRange: { min: 0, max: 1 },
    description: 'Percentage of medications taken as prescribed'
  },
  'medication_adherence': {
    label: 'Medication Adherence Status',
    type: 'categorical',
    operators: ['equals', 'not_equal'],
    values: ['compliant', 'non_compliant', 'partially_compliant'],
    description: 'Categorical medication adherence status'
  },
  'side_effects_severity': {
    label: 'Side Effects Severity',
    type: 'numeric',
    operators: ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'equal', 'trend_increasing', 'trend_decreasing'],
    thresholdRange: { min: 0, max: 10 },
    description: 'Severity of medication side effects (0-10)'
  },
  'medication_effectiveness': {
    label: 'Medication Effectiveness',
    type: 'numeric',
    operators: ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'equal', 'trend_increasing', 'trend_decreasing'],
    thresholdRange: { min: 0, max: 10 },
    description: 'Patient-reported medication effectiveness (0-10)'
  },
  'no_assessment_for': {
    label: 'No Assessment For',
    type: 'duration',
    operators: ['greater_than', 'greater_than_or_equal'],
    thresholdRange: { min: 1, max: 168 },
    units: ['hours', 'days'],
    description: 'Time since last patient assessment'
  },
  'missed_medication_doses': {
    label: 'Missed Medication Doses',
    type: 'numeric',
    operators: ['greater_than', 'greater_than_or_equal', 'equal'],
    thresholdRange: { min: 1, max: 20 },
    description: 'Number of missed medication doses'
  },
  'mood_scale': {
    label: 'Mood Scale',
    type: 'numeric',
    operators: ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'equal', 'trend_increasing', 'trend_decreasing'],
    thresholdRange: { min: 1, max: 10 },
    description: 'Patient-reported mood level (1-10)'
  },
  'sleep_quality': {
    label: 'Sleep Quality',
    type: 'numeric',
    operators: ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'equal', 'trend_increasing', 'trend_decreasing'],
    thresholdRange: { min: 1, max: 10 },
    description: 'Patient-reported sleep quality (1-10)'
  },
  'activity_level': {
    label: 'Activity Level',
    type: 'numeric',
    operators: ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'equal', 'trend_increasing', 'trend_decreasing'],
    thresholdRange: { min: 1, max: 10 },
    description: 'Patient-reported activity level (1-10)'
  },
  'assessment_completion_rate': {
    label: 'Assessment Completion Rate',
    type: 'percentage',
    operators: ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'equal'],
    thresholdRange: { min: 0, max: 1 },
    description: 'Percentage of assessments completed on time'
  }
};

const RuleBuilder = ({ expression, onChange, onValidate }) => {
  const [condition, setCondition] = useState(expression?.condition || '');
  const [operator, setOperator] = useState(expression?.operator || '');
  const [threshold, setThreshold] = useState(expression?.threshold || '');
  const [value, setValue] = useState(expression?.value || '');
  const [timeWindow, setTimeWindow] = useState(expression?.timeWindow || '');
  const [occurrences, setOccurrences] = useState(expression?.occurrences || '');
  const [consecutiveDays, setConsecutiveDays] = useState(expression?.consecutiveDays || '');
  const [unit, setUnit] = useState(expression?.unit || 'hours');

  // Operator labels
  const operatorLabels = {
    'greater_than': 'Greater than (>)',
    'greater_than_or_equal': 'Greater than or equal (≥)',
    'less_than': 'Less than (<)',
    'less_than_or_equal': 'Less than or equal (≤)',
    'equal': 'Equal to (=)',
    'equals': 'Equal to (=)',
    'not_equal': 'Not equal to (≠)',
    'trend_increasing': 'Trending upward',
    'trend_decreasing': 'Trending downward',
    'missing_data': 'Has missing data',
    'contains': 'Contains'
  };

  // Time window options
  const timeWindowOptions = [
    { value: '1h', label: '1 hour' },
    { value: '6h', label: '6 hours' },
    { value: '12h', label: '12 hours' },
    { value: '24h', label: '24 hours' },
    { value: '2d', label: '2 days' },
    { value: '3d', label: '3 days' },
    { value: '7d', label: '7 days' },
    { value: '14d', label: '14 days' },
    { value: '30d', label: '30 days' }
  ];

  const validateExpression = useCallback((expr) => {
    if (!expr.condition || !expr.operator) return false;
    
    const conditionMeta = conditions[expr.condition];
    if (!conditionMeta) return false;

    // Check if operator is valid for this condition
    if (!conditionMeta.operators.includes(expr.operator)) return false;

    // Check threshold/value requirements
    if (conditionMeta.type === 'categorical') {
      return expr.value && conditionMeta.values.includes(expr.value);
    } else if (conditionMeta.type === 'numeric' || conditionMeta.type === 'percentage' || conditionMeta.type === 'duration') {
      if (expr.operator.includes('trend')) {
        return expr.consecutiveDays > 0;
      } else {
        return expr.threshold !== undefined && expr.threshold >= conditionMeta.thresholdRange.min && expr.threshold <= conditionMeta.thresholdRange.max;
      }
    }

    return true;
  }, []); // Remove conditions dependency since it's now static

  // Update parent component when values change
  useEffect(() => {
    const newExpression = {
      condition,
      operator,
      ...(threshold !== '' && { threshold: parseFloat(threshold) }),
      ...(value !== '' && { value }),
      ...(timeWindow !== '' && { timeWindow }),
      ...(occurrences !== '' && { occurrences: parseInt(occurrences) }),
      ...(consecutiveDays !== '' && { consecutiveDays: parseInt(consecutiveDays) }),
      ...(unit !== 'hours' && { unit })
    };

    onChange(newExpression);
    
    // Validate the expression
    if (onValidate) {
      const isValid = validateExpression(newExpression);
      onValidate(isValid);
    }
  }, [condition, operator, threshold, value, timeWindow, occurrences, consecutiveDays, unit]); // Remove validateExpression from dependencies

  const selectedCondition = conditions[condition];
  const availableOperators = selectedCondition?.operators || [];
  const isTrendOperator = operator.includes('trend');
  const isCategorical = selectedCondition?.type === 'categorical';
  const isDuration = selectedCondition?.type === 'duration';

  const formatThresholdLabel = () => {
    if (!selectedCondition) return 'Threshold';
    
    switch (selectedCondition.type) {
      case 'percentage':
        return 'Threshold (0-100%)';
      case 'duration':
        return `Threshold (${unit})`;
      default:
        return `Threshold (${selectedCondition.thresholdRange?.min}-${selectedCondition.thresholdRange?.max})`;
    }
  };

  const formatThresholdValue = (val) => {
    if (selectedCondition?.type === 'percentage' && val <= 1) {
      return (val * 100).toString();
    }
    return val.toString();
  };

  const parseThresholdValue = (val) => {
    if (selectedCondition?.type === 'percentage') {
      const numVal = parseFloat(val);
      return numVal > 1 ? numVal / 100 : numVal;
    }
    return val;
  };

  return (
    <div className="space-y-6 p-6 bg-gray-50 rounded-lg">
      <div className="text-lg font-semibold text-gray-900 mb-4">Visual Rule Builder</div>
      
      {/* Condition Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          When the following condition occurs:
        </label>
        <select
          value={condition}
          onChange={(e) => {
            setCondition(e.target.value);
            setOperator('');
            setThreshold('');
            setValue('');
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a condition...</option>
          {Object.entries(conditions).map(([key, meta]) => (
            <option key={key} value={key}>{meta.label}</option>
          ))}
        </select>
        {selectedCondition && (
          <p className="text-sm text-gray-600">{selectedCondition.description}</p>
        )}
      </div>

      {/* Operator Selection */}
      {condition && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Comparison operator:
          </label>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an operator...</option>
            {availableOperators.map(op => (
              <option key={op} value={op}>{operatorLabels[op]}</option>
            ))}
          </select>
        </div>
      )}

      {/* Threshold/Value Input */}
      {operator && !isTrendOperator && (
        <div className="space-y-2">
          {isCategorical ? (
            <>
              <label className="block text-sm font-medium text-gray-700">
                Value:
              </label>
              <select
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a value...</option>
                {selectedCondition.values.map(val => (
                  <option key={val} value={val}>{val.replace('_', ' ')}</option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-gray-700">
                {formatThresholdLabel()}:
              </label>
              <div className="flex space-x-2">
                <input
                  type="number"
                  value={selectedCondition?.type === 'percentage' ? formatThresholdValue(threshold) : threshold}
                  onChange={(e) => setThreshold(parseThresholdValue(e.target.value))}
                  min={selectedCondition?.thresholdRange?.min}
                  max={selectedCondition?.type === 'percentage' ? 100 : selectedCondition?.thresholdRange?.max}
                  step={selectedCondition?.type === 'percentage' ? 1 : 0.1}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter threshold value"
                />
                {isDuration && (
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {selectedCondition.units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                )}
                {selectedCondition?.type === 'percentage' && (
                  <span className="flex items-center px-3 py-2 text-gray-500">%</span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Consecutive Days for Trend Operators */}
      {isTrendOperator && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            For how many consecutive days:
          </label>
          <input
            type="number"
            value={consecutiveDays}
            onChange={(e) => setConsecutiveDays(e.target.value)}
            min="1"
            max="30"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter number of days"
          />
        </div>
      )}

      {/* Time Window */}
      {operator && !isTrendOperator && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Time window (optional):
          </label>
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">No specific time window</option>
            {timeWindowOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Occurrences */}
      {operator && !isTrendOperator && !isCategorical && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Number of occurrences (optional):
          </label>
          <input
            type="number"
            value={occurrences}
            onChange={(e) => setOccurrences(e.target.value)}
            min="1"
            max="20"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Leave empty for any occurrence"
          />
        </div>
      )}

      {/* Preview */}
      {condition && operator && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Rule Preview:</h4>
          <p className="text-sm text-blue-800">
            {formatExpressionPreview()}
          </p>
        </div>
      )}
    </div>
  );

  function formatExpressionPreview() {
    const conditionName = selectedCondition?.label || condition;
    const operatorName = operatorLabels[operator] || operator;
    
    if (condition === 'no_assessment_for') {
      return `Alert when no assessment for ${threshold || 'X'}+ ${unit}`;
    }
    
    if (isCategorical && value) {
      let result = `Alert when ${conditionName} ${operatorName} "${value}"`;
      if (occurrences) result += ` (${occurrences} times)`;
      return result;
    }
    
    if (isTrendOperator) {
      return `Alert when ${conditionName} is ${operatorName} for ${consecutiveDays || 'X'} consecutive days`;
    }
    
    let result = `Alert when ${conditionName} ${operatorName} ${threshold || 'X'}`;
    if (selectedCondition?.type === 'percentage' && threshold <= 1) {
      result = `Alert when ${conditionName} ${operatorName} ${(threshold * 100).toFixed(0)}%`;
    }
    if (timeWindow) result += ` (over ${timeWindow})`;
    if (occurrences) result += ` (${occurrences} times)`;
    
    return result;
  }
};

export default RuleBuilder;