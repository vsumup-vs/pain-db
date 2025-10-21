const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

/**
 * Setup Persistent Test Data
 *
 * This script creates a stable, consistent test environment that persists
 * throughout development and testing. Run this ONCE to set up test data,
 * then use the same credentials and IDs for all testing.
 *
 * This script is IDEMPOTENT - you can run it multiple times safely.
 * It will only create data if it doesn't exist.
 */

async function setupPersistentTestData() {
  console.log('🌱 Setting up persistent test data...\n');

  try {
    // ===========================
    // 1. ORGANIZATION
    // ===========================
    console.log('📋 Setting up organization...');
    let organization = await prisma.organization.findFirst({
      where: { name: 'ClinMetrics Test Clinic' }
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: {
          name: 'ClinMetrics Test Clinic',
          type: 'CLINIC',
          email: 'admin@testclinic.com',
          phone: '(555) 123-4567',
          address: '123 Test Street, Test City, TS 12345',
          website: 'https://testclinic.com',
          isActive: true,
          settings: {
            timezone: 'America/New_York',
            billing: {
              cptCodes: ['99453', '99454', '99457', '99458', '99490', '99491']
            }
          }
        }
      });
      console.log(`✓ Created organization: ${organization.name} (ID: ${organization.id})\n`);
    } else {
      console.log(`✓ Using existing organization: ${organization.name} (ID: ${organization.id})\n`);
    }

    // ===========================
    // 2. TEST USERS
    // ===========================
    console.log('👤 Setting up test users...');

    // Admin User
    let adminUser = await prisma.user.findFirst({
      where: { email: 'admin@testclinic.com' }
    });

    if (!adminUser) {
      const passwordHash = await bcrypt.hash('admin123', 10);
      adminUser = await prisma.user.create({
        data: {
          email: 'admin@testclinic.com',
          passwordHash,
          firstName: 'Admin',
          lastName: 'User',
          isActive: true,
          emailVerified: new Date(),
          userOrganizations: {
            create: {
              organizationId: organization.id,
              role: 'ORG_ADMIN',
              permissions: [
                'USER_READ', 'USER_CREATE', 'USER_UPDATE',
                'PATIENT_READ', 'PATIENT_CREATE', 'PATIENT_UPDATE',
                'CLINICIAN_READ', 'CLINICIAN_CREATE', 'CLINICIAN_UPDATE',
                'ALERT_READ', 'ALERT_UPDATE', 'ALERT_ACKNOWLEDGE',
                'ORG_SETTINGS_MANAGE', 'ORG_USERS_MANAGE',
                'BILLING_READ', 'REPORT_READ'
              ],
              isActive: true
            }
          }
        }
      });
      console.log(`✓ Created admin user: ${adminUser.email}`);
    } else {
      console.log(`✓ Using existing admin user: ${adminUser.email}`);
    }

    // Clinician User
    let clinicianUser = await prisma.user.findFirst({
      where: { email: 'clinician@testclinic.com' }
    });

    if (!clinicianUser) {
      const passwordHash = await bcrypt.hash('clinician123', 10);
      clinicianUser = await prisma.user.create({
        data: {
          email: 'clinician@testclinic.com',
          passwordHash,
          firstName: 'Sarah',
          lastName: 'Johnson',
          isActive: true,
          emailVerified: new Date(),
          userOrganizations: {
            create: {
              organizationId: organization.id,
              role: 'CLINICIAN',
              permissions: [
                'PATIENT_READ', 'PATIENT_UPDATE',
                'ALERT_READ', 'ALERT_UPDATE',
                'BILLING_READ'
              ],
              isActive: true
            }
          }
        }
      });
      console.log(`✓ Created clinician user: ${clinicianUser.email}`);
    } else {
      console.log(`✓ Using existing clinician user: ${clinicianUser.email}`);
    }

    // Nurse User
    let nurseUser = await prisma.user.findFirst({
      where: { email: 'nurse@testclinic.com' }
    });

    if (!nurseUser) {
      const passwordHash = await bcrypt.hash('nurse123', 10);
      nurseUser = await prisma.user.create({
        data: {
          email: 'nurse@testclinic.com',
          passwordHash,
          firstName: 'Emily',
          lastName: 'Davis',
          isActive: true,
          emailVerified: new Date(),
          userOrganizations: {
            create: {
              organizationId: organization.id,
              role: 'NURSE',
              permissions: [
                'PATIENT_READ',
                'ALERT_READ', 'ALERT_UPDATE'
              ],
              isActive: true
            }
          }
        }
      });
      console.log(`✓ Created nurse user: ${nurseUser.email}\n`);
    } else {
      console.log(`✓ Using existing nurse user: ${nurseUser.email}\n`);
    }

    // ===========================
    // 3. CLINICIANS
    // ===========================
    console.log('👨‍⚕️ Setting up clinicians...');

    let clinician1 = await prisma.clinician.findFirst({
      where: {
        organizationId: organization.id,
        email: 'clinician@testclinic.com'
      }
    });

    if (!clinician1) {
      clinician1 = await prisma.clinician.create({
        data: {
          organizationId: organization.id,
          firstName: 'Sarah',
          lastName: 'Johnson',
          email: 'clinician@testclinic.com',
          specialization: 'Internal Medicine',
          licenseNumber: 'MD-12345',
          credentials: 'MD'
        }
      });
      console.log(`✓ Created clinician: Dr. ${clinician1.firstName} ${clinician1.lastName}`);
    } else {
      console.log(`✓ Using existing clinician: Dr. ${clinician1.firstName} ${clinician1.lastName}`);
    }

    let clinician2 = await prisma.clinician.findFirst({
      where: {
        organizationId: organization.id,
        email: 'nurse@testclinic.com'
      }
    });

    if (!clinician2) {
      clinician2 = await prisma.clinician.create({
        data: {
          organizationId: organization.id,
          firstName: 'Emily',
          lastName: 'Davis',
          email: 'nurse@testclinic.com',
          specialization: 'Registered Nurse',
          licenseNumber: 'RN-67890',
          credentials: 'RN, BSN'
        }
      });
      console.log(`✓ Created clinician: ${clinician2.firstName} ${clinician2.lastName}, RN\n`);
    } else {
      console.log(`✓ Using existing clinician: ${clinician2.firstName} ${clinician2.lastName}, RN\n`);
    }

    // ===========================
    // 4. CARE PROGRAMS
    // ===========================
    console.log('🏥 Setting up care programs...');

    let rpmProgram = await prisma.careProgram.findFirst({
      where: {
        organizationId: organization.id,
        name: 'Remote Patient Monitoring - Diabetes'
      }
    });

    if (!rpmProgram) {
      rpmProgram = await prisma.careProgram.create({
        data: {
          organizationId: organization.id,
          name: 'Remote Patient Monitoring - Diabetes',
          type: 'DIABETES',
          description: 'RPM program for diabetic patients with glucometer',
          isActive: true,
          settings: {
            requiredMetrics: ['blood_glucose', 'weight', 'blood_pressure'],
            assessmentFrequency: 'weekly'
          }
        }
      });
      console.log(`✓ Created care program: ${rpmProgram.name}`);
    } else {
      console.log(`✓ Using existing care program: ${rpmProgram.name}`);
    }

    let rtmProgram = await prisma.careProgram.findFirst({
      where: {
        organizationId: organization.id,
        name: 'Remote Therapeutic Monitoring - Pain Management'
      }
    });

    if (!rtmProgram) {
      rtmProgram = await prisma.careProgram.create({
        data: {
          organizationId: organization.id,
          name: 'Remote Therapeutic Monitoring - Pain Management',
          type: 'PAIN_MANAGEMENT',
          description: 'RTM program for chronic pain with daily symptom tracking',
          isActive: true,
          settings: {
            requiredMetrics: ['pain_level', 'pain_location', 'mood', 'sleep_quality'],
            assessmentFrequency: 'daily'
          }
        }
      });
      console.log(`✓ Created care program: ${rtmProgram.name}\n`);
    } else {
      console.log(`✓ Using existing care program: ${rtmProgram.name}\n`);
    }

    // ===========================
    // 5. TEST PATIENTS
    // ===========================
    console.log('🧑 Setting up test patients...');

    // Patient 1 - John Smith (RPM - Diabetes)
    let patient1 = await prisma.patient.findFirst({
      where: {
        organizationId: organization.id,
        firstName: 'John',
        lastName: 'Smith'
      }
    });

    if (!patient1) {
      patient1 = await prisma.patient.create({
        data: {
          organizationId: organization.id,
          firstName: 'John',
          lastName: 'Smith',
          dateOfBirth: new Date('1965-03-15'),
          gender: 'MALE',
          email: 'john.smith@email.com',
          phone: '(555) 111-1111',
          medicalRecordNumber: 'MRN-001',
          address: '100 Oak Street, Test City, TS 12345'
        }
      });
      console.log(`✓ Created patient: ${patient1.firstName} ${patient1.lastName} (MRN: ${patient1.medicalRecordNumber})`);
    } else {
      console.log(`✓ Using existing patient: ${patient1.firstName} ${patient1.lastName} (MRN: ${patient1.medicalRecordNumber})`);
    }

    // Patient 2 - Jane Doe (RTM - Pain Management)
    let patient2 = await prisma.patient.findFirst({
      where: {
        organizationId: organization.id,
        firstName: 'Jane',
        lastName: 'Doe'
      }
    });

    if (!patient2) {
      patient2 = await prisma.patient.create({
        data: {
          organizationId: organization.id,
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: new Date('1970-07-22'),
          gender: 'FEMALE',
          email: 'jane.doe@email.com',
          phone: '(555) 222-2222',
          medicalRecordNumber: 'MRN-002',
          address: '200 Maple Avenue, Test City, TS 12345'
        }
      });
      console.log(`✓ Created patient: ${patient2.firstName} ${patient2.lastName} (MRN: ${patient2.medicalRecordNumber})`);
    } else {
      console.log(`✓ Using existing patient: ${patient2.firstName} ${patient2.lastName} (MRN: ${patient2.medicalRecordNumber})`);
    }

    // Patient 3 - Robert Johnson (RPM - Hypertension)
    let patient3 = await prisma.patient.findFirst({
      where: {
        organizationId: organization.id,
        firstName: 'Robert',
        lastName: 'Johnson'
      }
    });

    if (!patient3) {
      patient3 = await prisma.patient.create({
        data: {
          organizationId: organization.id,
          firstName: 'Robert',
          lastName: 'Johnson',
          dateOfBirth: new Date('1958-11-30'),
          gender: 'MALE',
          email: 'robert.johnson@email.com',
          phone: '(555) 333-3333',
          medicalRecordNumber: 'MRN-003',
          address: '300 Pine Road, Test City, TS 12345'
        }
      });
      console.log(`✓ Created patient: ${patient3.firstName} ${patient3.lastName} (MRN: ${patient3.medicalRecordNumber})\n`);
    } else {
      console.log(`✓ Using existing patient: ${patient3.firstName} ${patient3.lastName} (MRN: ${patient3.medicalRecordNumber})\n`);
    }

    // ===========================
    // 6. ENROLLMENTS
    // ===========================
    console.log('📝 Setting up enrollments...');

    // Enrollment 1 - John Smith in RPM
    let enrollment1 = await prisma.enrollment.findFirst({
      where: {
        patientId: patient1.id,
        careProgramId: rpmProgram.id
      }
    });

    if (!enrollment1) {
      enrollment1 = await prisma.enrollment.create({
        data: {
          organizationId: organization.id,
          patientId: patient1.id,
          clinicianId: clinician1.id,
          careProgramId: rpmProgram.id,
          status: 'ACTIVE',
          startDate: new Date('2025-01-01'),
          notes: 'Enrolled in RPM for diabetes management'
        }
      });
      console.log(`✓ Enrolled ${patient1.firstName} ${patient1.lastName} in ${rpmProgram.name}`);
    } else {
      console.log(`✓ Using existing enrollment for ${patient1.firstName} ${patient1.lastName}`);
    }

    // Enrollment 2 - Jane Doe in RTM
    let enrollment2 = await prisma.enrollment.findFirst({
      where: {
        patientId: patient2.id,
        careProgramId: rtmProgram.id
      }
    });

    if (!enrollment2) {
      enrollment2 = await prisma.enrollment.create({
        data: {
          organizationId: organization.id,
          patientId: patient2.id,
          clinicianId: clinician1.id,
          careProgramId: rtmProgram.id,
          status: 'ACTIVE',
          startDate: new Date('2025-01-01'),
          notes: 'Enrolled in RTM for chronic pain management'
        }
      });
      console.log(`✓ Enrolled ${patient2.firstName} ${patient2.lastName} in ${rtmProgram.name}`);
    } else {
      console.log(`✓ Using existing enrollment for ${patient2.firstName} ${patient2.lastName}`);
    }

    // Enrollment 3 - Robert Johnson in RPM
    let enrollment3 = await prisma.enrollment.findFirst({
      where: {
        patientId: patient3.id,
        careProgramId: rpmProgram.id
      }
    });

    if (!enrollment3) {
      enrollment3 = await prisma.enrollment.create({
        data: {
          organizationId: organization.id,
          patientId: patient3.id,
          clinicianId: clinician2.id,
          careProgramId: rpmProgram.id,
          status: 'ACTIVE',
          startDate: new Date('2025-01-01'),
          notes: 'Enrolled in RPM for hypertension monitoring'
        }
      });
      console.log(`✓ Enrolled ${patient3.firstName} ${patient3.lastName} in ${rpmProgram.name}\n`);
    } else {
      console.log(`✓ Using existing enrollment for ${patient3.firstName} ${patient3.lastName}\n`);
    }

    // ===========================
    // 7. METRIC DEFINITIONS
    // ===========================
    console.log('📊 Setting up metric definitions...');

    const metricsToCreate = [
      {
        key: 'blood_glucose',
        displayName: 'Blood Glucose',
        valueType: 'numeric',
        unit: 'mg/dL',
        normalRange: { min: 70, max: 130 }
      },
      {
        key: 'systolic_bp',
        displayName: 'Systolic Blood Pressure',
        valueType: 'numeric',
        unit: 'mmHg',
        normalRange: { min: 90, max: 120 }
      },
      {
        key: 'diastolic_bp',
        displayName: 'Diastolic Blood Pressure',
        valueType: 'numeric',
        unit: 'mmHg',
        normalRange: { min: 60, max: 80 }
      },
      {
        key: 'pain_level',
        displayName: 'Pain Level',
        valueType: 'numeric',
        unit: '0-10 scale',
        normalRange: { min: 0, max: 3 }
      }
    ];

    for (const metric of metricsToCreate) {
      let existing = await prisma.metricDefinition.findFirst({
        where: {
          organizationId: organization.id,
          key: metric.key
        }
      });

      if (!existing) {
        await prisma.metricDefinition.create({
          data: {
            ...metric,
            organization: {
              connect: { id: organization.id }
            }
          }
        });
        console.log(`✓ Created metric: ${metric.name}`);
      } else {
        console.log(`✓ Using existing metric: ${metric.name}`);
      }
    }

    console.log('\n✅ Persistent test data setup complete!\n');

    // ===========================
    // SUMMARY
    // ===========================
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📋 TEST ENVIRONMENT REFERENCE');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('🏢 ORGANIZATION:');
    console.log(`   Name: ${organization.name}`);
    console.log(`   ID: ${organization.id}\n`);

    console.log('👤 TEST USERS (Login Credentials):');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │ Admin User                                          │');
    console.log('   │ Email: admin@testclinic.com                         │');
    console.log('   │ Password: admin123                                  │');
    console.log('   │ Role: ORG_ADMIN                                     │');
    console.log('   └─────────────────────────────────────────────────────┘');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │ Clinician User                                      │');
    console.log('   │ Email: clinician@testclinic.com                     │');
    console.log('   │ Password: clinician123                              │');
    console.log('   │ Role: CLINICIAN                                     │');
    console.log('   └─────────────────────────────────────────────────────┘');
    console.log('   ┌─────────────────────────────────────────────────────┐');
    console.log('   │ Nurse User                                          │');
    console.log('   │ Email: nurse@testclinic.com                         │');
    console.log('   │ Password: nurse123                                  │');
    console.log('   │ Role: NURSE                                         │');
    console.log('   └─────────────────────────────────────────────────────┘\n');

    console.log('👨‍⚕️ CLINICIANS:');
    console.log(`   1. Dr. Sarah Johnson, MD (Internal Medicine)`);
    console.log(`      ID: ${clinician1.id}`);
    console.log(`      Email: ${clinician1.email}`);
    console.log(`   2. Emily Davis, RN, BSN (Registered Nurse)`);
    console.log(`      ID: ${clinician2.id}`);
    console.log(`      Email: ${clinician2.email}\n`);

    console.log('🧑 TEST PATIENTS:');
    console.log(`   1. John Smith (MRN: MRN-001)`);
    console.log(`      ID: ${patient1.id}`);
    console.log(`      DOB: 1965-03-15`);
    console.log(`      Program: RPM - Diabetes`);
    console.log(`   2. Jane Doe (MRN: MRN-002)`);
    console.log(`      ID: ${patient2.id}`);
    console.log(`      DOB: 1970-07-22`);
    console.log(`      Program: RTM - Pain Management`);
    console.log(`   3. Robert Johnson (MRN: MRN-003)`);
    console.log(`      ID: ${patient3.id}`);
    console.log(`      DOB: 1958-11-30`);
    console.log(`      Program: RPM - Hypertension\n`);

    console.log('🏥 CARE PROGRAMS:');
    console.log(`   1. Remote Patient Monitoring - Diabetes (RPM)`);
    console.log(`      ID: ${rpmProgram.id}`);
    console.log(`   2. Remote Therapeutic Monitoring - Pain Management (RTM)`);
    console.log(`      ID: ${rtmProgram.id}\n`);

    console.log('🌐 APPLICATION URL:');
    console.log('   http://localhost:5173\n');

    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('💡 TIP: Save this output for reference during testing!');
    console.log('💡 You can run this script again anytime - it won\'t create duplicates.\n');

  } catch (error) {
    console.error('❌ Error setting up test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupPersistentTestData();
