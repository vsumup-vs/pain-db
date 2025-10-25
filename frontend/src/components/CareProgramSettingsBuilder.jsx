import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import api from '../services/api';

/**
 * Visual Care Program Settings Builder
 * Allows non-technical users to configure care program settings through a UI
 * Generates JSON settings object automatically
 */

// Common CPT codes for billing programs
const CPT_CODE_OPTIONS = [
  // RPM codes
  { code: '99453', label: '99453 - RPM Setup' },
  { code: '99454', label: '99454 - RPM Device Supply' },
  { code: '99457', label: '99457 - RPM First 20 min' },
  { code: '99458', label: '99458 - RPM Additional 20 min' },

  // RTM codes
  { code: '98975', label: '98975 - RTM Setup' },
  { code: '98976', label: '98976 - RTM Device Supply' },
  { code: '98977', label: '98977 - RTM First 20 min' },
  { code: '98980', label: '98980 - RTM Additional 20 min (respiratory)' },
  { code: '98981', label: '98981 - RTM Additional 20 min (musculoskeletal)' },

  // CCM codes
  { code: '99490', label: '99490 - CCM First 20 min' },
  { code: '99439', label: '99439 - CCM Additional 20 min' },
  { code: '99491', label: '99491 - Complex CCM 30 min' }
];

// Assessment frequency options
const ASSESSMENT_FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'as_needed', label: 'As Needed' }
];

// Relevant metrics by program type (metric keys)
const RELEVANT_METRICS_BY_TYPE = {
  PAIN_MANAGEMENT: [
    'pain_scale_0_10', 'pain_location', 'pain_quality', 'pain_interference_daily_activities',
    'pain_interference_social_activities', 'pain_interference_sleep', 'pain_duration',
    'mood', 'sleep_quality', 'fatigue', 'activity_level'
  ],
  DIABETES: [
    'blood_glucose', 'hba1c', 'weight', 'blood_pressure_systolic', 'blood_pressure_diastolic',
    'activity_level', 'diet_adherence', 'medication_adherence', 'hypoglycemia_episodes'
  ],
  HYPERTENSION: [
    'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 'weight',
    'sodium_intake', 'activity_level', 'medication_adherence', 'headache', 'dizziness'
  ],
  HEART_FAILURE: [
    'weight', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
    'oxygen_saturation', 'edema', 'dyspnea', 'fatigue', 'activity_level', 'medication_adherence'
  ],
  COPD: [
    'oxygen_saturation', 'respiratory_rate', 'dyspnea', 'cough', 'sputum_production',
    'wheezing', 'activity_level', 'medication_adherence', 'peak_flow', 'fev1'
  ],
  GENERAL_WELLNESS: [
    'weight', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
    'activity_level', 'sleep_quality', 'mood', 'stress_level'
  ]
};

const CareProgramSettingsBuilder = ({ settings, programType, onChange, showJson = false }) => {
  // Ref to track if we're syncing from props (prevents infinite loop)
  const isSyncingFromProps = useRef(false);

  // Fetch available metrics from API
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['metric-definitions'],
    queryFn: async () => {
      const response = await api.getMetricDefinitions({
        limit: 100  // Backend max limit is 100
        // Note: MetricDefinition doesn't have isActive field
      });
      return response;  // API interceptor already extracts response.data
    },
    staleTime: 5 * 60 * 1000,  // Cache for 5 minutes
  });

  // Fetch available condition presets from API
  const { data: presetsData, isLoading: presetsLoading } = useQuery({
    queryKey: ['condition-presets'],
    queryFn: async () => {
      const response = await api.getConditionPresets({
        limit: 100,  // Backend max limit is 100
        isActive: 'true'  // Only active presets
      });
      return response;  // API interceptor already extracts response.data
    },
    staleTime: 5 * 60 * 1000,  // Cache for 5 minutes
  });

  // Extract metric keys from API response
  const availableMetrics = metricsData?.data?.map(metric => metric.key) || [];

  // Extract presets from API response
  const availablePresets = presetsData?.data || [];

  // State for showing all metrics vs relevant only
  const [showAllMetrics, setShowAllMetrics] = useState(false);

  // Get relevant metrics for this program type
  const relevantMetrics = programType ? RELEVANT_METRICS_BY_TYPE[programType] || [] : [];

  // Filter metrics to show based on selection
  const displayedMetrics = showAllMetrics || !programType || relevantMetrics.length === 0
    ? availableMetrics  // Show all if toggle is on, no program type, or no relevant metrics defined
    : availableMetrics.filter(metric => relevantMetrics.includes(metric));  // Show only relevant

  // Initialize state from existing settings or defaults
  const [billingEnabled, setBillingEnabled] = useState(
    settings?.billing !== undefined && settings?.billing !== null
  );
  const [selectedCptCodes, setSelectedCptCodes] = useState(
    settings?.billing?.cptCodes || []
  );
  const [billingRequirements, setBillingRequirements] = useState({
    setupTime: settings?.billing?.requirements?.setupTime || 20,
    deviceReadings: settings?.billing?.requirements?.deviceReadings || 16,
    clinicalTime: settings?.billing?.requirements?.clinicalTime || 20
  });
  const [requiredMetrics, setRequiredMetrics] = useState(
    settings?.requiredMetrics || []
  );
  const [assessmentFrequency, setAssessmentFrequency] = useState(
    settings?.assessmentFrequency || 'weekly'
  );
  const [customSettings, setCustomSettings] = useState(
    settings?.custom || {}
  );

  // Preset configuration state
  const [defaultPresetId, setDefaultPresetId] = useState(
    settings?.presetConfiguration?.defaultPresetId || ''
  );
  const [allowOverride, setAllowOverride] = useState(
    settings?.presetConfiguration?.allowOverride ?? true
  );
  const [recommendedPresetIds, setRecommendedPresetIds] = useState(
    settings?.presetConfiguration?.recommendedPresetIds || []
  );

  // Sync state when settings prop changes (for editing existing programs)
  useEffect(() => {
    if (settings) {
      // Set flag to prevent the onChange useEffect from firing during sync
      isSyncingFromProps.current = true;

      setBillingEnabled(settings?.billing !== undefined && settings?.billing !== null);
      setSelectedCptCodes(settings?.billing?.cptCodes || []);
      setBillingRequirements({
        setupTime: settings?.billing?.requirements?.setupTime || 20,
        deviceReadings: settings?.billing?.requirements?.deviceReadings || 16,
        clinicalTime: settings?.billing?.requirements?.clinicalTime || 20
      });
      setRequiredMetrics(settings?.requiredMetrics || []);
      setAssessmentFrequency(settings?.assessmentFrequency || 'weekly');
      setCustomSettings(settings?.custom || {});
      setDefaultPresetId(settings?.presetConfiguration?.defaultPresetId || '');
      setAllowOverride(settings?.presetConfiguration?.allowOverride ?? true);
      setRecommendedPresetIds(settings?.presetConfiguration?.recommendedPresetIds || []);

      // Reset flag after state updates complete (use setTimeout to ensure all state updates have processed)
      setTimeout(() => {
        isSyncingFromProps.current = false;
      }, 0);
    }
  }, [settings]);

  // Update parent component whenever settings change
  useEffect(() => {
    // Skip onChange call if we're currently syncing from props (prevents infinite loop)
    if (isSyncingFromProps.current) {
      return;
    }

    const newSettings = {};

    if (billingEnabled) {
      newSettings.billing = {
        cptCodes: selectedCptCodes,
        requirements: billingRequirements
      };
    }

    if (requiredMetrics.length > 0) {
      newSettings.requiredMetrics = requiredMetrics;
    }

    if (assessmentFrequency) {
      newSettings.assessmentFrequency = assessmentFrequency;
    }

    if (Object.keys(customSettings).length > 0) {
      newSettings.custom = customSettings;
    }

    // Add preset configuration if any values are set
    if (defaultPresetId || !allowOverride || recommendedPresetIds.length > 0) {
      newSettings.presetConfiguration = {
        defaultPresetId: defaultPresetId || null,
        allowOverride: allowOverride,
        recommendedPresetIds: recommendedPresetIds
      };
    }

    onChange(newSettings);
  }, [billingEnabled, selectedCptCodes, billingRequirements, requiredMetrics, assessmentFrequency, customSettings, defaultPresetId, allowOverride, recommendedPresetIds, onChange]);

  const handleCptCodeChange = (code) => {
    setSelectedCptCodes(prev => {
      if (prev.includes(code)) {
        return prev.filter(c => c !== code);
      } else {
        return [...prev, code];
      }
    });
  };

  const handleMetricChange = (metric) => {
    setRequiredMetrics(prev => {
      if (prev.includes(metric)) {
        return prev.filter(m => m !== metric);
      } else {
        return [...prev, metric];
      }
    });
  };

  const handleRecommendedPresetChange = (presetId) => {
    setRecommendedPresetIds(prev => {
      if (prev.includes(presetId)) {
        return prev.filter(id => id !== presetId);
      } else {
        return [...prev, presetId];
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-sm font-medium text-gray-700 mb-4">
        Configure care program settings using the options below
      </div>

      {/* Billing Settings Section */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-md font-semibold text-gray-900">Billing Settings</h3>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={billingEnabled}
              onChange={(e) => setBillingEnabled(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">Enable billing</span>
          </label>
        </div>

        {billingEnabled && (
          <div className="space-y-4">
            {/* CPT Codes Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CPT Codes
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {CPT_CODE_OPTIONS.map(option => (
                  <label key={option.code} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCptCodes.includes(option.code)}
                      onChange={() => handleCptCodeChange(option.code)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
              {selectedCptCodes.length > 0 && (
                <p className="mt-2 text-xs text-gray-500">
                  Selected: {selectedCptCodes.join(', ')}
                </p>
              )}
            </div>

            {/* Billing Requirements */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Setup Time (minutes)
                </label>
                <input
                  type="number"
                  value={billingRequirements.setupTime}
                  onChange={(e) => setBillingRequirements({
                    ...billingRequirements,
                    setupTime: parseInt(e.target.value) || 0
                  })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Device Readings (days/month)
                </label>
                <input
                  type="number"
                  value={billingRequirements.deviceReadings}
                  onChange={(e) => setBillingRequirements({
                    ...billingRequirements,
                    deviceReadings: parseInt(e.target.value) || 0
                  })}
                  min="0"
                  max="31"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Clinical Time (minutes/month)
                </label>
                <input
                  type="number"
                  value={billingRequirements.clinicalTime}
                  onChange={(e) => setBillingRequirements({
                    ...billingRequirements,
                    clinicalTime: parseInt(e.target.value) || 0
                  })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Clinical Settings Section */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-md font-semibold text-gray-900 mb-4">Clinical Settings</h3>

        <div className="space-y-4">
          {/* Required Metrics */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Required Metrics
                {programType && relevantMetrics.length > 0 && !showAllMetrics && (
                  <span className="ml-2 text-xs text-gray-500">
                    ({displayedMetrics.length} relevant of {availableMetrics.length} total)
                  </span>
                )}
              </label>
              {programType && relevantMetrics.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllMetrics(!showAllMetrics)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {showAllMetrics ? '← Show relevant only' : 'Show all metrics →'}
                </button>
              )}
            </div>
            {metricsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 animate-pulse rounded"></div>
                ))}
              </div>
            ) : displayedMetrics.length === 0 ? (
              <div className="text-sm text-gray-500 italic">
                No metrics available. Please add metrics in the Metric Definitions page.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {displayedMetrics.map(metric => (
                  <label key={metric} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requiredMetrics.includes(metric)}
                      onChange={() => handleMetricChange(metric)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">
                      {metric.replace(/_/g, ' ')}
                    </span>
                  </label>
                ))}
              </div>
            )}
            {requiredMetrics.length > 0 && (
              <p className="mt-2 text-xs text-gray-500">
                {requiredMetrics.length} metric{requiredMetrics.length !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>

          {/* Assessment Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assessment Frequency
            </label>
            <select
              value={assessmentFrequency}
              onChange={(e) => setAssessmentFrequency(e.target.value)}
              className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              {ASSESSMENT_FREQUENCY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Condition Preset Configuration Section */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <h3 className="text-md font-semibold text-gray-900 mb-4">Condition Preset Configuration</h3>
        <div className="text-sm text-gray-600 mb-4">
          Configure which condition presets are available for this care program during patient enrollment
        </div>

        <div className="space-y-4">
          {/* Default Preset Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Condition Preset
            </label>
            {presetsLoading ? (
              <div className="h-10 bg-gray-200 animate-pulse rounded"></div>
            ) : availablePresets.length === 0 ? (
              <div className="text-sm text-gray-500 italic">
                No condition presets available. Please create presets first.
              </div>
            ) : (
              <select
                value={defaultPresetId}
                onChange={(e) => setDefaultPresetId(e.target.value)}
                className="w-full md:w-2/3 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">No default preset (choose at enrollment)</option>
                {availablePresets.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} - {preset.category}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-1 text-xs text-gray-500">
              If set, this preset will be pre-selected when enrolling patients in this program
            </p>
          </div>

          {/* Allow Override Checkbox */}
          {defaultPresetId && (
            <div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowOverride}
                  onChange={(e) => setAllowOverride(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Allow clinicians to override default preset during enrollment
                </span>
              </label>
              <p className="mt-1 ml-6 text-xs text-gray-500">
                {allowOverride
                  ? 'Clinicians can choose a different preset when enrolling patients'
                  : 'Default preset is locked - clinicians cannot change it (recommended for standardized programs like RPM/RTM/CCM)'}
              </p>
            </div>
          )}

          {/* Recommended Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recommended Presets (Optional)
            </label>
            {presetsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 animate-pulse rounded"></div>
                ))}
              </div>
            ) : availablePresets.length === 0 ? (
              <div className="text-sm text-gray-500 italic">
                No condition presets available.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {availablePresets.map(preset => (
                    <label key={preset.id} className="flex items-center p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={recommendedPresetIds.includes(preset.id)}
                        onChange={() => handleRecommendedPresetChange(preset.id)}
                        disabled={preset.id === defaultPresetId}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <span className={`ml-2 text-sm ${preset.id === defaultPresetId ? 'text-gray-400' : 'text-gray-700'}`}>
                        {preset.name} - {preset.category}
                      </span>
                    </label>
                  ))}
                </div>
                {recommendedPresetIds.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    {recommendedPresetIds.length} preset{recommendedPresetIds.length !== 1 ? 's' : ''} recommended. {allowOverride ? 'Clinicians can choose from these during enrollment.' : 'Only the default preset will be used.'}
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  {recommendedPresetIds.length > 0
                    ? 'When set, only these presets (plus the default) will be available during enrollment'
                    : 'If no recommendations are set, all presets will be available during enrollment'}
                </p>
              </>
            )}
          </div>
        </div>
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
              <pre className="text-xs text-green-400 font-mono overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify({
                  ...(billingEnabled && {
                    billing: {
                      cptCodes: selectedCptCodes,
                      requirements: billingRequirements
                    }
                  }),
                  ...(requiredMetrics.length > 0 && { requiredMetrics }),
                  ...(assessmentFrequency && { assessmentFrequency }),
                  ...((defaultPresetId || !allowOverride || recommendedPresetIds.length > 0) && {
                    presetConfiguration: {
                      defaultPresetId: defaultPresetId || null,
                      allowOverride,
                      recommendedPresetIds
                    }
                  }),
                  ...(Object.keys(customSettings).length > 0 && { custom: customSettings })
                }, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}

      {/* Helper text */}
      <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="font-medium text-blue-900 mb-1">💡 How settings work:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-800">
          <li><strong>Billing settings</strong> control which CPT codes can be billed and the requirements to meet</li>
          <li><strong>Required metrics</strong> determine which data points must be tracked for this program</li>
          <li><strong>Assessment frequency</strong> sets how often patients complete assessments</li>
          <li><strong>Preset configuration</strong> streamlines enrollment by pre-selecting or restricting condition presets (recommended for standardized RPM/RTM/CCM programs)</li>
          <li>All settings are optional - configure only what you need</li>
        </ul>
      </div>
    </div>
  );
};

export default CareProgramSettingsBuilder;
