const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Seed Care Programs for Organizations
 *
 * Creates care programs aligned with billing programs (RPM, RTM, CCM)
 * and condition-specific programs (diabetes, hypertension, pain, etc.)
 */
async function seedCarePrograms() {
  console.log('🏥 Starting Care Programs Seed...\n');

  try {
    // Get all organizations (we'll create care programs for each)
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        type: true
      }
    });

    if (organizations.length === 0) {
      console.error('❌ No organizations found. Please create an organization first.');
      console.log('\nRun: node scripts/create-test-organization.js\n');
      process.exit(1);
    }

    console.log(`Found ${organizations.length} organization(s):\n`);
    organizations.forEach(org => {
      console.log(`  - ${org.name} (${org.type})`);
    });
    console.log('');

    let totalCreated = 0;

    // Create care programs for each organization
    for (const org of organizations) {
      console.log(`\n📋 Creating care programs for: ${org.name}`);

      // Check for existing care programs
      const existingCount = await prisma.careProgram.count({
        where: { organizationId: org.id }
      });

      if (existingCount > 0) {
        console.log(`  ⚠️  ${existingCount} care program(s) already exist. Skipping to avoid duplicates.\n`);
        continue;
      }

      const careProgramsData = [
        // 1. Pain Management Programs (RPM/RTM eligible)
        {
          organizationId: org.id,
          name: 'Remote Pain Management Program',
          type: 'PAIN_MANAGEMENT',
          description: 'Comprehensive pain management program with daily symptom tracking and therapeutic interventions',
          isActive: true,
          settings: {
            billing: {
              program: 'RTM', // Remote Therapeutic Monitoring
              cptCodes: ['98975', '98976', '98977', '98980', '98981'],
              requirements: {
                setupTime: 20,
                dataSubmissions: 16,
                clinicalTime: 20
              }
            },
            requiredMetrics: ['pain_level', 'pain_location', 'pain_duration', 'mood', 'sleep_quality'],
            assessmentFrequency: 'daily',
            reminderSettings: {
              enabled: true,
              time: '20:00',
              frequency: 'DAILY'
            }
          }
        },
        {
          organizationId: org.id,
          name: 'Chronic Pain Clinic Program',
          type: 'PAIN_MANAGEMENT',
          description: 'In-clinic pain management program with weekly check-ins and medication management',
          isActive: true,
          settings: {
            billing: {
              program: 'CCM', // Chronic Care Management
              cptCodes: ['99490', '99439', '99491'],
              requirements: {
                clinicalTime: 20,
                complexClinicalTime: 30
              }
            },
            requiredMetrics: ['pain_level', 'medication_adherence', 'functional_status'],
            assessmentFrequency: 'weekly'
          }
        },

        // 2. Diabetes Management Programs (RPM eligible)
        {
          organizationId: org.id,
          name: 'Remote Diabetes Monitoring',
          type: 'DIABETES',
          description: 'RPM program for diabetic patients with continuous glucose monitoring and nutrition tracking',
          isActive: true,
          settings: {
            billing: {
              program: 'RPM', // Remote Patient Monitoring
              cptCodes: ['99453', '99454', '99457', '99458'],
              requirements: {
                setupTime: 20,
                deviceReadings: 16,
                clinicalTime: 20
              }
            },
            requiredMetrics: ['blood_glucose', 'weight', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'hba1c'],
            assessmentFrequency: 'daily',
            deviceIntegration: {
              enabled: true,
              deviceTypes: ['glucometer', 'blood_pressure_monitor', 'weight_scale']
            }
          }
        },
        {
          organizationId: org.id,
          name: 'Diabetes Care Management',
          type: 'DIABETES',
          description: 'Comprehensive diabetes management with medication optimization and lifestyle coaching',
          isActive: true,
          settings: {
            billing: {
              program: 'CCM',
              cptCodes: ['99490', '99439', '99491']
            },
            requiredMetrics: ['blood_glucose', 'hba1c', 'medication_adherence'],
            assessmentFrequency: 'weekly'
          }
        },

        // 3. Hypertension Management (RPM eligible)
        {
          organizationId: org.id,
          name: 'Remote Blood Pressure Monitoring',
          type: 'HYPERTENSION',
          description: 'RPM program for hypertension with daily BP monitoring and medication management',
          isActive: true,
          settings: {
            billing: {
              program: 'RPM',
              cptCodes: ['99453', '99454', '99457', '99458'],
              requirements: {
                setupTime: 20,
                deviceReadings: 16,
                clinicalTime: 20
              }
            },
            requiredMetrics: ['blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 'weight'],
            assessmentFrequency: 'daily',
            deviceIntegration: {
              enabled: true,
              deviceTypes: ['blood_pressure_monitor']
            },
            alertThresholds: {
              criticalHigh: { systolic: 180, diastolic: 120 },
              high: { systolic: 160, diastolic: 100 },
              low: { systolic: 90, diastolic: 60 }
            }
          }
        },

        // 4. Mental Health Programs
        {
          organizationId: org.id,
          name: 'Mental Health Wellness Program',
          type: 'MENTAL_HEALTH',
          description: 'Mental health support program with mood tracking and therapeutic interventions',
          isActive: true,
          settings: {
            billing: {
              program: 'CCM',
              cptCodes: ['99490', '99439']
            },
            requiredMetrics: ['mood', 'anxiety_level', 'sleep_quality', 'stress_level'],
            assessmentFrequency: 'daily',
            assessmentTools: ['PHQ-9', 'GAD-7']
          }
        },

        // 5. Cardiac Rehabilitation (RTM eligible)
        {
          organizationId: org.id,
          name: 'Cardiac Rehabilitation Program',
          type: 'CARDIAC_REHAB',
          description: 'Post-cardiac event rehabilitation with exercise monitoring and medication management',
          isActive: true,
          settings: {
            billing: {
              program: 'RTM',
              cptCodes: ['98975', '98976', '98977', '98980']
            },
            requiredMetrics: ['heart_rate', 'blood_pressure_systolic', 'blood_pressure_diastolic', 'exercise_duration', 'chest_pain'],
            assessmentFrequency: 'weekly',
            exerciseTracking: {
              enabled: true,
              targetMinutes: 150,
              targetDays: 5
            }
          }
        },

        // 6. General Wellness (no billing program)
        {
          organizationId: org.id,
          name: 'General Wellness Program',
          type: 'GENERAL_WELLNESS',
          description: 'Preventive wellness program with health tracking and lifestyle coaching',
          isActive: true,
          settings: {
            requiredMetrics: ['weight', 'activity_level', 'sleep_quality', 'mood'],
            assessmentFrequency: 'weekly',
            features: ['health_education', 'nutrition_tracking', 'fitness_goals']
          }
        }
      ];

      // Create care programs
      const created = await prisma.careProgram.createMany({
        data: careProgramsData,
        skipDuplicates: true
      });

      totalCreated += created.count;
      console.log(`  ✅ Created ${created.count} care programs for ${org.name}`);
    }

    console.log(`\n✅ Total care programs created: ${totalCreated}`);
    console.log('\n📊 Summary by Type:');

    const summary = await prisma.careProgram.groupBy({
      by: ['type'],
      _count: true
    });

    summary.forEach(item => {
      console.log(`  - ${item.type}: ${item._count} program(s)`);
    });

    console.log('\n🎉 Care programs seed completed successfully!\n');

  } catch (error) {
    console.error('❌ Error seeding care programs:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedCarePrograms()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
