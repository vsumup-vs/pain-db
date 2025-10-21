const { PrismaClient } = require('@prisma/client');

// Use global prisma client in test environment, otherwise create new instance
const prisma = global.prisma || new PrismaClient();

// Get all tasks with filtering, sorting, and pagination
const getTasks = async (req, res) => {
  try {
    const {
      assignedTo,
      patientId,
      status,
      priority,
      taskType,
      overdue,
      dueToday,
      page = 1,
      limit = 10,
      sortBy = 'dueDate',
      sortOrder = 'asc'
    } = req.query;

    // SECURITY: Get organizationId from authenticated user context
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Build where clause
    const where = {
      organizationId  // SECURITY: Always filter by organization
    };

    if (assignedTo) {
      // Special handling for 'me' value - convert to current user ID
      where.assignedToId = assignedTo === 'me' ? req.user?.userId : assignedTo;
    }
    if (patientId) where.patientId = patientId;
    if (status) {
      // Handle comma-separated status values (e.g., "PENDING,IN_PROGRESS")
      const statusArray = status.split(',').map(s => s.trim());
      where.status = statusArray.length > 1 ? { in: statusArray } : statusArray[0];
    }
    if (priority) where.priority = priority;
    if (taskType) where.taskType = taskType;

    // Filter overdue tasks (due date in past and not completed)
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { not: 'COMPLETED' };
    }

    // Filter due today tasks
    if (dueToday === 'true') {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      where.dueDate = { gte: startOfToday, lt: endOfToday };
      where.status = { not: 'COMPLETED' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy]: sortOrder },
        include: {
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          assignedTo: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          assignedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          completedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          alert: {
            select: {
              id: true,
              severity: true,
              message: true
            }
          }
        }
      }),
      prisma.task.count({ where })
    ]);

    // Transform tasks to match frontend expectations
    const transformedTasks = tasks.map(task => ({
      ...task,
      type: task.taskType,  // Add 'type' alias for taskType
      assignedUsers: task.assignedTo ? [task.assignedTo] : []  // Transform assignedTo to assignedUsers array
    }));

    res.json({
      tasks: transformedTasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single task by ID with full relations
const getTask = async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // First check if task exists at all
    const taskExists = await prisma.task.findUnique({
      where: { id },
      select: { organizationId: true }
    });

    if (!taskExists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // If task exists but belongs to different organization, return 403
    if (taskExists.organizationId !== organizationId) {
      return res.status(403).json({
        error: 'Access denied',
        code: 'CROSS_ORG_ACCESS_DENIED'
      });
    }

    // Task exists and belongs to this organization - fetch with full relations
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            dateOfBirth: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        alert: {
          select: {
            id: true,
            severity: true,
            message: true,
            triggeredAt: true
          }
        },
        assessment: {
          select: {
            id: true,
            completedAt: true
          }
        }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new task
const createTask = async (req, res) => {
  try {
    const {
      taskType,
      title,
      description,
      priority,
      dueDate,
      assignedToId,
      patientId,
      alertId,
      assessmentId
    } = req.body;

    const currentUserId = req.user?.userId;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    // Validate required fields
    if (!taskType || !title || !dueDate || !assignedToId || !patientId) {
      return res.status(400).json({
        error: 'Missing required fields: taskType, title, dueDate, assignedToId, patientId'
      });
    }

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check organization type - block PLATFORM organizations from creating patient care tasks
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        type: true,
        name: true
      }
    });

    if (!organization) {
      return res.status(404).json({
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      });
    }

    // Block PLATFORM organizations from creating patient care tasks (patient-care feature)
    if (organization.type === 'PLATFORM') {
      return res.status(403).json({
        success: false,
        message: 'Patient care task management is not available for platform organizations. This is a patient-care feature for healthcare providers only.'
      });
    }

    // Validate enum values
    const validTaskTypes = ['FOLLOW_UP_CALL', 'MED_REVIEW', 'ADHERENCE_CHECK', 'LAB_ORDER', 'REFERRAL', 'CUSTOM'];
    if (!validTaskTypes.includes(taskType)) {
      return res.status(400).json({
        error: `Invalid taskType. Must be one of: ${validTaskTypes.join(', ')}`
      });
    }

    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({
        error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}`
      });
    }

    // Verify assignedTo user exists (we'll add organization check in production)
    const assignedToUser = await prisma.user.findUnique({
      where: { id: assignedToId }
    });

    if (!assignedToUser) {
      return res.status(404).json({ error: 'Assigned user not found' });
    }

    // Verify patient exists and belongs to organization
    const patient = await prisma.patient.findFirst({
      where: {
        id: patientId,
        organizationId
      }
    });

    if (!patient) {
      return res.status(404).json({ error: 'Patient not found in organization' });
    }

    // Create task with assignedById auto-set to current user
    const task = await prisma.task.create({
      data: {
        organizationId,  // SECURITY: Always include organizationId
        taskType,
        title,
        description,
        priority: priority || 'MEDIUM',
        dueDate: new Date(dueDate),
        assignedToId,
        assignedById: currentUserId,  // Auto-set to current user
        patientId,
        alertId: alertId || null,
        assessmentId: assessmentId || null
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update task
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      dueDate,
      assignedToId,
      status
    } = req.body;

    const currentUserId = req.user?.userId;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if task exists and belongs to organization
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Permission check: user must be assignee or have coordinator permissions
    const userPermissions = req.user?.permissions || [];
    const isCoordinator = userPermissions.includes('TASK_UPDATE') || userPermissions.includes('TASK_ASSIGN');
    const isAssignee = existingTask.assignedToId === currentUserId;

    if (!isAssignee && !isCoordinator) {
      return res.status(403).json({
        error: 'Permission denied. Only assignee or coordinator can update this task.'
      });
    }

    // Build update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
    if (assignedToId !== undefined) updateData.assignedToId = assignedToId;
    if (status !== undefined) updateData.status = status;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Complete task
const completeTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { completionNotes } = req.body;

    const currentUserId = req.user?.userId;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Check if task exists and belongs to organization
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Validate task is not already completed or cancelled
    if (existingTask.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Task is already completed' });
    }

    if (existingTask.status === 'CANCELLED') {
      return res.status(400).json({ error: 'Cannot complete a cancelled task' });
    }

    // Permission check: user must be assignee or have coordinator permissions
    const userPermissions = req.user?.permissions || [];
    const isCoordinator = userPermissions.includes('TASK_UPDATE');
    const isAssignee = existingTask.assignedToId === currentUserId;

    if (!isAssignee && !isCoordinator) {
      return res.status(403).json({
        error: 'Permission denied. Only assignee or coordinator can complete this task.'
      });
    }

    // Complete the task
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: currentUserId,
        completionNotes: completionNotes || null
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Cancel task (coordinator only)
const cancelTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { completionNotes } = req.body;

    const organizationId = req.organizationId || req.user?.currentOrganization;
    const userPermissions = req.user?.permissions || [];

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Permission check: user must have TASK_DELETE permission (coordinator)
    if (!userPermissions.includes('TASK_DELETE')) {
      return res.status(403).json({
        error: 'Permission denied. Only coordinators can cancel tasks.'
      });
    }

    // Check if task exists and belongs to organization
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        organizationId
      }
    });

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Validate task is not already completed
    if (existingTask.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Cannot cancel a completed task' });
    }

    // Cancel the task
    const task = await prisma.task.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completionNotes: completionNotes || null
      },
      include: {
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    res.json(task);
  } catch (error) {
    console.error('Error cancelling task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk assign tasks (coordinator only)
const bulkAssignTasks = async (req, res) => {
  try {
    const { taskIds, assignedToId } = req.body;

    const organizationId = req.organizationId || req.user?.currentOrganization;
    const userPermissions = req.user?.permissions || [];

    // Validate required fields
    if (!taskIds || !Array.isArray(taskIds) || !assignedToId) {
      return res.status(400).json({
        error: 'Missing required fields: taskIds (array), assignedToId'
      });
    }

    // Validate 50-task limit
    if (taskIds.length > 50) {
      return res.status(400).json({
        error: 'Cannot assign more than 50 tasks at once'
      });
    }

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Permission check: user must have TASK_ASSIGN permission
    if (!userPermissions.includes('TASK_ASSIGN')) {
      return res.status(403).json({
        error: 'Permission denied. Only users with TASK_ASSIGN permission can bulk assign tasks.'
      });
    }

    // Verify assignedTo user exists
    const assignedToUser = await prisma.user.findUnique({
      where: { id: assignedToId }
    });

    if (!assignedToUser) {
      return res.status(404).json({ error: 'Assigned user not found' });
    }

    // Bulk update tasks (only tasks that exist and belong to organization)
    const result = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        organizationId
      },
      data: {
        assignedToId
      }
    });

    res.json({
      updated: result.count,
      message: `Successfully assigned ${result.count} task(s) to ${assignedToUser.firstName} ${assignedToUser.lastName}`
    });
  } catch (error) {
    console.error('Error bulk assigning tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk complete tasks (coordinator only)
const bulkCompleteTasks = async (req, res) => {
  try {
    const { taskIds } = req.body;

    const currentUserId = req.user?.userId;
    const organizationId = req.organizationId || req.user?.currentOrganization;
    const userPermissions = req.user?.permissions || [];

    // Validate required fields
    if (!taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({
        error: 'Missing required field: taskIds (array)'
      });
    }

    // Validate 50-task limit
    if (taskIds.length > 50) {
      return res.status(400).json({
        error: 'Cannot complete more than 50 tasks at once'
      });
    }

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    // Permission check: user must have TASK_UPDATE permission (coordinator)
    if (!userPermissions.includes('TASK_UPDATE')) {
      return res.status(403).json({
        error: 'Permission denied. Only coordinators can bulk complete tasks.'
      });
    }

    // Bulk update tasks (only pending/in-progress tasks)
    const result = await prisma.task.updateMany({
      where: {
        id: { in: taskIds },
        organizationId,
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedById: currentUserId
      }
    });

    res.json({
      updated: result.count,
      message: `Successfully completed ${result.count} task(s)`
    });
  } catch (error) {
    console.error('Error bulk completing tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get task statistics
const getTaskStats = async (req, res) => {
  try {
    const { assignedTo, patientId } = req.query;
    const organizationId = req.organizationId || req.user?.currentOrganization;

    if (!organizationId) {
      return res.status(403).json({
        error: 'Organization context required',
        code: 'ORG_CONTEXT_MISSING'
      });
    }

    const where = { organizationId };
    if (assignedTo) where.assignedToId = assignedTo;
    if (patientId) where.patientId = patientId;

    // Calculate date ranges
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    // Get counts by status
    const [
      totalTasks,
      pendingTasks,
      inProgressTasks,
      completedTasks,
      cancelledTasks,
      overdueTasks,
      dueTodayTasks,
      dueThisWeekTasks,
      highPriorityTasks,
      urgentPriorityTasks
    ] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: 'PENDING' } }),
      prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.task.count({ where: { ...where, status: 'CANCELLED' } }),
      prisma.task.count({
        where: {
          ...where,
          status: { not: 'COMPLETED' },
          dueDate: { lt: now }
        }
      }),
      prisma.task.count({
        where: {
          ...where,
          status: { not: 'COMPLETED' },
          dueDate: { gte: startOfToday, lt: endOfToday }
        }
      }),
      prisma.task.count({
        where: {
          ...where,
          status: { not: 'COMPLETED' },
          dueDate: { gte: startOfToday, lt: endOfWeek }
        }
      }),
      prisma.task.count({ where: { ...where, priority: 'HIGH' } }),
      prisma.task.count({ where: { ...where, priority: 'URGENT' } })
    ]);

    // Get all priority counts
    const [lowPriority, mediumPriority] = await Promise.all([
      prisma.task.count({ where: { ...where, priority: 'LOW' } }),
      prisma.task.count({ where: { ...where, priority: 'MEDIUM' } })
    ]);

    // Calculate completion rate
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average completion time (in hours)
    const completedTasksWithTime = await prisma.task.findMany({
      where: {
        ...where,
        status: 'COMPLETED',
        completedAt: { not: null }
      },
      select: {
        createdAt: true,
        completedAt: true
      }
    });

    let avgCompletionTimeHours = 0;
    if (completedTasksWithTime.length > 0) {
      const totalCompletionTimeMs = completedTasksWithTime.reduce((sum, task) => {
        return sum + (new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime());
      }, 0);
      avgCompletionTimeHours = totalCompletionTimeMs / completedTasksWithTime.length / (1000 * 60 * 60);
    }

    res.json({
      total: totalTasks,
      byStatus: {
        PENDING: pendingTasks,
        IN_PROGRESS: inProgressTasks,
        COMPLETED: completedTasks,
        CANCELLED: cancelledTasks
      },
      byPriority: {
        LOW: lowPriority,
        MEDIUM: mediumPriority,
        HIGH: highPriorityTasks,
        URGENT: urgentPriorityTasks
      },
      overdue: overdueTasks,
      dueToday: dueTodayTasks,
      dueThisWeek: dueThisWeekTasks,
      completionRate: parseFloat(completionRate.toFixed(2)),
      avgCompletionTimeHours: parseFloat(avgCompletionTimeHours.toFixed(2))
    });
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  cancelTask,
  bulkAssignTasks,
  bulkCompleteTasks,
  getTaskStats
};
