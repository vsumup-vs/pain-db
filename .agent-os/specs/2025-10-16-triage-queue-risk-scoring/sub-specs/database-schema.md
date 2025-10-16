# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-10-16-triage-queue-risk-scoring/spec.md

> Created: 2025-10-16
> Version: 1.0.0

## Schema Changes

### Alert Model - Triage Queue Fields (Already Implemented)

The following fields have already been added to the Alert model in the schema:

```prisma
model Alert {
  // ... existing fields ...

  // Triage Queue Fields (Phase 1a) - ALREADY IMPLEMENTED
  riskScore      Float?      // 0-10 risk score for prioritization
  priorityRank   Int?        // Global rank across all alerts (1 = highest priority)
  slaBreachTime  DateTime?   // When SLA will be breached
  claimedById    String?     // User who claimed this alert
  claimedAt      DateTime?   // When alert was claimed

  // ... existing relationships ...

  claimedBy   User?      @relation("ClaimedAlerts", fields: [claimedById], references: [id], onDelete: SetNull)

  // ... existing indexes ...
  @@index([riskScore])
  @@index([priorityRank])
  @@index([slaBreachTime])
  @@index([claimedById])
}
```

**Status:** ✅ **NO MIGRATION NEEDED** - All required fields already exist in schema.

## Field Specifications

### riskScore (Float, nullable)

**Purpose:** Stores the calculated 0-10 risk score for alert prioritization.

**Calculation:** Performed by `riskScoringService.js` using:
```
riskScore = ((vitalsDeviation * 0.5) + (trendVelocity * 0.3) + (adherencePenalty * 0.2)) * severityMultiplier
```

**Usage:**
- Updated when alert is created (initial calculation)
- Recalculated when new observations arrive for the same patient/metric
- Used for triage queue sorting (highest risk first)

**Constraints:**
- Range: 0.0 to 10.0
- Nullable: Yes (null if insufficient data to calculate)

**Index:** Yes - for fast sorting in triage queue queries

---

### priorityRank (Int, nullable)

**Purpose:** Global ranking of alerts across entire organization (1 = highest priority).

**Calculation:** Derived from riskScore, slaBreachTime, and triggeredAt:
- Primary sort: riskScore DESC (highest risk first)
- Secondary sort: slaBreachTime ASC (soonest breach first)
- Tertiary sort: triggeredAt ASC (oldest first)

**Usage:**
- Optional field for future optimization (Phase 1b)
- Allows pre-computed ranking to avoid complex sorting in queries
- Can be updated via scheduled job or on-demand

**Constraints:**
- Range: 1 to N (where N = total alerts)
- Nullable: Yes (computed on-demand if null)

**Index:** Yes - for fast pagination and ranking queries

**Note:** For Phase 1a, we will NOT use priorityRank. We'll sort dynamically using riskScore and slaBreachTime. This field is reserved for Phase 1b optimization if needed.

---

### slaBreachTime (DateTime, nullable)

**Purpose:** Timestamp when alert SLA will be breached based on severity.

**Calculation:** Performed on alert creation:
```javascript
const SLA_MINUTES = {
  CRITICAL: 30,   // 30 minutes
  HIGH: 120,      // 2 hours
  MEDIUM: 480,    // 8 hours
  LOW: 1440       // 24 hours
};

slaBreachTime = new Date(triggeredAt.getTime() + SLA_MINUTES[severity] * 60 * 1000);
```

**Usage:**
- Displayed in triage queue as countdown timer
- Used for SLA breach indicator color coding
- Secondary sort field in triage queue (soonest breach first)

**Constraints:**
- Must be >= triggeredAt
- Nullable: Yes (if no SLA defined for alert type)

**Index:** Yes - for fast sorting and breach detection queries

---

### claimedById (String, nullable)

**Purpose:** User ID of care manager who claimed this alert for resolution.

**Usage:**
- Set when user clicks "Claim" button
- Prevents multiple care managers from working on same alert
- Used for filtering ("My Claimed Alerts", "Unclaimed Alerts")

**Constraints:**
- Foreign key to User.id
- Nullable: Yes (null = unclaimed)
- onDelete: SetNull (if user deleted, alert becomes unclaimed)

**Index:** Yes - for fast filtering by claimed status and user

---

### claimedAt (DateTime, nullable)

**Purpose:** Timestamp when alert was claimed.

**Usage:**
- Displayed in triage queue UI ("Claimed 15m ago")
- Used for claim timeout logic (Phase 1b - auto-release after 2 hours)
- Audit trail for alert ownership

**Constraints:**
- Must be >= triggeredAt
- Must be set when claimedById is set
- Nullable: Yes (null if unclaimed)

**Index:** No - not needed for Phase 1a queries

## Existing Relationships

### claimedBy (User, nullable)

**Already implemented** in schema (line 292):
```prisma
claimedBy User? @relation("ClaimedAlerts", fields: [claimedById], references: [id], onDelete: SetNull)
```

**Purpose:** Relationship to User who claimed the alert.

**Usage:**
- Enables querying claimer's name, email for display
- Allows filtering alerts by specific users (supervisor view)

**Cascade Behavior:** SetNull (if user deleted, alert becomes unclaimed)

## Query Patterns

### Default Triage Queue Query

```javascript
const alerts = await prisma.alert.findMany({
  where: {
    organizationId: currentUser.organizationId,
    status: {
      in: ['PENDING', 'ACKNOWLEDGED']
    }
  },
  include: {
    patient: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true
      }
    },
    rule: {
      select: {
        id: true,
        name: true,
        severity: true
      }
    },
    claimedBy: {
      select: {
        id: true,
        firstName: true,
        lastName: true
      }
    }
  },
  orderBy: [
    { riskScore: 'desc' },          // Highest risk first
    { slaBreachTime: 'asc' },       // Soonest breach first
    { triggeredAt: 'asc' }          // Oldest alerts first
  ],
  take: 100  // Pagination
});
```

### Query Performance

**Existing Indexes (Already Defined):**
- `@@index([organizationId])`
- `@@index([status])`
- `@@index([riskScore])`
- `@@index([slaBreachTime])`
- `@@index([claimedById])`

**Expected Query Time:** <200ms for 100 alerts with includes

**Optimization Notes:**
- Consider composite index: `[organizationId, status, riskScore, slaBreachTime]` if queries are slow
- Limit default query to 100 results with pagination for large datasets
- Use partial indexes if organization has >10,000 alerts

## Data Migration

**Status:** ✅ **NO MIGRATION NEEDED**

All required fields already exist in the database schema. No migration is necessary.

## Rationale

The triage queue fields were pre-designed and added to the Alert model during the initial schema design phase. This forward-thinking approach enables rapid feature development without database downtime.

The hybrid risk scoring approach (pre-calculate on alert creation, update on new observations) balances:
- **Performance:** Fast triage queue loading (<2s)
- **Accuracy:** Risk scores update when clinically relevant
- **Simplicity:** No background scheduled jobs required

The claimedBy relationship uses `onDelete: SetNull` to ensure alerts remain accessible even if a user account is deleted (important for audit trail and patient safety).
