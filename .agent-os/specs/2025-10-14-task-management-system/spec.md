# Spec Requirements Document

> Spec: Task Management System
> Created: 2025-10-14
> Status: Planning
> Priority: P0 (Critical)
> Estimated Effort: 6-8 days

---

## Overview

Implement a comprehensive task management system that enables care managers to track follow-up actions beyond just resolving alerts. Tasks capture all the "next steps" that occur after patient interactions: follow-up calls, medication reviews, adherence checks, lab orders, referrals, and custom actions.

**Current Gap**: When care managers resolve an alert, they have no system to track required follow-up actions. This leads to forgotten tasks, missed interventions, and patients falling through the cracks.

**Success Criteria**: >80% of follow-up actions tracked as tasks (vs current 0%)

---

## User Stories

### Care Manager Daily Task Management

As a care manager, I want to see all my pending tasks in one place, so that I don't forget follow-up actions for any patient.

**Current Workflow (Broken)**:
1. Resolve alert for patient with high blood pressure
2. Tell patient "I'll call you back tomorrow to check on your medication change"
3. Hope to remember tomorrow (no system to track)
4. Forget to call → patient condition worsens → higher-acuity intervention needed

**New Workflow (Systematic)**:
1. Resolve alert for patient with high blood pressure
2. Click "Create Follow-Up Task" → auto-populated with patient info
3. Set task: "Follow-up call - verify medication adherence" | Due: Tomorrow 10 AM
4. Next morning: see task in "Due Today" list
5. Complete call, mark task done, add notes

---

### Physician Delegation

As a physician, I want to delegate specific tasks to care managers, so that I can ensure critical follow-ups happen without personally tracking each one.

**Workflow**:
1. Review patient during rounds
2. Create task: "Schedule cardiology referral for Patient X"
3. Assign to: Care Manager Sarah
4. Set due date: Within 5 business days
5. Receive notification when task completed

---

### RPM Coordinator Oversight

As an RPM coordinator, I want visibility into overdue tasks across my team, so that I can identify workload bottlenecks and prevent missed interventions.

**Workflow**:
1. Open "Team Tasks" view (coordinator-only)
2. See all tasks grouped by assigned care manager
3. Identify: Sarah has 15 overdue tasks, John has 2
4. Reassign 5 tasks from Sarah to John
5. Send reminder to Sarah about remaining overdue tasks

---

## Spec Scope

1. **Task Model** - New Prisma model with taskType, title, description, assignedTo, dueDate, priority, status, linkedAlert, linkedAssessment
2. **Task CRUD APIs** - Create, read, update, delete, bulk actions (assign, complete, reschedule)
3. **Task Views** - "My Tasks", "Due Today", "Overdue", "Completed", "Team Tasks" (coordinator view)
4. **Task Filters** - By status, priority, due date, task type, assigned user, patient
5. **Task Creation Workflows** - Quick create from alert resolution, patient detail page, standalone
6. **Auto-Task Generation** - System creates tasks for missed assessments, medication adherence issues, pending lab results
7. **Task Notifications** - Email reminders for due tasks, escalation for overdue tasks
8. **Bulk Actions** - Multi-select tasks to assign/reassign, mark complete, change due date

---

## Out of Scope

- Recurring tasks (e.g., "Check patient every Monday") - Phase 2
- Task dependencies (Task B can't start until Task A done) - Phase 3
- Time estimates and actual time tracking per task - Phase 3
- Task templates (pre-defined task checklists) - Phase 2
- Mobile push notifications for tasks - Phase 4
- Task comments/threads - Phase 2

---

## Expected Deliverable

1. **Care managers can create tasks from alert resolution with 2 clicks**
2. **"My Tasks" page shows all assigned tasks with filters (due today, overdue, by type)**
3. **Tasks can be assigned/reassigned to other care managers**
4. **Overdue tasks highlighted in red with escalation warnings**
5. **Bulk actions: select multiple tasks → assign, complete, or reschedule**
6. **Task detail panel shows linked patient, alert, assessment context**
7. **Daily email digest: "You have 5 tasks due today"**
8. **Performance: Task list loads in <300ms for 100+ tasks**

---

## Spec Documentation

- Technical Specification: @.agent-os/specs/2025-10-14-task-management-system/sub-specs/technical-spec.md
- Database Schema: @.agent-os/specs/2025-10-14-task-management-system/sub-specs/database-schema.md
- API Specification: @.agent-os/specs/2025-10-14-task-management-system/sub-specs/api-spec.md
- Frontend Design: @.agent-os/specs/2025-10-14-task-management-system/sub-specs/frontend-design.md
- Tests Specification: @.agent-os/specs/2025-10-14-task-management-system/sub-specs/tests.md
