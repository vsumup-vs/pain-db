# Multi-Region Billing Package System - Implementation Plan

> **Status**: Planning Phase
> **Created**: 2025-11-01
> **Priority**: Strategic - Foundation for International Expansion
> **Coverage**: US, UK, Australia, Canada, India, Middle East (UAE, Saudi Arabia, Qatar, Kuwait)

---

## Executive Summary

This document outlines the plan for implementing a **multi-region, localized billing package system** that enables VitalEdge to deploy across different countries and healthcare systems while maintaining standardized clinical protocols.

### Core Objectives

1. **Region-Specific Billing Programs**: Support US CMS, UK NHS, Australia, Canada, India, Middle East
2. **Localized Content**: Multi-language support including English, Spanish, French, Hindi, Arabic
3. **Flexible Seed Data**: Pre-configured packages available during client setup
4. **Regulatory Compliance**: Region-specific coding systems and privacy regulations
5. **Currency & Units**: Locale-aware reimbursement rates and measurement units

### Supported Regions (6 Major Markets)

| Region | Countries | Languages | Currency | Key Features |
|--------|-----------|-----------|----------|--------------|
| **North America** | US, Canada | English, Spanish, French | USD, CAD | CMS, Provincial programs |
| **Europe** | UK | English | GBP | NHS programmes |
| **Asia-Pacific** | Australia | English | AUD | Medicare programs |
| **South Asia** | India | Hindi, English, 10+ regional | INR | NABH, CGHS, PMJAY |
| **Middle East** | UAE, Saudi, Qatar, Kuwait | Arabic, English | AED, SAR, QAR, KWD | DHA, MOH, Seha, Islamic healthcare |

---

## Current State Assessment

### What We Have ✅

1. **Database Schema Ready**:
   - `BillingProgram.region` field (e.g., "US", "UK", "AU", "IN", "AE")
   - `BillingProgram.payer` field (e.g., "CMS", "NHS", "PMJAY", "DHA")
   - `BillingPackageTemplate.isStandardized` for platform-level templates
   - `Organization.settings` with JSON flexibility

2. **CMS 2025 Programs Seeded**:
   - CMS_RPM_2025, CMS_RTM_2025, CMS_CCM_2025 (US only)
   - 3 billing package templates (COPD/Asthma, Wound Care, GI)

3. **Multi-Tenant Architecture**:
   - Organization-level isolation
   - Configurable settings per organization

### What's Missing ❌

1. **No region-specific seed data** (only US CMS programs)
2. **No localization framework** (all content in English)
3. **No region selection during onboarding**
4. **No currency/unit conversion** (hardcoded USD, imperial units)
5. **No international coding systems** (only ICD-10-CM)
6. **No India/Middle East healthcare systems**
7. **No Hindi/Arabic language support**

---

## Architecture Design

### 1. Region Configuration Model

**New Model: `Region`**

```prisma
model Region {
  id                  String   @id @default(cuid())
  code                String   @unique // "US", "UK", "AU", "CA", "IN", "AE", "SA"
  name                String   // "United States", "India", "United Arab Emirates"
  currency            String   // "USD", "GBP", "AUD", "CAD", "INR", "AED", "SAR"
  measurementSystem   String   // "IMPERIAL", "METRIC"
  defaultLanguage     String   // "en-US", "en-GB", "hi-IN", "ar-AE"
  supportedLanguages  String[] // ["en-US", "es-US"], ["hi-IN", "en-IN", "ta-IN"]

  // Regulatory settings
  regulatoryBody      String?  // "CMS", "NHS", "NABH", "DHA", "MOH"
  codingSystems       Json     // { primary: "ICD-10-CM", secondary: ["CPT", "HCPCS"] }
  privacyRegulation   String?  // "HIPAA", "GDPR", "IT Act 2000", "UAE DPL"

  // Billing settings
  billingCurrency     String   // "USD", "GBP", "INR", "AED"
  taxRate             Decimal? @db.Decimal(5, 2)

  // Cultural settings
  timeZone            String?  // "America/New_York", "Asia/Kolkata", "Asia/Dubai"
  dateFormat          String?  // "MM/DD/YYYY", "DD/MM/YYYY"
  weekStartDay        String?  // "SUNDAY", "MONDAY", "SATURDAY"

  isActive            Boolean  @default(true)
  displayOrder        Int      @default(0)

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  // Relationships
  organizations       Organization[]
  billingPrograms     BillingProgram[]

  @@map("regions")
}
```

**Update Existing Models**:

```prisma
model Organization {
  // ... existing fields
  regionId            String?
  region              Region?  @relation(fields: [regionId], references: [id])
  locale              String?  // "en-US", "en-GB", "hi-IN", "ar-AE"
  country             String?  // For sub-regional variations (e.g., India states, UAE emirates)
}

model BillingProgram {
  // ... existing fields
  regionId            String?
  region              Region?  @relation(fields: [regionId], references: [id])
  country             String?  // For country-specific programs within a region
}

model BillingPackageTemplate {
  // ... existing fields
  supportedRegions    String[] // ["US", "UK", "AU", "IN", "AE"] - empty means all regions
  localizations       Json?    // { "en-US": {...}, "hi-IN": {...}, "ar-AE": {...} }
}
```

---

## Region-Specific Details

### 1. United States (US) - CMS Programs

**Already Implemented**:
- CMS_RPM_2025 (Remote Patient Monitoring)
- CMS_RTM_2025 (Remote Therapeutic Monitoring)
- CMS_CCM_2025 (Chronic Care Management)

**Additional US Programs to Add**:
- CMS_TCM_2025 (Transitional Care Management)
- CMS_BHI_2025 (Behavioral Health Integration)
- CMS_PCM_2025 (Principal Care Management)

**US-Specific Details**:
- **Coding**: ICD-10-CM, CPT, HCPCS
- **Currency**: USD ($)
- **Measurement**: Imperial (lbs, inches, °F)
- **Privacy**: HIPAA
- **Languages**: English, Spanish

---

### 2. United Kingdom (UK) - NHS Programs

**Proposed Programs**:
```javascript
// NHS_REMOTE_MONITORING_2025
{
  code: 'NHS_REMOTE_MONITORING_2025',
  name: 'NHS Remote Patient Monitoring Service',
  region: 'UK',
  payer: 'NHS England',
  programType: 'REMOTE_MONITORING',
  requirements: {
    dataCollectionDays: 14,
    clinicalTimeMinutes: 30,
    setupRequired: true
  },
  reimbursement: {
    type: 'PER_PATIENT_PER_YEAR',
    amount: 250.00,
    currency: 'GBP'
  }
}
```

**UK-Specific Details**:
- **Coding**: ICD-10-UK, OPCS-4, SNOMED CT UK, Read Codes
- **Currency**: GBP (£)
- **Measurement**: Metric (kg, cm, °C)
- **Privacy**: UK GDPR + Data Protection Act 2018
- **Languages**: English (British)
- **Quality Frameworks**: QOF (Quality and Outcomes Framework)

---

### 3. Australia (AU) - Medicare Programs

**Proposed Programs**:
```javascript
// MBS_CDM_2025
{
  code: 'MBS_CDM_2025',
  name: 'Medicare Australia Chronic Disease Management',
  region: 'AU',
  payer: 'Medicare Australia',
  programType: 'CDM',
  mbsItems: ['721', '723', '729', '731'],
  reimbursement: {
    type: 'PER_MBS_ITEM',
    rates: {
      '721': { amount: 71.70, currency: 'AUD' },
      '723': { amount: 143.50, currency: 'AUD' }
    }
  }
}
```

**Australia-Specific Details**:
- **Coding**: ICD-10-AM, ACHI, SNOMED CT-AU
- **Billing**: MBS (Medicare Benefits Schedule) item numbers
- **Currency**: AUD (A$)
- **Measurement**: Metric (kg, cm, °C)
- **Privacy**: Privacy Act 1988
- **Languages**: English (Australian)

---

### 4. Canada (CA) - Provincial Programs

**Proposed Programs**:
```javascript
// OHIP_REMOTE_MONITORING_2025 (Ontario)
{
  code: 'OHIP_REMOTE_MONITORING_2025',
  name: 'OHIP Virtual Care Program',
  region: 'CA',
  country: 'CA-ON',
  payer: 'OHIP',
  programType: 'VIRTUAL_CARE',
  billingCodes: ['K081', 'K082', 'K083'],
  reimbursement: {
    type: 'PER_FEE_CODE',
    rates: {
      'K081': { amount: 50.00, currency: 'CAD' },
      'K082': { amount: 75.00, currency: 'CAD' }
    }
  }
}
```

**Canada-Specific Details**:
- **Coding**: ICD-10-CA, CCI
- **Billing**: Provincial fee schedules (OHIP, MSP, RAMQ, etc.)
- **Currency**: CAD (C$)
- **Measurement**: Metric (kg, cm, °C)
- **Privacy**: PIPEDA + Provincial Acts (PHIPA, PIPA)
- **Languages**: English, French (mandatory in Quebec)

---

### 5. India (IN) - Multiple Healthcare Systems

#### Healthcare Landscape

India has a **complex multi-payer system**:
- **Government schemes**: CGHS, PMJAY (Ayushman Bharat), ESI
- **Private insurance**: Star Health, ICICI Lombard, HDFC ERGO
- **Corporate healthcare**: TPA (Third Party Administrators)
- **Out-of-pocket**: 60%+ of healthcare spending

#### Proposed Programs

**1. NABH Telehealth Standards**
```javascript
{
  code: 'NABH_TELEHEALTH_2025',
  name: 'NABH Telehealth and Digital Health Standards',
  region: 'IN',
  payer: 'NABH Accredited Hospitals',
  programType: 'TELEHEALTH',
  requirements: {
    nabhAccreditationRequired: true,
    doctorRegistration: 'MCI/State Medical Council',
    consentDocumentation: true,
    dataStorageInIndia: true // Data localization law
  },
  reimbursement: {
    type: 'CONSULTATION_BASED',
    rates: {
      'TELE_CONSULT_GENERAL': { amount: 300, currency: 'INR' },
      'TELE_CONSULT_SPECIALIST': { amount: 500, currency: 'INR' },
      'REMOTE_MONITORING_MONTHLY': { amount: 1000, currency: 'INR' }
    }
  }
}
```

**2. PMJAY (Ayushman Bharat) - Government Scheme**
```javascript
{
  code: 'PMJAY_REMOTE_MONITORING_2025',
  name: 'Pradhan Mantri Jan Arogya Yojana - Remote Monitoring',
  region: 'IN',
  payer: 'National Health Authority',
  programType: 'GOVERNMENT_SCHEME',
  requirements: {
    beneficiaryVerification: true,
    aadhaarLinking: true,
    empanelledFacilityRequired: true
  },
  reimbursement: {
    type: 'PACKAGE_RATE',
    packages: {
      'DIABETES_MONITORING_PACKAGE': { amount: 2000, currency: 'INR', duration: 'MONTHLY' },
      'HYPERTENSION_PACKAGE': { amount: 1500, currency: 'INR', duration: 'MONTHLY' },
      'CARDIAC_MONITORING_PACKAGE': { amount: 3000, currency: 'INR', duration: 'MONTHLY' }
    }
  }
}
```

**3. CGHS (Central Government Health Scheme)**
```javascript
{
  code: 'CGHS_REMOTE_MONITORING_2025',
  name: 'CGHS Remote Patient Monitoring',
  region: 'IN',
  payer: 'Central Government',
  programType: 'GOVERNMENT_SCHEME',
  billingCodes: ['CGHS-RPM-001', 'CGHS-RPM-002'],
  reimbursement: {
    type: 'PER_BILLING_CODE',
    rates: {
      'CGHS-RPM-001': { amount: 500, currency: 'INR', description: 'Initial setup' },
      'CGHS-RPM-002': { amount: 200, currency: 'INR', description: 'Per week monitoring' }
    }
  }
}
```

**4. Private Insurance / Corporate**
```javascript
{
  code: 'INDIA_PRIVATE_RPM_2025',
  name: 'India Private Healthcare Remote Monitoring',
  region: 'IN',
  payer: 'Private Insurance/Corporate',
  programType: 'PRIVATE_INSURANCE',
  requirements: {
    priorApprovalRequired: true,
    claimSubmissionFormat: 'IRDAI Standard',
    empanelmentRequired: false
  },
  reimbursement: {
    type: 'NEGOTIATED_RATE',
    indicativeRates: {
      'RPM_MONTHLY': { min: 2000, max: 5000, currency: 'INR' },
      'CCM_MONTHLY': { min: 3000, max: 8000, currency: 'INR' }
    }
  }
}
```

#### India-Specific Considerations

**Coding Systems**:
- **Primary**: ICD-10 (WHO version, not ICD-10-CM)
- **Procedures**: No standardized CPT equivalent (varies by payer)
- **Laboratory**: LOINC (optional)
- **Medications**: Indian Pharmacopoeia (IP) codes

**Currency & Pricing**:
- **Currency**: INR (₹)
- **Pricing Model**: Highly variable
  - Tier-1 cities (Mumbai, Delhi): ₹500-1500 per consult
  - Tier-2/3 cities: ₹200-500 per consult
  - Government schemes: Fixed package rates

**Languages** (Priority Order):
1. **Hindi** (43% of population) - `hi-IN`
2. **English** (Indian English) - `en-IN`
3. **Tamil** (South India) - `ta-IN`
4. **Telugu** (South India) - `te-IN`
5. **Bengali** (East India) - `bn-IN`
6. **Marathi** (Maharashtra) - `mr-IN`
7. **Gujarati** (Gujarat) - `gu-IN`
8. **Kannada** (Karnataka) - `kn-IN`
9. **Malayalam** (Kerala) - `ml-IN`
10. **Punjabi** (Punjab) - `pa-IN`

**Regulatory Compliance**:
- **Privacy**: IT Act 2000, Digital Personal Data Protection Act 2023
- **Data Localization**: Healthcare data must be stored in India
- **Telemedicine**: Telemedicine Practice Guidelines 2020 (MCI/NMC)
- **Accreditation**: NABH (National Accreditation Board for Hospitals)

**Measurement System**:
- **Mixed usage**: Metric (kg, cm) for clinical, but common use of lbs in some regions
- **Temperature**: Celsius (°C)

**Cultural Considerations**:
- **Festivals**: Diwali, Holi, Eid (affects appointment scheduling)
- **Working Hours**: 9 AM - 6 PM (varies by region)
- **Dietary Preferences**: Vegetarian/Non-vegetarian indicators in health tracking

---

### 6. Middle East - UAE, Saudi Arabia, Qatar, Kuwait

#### Healthcare Landscape

The Middle East (GCC countries) has **modern, well-funded healthcare systems**:
- **UAE**: DHA (Dubai Health Authority), DOH (Abu Dhabi), Seha
- **Saudi Arabia**: MOH (Ministry of Health), Vision 2030 digital health initiatives
- **Qatar**: MOPH (Ministry of Public Health), Hamad Medical Corporation
- **Kuwait**: MOH Kuwait

#### Proposed Programs

**1. DHA Dubai - Telehealth & Remote Monitoring**
```javascript
{
  code: 'DHA_TELEHEALTH_2025',
  name: 'DHA Telehealth and Remote Patient Monitoring',
  region: 'AE',
  country: 'AE-DXB',
  payer: 'Dubai Health Authority',
  programType: 'TELEHEALTH',
  requirements: {
    dhaLicenseRequired: true,
    nabidoohIntegration: true, // DHA's health information exchange
    emiratesIDVerification: true,
    arabicContentRequired: true
  },
  reimbursement: {
    type: 'FEE_FOR_SERVICE',
    rates: {
      'TELE_CONSULTATION': { amount: 150, currency: 'AED' },
      'REMOTE_MONITORING_SETUP': { amount: 300, currency: 'AED' },
      'REMOTE_MONITORING_MONTHLY': { amount: 500, currency: 'AED' }
    }
  }
}
```

**2. MOH Saudi Arabia - Vision 2030 Digital Health**
```javascript
{
  code: 'MOH_SA_DIGITAL_HEALTH_2025',
  name: 'Saudi MOH Digital Health Services',
  region: 'SA',
  payer: 'Ministry of Health Saudi Arabia',
  programType: 'DIGITAL_HEALTH',
  requirements: {
    scfhsRegistration: true, // Saudi Commission for Health Specialties
    sehhatiIntegration: true, // National health platform
    arabicLanguageRequired: true,
    shariahCompliance: true
  },
  reimbursement: {
    type: 'CAPITATION',
    rates: {
      'CHRONIC_DISEASE_MANAGEMENT': { amount: 800, currency: 'SAR', per: 'PATIENT_MONTH' },
      'REMOTE_MONITORING': { amount: 400, currency: 'SAR', per: 'PATIENT_MONTH' }
    }
  }
}
```

**3. DOH Abu Dhabi - Seha Virtual Hospital**
```javascript
{
  code: 'DOH_ABU_DHABI_VIRTUAL_2025',
  name: 'Abu Dhabi Department of Health - Virtual Care',
  region: 'AE',
  country: 'AE-AZ',
  payer: 'Department of Health Abu Dhabi',
  programType: 'VIRTUAL_CARE',
  requirements: {
    dohLicenseRequired: true,
    malaffiIntegration: true, // Abu Dhabi's unified medical record
    thiqa: true // Abu Dhabi health insurance scheme
  },
  reimbursement: {
    type: 'INSURANCE_CLAIM',
    indicativeRates: {
      'VIRTUAL_CONSULTATION': { amount: 200, currency: 'AED' },
      'CHRONIC_CARE_MANAGEMENT': { amount: 600, currency: 'AED', per: 'MONTH' }
    }
  }
}
```

**4. Qatar MOPH - National Telemedicine Program**
```javascript
{
  code: 'MOPH_QATAR_TELEMEDICINE_2025',
  name: 'Qatar Ministry of Public Health - Telemedicine',
  region: 'QA',
  payer: 'Ministry of Public Health Qatar',
  programType: 'TELEMEDICINE',
  requirements: {
    qchpLicenseRequired: true, // Qatar Council for Healthcare Practitioners
    cenerIntegration: true, // National health information system
    qatariNationalIDVerification: true
  },
  reimbursement: {
    type: 'FEE_FOR_SERVICE',
    rates: {
      'TELEMEDICINE_CONSULT': { amount: 150, currency: 'QAR' },
      'REMOTE_MONITORING': { amount: 450, currency: 'QAR', per: 'MONTH' }
    }
  }
}
```

#### Middle East - Specific Considerations

**Coding Systems**:
- **Primary**: ICD-10 (WHO version)
- **Procedures**: Country-specific fee schedules (not CPT)
- **Laboratory**: LOINC (increasingly adopted)
- **Medications**: Local drug registries (DHA Drug List, Saudi FDA)

**Currencies**:
- **UAE**: AED (د.إ) - Fixed to USD at 3.67:1
- **Saudi Arabia**: SAR (﷼) - Fixed to USD at 3.75:1
- **Qatar**: QAR (ر.ق) - Fixed to USD at 3.64:1
- **Kuwait**: KWD (د.ك) - Highest valued currency globally

**Languages**:
1. **Arabic** (Official) - `ar-AE`, `ar-SA`, `ar-QA`, `ar-KW`
2. **English** (Business/Medical) - `en-AE`, `en-SA`
3. **Urdu** (Expatriate population) - `ur-PK`
4. **Hindi** (Expatriate population) - `hi-IN`
5. **Filipino** (Expatriate population) - `fil-PH`

**Regulatory Compliance**:
- **UAE**: UAE Data Protection Law (Federal Decree-Law No. 45/2021)
- **Saudi Arabia**: Personal Data Protection Law (PDPL)
- **Qatar**: Data Protection Law No. 13/2016
- **Kuwait**: Law No. 20/2014 on Electronic Transactions

**Healthcare Accreditation**:
- **UAE**: JCI (Joint Commission International), CBAHI
- **Saudi Arabia**: CBAHI (Central Board for Accreditation of Healthcare Institutions)
- **Qatar**: Accreditation Canada
- **Kuwait**: Australian Council on Healthcare Standards (ACHS)

**Measurement System**:
- **Metric**: kg, cm, °C (universal)

**Cultural & Religious Considerations**:
- **Islamic Calendar**: Hijri calendar alongside Gregorian
- **Prayer Times**: Appointment scheduling respects 5 daily prayers
- **Ramadan**: Fasting month affects appointment scheduling and medication timing
- **Gender Preferences**: Option to request same-gender clinician
- **Halal Compliance**: Medication ingredient considerations (gelatin, alcohol)
- **Weekend**: Friday-Saturday (UAE, Qatar, Saudi) vs Saturday-Sunday (Kuwait)

**Special Features for Middle East**:
```javascript
// Organization settings for Middle East
{
  culturalSettings: {
    calendar: 'GREGORIAN_HIJRI', // Show both calendars
    prayerTimes: true, // Show prayer times in scheduling
    ramadanMode: true, // Adjust medication reminders during Ramadan
    genderPreference: true, // Allow patient to request same-gender clinician
    halalMedicationFilter: true, // Flag medications with non-halal ingredients
    weekendDays: ['FRIDAY', 'SATURDAY'] // UAE/Saudi/Qatar
  }
}
```

---

## Seed Data Architecture

**Directory Structure**:
```
prisma/
├── seed-production.js                    # Main orchestrator
├── seeds/
│   ├── regions/
│   │   ├── seed-regions.js               # All supported regions
│   │   ├── us/
│   │   │   ├── seed-billing-programs.js  # CMS programs
│   │   │   ├── seed-packages.js          # US-specific packages
│   │   │   └── seed-conditions.js        # US condition presets
│   │   ├── uk/
│   │   │   ├── seed-billing-programs.js  # NHS programmes
│   │   │   ├── seed-packages.js
│   │   │   └── seed-conditions.js
│   │   ├── au/
│   │   │   ├── seed-billing-programs.js  # Medicare Australia
│   │   │   └── seed-packages.js
│   │   ├── ca/
│   │   │   ├── seed-billing-programs.js  # Provincial programs
│   │   │   └── seed-packages.js
│   │   ├── in/
│   │   │   ├── seed-billing-programs.js  # NABH, PMJAY, CGHS
│   │   │   ├── seed-packages.js          # India-specific packages
│   │   │   └── seed-conditions.js
│   │   ├── ae/
│   │   │   ├── seed-billing-programs.js  # DHA, DOH, Seha
│   │   │   └── seed-packages.js
│   │   ├── sa/
│   │   │   ├── seed-billing-programs.js  # MOH Saudi
│   │   │   └── seed-packages.js
│   │   ├── qa/
│   │   │   ├── seed-billing-programs.js  # MOPH Qatar
│   │   │   └── seed-packages.js
│   │   └── international/
│   │       └── seed-universal-packages.js # Region-agnostic packages
│   └── localization/
│       ├── seed-translations.js
│       └── translations/
│           ├── en-US.json
│           ├── en-GB.json
│           ├── en-AU.json
│           ├── en-CA.json
│           ├── fr-CA.json
│           ├── es-US.json
│           ├── hi-IN.json               # Hindi
│           ├── ta-IN.json               # Tamil
│           ├── te-IN.json               # Telugu
│           ├── bn-IN.json               # Bengali
│           ├── ar-AE.json               # Arabic (UAE)
│           ├── ar-SA.json               # Arabic (Saudi)
│           ├── ar-QA.json               # Arabic (Qatar)
│           └── ar-KW.json               # Arabic (Kuwait)
```

---

## Universal Billing Packages (Region-Agnostic)

**Example: Diabetes Management Package**

```javascript
{
  code: 'DIABETES_MULTI_PROGRAM_UNIVERSAL',
  name: 'Type 2 Diabetes Monitoring Package',
  category: 'ENDOCRINE',
  isStandardized: true,
  supportedRegions: ['US', 'UK', 'AU', 'CA', 'IN', 'AE', 'SA', 'QA'], // All regions

  diagnosisCriteria: {
    primary: [
      { code: 'E11.*', display: 'Type 2 diabetes mellitus', codingSystem: 'ICD-10' }
    ],
    minMatchRequired: 1
  },

  // Region-specific program mappings
  programCombinations: {
    regionPrograms: {
      US: [
        { billingProgramCode: 'CMS_RPM_2025', programType: 'RPM', priority: 1 },
        { billingProgramCode: 'CMS_CCM_2025', programType: 'CCM', priority: 2 }
      ],
      UK: [
        { billingProgramCode: 'NHS_LONG_TERM_CONDITIONS_2025', programType: 'LTC_MANAGEMENT', priority: 1 }
      ],
      AU: [
        { billingProgramCode: 'MBS_CDM_2025', programType: 'CDM', priority: 1 }
      ],
      IN: [
        { billingProgramCode: 'PMJAY_REMOTE_MONITORING_2025', programType: 'GOVERNMENT_SCHEME', priority: 1 },
        { billingProgramCode: 'INDIA_PRIVATE_RPM_2025', programType: 'PRIVATE_INSURANCE', priority: 2 }
      ],
      AE: [
        { billingProgramCode: 'DHA_TELEHEALTH_2025', programType: 'TELEHEALTH', priority: 1 }
      ],
      SA: [
        { billingProgramCode: 'MOH_SA_DIGITAL_HEALTH_2025', programType: 'DIGITAL_HEALTH', priority: 1 }
      ]
    },

    // Universal clinical protocol
    recommendedMetrics: [
      'blood_glucose',
      'hba1c',
      'weight',
      'blood_pressure',
      'medication_adherence'
    ]
  },

  // Localized content
  localizations: {
    'en-US': {
      name: 'Type 2 Diabetes Monitoring Package',
      description: 'Remote monitoring for diabetes with glucose tracking and care coordination',
      clinicalRationale: 'ADA Standards of Medical Care in Diabetes 2025'
    },
    'en-GB': {
      name: 'Type 2 Diabetes Monitoring Programme',
      description: 'Remote monitoring for diabetes with glucose tracking and care coordination',
      clinicalRationale: 'NICE Guideline NG28: Type 2 diabetes in adults'
    },
    'hi-IN': {
      name: 'टाइप 2 मधुमेह निगरानी पैकेज',
      description: 'ग्लूकोज ट्रैकिंग और देखभाल समन्वय के साथ मधुमेह के लिए दूरस्थ निगरानी',
      clinicalRationale: 'भारतीय मधुमेह दिशानिर्देश'
    },
    'ar-AE': {
      name: 'حزمة مراقبة مرض السكري من النوع 2',
      description: 'المراقبة عن بعد لمرض السكري مع تتبع الجلوكوز وتنسيق الرعاية',
      clinicalRationale: 'إرشادات وزارة الصحة الإماراتية لمرض السكري'
    },
    'ar-SA': {
      name: 'حزمة مراقبة مرض السكري من النوع الثاني',
      description: 'المراقبة عن بعد لمرض السكري مع تتبع الجلوكوز وتنسيق الرعاية',
      clinicalRationale: 'إرشادات وزارة الصحة السعودية'
    }
  }
}
```

---

## Localization Framework

### Supported Locales (Expanded)

**Phase 1 (Core Markets)**:
1. `en-US` - English (United States) - **DEFAULT**
2. `en-GB` - English (United Kingdom)
3. `en-AU` - English (Australia)
4. `en-CA` - English (Canada)
5. `hi-IN` - Hindi (India) - 43% of Indian population
6. `ar-AE` - Arabic (UAE)
7. `ar-SA` - Arabic (Saudi Arabia)

**Phase 2 (Expansion)**:
8. `en-IN` - English (India) - Indian English
9. `fr-CA` - French (Canada) - Required in Quebec
10. `es-US` - Spanish (United States)
11. `ar-QA` - Arabic (Qatar)
12. `ar-KW` - Arabic (Kuwait)
13. `ta-IN` - Tamil (South India)
14. `te-IN` - Telugu (South India)

**Phase 3 (Extended)**:
15. `bn-IN` - Bengali (East India)
16. `mr-IN` - Marathi (Maharashtra)
17. `gu-IN` - Gujarati (Gujarat)
18. `kn-IN` - Kannada (Karnataka)
19. `ml-IN` - Malayalam (Kerala)
20. `pa-IN` - Punjabi (Punjab)
21. `ur-PK` - Urdu (Pakistan/India/Middle East expats)
22. `fil-PH` - Filipino (Middle East expats)

### Translation Keys - Hindi Example

```javascript
{
  "ui.billing.readiness.title": {
    "en-US": "Billing Readiness Dashboard",
    "hi-IN": "बिलिंग तैयारी डैशबोर्ड"
  },

  "clinical.diagnosis.diabetes": {
    "en-US": "Type 2 Diabetes Mellitus",
    "hi-IN": "टाइप 2 मधुमेह"
  },

  "clinical.metric.blood_glucose": {
    "en-US": "Blood Glucose",
    "hi-IN": "रक्त शर्करा"
  },

  "ui.patient.enrollment.status.active": {
    "en-US": "Active",
    "hi-IN": "सक्रिय"
  }
}
```

### Translation Keys - Arabic Example

```javascript
{
  "ui.billing.readiness.title": {
    "en-US": "Billing Readiness Dashboard",
    "ar-AE": "لوحة معلومات جاهزية الفواتير"
  },

  "clinical.diagnosis.diabetes": {
    "en-US": "Type 2 Diabetes Mellitus",
    "ar-AE": "داء السكري من النوع الثاني"
  },

  "clinical.metric.blood_glucose": {
    "en-US": "Blood Glucose",
    "ar-AE": "سكر الدم"
  },

  "ui.patient.enrollment.status.active": {
    "en-US": "Active",
    "ar-AE": "نشط"
  },

  "ui.prayer.times": {
    "en-US": "Prayer Times",
    "ar-AE": "أوقات الصلاة"
  },

  "ui.ramadan.mode": {
    "en-US": "Ramadan Mode",
    "ar-AE": "وضع رمضان"
  }
}
```

### RTL (Right-to-Left) Support for Arabic

**Frontend Configuration**:
```javascript
// Detect Arabic locale
const isRTL = ['ar-AE', 'ar-SA', 'ar-QA', 'ar-KW'].includes(userLocale);

// Apply RTL to HTML
document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
document.documentElement.lang = userLocale;

// Tailwind CSS RTL support
// Install: npm install tailwindcss-rtl
// tailwind.config.js
module.exports = {
  plugins: [require('tailwindcss-rtl')],
};

// Usage in components
<div className="ml-4 rtl:mr-4 rtl:ml-0">
  Content
</div>
```

---

## Client Onboarding Workflow

### Step 1: Region Selection

**UI Flow**:
```
┌─────────────────────────────────────────────┐
│ Welcome to VitalEdge                        │
│                                             │
│ Select Your Region:                         │
│                                             │
│ ○ United States (USD, CMS Programs)         │
│ ○ United Kingdom (GBP, NHS Programmes)      │
│ ○ Australia (AUD, Medicare Programs)        │
│ ○ Canada (CAD, Provincial Programs)         │
│ ○ India (INR, NABH/PMJAY/Private)          │
│ ○ UAE (AED, DHA/DOH Programs)              │
│ ○ Saudi Arabia (SAR, MOH Programs)         │
│ ○ Qatar (QAR, MOPH Programs)               │
│ ○ Kuwait (KWD, MOH Programs)               │
│ ○ Other International                       │
│                                             │
│         [Continue]                          │
└─────────────────────────────────────────────┘
```

### Step 2: Language Selection (for India & Middle East)

**UI Flow for India**:
```
┌─────────────────────────────────────────────┐
│ Select Primary Language                     │
│                                             │
│ ○ English (English)                         │
│ ○ हिंदी (Hindi)                             │
│ ○ தமிழ் (Tamil)                             │
│ ○ తెలుగు (Telugu)                           │
│ ○ বাংলা (Bengali)                           │
│ ○ मराठी (Marathi)                           │
│                                             │
│         [Continue]                          │
└─────────────────────────────────────────────┘
```

**UI Flow for Middle East**:
```
┌─────────────────────────────────────────────┐
│ اختر اللغة الأساسية / Select Primary Language│
│                                             │
│ ○ العربية (Arabic)                          │
│ ○ English (English)                         │
│                                             │
│         [Continue] / [متابعة]               │
└─────────────────────────────────────────────┘
```

### Step 3: Available Billing Programs (India Example)

**UI Flow**:
```
┌─────────────────────────────────────────────┐
│ उपलब्ध बिलिंग कार्यक्रम (भारत)             │
│ Available Billing Programs (India)          │
│                                             │
│ ☑ NABH Telehealth Standards                │
│ ☑ PMJAY (Ayushman Bharat) - सरकारी योजना   │
│ ☑ CGHS - केंद्रीय सरकार स्वास्थ्य योजना    │
│ ☐ Private Insurance / निजी बीमा            │
│ ☐ Corporate Healthcare / कॉर्पोरेट स्वास्थ्य│
│                                             │
│         [Continue] / [जारी रखें]            │
└─────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)

**Tasks**:
1. ✅ Create `Region` model
2. ✅ Seed 8 regions: US, UK, AU, CA, IN, AE, SA, QA
3. ✅ Update organization onboarding with region selection
4. ✅ Build region selection UI

**Deliverables**:
- 8 regions seeded
- Region selection functional

---

### Phase 2: India Billing Programs (Weeks 4-5)

**Tasks**:
1. ✅ Create `seed-billing-programs-india-2025.js`
   - NABH Telehealth
   - PMJAY (Ayushman Bharat)
   - CGHS
   - Private Insurance
2. ✅ Update billing readiness service for package-based billing
3. ✅ Test with Indian test organization

**Deliverables**:
- 4 India billing programs seeded
- Billing calculations work for India

---

### Phase 3: Middle East Billing Programs (Weeks 6-7)

**Tasks**:
1. ✅ Create `seed-billing-programs-uae-2025.js` (DHA, DOH)
2. ✅ Create `seed-billing-programs-saudi-2025.js` (MOH)
3. ✅ Create `seed-billing-programs-qatar-2025.js` (MOPH)
4. ✅ Add Islamic calendar support
5. ✅ Add prayer time integration
6. ✅ Test with UAE test organization

**Deliverables**:
- 6+ Middle East billing programs seeded
- Cultural features (prayer times, Ramadan mode) functional

---

### Phase 4: Hindi Localization (Weeks 8-9)

**Tasks**:
1. ✅ Create `Translation` model
2. ✅ Build `hi-IN.json` translation file (2000+ keys)
3. ✅ Translate UI strings
4. ✅ Translate clinical content (diagnoses, metrics)
5. ✅ Build frontend translation hook
6. ✅ Test with Hindi-speaking test user

**Deliverables**:
- UI available in Hindi
- Clinical assessments in Hindi

---

### Phase 5: Arabic Localization + RTL (Weeks 10-11)

**Tasks**:
1. ✅ Create `ar-AE.json`, `ar-SA.json` translation files
2. ✅ Implement RTL layout support
3. ✅ Test with Arabic test user
4. ✅ Fix RTL layout issues (icons, navigation)
5. ✅ Add Hijri calendar support

**Deliverables**:
- UI available in Arabic with RTL
- Hijri calendar functional

---

### Phase 6: Universal Billing Packages (Weeks 12-13)

**Tasks**:
1. ✅ Create 8 universal packages:
   - Diabetes, Hypertension, Heart Failure, COPD, Chronic Pain, CKD, Mental Health, Obesity
2. ✅ Add region-specific program mappings
3. ✅ Add localizations for all supported languages
4. ✅ Test package suggestions for all regions

**Deliverables**:
- 8 universal packages covering all regions

---

### Phase 7: Testing & Documentation (Weeks 14-15)

**Tasks**:
1. ✅ Test organizations for US, UK, AU, CA, IN, UAE, Saudi
2. ✅ End-to-end testing per region
3. ✅ Create "Multi-Region Admin Guide"
4. ✅ Create "Localization User Guide"
5. ✅ Update API documentation

**Deliverables**:
- All regions tested
- Documentation complete

---

## Success Metrics

### Technical Metrics

- ✅ 8+ regions supported (US, UK, AU, CA, IN, AE, SA, QA)
- ✅ 10+ languages supported
- ✅ RTL layout functional for Arabic
- ✅ All currencies display correctly
- ✅ All measurements in correct units
- ✅ Billing calculations accurate per region

### Business Metrics

- ✅ Deployment time in new region: <2 weeks
- ✅ Zero hardcoded regional assumptions
- ✅ Client onboarding includes region/language selection
- ✅ 80%+ UI strings translated

---

## Open Questions

1. **India Pricing**: How to handle Tier-1 vs Tier-2/3 city pricing differences?
2. **India Languages**: Which 3-5 regional languages are highest priority after Hindi?
3. **Middle East**: Do we need separate programs for each emirate (Dubai vs Abu Dhabi)?
4. **Arabic Dialects**: Use Modern Standard Arabic or regional dialects?
5. **Exchange Rates**: Real-time currency conversion or static rates?
6. **Data Localization**: How to enforce India's requirement for data storage in India?

---

## Next Steps

**Immediate Actions**:
1. ✅ Review plan with stakeholders
2. ✅ Get approval for Phase 1-3 (Foundation + India + Middle East)
3. ✅ Create database migration for `Region` model
4. ✅ Start `seed-regions.js` implementation

**Priority Order**:
1. **Phase 1**: Foundation (all regions configured)
2. **Phase 2**: India programs (large market)
3. **Phase 3**: Middle East programs (high-value market)
4. **Phase 4**: Hindi localization (India priority)
5. **Phase 5**: Arabic localization (Middle East priority)

---

**Document Status**: Planning - Expanded to Include India & Middle East
**Owner**: Development Team
**Reviewers**: Product, Clinical, Compliance, Regional Managers
