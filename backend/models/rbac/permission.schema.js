/**
 * Permission Schema (Refactored - References Page)
 * Defines individual permissions that can be assigned to roles
 *
 * RELATIONSHIP: Permission → Page (Many-to-One via pageId)
 * Each permission is linked to a specific Page for access control
 */

import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  // ============================================
  // PAGE REFERENCE (Primary Link)
  // ============================================
  // Links this permission to a specific page/route
  pageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Page',
    required: false, // Optional for backward compatibility during migration
    unique: true,
    sparse: true, // Allows null values while maintaining uniqueness
  },

  // Module Identifier (e.g., 'hrm.employees', 'projects.tasks')
  // KEPT FOR BACKWARD COMPATIBILITY - Will be deprecated
  module: {
    type: String,
    required: false, // Made optional for migration
    trim: true,
    unique: true,
    sparse: true,
  },

  // Display Name (synced from Page if pageId is set)
  displayName: {
    type: String,
    required: true,
    trim: true,
  },

  // Category (for grouping in UI, synced from Page.moduleCategory)
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
      'reports',
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

  // Available Actions for this permission (synced from Page.availableActions)
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

  // Migration flag
  isMigrated: {
    type: Boolean,
    default: false,
  },

  // Audit fields
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
  collection: 'permissions',
});

// Indexes
permissionSchema.index({ category: 1, sortOrder: 1 });
permissionSchema.index({ isActive: 1 });
permissionSchema.index({ pageId: 1 }, { unique: true, sparse: true });
permissionSchema.index({ module: 1 }, { unique: true, sparse: true });

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

// ============================================
// NEW METHODS FOR PAGE RELATIONSHIP
// ============================================

// Static method to get permission with populated page data
permissionSchema.statics.getWithPage = function(permissionId) {
  return this.findById(permissionId).populate('pageId');
};

// Static method to get all permissions with populated pages
permissionSchema.statics.getAllWithPages = function() {
  return this.find({ isActive: true })
    .populate('pageId')
    .sort({ category: 1, sortOrder: 1 });
};

// Static method to find or create permission from a Page
permissionSchema.statics.findOrCreateFromPage = async function(page) {
  let permission = await this.findOne({ pageId: page._id });

  if (!permission) {
    // Check if there's a legacy permission with matching module name
    permission = await this.findOne({ module: page.name });

    if (permission) {
      // Migrate existing permission to use pageId
      permission.pageId = page._id;
      permission.isMigrated = true;
      await permission.save();
    } else {
      // Create new permission from page
      permission = await this.create({
        pageId: page._id,
        module: page.name,
        displayName: page.displayName,
        category: page.moduleCategory || 'other',
        description: page.description || '',
        sortOrder: page.sortOrder || 0,
        availableActions: page.availableActions || ['read', 'create', 'write', 'delete'],
        isMigrated: true,
      });
    }
  }

  return permission;
};

// Static method to sync all permissions from Pages
permissionSchema.statics.syncFromPages = async function() {
  const Page = mongoose.model('Page');
  const pages = await Page.find({ isActive: true });
  const results = { created: 0, updated: 0, skipped: 0 };

  for (const page of pages) {
    try {
      let permission = await this.findOne({ pageId: page._id });

      if (!permission) {
        // Check for legacy permission
        permission = await this.findOne({ module: page.name });

        if (permission) {
          // Update legacy permission
          permission.pageId = page._id;
          permission.displayName = page.displayName;
          permission.category = page.moduleCategory || permission.category;
          permission.availableActions = page.availableActions || permission.availableActions;
          permission.isMigrated = true;
          await permission.save();
          results.updated++;
        } else {
          // Create new permission
          await this.create({
            pageId: page._id,
            module: page.name,
            displayName: page.displayName,
            category: page.moduleCategory || 'other',
            description: page.description || '',
            sortOrder: page.sortOrder || 0,
            availableActions: page.availableActions || ['read', 'create', 'write', 'delete'],
            isMigrated: true,
          });
          results.created++;
        }
      } else {
        // Update existing linked permission
        permission.displayName = page.displayName;
        permission.category = page.moduleCategory || permission.category;
        permission.availableActions = page.availableActions || permission.availableActions;
        permission.sortOrder = page.sortOrder || permission.sortOrder;
        await permission.save();
        results.updated++;
      }
    } catch (error) {
      console.error(`Error syncing permission for page ${page.name}:`, error);
      results.skipped++;
    }
  }

  return results;
};

// Static method to get grouped permissions with page population
permissionSchema.statics.getGroupedWithPages = async function() {
  const permissions = await this.find({ isActive: true })
    .populate('pageId')
    .sort({ category: 1, sortOrder: 1 });

  const grouped = permissions.reduce((acc, perm) => {
    const category = perm.category;
    if (!acc[category]) {
      acc[category] = [];
    }

    const pageData = perm.pageId || {};
    acc[category].push({
      permissionId: perm._id,
      pageId: perm.pageId?._id || null,
      module: perm.module || pageData.name,
      displayName: perm.displayName,
      category: perm.category,
      description: perm.description,
      availableActions: perm.availableActions,
      route: pageData.route || null,
      isMigrated: perm.isMigrated,
    });
    return acc;
  }, {});

  return Object.entries(grouped).map(([category, permissions]) => ({
    category,
    permissions,
  }));
};

export default mongoose.models.Permission || mongoose.model('Permission', permissionSchema);
