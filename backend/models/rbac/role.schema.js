/**
 * Role Schema
 * Defines user roles that can be assigned permissions
 */

import mongoose from 'mongoose';

const roleSchema = new mongoose.Schema({
  // Role Name (unique identifier)
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },

  // Display Name (for UI)
  displayName: {
    type: String,
    required: true,
    trim: true,
  },

  // Description
  description: {
    type: String,
    trim: true,
    default: '',
  },

  // Role Type
  type: {
    type: String,
    enum: ['system', 'custom'],
    default: 'custom',
  },

  // Hierarchy Level (lower = higher priority)
  level: {
    type: Number,
    required: true,
    default: 100,
    min: 1,
    max: 100,
  },

  // Is Active
  isActive: {
    type: Boolean,
    default: true,
  },

  // Is Default Role
  isDefault: {
    type: Boolean,
    default: false,
  },

  // User Count (for reference, updated by service)
  userCount: {
    type: Number,
    default: 0,
  },

  // Soft Delete
  isDeleted: {
    type: Boolean,
    default: false,
  },

  deletedAt: {
    type: Date,
    default: null,
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // ============================================
  // EMBEDDED PERMISSIONS (New Structure)
  // ============================================
  // Stores all permissions assigned to this role
  // This replaces the rolePermissions junction table
  permissions: [{
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permission',
      required: true
    },
    module: {
      type: String, // e.g., 'super-admin.dashboard', 'hrm.employees-list'
      required: true
    },
    category: {
      type: String, // e.g., 'super-admin', 'hrm', 'projects'
      required: true
    },
    displayName: {
      type: String, // e.g., 'Dashboard', 'Employees List'
      required: true
    },
    // Permission actions
    actions: {
      all: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
      approve: { type: Boolean, default: false },
      assign: { type: Boolean, default: false },
    }
  }],

  // Permission summary stats (cached for performance)
  permissionStats: {
    totalPermissions: { type: Number, default: 0 },
    categories: [{ type: String }], // List of categories this role has access to
    lastUpdatedAt: { type: Date, default: Date.now }
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  collection: 'roles',
});

// Indexes
roleSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
roleSchema.index({ isActive: 1, isDeleted: 1 });
roleSchema.index({ type: 1 });
roleSchema.index({ level: 1 });
// New indexes for embedded permissions
roleSchema.index({ 'permissions.module': 1 });
roleSchema.index({ 'permissions.permissionId': 1 });
roleSchema.index({ 'permissions.category': 1 });

// Pre-save middleware
roleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Prevent modification of system roles' critical fields
roleSchema.pre('save', function(next) {
  if (this.type === 'system' && this.isModified('level')) {
    // Only allow level modification for system roles if explicitly intended
    const originalLevel = this._doc.level;
    if (originalLevel !== undefined && this.level !== originalLevel) {
      return next(new Error('Cannot modify system role level'));
    }
  }
  next();
});

// Virtual for role permissions (kept for backward compatibility during migration)
roleSchema.virtual('rolePermissions', {
  ref: 'RolePermission',
  localField: '_id',
  foreignField: 'roleId',
  justOne: false,
});

// Static method to get active roles
roleSchema.statics.getActiveRoles = function() {
  return this.find({ isActive: true, isDeleted: false }).sort({ level: 1, displayName: 1 });
};

// Static method to get system roles
roleSchema.statics.getSystemRoles = function() {
  return this.find({ type: 'system', isActive: true, isDeleted: false }).sort({ level: 1 });
};

// Static method to get custom roles
roleSchema.statics.getCustomRoles = function() {
  return this.find({ type: 'custom', isActive: true, isDeleted: false }).sort({ displayName: 1 });
};

// Static method to check if role name exists
roleSchema.statics.nameExists = async function(name, excludeId = null) {
  const query = { name, isDeleted: false };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const count = await this.countDocuments(query);
  return count > 0;
};

// ============================================
// EMBEDDED PERMISSIONS METHODS
// ============================================

// Static method to check if role has specific permission and action
roleSchema.statics.hasPermission = async function(roleId, module, action = 'read') {
  const role = await this.findById(roleId).select('permissions');
  if (!role) return false;

  const perm = role.permissions.find(p => p.module === module);
  if (!perm) return false;

  // Check 'all' first
  if (perm.actions.all) return true;

  // Check specific action
  return perm.actions[action] || false;
};

// Static method to get permissions grouped by category
roleSchema.statics.getPermissionsGrouped = async function(roleId) {
  const role = await this.findById(roleId).select('permissions');
  if (!role) return [];

  const grouped = role.permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {});

  return Object.entries(grouped).map(([category, permissions]) => ({
    category,
    permissions
  }));
};

// Static method to set/update all permissions for a role
roleSchema.statics.setAllPermissions = async function(roleId, permissionsData) {
  // Update permissions and recalculate stats
  const role = await this.findByIdAndUpdate(
    roleId,
    {
      $set: {
        permissions: permissionsData,
        'permissionStats.totalPermissions': permissionsData.length,
        'permissionStats.lastUpdatedAt': new Date()
      },
      $addToSet: {
        'permissionStats.categories': { $each: [...new Set(permissionsData.map(p => p.category))] }
      }
    },
    { new: true }
  );

  return role;
};

// Static method to update a single permission action
roleSchema.statics.updatePermissionAction = async function(roleId, permissionId, actions) {
  const role = await this.findOneAndUpdate(
    {
      _id: roleId,
      'permissions.permissionId': permissionId
    },
    {
      $set: {
        'permissions.$.actions': actions,
        'permissionStats.lastUpdatedAt': new Date()
      }
    },
    { new: true }
  );

  return role;
};

// Static method to add a permission to a role
roleSchema.statics.addPermission = async function(roleId, permissionData) {
  const role = await this.findByIdAndUpdate(
    roleId,
    {
      $push: { permissions: permissionData },
      $inc: { 'permissionStats.totalPermissions': 1 },
      $addToSet: { 'permissionStats.categories': permissionData.category }
    },
    { new: true }
  );

  return role;
};

// Static method to remove a permission from a role
roleSchema.statics.removePermission = async function(roleId, permissionId) {
  const role = await this.findByIdAndUpdate(
    roleId,
    {
      $pull: { permissions: { permissionId } },
      $inc: { 'permissionStats.totalPermissions': -1 }
    },
    { new: true }
  );

  // Recalculate categories
  if (role) {
    const categories = [...new Set(role.permissions.map(p => p.category))];
    role.permissionStats.categories = categories;
    await role.save();
  }

  return role;
};

export default mongoose.models.Role || mongoose.model('Role', roleSchema);
