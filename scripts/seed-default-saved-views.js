const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed script for creating default saved view templates
 * These templates are provided to all users and can be cloned/customized
 */

async function seedDefaultSavedViews() {
  console.log('🔖 Seeding default saved view templates...\n');

  // Get first user and organization as template owner
  const firstUser = await prisma.user.findFirst();
  const firstOrg = await prisma.organization.findFirst();

  if (!firstUser || !firstOrg) {
    console.log('⚠️  No users or organizations found. Skipping saved view template seeding.');
    console.log('   Run user and organization seed scripts first.');
    return;
  }

  console.log(`Using template owner: ${firstUser.email}`);
  console.log(`Using organization: ${firstOrg.name}\n`);

  const templates = [
    // ============================================================
    // CARE MANAGER TEMPLATES
    // ============================================================
    {
      name: 'Morning Triage - Critical Alerts',
      description: 'Unclaimed critical and high severity alerts for morning review',
      viewType: 'TRIAGE_QUEUE',
      suggestedRole: 'CARE_MANAGER',
      filters: {
        severity: ['CRITICAL', 'HIGH'],
        status: 'PENDING',
        claimedBy: 'unclaimed'
      },
      displayConfig: {
        sortBy: 'riskScore',
        sortOrder: 'desc'
      }
    },
    {
      name: 'My Active Patients - High Risk',
      description: 'Patients assigned to me with risk score ≥ 7',
      viewType: 'PATIENT_LIST',
      suggestedRole: 'CARE_MANAGER',
      filters: {
        status: 'ACTIVE',
        riskScore: { operator: '>=', value: 7 },
        hasOpenAlerts: true
      },
      displayConfig: {
        sortBy: 'riskScore',
        sortOrder: 'desc'
      }
    },
    {
      name: 'SLA Breached Alerts',
      description: 'Alerts that have exceeded SLA timeframes',
      viewType: 'TRIAGE_QUEUE',
      suggestedRole: 'CARE_MANAGER',
      filters: {
        slaBreached: true,
        status: ['PENDING', 'ACKNOWLEDGED']
      },
      displayConfig: {
        sortBy: 'createdAt',
        sortOrder: 'asc'
      }
    },
    {
      name: 'Patients Needing Follow-Up',
      description: 'Active patients with pending or overdue tasks',
      viewType: 'PATIENT_LIST',
      suggestedRole: 'CARE_MANAGER',
      filters: {
        status: 'ACTIVE',
        lastAssessmentDays: { operator: '>', value: 7 }
      },
      displayConfig: {
        sortBy: 'lastAssessmentDate',
        sortOrder: 'asc'
      }
    },
    {
      name: 'RPM Patients - Data Collection',
      description: 'RPM enrolled patients with data collection status',
      viewType: 'PATIENT_LIST',
      suggestedRole: 'CARE_MANAGER',
      filters: {
        enrolledPrograms: ['RPM'],
        status: 'ACTIVE'
      },
      displayConfig: {
        columns: ['name', 'mrn', 'dataCollectionDays', 'lastReading', 'clinicalTime']
      }
    },

    // ============================================================
    // CLINICIAN TEMPLATES
    // ============================================================
    {
      name: 'My Diabetes Patients',
      description: 'Patients enrolled in diabetes programs assigned to me',
      viewType: 'PATIENT_LIST',
      suggestedRole: 'CLINICIAN',
      filters: {
        status: 'ACTIVE',
        enrolledPrograms: ['Diabetes Management', 'RPM']
      },
      displayConfig: {
        sortBy: 'lastName',
        sortOrder: 'asc'
      }
    },
    {
      name: 'My Hypertension Patients',
      description: 'Patients enrolled in hypertension programs assigned to me',
      viewType: 'PATIENT_LIST',
      suggestedRole: 'CLINICIAN',
      filters: {
        status: 'ACTIVE',
        enrolledPrograms: ['Hypertension Management', 'CCM']
      },
      displayConfig: {
        sortBy: 'lastName',
        sortOrder: 'asc'
      }
    },
    {
      name: 'Chronic Pain Patients',
      description: 'Patients enrolled in pain management programs',
      viewType: 'PATIENT_LIST',
      suggestedRole: 'CLINICIAN',
      filters: {
        status: 'ACTIVE',
        enrolledPrograms: ['Pain Management', 'RTM']
      },
      displayConfig: {
        sortBy: 'riskScore',
        sortOrder: 'desc'
      }
    },
    {
      name: 'Alerts Requiring Clinical Review',
      description: 'Medium to critical alerts in acknowledged status',
      viewType: 'TRIAGE_QUEUE',
      suggestedRole: 'CLINICIAN',
      filters: {
        severity: ['MEDIUM', 'HIGH', 'CRITICAL'],
        status: 'ACKNOWLEDGED',
        claimedBy: 'me'
      },
      displayConfig: {
        sortBy: 'severity',
        sortOrder: 'desc'
      }
    },
    {
      name: 'Overdue Assessments - My Patients',
      description: 'Overdue assessments for patients assigned to me',
      viewType: 'ASSESSMENT_LIST',
      suggestedRole: 'CLINICIAN',
      filters: {
        completionStatus: 'OVERDUE',
        dueStatus: 'OVERDUE'
      },
      displayConfig: {
        sortBy: 'dueDate',
        sortOrder: 'asc'
      }
    },

    // ============================================================
    // BILLING ADMINISTRATOR TEMPLATES
    // ============================================================
    {
      name: 'RPM Billing Eligible - Current Month',
      description: 'Patients meeting RPM billing criteria (16+ days, 20+ minutes)',
      viewType: 'ENROLLMENT_LIST',
      suggestedRole: 'BILLING_ADMIN',
      filters: {
        programType: ['RPM'],
        status: 'ACTIVE',
        billingEligible: true,
        dataCollectionDays: { operator: '>=', value: 16 }
      },
      displayConfig: {
        columns: ['patient', 'program', 'dataCollectionDays', 'clinicalTime', 'billingEligible']
      }
    },
    {
      name: 'RTM Billing Eligible - Current Month',
      description: 'Patients meeting RTM billing criteria',
      viewType: 'ENROLLMENT_LIST',
      suggestedRole: 'BILLING_ADMIN',
      filters: {
        programType: ['RTM'],
        status: 'ACTIVE',
        billingEligible: true,
        dataCollectionDays: { operator: '>=', value: 16 }
      },
      displayConfig: {
        columns: ['patient', 'program', 'dataCollectionDays', 'clinicalTime', 'billingEligible']
      }
    },
    {
      name: 'CCM Billing Eligible - Current Month',
      description: 'Patients meeting CCM billing criteria (20+ minutes)',
      viewType: 'ENROLLMENT_LIST',
      suggestedRole: 'BILLING_ADMIN',
      filters: {
        programType: ['CCM'],
        status: 'ACTIVE',
        billingEligible: true,
        clinicalTimeMinutes: { operator: '>=', value: 20 }
      },
      displayConfig: {
        columns: ['patient', 'program', 'clinicalTime', 'billingEligible']
      }
    },
    {
      name: 'Patients Close to Billing Threshold',
      description: 'Active enrollments with 80-99% of billing requirements met',
      viewType: 'ENROLLMENT_LIST',
      suggestedRole: 'BILLING_ADMIN',
      filters: {
        status: 'ACTIVE',
        billingEligible: false
      },
      displayConfig: {
        sortBy: 'dataCollectionDays',
        sortOrder: 'desc'
      }
    },
    {
      name: 'Not Billing Eligible - Action Needed',
      description: 'Active patients below 80% billing requirements',
      viewType: 'ENROLLMENT_LIST',
      suggestedRole: 'BILLING_ADMIN',
      filters: {
        status: 'ACTIVE',
        billingEligible: false,
        dataCollectionDays: { operator: '<', value: 13 }
      },
      displayConfig: {
        sortBy: 'dataCollectionDays',
        sortOrder: 'asc'
      }
    },

    // ============================================================
    // NURSE/CARE COORDINATOR TEMPLATES
    // ============================================================
    {
      name: 'Due Today - Assessments',
      description: 'Assessments due today across all patients',
      viewType: 'ASSESSMENT_LIST',
      suggestedRole: 'NURSE',
      filters: {
        completionStatus: 'PENDING',
        dueStatus: 'DUE_TODAY'
      },
      displayConfig: {
        sortBy: 'patient',
        sortOrder: 'asc'
      }
    },
    {
      name: 'Medication Adherence - Low',
      description: 'Patients with medication adherence below 70%',
      viewType: 'PATIENT_LIST',
      suggestedRole: 'NURSE',
      filters: {
        status: 'ACTIVE',
        medicationAdherence: { operator: '<', value: 70 }
      },
      displayConfig: {
        sortBy: 'medicationAdherence',
        sortOrder: 'asc'
      }
    },
    {
      name: 'New Enrollments - This Week',
      description: 'Patients newly enrolled in programs this week',
      viewType: 'ENROLLMENT_LIST',
      suggestedRole: 'NURSE',
      filters: {
        status: 'ACTIVE'
      },
      displayConfig: {
        sortBy: 'startDate',
        sortOrder: 'desc'
      }
    },
    {
      name: 'Follow-Up Calls - Today',
      description: 'Follow-up call tasks due today',
      viewType: 'TASK_LIST',
      suggestedRole: 'NURSE',
      filters: {
        taskType: ['FOLLOW_UP_CALL'],
        status: ['PENDING', 'IN_PROGRESS'],
        dueDate: 'today'
      },
      displayConfig: {
        sortBy: 'priority',
        sortOrder: 'desc'
      }
    },
    {
      name: 'Vital Signs Alerts - Last 24h',
      description: 'Vital sign alerts from the last 24 hours',
      viewType: 'ALERT_LIST',
      suggestedRole: 'NURSE',
      filters: {
        category: 'VITAL_SIGNS',
        status: ['PENDING', 'ACKNOWLEDGED']
      },
      displayConfig: {
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    },

    // ============================================================
    // GENERAL/CROSS-ROLE TEMPLATES
    // ============================================================
    {
      name: 'All Active Patients',
      description: 'Complete list of all active patients',
      viewType: 'PATIENT_LIST',
      suggestedRole: 'ALL',
      filters: {
        status: 'ACTIVE'
      },
      displayConfig: {
        sortBy: 'lastName',
        sortOrder: 'asc'
      }
    },
    {
      name: 'Recently Added Patients',
      description: 'Patients added in the last 30 days',
      viewType: 'PATIENT_LIST',
      suggestedRole: 'ALL',
      filters: {
        status: 'ACTIVE'
      },
      displayConfig: {
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    },
    {
      name: 'My Open Tasks',
      description: 'All tasks assigned to me that are pending or in progress',
      viewType: 'TASK_LIST',
      suggestedRole: 'ALL',
      filters: {
        assignedTo: 'me',
        status: ['PENDING', 'IN_PROGRESS']
      },
      displayConfig: {
        sortBy: 'dueDate',
        sortOrder: 'asc'
      }
    },
    {
      name: 'Overdue Tasks - All',
      description: 'All overdue tasks across the organization',
      viewType: 'TASK_LIST',
      suggestedRole: 'ALL',
      filters: {
        status: ['PENDING', 'IN_PROGRESS'],
        dueDate: 'overdue'
      },
      displayConfig: {
        sortBy: 'dueDate',
        sortOrder: 'asc'
      }
    },
    {
      name: 'Critical Alerts - All Patients',
      description: 'All critical severity alerts',
      viewType: 'ALERT_LIST',
      suggestedRole: 'ALL',
      filters: {
        severity: 'CRITICAL',
        status: ['PENDING', 'ACKNOWLEDGED']
      },
      displayConfig: {
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }
    }
  ];

  console.log(`Creating ${templates.length} template views...\n`);

  let created = 0;
  let skipped = 0;

  for (const template of templates) {
    try {
      // Check if template already exists
      const existing = await prisma.savedView.findFirst({
        where: {
          name: template.name,
          isTemplate: true,
          organizationId: firstOrg.id
        }
      });

      if (existing) {
        console.log(`⏭️  Skipped: "${template.name}" (already exists)`);
        skipped++;
        continue;
      }

      await prisma.savedView.create({
        data: {
          userId: firstUser.id,
          organizationId: firstOrg.id,
          name: template.name,
          description: template.description,
          viewType: template.viewType,
          filters: template.filters,
          displayConfig: template.displayConfig || {},
          isShared: true, // Templates are shared by default
          isTemplate: true,
          suggestedRole: template.suggestedRole,
          isDefault: false,
          usageCount: 0
        }
      });

      console.log(`✅ Created: "${template.name}" (${template.suggestedRole})`);
      created++;
    } catch (error) {
      console.error(`❌ Failed to create template "${template.name}":`, error.message);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Created: ${created} templates`);
  console.log(`   Skipped: ${skipped} (already exist)`);
  console.log(`   Total: ${templates.length} templates`);

  console.log(`\n✅ Default saved view templates seeded successfully!\n`);
}

// Run the seed function
seedDefaultSavedViews()
  .catch((error) => {
    console.error('❌ Error seeding default saved views:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
