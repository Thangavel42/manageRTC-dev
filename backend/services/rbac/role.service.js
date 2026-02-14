/**
 * Role Service (Junction Table Approach)
 * Handles role-related business logic
 * Permissions stored in role_permissions junction table (PRIMARY)
 */

import Role from '../../models/rbac/role.schema.js';
import RolePermission from '../../models/rbac/rolePermission.schema.js';

/**
 * Check if a role can create another role with specified level
 * SECURITY: Prevents privilege escalation
 * @param {String} creatorRoleId - Role ID of the user creating the role
 * @param {Number} targetLevel - Level of the role to be created
 * @returns {Boolean} - True if allowed
 */
export async function canCreateRoleWithLevel(creatorRoleId, targetLevel) {
  try {
    const creatorRole = await Role.findById(creatorRoleId).lean();
    if (!creatorRole) return false;

    // Super Admin (level 1) can create any role
    if (creatorRole.level === 1) return true;

    // System roles can only be created by Super Admin
    if (targetLevel <= 10 && creatorRole.level > 1) return false;

    // Can only create roles with equal or higher level number (lower privilege)
    return targetLevel >= creatorRole.level;
  } catch (error) {
    console.error('Error checking role creation permission:', error);
    return false;
  }
}

/**
 * Check if a role can assign another role
 * SECURITY: Prevents privilege escalation via role assignment
 * @param {String} assignerRoleId - Role ID of the user assigning the role
 * @param {String} targetRoleId - Role ID to be assigned
 * @returns {Boolean} - True if allowed
 */
export async function canAssignRole(assignerRoleId, targetRoleId) {
  try {
    const assignerRole = await Role.findById(assignerRoleId).lean();
    const targetRole = await Role.findById(targetRoleId).lean();

    if (!assignerRole || !targetRole) return false;

    // Super Admin can assign any role
    if (assignerRole.level === 1) return true;

    // Cannot assign system roles (level <= 10)
    if (targetRole.level <= 10) return false;

    // Cannot assign roles with higher privilege (lower level number)
    return targetRole.level >= assignerRole.level;
  } catch (error) {
    console.error('Error checking role assignment permission:', error);
    return false;
  }
}

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
 * Includes level-based security check
 */
export async function createRole(roleData, creatorRoleId = null) {
  try {
    // SECURITY: Check if creator's role can create role with this level
    if (creatorRoleId && roleData.level) {
      const canCreate = await canCreateRoleWithLevel(creatorRoleId, roleData.level);
      if (!canCreate) {
        return {
          success: false,
          error: 'You do not have permission to create a role with this privilege level',
        };
      }
    }

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
      createdBy: creatorRoleId,
      updatedBy: creatorRoleId,
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
 * Also removes permissions from junction table
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
    await role.save();

    // Delete permissions from junction table
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
 * Uses Junction Table for permission count
 */
export async function GetRolesWithPermissionSummary() {
  try {
    const roles = await Role.find({ isActive: true, isDeleted: false })
      .sort({ level: 1, displayName: 1 })
      .lean();

    // Get permission count from junction table for each role
    for (const role of roles) {
      const summary = await RolePermission.getPermissionSummary(role._id);
      role.permissionCount = summary.totalPermissions;
      role.categories = summary.categories;
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

export default {
  getAllRoles,
  getRoleById,
  getRoleByName,
  createRole,
  updateRole,
  deleteRole,
  GetRolesWithPermissionSummary,
  toggleRoleStatus,
  // Security helpers
  canCreateRoleWithLevel,
  canAssignRole,
};
