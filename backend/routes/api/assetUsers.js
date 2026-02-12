/**
 * AssetUser REST API Routes
 * All asset assignment management endpoints
 */

import express from 'express';
import * as assetUserController from '../../controllers/rest/assetUser.controller.js';
import { authenticate } from '../../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/asset-users
 * @desc    Get all asset assignments with pagination and filtering
 * @access  Private (Admin, HR, Manager, Superadmin)
 */
router.get('/', assetUserController.getAssetUsers);

/**
 * @route   GET /api/asset-users/asset/:assetId/history
 * @desc    Get asset assignment history for a specific asset
 * @access  Private (Admin, HR, Manager, Superadmin)
 */
router.get('/asset/:assetId/history', assetUserController.getAssetHistory);

/**
 * @route   GET /api/asset-users/employee/:employeeId
 * @desc    Get all assets assigned to a specific employee
 * @access  Private (Admin, HR, Manager, Employee, Superadmin)
 */
router.get('/employee/:employeeId', assetUserController.getEmployeeAssets);

/**
 * @route   GET /api/asset-users/:id
 * @desc    Get single asset assignment by ID
 * @access  Private (Admin, HR, Manager, Superadmin)
 */
router.get('/:id', assetUserController.getAssetUserById);

/**
 * @route   POST /api/asset-users
 * @desc    Create new asset assignment
 * @access  Private (Admin, HR, Manager, Superadmin)
 */
router.post('/', assetUserController.createAssetUser);

/**
 * @route   PUT /api/asset-users/:id
 * @desc    Update asset assignment
 * @access  Private (Admin, HR, Manager, Superadmin)
 */
router.put('/:id', assetUserController.updateAssetUser);

/**
 * @route   DELETE /api/asset-users/:id
 * @desc    Delete asset assignment (soft delete)
 * @access  Private (Admin, Superadmin)
 */
router.delete('/:id', assetUserController.deleteAssetUser);

export default router;
