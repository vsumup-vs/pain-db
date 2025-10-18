# Enums & Constants Reference

> **Module**: All enum values and constants used in the system
> **Last Updated**: 2025-10-17
> **Part of**: [Developer Reference Guide](../developer-reference.md)

---

## Enum Values Reference

### AlertStatus
```javascript
PENDING      // Alert triggered, not yet acknowledged
ACKNOWLEDGED // Clinician acknowledged, working on it
RESOLVED     // Alert resolved with documentation
DISMISSED    // Alert dismissed (false positive, etc.)
```

### AlertSeverity
```javascript
LOW       // Informational, review within 24 hours
MEDIUM    // Moderate concern, review within 4 hours
HIGH      // Urgent, review within 1 hour
CRITICAL  // Emergency, immediate action required
```

### TimeLogActivity
```javascript
CALL_PATIENT          // Phone call with patient
REVIEW_DATA           // Reviewing patient data
MEDICATION_ADJUSTMENT // Adjusting medication
CARE_PLAN_UPDATE      // Updating care plan
DOCUMENTATION         // Clinical documentation
COORDINATION          // Care coordination
EDUCATION             // Patient education
OTHER                 // Other clinical activity
```

### ObservationSource
```javascript
MANUAL  // Manually entered by clinician/patient
DEVICE  // From connected medical device
API     // From external API integration
IMPORT  // Bulk imported from file
```

### ObservationContext
```javascript
WELLNESS            // General wellness check
PROGRAM_ENROLLMENT  // Part of care program
CLINICAL_MONITORING // Active clinical monitoring
ROUTINE_FOLLOWUP    // Routine follow-up
ALERT_RESPONSE      // In response to alert
```

### OrganizationType
```javascript
HOSPITAL    // Hospital system
CLINIC      // Outpatient clinic
PRACTICE    // Private practice
RESEARCH    // Research institution
INSURANCE   // Insurance company
PHARMACY    // Pharmacy
```

### Gender
```javascript
MALE
FEMALE
OTHER
UNKNOWN
```

### UserRole (in UserOrganization)
```javascript
SUPER_ADMIN      // Platform-wide access
ORG_ADMIN        // Organization administrator
CLINICIAN        // Doctor, NP, PA
NURSE            // Registered nurse
CARE_COORDINATOR // Care coordination staff
BILLING_ADMIN    // Billing administrator
PATIENT          // Patient user
CAREGIVER        // Family member/caregiver
RESEARCHER       // Clinical researcher
```

---

