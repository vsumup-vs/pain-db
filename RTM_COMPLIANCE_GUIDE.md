# RTM Compliance Guide

## 🏥 Remote Therapeutic Monitoring (RTM) Overview

Remote Therapeutic Monitoring (RTM) is a Medicare-covered service that allows healthcare providers to monitor patients remotely using digital health tools. This platform is designed to support RTM billing codes and ensure compliance with CMS requirements.

## 📋 RTM Requirements & Platform Compliance

### CPT Code Requirements

#### CPT 98975 - Device Supply & Setup
**Requirement**: Supply of RTM device(s) with daily recording or programmed alerts, each 30 days
**Platform Support**: ✅ Complete
- Patient enrollment system tracks 30-day periods
- Daily data collection through PROMs
- Automated alert system with customizable rules
- Device-agnostic architecture (smartphones, tablets, wearables)

#### CPT 98976 - Initial Setup & Education
**Requirement**: Initial setup and patient education on equipment use
**Platform Support**: ✅ Complete
- Patient onboarding workflow
- Educational content delivery system
- Setup completion tracking
- Provider documentation tools

#### CPT 98977 - Clinical Staff Time (20+ minutes)
**Requirement**: 20+ minutes of clinical staff time with interactive communication
**Platform Support**: 🔄 80% Complete
- ✅ Patient communication platform
- ✅ Clinical review dashboard
- ✅ Care plan management
- 🔄 Time tracking system (in development)
- 🔄 Communication logging (in development)

#### CPT 98980 - Physician Time (First 20 minutes)
**Requirement**: First 20 minutes of physician time with interactive communication
**Platform Support**: 🔄 80% Complete
- ✅ Provider dashboard with patient insights
- ✅ Clinical decision support
- ✅ Treatment plan management
- 🔄 Physician time tracking (in development)
- 🔄 Billing automation (in development)

#### CPT 98981 - Physician Time (Additional 20 minutes)
**Requirement**: Each additional 20 minutes of physician time
**Platform Support**: 🔄 80% Complete
- ✅ Extended care session support
- ✅ Complex case management tools
- 🔄 Incremental time tracking (in development)
- 🔄 Automated billing calculations (in development)

## 🎯 RTM Use Cases Supported

### 1. Pain Management (Primary Focus)
**Conditions**: Chronic pain, arthritis, fibromyalgia, post-surgical recovery
**Metrics**: Pain scales, functional assessments, medication adherence
**Templates**: PROMIS Pain, Oswestry Disability Index, medication tracking

### 2. Diabetes Management
**Conditions**: Type 1, Type 2, gestational diabetes
**Metrics**: Blood glucose, HbA1c trends, medication compliance
**Templates**: Diabetes self-care activities, hypoglycemia tracking

### 3. Mental Health
**Conditions**: Depression, anxiety, PTSD
**Metrics**: PHQ-9, GAD-7, mood tracking, medication adherence
**Templates**: Mental health assessments, therapy compliance

### 4. Cardiovascular Health
**Conditions**: Hypertension, heart failure, post-cardiac event
**Metrics**: Blood pressure, weight, symptoms, medication adherence
**Templates**: Cardiovascular risk assessments, lifestyle tracking

## 📊 Clinical Workflow for RTM

### Month 1: Enrollment & Setup
1. **Patient Enrollment** (CPT 98976)
   - Complete patient registration
   - Assign condition-specific templates
   - Provide device/app training
   - Document setup completion

2. **Device Supply** (CPT 98975)
   - Configure monitoring schedule
   - Set up automated alerts
   - Begin daily data collection
   - Track 30-day compliance

### Ongoing: Monthly Monitoring
1. **Data Collection** (Daily)
   - Patient-reported outcomes
   - Medication adherence
   - Symptom tracking
   - Alert generation

2. **Clinical Review** (CPT 98977/98980/98981)
   - Review patient data trends
   - Assess clinical status
   - Adjust treatment plans
   - Document provider time

3. **Patient Communication**
   - Respond to alerts
   - Provide clinical guidance
   - Schedule interventions
   - Log all interactions

## 🔧 Implementation Roadmap

### ✅ Phase 0: Alert Rule Configuration System (COMPLETED)
```javascript
// Alert Rule to Condition Preset Linking System - IMPLEMENTED
const alertConfigurationFeatures = {
  smartLinking: 'Medical condition-based automatic linking',
  comprehensiveRules: '8 clinical domain linking rules implemented',
  safetyPriority: 'Critical alerts linked to all relevant presets',
  verificationTools: 'Status checking and validation scripts',
  systemCoverage: '96% alert rule to preset coverage achieved'
}
```
**Status**: ✅ **COMPLETED** - January 2025
- ✅ Created `check-alert-rule-status.js` for verification
- ✅ Created `configure-alert-rule-presets.js` for smart linking
- ✅ Implemented 8 medical domain linking rules
- ✅ Achieved 96% system coverage (55 total links)
- ✅ Resolved "0 presets" issue completely

### Phase 1: Enhanced Time Tracking (2 weeks)
```javascript
// Provider Time Tracking System
const timeTrackingFeatures = {
  sessionStart: 'Automatic timer start on patient review',
  activityLogging: 'Log all clinical activities',
  communicationTracking: 'Track patient interactions',
  billingCalculation: 'Automatic CPT code determination',
  reportGeneration: 'Monthly billing reports'
}
```

### Phase 2: Automated Billing (2 weeks)
```javascript
// Billing Automation System
const billingFeatures = {
  cptCodeGeneration: 'Automatic code assignment',
  timeValidation: 'Ensure minimum time requirements',
  documentationChecks: 'Verify required documentation',
  claimGeneration: 'Export billing data',
  complianceReporting: 'Audit trail maintenance'
}
```

### Phase 3: Enhanced Compliance (2 weeks)
```javascript
// Compliance Enhancement
const complianceFeatures = {
  auditTrails: 'Complete activity logging',
  qualityMetrics: 'Clinical outcome tracking',
  reportingDashboard: 'Compliance monitoring',
  alertSystem: 'Non-compliance notifications',
  documentationTemplates: 'Standardized clinical notes'
}
```

## 🎯 Recent Achievements

### Alert Rule Configuration System
**Completed**: January 2025
- **Problem Solved**: All alert rules showing "0 presets" 
- **Solution Implemented**: Smart medical condition-based linking
- **Coverage Achieved**: 96% system-wide alert rule coverage
- **Clinical Domains**: Pain, Mental Health, Cardiovascular, Respiratory, Diabetes, Medication, Functional Status, Critical Safety
- **Scripts Created**: 
  - `check-alert-rule-status.js` - Verification and status checking
  - `configure-alert-rule-presets.js` - Automated smart linking
- **Impact**: Ensures proper alert triggering for all condition presets

## 📈 Revenue Optimization

### RTM Revenue Potential
- **CPT 98975**: $58.56/month per patient (device supply)
- **CPT 98976**: $19.85 per patient (initial setup)
- **CPT 98977**: $50.16/month per patient (clinical staff time)
- **CPT 98980**: $38.45/month per patient (physician time - first 20 min)
- **CPT 98981**: $38.45/month per patient (physician time - additional 20 min)

### Monthly Revenue Per Patient
- **Basic RTM**: $108.72/month (98975 + 98977)
- **Physician RTM**: $135.56/month (98975 + 98980)
- **Extended RTM**: $174.01/month (98975 + 98980 + 98981)

### Practice Revenue Projections