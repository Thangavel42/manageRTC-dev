/**
 * Task API Routes
 * REST API endpoints for Task management
 */

import express from 'express';
import {
  createTask,
  createTaskStatus,
  deleteTask,
  deleteTaskStatusBoard,
  getEmployeeProjectTasks,
  getMyTasks,
  getTaskById,
  getTasks,
  getTasksByProject,
  getTaskStats,
  getTaskStatuses,
  updateTask,
  updateTaskStatus,
  updateTaskStatusBoard,
} from '../../controllers/rest/task.controller.js';
import { attachRequestId, authenticate, requireRole } from '../../middleware/auth.js';
import { taskSchemas, validateBody, validateQuery } from '../../middleware/validate.js';

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

/**
 * Public Routes (Authenticated users can access)
 */

// Get task statuses
router.get('/statuses', authenticate, getTaskStatuses);

// Create task status (Admin only)
router.post('/statuses', authenticate, requireRole('admin', 'superadmin'), createTaskStatus);

// Update task status board (Admin only)
router.put(
  '/statuses/:id',
  authenticate,
  requireRole('admin', 'superadmin'),
  updateTaskStatusBoard
);

// Delete task status board (Admin only) - Soft delete
router.delete(
  '/statuses/:id',
  authenticate,
  requireRole('admin', 'superadmin'),
  deleteTaskStatusBoard
);

// Get current user's tasks
router.get('/my', authenticate, getMyTasks);

// Get current user's tasks for a specific project
router.get('/my/project/:projectId', authenticate, getEmployeeProjectTasks);

// Get tasks by project
router.get('/project/:projectId', authenticate, getTasksByProject);

// Get task statistics
router.get('/stats', authenticate, requireRole('admin', 'hr', 'superadmin'), getTaskStats);

/**
 * Admin/HR Routes (Restricted access)
 */

// List all tasks with pagination and filtering
router.get('/', authenticate, validateQuery(taskSchemas.list), getTasks);

// Create new task
router.post(
  '/',
  authenticate,
  requireRole('admin', 'hr', 'superadmin'),
  validateBody(taskSchemas.create),
  createTask
);

/**
 * Individual Task Routes
 */

// Get single task by ID
router.get('/:id', authenticate, getTaskById);

// Update task
router.put(
  '/:id',
  authenticate,
  requireRole('admin', 'hr', 'superadmin'),
  validateBody(taskSchemas.update),
  updateTask
);

// Delete task (soft delete)
router.delete('/:id', authenticate, requireRole('admin', 'superadmin'), deleteTask);

// Update task status
router.patch(
  '/:id/status',
  authenticate,
  requireRole('admin', 'hr', 'superadmin'),
  updateTaskStatus
);

export default router;
