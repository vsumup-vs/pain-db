const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  completeTask,
  cancelTask,
  bulkAssignTasks,
  bulkCompleteTasks,
  getTaskStats
} = require('../controllers/taskController');

// GET /api/tasks/stats - Get task statistics (must be before /:id route)
router.get('/stats', getTaskStats);

// GET /api/tasks - Get all tasks with filtering, sorting, pagination
router.get('/', getTasks);

// GET /api/tasks/:id - Get single task by ID with full relations
router.get('/:id', getTask);

// POST /api/tasks - Create new task
router.post('/', createTask);

// PUT /api/tasks/:id - Update task
router.put('/:id', updateTask);

// PATCH /api/tasks/:id/complete - Mark task as completed
router.patch('/:id/complete', completeTask);

// PATCH /api/tasks/:id/cancel - Cancel task (coordinator only)
router.patch('/:id/cancel', cancelTask);

// POST /api/tasks/bulk-assign - Bulk assign tasks to user (coordinator only)
router.post('/bulk-assign', bulkAssignTasks);

// POST /api/tasks/bulk-complete - Bulk complete tasks (coordinator only)
router.post('/bulk-complete', bulkCompleteTasks);

module.exports = router;
