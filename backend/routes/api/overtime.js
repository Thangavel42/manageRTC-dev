/**
 * Overtime Request REST API Routes
 * All overtime request management endpoints
 */

import express from 'express';
import { authenticate, requireEmployeeActive, requireRole } from '../../middleware/auth.js';
import { validate, validateBody, validateQuery } from '../../middleware/validate.js';
import { overtimeSchemas } from '../../middleware/validate.js';
import overtimeController from '../../controllers/rest/overtime.controller.js';
import { clockInOutRateLimiter, bulkRateLimiter } from '../../middleware/rateLimiter.js';
import { sanitizeBody, sanitizeQuery } from '../../utils/sanitize.js';

const router = express.Router();

// All routes require authentication AND active employee status
router.use(authenticate, requireEmployeeActive);

/**
 * @route   GET /api/overtime
 * @desc    Get all overtime requests with pagination and filtering
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), validateQuery(overtimeSchemas.list), overtimeController.getOvertimeRequests);

/**
 * @route   GET /api/overtime/my
 * @desc    Get current user's overtime requests
 * @access  Private (All authenticated users)
 */
router.get('/my', sanitizeQuery(), validateQuery(overtimeSchemas.list), overtimeController.getMyOvertimeRequests);

/**
 * @route   GET /api/overtime/pending
 * @desc    Get pending overtime requests
 * @access  Private (Admin, HR, Manager)
 */
router.get('/pending', sanitizeQuery(), requireRole('admin', 'hr', 'manager', 'superadmin'), validateQuery(overtimeSchemas.list), overtimeController.getPendingOvertimeRequests);

/**
 * @route   GET /api/overtime/stats
 * @desc    Get overtime statistics
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/stats', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), validateQuery(overtimeSchemas.stats), overtimeController.getOvertimeStats);

/**
 * @route   GET /api/overtime/:id
 * @desc    Get single overtime request by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', sanitizeQuery(), validate(overtimeSchemas.list), overtimeController.getOvertimeRequestById);

/**
 * @route   POST /api/overtime
 * @desc    Create new overtime request
 * @access  Private (All authenticated users)
 */
router.post('/', sanitizeBody({ type: 'overtime' }), clockInOutRateLimiter, validateBody(overtimeSchemas.create), overtimeController.createOvertimeRequest);

/**
 * @route   PUT /api/overtime/:id
 * @desc    Update overtime request
 * @access  Private (Owner can edit pending requests, Admin/HR can edit any)
 */
router.put('/:id', sanitizeBody({ type: 'overtime' }), clockInOutRateLimiter, validateBody(overtimeSchemas.update), overtimeController.updateOvertimeRequest);

/**
 * @route   POST /api/overtime/:id/approve
 * @desc    Approve overtime request
 * @access  Private (Admin, HR, Manager)
 */
router.post('/:id/approve', sanitizeBody({ type: 'overtime' }), bulkRateLimiter, requireRole('admin', 'hr', 'manager', 'superadmin'), validateBody(overtimeSchemas.approveReject), overtimeController.approveOvertimeRequest);

/**
 * @route   POST /api/overtime/:id/reject
 * @desc    Reject overtime request
 * @access  Private (Admin, HR, Manager)
 */
router.post('/:id/reject', sanitizeBody({ type: 'overtime' }), bulkRateLimiter, requireRole('admin', 'hr', 'manager', 'superadmin'), validateBody(overtimeSchemas.rejectOnly), overtimeController.rejectOvertimeRequest);

/**
 * @route   POST /api/overtime/:id/cancel
 * @desc    Cancel overtime request
 * @access  Private (All authenticated users)
 */
router.post('/:id/cancel', sanitizeBody({ type: 'overtime' }), validateBody(overtimeSchemas.cancel), overtimeController.cancelOvertimeRequest);

/**
 * @route   DELETE /api/overtime/:id
 * @desc    Delete overtime request (soft delete)
 * @access  Private (Admin, Superadmin)
 */
router.delete('/:id', requireRole('admin', 'superadmin'), overtimeController.deleteOvertimeRequest);

export default router;
