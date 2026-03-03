/**
 * Change Request REST API Routes
 * Employees submit requests to change sensitive profile fields (bank details, name, etc.)
 * HR reviews, approves, or rejects each request.
 *
 * REDESIGNED: Now supports multiple fields per request with individual field-level approval.
 */

import express from 'express';
import {
  approveChangeRequest,
  approveField,
  bulkApproveFields,
  bulkRejectFields,
  cancelChangeRequest,
  createChangeRequest,
  getAllChangeRequests,
  getMyChangeRequests,
  rejectChangeRequest,
  rejectField,
} from '../../controllers/rest/changeRequest.controller.js';
import { attachRequestId, authenticate, requireCompany, requireEmployeeActive } from '../../middleware/auth.js';

const router = express.Router();

// Apply request ID tracking and authentication to all routes
router.use(attachRequestId);
router.use(authenticate);
router.use(requireEmployeeActive);
router.use(requireCompany);

/**
 * @route   POST /api/change-requests
 * @desc    Employee submits a change request (can include multiple fields)
 * @access  Private (All authenticated employees)
 */
router.post('/', createChangeRequest);

/**
 * @route   GET /api/change-requests/my
 * @desc    Employee retrieves their own change request history
 * @access  Private (All authenticated employees)
 */
router.get('/my', getMyChangeRequests);

/**
 * @route   GET /api/change-requests
 * @desc    HR/Admin retrieves all change requests for the company
 * @access  Private (HR, Admin, Superadmin) — role check is inside the controller
 */
router.get('/', getAllChangeRequests);

/**
 * @route   PATCH /api/change-requests/:id/field/:fieldIdx/approve
 * @desc    HR approves a specific field within a change request
 * @access  Private (HR, Admin, Superadmin)
 */
router.patch('/:id/field/:fieldIdx/approve', approveField);

/**
 * @route   PATCH /api/change-requests/:id/field/:fieldIdx/reject
 * @desc    HR rejects a specific field within a change request
 * @access  Private (HR, Admin, Superadmin)
 */
router.patch('/:id/field/:fieldIdx/reject', rejectField);

/**
 * @route   PATCH /api/change-requests/:id/bulk-approve
 * @desc    HR approves all pending fields in a change request
 * @access  Private (HR, Admin, Superadmin)
 */
router.patch('/:id/bulk-approve', bulkApproveFields);

/**
 * @route   PATCH /api/change-requests/:id/bulk-reject
 * @desc    HR rejects all pending fields in a change request
 * @access  Private (HR, Admin, Superadmin)
 */
router.patch('/:id/bulk-reject', bulkRejectFields);

/**
 * @route   PATCH /api/change-requests/:id/cancel
 * @desc    Employee or HR cancels a pending change request
 * @access  Private (Employee can cancel own, HR can cancel any)
 */
router.patch('/:id/cancel', cancelChangeRequest);

/**
 * @route   PATCH /api/change-requests/:id/approve
 * @desc    HR approves all pending fields in a change request (legacy endpoint)
 * @access  Private (HR, Admin, Superadmin)
 */
router.patch('/:id/approve', approveChangeRequest);

/**
 * @route   PATCH /api/change-requests/:id/reject
 * @desc    HR rejects all pending fields in a change request (legacy endpoint)
 * @access  Private (HR, Admin, Superadmin)
 */
router.patch('/:id/reject', rejectChangeRequest);

export default router;
