/**
 * Termination REST API Routes
 * All termination management endpoints
 */

import express from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate, validateBody, validateQuery, validateParams } from '../../middleware/validate.js';
import { terminationSchemas, commonSchemas } from '../../middleware/validate.js';
import terminationController from '../../controllers/rest/termination.controller.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/terminations/stats
 * @desc    Get termination statistics
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/stats', requireRole('admin', 'hr', 'superadmin'), terminationController.getStats);

/**
 * @route   GET /api/terminations
 * @desc    Get all terminations
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/', requireRole('admin', 'hr', 'superadmin'), validateQuery(terminationSchemas.list), terminationController.getAllTerminations);

/**
 * @route   GET /api/terminations/:id
 * @desc    Get single termination by ID
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/:id', requireRole('admin', 'hr', 'superadmin'), validateParams(commonSchemas.objectId), terminationController.getTerminationById);

/**
 * @route   POST /api/terminations
 * @desc    Create new termination
 * @access  Private (Admin, Superadmin)
 */
router.post('/', requireRole('admin', 'superadmin'), validateBody(terminationSchemas.create), terminationController.createTermination);

/**
 * @route   PUT /api/terminations/:id
 * @desc    Update termination
 * @access  Private (Admin, Superadmin)
 */
router.put('/:id', requireRole('admin', 'superadmin'), validateParams(commonSchemas.objectId), validateBody(terminationSchemas.update), terminationController.updateTerminationById);

/**
 * @route   PUT /api/terminations/:id/process
 * @desc    Process termination (mark as complete)
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id/process', requireRole('admin', 'hr', 'superadmin'), validateParams(commonSchemas.objectId), terminationController.processTerminationById);

/**
 * @route   PUT /api/terminations/:id/cancel
 * @desc    Cancel termination
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id/cancel', requireRole('admin', 'hr', 'superadmin'), validateParams(commonSchemas.objectId), validateBody(terminationSchemas.cancel), terminationController.cancelTerminationById);

/**
 * @route   DELETE /api/terminations
 * @desc    Delete terminations (bulk delete)
 * @access  Private (Admin, Superadmin)
 */
router.delete('/', requireRole('admin', 'superadmin'), terminationController.deleteTerminations);

export default router;
