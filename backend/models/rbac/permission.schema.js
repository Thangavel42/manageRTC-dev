/**
 * Permission Schema
 * Defines individual permissions that can be assigned to roles
 */

import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  // Module Identifier (e.g., 'hrm.employees', 'projects.tasks')
  module: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },

  // Display Name
  displayName: {
    type: String,
    required: true,
    trim: true,
  },

  // Category (for grouping in UI)
  category: {
    type: String,
    required: true,
    enum: [
      'super-admin',
      'users-permissions',
      'applications',
      'hrm',
      'projects',
      'crm',
      'recruitment',
      'finance',
      'administration',
      'content',
      'pages',
      'auth',
      'ui',
      'extras',
      'dashboards',
    ],
  },

  // Description
  description: {
    type: String,
    default: '',
  },

  // Sort Order within category
  sortOrder: {
    type: Number,
    default: 0,
  },

  // Available Actions for this permission
  availableActions: {
    type: [String],
    default: ['all', 'read', 'create', 'write', 'delete', 'import', 'export'],
    enum: ['all', 'read', 'create', 'write', 'delete', 'import', 'export', 'approve', 'assign'],
  },

  // Is Active
  isActive: {
    type: Boolean,
    default: true,
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
  collection: 'permissions',
});

// Indexes
permissionSchema.index({ category: 1, sortOrder: 1 });
permissionSchema.index({ isActive: 1 });

// Pre-save middleware
permissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get all modules grouped by category
permissionSchema.statics.getGroupedModules = async function() {
  const permissions = await this.find({ isActive: true }).sort({ category: 1, sortOrder: 1 });

  const grouped = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    // Transform to frontend-expected format with permissionId
    acc[perm.category].push({
      permissionId: perm._id,
      module: perm.module,
      displayName: perm.displayName,
      category: perm.category,
      description: perm.description,
      availableActions: perm.availableActions,
    });
    return acc;
  }, {});

  return Object.entries(grouped).map(([category, permissions]) => ({
    category,
    permissions,
  }));
};

// Static method to get permissions by category
permissionSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ sortOrder: 1 });
};

export default mongoose.models.Permission || mongoose.model('Permission', permissionSchema);
