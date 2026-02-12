/**
 * Role Controller
 * Handles HTTP requests for roles
 */

import roleService from '../../services/rbac/role.service.js';
import permissionService from '../../services/rbac/permission.service.js';

/**
 * Get all roles
 * @route GET /api/rbac/roles
 */
export const getAllRoles = async (req, res) => {
  const { type, isActive, includeDeleted } = req.query;

  const filters = {};
  if (type) filters.type = type;
  if (isActive !== undefined) filters.isActive = isActive === 'true';
  if (includeDeleted !== undefined) filters.includeDeleted = includeDeleted === 'true';

  const result = await roleService.getAllRoles(filters);

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
 * Get a single role by ID
 * @route GET /api/rbac/roles/:id
 */
export const getRoleById = async (req, res) => {
  const { id } = req.params;

  const result = await roleService.getRoleById(id);

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
 * Create a new role
 * @route POST /api/rbac/roles
 */
export const createRole = async (req, res) => {
  const userId = req.user?.id || null;

  const result = await roleService.createRole(req.body, userId);

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
 * Update a role
 * @route PUT /api/rbac/roles/:id
 */
export const updateRole = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id || null;

  const result = await roleService.updateRole(id, req.body, userId);

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
 * Delete a role (soft delete)
 * @route DELETE /api/rbac/roles/:id
 */
export const deleteRole = async (req, res) => {
  const { id } = req.params;

  const result = await roleService.deleteRole(id);

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
 * Get roles with permission summary
 * @route GET /api/rbac/roles/with-summary
 */
export const getRolesWithSummary = async (req, res) => {
  const result = await roleService.GetRolesWithPermissionSummary();

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
 * Toggle role active status
 * @route PATCH /api/rbac/roles/:id/toggle-status
 */
export const toggleRoleStatus = async (req, res) => {
  const { id } = req.params;

  const result = await roleService.toggleRoleStatus(id);

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
 * Clone a role
 * @route POST /api/rbac/roles/:id/clone
 */
export const cloneRole = async (req, res) => {
  const { id } = req.params;
  const { name, displayName } = req.body;
  const userId = req.user?.id || null;

  // Get source role
  const sourceResult = await roleService.getRoleById(id);
  if (!sourceResult.success) {
    return res.status(404).json({
      success: false,
      error: { message: 'Source role not found' },
    });
  }

  const sourceRole = sourceResult.data;

  // Create new role with same properties
  const newRoleData = {
    name: name || `${sourceRole.name}-copy`,
    displayName: displayName || `${sourceRole.displayName} (Copy)`,
    description: sourceRole.description,
    type: 'custom',
    level: sourceRole.level + 1,
  };

  const createResult = await roleService.createRole(newRoleData, userId);
  if (!createResult.success) {
    return res.status(400).json({
      success: false,
      error: { message: createResult.error },
    });
  }

  const newRole = createResult.data;

  // Copy permissions
  const permissionsResult = await permissionService.getRolePermissions(id);
  if (permissionsResult.success && permissionsResult.data.flat) {
    const permissionsData = Object.values(permissionsResult.data.flat).map(p => ({
      permissionId: p.permissionId,
      actions: p.actions,
    }));

    await permissionService.setRolePermissions(newRole._id, permissionsData, userId);
  }

  return res.status(201).json({
    success: true,
    data: newRole,
    message: 'Role cloned successfully',
  });
};

export default {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRolesWithSummary,
  toggleRoleStatus,
  cloneRole,
};
