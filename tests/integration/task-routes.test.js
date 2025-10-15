const { describe, test, expect, beforeAll, afterAll, beforeEach } = require('@jest/globals');
const request = require('supertest');
const express = require('express');
const { PrismaClient } = require('../../generated/prisma');
const taskRoutes = require('../../src/routes/taskRoutes');
const { requireAuth } = require('../../src/middleware/auth');
const { injectOrganizationContext } = require('../../src/middleware/organizationContext');

const prisma = global.prisma || new PrismaClient();
const app = express();

app.use(express.json());

// Mock middleware to simulate authenticated user with organization context
const mockAuthMiddleware = (req, res, next) => {
  req.user = {
    userId: req.headers['x-user-id'] || 'test-user-id',
    permissions: (req.headers['x-permissions'] || 'TASK_READ,TASK_CREATE,TASK_UPDATE').split(',')
  };
  req.organizationId = req.headers['x-org-id'] || 'test-org-id';
  next();
};

app.use('/api/tasks', mockAuthMiddleware, taskRoutes);

describe('Task Routes Integration Tests', () => {
  let testOrg;
  let otherOrg;
  let testUser1;
  let testUser2;
  let testPatient;
  let testAlertRule;
  let testAlert;
  let testTask;

  beforeAll(async () => {
    // Clean up existing test data
    await prisma.task.deleteMany({ where: { organizationId: { in: ['test-org-id', 'other-org-id'] } } });
    await prisma.alert.deleteMany({ where: { organizationId: { in: ['test-org-id', 'other-org-id'] } } });
    await prisma.patient.deleteMany({ where: { organizationId: { in: ['test-org-id', 'other-org-id'] } } });
    await prisma.alertRule.deleteMany({ where: { organizationId: { in: ['test-org-id', 'other-org-id'] } } });
    await prisma.user.deleteMany({ where: { id: { in: ['test-user-1', 'test-user-2'] } } });
    await prisma.organization.deleteMany({ where: { id: { in: ['test-org-id', 'other-org-id'] } } });

    // Create test organizations
    testOrg = await prisma.organization.create({
      data: {
        id: 'test-org-id',
        name: 'Test Healthcare Org',
        type: 'CLINIC',
        isActive: true
      }
    });

    otherOrg = await prisma.organization.create({
      data: {
        id: 'other-org-id',
        name: 'Other Healthcare Org',
        type: 'CLINIC',
        isActive: true
      }
    });

    // Create test users
    testUser1 = await prisma.user.create({
      data: {
        id: 'test-user-1',
        email: 'test1@example.com',
        firstName: 'Test',
        lastName: 'User1'
      }
    });

    testUser2 = await prisma.user.create({
      data: {
        id: 'test-user-2',
        email: 'test2@example.com',
        firstName: 'Test',
        lastName: 'User2'
      }
    });

    // Create test patient
    testPatient = await prisma.patient.create({
      data: {
        organizationId: testOrg.id,
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1980-01-01'),
        medicalRecordNumber: 'MRN-TEST-001'
      }
    });

    // Create test alert rule
    testAlertRule = await prisma.alertRule.create({
      data: {
        organizationId: testOrg.id,
        name: 'Test Alert Rule',
        description: 'Test rule for integration tests',
        conditions: {},
        actions: {},
        isActive: true,
        severity: 'HIGH'
      }
    });

    // Create test alert
    testAlert = await prisma.alert.create({
      data: {
        organizationId: testOrg.id,
        patientId: testPatient.id,
        ruleId: testAlertRule.id,
        severity: 'HIGH',
        message: 'Test alert',
        triggeredAt: new Date()
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.task.deleteMany({ where: { organizationId: { in: ['test-org-id', 'other-org-id'] } } });
    await prisma.alert.deleteMany({ where: { organizationId: { in: ['test-org-id', 'other-org-id'] } } });
    await prisma.patient.deleteMany({ where: { organizationId: { in: ['test-org-id', 'other-org-id'] } } });
    await prisma.alertRule.deleteMany({ where: { organizationId: { in: ['test-org-id', 'other-org-id'] } } });
    await prisma.user.deleteMany({ where: { id: { in: ['test-user-1', 'test-user-2'] } } });
    await prisma.organization.deleteMany({ where: { id: { in: ['test-org-id', 'other-org-id'] } } });
  });

  beforeEach(async () => {
    // Clean up tasks before each test
    await prisma.task.deleteMany({ where: { organizationId: testOrg.id } });
  });

  describe('POST /api/tasks', () => {
    test('should create a new task', async () => {
      const taskData = {
        taskType: 'FOLLOW_UP_CALL',
        title: 'Call patient for follow-up',
        description: 'Check on medication adherence',
        priority: 'HIGH',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        assignedToId: testUser1.id,
        patientId: testPatient.id,
        alertId: testAlert.id
      };

      const response = await request(app)
        .post('/api/tasks')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .send(taskData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(taskData.title);
      expect(response.body.taskType).toBe(taskData.taskType);
      expect(response.body.assignedToId).toBe(testUser1.id);
      expect(response.body.assignedById).toBe(testUser1.id); // Auto-set to current user
      expect(response.body.patientId).toBe(testPatient.id);
      expect(response.body.organizationId).toBe(testOrg.id); // Auto-set from context
    });

    test('should return 400 if required fields missing', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .send({})
        .expect(400);

      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      // Create test tasks
      await prisma.task.createMany({
        data: [
          {
            organizationId: testOrg.id,
            taskType: 'FOLLOW_UP_CALL',
            title: 'Task 1 - Overdue',
            priority: 'HIGH',
            status: 'PENDING',
            dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday (overdue)
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id
          },
          {
            organizationId: testOrg.id,
            taskType: 'MED_REVIEW',
            title: 'Task 2 - Due Today',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            dueDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now (still today)
            assignedToId: testUser2.id,
            assignedById: testUser1.id,
            patientId: testPatient.id
          },
          {
            organizationId: testOrg.id,
            taskType: 'ADHERENCE_CHECK',
            title: 'Task 3 - Completed',
            priority: 'LOW',
            status: 'COMPLETED',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next week
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id,
            completedAt: new Date(),
            completedById: testUser1.id
          }
        ]
      });
    });

    test('should return all tasks for organization', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(response.body.tasks).toHaveLength(3);
      expect(response.body.pagination).toHaveProperty('total', 3);
    });

    test('should filter tasks by assignedTo', async () => {
      const response = await request(app)
        .get('/api/tasks?assignedTo=test-user-1')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(response.body.tasks).toHaveLength(2);
      response.body.tasks.forEach(task => {
        expect(task.assignedToId).toBe('test-user-1');
      });
    });

    test('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=COMPLETED')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].status).toBe('COMPLETED');
    });

    test('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=HIGH')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].priority).toBe('HIGH');
    });

    test('should filter overdue tasks', async () => {
      const response = await request(app)
        .get('/api/tasks?overdue=true')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].title).toContain('Overdue');
    });

    test('should paginate tasks', async () => {
      const response = await request(app)
        .get('/api/tasks?page=1&limit=2')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(response.body.tasks).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.pages).toBe(2); // 3 tasks total, 2 per page
    });
  });

  describe('GET /api/tasks/:id', () => {
    beforeEach(async () => {
      testTask = await prisma.task.create({
        data: {
          organizationId: testOrg.id,
          taskType: 'FOLLOW_UP_CALL',
          title: 'Test Task',
          priority: 'MEDIUM',
          status: 'PENDING',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          assignedToId: testUser1.id,
          assignedById: testUser1.id,
          patientId: testPatient.id
        }
      });
    });

    test('should return task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask.id}`)
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(response.body.id).toBe(testTask.id);
      expect(response.body.title).toBe('Test Task');
      expect(response.body.patient).toBeDefined();
      expect(response.body.assignedTo).toBeDefined();
    });

    test('should return 404 if task not found', async () => {
      await request(app)
        .get('/api/tasks/non-existent-id')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .expect(404);
    });

    test('should return 403 if task belongs to different organization', async () => {
      const response = await request(app)
        .get(`/api/tasks/${testTask.id}`)
        .set('x-user-id', testUser1.id)
        .set('x-org-id', 'other-org-id') // Different org
        .expect(403);

      expect(response.body.code).toBe('CROSS_ORG_ACCESS_DENIED');
    });
  });

  describe('PUT /api/tasks/:id', () => {
    beforeEach(async () => {
      testTask = await prisma.task.create({
        data: {
          organizationId: testOrg.id,
          taskType: 'FOLLOW_UP_CALL',
          title: 'Original Title',
          priority: 'MEDIUM',
          status: 'PENDING',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          assignedToId: testUser1.id,
          assignedById: testUser1.id,
          patientId: testPatient.id
        }
      });
    });

    test('should update task', async () => {
      const updateData = {
        title: 'Updated Title',
        priority: 'HIGH'
      };

      const response = await request(app)
        .put(`/api/tasks/${testTask.id}`)
        .set('x-user-id', testUser1.id) // Assignee
        .set('x-org-id', testOrg.id)
        .send(updateData)
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
      expect(response.body.priority).toBe('HIGH');
    });

    test('should return 403 if user not assignee and not coordinator', async () => {
      await request(app)
        .put(`/api/tasks/${testTask.id}`)
        .set('x-user-id', testUser2.id) // Not assignee
        .set('x-org-id', testOrg.id)
        .set('x-permissions', 'TASK_READ') // No coordinator permissions
        .send({ title: 'Hacked Title' })
        .expect(403);
    });
  });

  describe('PATCH /api/tasks/:id/complete', () => {
    beforeEach(async () => {
      testTask = await prisma.task.create({
        data: {
          organizationId: testOrg.id,
          taskType: 'FOLLOW_UP_CALL',
          title: 'Task to Complete',
          priority: 'MEDIUM',
          status: 'IN_PROGRESS',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          assignedToId: testUser1.id,
          assignedById: testUser1.id,
          patientId: testPatient.id
        }
      });
    });

    test('should complete task', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${testTask.id}/complete`)
        .set('x-user-id', testUser1.id) // Assignee
        .set('x-org-id', testOrg.id)
        .send({ completionNotes: 'Task completed successfully' })
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.completedAt).toBeDefined();
      expect(response.body.completedById).toBe(testUser1.id);
      expect(response.body.completionNotes).toBe('Task completed successfully');
    });

    test('should return 400 if task already completed', async () => {
      // Complete the task first
      await prisma.task.update({
        where: { id: testTask.id },
        data: { status: 'COMPLETED', completedAt: new Date(), completedById: testUser1.id }
      });

      await request(app)
        .patch(`/api/tasks/${testTask.id}/complete`)
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .send({}) // Send empty body
        .expect(400);
    });
  });

  describe('PATCH /api/tasks/:id/cancel', () => {
    beforeEach(async () => {
      testTask = await prisma.task.create({
        data: {
          organizationId: testOrg.id,
          taskType: 'FOLLOW_UP_CALL',
          title: 'Task to Cancel',
          priority: 'MEDIUM',
          status: 'PENDING',
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
          assignedToId: testUser1.id,
          assignedById: testUser1.id,
          patientId: testPatient.id
        }
      });
    });

    test('should cancel task if user is coordinator', async () => {
      const response = await request(app)
        .patch(`/api/tasks/${testTask.id}/cancel`)
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .set('x-permissions', 'TASK_DELETE') // Coordinator permission
        .send({ completionNotes: 'Task no longer needed' })
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
      expect(response.body.completionNotes).toBe('Task no longer needed');
    });

    test('should return 403 if user not coordinator', async () => {
      await request(app)
        .patch(`/api/tasks/${testTask.id}/cancel`)
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .set('x-permissions', 'TASK_READ') // Not coordinator
        .send({}) // Send empty body
        .expect(403);
    });
  });

  describe('POST /api/tasks/bulk-assign', () => {
    let task1, task2, task3;

    beforeEach(async () => {
      const tasks = await prisma.task.createMany({
        data: [
          {
            organizationId: testOrg.id,
            taskType: 'FOLLOW_UP_CALL',
            title: 'Task 1',
            priority: 'MEDIUM',
            status: 'PENDING',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id
          },
          {
            organizationId: testOrg.id,
            taskType: 'MED_REVIEW',
            title: 'Task 2',
            priority: 'MEDIUM',
            status: 'PENDING',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id
          },
          {
            organizationId: testOrg.id,
            taskType: 'ADHERENCE_CHECK',
            title: 'Task 3',
            priority: 'MEDIUM',
            status: 'PENDING',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id
          }
        ]
      });

      const allTasks = await prisma.task.findMany({
        where: { organizationId: testOrg.id },
        orderBy: { createdAt: 'asc' }
      });
      [task1, task2, task3] = allTasks;
    });

    test('should bulk assign tasks', async () => {
      const response = await request(app)
        .post('/api/tasks/bulk-assign')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .set('x-permissions', 'TASK_ASSIGN') // Coordinator permission
        .send({
          taskIds: [task1.id, task2.id],
          assignedToId: testUser2.id
        })
        .expect(200);

      expect(response.body.updated).toBe(2);

      // Verify tasks were reassigned
      const updatedTasks = await prisma.task.findMany({
        where: { id: { in: [task1.id, task2.id] } }
      });
      updatedTasks.forEach(task => {
        expect(task.assignedToId).toBe(testUser2.id);
      });
    });

    test('should return 403 if user lacks TASK_ASSIGN permission', async () => {
      await request(app)
        .post('/api/tasks/bulk-assign')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .set('x-permissions', 'TASK_READ') // No assign permission
        .send({
          taskIds: [task1.id, task2.id],
          assignedToId: testUser2.id
        })
        .expect(403);
    });

    test('should return 400 if taskIds array exceeds 50 items', async () => {
      const manyTaskIds = Array.from({ length: 51 }, (_, i) => `task-${i}`);

      await request(app)
        .post('/api/tasks/bulk-assign')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .set('x-permissions', 'TASK_ASSIGN')
        .send({
          taskIds: manyTaskIds,
          assignedToId: testUser2.id
        })
        .expect(400);
    });
  });

  describe('POST /api/tasks/bulk-complete', () => {
    let task1, task2, task3;

    beforeEach(async () => {
      await prisma.task.createMany({
        data: [
          {
            organizationId: testOrg.id,
            taskType: 'FOLLOW_UP_CALL',
            title: 'Task 1',
            priority: 'MEDIUM',
            status: 'PENDING',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id
          },
          {
            organizationId: testOrg.id,
            taskType: 'MED_REVIEW',
            title: 'Task 2',
            priority: 'MEDIUM',
            status: 'IN_PROGRESS',
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id
          },
          {
            organizationId: testOrg.id,
            taskType: 'ADHERENCE_CHECK',
            title: 'Task 3',
            priority: 'MEDIUM',
            status: 'COMPLETED', // Already completed
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id,
            completedAt: new Date(),
            completedById: testUser1.id
          }
        ]
      });

      const allTasks = await prisma.task.findMany({
        where: { organizationId: testOrg.id },
        orderBy: { createdAt: 'asc' }
      });
      [task1, task2, task3] = allTasks;
    });

    test('should bulk complete tasks', async () => {
      const response = await request(app)
        .post('/api/tasks/bulk-complete')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .set('x-permissions', 'TASK_UPDATE') // Coordinator permission
        .send({
          taskIds: [task1.id, task2.id, task3.id]
        })
        .expect(200);

      expect(response.body.updated).toBe(2); // Only 2 (task3 was already completed)
    });

    test('should return 403 if user not coordinator', async () => {
      await request(app)
        .post('/api/tasks/bulk-complete')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .set('x-permissions', 'TASK_READ') // Not coordinator
        .send({
          taskIds: [task1.id, task2.id]
        })
        .expect(403);
    });
  });

  describe('GET /api/tasks/stats', () => {
    beforeEach(async () => {
      await prisma.task.createMany({
        data: [
          {
            organizationId: testOrg.id,
            taskType: 'FOLLOW_UP_CALL',
            title: 'Task 1',
            priority: 'URGENT',
            status: 'PENDING',
            dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Overdue
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id
          },
          {
            organizationId: testOrg.id,
            taskType: 'MED_REVIEW',
            title: 'Task 2',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            dueDate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now (still today)
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id
          },
          {
            organizationId: testOrg.id,
            taskType: 'ADHERENCE_CHECK',
            title: 'Task 3',
            priority: 'MEDIUM',
            status: 'COMPLETED',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            assignedToId: testUser1.id,
            assignedById: testUser1.id,
            patientId: testPatient.id,
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Created 2 days ago
            completedAt: new Date(), // Completed today
            completedById: testUser1.id
          }
        ]
      });
    });

    test('should return task statistics', async () => {
      const response = await request(app)
        .get('/api/tasks/stats')
        .set('x-user-id', testUser1.id)
        .set('x-org-id', testOrg.id)
        .expect(200);

      expect(response.body.total).toBe(3);
      expect(response.body.byStatus).toEqual({
        PENDING: 1,
        IN_PROGRESS: 1,
        COMPLETED: 1,
        CANCELLED: 0
      });
      expect(response.body.byPriority).toHaveProperty('URGENT', 1);
      expect(response.body.byPriority).toHaveProperty('HIGH', 1);
      expect(response.body.byPriority).toHaveProperty('MEDIUM', 1);
      expect(response.body.overdue).toBe(1);
      expect(response.body.completionRate).toBe(33.33); // 1 out of 3
      expect(response.body.avgCompletionTimeHours).toBeGreaterThan(0);
    });
  });
});
