/**
 * Role Service
 * Handles role-related business logic
 * Now uses embedded permissions structure (no junction table)
 */

import Role from '../../models/rbac/role.schema.js';
import Permission from '../../models/rbac/permission.schema.js';
// Keep RolePermission import for backward compatibility during migration
import RolePermission from '../../models/rbac/rolePermission.schema.js';

/**
 * Get all active roles
 */
export async function getAllRoles(filters = {}) {
  try {
    const { type, isActive = true, includeDeleted = false } = filters;

    const query = { isActive };
    if (!includeDeleted) {
      query.isDeleted = false;
    }
    if (type) {
      query.type = type;
    }

    const roles = await Role.find(query).sort({ level: 1, displayName: 1 });

    return {
      success: true,
      data: roles,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get a single role by ID
 */
export async function getRoleById(roleId) {
  try {
    const role = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    return {
      success: true,
      data: role,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get role by name
 */
export async function getRoleByName(roleName) {
  try {
    const role = await Role.findOne({ name: roleName, isDeleted: false });
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    return {
      success: true,
      data: role,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create a new role
 */
export async function createRole(roleData, userId = null) {
  try {
    // Check if role name already exists
    const nameExists = await Role.nameExists(roleData.name);
    if (nameExists) {
      return {
        success: false,
        error: 'Role with this name already exists',
      };
    }

    // Create role
    const role = new Role({
      ...roleData,
      createdBy: userId,
      updatedBy: userId,
    });
    await role.save();

    return {
      success: true,
      data: role,
      message: 'Role created successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update a role
 */
export async function updateRole(roleId, updateData, userId = null) {
  try {
    // Check if role exists
    const existingRole = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!existingRole) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    // If updating name, check for duplicates
    if (updateData.name && updateData.name !== existingRole.name) {
      const nameExists = await Role.nameExists(updateData.name, roleId);
      if (nameExists) {
        return {
          success: false,
          error: 'Role with this name already exists',
        };
      }
    }

    // Prevent changing system role type
    if (existingRole.type === 'system' && updateData.type && updateData.type !== 'system') {
      return {
        success: false,
        error: 'Cannot change system role type',
      };
    }

    // Update role
    const role = await Role.findByIdAndUpdate(
      roleId,
      {
        $set: {
          ...updateData,
          updatedBy: userId,
        },
      },
      { new: true, runValidators: true }
    );

    return {
      success: true,
      data: role,
      message: 'Role updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Delete a role (soft delete)
 */
export async function deleteRole(roleId) {
  try {
    const role = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    // Prevent deleting system roles
    if (role.type === 'system') {
      return {
        success: false,
        error: 'Cannot delete system roles',
      };
    }

    // Soft delete the role
    role.isDeleted = true;
    role.deletedAt = new Date();
    role.isActive = false;

    // Clear embedded permissions
    role.permissions = [];
    role.permissionStats = {
      totalPermissions: 0,
      categories: [],
      lastUpdatedAt: new Date()
    };

    await role.save();

    // Also delete from junction table for backward compatibility
    await RolePermission.deleteMany({ roleId });

    return {
      success: true,
      data: { _id: role._id },
      message: 'Role deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get roles with their permission summary
 * Now uses embedded permissions array instead of junction table
 */
export async function GetRolesWithPermissionSummary() {
  try {
    const roles = await Role.find({ isActive: true, isDeleted: false })
      .sort({ level: 1, displayName: 1 })
      .lean();

    // Use embedded permissions count for each role
    for (const role of roles) {
      // Check if using new embedded structure
      if (role.permissions && Array.isArray(role.permissions)) {
        role.permissionCount = role.permissions.length;
        role.categories = role.permissionStats?.categories || [];
      } else {
        // Fallback to junction table for backward compatibility
        const permissionCount = await RolePermission.countDocuments({ roleId: role._id });
        role.permissionCount = permissionCount;
        role.categories = [];
      }
    }

    return {
      success: true,
      data: roles,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Toggle role active status
 */
export async function toggleRoleStatus(roleId) {
  try {
    const role = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    role.isActive = !role.isActive;
    await role.save();

    return {
      success: true,
      data: role,
      message: `Role ${role.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// EMBEDDED PERMISSIONS METHODS (New Structure)
// ============================================

/**
 * Get all permissions for a role (grouped by category)
 */
export async function getRolePermissionsGrouped(roleId) {
  try {
    const role = await Role.findById(roleId).select('permissions permissionStats').lean();
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    // Group permissions by category
    const grouped = role.permissions?.reduce((acc, perm) => {
      if (!acc[perm.category]) {
        acc[perm.category] = [];
      }
      acc[perm.category].push(perm);
      return acc;
    }, {}) || {};

    const result = Object.entries(grouped).map(([category, permissions]) => ({
      category,
      permissions: permissions.sort((a, b) => a.module.localeCompare(b.module))
    })).sort((a, b) => a.category.localeCompare(b.category));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Set all permissions for a role
 */
export async function setRolePermissions(roleId, permissionsData) {
  try {
    const role = await Role.findById(roleId);
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    // Build permissions array with all required fields
    const permissions = await Promise.all(permissionsData.map(async (p) => {
      const perm = await Permission.findById(p.permissionId);
      if (!perm) {
        throw new Error(`Permission not found: ${p.permissionId}`);
      }

      return {
        permissionId: perm._id,
        module: perm.module,
        category: perm.category,
        displayName: perm.displayName,
        actions: p.actions || { all: false }
      };
    }));

    // Calculate categories
    const categories = [...new Set(permissions.map(p => p.category))];

    // Update role with embedded permissions
    role.permissions = permissions;
    role.permissionStats = {
      totalPermissions: permissions.length,
      categories: categories,
      lastUpdatedAt: new Date()
    };
    role.updatedAt = new Date();

    await role.save();

    return {
      success: true,
      data: role,
      message: `Updated ${permissions.length} permissions for role ${role.displayName}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update a single permission action for a role
 */
export async function updateRolePermissionAction(roleId, permissionId, actions) {
  try {
    const role = await Role.findById(roleId);
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    // Find and update the permission
    const permIndex = role.permissions.findIndex(p => p.permissionId.toString() === permissionId);
    if (permIndex === -1) {
      return {
        success: false,
        error: 'Permission not found in role',
      };
    }

    // Update actions
    role.permissions[permIndex].actions = actions;
    role.updatedAt = new Date();
    role.permissionStats.lastUpdatedAt = new Date();

    await role.save();

    return {
      success: true,
      data: role,
      message: 'Permission updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if role has specific permission and action
 */
export async function checkRolePermission(roleId, module, action = 'read') {
  try {
    const role = await Role.findById(roleId).select('permissions').lean();
    if (!role) {
      return {
        success: false,
        hasPermission: false,
        error: 'Role not found',
      };
    }

    const perm = role.permissions?.find(p => p.module === module);
    if (!perm) {
      return {
        success: true,
        hasPermission: false,
      };
    }

    // Check 'all' first
    if (perm.actions.all) {
      return {
        success: true,
        hasPermission: true,
      };
    }

    // Check specific action
    const hasPermission = perm.actions[action] || false;

    return {
      success: true,
      hasPermission,
    };
  } catch (error) {
    return {
      success: false,
      hasPermission: false,
      error: error.message,
    };
  }
}

/**
 * Get role with all permissions (populated)
 */
export async function getRoleWithPermissions(roleId) {
  try {
    const role = await Role.findById(roleId).lean();
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    return {
      success: true,
      data: role,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  getAllRoles,
  getRoleById,
  getRoleByName,
  createRole,
  updateRole,
  deleteRole,
  GetRolesWithPermissionSummary,
  toggleRoleStatus,
  // New methods
  getRolePermissionsGrouped,
  setRolePermissions,
  updateRolePermissionAction,
  checkRolePermission,
  getRoleWithPermissions,
};
