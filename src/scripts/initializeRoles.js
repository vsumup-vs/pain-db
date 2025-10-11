const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const roleTemplates = [
  {
    name: 'SUPER_ADMIN',
    role: 'SUPER_ADMIN',
    permissions: [
      'SYSTEM_ADMIN',
      'USER_CREATE', 'USER_READ', 'USER_UPDATE', 'USER_DELETE', 'USER_INVITE', 'USER_ROLE_ASSIGN',
      'ORG_CREATE', 'ORG_READ', 'ORG_UPDATE', 'ORG_DELETE', 'ORG_SETTINGS_MANAGE', 'ORG_USERS_MANAGE', 'ORG_BILLING_MANAGE',
      'PROGRAM_CREATE', 'PROGRAM_READ', 'PROGRAM_UPDATE', 'PROGRAM_DELETE', 'PROGRAM_ASSIGN',
      'PATIENT_CREATE', 'PATIENT_READ', 'PATIENT_UPDATE', 'PATIENT_DELETE', 'PATIENT_ASSIGN', 'PATIENT_MEDICAL_RECORD_READ', 'PATIENT_MEDICAL_RECORD_UPDATE',
      'CLINICIAN_CREATE', 'CLINICIAN_READ', 'CLINICIAN_UPDATE', 'CLINICIAN_DELETE', 'CLINICIAN_ASSIGN',
      'ASSESSMENT_CREATE', 'ASSESSMENT_READ', 'ASSESSMENT_UPDATE', 'ASSESSMENT_DELETE',
      'METRIC_CREATE', 'METRIC_READ', 'METRIC_UPDATE', 'METRIC_DELETE',
      'OBSERVATION_CREATE', 'OBSERVATION_READ', 'OBSERVATION_UPDATE', 'OBSERVATION_DELETE',
      'ALERT_CREATE', 'ALERT_READ', 'ALERT_UPDATE', 'ALERT_DELETE', 'ALERT_ACKNOWLEDGE',
      'MEDICATION_CREATE', 'MEDICATION_READ', 'MEDICATION_UPDATE', 'MEDICATION_DELETE', 'MEDICATION_PRESCRIBE',
      'REPORT_READ', 'REPORT_CREATE', 'ANALYTICS_READ',
      'AUDIT_READ', 'BILLING_READ', 'BILLING_MANAGE', 'COMPLIANCE_READ'
    ],
    description: 'Full system access with all permissions'
  },
  {
    name: 'ORG_ADMIN',
    role: 'ORG_ADMIN',
    permissions: [
      'USER_CREATE', 'USER_READ', 'USER_UPDATE', 'USER_INVITE', 'USER_ROLE_ASSIGN',
      'ORG_READ', 'ORG_UPDATE', 'ORG_SETTINGS_MANAGE', 'ORG_USERS_MANAGE', 'ORG_BILLING_MANAGE',
      'PROGRAM_CREATE', 'PROGRAM_READ', 'PROGRAM_UPDATE', 'PROGRAM_DELETE', 'PROGRAM_ASSIGN',
      'PATIENT_CREATE', 'PATIENT_READ', 'PATIENT_UPDATE', 'PATIENT_ASSIGN', 'PATIENT_MEDICAL_RECORD_READ',
      'CLINICIAN_CREATE', 'CLINICIAN_READ', 'CLINICIAN_UPDATE', 'CLINICIAN_ASSIGN',
      'ASSESSMENT_CREATE', 'ASSESSMENT_READ', 'ASSESSMENT_UPDATE', 'ASSESSMENT_DELETE',
      'METRIC_CREATE', 'METRIC_READ', 'METRIC_UPDATE', 'METRIC_DELETE',
      'OBSERVATION_READ', 'ALERT_READ', 'ALERT_UPDATE', 'ALERT_ACKNOWLEDGE',
      'MEDICATION_READ', 'MEDICATION_UPDATE',
      'REPORT_READ', 'REPORT_CREATE', 'ANALYTICS_READ',
      'BILLING_READ', 'BILLING_MANAGE'
    ],
    description: 'Organization administrator with management permissions'
  },
  {
    name: 'CLINICIAN',
    role: 'CLINICIAN',
    permissions: [
      'PATIENT_READ', 'PATIENT_UPDATE', 'PATIENT_MEDICAL_RECORD_READ', 'PATIENT_MEDICAL_RECORD_UPDATE',
      'ASSESSMENT_CREATE', 'ASSESSMENT_READ', 'ASSESSMENT_UPDATE',
      'METRIC_READ', 'OBSERVATION_CREATE', 'OBSERVATION_READ', 'OBSERVATION_UPDATE',
      'ALERT_READ', 'ALERT_ACKNOWLEDGE',
      'MEDICATION_CREATE', 'MEDICATION_READ', 'MEDICATION_UPDATE', 'MEDICATION_PRESCRIBE',
      'REPORT_READ'
    ],
    programType: 'PAIN_MANAGEMENT',
    description: 'Clinical staff with patient care permissions'
  },
  {
    name: 'NURSE',
    role: 'NURSE',
    permissions: [
      'PATIENT_READ', 'PATIENT_UPDATE', 'PATIENT_MEDICAL_RECORD_READ',
      'ASSESSMENT_CREATE', 'ASSESSMENT_READ',
      'METRIC_READ', 'OBSERVATION_CREATE', 'OBSERVATION_READ',
      'ALERT_READ', 'ALERT_ACKNOWLEDGE',
      'MEDICATION_READ', 'MEDICATION_UPDATE'
    ],
    programType: 'PAIN_MANAGEMENT',
    description: 'Nursing staff with patient monitoring permissions'
  },
  {
    name: 'BILLING_ADMIN',
    role: 'BILLING_ADMIN',
    permissions: [
      'PATIENT_READ', 'BILLING_READ', 'BILLING_MANAGE',
      'REPORT_READ', 'REPORT_CREATE'
    ],
    description: 'Billing and administrative staff'
  },
  {
    name: 'PATIENT',
    role: 'PATIENT',
    permissions: [
      'OBSERVATION_CREATE', 'OBSERVATION_READ',
      'ASSESSMENT_READ', 'MEDICATION_READ'
    ],
    description: 'Patient with limited self-service permissions'
  },
  {
    name: 'CAREGIVER',
    role: 'CAREGIVER',
    permissions: [
      'PATIENT_READ', 'OBSERVATION_READ',
      'ASSESSMENT_READ', 'MEDICATION_READ'
    ],
    description: 'Family member or caregiver with read-only access'
  },
  {
    name: 'RESEARCHER',
    role: 'RESEARCHER',
    permissions: [
      'PATIENT_READ', 'OBSERVATION_READ', 'ASSESSMENT_READ',
      'METRIC_READ', 'REPORT_READ', 'ANALYTICS_READ'
    ],
    description: 'Research staff with anonymized data access'
  }
];

async function initializeRoles() {
  try {
    console.log('🚀 Starting role template initialization...');

    for (const template of roleTemplates) {
      const existing = await prisma.roleTemplate.findUnique({
        where: { name: template.name }
      });

      if (existing) {
        console.log(`✅ Role template '${template.name}' already exists, updating...`);
        await prisma.roleTemplate.update({
          where: { name: template.name },
          data: template
        });
      } else {
        console.log(`➕ Creating role template '${template.name}'...`);
        await prisma.roleTemplate.create({
          data: template
        });
      }
    }

    console.log('✅ Role template initialization completed successfully!');
    
    // Display summary
    const totalRoles = await prisma.roleTemplate.count();
    console.log(`📊 Total role templates in database: ${totalRoles}`);
    
  } catch (error) {
    console.error('❌ Error initializing role templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the initialization
initializeRoles();