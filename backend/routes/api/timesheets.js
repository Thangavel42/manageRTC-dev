/**
 * Timesheet Routes
 * REST API endpoints for timesheet management
 * Uses multi-tenant database architecture
 */

import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import * as timesheetController from '../../controllers/rest/timesheet.controller.js';
import { weeklyTimesheetSchemas } from '../../middleware/validate.js';

const router = express.Router();

// Apply authentication to ALL routes
router.use(authenticate);

/**
 * @route   GET /api/timesheets
 * @desc    Get all timesheets (Admin/HR/Manager only)
 * @access  admin, hr, manager, superadmin
 */
router.get(
  '/',
  weeklyTimesheetSchemas.list,
  timesheetController.getAllTimesheets
);

/**
 * @route   GET /api/timesheets/my
 * @desc    Get current user's timesheets
 * @access  admin, hr, employee, manager, superadmin
 */
router.get(
  '/my',
  timesheetController.getMyTimesheets
);

/**
 * @route   GET /api/timesheets/stats
 * @desc    Get timesheet statistics
 * @access  admin, hr, manager, superadmin
 */
router.get(
  '/stats',
  timesheetController.getTimesheetStats
);

/**
 * @route   GET /api/timesheets/:id
 * @desc    Get timesheet by ID
 * @access  private (owner or admin/hr/manager)
 */
router.get(
  '/:id',
  timesheetController.getTimesheetById
);

/**
 * @route   POST /api/timesheets
 * @desc    Create new timesheet
 * @access  admin, hr, employee, manager, superadmin
 */
router.post(
  '/',
  weeklyTimesheetSchemas.create,
  timesheetController.createTimesheet
);

/**
 * @route   PUT /api/timesheets/:id
 * @desc    Update timesheet
 * @access  private (owner if draft/rejected, or admin/hr)
 */
router.put(
  '/:id',
  weeklyTimesheetSchemas.update,
  timesheetController.updateTimesheet
);

/**
 * @route   POST /api/timesheets/:id/submit
 * @desc    Submit timesheet for approval
 * @access  admin, hr, employee, manager, superadmin
 */
router.post(
  '/:id/submit',
  timesheetController.submitTimesheet
);

/**
 * @route   POST /api/timesheets/:id/approve
 * @desc    Approve timesheet
 * @access  admin, hr, manager, superadmin
 */
router.post(
  '/:id/approve',
  weeklyTimesheetSchemas.approveReject,
  timesheetController.approveTimesheet
);

/**
 * @route   POST /api/timesheets/:id/reject
 * @desc    Reject timesheet
 * @access  admin, hr, manager, superadmin
 */
router.post(
  '/:id/reject',
  weeklyTimesheetSchemas.approveReject,
  timesheetController.rejectTimesheet
);

/**
 * @route   DELETE /api/timesheets/:id
 * @desc    Delete timesheet (soft delete)
 * @access  private (owner if draft, or admin)
 */
router.delete(
  '/:id',
  timesheetController.deleteTimesheet
);

export default router;
