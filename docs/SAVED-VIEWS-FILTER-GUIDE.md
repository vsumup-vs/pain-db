# Saved Views - Filter Criteria Guide

> **Purpose**: Guide for building filter criteria in the Saved Views feature
> **Last Updated**: 2025-10-25

## Overview

Filter criteria in Saved Views is a flexible JSON structure that defines how to filter data in various list views (patients, alerts, tasks, etc.). The criteria is stored in the database and applied when the view is loaded.

## Filter Structure

### Basic JSON Format
```json
{
  "field1": "value",
  "field2": ["array", "of", "values"],
  "field3": { "operator": ">=", "value": 10 }
}
```

### Supported Operators
- **Equality**: `"field": "value"` or `"field": ["value1", "value2"]`
- **Comparison**: `"field": { "operator": ">=", "value": 10 }`
  - Operators: `>`, `<`, `>=`, `<=`, `==`, `!=`
- **Boolean**: `"field": true` or `"field": false`
- **Null checks**: `"field": null`
- **Date ranges**: `"dateRange": { "start": "2024-01-01", "end": "2024-12-31" }`

## Filter Examples by View Type

### 1. PATIENT_LIST Filters

#### High-Risk Patients
```json
{
  "status": "ACTIVE",
  "hasOpenAlerts": true,
  "alertSeverity": ["HIGH", "CRITICAL"],
  "riskScore": { "operator": ">=", "value": 7 }
}
```

#### Diabetic Patients with Poor Control
```json
{
  "status": "ACTIVE",
  "condition": "E11.9",
  "a1c": { "operator": ">", "value": 7.5 },
  "lastVisitDays": { "operator": ">", "value": 90 }
}
```

#### Medication Non-Adherent Patients
```json
{
  "status": "ACTIVE",
  "medicationAdherence": { "operator": "<", "value": 70 },
  "enrolledPrograms": ["CCM", "RPM"]
}
```

#### Elderly Patients with Multiple Conditions
```json
{
  "status": "ACTIVE",
  "ageMin": 65,
  "chronicConditionCount": { "operator": ">=", "value": 2 },
  "fallRisk": true
}
```

### 2. TRIAGE_QUEUE Filters

#### My Claimed Alerts
```json
{
  "claimedBy": "current-user-id",
  "status": ["PENDING", "ACKNOWLEDGED"]
}
```

#### Critical Unassigned Alerts
```json
{
  "severity": "CRITICAL",
  "claimedBy": null,
  "status": "PENDING"
}
```

#### SLA Breached Alerts
```json
{
  "slaBreached": true,
  "status": ["PENDING", "ACKNOWLEDGED"],
  "severity": ["HIGH", "CRITICAL"]
}
```

#### Pain Management Alerts
```json
{
  "category": "PAIN_MANAGEMENT",
  "severity": ["MEDIUM", "HIGH", "CRITICAL"],
  "patientProgram": "Pain Management"
}
```

### 3. ASSESSMENT_LIST Filters

#### Overdue Assessments
```json
{
  "dueStatus": "OVERDUE",
  "daysPastDue": { "operator": ">", "value": 7 }
}
```

#### Depression Screening Results (PHQ-9)
```json
{
  "templateCode": "PHQ9",
  "completionStatus": "COMPLETED",
  "scoreRange": { "min": 10, "max": 27 },
  "dateRange": {
    "start": "2024-10-01",
    "end": "2024-10-31"
  }
}
```

#### PROMIS Pain Assessments
```json
{
  "templateType": ["PROMIS_PAIN_INTENSITY", "PROMIS_PAIN_INTERFERENCE"],
  "completionStatus": "COMPLETED",
  "patientIds": ["patient-1", "patient-2", "patient-3"]
}
```

### 4. ENROLLMENT_LIST Filters

#### Active RPM Enrollments
```json
{
  "programType": "RPM",
  "status": "ACTIVE",
  "billingEligible": true
}
```

#### Enrollments Needing Review
```json
{
  "status": "ACTIVE",
  "dataCollectionDays": { "operator": "<", "value": 16 },
  "clinicalTimeMinutes": { "operator": "<", "value": 20 }
}
```

### 5. ALERT_LIST Filters

#### Vital Sign Alerts
```json
{
  "category": "VITAL_SIGNS",
  "severity": ["MEDIUM", "HIGH", "CRITICAL"],
  "status": ["PENDING", "ACKNOWLEDGED"],
  "createdAfter": "2024-10-01"
}
```

#### Medication Adherence Alerts
```json
{
  "alertType": "MEDICATION_ADHERENCE",
  "severity": ["HIGH", "CRITICAL"],
  "patientProgram": ["CCM", "RPM"]
}
```

### 6. TASK_LIST Filters

#### My Tasks Due Today
```json
{
  "assignedTo": "current-user-id",
  "dueDate": "today",
  "status": ["PENDING", "IN_PROGRESS"]
}
```

#### Overdue Follow-Up Calls
```json
{
  "taskType": "FOLLOW_UP_CALL",
  "status": ["PENDING", "IN_PROGRESS"],
  "dueDate": { "operator": "<", "value": "today" }
}
```

## Display Configuration

Display configuration controls how the filtered data is presented:

```json
{
  "columns": ["name", "mrn", "alerts", "lastAssessment", "riskScore"],
  "sortBy": "riskScore",
  "sortOrder": "desc",
  "pageSize": 25,
  "defaultView": "cards"
}
```

### Common Display Config Options

```json
{
  "columns": [
    "id",
    "name",
    "status",
    "createdAt",
    "updatedAt"
  ],
  "sortBy": "createdAt",
  "sortOrder": "desc",
  "groupBy": "status",
  "pageSize": 50,
  "defaultView": "table",
  "showSummaryStats": true,
  "colorCodeBy": "severity"
}
```

## Creating Saved Views via API

### Example: POST /api/saved-views

```bash
curl -X POST http://localhost:3000/api/saved-views \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "High-Risk Diabetic Patients",
    "description": "Diabetic patients with A1C > 7.5 and poor medication adherence",
    "viewType": "PATIENT_LIST",
    "filters": {
      "status": "ACTIVE",
      "condition": "E11.9",
      "a1c": { "operator": ">", "value": 7.5 },
      "medicationAdherence": { "operator": "<", "value": 70 }
    },
    "displayConfig": {
      "columns": ["name", "mrn", "a1c", "medicationAdherence", "lastVisit"],
      "sortBy": "a1c",
      "sortOrder": "desc"
    },
    "isShared": true,
    "isDefault": false
  }'
```

## Using Saved Views in Application Code

When applying a saved view, retrieve it from the API and use the filter criteria to build your query:

```javascript
// Fetch the saved view
const savedView = await api.getSavedView(viewId);

// Increment usage count
await api.incrementViewUsage(viewId);

// Apply filters to patient query
const filters = savedView.filters;
const params = {
  status: filters.status,
  hasOpenAlerts: filters.hasOpenAlerts,
  alertSeverity: filters.alertSeverity,
  sortBy: savedView.displayConfig.sortBy,
  sortOrder: savedView.displayConfig.sortOrder
};

// Fetch filtered data
const patients = await api.getPatients(params);
```

## Best Practices

1. **Start Simple**: Begin with basic filters and add complexity as needed
2. **Test Filters**: Verify your filter JSON is valid before saving
3. **Descriptive Names**: Use clear, descriptive names for saved views
4. **Share Wisely**: Only share views that are useful to the whole team
5. **Use Display Config**: Leverage display configuration for consistent UX
6. **Document Complex Filters**: Add detailed descriptions for complex filter logic
7. **Version Control**: Consider versioning saved views if filter structure changes

## Validation Rules

The SavedView schema enforces:
- `name`: Required, max 255 characters
- `viewType`: Required, must be valid ViewType enum value
- `filters`: Required, must be valid JSON
- `displayConfig`: Optional, must be valid JSON if provided
- `isShared`: Defaults to false
- `isDefault`: Defaults to false (only one default per viewType per user)

## Future Enhancements

Potential improvements to the filter system:
- Visual filter builder UI (drag-and-drop)
- Filter validation against actual schema
- Saved filter templates
- Filter suggestions based on common patterns
- Filter performance analytics
- Advanced operators (regex, geospatial, etc.)
