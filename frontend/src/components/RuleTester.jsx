import React, { useState } from 'react';
import { PlayIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const RuleTester = ({ rule, onTest }) => {
  const [testData, setTestData] = useState({});
  const [testResult, setTestResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Sample test scenarios based on rule condition
  const getTestScenarios = (condition) => {
    const scenarios = {
      'pain_scale_0_10': [
        { name: 'Low Pain', data: { pain_scale_0_10: 2 } },
        { name: 'Moderate Pain', data: { pain_scale_0_10: 5 } },
        { name: 'High Pain', data: { pain_scale_0_10: 8 } },
        { name: 'Maximum Pain', data: { pain_scale_0_10: 10 } }
      ],
      'medication_adherence_rate': [
        { name: 'Perfect Adherence', data: { medication_adherence_rate: 1.0 } },
        { name: 'Good Adherence', data: { medication_adherence_rate: 0.85 } },
        { name: 'Poor Adherence', data: { medication_adherence_rate: 0.6 } },
        { name: 'Very Poor Adherence', data: { medication_adherence_rate: 0.3 } }
      ],
      'side_effects_severity': [
        { name: 'No Side Effects', data: { side_effects_severity: 0 } },
        { name: 'Mild Side Effects', data: { side_effects_severity: 3 } },
        { name: 'Moderate Side Effects', data: { side_effects_severity: 6 } },
        { name: 'Severe Side Effects', data: { side_effects_severity: 9 } }
      ],
      'mood_scale': [
        { name: 'Very Low Mood', data: { mood_scale: 2 } },
        { name: 'Low Mood', data: { mood_scale: 4 } },
        { name: 'Normal Mood', data: { mood_scale: 6 } },
        { name: 'Good Mood', data: { mood_scale: 8 } }
      ],
      'sleep_quality': [
        { name: 'Poor Sleep', data: { sleep_quality: 2 } },
        { name: 'Fair Sleep', data: { sleep_quality: 4 } },
        { name: 'Good Sleep', data: { sleep_quality: 7 } },
        { name: 'Excellent Sleep', data: { sleep_quality: 9 } }
      ],
      'no_assessment_for': [
        { name: '12 Hours', data: { hours_since_assessment: 12 } },
        { name: '24 Hours', data: { hours_since_assessment: 24 } },
        { name: '48 Hours', data: { hours_since_assessment: 48 } },
        { name: '72 Hours', data: { hours_since_assessment: 72 } }
      ]
    };

    return scenarios[condition] || [
      { name: 'Custom Test', data: {} }
    ];
  };

  const testRule = async (scenario = null) => {
    setIsLoading(true);
    setTestResult(null);

    try {
      const dataToTest = scenario ? scenario.data : testData;
      
      // Simulate rule evaluation
      const result = evaluateRule(rule, dataToTest);
      
      setTestResult({
        triggered: result.triggered,
        reason: result.reason,
        data: dataToTest,
        scenarioName: scenario?.name || 'Custom Test',
        timestamp: new Date().toISOString()
      });

      if (onTest) {
        onTest(result);
      }
    } catch (error) {
      setTestResult({
        triggered: false,
        reason: `Error: ${error.message}`,
        data: testData,
        scenarioName: scenario?.name || 'Custom Test',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Simple rule evaluation logic (client-side simulation)
  const evaluateRule = (rule, data) => {
    if (!rule?.expression) {
      return { triggered: false, reason: 'No rule expression defined' };
    }

    const { condition, operator, threshold, value, consecutiveDays } = rule.expression;

    if (!condition || !operator) {
      return { triggered: false, reason: 'Incomplete rule expression' };
    }

    const dataValue = data[condition] || data[condition.replace('_', '')];

    if (dataValue === undefined) {
      return { triggered: false, reason: `No data provided for condition: ${condition}` };
    }

    let triggered = false;
    let reason = '';

    // Handle special cases
    if (condition === 'no_assessment_for') {
      const hoursValue = data.hours_since_assessment || 0;
      triggered = evaluateComparison(hoursValue, operator, threshold);
      reason = triggered 
        ? `No assessment for ${hoursValue} hours (threshold: ${threshold})`
        : `Assessment within threshold (${hoursValue} hours)`;
    } else if (operator === 'equals' && value !== undefined) {
      triggered = dataValue === value;
      reason = triggered 
        ? `Value "${dataValue}" matches expected "${value}"`
        : `Value "${dataValue}" does not match expected "${value}"`;
    } else if (operator.includes('trend')) {
      // For trend operators, we'd need historical data
      // For testing purposes, we'll simulate based on consecutive days
      triggered = consecutiveDays ? consecutiveDays >= 3 : false;
      reason = triggered 
        ? `Trend condition met (${consecutiveDays} consecutive days)`
        : 'Trend condition not met (insufficient consecutive days)';
    } else {
      triggered = evaluateComparison(dataValue, operator, threshold);
      reason = triggered 
        ? `${condition}: ${dataValue} ${operator} ${threshold}`
        : `${condition}: ${dataValue} does not meet ${operator} ${threshold}`;
    }

    return { triggered, reason };
  };

  const evaluateComparison = (value, operator, threshold) => {
    switch (operator) {
      case 'greater_than':
        return value > threshold;
      case 'greater_than_or_equal':
        return value >= threshold;
      case 'less_than':
        return value < threshold;
      case 'less_than_or_equal':
        return value <= threshold;
      case 'equal':
      case 'equals':
        return value === threshold;
      case 'not_equal':
        return value !== threshold;
      default:
        return false;
    }
  };

  const scenarios = rule?.expression?.condition ? getTestScenarios(rule.expression.condition) : [];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Rule Testing</h3>
        <div className="flex items-center text-sm text-gray-500">
          <ClockIcon className="h-4 w-4 mr-1" />
          Test rule behavior with sample data
        </div>
      </div>

      {/* Quick Test Scenarios */}
      {scenarios.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Test Scenarios</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {scenarios.map((scenario, index) => (
              <button
                key={index}
                onClick={() => testRule(scenario)}
                disabled={isLoading}
                className="p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                <div className="font-medium text-sm text-gray-900">{scenario.name}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {Object.entries(scenario.data).map(([key, value]) => (
                    <div key={key}>{key}: {value}</div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Custom Test Data */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Test Data</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rule?.expression?.condition && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {rule.expression.condition.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </label>
              <input
                type="number"
                step="0.1"
                value={testData[rule.expression.condition] || ''}
                onChange={(e) => setTestData({
                  ...testData,
                  [rule.expression.condition]: parseFloat(e.target.value) || 0
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter test value"
              />
            </div>
          )}
          
          {rule?.expression?.condition === 'no_assessment_for' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hours Since Assessment
              </label>
              <input
                type="number"
                value={testData.hours_since_assessment || ''}
                onChange={(e) => setTestData({
                  ...testData,
                  hours_since_assessment: parseInt(e.target.value) || 0
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter hours"
              />
            </div>
          )}
        </div>
        
        <button
          onClick={() => testRule()}
          disabled={isLoading}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          <PlayIcon className="h-4 w-4 mr-2" />
          {isLoading ? 'Testing...' : 'Test Rule'}
        </button>
      </div>

      {/* Test Results */}
      {testResult && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Test Results</h4>
          <div className={`p-4 rounded-lg ${
            testResult.triggered 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center mb-2">
              {testResult.triggered ? (
                <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
              ) : (
                <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
              )}
              <span className={`font-medium ${
                testResult.triggered ? 'text-red-800' : 'text-green-800'
              }`}>
                {testResult.triggered ? 'Alert Triggered' : 'No Alert'}
              </span>
              <span className="ml-2 text-sm text-gray-500">
                ({testResult.scenarioName})
              </span>
            </div>
            
            <p className={`text-sm ${
              testResult.triggered ? 'text-red-700' : 'text-green-700'
            }`}>
              {testResult.reason}
            </p>
            
            <div className="mt-3 text-xs text-gray-600">
              <strong>Test Data:</strong> {JSON.stringify(testResult.data, null, 2)}
            </div>
            
            <div className="mt-1 text-xs text-gray-500">
              Tested at: {new Date(testResult.timestamp).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RuleTester;