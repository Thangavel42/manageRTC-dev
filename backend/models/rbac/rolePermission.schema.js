/**
 * Role Permission Schema (Junction Table)
 * Maps permissions to roles with action-level granularity
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

  // Reference to Permission
  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true,
    index: true,
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

// Indexes
rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

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

// Static method to get all permissions for a role
rolePermissionSchema.statics.getRolePermissions = async function(roleId) {
  const rolePermissions = await this.find({ roleId })
    .populate('permissionId')
    .lean();

  const result = {};
  rolePermissions.forEach(rp => {
    if (rp.permissionId) {
      result[rp.permissionId.module] = {
        permissionId: rp.permissionId._id,
        module: rp.permissionId.module,
        displayName: rp.permissionId.displayName,
        category: rp.permissionId.category,
        actions: rp.actions,
      };
    }
  });

  return result;
};

// Static method to set permissions for a role
rolePermissionSchema.statics.setRolePermissions = async function(roleId, permissionsData, userId = null) {
  // Delete existing permissions for this role
  await this.deleteMany({ roleId });

  // Create new permission entries
  const docs = permissionsData.map(p => ({
    roleId,
    permissionId: p.permissionId,
    actions: p.actions,
    updatedBy: userId,
  }));

  if (docs.length > 0) {
    await this.insertMany(docs);
  }

  return true;
};

export default mongoose.models.RolePermission || mongoose.model('RolePermission', rolePermissionSchema);
