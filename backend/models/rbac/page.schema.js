/**
 * Page Schema
 * Represents individual pages/routes that can be assigned to modules
 */

import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema({
  // Unique page identifier (e.g., "hrm.employees", "projects.tasks")
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  // Display name (e.g., "Employees", "Tasks")
  displayName: {
    type: String,
    required: true,
  },

  // Description
  description: {
    type: String,
  },

  // Route path (e.g., "/hrm/employees", "/projects/tasks")
  route: {
    type: String,
    required: true,
  },

  // Icon (Tabler icon class)
  icon: {
    type: String,
    default: 'ti ti-file',
  },

  // Module this page belongs to (for organization, not required)
  moduleCategory: {
    type: String,
    enum: ['super-admin', 'users-permissions', 'applications', 'hrm', 'projects',
           'crm', 'recruitment', 'finance', 'administration', 'content',
           'pages', 'auth', 'ui', 'extras', 'dashboards', 'reports', null],
  },

  // Parent page (for nested pages)
  parentPage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Page',
    default: null,
  },

  // Sort order for display
  sortOrder: {
    type: Number,
    default: 0,
  },

  // Is this a system page (cannot be deleted)
  isSystem: {
    type: Boolean,
    default: false,
  },

  // Active status
  isActive: {
    type: Boolean,
    default: true,
  },

  // ============================================
  // AVAILABLE ACTIONS - NEW FIELD FOR RBAC
  // ============================================
  // Defines which actions can be performed on this page
  // This field determines what permission checkboxes are shown
  availableActions: {
    type: [String],
    default: ['read', 'create', 'write', 'delete', 'import', 'export'],
    enum: ['all', 'read', 'create', 'write', 'delete', 'import', 'export', 'approve', 'assign'],
  },

  // SEO / Display metadata
  meta: {
    title: String,
    keywords: [String],
    layout: {
      type: String,
      enum: ['default', 'full-width', 'no-sidebar', 'blank'],
      default: 'default',
    },
  },

  // ============================================
  // ENHANCED ACCESS CONTROL FIELDS
  // ============================================

  // API Routes for automatic route protection
  // Maps page to API endpoints for middleware-based access control
  apiRoutes: [{
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: ['read', 'create', 'write', 'delete', 'import', 'export', 'approve', 'assign'],
      default: 'read',
    },
    description: String,
  }],

  // Access conditions for conditional access control
  accessConditions: {
    // Require company context
    requiresCompany: {
      type: Boolean,
      default: true,
    },
    // Require specific plan
    requiresPlan: {
      type: Boolean,
      default: false,
    },
    // Role-based restrictions
    allowedRoles: [{
      type: String,
    }],
    deniedRoles: [{
      type: String,
    }],
    // Time-based restrictions
    timeRestricted: {
      enabled: {
        type: Boolean,
        default: false,
      },
      allowedHours: {
        start: { type: Number, min: 0, max: 23 },
        end: { type: Number, min: 0, max: 23 },
      },
      allowedDays: [{
        type: Number,
        min: 0,
        max: 6, // 0 = Sunday, 6 = Saturday
      }],
    },
    // IP restrictions
    ipRestricted: {
      enabled: {
        type: Boolean,
        default: false,
      },
      allowedIPs: [String],
      deniedIPs: [String],
    },
  },

  // Feature flags for plan-based access control
  featureFlags: {
    // Required features (user's plan must include these)
    requiresFeature: [{
      type: String,
    }],
    // Minimum plan tier required
    minimumPlanTier: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise', null],
      default: null,
    },
    // Enable for all users regardless of plan
    enabledForAll: {
      type: Boolean,
      default: false,
    },
  },

  // Data scope for row-level security
  dataScope: {
    // Filter data by user's company
    filterByCompany: {
      type: Boolean,
      default: true,
    },
    // Filter data by user (for personal data)
    filterByUser: {
      type: Boolean,
      default: false,
    },
    // Filter by user's department
    filterByDepartment: {
      type: Boolean,
      default: false,
    },
    // Custom MongoDB filter query
    customFilter: {
      type: String,
    },
    // Field-level restrictions
    restrictedFields: [{
      field: String,
      roles: [String], // Roles that CAN access this field
    }],
  },

  // Created/Updated by
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Index for faster queries
pageSchema.index({ name: 1 }, { unique: true });
pageSchema.index({ moduleCategory: 1, sortOrder: 1 });
pageSchema.index({ isActive: 1 });
pageSchema.index({ parentPage: 1 });
// Compound index for filtered queries
pageSchema.index({ isActive: 1, moduleCategory: 1, sortOrder: 1 });
// Index for search queries
pageSchema.index({ displayName: 'text', name: 'text', route: 'text' });
// Index for route lookup
pageSchema.index({ route: 1 });
// Index for API route lookups
pageSchema.index({ 'apiRoutes.path': 1, 'apiRoutes.method': 1 });
// Index for feature flag lookups
pageSchema.index({ 'featureFlags.requiresFeature': 1 });

// Static method to get pages by module category
pageSchema.statics.getByModule = function(moduleCategory) {
  return this.find({
    moduleCategory,
    isActive: true,
    parentPage: null  // Only top-level pages
  }).sort({ sortOrder: 1 });
};

// Static method to get all pages grouped by module
pageSchema.statics.getGroupedByModule = function() {
  return this.aggregate([
    { $match: { isActive: true } },
    { $sort: { moduleCategory: 1, sortOrder: 1 } },
    {
      $group: {
        _id: '$moduleCategory',
        pages: {
          $push: {
            _id: '$_id',
            name: '$name',
            displayName: '$displayName',
            description: '$description',
            route: '$route',
            icon: '$icon',
            sortOrder: '$sortOrder',
            isSystem: '$isSystem',
            availableActions: '$availableActions',
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

// Static method to get page tree (with nested pages)
pageSchema.statics.getPageTree = async function() {
  const allPages = await this.find({ isActive: true })
    .sort({ moduleCategory: 1, sortOrder: 1 })
    .lean();

  const pageMap = new Map();
  const rootPages = [];

  // First pass: create map
  allPages.forEach(page => {
    pageMap.set(page._id.toString(), { ...page, children: [] });
  });

  // Second pass: build tree
  allPages.forEach(page => {
    const pageWithChildren = pageMap.get(page._id.toString());
    if (page.parentPage) {
      const parent = pageMap.get(page.parentPage.toString());
      if (parent) {
        parent.children.push(pageWithChildren);
      }
    } else {
      rootPages.push(pageWithChildren);
    }
  });

  // Group by module category
  const grouped = rootPages.reduce((acc, page) => {
    const cat = page.moduleCategory || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(page);
    return acc;
  }, {});

  return Object.entries(grouped).map(([category, pages]) => ({
    category,
    pages,
  }));
};

// Instance method to get full page path
pageSchema.methods.getFullPath = async function() {
  const path = [this.route];
  let current = this;

  while (current.parentPage) {
    current = await mongoose.model('Page').findById(current.parentPage);
    if (current) path.unshift(current.route);
    else break;
  }

  return path;
};

// ============================================
// ENHANCED STATIC METHODS FOR ACCESS CONTROL
// ============================================

/**
 * Find page by API route
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} path - API route path
 * @returns {Promise<Object|null>} Page document with matching API route
 */
pageSchema.statics.findByApiRoute = async function(method, path) {
  // Normalize path for matching (handle dynamic routes like /api/employees/:id)
  const normalizedPath = path.split('/').map(segment => {
    return segment.match(/^[a-f0-9]{24}$/i) || segment.match(/^\d+$/) ? ':id' : segment;
  }).join('/');

  return this.findOne({
    isActive: true,
    'apiRoutes': {
      $elemMatch: {
        method: method.toUpperCase(),
        path: { $in: [path, normalizedPath, path.replace(/\/$/, ''), normalizedPath.replace(/\/$/, '')] }
      }
    }
  });
};

/**
 * Get all pages with their API routes for middleware setup
 * @returns {Promise<Array>} Array of pages with API routes
 */
pageSchema.statics.getPagesWithApiRoutes = async function() {
  return this.find({
    isActive: true,
    'apiRoutes.0': { $exists: true }
  }).select('name displayName route availableActions apiRoutes accessConditions featureFlags dataScope');
};

/**
 * Get pages required for a specific plan tier
 * @param {string} tier - Plan tier (free, basic, pro, enterprise)
 * @returns {Promise<Array>} Array of pages available for the tier
 */
pageSchema.statics.getPagesForTier = async function(tier) {
  const tierOrder = { free: 0, basic: 1, pro: 2, enterprise: 3 };
  const tierLevel = tierOrder[tier] || 0;

  return this.find({
    isActive: true,
    $or: [
      { 'featureFlags.enabledForAll': true },
      { 'featureFlags.minimumPlanTier': null },
      { 'featureFlags.minimumPlanTier': { $exists: false } },
      { 'featureFlags.minimumPlanTier': { $in: Object.keys(tierOrder).filter(t => tierOrder[t] <= tierLevel) } }
    ]
  });
};

/**
 * Check if a page requires specific features
 * @param {string} pageName - Page name
 * @param {Array<string>} availableFeatures - Features available in user's plan
 * @returns {Promise<Object>} Access check result
 */
pageSchema.statics.checkFeatureAccess = async function(pageName, availableFeatures = []) {
  const page = await this.findOne({ name: pageName, isActive: true });

  if (!page) {
    return { allowed: false, reason: 'Page not found' };
  }

  // Check if enabled for all
  if (page.featureFlags?.enabledForAll) {
    return { allowed: true, page };
  }

  // Check required features
  const requiredFeatures = page.featureFlags?.requiresFeature || [];
  const missingFeatures = requiredFeatures.filter(f => !availableFeatures.includes(f));

  if (missingFeatures.length > 0) {
    return {
      allowed: false,
      reason: 'Missing required features',
      missingFeatures,
      page
    };
  }

  return { allowed: true, page };
};

/**
 * Get data scope configuration for a page
 * @param {string} pageName - Page name
 * @returns {Promise<Object|null>} Data scope configuration
 */
pageSchema.statics.getDataScope = async function(pageName) {
  const page = await this.findOne({ name: pageName, isActive: true })
    .select('dataScope');

  return page?.dataScope || null;
};

/**
 * Build MongoDB filter based on data scope
 * @param {string} pageName - Page name
 * @param {Object} context - User context { userId, companyId, departmentId }
 * @returns {Promise<Object>} MongoDB filter object
 */
pageSchema.statics.buildDataFilter = async function(pageName, context = {}) {
  const dataScope = await this.getDataScope(pageName);

  if (!dataScope) {
    return {};
  }

  const filter = {};

  if (dataScope.filterByCompany && context.companyId) {
    filter.companyId = context.companyId;
  }

  if (dataScope.filterByUser && context.userId) {
    filter.userId = context.userId;
  }

  if (dataScope.filterByDepartment && context.departmentId) {
    filter.departmentId = context.departmentId;
  }

  if (dataScope.customFilter) {
    try {
      const customFilter = JSON.parse(dataScope.customFilter);
      Object.assign(filter, customFilter);
    } catch (e) {
      console.error('Invalid custom filter:', e);
    }
  }

  return filter;
};

export default mongoose.models.Page || mongoose.model('Page', pageSchema);
