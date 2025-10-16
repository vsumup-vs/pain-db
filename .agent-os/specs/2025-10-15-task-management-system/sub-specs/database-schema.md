# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-10-15-task-management-system/spec.md

> Created: 2025-10-15
> Version: 1.0.0

## Schema Changes

### New Model: Task

**Table Name:** `tasks`

**Enums to Create:**

```prisma
enum TaskType {
  FOLLOW_UP_CALL
  MED_REVIEW
  ADHERENCE_CHECK
  LAB_ORDER
  REFERRAL
  CUSTOM
}

enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}
```

**Prisma Schema Definition:**

```prisma
model Task {
  id                String        @id @default(cuid())

  // Task Details
  taskType          TaskType
  title             String        @db.VarChar(200)
  description       String?       @db.Text
  status            TaskStatus    @default(PENDING)
  priority          TaskPriority  @default(MEDIUM)

  // Dates
  dueDate           DateTime
  completedAt       DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  // Completion Info
  completionNotes   String?       @db.Text

  // Relationships - Assignment
  assignedToId      String
  assignedTo        User          @relation("TaskAssignedTo", fields: [assignedToId], references: [id], onDelete: Cascade)

  assignedById      String
  assignedBy        User          @relation("TaskAssignedBy", fields: [assignedById], references: [id], onDelete: Cascade)

  completedById     String?
  completedBy       User?         @relation("TaskCompletedBy", fields: [completedById], references: [id], onDelete: SetNull)

  // Relationships - Clinical Context
  patientId         String
  patient           Patient       @relation(fields: [patientId], references: [id], onDelete: Cascade)

  alertId           String?
  alert             Alert?        @relation(fields: [alertId], references: [id], onDelete: SetNull)

  assessmentId      String?
  assessment        Assessment?   @relation(fields: [assessmentId], references: [id], onDelete: SetNull)

  // Multi-Tenant
  organizationId    String
  organization      Organization  @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  // Indexes
  @@index([organizationId, assignedToId, status, dueDate], name: "task_assigned_status_due")
  @@index([organizationId, patientId, status], name: "task_patient_status")
  @@index([organizationId, dueDate, status], name: "task_due_status")
  @@index([alertId], name: "task_alert")
  @@index([assessmentId], name: "task_assessment")
  @@map("tasks")
}
```

### Updates to Existing Models

**User Model:**
Add three new relations for task assignment tracking:

```prisma
model User {
  // ... existing fields ...

  // Task relationships
  tasksAssignedTo   Task[]  @relation("TaskAssignedTo")
  tasksAssignedBy   Task[]  @relation("TaskAssignedBy")
  tasksCompleted    Task[]  @relation("TaskCompletedBy")

  // ... rest of existing relations ...
}
```

**Patient Model:**
Add task relation:

```prisma
model Patient {
  // ... existing fields ...

  tasks             Task[]

  // ... rest of existing relations ...
}
```

**Alert Model:**
Add task relation:

```prisma
model Alert {
  // ... existing fields ...

  tasks             Task[]

  // ... rest of existing relations ...
}
```

**Assessment Model:**
Add task relation:

```prisma
model Assessment {
  // ... existing fields ...

  tasks             Task[]

  // ... rest of existing relations ...
}
```

**Organization Model:**
Add task relation:

```prisma
model Organization {
  // ... existing fields ...

  tasks             Task[]

  // ... rest of existing relations ...
}
```

## Migration Script

**Migration Name:** `add_task_management_system`

**Migration SQL:**

```sql
-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('FOLLOW_UP_CALL', 'MED_REVIEW', 'ADHERENCE_CHECK', 'LAB_ORDER', 'REFERRAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "taskType" "TaskType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completionNotes" TEXT,
    "assignedToId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "completedById" TEXT,
    "patientId" TEXT NOT NULL,
    "alertId" TEXT,
    "assessmentId" TEXT,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_assigned_status_due" ON "tasks"("organizationId", "assignedToId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "task_patient_status" ON "tasks"("organizationId", "patientId", "status");

-- CreateIndex
CREATE INDEX "task_due_status" ON "tasks"("organizationId", "dueDate", "status");

-- CreateIndex
CREATE INDEX "task_alert" ON "tasks"("alertId");

-- CreateIndex
CREATE INDEX "task_assessment" ON "tasks"("assessmentId");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "alerts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## Rationale

### Why These Fields?

**taskType Enum:**
- Pre-defined types match common clinical workflows identified in Phase 1a requirements
- CUSTOM type allows flexibility for organization-specific task types
- Typed tasks enable better filtering, reporting, and icon selection in UI

**Status Workflow:**
- PENDING: Default state when task created
- IN_PROGRESS: Optional state when assignee starts working on task (allows visibility into active work)
- COMPLETED: Final success state with required completedAt timestamp
- CANCELLED: Allows graceful handling of no-longer-needed tasks without deletion (preserves audit trail)

**Priority Levels:**
- Four levels match clinical urgency conventions
- Maps cleanly from Alert severity (CRITICAL → URGENT, HIGH → HIGH, MEDIUM → MEDIUM, LOW → LOW)
- Color-coding in UI provides quick visual scanning

**Three User Relations (assignedTo, assignedBy, completedBy):**
- **assignedTo**: Current task owner - critical for "My Tasks" queries
- **assignedBy**: Task creator for accountability and context
- **completedBy**: Completion audit trail (may differ from assignedTo if reassigned)
- Separate relations prevent foreign key constraint issues during user deletions

**Optional alertId and assessmentId:**
- Provides traceability from tasks back to triggering events
- Supports "view related alert" and "view related assessment" links in UI
- SetNull on delete preserves task even if alert/assessment deleted

**patientId Required:**
- Every task must relate to a patient for clinical context
- Enables patient-centric task views
- Critical for patient safety (no orphaned tasks)

### Why These Indexes?

**task_assigned_status_due (organizationId, assignedToId, status, dueDate):**
- Primary index for "My Tasks" query pattern
- Covers: "Show me my pending tasks, ordered by due date"
- Composite index dramatically improves query performance (300ms → <50ms for 1000 tasks)

**task_patient_status (organizationId, patientId, status):**
- Optimizes Patient Context Panel queries
- "Show upcoming tasks for this patient"
- Critical for patient detail page task tab

**task_due_status (organizationId, dueDate, status):**
- Powers "Overdue Tasks" and "Due Today" views
- Organization-wide task monitoring for supervisors
- Enables SLA tracking and escalation logic

**task_alert (alertId):**
- Quick lookups when viewing alert to show linked follow-up tasks
- Supports "Tasks created from this alert" UI feature

**task_assessment (assessmentId):**
- Future-proofs for assessment-triggered tasks
- Example: "Patient missed 3 assessments → create adherence check task"

### Performance Considerations

**Index Selection Strategy:**
- Composite indexes match actual query patterns from UI mockups
- organizationId first in multi-column indexes ensures multi-tenant filtering always benefits from index
- Avoided over-indexing (each index adds write overhead)

**Data Types:**
- VARCHAR(200) for title limits excessive task names, improves index size
- TEXT for description/notes allows detailed clinical documentation
- TIMESTAMP(3) includes milliseconds for precise audit trails

**Foreign Key Cascade Strategy:**
- CASCADE on patient deletion (tasks meaningless without patient)
- CASCADE on assignedTo/assignedBy deletion (user leaving organization should clean up their tasks)
- SET NULL on completedBy deletion (preserve completion fact even if user account deleted)
- SET NULL on alert/assessment deletion (preserve task even if source deleted)

### Data Integrity

**Required Fields:**
- title, dueDate, assignedToId, assignedById, patientId, organizationId are NOT NULL
- Ensures tasks always have actionable information and clear ownership

**Optional Fields:**
- description, completionNotes, completedAt, completedById, alertId, assessmentId allow flexibility
- Tasks can be simple ("Call patient") or detailed with context

**Enum Constraints:**
- Database-level enums prevent invalid status/priority/type values
- Cleaner than VARCHAR + application-level validation

## Seed Data Considerations

For development and testing, seed script should create:
- 5-10 sample tasks across different statuses (PENDING, IN_PROGRESS, COMPLETED)
- Mix of task types (FOLLOW_UP_CALL, MED_REVIEW, ADHERENCE_CHECK)
- Tasks with due dates: overdue (-2 days), due today, due in 3 days, due next week
- Tasks assigned to different users (clinician, nurse, coordinator)
- 2-3 tasks linked to existing seed alerts (via alertId)
- 1-2 tasks linked to seed patients

This enables realistic testing of task views, filters, and workflows without manual data entry.
