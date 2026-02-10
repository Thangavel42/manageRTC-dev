/**
 * RBAC Permissions Routes
 * API endpoints for permission management
 */

import express from 'express';
import permissionController from '../../../controllers/rbac/permission.controller.js';

const router = express.Router();

/**
 * @route   GET /api/rbac/permissions/grouped
 * @desc    Get all permissions grouped by category
 * @access  Private
 */
router.get('/grouped', permissionController.getGroupedPermissions);

/**
 * @route   GET /api/rbac/permissions
 * @desc    Get all permissions (flat list or filtered)
 * @access  Private
 */
router.get('/', permissionController.getAllPermissions);

/**
 * @route   GET /api/rbac/permissions/category/:category
 * @desc    Get permissions by category
 * @access  Private
 */
router.get('/category/:category', permissionController.getPermissionsByCategory);

/**
 * @route   GET /api/rbac/permissions/:id
 * @desc    Get a single permission by ID
 * @access  Private
 */
router.get('/:id', permissionController.getPermissionById);

/**
 * @route   POST /api/rbac/permissions
 * @desc    Create a new permission
 * @access  Private (Admin/Super Admin only)
 */
router.post('/', permissionController.createPermission);

/**
 * @route   PUT /api/rbac/permissions/:id
 * @desc    Update a permission
 * @access  Private (Admin/Super Admin only)
 */
router.put('/:id', permissionController.updatePermission);

/**
 * @route   DELETE /api/rbac/permissions/:id
 * @desc    Delete a permission (soft delete)
 * @access  Private (Super Admin only)
 */
router.delete('/:id', permissionController.deletePermission);

export default router;
