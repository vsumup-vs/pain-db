# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-10-15-task-management-system/spec.md

> Created: 2025-10-15
> Version: 1.0.0

## Technical Requirements

### Task Data Model

**Core Fields:**
- `id`: String (cuid) - Unique task identifier
- `taskType`: Enum - FOLLOW_UP_CALL, MED_REVIEW, ADHERENCE_CHECK, LAB_ORDER, REFERRAL, CUSTOM
- `title`: String (required, max 200 chars) - Short task description
- `description`: Text (optional) - Detailed task instructions or context
- `status`: Enum - PENDING, IN_PROGRESS, COMPLETED, CANCELLED
- `priority`: Enum - LOW, MEDIUM, HIGH, URGENT
- `dueDate`: DateTime (required) - Task due date and time
- `completedAt`: DateTime (nullable) - Actual completion timestamp
- `completionNotes`: Text (nullable) - Notes added upon completion
- `createdAt`, `updatedAt`: DateTime - Standard timestamps

**Relationships:**
- `assignedToId`: String (FK to User) - Current assignee
- `assignedById`: String (FK to User) - User who created/assigned the task
- `completedById`: String (nullable, FK to User) - User who completed the task
- `patientId`: String (FK to Patient) - Associated patient
- `alertId`: String (nullable, FK to Alert) - Linked alert if created from alert resolution
- `assessmentId`: String (nullable, FK to Assessment) - Linked assessment if relevant
- `organizationId`: String (FK to Organization) - Multi-tenant isolation

**Indexes:**
- Composite index on (organizationId, assignedToId, status, dueDate) for "My Tasks" queries
- Index on (organizationId, patientId, status) for patient context queries
- Index on (organizationId, dueDate, status) for overdue task queries
- Index on (alertId) for alert-to-task linking

### API Requirements

**Authentication & Authorization:**
- All endpoints require JWT authentication via `requireAuth` middleware
- `requireOrganizationContext` middleware enforces organization-level data isolation
- Permission checks:
  - `TASK_CREATE`: Create tasks (care managers, coordinators)
  - `TASK_READ`: View tasks (all clinical roles)
  - `TASK_UPDATE`: Update task status, reassign (assignee or coordinators)
  - `TASK_DELETE`: Delete tasks (coordinators only)
  - `TASK_ASSIGN`: Assign tasks to others (coordinators)

**Performance Criteria:**
- Task list queries must return within 300ms for up to 1000 tasks
- Task creation/update must complete within 200ms
- Bulk operations (assign/complete/reschedule) must handle up to 50 tasks within 2 seconds

### UI/UX Specifications

**Tasks Page Layout:**
- **Header**: Page title, "Create Task" button (primary action), filter dropdown, search bar
- **Filter Bar**: Tabs for "My Tasks" (default), "All Tasks", "Due Today", "Overdue", "Completed"
- **Task Table**: Columns: Patient Name, Task Type, Title, Priority (color-coded), Assigned To, Due Date, Status, Actions
- **Bulk Actions Bar**: Appears when tasks selected - "Assign To...", "Mark Complete", "Reschedule", "Cancel"
- **Task Detail Modal**: Click task row to view full details, add notes, change status, reassign

**Priority Color Coding:**
- URGENT: Red badge (bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300)
- HIGH: Orange badge (bg-orange-100 text-orange-800)
- MEDIUM: Yellow badge (bg-yellow-100 text-yellow-800)
- LOW: Gray badge (bg-gray-100 text-gray-800)

**Due Date Visual Cues:**
- Overdue (past due): Red text with "Overdue" label
- Due today: Orange text with clock icon
- Due within 3 days: Yellow text
- Future: Normal gray text

**Task Creation Modal:**
- Form fields: Task Type (dropdown), Title (text), Description (textarea), Patient (searchable dropdown), Assigned To (dropdown - users in org), Priority (radio buttons), Due Date (date picker with time), Due Time (time picker)
- Pre-fill patient and alert context if opened from alert resolution workflow
- Validation: Title required, Due Date required, Assigned To required

**Mobile Responsiveness:**
- Task table collapses to card layout on screens <768px
- Cards show: Patient name (header), Task title, Priority badge, Due date, Assigned to, Status badge
- Swipe actions for mobile: Swipe right to complete, swipe left to view details

### Integration Points

**1. Alert Resolution Workflow:**
- When acknowledging or resolving an alert in Triage Queue, display "Create Follow-Up Task" checkbox
- If checked, open task creation modal with pre-filled data:
  - `patientId`: From alert
  - `alertId`: Current alert ID
  - `title`: "Follow-up for [Alert Type]"
  - `description`: "Alert: [Alert details] - [Clinician notes from resolution]"
  - `taskType`: FOLLOW_UP_CALL (default, editable)
  - `priority`: Mapped from alert severity (CRITICAL → URGENT, HIGH → HIGH, MEDIUM → MEDIUM, LOW → LOW)
  - `dueDate`: Suggested based on alert type (default: +3 days)
  - `assignedTo`: Current user (editable)

**2. Patient Context Panel:**
- Add "Upcoming Tasks" section showing next 5 tasks ordered by due date
- Display: Task type icon, Title, Assigned to (if not current user), Due date
- Click task to open task detail modal
- "View All Tasks" link navigates to Tasks page filtered by patient

**3. Patient Detail Page:**
- Add "Tasks" tab alongside Demographics, Enrollments, Observations
- Show filterable task history: Upcoming (next 30 days), Completed (last 90 days), All
- Display task creation form inline for quick task addition

**4. Dashboard Integration (Optional - Phase 1b):**
- Dashboard widget: "My Tasks Due Today" showing count and top 3 urgent tasks
- Click widget to navigate to Tasks page with "Due Today" filter

## Approach Options

### Option A: Tasks as Separate Feature (Selected)

**Approach:**
- Create dedicated Task model with full CRUD API
- Standalone Tasks page with comprehensive filters and bulk actions
- Integrate with alerts via optional `alertId` foreign key
- Tasks can exist independently or be linked to alerts/assessments

**Pros:**
- Flexible task creation - not limited to alert-triggered tasks
- Clear separation of concerns (alerts vs. follow-up actions)
- Easier to extend with task templates, recurring tasks in Phase 2
- Care managers can create tasks proactively, not just reactively

**Cons:**
- More database tables and API endpoints to maintain
- Potential for duplicate data entry if users don't link tasks to alerts

**Rationale:** This approach provides maximum flexibility for clinical workflows. Care managers often need to create follow-up tasks that aren't directly triggered by alerts (e.g., "Schedule 6-month diabetes review", "Check on patient who missed assessment"). The alert linkage is optional but provides valuable context traceability.

### Option B: Tasks as Alert Follow-Up Actions Only

**Approach:**
- Store tasks as `followUpActions` JSONB array on Alert model
- Tasks only created during alert resolution workflow
- Display tasks in alert history, no standalone Tasks page

**Pros:**
- Simpler data model (no separate table)
- Tight coupling with alert workflow (always traceable)
- Less code to maintain

**Cons:**
- Cannot create tasks independent of alerts
- Limited filtering/sorting capabilities (JSONB queries less efficient)
- Difficult to reassign tasks or track completion separately
- Cannot link tasks to assessments or proactive care plans

**Rejected Because:** Too limiting for real-world clinical workflows where many follow-up actions are not alert-driven.

### Option C: Full Project Management System (Rejected - Too Complex)

**Approach:**
- Implement comprehensive project management with subtasks, dependencies, Gantt charts, time tracking

**Pros:**
- Very powerful task management
- Suitable for complex care coordination projects

**Cons:**
- Massive scope creep (3-4 weeks instead of 6-8 days)
- Overly complex UI for typical care management workflows
- Confusion with existing Time Logging feature

**Rejected Because:** Care managers need simple, fast task tracking, not full project management. The 80/20 rule applies - capture 80% of the value with 20% of the complexity.

## External Dependencies

None required. Task Management System uses existing tech stack:
- **Prisma ORM**: For Task model definition and queries
- **Express.js**: For RESTful API endpoints
- **React**: For frontend Tasks page and modals
- **TanStack React Query**: For server state management and optimistic updates
- **React Hook Form**: For task creation/edit forms
- **Heroicons**: For task type icons (phone, clipboard, beaker, etc.)
- **Tailwind CSS**: For UI styling and responsive design

No new external libraries needed.
