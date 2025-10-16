# Tests Specification

This is the tests coverage details for the spec detailed in @.agent-os/specs/2025-10-15-task-management-system/spec.md

> Created: 2025-10-15
> Version: 1.0.0

## Test Coverage

### Unit Tests

**taskController.js**
- `getTasks()` - Returns filtered tasks with pagination
- `getTasks()` - Filters by assignedTo (my tasks view)
- `getTasks()` - Filters by patientId
- `getTasks()` - Filters by status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- `getTasks()` - Filters by priority
- `getTasks()` - Filters overdue tasks (dueDate < now, status != COMPLETED)
- `getTasks()` - Sorts by dueDate, priority, createdAt
- `getTasks()` - Respects organization isolation (returns only org tasks)
- `getTasks()` - Paginates correctly (page, limit, totalPages)
- `getTask()` - Returns single task with full relations (patient, alert, assigned users)
- `getTask()` - Returns 404 if task not found
- `getTask()` - Returns 403 if task belongs to different organization
- `createTask()` - Creates task with all required fields
- `createTask()` - Sets assignedById to current user
- `createTask()` - Sets organizationId from user context
- `createTask()` - Returns 400 if required fields missing (title, dueDate, assignedToId, patientId)
- `createTask()` - Returns 400 if invalid enum values (taskType, priority, status)
- `createTask()` - Returns 404 if assignedToId not found in organization
- `createTask()` - Returns 404 if patientId not found in organization
- `createTask()` - Links to alert if alertId provided
- `createTask()` - Links to assessment if assessmentId provided
- `updateTask()` - Updates task fields (title, description, priority, dueDate, assignedToId, status)
- `updateTask()` - Returns 403 if user not assignee and not coordinator
- `updateTask()` - Returns 404 if task not found
- `updateTask()` - Allows coordinators to update any task
- `completeTask()` - Sets status to COMPLETED, completedAt to now, completedById to current user
- `completeTask()` - Saves completionNotes if provided
- `completeTask()` - Returns 400 if task already COMPLETED or CANCELLED
- `completeTask()` - Returns 403 if user not assignee and not coordinator
- `cancelTask()` - Sets status to CANCELLED with completion notes
- `cancelTask()` - Returns 403 if user not coordinator
- `cancelTask()` - Returns 400 if task already completed
- `bulkAssignTasks()` - Assigns multiple tasks to specified user
- `bulkAssignTasks()` - Returns 403 if user lacks TASK_ASSIGN permission
- `bulkAssignTasks()` - Returns 400 if taskIds array exceeds 50 items
- `bulkAssignTasks()` - Skips tasks that don't exist, returns count of updated tasks
- `bulkCompleteTasks()` - Marks multiple tasks as COMPLETED
- `bulkCompleteTasks()` - Returns 403 if user not coordinator
- `bulkCompleteTasks()` - Returns 400 if taskIds array exceeds 50 items
- `getTaskStats()` - Returns task counts by status, priority
- `getTaskStats()` - Calculates overdue, dueToday, dueThisWeek counts
- `getTaskStats()` - Calculates completion rate (completed / total)
- `getTaskStats()` - Calculates avg completion time in hours

### Integration Tests

**Task CRUD API (taskRoutes.js + taskController.js)**
- POST /api/tasks - Creates task and returns 201 with task object
- POST /api/tasks - Returns 401 if no auth token
- POST /api/tasks - Returns 403 if user lacks TASK_CREATE permission
- POST /api/tasks - Returns 400 if validation fails (missing title, invalid enum)
- GET /api/tasks - Returns paginated task list with default filters
- GET /api/tasks?myTasks=true - Returns only current user's tasks
- GET /api/tasks?patientId=xxx - Returns tasks for specific patient
- GET /api/tasks?overdue=true - Returns only overdue tasks
- GET /api/tasks?status=PENDING&priority=HIGH - Combines multiple filters
- GET /api/tasks?sortBy=priority&sortOrder=desc - Sorts by specified field
- GET /api/tasks/:id - Returns single task with relations
- GET /api/tasks/:id - Returns 404 if task not found
- GET /api/tasks/:id - Returns 403 if task from different organization
- PUT /api/tasks/:id - Updates task fields
- PUT /api/tasks/:id - Returns 403 if user not assignee/coordinator
- PATCH /api/tasks/:id/complete - Marks task complete
- PATCH /api/tasks/:id/complete - Returns 400 if task already completed
- PATCH /api/tasks/:id/cancel - Cancels task (coordinator only)
- PATCH /api/tasks/:id/cancel - Returns 403 if user not coordinator
- POST /api/tasks/bulk-assign - Assigns multiple tasks
- POST /api/tasks/bulk-assign - Returns 403 if user lacks TASK_ASSIGN permission
- POST /api/tasks/bulk-complete - Completes multiple tasks
- POST /api/tasks/bulk-complete - Returns 403 if user not coordinator
- GET /api/tasks/stats - Returns task statistics
- GET /api/tasks/stats?assignedTo=userId - Returns stats for specific user

**Organization Isolation**
- User from Organization A cannot view tasks from Organization B
- User from Organization A cannot update tasks from Organization B
- User from Organization A cannot assign tasks to users in Organization B
- Creating task with patientId from different org returns 404

**Role-Based Access Control**
- Clinician can create tasks assigned to self
- Clinician can view own tasks
- Clinician can complete own tasks
- Clinician cannot view other clinician's tasks (unless coordinator)
- Coordinator can view all organization tasks
- Coordinator can reassign any task
- Coordinator can bulk assign tasks
- Coordinator can cancel tasks
- Org Admin has all task permissions

### Frontend Component Tests (Vitest + React Testing Library)

**Tasks.jsx Page Component**
- Renders tasks table with correct columns (Patient, Task Type, Title, Priority, Assigned To, Due Date, Status, Actions)
- Displays "My Tasks" tab as default view
- Displays task count badge on tabs (My Tasks: 12, All Tasks: 45)
- Renders priority badges with correct colors (URGENT: red, HIGH: orange, MEDIUM: yellow, LOW: gray)
- Displays due date with visual cues (overdue: red, due today: orange, due soon: yellow)
- Renders "Create Task" button that opens task creation modal
- Clicking task row opens task detail modal
- Filter dropdown filters tasks by status (PENDING, IN_PROGRESS, COMPLETED)
- Search bar filters tasks by patient name or task title
- Selecting multiple tasks shows bulk action bar
- Bulk action "Assign To..." opens user selection modal
- Bulk action "Mark Complete" confirms and completes tasks
- Bulk action "Reschedule" opens date picker modal
- Sorts table by clicking column headers (due date, priority, created date)
- Pagination controls work correctly (next, prev, page numbers)
- Shows empty state when no tasks ("No tasks found" message)
- Shows loading spinner while fetching tasks
- Handles API errors gracefully (shows error toast)

**TaskModal.jsx Component**
- Renders task creation form with all fields (Task Type dropdown, Title input, Description textarea, Patient dropdown, Assigned To dropdown, Priority radio buttons, Due Date picker, Due Time picker)
- Validates required fields (title, patient, assignedTo, dueDate)
- Validates title max length (200 chars)
- Disables submit button while submitting
- Shows validation errors inline
- Pre-fills patient if provided as prop (from alert resolution)
- Pre-fills alert context in description if provided
- Submits form and calls createTask mutation
- Closes modal on successful submission
- Shows success toast on task creation
- Shows error toast on API error
- Clears form on cancel

**TaskDetailModal.jsx Component**
- Displays full task details (patient info, task type, title, description, priority, due date, status, completion info)
- Shows "Assigned to" and "Assigned by" user names
- Shows linked alert with "View Alert" link if alertId present
- Shows linked assessment with "View Assessment" link if assessmentId present
- Shows completion timestamp and "Completed by" if status is COMPLETED
- Shows completion notes if present
- Renders "Mark Complete" button if status is PENDING/IN_PROGRESS and user is assignee
- Clicking "Mark Complete" opens completion notes textarea and confirm button
- Renders "Reassign" button if user is coordinator
- Clicking "Reassign" opens user selection dropdown
- Renders "Cancel Task" button if user is coordinator
- Clicking "Cancel" shows confirmation dialog
- Handles task completion successfully (updates UI, shows toast)
- Handles reassignment successfully
- Handles cancellation successfully

**PatientContextPanel.jsx Integration**
- Displays "Upcoming Tasks" section with next 5 tasks for patient
- Shows task type icon, title, assigned to, due date for each task
- Clicking task opens TaskDetailModal
- Shows "No upcoming tasks" if patient has no pending tasks
- Shows "View All Tasks" link that navigates to /tasks?patientId=xxx

### End-to-End Tests (Playwright)

**Task Creation from Alert Resolution Workflow**
1. Log in as care manager
2. Navigate to /triage-queue
3. Click on a high-priority alert
4. Click "Acknowledge" button
5. Check "Create Follow-Up Task" checkbox
6. Verify task modal opens with pre-filled patient, alert context, suggested due date
7. Edit task title to "Follow-up call for BP check"
8. Set priority to HIGH
9. Set due date to 3 days from now
10. Click "Create Task"
11. Verify success toast appears
12. Navigate to /tasks
13. Verify new task appears in "My Tasks" list with correct details

**Task Completion Workflow**
1. Log in as care manager with pending tasks
2. Navigate to /tasks (My Tasks view)
3. Verify "My Tasks" tab shows count of pending tasks
4. Filter to "Due Today" tasks
5. Click on a task row to open detail modal
6. Click "Mark Complete" button
7. Enter completion notes: "Contacted patient, BP stable at 132/85"
8. Click "Complete" button
9. Verify task status updates to COMPLETED
10. Verify completion timestamp and "Completed by" displayed
11. Close modal
12. Verify task removed from "My Tasks - Pending" list
13. Switch to "Completed" tab
14. Verify completed task appears in list with completion info

**Bulk Task Assignment Workflow (Coordinator)**
1. Log in as care coordinator
2. Navigate to /tasks (All Tasks view)
3. Filter to "Overdue" tasks
4. Select 3 tasks using checkboxes
5. Verify bulk action bar appears at top of table
6. Click "Assign To..." button
7. Select "Sarah Johnson" from user dropdown
8. Click "Assign" button
9. Verify loading indicator
10. Verify success toast: "3 tasks assigned to Sarah Johnson"
11. Verify selected tasks now show "Sarah Johnson" in Assigned To column
12. Clear selection
13. Verify bulk action bar disappears

**Patient Context Task View**
1. Log in as clinician
2. Navigate to /patients
3. Click on a patient with active tasks
4. Verify Patient Context Panel appears on right side
5. Scroll to "Upcoming Tasks" section
6. Verify 3 upcoming tasks displayed with icons, titles, due dates
7. Click on first task
8. Verify TaskDetailModal opens with full task details
9. Verify "View Alert" link appears (task was created from alert)
10. Click "View Alert" link
11. Verify navigation to alert detail or triage queue filtered to that alert

**Mobile Responsive Task Management**
1. Set viewport to mobile (375x667)
2. Log in as care manager
3. Navigate to /tasks
4. Verify tasks display as cards (not table)
5. Verify each card shows patient name, task title, priority badge, due date, assigned to, status badge
6. Swipe right on a task card
7. Verify "Complete" action appears
8. Tap "Complete"
9. Verify completion notes modal opens
10. Enter notes and confirm
11. Verify task marked complete
12. Tap "Create Task" button
13. Verify task creation modal is mobile-friendly (full screen on mobile)
14. Fill out form fields (verify touch-friendly input sizes)
15. Submit task
16. Verify success and task appears in list

## Mocking Requirements

**Prisma Client:**
- Mock `prisma.task.findMany()` for task list queries
- Mock `prisma.task.findUnique()` for single task queries
- Mock `prisma.task.create()` for task creation
- Mock `prisma.task.update()` for task updates
- Mock `prisma.task.updateMany()` for bulk operations
- Mock `prisma.task.count()` for pagination and stats
- Mock `prisma.user.findUnique()` for assignedTo validation
- Mock `prisma.patient.findUnique()` for patientId validation

**Express Request/Response:**
- Mock `req.user` with userId, organizationId, permissions
- Mock `req.organizationId` for multi-tenant context
- Mock `req.params.id` for task ID in routes
- Mock `req.query` for filters, pagination
- Mock `req.body` for POST/PUT data
- Mock `res.json()`, `res.status()`, `res.send()`

**React Query:**
- Mock `useQuery` hook for fetching tasks
- Mock `useMutation` hook for creating/updating/deleting tasks
- Mock query cache invalidation on mutations
- Mock optimistic updates for task completion

**Time/Date:**
- Mock `new Date()` to ensure consistent "overdue" calculations in tests
- Use fixed date (e.g., '2025-10-15T12:00:00Z') for predictable test assertions
- Mock date picker to avoid timezone issues in E2E tests

## Test Data

**Seed Test Tasks:**

```javascript
const testTasks = [
  {
    id: 'task_overdue_1',
    taskType: 'FOLLOW_UP_CALL',
    title: 'Follow-up call for elevated BP',
    status: 'PENDING',
    priority: 'HIGH',
    dueDate: new Date('2025-10-13T14:00:00Z'), // 2 days ago (overdue)
    assignedToId: 'user_clinician_1',
    assignedById: 'user_coordinator_1',
    patientId: 'patient_john_doe',
    alertId: 'alert_bp_high_1',
    organizationId: 'org_test_clinic'
  },
  {
    id: 'task_due_today_1',
    taskType: 'MED_REVIEW',
    title: 'Review diabetes medications',
    status: 'PENDING',
    priority: 'MEDIUM',
    dueDate: new Date('2025-10-15T10:00:00Z'), // Today
    assignedToId: 'user_pharmacist_1',
    assignedById: 'user_coordinator_1',
    patientId: 'patient_jane_smith',
    organizationId: 'org_test_clinic'
  },
  {
    id: 'task_upcoming_1',
    taskType: 'ADHERENCE_CHECK',
    title: 'Check medication adherence',
    status: 'IN_PROGRESS',
    priority: 'LOW',
    dueDate: new Date('2025-10-20T14:00:00Z'), // 5 days from now
    assignedToId: 'user_clinician_1',
    assignedById: 'user_clinician_1',
    patientId: 'patient_john_doe',
    organizationId: 'org_test_clinic'
  },
  {
    id: 'task_completed_1',
    taskType: 'FOLLOW_UP_CALL',
    title: 'Post-discharge follow-up call',
    status: 'COMPLETED',
    priority: 'HIGH',
    dueDate: new Date('2025-10-10T14:00:00Z'),
    completedAt: new Date('2025-10-10T16:30:00Z'),
    completionNotes: 'Contacted patient. Recovering well. No complications.',
    assignedToId: 'user_clinician_1',
    assignedById: 'user_coordinator_1',
    completedById: 'user_clinician_1',
    patientId: 'patient_mary_johnson',
    organizationId: 'org_test_clinic'
  }
]
```

## Coverage Goals

- **Backend Unit Tests:** 90%+ coverage for taskController.js
- **Backend Integration Tests:** 100% coverage for all API endpoints
- **Frontend Component Tests:** 80%+ coverage for Tasks.jsx, TaskModal.jsx, TaskDetailModal.jsx
- **E2E Tests:** Cover all critical user workflows (create, complete, bulk assign, patient context view)
- **Cross-Browser E2E:** Test on Chrome, Firefox, Safari (mobile: iOS Safari, Android Chrome)
