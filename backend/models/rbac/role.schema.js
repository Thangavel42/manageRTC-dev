/**
 * Role Schema (Junction Table Approach)
 * Defines user roles that can be assigned permissions
 * Permissions stored in role_permissions junction table (PRIMARY)
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

// ============================================
// INDEXES
// ============================================
roleSchema.index({ name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
roleSchema.index({ isActive: 1, isDeleted: 1 });
roleSchema.index({ type: 1 });
roleSchema.index({ level: 1 });

// Virtual for role permissions (junction table)
roleSchema.virtual('rolePermissions', {
  ref: 'RolePermission',
  localField: '_id',
  foreignField: 'roleId',
  justOne: false,
});

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

// ============================================
// STATIC METHODS
// ============================================

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

export default mongoose.models.Role || mongoose.model('Role', roleSchema);
