/**
 * Promotion REST API Routes
 * All promotion management endpoints
 */

import express from 'express';
import promotionController from '../../controllers/rest/promotion.controller.js';
import { attachRequestId, authenticate, requireCompany, requireRole } from '../../middleware/auth.js';
import { promotionSchemas, validateBody, validateQuery } from '../../middleware/validate.js';

const router = express.Router();

// Apply request ID middleware to all routes
router.use(attachRequestId);

// All routes require authentication and company association
router.use(authenticate);
router.use(requireCompany);

/**
 * @route   GET /api/promotions
 * @desc    Get all promotions
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/', requireRole('admin', 'hr', 'superadmin'), validateQuery(promotionSchemas.list), promotionController.getPromotions);

/**
 * @route   GET /api/promotions/stats
 * @desc    Get promotion statistics
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/stats', requireRole('admin', 'hr', 'superadmin'), promotionController.getPromotionStats);

/**
 * @route   GET /api/promotions/departments
 * @desc    Get departments for promotion selection
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/departments', requireRole('admin', 'hr', 'superadmin'), promotionController.getDepartments);

/**
 * @route   GET /api/promotions/designations
 * @desc    Get designations for promotion selection
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/designations', requireRole('admin', 'hr', 'superadmin'), promotionController.getDesignationsForPromotion);

/**
 * @route   GET /api/promotions/:id
 * @desc    Get single promotion by ID
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/:id', requireRole('admin', 'hr', 'superadmin'), promotionController.getPromotionById);

/**
 * @route   POST /api/promotions
 * @desc    Create new promotion
 * @access  Private (Admin, HR, Superadmin)
 */
router.post('/', requireRole('admin', 'hr', 'superadmin'), validateBody(promotionSchemas.create), promotionController.createPromotion);

/**
 * @route   PUT /api/promotions/:id
 * @desc    Update promotion
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id', requireRole('admin', 'hr', 'superadmin'), validateBody(promotionSchemas.update), promotionController.updatePromotion);

/**
 * @route   PUT /api/promotions/:id/apply
 * @desc    Apply promotion
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id/apply', requireRole('admin', 'hr', 'superadmin'), promotionController.applyPromotion);

/**
 * @route   PUT /api/promotions/:id/cancel
 * @desc    Cancel promotion
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id/cancel', requireRole('admin', 'hr', 'superadmin'), validateBody(promotionSchemas.cancel), promotionController.cancelPromotion);

/**
 * @route   DELETE /api/promotions/:id
 * @desc    Delete promotion (soft delete)
 * @access  Private (Admin, Superadmin)
 */
router.delete('/:id', requireRole('admin', 'superadmin'), promotionController.deletePromotion);

export default router;
