# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-10-14-task-management-system/spec.md

> Created: 2025-10-14
> Version: 1.0.0

---

## Schema Changes

### New Task Model

```prisma
model Task {
  id                String      @id @default(cuid())
  organizationId    String
  patientId         String
  assignedToId      String?     // Clinician/care manager assigned
  createdById       String      // User who created the task
  taskType          TaskType
  title             String      // Brief task summary
  description       String?     @db.Text // Detailed instructions
  dueDate           DateTime?
  priority          Priority    // LOW, MEDIUM, HIGH, URGENT
  status            TaskStatus
  completedAt       DateTime?
  completedById     String?
  completionNotes   String?     @db.Text // Notes added when completing task

  // Linkage to triggering entities
  linkedAlertId     String?
  linkedAssessmentId String?
  linkedEnrollmentId String?

  // Metadata
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  // Relations
  organization      Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  patient           Patient      @relation(fields: [patientId], references: [id], onDelete: Cascade)
  assignedTo        User?        @relation("AssignedTasks", fields: [assignedToId], references: [id], onDelete: SetNull)
  createdBy         User         @relation("CreatedTasks", fields: [createdById], references: [id])
  completedBy       User?        @relation("CompletedTasks", fields: [completedById], references: [id], onDelete: SetNull)
  linkedAlert       Alert?       @relation(fields: [linkedAlertId], references: [id], onDelete: SetNull)
  linkedAssessment  Assessment?  @relation(fields: [linkedAssessmentId], references: [id], onDelete: SetNull)
  linkedEnrollment  Enrollment?  @relation(fields: [linkedEnrollmentId], references: [id], onDelete: SetNull)

  @@index([organizationId, status, dueDate])
  @@index([assignedToId, status, dueDate])
  @@index([patientId, status])
  @@index([createdById])
  @@index([linkedAlertId])
}

enum TaskType {
  FOLLOW_UP_CALL        // Call patient to check on condition/medication
  MED_REVIEW           // Review medication list with patient
  ADHERENCE_CHECK      // Check medication/assessment adherence
  LAB_ORDER            // Order lab work (e.g., A1C, lipid panel)
  REFERRAL             // Refer to specialist
  ASSESSMENT_REMINDER  // Remind patient to complete assessment
  DEVICE_SETUP         // Help patient set up monitoring device
  CARE_PLAN_UPDATE     // Update patient's care plan
  ESCALATE_TO_PHYSICIAN // Flag for physician review
  CUSTOM               // User-defined task type
}

enum TaskStatus {
  PENDING      // Not yet started
  IN_PROGRESS  // Actively working on
  COMPLETED    // Finished successfully
  CANCELLED    // Task no longer needed
}

// Note: Priority enum already exists, but adding for reference
enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

---

## Migration Strategy

### Step 1: Create Task Model

```bash
npx prisma db push --accept-data-loss
# or
npx prisma migrate dev --name add-task-management-system
```

**Expected Schema Changes**:
- New `tasks` table
- New `TaskType` enum
- New `TaskStatus` enum
- Foreign key constraints to `organizations`, `patients`, `users`, `alerts`, `assessments`, `enrollments`

---

### Step 2: Update User Model

Add task relations to existing User model:

```prisma
model User {
  // ... existing fields ...

  // Task relations (add these)
  assignedTasks    Task[]  @relation("AssignedTasks")
  createdTasks     Task[]  @relation("CreatedTasks")
  completedTasks   Task[]  @relation("CompletedTasks")
}
```

---

### Step 3: Update Related Models

Add task relations to existing models:

```prisma
model Patient {
  // ... existing fields ...
  tasks            Task[]  // Add this relation
}

model Alert {
  // ... existing fields ...
  tasks            Task[]  // Add this relation
}

model Assessment {
  // ... existing fields ...
  tasks            Task[]  // Add this relation
}

model Enrollment {
  // ... existing fields ...
  tasks            Task[]  // Add this relation
}

model Organization {
  // ... existing fields ...
  tasks            Task[]  // Add this relation
}
```

---

## Indexes Rationale

1. **`[organizationId, status, dueDate]`**: Fast queries for "all pending tasks in my org due this week"
2. **`[assignedToId, status, dueDate]`**: Fast queries for "my tasks due today"
3. **`[patientId, status]`**: Fast queries for "all open tasks for this patient"
4. **`[createdById]`**: Fast queries for "tasks I created" (audit trail)
5. **`[linkedAlertId]`**: Fast lookup of tasks created from specific alert

---

## Data Constraints

### Required Fields
- `organizationId`: Every task belongs to an organization
- `patientId`: Every task relates to a patient
- `createdById`: Track who created the task (audit)
- `taskType`: Must specify task type
- `title`: Brief summary is required
- `priority`: Default to MEDIUM if not specified
- `status`: Default to PENDING

### Optional Fields
- `assignedToId`: Can be null (unassigned tasks visible in team queue)
- `dueDate`: Can be null (no specific deadline)
- `description`: Can be null (title may be sufficient)
- `completionNotes`: Only populated when task completed
- `linkedAlertId/Assessment/Enrollment`: Can be null (standalone tasks)

### Validation Rules
- `completedAt` and `completedById` must both be set when `status = COMPLETED`
- `dueDate` must be in the future when creating new tasks
- Cannot change `completedAt` or `completedById` after task completed (audit integrity)

---

## Cascade Delete Behavior

### When Organization Deleted
- **Action**: `onDelete: Cascade`
- **Rationale**: If organization removed, all its tasks should be deleted

### When Patient Deleted
- **Action**: `onDelete: Cascade`
- **Rationale**: If patient removed, their tasks no longer relevant

### When Assigned User Deleted
- **Action**: `onDelete: SetNull`
- **Rationale**: Task remains, but becomes unassigned (can be reassigned)

### When Alert/Assessment/Enrollment Deleted
- **Action**: `onDelete: SetNull`
- **Rationale**: Task remains valid even if triggering entity deleted (preserve workflow)

---

## Sample Data for Testing

```javascript
// seed-tasks.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTasks() {
  const org = await prisma.organization.findFirst();
  const patient = await prisma.patient.findFirst();
  const careManager = await prisma.user.findFirst({
    where: { role: 'CLINICIAN' }
  });

  await prisma.task.createMany({
    data: [
      {
        organizationId: org.id,
        patientId: patient.id,
        assignedToId: careManager.id,
        createdById: careManager.id,
        taskType: 'FOLLOW_UP_CALL',
        title: 'Follow-up on medication adherence',
        description: 'Patient reported missing doses last week. Call to discuss.',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        priority: 'HIGH',
        status: 'PENDING'
      },
      {
        organizationId: org.id,
        patientId: patient.id,
        assignedToId: careManager.id,
        createdById: careManager.id,
        taskType: 'LAB_ORDER',
        title: 'Order A1C lab test',
        description: 'Patient due for quarterly A1C check.',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week
        priority: 'MEDIUM',
        status: 'PENDING'
      }
    ]
  });

  console.log('✅ Tasks seeded successfully');
}

seedTasks()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

---

## Performance Considerations

### Query Optimization

**Common Query Pattern 1: "My tasks due today"**
```sql
SELECT * FROM tasks
WHERE assigned_to_id = $1
  AND status IN ('PENDING', 'IN_PROGRESS')
  AND due_date >= CURRENT_DATE
  AND due_date < CURRENT_DATE + INTERVAL '1 day'
ORDER BY priority DESC, due_date ASC;
```
**Index Used**: `[assignedToId, status, dueDate]` ✅

**Common Query Pattern 2: "All tasks for a patient"**
```sql
SELECT * FROM tasks
WHERE patient_id = $1
  AND status != 'COMPLETED'
ORDER BY due_date ASC;
```
**Index Used**: `[patientId, status]` ✅

**Common Query Pattern 3: "Overdue tasks in my org"**
```sql
SELECT * FROM tasks
WHERE organization_id = $1
  AND status IN ('PENDING', 'IN_PROGRESS')
  AND due_date < CURRENT_DATE
ORDER BY due_date ASC;
```
**Index Used**: `[organizationId, status, dueDate]` ✅

### Expected Performance
- Task list query (100 tasks): <100ms
- Task creation: <50ms
- Bulk update (20 tasks): <200ms

---

## Audit Trail Integration

### AuditLog Entries for Task Actions

```javascript
// When task created
await prisma.auditLog.create({
  data: {
    userId: req.user.id,
    organizationId: task.organizationId,
    action: 'CREATE',
    resource: 'TASK',
    resourceId: task.id,
    newValues: JSON.stringify(task),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    hipaaRelevant: false // Tasks are workflow, not PHI
  }
});

// When task assigned
await prisma.auditLog.create({
  data: {
    userId: req.user.id,
    organizationId: task.organizationId,
    action: 'UPDATE',
    resource: 'TASK',
    resourceId: task.id,
    oldValues: JSON.stringify({ assignedToId: task.assignedToId }),
    newValues: JSON.stringify({ assignedToId: newAssigneeId }),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    hipaaRelevant: false
  }
});

// When task completed
await prisma.auditLog.create({
  data: {
    userId: req.user.id,
    organizationId: task.organizationId,
    action: 'UPDATE',
    resource: 'TASK',
    resourceId: task.id,
    oldValues: JSON.stringify({ status: 'PENDING' }),
    newValues: JSON.stringify({
      status: 'COMPLETED',
      completedAt: new Date(),
      completionNotes: task.completionNotes
    }),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    hipaaRelevant: false
  }
});
```

---

## Migration Rollback Plan

If critical issues arise during migration:

```bash
# Rollback migration
npx prisma migrate resolve --rolled-back <migration-name>

# Drop tasks table manually if needed
psql $DATABASE_URL -c "DROP TABLE IF EXISTS tasks CASCADE;"
psql $DATABASE_URL -c "DROP TYPE IF EXISTS TaskType CASCADE;"
psql $DATABASE_URL -c "DROP TYPE IF EXISTS TaskStatus CASCADE;"

# Re-apply previous migration
npx prisma migrate deploy
```

**Data Loss Risk**: None (new table, no existing data)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-14
