# Versioning vs. Clone-on-Customize: Architecture Decision

> **Status**: Proposal for Discussion
> **Created**: 2025-10-13
> **Decision Required**: Choose between Clone-on-Customize (current) vs. Versioning Strategy (proposed)

## Executive Summary

**User's Insight**: "Why do Metric Definitions have a customization copy for the org under platform login, it can be newer version what do you think?"

**Answer**: **Versioning is superior for healthcare platforms.** The current clone-on-customize approach creates **orphaned customizations** that miss critical updates. A versioning strategy would enable:
- ✅ Clinical standards evolution (PHQ-9 v1.0 → v2.0)
- ✅ Regulatory compliance updates (CMS guideline changes)
- ✅ Security & bug fixes propagation
- ✅ Organizational control (opt-in upgrades)

---

## Comparison: Current vs. Proposed

| Aspect | Clone-on-Customize (Current) | Versioning Strategy (Proposed) |
|--------|------------------------------|-------------------------------|
| **Updates** | ❌ No updates propagate | ✅ Platform can publish new versions |
| **Clinical Evolution** | ❌ Orgs stuck on old standards | ✅ Orgs notified of evidence-based improvements |
| **Regulatory Compliance** | ❌ Cannot push critical changes | ✅ Orgs can apply compliance updates |
| **Security Fixes** | ❌ Bugs persist in customized copies | ✅ Patch releases available |
| **Org Flexibility** | ✅ Full independence | ✅ Opt-in upgrades (org maintains control) |
| **Data Migration** | N/A (no updates) | ⚠️ Requires migration tooling |
| **Complexity** | Low (simple clone) | Medium (version management) |

---

## Real-World Healthcare Scenarios

### Scenario 1: Clinical Standard Evolution

**Example**: PHQ-9 Depression Scale Updates

```
Timeline:
2020: Org customizes PHQ-9 v1.0 (original 1999 version)
2023: Research shows updated normative data improves accuracy (v2.0)
2024: DSM-5-TR alignment requires question clarifications (v2.1)
```

**Current Clone Approach**:
```
❌ Org stuck on PHQ-9 v1.0 forever
❌ New research shows v1.0 scores overestimate severity
❌ Published studies use v2.1 - org data not comparable
❌ No notification mechanism for updates
```

**Versioning Approach**:
```
✅ Platform publishes PHQ-9 v2.0 (2023)
✅ Org sees notification: "PHQ-9 v2.0 available: Updated normative data based on 10-year study (n=50,000)"
✅ Org reviews changelog, decides to upgrade
✅ Migration wizard: "Your customizations (display name) will be preserved"
✅ Historical data marked with version for analysis
```

---

### Scenario 2: Regulatory Compliance Update

**Example**: CMS Blood Pressure Guidelines Change

```
Regulatory Update (Real):
2017: CMS defines hypertension as ≥140/90 mmHg
2018: ACC/AHA guidelines change to ≥130/80 mmHg
2019: CMS adopts new guidelines for quality measures
```

**Current Clone Approach**:
```
❌ Org customized blood_pressure_systolic metric in 2017
❌ Alert thresholds set to ≥140 mmHg
❌ 2019: CMS audits clinic - fails quality measures
❌ Org must manually find and update their custom metric
❌ No platform-wide notification of critical change
```

**Versioning Approach**:
```
✅ Platform publishes blood_pressure_systolic v2.0 (2019)
✅ All orgs receive: "⚠️ REGULATORY UPDATE: CMS hypertension threshold now 130/80"
✅ Changelog shows: "Alert rules updated per ACC/AHA 2018 guidelines"
✅ Org clicks "Apply Update" → thresholds updated organization-wide
✅ Audit log: "Applied v2.0 regulatory update on 2019-03-15"
```

---

### Scenario 3: Security Vulnerability

**Example**: Validation Bug in GAD-7 Anxiety Scale

```
Bug Discovery:
2024-01: Platform discovers validation bug in GAD-7 metric
  - Should accept scores 0-21 only
  - Bug: Accepts values up to 100
  - Invalid data entered for 50+ patients across 10 orgs
```

**Current Clone Approach**:
```
❌ Each org has independent customized copy of GAD-7
❌ Platform cannot push fix to customized versions
❌ Must email all orgs: "Please manually update your GAD-7 validation"
❌ 3 orgs don't see email, continue with buggy version
❌ Invalid data persists in their system
```

**Versioning Approach**:
```
✅ Platform publishes GAD-7 v1.0.1 (patch release)
✅ Orgs receive: "🔒 SECURITY PATCH: GAD-7 validation fix (critical)"
✅ Changelog: "Fixed: Validation now enforces 0-21 range"
✅ Orgs click "Apply Patch" - fixes deployed in seconds
✅ Platform tracks: "9/10 orgs patched within 24h, 1 org pending"
```

---

## Proposed Versioning Architecture

### Schema Changes Required

```prisma
model MetricDefinition {
  id               String    @id @default(cuid())
  organizationId   String?   // NULL = platform, non-null = org

  // NEW VERSIONING FIELDS
  baseMetricId     String?   // Links to platform base metric (replaces sourceMetricId)
  version          String    @default("1.0.0")  // Semantic versioning
  versionStatus    VersionStatus @default(CURRENT)  // CURRENT, OUTDATED, DEPRECATED
  customizations   Json?     // Stores org-specific customizations only

  key              String
  displayName      String
  isStandardized   Boolean   @default(false)
  // ... other fields

  baseMetric       MetricDefinition?  @relation("MetricVersions", fields: [baseMetricId], references: [id])
  derivedVersions  MetricDefinition[] @relation("MetricVersions")

  @@unique([organizationId, key, version])
}

enum VersionStatus {
  CURRENT      // Latest version available
  OUTDATED     // Newer version exists
  DEPRECATED   // No longer supported
}

model VersionUpdate {
  id              String   @id @default(cuid())
  metricId        String   // Platform metric ID
  fromVersion     String   // e.g., "1.0.0"
  toVersion       String   // e.g., "2.0.0"
  updateType      UpdateType  // MAJOR, MINOR, PATCH
  releaseNotes    String   // Markdown description
  criticalUpdate  Boolean  @default(false)  // Security/regulatory
  publishedAt     DateTime @default(now())

  appliedUpdates  AppliedUpdate[]
}

enum UpdateType {
  MAJOR    // Breaking changes (e.g., scoring algorithm change)
  MINOR    // New features, non-breaking
  PATCH    // Bug fixes, security
}

model AppliedUpdate {
  id              String   @id @default(cuid())
  organizationId  String
  versionUpdateId String
  appliedAt       DateTime @default(now())
  appliedBy       String   // User ID
  rollbackable    Boolean  @default(true)

  organization    Organization   @relation(...)
  versionUpdate   VersionUpdate  @relation(...)

  @@unique([organizationId, versionUpdateId])
}
```

---

### UI/UX Design

#### Notification System

**Dashboard Notification Widget**:
```
┌─────────────────────────────────────────────┐
│ 📢 Updates Available (3)                    │
├─────────────────────────────────────────────┤
│ ⚠️ CRITICAL: Blood Pressure v2.0           │
│    Regulatory update - CMS guidelines       │
│    [Review] [Apply Now]                     │
├─────────────────────────────────────────────┤
│ 🔒 SECURITY: GAD-7 v1.0.1                  │
│    Validation bug fix                       │
│    [Review] [Apply Patch]                   │
├─────────────────────────────────────────────┤
│ ✨ FEATURE: PHQ-9 v2.0                     │
│    Updated normative data (optional)        │
│    [Review] [Skip]                          │
└─────────────────────────────────────────────┘
```

#### Version Upgrade Modal

**When user clicks "Review"**:
```
┌────────────────────────────────────────────────┐
│ PHQ-9 Depression Scale - Version 2.0 Update   │
├────────────────────────────────────────────────┤
│ Current Version: 1.0.0                         │
│ New Version: 2.0.0                             │
│ Update Type: MINOR (non-breaking)             │
│ Published: 2024-03-15                          │
│                                                │
│ What's New:                                    │
│ • Updated normative ranges based on 50k study │
│ • Improved scoring accuracy                    │
│ • New clinical interpretation guidelines      │
│                                                │
│ Your Customizations:                           │
│ ✓ Display Name: "PHQ-9 Assessment" (preserved)│
│ ✓ Custom description (preserved)              │
│ ⚠️ Alert threshold: Will use new v2.0 ranges  │
│                                                │
│ Impact Analysis:                               │
│ • 245 patients currently using PHQ-9          │
│ • Historical data preserved with v1.0 marker  │
│ • Future assessments use v2.0                 │
│                                                │
│ [Cancel]  [Schedule for Later]  [Apply Update]│
└────────────────────────────────────────────────┘
```

#### Metric Definition List with Version Badges

```
┌──────────────────────────────────────────────┐
│ PHQ-9 Depression Scale                       │
│ ⭐ Standardized • v1.0.0 • ⚠️ UPDATE (v2.0)  │
│ [Customize] [View Update]                    │
├──────────────────────────────────────────────┤
│ PHQ-9 Assessment (Custom)                    │
│ 🏥 Custom • v1.0.0 • ⚠️ UPDATE (v2.0)       │
│ [Edit] [Delete] [View Update]                │
├──────────────────────────────────────────────┤
│ GAD-7 Anxiety Scale                          │
│ ⭐ Standardized • v2.1.0 • ✅ CURRENT        │
│ [Customize]                                   │
└──────────────────────────────────────────────┘
```

---

### Backend API Changes

#### New Endpoints

```javascript
// Get available updates for organization
GET /api/metric-definitions/updates
Response:
{
  "updates": [
    {
      "metricId": "phq9_base_id",
      "metricName": "PHQ-9 Depression Scale",
      "currentVersion": "1.0.0",
      "newVersion": "2.0.0",
      "updateType": "MINOR",
      "criticalUpdate": false,
      "releaseNotes": "Updated normative ranges...",
      "affectedMetrics": [
        {
          "id": "org_phq9_custom_id",
          "name": "PHQ-9 Assessment (Custom)",
          "organizationId": "org123"
        }
      ]
    }
  ]
}

// Preview update impact
GET /api/metric-definitions/:id/update-preview?toVersion=2.0.0
Response:
{
  "currentVersion": "1.0.0",
  "newVersion": "2.0.0",
  "preservedCustomizations": ["displayName", "description"],
  "updatedFields": ["normalRange", "validationInfo", "scoringInfo"],
  "breakingChanges": false,
  "impactAnalysis": {
    "patientsAffected": 245,
    "observationsCount": 1834,
    "alertRulesAffected": 3
  }
}

// Apply update
POST /api/metric-definitions/:id/apply-update
Body:
{
  "toVersion": "2.0.0",
  "scheduledFor": null  // or ISO timestamp for scheduled update
}
Response:
{
  "success": true,
  "updatedMetric": { ... },
  "appliedUpdate": {
    "id": "applied_update_id",
    "appliedAt": "2024-03-15T10:30:00Z",
    "appliedBy": "user_id"
  }
}

// Rollback update (if issues discovered)
POST /api/metric-definitions/:id/rollback-update
Body:
{
  "toVersion": "1.0.0"  // Previous version
}
```

---

### Migration Strategy

#### Phase 1: Add Versioning Infrastructure (No Breaking Changes)

1. **Schema Migration**:
   - Add `version`, `versionStatus`, `baseMetricId` columns (nullable)
   - Rename `sourceMetricId` → `baseMetricId` (semantic clarity)
   - Create `VersionUpdate` and `AppliedUpdate` tables

2. **Backfill Existing Data**:
   - All current metrics default to `version: "1.0.0"`
   - `versionStatus: CURRENT`
   - `baseMetricId` = existing `sourceMetricId`

3. **No UI Changes Yet** - System still functions as clone-on-customize

#### Phase 2: Version Management Backend (Platform Admin Only)

1. **Platform Admin UI**:
   - Create new version of standardized metric
   - Write release notes (markdown)
   - Mark as MAJOR/MINOR/PATCH
   - Flag as critical (security/regulatory)

2. **Org Notification System**:
   - Email notifications for critical updates
   - Dashboard widget showing available updates

3. **Rollback Mechanism**:
   - Store previous version data
   - Allow rollback within 30 days

#### Phase 3: Org User Upgrade Workflow

1. **UI Components**:
   - Version update notifications
   - Update preview modal
   - Impact analysis
   - One-click apply

2. **Gradual Rollout**:
   - Pilot with 1-2 orgs
   - Collect feedback
   - Refine workflow

#### Phase 4: Deprecation Strategy

1. **Mark Old Versions Deprecated** (after 12-18 months)
2. **Migration Assistance**:
   - "Your PHQ-9 v1.0 will be deprecated in 6 months"
   - Offer migration support
3. **Eventually Remove Support** (after 24 months notice)

---

## Benefits Analysis

### For Organizations

✅ **Clinical Excellence**:
- Always access to latest evidence-based standards
- Improved patient outcomes through up-to-date measures

✅ **Compliance**:
- Regulatory updates pushed automatically
- Audit trail of update applications
- Reduced compliance burden

✅ **Security**:
- Rapid patching of vulnerabilities
- No orphaned buggy versions

✅ **Control**:
- Opt-in upgrades (not forced)
- Review changes before applying
- Rollback if issues discovered

✅ **Efficiency**:
- No manual tracking of standard updates
- One-click update application
- Customizations preserved

### For Platform

✅ **Quality Assurance**:
- Can fix bugs across all orgs
- Consistent standards enforcement

✅ **Competitive Advantage**:
- "Always up-to-date clinical standards"
- "Regulatory compliance automation"

✅ **Support Efficiency**:
- Fewer support tickets about outdated metrics
- Can push fixes proactively

✅ **Clinical Validity**:
- Research studies use consistent versions
- Cross-organization data comparability

---

## Risks & Mitigation

### Risk 1: Customization Conflicts

**Risk**: Org customizations may conflict with new version changes

**Mitigation**:
- **Merge Strategy**: Only update base fields, preserve org customizations
- **Preview Tool**: Show exactly what will change before applying
- **Conflict Resolution**: If conflict detected, flag for manual review
- **Rollback**: Allow reverting to previous version if issues arise

### Risk 2: Historical Data Interpretation

**Risk**: Patient data collected on v1.0 may not be comparable to v2.0

**Mitigation**:
- **Version Tagging**: Every observation tagged with metric version used
- **Analytics Tools**: Filter/group by version in reports
- **Migration Notes**: Document version-specific interpretation guidelines
- **Dual Scoring**: For major changes, show scores in both v1.0 and v2.0 formats

### Risk 3: Forced Updates Resistance

**Risk**: Organizations may resist updating if they've invested in training on v1.0

**Mitigation**:
- **Opt-In Philosophy**: Updates never forced (except critical security)
- **Deprecation Timeline**: Long notice periods (12-24 months)
- **Training Materials**: Provide changelog and training docs with each update
- **Gradual Rollout**: Pilot updates with early adopters first

### Risk 4: Complexity Overhead

**Risk**: Version management adds development and maintenance complexity

**Mitigation**:
- **Phased Implementation**: Build incrementally (Phases 1-4)
- **Automate**: Version publishing, notifications, migrations all automated
- **Clear Governance**: Document who can publish versions, approval process
- **Monitoring**: Track update adoption rates, rollback frequency

---

## Recommendation

### Short Term (Current System - Next 6 Months)

**Keep Clone-on-Customize** for now, but:

1. **Document Limitations**: Add warning to platform admins:
   > "⚠️ Note: Customized metrics do not receive platform updates. Organizations are responsible for tracking clinical standard changes."

2. **Track Feedback**: Monitor support tickets about:
   - Outdated metrics
   - Compliance issues
   - Feature requests for updates

3. **Prepare for Versioning**:
   - Add `version: "1.0.0"` field now (easy migration later)
   - Document current customization patterns

### Medium Term (6-12 Months)

**Implement Versioning** if:
- ✅ 5+ support tickets about outdated metrics
- ✅ Regulatory update required (e.g., CMS guideline change)
- ✅ Clinical standard evolution (e.g., PHQ-9 v2.0 published)
- ✅ Security vulnerability discovered

**Implementation Plan**:
1. **Phase 1** (Month 1-2): Schema + backfill
2. **Phase 2** (Month 3-4): Platform admin version management
3. **Phase 3** (Month 5-6): Org user upgrade workflow (pilot with 2 orgs)
4. **Phase 4** (Month 7-12): Full rollout + deprecation strategy

### Long Term (12+ Months)

**Versioning is Essential** because:
- Clinical standards evolve (evidence-based updates)
- Regulatory landscape changes (CMS, FDA, state laws)
- Security vulnerabilities emerge
- Platform liability (providing outdated clinical tools)

**Without versioning, the platform faces**:
- Clinical validity concerns (outdated standards)
- Compliance failures (organizations miss regulatory updates)
- Support burden (manual notification of updates)
- Competitive disadvantage (competitors offer "always up-to-date")

---

## Decision Matrix

| Factor | Clone-on-Customize | Versioning |
|--------|-------------------|------------|
| **Immediate Effort** | ✅ Low (already built) | ❌ High (months of dev) |
| **Long-Term Maintainability** | ❌ Manual updates | ✅ Automated propagation |
| **Clinical Validity** | ❌ Orgs use outdated standards | ✅ Always current |
| **Regulatory Compliance** | ❌ Cannot push updates | ✅ Rapid compliance |
| **Org Flexibility** | ✅ Full independence | ✅ Opt-in upgrades |
| **Competitive Position** | ❌ "Clone and forget" | ✅ "Always up-to-date" |
| **Platform Liability** | ⚠️ Orgs responsible for updates | ✅ Platform provides updates |

---

## Conclusion

**Your instinct is correct**: Versioning is the superior approach for a healthcare platform where:
- **Clinical standards evolve** (evidence-based medicine advances)
- **Regulatory compliance is mandatory** (CMS, FDA requirements)
- **Security is critical** (bug fixes must propagate)
- **Data validity matters** (research and quality measures)

**Recommendation**:
1. **Short-term**: Keep current system, add version field now
2. **Medium-term**: Implement versioning when first clinical/regulatory update needed
3. **Long-term**: Versioning is essential for platform success and clinical validity

The question isn't **if** you'll need versioning, but **when**. Starting with clone-on-customize buys time, but plan the migration to versioning within 12 months.
