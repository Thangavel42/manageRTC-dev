/**
 * Sub-Contract API Routes
 * REST API endpoints for Sub-Contract management
 */

import express from 'express';
import {
  createSubContract,
  deleteSubContract,
  getAllSubContracts,
  getSubContractById,
  getSubContractStats,
  updateSubContract,
} from '../../controllers/project/subcontract.controller.js';
import { attachRequestId, authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

/**
 * Sub-Contract Routes
 */

// Get sub-contract statistics
router.get('/stats', authenticate, requireRole('admin', 'hr', 'superadmin'), getSubContractStats);

// Get all sub-contracts
router.get('/', authenticate, getAllSubContracts);

// Get single sub-contract by ID
router.get('/:id', authenticate, getSubContractById);

// Create new sub-contract
router.post('/', authenticate, requireRole('admin', 'hr', 'superadmin'), createSubContract);

// Update sub-contract
router.put('/:id', authenticate, requireRole('admin', 'hr', 'superadmin'), updateSubContract);

// Delete sub-contract
router.delete('/:id', authenticate, requireRole('admin', 'hr', 'superadmin'), deleteSubContract);

export default router;
