/**
 * Attendance REST API Routes
 * All attendance management endpoints
 */

import express from 'express';
import { authenticate, requireEmployeeActive, requireRole } from '../../middleware/auth.js';
import attendanceController from '../../controllers/rest/attendance.controller.js';
import { clockInOutRateLimiter, statsRateLimiter, bulkRateLimiter, exportRateLimiter } from '../../middleware/rateLimiter.js';
import { sanitizeBody, sanitizeQuery } from '../../utils/sanitize.js';

const router = express.Router();

// All routes require authentication AND active employee status
router.use(authenticate, requireEmployeeActive);

/**
 * @route   GET /api/attendance
 * @desc    Get all attendance records with pagination and filtering
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), attendanceController.getAttendances);

/**
 * @route   GET /api/attendance/my
 * @desc    Get current user's attendance records
 * @access  Private (All authenticated users)
 */
router.get('/my', sanitizeQuery(), attendanceController.getMyAttendance);

/**
 * @route   GET /api/attendance/daterange
 * @desc    Get attendance by date range
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/daterange', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), attendanceController.getAttendanceByDateRange);

/**
 * @route   GET /api/attendance/stats
 * @desc    Get attendance statistics
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/stats', sanitizeQuery(), statsRateLimiter, requireRole('admin', 'hr', 'superadmin'), attendanceController.getAttendanceStats);

/**
 * @route   POST /api/attendance/bulk
 * @desc    Bulk attendance actions
 * @access  Private (Admin, HR, Superadmin)
 */
router.post('/bulk', sanitizeBody({ type: 'attendance' }), bulkRateLimiter, requireRole('admin', 'hr', 'superadmin'), attendanceController.bulkAttendanceAction);

/**
 * @route   GET /api/attendance/employee/:employeeId
 * @desc    Get attendance by employee
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/employee/:employeeId', sanitizeQuery(), requireRole('admin', 'hr', 'superadmin'), attendanceController.getAttendanceByEmployee);

/**
 * @route   GET /api/attendance/:id
 * @desc    Get single attendance record by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', sanitizeQuery(), attendanceController.getAttendanceById);

/**
 * @route   POST /api/attendance
 * @desc    Create new attendance record (clock in)
 * @access  Private (All authenticated users)
 */
router.post('/', sanitizeBody({ type: 'attendance' }), clockInOutRateLimiter, attendanceController.createAttendance);

/**
 * @route   PUT /api/attendance/:id
 * @desc    Update attendance record (clock out)
 * @access  Private (All authenticated users)
 */
router.put('/:id', sanitizeBody({ type: 'attendance' }), clockInOutRateLimiter, attendanceController.updateAttendance);

/**
 * @route   DELETE /api/attendance/:id
 * @desc    Delete attendance record (soft delete)
 * @access  Private (Admin, Superadmin)
 */
router.delete('/:id', requireRole('admin', 'superadmin'), attendanceController.deleteAttendance);

/**
 * @route   POST /api/attendance/:id/request-regularization
 * @desc    Request attendance regularization
 * @access  Private (All authenticated users)
 */
router.post('/:id/request-regularization', sanitizeBody({ type: 'attendance' }), clockInOutRateLimiter, attendanceController.requestRegularization);

/**
 * @route   POST /api/attendance/:id/approve-regularization
 * @desc    Approve attendance regularization
 * @access  Private (Admin, HR, Manager)
 */
router.post('/:id/approve-regularization', sanitizeBody({ type: 'attendance' }), clockInOutRateLimiter, requireRole('admin', 'hr', 'manager', 'superadmin'), attendanceController.approveRegularization);

/**
 * @route   POST /api/attendance/:id/reject-regularization
 * @desc    Reject attendance regularization
 * @access  Private (Admin, HR, Manager)
 */
router.post('/:id/reject-regularization', sanitizeBody({ type: 'attendance' }), clockInOutRateLimiter, requireRole('admin', 'hr', 'manager', 'superadmin'), attendanceController.rejectRegularization);

/**
 * @route   GET /api/attendance/regularization/pending
 * @desc    Get pending regularization requests
 * @access  Private (Admin, HR, Manager)
 */
router.get('/regularization/pending', sanitizeQuery(), requireRole('admin', 'hr', 'manager', 'superadmin'), attendanceController.getPendingRegularizations);

/**
 * @route   POST /api/attendance/report
 * @desc    Generate attendance report
 * @access  Private (Admin, HR, Superadmin)
 */
router.post('/report', sanitizeBody({ type: 'attendance' }), bulkRateLimiter, requireRole('admin', 'hr', 'superadmin'), attendanceController.generateReport);

/**
 * @route   POST /api/attendance/report/employee/:employeeId
 * @desc    Generate employee attendance report
 * @access  Private (Admin, HR, Superadmin, Employee for own)
 */
router.post('/report/employee/:employeeId', sanitizeBody({ type: 'attendance' }), bulkRateLimiter, requireRole('admin', 'hr', 'superadmin'), attendanceController.generateEmployeeReport);

/**
 * @route   GET /api/attendance/export
 * @desc    Export attendance data
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/export', sanitizeQuery(), exportRateLimiter, requireRole('admin', 'hr', 'superadmin'), attendanceController.exportAttendance);

export default router;
