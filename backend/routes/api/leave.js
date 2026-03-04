/**
 * Leave REST API Routes
 * All leave management endpoints
 */

import express from 'express';
import Joi from 'joi';
import { uploadSingleAttachment } from '../../config/multer.config.js';
import leaveCarryForwardController from '../../controllers/leaves/leaveCarryForward.controller.js';
import leaveEncashmentController from '../../controllers/leaves/leaveEncashment.controller.js';
import leaveLedgerController from '../../controllers/leaves/leaveLedger.controller.js';
import leaveAttendanceSyncController from '../../controllers/leaves/leaveAttendanceSync.controller.js';
import leaveController from '../../controllers/rest/leave.controller.js';
import { authenticate, requireEmployeeActive, requireRole } from '../../middleware/auth.js';
import { clockInOutRateLimiter, bulkRateLimiter } from '../../middleware/rateLimiter.js';
import { sanitizeBody, sanitizeQuery, sanitizeParams } from '../../utils/sanitize.js';  // ✅ SECURITY FIX: Added sanitizeParams
// ✅ PHASE 3 SECURITY FIX: Input validation
import {
  validateBody,
  validateQuery,
  validateParams,
  validateFile,
  createLeaveSchema,
  updateLeaveSchema,
  leaveActionSchema,
  managerActionSchema,
  cancelLeaveSchema,
  leaveAttachmentSchema,
  leaveQuerySchema,
  leaveBalanceQuerySchema,
  carryForwardConfigSchema,
  leaveEncashmentSchema,
  leaveLedgerInitSchema,
  objectIdSchema
} from '../../middleware/validation/index.js';

const router = express.Router();

// All routes require authentication AND active employee status
router.use(authenticate, requireEmployeeActive);

/**
 * @route   GET /api/leaves
 * @desc    Get all leave requests with pagination and filtering
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/', validateQuery(leaveQuerySchema), sanitizeQuery(), leaveController.getLeaves);

/**
 * @route   GET /api/leaves/my
 * @desc    Get current user's leave requests
 * @access  Private (All authenticated users)
 */
router.get('/my', validateQuery(leaveQuerySchema), sanitizeQuery(), leaveController.getMyLeaves);

/**
 * @route   GET /api/leaves/status/:status
 * @desc    Get leave requests by status
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/status/:status', sanitizeQuery(), leaveController.getLeavesByStatus);

/**
 * @route   GET /api/leaves/balance
 * @desc    Get leave balance
 * @access  Private (All authenticated users)
 */
router.get('/balance', validateQuery(leaveBalanceQuerySchema), sanitizeQuery(), leaveController.getLeaveBalance);

/**
 * @route   GET /api/leaves/team
 * @desc    Get team leave requests (for managers)
 * @access  Private (Manager, Admin, HR, Superadmin)
 */
router.get('/team', sanitizeQuery(), leaveController.getTeamLeaves);

/**
 * @route   GET /api/leaves/stats
 * @desc    Get leave statistics for admin dashboard
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/stats', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), leaveController.getLeaveStats);

// ============================================
// LEAVE LEDGER / BALANCE HISTORY ROUTES
// (must be before /:id to avoid route conflicts)
// ============================================

/**
 * @route   GET /api/leaves/ledger/my
 * @desc    Get current user's balance history
 * @access  Private (All authenticated users)
 */
router.get('/ledger/my', sanitizeQuery(), leaveLedgerController.getMyBalanceHistory);

/**
 * @route   GET /api/leaves/ledger/my/summary
 * @desc    Get current user's balance summary
 * @access  Private (All authenticated users)
 */
router.get('/ledger/my/summary', sanitizeQuery(), leaveLedgerController.getMyBalanceSummary);

/**
 * @route   GET /api/leaves/ledger/employee/:employeeId
 * @desc    Get specific employee's balance history
 * @access  Private (HR, Admin, Superadmin, or own employee)
 */
router.get('/ledger/employee/:employeeId', sanitizeQuery(), sanitizeParams(), leaveLedgerController.getEmployeeBalanceHistory);  // ✅ SECURITY FIX

/**
 * @route   GET /api/leaves/ledger/employee/:employeeId/summary
 * @desc    Get specific employee's balance summary
 * @access  Private (HR, Admin, Superadmin, or own employee)
 */
router.get('/ledger/employee/:employeeId/summary', sanitizeQuery(), sanitizeParams(), leaveLedgerController.getEmployeeBalanceSummary);  // ✅ SECURITY FIX

/**
 * @route   GET /api/leaves/ledger/financial-year/:financialYear
 * @desc    Get balance history by financial year
 * @access  Private (All authenticated users)
 */
router.get('/ledger/financial-year/:financialYear', sanitizeQuery(), leaveLedgerController.getBalanceHistoryByFinancialYear);

/**
 * @route   GET /api/leaves/ledger/export
 * @route   GET /api/leaves/ledger/export/:employeeId
 * @desc    Export balance history
 * @access  Private (HR, Admin, Superadmin, or own data)
 */
router.get('/ledger/export', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), leaveLedgerController.exportBalanceHistory);
router.get('/ledger/export/:employeeId', sanitizeQuery(), sanitizeParams(), requireRole('admin', 'hr', 'superadmin'), leaveLedgerController.exportBalanceHistory);  // ✅ SECURITY FIX

/**
 * @route   POST /api/leaves/ledger/initialize/:employeeId
 * @desc    Initialize ledger for employee
 * @access  Private (HR, Admin, Superadmin)
 */
router.post('/ledger/initialize/:employeeId', sanitizeBody({ type: 'leave' }), sanitizeParams(), bulkRateLimiter, requireRole('admin', 'hr', 'superadmin'), leaveLedgerController.initializeEmployeeLedger);  // ✅ SECURITY FIX

// ============================================
// LEAVE CARRY FORWARD ROUTES
// (must be before /:id to avoid route conflicts)
// ============================================

/**
 * @route   GET /api/leaves/carry-forward/config
 * @desc    Get carry forward configuration
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/carry-forward/config', sanitizeQuery(), leaveCarryForwardController.getCarryForwardConfig);

/**
 * @route   PUT /api/leaves/carry-forward/config
 * @desc    Update carry forward configuration
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/carry-forward/config', validateBody(carryForwardConfigSchema), sanitizeBody({ type: 'leave' }), leaveCarryForwardController.updateCarryForwardConfig);

/**
 * @route   GET /api/leaves/carry-forward/calculate/:employeeId
 * @desc    Calculate carry forward for employee
 * @access  Private (Admin, HR, Superadmin, or own employee)
 */
router.get('/carry-forward/calculate/:employeeId', sanitizeQuery(), sanitizeParams(), leaveCarryForwardController.calculateEmployeeCarryForward);  // ✅ SECURITY FIX

/**
 * @route   POST /api/leaves/carry-forward/execute/:employeeId
 * @desc    Execute carry forward for employee
 * @access  Private (Admin, HR, Superadmin)
 */
router.post('/carry-forward/execute/:employeeId', sanitizeBody({ type: 'leave' }), sanitizeParams(), bulkRateLimiter, leaveCarryForwardController.executeEmployeeCarryForward);  // ✅ SECURITY FIX

/**
 * @route   POST /api/leaves/carry-forward/execute-all
 * @desc    Execute carry forward for all employees
 * @access  Private (Admin, Superadmin)
 */
router.post('/carry-forward/execute-all', bulkRateLimiter, requireRole('admin', 'superadmin'), leaveCarryForwardController.executeCompanyCarryForward);

/**
 * @route   GET /api/leaves/carry-forward/history/:employeeId
 * @desc    Get carry forward history for employee
 * @access  Private (Admin, HR, Superadmin, or own employee)
 */
router.get('/carry-forward/history/:employeeId', sanitizeQuery(), sanitizeParams(), leaveCarryForwardController.getCarryForwardHistory);  // ✅ SECURITY FIX

/**
 * @route   GET /api/leaves/carry-forward/summary/:financialYear
 * @desc    Get carry forward summary for financial year
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/carry-forward/summary/:financialYear', sanitizeQuery(), leaveCarryForwardController.getCarryForwardSummary);

// ============================================
// LEAVE ENCASHMENT ROUTES
// (must be before /:id to avoid route conflicts)
// ============================================

/**
 * @route   GET /api/leaves/encashment/config
 * @desc    Get encashment configuration
 * @access  Private (All authenticated users)
 */
router.get('/encashment/config', sanitizeQuery(), leaveEncashmentController.getEncashmentConfig);

/**
 * @route   GET /api/leaves/encashment/calculate/:leaveType/:employeeId?
 * @desc    Calculate encashment for employee
 * @access  Private (All authenticated users)
 */
router.get('/encashment/calculate/:leaveType', sanitizeQuery(), leaveEncashmentController.calculateEncashment);
router.get('/encashment/calculate/:leaveType/:employeeId', sanitizeQuery(), sanitizeParams(), leaveEncashmentController.calculateEncashment);  // ✅ SECURITY FIX

/**
 * @route   POST /api/leaves/encashment/execute/:leaveType
 * @desc    Execute leave encashment
 * @access  Private (All authenticated users)
 */
router.post('/encashment/execute/:leaveType', validateBody(leaveEncashmentSchema), sanitizeBody({ type: 'leave' }), clockInOutRateLimiter, leaveEncashmentController.executeEncashment);

/**
 * @route   GET /api/leaves/encashment/history/:employeeId
 * @desc    Get encashment history for employee
 * @access  Private (Admin, HR, Superadmin, or own employee)
 */
router.get('/encashment/history/:employeeId', sanitizeQuery(), sanitizeParams(), leaveEncashmentController.getEncashmentHistory);  // ✅ SECURITY FIX

/**
 * @route   GET /api/leaves/encashment/summary
 * @desc    Get encashment summary for all employees
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/encashment/summary', sanitizeQuery(), leaveEncashmentController.getEncashmentSummary);

// ============================================
// CUSTOM POLICY ROUTES
// (must be before /:id to avoid route conflicts)
// ============================================

import customPolicyRoutes from './leave/customPolicies.js';
router.use('/custom-policies', customPolicyRoutes);

// ============================================
// INDIVIDUAL LEAVE ROUTES (dynamic :id must come after static multi-segment routes)
// ============================================

/**
 * @route   GET /api/leaves/:id
 * @desc    Get single leave request by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', sanitizeQuery(), sanitizeParams(), leaveController.getLeaveById);  // ✅ SECURITY FIX

/**
 * @route   POST /api/leaves
 * @desc    Create new leave request
 * @access  Private (All authenticated users)
 */
router.post('/', validateBody(createLeaveSchema), sanitizeBody({ type: 'leave' }), clockInOutRateLimiter, leaveController.createLeave);

/**
 * @route   PUT /api/leaves/:id
 * @desc    Update leave request
 * @access  Private (Admin, HR, Owner)
 */
router.put('/:id', validateBody(updateLeaveSchema), validateParams(Joi.object({ id: objectIdSchema.required() })), sanitizeBody({ type: 'leave' }), sanitizeParams(), clockInOutRateLimiter, leaveController.updateLeave);  // ✅ SECURITY FIX

/**
 * @route   DELETE /api/leaves/:id
 * @desc    Delete leave request (soft delete)
 * @access  Private (Admin, Superadmin, Owner)
 */
router.delete('/:id', sanitizeParams(), leaveController.deleteLeave);  // ✅ SECURITY FIX

/**
 * @route   POST /api/leaves/:id/approve
 * @desc    Approve leave request
 * @access  Private (Admin, HR, Manager)
 */
router.post('/:id/approve', validateBody(leaveActionSchema), validateParams(Joi.object({ id: objectIdSchema.required() })), sanitizeBody({ type: 'leave' }), sanitizeParams(), bulkRateLimiter, leaveController.approveLeave);  // ✅ SECURITY FIX

/**
 * @route   POST /api/leaves/:id/reject
 * @desc    Reject leave request
 * @access  Private (Admin, HR, Manager)
 */
router.post('/:id/reject', validateBody(leaveActionSchema), validateParams(Joi.object({ id: objectIdSchema.required() })), sanitizeBody({ type: 'leave' }), sanitizeParams(), bulkRateLimiter, leaveController.rejectLeave);  // ✅ SECURITY FIX

/**
 * @route   PATCH /api/leaves/:id/manager-action
 * @desc    Manager approval/rejection action
 * @access  Private (Manager, Admin, Superadmin)
 */
router.patch('/:id/manager-action', validateBody(managerActionSchema), validateParams(Joi.object({ id: objectIdSchema.required() })), sanitizeBody({ type: 'leave' }), sanitizeParams(), bulkRateLimiter, leaveController.managerActionLeave);  // ✅ SECURITY FIX

/**
 * @route   POST /api/leaves/:id/cancel
 * @desc    Cancel leave request (with balance restoration)
 * @access  Private (All authenticated users)
 */
router.post('/:id/cancel', validateBody(cancelLeaveSchema), validateParams(Joi.object({ id: objectIdSchema.required() })), sanitizeBody({ type: 'leave' }), sanitizeParams(), clockInOutRateLimiter, leaveController.cancelLeave);  // ✅ SECURITY FIX

/**
 * @route   POST /api/leaves/:leaveId/attachments
 * @desc    Upload attachment for leave request
 * @access  Private (Owner, Admin, HR)
 */
router.post('/:leaveId/attachments',
  uploadSingleAttachment,  // Multer file upload
  validateFile({  // ✅ PHASE 3 SECURITY: File validation
    required: true,
    maxSize: 5 * 1024 * 1024,  // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.pdf']
  }),
  sanitizeParams(),  // ✅ SECURITY FIX
  clockInOutRateLimiter,
  leaveController.uploadAttachment
);

/**
 * @route   GET /api/leaves/:leaveId/attachments
 * @desc    Get attachments for leave request
 * @access  Private (Owner, Admin, HR)
 */
router.get('/:leaveId/attachments',
  sanitizeQuery(),
  sanitizeParams(),  // ✅ SECURITY FIX
  leaveController.getAttachments
);

/**
 * @route   DELETE /api/leaves/:leaveId/attachments/:attachmentId
 * @desc    Delete attachment from leave request
 * @access  Private (Owner, Admin, HR)
 */
router.delete('/:leaveId/attachments/:attachmentId',
  sanitizeParams(),  // ✅ SECURITY FIX
  leaveController.deleteAttachment
);

// ============================================
// ATTENDANCE SYNC ROUTES (Phase 1 - Critical Fixes)
// ============================================

/**
 * @route   POST /api/leaves/sync-attendance
 * @desc    Trigger backfill of all approved leaves to attendance records
 * @access  Private (Admin, Superadmin)
 */
router.post('/sync-attendance',
  sanitizeBody({ type: 'leave' }),
  bulkRateLimiter,
  requireRole('admin', 'superadmin'),
  leaveAttendanceSyncController.syncAttendanceForApprovedLeaves
);

/**
 * @route   GET /api/leaves/:leaveId/attendance
 * @desc    Get attendance records for a specific leave
 * @access  Private (Admin, HR, Superadmin, or own leave)
 */
router.get('/:leaveId/attendance',
  sanitizeQuery(),
  sanitizeParams(),  // ✅ SECURITY FIX
  leaveAttendanceSyncController.getAttendanceForLeave
);

/**
 * @route   POST /api/leaves/:leaveId/sync-attendance
 * @desc    Sync attendance for a specific approved leave
 * @access  Private (Admin, HR, Superadmin)
 */
router.post('/:leaveId/sync-attendance',
  sanitizeBody({ type: 'leave' }),
  sanitizeParams(),  // ✅ SECURITY FIX
  bulkRateLimiter,
  requireRole('admin', 'hr', 'superadmin'),
  leaveAttendanceSyncController.syncSingleLeaveToAttendance
);

export default router;
