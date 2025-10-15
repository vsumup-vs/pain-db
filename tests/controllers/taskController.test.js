const { PrismaClient } = require('@prisma/client');
const taskController = require('../../src/controllers/taskController');

// Mock Prisma Client
const prisma = global.prisma || new PrismaClient();

// Mock request and response objects
const mockReq = (data = {}) => ({
  body: data.body || {},
  params: data.params || {},
  query: data.query || {},
  user: data.user || { userId: 'test-user-id' },
  organizationId: data.organizationId || 'test-org-id',
  ...data
});

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('Task Controller', () => {
  let testUser, testPatient, testOrganization, testTask;

  beforeEach(async () => {
    // Clean up before each test
    await prisma.task.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});

    const timestamp = Date.now();

    // Create test organization
    testOrganization = await prisma.organization.create({
      data: {
        name: `Test Org ${timestamp}`,
        type: 'CLINIC'
      }
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `test.user.${timestamp}@example.com`,
        passwordHash: 'test-hash',
        firstName: 'Test',
        lastName: 'User'
      }
    });

    // Create test patient
    testPatient = await prisma.patient.create({
      data: {
        firstName: 'Test',
        lastName: 'Patient',
        dateOfBirth: new Date('1990-01-01'),
        organizationId: testOrganization.id
      }
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.task.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.organization.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('getTasks()', () => {
    beforeEach(async () => {
      // Create test tasks
      await prisma.task.createMany({
        data: [
          {
            taskType: 'FOLLOW_UP_CALL',
            title: 'Follow-up call for elevated BP',
            status: 'PENDING',
            priority: 'HIGH',
            dueDate: new Date('2025-10-20T14:00:00Z'),
            assignedToId: testUser.id,
            assignedById: testUser.id,
            patientId: testPatient.id,
            organizationId: testOrganization.id
          },
          {
            taskType: 'MED_REVIEW',
            title: 'Review diabetes medications',
            status: 'COMPLETED',
            priority: 'MEDIUM',
            dueDate: new Date('2025-10-15T10:00:00Z'),
            completedAt: new Date('2025-10-15T12:00:00Z'),
            assignedToId: testUser.id,
            assignedById: testUser.id,
            completedById: testUser.id,
            patientId: testPatient.id,
            organizationId: testOrganization.id
          }
        ]
      });
    });

    it('should return filtered tasks with pagination', async () => {
      const req = mockReq({
        query: {},
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTasks(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.tasks).toHaveLength(2);
      expect(response.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 2
      });
    });

    it('should filter by assignedTo (my tasks view)', async () => {
      const req = mockReq({
        query: { assignedTo: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTasks(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.tasks).toHaveLength(2);
      response.tasks.forEach(task => {
        expect(task.assignedToId).toBe(testUser.id);
      });
    });

    it('should filter by patientId', async () => {
      const req = mockReq({
        query: { patientId: testPatient.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTasks(req, res);

      const response = res.json.mock.calls[0][0];
      response.tasks.forEach(task => {
        expect(task.patientId).toBe(testPatient.id);
      });
    });

    it('should filter by status', async () => {
      const req = mockReq({
        query: { status: 'PENDING' },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTasks(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.tasks).toHaveLength(1);
      expect(response.tasks[0].status).toBe('PENDING');
    });

    it('should filter by priority', async () => {
      const req = mockReq({
        query: { priority: 'HIGH' },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTasks(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.tasks).toHaveLength(1);
      expect(response.tasks[0].priority).toBe('HIGH');
    });

    it('should filter overdue tasks', async () => {
      // Create an overdue task
      await prisma.task.create({
        data: {
          taskType: 'FOLLOW_UP_CALL',
          title: 'Overdue task',
          status: 'PENDING',
          priority: 'HIGH',
          dueDate: new Date('2025-10-01T14:00:00Z'), // Past date
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: testOrganization.id
        }
      });

      const req = mockReq({
        query: { overdue: 'true' },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTasks(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.tasks.length).toBeGreaterThan(0);
      response.tasks.forEach(task => {
        expect(new Date(task.dueDate) < new Date()).toBe(true);
        expect(task.status).not.toBe('COMPLETED');
      });
    });

    it('should sort by dueDate', async () => {
      const req = mockReq({
        query: { sortBy: 'dueDate', sortOrder: 'asc' },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTasks(req, res);

      const response = res.json.mock.calls[0][0];
      const dueDates = response.tasks.map(t => new Date(t.dueDate).getTime());
      expect(dueDates).toEqual([...dueDates].sort((a, b) => a - b));
    });

    it('should respect organization isolation', async () => {
      // Create task in different organization
      const otherOrg = await prisma.organization.create({
        data: { name: 'Other Org', type: 'CLINIC' }
      });

      await prisma.task.create({
        data: {
          taskType: 'FOLLOW_UP_CALL',
          title: 'Task in other org',
          status: 'PENDING',
          priority: 'LOW',
          dueDate: new Date('2025-10-25T14:00:00Z'),
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: otherOrg.id
        }
      });

      const req = mockReq({
        query: {},
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTasks(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.tasks).toHaveLength(2); // Only tasks from test org
      response.tasks.forEach(task => {
        expect(task.organizationId).toBe(testOrganization.id);
      });

      // Clean up
      await prisma.task.deleteMany({ where: { organizationId: otherOrg.id } });
      await prisma.organization.delete({ where: { id: otherOrg.id } });
    });

    it('should paginate correctly', async () => {
      // Create more tasks for pagination
      const additionalTasks = Array.from({ length: 8 }, (_, i) => ({
        taskType: 'ADHERENCE_CHECK',
        title: `Task ${i + 3}`,
        status: 'PENDING',
        priority: 'LOW',
        dueDate: new Date(`2025-10-${20 + i}T14:00:00Z`),
        assignedToId: testUser.id,
        assignedById: testUser.id,
        patientId: testPatient.id,
        organizationId: testOrganization.id
      }));

      await prisma.task.createMany({ data: additionalTasks });

      const req = mockReq({
        query: { page: '2', limit: '5' },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTasks(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.tasks).toHaveLength(5);
      expect(response.pagination).toMatchObject({
        page: 2,
        limit: 5,
        total: 10
      });
    });
  });

  describe('getTask()', () => {
    beforeEach(async () => {
      testTask = await prisma.task.create({
        data: {
          taskType: 'FOLLOW_UP_CALL',
          title: 'Test task',
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: new Date('2025-10-20T14:00:00Z'),
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: testOrganization.id
        }
      });
    });

    it('should return single task with full relations', async () => {
      const req = mockReq({
        params: { id: testTask.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTask(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.id).toBe(testTask.id);
      expect(response).toHaveProperty('patient');
      expect(response).toHaveProperty('assignedTo');
      expect(response).toHaveProperty('assignedBy');
    });

    it('should return 404 if task not found', async () => {
      const req = mockReq({
        params: { id: 'non-existent-id' },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 403 if task belongs to different organization', async () => {
      const req = mockReq({
        params: { id: testTask.id },
        organizationId: 'different-org-id'
      });
      const res = mockRes();

      await taskController.getTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('createTask()', () => {
    it('should create task with all required fields', async () => {
      const taskData = {
        taskType: 'FOLLOW_UP_CALL',
        title: 'New follow-up call',
        description: 'Call patient about BP readings',
        priority: 'HIGH',
        dueDate: new Date('2025-10-25T14:00:00Z').toISOString(),
        assignedToId: testUser.id,
        patientId: testPatient.id
      };

      const req = mockReq({
        body: taskData,
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe(taskData.title);
      expect(response.assignedById).toBe(testUser.id); // Auto-set
      expect(response.organizationId).toBe(testOrganization.id);
    });

    it('should set assignedById to current user', async () => {
      const taskData = {
        taskType: 'MED_REVIEW',
        title: 'Medication review',
        dueDate: new Date('2025-10-25T14:00:00Z').toISOString(),
        assignedToId: testUser.id,
        patientId: testPatient.id
      };

      const req = mockReq({
        body: taskData,
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.createTask(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.assignedById).toBe(testUser.id);
    });

    it('should set organizationId from user context', async () => {
      const taskData = {
        taskType: 'ADHERENCE_CHECK',
        title: 'Check adherence',
        dueDate: new Date('2025-10-25T14:00:00Z').toISOString(),
        assignedToId: testUser.id,
        patientId: testPatient.id
      };

      const req = mockReq({
        body: taskData,
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.createTask(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.organizationId).toBe(testOrganization.id);
    });

    it('should return 400 if required fields missing', async () => {
      const req = mockReq({
        body: {},
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if invalid enum values', async () => {
      const taskData = {
        taskType: 'INVALID_TYPE',
        title: 'Test task',
        dueDate: new Date('2025-10-25T14:00:00Z').toISOString(),
        assignedToId: testUser.id,
        patientId: testPatient.id
      };

      const req = mockReq({
        body: taskData,
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 404 if assignedToId not found in organization', async () => {
      const taskData = {
        taskType: 'FOLLOW_UP_CALL',
        title: 'Test task',
        dueDate: new Date('2025-10-25T14:00:00Z').toISOString(),
        assignedToId: 'non-existent-user-id',
        patientId: testPatient.id
      };

      const req = mockReq({
        body: taskData,
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should return 404 if patientId not found in organization', async () => {
      const taskData = {
        taskType: 'FOLLOW_UP_CALL',
        title: 'Test task',
        dueDate: new Date('2025-10-25T14:00:00Z').toISOString(),
        assignedToId: testUser.id,
        patientId: 'non-existent-patient-id'
      };

      const req = mockReq({
        body: taskData,
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.createTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateTask()', () => {
    beforeEach(async () => {
      testTask = await prisma.task.create({
        data: {
          taskType: 'FOLLOW_UP_CALL',
          title: 'Test task',
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: new Date('2025-10-20T14:00:00Z'),
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: testOrganization.id
        }
      });
    });

    it('should update task fields', async () => {
      const updateData = {
        title: 'Updated title',
        priority: 'HIGH',
        status: 'IN_PROGRESS'
      };

      const req = mockReq({
        params: { id: testTask.id },
        body: updateData,
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.updateTask(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.title).toBe(updateData.title);
      expect(response.priority).toBe(updateData.priority);
      expect(response.status).toBe(updateData.status);
    });

    it('should return 403 if user not assignee and not coordinator', async () => {
      // Create different user
      const otherUser = await prisma.user.create({
        data: {
          email: `other.user.${Date.now()}@example.com`,
          passwordHash: 'test-hash',
          firstName: 'Other',
          lastName: 'User'
        }
      });

      const req = mockReq({
        params: { id: testTask.id },
        body: { title: 'Updated by unauthorized user' },
        user: { userId: otherUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);

      // Clean up
      await prisma.user.delete({ where: { id: otherUser.id } });
    });

    it('should return 404 if task not found', async () => {
      const req = mockReq({
        params: { id: 'non-existent-id' },
        body: { title: 'Updated title' },
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.updateTask(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('completeTask()', () => {
    beforeEach(async () => {
      testTask = await prisma.task.create({
        data: {
          taskType: 'FOLLOW_UP_CALL',
          title: 'Test task',
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: new Date('2025-10-20T14:00:00Z'),
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: testOrganization.id
        }
      });
    });

    it('should set status to COMPLETED with timestamp', async () => {
      const completionData = {
        completionNotes: 'Task completed successfully'
      };

      const req = mockReq({
        params: { id: testTask.id },
        body: completionData,
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.completeTask(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe('COMPLETED');
      expect(response.completedAt).toBeTruthy();
      expect(response.completedById).toBe(testUser.id);
      expect(response.completionNotes).toBe(completionData.completionNotes);
    });

    it('should save completionNotes if provided', async () => {
      const completionNotes = 'Contacted patient, BP stable at 132/85';

      const req = mockReq({
        params: { id: testTask.id },
        body: { completionNotes },
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.completeTask(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.completionNotes).toBe(completionNotes);
    });

    it('should return 400 if task already COMPLETED', async () => {
      // Update task to completed
      await prisma.task.update({
        where: { id: testTask.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedById: testUser.id
        }
      });

      const req = mockReq({
        params: { id: testTask.id },
        body: {},
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.completeTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 400 if task already CANCELLED', async () => {
      // Update task to cancelled
      await prisma.task.update({
        where: { id: testTask.id },
        data: { status: 'CANCELLED' }
      });

      const req = mockReq({
        params: { id: testTask.id },
        body: {},
        user: { userId: testUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.completeTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 if user not assignee and not coordinator', async () => {
      // Create different user
      const otherUser = await prisma.user.create({
        data: {
          email: `other.user.${Date.now()}@example.com`,
          passwordHash: 'test-hash',
          firstName: 'Other',
          lastName: 'User'
        }
      });

      const req = mockReq({
        params: { id: testTask.id },
        body: {},
        user: { userId: otherUser.id },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.completeTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);

      // Clean up
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('cancelTask()', () => {
    beforeEach(async () => {
      testTask = await prisma.task.create({
        data: {
          taskType: 'FOLLOW_UP_CALL',
          title: 'Test task',
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: new Date('2025-10-20T14:00:00Z'),
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: testOrganization.id
        }
      });
    });

    it('should set status to CANCELLED with completion notes', async () => {
      const cancelData = {
        completionNotes: 'Patient no longer needs follow-up'
      };

      const req = mockReq({
        params: { id: testTask.id },
        body: cancelData,
        user: { userId: testUser.id, permissions: ['TASK_DELETE'] },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.cancelTask(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.status).toBe('CANCELLED');
      expect(response.completionNotes).toBe(cancelData.completionNotes);
    });

    it('should return 403 if user not coordinator', async () => {
      const req = mockReq({
        params: { id: testTask.id },
        body: {},
        user: { userId: testUser.id, permissions: [] }, // No TASK_DELETE permission
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.cancelTask(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if task already completed', async () => {
      // Update task to completed
      await prisma.task.update({
        where: { id: testTask.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completedById: testUser.id
        }
      });

      const req = mockReq({
        params: { id: testTask.id },
        body: {},
        user: { userId: testUser.id, permissions: ['TASK_DELETE'] },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.cancelTask(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('bulkAssignTasks()', () => {
    let task1, task2;

    beforeEach(async () => {
      task1 = await prisma.task.create({
        data: {
          taskType: 'FOLLOW_UP_CALL',
          title: 'Task 1',
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: new Date('2025-10-20T14:00:00Z'),
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: testOrganization.id
        }
      });

      task2 = await prisma.task.create({
        data: {
          taskType: 'MED_REVIEW',
          title: 'Task 2',
          status: 'PENDING',
          priority: 'LOW',
          dueDate: new Date('2025-10-21T14:00:00Z'),
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: testOrganization.id
        }
      });
    });

    it('should assign multiple tasks to specified user', async () => {
      // Create another user to assign to
      const assignee = await prisma.user.create({
        data: {
          email: `assignee.${Date.now()}@example.com`,
          passwordHash: 'test-hash',
          firstName: 'Assignee',
          lastName: 'User'
        }
      });

      const req = mockReq({
        body: {
          taskIds: [task1.id, task2.id],
          assignedToId: assignee.id
        },
        user: { userId: testUser.id, permissions: ['TASK_ASSIGN'] },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.bulkAssignTasks(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.updated).toBe(2);

      // Verify tasks were updated
      const updatedTask1 = await prisma.task.findUnique({ where: { id: task1.id } });
      const updatedTask2 = await prisma.task.findUnique({ where: { id: task2.id } });
      expect(updatedTask1.assignedToId).toBe(assignee.id);
      expect(updatedTask2.assignedToId).toBe(assignee.id);

      // Clean up
      await prisma.user.delete({ where: { id: assignee.id } });
    });

    it('should return 403 if user lacks TASK_ASSIGN permission', async () => {
      const req = mockReq({
        body: {
          taskIds: [task1.id, task2.id],
          assignedToId: testUser.id
        },
        user: { userId: testUser.id, permissions: [] }, // No TASK_ASSIGN permission
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.bulkAssignTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if taskIds array exceeds 50 items', async () => {
      const taskIds = Array.from({ length: 51 }, (_, i) => `task-id-${i}`);

      const req = mockReq({
        body: {
          taskIds,
          assignedToId: testUser.id
        },
        user: { userId: testUser.id, permissions: ['TASK_ASSIGN'] },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.bulkAssignTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should skip tasks that do not exist', async () => {
      const req = mockReq({
        body: {
          taskIds: [task1.id, 'non-existent-id'],
          assignedToId: testUser.id
        },
        user: { userId: testUser.id, permissions: ['TASK_ASSIGN'] },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.bulkAssignTasks(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.updated).toBe(1); // Only task1 updated
    });
  });

  describe('bulkCompleteTasks()', () => {
    let task1, task2;

    beforeEach(async () => {
      task1 = await prisma.task.create({
        data: {
          taskType: 'FOLLOW_UP_CALL',
          title: 'Task 1',
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: new Date('2025-10-20T14:00:00Z'),
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: testOrganization.id
        }
      });

      task2 = await prisma.task.create({
        data: {
          taskType: 'MED_REVIEW',
          title: 'Task 2',
          status: 'IN_PROGRESS',
          priority: 'LOW',
          dueDate: new Date('2025-10-21T14:00:00Z'),
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: testOrganization.id
        }
      });
    });

    it('should mark multiple tasks as COMPLETED', async () => {
      const req = mockReq({
        body: {
          taskIds: [task1.id, task2.id]
        },
        user: { userId: testUser.id, permissions: ['TASK_UPDATE'] },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.bulkCompleteTasks(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.updated).toBe(2);

      // Verify tasks were completed
      const updatedTask1 = await prisma.task.findUnique({ where: { id: task1.id } });
      const updatedTask2 = await prisma.task.findUnique({ where: { id: task2.id } });
      expect(updatedTask1.status).toBe('COMPLETED');
      expect(updatedTask2.status).toBe('COMPLETED');
      expect(updatedTask1.completedAt).toBeTruthy();
      expect(updatedTask2.completedAt).toBeTruthy();
    });

    it('should return 403 if user not coordinator', async () => {
      const req = mockReq({
        body: {
          taskIds: [task1.id, task2.id]
        },
        user: { userId: testUser.id, permissions: [] }, // No permissions
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.bulkCompleteTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 if taskIds array exceeds 50 items', async () => {
      const taskIds = Array.from({ length: 51 }, (_, i) => `task-id-${i}`);

      const req = mockReq({
        body: { taskIds },
        user: { userId: testUser.id, permissions: ['TASK_UPDATE'] },
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.bulkCompleteTasks(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getTaskStats()', () => {
    beforeEach(async () => {
      // Create tasks with various statuses and priorities
      await prisma.task.createMany({
        data: [
          {
            taskType: 'FOLLOW_UP_CALL',
            title: 'Task 1',
            status: 'PENDING',
            priority: 'HIGH',
            dueDate: new Date('2025-10-20T14:00:00Z'),
            assignedToId: testUser.id,
            assignedById: testUser.id,
            patientId: testPatient.id,
            organizationId: testOrganization.id
          },
          {
            taskType: 'MED_REVIEW',
            title: 'Task 2',
            status: 'COMPLETED',
            priority: 'MEDIUM',
            dueDate: new Date('2025-10-15T10:00:00Z'),
            completedAt: new Date('2025-10-15T12:00:00Z'),
            assignedToId: testUser.id,
            assignedById: testUser.id,
            completedById: testUser.id,
            patientId: testPatient.id,
            organizationId: testOrganization.id
          },
          {
            taskType: 'ADHERENCE_CHECK',
            title: 'Task 3',
            status: 'IN_PROGRESS',
            priority: 'LOW',
            dueDate: new Date('2025-10-22T10:00:00Z'),
            assignedToId: testUser.id,
            assignedById: testUser.id,
            patientId: testPatient.id,
            organizationId: testOrganization.id
          }
        ]
      });
    });

    it('should return task counts by status', async () => {
      const req = mockReq({
        query: {},
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTaskStats(req, res);

      expect(res.json).toHaveBeenCalled();
      const response = res.json.mock.calls[0][0];
      expect(response.byStatus).toHaveProperty('PENDING');
      expect(response.byStatus).toHaveProperty('COMPLETED');
      expect(response.byStatus).toHaveProperty('IN_PROGRESS');
    });

    it('should return task counts by priority', async () => {
      const req = mockReq({
        query: {},
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTaskStats(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.byPriority).toHaveProperty('HIGH');
      expect(response.byPriority).toHaveProperty('MEDIUM');
      expect(response.byPriority).toHaveProperty('LOW');
    });

    it('should calculate overdue count', async () => {
      // Create overdue task
      await prisma.task.create({
        data: {
          taskType: 'FOLLOW_UP_CALL',
          title: 'Overdue task',
          status: 'PENDING',
          priority: 'HIGH',
          dueDate: new Date('2025-10-01T14:00:00Z'), // Past date
          assignedToId: testUser.id,
          assignedById: testUser.id,
          patientId: testPatient.id,
          organizationId: testOrganization.id
        }
      });

      const req = mockReq({
        query: {},
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTaskStats(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response.overdue).toBeGreaterThan(0);
    });

    it('should calculate completion rate', async () => {
      const req = mockReq({
        query: {},
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTaskStats(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response).toHaveProperty('completionRate');
      expect(typeof response.completionRate).toBe('number');
    });

    it('should calculate average completion time', async () => {
      const req = mockReq({
        query: {},
        organizationId: testOrganization.id
      });
      const res = mockRes();

      await taskController.getTaskStats(req, res);

      const response = res.json.mock.calls[0][0];
      expect(response).toHaveProperty('avgCompletionTimeHours');
    });
  });
});
