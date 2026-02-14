/**
 * Role Permission Schema (Junction Table - PRIMARY)
 * Maps pages to roles with action-level granularity
 * This is the PRIMARY storage for role permissions
 */

import mongoose from 'mongoose';

const rolePermissionSchema = new mongoose.Schema({
  // Reference to Role
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
    index: true,
  },

  // Reference to Page (PRIMARY - for direct page access control)
  pageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Page',
    required: true,
    index: true,
  },

  // Reference to Permission (for metadata lookup)
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: false,
    index: true,
  },

  // Module identifier (for backward compatibility and quick lookup)
  module: {
    type: String,
    required: true,
    index: true,
  },

  // Display name (denormalized for UI performance)
  displayName: {
    type: String,
    required: true,
  },

  // Category (denormalized for grouping)
  category: {
    type: String,
    required: true,
    index: true,
  },

  // Route path (denormalized from Page)
  route: {
    type: String,
    required: false,
  },

  // Permission Actions (checkbox values)
  actions: {
    all: {
      type: Boolean,
      default: false,
    },
    read: {
      type: Boolean,
      default: false,
    },
    create: {
      type: Boolean,
      default: false,
    },
    write: {
      type: Boolean,
      default: false,
    },
    delete: {
      type: Boolean,
      default: false,
    },
    import: {
      type: Boolean,
      default: false,
    },
    export: {
      type: Boolean,
      default: false,
    },
    approve: {
      type: Boolean,
      default: false,
    },
    assign: {
      type: Boolean,
      default: false,
    },
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  collection: 'role_permissions',
});

// ============================================
// COMPOUND INDEXES
// ============================================
// Primary index: role + page (unique combination)
rolePermissionSchema.index({ roleId: 1, pageId: 1 }, { unique: true });

// Secondary index: role + permission (for backward compatibility)
rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true, sparse: true });

// Query optimization indexes
rolePermissionSchema.index({ roleId: 1, category: 1 });
rolePermissionSchema.index({ roleId: 1, module: 1 });

// Pre-save middleware
rolePermissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();

  // If 'all' is true, set all other basic actions to true
  if (this.actions.all) {
    this.actions.read = true;
    this.actions.create = true;
    this.actions.write = true;
    this.actions.delete = true;
    this.actions.import = true;
    this.actions.export = true;
  }

  // If 'all' is unchecked, don't auto-uncheck others (user control)
  next();
});

// Method to check if specific action is allowed
rolePermissionSchema.methods.hasAction = function(action) {
  if (this.actions.all) return true;
  return this.actions[action] === true;
};

// ============================================
// STATIC METHODS - PRIMARY DATA ACCESS
// ============================================

/**
 * Get all permissions for a role (grouped by category)
 * PRIMARY METHOD - Returns from Junction Table
 */
rolePermissionSchema.statics.getRolePermissionsGrouped = async function(roleId) {
  const rolePermissions = await this.find({ roleId })
    .lean();

  // Group by category
  const grouped = rolePermissions.reduce((acc, rp) => {
    if (!acc[rp.category]) {
      acc[rp.category] = [];
    }
    acc[rp.category].push({
      permissionId: rp.permissionId,
      pageId: rp.pageId,
      module: rp.module,
      displayName: rp.displayName,
      category: rp.category,
      route: rp.route,
      actions: rp.actions,
    });
    return acc;
  }, {});

  // Convert to array format for frontend
  const result = {
    flat: rolePermissions.map(rp => ({
      permissionId: rp.permissionId,
      pageId: rp.pageId,
      module: rp.module,
      displayName: rp.displayName,
      category: rp.category,
      route: rp.route,
      actions: rp.actions,
    })),
    grouped: Object.entries(grouped).map(([category, permissions]) => ({
      category,
      permissions: permissions.sort((a, b) => a.module.localeCompare(b.module))
    })).sort((a, b) => a.category.localeCompare(b.category)),
    source: 'junction',
  };

  return result;
};

/**
 * Get flat permissions list for a role
 */
rolePermissionSchema.statics.getRolePermissionsFlat = async function(roleId) {
  return await this.find({ roleId }).lean();
};

/**
 * Get role permissions with populated page/permission data
 */
rolePermissionSchema.statics.getRolePermissionsPopulated = async function(roleId) {
  return await this.find({ roleId })
    .populate('pageId')
    .populate('permissionId')
    .lean();
};

/**
 * Set permissions for a role (replaces all)
 * PRIMARY METHOD - Updates Junction Table
 */
rolePermissionSchema.statics.setRolePermissions = async function(roleId, permissionsData, userId = null) {
  // Delete existing permissions for this role
  await this.deleteMany({ roleId });

  // Create new permission entries
  const docs = permissionsData.map(p => ({
    roleId,
    pageId: p.pageId,
    permissionId: p.permissionId,
    module: p.module,
    displayName: p.displayName,
    category: p.category,
    route: p.route,
    actions: p.actions || { all: false },
    updatedBy: userId,
  }));

  if (docs.length > 0) {
    await this.insertMany(docs);
  }

  return true;
};

/**
 * Update a single permission action
 */
rolePermissionSchema.statics.updateRolePermissionAction = async function(roleId, pageId, actions) {
  const updated = await this.findOneAndUpdate(
    { roleId, pageId },
    { $set: { actions, updatedAt: new Date() } },
    { new: true }
  );
  return updated;
};

/**
 * Check if role has specific page and action
 */
rolePermissionSchema.statics.hasPageAccess = async function(roleId, pageId, action = 'read') {
  const rp = await this.findOne({ roleId, pageId }).lean();
  if (!rp) return false;

  if (rp.actions.all) return true;
  return rp.actions[action] === true;
};

/**
 * Check if role has specific module and action
 */
rolePermissionSchema.statics.hasModuleAccess = async function(roleId, module, action = 'read') {
  const rp = await this.findOne({ roleId, module }).lean();
  if (!rp) return false;

  if (rp.actions.all) return true;
  return rp.actions[action] === true;
};

/**
 * Get all accessible pages for a role
 */
rolePermissionSchema.statics.getAccessiblePages = async function(roleId) {
  const rolePermissions = await this.find({ roleId })
    .populate('pageId')
    .lean();

  return rolePermissions
    .filter(rp => rp.pageId)
    .map(rp => ({
      pageId: rp.pageId._id,
      route: rp.pageId.route,
      module: rp.module,
      displayName: rp.displayName,
      actions: rp.actions,
    }));
};

/**
 * Get permission count summary for a role
 */
rolePermissionSchema.statics.getPermissionSummary = async function(roleId) {
  const rolePermissions = await this.find({ roleId }).lean();

  const categories = [...new Set(rolePermissions.map(rp => rp.category))];
  const totalPermissions = rolePermissions.length;

  return {
    totalPermissions,
    categories,
  };
};

export default mongoose.models.RolePermission || mongoose.model('RolePermission', rolePermissionSchema);
