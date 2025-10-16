# Production Implementation Strategy

> **Version**: 1.0.0
> **Last Updated**: 2025-10-16
> **Status**: Strategic Planning Document

---

## Table of Contents

1. [Platform Architecture](#platform-architecture)
2. [Standardization Strategy](#standardization-strategy)
3. [Client Onboarding Workflow](#client-onboarding-workflow)
4. [Billing Program Implementation](#billing-program-implementation)
5. [Template Lifecycle Management](#template-lifecycle-management)
6. [Critical Architecture Issue: Billing Eligibility](#critical-architecture-issue-billing-eligibility)
7. [Recommended Architecture Changes](#recommended-architecture-changes)

---

## Platform Architecture

### Multi-Tenant Hierarchy

```
┌─────────────────────────────────────────┐
│     Platform (ClinMetrics Pro)          │
│  ┌────────────────────────────────┐    │
│  │ Standardized Library           │    │
│  │ - Condition Presets (5)        │    │
│  │ - Metrics (20)                 │    │
│  │ - Assessment Templates (5)     │    │
│  │ - Alert Rules (10)             │    │
│  │ organizationId = NULL          │    │
│  │ isStandardized = TRUE          │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
            ↓ Clone & Customize
┌─────────────────────────────────────────┐
│   Organization: "ABC Clinic"            │
│  ┌────────────────────────────────┐    │
│  │ Custom Presets                 │    │
│  │ - Cloned from standard         │    │
│  │ - Organization-specific        │    │
│  │ organizationId = "abc-clinic"  │    │
│  │ sourcePresetId = "std-preset"  │    │
│  └────────────────────────────────┘    │
│           ↓ Enroll Patients            │
│  ┌────────────────────────────────┐    │
│  │ Care Programs                  │    │
│  │ - RTM (Remote Therapeutic)     │    │
│  │ - RPM (Remote Patient Mon)     │    │
│  │ - CCM (Chronic Care Mgmt)      │    │
│  │ - General Wellness             │    │
│  └────────────────────────────────┘    │
│           ↓ Assign to Patients         │
│  ┌────────────────────────────────┐    │
│  │ Patient Enrollments            │    │
│  │ - Patient → Care Program       │    │
│  │ - Condition Preset assigned    │    │
│  │ - Metrics tracked              │    │
│  │ - Assessments scheduled        │    │
│  └────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## Standardization Strategy

### Platform-Level Standardized Library

**Location**: Platform database with `organizationId = NULL`, `isStandardized = TRUE`

**Purpose**:
- Provide evidence-based starting point for all organizations
- Ensure regulatory compliance (ICD-10, SNOMED, LOINC coding)
- Enable cross-organization data comparability
- Accelerate clinic onboarding

**Content** (from `prisma/seed-production.js`):

#### 1. Condition Presets (5)
1. **Chronic Pain Management**
   - ICD-10: M79.3, M25.50
   - Templates: PROMIS Pain Intensity, PROMIS Pain Interference, Daily Symptom Tracker
   - Alert Rules: Severe Pain (>8 for 3+ days), Sudden Pain Increase

2. **Type 2 Diabetes Management**
   - ICD-10: E11.9
   - Templates: Diabetes Distress Scale, Daily Symptom Tracker
   - Alert Rules: Hypoglycemia (<70 mg/dL), Hyperglycemia (>250 mg/dL)

3. **Hypertension Management**
   - ICD-10: I10
   - Templates: Cardiovascular Symptoms, Daily Symptom Tracker
   - Alert Rules: Critical High BP (SBP >180 or DBP >120), Hypotension (SBP <90)

4. **Heart Failure Monitoring**
   - ICD-10: I50.9
   - Templates: KCCQ (Kansas City Cardiomyopathy Questionnaire), Daily Symptom Tracker
   - Alert Rules: Rapid Weight Gain (>3 lbs/24h), Tachycardia (HR >120)

5. **COPD Monitoring**
   - ICD-10: J44.9
   - Templates: COPD Assessment Test (CAT), Daily Symptom Tracker
   - Alert Rules: Hypoxia (O2 sat <90%), Tachypnea (RR >30)

#### 2. Standardized Metrics (20)
- **Vital Signs**: Blood Pressure (Systolic/Diastolic), Heart Rate, Respiratory Rate, Temperature, Weight, O2 Saturation
- **Pain Assessment**: Pain Level (NRS 0-10), Pain Location, Pain Duration
- **Diabetes**: Blood Glucose, HbA1c
- **Cardiac**: Edema, Dyspnea
- **Respiratory**: FEV1, Peak Flow
- **Functional**: Activity Level, Sleep Quality, Fatigue, Mood

#### 3. Standardized Assessment Templates (5)
- **PROMIS Pain Intensity (3-item)** - NIH PROMIS standard
- **PROMIS Pain Interference (4-item)** - NIH PROMIS standard
- **PHQ-9** - Depression screening (Patient Health Questionnaire)
- **GAD-7** - Anxiety screening (Generalized Anxiety Disorder Scale)
- **Daily Symptom Tracker** - Custom (PROMIS-inspired, 0-10 scales)

#### 4. Standardized Alert Rules (10)
- Critical High Blood Pressure, Hypotension, Tachycardia, Bradycardia
- Hypoxia, Severe Pain, Sudden Pain Increase
- Hypoglycemia, Hyperglycemia
- Missed Assessments (adherence monitoring)

**Maintenance**:
- **Quarterly Review**: Clinical advisory board reviews and updates
- **Version Control**: Track changes in `clinicalGuidelines` JSON field
- **Migration Path**: Platform admins can push updates to organizations (with approval)

---

## Client Onboarding Workflow

### Step 1: Organization Setup

**Platform Admin Actions**:
1. Create Organization record
   ```javascript
   await prisma.organization.create({
     data: {
       name: "ABC Clinic",
       type: "CLINIC",
       email: "admin@abcclinic.com",
       settings: {
         billing: { cptCodes: ["99453", "99454", "99457", "99458", "99490", "99491"] },
         timezone: "America/New_York"
       }
     }
   });
   ```

2. Create Organization Admin user
   - Assign `ORG_ADMIN` role in UserOrganization
   - Grant permissions: `ORG_SETTINGS_MANAGE`, `ORG_USERS_MANAGE`, `PATIENT_CREATE`, etc.

3. Run seed script to populate standardized library (if not already done)
   ```bash
   npm run seed:production
   ```

### Step 2: Care Program Configuration

**Organization Admin Actions**:

1. **Create Care Programs** (aligned with billing programs):
   ```javascript
   // RPM (Remote Patient Monitoring)
   await prisma.careProgram.create({
     data: {
       organizationId: orgId,
       name: "Remote Patient Monitoring - Diabetes",
       type: "RPM",
       description: "RPM program for diabetic patients with glucometer",
       isActive: true,
       settings: {
         billing: {
           cptCodes: ["99453", "99454", "99457", "99458"],
           requirements: {
             setupTime: 20,          // minutes (CPT 99453)
             deviceReadings: 16,     // days per month (CPT 99454)
             clinicalTime: 20        // minutes per month (CPT 99457)
           }
         },
         requiredMetrics: ["blood_glucose", "weight", "blood_pressure"],
         assessmentFrequency: "weekly"
       }
     }
   });

   // RTM (Remote Therapeutic Monitoring)
   await prisma.careProgram.create({
     data: {
       organizationId: orgId,
       name: "Remote Therapeutic Monitoring - Pain Management",
       type: "RTM",
       description: "RTM program for chronic pain with daily symptom tracking",
       isActive: true,
       settings: {
         billing: {
           cptCodes: ["98975", "98976", "98977", "98980", "98981"],
           requirements: {
             setupTime: 20,          // minutes (CPT 98975)
             dataSubmissions: 16,    // days per month (CPT 98976)
             clinicalTime: 20        // minutes per month (CPT 98977)
           }
         },
         requiredMetrics: ["pain_level", "pain_location", "mood", "sleep_quality"],
         assessmentFrequency: "daily"
       }
     }
   });

   // CCM (Chronic Care Management)
   await prisma.careProgram.create({
     data: {
       organizationId: orgId,
       name: "Chronic Care Management - Hypertension",
       type: "CCM",
       description: "CCM program for hypertension with monthly clinician touchpoints",
       isActive: true,
       settings: {
         billing: {
           cptCodes: ["99490", "99491"],
           requirements: {
             clinicalTime: 20,       // minutes per month (CPT 99490)
             complexClinicalTime: 30 // minutes for complex patients (CPT 99491)
           }
         },
         requiredMetrics: ["systolic_bp", "diastolic_bp", "weight"],
         assessmentFrequency: "weekly"
       }
     }
   });
   ```

2. **Link Condition Presets to Programs**:
   - Organization admin reviews standardized presets
   - Clones presets they want to use (creates org-specific copy with `sourcePresetId`)
   - Or creates custom presets from scratch

   ```javascript
   // Clone standardized preset
   const stdPreset = await prisma.conditionPreset.findFirst({
     where: { name: "Type 2 Diabetes Management", isStandardized: true },
     include: {
       diagnoses: true,
       templates: { include: { template: true } },
       alertRules: { include: { rule: true } }
     }
   });

   // Create organization-specific copy
   const orgPreset = await prisma.conditionPreset.create({
     data: {
       organizationId: orgId,
       sourcePresetId: stdPreset.id,
       name: stdPreset.name + " (ABC Clinic)",
       description: "Customized for ABC Clinic workflow",
       category: stdPreset.category,
       isStandardized: false,
       clinicalGuidelines: stdPreset.clinicalGuidelines
     }
   });

   // Clone diagnoses, templates, alert rules...
   // (bulk operation)
   ```

### Step 3: Customization (Optional)

**Organization Admin Can**:
- Add custom metrics to existing templates
- Adjust alert rule thresholds (e.g., lower BP threshold for elderly patients)
- Create custom assessment templates for clinic-specific workflows
- Add organization-specific diagnoses to presets

**Example**: ABC Clinic wants stricter BP control for diabetic patients
```javascript
// Clone alert rule and adjust threshold
const stdBPRule = await prisma.alertRule.findFirst({
  where: { name: "Critical High Blood Pressure", isStandardized: true }
});

await prisma.alertRule.create({
  data: {
    organizationId: orgId,
    sourceRuleId: stdBPRule.id,
    name: "High Blood Pressure - Diabetic Patients (Stricter)",
    description: "Lower threshold for diabetic patients per clinic protocol",
    conditions: {
      ...stdBPRule.conditions,
      threshold: 140 // Instead of 180
    },
    actions: stdBPRule.actions,
    severity: "HIGH",
    isStandardized: false,
    category: "Cardiovascular",
    clinicalEvidence: {
      guideline: "ABC Clinic Protocol",
      rationale: "Tighter BP control for diabetic population",
      source: "Internal clinic guidelines"
    }
  }
});
```

### Step 4: Clinician Onboarding

**Organization Admin Actions**:
1. Create Clinician records
2. Create User accounts linked to Clinicians
3. Assign roles and permissions

**Clinician Training**:
- Provided access to preset library
- Training on assessment completion
- Alert triage workflows
- Time logging for billing compliance

---

## Billing Program Implementation

### ⚠️ CRITICAL ISSUE IDENTIFIED

**Current Architecture Problem**:
The platform currently tracks:
- `CareProgram.type` (RTM, RPM, CCM)
- `Enrollment` links Patient → CareProgram
- `Observation` tracks metric data
- `TimeLog` tracks clinical time

**BUT**: There's no direct linkage between:
1. **Eligibility criteria** for billing programs
2. **Program enrollment** workflows
3. **Automated billing readiness** calculations

### Current Data Model Gap

```javascript
// ❌ CURRENT (INCOMPLETE):
Patient → Enrollment → CareProgram (type: "RPM")
              ↓
         Observations (no program linkage!)
         TimeLog (no program linkage!)

// Missing:
// - Which observations count toward "16 days of readings"?
// - Which TimeLog entries count toward "20 minutes clinical time"?
// - How do we track patient eligibility for billing?
```

### Why This Is Critical

**CMS Billing Requirements** vary by program:

#### RPM (Remote Patient Monitoring) - CPT 99453-99458
- **Eligibility**: Patient must have chronic condition requiring monitoring
- **Setup (99453)**: 20+ minutes initial setup
- **Device Supply (99454)**: 16+ days of readings per month
- **Clinical Time (99457)**: 20+ minutes per month
- **Additional Time (99458)**: Each additional 20 minutes

#### RTM (Remote Therapeutic Monitoring) - CPT 98975-98981
- **Eligibility**: Respiratory/musculoskeletal condition OR therapy adherence
- **Setup (98975)**: 20+ minutes initial setup
- **Data Transmission (98976)**: 16+ days of data per month
- **Clinical Time (98977)**: 20+ minutes per month
- **Additional Time (98980/98981)**: Each additional 20 minutes

#### CCM (Chronic Care Management) - CPT 99490-99491
- **Eligibility**: 2+ chronic conditions expected to last 12+ months
- **Clinical Time (99490)**: 20+ minutes per month
- **Complex CCM (99491)**: 30+ minutes per month for complex patients

**The platform needs to**:
1. Track eligibility criteria per patient
2. Link observations to specific billing programs
3. Calculate billing readiness automatically
4. Generate billing reports by program

---

## Recommended Architecture Changes

### Change 1: Add Program Eligibility Tracking

**New Field**: `Enrollment.billingEligibility`

```prisma
model Enrollment {
  id                String           @id @default(cuid())
  organizationId    String
  patientId         String
  clinicianId       String
  careProgramId     String
  conditionPresetId String?
  status            EnrollmentStatus @default(PENDING)
  startDate         DateTime
  endDate           DateTime?
  notes             String?

  // NEW: Billing eligibility tracking
  billingEligibility Json?           // {
                                     //   eligible: true,
                                     //   eligibilityDate: "2025-10-01",
                                     //   chronicConditions: ["E11.9", "I10"],
                                     //   eligibilityCriteria: { ... },
                                     //   verifiedBy: "clinician-id",
                                     //   verifiedAt: "2025-10-01T10:30:00Z"
                                     // }

  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt

  // ... relationships
}
```

**Usage**:
```javascript
// When enrolling patient in RPM program
await prisma.enrollment.create({
  data: {
    patientId,
    careProgramId: rpmProgramId,
    clinicianId,
    conditionPresetId: diabetesPresetId,
    status: "ACTIVE",
    startDate: new Date(),
    billingEligibility: {
      eligible: true,
      eligibilityDate: new Date(),
      chronicConditions: ["E11.9"], // Type 2 Diabetes
      eligibilityCriteria: {
        requiresDeviceData: true,
        deviceType: "glucometer",
        minReadingsPerMonth: 16
      },
      verifiedBy: clinicianId,
      verifiedAt: new Date()
    }
  }
});
```

### Change 2: Link Observations to Enrollments

**Modified Field**: `Observation.enrollmentId`

**Current**:
```prisma
model Observation {
  enrollmentId String? // Optional, no enforcement
  // ...
}
```

**Recommended**:
```prisma
model Observation {
  enrollmentId String // REQUIRED for billing-eligible observations
  // ...
}
```

**New Service**: `billingReadinessService.js`

```javascript
/**
 * Calculate RPM billing readiness for a patient
 */
async function calculateRPMReadiness(enrollmentId, month, year) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: { careProgram: true, patient: true, clinician: true }
  });

  if (enrollment.careProgram.type !== 'RPM') {
    throw new Error('Not an RPM program');
  }

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  // Count unique days with device readings
  const readingDays = await prisma.observation.groupBy({
    by: ['recordedAt'],
    where: {
      enrollmentId,
      source: 'DEVICE', // Only device readings count for RPM
      recordedAt: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    },
    _count: true
  });

  const uniqueDays = new Set(
    readingDays.map(r => r.recordedAt.toISOString().split('T')[0])
  ).size;

  // Calculate clinical time
  const clinicalTime = await prisma.timeLog.aggregate({
    where: {
      patientId: enrollment.patientId,
      enrollmentId, // NEW: filter by enrollment
      loggedAt: {
        gte: startOfMonth,
        lte: endOfMonth
      },
      billable: true
    },
    _sum: { duration: true }
  });

  const totalMinutes = clinicalTime._sum.duration || 0;

  // Determine billable CPT codes
  const billableCodes = [];

  // 99454: Device supply (16+ days of readings)
  if (uniqueDays >= 16) {
    billableCodes.push({ code: '99454', eligible: true, reason: `${uniqueDays} days of readings` });
  } else {
    billableCodes.push({ code: '99454', eligible: false, reason: `Only ${uniqueDays} days (need 16)` });
  }

  // 99457: 20+ minutes clinical time
  if (totalMinutes >= 20) {
    billableCodes.push({ code: '99457', eligible: true, reason: `${totalMinutes} minutes` });
  } else {
    billableCodes.push({ code: '99457', eligible: false, reason: `Only ${totalMinutes} minutes (need 20)` });
  }

  // 99458: Additional 20-minute increments
  if (totalMinutes >= 40) {
    const additionalIncrements = Math.floor((totalMinutes - 20) / 20);
    billableCodes.push({
      code: '99458',
      eligible: true,
      units: additionalIncrements,
      reason: `${additionalIncrements} additional 20-min increments`
    });
  }

  return {
    enrollmentId,
    patientId: enrollment.patientId,
    programType: 'RPM',
    month,
    year,
    readingDays: uniqueDays,
    clinicalTimeMinutes: totalMinutes,
    billableCodes,
    overallEligible: billableCodes.some(c => c.eligible)
  };
}
```

### Change 3: Add TimeLog.enrollmentId

**Modified Model**:
```prisma
model TimeLog {
  id          String   @id @default(cuid())
  patientId   String
  clinicianId String
  enrollmentId String? // NEW: Link to specific enrollment/program
  activity    TimeLogActivity
  duration    Int      // minutes
  cptCode     String?
  notes       String?
  billable    Boolean  @default(false)
  loggedAt    DateTime @default(now())
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  patient    Patient    @relation(fields: [patientId], references: [id])
  clinician  Clinician  @relation(fields: [clinicianId], references: [id])
  enrollment Enrollment? @relation(fields: [enrollmentId], references: [id]) // NEW

  @@index([patientId])
  @@index([clinicianId])
  @@index([enrollmentId]) // NEW
  @@index([loggedAt])
  @@map("time_logs")
}
```

**Usage**:
```javascript
// When resolving alert, specify which program the time applies to
await prisma.timeLog.create({
  data: {
    patientId,
    clinicianId,
    enrollmentId, // NEW: specify enrollment
    activity: 'CALL_PATIENT',
    duration: 15,
    cptCode: '99457', // RPM clinical time
    billable: true,
    notes: 'Reviewed blood glucose readings, adjusted insulin dosing',
    loggedAt: new Date()
  }
});
```

### Change 4: Billing Readiness Dashboard

**New API Endpoint**: `GET /api/billing/readiness`

**Returns**:
```javascript
{
  month: 10,
  year: 2025,
  organizationId: "org-123",
  summary: {
    totalEnrollments: 150,
    billingEligible: 128,
    notEligible: 22,
    revenue: {
      estimated: 25600.00,
      byProgram: {
        RPM: 15000.00,
        RTM: 8000.00,
        CCM: 2600.00
      }
    }
  },
  patients: [
    {
      patientId: "pat-001",
      patientName: "John Doe",
      program: "RPM - Diabetes",
      enrollmentId: "enr-001",
      status: "ELIGIBLE",
      readingDays: 18,
      clinicalTimeMinutes: 25,
      billableCodes: [
        { code: "99454", eligible: true, revenue: 60.00 },
        { code: "99457", eligible: true, revenue: 50.00 }
      ],
      estimatedRevenue: 110.00
    },
    {
      patientId: "pat-002",
      patientName: "Jane Smith",
      program: "RPM - Hypertension",
      enrollmentId: "enr-002",
      status: "NOT_ELIGIBLE",
      readingDays: 12, // Need 16
      clinicalTimeMinutes: 15, // Need 20
      billableCodes: [
        { code: "99454", eligible: false, reason: "Only 12 days (need 16)" },
        { code: "99457", eligible: false, reason: "Only 15 minutes (need 20)" }
      ],
      estimatedRevenue: 0.00,
      actionRequired: "Patient needs 4 more days of readings and 5 more minutes of clinical time"
    }
  ]
}
```

---

## Template Lifecycle Management

### Standardized Templates (Platform-Level)

**Creation**:
- Created by platform admins
- Based on validated clinical instruments
- `isStandardized = TRUE`, `organizationId = NULL`
- Includes copyright info, scoring algorithms, clinical use documentation

**Updates**:
- Quarterly review by clinical advisory board
- Version tracking in `clinicalGuidelines` JSON
- Migration script to update organization clones (optional, with approval)

**Example Update Workflow**:
```javascript
// Platform admin updates standardized template
const stdTemplate = await prisma.assessmentTemplate.update({
  where: { id: 'template-promis-pain-intensity' },
  data: {
    questions: { /* updated questions */ },
    scoring: { /* updated scoring */ },
    clinicalGuidelines: {
      ...existingGuidelines,
      version: "2.1",
      lastUpdated: new Date(),
      changeLog: "Updated PROMIS scoring algorithm per NIH guidelines 2025"
    }
  }
});

// Notify organizations with cloned templates
const clonedTemplates = await prisma.assessmentTemplate.findMany({
  where: { sourceTemplateId: stdTemplate.id }
});

// Send notification to org admins
for (const cloned of clonedTemplates) {
  await notificationService.send({
    organizationId: cloned.organizationId,
    type: 'TEMPLATE_UPDATE_AVAILABLE',
    message: `Updated version of "${stdTemplate.name}" available`,
    action: {
      type: 'REVIEW_AND_APPLY',
      templateId: stdTemplate.id,
      changes: stdTemplate.clinicalGuidelines.changeLog
    }
  });
}
```

### Organization-Specific Templates

**Cloning from Standard**:
```javascript
// Organization admin clones template
const clonedTemplate = await prisma.assessmentTemplate.create({
  data: {
    organizationId: orgId,
    sourceTemplateId: stdTemplate.id,
    name: stdTemplate.name + " (ABC Clinic Modified)",
    description: "Modified for ABC Clinic workflow",
    questions: stdTemplate.questions, // Can be modified
    scoring: stdTemplate.scoring,
    isStandardized: false,
    category: stdTemplate.category,
    standardCoding: stdTemplate.standardCoding,
    clinicalUse: stdTemplate.clinicalUse,
    copyrightInfo: stdTemplate.copyrightInfo
  }
});

// Clone template items (metric mappings)
const stdItems = await prisma.assessmentTemplateItem.findMany({
  where: { templateId: stdTemplate.id }
});

for (const item of stdItems) {
  await prisma.assessmentTemplateItem.create({
    data: {
      templateId: clonedTemplate.id,
      metricDefinitionId: item.metricDefinitionId,
      displayOrder: item.displayOrder,
      isRequired: item.isRequired,
      helpText: item.helpText
    }
  });
}
```

**Custom Creation**:
```javascript
// Organization admin creates custom template from scratch
const customTemplate = await prisma.assessmentTemplate.create({
  data: {
    organizationId: orgId,
    name: "ABC Clinic Pre-Op Assessment",
    description: "Custom pre-operative assessment for surgical patients",
    questions: {
      /* custom questions */
    },
    scoring: {
      /* custom scoring */
    },
    isStandardized: false,
    category: "Surgical",
    clinicalUse: "Pre-operative risk assessment per ABC Clinic protocol"
  }
});
```

### Deprecation & Archival

**Workflow**:
1. Mark template as inactive: `isActive = FALSE`
2. Prevent new assessments using deprecated template
3. Existing assessment data remains accessible (immutable)
4. Archive after 7 years (HIPAA retention requirement)

```javascript
// Deprecate template
await prisma.assessmentTemplate.update({
  where: { id: templateId },
  data: {
    isActive: false,
    clinicalGuidelines: {
      ...existing,
      deprecated: true,
      deprecatedAt: new Date(),
      deprecationReason: "Superseded by updated PROMIS version",
      replacementTemplateId: newTemplateId
    }
  }
});
```

---

## Critical Next Steps

### Immediate (This Week)

1. **Schema Migration**: Add `enrollmentId` to TimeLog model
2. **Add Billing Eligibility**: Add `billingEligibility` JSON field to Enrollment model
3. **Create Billing Readiness Service**: Implement calculations per program type
4. **Update TimeLog Creation**: Modify alert resolution to specify enrollmentId

### Short-Term (Next 2 Weeks)

1. **Build Billing Dashboard**: Frontend for billing readiness by month/program
2. **Eligibility Workflow**: UI for clinicians to verify patient eligibility
3. **Program Setup Wizard**: Guided workflow for org admins to configure programs
4. **Template Cloning UI**: Interface for cloning and customizing presets

### Medium-Term (Next Month)

1. **Automated Billing Reports**: Generate monthly billing packages
2. **Eligibility Alerts**: Notify care managers when patients close to meeting criteria
3. **Template Update Notifications**: Notify orgs when standardized templates updated
4. **Audit Compliance Reports**: HIPAA-compliant audit trail exports

---

## Summary

### Correct Architecture

```javascript
// ✅ CORRECT FLOW:

1. Platform creates standardized library
   - Condition Presets, Metrics, Templates, Alert Rules
   - organizationId = NULL, isStandardized = TRUE

2. Organization clones/customizes presets
   - Creates org-specific copies
   - Links to sourcePresetId for updates

3. Organization creates Care Programs
   - RPM, RTM, CCM programs with billing criteria
   - Settings define requirements (16 days readings, 20 min time, etc.)

4. Patient enrolled in Care Program
   - Enrollment includes billingEligibility verification
   - conditionPresetId determines monitoring protocol

5. Data collection linked to Enrollment
   - Observations have enrollmentId
   - TimeLog has enrollmentId
   - Assessments linked to enrollment

6. Billing readiness calculated automatically
   - Count observations by enrollment
   - Sum TimeLog duration by enrollment
   - Generate billing eligibility report
```

### Key Insight

**You were right to question this!** The current architecture was **collecting data first, then trying to determine billing eligibility**, which is backwards.

**Correct approach**:
1. ✅ Verify patient eligibility for billing program FIRST
2. ✅ Enroll patient in specific program (RPM, RTM, CCM)
3. ✅ Link ALL data collection to that enrollment
4. ✅ Calculate billing readiness automatically from enrollment data

This ensures:
- Clear audit trail for payers
- Accurate billing reports
- Compliance with CMS requirements
- No ambiguity about which data counts toward which program

---

**Next Action**: Review this document and confirm the recommended architecture changes before implementation.
