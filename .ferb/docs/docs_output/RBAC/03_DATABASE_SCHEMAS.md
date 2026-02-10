# RBAC Database Schemas
## Complete Schema Design for Role-Based Access Control

**Document Version:** 1.0
**Date:** February 10, 2026
**Database:** MongoDB (Mongoose)

---

## Table of Contents
1. [Schema Overview](#1-schema-overview)
2. [Role Schema](#2-role-schema)
3. [Permission Schema](#3-permission-schema)
4. [Role Permission Schema](#4-role-permission-schema)
5. [User Role Schema](#5-user-role-schema)
6. [Permission Package Schema](#6-permission-package-schema)
7. [Company Permission Schema](#7-company-permission-schema)
8. [Permission Audit Schema](#8-permission-audit-schema)
9. [Indexes & Performance](#9-indexes--performance)
10. [Seed Data](#10-seed-data)

---

## 1. Schema Overview

### 1.1 ER Diagram

```
┌─────────────────┐
│     Roles       │
│  (role.schema)  │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────▼────────┐       ┌─────────────────┐
│ Role_Permissions │──────N│  Permissions    │
│ (junction table) │       │ (permission     │
└─────────────────┘       │  .schema)       │
                          └─────────────────┘
         ▲
         │ 1
         │
         │ N
┌────────┴────────┐       ┌─────────────────┐
│   User_Roles    │       │  Users (exist-  │
│ (user_role      │──────N│  ing schema)    │
│  .schema)       │       └─────────────────┘
└─────────────────�

┌─────────────────┐       ┌─────────────────┐
│ Permission_     │──────N│  Companies      │
│ Packages        │  1    │ (existing)      │
└─────────────────┘       └─────────────────┘
         │
         │ N
         │
┌────────▼────────┐
│  Company_       │
│  Permissions    │
│  (overrides)    │
└─────────────────┘
```

### 1.2 Schema Relationships

| Schema | Related To | Relationship Type |
|--------|-----------|------------------|
| `Role` | `Permission` | Many-to-Many (via RolePermission) |
| `User` | `Role` | Many-to-Many (via UserRole) |
| `Package` | `Permission` | One-to-Many (embedded) |
| `Company` | `Package` | One-to-One |
| `Company` | `Permission` | One-to-Many (overrides) |

---

## 2. Role Schema

**File:** `backend/models/rbac/role.schema.js`

```javascript
import mongoose from 'mongoose';
import { getTenantModel } from '../../utils/mongooseMultiTenant.js';

const roleSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true, // Within company scope
  },

  displayName: {
    type: String,
    required: true,
    trim: true,
  },

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

  // Inheritance
  inheritsFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    default: null,
  },

  // Company Association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Metadata
  isDefault: {
    type: Boolean,
    default: false,
  },

  // User Assignment Count (for reference)
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

// Indexes
roleSchema.index({ companyId: 1, name: 1 }, { unique: true });
roleSchema.index({ companyId: 1, isActive: 1 });
roleSchema.index({ companyId: 1, type: 1 });
roleSchema.index({ level: 1 });

// Pre-save middleware
roleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Prevent modification of system roles
roleSchema.pre('save', function(next) {
  if (this.type === 'system' && this.isModified('level')) {
    throw new Error('Cannot modify system role level');
  }
  next();
});

// Virtual for permissions
roleSchema.virtual('permissions', {
  ref: 'RolePermission',
  localField: '_id',
  foreignField: 'roleId',
});

// Methods
roleSchema.methods.getInheritedPermissions = async function() {
  const Role = this.constructor;
  const permissions = await this.populate({
    path: 'permissions',
    populate: { path: 'permissionId' }
  });

  let inheritedPermissions = permissions.permissions || [];

  if (this.inheritsFrom) {
    const parentRole = await Role.findById(this.inheritsFrom);
    if (parentRole) {
      const parentPermissions = await parentRole.getInheritedPermissions();
      inheritedPermissions = [...inheritedPermissions, ...parentPermissions];
    }
  }

  return inheritedPermissions;
};

// Static method to get default roles
roleSchema.statics.getSystemRoles = function() {
  return [
    { name: 'superadmin', displayName: 'Super Admin', level: 1, type: 'system' },
    { name: 'admin', displayName: 'Administrator', level: 10, type: 'system' },
    { name: 'hr', displayName: 'HR Manager', level: 20, type: 'system' },
    { name: 'manager', displayName: 'Manager', level: 30, type: 'system' },
    { name: 'employee', displayName: 'Employee', level: 50, type: 'system' },
    { name: 'client', displayName: 'Client', level: 60, type: 'system' },
  ];
};

export default getTenantModel(null, 'Role', roleSchema);
```

---

## 3. Permission Schema

**File:** `backend/models/rbac/permission.schema.js`

```javascript
import mongoose from 'mongoose';

const permissionSchema = new mongoose.Schema({
  // Module Identifier (e.g., 'hrm.employees', 'projects.tasks')
  module: {
    type: String,
    required: true,
    trim: true,
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
      'applications',
      'hrm',
      'projects',
      'crm',
      'recruitment',
      'finance',
      'administration',
      'content',
      'dashboards',
      'reports',
    ],
  },

  // Sub-pages (for detailed permissions)
  subPages: [{
    name: {
      type: String,
      required: true,
    },
    route: {
      type: String,
      required: true,
    },
  }],

  // Available Actions
  actions: {
    type: [String],
    default: ['read', 'create', 'write', 'delete', 'import', 'export'],
    enum: ['all', 'read', 'create', 'write', 'delete', 'import', 'export', 'approve', 'assign'],
  },

  // Description
  description: {
    type: String,
    default: '',
  },

  // Sort Order
  sortOrder: {
    type: Number,
    default: 0,
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
permissionSchema.index({ module: 1 }, { unique: true });
permissionSchema.index({ category: 1, sortOrder: 1 });

// Pre-save middleware
permissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get all modules
permissionSchema.statics.getAllModules = function() {
  return this.distinct('module').sort();
};

// Static method to get permissions by category
permissionSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ sortOrder: 1 });
};

export default mongoose.model('Permission', permissionSchema);
```

---

## 4. Role Permission Schema

**File:** `backend/models/rbac/rolePermission.schema.js`

```javascript
import mongoose from 'mongoose';
import { getTenantModel } from '../../utils/mongooseMultiTenant.js';

const rolePermissionSchema = new mongoose.Schema({
  // References
  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
    index: true,
  },

  permissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission',
    required: true,
    index: true,
  },

  // Company Association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
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

  // Sub-page permissions (optional detailed control)
  subPagePermissions: {
    type: Map,
    of: {
      all: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
    },
    default: {},
  },

  // Custom conditions (future: data-level permissions)
  conditions: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
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
rolePermissionSchema.index({ companyId: 1, roleId: 1, permissionId: 1 }, { unique: true });
rolePermissionSchema.index({ companyId: 1, roleId: 1 });

// Pre-save middleware
rolePermissionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// If 'all' is true, set all other actions to true
rolePermission.pre('save', function(next) {
  if (this.actions.all) {
    this.actions.read = true;
    this.actions.create = true;
    this.actions.write = true;
    this.actions.delete = true;
    this.actions.import = true;
    this.actions.export = true;
  }
  next();
});

export default getTenantModel(null, 'RolePermission', rolePermissionSchema);
```

---

## 5. User Role Schema

**File:** `backend/models/rbac/userRole.schema.js`

```javascript
import mongoose from 'mongoose';
import { getTenantModel } from '../../utils/mongooseMultiTenant.js';

const userRoleSchema = new mongoose.Schema({
  // References
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  roleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
    index: true,
  },

  // Company Association
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  // Is this the user's primary role?
  isPrimary: {
    type: Boolean,
    default: true,
  },

  // Custom permission overrides (per user)
  permissionOverrides: [{
    permissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permission',
    },
    actions: {
      all: Boolean,
      read: Boolean,
      create: Boolean,
      write: Boolean,
      delete: Boolean,
      import: Boolean,
      export: Boolean,
    },
  }],

  // Assigned by
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Expiration (optional)
  expiresAt: {
    type: Date,
    default: null,
  },

  // Active Status
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
  collection: 'user_roles',
});

// Indexes
userRoleSchema.index({ companyId: 1, userId: 1, roleId: 1 });
userRoleSchema.index({ companyId: 1, userId: 1, isPrimary: 1 });
userRoleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired roles

// Pre-save middleware
userRoleSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Static method to get user's primary role
userRoleSchema.statics.getUserPrimaryRole = function(userId, companyId) {
  return this.findOne({
    userId,
    companyId,
    isPrimary: true,
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).populate('roleId');
};

// Static method to get all user roles
userRoleSchema.statics.getUserRoles = function(userId, companyId) {
  return this.find({
    userId,
    companyId,
    isActive: true,
    $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
  }).populate('roleId');
};

export default getTenantModel(null, 'UserRole', userRoleSchema);
```

---

## 6. Permission Package Schema

**File:** `backend/models/rbac/permissionPackage.schema.js`

```javascript
import mongoose from 'mongoose';

const permissionPackageSchema = new mongoose.Schema({
  // Basic Information
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

  // Subscription Tier
  tier: {
    type: String,
    enum: ['free', 'basic', 'standard', 'premium', 'enterprise'],
    required: true,
  },

  // Features Limit
  features: {
    maxUsers: {
      type: Number,
      default: 10,
    },
    maxCompanies: {
      type: Number,
      default: 1,
    },
    maxRoles: {
      type: Number,
      default: 5,
    },
    maxCustomRoles: {
      type: Number,
      default: 2,
    },
  },

  // Included Modules
  includedModules: [{
    type: String,
  }],

  // Default Permissions (embedded for performance)
  defaultPermissions: [{
    module: {
      type: String,
      required: true,
    },
    actions: {
      all: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      create: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
    },
  }],

  // Pricing
  pricing: {
    monthly: {
      type: Number,
      default: 0,
    },
    yearly: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: 'USD',
    },
  },

  // Status
  isActive: {
    type: Boolean,
    default: true,
  },

  // Display Order
  sortOrder: {
    type: Number,
    default: 0,
  },

  // Features List (for display)
  featuresList: [{
    type: String,
  }],

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
  collection: 'permission_packages',
});

// Indexes
permissionPackageSchema.index({ tier: 1, isActive: 1 });
permissionPackageSchema.index({ sortOrder: 1 });

export default mongoose.model('PermissionPackage', permissionPackageSchema);
```

---

## 7. Company Permission Schema

**File:** `backend/models/rbac/companyPermission.schema.js`

```javascript
import mongoose from 'mongoose';

const companyPermissionSchema = new mongoose.Schema({
  // Company Reference
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    unique: true,
    index: true,
  },

  // Package Reference
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PermissionPackage',
    required: true,
  },

  // Permission Overrides (per module)
  permissionOverrides: [{
    module: {
      type: String,
      required: true,
    },
    actions: {
      all: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      create: { type: Boolean, default: false },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false },
    },
  }],

  // Module Whitelist (only these modules accessible)
  moduleWhitelist: {
    type: [String],
    default: null, // null means all modules from package
  },

  // Module Blacklist (these modules NOT accessible)
  moduleBlacklist: {
    type: [String],
    default: [],
  },

  // Custom Roles (beyond package limits)
  customRoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
  }],

  // Subscription Details
  subscription: {
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
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
  collection: 'company_permissions',
});

// Indexes
companyPermissionSchema.index({ packageId: 1 });
companyPermissionSchema.index({ 'subscription.isActive': 1 });
companyPermissionSchema.index({ 'subscription.endDate': 1 });

// Method to get effective permissions for a module
companyPermissionSchema.methods.getModulePermissions = function(module) {
  // Check blacklist first
  if (this.moduleBlacklist && this.moduleBlacklist.includes(module)) {
    return null; // Access denied
  }

  // Check whitelist
  if (this.moduleWhitelist && !this.moduleWhitelist.includes(module)) {
    return null; // Access denied if whitelist exists and module not in it
  }

  // Check overrides
  const override = this.permissionOverrides.find(o => o.module === module);
  if (override) {
    return override.actions;
  }

  // Return null (use package defaults)
  return null;
};

export default mongoose.model('CompanyPermission', companyPermissionSchema);
```

---

## 8. Permission Audit Schema

**File:** `backend/models/rbac/permissionAudit.schema.js`

```javascript
import mongoose from 'mongoose';

const permissionAuditSchema = new mongoose.Schema({
  // Company Context
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true,
  },

  // Action Type
  actionType: {
    type: String,
    enum: [
      'role_created',
      'role_updated',
      'role_deleted',
      'permission_assigned',
      'permission_removed',
      'user_role_assigned',
      'user_role_removed',
      'package_assigned',
      'permission_override',
    ],
    required: true,
  },

  // Target Entity
  entityType: {
    type: String,
    enum: ['role', 'user', 'company', 'package'],
    required: true,
  },

  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },

  // Changes
  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  // Previous Value (for updates)
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  // New Value (for updates)
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  // Performed By
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // IP Address
  ipAddress: {
    type: String,
    default: null,
  },

  // User Agent
  userAgent: {
    type: String,
    default: null,
  },

  // Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  collection: 'permission_audit',
  timestamps: false,
});

// Indexes
permissionAuditSchema.index({ companyId: 1, createdAt: -1 });
permissionAuditSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
permissionAuditSchema.index({ performedBy: 1, createdAt: -1 });

// TTL index - keep audit logs for 1 year
permissionAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.model('PermissionAudit', permissionAuditSchema);
```

---

## 9. Indexes & Performance

### 9.1 Index Summary

| Schema | Index | Purpose |
|--------|-------|---------|
| `Role` | `{companyId: 1, name: 1}` | Unique role name per company |
| `Role` | `{companyId: 1, isActive: 1}` | Active role queries |
| `Role` | `{level: 1}` | Role hierarchy queries |
| `Permission` | `{module: 1}` | Unique module lookup |
| `RolePermission` | `{companyId: 1, roleId: 1, permissionId: 1}` | Junction uniqueness |
| `UserRole` | `{companyId: 1, userId: 1, isPrimary: 1}` | Primary role lookup |
| `CompanyPermission` | `{companyId: 1}` | Company permission lookup |

### 9.2 Caching Strategy

```javascript
// Cache Keys
const CACHE_KEYS = {
  USER_PERMISSIONS: (userId, companyId) => `permissions:user:${userId}:${companyId}`,
  ROLE_PERMISSIONS: (roleId, companyId) => `permissions:role:${roleId}:${companyId}`,
  COMPANY_PERMISSIONS: (companyId) => `permissions:company:${companyId}`,
  MODULE_LIST: () => `permissions:modules`,
};

// Cache TTL
const CACHE_TTL = {
  PERMISSIONS: 3600, // 1 hour
  MODULES: 86400, // 24 hours
  ROLES: 1800, // 30 minutes
};
```

---

## 10. Seed Data

### 10.1 System Roles Seed

```javascript
const systemRoles = [
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'superadmin',
    displayName: 'Super Admin',
    description: 'Platform administrator with full access',
    type: 'system',
    level: 1,
    companyId: null, // Global role
    isActive: true,
    isDefault: false,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'admin',
    displayName: 'Administrator',
    description: 'Company administrator',
    type: 'system',
    level: 10,
    companyId: null,
    isActive: true,
    isDefault: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'hr',
    displayName: 'HR Manager',
    description: 'Human Resources manager',
    type: 'system',
    level: 20,
    companyId: null,
    isActive: true,
    isDefault: false,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'manager',
    displayName: 'Manager',
    description: 'Team/Project manager',
    type: 'system',
    level: 30,
    companyId: null,
    isActive: true,
    isDefault: false,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'employee',
    displayName: 'Employee',
    description: 'Standard employee',
    type: 'system',
    level: 50,
    companyId: null,
    isActive: true,
    isDefault: true,
  },
  {
    _id: new mongoose.Types.ObjectId(),
    name: 'client',
    displayName: 'Client',
    description: 'External client access',
    type: 'system',
    level: 60,
    companyId: null,
    isActive: true,
    isDefault: false,
  },
];
```

### 10.2 Permissions Seed (Sample)

```javascript
const permissionsSeed = [
  // Super Admin
  {
    module: 'super-admin.dashboard',
    displayName: 'Dashboard',
    category: 'super-admin',
    actions: ['all'],
    sortOrder: 1,
  },
  {
    module: 'super-admin.companies',
    displayName: 'Companies',
    category: 'super-admin',
    actions: ['read', 'create', 'write', 'delete'],
    sortOrder: 2,
  },
  {
    module: 'super-admin.packages',
    displayName: 'Packages',
    category: 'super-admin',
    actions: ['read', 'create', 'write', 'delete'],
    sortOrder: 4,
  },

  // HRM
  {
    module: 'hrm.employees',
    displayName: 'Employees',
    category: 'hrm',
    subPages: [
      { name: 'Employees List', route: '/employees' },
      { name: 'Departments', route: '/departments' },
      { name: 'Designations', route: '/designations' },
      { name: 'Policies', route: '/policy' },
    ],
    actions: ['all'],
    sortOrder: 1,
  },
  {
    module: 'hrm.leaves',
    displayName: 'Leaves',
    category: 'hrm',
    subPages: [
      { name: 'Leaves (Admin)', route: '/leaves' },
      { name: 'Leaves (Employee)', route: '/leaves-employee' },
      { name: 'Leave Settings', route: '/leave-settings' },
    ],
    actions: ['read', 'create', 'write', 'delete', 'export'],
    sortOrder: 5,
  },
  {
    module: 'hrm.attendance',
    displayName: 'Attendance',
    category: 'hrm',
    subPages: [
      { name: 'Attendance (Admin)', route: '/attendance-admin' },
      { name: 'Attendance (Employee)', route: '/attendance-employee' },
      { name: 'Timesheet', route: '/timesheets' },
    ],
    actions: ['all'],
    sortOrder: 6,
  },

  // Projects
  {
    module: 'projects.clients',
    displayName: 'Clients',
    category: 'projects',
    actions: ['all'],
    sortOrder: 1,
  },
  {
    module: 'projects.list',
    displayName: 'Projects',
    category: 'projects',
    actions: ['all'],
    sortOrder: 2,
  },
  {
    module: 'projects.tasks',
    displayName: 'Tasks',
    category: 'projects',
    actions: ['all'],
    sortOrder: 3,
  },

  // CRM
  {
    module: 'crm.contacts',
    displayName: 'Contacts',
    category: 'crm',
    actions: ['all'],
    sortOrder: 1,
  },
  {
    module: 'crm.companies',
    displayName: 'Companies',
    category: 'crm',
    actions: ['all'],
    sortOrder: 2,
  },
  {
    module: 'crm.leads',
    displayName: 'Leads',
    category: 'crm',
    actions: ['all'],
    sortOrder: 4,
  },
  {
    module: 'crm.deals',
    displayName: 'Deals',
    category: 'crm',
    actions: ['all'],
    sortOrder: 3,
  },
];
```

### 10.3 Default Permissions by Role

```javascript
const defaultRolePermissions = {
  superadmin: {
    // Full access to all modules
    'super-admin.*': { all: true },
    'applications.*': { all: true },
    'hrm.*': { all: true },
    'projects.*': { all: true },
    'crm.*': { all: true },
    'recruitment.*': { all: true },
    'finance.*': { all: true },
    'administration.*': { all: true },
    'content.*': { all: true },
  },
  admin: {
    // Full company access
    'applications.*': { all: true },
    'hrm.*': { all: true },
    'projects.*': { all: true },
    'crm.*': { all: true },
    'recruitment.*': { all: true },
    'finance.*': { all: true },
    'administration.*': { all: true },
  },
  hr: {
    'hrm.employees': { all: true },
    'hrm.leaves': { all: true },
    'hrm.attendance': { read: true, export: true },
    'hrm.performance': { all: true },
    'hrm.training': { read: true, create: true },
    'hrm.holidays': { all: true },
    'administration.reports': { read: true, export: true },
  },
  manager: {
    'hrm.employees': { read: true },
    'hrm.attendance': { read: true },
    'projects.*': { all: true },
    'crm.leads': { all: true },
    'crm.deals': { all: true },
    'administration.reports': { read: true, export: true },
  },
  employee: {
    'hrm.employees': { read: true }, // Self only
    'hrm.leaves': { create: true, read: true },
    'hrm.attendance': { read: true }, // Self only
    'hrm.timesheet': { create: true, write: true },
    'applications.calendar': { all: true },
    'applications.notes': { all: true },
  },
  client: {
    'projects.clients': { read: true },
    'projects.list': { read: true },
    'projects.tasks': { read: true, write: true },
    'applications.chat': { all: true },
  },
};
```

---

**Next Document:** [04_IMPLEMENTATION_PLAN.md](./04_IMPLEMENTATION_PLAN.md)
