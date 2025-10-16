# Flexible Billing Configuration Architecture

> Created: 2025-10-16
> Status: Proposed - Enhancement to Billing Architecture Implementation Plan
> Priority: Critical

## Executive Summary

This document enhances the billing architecture implementation plan by making billing requirements **configurable rather than hardcoded**. This enables:
- Easy updates when CMS requirements change
- Support for international billing standards
- Custom billing programs per region/payer
- Future-proof architecture for regulatory changes

## Problem with Hardcoded Requirements

### Current Proposed Approach (Hardcoded):
```javascript
// ❌ HARDCODED - requires code changes when requirements change
if (uniqueDays >= 16) {  // What if CMS changes this to 18 days?
  billableCodes.push({ code: '99454', eligible: true });
}

if (totalMinutes >= 20) {  // What if requirement changes to 25 minutes?
  billableCodes.push({ code: '99457', eligible: true });
}
```

**Issues:**
- Requires code deployment to update billing requirements
- Cannot support regional variations (US CMS vs UK NHS vs Australia)
- Cannot handle payer-specific requirements (Medicare vs Medicaid vs private insurance)
- Difficult to version/audit requirement changes

## Proposed Solution: Configurable Billing Rules

### New Schema Models

#### 1. BillingProgram Model

```prisma
model BillingProgram {
  id          String   @id @default(cuid())
  name        String   // "CMS RPM 2025", "Medicare RTM", "Medicaid CCM"
  code        String   @unique // "CMS_RPM_2025"
  region      String   // "US", "UK", "AU", "CA"
  payer       String?  // "CMS", "Medicare", "Medicaid", "Private"
  programType String   // "RPM", "RTM", "CCM", "TCM"
  version     String   // "2025.1" for tracking requirement changes
  effectiveFrom DateTime
  effectiveTo   DateTime?
  isActive    Boolean  @default(true)

  // Billing requirements as JSON
  requirements Json     // {
                        //   dataCollectionDays: 16,
                        //   clinicalTimeMinutes: 20,
                        //   setupRequired: true,
                        //   chronicConditionsMin: 2,
                        //   eligibilityCriteria: { ... }
                        // }

  description String?
  notes       String?

  // Relationships
  cptCodes    BillingCPTCode[]
  eligibilityRules BillingEligibilityRule[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([region, programType])
  @@index([isActive])
  @@index([effectiveFrom, effectiveTo])
  @@map("billing_programs")
}
```

#### 2. BillingCPTCode Model

```prisma
model BillingCPTCode {
  id                String   @id @default(cuid())
  billingProgramId  String
  code              String   // "99453", "99454", "99457"
  description       String   // "Initial setup and patient education"
  category          String   // "SETUP", "DATA_COLLECTION", "CLINICAL_TIME"
  isRecurring       Boolean  @default(false) // Can bill monthly vs one-time

  // Billing criteria as JSON
  criteria          Json     // {
                            //   type: "DATA_DAYS",
                            //   threshold: 16,
                            //   operator: ">=",
                            //   calculationMethod: "unique_days_device_observations"
                            // }
                            // OR
                            // {
                            //   type: "CLINICAL_TIME",
                            //   thresholdMinutes: 20,
                            //   maxMinutes: 40,
                            //   operator: ">=",
                            //   calculationMethod: "sum_billable_time_logs"
                            // }

  // Reimbursement info
  reimbursementRate Decimal? @db.Decimal(10, 2)
  currency          String?  @default("USD")

  displayOrder      Int      @default(0)
  isActive          Boolean  @default(true)

  // Relationships
  billingProgram    BillingProgram @relation(fields: [billingProgramId], references: [id], onDelete: Cascade)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@unique([billingProgramId, code])
  @@index([billingProgramId])
  @@index([code])
  @@map("billing_cpt_codes")
}
```

#### 3. BillingEligibilityRule Model

```prisma
model BillingEligibilityRule {
  id                String   @id @default(cuid())
  billingProgramId  String
  ruleName          String   // "Medicare Part B Eligibility"
  ruleType          String   // "INSURANCE", "DIAGNOSIS", "AGE", "CONSENT", "CUSTOM"
  priority          Int      @default(0)
  isRequired        Boolean  @default(true)

  // Rule logic as JSON
  ruleLogic         Json     // {
                            //   type: "INSURANCE",
                            //   operator: "IN",
                            //   values: ["Medicare", "Medicaid"],
                            //   errorMessage: "Patient must have Medicare or Medicaid"
                            // }
                            // OR
                            // {
                            //   type: "DIAGNOSIS",
                            //   operator: "MIN_COUNT",
                            //   minCount: 2,
                            //   codingSystems: ["ICD-10"],
                            //   expectedDuration: "12_MONTHS",
                            //   errorMessage: "Requires 2+ chronic conditions lasting 12+ months"
                            // }
                            // OR
                            // {
                            //   type: "AGE",
                            //   operator: ">=",
                            //   value: 18,
                            //   errorMessage: "Patient must be 18 or older"
                            // }

  description       String?

  // Relationships
  billingProgram    BillingProgram @relation(fields: [billingProgramId], references: [id], onDelete: Cascade)

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  @@index([billingProgramId])
  @@index([ruleType])
  @@map("billing_eligibility_rules")
}
```

#### 4. Enhanced Enrollment Model

```prisma
model Enrollment {
  // ... existing fields

  billingProgramId  String?  // NEW: Link to specific billing configuration
  billingProgram    BillingProgram? @relation(fields: [billingProgramId], references: [id])

  billingEligibility Json?   // {
                              //   eligible: true,
                              //   eligibilityDate: "2025-10-01",
                              //   verifiedRules: [
                              //     { ruleId: "rule-123", ruleName: "Medicare Part B", passed: true },
                              //     { ruleId: "rule-456", ruleName: "2+ Chronic Conditions", passed: true }
                              //   ],
                              //   chronicConditions: ["E11.9", "I10"],
                              //   insurance: { type: "Medicare Part B", memberId: "..." },
                              //   verifiedBy: "clinician-id",
                              //   verifiedAt: "2025-10-01T10:30:00Z"
                              // }

  // ... rest of model
}
```

### Migration File

```sql
-- Create billing_programs table
CREATE TABLE "billing_programs" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "region" TEXT NOT NULL,
  "payer" TEXT,
  "programType" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "requirements" JSONB NOT NULL,
  "description" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "billing_programs_region_programType_idx" ON "billing_programs"("region", "programType");
CREATE INDEX "billing_programs_isActive_idx" ON "billing_programs"("isActive");
CREATE INDEX "billing_programs_effectiveFrom_effectiveTo_idx" ON "billing_programs"("effectiveFrom", "effectiveTo");

-- Create billing_cpt_codes table
CREATE TABLE "billing_cpt_codes" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "billingProgramId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "criteria" JSONB NOT NULL,
  "reimbursementRate" DECIMAL(10,2),
  "currency" TEXT DEFAULT 'USD',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("billingProgramId") REFERENCES "billing_programs"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "billing_cpt_codes_billingProgramId_code_key" ON "billing_cpt_codes"("billingProgramId", "code");
CREATE INDEX "billing_cpt_codes_billingProgramId_idx" ON "billing_cpt_codes"("billingProgramId");
CREATE INDEX "billing_cpt_codes_code_idx" ON "billing_cpt_codes"("code");

-- Create billing_eligibility_rules table
CREATE TABLE "billing_eligibility_rules" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "billingProgramId" TEXT NOT NULL,
  "ruleName" TEXT NOT NULL,
  "ruleType" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "ruleLogic" JSONB NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  FOREIGN KEY ("billingProgramId") REFERENCES "billing_programs"("id") ON DELETE CASCADE
);

CREATE INDEX "billing_eligibility_rules_billingProgramId_idx" ON "billing_eligibility_rules"("billingProgramId");
CREATE INDEX "billing_eligibility_rules_ruleType_idx" ON "billing_eligibility_rules"("ruleType");

-- Add billingProgramId to enrollments
ALTER TABLE "enrollments"
ADD COLUMN "billingProgramId" TEXT;

ALTER TABLE "enrollments"
ADD CONSTRAINT "enrollments_billingProgramId_fkey"
FOREIGN KEY ("billingProgramId")
REFERENCES "billing_programs"("id")
ON DELETE SET NULL;

CREATE INDEX "enrollments_billingProgramId_idx" ON "enrollments"("billingProgramId");
```

## Seed Data: CMS 2025 Billing Programs

### File: `prisma/seed-billing-programs-cms-2025.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedCMSBillingPrograms() {
  console.log('Seeding CMS 2025 Billing Programs...');

  // 1. CMS RPM (Remote Patient Monitoring) 2025
  const rpmProgram = await prisma.billingProgram.create({
    data: {
      name: 'CMS Remote Patient Monitoring 2025',
      code: 'CMS_RPM_2025',
      region: 'US',
      payer: 'CMS',
      programType: 'RPM',
      version: '2025.1',
      effectiveFrom: new Date('2025-01-01'),
      isActive: true,
      requirements: {
        dataCollectionDays: 16,
        clinicalTimeMinutes: 20,
        setupRequired: true,
        deviceRequired: true,
        transmissionFrequency: 'DAILY',
        eligibilityCriteria: {
          requiresMedicare: true,
          chronicConditionsMin: 1
        }
      },
      description: 'CMS Remote Patient Monitoring program for Medicare beneficiaries',
      cptCodes: {
        create: [
          {
            code: '99453',
            description: 'Initial setup and patient education',
            category: 'SETUP',
            isRecurring: false,
            criteria: {
              type: 'ONE_TIME_SETUP',
              requiresCompletion: true,
              validityPeriod: 'LIFETIME'
            },
            reimbursementRate: 19.19,
            displayOrder: 1
          },
          {
            code: '99454',
            description: 'Device supply with daily recording and transmission (16+ days)',
            category: 'DATA_COLLECTION',
            isRecurring: true,
            criteria: {
              type: 'DATA_DAYS',
              threshold: 16,
              operator: '>=',
              calculationMethod: 'unique_days_device_observations',
              evaluationPeriod: 'MONTHLY'
            },
            reimbursementRate: 64.53,
            displayOrder: 2
          },
          {
            code: '99457',
            description: 'First 20 minutes of clinical time',
            category: 'CLINICAL_TIME',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME',
              thresholdMinutes: 20,
              maxMinutes: 39,
              operator: '>=',
              calculationMethod: 'sum_billable_time_logs',
              evaluationPeriod: 'MONTHLY',
              cptCodesAllowed: ['99457']
            },
            reimbursementRate: 51.55,
            displayOrder: 3
          },
          {
            code: '99458',
            description: 'Each additional 20 minutes',
            category: 'CLINICAL_TIME_ADDITIONAL',
            isRecurring: true,
            criteria: {
              type: 'CLINICAL_TIME_INCREMENTAL',
              thresholdMinutes: 20,
              incrementMinutes: 20,
              operator: '>=',
              calculationMethod: 'sum_billable_time_logs_beyond_first_20',
              evaluationPeriod: 'MONTHLY',
              requires: ['99457']
            },
            reimbursementRate: 40.84,
            displayOrder: 4
          }
        ]
      },
      eligibilityRules: {
        create: [
          {
            ruleName: 'Medicare Part B Coverage',
            ruleType: 'INSURANCE',
            priority: 1,
            isRequired: true,
            ruleLogic: {
              type: 'INSURANCE',
              operator: 'IN',
              values: ['Medicare Part B', 'Medicare Advantage'],
              errorMessage: 'Patient must have Medicare Part B or Medicare Advantage coverage'
            }
          },
          {
            ruleName: 'Chronic Condition Requirement',
            ruleType: 'DIAGNOSIS',
            priority: 2,
            isRequired: true,
            ruleLogic: {
              type: 'DIAGNOSIS',
              operator: 'MIN_COUNT',
              minCount: 1,
              codingSystems: ['ICD-10'],
              expectedDuration: '3_MONTHS',
              errorMessage: 'Requires at least 1 chronic condition expected to last 3+ months'
            }
          },
          {
            ruleName: 'Informed Consent',
            ruleType: 'CONSENT',
            priority: 3,
            isRequired: true,
            ruleLogic: {
              type: 'CONSENT',
              operator: 'OBTAINED',
              consentTypes: ['RPM_MONITORING', 'DATA_TRANSMISSION'],
              errorMessage: 'Patient consent for remote monitoring and data transmission required'
            }
          }
        ]
      }
    },
    include: {
      cptCodes: true,
      eligibilityRules: true
    }
  });

  console.log('Created CMS RPM 2025:', rpmProgram.id);

  // 2. CMS RTM (Remote Therapeutic Monitoring) 2025
  const rtmProgram = await prisma.billingProgram.create({
    data: {
      name: 'CMS Remote Therapeutic Monitoring 2025',
      code: 'CMS_RTM_2025',
      region: 'US',
      payer: 'CMS',
      programType: 'RTM',
      version: '2025.1',
      effectiveFrom: new Date('2025-01-01'),
      isActive: true,
      requirements: {
        dataCollectionDays: 16,
        treatmentTimeMinutes: 20,
        setupRequired: true,
        therapeuticInterventionRequired: true,
        eligibilityCriteria: {
          requiresMedicare: true,
          therapeuticGoal: true
        }
      },
      description: 'CMS Remote Therapeutic Monitoring for musculoskeletal and respiratory conditions',
      cptCodes: {
        create: [
          {
            code: '98975',
            description: 'Initial setup and patient education',
            category: 'SETUP',
            isRecurring: false,
            criteria: {
              type: 'ONE_TIME_SETUP',
              requiresCompletion: true,
              validityPeriod: 'LIFETIME'
            },
            reimbursementRate: 19.49,
            displayOrder: 1
          },
          {
            code: '98976',
            description: 'Device supply with data transmission (16+ days)',
            category: 'DATA_COLLECTION',
            isRecurring: true,
            criteria: {
              type: 'DATA_DAYS',
              threshold: 16,
              operator: '>=',
              calculationMethod: 'unique_days_therapeutic_data',
              evaluationPeriod: 'MONTHLY'
            },
            reimbursementRate: 56.84,
            displayOrder: 2
          },
          {
            code: '98977',
            description: 'First 20 minutes of treatment management',
            category: 'TREATMENT_TIME',
            isRecurring: true,
            criteria: {
              type: 'TREATMENT_TIME',
              thresholdMinutes: 20,
              maxMinutes: 39,
              operator: '>=',
              calculationMethod: 'sum_treatment_time_logs',
              evaluationPeriod: 'MONTHLY'
            },
            reimbursementRate: 48.79,
            displayOrder: 3
          },
          {
            code: '98980',
            description: 'Each additional 20 minutes (respiratory)',
            category: 'TREATMENT_TIME_ADDITIONAL',
            isRecurring: true,
            criteria: {
              type: 'TREATMENT_TIME_INCREMENTAL',
              thresholdMinutes: 20,
              incrementMinutes: 20,
              operator: '>=',
              calculationMethod: 'sum_treatment_time_logs_beyond_first_20',
              evaluationPeriod: 'MONTHLY',
              requires: ['98977'],
              conditionCategory: 'RESPIRATORY'
            },
            reimbursementRate: 39.24,
            displayOrder: 4
          },
          {
            code: '98981',
            description: 'Each additional 20 minutes (musculoskeletal)',
            category: 'TREATMENT_TIME_ADDITIONAL',
            isRecurring: true,
            criteria: {
              type: 'TREATMENT_TIME_INCREMENTAL',
              thresholdMinutes: 20,
              incrementMinutes: 20,
              operator: '>=',
              calculationMethod: 'sum_treatment_time_logs_beyond_first_20',
              evaluationPeriod: 'MONTHLY',
              requires: ['98977'],
              conditionCategory: 'MUSCULOSKELETAL'
            },
            reimbursementRate: 39.24,
            displayOrder: 5
          }
        ]
      },
      eligibilityRules: {
        create: [
          {
            ruleName: 'Medicare Coverage',
            ruleType: 'INSURANCE',
            priority: 1,
            isRequired: true,
            ruleLogic: {
              type: 'INSURANCE',
              operator: 'IN',
              values: ['Medicare Part B', 'Medicare Advantage'],
              errorMessage: 'Patient must have Medicare coverage'
            }
          },
          {
            ruleName: 'Therapeutic Goal Documentation',
            ruleType: 'CUSTOM',
            priority: 2,
            isRequired: true,
            ruleLogic: {
              type: 'DOCUMENTATION',
              operator: 'REQUIRED',
              documentTypes: ['THERAPEUTIC_GOAL', 'TREATMENT_PLAN'],
              errorMessage: 'Documented therapeutic goal and treatment plan required'
            }
          }
        ]
      }
    },
    include: {
      cptCodes: true,
      eligibilityRules: true
    }
  });

  console.log('Created CMS RTM 2025:', rtmProgram.id);

  // 3. CMS CCM (Chronic Care Management) 2025
  const ccmProgram = await prisma.billingProgram.create({
    data: {
      name: 'CMS Chronic Care Management 2025',
      code: 'CMS_CCM_2025',
      region: 'US',
      payer: 'CMS',
      programType: 'CCM',
      version: '2025.1',
      effectiveFrom: new Date('2025-01-01'),
      isActive: true,
      requirements: {
        careCoordinationMinutes: 20,
        chronicConditionsMin: 2,
        comprehensiveCarePlanRequired: true,
        twentyFourSevenAccessRequired: true,
        eligibilityCriteria: {
          requiresMedicare: true,
          chronicConditionsMin: 2,
          expectedDuration: '12_MONTHS'
        }
      },
      description: 'CMS Chronic Care Management for patients with 2+ chronic conditions',
      cptCodes: {
        create: [
          {
            code: '99490',
            description: 'First 20 minutes of CCM services',
            category: 'CARE_COORDINATION',
            isRecurring: true,
            criteria: {
              type: 'CARE_COORDINATION_TIME',
              thresholdMinutes: 20,
              maxMinutes: 39,
              operator: '>=',
              calculationMethod: 'sum_care_coordination_time',
              evaluationPeriod: 'MONTHLY'
            },
            reimbursementRate: 52.37,
            displayOrder: 1
          },
          {
            code: '99439',
            description: 'Each additional 20 minutes',
            category: 'CARE_COORDINATION_ADDITIONAL',
            isRecurring: true,
            criteria: {
              type: 'CARE_COORDINATION_TIME_INCREMENTAL',
              thresholdMinutes: 20,
              incrementMinutes: 20,
              operator: '>=',
              calculationMethod: 'sum_care_coordination_time_beyond_first_20',
              evaluationPeriod: 'MONTHLY',
              requires: ['99490']
            },
            reimbursementRate: 42.32,
            displayOrder: 2
          },
          {
            code: '99491',
            description: 'Complex CCM - First 30 minutes',
            category: 'COMPLEX_CARE_COORDINATION',
            isRecurring: true,
            criteria: {
              type: 'COMPLEX_CARE_COORDINATION_TIME',
              thresholdMinutes: 30,
              maxMinutes: 59,
              operator: '>=',
              calculationMethod: 'sum_care_coordination_time',
              evaluationPeriod: 'MONTHLY',
              requiresComplexityIndicators: true
            },
            reimbursementRate: 95.17,
            displayOrder: 3
          }
        ]
      },
      eligibilityRules: {
        create: [
          {
            ruleName: 'Medicare Part B Coverage',
            ruleType: 'INSURANCE',
            priority: 1,
            isRequired: true,
            ruleLogic: {
              type: 'INSURANCE',
              operator: 'IN',
              values: ['Medicare Part B'],
              errorMessage: 'Patient must have Medicare Part B coverage'
            }
          },
          {
            ruleName: '2+ Chronic Conditions (12+ months)',
            ruleType: 'DIAGNOSIS',
            priority: 2,
            isRequired: true,
            ruleLogic: {
              type: 'DIAGNOSIS',
              operator: 'MIN_COUNT',
              minCount: 2,
              codingSystems: ['ICD-10'],
              expectedDuration: '12_MONTHS',
              errorMessage: 'Requires 2+ chronic conditions expected to last 12+ months'
            }
          },
          {
            ruleName: 'Comprehensive Care Plan',
            ruleType: 'CUSTOM',
            priority: 3,
            isRequired: true,
            ruleLogic: {
              type: 'DOCUMENTATION',
              operator: 'REQUIRED',
              documentTypes: ['COMPREHENSIVE_CARE_PLAN'],
              errorMessage: 'Comprehensive care plan must be documented'
            }
          },
          {
            ruleName: 'Patient Consent',
            ruleType: 'CONSENT',
            priority: 4,
            isRequired: true,
            ruleLogic: {
              type: 'CONSENT',
              operator: 'OBTAINED',
              consentTypes: ['CCM_SERVICES', 'COST_SHARING_ACKNOWLEDGEMENT'],
              errorMessage: 'Patient must consent to CCM services and acknowledge cost-sharing'
            }
          }
        ]
      }
    },
    include: {
      cptCodes: true,
      eligibilityRules: true
    }
  });

  console.log('Created CMS CCM 2025:', ccmProgram.id);

  console.log('✅ CMS 2025 Billing Programs seeded successfully');
}

seedCMSBillingPrograms()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

## Enhanced Billing Readiness Service (Configuration-Driven)

### File: `src/services/flexibleBillingReadinessService.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate billing readiness using configured billing program rules
 */
async function calculateBillingReadiness(enrollmentId, month, year) {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);

  // Get enrollment with billing program configuration
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      patient: true,
      program: true,
      billingProgram: {
        include: {
          cptCodes: true,
          eligibilityRules: true
        }
      }
    }
  });

  if (!enrollment) {
    throw new Error(`Enrollment ${enrollmentId} not found`);
  }

  if (!enrollment.billingProgram) {
    return {
      enrollmentId,
      eligible: false,
      reason: 'No billing program configured for this enrollment'
    };
  }

  const billingProgram = enrollment.billingProgram;

  // Check if patient is eligible
  if (!enrollment.billingEligibility?.eligible) {
    return {
      enrollmentId,
      programName: billingProgram.name,
      eligible: false,
      reason: 'Patient not verified as billing-eligible',
      billableCodes: []
    };
  }

  // Evaluate each CPT code based on configured criteria
  const billableCodes = [];

  for (const cptCode of billingProgram.cptCodes.filter(c => c.isActive)) {
    const criteria = cptCode.criteria;
    let eligible = false;
    let details = {};

    switch (criteria.type) {
      case 'ONE_TIME_SETUP':
        eligible = await evaluateOneTimeSetup(enrollmentId, cptCode.code, endOfMonth);
        break;

      case 'DATA_DAYS':
        details = await evaluateDataDays(
          enrollmentId,
          startOfMonth,
          endOfMonth,
          criteria
        );
        eligible = details.uniqueDays >= criteria.threshold;
        break;

      case 'CLINICAL_TIME':
      case 'TREATMENT_TIME':
      case 'CARE_COORDINATION_TIME':
        details = await evaluateClinicalTime(
          enrollmentId,
          startOfMonth,
          endOfMonth,
          criteria
        );
        eligible = details.totalMinutes >= criteria.thresholdMinutes;
        break;

      case 'CLINICAL_TIME_INCREMENTAL':
      case 'TREATMENT_TIME_INCREMENTAL':
      case 'CARE_COORDINATION_TIME_INCREMENTAL':
        details = await evaluateIncrementalTime(
          enrollmentId,
          startOfMonth,
          endOfMonth,
          criteria,
          billableCodes
        );
        eligible = details.incrementalBlocks > 0;
        break;

      case 'COMPLEX_CARE_COORDINATION_TIME':
        details = await evaluateComplexCareTime(
          enrollmentId,
          startOfMonth,
          endOfMonth,
          criteria
        );
        eligible = details.totalMinutes >= criteria.thresholdMinutes;
        break;
    }

    billableCodes.push({
      code: cptCode.code,
      description: cptCode.description,
      category: cptCode.category,
      eligible,
      reimbursementRate: cptCode.reimbursementRate?.toNumber(),
      currency: cptCode.currency,
      ...details
    });
  }

  const allEligible = billableCodes.filter(c => c.eligible).length > 0;

  return {
    enrollmentId,
    patientId: enrollment.patientId,
    patientName: `${enrollment.patient.firstName} ${enrollment.patient.lastName}`,
    programName: billingProgram.name,
    programType: billingProgram.programType,
    programVersion: billingProgram.version,
    month,
    year,
    eligible: allEligible,
    billableCodes,
    totalReimbursement: billableCodes
      .filter(c => c.eligible)
      .reduce((sum, c) => sum + (c.reimbursementRate || 0), 0),
    billingEligibility: enrollment.billingEligibility
  };
}

/**
 * Evaluate one-time setup completion
 */
async function evaluateOneTimeSetup(enrollmentId, cptCode, endDate) {
  const setupLog = await prisma.timeLog.findFirst({
    where: {
      enrollmentId,
      cptCode,
      loggedAt: { lte: endDate }
    }
  });

  return !!setupLog;
}

/**
 * Evaluate data collection days
 */
async function evaluateDataDays(enrollmentId, startDate, endDate, criteria) {
  const sourceFilter = criteria.calculationMethod === 'unique_days_device_observations'
    ? { source: 'DEVICE' }
    : criteria.calculationMethod === 'unique_days_therapeutic_data'
    ? { context: { in: ['CLINICAL_MONITORING', 'PROGRAM_ENROLLMENT'] } }
    : {};

  const observations = await prisma.observation.findMany({
    where: {
      enrollmentId,
      recordedAt: { gte: startDate, lte: endDate },
      ...sourceFilter
    },
    select: { recordedAt: true }
  });

  const uniqueDays = new Set(
    observations.map(o => o.recordedAt.toISOString().split('T')[0])
  ).size;

  return {
    uniqueDays,
    threshold: criteria.threshold,
    daysNeeded: Math.max(0, criteria.threshold - uniqueDays)
  };
}

/**
 * Evaluate clinical/treatment/care coordination time
 */
async function evaluateClinicalTime(enrollmentId, startDate, endDate, criteria) {
  const cptCodesAllowed = criteria.cptCodesAllowed || [];

  const timeAgg = await prisma.timeLog.aggregate({
    where: {
      enrollmentId,
      loggedAt: { gte: startDate, lte: endDate },
      billable: true,
      ...(cptCodesAllowed.length > 0 && { cptCode: { in: cptCodesAllowed } })
    },
    _sum: { duration: true }
  });

  const totalMinutes = timeAgg._sum.duration || 0;

  return {
    totalMinutes,
    thresholdMinutes: criteria.thresholdMinutes,
    minutesNeeded: Math.max(0, criteria.thresholdMinutes - totalMinutes)
  };
}

/**
 * Evaluate incremental time blocks
 */
async function evaluateIncrementalTime(enrollmentId, startDate, endDate, criteria, existingCodes) {
  // Check if prerequisite codes are met
  if (criteria.requires) {
    const hasPrerequisites = criteria.requires.every(reqCode =>
      existingCodes.some(c => c.code === reqCode && c.eligible)
    );

    if (!hasPrerequisites) {
      return {
        incrementalBlocks: 0,
        totalMinutes: 0,
        reason: `Requires ${criteria.requires.join(', ')} to be eligible first`
      };
    }
  }

  const timeAgg = await prisma.timeLog.aggregate({
    where: {
      enrollmentId,
      loggedAt: { gte: startDate, lte: endDate },
      billable: true
    },
    _sum: { duration: true }
  });

  const totalMinutes = timeAgg._sum.duration || 0;

  // Calculate blocks beyond first threshold
  const firstThreshold = criteria.requires
    ? existingCodes.find(c => criteria.requires.includes(c.code))?.thresholdMinutes || 0
    : 0;

  const remainingMinutes = Math.max(0, totalMinutes - firstThreshold);
  const incrementalBlocks = Math.floor(remainingMinutes / criteria.incrementMinutes);

  return {
    incrementalBlocks,
    totalMinutes,
    incrementMinutes: criteria.incrementMinutes,
    minutesLogged: incrementalBlocks * criteria.incrementMinutes
  };
}

/**
 * Evaluate complex care coordination time
 */
async function evaluateComplexCareTime(enrollmentId, startDate, endDate, criteria) {
  // Similar to evaluateClinicalTime but checks for complexity indicators
  const result = await evaluateClinicalTime(enrollmentId, startDate, endDate, criteria);

  // TODO: Add complexity indicators check (e.g., comorbidities, social determinants)
  result.complexityIndicators = {
    chronicConditionCount: enrollment.billingEligibility?.eligibilityCriteria?.conditionCount || 0
  };

  return result;
}

/**
 * Calculate billing readiness for organization (all enrollments)
 */
async function calculateOrganizationBillingReadiness(organizationId, month, year) {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      patient: { organizationId },
      status: 'ACTIVE',
      billingProgramId: { not: null }
    },
    include: {
      patient: true,
      program: true,
      billingProgram: true
    }
  });

  const results = [];

  for (const enrollment of enrollments) {
    const readiness = await calculateBillingReadiness(enrollment.id, month, year);
    results.push(readiness);
  }

  // Calculate summary by program type
  const summary = {
    organizationId,
    month,
    year,
    totalEnrollments: results.length,
    eligibleForBilling: results.filter(r => r.eligible).length,
    notEligible: results.filter(r => !r.eligible).length,
    totalReimbursement: results
      .filter(r => r.eligible)
      .reduce((sum, r) => sum + (r.totalReimbursement || 0), 0),
    byProgramType: {},
    enrollments: results
  };

  // Group by program type
  for (const result of results) {
    const programType = result.programType;
    if (!summary.byProgramType[programType]) {
      summary.byProgramType[programType] = {
        count: 0,
        eligible: 0,
        totalReimbursement: 0
      };
    }
    summary.byProgramType[programType].count++;
    if (result.eligible) {
      summary.byProgramType[programType].eligible++;
      summary.byProgramType[programType].totalReimbursement += result.totalReimbursement || 0;
    }
  }

  return summary;
}

module.exports = {
  calculateBillingReadiness,
  calculateOrganizationBillingReadiness
};
```

## Benefits of Configurable Architecture

### 1. **Easy Updates When Requirements Change**

```javascript
// CMS updates RPM to require 18 days instead of 16
await prisma.billingCPTCode.update({
  where: { id: 'cpt-99454-id' },
  data: {
    criteria: {
      type: 'DATA_DAYS',
      threshold: 18,  // Changed from 16
      operator: '>=',
      calculationMethod: 'unique_days_device_observations'
    }
  }
});

// No code deployment needed!
```

### 2. **Support International/Regional Programs**

```javascript
// Add UK NHS Remote Monitoring
await prisma.billingProgram.create({
  data: {
    name: 'NHS Remote Monitoring 2025',
    code: 'NHS_REMOTE_2025',
    region: 'UK',
    payer: 'NHS',
    programType: 'REMOTE_MONITORING',
    version: '2025.1',
    requirements: {
      dataCollectionDays: 14,  // Different from US
      clinicalTimeMinutes: 30  // Different from US
    },
    // UK-specific CPT/OPCS codes
  }
});
```

### 3. **Version History and Auditing**

```javascript
// When requirements change, create new version
await prisma.billingProgram.create({
  data: {
    name: 'CMS Remote Patient Monitoring 2026',
    code: 'CMS_RPM_2026',
    version: '2026.1',
    effectiveFrom: new Date('2026-01-01'),
    // New requirements
  }
});

// Keep old version for historical billing
await prisma.billingProgram.update({
  where: { code: 'CMS_RPM_2025' },
  data: {
    effectiveTo: new Date('2025-12-31'),
    isActive: false
  }
});
```

### 4. **Payer-Specific Variations**

```javascript
// Medicare Advantage may have different requirements
await prisma.billingProgram.create({
  data: {
    name: 'Medicare Advantage RPM 2025',
    code: 'MA_RPM_2025',
    payer: 'Medicare Advantage',
    requirements: {
      dataCollectionDays: 20,  // Stricter than Medicare
      clinicalTimeMinutes: 30
    }
  }
});
```

### 5. **Admin UI for Billing Configuration**

Frontend administrators can update billing requirements without code changes:

- View all billing programs
- Edit CPT code criteria
- Update eligibility rules
- Create new billing programs
- Version and activate/deactivate programs

## Implementation Timeline Enhancement

**Add to existing plan:**

**Phase 0: Configurable Billing Architecture (1 week)**
- Create billing_programs, billing_cpt_codes, billing_eligibility_rules models
- Create migration
- Seed CMS 2025 programs
- Build flexible billing readiness service

**Then proceed with Phases 1-6 as planned**

## Conclusion

This flexible, configuration-driven architecture:
- ✅ Makes billing requirements data, not code
- ✅ Supports CMS requirement changes without deployment
- ✅ Enables international/regional billing programs
- ✅ Maintains version history for auditing
- ✅ Reduces technical debt and maintenance burden
- ✅ Empowers administrators to manage billing rules

**This is the enterprise-grade, future-proof approach you need.**
