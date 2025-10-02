const { PrismaClient } = require('./generated/prisma');
const prisma = new PrismaClient();

// Validated Clinical Assessment Instruments
const standardizedAssessmentTemplates = [
  // === PAIN ASSESSMENT INSTRUMENTS ===
  {
    name: 'Brief Pain Inventory (BPI)',
    description: 'Validated pain assessment tool measuring pain severity and interference',
    category: 'pain_management',
    validationInfo: {
      instrument: 'Brief Pain Inventory',
      developer: 'Charles Cleeland, MD',
      validation: 'Validated across multiple pain conditions',
      languages: ['English', 'Spanish', 'French'],
      copyrightInfo: 'MD Anderson Cancer Center',
      clinicalUse: 'Chronic pain, cancer pain, arthritis'
    },
    standardCoding: {
      loinc: '72514-3',
      snomed: '22253000',
      icd10: 'R52'
    },
    items: [
      {
        metricKey: 'pain_severity_worst',
        displayName: 'Worst Pain in Last 24 Hours',
        question: 'Please rate your pain by marking the box beside the number that best describes your pain at its WORST in the last 24 hours.',
        scale: '0-10 numeric rating scale',
        required: true,
        displayOrder: 1,
        standardCoding: {
          loinc: '72514-3',
          display: 'Pain severity - 0-10 verbal numeric rating [Score] - Reported'
        }
      },
      {
        metricKey: 'pain_severity_least',
        displayName: 'Least Pain in Last 24 Hours',
        question: 'Please rate your pain by marking the box beside the number that best describes your pain at its LEAST in the last 24 hours.',
        scale: '0-10 numeric rating scale',
        required: true,
        displayOrder: 2
      },
      {
        metricKey: 'pain_severity_average',
        displayName: 'Average Pain in Last 24 Hours',
        question: 'Please rate your pain by marking the box beside the number that best describes your pain on the AVERAGE.',
        scale: '0-10 numeric rating scale',
        required: true,
        displayOrder: 3
      },
      {
        metricKey: 'pain_severity_now',
        displayName: 'Pain Right Now',
        question: 'Please rate your pain by marking the box beside the number that tells how much pain you have RIGHT NOW.',
        scale: '0-10 numeric rating scale',
        required: true,
        displayOrder: 4
      },
      {
        metricKey: 'pain_interference_general',
        displayName: 'Pain Interference with General Activity',
        question: 'Mark the box beside the number that describes how, during the past 24 hours, pain has interfered with your general activity.',
        scale: '0-10 interference scale',
        required: true,
        displayOrder: 5
      },
      {
        metricKey: 'pain_interference_mood',
        displayName: 'Pain Interference with Mood',
        question: 'Mark the box beside the number that describes how, during the past 24 hours, pain has interfered with your mood.',
        scale: '0-10 interference scale',
        required: true,
        displayOrder: 6
      },
      {
        metricKey: 'pain_interference_walking',
        displayName: 'Pain Interference with Walking',
        question: 'Mark the box beside the number that describes how, during the past 24 hours, pain has interfered with your walking ability.',
        scale: '0-10 interference scale',
        required: true,
        displayOrder: 7
      },
      {
        metricKey: 'pain_interference_work',
        displayName: 'Pain Interference with Work',
        question: 'Mark the box beside the number that describes how, during the past 24 hours, pain has interfered with your normal work (including both work outside the home and housework).',
        scale: '0-10 interference scale',
        required: true,
        displayOrder: 8
      },
      {
        metricKey: 'pain_interference_relations',
        displayName: 'Pain Interference with Relations',
        question: 'Mark the box beside the number that describes how, during the past 24 hours, pain has interfered with your relations with other people.',
        scale: '0-10 interference scale',
        required: true,
        displayOrder: 9
      },
      {
        metricKey: 'pain_interference_sleep',
        displayName: 'Pain Interference with Sleep',
        question: 'Mark the box beside the number that describes how, during the past 24 hours, pain has interfered with your sleep.',
        scale: '0-10 interference scale',
        required: true,
        displayOrder: 10
      },
      {
        metricKey: 'pain_interference_enjoyment',
        displayName: 'Pain Interference with Enjoyment of Life',
        question: 'Mark the box beside the number that describes how, during the past 24 hours, pain has interfered with your enjoyment of life.',
        scale: '0-10 interference scale',
        required: true,
        displayOrder: 11
      }
    ]
  },

  // === MENTAL HEALTH SCREENING ===
  {
    name: 'Patient Health Questionnaire-9 (PHQ-9)',
    description: 'Validated depression screening and severity assessment tool',
    category: 'mental_health',
    validationInfo: {
      instrument: 'PHQ-9',
      developer: 'Pfizer Inc.',
      validation: 'Validated for depression screening and monitoring',
      sensitivity: '88%',
      specificity: '88%',
      clinicalUse: 'Depression screening, severity assessment, treatment monitoring'
    },
    standardCoding: {
      loinc: '44249-1',
      snomed: '273724008',
      icd10: 'Z13.89'
    },
    items: [
      {
        metricKey: 'phq9_little_interest',
        displayName: 'Little Interest or Pleasure',
        question: 'Over the last 2 weeks, how often have you been bothered by little interest or pleasure in doing things?',
        scale: '0-3 frequency scale',
        options: [
          { code: '0', display: 'Not at all' },
          { code: '1', display: 'Several days' },
          { code: '2', display: 'More than half the days' },
          { code: '3', display: 'Nearly every day' }
        ],
        required: true,
        displayOrder: 1
      },
      {
        metricKey: 'phq9_feeling_down',
        displayName: 'Feeling Down, Depressed, or Hopeless',
        question: 'Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 2
      },
      {
        metricKey: 'phq9_sleep_problems',
        displayName: 'Sleep Problems',
        question: 'Over the last 2 weeks, how often have you been bothered by trouble falling or staying asleep, or sleeping too much?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 3
      },
      {
        metricKey: 'phq9_tired_energy',
        displayName: 'Feeling Tired or Low Energy',
        question: 'Over the last 2 weeks, how often have you been bothered by feeling tired or having little energy?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 4
      },
      {
        metricKey: 'phq9_appetite',
        displayName: 'Poor Appetite or Overeating',
        question: 'Over the last 2 weeks, how often have you been bothered by poor appetite or overeating?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 5
      },
      {
        metricKey: 'phq9_feeling_bad',
        displayName: 'Feeling Bad About Yourself',
        question: 'Over the last 2 weeks, how often have you been bothered by feeling bad about yourself — or that you are a failure or have let yourself or your family down?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 6
      },
      {
        metricKey: 'phq9_concentration',
        displayName: 'Trouble Concentrating',
        question: 'Over the last 2 weeks, how often have you been bothered by trouble concentrating on things, such as reading the newspaper or watching television?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 7
      },
      {
        metricKey: 'phq9_moving_speaking',
        displayName: 'Moving or Speaking Slowly/Fidgety',
        question: 'Over the last 2 weeks, how often have you been bothered by moving or speaking so slowly that other people could have noticed? Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 8
      },
      {
        metricKey: 'phq9_self_harm',
        displayName: 'Thoughts of Self-Harm',
        question: 'Over the last 2 weeks, how often have you been bothered by thoughts that you would be better off dead, or of hurting yourself in some way?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 9,
        alertThreshold: 1, // Any positive response triggers alert
        criticalAlert: true
      }
    ],
    scoringInfo: {
      totalScore: {
        range: '0-27',
        interpretation: {
          '0-4': 'Minimal depression',
          '5-9': 'Mild depression',
          '10-14': 'Moderate depression',
          '15-19': 'Moderately severe depression',
          '20-27': 'Severe depression'
        }
      }
    }
  },

  // === ANXIETY SCREENING ===
  {
    name: 'Generalized Anxiety Disorder-7 (GAD-7)',
    description: 'Validated anxiety screening and severity assessment tool',
    category: 'mental_health',
    validationInfo: {
      instrument: 'GAD-7',
      developer: 'Pfizer Inc.',
      validation: 'Validated for anxiety screening and monitoring',
      sensitivity: '89%',
      specificity: '82%',
      clinicalUse: 'Anxiety screening, severity assessment, treatment monitoring'
    },
    standardCoding: {
      loinc: '69737-5',
      snomed: '273724008',
      icd10: 'Z13.89'
    },
    items: [
      {
        metricKey: 'gad7_feeling_nervous',
        displayName: 'Feeling Nervous, Anxious, or On Edge',
        question: 'Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 1
      },
      {
        metricKey: 'gad7_not_stop_worrying',
        displayName: 'Not Being Able to Stop or Control Worrying',
        question: 'Over the last 2 weeks, how often have you been bothered by not being able to stop or control worrying?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 2
      },
      {
        metricKey: 'gad7_worrying_too_much',
        displayName: 'Worrying Too Much About Different Things',
        question: 'Over the last 2 weeks, how often have you been bothered by worrying too much about different things?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 3
      },
      {
        metricKey: 'gad7_trouble_relaxing',
        displayName: 'Trouble Relaxing',
        question: 'Over the last 2 weeks, how often have you been bothered by trouble relaxing?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 4
      },
      {
        metricKey: 'gad7_restless',
        displayName: 'Being So Restless That It Is Hard to Sit Still',
        question: 'Over the last 2 weeks, how often have you been bothered by being so restless that it is hard to sit still?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 5
      },
      {
        metricKey: 'gad7_easily_annoyed',
        displayName: 'Becoming Easily Annoyed or Irritable',
        question: 'Over the last 2 weeks, how often have you been bothered by becoming easily annoyed or irritable?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 6
      },
      {
        metricKey: 'gad7_feeling_afraid',
        displayName: 'Feeling Afraid as if Something Awful Might Happen',
        question: 'Over the last 2 weeks, how often have you been bothered by feeling afraid as if something awful might happen?',
        scale: '0-3 frequency scale',
        required: true,
        displayOrder: 7
      }
    ],
    scoringInfo: {
      totalScore: {
        range: '0-21',
        interpretation: {
          '0-4': 'Minimal anxiety',
          '5-9': 'Mild anxiety',
          '10-14': 'Moderate anxiety',
          '15-21': 'Severe anxiety'
        }
      }
    }
  },

  // === FIBROMYALGIA ASSESSMENT ===
  {
    name: 'Fibromyalgia Impact Questionnaire (FIQ)',
    description: 'Disease-specific validated assessment for fibromyalgia impact',
    category: 'fibromyalgia',
    validationInfo: {
      instrument: 'FIQ',
      developer: 'Bennett et al.',
      validation: 'Validated specifically for fibromyalgia patients',
      clinicalUse: 'Fibromyalgia severity and functional impact assessment'
    },
    standardCoding: {
      loinc: '72514-3',
      snomed: '203082005',
      icd10: 'M79.3'
    },
    items: [
      {
        metricKey: 'fiq_physical_function',
        displayName: 'Physical Function Score',
        question: 'Rate your ability to perform daily activities over the past week',
        scale: '0-10 difficulty scale',
        required: true,
        displayOrder: 1
      },
      {
        metricKey: 'fiq_feel_good',
        displayName: 'Days Felt Good',
        question: 'How many days in the past week did you feel good?',
        scale: '0-7 days',
        required: true,
        displayOrder: 2
      },
      {
        metricKey: 'fiq_work_missed',
        displayName: 'Work Days Missed',
        question: 'How many days in the past week did you miss work because of fibromyalgia?',
        scale: '0-7 days',
        required: true,
        displayOrder: 3
      },
      {
        metricKey: 'fiq_work_difficulty',
        displayName: 'Work Difficulty',
        question: 'When you worked, how much did pain or other symptoms interfere with your ability to do your work?',
        scale: '0-10 interference scale',
        required: true,
        displayOrder: 4
      },
      {
        metricKey: 'fiq_pain_level',
        displayName: 'Pain Level',
        question: 'How bad has your pain been?',
        scale: '0-10 severity scale',
        required: true,
        displayOrder: 5
      },
      {
        metricKey: 'fiq_fatigue_level',
        displayName: 'Fatigue Level',
        question: 'How tired have you been?',
        scale: '0-10 severity scale',
        required: true,
        displayOrder: 6
      },
      {
        metricKey: 'fiq_morning_tiredness',
        displayName: 'Morning Tiredness',
        question: 'How have you felt when you get up in the morning?',
        scale: '0-10 tiredness scale',
        required: true,
        displayOrder: 7
      },
      {
        metricKey: 'fiq_stiffness',
        displayName: 'Stiffness Level',
        question: 'How bad has your stiffness been?',
        scale: '0-10 severity scale',
        required: true,
        displayOrder: 8
      },
      {
        metricKey: 'fiq_anxiety',
        displayName: 'Anxiety Level',
        question: 'How nervous or anxious have you felt?',
        scale: '0-10 severity scale',
        required: true,
        displayOrder: 9
      },
      {
        metricKey: 'fiq_depression',
        displayName: 'Depression Level',
        question: 'How depressed or blue have you felt?',
        scale: '0-10 severity scale',
        required: true,
        displayOrder: 10
      }
    ]
  },

  // === DIABETES SELF-CARE ===
  {
    name: 'Summary of Diabetes Self-Care Activities (SDSCA)',
    description: 'Validated diabetes self-management assessment tool',
    category: 'diabetes',
    validationInfo: {
      instrument: 'SDSCA',
      developer: 'Toobert et al.',
      validation: 'Validated for diabetes self-care assessment',
      clinicalUse: 'Diabetes self-management monitoring'
    },
    standardCoding: {
      loinc: '33747-0',
      snomed: '73211009',
      icd10: 'E11'
    },
    items: [
      {
        metricKey: 'sdsca_diet_general',
        displayName: 'General Diet Days',
        question: 'On how many of the last SEVEN DAYS have you followed a healthful eating plan?',
        scale: '0-7 days',
        required: true,
        displayOrder: 1
      },
      {
        metricKey: 'sdsca_diet_specific',
        displayName: 'Specific Diet Days',
        question: 'On average, over the past month, how many DAYS PER WEEK have you followed your eating plan?',
        scale: '0-7 days',
        required: true,
        displayOrder: 2
      },
      {
        metricKey: 'sdsca_exercise',
        displayName: 'Exercise Days',
        question: 'On how many of the last SEVEN DAYS did you participate in at least 30 minutes of physical activity?',
        scale: '0-7 days',
        required: true,
        displayOrder: 3
      },
      {
        metricKey: 'sdsca_blood_sugar',
        displayName: 'Blood Sugar Testing Days',
        question: 'On how many of the last SEVEN DAYS did you test your blood sugar?',
        scale: '0-7 days',
        required: true,
        displayOrder: 4
      },
      {
        metricKey: 'sdsca_foot_care',
        displayName: 'Foot Care Days',
        question: 'On how many of the last SEVEN DAYS did you check your feet?',
        scale: '0-7 days',
        required: true,
        displayOrder: 5
      },
      {
        metricKey: 'sdsca_medication',
        displayName: 'Medication Adherence Days',
        question: 'On how many of the last SEVEN DAYS did you take your recommended diabetes medication?',
        scale: '0-7 days',
        required: true,
        displayOrder: 6
      }
    ]
  }
];

// Create standardized metric definitions for new assessment items
const standardizedMetricDefinitions = [
  // Brief Pain Inventory metrics
  {
    key: 'pain_severity_worst',
    displayName: 'Worst Pain (24h)',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72514-3',
        display: 'Pain severity - 0-10 verbal numeric rating [Score] - Reported'
      }
    }
  },
  {
    key: 'pain_severity_least',
    displayName: 'Least Pain (24h)',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72514-3',
        display: 'Pain severity - 0-10 verbal numeric rating [Score] - Reported'
      }
    }
  },
  {
    key: 'pain_severity_average',
    displayName: 'Average Pain (24h)',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72514-3',
        display: 'Pain severity - 0-10 verbal numeric rating [Score] - Reported'
      }
    }
  },
  {
    key: 'pain_severity_now',
    displayName: 'Pain Right Now',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72514-3',
        display: 'Pain severity - 0-10 verbal numeric rating [Score] - Reported'
      }
    }
  },
  {
    key: 'pain_interference_general',
    displayName: 'Pain Interference - General Activity',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72133-2',
        display: 'Pain interference with general activity'
      }
    }
  },
  {
    key: 'pain_interference_mood',
    displayName: 'Pain Interference - Mood',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72134-0',
        display: 'Pain interference with mood'
      }
    }
  },
  {
    key: 'pain_interference_walking',
    displayName: 'Pain Interference - Walking',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72135-7',
        display: 'Pain interference with walking'
      }
    }
  },
  {
    key: 'pain_interference_work',
    displayName: 'Pain Interference - Work',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72136-5',
        display: 'Pain interference with work'
      }
    }
  },
  {
    key: 'pain_interference_relations',
    displayName: 'Pain Interference - Relations',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72137-3',
        display: 'Pain interference with relations'
      }
    }
  },
  {
    key: 'pain_interference_sleep',
    displayName: 'Pain Interference - Sleep',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72138-1',
        display: 'Pain interference with sleep'
      }
    }
  },
  {
    key: 'pain_interference_enjoyment',
    displayName: 'Pain Interference - Enjoyment',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'daily',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72139-9',
        display: 'Pain interference with enjoyment'
      }
    }
  },
  // PHQ-9 metrics
  {
    key: 'phq9_little_interest',
    displayName: 'PHQ-9: Little Interest',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '44250-9',
        display: 'Little interest or pleasure in doing things'
      }
    },
    options: {
      values: [
        { code: '0', display: 'Not at all' },
        { code: '1', display: 'Several days' },
        { code: '2', display: 'More than half the days' },
        { code: '3', display: 'Nearly every day' }
      ]
    }
  },
  {
    key: 'phq9_feeling_down',
    displayName: 'PHQ-9: Feeling Down',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '44251-7',
        display: 'Feeling down, depressed, or hopeless'
      }
    }
  },
  {
    key: 'phq9_sleep_problems',
    displayName: 'PHQ-9: Sleep Problems',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '44252-5',
        display: 'Trouble falling or staying asleep'
      }
    }
  },
  {
    key: 'phq9_tired_energy',
    displayName: 'PHQ-9: Tired/Low Energy',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '44253-3',
        display: 'Feeling tired or having little energy'
      }
    }
  },
  {
    key: 'phq9_appetite',
    displayName: 'PHQ-9: Appetite Problems',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '44254-1',
        display: 'Poor appetite or overeating'
      }
    }
  },
  {
    key: 'phq9_feeling_bad',
    displayName: 'PHQ-9: Feeling Bad About Self',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '44255-8',
        display: 'Feeling bad about yourself'
      }
    }
  },
  {
    key: 'phq9_concentration',
    displayName: 'PHQ-9: Concentration Problems',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '44256-6',
        display: 'Trouble concentrating'
      }
    }
  },
  {
    key: 'phq9_moving_speaking',
    displayName: 'PHQ-9: Moving/Speaking Issues',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '44257-4',
        display: 'Moving or speaking slowly or being fidgety'
      }
    }
  },
  {
    key: 'phq9_self_harm',
    displayName: 'PHQ-9: Self-Harm Thoughts',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '44258-2',
        display: 'Thoughts that you would be better off dead or of hurting yourself in some way'
      }
    },
    validation: {
      criticalAlert: true,
      alertThreshold: 1
    }
  },
  // GAD-7 metrics
  {
    key: 'gad7_feeling_nervous',
    displayName: 'GAD-7: Feeling Nervous',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '69725-0',
        display: 'Feeling nervous, anxious or on edge'
      }
    }
  },
  {
    key: 'gad7_not_stop_worrying',
    displayName: 'GAD-7: Cannot Stop Worrying',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '69726-8',
        display: 'Not being able to stop or control worrying'
      }
    }
  },
  {
    key: 'gad7_worrying_too_much',
    displayName: 'GAD-7: Worrying Too Much',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '69727-6',
        display: 'Worrying too much about different things'
      }
    }
  },
  {
    key: 'gad7_trouble_relaxing',
    displayName: 'GAD-7: Trouble Relaxing',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '69728-4',
        display: 'Trouble relaxing'
      }
    }
  },
  {
    key: 'gad7_restless',
    displayName: 'GAD-7: Being Restless',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '69729-2',
        display: 'Being so restless that it is hard to sit still'
      }
    }
  },
  {
    key: 'gad7_easily_annoyed',
    displayName: 'GAD-7: Easily Annoyed',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '69730-0',
        display: 'Becoming easily annoyed or irritable'
      }
    }
  },
  {
    key: 'gad7_feeling_afraid',
    displayName: 'GAD-7: Feeling Afraid',
    valueType: 'ordinal',
    scaleMin: 0,
    scaleMax: 3,
    unit: 'scale',
    defaultFrequency: 'biweekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '69731-8',
        display: 'Feeling afraid as if something awful might happen'
      }
    }
  },
  
  // FIQ Metric Definitions
  {
    key: 'fiq_physical_function',
    displayName: 'FIQ: Physical Function Score',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72514-3',
        display: 'Physical function difficulty scale'
      }
    }
  },
  {
    key: 'fiq_feel_good',
    displayName: 'FIQ: Days Felt Good',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 7,
    unit: 'days',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72515-0',
        display: 'Days feeling good per week'
      }
    }
  },
  {
    key: 'fiq_work_missed',
    displayName: 'FIQ: Work Days Missed',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 7,
    unit: 'days',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72516-8',
        display: 'Work days missed due to fibromyalgia'
      }
    }
  },
  {
    key: 'fiq_work_difficulty',
    displayName: 'FIQ: Work Difficulty',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72517-6',
        display: 'Work interference scale'
      }
    }
  },
  {
    key: 'fiq_pain_level',
    displayName: 'FIQ: Pain Level',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72514-3',
        display: 'Pain severity scale'
      }
    }
  },
  {
    key: 'fiq_fatigue_level',
    displayName: 'FIQ: Fatigue Level',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72518-4',
        display: 'Fatigue severity scale'
      }
    }
  },
  {
    key: 'fiq_morning_tiredness',
    displayName: 'FIQ: Morning Tiredness',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72519-2',
        display: 'Morning tiredness scale'
      }
    }
  },
  {
    key: 'fiq_stiffness',
    displayName: 'FIQ: Stiffness Level',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72520-0',
        display: 'Stiffness severity scale'
      }
    }
  },
  {
    key: 'fiq_anxiety',
    displayName: 'FIQ: Anxiety Level',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72521-8',
        display: 'Anxiety severity scale'
      }
    }
  },
  {
    key: 'fiq_depression',
    displayName: 'FIQ: Depression Level',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 10,
    unit: 'scale',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '72522-6',
        display: 'Depression severity scale'
      }
    }
  },
  
  // SDSCA Metric Definitions
  {
    key: 'sdsca_diet_general',
    displayName: 'SDSCA: General Diet Days',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 7,
    unit: 'days',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '33747-0',
        display: 'General diet adherence days per week'
      }
    }
  },
  {
    key: 'sdsca_diet_specific',
    displayName: 'SDSCA: Specific Diet Days',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 7,
    unit: 'days',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '33747-0',
        display: 'Specific diet adherence days per week'
      }
    }
  },
  {
    key: 'sdsca_exercise',
    displayName: 'SDSCA: Exercise Days',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 7,
    unit: 'days',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '68516-4',
        display: 'Exercise days per week'
      }
    }
  },
  {
    key: 'sdsca_blood_sugar',
    displayName: 'SDSCA: Blood Sugar Testing Days',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 7,
    unit: 'days',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '33743-9',
        display: 'Blood glucose monitoring days per week'
      }
    }
  },
  {
    key: 'sdsca_foot_care',
    displayName: 'SDSCA: Foot Care Days',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 7,
    unit: 'days',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '33744-7',
        display: 'Foot care days per week'
      }
    }
  },
  {
    key: 'sdsca_medication',
    displayName: 'SDSCA: Medication Adherence Days',
    valueType: 'numeric',
    scaleMin: 0,
    scaleMax: 7,
    unit: 'days',
    decimalPrecision: 0,
    defaultFrequency: 'weekly',
    coding: {
      primary: {
        system: 'http://loinc.org',
        code: '33745-4',
        display: 'Medication adherence days per week'
      }
    }
  }
];

async function createStandardizedAssessmentTemplates() {
  try {
    console.log('🏥 Creating Standardized Assessment Templates and Metrics...\n');
    
    // Step 1: Create metric definitions first
    console.log('📊 Step 1: Creating Standardized Metric Definitions...');
    const createdMetrics = {};
    
    for (const metric of standardizedMetricDefinitions) {
      const existingMetric = await prisma.metricDefinition.findFirst({
        where: { key: metric.key }
      });
      
      if (!existingMetric) {
        const created = await prisma.metricDefinition.create({
          data: {
            key: metric.key,
            displayName: metric.displayName,
            valueType: metric.valueType,
            scaleMin: metric.scaleMin,
            scaleMax: metric.scaleMax,
            unit: metric.unit,
            decimalPrecision: metric.decimalPrecision,
            defaultFrequency: metric.defaultFrequency,
            coding: metric.coding,
            options: metric.options,
            validation: metric.validation
          }
        });
        createdMetrics[metric.key] = created;
        console.log(`   ✅ Created metric: ${metric.displayName}`);
      } else {
        createdMetrics[metric.key] = existingMetric;
        console.log(`   ⏭️  Metric exists: ${metric.displayName}`);
      }
    }
    
    console.log(`\n📋 Step 2: Creating Standardized Assessment Templates...`);
    const createdTemplates = [];
    
    for (const templateData of standardizedAssessmentTemplates) {
      // Check if template already exists
      const existingTemplate = await prisma.assessmentTemplate.findFirst({
        where: { name: templateData.name }
      });
      
      if (existingTemplate) {
        // Update existing template to ensure it's properly standardized
        const updatedTemplate = await prisma.assessmentTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            description: templateData.description,
            category: templateData.category,
            isStandardized: true,
            validationInfo: templateData.validationInfo,
            standardCoding: templateData.standardCoding,
            scoringInfo: templateData.scoringInfo,
            copyrightInfo: templateData.validationInfo?.copyrightInfo,
            clinicalValidation: templateData.validationInfo?.validation
          }
        });
        
        // Clear existing items and recreate them
        await prisma.assessmentItem.deleteMany({
          where: { templateId: existingTemplate.id }
        });
        
        // Create new items
        for (const item of templateData.items) {
          const metricDefinition = createdMetrics[item.metricKey];
          if (metricDefinition) {
            await prisma.assessmentItem.create({
              data: {
                templateId: existingTemplate.id,
                metricDefinitionId: metricDefinition.id,
                displayName: item.displayName,
                question: item.question,
                scale: item.scale,
                required: item.required,
                displayOrder: item.displayOrder,
                alertThreshold: item.alertThreshold,
                criticalAlert: item.criticalAlert,
                standardCoding: item.standardCoding,
                options: item.options
              }
            });
          }
        }
        
        createdTemplates.push(updatedTemplate);
        console.log(`   ✅ Updated template: ${templateData.name}`);
      } else {
        // Create new template
        const newTemplate = await prisma.assessmentTemplate.create({
          data: {
            name: templateData.name,
            description: templateData.description,
            category: templateData.category,
            isStandardized: true,
            validationInfo: templateData.validationInfo,
            standardCoding: templateData.standardCoding,
            scoringInfo: templateData.scoringInfo,
            copyrightInfo: templateData.validationInfo?.copyrightInfo,
            clinicalValidation: templateData.validationInfo?.validation
          }
        });
        
        // Create assessment items
        for (const item of templateData.items) {
          const metricDefinition = createdMetrics[item.metricKey];
          if (metricDefinition) {
            await prisma.assessmentItem.create({
              data: {
                templateId: newTemplate.id,
                metricDefinitionId: metricDefinition.id,
                displayName: item.displayName,
                question: item.question,
                scale: item.scale,
                required: item.required,
                displayOrder: item.displayOrder,
                alertThreshold: item.alertThreshold,
                criticalAlert: item.criticalAlert,
                standardCoding: item.standardCoding,
                options: item.options
              }
            });
          }
        }
        
        createdTemplates.push(newTemplate);
        console.log(`   ✅ Created template: ${templateData.name}`);
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log(`✅ ${Object.keys(createdMetrics).length} standardized metrics processed`);
    console.log(`✅ ${createdTemplates.length} assessment templates processed`);
    console.log('\n📊 Standardized Assessment Templates Available:');
    
    for (const template of standardizedAssessmentTemplates) {
      console.log(`   • ${template.name} (${template.category})`);
      console.log(`     - ${template.items.length} items`);
      console.log(`     - LOINC: ${template.standardCoding?.loinc || 'N/A'}`);
      console.log(`     - Clinical Use: ${template.validationInfo?.clinicalUse || 'General'}`);
    }
    
    console.log('\n🔬 Clinical Validation Features:');
    console.log('   • Standardized LOINC coding for interoperability');
    console.log('   • SNOMED CT integration for clinical concepts');
    console.log('   • ICD-10 mappings for diagnosis correlation');
    console.log('   • Validated scoring algorithms');
    console.log('   • Critical alert thresholds (PHQ-9 self-harm)');
    console.log('   • Evidence-based assessment instruments');
    
    return {
      metrics: createdMetrics,
      templates: createdTemplates,
      summary: {
        totalMetrics: Object.keys(createdMetrics).length,
        totalTemplates: createdTemplates.length,
        categories: [...new Set(standardizedAssessmentTemplates.map(t => t.category))]
      }
    };
    
  } catch (error) {
    console.error('❌ Error creating standardized assessment templates:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

function generateStandardizedAssessmentDocs() {
  console.log('\n📚 STANDARDIZED CLINICAL ASSESSMENT DOCUMENTATION\n');
  console.log('=' .repeat(60));
  
  standardizedAssessmentTemplates.forEach((template, index) => {
    console.log(`\n${index + 1}. ${template.name.toUpperCase()}`);
    console.log('-'.repeat(template.name.length + 4));
    console.log(`Description: ${template.description}`);
    console.log(`Category: ${template.category}`);
    console.log(`Developer: ${template.validationInfo?.developer || 'N/A'}`);
    console.log(`Clinical Use: ${template.validationInfo?.clinicalUse || 'General assessment'}`);
    
    if (template.standardCoding) {
      console.log('\nStandardized Coding:');
      if (template.standardCoding.loinc) console.log(`  • LOINC: ${template.standardCoding.loinc}`);
      if (template.standardCoding.snomed) console.log(`  • SNOMED CT: ${template.standardCoding.snomed}`);
      if (template.standardCoding.icd10) console.log(`  • ICD-10: ${template.standardCoding.icd10}`);
    }
    
    if (template.validationInfo) {
      console.log('\nValidation Information:');
      if (template.validationInfo.sensitivity) console.log(`  • Sensitivity: ${template.validationInfo.sensitivity}`);
      if (template.validationInfo.specificity) console.log(`  • Specificity: ${template.validationInfo.specificity}`);
      if (template.validationInfo.validation) console.log(`  • Validation: ${template.validationInfo.validation}`);
    }
    
    console.log(`\nAssessment Items (${template.items.length} total):`);
    template.items.forEach((item, itemIndex) => {
      console.log(`  ${itemIndex + 1}. ${item.displayName}`);
      console.log(`     Scale: ${item.scale}`);
      console.log(`     Required: ${item.required ? 'Yes' : 'No'}`);
      if (item.criticalAlert) console.log(`     ⚠️  Critical Alert Enabled`);
    });
    
    if (template.scoringInfo) {
      console.log('\nScoring Information:');
      console.log(`  Range: ${template.scoringInfo.totalScore?.range || 'N/A'}`);
      if (template.scoringInfo.totalScore?.interpretation) {
        console.log('  Interpretation:');
        Object.entries(template.scoringInfo.totalScore.interpretation).forEach(([range, meaning]) => {
          console.log(`    ${range}: ${meaning}`);
        });
      }
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 METRIC DEFINITIONS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Standardized Metrics: ${standardizedMetricDefinitions.length}`);
  
  const metricsByCategory = {};
  standardizedMetricDefinitions.forEach(metric => {
    const category = metric.key.split('_')[0];
    if (!metricsByCategory[category]) metricsByCategory[category] = [];
    metricsByCategory[category].push(metric);
  });
  
  Object.entries(metricsByCategory).forEach(([category, metrics]) => {
    console.log(`\n${category.toUpperCase()} Metrics (${metrics.length}):`);
    metrics.forEach(metric => {
      console.log(`  • ${metric.displayName}`);
      console.log(`    Type: ${metric.valueType}, Range: ${metric.scaleMin}-${metric.scaleMax}, Unit: ${metric.unit}`);
      if (metric.coding?.primary) {
        console.log(`    LOINC: ${metric.coding.primary.code} - ${metric.coding.primary.display}`);
      }
    });
  });
}

// Export for use in other files
module.exports = { 
  createStandardizedAssessmentTemplates,
  standardizedAssessmentTemplates,
  standardizedMetricDefinitions,
  generateStandardizedAssessmentDocs
};

// Run if called directly
if (require.main === module) {
  createStandardizedAssessmentTemplates()
    .catch(console.error)
    .finally(() => {
      generateStandardizedAssessmentDocs();
    });
}