/**
 * Time Tracking API Routes
 * REST API endpoints for Time Entry management
 */

import express from 'express';
import {
  getTimeEntries,
  getTimeEntryById,
  getTimeEntriesByUser,
  getTimeEntriesByProject,
  getTimeEntriesByTask,
  getTimesheet,
  createTimeEntry,
  updateTimeEntry,
  deleteTimeEntry,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  getTimeTrackingStats
} from '../../controllers/rest/timeTracking.controller.js';
import {
  authenticate,
  requireRole,
  requireCompany,
  attachRequestId
} from '../../middleware/auth.js';

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

/**
 * Public Routes (Authenticated users can access)
 */

// Create new time entry
router.post(
  '/',
  authenticate,
  requireCompany,
  createTimeEntry
);

// Update own time entry
router.put(
  '/:id',
  authenticate,
  requireCompany,
  updateTimeEntry
);

// Delete own time entry
router.delete(
  '/:id',
  authenticate,
  requireCompany,
  deleteTimeEntry
);

// Submit timesheet
router.post(
  '/submit',
  authenticate,
  requireCompany,
  submitTimesheet
);

// Get own timesheet
router.get(
  '/timesheet/:userId',
  authenticate,
  requireCompany,
  getTimesheet
);

// Get time entries by project
router.get(
  '/project/:projectId',
  authenticate,
  requireCompany,
  getTimeEntriesByProject
);

// Get time entries by task
router.get(
  '/task/:taskId',
  authenticate,
  requireCompany,
  getTimeEntriesByTask
);

// Get time entries by user
router.get(
  '/user/:userId',
  authenticate,
  requireCompany,
  getTimeEntriesByUser
);

/**
 * Manager-Level Routes (Admin/HR/Superadmin + Project Managers + Team Leaders)
 * Role authorization is handled inside the controller via getUserProjectScope().
 * IMPORTANT: These static routes must be defined BEFORE /:id to avoid being swallowed by the param route
 */

// List all time entries with pagination and filtering
router.get(
  '/',
  authenticate,
  requireCompany,
  getTimeEntries
);

// Get time tracking statistics
router.get(
  '/stats',
  authenticate,
  requireCompany,
  getTimeTrackingStats
);

// Approve timesheet
router.post(
  '/approve',
  authenticate,
  requireCompany,
  approveTimesheet
);

// Reject timesheet
router.post(
  '/reject',
  authenticate,
  requireCompany,
  rejectTimesheet
);

// Get single time entry by ID (must be AFTER all static routes)
router.get(
  '/:id',
  authenticate,
  requireCompany,
  getTimeEntryById
);

export default router;
