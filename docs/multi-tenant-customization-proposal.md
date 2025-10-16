# Multi-Tenant Customization Architecture Proposal

## Current State

All configuration entities are **globally shared** with no organization isolation:
- `MetricDefinition` - No `organizationId`
- `AssessmentTemplate` - No `organizationId`
- `ConditionPreset` - No `organizationId`
- `AlertRule` - No `organizationId`

**Problem:** Organizations cannot customize without affecting all other organizations.

---

## Proposed Solution: Clone-on-Customize Pattern

### Design Principles

1. **Global Library:** Platform provides standardized, evidence-based library (`isStandardized: true`)
2. **Organization Copies:** When org customizes, create org-specific copy (`organizationId: "xyz"`)
3. **Visibility Rules:**
   - Standardized items visible to all orgs
   - Custom items visible only to owning org
4. **Versioning:** Track relationship to original standardized item

### Schema Changes

```prisma
model MetricDefinition {
  id               String    @id @default(cuid())
  organizationId   String?   // NULL = platform-level, non-null = org-specific
  key              String    // No longer unique (allow per-org duplicates)
  displayName      String    // No longer unique
  description      String?
  unit             String?
  valueType        ValueType
  category         String?
  isStandardized   Boolean   @default(false)
  sourceMetricId   String?   // Reference to original standardized metric (if cloned)
  scaleMin         Decimal?
  scaleMax         Decimal?
  decimalPrecision Int?
  options          Json?
  normalRange      Json?
  standardCoding   Json?
  validationInfo   Json?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relationships
  organization      Organization?     @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  sourceMetric      MetricDefinition? @relation("MetricClones", fields: [sourceMetricId], references: [id])
  clonedMetrics     MetricDefinition[] @relation("MetricClones")
  observations      Observation[]
  templateItems     AssessmentTemplateItem[]

  @@unique([organizationId, key]) // Unique per org (or global if null)
  @@index([organizationId])
  @@index([key])
  @@index([isStandardized])
  @@map("metric_definitions")
}

model AssessmentTemplate {
  id                String   @id @default(cuid())
  organizationId    String?  // NULL = platform-level, non-null = org-specific
  name              String   // No longer globally unique
  description       String?
  questions         Json
  scoring           Json?
  isStandardized    Boolean  @default(false)
  sourceTemplateId  String?  // Reference to original standardized template (if cloned)
  category          String?
  standardCoding    Json?
  validationInfo    Json?
  scoringInfo       Json?
  copyrightInfo     String?
  clinicalUse       String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Relationships
  organization              Organization?        @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  sourceTemplate            AssessmentTemplate?  @relation("TemplateClones", fields: [sourceTemplateId], references: [id])
  clonedTemplates           AssessmentTemplate[] @relation("TemplateClones")
  assessments               Assessment[]
  conditionPresetTemplates  ConditionPresetTemplate[]
  items                     AssessmentTemplateItem[]

  @@unique([organizationId, name]) // Unique per org (or global if null)
  @@index([organizationId])
  @@index([name])
  @@index([isStandardized])
  @@map("assessment_templates")
}

model ConditionPreset {
  id                 String   @id @default(cuid())
  organizationId     String?  // NULL = platform-level, non-null = org-specific
  name               String   // No longer globally unique
  defaultProtocolId  String?
  description        String?
  isActive           Boolean  @default(true)
  isStandardized     Boolean  @default(false)
  sourcePresetId     String?  // Reference to original standardized preset (if cloned)
  category           String?
  standardCoding     Json?
  clinicalGuidelines Json?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  // Relationships
  organization      Organization?      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  sourcePreset      ConditionPreset?   @relation("PresetClones", fields: [sourcePresetId], references: [id])
  clonedPresets     ConditionPreset[]  @relation("PresetClones")
  diagnoses         ConditionPresetDiagnosis[]
  templates         ConditionPresetTemplate[]
  alertRules        ConditionPresetAlertRule[]
  enrollments       Enrollment[]

  @@unique([organizationId, name]) // Unique per org (or global if null)
  @@index([organizationId])
  @@index([name])
  @@index([isStandardized])
  @@map("condition_presets")
}

model AlertRule {
  id               String    @id @default(cuid())
  organizationId   String?   // NULL = platform-level, non-null = org-specific
  name             String    // No longer globally unique
  description      String?
  conditions       Json
  actions          Json
  isActive         Boolean   @default(true)
  isStandardized   Boolean   @default(false)
  sourceRuleId     String?   // Reference to original standardized rule (if cloned)
  category         String?
  severity         Severity?
  priority         Int       @default(0)
  standardCoding   Json?
  clinicalEvidence Json?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relationships
  organization      Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  sourceRule        AlertRule?    @relation("RuleClones", fields: [sourceRuleId], references: [id])
  clonedRules       AlertRule[]   @relation("RuleClones")
  alerts            Alert[]
  conditionPresets  ConditionPresetAlertRule[]

  @@unique([organizationId, name]) // Unique per org (or global if null)
  @@index([organizationId])
  @@index([name])
  @@index([isStandardized])
  @@map("alert_rules")
}
```

---

## Query Patterns

### Fetching Items (Show Standardized + Org-Specific)

```javascript
// Example: Get all metric definitions visible to an organization
const metricDefinitions = await prisma.metricDefinition.findMany({
  where: {
    OR: [
      { organizationId: null, isStandardized: true }, // Standardized items
      { organizationId: currentOrgId }                // Org-specific items
    ]
  },
  orderBy: [
    { isStandardized: 'desc' }, // Standardized first
    { displayName: 'asc' }
  ]
});
```

### Cloning Workflow (User Clicks "Customize")

```javascript
// 1. User clicks "Customize" on standardized metric "Pain Severity (0-10)"
const sourceMetric = await prisma.metricDefinition.findUnique({
  where: { id: standardizedMetricId }
});

// 2. Create organization-specific copy
const customMetric = await prisma.metricDefinition.create({
  data: {
    organizationId: currentOrgId,
    sourceMetricId: sourceMetric.id,  // Track origin
    key: sourceMetric.key,
    displayName: `${sourceMetric.displayName} (Custom)`,
    description: sourceMetric.description,
    unit: sourceMetric.unit,
    valueType: sourceMetric.valueType,
    category: sourceMetric.category,
    isStandardized: false,  // No longer standardized
    scaleMin: sourceMetric.scaleMin,
    scaleMax: sourceMetric.scaleMax,
    // ... copy all relevant fields
  }
});

// 3. Redirect user to edit form for customMetric
```

### Creating New Custom Item (Org Creates from Scratch)

```javascript
// Organization creates entirely new metric
const newMetric = await prisma.metricDefinition.create({
  data: {
    organizationId: currentOrgId,
    sourceMetricId: null,  // Not cloned from anything
    key: 'custom-pain-scale',
    displayName: 'Custom Pain Scale',
    isStandardized: false,
    // ... org-specific fields
  }
});
```

---

## UI/UX Considerations

### 1. List View with Badges

```
Metric Definitions
-----------------------------------------
[⭐ Standardized] Pain Severity (0-10)
[⭐ Standardized] Functional Status (PROMIS)
[🏥 Custom] Pain Severity (0-10) - Modified   [Edit] [Delete]
[🏥 Custom] Hospital-Specific Pain Scale      [Edit] [Delete]
```

### 2. Customize Button Flow

**Step 1:** User views standardized metric
```
Pain Severity (0-10) [⭐ Standardized]
[View Details] [Customize for My Organization]
```

**Step 2:** Click "Customize" → System clones → Opens edit form
```
Creating custom copy for Hospital ABC...
✓ Custom metric created. You can now modify it.

Editing: Pain Severity (0-10) (Custom)
Based on: Pain Severity (0-10) [Standardized]
[Form with editable fields...]
```

### 3. Sync Updates from Standardized (Optional Future Feature)

If platform updates standardized metric, show notification:
```
⚠️ Update Available
The standardized "Pain Severity (0-10)" has been updated.
Your custom version may be outdated.
[View Changes] [Apply Update] [Keep My Version]
```

---

## Migration Strategy

### Phase 1: Schema Migration (Breaking Change)

```bash
# Add organizationId and sourceId columns (nullable)
npx prisma migrate dev --name add_org_customization

# All existing items default to organizationId: NULL (platform-level)
```

### Phase 2: Data Migration Script

```javascript
// seed-migrate-to-org-customization.js

// Option A: Keep all existing as standardized (recommended)
await prisma.metricDefinition.updateMany({
  where: { organizationId: null },
  data: { isStandardized: true }
});

// Option B: Assign existing items to specific orgs (if needed)
// ... custom logic based on usage patterns
```

### Phase 3: Update Controllers

Update all GET endpoints to filter by organization:

```javascript
// Before (current)
const metrics = await prisma.metricDefinition.findMany();

// After (org-aware)
const metrics = await prisma.metricDefinition.findMany({
  where: {
    OR: [
      { organizationId: null, isStandardized: true },
      { organizationId: req.user.currentOrganization }
    ]
  }
});
```

### Phase 4: Add Clone/Customize Endpoints

```javascript
// POST /api/metric-definitions/:id/customize
exports.customizeMetric = async (req, res) => {
  const { id } = req.params;
  const orgId = req.user.currentOrganization;

  const sourceMetric = await prisma.metricDefinition.findUnique({ where: { id } });

  // Clone logic...
  const customMetric = await prisma.metricDefinition.create({
    data: {
      ...sourceMetric,
      id: undefined,
      organizationId: orgId,
      sourceMetricId: sourceMetric.id,
      isStandardized: false,
      displayName: `${sourceMetric.displayName} (Custom)`,
      createdAt: undefined,
      updatedAt: undefined
    }
  });

  res.json({ data: customMetric });
};
```

---

## Alternative Patterns (Not Recommended)

### Option 2: Shared with Override Flags ❌
- Store customizations as JSON overrides
- Complex to query and maintain
- Hard to version control

### Option 3: Separate Tables per Org ❌
- Create `org_abc_metrics`, `org_xyz_metrics`
- Doesn't scale, schema management nightmare

---

## Recommendations

1. **Implement Clone-on-Customize** (Option 1 above)
2. **Start with MetricDefinition and AssessmentTemplate** (most likely to be customized)
3. **Delay ConditionPreset and AlertRule** until customer demand (less likely to customize)
4. **Add "Restore to Standard" button** to revert custom changes
5. **Audit log all customizations** (HIPAA compliance)

---

## Impact Assessment

### Breaking Changes
- Database schema changes (add columns)
- API responses include `organizationId` field
- Unique constraints relaxed (now per-org)

### Non-Breaking (If Done Carefully)
- Existing `organizationId: NULL` items work as "global standardized"
- Frontend can gracefully handle new fields
- Controllers filter automatically by org context

### Effort Estimate
- Schema migration: 1 day
- Backend controller updates: 2-3 days
- Frontend UI updates: 3-4 days
- Testing (multi-org scenarios): 2 days
- **Total: ~2 weeks** for full implementation

---

**Next Steps:**
1. Decide which entities to make org-customizable first
2. Review and approve schema changes
3. Plan migration strategy (with rollback plan)
4. Implement and test in staging environment
5. Roll out to production with feature flag
