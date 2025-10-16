# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-10-15-task-management-system/spec.md

> Created: 2025-10-15
> Version: 1.0.0

## API Endpoints

### GET /api/tasks

**Purpose:** Retrieve tasks with filtering, sorting, and pagination

**Authentication:** Required (JWT)

**Permissions:** TASK_READ

**Query Parameters:**
- `assignedTo` (string, optional): Filter by assigned user ID (default: all tasks user can view)
- `patientId` (string, optional): Filter by patient ID
- `status` (string, optional): Filter by status (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
- `priority` (string, optional): Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `taskType` (string, optional): Filter by task type
- `dueStart` (ISO date, optional): Filter tasks due on or after this date
- `dueEnd` (ISO date, optional): Filter tasks due on or before this date
- `overdue` (boolean, optional): If true, filter to overdue tasks only
- `sortBy` (string, optional): Sort field (dueDate, priority, createdAt, status) - default: dueDate
- `sortOrder` (string, optional): Sort direction (asc, desc) - default: asc
- `page` (number, optional): Page number for pagination (default: 1)
- `limit` (number, optional): Items per page (default: 50, max: 100)
- `myTasks` (boolean, optional): If true, filter to tasks assigned to current user

**Response:** 200 OK
```json
{
  "tasks": [
    {
      "id": "clx1234567890",
      "taskType": "FOLLOW_UP_CALL",
      "title": "Follow-up call for elevated BP",
      "description": "Patient reported BP 165/95. Needs follow-up to assess symptoms and medication adherence.",
      "status": "PENDING",
      "priority": "HIGH",
      "dueDate": "2025-10-18T14:00:00.000Z",
      "completedAt": null,
      "completionNotes": null,
      "createdAt": "2025-10-15T10:30:00.000Z",
      "updatedAt": "2025-10-15T10:30:00.000Z",
      "assignedTo": {
        "id": "user123",
        "name": "Sarah Johnson",
        "email": "sarah.johnson@clinic.com"
      },
      "assignedBy": {
        "id": "user456",
        "name": "Dr. Michael Chen",
        "email": "mchen@clinic.com"
      },
      "completedBy": null,
      "patient": {
        "id": "patient789",
        "firstName": "John",
        "lastName": "Doe",
        "medicalRecordNumber": "MRN-001234"
      },
      "alert": {
        "id": "alert123",
        "alertType": "THRESHOLD_BREACH",
        "severity": "HIGH"
      },
      "organizationId": "org123"
    }
  ],
  "pagination": {
    "total": 87,
    "page": 1,
    "limit": 50,
    "totalPages": 2
  },
  "summary": {
    "overdueCount": 5,
    "dueTodayCount": 12,
    "upcomingCount": 70
  }
}
```

**Errors:**
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: User lacks TASK_READ permission

---

### GET /api/tasks/:id

**Purpose:** Retrieve a single task by ID with full details

**Authentication:** Required (JWT)

**Permissions:** TASK_READ

**Path Parameters:**
- `id` (string, required): Task ID

**Response:** 200 OK
```json
{
  "id": "clx1234567890",
  "taskType": "FOLLOW_UP_CALL",
  "title": "Follow-up call for elevated BP",
  "description": "Patient reported BP 165/95. Needs follow-up to assess symptoms and medication adherence.",
  "status": "PENDING",
  "priority": "HIGH",
  "dueDate": "2025-10-18T14:00:00.000Z",
  "completedAt": null,
  "completionNotes": null,
  "createdAt": "2025-10-15T10:30:00.000Z",
  "updatedAt": "2025-10-15T10:30:00.000Z",
  "assignedTo": {
    "id": "user123",
    "name": "Sarah Johnson",
    "email": "sarah.johnson@clinic.com",
    "role": "CLINICIAN"
  },
  "assignedBy": {
    "id": "user456",
    "name": "Dr. Michael Chen",
    "email": "mchen@clinic.com",
    "role": "CLINICIAN"
  },
  "completedBy": null,
  "patient": {
    "id": "patient789",
    "firstName": "John",
    "lastName": "Doe",
    "medicalRecordNumber": "MRN-001234",
    "dateOfBirth": "1965-03-15"
  },
  "alert": {
    "id": "alert123",
    "alertType": "THRESHOLD_BREACH",
    "severity": "HIGH",
    "triggeredAt": "2025-10-15T09:00:00.000Z"
  },
  "assessment": null,
  "organizationId": "org123"
}
```

**Errors:**
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: User lacks TASK_READ permission or task belongs to different organization
- 404 Not Found: Task ID does not exist

---

### POST /api/tasks

**Purpose:** Create a new task

**Authentication:** Required (JWT)

**Permissions:** TASK_CREATE

**Request Body:**
```json
{
  "taskType": "FOLLOW_UP_CALL",
  "title": "Follow-up call for elevated BP",
  "description": "Patient reported BP 165/95. Needs follow-up to assess symptoms and medication adherence.",
  "priority": "HIGH",
  "dueDate": "2025-10-18T14:00:00.000Z",
  "assignedToId": "user123",
  "patientId": "patient789",
  "alertId": "alert123",
  "assessmentId": null
}
```

**Validation:**
- `taskType`: Required, must be valid TaskType enum
- `title`: Required, max 200 characters
- `description`: Optional, max 10,000 characters
- `priority`: Required, must be valid TaskPriority enum
- `dueDate`: Required, must be valid ISO date in the future or present
- `assignedToId`: Required, must be valid user ID in same organization
- `patientId`: Required, must be valid patient ID in same organization
- `alertId`: Optional, must be valid alert ID if provided
- `assessmentId`: Optional, must be valid assessment ID if provided

**Response:** 201 Created
```json
{
  "id": "clx1234567890",
  "taskType": "FOLLOW_UP_CALL",
  "title": "Follow-up call for elevated BP",
  "description": "Patient reported BP 165/95. Needs follow-up to assess symptoms and medication adherence.",
  "status": "PENDING",
  "priority": "HIGH",
  "dueDate": "2025-10-18T14:00:00.000Z",
  "completedAt": null,
  "completionNotes": null,
  "createdAt": "2025-10-15T10:30:00.000Z",
  "updatedAt": "2025-10-15T10:30:00.000Z",
  "assignedToId": "user123",
  "assignedById": "user456",
  "completedById": null,
  "patientId": "patient789",
  "alertId": "alert123",
  "assessmentId": null,
  "organizationId": "org123"
}
```

**Errors:**
- 400 Bad Request: Validation errors (missing required fields, invalid enums, etc.)
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: User lacks TASK_CREATE permission
- 404 Not Found: Referenced patient, alert, or user not found in organization

---

### PUT /api/tasks/:id

**Purpose:** Update an existing task (reassign, change priority, change due date)

**Authentication:** Required (JWT)

**Permissions:** TASK_UPDATE (task assignee or coordinators)

**Path Parameters:**
- `id` (string, required): Task ID

**Request Body:**
```json
{
  "title": "Follow-up call for elevated BP - URGENT",
  "description": "Patient reported BP 165/95. Needs follow-up to assess symptoms and medication adherence. Patient has history of stroke.",
  "priority": "URGENT",
  "dueDate": "2025-10-16T14:00:00.000Z",
  "assignedToId": "user789",
  "status": "IN_PROGRESS"
}
```

**Validation:**
- All fields optional (only update provided fields)
- Same validation rules as POST /api/tasks
- `status` can be updated but COMPLETED status requires using PATCH /api/tasks/:id/complete endpoint

**Response:** 200 OK
```json
{
  "id": "clx1234567890",
  "taskType": "FOLLOW_UP_CALL",
  "title": "Follow-up call for elevated BP - URGENT",
  "description": "Patient reported BP 165/95. Needs follow-up to assess symptoms and medication adherence. Patient has history of stroke.",
  "status": "IN_PROGRESS",
  "priority": "URGENT",
  "dueDate": "2025-10-16T14:00:00.000Z",
  "completedAt": null,
  "completionNotes": null,
  "createdAt": "2025-10-15T10:30:00.000Z",
  "updatedAt": "2025-10-15T11:45:00.000Z",
  "assignedToId": "user789",
  "assignedById": "user456",
  "completedById": null,
  "patientId": "patient789",
  "alertId": "alert123",
  "assessmentId": null,
  "organizationId": "org123"
}
```

**Errors:**
- 400 Bad Request: Validation errors
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: User lacks TASK_UPDATE permission or not task assignee/coordinator
- 404 Not Found: Task ID does not exist

---

### PATCH /api/tasks/:id/complete

**Purpose:** Mark a task as completed with optional completion notes

**Authentication:** Required (JWT)

**Permissions:** TASK_UPDATE (task assignee only, unless coordinator)

**Path Parameters:**
- `id` (string, required): Task ID

**Request Body:**
```json
{
  "completionNotes": "Contacted patient. BP stable at 138/85. Patient reports good medication adherence. Continue monitoring."
}
```

**Validation:**
- `completionNotes`: Optional, max 10,000 characters
- Task must not already be COMPLETED or CANCELLED

**Response:** 200 OK
```json
{
  "id": "clx1234567890",
  "taskType": "FOLLOW_UP_CALL",
  "title": "Follow-up call for elevated BP",
  "description": "Patient reported BP 165/95. Needs follow-up to assess symptoms and medication adherence.",
  "status": "COMPLETED",
  "priority": "HIGH",
  "dueDate": "2025-10-18T14:00:00.000Z",
  "completedAt": "2025-10-17T10:15:00.000Z",
  "completionNotes": "Contacted patient. BP stable at 138/85. Patient reports good medication adherence. Continue monitoring.",
  "createdAt": "2025-10-15T10:30:00.000Z",
  "updatedAt": "2025-10-17T10:15:00.000Z",
  "assignedToId": "user123",
  "assignedById": "user456",
  "completedById": "user123",
  "patientId": "patient789",
  "alertId": "alert123",
  "assessmentId": null,
  "organizationId": "org123"
}
```

**Errors:**
- 400 Bad Request: Task already completed or cancelled
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: User is not task assignee and not coordinator
- 404 Not Found: Task ID does not exist

---

### PATCH /api/tasks/:id/cancel

**Purpose:** Cancel a task with optional reason

**Authentication:** Required (JWT)

**Permissions:** TASK_UPDATE (coordinators only)

**Path Parameters:**
- `id` (string, required): Task ID

**Request Body:**
```json
{
  "completionNotes": "Patient transferred to different clinic. Task no longer applicable."
}
```

**Response:** 200 OK
```json
{
  "id": "clx1234567890",
  "status": "CANCELLED",
  "completionNotes": "Patient transferred to different clinic. Task no longer applicable.",
  "updatedAt": "2025-10-17T10:15:00.000Z"
}
```

**Errors:**
- 400 Bad Request: Task already completed or cancelled
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: User lacks coordinator role
- 404 Not Found: Task ID does not exist

---

### POST /api/tasks/bulk-assign

**Purpose:** Bulk assign multiple tasks to a user

**Authentication:** Required (JWT)

**Permissions:** TASK_ASSIGN (coordinators only)

**Request Body:**
```json
{
  "taskIds": ["clx123", "clx456", "clx789"],
  "assignedToId": "user123"
}
```

**Validation:**
- `taskIds`: Required, array of task IDs (max 50 tasks per request)
- `assignedToId`: Required, valid user ID in organization

**Response:** 200 OK
```json
{
  "updated": 3,
  "tasks": [
    { "id": "clx123", "assignedToId": "user123", "updatedAt": "2025-10-15T12:00:00.000Z" },
    { "id": "clx456", "assignedToId": "user123", "updatedAt": "2025-10-15T12:00:00.000Z" },
    { "id": "clx789", "assignedToId": "user123", "updatedAt": "2025-10-15T12:00:00.000Z" }
  ]
}
```

**Errors:**
- 400 Bad Request: Invalid taskIds array, assignedToId not found, or too many tasks (>50)
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: User lacks TASK_ASSIGN permission

---

### POST /api/tasks/bulk-complete

**Purpose:** Bulk mark multiple tasks as completed

**Authentication:** Required (JWT)

**Permissions:** TASK_UPDATE (coordinators only)

**Request Body:**
```json
{
  "taskIds": ["clx123", "clx456"],
  "completionNotes": "Routine follow-ups completed. All patients stable."
}
```

**Validation:**
- `taskIds`: Required, array of task IDs (max 50 tasks per request)
- `completionNotes`: Optional, applies to all tasks

**Response:** 200 OK
```json
{
  "updated": 2,
  "tasks": [
    { "id": "clx123", "status": "COMPLETED", "completedAt": "2025-10-15T12:00:00.000Z" },
    { "id": "clx456", "status": "COMPLETED", "completedAt": "2025-10-15T12:00:00.000Z" }
  ]
}
```

**Errors:**
- 400 Bad Request: Invalid taskIds array or too many tasks (>50)
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: User lacks coordinator role

---

### GET /api/tasks/stats

**Purpose:** Get task statistics for dashboard and analytics

**Authentication:** Required (JWT)

**Permissions:** TASK_READ

**Query Parameters:**
- `assignedTo` (string, optional): Filter stats by assigned user (default: current user)

**Response:** 200 OK
```json
{
  "total": 87,
  "byStatus": {
    "PENDING": 45,
    "IN_PROGRESS": 12,
    "COMPLETED": 25,
    "CANCELLED": 5
  },
  "byPriority": {
    "URGENT": 8,
    "HIGH": 22,
    "MEDIUM": 35,
    "LOW": 22
  },
  "overdue": 5,
  "dueToday": 12,
  "dueThisWeek": 28,
  "completionRate": 0.71,
  "avgCompletionTimeHours": 36.5
}
```

**Errors:**
- 401 Unauthorized: Missing or invalid token
- 403 Forbidden: User lacks TASK_READ permission

---

## Controller Structure

**File:** `/src/controllers/taskController.js`

**Functions:**
```javascript
// Task CRUD
const getTasks = async (req, res) => { /* ... */ }
const getTask = async (req, res) => { /* ... */ }
const createTask = async (req, res) => { /* ... */ }
const updateTask = async (req, res) => { /* ... */ }
const deleteTask = async (req, res) => { /* ... */ }

// Task Actions
const completeTask = async (req, res) => { /* ... */ }
const cancelTask = async (req, res) => { /* ... */ }

// Bulk Operations
const bulkAssignTasks = async (req, res) => { /* ... */ }
const bulkCompleteTasks = async (req, res) => { /* ... */ }

// Analytics
const getTaskStats = async (req, res) => { /* ... */ }

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  completeTask,
  cancelTask,
  bulkAssignTasks,
  bulkCompleteTasks,
  getTaskStats
}
```

## Routes File

**File:** `/src/routes/taskRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');
const { requireOrganizationContext } = require('../middleware/organizationContext');
const { requirePermissions } = require('../middleware/permissions');

// Middleware chain: auth → org context → permissions
router.use(requireAuth);
router.use(requireOrganizationContext);

// Task CRUD
router.get('/', requirePermissions(['TASK_READ']), taskController.getTasks);
router.get('/stats', requirePermissions(['TASK_READ']), taskController.getTaskStats);
router.get('/:id', requirePermissions(['TASK_READ']), taskController.getTask);
router.post('/', requirePermissions(['TASK_CREATE']), taskController.createTask);
router.put('/:id', requirePermissions(['TASK_UPDATE']), taskController.updateTask);
router.delete('/:id', requirePermissions(['TASK_DELETE']), taskController.deleteTask);

// Task Actions
router.patch('/:id/complete', requirePermissions(['TASK_UPDATE']), taskController.completeTask);
router.patch('/:id/cancel', requirePermissions(['TASK_UPDATE']), taskController.cancelTask);

// Bulk Operations
router.post('/bulk-assign', requirePermissions(['TASK_ASSIGN']), taskController.bulkAssignTasks);
router.post('/bulk-complete', requirePermissions(['TASK_UPDATE']), taskController.bulkCompleteTasks);

module.exports = router;
```

## Permission Definitions

Add to `/prisma/schema.prisma` Permission enum:

```prisma
enum Permission {
  // ... existing permissions ...

  // Task Management
  TASK_READ
  TASK_CREATE
  TASK_UPDATE
  TASK_DELETE
  TASK_ASSIGN

  // ... rest of permissions ...
}
```

**Role Mappings:**
- **CLINICIAN**: TASK_READ, TASK_CREATE, TASK_UPDATE (own tasks only)
- **NURSE**: TASK_READ, TASK_CREATE, TASK_UPDATE (own tasks only)
- **CARE_COORDINATOR**: TASK_READ, TASK_CREATE, TASK_UPDATE, TASK_ASSIGN (all tasks)
- **ORG_ADMIN**: TASK_READ, TASK_CREATE, TASK_UPDATE, TASK_DELETE, TASK_ASSIGN
- **SUPER_ADMIN**: All task permissions
