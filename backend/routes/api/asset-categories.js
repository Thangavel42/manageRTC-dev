/**
 * Asset Category REST API Routes
 * All asset category management endpoints
 */

import express from 'express';
import assetCategoryController from '../../controllers/rest/assetCategory.controller.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/asset-categories
 * @desc    Get all asset categories with pagination and filtering
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/', requireRole('admin', 'hr', 'superadmin'), assetCategoryController.getCategories);

/**
 * @route   GET /api/asset-categories/:id
 * @desc    Get single asset category by ID
 * @access  Private (Admin, HR, Superadmin)
 */
router.get(
  '/:id',
  requireRole('admin', 'hr', 'superadmin'),
  assetCategoryController.getCategoryById
);

/**
 * @route   POST /api/asset-categories
 * @desc    Create new asset category
 * @access  Private (Admin, Superadmin)
 */
router.post('/', requireRole('admin', 'superadmin'), assetCategoryController.createCategory);

/**
 * @route   PUT /api/asset-categories/:id
 * @desc    Update asset category
 * @access  Private (Admin, Superadmin)
 */
router.put('/:id', requireRole('admin', 'superadmin'), assetCategoryController.updateCategory);

/**
 * @route   DELETE /api/asset-categories/:id
 * @desc    Delete asset category
 * @access  Private (Admin, Superadmin)
 */
router.delete('/:id', requireRole('admin', 'superadmin'), assetCategoryController.deleteCategory);

export default router;
