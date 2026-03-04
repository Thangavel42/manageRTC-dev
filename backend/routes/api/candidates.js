/**
 * Candidates REST API Routes
 */

import express from 'express';
import * as candidatesController from '../../controllers/candidates/candidates.rest.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /api/candidates/all-data
 * Get all candidates and stats
 * Access: admin, hr, manager, superadmin
 */
router.get(
  '/all-data',
  requireRole('admin', 'hr', 'manager', 'superadmin'),
  candidatesController.getAllData
);

/**
 * GET /api/candidates/stats
 * Get candidate statistics
 * Access: admin, hr, manager, superadmin
 */
router.get(
  '/stats',
  requireRole('admin', 'hr', 'manager', 'superadmin'),
  candidatesController.getStats
);

/**
 * POST /api/candidates/export/pdf
 * Export candidates as PDF
 * Access: admin, hr, manager, superadmin
 */
router.post(
  '/export/pdf',
  requireRole('admin', 'hr', 'manager', 'superadmin'),
  candidatesController.exportPDF
);

/**
 * POST /api/candidates/export/excel
 * Export candidates as Excel
 * Access: admin, hr, manager, superadmin
 */
router.post(
  '/export/excel',
  requireRole('admin', 'hr', 'manager', 'superadmin'),
  candidatesController.exportExcel
);

/**
 * POST /api/candidates/bulk-update
 * Bulk update candidates
 * Access: admin, hr, superadmin
 */
router.post(
  '/bulk-update',
  requireRole('admin', 'hr', 'superadmin'),
  candidatesController.bulkUpdate
);

/**
 * GET /api/candidates/:id
 * Get candidate by ID
 * Access: admin, hr, manager, superadmin
 */
router.get(
  '/:id',
  requireRole('admin', 'hr', 'manager', 'superadmin'),
  candidatesController.getCandidateById
);

/**
 * PUT /api/candidates/:id
 * Update candidate
 * Access: admin, hr, superadmin
 */
router.put('/:id', requireRole('admin', 'hr', 'superadmin'), candidatesController.updateCandidate);

/**
 * DELETE /api/candidates/:id
 * Delete candidate
 * Access: admin, hr, superadmin
 */
router.delete(
  '/:id',
  requireRole('admin', 'hr', 'superadmin'),
  candidatesController.deleteCandidate
);

/**
 * PATCH /api/candidates/:id/status
 * Update candidate status
 * Access: admin, hr, superadmin
 */
router.patch(
  '/:id/status',
  requireRole('admin', 'hr', 'superadmin'),
  candidatesController.updateCandidateStatus
);

/**
 * GET /api/candidates
 * Get all candidates with optional filters
 * Query params: status, appliedRole, experienceLevel, recruiterId, search, startDate, endDate, sortBy, sortOrder
 * Access: admin, hr, manager, superadmin
 */
router.get(
  '/',
  requireRole('admin', 'hr', 'manager', 'superadmin'),
  candidatesController.getAllCandidates
);

/**
 * POST /api/candidates
 * Create new candidate
 * Access: admin, hr, superadmin
 */
router.post('/', requireRole('admin', 'hr', 'superadmin'), candidatesController.createCandidate);

export default router;
