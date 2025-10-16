# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-10-14-task-management-system/spec.md

> Created: 2025-10-14
> Version: 1.0.0

---

## API Endpoints

### Task CRUD Operations

#### GET /api/tasks
Get all tasks for current user or organization (filtered by role)

**Query Parameters**:
- `view` (string): Filter preset - `my-tasks`, `due-today`, `overdue`, `team-tasks`
- `status` (string[]): Filter by status - `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
- `priority` (string[]): Filter by priority - `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- `taskType` (string[]): Filter by type - `FOLLOW_UP_CALL`, `MED_REVIEW`, etc.
- `assignedToId` (string): Filter by assigned user
- `patientId` (string): Filter by patient
- `dueDateFrom` (date): Tasks due after this date
- `dueDateTo` (date): Tasks due before this date
- `page` (number): Page number (default: 1)
- `limit` (number): Results per page (default: 20, max: 100)
- `sortBy` (string): Sort field - `dueDate`, `priority`, `createdAt`
- `sortOrder` (string): `asc` or `desc`

**Response**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "cltx...",
        "organizationId": "clto...",
        "patientId": "cltp...",
        "assignedToId": "cltu...",
        "createdById": "cltu...",
        "taskType": "FOLLOW_UP_CALL",
        "title": "Follow-up on medication adherence",
        "description": "Patient reported missing doses last week. Call to discuss.",
        "dueDate": "2025-10-15T10:00:00Z",
        "priority": "HIGH",
        "status": "PENDING",
        "completedAt": null,
        "completedById": null,
        "completionNotes": null,
        "linkedAlertId": "clta...",
        "linkedAssessmentId": null,
        "linkedEnrollmentId": null,
        "createdAt": "2025-10-14T14:30:00Z",
        "updatedAt": "2025-10-14T14:30:00Z",
        "patient": {
          "id": "cltp...",
          "firstName": "John",
          "lastName": "Doe",
          "dateOfBirth": "1965-03-15"
        },
        "assignedTo": {
          "id": "cltu...",
          "firstName": "Sarah",
          "lastName": "Johnson",
          "role": "CLINICIAN"
        },
        "createdBy": {
          "id": "cltu...",
          "firstName": "Sarah",
          "lastName": "Johnson"
        },
        "linkedAlert": {
          "id": "clta...",
          "description": "High blood pressure reading: 180/110",
          "severity": "HIGH"
        },
        "isOverdue": false,
        "daysUntilDue": 1
      }
    ],
    "pagination": {
      "total": 45,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    },
    "summary": {
      "dueToday": 5,
      "overdue": 3,
      "pending": 28,
      "inProgress": 7,
      "completed": 10
    }
  }
}
```

---

#### GET /api/tasks/:id
Get single task by ID with full details

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "cltx...",
    "organizationId": "clto...",
    "patientId": "cltp...",
    "assignedToId": "cltu...",
    "createdById": "cltu...",
    "taskType": "FOLLOW_UP_CALL",
    "title": "Follow-up on medication adherence",
    "description": "Patient reported missing doses last week. Call to discuss.",
    "dueDate": "2025-10-15T10:00:00Z",
    "priority": "HIGH",
    "status": "PENDING",
    "completedAt": null,
    "completedById": null,
    "completionNotes": null,
    "linkedAlertId": "clta...",
    "linkedAssessmentId": null,
    "linkedEnrollmentId": null,
    "createdAt": "2025-10-14T14:30:00Z",
    "updatedAt": "2025-10-14T14:30:00Z",
    "patient": {
      "id": "cltp...",
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1965-03-15",
      "phone": "(555) 123-4567",
      "email": "john.doe@example.com"
    },
    "assignedTo": {
      "id": "cltu...",
      "firstName": "Sarah",
      "lastName": "Johnson",
      "role": "CLINICIAN"
    },
    "createdBy": {
      "id": "cltu...",
      "firstName": "Sarah",
      "lastName": "Johnson"
    },
    "linkedAlert": {
      "id": "clta...",
      "description": "High blood pressure reading: 180/110",
      "severity": "HIGH",
      "triggeredAt": "2025-10-14T08:15:00Z"
    }
  }
}
```

**Error Responses**:
- `404`: Task not found or belongs to different organization

---

#### POST /api/tasks
Create new task

**Request Body**:
```json
{
  "patientId": "cltp...",
  "assignedToId": "cltu...",  // Optional
  "taskType": "FOLLOW_UP_CALL",
  "title": "Follow-up on medication adherence",
  "description": "Patient reported missing doses last week. Call to discuss.",
  "dueDate": "2025-10-15T10:00:00Z",  // Optional
  "priority": "HIGH",  // Default: MEDIUM
  "linkedAlertId": "clta...",  // Optional
  "linkedAssessmentId": null,  // Optional
  "linkedEnrollmentId": null   // Optional
}
```

**Validation**:
- `patientId`: Required, must exist in same organization
- `taskType`: Required, must be valid TaskType enum
- `title`: Required, max 255 characters
- `description`: Optional, max 5000 characters
- `dueDate`: Optional, must be in future
- `priority`: Optional, defaults to MEDIUM
- `assignedToId`: Optional, must be user in same organization with CLINICIAN role

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "cltx...",
    "organizationId": "clto...",
    "patientId": "cltp...",
    "assignedToId": "cltu...",
    "createdById": "cltu...",
    "taskType": "FOLLOW_UP_CALL",
    "title": "Follow-up on medication adherence",
    "description": "Patient reported missing doses last week. Call to discuss.",
    "dueDate": "2025-10-15T10:00:00Z",
    "priority": "HIGH",
    "status": "PENDING",
    "createdAt": "2025-10-14T14:30:00Z",
    "updatedAt": "2025-10-14T14:30:00Z"
  },
  "message": "Task created successfully"
}
```

**Error Responses**:
- `400`: Validation error (missing required fields, invalid enum values)
- `404`: Patient or assigned user not found

---

#### PUT /api/tasks/:id
Update existing task

**Request Body** (all fields optional):
```json
{
  "assignedToId": "cltu...",
  "title": "Updated title",
  "description": "Updated description",
  "dueDate": "2025-10-16T10:00:00Z",
  "priority": "URGENT",
  "status": "IN_PROGRESS"
}
```

**Validation**:
- Cannot update completed tasks (status = COMPLETED) except to add completion notes
- `dueDate` must be in future if provided
- `assignedToId` must be valid user in same organization

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "cltx...",
    "organizationId": "clto...",
    "patientId": "cltp...",
    "assignedToId": "cltu...",
    "createdById": "cltu...",
    "taskType": "FOLLOW_UP_CALL",
    "title": "Updated title",
    "description": "Updated description",
    "dueDate": "2025-10-16T10:00:00Z",
    "priority": "URGENT",
    "status": "IN_PROGRESS",
    "updatedAt": "2025-10-14T15:45:00Z"
  },
  "message": "Task updated successfully"
}
```

**Error Responses**:
- `400`: Validation error or attempting to update completed task
- `404`: Task not found
- `403`: User not authorized (can only update tasks in own organization)

---

#### POST /api/tasks/:id/complete
Mark task as completed with completion notes

**Request Body**:
```json
{
  "completionNotes": "Called patient. Confirmed they are taking medication as prescribed. No further follow-up needed."
}
```

**Validation**:
- `completionNotes`: Optional, max 2000 characters
- Task status must be PENDING or IN_PROGRESS
- Cannot complete task twice

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "cltx...",
    "status": "COMPLETED",
    "completedAt": "2025-10-14T16:00:00Z",
    "completedById": "cltu...",
    "completionNotes": "Called patient. Confirmed they are taking medication as prescribed. No further follow-up needed.",
    "completedBy": {
      "id": "cltu...",
      "firstName": "Sarah",
      "lastName": "Johnson"
    }
  },
  "message": "Task completed successfully"
}
```

**Side Effects**:
- Creates AuditLog entry
- Sends notification to task creator (if different from completer)
- Updates task completion metrics for analytics

---

#### DELETE /api/tasks/:id
Cancel/delete task

**Query Parameters**:
- `reason` (string): Optional reason for cancellation

**Response**:
```json
{
  "success": true,
  "message": "Task cancelled successfully"
}
```

**Side Effects**:
- Task status set to CANCELLED (soft delete)
- AuditLog entry created
- Task creator notified

**Error Responses**:
- `404`: Task not found
- `403`: User not authorized (only creator or assigned user can cancel)

---

### Bulk Operations

#### POST /api/tasks/bulk-assign
Assign multiple tasks to a user

**Request Body**:
```json
{
  "taskIds": ["cltx1...", "cltx2...", "cltx3..."],
  "assignedToId": "cltu..."
}
```

**Validation**:
- `taskIds`: Required, max 50 tasks per request
- `assignedToId`: Required, must be valid user in same organization
- All tasks must belong to same organization as current user

**Response**:
```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": 0
  },
  "message": "3 tasks assigned successfully"
}
```

---

#### POST /api/tasks/bulk-complete
Mark multiple tasks as completed

**Request Body**:
```json
{
  "taskIds": ["cltx1...", "cltx2...", "cltx3..."],
  "completionNotes": "Bulk completion notes (optional)"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": 0
  },
  "message": "3 tasks marked as completed"
}
```

---

#### POST /api/tasks/bulk-reschedule
Reschedule multiple tasks

**Request Body**:
```json
{
  "taskIds": ["cltx1...", "cltx2...", "cltx3..."],
  "dueDate": "2025-10-20T10:00:00Z"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "updated": 3,
    "failed": 0
  },
  "message": "3 tasks rescheduled successfully"
}
```

---

### Task Statistics

#### GET /api/tasks/stats
Get task statistics for current user or organization

**Query Parameters**:
- `scope` (string): `user` (my tasks only) or `organization` (all tasks) - default: `user`
- `dateRange` (string): `today`, `week`, `month`, `all` - default: `all`

**Response**:
```json
{
  "success": true,
  "data": {
    "totalTasks": 45,
    "byStatus": {
      "pending": 28,
      "inProgress": 7,
      "completed": 10,
      "cancelled": 0
    },
    "byPriority": {
      "low": 8,
      "medium": 22,
      "high": 12,
      "urgent": 3
    },
    "byType": {
      "FOLLOW_UP_CALL": 15,
      "MED_REVIEW": 8,
      "ADHERENCE_CHECK": 10,
      "LAB_ORDER": 5,
      "REFERRAL": 3,
      "CUSTOM": 4
    },
    "dueToday": 5,
    "overdue": 3,
    "completionRate": 0.22,  // 10/45 = 22%
    "avgCompletionTimeHours": 18.5
  }
}
```

---

## Controller Implementation

### `/src/controllers/taskController.js`

```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /api/tasks
const getAllTasks = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentOrgId = req.user.currentOrganization;
    const userRole = req.user.role;

    const {
      view = 'my-tasks',
      status,
      priority,
      taskType,
      assignedToId,
      patientId,
      dueDateFrom,
      dueDateTo,
      page = 1,
      limit = 20,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    // Build where clause based on view and filters
    let where = {
      organizationId: currentOrgId
    };

    // View-based filtering
    if (view === 'my-tasks') {
      where.assignedToId = currentUserId;
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    } else if (view === 'due-today') {
      where.assignedToId = currentUserId;
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
      where.dueDate = {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
        lt: new Date(new Date().setHours(23, 59, 59, 999))
      };
    } else if (view === 'overdue') {
      where.assignedToId = currentUserId;
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
      where.dueDate = { lt: new Date() };
    } else if (view === 'team-tasks') {
      // Only coordinators can view team tasks
      if (userRole !== 'ORG_ADMIN' && userRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized: Only coordinators can view team tasks'
        });
      }
      // Show all tasks in organization
    }

    // Additional filters
    if (status) where.status = { in: Array.isArray(status) ? status : [status] };
    if (priority) where.priority = { in: Array.isArray(priority) ? priority : [priority] };
    if (taskType) where.taskType = { in: Array.isArray(taskType) ? taskType : [taskType] };
    if (assignedToId) where.assignedToId = assignedToId;
    if (patientId) where.patientId = patientId;
    if (dueDateFrom || dueDateTo) {
      where.dueDate = {};
      if (dueDateFrom) where.dueDate.gte = new Date(dueDateFrom);
      if (dueDateTo) where.dueDate.lte = new Date(dueDateTo);
    }

    // Get total count
    const total = await prisma.task.count({ where });

    // Get paginated tasks
    const tasks = await prisma.task.findMany({
      where,
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, dateOfBirth: true }
        },
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        },
        linkedAlert: {
          select: { id: true, description: true, severity: true }
        }
      },
      orderBy: sortBy === 'dueDate' ? { dueDate: sortOrder } : { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    });

    // Enrich with computed fields
    const enrichedTasks = tasks.map(task => ({
      ...task,
      isOverdue: task.dueDate && task.dueDate < new Date() && task.status !== 'COMPLETED',
      daysUntilDue: task.dueDate ? Math.ceil((task.dueDate - new Date()) / (1000 * 60 * 60 * 24)) : null
    }));

    // Get summary stats
    const summary = {
      dueToday: await prisma.task.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999))
          }
        }
      }),
      overdue: await prisma.task.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() }
        }
      }),
      pending: await prisma.task.count({ where: { ...where, status: 'PENDING' } }),
      inProgress: await prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      completed: await prisma.task.count({ where: { ...where, status: 'COMPLETED' } })
    };

    res.json({
      success: true,
      data: {
        tasks: enrichedTasks,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / limit)
        },
        summary
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

// POST /api/tasks
const createTask = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentOrgId = req.user.currentOrganization;

    const {
      patientId,
      assignedToId,
      taskType,
      title,
      description,
      dueDate,
      priority = 'MEDIUM',
      linkedAlertId,
      linkedAssessmentId,
      linkedEnrollmentId
    } = req.body;

    // Validation
    if (!patientId || !taskType || !title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: patientId, taskType, title'
      });
    }

    // Verify patient exists in same organization
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, organizationId: currentOrgId }
    });

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found in your organization'
      });
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        organizationId: currentOrgId,
        patientId,
        assignedToId: assignedToId || null,
        createdById: currentUserId,
        taskType,
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status: 'PENDING',
        linkedAlertId: linkedAlertId || null,
        linkedAssessmentId: linkedAssessmentId || null,
        linkedEnrollmentId: linkedEnrollmentId || null
      },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUserId,
        organizationId: currentOrgId,
        action: 'CREATE',
        resource: 'TASK',
        resourceId: task.id,
        newValues: JSON.stringify(task),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        hipaaRelevant: false
      }
    });

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message
    });
  }
};

// POST /api/tasks/:id/complete
const completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const currentOrgId = req.user.currentOrganization;
    const { completionNotes } = req.body;

    // Get existing task
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    if (!task || task.organizationId !== currentOrgId) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    if (task.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Task is already completed'
      });
    }

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: currentUserId,
        completionNotes
      },
      include: {
        completedBy: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: currentUserId,
        organizationId: currentOrgId,
        action: 'UPDATE',
        resource: 'TASK',
        resourceId: task.id,
        oldValues: JSON.stringify({ status: task.status }),
        newValues: JSON.stringify({
          status: 'COMPLETED',
          completedAt: updatedTask.completedAt,
          completionNotes
        }),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        hipaaRelevant: false
      }
    });

    // TODO: Send notification to task creator if different from completer

    res.json({
      success: true,
      data: {
        id: updatedTask.id,
        status: updatedTask.status,
        completedAt: updatedTask.completedAt,
        completedById: updatedTask.completedById,
        completionNotes: updatedTask.completionNotes,
        completedBy: updatedTask.completedBy
      },
      message: 'Task completed successfully'
    });
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete task',
      error: error.message
    });
  }
};

module.exports = {
  getAllTasks,
  createTask,
  completeTask,
  // ... other exports (getTaskById, updateTask, deleteTask, bulkAssign, etc.)
};
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-14
