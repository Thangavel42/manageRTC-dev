/**
 * Audit Log Routes
 * REST API endpoints for audit log viewing and management
 */

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import auditController from '../../controllers/audit/auditLog.controller.js';
import { exportRateLimiter } from '../../middleware/rateLimiter.js';
import { sanitizeQuery } from '../../utils/sanitize.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/audit/logs
 * @desc    Get audit logs with filters
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/logs', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), auditController.getAuditLogs);

/**
 * @route   GET /api/audit/stats
 * @desc    Get audit log statistics
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/stats', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), auditController.getAuditStats);

/**
 * @route   GET /api/audit/recent
 * @desc    Get recent activity
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/recent', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), auditController.getRecentActivity);

/**
 * @route   GET /api/audit/my-activity
 * @desc    Get my activity log
 * @access  Private (All authenticated users)
 */
router.get('/my-activity', sanitizeQuery(), auditController.getMyActivity);

/**
 * @route   GET /api/audit/employee/:employeeId
 * @desc    Get activity by employee
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/employee/:employeeId', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), auditController.getEmployeeActivity);

/**
 * @route   GET /api/audit/entity/:entityType/:entityId
 * @desc    Get entity history
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/entity/:entityType/:entityId', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), auditController.getEntityHistory);

/**
 * @route   GET /api/audit/security-events
 * @desc    Get security events
 * @access  Private (Admin, Superadmin)
 */
router.get('/security-events', sanitizeQuery(), requireRole('admin', 'superadmin'), auditController.getSecurityEvents);

/**
 * @route   GET /api/audit/export
 * @desc    Export audit logs
 * @access  Private (Admin, Superadmin)
 */
router.get('/export', sanitizeQuery(), exportRateLimiter, requireRole('admin', 'superadmin'), auditController.exportAuditLogs);

/**
 * @route   POST /api/audit/cleanup
 * @desc    Cleanup old audit logs
 * @access  Private (Superadmin only)
 */
router.post('/cleanup', requireRole('superadmin'), auditController.cleanupLogs);

export default router;
