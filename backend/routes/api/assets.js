/**
 * Asset REST API Routes
 * All asset management endpoints
 */

import express from 'express';
import { authenticate, requireEmployeeActive } from '../../middleware/auth.js';
import assetController from '../../controllers/rest/asset.controller.js';

const router = express.Router();

// All routes require authentication AND active employee status
router.use(authenticate, requireEmployeeActive);

/**
 * @route   GET /api/assets
 * @desc    Get all assets with pagination and filtering
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/', assetController.getAssets);

/**
 * @route   GET /api/assets/category/:category
 * @desc    Get assets by category
 * @access  Private (All authenticated users)
 */
router.get('/category/:category', assetController.getAssetsByCategory);

/**
 * @route   GET /api/assets/status/:status
 * @desc    Get assets by status
 * @access  Private (All authenticated users)
 */
router.get('/status/:status', assetController.getAssetsByStatus);

/**
 * @route   GET /api/assets/stats
 * @desc    Get asset statistics
 * @access  Private (Admin, HR, Superadmin)
 */
router.get('/stats', assetController.getAssetStats);

/**
 * @route   GET /api/assets/:id
 * @desc    Get single asset by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', assetController.getAssetById);

/**
 * @route   POST /api/assets
 * @desc    Create new asset
 * @access  Private (Admin, HR, Superadmin)
 */
router.post('/', assetController.createAsset);

/**
 * @route   PUT /api/assets/:id
 * @desc    Update asset
 * @access  Private (Admin, HR, Superadmin)
 */
router.put('/:id', assetController.updateAsset);

/**
 * @route   DELETE /api/assets/:id
 * @desc    Delete asset (soft delete)
 * @access  Private (Admin, Superadmin)
 */
router.delete('/:id', assetController.deleteAsset);

export default router;
