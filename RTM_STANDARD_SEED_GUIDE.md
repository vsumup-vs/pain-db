# RTM Standard Seed File Guide

## Overview

The `seed-rtm-standard.js` file provides a comprehensive, standardized seeding solution for Remote Therapeutic Monitoring (RTM) programs. This file consolidates all previously separate seed files into a single, maintainable, and standards-compliant seeding system.

## Features

### 🏥 **Complete RTM Program Coverage**
- **Pain Management**: Chronic pain, fibromyalgia, arthritis
- **Diabetes Management**: Blood glucose, HbA1c, medication adherence
- **Cardiovascular Monitoring**: Blood pressure, weight tracking
- **Mental Health**: Depression (PHQ-9), anxiety (GAD-7) screening

### 📊 **Standardized Coding Systems**
- **LOINC**: Laboratory and clinical observations
- **SNOMED CT**: Clinical terminology
- **ICD-10**: Diagnosis coding
- **CPT**: Procedure coding for billing

### 🎯 **CMS RTM Compliance**
- Supports CPT codes 98976-98981
- 30-day device supply tracking
- Daily recording capabilities
- Automated alert systems
- Patient education workflows

## Usage

### Quick Start
```bash
# Run the standardized seed
npm run seed:rtm
# or
npm run seed:standard
# or directly
node seed-rtm-standard.js
```

### What Gets Created

#### 1. **Standardized Metrics** (15+ metrics)
- Pain scales with LOINC coding
- Vital signs (BP, weight, glucose)
- Mental health assessments
- Medication adherence tracking
- Condition-specific metrics

#### 2. **Assessment Templates** (6 templates)
- Chronic Pain Daily Assessment
- Fibromyalgia Daily Check-in
- Arthritis Management Assessment
- Diabetes Monitoring
- Cardiovascular Daily Monitoring
- Mental Health Weekly Assessment

#### 3. **Condition Presets** (6 presets)
- Chronic Pain Management
- Fibromyalgia Care Program
- Arthritis Management
- Diabetes Management Program
- Cardiovascular Monitoring
- Mental Health Monitoring

#### 4. **Sample Data**
- 3 sample patients with realistic medical histories
- 3 sample clinicians with different specializations
- Proper linkages between templates and condition presets

## Metric Categories

### Pain Management Metrics
```javascript
- pain_scale_0_10 (LOINC: 72514-3)
- pain_location (with SNOMED mapping)
- pain_interference (LOINC: 61758-9)
- joint_stiffness (LOINC: 72514-3)
- morning_stiffness_duration
```

### Fibromyalgia-Specific Metrics
```javascript
- fatigue_level (LOINC: 89026-8)
- sleep_quality (LOINC: 93832-4)
- cognitive_symptoms (LOINC: 72133-2)
- tender_points_count
```

### Diabetes Metrics
```javascript
- blood_glucose (LOINC: 33747-0, CPT: 82947)
- hba1c (LOINC: 4548-4, CPT: 83036)
- medication_adherence (LOINC: 71799-1)
```

### Cardiovascular Metrics
```javascript
- systolic_bp (LOINC: 8480-6)
- diastolic_bp (LOINC: 8462-4)
- weight (LOINC: 29463-7)
```

### Mental Health Metrics
```javascript
- phq9_score (LOINC: 44249-1)
- gad7_score (LOINC: 70274-6)
```

## Condition Presets with ICD-10 Mapping

### Chronic Pain Management
- M79.3 - Chronic pain syndrome
- M25.50 - Joint pain, unspecified
- M54.5 - Low back pain
- G89.29 - Other chronic pain

### Fibromyalgia Care Program
- M79.7 - Fibromyalgia
- M79.0 - Rheumatism, unspecified

### Arthritis Management
- M06.9 - Rheumatoid arthritis, unspecified
- M15.9 - Polyosteoarthritis, unspecified
- M19.90 - Unspecified osteoarthritis

### Diabetes Management Program
- E11.9 - Type 2 diabetes mellitus without complications
- E10.9 - Type 1 diabetes mellitus without complications
- E11.65 - Type 2 diabetes mellitus with hyperglycemia

### Cardiovascular Monitoring
- I10 - Essential hypertension
- I50.9 - Heart failure, unspecified
- I25.10 - Atherosclerotic heart disease

### Mental Health Monitoring
- F32.9 - Major depressive disorder, single episode
- F41.1 - Generalized anxiety disorder
- F33.9 - Major depressive disorder, recurrent

## Assessment Template Structure

Each template includes:
- **Standardized metrics** with proper coding
- **Required/optional** field designation
- **Display order** for consistent UI
- **Help text** for patient guidance
- **Validation rules** for data quality

### Example: Fibromyalgia Daily Check-in
1. Pain Scale (0-10) - Required
2. Fatigue Level (0-10) - Required
3. Sleep Quality (1-5) - Required
4. Morning Stiffness Duration - Required
5. Cognitive Symptoms - Required
6. Pain Interference - Optional

## Data Validation

### Numeric Metrics
- Min/max ranges
- Decimal precision
- Critical value thresholds
- Normal ranges for reference

### Categorical Metrics
- Predefined value sets
- SNOMED coding for options
- Display names and codes

### Frequency Settings
- `daily` - Once per day
- `multiple_daily` - Multiple times per day
- `weekly` - Once per week
- `quarterly` - Every 3 months

## Integration with Existing System

### Database Schema Compatibility
- Works with existing Prisma schema
- Maintains referential integrity
- Supports existing API endpoints

### Frontend Integration
- Compatible with existing React components
- Supports assessment template rendering
- Works with condition preset selection

### API Endpoints
The seed creates data compatible with:
- `/api/assessment-templates`
- `/api/metric-definitions`
- `/api/condition-presets`
- `/api/patients`
- `/api/clinicians`

## Maintenance and Updates

### Adding New Metrics
1. Add to `standardizedMetrics` array
2. Include proper LOINC/SNOMED coding
3. Define validation rules
4. Update relevant assessment templates

### Adding New Conditions
1. Add to `conditionPresets` array
2. Include ICD-10/SNOMED diagnoses
3. Create corresponding assessment template
4. Link template to preset

### Updating Coding Standards
1. Review latest LOINC/SNOMED releases
2. Update coding objects in metrics
3. Validate against CMS requirements
4. Test with billing systems

## Quality Assurance

### Validation Checks
- All metrics have proper coding
- Assessment templates are complete
- Condition presets have valid diagnoses
- Sample data is realistic and diverse

### Testing
```bash
# Run after seeding to verify
npm test
node check-assessment-templates.js
node check-condition-presets.js
```

## Migration from Legacy Seeds

### Deprecated Files
The following files are replaced by `seed-rtm-standard.js`:
- `seed-standardized-metrics.js`
- `seed-fibromyalgia-metrics.js`
- `seed-arthritis-metrics.js`
- `seed-condition-presets.js`
- `seed-condition-templates.js`

### Migration Steps
1. Backup existing data
2. Run `seed-rtm-standard.js`
3. Verify data integrity
4. Update any custom scripts
5. Remove deprecated seed files

## Compliance and Standards

### CMS RTM Requirements ✅
- 30-day device supply tracking
- Daily recording capability
- Programmed alerts transmission
- Patient education system
- Clinical outcome tracking

### Coding Standards ✅
- LOINC for laboratory/clinical observations
- SNOMED CT for clinical terminology
- ICD-10 for diagnosis coding
- CPT for procedure coding

### Data Quality ✅
- Validation rules for all metrics
- Standardized value sets
- Proper data types and ranges
- Help text for patient guidance

## Support and Documentation

### Additional Resources
- `TRACEABILITY_MATRIX.md` - RTM compliance tracking
- `RTM_COMPLIANCE_GUIDE.md` - CMS requirements
- `STANDARDIZATION_GUIDE.md` - Coding standards
- `STANDARDIZED_ASSESSMENT_GUIDE.md` - Assessment design

### Getting Help
1. Check existing documentation
2. Review seed file comments
3. Test with sample data
4. Validate against standards

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Maintained By**: Development Team