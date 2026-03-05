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
import {
  attachRequestId,
  authenticate,
  requireEmployeeActive,
  requireRole,
} from '../../middleware/auth.js';
import { sanitizeBody, sanitizeParams, sanitizeQuery } from '../../middleware/inputSanitization.js'; // ✅ SECURITY FIX
import { searchLimiter } from '../../middleware/rateLimiting.js'; // ✅ SECURITY FIX - Phase 2: Rate limiting
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
router.get('/my', authenticate, requireEmployeeActive, getMyTasks);

// Get current user's tasks for a specific project
router.get('/my/project/:projectId', authenticate, requireEmployeeActive, getEmployeeProjectTasks);

// Get tasks by project
router.get('/project/:projectId', authenticate, getTasksByProject);

// Get task statistics
router.get('/stats', authenticate, requireRole('admin', 'hr', 'superadmin'), getTaskStats);

/**
 * Admin/HR Routes (Restricted access)
 */

// List all tasks with pagination and filtering
router.get(
  '/',
  searchLimiter,
  authenticate,
  sanitizeQuery,
  validateQuery(taskSchemas.list),
  getTasks
); // ✅ SECURITY FIX - Phase 2: Rate limiting added

// Create new task
// Allows: Admin, HR, and employees who are team leads/managers on the project
router.post(
  '/',
  authenticate,
  requireEmployeeActive,
  sanitizeBody, // ✅ SECURITY FIX: Remove MongoDB operators
  validateBody(taskSchemas.create),
  createTask
);

/**
 * Individual Task Routes
 */

// Get single task by ID
router.get('/:id', authenticate, sanitizeParams, getTaskById); // ✅ SECURITY FIX

// Update task
// Allows: Admin, HR, and employees who are team leads/managers on the project
router.put(
  '/:id',
  authenticate,
  requireEmployeeActive,
  sanitizeParams, // ✅ SECURITY FIX: Validate ObjectId
  sanitizeBody, // ✅ SECURITY FIX: Remove MongoDB operators
  validateBody(taskSchemas.update),
  updateTask
);

// Delete task (soft delete)
// Allows: Admin, HR, and employees who are team leads/managers on the project
router.delete('/:id', authenticate, requireEmployeeActive, deleteTask);

// Update task status
router.patch(
  '/:id/status',
  authenticate,
  requireRole('admin', 'hr', 'superadmin'),
  updateTaskStatus
);

export default router;
