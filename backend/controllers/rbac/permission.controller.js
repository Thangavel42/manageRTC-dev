/**
 * Permission Controller
 * Handles HTTP requests for permissions
 */

import permissionService from '../../services/rbac/permission.service.js';

/**
 * Get all permissions grouped by category
 * @route GET /api/rbac/permissions/grouped
 */
export const getGroupedPermissions = async (req, res) => {
  const result = await permissionService.getGroupedPermissions();

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Get all permissions (flat list or filtered by category)
 * @route GET /api/rbac/permissions
 */
export const getAllPermissions = async (req, res) => {
  const { category, isActive } = req.query;

  const filters = {};
  if (category) filters.category = category;
  if (isActive !== undefined) filters.isActive = isActive === 'true';

  const result = await permissionService.getAllPermissions(filters);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Get permissions by category
 * @route GET /api/rbac/permissions/category/:category
 */
export const getPermissionsByCategory = async (req, res) => {
  const { category } = req.params;

  const result = await permissionService.getPermissionsByCategory(category);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Get a single permission by ID
 * @route GET /api/rbac/permissions/:id
 */
export const getPermissionById = async (req, res) => {
  const { id } = req.params;

  const result = await permissionService.getPermissionById(id);

  if (!result.success) {
    return res.status(404).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
  });
};

/**
 * Create a new permission
 * @route POST /api/rbac/permissions
 */
export const createPermission = async (req, res) => {
  const result = await permissionService.createPermission(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.status(201).json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

/**
 * Update a permission
 * @route PUT /api/rbac/permissions/:id
 */
export const updatePermission = async (req, res) => {
  const { id } = req.params;

  const result = await permissionService.updatePermission(id, req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

/**
 * Delete a permission (soft delete)
 * @route DELETE /api/rbac/permissions/:id
 */
export const deletePermission = async (req, res) => {
  const { id } = req.params;

  const result = await permissionService.deletePermission(id);

  if (!result.success) {
    return res.status(404).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    data: result.data,
    message: result.message,
  });
};

/**
 * Get role permissions with full details
 * @route GET /api/rbac/roles/:roleId/permissions
 * @returns {Object} Response with grouped permissions and stats
 */
export const getRolePermissions = async (req, res) => {
  const { roleId } = req.params;

  const result = await permissionService.getRolePermissions(roleId);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  // Enhanced response with source info
  return res.json({
    success: true,
    data: result.data,
    meta: {
      source: result.data.source, // 'embedded' or 'junction'
      totalPermissions: result.data.flat?.length || 0,
      categories: result.data.grouped?.length || 0,
      permissionStats: result.data.permissionStats || null
    }
  });
};

/**
 * Set permissions for a role
 * @route PUT /api/rbac/roles/:roleId/permissions
 * @body {Array} permissions - Array of {permissionId, actions}
 */
export const setRolePermissions = async (req, res) => {
  const { roleId } = req.params;
  const { permissions } = req.body;
  const userId = req.user?.id || null;

  if (!Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      error: { message: 'Permissions must be an array' },
    });
  }

  const result = await permissionService.setRolePermissions(roleId, permissions, userId);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  // Enhanced response with stats
  return res.json({
    success: true,
    message: result.message,
    data: result.data,
  });
};

/**
 * Check if role has specific permission
 * @route GET /api/rbac/roles/:roleId/check-permission
 * @query {String} module - Permission module (e.g., 'hrm.employees-list')
 * @query {String} action - Action to check (e.g., 'read', 'write')
 */
export const checkRolePermission = async (req, res) => {
  const { roleId } = req.params;
  const { module, action = 'read' } = req.query;

  if (!module) {
    return res.status(400).json({
      success: false,
      error: { message: 'Module parameter is required' },
    });
  }

  const result = await permissionService.checkRolePermission(roleId, module, action);

  return res.json({
    success: true,
    data: {
      hasPermission: result,
      module,
      action
    }
  });
};

/**
 * Update a single permission action for a role
 * @route PATCH /api/rbac/roles/:roleId/permissions/:permissionId
 * @body {Object} actions - Actions object {read: true, write: false, ...}
 */
export const updateRolePermissionAction = async (req, res) => {
  const { roleId, permissionId } = req.params;
  const { actions } = req.body;

  if (!actions || typeof actions !== 'object') {
    return res.status(400).json({
      success: false,
      error: { message: 'Actions object is required' },
    });
  }

  // Import role service for this specific method
  const roleService = await import('../../services/rbac/role.service.js');
  const result = await roleService.updateRolePermissionAction(roleId, permissionId, actions);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: result.error },
    });
  }

  return res.json({
    success: true,
    message: result.message,
    data: result.data,
  });
};

export default {
  getGroupedPermissions,
  getAllPermissions,
  getPermissionsByCategory,
  getPermissionById,
  createPermission,
  updatePermission,
  deletePermission,
  getRolePermissions,
  setRolePermissions,
  checkRolePermission,
  updateRolePermissionAction,
};
