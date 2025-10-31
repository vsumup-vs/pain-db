# Automatic Billing Package Suggestion System - Design Plan

> Created: 2025-10-31
> Status: Planning Phase
> Priority: P1 - High Value Enhancement

## Executive Summary

This document proposes an **automatic eligibility checking and billing package suggestion system** that intelligently recommends appropriate billing programs based on patient conditions. The system will analyze patient diagnosis codes (ICD-10) from their condition presets and suggest pre-configured billing packages tailored to specific clinical scenarios.

**Key Capabilities**:
- Automatic mapping from diagnosis codes → billing packages
- Intelligent suggestion engine analyzing patient conditions
- Pre-configured packages for common clinical scenarios (COPD/Asthma, Wound care, GI)
- Real-time eligibility validation before enrollment
- Support for multi-morbidity scenarios

---

## 1. Current State Analysis

### Existing Billing Architecture

The platform already has a **flexible, configurable billing system** implemented:

#### **Database Models** (Implemented):
- **BillingProgram**: Stores billing program details (CMS_RPM_2025, CMS_RTM_2025, CMS_CCM_2025)
- **BillingCPTCode**: Stores CPT codes with JSON-based criteria (e.g., 16 days data, 20 minutes time)
- **BillingEligibilityRule**: Stores eligibility rules with JSON-based logic (INSURANCE, DIAGNOSIS, AGE types)
- **Enrollment**: Links patients to care programs with `billingProgramId` and `billingEligibility` JSON field
- **ConditionPreset**: Pre-configured condition management protocols
- **ConditionPresetDiagnosis**: Links condition presets to ICD-10 diagnosis codes

#### **Service Layer** (Implemented):
- **billingReadinessService.js**: Calculates billing eligibility by evaluating:
  - Eligibility rules (insurance, diagnosis count, age requirements)
  - CPT code criteria (data collection days, clinical time minutes)
  - Returns detailed eligibility breakdown per CPT code

#### **What Currently Works**:
✅ Enrollments can be assigned a specific billing program (e.g., CMS_RPM_2025)
✅ Eligibility evaluation checks if patient meets insurance, diagnosis, age requirements
✅ CPT code eligibility calculated based on observations and time logs
✅ Version-aware billing (effective date tracking for regulatory changes)
✅ Condition presets contain ICD-10 diagnosis information

#### **What's Missing**:
❌ No automatic mapping from diagnosis codes → recommended billing packages
❌ No suggestion engine that analyzes conditions and recommends programs
❌ No pre-configured billing packages for specific conditions (COPD, wound care, GI)
❌ No UI workflow to "suggest billing packages" during enrollment
❌ No templates combining multiple billing programs (RPM + RTM + CCM)

---

## 2. FHIR/HL7 Integration Scenarios

### 2.1 Data Ingestion from External Systems

**Scenario**: Patient data is imported from external EHR systems via FHIR or HL7 v2.x messages, which include diagnosis codes. The system should automatically extract diagnoses and suggest appropriate billing packages.

#### **FHIR R4 Integration**

**Relevant FHIR Resources**:

1. **FHIR Condition Resource** (Diagnosis Codes):
```json
{
  "resourceType": "Condition",
  "id": "condition-copd",
  "clinicalStatus": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
      "code": "active"
    }]
  },
  "verificationStatus": {
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
      "code": "confirmed"
    }]
  },
  "category": [{
    "coding": [{
      "system": "http://terminology.hl7.org/CodeSystem/condition-category",
      "code": "problem-list-item"
    }]
  }],
  "code": {
    "coding": [
      {
        "system": "http://hl7.org/fhir/sid/icd-10-cm",
        "code": "J44.9",
        "display": "Chronic obstructive pulmonary disease, unspecified"
      },
      {
        "system": "http://snomed.info/sct",
        "code": "13645005",
        "display": "Chronic obstructive lung disease"
      }
    ]
  },
  "subject": {
    "reference": "Patient/patient-123"
  },
  "onsetDateTime": "2023-05-15",
  "recordedDate": "2023-05-20"
}
```

2. **FHIR CarePlan Resource** (Care Plans):
```json
{
  "resourceType": "CarePlan",
  "id": "careplan-copd-rpm",
  "status": "active",
  "intent": "plan",
  "title": "COPD Remote Patient Monitoring Plan",
  "description": "Daily peak flow monitoring and symptom tracking",
  "subject": {
    "reference": "Patient/patient-123"
  },
  "period": {
    "start": "2025-11-01"
  },
  "addresses": [
    {
      "reference": "Condition/condition-copd"
    }
  ],
  "activity": [
    {
      "detail": {
        "kind": "ServiceRequest",
        "code": {
          "coding": [{
            "system": "http://snomed.info/sct",
            "code": "719858009",
            "display": "Remote monitoring of patient"
          }]
        },
        "status": "scheduled",
        "scheduledTiming": {
          "repeat": {
            "frequency": 1,
            "period": 1,
            "periodUnit": "d"
          }
        }
      }
    }
  ]
}
```

#### **HL7 v2.x Integration**

**Relevant HL7 Segments**:

**DG1 Segment (Diagnosis Information)**:
```
DG1|1|ICD10|J44.9^COPD, unspecified^ICD10|COPD, unspecified|20231115120000|A|
DG1|2|ICD10|E11.9^Type 2 diabetes mellitus^ICD10|Type 2 diabetes|20230310100000|A|
```

**Example HL7 ADT Message**:
```
MSH|^~\&|EPIC|HOSP|CLINMETRICS|REMOTE|20251101120000||ADT^A01|MSG12345|P|2.5
EVN|A01|20251101120000
PID|1||MRN12345^^^HOSP^MR||DOE^JOHN^A||19650523|M
DG1|1|ICD10|J44.9^COPD, unspecified^ICD10|COPD|20231115120000|A|
DG1|2|ICD10|I10^Essential hypertension^ICD10|Hypertension|20220510100000|A|
```

### 2.2 Automatic Package Suggestion Workflow

When patient data is ingested from FHIR/HL7, the system should automatically:

1. **Extract Diagnosis Codes**:
   - Parse FHIR Condition resources or HL7 DG1 segments
   - Extract ICD-10 codes (or map SNOMED CT → ICD-10)
   - Store in patient's condition presets

2. **Trigger Package Matching**:
   - Automatically run `suggestBillingPackages(patientId)` after data import
   - Match extracted diagnosis codes against BillingPackageTemplate criteria
   - Store suggestions in database for clinician review

3. **Pre-populate Enrollments**:
   - If care plan includes remote monitoring instructions → auto-suggest RPM/RTM packages
   - Create pending enrollments with `status: 'PENDING_APPROVAL'`
   - Notify clinician for review and approval

4. **Handle Code System Mapping**:
   - Support both ICD-10 and SNOMED CT diagnosis codes
   - Maintain mapping table for SNOMED CT → ICD-10 conversion
   - Fall back to UMLS terminology service for unmapped codes

### 2.3 Enhanced Architecture for External Data Integration

#### **New Service: `fhirPatientIntegrationService.js`**

```javascript
/**
 * Import patient from FHIR resources and auto-suggest billing packages
 */
async function importFHIRPatient(fhirBundle, organizationId) {
  // 1. Create/Update Patient
  const patient = await createOrUpdatePatientFromFHIR(fhirBundle.Patient);

  // 2. Extract Condition resources (diagnoses)
  const conditions = fhirBundle.Condition || [];
  const diagnosisCodes = extractDiagnosisCodes(conditions);

  // 3. Store diagnosis codes in patient's condition presets
  await linkDiagnosesToPatient(patient.id, diagnosisCodes);

  // 4. Automatically suggest billing packages
  const suggestedPackages = await suggestBillingPackages(patient.id, organizationId);

  // 5. Parse CarePlan resources for enrollment hints
  const carePlans = fhirBundle.CarePlan || [];
  const enrollmentHints = extractEnrollmentHints(carePlans);

  // 6. Create pending enrollments if care plan specifies remote monitoring
  const pendingEnrollments = await createPendingEnrollmentsFromCarePlan(
    patient.id,
    enrollmentHints,
    suggestedPackages
  );

  return {
    patient,
    diagnosisCodes,
    suggestedPackages,
    pendingEnrollments,
    requiresClinicalReview: true
  };
}

/**
 * Extract diagnosis codes from FHIR Condition resources
 */
function extractDiagnosisCodes(conditions) {
  const diagnosisCodes = [];

  for (const condition of conditions) {
    // Only process active, confirmed conditions
    if (condition.clinicalStatus?.coding?.[0]?.code !== 'active') continue;
    if (condition.verificationStatus?.coding?.[0]?.code !== 'confirmed') continue;

    // Extract ICD-10 codes
    const codings = condition.code?.coding || [];
    for (const coding of codings) {
      if (coding.system === 'http://hl7.org/fhir/sid/icd-10-cm') {
        diagnosisCodes.push({
          code: coding.code,
          display: coding.display,
          codingSystem: 'ICD-10',
          onsetDate: condition.onsetDateTime,
          recordedDate: condition.recordedDate
        });
      } else if (coding.system === 'http://snomed.info/sct') {
        // Map SNOMED CT → ICD-10
        const icd10Code = await mapSNOMEDToICD10(coding.code);
        if (icd10Code) {
          diagnosisCodes.push({
            code: icd10Code.code,
            display: icd10Code.display,
            codingSystem: 'ICD-10',
            sourceSNOMED: coding.code,
            onsetDate: condition.onsetDateTime,
            recordedDate: condition.recordedDate
          });
        }
      }
    }
  }

  return diagnosisCodes;
}

/**
 * Extract enrollment hints from FHIR CarePlan resources
 */
function extractEnrollmentHints(carePlans) {
  const hints = [];

  for (const carePlan of carePlans) {
    if (carePlan.status !== 'active') continue;

    // Look for remote monitoring activities
    const activities = carePlan.activity || [];
    for (const activity of activities) {
      const code = activity.detail?.code?.coding?.[0];

      // Check for remote monitoring SNOMED codes
      if (code?.system === 'http://snomed.info/sct') {
        if (code.code === '719858009') { // Remote monitoring of patient
          hints.push({
            type: 'RPM',
            startDate: carePlan.period?.start,
            addresses: carePlan.addresses?.map(ref => ref.reference)
          });
        } else if (code.code === '385763009') { // Remote therapeutic monitoring
          hints.push({
            type: 'RTM',
            startDate: carePlan.period?.start,
            addresses: carePlan.addresses?.map(ref => ref.reference)
          });
        }
      }
    }
  }

  return hints;
}

/**
 * Create pending enrollments based on care plan and suggested packages
 */
async function createPendingEnrollmentsFromCarePlan(patientId, enrollmentHints, suggestedPackages) {
  const pendingEnrollments = [];

  // Match care plan hints with suggested packages
  for (const hint of enrollmentHints) {
    // Find matching package
    const matchingPackage = suggestedPackages.find(pkg => {
      const programs = pkg.template.billingPrograms;
      return programs.some(prog => prog.programCode.includes(hint.type));
    });

    if (matchingPackage) {
      // Create pending enrollment (requires clinician approval)
      const enrollment = await prisma.enrollment.create({
        data: {
          patientId,
          careProgramId: matchingPackage.template.id,
          status: 'PENDING_APPROVAL',
          startDate: hint.startDate ? new Date(hint.startDate) : new Date(),
          notes: `Auto-suggested from FHIR CarePlan. Package: ${matchingPackage.template.name}`,
          metadata: {
            source: 'FHIR_CAREPLAN',
            suggestedPackageId: matchingPackage.template.id,
            matchScore: matchingPackage.matchScore
          }
        }
      });

      pendingEnrollments.push(enrollment);
    }
  }

  return pendingEnrollments;
}
```

#### **New Service: `hl7PatientIntegrationService.js`**

```javascript
/**
 * Import patient from HL7 v2.x message and auto-suggest billing packages
 */
async function importHL7Patient(hl7Message, organizationId) {
  // Parse HL7 message
  const parsedMessage = parseHL7Message(hl7Message);

  // 1. Extract PID segment (patient demographics)
  const pidSegment = parsedMessage.segments.find(s => s.type === 'PID');
  const patient = await createOrUpdatePatientFromHL7PID(pidSegment);

  // 2. Extract DG1 segments (diagnosis information)
  const dg1Segments = parsedMessage.segments.filter(s => s.type === 'DG1');
  const diagnosisCodes = extractDiagnosisFromDG1(dg1Segments);

  // 3. Store diagnosis codes
  await linkDiagnosesToPatient(patient.id, diagnosisCodes);

  // 4. Automatically suggest billing packages
  const suggestedPackages = await suggestBillingPackages(patient.id, organizationId);

  return {
    patient,
    diagnosisCodes,
    suggestedPackages,
    requiresClinicalReview: true
  };
}

/**
 * Extract diagnosis codes from HL7 DG1 segments
 */
function extractDiagnosisFromDG1(dg1Segments) {
  const diagnosisCodes = [];

  for (const segment of dg1Segments) {
    // DG1 field structure:
    // DG1|SetID|CodingMethod|DiagnosisCode^Description^CodingSystem|...
    const fields = segment.fields;
    const codingMethod = fields[2]; // ICD10, ICD9, SNOMED
    const diagnosisCode = fields[3]?.components[0]; // J44.9
    const description = fields[3]?.components[1]; // COPD, unspecified
    const codingSystem = fields[3]?.components[2]; // ICD10
    const diagnosisDateTime = fields[5]; // 20231115120000

    if (codingMethod === 'ICD10' || codingSystem === 'ICD10') {
      diagnosisCodes.push({
        code: diagnosisCode,
        display: description,
        codingSystem: 'ICD-10',
        recordedDate: parseHL7DateTime(diagnosisDateTime)
      });
    }
  }

  return diagnosisCodes;
}
```

### 2.4 Automatic Enrollment Workflow

**Option A: Fully Automatic (High Confidence)**
- If package match score >90% AND care plan explicitly mentions remote monitoring
- Auto-create enrollments with `status: 'ACTIVE'`
- Send notification to clinician for post-enrollment review

**Option B: Semi-Automatic with Approval (Recommended)**
- Create enrollments with `status: 'PENDING_APPROVAL'`
- Display in "Pending Enrollments" queue for clinician review
- Clinician can approve/reject/modify suggested packages
- Once approved, enrollment becomes `ACTIVE`

**Option C: Suggestion Only**
- Store suggested packages in patient record
- Display badge on patient dashboard: "3 billing packages suggested"
- Clinician manually reviews and creates enrollments

### 2.5 Code System Mapping

**SNOMED CT → ICD-10 Mapping Table**:

```prisma
model CodeSystemMapping {
  id               String   @id @default(cuid())
  sourceSystem     String   // "SNOMED_CT"
  sourceCode       String   // "13645005"
  sourceDisplay    String   // "Chronic obstructive lung disease"
  targetSystem     String   // "ICD-10-CM"
  targetCode       String   // "J44.9"
  targetDisplay    String   // "COPD, unspecified"
  mappingType      String   // "EXACT", "EQUIVALENT", "NARROWER", "BROADER"
  confidence       Decimal  @db.Decimal(3, 2) // 0.95
  evidenceSource   String?  // "UMLS", "Manual", "WHO"
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @default(now()) @updatedAt

  @@unique([sourceSystem, sourceCode, targetSystem])
  @@index([targetSystem, targetCode])
  @@map("code_system_mappings")
}
```

**Mapping Service**:
```javascript
async function mapSNOMEDToICD10(snomedCode) {
  // 1. Check local mapping table
  const mapping = await prisma.codeSystemMapping.findFirst({
    where: {
      sourceSystem: 'SNOMED_CT',
      sourceCode: snomedCode,
      targetSystem: 'ICD-10-CM',
      isActive: true
    },
    orderBy: { confidence: 'desc' }
  });

  if (mapping) {
    return {
      code: mapping.targetCode,
      display: mapping.targetDisplay,
      mappingType: mapping.mappingType,
      confidence: mapping.confidence
    };
  }

  // 2. Fall back to UMLS Terminology Service API
  const umlsMapping = await queryUMLSMapping(snomedCode, 'ICD10CM');
  if (umlsMapping) {
    // Cache the mapping
    await prisma.codeSystemMapping.create({
      data: {
        sourceSystem: 'SNOMED_CT',
        sourceCode: snomedCode,
        sourceDisplay: umlsMapping.sourceDisplay,
        targetSystem: 'ICD-10-CM',
        targetCode: umlsMapping.targetCode,
        targetDisplay: umlsMapping.targetDisplay,
        mappingType: umlsMapping.mappingType,
        confidence: umlsMapping.confidence,
        evidenceSource: 'UMLS'
      }
    });

    return umlsMapping;
  }

  // 3. No mapping found
  return null;
}
```

### 2.6 Integration with Existing Workflow

**Modified Enrollment Creation Flow**:

```javascript
// BEFORE: Manual enrollment creation
async function createEnrollment(patientId, careProgramId, clinicianId) {
  // ... create enrollment
}

// AFTER: With automatic package suggestion
async function createEnrollmentWithSuggestion(patientId, careProgramId, clinicianId) {
  // 1. Check if patient has suggested packages
  const suggestedPackages = await prisma.billingPackageSuggestion.findMany({
    where: {
      patientId,
      status: 'PENDING_REVIEW'
    },
    include: { packageTemplate: true }
  });

  // 2. If suggestions exist, present to clinician
  if (suggestedPackages.length > 0) {
    return {
      enrollmentCreated: false,
      suggestedPackages,
      message: 'Review suggested billing packages before enrollment'
    };
  }

  // 3. Otherwise, proceed with manual enrollment
  return await createEnrollment(patientId, careProgramId, clinicianId);
}
```

### 2.7 API Endpoints for External Integration

**New Endpoints**:

1. **POST `/api/fhir/patient/import`** - Import patient from FHIR bundle
   - Accepts FHIR Bundle with Patient, Condition, CarePlan resources
   - Returns patient ID + suggested packages

2. **POST `/api/hl7/patient/import`** - Import patient from HL7 message
   - Accepts HL7 v2.x ADT message
   - Parses PID and DG1 segments
   - Returns patient ID + suggested packages

3. **GET `/api/patients/:patientId/suggested-packages`** - Get suggested packages for patient
   - Returns list of suggested billing packages with match scores

4. **POST `/api/patients/:patientId/approve-package`** - Approve suggested package
   - Creates enrollments from package template
   - Changes status from PENDING_APPROVAL → ACTIVE

---

## 2.8 Encounter Notes Integration

### 2.8.1 Current Encounter Notes Architecture

**Existing Model** (Implemented in schema.prisma):
```prisma
model EncounterNote {
  id                String        @id @default(cuid())
  encounterType     EncounterType // RPM, RTM, CCM, TCM, GENERAL

  // SOAP Format Fields
  subjective        String?       // Patient's description of symptoms
  objective         String?       // Clinician's observations (vitals, exam findings)
  assessment        String?       // Diagnosis codes, clinical assessment
  plan              String?       // Treatment plan, recommendations

  // Auto-populated Data
  vitalsSnapshot    Json?         // Recent vitals at time of encounter
  assessmentSummary String?       // Summary of recent assessments
  alertsSummary     String?       // Recent alerts context

  // Documentation Metadata
  additionalNotes   String?
  isLocked          Boolean       @default(false)
  attestedById      String?       // Physician attestation
  attestedAt        DateTime?

  // Relationships
  organizationId    String
  patientId         String
  clinicianId       String
  alertId           String?       // If triggered from alert resolution

  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt
}

enum EncounterType {
  RPM    // Remote Patient Monitoring
  RTM    // Remote Therapeutic Monitoring
  CCM    // Chronic Care Management
  TCM    // Transitional Care Management
  GENERAL
}
```

### 2.8.2 Diagnosis Extraction from Encounter Notes

**Challenge**: Clinicians often document diagnosis codes in the **Assessment** section using free-text format (e.g., "COPD (J44.9), HTN (I10)").

**Solution: Natural Language Processing (NLP) + Structured Data Entry**

#### **Option A: NLP-Based Extraction (Future Enhancement)**
```javascript
/**
 * Extract ICD-10 codes from free-text Assessment using NLP
 */
async function extractDiagnosisFromAssessment(assessmentText) {
  // Regex pattern for ICD-10 codes
  const icd10Pattern = /\b([A-Z]\d{2}\.?\d{0,4})\b/g;
  const matches = assessmentText.match(icd10Pattern) || [];

  const diagnosisCodes = [];

  for (const code of matches) {
    // Validate code exists in ICD-10 database
    const validCode = await validateICD10Code(code);
    if (validCode) {
      diagnosisCodes.push({
        code: validCode.code,
        display: validCode.description,
        codingSystem: 'ICD-10',
        extractedFrom: 'ENCOUNTER_NOTE_ASSESSMENT'
      });
    }
  }

  // Also check for common condition names and map to ICD-10
  const conditionMappings = {
    'COPD': 'J44.9',
    'hypertension': 'I10',
    'HTN': 'I10',
    'diabetes': 'E11.9',
    'T2DM': 'E11.9',
    'asthma': 'J45.9',
    // ... more mappings
  };

  for (const [condition, icd10] of Object.entries(conditionMappings)) {
    const regex = new RegExp(`\\b${condition}\\b`, 'i');
    if (regex.test(assessmentText)) {
      const validCode = await validateICD10Code(icd10);
      if (validCode) {
        diagnosisCodes.push({
          code: validCode.code,
          display: validCode.description,
          codingSystem: 'ICD-10',
          extractedFrom: 'ENCOUNTER_NOTE_ASSESSMENT',
          matchedText: condition
        });
      }
    }
  }

  return diagnosisCodes;
}
```

#### **Option B: Structured Diagnosis Entry (Recommended for MVP)**

**Enhanced EncounterNote Model**:
```prisma
model EncounterNote {
  // ... existing fields

  // NEW: Structured diagnosis codes
  diagnosisCodes    Json?         // [
                                  //   { code: "J44.9", display: "COPD", primary: true },
                                  //   { code: "I10", display: "Hypertension", primary: false }
                                  // ]

  // NEW: Treatment recommendations that might trigger package suggestions
  recommendations   Json?         // {
                                  //   remoteMonitoring: true,
                                  //   monitoringType: ["RPM", "RTM"],
                                  //   metrics: ["peak_flow", "oxygen_saturation"]
                                  // }
}
```

**UI Enhancement**: Add diagnosis code picker to encounter note editor:
- Search for ICD-10 codes by name or code
- Mark primary vs secondary diagnoses
- Auto-suggest based on patient's condition presets
- Validate codes against billing program requirements

### 2.8.3 Automatic Package Suggestion Workflow from Encounter Notes

**Trigger Point**: When encounter note is **attested/locked** by clinician

**Workflow**:

```javascript
/**
 * Trigger package suggestion after encounter note completion
 */
async function onEncounterNoteAttested(encounterNoteId) {
  const encounterNote = await prisma.encounterNote.findUnique({
    where: { id: encounterNoteId },
    include: { patient: true, clinician: true }
  });

  // 1. Extract diagnosis codes from structured field OR parse Assessment text
  let diagnosisCodes = encounterNote.diagnosisCodes || [];

  if (diagnosisCodes.length === 0 && encounterNote.assessment) {
    // Fall back to NLP extraction
    diagnosisCodes = await extractDiagnosisFromAssessment(encounterNote.assessment);
  }

  // 2. Update patient's condition presets with new diagnosis codes
  await linkDiagnosesToPatient(encounterNote.patientId, diagnosisCodes);

  // 3. Check if encounter note includes remote monitoring recommendations
  const recommendations = encounterNote.recommendations || {};
  const recommendsRemoteMonitoring =
    recommendations.remoteMonitoring === true ||
    encounterNote.plan?.toLowerCase().includes('remote monitoring') ||
    encounterNote.plan?.toLowerCase().includes('rpm') ||
    encounterNote.plan?.toLowerCase().includes('rtm');

  // 4. Trigger package suggestion
  const suggestedPackages = await suggestBillingPackages(
    encounterNote.patientId,
    encounterNote.organizationId
  );

  // 5. If encounter note recommends remote monitoring AND packages match
  if (recommendsRemoteMonitoring && suggestedPackages.length > 0) {
    // Create pending enrollment with link to encounter note
    for (const suggestion of suggestedPackages.slice(0, 3)) { // Top 3 matches
      await prisma.enrollment.create({
        data: {
          patientId: encounterNote.patientId,
          careProgramId: suggestion.template.id,
          clinicianId: encounterNote.clinicianId,
          status: 'PENDING_APPROVAL',
          startDate: new Date(),
          notes: `Auto-suggested from encounter note ${encounterNote.id}. Clinician noted: "${encounterNote.plan?.substring(0, 200)}"`,
          metadata: {
            source: 'ENCOUNTER_NOTE',
            encounterNoteId: encounterNote.id,
            suggestedPackageId: suggestion.template.id,
            matchScore: suggestion.matchScore,
            extractedDiagnoses: diagnosisCodes
          }
        }
      });
    }

    // 6. Notify clinician
    await notificationService.send({
      userId: encounterNote.clinicianId,
      type: 'ENROLLMENT_SUGGESTION',
      message: `${suggestedPackages.length} billing packages suggested for ${encounterNote.patient.firstName} ${encounterNote.patient.lastName} based on encounter note`,
      actionUrl: `/patients/${encounterNote.patientId}/enrollments`
    });
  }

  return {
    diagnosisCodes,
    suggestedPackages,
    pendingEnrollmentsCreated: recommendsRemoteMonitoring ? suggestedPackages.length : 0
  };
}
```

### 2.8.4 FHIR Export of Encounter Notes

**Use Case**: Share encounter notes with external EHR systems or referring providers.

#### **FHIR Encounter Resource**

```javascript
/**
 * Export encounter note as FHIR R4 Encounter resource
 */
async function exportEncounterNoteToFHIR(encounterNoteId) {
  const encounterNote = await prisma.encounterNote.findUnique({
    where: { id: encounterNoteId },
    include: {
      patient: true,
      clinician: true,
      organization: true
    }
  });

  return {
    resourceType: "Encounter",
    id: encounterNote.id,
    status: encounterNote.isLocked ? "finished" : "in-progress",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "VR", // Virtual (remote encounter)
      display: "virtual"
    },
    type: [{
      coding: [{
        system: "http://snomed.info/sct",
        code: getEncounterSNOMEDCode(encounterNote.encounterType),
        display: getEncounterTypeDisplay(encounterNote.encounterType)
      }]
    }],
    subject: {
      reference: `Patient/${encounterNote.patientId}`,
      display: `${encounterNote.patient.firstName} ${encounterNote.patient.lastName}`
    },
    participant: [{
      type: [{
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
          code: "PPRF",
          display: "primary performer"
        }]
      }],
      individual: {
        reference: `Practitioner/${encounterNote.clinicianId}`,
        display: `${encounterNote.clinician.firstName} ${encounterNote.clinician.lastName}`
      }
    }],
    period: {
      start: encounterNote.createdAt.toISOString(),
      end: encounterNote.attestedAt?.toISOString()
    },
    reasonCode: encounterNote.diagnosisCodes?.map(diag => ({
      coding: [{
        system: "http://hl7.org/fhir/sid/icd-10-cm",
        code: diag.code,
        display: diag.display
      }]
    })) || [],
    serviceProvider: {
      reference: `Organization/${encounterNote.organizationId}`,
      display: encounterNote.organization.name
    }
  };
}

function getEncounterSNOMEDCode(encounterType) {
  const codeMap = {
    'RPM': '719858009', // Remote monitoring of patient
    'RTM': '385763009', // Remote therapeutic monitoring
    'CCM': '734164007', // Care management service
    'TCM': '737481003', // Transitional care management
    'GENERAL': '308335008' // Patient encounter
  };
  return codeMap[encounterType] || '308335008';
}
```

#### **FHIR DocumentReference Resource (Clinical Note)**

```javascript
/**
 * Export encounter note as FHIR DocumentReference (for note content)
 */
async function exportEncounterNoteAsDocument(encounterNoteId) {
  const encounterNote = await prisma.encounterNote.findUnique({
    where: { id: encounterNoteId },
    include: { patient: true, clinician: true }
  });

  // Generate narrative text from SOAP fields
  const narrativeText = generateSOAPNarrative(encounterNote);

  return {
    resourceType: "DocumentReference",
    id: `encounter-note-${encounterNote.id}`,
    status: encounterNote.isLocked ? "current" : "preliminary",
    type: {
      coding: [{
        system: "http://loinc.org",
        code: "11506-3",
        display: "Progress note"
      }]
    },
    category: [{
      coding: [{
        system: "http://hl7.org/fhir/us/core/CodeSystem/us-core-documentreference-category",
        code: "clinical-note",
        display: "Clinical Note"
      }]
    }],
    subject: {
      reference: `Patient/${encounterNote.patientId}`
    },
    date: encounterNote.createdAt.toISOString(),
    author: [{
      reference: `Practitioner/${encounterNote.clinicianId}`,
      display: `${encounterNote.clinician.firstName} ${encounterNote.clinician.lastName}`
    }],
    content: [{
      attachment: {
        contentType: "text/plain",
        data: Buffer.from(narrativeText).toString('base64'),
        title: `${encounterNote.encounterType} Encounter Note - ${encounterNote.createdAt.toISOString().split('T')[0]}`
      }
    }],
    context: {
      encounter: [{
        reference: `Encounter/${encounterNote.id}`
      }],
      related: encounterNote.alertId ? [{
        reference: `Observation/${encounterNote.alertId}` // Link to triggering alert
      }] : []
    }
  };
}

function generateSOAPNarrative(encounterNote) {
  return `
ENCOUNTER NOTE - ${encounterNote.encounterType}
Date: ${encounterNote.createdAt.toISOString()}
Clinician: ${encounterNote.clinician.firstName} ${encounterNote.clinician.lastName}

SUBJECTIVE:
${encounterNote.subjective || 'Not documented'}

OBJECTIVE:
${encounterNote.objective || 'Not documented'}
${encounterNote.vitalsSnapshot ? `\nVitals Snapshot:\n${JSON.stringify(encounterNote.vitalsSnapshot, null, 2)}` : ''}

ASSESSMENT:
${encounterNote.assessment || 'Not documented'}

PLAN:
${encounterNote.plan || 'Not documented'}

${encounterNote.additionalNotes ? `\nADDITIONAL NOTES:\n${encounterNote.additionalNotes}` : ''}

${encounterNote.attestedAt ? `\nATTESTED BY: ${encounterNote.attestedBy?.firstName} ${encounterNote.attestedBy?.lastName} on ${encounterNote.attestedAt.toISOString()}` : ''}
  `.trim();
}
```

### 2.8.5 Sharing Encounter Notes Externally

**Use Cases**:
1. **Send to Referring Provider** - Share encounter notes with primary care physician or specialist
2. **EHR Integration** - Push encounter notes back to Epic, Cerner, etc.
3. **Billing Documentation** - Include encounter notes in CMS billing packages
4. **Patient Portal** - Allow patients to view their encounter notes

#### **Sharing Workflow**

```javascript
/**
 * Share encounter note with external system
 */
async function shareEncounterNote(encounterNoteId, shareOptions) {
  const {
    shareWithSystem,      // 'EHR', 'REFERRING_PROVIDER', 'BILLING', 'PATIENT_PORTAL'
    recipientEmail,       // For email sharing
    fhirEndpoint,         // For FHIR-enabled EHR systems
    includeAttachments    // Include vitals, alerts, assessments
  } = shareOptions;

  const encounterNote = await prisma.encounterNote.findUnique({
    where: { id: encounterNoteId },
    include: {
      patient: true,
      clinician: true,
      organization: true,
      alert: true
    }
  });

  // Generate FHIR resources
  const fhirEncounter = await exportEncounterNoteToFHIR(encounterNoteId);
  const fhirDocument = await exportEncounterNoteAsDocument(encounterNoteId);

  switch (shareWithSystem) {
    case 'EHR':
      // Push to EHR via FHIR API
      await pushToFHIREndpoint(fhirEndpoint, {
        resourceType: "Bundle",
        type: "transaction",
        entry: [
          { resource: fhirEncounter, request: { method: "POST", url: "Encounter" } },
          { resource: fhirDocument, request: { method: "POST", url: "DocumentReference" } }
        ]
      });
      break;

    case 'REFERRING_PROVIDER':
      // Send via secure email with PDF attachment
      const pdf = await generateEncounterNotePDF(encounterNote);
      await emailService.sendSecure({
        to: recipientEmail,
        subject: `Encounter Note for ${encounterNote.patient.firstName} ${encounterNote.patient.lastName}`,
        body: 'Please find attached encounter note for your patient.',
        attachments: [{ filename: `encounter-${encounterNote.id}.pdf`, content: pdf }]
      });
      break;

    case 'BILLING':
      // Include in billing documentation package
      await attachToBillingPackage(encounterNote);
      break;

    case 'PATIENT_PORTAL':
      // Make available in patient portal
      await makeAvailableToPatient(encounterNoteId);
      break;
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      action: 'ENCOUNTER_NOTE_SHARED',
      resourceType: 'EncounterNote',
      resourceId: encounterNoteId,
      userId: encounterNote.clinicianId,
      organizationId: encounterNote.organizationId,
      metadata: { shareWithSystem, recipientEmail: recipientEmail || 'N/A' },
      hipaaRelevant: true
    }
  });
}
```

### 2.8.6 Auto-Population from FHIR/HL7 Data

**Use Case**: When importing patient from external EHR, pre-populate encounter note with existing clinical data.

```javascript
/**
 * Create encounter note from FHIR Encounter resource
 */
async function importFHIREncounter(fhirEncounter, organizationId) {
  // Extract diagnosis codes from reasonCode
  const diagnosisCodes = fhirEncounter.reasonCode?.flatMap(reason =>
    reason.coding?.filter(c => c.system === 'http://hl7.org/fhir/sid/icd-10-cm')
      .map(c => ({ code: c.code, display: c.display, codingSystem: 'ICD-10' }))
  ) || [];

  // Map FHIR encounter type to our EncounterType enum
  const encounterType = mapFHIRTypeToEncounterType(fhirEncounter.type);

  // Create encounter note with auto-populated assessment
  const encounterNote = await prisma.encounterNote.create({
    data: {
      organizationId,
      patientId: extractPatientId(fhirEncounter.subject.reference),
      clinicianId: extractClinicianId(fhirEncounter.participant?.[0]?.individual?.reference),
      encounterType: encounterType || 'GENERAL',
      diagnosisCodes,
      assessment: diagnosisCodes.map(d => `${d.display} (${d.code})`).join(', '),
      isLocked: fhirEncounter.status === 'finished',
      createdAt: new Date(fhirEncounter.period?.start),
      metadata: {
        source: 'FHIR_IMPORT',
        originalEncounterId: fhirEncounter.id
      }
    }
  });

  // Automatically trigger package suggestion
  await onEncounterNoteAttested(encounterNote.id);

  return encounterNote;
}
```

### 2.8.7 Integration with Time Tracking for Billing

**Enhancement**: Link encounter notes to time logs for billing accuracy.

```javascript
/**
 * Automatically create time log when encounter note is attested
 */
async function createTimeLogFromEncounter(encounterNoteId) {
  const encounterNote = await prisma.encounterNote.findUnique({
    where: { id: encounterNoteId },
    include: { patient: true }
  });

  // Calculate encounter duration
  const duration = encounterNote.attestedAt
    ? Math.ceil((new Date(encounterNote.attestedAt) - new Date(encounterNote.createdAt)) / 60000)
    : 20; // Default 20 minutes if not specified

  // Determine CPT code based on encounter type
  const cptCode = getCPTCodeForEncounterType(encounterNote.encounterType, duration);

  // Find billing enrollment
  const enrollmentId = await findBillingEnrollment(
    encounterNote.patientId,
    encounterNote.organizationId
  );

  // Create time log
  const timeLog = await prisma.timeLog.create({
    data: {
      patientId: encounterNote.patientId,
      clinicianId: encounterNote.clinicianId,
      enrollmentId,
      activity: 'CLINICAL_ENCOUNTER',
      duration,
      cptCode,
      notes: `Encounter note ${encounterNote.id} - ${encounterNote.encounterType}`,
      billable: true,
      loggedAt: encounterNote.attestedAt || new Date(),
      metadata: {
        encounterNoteId: encounterNote.id,
        encounterType: encounterNote.encounterType
      }
    }
  });

  return timeLog;
}

function getCPTCodeForEncounterType(encounterType, duration) {
  switch (encounterType) {
    case 'RPM':
      return duration >= 20 ? '99457' : null;
    case 'RTM':
      return duration >= 20 ? '98977' : null;
    case 'CCM':
      return duration >= 30 ? '99491' : (duration >= 20 ? '99490' : null);
    default:
      return duration >= 20 ? '99457' : null;
  }
}
```

### 2.8.8 Enhanced Encounter Note UI Workflow

**User Experience Enhancements**:

1. **Diagnosis Code Picker**:
   - Searchable ICD-10 code dropdown in Assessment section
   - Auto-suggest based on patient's condition presets
   - Mark primary vs secondary diagnoses

2. **Package Suggestion Badge**:
   - After attesting encounter note: "3 billing packages suggested ⚡"
   - Click badge to review suggestions inline

3. **Quick Enrollment Action**:
   - "Enroll in suggested packages" button after attestation
   - Pre-fills enrollment form with selected programs

4. **FHIR Export Button**:
   - "Share with EHR" button generates FHIR bundle
   - Option to send to multiple recipients (PCP, specialist, patient)

5. **Billing Documentation Link**:
   - "Attach to billing package" button for CMS documentation
   - Links encounter note to monthly billing report

---

## 3. Proposed Architecture

### 3.1 New Data Model: BillingPackageTemplate

A **BillingPackageTemplate** represents a pre-configured combination of billing programs tailored to specific clinical conditions.

```prisma
model BillingPackageTemplate {
  id                  String   @id @default(cuid())
  organizationId      String?  // NULL = platform-level template
  name                String   // "COPD/Asthma Remote Monitoring Package"
  code                String   @unique // "COPD_ASTHMA_PKG_2025"
  category            String   // "RESPIRATORY", "WOUND_CARE", "GI", "DIABETES", etc.
  description         String
  isActive            Boolean  @default(true)

  // Condition mapping (which diagnoses trigger this package)
  diagnosisCriteria   Json     // {
                               //   "icd10Codes": ["J45.*", "J44.*"],
                               //   "matchType": "ANY" | "ALL",
                               //   "excludeCodes": []
                               // }

  // Billing programs included in this package
  billingPrograms     Json     // [
                               //   {
                               //     "programCode": "CMS_RPM_2025",
                               //     "priority": 1,
                               //     "required": true,
                               //     "description": "Peak flow monitoring (99454) + monthly clinical time (99457/99458)"
                               //   },
                               //   {
                               //     "programCode": "CMS_RTM_2025",
                               //     "priority": 2,
                               //     "required": false,
                               //     "description": "Symptom diaries and inhaler adherence (98976 + 98980/98981)"
                               //   },
                               //   {
                               //     "programCode": "CMS_CCM_2025",
                               //     "priority": 3,
                               //     "required": false,
                               //     "condition": "hasMultipleChronicConditions",
                               //     "description": "Chronic care management for multi-morbidity (99490/99491)"
                               //   }
                               // ]

  // Expected metrics/devices
  recommendedMetrics  Json     // ["peak_flow", "inhaler_adherence", "symptom_diary"]

  // Clinical rationale
  clinicalRationale   String?  // "COPD/Asthma patients benefit from daily peak flow monitoring..."
  evidenceSource      String?  // "CMS NCD, GOLD Guidelines, etc."

  // Eligibility pre-checks
  preRequisites       Json?    // {
                               //   "minAge": 18,
                               //   "insuranceTypes": ["Medicare", "Medicaid"],
                               //   "requiredConsents": ["RPM_MONITORING", "DATA_TRANSMISSION"]
                               // }

  createdAt           DateTime @default(now())
  updatedAt           DateTime @default(now()) @updatedAt

  organization        Organization? @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
  @@index([category])
  @@index([isActive])
  @@map("billing_package_templates")
}
```

### 2.2 Suggestion Engine Service

**New Service**: `billingPackageSuggestionService.js`

This service analyzes patient data and suggests appropriate billing packages.

#### **Core Functions**:

1. **`suggestBillingPackages(patientId, organizationId)`**
   - Retrieves patient's condition presets and diagnosis codes
   - Matches against BillingPackageTemplate criteria
   - Returns ranked list of suggested packages with eligibility scores

2. **`evaluatePackageEligibility(patientId, packageTemplateId)`**
   - Checks if patient meets package prerequisites (age, insurance, consents)
   - Validates diagnosis codes match package criteria
   - Returns detailed eligibility report per billing program in package

3. **`createEnrollmentFromPackage(patientId, packageTemplateId, selectedPrograms)`**
   - Creates multiple enrollments (one per selected billing program)
   - Links enrollments to appropriate billing programs
   - Populates `billingEligibility` JSON with verified criteria

4. **`getPackageRecommendations(conditionPresetId)`**
   - Given a condition preset, returns all matching billing packages
   - Used during enrollment workflow to suggest packages

#### **Matching Algorithm**:

```javascript
/**
 * Match patient diagnoses to billing package templates
 */
async function matchPackages(patientDiagnosisCodes, organizationId) {
  // Get all active package templates (platform + organization)
  const templates = await prisma.billingPackageTemplate.findMany({
    where: {
      isActive: true,
      OR: [
        { organizationId: null }, // Platform-level
        { organizationId }        // Organization-specific
      ]
    }
  });

  const matches = [];

  for (const template of templates) {
    const criteria = template.diagnosisCriteria;
    const matchScore = calculateMatchScore(patientDiagnosisCodes, criteria);

    if (matchScore > 0) {
      matches.push({
        template,
        matchScore,
        matchedCodes: getMatchedCodes(patientDiagnosisCodes, criteria.icd10Codes),
        eligibilityStatus: await quickEligibilityCheck(template, patientId)
      });
    }
  }

  // Sort by match score (highest first) and priority
  return matches.sort((a, b) => {
    if (a.matchScore !== b.matchScore) return b.matchScore - a.matchScore;
    return a.template.priority - b.template.priority;
  });
}

/**
 * Calculate match score based on diagnosis code overlap
 */
function calculateMatchScore(patientCodes, packageCriteria) {
  const { icd10Codes, matchType, excludeCodes = [] } = packageCriteria;

  // Check exclusions
  const hasExcludedCodes = patientCodes.some(code =>
    excludeCodes.some(excluded => codeMatches(code, excluded))
  );
  if (hasExcludedCodes) return 0;

  // Count matches
  const matchedCount = patientCodes.filter(code =>
    icd10Codes.some(pattern => codeMatches(code, pattern))
  ).length;

  if (matchType === 'ALL') {
    // ALL required codes must match
    return matchedCount === icd10Codes.length ? 100 : 0;
  } else {
    // ANY match is valid - score by percentage
    return (matchedCount / icd10Codes.length) * 100;
  }
}

/**
 * ICD-10 pattern matching (supports wildcards)
 * Example: J45.* matches J45.0, J45.1, J45.9, etc.
 */
function codeMatches(code, pattern) {
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return code.startsWith(prefix);
  }
  return code === pattern;
}
```

---

## 3. Pre-Configured Billing Packages

### 3.1 COPD/Asthma Package

**Package Name**: "COPD/Asthma Remote Monitoring Package"
**Code**: `COPD_ASTHMA_PKG_2025`
**Category**: `RESPIRATORY`

#### **Diagnosis Criteria**:
```json
{
  "icd10Codes": [
    "J45.*",    // Asthma (all types)
    "J44.*",    // COPD (all types)
    "J43.*",    // Emphysema
    "J41.*",    // Chronic bronchitis
    "J42"       // Unspecified chronic bronchitis
  ],
  "matchType": "ANY",
  "excludeCodes": []
}
```

#### **Billing Programs** (Priority Order):

**1. RPM (Remote Patient Monitoring)** - **REQUIRED**
- **Program Code**: `CMS_RPM_2025`
- **CPT Codes**: 99454 (16+ days device readings), 99457/99458 (20+ min clinical time)
- **Description**: "Peak flow monitoring with daily readings. Track lung function trends and medication effectiveness."
- **Recommended Metrics**: `peak_flow`, `oxygen_saturation`, `heart_rate`, `respiratory_rate`
- **Devices**: Peak flow meter, pulse oximeter (optional)

**2. RTM (Remote Therapeutic Monitoring)** - **OPTIONAL**
- **Program Code**: `CMS_RTM_2025`
- **CPT Codes**: 98976 (16+ days data), 98980/98981 (20+ min treatment time)
- **Description**: "Symptom diaries and inhaler adherence tracking. Monitor medication compliance and symptom patterns."
- **Recommended Metrics**: `symptom_diary`, `inhaler_adherence`, `medication_adherence`, `dyspnea_scale`
- **Devices**: Smart inhaler (optional)

**3. CCM (Chronic Care Management)** - **CONDITIONAL**
- **Program Code**: `CMS_CCM_2025`
- **CPT Codes**: 99490 (20+ min care coordination), 99491 (30+ min complex)
- **Description**: "Monthly care coordination for patients with multiple chronic conditions (e.g., COPD + diabetes + hypertension)."
- **Condition**: Patient has 2+ chronic conditions (comorbidities)
- **Triggers**: `hasMultipleChronicConditions === true`

#### **Prerequisites**:
```json
{
  "minAge": 18,
  "insuranceTypes": ["Medicare Part B", "Medicare Advantage"],
  "requiredConsents": ["RPM_MONITORING", "DATA_TRANSMISSION"],
  "excludedConditions": [] // None specific
}
```

#### **Clinical Rationale**:
"COPD/Asthma patients benefit from daily peak flow monitoring to detect exacerbations early and adjust treatment. Combining RPM for physiologic data with RTM for behavioral adherence tracking provides comprehensive disease management. CCM is recommended for patients with comorbidities requiring complex care coordination."

---

### 3.2 Wound Care Package

**Package Name**: "Wound Care Remote Therapeutic Monitoring Package"
**Code**: `WOUND_CARE_PKG_2025`
**Category**: `WOUND_CARE`

#### **Diagnosis Criteria**:
```json
{
  "icd10Codes": [
    "L89.*",    // Pressure ulcers (all stages)
    "L97.*",    // Non-pressure chronic ulcers (leg, ankle, foot)
    "L98.4*",   // Chronic ulcer of skin
    "I70.2*",   // Atherosclerosis with ulceration
    "E11.62*",  // Diabetic foot ulcer
    "T81.3*"    // Disruption of surgical wound
  ],
  "matchType": "ANY",
  "excludeCodes": []
}
```

#### **Billing Programs** (Priority Order):

**1. RTM (Remote Therapeutic Monitoring)** - **REQUIRED**
- **Program Code**: `CMS_RTM_2025`
- **CPT Codes**: 98976 (16+ days wound assessments), 98980/98981 (20+ min treatment time)
- **Description**: "Daily wound assessments, dressing change adherence, pain tracking, and healing progress documentation."
- **Recommended Metrics**: `wound_size`, `wound_depth`, `drainage_amount`, `pain_level`, `dressing_adherence`, `edema_scale`
- **Devices**: Smartphone camera for wound photos, ruler for measurements

**2. CCM/PCM (Chronic Care Management)** - **RECOMMENDED**
- **Program Code**: `CMS_CCM_2025` or `CMS_PCM_2025`
- **CPT Codes**: 99490 (20+ min coordination), 99426/99427 (PCM for single condition)
- **Description**: "Monthly care coordination for wound supply logistics, nutrition consults, infection monitoring, and specialist referrals."
- **Condition**: Always recommended for wound care due to complexity

**3. RPM (Remote Patient Monitoring)** - **OPTIONAL**
- **Program Code**: `CMS_RPM_2025`
- **CPT Codes**: 99454 (16+ days weight/temp/HR readings), 99457/99458 (20+ min clinical time)
- **Description**: "Optional surveillance for edema (weight), infection risk (temperature), or cardiovascular stability (heart rate)."
- **Condition**: Only if patient has:
  - Edema/fluid retention (monitor weight with Bluetooth scale)
  - Infection risk (monitor temperature)
  - Cardiovascular comorbidity (monitor HR/BP)

#### **Prerequisites**:
```json
{
  "minAge": 18,
  "insuranceTypes": ["Medicare Part B", "Medicare Advantage", "Medicaid"],
  "requiredConsents": ["RTM_MONITORING", "PHOTO_DOCUMENTATION"],
  "excludedConditions": []
}
```

#### **Clinical Rationale**:
"Chronic wounds require frequent monitoring and care coordination. RTM enables patients to submit daily wound photos and assessments, reducing in-person visits while ensuring early detection of complications. CCM/PCM coordinates dressing supplies, nutrition support, and specialist care. RPM is added only when physiologic monitoring (weight for edema, temperature for infection) provides clinical value."

---

### 3.3 GI Package (IBS/GERD)

**Package Name**: "Gastrointestinal Symptom Management Package"
**Code**: `GI_SYMPTOM_PKG_2025`
**Category**: `GASTROINTESTINAL`

#### **Diagnosis Criteria**:
```json
{
  "icd10Codes": [
    "K58.*",    // IBS (all types)
    "K21.*",    // GERD (all types)
    "K59.*",    // Functional intestinal disorders
    "K52.9",    // Chronic gastroenteritis
    "K31.84"    // Gastroparesis
  ],
  "matchType": "ANY",
  "excludeCodes": []
}
```

#### **Billing Programs** (Priority Order):

**1. RTM (Remote Therapeutic Monitoring)** - **REQUIRED**
- **Program Code**: `CMS_RTM_2025`
- **CPT Codes**: 98976 (16+ days symptom diaries), 98980/98981 (20+ min treatment time)
- **Description**: "Daily symptom tracking with Bristol stool scale, GERD-Q questionnaire, medication adherence, and trigger identification (diet, stress)."
- **Recommended Metrics**: `bristol_stool_scale`, `gerd_q_score`, `abdominal_pain_scale`, `nausea_scale`, `medication_adherence`, `trigger_diary`
- **Devices**: Smartphone for symptom diary entry

**2. CCM/PCM (Chronic Care Management)** - **CONDITIONAL**
- **Program Code**: `CMS_CCM_2025` or `CMS_PCM_2025`
- **CPT Codes**: 99490 (20+ min coordination), 99426/99427 (PCM for single condition)
- **Description**: "Care coordination for complex GI cases with dietary counseling, medication optimization, and specialist referrals."
- **Condition**: Recommended if patient has:
  - Multiple GI conditions (IBS + GERD)
  - Significant functional impairment
  - Comorbid conditions (anxiety, depression)

**3. RPM (Remote Patient Monitoring)** - **OPTIONAL**
- **Program Code**: `CMS_RPM_2025`
- **CPT Codes**: 99454 (16+ days weight readings), 99457/99458 (20+ min clinical time)
- **Description**: "Optional weight monitoring for severe GERD with weight loss or liver disease with ascites."
- **Condition**: Only if patient has:
  - GERD with documented weight loss (K21.* + R63.4)
  - Cirrhosis with ascites (K70.3*, K71.7, K74.*)
  - Gastroparesis with malnutrition (K31.84 + E46)

#### **Prerequisites**:
```json
{
  "minAge": 18,
  "insuranceTypes": ["Medicare Part B", "Medicare Advantage", "Medicaid"],
  "requiredConsents": ["RTM_MONITORING"],
  "excludedConditions": []
}
```

#### **Clinical Rationale**:
"GI conditions like IBS and GERD benefit from detailed symptom tracking to identify triggers and optimize therapy. RTM enables patients to document Bristol stool scores, GERD-Q responses, and dietary triggers, providing clinicians with actionable data. CCM/PCM is recommended for complex cases requiring dietary counseling and medication management. RPM weight monitoring is reserved for patients at nutritional risk (severe GERD with weight loss, gastroparesis)."

---

## 4. Implementation Approach

### Phase 1: Database Schema (Week 1)

1. **Create BillingPackageTemplate model** in Prisma schema
2. **Migration file** to create `billing_package_templates` table
3. **Seed script** to populate the three packages (COPD/Asthma, Wound Care, GI)

### Phase 2: Backend Service Layer (Week 2)

1. **Create `billingPackageSuggestionService.js`** with core functions:
   - `suggestBillingPackages(patientId, organizationId)`
   - `evaluatePackageEligibility(patientId, packageTemplateId)`
   - `createEnrollmentFromPackage(patientId, packageTemplateId, selectedPrograms)`
   - `getPackageRecommendations(conditionPresetId)`

2. **Create API endpoints** (`src/routes/billingPackageRoutes.js`):
   - `GET /api/billing-packages` - List all available packages
   - `GET /api/billing-packages/suggest/:patientId` - Suggest packages for patient
   - `GET /api/billing-packages/:packageId/eligibility/:patientId` - Check eligibility
   - `POST /api/billing-packages/:packageId/enroll/:patientId` - Create enrollments from package

3. **Integrate with existing enrollment workflow**:
   - Modify enrollment controller to accept `packageTemplateId` parameter
   - Auto-populate `billingProgramId` and `billingEligibility` from package template

### Phase 3: Frontend UI (Week 3)

1. **Create Billing Package Suggestion Modal** (`frontend/src/components/BillingPackageSuggestionModal.jsx`):
   - Display matched packages with match scores
   - Show billing programs included in each package
   - Display eligibility status per program
   - Allow clinician to select which programs to enroll patient in

2. **Integrate into Enrollment Workflow**:
   - Add "Suggest Billing Packages" button to enrollment creation page
   - Trigger modal when button clicked or condition preset selected
   - Auto-fill billing program selection based on chosen package

3. **Create Package Management Page** (Admin):
   - View all package templates
   - Create/edit custom organization-specific packages
   - Preview package criteria and billing programs

### Phase 4: Testing & Validation (Week 4)

1. **Unit tests** for package matching algorithm
2. **Integration tests** for enrollment creation from packages
3. **End-to-end tests** for suggestion workflow
4. **Clinical validation** with healthcare advisors

---

## 5. User Workflow Example

### Scenario: Enrolling a COPD Patient

**Step 1: Patient Selection**
- Clinician navigates to Enrollments page
- Clicks "Create New Enrollment"
- Selects patient "John Doe" (who has COPD diagnosis J44.9)

**Step 2: Automatic Package Suggestion**
- System detects diagnosis J44.9 (COPD) from patient's condition presets
- Automatically displays "Suggested Billing Packages" section with:
  - ✅ **COPD/Asthma Remote Monitoring Package** (98% match)
    - Matched diagnosis: J44.9 (COPD)
    - Eligibility: ✅ Medicare Part B verified
    - Programs included:
      - **RPM** (99454, 99457/99458) - REQUIRED - ✅ Eligible
      - **RTM** (98976, 98980/98981) - OPTIONAL - ✅ Eligible
      - **CCM** (99490, 99491) - CONDITIONAL - ⚠️ Not eligible (only 1 chronic condition)

**Step 3: Program Selection**
- Clinician reviews package details
- Selects programs to enroll:
  - ✅ RPM (checked) - "Peak flow monitoring is essential for COPD management"
  - ✅ RTM (checked) - "Also track inhaler adherence"
  - ☐ CCM (unchecked) - "Patient doesn't have multiple chronic conditions"

**Step 4: Enrollment Creation**
- System creates 2 enrollments:
  - Enrollment 1: RPM program (CMS_RPM_2025) with billingEligibility populated
  - Enrollment 2: RTM program (CMS_RTM_2025) with billingEligibility populated
- Assigns recommended metrics (peak flow, O2 sat, inhaler adherence)
- Clinician is prompted to order devices (peak flow meter, smart inhaler)

**Step 5: Monitoring Begins**
- Patient starts submitting daily peak flow readings (RPM)
- Patient tracks inhaler use (RTM)
- Clinician receives alerts for abnormal readings
- Billing readiness calculated monthly for both programs

---

## 6. Benefits of This Approach

### For Clinicians
✅ **Saves time**: No manual research on which billing programs apply
✅ **Reduces errors**: Automatic eligibility checking prevents enrollment mistakes
✅ **Clinical guidance**: Recommended packages based on evidence-based protocols
✅ **Revenue optimization**: Suggests all applicable billing programs (RPM + RTM + CCM)

### For Billing Staff
✅ **Accurate billing**: Enrollments created with correct billing programs from start
✅ **Compliance**: Pre-configured packages align with CMS requirements
✅ **Documentation**: Package rationale provides audit trail

### For Patients
✅ **Appropriate monitoring**: Enrolled in programs tailored to their condition
✅ **Better outcomes**: Evidence-based packages designed for optimal care
✅ **Convenience**: Minimal redundant data collection

### For Platform
✅ **Scalability**: Easy to add new packages (diabetes, CHF, hypertension, etc.)
✅ **Customization**: Organizations can create custom packages
✅ **Version control**: Package updates tracked with effective dates
✅ **Flexibility**: Supports multi-program enrollment (RPM + RTM + CCM)

---

## 7. Future Enhancements

### Phase 2 Features (Post-MVP)

1. **Machine Learning Suggestions**:
   - Analyze historical patient outcomes to refine package recommendations
   - Predict which patients most likely to benefit from RTM vs RPM

2. **Dynamic Eligibility Scoring**:
   - Real-time eligibility scoring based on patient engagement
   - Predictive analytics for "likelihood to meet billing requirements"

3. **Package Bundles**:
   - Pre-configured bundles combining multiple conditions (e.g., "Diabetes + Hypertension + CKD")

4. **Regional Variations**:
   - Support for UK NHS packages, Australia packages, etc.
   - Payer-specific packages (Medicare vs Medicaid vs private insurance)

5. **Outcome Tracking**:
   - Track clinical outcomes per package (readmission rates, exacerbation rates)
   - Compare effectiveness of different package configurations

---

## 8. Success Metrics

### Operational Metrics
- **Enrollment time reduction**: Target 50% reduction in enrollment creation time
- **Billing accuracy**: Target 95%+ enrollments have correct billing program
- **Program utilization**: Target 30% increase in multi-program enrollment (RPM + RTM)

### Clinical Metrics
- **Patient adherence**: Target 10% improvement in assessment completion rates
- **Alert response**: Target 20% reduction in time-to-intervention for high-risk patients

### Financial Metrics
- **Revenue per patient**: Target 25% increase from multi-program billing
- **Billing package adoption**: Target 80% of eligible patients enrolled via package suggestions

---

## 9. Technical Considerations

### Performance
- **Package matching**: Cache matched packages per patient (invalidate on diagnosis change)
- **Eligibility checks**: Async evaluation to avoid blocking UI
- **Database indexes**: Index on `BillingPackageTemplate.diagnosisCriteria` (JSONB GIN index)

### Security
- **RBAC**: Only ORG_ADMIN and CLINICIAN roles can view/suggest packages
- **Audit logging**: Log all package suggestions and enrollment decisions
- **PHI protection**: Ensure diagnosis codes are protected under HIPAA

### Data Integrity
- **Validation**: Ensure ICD-10 code format validation (regex patterns)
- **Referential integrity**: Foreign keys between enrollments and billing programs
- **Versioning**: Track package template versions with effective dates

---

## 10. Implementation Checklist

### Phase 1: Database Schema
- [ ] Add BillingPackageTemplate model to Prisma schema
- [ ] Create migration file
- [ ] Write seed script for 3 packages (COPD/Asthma, Wound Care, GI)
- [ ] Test seed script in dev environment

### Phase 2: Backend Service
- [ ] Create `billingPackageSuggestionService.js`
- [ ] Implement package matching algorithm
- [ ] Implement eligibility evaluation
- [ ] Create API routes and controllers
- [ ] Write unit tests for matching logic
- [ ] Write integration tests for API endpoints

### Phase 3: Frontend UI
- [ ] Create BillingPackageSuggestionModal component
- [ ] Integrate modal into enrollment workflow
- [ ] Add "Suggest Packages" button to enrollment page
- [ ] Create package management admin page
- [ ] Write component tests

### Phase 4: Testing & Validation
- [ ] End-to-end testing with real patient scenarios
- [ ] Clinical validation with healthcare advisors
- [ ] Performance testing for package matching
- [ ] Security audit for HIPAA compliance
- [ ] User acceptance testing with pilot clinic

---

## 11. Dependencies

### Required Before Implementation
1. ✅ BillingProgram, BillingCPTCode, BillingEligibilityRule models exist
2. ✅ billingReadinessService.js calculates eligibility
3. ✅ ConditionPreset and ConditionPresetDiagnosis models exist
4. ✅ Enrollment workflow functional

### Blocking Issues
- None identified - all prerequisites are in place

---

## 12. Questions for Stakeholders

1. **Clinical Validation**:
   - Are the 3 proposed packages (COPD/Asthma, Wound Care, GI) clinically appropriate?
   - Should we add additional packages (diabetes, CHF, hypertension)?

2. **Billing Rules**:
   - Do these packages align with CMS billing policies?
   - Are there payer-specific variations we need to support?

3. **User Workflow**:
   - Should package suggestions be automatic (modal on enrollment) or manual (button click)?
   - Should clinicians be able to modify package selections before enrollment?

4. **Organization Customization**:
   - Should organizations be able to create custom packages?
   - Should platform-level packages be modifiable per organization?

---

## Conclusion

This automatic billing package suggestion system will **significantly improve enrollment accuracy and revenue optimization** by intelligently recommending appropriate billing programs based on patient conditions. The configurable architecture ensures scalability and supports future enhancements (ML-based suggestions, outcome tracking).

**Next Steps**:
1. Review this plan with clinical and billing stakeholders
2. Approve package configurations (COPD/Asthma, Wound Care, GI)
3. Prioritize implementation phases based on organizational needs
4. Begin Phase 1 implementation (database schema and seed data)

---

**Document Owner**: AI Assistant
**Reviewers**: Clinical Advisory Board, Billing Team, Product Owner
**Approval Date**: Pending Review
**Implementation Start**: Pending Approval
