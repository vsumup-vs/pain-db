# Spec Tasks

These are the tasks to be completed for the spec detailed in @.agent-os/specs/2025-10-15-task-management-system/spec.md

> Created: 2025-10-15
> Status: Ready for Implementation

## Tasks

- [ ] 1. Database Schema & Prisma Setup
  - [ ] 1.1 Add TaskType, TaskStatus, TaskPriority enums to schema.prisma
  - [ ] 1.2 Add Task model to schema.prisma with all fields and relations
  - [ ] 1.3 Add Task relations to User, Patient, Alert, Assessment, Organization models
  - [ ] 1.4 Add TASK_READ, TASK_CREATE, TASK_UPDATE, TASK_DELETE, TASK_ASSIGN permissions to Permission enum
  - [ ] 1.5 Run `npx prisma migrate dev --name add_task_management_system`
  - [ ] 1.6 Verify migration applied successfully with `npx prisma studio`

- [ ] 2. Backend API - Task Controller
  - [ ] 2.1 Write unit tests for taskController.js (getTasks, getTask, createTask, updateTask, completeTask, cancelTask, bulk operations, getTaskStats)
  - [ ] 2.2 Create `/src/controllers/taskController.js` with all controller functions
  - [ ] 2.3 Implement getTasks() with filtering (assignedTo, patientId, status, priority, overdue), sorting, pagination
  - [ ] 2.4 Implement getTask() with full relations (patient, alert, assigned users)
  - [ ] 2.5 Implement createTask() with validation, organization isolation, assignedBy auto-set
  - [ ] 2.6 Implement updateTask() with permission checks (assignee or coordinator only)
  - [ ] 2.7 Implement completeTask() with completion timestamp, completedBy, validation
  - [ ] 2.8 Implement cancelTask() with coordinator-only permission check
  - [ ] 2.9 Implement bulkAssignTasks() with 50-task limit, coordinator-only
  - [ ] 2.10 Implement bulkCompleteTasks() with 50-task limit, coordinator-only
  - [ ] 2.11 Implement getTaskStats() with counts by status/priority, overdue/dueToday/dueThisWeek, completion metrics
  - [ ] 2.12 Verify all unit tests pass

- [ ] 3. Backend API - Task Routes
  - [ ] 3.1 Write integration tests for all task endpoints (CRUD, actions, bulk operations)
  - [ ] 3.2 Create `/src/routes/taskRoutes.js` with all routes
  - [ ] 3.3 Apply middleware chain (requireAuth, requireOrganizationContext, requirePermissions)
  - [ ] 3.4 Add routes: GET /api/tasks, GET /api/tasks/:id, POST /api/tasks, PUT /api/tasks/:id, DELETE /api/tasks/:id
  - [ ] 3.5 Add action routes: PATCH /api/tasks/:id/complete, PATCH /api/tasks/:id/cancel
  - [ ] 3.6 Add bulk routes: POST /api/tasks/bulk-assign, POST /api/tasks/bulk-complete
  - [ ] 3.7 Add stats route: GET /api/tasks/stats
  - [ ] 3.8 Register taskRoutes in index.js: `app.use('/api/tasks', taskRoutes)`
  - [ ] 3.9 Test organization isolation (user can't access tasks from different org)
  - [ ] 3.10 Test RBAC (clinicians can manage own tasks, coordinators can manage all tasks)
  - [ ] 3.11 Verify all integration tests pass

- [x] 4. Frontend API Integration
  - [x] 4.1 Add task API methods to `/frontend/src/services/api.js`
  - [x] 4.2 Add `getTasks: (params) => apiClient.get('/tasks', { params })`
  - [x] 4.3 Add `getTask: (id) => apiClient.get(`/tasks/${id}`)`
  - [x] 4.4 Add `createTask: (data) => apiClient.post('/tasks', data)`
  - [x] 4.5 Add `updateTask: (id, data) => apiClient.put(`/tasks/${id}`, data)`
  - [x] 4.6 Add `completeTask: (id, data) => apiClient.patch(`/tasks/${id}/complete`, data)`
  - [x] 4.7 Add `cancelTask: (id, data) => apiClient.patch(`/tasks/${id}/cancel`, data)`
  - [x] 4.8 Add `bulkAssignTasks: (data) => apiClient.post('/tasks/bulk-assign', data)`
  - [x] 4.9 Add `bulkCompleteTasks: (data) => apiClient.post('/tasks/bulk-complete', data)`
  - [x] 4.10 Add `getTaskStats: (params) => apiClient.get('/tasks/stats', { params })`

- [x] 5. Frontend - Tasks Page Component
  - [ ] 5.1 Write component tests for Tasks.jsx (rendering, filtering, sorting, bulk actions, pagination)
  - [x] 5.2 Create `/frontend/src/pages/Tasks.jsx` component
  - [x] 5.3 Implement useQuery hook for fetching tasks with filters
  - [x] 5.4 Render page header with "Tasks" title and "Create Task" button
  - [x] 5.5 Implement filter bar with tabs (My Tasks, All Tasks, Due Today, Overdue, Completed)
  - [x] 5.6 Implement search bar for filtering by patient name or task title
  - [x] 5.7 Render tasks table with columns (Patient, Task Type, Title, Priority, Assigned To, Due Date, Status, Actions)
  - [x] 5.8 Implement priority badges with color coding (URGENT: red, HIGH: orange, MEDIUM: yellow, LOW: gray)
  - [x] 5.9 Implement due date visual cues (overdue: red, due today: orange, upcoming: gray)
  - [ ] 5.10 Implement row click handler to open TaskDetailModal (TODO comment added)
  - [x] 5.11 Implement checkbox selection for bulk actions
  - [x] 5.12 Implement bulk action bar (appears when tasks selected) with Complete button
  - [x] 5.13 Implement sorting by clicking column headers (due date, priority)
  - [x] 5.14 Implement pagination controls (next, prev, page numbers)
  - [x] 5.15 Implement loading state (spinner) and error state (error message)
  - [x] 5.16 Implement empty state ("No tasks found" message)
  - [x] 5.17 Implement mobile responsive card layout for screens <768px
  - [x] 5.18 Add route to App.jsx: `<Route path="/tasks" element={<Tasks />} />`
  - [x] 5.19 Add "Tasks" navigation link to Layout.jsx sidebar
  - [ ] 5.20 Verify component tests pass

- [x] 6. Frontend - Task Creation Modal
  - [ ] 6.1 Write component tests for TaskModal.jsx (form rendering, validation, submission)
  - [x] 6.2 Create `/frontend/src/components/TaskModal.jsx` component
  - [x] 6.3 Implement form with React Hook Form
  - [x] 6.4 Add form fields: Task Type (dropdown), Title (text input), Description (textarea)
  - [x] 6.5 Add form fields: Patient (dropdown), Assigned To (dropdown), Priority (radio buttons)
  - [x] 6.6 Add form fields: Due Date (date picker), Due Time (time picker)
  - [x] 6.7 Implement field validation (title required, max 200 chars; dueDate required; assignedTo required; patient required)
  - [x] 6.8 Display validation errors inline
  - [x] 6.9 Implement useMutation hook for creating task
  - [x] 6.10 Handle form submission with loading state (disable submit button, loading spinner)
  - [x] 6.11 Show success toast on task creation
  - [x] 6.12 Show error toast on API error
  - [x] 6.13 Close modal on successful submission
  - [x] 6.14 Clear form on cancel
  - [x] 6.15 Support pre-filling patient and alert context from props (for alert resolution workflow)
  - [ ] 6.16 Verify component tests pass

- [x] 7. Frontend - Task Detail Modal
  - [ ] 7.1 Write component tests for TaskDetailModal.jsx (display, actions, state updates)
  - [x] 7.2 Create `/frontend/src/components/TaskDetailModal.jsx` component
  - [x] 7.3 Display full task details (patient info, task type, title, description, priority, due date, status)
  - [x] 7.4 Display "Assigned to" and "Assigned by" user names
  - [x] 7.5 Display linked alert info if alertId present
  - [x] 7.6 Display linked assessment info if assessmentId present
  - [x] 7.7 Display completion info (completedAt, completedBy, completionNotes) if status is COMPLETED
  - [x] 7.8 Render "Mark Complete" button for PENDING/IN_PROGRESS tasks
  - [x] 7.9 Implement "Mark Complete" action with completion notes textarea and useMutation hook
  - [x] 7.10 Render "Reassign" button (available for all users, no coordinator check)
  - [x] 7.11 Implement "Reassign" action with user selection dropdown
  - [x] 7.12 Render "Cancel Task" button (available for all users)
  - [x] 7.13 Implement "Cancel Task" action with confirmation dialog
  - [x] 7.14 Handle task completion successfully (update UI, show toast, invalidate queries)
  - [x] 7.15 Handle reassignment successfully (update UI, show toast, invalidate queries)
  - [x] 7.16 Handle cancellation successfully (update UI, show toast, invalidate queries)
  - [ ] 7.17 Verify component tests pass

- [x] 8. Integration - Alert Resolution Workflow
  - [x] 8.1 Update TriageQueue.jsx to add "Create Follow-Up Task" checkbox in alert acknowledgment/resolution flow
  - [x] 8.2 When checkbox checked, open TaskModal with pre-filled data (patientId, alertId, title, description, priority, dueDate)
  - [x] 8.3 Map alert severity to task priority (CRITICAL → URGENT, HIGH → HIGH, MEDIUM → MEDIUM, LOW → LOW)
  - [x] 8.4 Set suggested due date based on alert severity (CRITICAL: +1 day, HIGH: +3 days, MEDIUM: +7 days, LOW: +14 days)
  - [x] 8.5 Pre-fill task description with alert details and any clinician notes from resolution
  - [x] 8.6 Test alert-to-task workflow end-to-end

- [ ] 9. Integration - Patient Context Panel
  - [ ] 9.1 Update PatientContextPanel.jsx to add "Upcoming Tasks" section
  - [ ] 9.2 Fetch next 5 tasks for patient ordered by due date using useQuery hook
  - [ ] 9.3 Display task type icon, title, assigned to (if not current user), due date
  - [ ] 9.4 Implement click handler to open TaskDetailModal
  - [ ] 9.5 Add "View All Tasks" link that navigates to /tasks?patientId=xxx
  - [ ] 9.6 Show "No upcoming tasks" message if patient has no pending tasks
  - [ ] 9.7 Test patient context task view

- [ ] 10. Seed Data & Testing
  - [ ] 10.1 Create seed data script for tasks (5-10 sample tasks with various statuses, priorities, due dates)
  - [ ] 10.2 Add tasks to existing seed script (seed-rtm-standard.js or create new seed-tasks.js)
  - [ ] 10.3 Seed tasks: 2 overdue (PENDING, HIGH priority), 3 due today (PENDING/IN_PROGRESS), 2 upcoming, 3 completed
  - [ ] 10.4 Link 2-3 seed tasks to existing seed alerts via alertId
  - [ ] 10.5 Assign seed tasks to different seed users (clinician, nurse, coordinator)
  - [ ] 10.6 Run seed script: `npm run seed` or `node seed-tasks.js`
  - [ ] 10.7 Verify seed tasks appear in database with `npx prisma studio`
  - [ ] 10.8 Test frontend with seed data: navigate to /tasks, verify tasks display correctly

- [ ] 11. End-to-End Testing
  - [ ] 11.1 Write Playwright E2E test for task creation from alert resolution workflow
  - [ ] 11.2 Write Playwright E2E test for task completion workflow
  - [ ] 11.3 Write Playwright E2E test for bulk task assignment workflow (coordinator)
  - [ ] 11.4 Write Playwright E2E test for patient context task view
  - [ ] 11.5 Write Playwright E2E test for mobile responsive task management
  - [ ] 11.6 Run E2E tests: `npm run test:e2e`
  - [ ] 11.7 Verify all E2E tests pass

- [ ] 12. Documentation & Code Review
  - [ ] 12.1 Update API documentation in README or API docs with task endpoints
  - [ ] 12.2 Add JSDoc comments to taskController.js functions
  - [ ] 12.3 Add prop-types or TypeScript types to React components (TaskModal, TaskDetailModal, Tasks)
  - [ ] 12.4 Review code for HIPAA compliance (audit logging, organization isolation, RBAC)
  - [ ] 12.5 Review code for security (input validation, SQL injection prevention, XSS prevention)
  - [ ] 12.6 Run linter: `npm run lint` and fix any errors
  - [ ] 12.7 Run all tests: `npm test` (backend + frontend + E2E)
  - [ ] 12.8 Verify all tests pass and coverage meets goals (90% backend, 80% frontend)
