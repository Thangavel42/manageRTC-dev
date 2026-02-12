/**
 * RBAC Roles Routes
 * API endpoints for role management
 */

import express from 'express';
import roleController from '../../../controllers/rbac/role.controller.js';
import permissionController from '../../../controllers/rbac/permission.controller.js';

const router = express.Router();

/**
 * @route   GET /api/rbac/roles/with-summary
 * @desc    Get all roles with permission count summary
 * @access  Private
 */
router.get('/with-summary', roleController.getRolesWithSummary);

/**
 * @route   GET /api/rbac/roles
 * @desc    Get all roles
 * @access  Private
 */
router.get('/', roleController.getAllRoles);

/**
 * @route   POST /api/rbac/roles
 * @desc    Create a new role
 * @access  Private (Admin/Super Admin only)
 */
router.post('/', roleController.createRole);

/**
 * @route   GET /api/rbac/roles/:id
 * @desc    Get a single role by ID
 * @access  Private
 */
router.get('/:id', roleController.getRoleById);

/**
 * @route   PUT /api/rbac/roles/:id
 * @desc    Update a role
 * @access  Private (Admin/Super Admin only)
 */
router.put('/:id', roleController.updateRole);

/**
 * @route   DELETE /api/rbac/roles/:id
 * @desc    Delete a role (soft delete)
 * @access  Private (Super Admin only)
 */
router.delete('/:id', roleController.deleteRole);

/**
 * @route   PATCH /api/rbac/roles/:id/toggle-status
 * @desc    Toggle role active status
 * @access  Private (Admin/Super Admin only)
 */
router.patch('/:id/toggle-status', roleController.toggleRoleStatus);

/**
 * @route   POST /api/rbac/roles/:id/clone
 * @desc    Clone a role
 * @access  Private (Admin/Super Admin only)
 */
router.post('/:id/clone', roleController.cloneRole);

/**
 * @route   GET /api/rbac/roles/:roleId/permissions
 * @desc    Get role permissions with full details (supports embedded structure)
 * @access  Private
 */
router.get('/:roleId/permissions', permissionController.getRolePermissions);

/**
 * @route   PUT /api/rbac/roles/:roleId/permissions
 * @desc    Set all permissions for a role
 * @access  Private (Admin/Super Admin only)
 */
router.put('/:roleId/permissions', permissionController.setRolePermissions);

/**
 * @route   PATCH /api/rbac/roles/:roleId/permissions/:permissionId
 * @desc    Update a single permission action for a role
 * @access  Private (Admin/Super Admin only)
 */
router.patch('/:roleId/permissions/:permissionId', permissionController.updateRolePermissionAction);

/**
 * @route   GET /api/rbac/roles/:roleId/check-permission
 * @desc    Check if role has specific permission and action
 * @access  Private
 */
router.get('/:roleId/check-permission', permissionController.checkRolePermission);

export default router;
