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
    enum: ['hrm', 'projects', 'crm', 'recruitment', 'finance', 'administration', 'reports', 'applications', 'content', 'super-admin', null],
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
pageSchema.index({ name: 1 });
pageSchema.index({ moduleCategory: 1, sortOrder: 1 });
pageSchema.index({ isActive: 1 });
pageSchema.index({ parentPage: 1 });

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

export default mongoose.models.Page || mongoose.model('Page', pageSchema);
