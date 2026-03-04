/**
 * Client API Routes
 * REST API endpoints for Client management
 */

import express from 'express';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getClientsByAccountManager,
  getClientsByStatus,
  getClientsByTier,
  searchClients,
  getClientStats,
  updateClientDealStats,
  exportPDF,
  exportExcel
} from '../../controllers/rest/client.controller.js';
import {
  authenticate,
  requireRole,
  requireCompany,
  attachRequestId
} from '../../middleware/auth.js';
import {
  validateBody,
  validateQuery,
  clientSchemas
} from '../../middleware/validate.js';
import { exportLimiter } from '../../middleware/rateLimiting.js';  // ✅ SECURITY FIX - Phase 2: Rate limiting

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

/**
 * Public Routes (Authenticated users can access)
 */

// Get clients by account manager
router.get(
  '/account-manager/:managerId',
  authenticate,
  getClientsByAccountManager
);

// Get clients by status
router.get(
  '/status/:status',
  authenticate,
  getClientsByStatus
);

// Get clients by tier
router.get(
  '/tier/:tier',
  authenticate,
  getClientsByTier
);

// Search clients
router.get(
  '/search',
  authenticate,
  searchClients
);

// Get client statistics
router.get(
  '/stats',
  authenticate,
  requireRole('admin', 'hr', 'superadmin'),
  getClientStats
);

// Export clients as PDF
router.get(
  '/export/pdf',
  exportLimiter,  // ✅ SECURITY FIX - Phase 2: 10 exports per hour
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  exportPDF
);

// Export clients as Excel
router.get(
  '/export/excel',
  exportLimiter,  // ✅ SECURITY FIX - Phase 2: 10 exports per hour
  authenticate,
  requireCompany,
  requireRole('admin', 'hr', 'superadmin'),
  exportExcel
);

/**
 * Admin/HR Routes (Restricted access)
 */

// List all clients with pagination and filtering
router.get(
  '/',
  authenticate,
  validateQuery(clientSchemas.list),
  getClients
);

// Create new client
router.post(
  '/',
  authenticate,
  requireRole('admin', 'hr', 'superadmin'),
  validateBody(clientSchemas.create),
  createClient
);

/**
 * Individual Client Routes
 */

// Get single client by ID
router.get(
  '/:id',
  authenticate,
  getClientById
);

// Update client
router.put(
  '/:id',
  authenticate,
  requireRole('admin', 'hr', 'superadmin'),
  validateBody(clientSchemas.update),
  updateClient
);

// Delete client (soft delete)
router.delete(
  '/:id',
  authenticate,
  requireRole('admin', 'superadmin'),
  deleteClient
);

// Update deal statistics
router.patch(
  '/:id/deal-stats',
  authenticate,
  requireRole('admin', 'hr', 'superadmin'),
  updateClientDealStats
);

export default router;
