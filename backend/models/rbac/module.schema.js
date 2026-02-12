/**
 * Module Schema
 * Defines system modules (HRM, Projects, CRM, etc.) with their pages
 * Modules are main menu items that contain accessible pages
 */

import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  // Module Identifier (e.g., 'hrm', 'projects', 'crm')
  name: {
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

  // Module Description
  description: {
    type: String,
    default: '',
  },

  // Module Icon (Tabler icon class)
  icon: {
    type: String,
    default: 'ti ti-folder',
  },

  // Module Route/Base Path (e.g., '/hrm', '/projects')
  route: {
    type: String,
    required: true,
  },

  // Pages assigned to this module
  pages: [{
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Page',
      required: true,
    },
    name: String,
    displayName: String,
    route: String,
    icon: String,
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  }],

  // Module Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Is this a system module (cannot be deleted)
  isSystem: {
    type: Boolean,
    default: false,
  },

  // Sort Order for display
  sortOrder: {
    type: Number,
    default: 0,
  },

  // Access Level
  // 'all' - available to all companies
  // 'premium' - premium feature
  // 'enterprise' - enterprise only
  accessLevel: {
    type: String,
    enum: ['all', 'premium', 'enterprise'],
    default: 'all',
  },

  // Module color/theme (optional, for UI)
  color: {
    type: String,
    default: '#6366f1',
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
  collection: 'modules',
});

// Indexes
moduleSchema.index({ name: 1 }, { unique: true });
moduleSchema.index({ sortOrder: 1 });
moduleSchema.index({ isActive: 1 });

// Pre-save middleware
moduleSchema.pre('save', function(next) {
  if (this.isModified('pages')) {
    // Sort pages by sortOrder
    this.pages.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  next();
});

// Static method to get all active modules
moduleSchema.statics.getActiveModules = async function() {
  return this.find({ isActive: true })
    .populate('pages.pageId')
    .sort({ sortOrder: 1 })
    .lean();
};

// Static method to get modules with pages for menu
moduleSchema.statics.getMenuStructure = async function(userModuleAccess = []) {
  const query = { isActive: true };

  // If user has specific module access, filter by those
  if (userModuleAccess.length > 0) {
    query.name = { $in: userModuleAccess };
  }

  const modules = await this.find(query)
    .populate('pages.pageId')
    .sort({ sortOrder: 1 })
    .lean();

  // Transform to menu structure
  return modules.map(mod => ({
    _id: mod._id,
    name: mod.name,
    displayName: mod.displayName,
    icon: mod.icon,
    route: mod.route,
    color: mod.color,
    pages: mod.pages
      .filter(p => p.isActive && (p.pageId?.isActive ?? true))
      .map(p => ({
        _id: p.pageId?._id || p._id,
        name: p.pageId?.name || p.name,
        displayName: p.pageId?.displayName || p.displayName,
        route: p.pageId?.route || p.route,
        icon: p.pageId?.icon || p.icon,
        sortOrder: p.sortOrder,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder),
  }));
};

// Static method to get module with pages
moduleSchema.statics.getModuleWithPages = async function(moduleId) {
  return this.findById(moduleId)
    .populate('pages.pageId')
    .lean();
};

// Static method to get available pages not in module
moduleSchema.statics.getAvailablePages = async function(moduleId) {
  const Page = mongoose.models.Page;

  // Get module to see what pages it already has
  const module = await this.findById(moduleId).lean();
  if (!module) return [];

  const assignedPageIds = module.pages.map(p => p.pageId);

  // Get all active pages not already assigned
  return Page.find({
    _id: { $nin: assignedPageIds },
    isActive: true,
    parentPage: null  // Only top-level pages
  }).sort({ moduleCategory: 1, sortOrder: 1 }).lean();
};

// Instance method to add page to module
moduleSchema.methods.addPage = async function(pageId, options = {}) {
  const Page = mongoose.models.Page;
  const page = await Page.findById(pageId);

  if (!page) {
    throw new Error('Page not found');
  }

  // Check if page already exists in module
  const existingIndex = this.pages.findIndex(p => p.pageId.toString() === pageId);
  if (existingIndex >= 0) {
    throw new Error('Page already exists in this module');
  }

  this.pages.push({
    pageId: page._id,
    name: page.name,
    displayName: page.displayName,
    route: page.route,
    icon: page.icon,
    sortOrder: options.sortOrder ?? this.pages.length,
    isActive: options.isActive ?? true,
  });

  await this.save();
  return this;
};

// Instance method to remove page from module
moduleSchema.methods.removePage = async function(pageId) {
  this.pages = this.pages.filter(p => p.pageId.toString() !== pageId);
  await this.save();
  return this;
};

// Instance method to update page order
moduleSchema.methods.updatePageOrder = async function(pageOrders) {
  // pageOrders is array of { pageId, sortOrder }
  pageOrders.forEach(({ pageId, sortOrder }) => {
    const page = this.pages.find(p => p.pageId.toString() === pageId);
    if (page) {
      page.sortOrder = sortOrder;
    }
  });

  await this.save();
  return this;
};

// Instance method to toggle page active status
moduleSchema.methods.togglePage = async function(pageId) {
  const page = this.pages.find(p => p.pageId.toString() === pageId);
  if (page) {
    page.isActive = !page.isActive;
    await this.save();
  }
  return this;
};

export default mongoose.models.Module || mongoose.model('Module', moduleSchema);
