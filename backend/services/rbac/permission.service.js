/**
 * Permission Service
 * Handles permission-related business logic
 */

import mongoose from 'mongoose';
import Permission from '../../models/rbac/permission.schema.js';
import Role from '../../models/rbac/role.schema.js';
import RolePermission from '../../models/rbac/rolePermission.schema.js';

/**
 * Get all permissions grouped by category
 */
export async function getGroupedPermissions() {
  try {
    const permissions = await Permission.getGroupedModules();
    return {
      success: true,
      data: permissions,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get all permissions (flat list)
 */
export async function getAllPermissions(filters = {}) {
  try {
    const { category, isActive = true } = filters;
    const query = { isActive };
    if (category) {
      query.category = category;
    }

    const permissions = await Permission.find(query).sort({ category: 1, sortOrder: 1 });
    return {
      success: true,
      data: permissions,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get permissions by category
 */
export async function getPermissionsByCategory(category) {
  try {
    const permissions = await Permission.getByCategory(category);
    return {
      success: true,
      data: permissions,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get a single permission by ID
 */
export async function getPermissionById(permissionId) {
  try {
    const permission = await Permission.findById(permissionId);
    if (!permission) {
      return {
        success: false,
        error: 'Permission not found',
      };
    }
    return {
      success: true,
      data: permission,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create a new permission
 */
export async function createPermission(permissionData) {
  try {
    // Check if permission with same module already exists
    const existing = await Permission.findOne({ module: permissionData.module });
    if (existing) {
      return {
        success: false,
        error: 'Permission with this module already exists',
      };
    }

    const permission = new Permission(permissionData);
    await permission.save();

    return {
      success: true,
      data: permission,
      message: 'Permission created successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update a permission
 */
export async function updatePermission(permissionId, updateData) {
  try {
    const permission = await Permission.findByIdAndUpdate(
      permissionId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!permission) {
      return {
        success: false,
        error: 'Permission not found',
      };
    }

    return {
      success: true,
      data: permission,
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
 * Delete a permission (soft delete)
 */
export async function deletePermission(permissionId) {
  try {
    const permission = await Permission.findByIdAndUpdate(
      permissionId,
      { isActive: false },
      { new: true }
    );

    if (!permission) {
      return {
        success: false,
        error: 'Permission not found',
      };
    }

    return {
      success: true,
      data: permission,
      message: 'Permission deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get role permissions with full permission details
 * Now uses embedded permissions in role document
 */
export async function getRolePermissions(roleId) {
  try {
    const role = await Role.findById(roleId)
      .select('permissions permissionStats displayName')
      .lean();

    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    // Check if role has embedded permissions
    if (!role.permissions || role.permissions.length === 0) {
      // Fallback to junction table for backward compatibility
      const rolePermissions = await RolePermission.getRolePermissions(roleId);

      // Group by category for UI
      const grouped = {};
      Object.values(rolePermissions).forEach(rp => {
        const category = rp.category;
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(rp);
      });

      return {
        success: true,
        data: {
          flat: rolePermissions,
          grouped: Object.entries(grouped).map(([category, perms]) => ({
            category,
            permissions: perms,
          })),
          source: 'junction',
        },
      };
    }

    // Use embedded permissions - group by category for UI
    const grouped = {};
    role.permissions.forEach(perm => {
      const category = perm.category;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(perm);
    });

    return {
      success: true,
      data: {
        flat: role.permissions,
        grouped: Object.entries(grouped).map(([category, perms]) => ({
          category,
          permissions: perms,
        })),
        source: 'embedded',
        permissionStats: role.permissionStats,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Set permissions for a role
 * Now uses embedded permissions structure
 */
export async function setRolePermissions(roleId, permissionsData, userId = null) {
  try {
    // Validate role exists
    const role = await Role.findById(roleId);
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    // Validate all permission IDs exist
    const permissionIds = permissionsData.map(p => typeof p.permissionId === 'string' ? new mongoose.Types.ObjectId(p.permissionId) : p.permissionId);
    const validPermissions = await Permission.find({ _id: { $in: permissionIds }, isActive: true });
    const validIds = validPermissions.map(p => p._id.toString());

    // Filter out invalid permission IDs
    const validPermissionsData = permissionsData.filter(p =>
      validIds.includes(typeof p.permissionId === 'string' ? p.permissionId : p.permissionId.toString())
    );

    // Build permissions array with all required fields
    const permissions = validPermissionsData.map(p => {
      const permDetails = validPermissions.find(vp =>
        vp._id.toString() === (typeof p.permissionId === 'string' ? p.permissionId : p.permissionId.toString())
      );
      return {
        permissionId: permDetails._id,
        module: permDetails.module,
        category: permDetails.category,
        displayName: permDetails.displayName,
        actions: p.actions || { all: false }
      };
    });

    // Calculate categories
    const categories = [...new Set(permissions.map(p => p.category))];

    // Update role with embedded permissions
    role.permissions = permissions;
    role.permissionStats = {
      totalPermissions: permissions.length,
      categories: categories,
      lastUpdatedAt: new Date()
    };
    role.updatedBy = userId;
    role.updatedAt = new Date();

    await role.save();

    // Also update junction table for backward compatibility
    await RolePermission.setRolePermissions(roleId, validPermissionsData, userId);

    return {
      success: true,
      message: `Updated ${permissions.length} permissions for role ${role.displayName}`,
      data: {
        totalPermissions: permissions.length,
        categories: categories,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if a role has a specific permission action
 * Now uses embedded permissions structure
 */
export async function checkRolePermission(roleId, module, action) {
  try {
    const role = await Role.findById(roleId).select('permissions').lean();

    if (!role) {
      console.error('Role not found:', roleId);
      return false;
    }

    // Check embedded permissions first
    if (role.permissions && role.permissions.length > 0) {
      for (const perm of role.permissions) {
        if (perm.module === module) {
          if (perm.actions.all) return true;
          return perm.actions[action] === true;
        }
      }
      return false;
    }

    // Fallback to junction table for backward compatibility
    const rolePermissions = await RolePermission.find({ roleId })
      .populate('permissionId')
      .lean();

    for (const rp of rolePermissions) {
      if (rp.permissionId && rp.permissionId.module === module) {
        if (rp.actions.all) return true;
        return rp.actions[action] === true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking role permission:', error);
    return false;
  }
}

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
};
