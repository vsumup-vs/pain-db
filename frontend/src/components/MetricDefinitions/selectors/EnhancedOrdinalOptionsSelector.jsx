import React, { useState } from 'react'
import {
  SparklesIcon,
  ChevronDownIcon,
  HeartIcon,
  BoltIcon,
  BeakerIcon,
  ChartBarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  NumberedListIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

export default function EnhancedOrdinalOptionsSelector({ value, onChange }) {
  const [showStandardOptions, setShowStandardOptions] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  // Standard ordinal option templates - COMPREHENSIVE RTM COVERAGE
  const standardTemplates = {
    // === PAIN MANAGEMENT RTM ===
    'pain-severity': {
      name: 'Pain Severity Scale',
      description: 'Standard 0-10 pain severity scale',
      icon: HeartIcon,
      color: 'text-red-600',
      bg: 'bg-red-50',
      category: 'Pain Management',
      options: [
        'No Pain (0)',
        'Mild Pain (1-3)',
        'Moderate Pain (4-6)', 
        'Severe Pain (7-10)'
      ]
    },
    'functional-disability': {
      name: 'Functional Disability Level',
      description: 'Oswestry-style functional assessment',
      icon: HeartIcon,
      color: 'text-red-500',
      bg: 'bg-red-50',
      category: 'Pain Management',
      options: [
        'No disability (0-20%)',
        'Mild disability (21-40%)',
        'Moderate disability (41-60%)',
        'Severe disability (61-80%)',
        'Complete disability (81-100%)'
      ]
    },
    'pain-interference': {
      name: 'Pain Interference Scale',
      description: 'How pain interferes with activities',
      icon: BoltIcon,
      color: 'text-red-400',
      bg: 'bg-red-50',
      category: 'Pain Management',
      options: [
        'Does not interfere',
        'Interferes a little',
        'Interferes moderately',
        'Interferes quite a bit',
        'Completely interferes'
      ]
    },
    'medication-effectiveness': {
      name: 'Medication Effectiveness',
      description: 'How well medication is working',
      icon: BeakerIcon,
      color: 'text-red-300',
      bg: 'bg-red-50',
      category: 'Pain Management',
      options: [
        'Not effective at all',
        'Slightly effective',
        'Moderately effective',
        'Very effective',
        'Completely effective'
      ]
    },

    // === DIABETES MANAGEMENT RTM ===
    'blood-glucose-ranges': {
      name: 'Blood Glucose Ranges',
      description: 'Standard diabetes glucose categories',
      icon: ChartBarIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      category: 'Diabetes Management',
      options: [
        'Very Low (<70 mg/dL)',
        'Low (70-99 mg/dL)',
        'Normal (100-125 mg/dL)',
        'High (126-179 mg/dL)',
        'Very High (≥180 mg/dL)'
      ]
    },
    'hba1c-categories': {
      name: 'HbA1c Categories',
      description: 'Diabetes control assessment',
      icon: ChartBarIcon,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      category: 'Diabetes Management',
      options: [
        'Excellent control (<7%)',
        'Good control (7-7.9%)',
        'Fair control (8-8.9%)',
        'Poor control (9-9.9%)',
        'Very poor control (≥10%)'
      ]
    },
    'diabetes-selfcare': {
      name: 'Diabetes Self-Care Frequency',
      description: 'SDSCA-based frequency scale',
      icon: CalendarIcon,
      color: 'text-blue-400',
      bg: 'bg-blue-50',
      category: 'Diabetes Management',
      options: [
        'Never (0 days)',
        'Rarely (1-2 days)',
        'Sometimes (3-4 days)',
        'Often (5-6 days)',
        'Always (7 days)'
      ]
    },
    'hypoglycemia-severity': {
      name: 'Hypoglycemia Severity',
      description: 'Low blood sugar episode severity',
      icon: ExclamationTriangleIcon,
      color: 'text-blue-300',
      bg: 'bg-blue-50',
      category: 'Diabetes Management',
      options: [
        'Mild (self-treated)',
        'Moderate (assistance needed)',
        'Severe (medical intervention)',
        'Emergency (hospitalization)'
      ]
    },

    // === CARDIOVASCULAR RTM ===
    'blood-pressure-categories': {
      name: 'Blood Pressure Categories',
      description: 'AHA blood pressure classification',
      icon: HeartIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      category: 'Cardiovascular',
      options: [
        'Normal (<120/80)',
        'Elevated (120-129/<80)',
        'Stage 1 HTN (130-139/80-89)',
        'Stage 2 HTN (≥140/90)',
        'Hypertensive Crisis (>180/120)'
      ]
    },
    'heart-rate-zones': {
      name: 'Heart Rate Zones',
      description: 'Exercise heart rate categories',
      icon: BoltIcon,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
      category: 'Cardiovascular',
      options: [
        'Resting (50-60 bpm)',
        'Light activity (60-70% max)',
        'Moderate activity (70-85% max)',
        'Vigorous activity (85-95% max)',
        'Maximum effort (95-100% max)'
      ]
    },
    'chest-pain-severity': {
      name: 'Chest Pain Severity',
      description: 'Cardiac symptom assessment',
      icon: ExclamationCircleIcon,
      color: 'text-purple-400',
      bg: 'bg-purple-50',
      category: 'Cardiovascular',
      options: [
        'No chest pain',
        'Mild discomfort',
        'Moderate pain',
        'Severe pain',
        'Emergency - call 911'
      ]
    },
    'exercise-tolerance': {
      name: 'Exercise Tolerance',
      description: 'Physical activity capacity',
      icon: BoltIcon,
      color: 'text-purple-300',
      bg: 'bg-purple-50',
      category: 'Cardiovascular',
      options: [
        'Unable to exercise',
        'Light activity only',
        'Moderate activity tolerated',
        'Good exercise tolerance',
        'Excellent fitness level'
      ]
    },

    // === MENTAL HEALTH RTM ===
    'phq9': {
      name: 'PHQ-9 Response Scale',
      description: 'Standard PHQ-9 depression screening responses',
      icon: BeakerIcon,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
      category: 'Mental Health',
      options: [
        'Not at all',
        'Several days',
        'More than half the days',
        'Nearly every day'
      ]
    },
    'gad7': {
      name: 'GAD-7 Response Scale',
      description: 'Standard GAD-7 anxiety screening responses',
      icon: BeakerIcon,
      color: 'text-teal-500',
      bg: 'bg-teal-50',
      category: 'Mental Health',
      options: [
        'Not at all',
        'Several days',
        'More than half the days',
        'Nearly every day'
      ]
    },
    'mood-tracking': {
      name: 'Mood Tracking Scale',
      description: 'Daily mood assessment',
      icon: HeartIcon,
      color: 'text-teal-400',
      bg: 'bg-teal-50',
      category: 'Mental Health',
      options: [
        'Very depressed',
        'Somewhat depressed',
        'Neutral',
        'Somewhat happy',
        'Very happy'
      ]
    },
    'sleep-quality': {
      name: 'Sleep Quality Scale',
      description: 'Sleep assessment for mental health',
      icon: ClockIcon,
      color: 'text-teal-300',
      bg: 'bg-teal-50',
      category: 'Mental Health',
      options: [
        'Very poor sleep',
        'Poor sleep',
        'Fair sleep',
        'Good sleep',
        'Excellent sleep'
      ]
    },
    'ptsd-severity': {
      name: 'PTSD Symptom Severity',
      description: 'PTSD symptom intensity scale',
      icon: ShieldCheckIcon,
      color: 'text-teal-200',
      bg: 'bg-teal-50',
      category: 'Mental Health',
      options: [
        'Not at all',
        'A little bit',
        'Moderately',
        'Quite a bit',
        'Extremely'
      ]
    },

    // === MEDICATION ADHERENCE RTM ===
    'medication-adherence-detailed': {
      name: 'Detailed Medication Adherence',
      description: 'Comprehensive medication taking patterns',
      icon: ClockIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
      category: 'Medication Management',
      options: [
        'Taken exactly as prescribed',
        'Taken with minor timing variations',
        'Occasionally missed doses',
        'Frequently missed doses',
        'Rarely taking medication'
      ]
    },
    'medication-timing': {
      name: 'Medication Timing',
      description: 'When medication was taken',
      icon: CalendarIcon,
      color: 'text-green-500',
      bg: 'bg-green-50',
      category: 'Medication Management',
      options: [
        'On time',
        '1-2 hours late',
        '3-6 hours late',
        'Next day',
        'Missed completely'
      ]
    },
    'side-effects-severity': {
      name: 'Side Effects Severity',
      description: 'Medication side effect intensity',
      icon: ExclamationTriangleIcon,
      color: 'text-green-400',
      bg: 'bg-green-50',
      category: 'Medication Management',
      options: [
        'No side effects',
        'Mild side effects',
        'Moderate side effects',
        'Severe side effects',
        'Intolerable side effects'
      ]
    },

    // === GENERAL RTM & QUALITY ===
    'frequency': {
      name: 'Frequency Scale',
      description: 'How often something occurs',
      icon: ClockIcon,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      category: 'General',
      options: [
        'Never',
        'Rarely',
        'Sometimes',
        'Often',
        'Always'
      ]
    },
    'severity': {
      name: 'General Severity',
      description: 'General severity assessment',
      icon: ExclamationTriangleIcon,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      category: 'General',
      options: [
        'None',
        'Mild',
        'Moderate',
        'Severe',
        'Very Severe'
      ]
    },
    'agreement': {
      name: 'Agreement Scale',
      description: 'Likert-style agreement scale',
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
      category: 'General',
      options: [
        'Strongly Disagree',
        'Disagree',
        'Neutral',
        'Agree',
        'Strongly Agree'
      ]
    },
    'quality': {
      name: 'Quality Assessment',
      description: 'Quality or satisfaction rating',
      icon: SparklesIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      category: 'General',
      options: [
        'Poor',
        'Fair',
        'Good',
        'Very Good',
        'Excellent'
      ]
    },
    'improvement': {
      name: 'Improvement Scale',
      description: 'Change or improvement assessment',
      icon: ArrowPathIcon,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      category: 'General',
      options: [
        'Much Worse',
        'Worse',
        'No Change',
        'Better',
        'Much Better'
      ]
    },
    'care-satisfaction': {
      name: 'Care Satisfaction',
      description: 'Patient satisfaction with care received',
      icon: HeartIcon,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      category: 'Quality Measures',
      options: [
        'Very dissatisfied',
        'Dissatisfied',
        'Neutral',
        'Satisfied',
        'Very satisfied'
      ]
    },
    'communication-preference': {
      name: 'Communication Preference',
      description: 'Preferred method of provider contact',
      icon: HeartIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      category: 'RTM Operations',
      options: [
        'Phone call',
        'Text message',
        'Email',
        'Video call',
        'In-person visit'
      ]
    },
    'numeric-0-10': {
      name: 'Numeric Scale (0-10)',
      description: 'Simple 0-10 numeric scale',
      icon: NumberedListIcon,
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      category: 'General',
      options: [
        '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'
      ]
    }
  }

  // Group templates by category
  const templatesByCategory = Object.entries(standardTemplates).reduce((acc, [key, template]) => {
    const category = template.category || 'General'
    if (!acc[category]) acc[category] = []
    acc[category].push([key, template])
    return acc
  }, {})

  const handleTemplateSelect = (templateKey) => {
    const template = standardTemplates[templateKey]
    if (template) {
      setSelectedTemplate(templateKey)
      onChange(template.options.join('\n'))
      setShowStandardOptions(false)
    }
  }

  const handleCustomChange = (e) => {
    setSelectedTemplate(null)
    onChange(e.target.value)
  }

  return (
    <div className="space-y-4">
      {/* Standard Options Selector */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            Available Options *
          </label>
          <button
            type="button"
            onClick={() => setShowStandardOptions(!showStandardOptions)}
            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <SparklesIcon className="w-3 h-3 mr-1" />
            {showStandardOptions ? 'Hide' : 'Use'} RTM Standard Options
            <ChevronDownIcon className={`w-3 h-3 ml-1 transition-transform ${showStandardOptions ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Standard Options Grid - Organized by Category */}
        {showStandardOptions && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 max-h-96 overflow-y-auto">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Choose from RTM-Validated Scales:</h5>
            
            {Object.entries(templatesByCategory).map(([category, templates]) => (
              <div key={category} className="mb-6">
                <h6 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2 border-b border-gray-200 pb-1">
                  {category}
                </h6>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map(([key, template]) => {
                    const IconComponent = template.icon
                    const isSelected = selectedTemplate === key
                    
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleTemplateSelect(key)}
                        className={`p-3 text-left border rounded-lg transition-all hover:shadow-sm ${
                          isSelected 
                            ? `border-indigo-300 ${template.bg} ring-2 ring-indigo-200` 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          <IconComponent className={`w-4 h-4 mt-0.5 flex-shrink-0 ${template.color}`} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {template.name}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {template.description}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {template.options.length} options
                            </div>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Custom Options Input */}
        <div>
          <textarea
            value={value || ''}
            onChange={handleCustomChange}
            placeholder="Enter each option on a new line, e.g.:&#10;Never&#10;Rarely&#10;Sometimes&#10;Often&#10;Always"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-vertical"
            rows={6}
            required
          />
          <div className="mt-2 text-xs text-gray-500">
            {selectedTemplate && (
              <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                <SparklesIcon className="w-3 h-3 mr-1" />
                Using: {standardTemplates[selectedTemplate].name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}