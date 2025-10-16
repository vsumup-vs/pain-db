# Loose Ends & Production Readiness Action Plan

> **Date**: 2025-10-16
> **Status**: Critical Issues Identified
> **Priority**: High - Required for Production

---

## 🚨 Critical Issue: NO STANDARDIZED DATA IN DATABASE

###Current State
```
Condition Presets:      0  ❌
Metric Definitions:     0  ❌
Assessment Templates:   0  ❌
Alert Rules:            0  ❌
Diagnoses (ICD-10):     0  ❌
Template Items:         0  ❌
Preset Relationships:   0  ❌
```

**Impact**: Platform cannot function without standardized clinical content.

---

## 📋 Action Plan

### Phase 1: Create Production-Ready Seed Data (IMMEDIATE)

#### Task 1.1: Consolidate and Create Master Seed File
**Priority**: P0 (Critical)

**Current Situation**:
- 19 different seed files exist
- No clear "production" seed file
- Seed files may have schema incompatibilities

**Action Required**:
1. Review `seed-rtm-standard.js` and `seed-robust-enhanced.js`
2. Create new `prisma/seed-production.js` with:
   - Condition Presets (5+ clinical conditions)
   - Metric Definitions (20+ standardized metrics)
   - Assessment Templates (5+ validated templates)
   - Alert Rules (10+ evidence-based rules)
   - Complete relationship mappings
3. Test seed file thoroughly
4. Update `package.json` with `seed:production` script

**References**:
- Check `docs/developer-reference.md` for:
  - Exact field names for each model
  - Required vs optional fields
  - Relationship naming conventions
- Check `docs/schema-generated.md` for:
  - Field types and constraints
  - Default values

**Deliverables**:
- ✅ `prisma/seed-production.js` (production-ready)
- ✅ `package.json` updated with `seed:production` script
- ✅ Documentation in `prisma/README.md` explaining seed files

---

#### Task 1.2: Standardized Condition Presets
**Priority**: P0 (Critical)

**Required Condition Presets** (minimum 5):

1. **Chronic Pain Management**
   - Diagnoses: M79.3 (Chronic pain), M25.50 (Pain in joint)
   - Assessment Templates: PROMIS Pain Intensity, Pain Interference
   - Metrics: Pain level (NRS 0-10), Pain location, Pain duration
   - Alert Rules: Pain >8 for 3+ days, Sudden pain increase

2. **Type 2 Diabetes**
   - Diagnoses: E11.9 (Type 2 diabetes without complications)
   - Assessment Templates: Diabetes Distress Scale
   - Metrics: Blood glucose, HbA1c, Weight, Blood pressure
   - Alert Rules: Glucose <70 or >250, HbA1c >9%

3. **Hypertension**
   - Diagnoses: I10 (Essential hypertension)
   - Assessment Templates: Cardiovascular symptoms checklist
   - Metrics: Systolic BP, Diastolic BP, Heart rate
   - Alert Rules: SBP >180 or DBP >120

4. **Heart Failure**
   - Diagnoses: I50.9 (Heart failure, unspecified)
   - Assessment Templates: Kansas City Cardiomyopathy Questionnaire (KCCQ)
   - Metrics: Weight, Dyspnea, Edema, Exercise tolerance
   - Alert Rules: Weight gain >3 lbs in 24 hours

5. **COPD (Chronic Obstructive Pulmonary Disease)**
   - Diagnoses: J44.9 (COPD, unspecified)
   - Assessment Templates: COPD Assessment Test (CAT)
   - Metrics: O2 saturation, Respiratory rate, FEV1
   - Alert Rules: O2 sat <90%, Respiratory rate >30

**Deliverables**:
- ✅ All 5 condition presets with complete relationships
- ✅ ICD-10 diagnoses linked
- ✅ Assessment templates linked
- ✅ Alert rules linked

---

#### Task 1.3: Standardized Metric Definitions
**Priority**: P0 (Critical)

**Required Metrics** (minimum 20):

**Vital Signs**:
1. Blood Pressure (Systolic) - numeric, mmHg
2. Blood Pressure (Diastolic) - numeric, mmHg
3. Heart Rate - numeric, bpm
4. Respiratory Rate - numeric, breaths/min
5. Temperature - numeric, °F
6. Weight - numeric, lbs/kg
7. O2 Saturation - numeric, %

**Pain Assessment**:
8. Pain Level (NRS) - numeric, 0-10
9. Pain Location - categorical
10. Pain Duration - categorical

**Diabetes**:
11. Blood Glucose - numeric, mg/dL
12. HbA1c - numeric, %

**Cardiac**:
13. Edema - ordinal (none, mild, moderate, severe)
14. Dyspnea - ordinal (none, mild, moderate, severe)

**Respiratory**:
15. FEV1 - numeric, L
16. Peak Flow - numeric, L/min

**Functional**:
17. Activity Level - ordinal
18. Sleep Quality - ordinal
19. Fatigue Level - ordinal
20. Mood - ordinal

**Deliverables**:
- ✅ All 20+ metrics with `isStandardized: true`
- ✅ Normal ranges defined
- ✅ Units specified
- ✅ Validation rules configured

---

#### Task 1.4: Standardized Assessment Templates
**Priority**: P0 (Critical)

**Required Templates** (minimum 5):

1. **PROMIS Pain Intensity (3-item)**
   - Metrics: Pain level (current, average, worst)
   - Scoring: 0-10 scale
   - Standard: NIH PROMIS

2. **PROMIS Pain Interference (4-item)**
   - Metrics: Pain impact on activities
   - Scoring: 1-5 scale
   - Standard: NIH PROMIS

3. **PHQ-9 (Depression Screening)**
   - Metrics: 9 depression symptom items
   - Scoring: 0-27 total score
   - Standard: Patient Health Questionnaire

4. **GAD-7 (Anxiety Screening)**
   - Metrics: 7 anxiety symptom items
   - Scoring: 0-21 total score
   - Standard: Generalized Anxiety Disorder Scale

5. **Daily Symptom Tracker**
   - Metrics: Pain, fatigue, sleep, mood
   - Scoring: 0-10 scales
   - Standard: Custom (but based on PROMIS)

**Deliverables**:
- ✅ All 5 templates with `isStandardized: true`
- ✅ Assessment Template Items (metric mappings) created
- ✅ Scoring algorithms documented
- ✅ Clinical use documented
- ✅ Copyright info included (where applicable)

---

#### Task 1.5: Standardized Alert Rules
**Priority**: P0 (Critical)

**Required Alert Rules** (minimum 10):

**Vital Sign Alerts**:
1. Critical High Blood Pressure (SBP >180 or DBP >120) - CRITICAL
2. Hypotension (SBP <90) - HIGH
3. Tachycardia (HR >120 at rest) - MEDIUM
4. Bradycardia (HR <50) - MEDIUM
5. Hypoxia (O2 sat <90%) - CRITICAL

**Symptom Alerts**:
6. Severe Pain (Pain >8 for 3+ consecutive days) - HIGH
7. Sudden Pain Increase (>3 points in 24 hours) - HIGH

**Diabetes Alerts**:
8. Hypoglycemia (Glucose <70 mg/dL) - CRITICAL
9. Hyperglycemia (Glucose >250 mg/dL) - HIGH

**Adherence Alerts**:
10. Missed Assessments (No assessment in 48 hours) - LOW

**Deliverables**:
- ✅ All 10+ alert rules with `isStandardized: true`
- ✅ Conditions defined (threshold, operator, parameters)
- ✅ Actions defined (notify clinician, escalate)
- ✅ Severity levels assigned
- ✅ Clinical evidence documented

---

### Phase 2: Seed Data Persistence Strategy

#### Task 2.1: Prisma Migration Hook
**Priority**: P1 (High)

**Goal**: Automatically seed standardized data after every schema change

**Implementation**:
1. Create `prisma/seed.ts` (or `.js`) as default seed
2. Configure `package.json`:
   ```json
   "prisma": {
     "seed": "node prisma/seed-production.js"
   }
   ```
3. Seed runs automatically after `prisma migrate dev` and `prisma migrate deploy`

**Deliverables**:
- ✅ `prisma/seed-production.js` configured as default seed
- ✅ Tested with `npx prisma db seed`
- ✅ Documented in `prisma/README.md`

---

#### Task 2.2: Idempotent Seed Script
**Priority**: P1 (High)

**Goal**: Seed script can run multiple times without creating duplicates

**Strategy**:
```javascript
// Use upsert for standardized data
await prisma.conditionPreset.upsert({
  where: { name: 'Chronic Pain Management' },
  update: {}, // Don't update existing
  create: {
    name: 'Chronic Pain Management',
    // ... rest of data
  }
});
```

**Deliverables**:
- ✅ All seed operations use `upsert` or check for existence
- ✅ Script can run repeatedly without errors
- ✅ Tested with multiple runs

---

#### Task 2.3: Seed Data Versioning
**Priority**: P2 (Medium)

**Goal**: Track seed data versions for migrations

**Implementation**:
1. Add version metadata to seed script
2. Create `seed_version` table to track applied seeds
3. Skip already-applied seed versions

**Deliverables**:
- ✅ Seed versioning system implemented
- ✅ Migration path documented

---

### Phase 3: Production Deployment Strategy

#### Task 3.1: Production Seed Script
**Priority**: P1 (High)

**Commands**:
```bash
# Development
npm run seed:production

# Production deployment
NODE_ENV=production npx prisma migrate deploy
NODE_ENV=production npx prisma db seed
```

**Deliverables**:
- ✅ Production seed instructions in deployment docs
- ✅ CI/CD pipeline updated

---

#### Task 3.2: Seed Data Validation Script
**Priority**: P1 (High)

**Script**: `scripts/check-standardized-data.js` (already created, needs fixes)

**Purpose**: Verify all standardized data exists before deployment

**Run Before**:
- Merging to main branch
- Deploying to staging
- Deploying to production

**Deliverables**:
- ✅ `scripts/check-standardized-data.js` fixed and working
- ✅ Added to `package.json` as `npm run validate:seeds`
- ✅ Added to CI/CD checks

---

### Phase 4: Documentation & Maintenance

#### Task 4.1: Seed Data Documentation
**Priority**: P1 (High)

**Create**:
1. `prisma/README.md` - How to seed, which file to use, what each seed contains
2. `docs/STANDARDIZED-DATA.md` - Complete list of all standardized content
3. Update `docs/developer-reference.md` - Add seed data section

**Deliverables**:
- ✅ Complete seed documentation
- ✅ Developer guide updated

---

#### Task 4.2: Update Documentation Generation Scripts
**Priority**: P2 (Medium)

**Goal**: Include standardized data in auto-generated docs

**Add to `generate-schema-reference.js`**:
- Note which models have standardized data
- Include sample standardized records

**Deliverables**:
- ✅ Documentation generators updated

---

## 🔧 Immediate Next Steps (Today)

### Step 1: Create Production Seed File (2-3 hours)
```bash
# Create the file
touch prisma/seed-production.js

# Follow this structure:
# 1. Import Prisma client
# 2. Create Metric Definitions (20+)
# 3. Create Assessment Templates (5+)
# 4. Create Assessment Template Items (map metrics to templates)
# 5. Create Alert Rules (10+)
# 6. Create Condition Presets (5+)
# 7. Link Diagnoses to Presets
# 8. Link Templates to Presets
# 9. Link Alert Rules to Presets
```

**Critical**: Reference `docs/developer-reference.md` for exact field names!

---

### Step 2: Test Seed File (30 min)
```bash
# Reset database
npx prisma migrate reset --skip-seed

# Run production seed
node prisma/seed-production.js

# Verify
node scripts/check-standardized-data.js
```

---

### Step 3: Configure as Default Seed (15 min)
```bash
# Update package.json
"prisma": {
  "seed": "node prisma/seed-production.js"
}

# Test automatic seeding
npx prisma db seed
```

---

### Step 4: Clean Up Old Seed Files (15 min)
```bash
# Move old seeds to archive
mkdir prisma/seeds-archive
mv seed-*.js prisma/seeds-archive/

# Keep only production seed
# Document migration in prisma/README.md
```

---

## 📊 Success Criteria

### Before Merging to Main:
- [ ] `npm run validate:seeds` passes (no missing data)
- [ ] All 5+ condition presets complete with relationships
- [ ] All 20+ metrics defined and standardized
- [ ] All 5+ assessment templates complete
- [ ] All 10+ alert rules defined
- [ ] Seed script is idempotent (can run multiple times)
- [ ] Documentation updated

### Before Production Deployment:
- [ ] Seed data tested on staging environment
- [ ] All relationships verified (no orphans)
- [ ] Clinical team reviewed and approved standardized content
- [ ] Backup of existing data (if any)
- [ ] Rollback plan documented

---

## 🚀 Long-Term Maintenance

### Monthly:
- [ ] Review and update standardized data based on clinical feedback
- [ ] Add new condition presets as needed
- [ ] Update alert rule thresholds based on evidence

### After Schema Changes:
- [ ] Run `npx prisma migrate dev` (auto-seeds)
- [ ] Run `npm run validate:seeds` (verify)
- [ ] Run `npm run docs:generate` (update docs)

### Before Each Release:
- [ ] Run full seed validation
- [ ] Review standardized data completeness
- [ ] Update clinical content version number

---

## 📝 Notes

### Why This Matters:
- **Clinical Safety**: Standardized metrics and alert rules ensure patient safety
- **Regulatory Compliance**: Proper ICD-10 coding required for billing
- **Data Quality**: Standardized assessments enable outcome tracking
- **Scalability**: Presets accelerate onboarding of new clinics
- **Research**: Standardized data enables cross-clinic research

### What Happens Without This:
- ❌ Platform cannot function (no metrics, no templates, no alerts)
- ❌ Each organization must create everything from scratch
- ❌ No cross-organization data comparability
- ❌ Regulatory compliance risks
- ❌ Cannot demo or pilot the platform

---

**Priority**: This is **blocking** for production. Must be completed before pilot launch.

**Estimated Total Effort**: 1-2 days of focused work

**Owner**: Development Team + Clinical Advisor (for content validation)

**Next Review**: After production seed is created and tested
