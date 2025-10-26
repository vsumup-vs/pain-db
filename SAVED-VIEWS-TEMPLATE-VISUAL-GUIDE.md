# Saved Views Template Feature - Visual Guide

> Quick reference for the new template functionality

## 🎨 What You'll See

### Template Library Section

Templates are displayed in a **separate section** at the top with distinctive styling:

```
┌─────────────────────────────────────────────────────┐
│ ✨ Template Library                                │
├─────────────────────────────────────────────────────┤
│                                                       │
│ ┌──────────────────┐  ┌──────────────────┐         │
│ │ ✨ Morning Triage │  │ ✨ High Risk     │         │
│ │                   │  │    Patients      │         │
│ │ Critical alerts   │  │                  │         │
│ │ for morning       │  │ Active patients  │         │
│ │ review            │  │ with risk >7     │         │
│ │                   │  │                  │         │
│ │ TRIAGE_QUEUE      │  │ PATIENT_LIST     │         │
│ │ CARE_MANAGER      │  │ CARE_MANAGER     │         │
│ │ Template          │  │ Template         │         │
│ │                   │  │                  │         │
│ │ [Use as Template] │  │ [Use as Template]│         │
│ └──────────────────┘  └──────────────────┘         │
│                                                       │
│ ... 23 more templates ...                           │
│                                                       │
└─────────────────────────────────────────────────────┘
```

**Visual Features:**
- 🎨 **Gradient Background**: Indigo-to-white gradient
- 🔷 **Indigo Border**: 2px solid indigo border
- ✨ **Sparkles Icon**: Template indicator
- 🏷️ **Badges**: View Type + Role + "Template" badge
- 🔘 **Clone Button**: "Use as Template" with document icon

### Filters Bar

Enhanced with **role filter** and **template toggle**:

```
┌─────────────────────────────────────────────────────┐
│ [🔍 Search...]  [View Type ▼]  [Role ▼]  [All ▼]   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ [✨ Hide Templates]     25 templates available       │
└─────────────────────────────────────────────────────┘
```

**New Filters:**
- **Role Filter**: Care Manager, Clinician, Billing Admin, Nurse, All
- **Template Toggle**: Show/Hide templates with count

### My Saved Views Section

User-created views displayed **below templates** with original styling:

```
┌─────────────────────────────────────────────────────┐
│ 📑 My Saved Views                                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│ ┌──────────────────┐  ┌──────────────────┐         │
│ │ AM Hypertension  │  │ Diabetes Review  │         │
│ │ Round (My Copy)  │  │ (My Copy)        │         │
│ │                   │  │                  │         │
│ │ Description...    │  │ Description...   │         │
│ │                   │  │                  │         │
│ │ PATIENT_LIST      │  │ PATIENT_LIST     │         │
│ │ 📊 Used 5 times   │  │ 📊 Used 2 times  │         │
│ │                   │  │                  │         │
│ │ [⭐ Set Default]  │  │ [✏️ Edit]        │         │
│ │ [✏️ Edit]         │  │ [🗑️ Delete]      │         │
│ │ [🗑️ Delete]       │  │                  │         │
│ └──────────────────┘  └──────────────────┘         │
│                                                       │
└─────────────────────────────────────────────────────┘
```

## 🔄 User Workflows

### 1. Browse Templates by Role

```
User Action: Select "Care Manager" from Role filter
      ↓
System: Shows 5 Care Manager templates
      ↓
Display:
  - Morning Triage - Critical Alerts
  - My Active Patients - High Risk
  - SLA Breached Alerts
  - Patients Needing Follow-Up
  - RPM Patients - Data Collection
```

### 2. Clone a Template

```
User Action: Click "Use as Template" on "Morning Triage"
      ↓
System: Creates new saved view with:
  - Name: "Morning Triage - Critical Alerts (My Copy)"
  - Filters: Copied from template
  - Owner: Current user
  - Type: User view (not template)
      ↓
Toast: "Saved view created successfully"
      ↓
Display: New view appears in "My Saved Views" section
```

### 3. Customize Cloned View

```
User Action: Click "Edit" on cloned view
      ↓
Modal Opens: Edit Saved View
  - Pre-populated with template filters
  - User can modify name, description, filters
  - User can adjust display config
      ↓
User Action: Save changes
      ↓
System: Updates user's view (template unchanged)
```

### 4. Hide/Show Templates

```
User Action: Click "Hide Templates" button
      ↓
System: Template Library section hidden
      ↓
Display: Only "My Saved Views" section visible
      ↓
User Action: Click "Show Templates" button
      ↓
System: Template Library section visible again
```

## 📊 Template Breakdown by Role

### 🏥 Care Manager (5 templates)
Focus: Patient triage, risk management, SLA monitoring

1. **Morning Triage - Critical Alerts**
   - View Type: TRIAGE_QUEUE
   - Filters: severity=[CRITICAL, HIGH], status=PENDING, claimedBy=unclaimed
   - Sort: riskScore DESC

2. **My Active Patients - High Risk**
   - View Type: PATIENT_LIST
   - Filters: riskScore≥7, status=ACTIVE, enrollmentType=ANY
   - Sort: riskScore DESC

3. **SLA Breached Alerts**
   - View Type: TRIAGE_QUEUE
   - Filters: slaBreached=true, status≠RESOLVED
   - Sort: slaBreachTime ASC

4. **Patients Needing Follow-Up**
   - View Type: PATIENT_LIST
   - Filters: hasOpenAlerts=true, lastContactDays≥7
   - Sort: lastContactAt ASC

5. **RPM Patients - Data Collection**
   - View Type: PATIENT_LIST
   - Filters: enrollmentType=RPM, dataSubmissionDays<16
   - Sort: dataSubmissionDays ASC

### 👨‍⚕️ Clinician (5 templates)
Focus: Condition-specific patient lists, clinical review

1. **My Diabetes Patients**
   - View Type: PATIENT_LIST
   - Filters: conditionPresetCategory=Diabetes, status=ACTIVE
   - Sort: lastName ASC

2. **My Hypertension Patients**
   - View Type: PATIENT_LIST
   - Filters: conditionPresetCategory=Hypertension, status=ACTIVE
   - Sort: lastName ASC

3. **Chronic Pain Patients**
   - View Type: PATIENT_LIST
   - Filters: conditionPresetCategory=Pain, status=ACTIVE
   - Sort: lastName ASC

4. **Alerts Requiring Clinical Review**
   - View Type: TRIAGE_QUEUE
   - Filters: severity=[HIGH, CRITICAL], status=ACKNOWLEDGED
   - Sort: createdAt ASC

5. **Overdue Assessments - My Patients**
   - View Type: ASSESSMENT_LIST
   - Filters: status=OVERDUE, assignedClinician=currentUser
   - Sort: dueDate ASC

### 💰 Billing Admin (5 templates)
Focus: Billing readiness, CPT code eligibility

1. **RPM Billing Eligible - Current Month**
   - View Type: ENROLLMENT_LIST
   - Filters: programType=RPM, billingEligible=true, month=current
   - Sort: lastName ASC

2. **RTM Billing Eligible - Current Month**
   - View Type: ENROLLMENT_LIST
   - Filters: programType=RTM, billingEligible=true, month=current
   - Sort: lastName ASC

3. **CCM Billing Eligible - Current Month**
   - View Type: ENROLLMENT_LIST
   - Filters: programType=CCM, billingEligible=true, month=current
   - Sort: lastName ASC

4. **Patients Close to Billing Threshold**
   - View Type: PATIENT_LIST
   - Filters: billingProgress≥80%, billingProgress<100%
   - Sort: billingProgress DESC

5. **Not Billing Eligible - Action Needed**
   - View Type: PATIENT_LIST
   - Filters: billingEligible=false, enrollmentStatus=ACTIVE
   - Sort: billingProgress ASC

### 👩‍⚕️ Nurse (5 templates)
Focus: Daily tasks, medication adherence, follow-ups

1. **Due Today - Assessments**
   - View Type: ASSESSMENT_LIST
   - Filters: dueDate=today, status=PENDING
   - Sort: patientLastName ASC

2. **Medication Adherence - Low**
   - View Type: PATIENT_LIST
   - Filters: medicationAdherence<80%, hasMedications=true
   - Sort: medicationAdherence ASC

3. **New Enrollments - This Week**
   - View Type: ENROLLMENT_LIST
   - Filters: enrollmentDate≥thisWeekStart, status=ACTIVE
   - Sort: enrollmentDate DESC

4. **Follow-Up Calls - Today**
   - View Type: TASK_LIST
   - Filters: taskType=FOLLOW_UP_CALL, dueDate=today, status=PENDING
   - Sort: priority DESC

5. **Vital Signs Alerts - Last 24h**
   - View Type: ALERT_LIST
   - Filters: category=Vitals, createdAt≥24hoursAgo, status≠RESOLVED
   - Sort: createdAt DESC

### 🌐 General/All (5 templates)
Focus: Common views for all roles

1. **All Active Patients**
   - View Type: PATIENT_LIST
   - Filters: status=ACTIVE
   - Sort: lastName ASC

2. **Recently Added Patients**
   - View Type: PATIENT_LIST
   - Filters: createdAt≥30daysAgo
   - Sort: createdAt DESC

3. **My Open Tasks**
   - View Type: TASK_LIST
   - Filters: assignedTo=currentUser, status=[PENDING, IN_PROGRESS]
   - Sort: dueDate ASC

4. **Overdue Tasks - All**
   - View Type: TASK_LIST
   - Filters: status=[PENDING, IN_PROGRESS], dueDate<today
   - Sort: dueDate ASC

5. **Critical Alerts - All Patients**
   - View Type: ALERT_LIST
   - Filters: severity=CRITICAL, status≠RESOLVED
   - Sort: createdAt DESC

## 🎯 Badge Colors Reference

### View Type Badges
- 🔵 **PATIENT_LIST**: Blue (bg-blue-100, text-blue-800)
- 🔴 **TRIAGE_QUEUE**: Red (bg-red-100, text-red-800)
- 🟢 **ASSESSMENT_LIST**: Green (bg-green-100, text-green-800)
- 🟣 **ENROLLMENT_LIST**: Purple (bg-purple-100, text-purple-800)
- 🟡 **ALERT_LIST**: Yellow (bg-yellow-100, text-yellow-800)
- 🩷 **TASK_LIST**: Pink (bg-pink-100, text-pink-800)

### Role Badges
- 🟪 **All Roles**: Purple (bg-purple-100, text-purple-800)

### Special Badges
- 🔷 **Template**: Indigo (bg-indigo-100, text-indigo-800)
- ⭐ **Default**: Yellow star icon (shown on user views only)
- 📤 **Shared**: Gray ShareIcon + "Shared" text

## 💡 Tips for Users

1. **Start with Templates**: Browse templates for your role before creating custom views
2. **Clone and Customize**: Use "Use as Template" to create a starting point
3. **Role Filtering**: Filter templates by role to find relevant views quickly
4. **Hide When Not Needed**: Toggle templates off when focusing on your personal views
5. **Naming Convention**: Cloned views get "(My Copy)" suffix - rename as desired
6. **Share Customized Views**: After customizing, you can share with your organization

## 🔧 For Administrators

### Managing Templates

Templates are **read-only** for users and can only be modified by:
1. Direct database updates (use with caution)
2. Re-running seed script with updated definitions

### Adding Custom Org Templates

To create organization-specific templates:
1. Clone system template
2. Customize for your organization
3. Share with organization
4. Mark as default if appropriate

### Template Analytics

Track template usage via `usageCount` field:
```sql
SELECT name, suggestedRole, usageCount
FROM saved_views
WHERE is_template = true
ORDER BY usageCount DESC
LIMIT 10;
```

---

**Last Updated**: 2025-10-26
**Feature Status**: ✅ Production Ready
