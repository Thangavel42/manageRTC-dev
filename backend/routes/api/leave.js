/**
 * Leave REST API Routes
 * All leave management endpoints
 */

import express from 'express';
import { uploadSingleAttachment } from '../../config/multer.config.js';
import leaveController from '../../controllers/rest/leave.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/leaves
 * @desc    Get all leave requests with pagination and filtering
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/', leaveController.getLeaves);

/**
 * @route   GET /api/leaves/my
 * @desc    Get current user's leave requests
 * @access  Private (All authenticated users)
 */
router.get('/my', leaveController.getMyLeaves);

/**
 * @route   GET /api/leaves/status/:status
 * @desc    Get leave requests by status
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/status/:status', leaveController.getLeavesByStatus);

/**
 * @route   GET /api/leaves/balance
 * @desc    Get leave balance
 * @access  Private (All authenticated users)
 */
router.get('/balance', leaveController.getLeaveBalance);

/**
 * @route   GET /api/leaves/team
 * @desc    Get team leave requests (for managers)
 * @access  Private (Manager, Admin, HR, Superadmin)
 */
router.get('/team', leaveController.getTeamLeaves);

/**
 * @route   GET /api/leaves/:id
 * @desc    Get single leave request by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', leaveController.getLeaveById);

/**
 * @route   POST /api/leaves
 * @desc    Create new leave request
 * @access  Private (All authenticated users)
 */
router.post('/', leaveController.createLeave);

/**
 * @route   PUT /api/leaves/:id
 * @desc    Update leave request
 * @access  Private (Admin, HR, Owner)
 */
router.put('/:id', leaveController.updateLeave);

/**
 * @route   DELETE /api/leaves/:id
 * @desc    Delete leave request (soft delete)
 * @access  Private (Admin, Superadmin, Owner)
 */
router.delete('/:id', leaveController.deleteLeave);

/**
 * @route   POST /api/leaves/:id/approve
 * @desc    Approve leave request
 * @access  Private (Admin, HR, Manager)
 */
router.post('/:id/approve', leaveController.approveLeave);

/**
 * @route   POST /api/leaves/:id/reject
 * @desc    Reject leave request
 * @access  Private (Admin, HR, Manager)
 */
router.post('/:id/reject', leaveController.rejectLeave);

/**
 * @route   PATCH /api/leaves/:id/manager-action
 * @desc    Manager approval/rejection action
 * @access  Private (Manager, Admin, Superadmin)
 */
router.patch('/:id/manager-action', leaveController.managerActionLeave);

/**
 * @route   POST /api/leaves/:id/cancel
 * @desc    Cancel leave request (with balance restoration)
 * @access  Private (All authenticated users)
 */
router.post('/:id/cancel', leaveController.cancelLeave);

/**
 * @route   POST /api/leaves/:leaveId/attachments
 * @desc    Upload attachment for leave request
 * @access  Private (Owner, Admin, HR)
 */
router.post('/:leaveId/attachments',
  authenticate,
  uploadSingleAttachment,
  leaveController.uploadAttachment
);

/**
 * @route   GET /api/leaves/:leaveId/attachments
 * @desc    Get attachments for leave request
 * @access  Private (Owner, Admin, HR)
 */
router.get('/:leaveId/attachments',
  authenticate,
  leaveController.getAttachments
);

/**
 * @route   DELETE /api/leaves/:leaveId/attachments/:attachmentId
 * @desc    Delete attachment from leave request
 * @access  Private (Owner, Admin, HR)
 */
router.delete('/:leaveId/attachments/:attachmentId',
  authenticate,
  leaveController.deleteAttachment
);

export default router;
