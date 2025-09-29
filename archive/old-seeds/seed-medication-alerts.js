const { PrismaClient } = require('./generated/prisma');

const prisma = new PrismaClient();

const medicationAlertRules = [
  {
    name: 'Medication Non-Adherence',
    severity: 'medium',
    window: '3d', // 3 days
    expression: {
      condition: 'medication_adherence_rate',
      operator: 'less_than',
      threshold: 0.8, // Less than 80% adherence
      timeWindow: '3d'
    },
    dedupeKey: 'med_nonadherence_{patientId}_{medicationId}',
    cooldown: '24h',
    actions: {
      notify: ['clinician', 'care_team'],
      escalate: false,
      autoResolve: false
    }
  },
  {
    name: 'Severe Medication Side Effects',
    severity: 'high',
    window: '1d',
    expression: {
      condition: 'side_effects_severity',
      operator: 'greater_than_or_equal',
      threshold: 7,
      occurrences: 1
    },
    dedupeKey: 'severe_side_effects_{patientId}_{medicationId}',
    cooldown: '12h',
    actions: {
      notify: ['clinician', 'patient'],
      escalate: true,
      autoResolve: false
    }
  },
  {
    name: 'Medication Ineffectiveness',
    severity: 'medium',
    window: '7d',
    expression: {
      condition: 'medication_effectiveness',
      operator: 'less_than',
      threshold: 4,
      consecutiveDays: 3
    },
    dedupeKey: 'med_ineffective_{patientId}_{medicationId}',
    cooldown: '48h',
    actions: {
      notify: ['clinician'],
      escalate: false,
      autoResolve: true
    }
  },
  {
    name: 'Missed Medication Doses',
    severity: 'low',
    window: '24h',
    expression: {
      condition: 'medication_adherence',
      operator: 'equals',
      value: 'Missed dose',
      occurrences: 2 // 2 missed doses in 24h
    },
    dedupeKey: 'missed_doses_{patientId}_{medicationId}',
    cooldown: '12h',
    actions: {
      notify: ['patient', 'caregiver'],
      escalate: false,
      autoResolve: true
    }
  }
];

async function seedMedicationAlerts() {
  try {
    console.log('Seeding medication alert rules...');
    
    for (const rule of medicationAlertRules) {
      // Check if alert rule with this name already exists
      const existingRule = await prisma.alertRule.findFirst({
        where: { name: rule.name }
      });
      
      if (existingRule) {
        console.log(`Alert rule "${rule.name}" already exists, skipping...`);
        continue;
      }
      
      // Create new alert rule
      await prisma.alertRule.create({
        data: rule
      });
      console.log(`Created alert rule: ${rule.name}`);
    }
    
    console.log('Medication alert rules seeding completed!');
  } catch (error) {
    console.error('Error seeding medication alert rules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedMedicationAlerts();