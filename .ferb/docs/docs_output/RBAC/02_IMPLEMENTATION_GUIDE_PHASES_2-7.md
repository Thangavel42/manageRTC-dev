# RBAC SYSTEM - IMPLEMENTATION GUIDE (PHASES 2-7)

**Date:** 2026-02-10
**Project:** manageRTC-my
**Continued from:** 01_IMPLEMENTATION_GUIDE.md

---

## PHASE 2: ROLES RESTRUCTURING

**Priority:** CRITICAL
**Duration:** 2-3 days
**Dependencies:** Phase 1 Complete

### 2.1 Update Role Schema

**File:** `backend/models/rbac/role.schema.js`

```javascript
/**
 * Role Schema - Restructured with allowedPages
 * Defines user roles with page-based permissions
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
  // NEW STRUCTURE: Allowed Pages with Actions
  // ============================================
  allowedPages: [{
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Page',
      required: true
    },
    permissions: {
      all: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    }
  }],

  // Permission summary stats
  permissionStats: {
    totalPages: { type: Number, default: 0 },
    categories: [{ type: String }],
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
roleSchema.index({ 'allowedPages.pageId': 1 });

// Static method to check if role has specific permission on page
roleSchema.statics.hasPagePermission = async function(roleId, pageId, action = 'read') {
  const role = await this.findById(roleId).select('allowedPages');
  if (!role) return false;

  const pagePerm = role.allowedPages.find(p => p.pageId.toString() === pageId);
  if (!pagePerm) return false;

  // Check 'all' first
  if (pagePerm.permissions.all) return true;

  // Check specific action
  return pagePerm.permissions[action] || false;
};

// Static method to get all pages for a role with permissions
roleSchema.statics.getRolePages = async function(roleId) {
  const role = await this.findById(roleId).populate('allowedPages.pageId').lean();
  if (!role) return [];

  return role.allowedPages.filter(p => p.pageId).map(p => ({
    page: p.pageId,
    permissions: p.permissions
  }));
};

// Static method to set all pages for a role
roleSchema.statics.setRolePages = async function(roleId, pagesData) {
  // Calculate categories
  const pageIds = pagesData.map(p => p.pageId);
  const Page = mongoose.model('Page');
  const pages = await Page.find({ _id: { $in: pageIds } }).lean();
  const categories = [...new Set(pages.map(p => p.moduleCategory))];

  // Update role
  const role = await this.findByIdAndUpdate(
    roleId,
    {
      allowedPages: pagesData,
      permissionStats: {
        totalPages: pagesData.length,
        categories: categories,
        lastUpdatedAt: new Date()
      }
    },
    { new: true }
  );

  return role;
};

export default mongoose.models.Role || mongoose.model('Role', roleSchema);
```

### 2.2 Update Role Service

**File:** `backend/services/rbac/role.service.js`

```javascript
/**
 * Role Service - Updated for new allowedPages structure
 */

import Role from '../../models/rbac/role.schema.js';
import Page from '../../models/rbac/page.schema.js';

/**
 * Get roles with their page permissions summary
 */
export async function GetRolesWithPageSummary() {
  try {
    const roles = await Role.find({ isActive: true, isDeleted: false })
      .populate('allowedPages.pageId')
      .sort({ level: 1, displayName: 1 })
      .lean();

    // Calculate page counts for each role
    for (const role of roles) {
      role.pageCount = role.allowedPages?.length || 0;
      role.categories = role.permissionStats?.categories || [];
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
 * Get role's pages with permissions (grouped by category)
 */
export async function getRolePagesGrouped(roleId) {
  try {
    const role = await Role.findById(roleId).populate('allowedPages.pageId').lean();
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    // Group pages by category
    const grouped = role.allowedPages?.reduce((acc, item) => {
      if (!item.pageId) return acc;

      const category = item.pageId.moduleCategory || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push({
        pageId: item.pageId._id,
        name: item.pageId.name,
        displayName: item.pageId.displayName,
        route: item.pageId.route,
        description: item.pageId.description,
        availableActions: item.pageId.availableActions,
        assignedPermissions: item.permissions
      });

      return acc;
    }, {}) || {};

    const result = Object.entries(grouped).map(([category, pages]) => ({
      category,
      pages: pages.sort((a, b) => a.displayName.localeCompare(b.displayName))
    })).sort((a, b) => a.category.localeCompare(b.category));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Set all pages for a role with their permissions
 */
export async function setRolePages(roleId, pagesData) {
  try {
    const role = await Role.findById(roleId);
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    // Validate all page IDs exist
    const pageIds = pagesData.map(p => p.pageId);
    const pages = await Page.find({ _id: { $in: pageIds } }).lean();

    if (pages.length !== pageIds.length) {
      return {
        success: false,
        error: 'Some pages not found',
      };
    }

    // Build allowedPages array with full page details
    const allowedPages = pagesData.map(p => {
      const page = pages.find(pg => pg._id.toString() === p.pageId.toString());
      return {
        pageId: page._id,
        permissions: p.permissions || { all: false, read: false, create: false, write: false, delete: false, import: false, export: false }
      };
    });

    // Calculate categories
    const categories = [...new Set(pages.map(p => p.moduleCategory))];

    // Update role
    role.allowedPages = allowedPages;
    role.permissionStats = {
      totalPages: allowedPages.length,
      categories: categories,
      lastUpdatedAt: new Date()
    };
    role.updatedAt = new Date();

    await role.save();

    return {
      success: true,
      data: role,
      message: `Updated ${allowedPages.length} pages for role ${role.displayName}`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update a single page permission for a role
 */
export async function updateRolePagePermission(roleId, pageId, permissions) {
  try {
    const role = await Role.findById(roleId);
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    // Find and update the page permission
    const pagePermIndex = role.allowedPages.findIndex(p => p.pageId.toString() === pageId);
    if (pagePermIndex === -1) {
      // Add new page permission
      role.allowedPages.push({
        pageId: pageId,
        permissions: permissions
      });
    } else {
      // Update existing
      role.allowedPages[pagePermIndex].permissions = permissions;
    }

    // Recalculate stats
    const Page = mongoose.model('Page');
    const pages = await Page.find({
      _id: { $in: role.allowedPages.map(p => p.pageId) }
    }).lean();
    const categories = [...new Set(pages.map(p => p.moduleCategory))];

    role.permissionStats = {
      totalPages: role.allowedPages.length,
      categories: categories,
      lastUpdatedAt: new Date()
    };
    role.updatedAt = new Date();

    await role.save();

    return {
      success: true,
      data: role,
      message: 'Page permission updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Check if role has specific permission on a page
 */
export async function checkRolePagePermission(roleId, pageId, action = 'read') {
  try {
    const role = await Role.findById(roleId).select('allowedPages').lean();
    if (!role) {
      return {
        success: false,
        hasPermission: false,
        error: 'Role not found',
      };
    }

    const pagePerm = role.allowedPages?.find(p => p.pageId.toString() === pageId);
    if (!pagePerm) {
      return {
        success: true,
        hasPermission: false,
      };
    }

    // Check 'all' first
    if (pagePerm.permissions.all) {
      return {
        success: true,
        hasPermission: true,
      };
    }

    // Check specific action
    const hasPermission = pagePerm.permissions[action] || false;

    return {
      success: true,
      hasPermission,
    };
  } catch (error) {
    return {
      success: false,
      hasPermission: false,
      error: error.message,
    };
  }
}

// Keep existing methods for backward compatibility
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

export async function createRole(roleData, userId = null) {
  try {
    // Check if role name already exists
    const existing = await Role.findOne({ name: roleData.name, isDeleted: false });
    if (existing) {
      return {
        success: false,
        error: 'Role with this name already exists',
      };
    }

    const role = new Role({
      ...roleData,
      createdBy: userId,
      updatedBy: userId,
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

export async function updateRole(roleId, updateData, userId = null) {
  try {
    const existingRole = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!existingRole) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    if (updateData.name && updateData.name !== existingRole.name) {
      const nameExists = await Role.findOne({
        name: updateData.name,
        isDeleted: false,
        _id: { $ne: roleId }
      });
      if (nameExists) {
        return {
          success: false,
          error: 'Role with this name already exists',
        };
      }
    }

    if (existingRole.type === 'system' && updateData.type && updateData.type !== 'system') {
      return {
        success: false,
        error: 'Cannot change system role type',
      };
    }

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

export async function deleteRole(roleId) {
  try {
    const role = await Role.findOne({ _id: roleId, isDeleted: false });
    if (!role) {
      return {
        success: false,
        error: 'Role not found',
      };
    }

    if (role.type === 'system') {
      return {
        success: false,
        error: 'Cannot delete system roles',
      };
    }

    role.isDeleted = true;
    role.deletedAt = new Date();
    role.isActive = false;
    role.allowedPages = [];
    role.permissionStats = {
      totalPages: 0,
      categories: [],
      lastUpdatedAt: new Date()
    };

    await role.save();

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
  createRole,
  updateRole,
  deleteRole,
  toggleRoleStatus,
  GetRolesWithPageSummary,
  getRolePagesGrouped,
  setRolePages,
  updateRolePagePermission,
  checkRolePagePermission,
};
```

### 2.3 Update Permission UI to Use Pages

**File:** `react/src/feature-module/super-admin/permissionpage.tsx`

Key changes needed:
1. Fetch pages grouped by category instead of permissions
2. Show available actions for each page
3. Save to role's allowedPages array

```typescript
// Updated fetchAllPermissions to fetch pages
const fetchAllPages = async () => {
  try {
    const response = await fetch(`${API_BASE}/api/rbac/pages/grouped`);
    const data = await response.json();
    if (data.success && data.data) {
      setAllPages(data.data); // Now contains pages instead of permissions
    }
  } catch (error) {
    console.error('Error fetching pages:', error);
  }
};

// Updated savePermissions to save pages
const savePermissions = async (pages: GroupedPages[]) => {
  if (!selectedRole) return;

  setSaving(true);
  try {
    const flatPages: any[] = [];
    pages.forEach(group => {
      group.pages.forEach(page => {
        const hasAnyAction = page.assignedPermissions?.all ||
                            page.assignedPermissions?.read ||
                            page.assignedPermissions?.create ||
                            page.assignedPermissions?.write ||
                            page.assignedPermissions?.delete ||
                            page.assignedPermissions?.import ||
                            page.assignedPermissions?.export;

        if (hasAnyAction) {
          flatPages.push({
            pageId: page._id,
            permissions: page.assignedPermissions
          });
        }
      });
    });

    const response = await fetch(`${API_BASE}/api/rbac/roles/${selectedRole._id}/pages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: flatPages }),
    });

    const data = await response.json();
    if (!data.success) {
      console.error('Error saving permissions:', data.error);
      await fetchRolePages();
    }
  } catch (error) {
    console.error('Error saving permissions:', error);
    await fetchRolePages();
  } finally {
    setSaving(false);
  }
};
```

### 2.4 Update Role Routes

**File:** `backend/routes/api/rbac/roles.js`

Add new routes for page-based permissions:

```javascript
// Get role's pages grouped by category
router.get('/:roleId/pages/grouped', async (req, res) => {
  const result = await roleService.getRolePagesGrouped(req.params.roleId);
  res.status(result.success ? 200 : 404).json(result);
});

// Set all pages for a role
router.put('/:roleId/pages', async (req, res) => {
  const result = await roleService.setRolePages(req.params.roleId, req.body.pages);
  res.status(result.success ? 200 : 400).json(result);
});

// Update a single page permission for a role
router.patch('/:roleId/pages/:pageId', async (req, res) => {
  const result = await roleService.updateRolePagePermission(
    req.params.roleId,
    req.params.pageId,
    req.body.permissions
  );
  res.status(result.success ? 200 : 400).json(result);
});

// Check if role has permission on a page
router.get('/:roleId/pages/:pageId/check', async (req, res) => {
  const result = await roleService.checkRolePagePermission(
    req.params.roleId,
    req.params.pageId,
    req.query.action || 'read'
  );
  res.status(result.success ? 200 : 404).json(result);
});
```

---

## PHASE 3: MODULES RESTRUCTURING

**Priority:** HIGH
**Duration:** 2 days
**Dependencies:** Phase 1 Complete

### 3.1 Update Module Schema

**File:** `backend/models/rbac/module.schema.js`

```javascript
/**
 * Module Schema - Restructured with allowedPages as ObjectId array
 */

import mongoose from 'mongoose';

const moduleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },

  displayName: {
    type: String,
    required: true,
    trim: true,
  },

  description: {
    type: String,
    default: '',
  },

  icon: {
    type: String,
    default: 'ti ti-folder',
  },

  route: {
    type: String,
    required: true,
  },

  // ============================================
  // NEW STRUCTURE: Pages as ObjectId array
  // ============================================
  allowedPages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Page'
  }],

  isActive: {
    type: Boolean,
    default: true,
  },

  isSystem: {
    type: Boolean,
    default: false,
  },

  sortOrder: {
    type: Number,
    default: 0,
  },

  accessLevel: {
    type: String,
    enum: ['all', 'premium', 'enterprise'],
    default: 'all',
  },

  color: {
    type: String,
    default: '#6366f1',
  },

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
moduleSchema.index({ allowedPages: 1 });

// Static method to get modules with pages populated
moduleSchema.statics.getModulesWithPages = async function() {
  return this.find({ isActive: true })
    .populate('allowedPages')
    .sort({ sortOrder: 1 })
    .lean();
};

// Static method to get menu structure
moduleSchema.statics.getMenuStructure = async function(userPageAccess = []) {
  const query = { isActive: true };

  const modules = await this.find(query)
    .populate('allowedPages')
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
    pages: mod.allowedPages
      ?.filter(p => userPageAccess.length === 0 || userPageAccess.includes(p._id?.toString()))
      .filter(p => p.isActive)
      .map(p => ({
        _id: p._id,
        name: p.name,
        displayName: p.displayName,
        route: p.route,
        icon: p.icon,
        availableActions: p.availableActions
      }))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)) || []
  }));
};

// Instance method to add page to module
moduleSchema.methods.addPage = async function(pageId) {
  if (!this.allowedPages.includes(pageId)) {
    this.allowedPages.push(pageId);
    await this.save();
  }
  return this;
};

// Instance method to remove page from module
moduleSchema.methods.removePage = async function(pageId) {
  this.allowedPages = this.allowedPages.filter(id => id.toString() !== pageId.toString());
  await this.save();
  return this;
};

export default mongoose.models.Module || mongoose.model('Module', moduleSchema);
```

### 3.2 Update Module Service

**File:** `backend/services/rbac/module.service.js`

```javascript
/**
 * Module Service - Updated for new allowedPages structure
 */

import mongoose from 'mongoose';
import Module from '../../models/rbac/module.schema.js';
import Page from '../../models/rbac/page.schema.js';

/**
 * Configure all pages for a module (replaces all pages)
 */
export async function configureModulePages(moduleId, pageIds) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    // Validate all pages exist
    const pages = await Page.find({
      _id: { $in: pageIds },
      isActive: true
    }).lean();

    if (pages.length !== pageIds.length) {
      return {
        success: false,
        error: 'Some pages not found or inactive',
      };
    }

    mod.allowedPages = pageIds;
    await mod.save();

    const result = await Module.findById(moduleId).populate('allowedPages');

    return {
      success: true,
      data: result,
      message: `Configured ${pages.length} pages for module`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Add page to module
 */
export async function addPageToModule(moduleId, pageId) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    // Check if page exists
    const page = await Page.findById(pageId);
    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    // Check if already exists
    if (mod.allowedPages.some(id => id.toString() === pageId)) {
      return {
        success: false,
        error: 'Page already exists in this module',
      };
    }

    mod.allowedPages.push(pageId);
    await mod.save();

    const result = await Module.findById(moduleId).populate('allowedPages');

    return {
      success: true,
      data: result,
      message: 'Page added to module successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Remove page from module
 */
export async function removePageFromModule(moduleId, pageId) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    mod.allowedPages = mod.allowedPages.filter(id => id.toString() !== pageId);
    await mod.save();

    const result = await Module.findById(moduleId).populate('allowedPages');

    return {
      success: true,
      data: result,
      message: 'Page removed from module successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get available pages not in module
 */
export async function getAvailablePagesForModule(moduleId) {
  try {
    const mod = await Module.findById(moduleId);

    if (!mod) {
      return {
        success: false,
        error: 'Module not found',
      };
    }

    const assignedPageIds = mod.allowedPages.map(id => id.toString());

    const availablePages = await Page.find({
      _id: { $nin: assignedPageIds },
      isActive: true,
      parentPage: null
    }).sort({ moduleCategory: 1, sortOrder: 1 }).lean();

    return {
      success: true,
      data: availablePages,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Keep other existing methods...
export async function getAllModules(filters = {}) {
  try {
    const { isActive } = filters;
    const query = {};

    if (isActive !== undefined) query.isActive = isActive === 'true';

    const modules = await Module.find(query)
      .populate('allowedPages')
      .sort({ sortOrder: 1 })
      .lean();

    return {
      success: true,
      data: modules.map(mod => ({
        ...mod,
        pageCount: mod.allowedPages?.length || 0,
        activePageCount: mod.allowedPages?.filter(p => p.isActive).length || 0,
      })),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  getAllModules,
  configureModulePages,
  addPageToModule,
  removePageFromModule,
  getAvailablePagesForModule,
};
```

---

## PHASE 4: PLANS & COMPANIES FIX

**Priority:** HIGH
**Duration:** 1-2 days
**Dependencies:** Phase 3 Complete

### 4.1 Update Plan Schema

**File:** `backend/models/superadmin/package.schema.js`

```javascript
/**
 * Plan & Company Schema - Fixed with proper ObjectId references
 */

import mongoose from 'mongoose';

const planSchema = new mongoose.Schema({
  planName: {
    type: String,
    required: true
  },
  planType: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  planPosition: {
    type: String,
    required: true
  },
  planCurrency: {
    type: String,
    required: true
  },
  planCurrencytype: {
    type: String,
    required: true
  },
  discountType: {
    type: String,
    required: true
  },
  discount: {
    type: Number,
    required: true
  },
  limitationsInvoices: {
    type: Number,
    required: true
  },
  maxCustomers: {
    type: Number,
    required: true
  },
  product: {
    type: Number,
    required: true
  },
  supplier: {
    type: Number,
    required: true
  },

  // ============================================
  // FIXED: Use ObjectId references instead of strings
  // ============================================
  planModules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  }],

  accessTrial: {
    type: Boolean,
    required: true
  },
  trialDays: {
    type: Number,
    required: true
  },
  isRecommended: {
    type: Boolean,
    required: true
  },
  status: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    required: true
  },
}, {
  timestamps: true,
  collection: 'plans'
});

export const Plan = mongoose.models.Plan || mongoose.model('Plan', planSchema);

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true
  },
  domain: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  website: {
    type: String,
    required: true
  },
  address: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'Active'
  },

  // ============================================
  // FIXED: Use ObjectId reference instead of string
  // ============================================
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Plan',
    required: true
  },

  // Keep plan_name, plan_type for backward compatibility
  plan_name: String,
  plan_type: String,
  currency: String,
  logo: String,
}, {
  timestamps: true,
  collection: 'companies'
});

export const Company = mongoose.models.Company || mongoose.model('Company', companySchema);
```

### 4.2 Create Migration Script

**File:** `backend/migrations/fixPlanModuleReferences.js`

```javascript
/**
 * Migration Script: Fix planModules and company.planId references
 * Run this after updating the schema
 */

import mongoose from 'mongoose';
import { Plan, Company } from '../models/superadmin/package.schema.js';
import Module from '../models/rbac/module.schema.js';

export async function migratePlanModuleReferences() {
  console.log('Starting Plan Module References Migration...');

  try {
    // 1. Migrate planModules from strings to ObjectIds
    const plans = await Plan.find({});
    console.log(`Found ${plans.length} plans to migrate`);

    for (const plan of plans) {
      if (plan.planModules && plan.planModules.length > 0) {
        // Check if already migrated (contains ObjectIds)
        const firstModule = plan.planModules[0];
        if (typeof firstModule === 'string') {
          // Need to migrate - find modules by name
          const moduleObjectIds = [];

          for (const moduleName of plan.planModules) {
            const module = await Module.findOne({ name: moduleName });
            if (module) {
              moduleObjectIds.push(module._id);
            } else {
              console.warn(`Module not found: ${moduleName}`);
            }
          }

          plan.planModules = moduleObjectIds;
          await plan.save();
          console.log(`Migrated plan: ${plan.planName}`);
        }
      }
    }

    // 2. Migrate company.planId from string to ObjectId
    const companies = await Company.find({});
    console.log(`Found ${companies.length} companies to migrate`);

    for (const company of companies) {
      if (company.planId && typeof company.planId === 'string') {
        // Find plan by planName
        const plan = await Plan.findOne({ planName: company.planId });
        if (plan) {
          company.planId = plan._id;
          await company.save();
          console.log(`Migrated company: ${company.name}`);
        } else {
          console.warn(`Plan not found for company: ${company.name}, plan: ${company.planId}`);
        }
      }
    }

    console.log('Migration completed successfully!');
    return { success: true };

  } catch (error) {
    console.error('Migration failed:', error);
    return { success: false, error: error.message };
  }
}
```

---

## PHASE 5: PERMISSION MIDDLEWARE

**Priority:** MEDIUM
**Duration:** 2-3 days
**Dependencies:** Phase 2 Complete

### 5.1 Create Permission Middleware

**File:** `backend/middleware/permission.js`

```javascript
/**
 * Permission Middleware
 * Checks if user has permission to access a page/perform an action
 */

import Role from '../models/rbac/role.schema.js';
import Page from '../models/rbac/page.schema.js';

/**
 * Check if user has permission to access a page
 * Usage: router.get('/some-route', checkPagePermission('hrm.employees', 'read'), handler)
 */
export function checkPagePermission(pageName, action = 'read') {
  return async (req, res, next) => {
    try {
      // Skip check for super admin
      if (req.user?.role === 'super-admin') {
        return next();
      }

      // Get user's role
      const roleId = req.user?.roleId;
      if (!roleId) {
        return res.status(403).json({
          success: false,
          error: 'No role assigned to user'
        });
      }

      // Find the page by name
      const page = await Page.findOne({ name: pageName, isActive: true });
      if (!page) {
        return res.status(404).json({
          success: false,
          error: 'Page not found'
        });
      }

      // Check if role has permission
      const hasPermission = await Role.hasPagePermission(roleId, page._id, action);

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions. Required: ${action} on ${page.displayName}`
        });
      }

      // Attach page info to request
      req.page = page;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
}

/**
 * Check if user has any of the required permissions
 * Usage: router.post('/', checkAnyPermission(['create', 'write']), handler)
 */
export function checkAnyPermission(pageName, actions) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'super-admin') {
        return next();
      }

      const roleId = req.user?.roleId;
      if (!roleId) {
        return res.status(403).json({
          success: false,
          error: 'No role assigned to user'
        });
      }

      const page = await Page.findOne({ name: pageName, isActive: true });
      if (!page) {
        return res.status(404).json({
          success: false,
          error: 'Page not found'
        });
      }

      // Check if role has any of the required actions
      const role = await Role.findById(roleId).select('allowedPages').lean();
      const pagePerm = role?.allowedPages?.find(p => p.pageId.toString() === page._id.toString());

      if (!pagePerm) {
        return res.status(403).json({
          success: false,
          error: 'No permissions assigned for this page'
        });
      }

      const hasAny = actions.some(action =>
        pagePerm.permissions.all || pagePerm.permissions[action]
      );

      if (!hasAny) {
        return res.status(403).json({
          success: false,
          error: `Insufficient permissions. Required one of: ${actions.join(', ')}`
        });
      }

      req.page = page;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission check failed'
      });
    }
  };
}

/**
 * Get user's accessible pages
 */
export async function getUserAccessiblePages(roleId) {
  try {
    const role = await Role.findById(roleId).populate('allowedPages.pageId').lean();
    if (!role) {
      return [];
    }

    return role.allowedPages
      .filter(p => p.pageId && p.pageId.isActive)
      .map(p => ({
        ...p.pageId,
        permissions: p.permissions
      }));
  } catch (error) {
    console.error('Error getting user pages:', error);
    return [];
  }
}

export default {
  checkPagePermission,
  checkAnyPermission,
  getUserAccessiblePages,
};
```

### 5.2 Create Permission Helper Utilities

**File:** `backend/utils/permissionHelpers.js`

```javascript
/**
 * Permission Helper Utilities
 */

/**
 * Check if user can perform action on a page
 */
export async function canUserPerformAction(user, pageName, action) {
  if (user.role === 'super-admin') return true;

  const Role = mongoose.model('Role');
  const Page = mongoose.model('Page');

  const page = await Page.findOne({ name: pageName });
  if (!page) return false;

  const result = await Role.hasPagePermission(user.roleId, page._id, action);
  return result;
}

/**
 * Filter pages based on user permissions
 */
export async function filterPagesByPermissions(user, pages) {
  if (user.role === 'super-admin') return pages;

  const accessiblePages = await getUserAccessiblePages(user.roleId);
  const accessiblePageIds = new Set(accessiblePages.map(p => p._id.toString()));

  return pages.filter(page => accessiblePageIds.has(page._id.toString()));
}

/**
 * Get user's permission for a specific page
 */
export async function getPagePermissionsForUser(user, pageName) {
  if (user.role === 'super-admin') {
    return { all: true };
  }

  const Role = mongoose.model('Role');
  const Page = mongoose.model('Page');

  const page = await Page.findOne({ name: pageName });
  if (!page) return null;

  const role = await Role.findById(user.roleId).lean();
  const pagePerm = role?.allowedPages?.find(p => p.pageId.toString() === page._id.toString());

  return pagePerm?.permissions || null;
}
```

---

## PHASE 6: MENU GENERATION & UI UPDATES

**Priority:** MEDIUM
**Duration:** 2 days
**Dependencies:** Phase 5 Complete

### 6.1 Create Menu Service

**File:** `backend/services/menu.service.js`

```javascript
/**
 * Menu Service - Generate dynamic menu based on user permissions
 */

import Module from '../models/rbac/module.schema.js';
import { getUserAccessiblePages } from '../middleware/permission.js';

/**
 * Get menu structure for a user based on their role
 */
export async function getUserMenu(roleId) {
  try {
    // Get all accessible pages for the user's role
    const accessiblePages = await getUserAccessiblePages(roleId);
    const accessiblePageIds = new Set(accessiblePages.map(p => p._id.toString()));

    // Get all modules with their pages
    const modules = await Module.getMenuStructure([...accessiblePageIds]);

    return {
      success: true,
      data: modules,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get menu structure with permissions for frontend
 */
export async function getUserMenuWithPermissions(roleId) {
  try {
    const accessiblePages = await getUserAccessiblePages(roleId);

    // Create a map of page permissions
    const pagePermissions = new Map();
    accessiblePages.forEach(page => {
      pagePermissions.set(page._id.toString(), page.permissions);
    });

    // Get modules with pages
    const modules = await Module.find({ isActive: true })
      .populate('allowedPages')
      .sort({ sortOrder: 1 })
      .lean();

    // Filter and structure the menu
    const menu = modules
      .filter(mod => mod.allowedPages?.some(p => pagePermissions.has(p._id.toString())))
      .map(mod => ({
        _id: mod._id,
        name: mod.name,
        displayName: mod.displayName,
        icon: mod.icon,
        route: mod.route,
        color: mod.color,
        pages: mod.allowedPages
          .filter(p => pagePermissions.has(p._id.toString()) && p.isActive)
          .map(p => ({
            _id: p._id,
            name: p.name,
            displayName: p.displayName,
            route: p.route,
            icon: p.icon,
            permissions: pagePermissions.get(p._id.toString())
          }))
          .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
      }))
      .filter(mod => mod.pages.length > 0);

    return {
      success: true,
      data: menu,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  getUserMenu,
  getUserMenuWithPermissions,
};
```

### 6.2 Create Menu API Route

**File:** `backend/routes/api/menu.js`

```javascript
/**
 * Menu API Routes
 */

import express from 'express';
import * as menuService from '../../services/menu.service.js';

const router = express.Router();

// Get user's menu
router.get('/', async (req, res) => {
  const roleId = req.user?.roleId;
  if (!roleId) {
    return res.status(400).json({
      success: false,
      error: 'No role found'
    });
  }

  const result = await menuService.getUserMenuWithPermissions(roleId);
  res.status(result.success ? 200 : 400).json(result);
});

export default router;
```

### 6.3 Create Permission-Based Component

**File:** `react/src/components/PermissionGuard.tsx`

```tsx
import React from 'react';

interface PermissionGuardProps {
  pageName: string;
  action: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
  pageName,
  action,
  fallback = null,
  children
}) => {
  // Get user's permissions from context/store
  const userPermissions = useUserPermissions(); // You'll need to create this hook

  const hasPermission = checkPermission(userPermissions, pageName, action);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

function checkPermission(permissions: any, pageName: string, action: string): boolean {
  if (!permissions) return false;

  const pagePerm = permissions.pages?.find((p: any) => p.name === pageName);
  if (!pagePerm) return false;

  return pagePerm.permissions?.all || pagePerm.permissions?.[action];
}

// Custom hook to get user permissions
function useUserPermissions() {
  // Implement based on your state management (Redux, Context, etc.)
  const [permissions, setPermissions] = React.useState(null);

  React.useEffect(() => {
    // Fetch permissions from API
    const fetchPermissions = async () => {
      try {
        const response = await fetch('/api/menu', {
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
        });
        const data = await response.json();
        if (data.success) {
          setPermissions(data.data);
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    };

    fetchPermissions();
  }, []);

  return permissions;
}

export default PermissionGuard;
```

### 6.4 Usage Example

```tsx
import PermissionGuard from '../../components/PermissionGuard';

// In your component
<PermissionGuard pageName="hrm.employees" action="create" fallback={<div>Access Denied</div>}>
  <button onClick={handleCreate}>Create Employee</button>
</PermissionGuard>

// For hiding elements
<PermissionGuard pageName="hrm.employees" action="delete">
  <button onClick={handleDelete}>Delete</button>
</PermissionGuard>
```

---

## PHASE 7: TESTING & DOCUMENTATION

**Priority:** MEDIUM
**Duration:** 2-3 days
**Dependencies:** All previous phases complete

### 7.1 Unit Tests

**File:** `backend/tests/rbac/role.test.js`

```javascript
/**
 * Role Service Unit Tests
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import Role from '../../models/rbac/role.schema.js';
import Page from '../../models/rbac/page.schema.js';

describe('Role Service', () => {
  let testRole;
  let testPage;

  beforeAll(async () => {
    // Connect to test database
    await mongoose.connect(process.env.MONGODB_TEST_URI);

    // Create test page
    testPage = await Page.create({
      name: 'test.page',
      displayName: 'Test Page',
      route: '/test',
      moduleCategory: 'hrm',
      availableActions: ['read', 'create', 'write', 'delete']
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should create a role with allowedPages', async () => {
    testRole = await Role.create({
      name: 'test-role',
      displayName: 'Test Role',
      allowedPages: [{
        pageId: testPage._id,
        permissions: { read: true, create: true }
      }]
    });

    expect(testRole.allowedPages).toHaveLength(1);
    expect(testRole.allowedPages[0].permissions.read).toBe(true);
  });

  it('should check role page permission correctly', async () => {
    const hasPermission = await Role.hasPagePermission(
      testRole._id,
      testPage._id,
      'read'
    );

    expect(hasPermission).toBe(true);
  });

  it('should deny permission for non-assigned action', async () => {
    const hasPermission = await Role.hasPagePermission(
      testRole._id,
      testPage._id,
      'delete'
    );

    expect(hasPermission).toBe(false);
  });
});
```

### 7.2 API Documentation

**File:** `docs/RBAC_API.md`

```markdown
# RBAC API Documentation

## Authentication
All endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Pages API

### Get All Pages
```
GET /api/rbac/pages
Query Parameters:
  - isActive: boolean (optional)
  - moduleCategory: string (optional)
```

### Get Pages Grouped by Category
```
GET /api/rbac/pages/grouped
```

### Create Page
```
POST /api/rbac/pages
Body: {
  name: string,
  displayName: string,
  route: string,
  moduleCategory: string,
  availableActions: string[],
  ...
}
```

## Roles API

### Get Role's Pages with Permissions
```
GET /api/rbac/roles/:roleId/pages/grouped
```

### Set Role's Pages
```
PUT /api/rbac/roles/:roleId/pages
Body: {
  pages: [{
    pageId: ObjectId,
    permissions: {
      read: boolean,
      create: boolean,
      write: boolean,
      delete: boolean,
      import: boolean,
      export: boolean
    }
  }]
}
```

### Check Role Permission
```
GET /api/rbac/roles/:roleId/pages/:pageId/check?action=read
```

## Menu API

### Get User Menu
```
GET /api/menu
Returns menu structure based on user's role permissions
```
```

---

## SUMMARY OF ALL PHASES

| Phase | Description | Duration | Dependencies | Status |
|-------|-------------|----------|--------------|--------|
| 1 | Pages Collection Enhancement | 2-3 days | None | TODO |
| 2 | Roles Restructuring | 2-3 days | Phase 1 | TODO |
| 3 | Modules Restructuring | 2 days | Phase 1 | TODO |
| 4 | Plans & Companies Fix | 1-2 days | Phase 3 | TODO |
| 5 | Permission Middleware | 2-3 days | Phase 2 | TODO |
| 6 | Menu Generation & UI Updates | 2 days | Phase 5 | TODO |
| 7 | Testing & Documentation | 2-3 days | All | TODO |

**Total Estimated Duration: 13-19 days**

---

**End of Implementation Guide**

Generated: 2026-02-10
