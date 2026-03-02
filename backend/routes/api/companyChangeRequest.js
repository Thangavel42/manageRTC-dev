/**
 * Company Change Request API Routes
 * REST API endpoints for company change request management
 */

import express from 'express';
import {
  submitChangeRequest,
  getMyRequests,
  cancelRequest,
  getAllRequests,
  getRequestStats,
  approveField,
  rejectField,
  bulkApprove,
  bulkReject
} from '../../controllers/rest/companyChangeRequest.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// ============================================================
// Admin Routes - require 'admin' role
// ============================================================

/**
 * @route   POST /api/company-change-requests/
 * @desc    Submit a new company change request
 * @access  Private (Admin)
 */
router.post('/', authenticate, requireRole('admin'), submitChangeRequest);

/**
 * @route   GET /api/company-change-requests/my
 * @desc    Get admin's own change requests
 * @access  Private (Admin)
 * @query   status - Filter by request status
 */
router.get('/my', authenticate, requireRole('admin'), getMyRequests);

/**
 * @route   PATCH /api/company-change-requests/:id/cancel
 * @desc    Cancel own pending change request
 * @access  Private (Admin)
 */
router.patch('/:id/cancel', authenticate, requireRole('admin'), cancelRequest);

// ============================================================
// Superadmin Routes - require 'superadmin' role
// ============================================================

/**
 * @route   GET /api/company-change-requests/stats
 * @desc    Get change request statistics
 * @access  Private (Superadmin)
 */
router.get('/stats', authenticate, requireRole('superadmin'), getRequestStats);

/**
 * @route   GET /api/company-change-requests/
 * @desc    Get all company change requests
 * @access  Private (Superadmin)
 * @query   status - Filter by request status
 * @query   companyId - Filter by company ID
 * @query   requestType - Filter by request type
 */
router.get('/', authenticate, requireRole('superadmin'), getAllRequests);

/**
 * @route   PATCH /api/company-change-requests/:id/field/:fieldIdx/approve
 * @desc    Approve a specific field in a change request
 * @access  Private (Superadmin)
 */
router.patch('/:id/field/:fieldIdx/approve', authenticate, requireRole('superadmin'), approveField);

/**
 * @route   PATCH /api/company-change-requests/:id/field/:fieldIdx/reject
 * @desc    Reject a specific field in a change request
 * @access  Private (Superadmin)
 */
router.patch('/:id/field/:fieldIdx/reject', authenticate, requireRole('superadmin'), rejectField);

/**
 * @route   PATCH /api/company-change-requests/:id/bulk-approve
 * @desc    Bulk approve all pending fields in a change request
 * @access  Private (Superadmin)
 */
router.patch('/:id/bulk-approve', authenticate, requireRole('superadmin'), bulkApprove);

/**
 * @route   PATCH /api/company-change-requests/:id/bulk-reject
 * @desc    Bulk reject all pending fields in a change request
 * @access  Private (Superadmin)
 */
router.patch('/:id/bulk-reject', authenticate, requireRole('superadmin'), bulkReject);

export default router;
