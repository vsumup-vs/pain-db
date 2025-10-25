const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateAnalyticsTestData() {
  try {
    console.log('🚀 Generating analytics test data...\n');

    // Get test organization
    const org = await prisma.organization.findFirst({
      where: { name: { contains: 'Test Clinic' } }
    });

    if (!org) {
      console.log('❌ Test organization not found');
      return;
    }

    console.log('📊 Organization:', org.name);
    console.log('🆔 Org ID:', org.id);
    console.log('');

    // Get clinicians
    const clinicians = await prisma.clinician.findMany({
      where: { organizationId: org.id },
      select: { id: true, firstName: true, lastName: true }
    });

    if (clinicians.length === 0) {
      console.log('❌ No clinicians found. Run setup-persistent-test-data.js first');
      return;
    }

    console.log(`👨‍⚕️ Found ${clinicians.length} clinicians`);
    console.log('');

    // Get users for task assignment
    const users = await prisma.user.findMany({
      where: {
        userOrganizations: {
          some: { organizationId: org.id }
        }
      },
      select: { id: true, email: true }
    });

    if (users.length === 0) {
      console.log('❌ No users found in organization');
      return;
    }

    console.log(`👥 Found ${users.length} users for task assignment`);
    console.log('');

    // Get or create care program
    let careProgram = await prisma.careProgram.findFirst({
      where: { organizationId: org.id }
    });

    if (!careProgram) {
      console.log('📋 Creating care program...');
      careProgram = await prisma.careProgram.create({
        data: {
          organizationId: org.id,
          name: 'Remote Patient Monitoring',
          type: 'RPM',
          description: 'RPM program for chronic conditions',
          isActive: true
        }
      });
      console.log('✓ Care program created');
    } else {
      console.log('✓ Using existing care program:', careProgram.name);
    }
    console.log('');

    // Get or create condition preset (required for enrollment)
    let conditionPreset = await prisma.conditionPreset.findFirst({
      where: { organizationId: org.id }
    });

    if (!conditionPreset) {
      console.log('📋 Creating condition preset...');
      conditionPreset = await prisma.conditionPreset.create({
        data: {
          organizationId: org.id,
          name: 'General Chronic Condition Monitoring',
          description: 'General monitoring protocol for chronic conditions',
          category: 'General',
          isActive: true
        }
      });
      console.log('✓ Condition preset created');
    } else {
      console.log('✓ Using existing condition preset:', conditionPreset.name);
    }
    console.log('');

    // Clean up existing test data (patients with email pattern patient{i}@test.com)
    console.log('🧹 Cleaning up existing test data...');
    const existingPatients = await prisma.patient.findMany({
      where: {
        organizationId: org.id,
        email: {
          contains: '@test.com'
        }
      },
      select: { id: true }
    });

    if (existingPatients.length > 0) {
      console.log(`  Found ${existingPatients.length} existing test patients`);

      const patientIds = existingPatients.map(p => p.id);

      // Delete in correct order due to foreign key constraints
      console.log('  Deleting observations...');
      await prisma.observation.deleteMany({
        where: { patientId: { in: patientIds } }
      });

      console.log('  Deleting time logs...');
      await prisma.timeLog.deleteMany({
        where: { patientId: { in: patientIds } }
      });

      console.log('  Deleting alerts...');
      await prisma.alert.deleteMany({
        where: { patientId: { in: patientIds } }
      });

      console.log('  Deleting tasks...');
      await prisma.task.deleteMany({
        where: { patientId: { in: patientIds } }
      });

      console.log('  Deleting enrollments...');
      await prisma.enrollment.deleteMany({
        where: { patientId: { in: patientIds } }
      });

      console.log('  Deleting patients...');
      await prisma.patient.deleteMany({
        where: { id: { in: patientIds } }
      });

      console.log('  ✓ Cleanup complete');
    } else {
      console.log('  No existing test data found');
    }
    console.log('');

    // Create 5 test patients
    console.log('👥 Creating 5 test patients...');
    const patients = [];
    const now = new Date();

    for (let i = 1; i <= 5; i++) {
      const patient = await prisma.patient.create({
        data: {
          organizationId: org.id,
          firstName: `Patient${i}`,
          lastName: `Test`,
          email: `patient${i}@test.com`,
          phone: `555-000${i}`,
          dateOfBirth: new Date(1950 + i * 10, 0, 1),
          gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
          medicalRecordNumber: `MRN-TEST-${Date.now()}-${i}`,
          address: `${i}00 Test St, City, State 12345`
        }
      });
      patients.push(patient);
      console.log(`  ✓ Created ${patient.firstName} ${patient.lastName}`);
    }
    console.log('');

    // Create enrollments for each patient
    console.log('📝 Creating enrollments...');
    const enrollments = [];
    for (let i = 0; i < patients.length; i++) {
      const enrollment = await prisma.enrollment.create({
        data: {
          organizationId: org.id,
          patientId: patients[i].id,
          clinicianId: clinicians[i % clinicians.length].id,
          careProgramId: careProgram.id,
          conditionPresetId: conditionPreset.id,
          status: 'ACTIVE',
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) // 60 days ago
        }
      });
      enrollments.push(enrollment);
      console.log(`  ✓ Enrolled ${patients[i].firstName} with ${clinicians[i % clinicians.length].firstName}`);
    }
    console.log('');

    // Get metric definitions
    const systolicBP = await prisma.metricDefinition.findFirst({
      where: { displayName: { contains: 'Systolic' } }
    });

    const heartRate = await prisma.metricDefinition.findFirst({
      where: { displayName: { contains: 'Heart Rate' } }
    });

    console.log('📊 Creating observations...');
    let observationCount = 0;

    // Create observations over the past 30 days
    for (const patient of patients) {
      for (let day = 0; day < 30; day++) {
        const recordedAt = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);

        // Blood pressure reading
        if (systolicBP) {
          await prisma.observation.create({
            data: {
              organizationId: org.id,
              patientId: patient.id,
              metricId: systolicBP.id,
              value: { numeric: 120 + Math.floor(Math.random() * 40) },
              unit: 'mmHg',
              source: 'DEVICE',
              context: 'CLINICAL_MONITORING',
              recordedAt
            }
          });
          observationCount++;
        }

        // Heart rate reading (every other day)
        if (heartRate && day % 2 === 0) {
          await prisma.observation.create({
            data: {
              organizationId: org.id,
              patientId: patient.id,
              metricId: heartRate.id,
              value: { numeric: 60 + Math.floor(Math.random() * 40) },
              unit: 'bpm',
              source: 'DEVICE',
              context: 'CLINICAL_MONITORING',
              recordedAt
            }
          });
          observationCount++;
        }
      }
    }
    console.log(`  ✓ Created ${observationCount} observations`);
    console.log('');

    // Get or create alert rule (required for alerts)
    let alertRule = await prisma.alertRule.findFirst({
      where: { organizationId: org.id }
    });

    if (!alertRule) {
      console.log('📋 Creating alert rule...');
      alertRule = await prisma.alertRule.create({
        data: {
          organizationId: org.id,
          name: 'High Blood Pressure Alert',
          description: 'Alert for elevated blood pressure readings',
          conditions: {
            metric: 'systolic_bp',
            operator: '>',
            threshold: 160
          },
          actions: {
            notify: ['CLINICIAN'],
            priority: 'HIGH'
          },
          severity: 'HIGH',
          isActive: true,
          category: 'Cardiovascular'
        }
      });
      console.log('✓ Alert rule created');
    } else {
      console.log('✓ Using existing alert rule:', alertRule.name);
    }
    console.log('');

    // Create alerts
    console.log('🚨 Creating alerts...');
    let alertCount = 0;

    for (const patient of patients) {
      // Create 2-3 alerts per patient over past 30 days
      const numAlerts = 2 + Math.floor(Math.random() * 2);

      for (let j = 0; j < numAlerts; j++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const triggeredAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        // Randomly assign status
        const statuses = ['PENDING', 'ACKNOWLEDGED', 'RESOLVED'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        await prisma.alert.create({
          data: {
            organizationId: org.id,
            ruleId: alertRule.id,
            patientId: patient.id,
            severity: j % 3 === 0 ? 'CRITICAL' : j % 2 === 0 ? 'HIGH' : 'MEDIUM',
            status,
            message: `Alert for ${patient.firstName} ${patient.lastName}`,
            data: {
              reason: 'High blood pressure reading',
              value: 160 + Math.floor(Math.random() * 20)
            },
            triggeredAt,
            riskScore: 5 + Math.floor(Math.random() * 5),
            priorityRank: j + 1,
            ...(status === 'ACKNOWLEDGED' && {
              acknowledgedAt: new Date(triggeredAt.getTime() + 60 * 60 * 1000)
            }),
            ...(status === 'RESOLVED' && {
              resolvedAt: new Date(triggeredAt.getTime() + 2 * 60 * 60 * 1000),
              resolvedById: users[Math.floor(Math.random() * users.length)].id,
              resolutionNotes: 'Contacted patient, condition improved',
              timeSpentMinutes: 15
            })
          }
        });
        alertCount++;
      }
    }
    console.log(`  ✓ Created ${alertCount} alerts`);
    console.log('');

    // Create time logs
    console.log('⏱️  Creating time logs...');
    let timeLogCount = 0;

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const clinician = clinicians[i % clinicians.length];

      // Create 5-10 time logs per patient over past 30 days
      const numLogs = 5 + Math.floor(Math.random() * 6);

      for (let j = 0; j < numLogs; j++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const loggedAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

        const activities = ['CALL_PATIENT', 'REVIEW_DATA', 'CARE_COORDINATION', 'DOCUMENTATION'];
        const activity = activities[Math.floor(Math.random() * activities.length)];

        await prisma.timeLog.create({
          data: {
            patientId: patient.id,
            clinicianId: clinician.id,
            activity,
            duration: 5 + Math.floor(Math.random() * 25), // 5-30 minutes
            billable: Math.random() > 0.2, // 80% billable
            loggedAt
          }
        });
        timeLogCount++;
      }
    }
    console.log(`  ✓ Created ${timeLogCount} time logs`);
    console.log('');

    // Create tasks
    console.log('📋 Creating tasks...');
    let taskCount = 0;

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      const user = users[i % users.length];

      // Create 3-5 tasks per patient
      const numTasks = 3 + Math.floor(Math.random() * 3);

      for (let j = 0; j < numTasks; j++) {
        const statuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        const createdDaysAgo = Math.floor(Math.random() * 30);
        const createdAt = new Date(now.getTime() - createdDaysAgo * 24 * 60 * 60 * 1000);

        await prisma.task.create({
          data: {
            organizationId: org.id,
            taskType: 'FOLLOW_UP_CALL',
            title: `Follow up with ${patient.firstName} ${patient.lastName}`,
            description: 'Check on medication adherence',
            status,
            priority: j % 3 === 0 ? 'HIGH' : 'MEDIUM',
            patientId: patient.id,
            assignedToId: user.id,
            assignedById: user.id,
            dueDate: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days later
            ...(status === 'COMPLETED' && {
              completedAt: new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000),
              completedById: user.id
            })
          }
        });
        taskCount++;
      }
    }
    console.log(`  ✓ Created ${taskCount} tasks`);
    console.log('');

    console.log('✅ Analytics test data generated successfully!\n');
    console.log('📊 Summary:');
    console.log(`  - Patients: ${patients.length}`);
    console.log(`  - Enrollments: ${enrollments.length}`);
    console.log(`  - Observations: ${observationCount}`);
    console.log(`  - Alerts: ${alertCount}`);
    console.log(`  - Time Logs: ${timeLogCount}`);
    console.log(`  - Tasks: ${taskCount}`);
    console.log('');
    console.log('🎯 You can now test the analytics dashboards!');

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

generateAnalyticsTestData();
