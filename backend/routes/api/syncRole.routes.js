/**
 * Sync Role API Routes
 * Provides endpoint to sync employee roles from MongoDB to Clerk
 */

import express from 'express';
import { syncRoleToClerk } from '../../controllers/rest/syncRole.controller.js';
import { attachRequestId, authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

/**
 * POST /api/sync-role
 * Sync employee role from MongoDB to Clerk
 * Body: { "email": "employee@example.com" }
 */
router.post(
  '/',
  authenticate,
  requireRole('admin', 'superadmin'),
  syncRoleToClerk
);

export default router;
