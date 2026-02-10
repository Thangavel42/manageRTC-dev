# RBAC SYSTEM - BRUTAL VALIDATION REPORT

**Date:** 2026-02-10
**Project:** manageRTC-my
**Scope:** Complete RBAC (Role-Based Access Control) System Analysis
**Status:** CRITICAL ISSUES IDENTIFIED - RESTRUCTURING REQUIRED

---

## EXECUTIVE SUMMARY

This report provides a comprehensive analysis of the current RBAC implementation in the manageRTC-my application. The analysis reveals **CRITICAL ARCHITECTURAL ISSUES** that require immediate restructuring.

### Key Findings:
1. **Current implementation is partially functional but architecturally inconsistent**
2. **Dual permission systems exist** (embedded + junction table) causing confusion
3. **Pages collection is NOT fully integrated** with the permission system
4. **Module-Page-Permission relationship is incomplete**
5. **No dedicated "Pages" management UI** exists in SuperAdmin
6. **Company-Plan-Module-Page chain is broken**

---

## TABLE OF CONTENTS

1. [Current Structure Analysis](#1-current-structure-analysis)
2. [Critical Issues Identified](#2-critical-issues-identified)
3. [Proposed New Architecture](#3-proposed-new-architecture)
4. [Database Schema Redesign](#4-database-schema-redesign)
5. [Pages Inventory](#5-pages-inventory)
6. [Implementation Phases](#6-implementation-phases)
7. [Multi-Tenancy Architecture Review](#7-multi-tenancy-architecture-review)

---

## 1. CURRENT STRUCTURE ANALYSIS

### 1.1 Existing Collections

#### 1.1.1 **roles** Collection
**File:** `backend/models/rbac/role.schema.js`

```javascript
{
  name: String,              // Unique identifier (e.g., 'super-admin')
  displayName: String,       // Display name (e.g., 'Super Admin')
  description: String,
  type: String,              // 'system' | 'custom'
  level: Number,             // 1-100 (lower = higher priority)
  isActive: Boolean,
  isDefault: Boolean,
  isDeleted: Boolean,

  // EMBEDDED PERMISSIONS (New Structure)
  permissions: [{
    permissionId: ObjectId,
    module: String,          // e.g., 'hrm.employees'
    category: String,        // e.g., 'hrm'
    displayName: String,
    actions: {
      all: Boolean,
      read: Boolean,
      create: Boolean,
      write: Boolean,
      delete: Boolean,
      import: Boolean,
      export: Boolean,
      approve: Boolean,
      assign: Boolean
    }
  }],

  permissionStats: {
    totalPermissions: Number,
    categories: [String],
    lastUpdatedAt: Date
  }
}
```

**Status:** PARTIALLY FUNCTIONAL - Uses embedded permissions but not integrated with Pages

#### 1.1.2 **permissions** Collection
**File:** `backend/models/rbac/permission.schema.js`

```javascript
{
  module: String,            // Unique (e.g., 'hrm.employees')
  displayName: String,       // e.g., 'Employees'
  category: String,          // 'super-admin' | 'users-permissions' | 'applications' | 'hrm' | 'projects' | 'crm' | 'recruitment' | 'finance' | 'administration' | 'content' | 'pages' | 'auth' | 'ui' | 'extras' | 'dashboards'
  description: String,
  sortOrder: Number,
  availableActions: [String], // ['all', 'read', 'create', 'write', 'delete', 'import', 'export']
  isActive: Boolean
}
```

**CRITICAL ISSUE:** This collection serves NO purpose in the new architecture. Permissions should be derived from Pages, not stored separately.

#### 1.1.3 **modules** Collection
**File:** `backend/models/rbac/module.schema.js`

```javascript
{
  name: String,              // Unique (e.g., 'hrm')
  displayName: String,       // 'Human Resources'
  description: String,
  icon: String,              // Tabler icon class
  route: String,             // '/hrm'

  pages: [{                  // Embedded pages array
    pageId: ObjectId,
    name: String,
    displayName: String,
    route: String,
    icon: String,
    sortOrder: Number,
    isActive: Boolean
  }],

  isActive: Boolean,
  isSystem: Boolean,
  sortOrder: Number,
  accessLevel: String,       // 'all' | 'premium' | 'enterprise'
  color: String
}
```

**Status:** FUNCTIONAL - Has pages but they're not properly linked to permissions

#### 1.1.4 **pages** Collection
**File:** `backend/models/rbac/page.schema.js`

```javascript
{
  name: String,              // Unique (e.g., 'hrm.employees')
  displayName: String,       // 'Employees'
  description: String,
  route: String,             // '/hrm/employees'
  icon: String,
  moduleCategory: String,    // 'hrm' | 'projects' | 'crm' | 'recruitment' | 'finance' | 'administration' | 'reports' | 'applications' | 'content' | 'super-admin'
  parentPage: ObjectId,      // For nested pages
  sortOrder: Number,
  isSystem: Boolean,
  isActive: Boolean,
  meta: {
    title: String,
    keywords: [String],
    layout: String
  }
}
```

**CRITICAL ISSUE:** Pages exist but have NO `availableActions` field. Actions are hardcoded in permissions.

#### 1.1.5 **role_permissions** Collection (Junction Table)
**File:** `backend/models/rbac/rolePermission.schema.js`

```javascript
{
  roleId: ObjectId,
  permissionId: ObjectId,
  actions: {
    all, read, create, write, delete, import, export, approve, assign
  }
}
```

**Status:** DEPRECATED - Being replaced by embedded permissions in roles

#### 1.1.6 **packages (Plan)** Collection
**File:** `backend/models/superadmin/package.schema.js`

```javascript
{
  planName: String,
  planType: String,
  price: Number,
  planPosition: String,
  planCurrency: String,
  planModules: [{           // Embedded module references
    moduleId: String,
    moduleName: String,
    moduleDisplayName: String
  }],
  accessTrial: Boolean,
  trialDays: Number,
  isRecommended: Boolean,
  status: String
}
```

**ISSUE:** planModules uses Strings instead of ObjectIds. Should reference modules collection.

#### 1.1.7 **companies** Collection
**File:** `backend/models/superadmin/package.schema.js`

```javascript
{
  name: String,
  email: String,
  domain: String,
  phone: String,
  website: String,
  address: String,
  status: String,

  // Plan details
  plan_id: String,           // Should be ObjectId reference
  plan_name: String,
  plan_type: String,
  currency: String,
  logo: String
}
```

**ISSUE:** plan_id is a String, not ObjectId. No proper foreign key relationship.

---

### 1.2 Current UI Pages

| Page | Route | Status | Issues |
|------|-------|--------|--------|
| Dashboard | `/super-admin/dashboard` | ✓ Working | - |
| Roles | `/super-admin/rolePermission` | ✓ Working | Shows roles list |
| Permissions | `/super-admin/permissionpage` | ⚠ Partial | Uses permissions collection, not pages |
| Modules | `/super-admin/modules` | ✓ Working | Manages modules & pages |
| Companies | `/super-admin/companies` | ✓ Working | - |
| Packages | `/super-admin/package` | ✓ Working | planModules uses strings |
| Subscriptions | `/super-admin/subscription` | ✓ Working | - |

**MISSING:** No dedicated "Pages" management page in SuperAdmin

---

### 1.3 Current API Endpoints

#### RBAC Routes
```
GET    /api/rbac/roles                    - Get all roles
POST   /api/rbac/roles                    - Create role
GET    /api/rbac/roles/:id                - Get role by ID
PUT    /api/rbac/roles/:id                - Update role
DELETE /api/rbac/roles/:id                - Delete role
PATCH  /api/rbac/roles/:id/toggle-status  - Toggle role status
GET    /api/rbac/roles/with-summary       - Get roles with permission count
POST   /api/rbac/roles/:id/clone          - Clone role
GET    /api/rbac/roles/:roleId/permissions - Get role permissions
PUT    /api/rbac/roles/:roleId/permissions - Set role permissions
PATCH  /api/rbac/roles/:roleId/permissions/:permissionId - Update role permission
GET    /api/rbac/roles/:roleId/check-permission - Check role permission

GET    /api/rbac/permissions/grouped      - Get permissions grouped
GET    /api/rbac/permissions              - Get all permissions
POST   /api/rbac/permissions              - Create permission
GET    /api/rbac/permissions/category/:category - Get by category

GET    /api/rbac/modules/stats            - Get module statistics
GET    /api/rbac/modules/menu             - Get menu structure
GET    /api/rbac/modules                  - Get all modules
POST   /api/rbac/modules                  - Create module
GET    /api/rbac/modules/:id              - Get module by ID
PUT    /api/rbac/modules/:id              - Update module
DELETE /api/rbac/modules/:id              - Delete module
PATCH  /api/rbac/modules/:id/toggle-status - Toggle module status
GET    /api/rbac/modules/pages            - Get all pages
GET    /api/rbac/modules/pages/grouped    - Get pages grouped by module
GET    /api/rbac/modules/:id/available-pages - Get available pages for module
PUT    /api/rbac/modules/:id/pages        - Configure module pages
POST   /api/rbac/modules/:id/pages        - Add page to module
DELETE /api/rbac/modules/:id/pages/:pageId - Remove page from module
PUT    /api/rbac/modules/:id/pages/order  - Update page order
PATCH  /api/rbac/modules/:id/pages/:pageId/toggle - Toggle page status
```

---

## 2. CRITICAL ISSUES IDENTIFIED

### 2.1 Architecture Issues

| # | Issue | Severity | Impact |
|---|-------|----------|--------|
| 1 | **Dual Permission Systems** - Both embedded permissions and junction table exist | CRITICAL | Confusion, data inconsistency |
| 2 | **Pages NOT used for Permissions** - Permissions collection is separate from Pages | CRITICAL | Cannot derive permissions from pages |
| 3 | **No `availableActions` in Pages** - Actions are hardcoded | HIGH | Cannot customize actions per page |
| 4 | **String References in Packages** - planModules uses strings instead of ObjectIds | HIGH | No referential integrity |
| 5 | **String plan_id in Companies** - Should be ObjectId reference | MEDIUM | No foreign key relationship |
| 6 | **No dedicated "Pages" UI** - Cannot manage pages independently | MEDIUM | Poor user experience |
| 7 | **Module-Page-Permission chain broken** | CRITICAL | System doesn't work end-to-end |

### 2.2 Data Flow Issues

```
CURRENT (BROKEN):
Companies (plan_id: String) ──> Plans (planModules: [String])
                                └─> Modules (pages: [ObjectId])
                                      └─> Pages (NO availableActions)
                                            ✗ Cannot determine permissions

Roles (permissions: [{permissionId, actions}])
     └─> Permissions (module, category, availableActions)
          ✗ Separate from Pages
```

### 2.3 Missing Features

1. **No page-level action configuration** - Cannot specify which actions are available for each page
2. **No permission inheritance** - Cannot inherit from parent pages
3. **No dynamic menu generation** based on role permissions
4. **No route protection** middleware using the RBAC system
5. **No audit trail** for permission changes

---

## 3. PROPOSED NEW ARCHITECTURE

### 3.1 Design Principles

1. **Single Source of Truth** - Pages collection defines all accessible routes
2. **Action-Based Permissions** - Each page defines available actions
3. **Role-Based Access** - Roles get page-level permissions with action granularity
4. **Module Composition** - Modules contain groups of pages
5. **Plan-Based Access** - Plans define which modules are available
6. **Company Isolation** - Companies have plans and their own databases

### 3.2 New Data Flow

```
PROPOSED (CLEAN):
Companies (planId: ObjectId) ──> Plans (planModules: [ObjectId])
                                  └─> Modules (pages: [{pageId, sortOrder}])
                                        └─> Pages (availableActions: [String])
                                              └─> Roles (allowedPages: [{pageId, actions}])
```

---

## 4. DATABASE SCHEMA REDESIGN

### 4.1 **pages** Collection (ENHANCED)

```javascript
{
  _id: ObjectId,

  // Identification
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },              // e.g., 'hrm.employees.list'

  displayName: {
    type: String,
    required: true
  },              // e.g., 'Employees List'

  description: String,

  // Route
  route: {
    type: String,
    required: true
  },              // e.g., '/employees'

  icon: {
    type: String,
    default: 'ti ti-file'
  },

  // Categorization
  moduleCategory: {
    type: String,
    enum: ['super-admin', 'users-permissions', 'applications', 'hrm', 'projects',
            'crm', 'recruitment', 'finance', 'administration', 'content',
            'pages', 'auth', 'ui', 'extras', 'dashboards', null]
  },

  parentPage: {
    type: ObjectId,
    ref: 'Page',
    default: null
  },

  // Display & Sorting
  sortOrder: {
    type: Number,
    default: 0
  },

  isSystem: {
    type: Boolean,
    default: false
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // AVAILABLE ACTIONS - NEW FIELD
  availableActions: [{
    type: String,
    enum: ['all', 'read', 'create', 'write', 'delete', 'import', 'export', 'approve', 'assign']
  }],

  // SEO / Display metadata
  meta: {
    title: String,
    keywords: [String],
    layout: {
      type: String,
      enum: ['default', 'full-width', 'no-sidebar', 'blank'],
      default: 'default'
    }
  },

  // Audit
  createdBy: ObjectId,
  updatedBy: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

### 4.2 **roles** Collection (RESTRUCTURED)

```javascript
{
  _id: ObjectId,

  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },

  displayName: {
    type: String,
    required: true
  },

  description: String,

  type: {
    type: String,
    enum: ['system', 'custom'],
    default: 'custom'
  },

  level: {
    type: Number,
    required: true,
    default: 100,
    min: 1,
    max: 100
  },

  isActive: Boolean,
  isDefault: Boolean,
  isDeleted: Boolean,
  deletedAt: Date,

  // NEW STRUCTURE: Allowed Pages with Actions
  allowedPages: [{
    pageId: {
      type: ObjectId,
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
    categories: [String],
    lastUpdatedAt: Date
  },

  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### 4.3 **modules** Collection (UPDATED)

```javascript
{
  _id: ObjectId,

  name: {
    type: String,
    required: true,
    unique: true
  },

  displayName: {
    type: String,
    required: true
  },

  description: String,
  icon: String,
  route: String,

  // Pages assigned to this module
  allowedPages: [{
    type: ObjectId,
    ref: 'Page'
  }],

  isActive: Boolean,
  isSystem: Boolean,
  sortOrder: Number,
  accessLevel: {
    type: String,
    enum: ['all', 'premium', 'enterprise'],
    default: 'all'
  },
  color: String,

  createdBy: ObjectId,
  updatedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### 4.4 **plans** Collection (FIXED)

```javascript
{
  _id: ObjectId,

  planName: String,
  planType: String,
  price: Number,
  planPosition: String,
  planCurrency: String,

  // Reference to Modules (ObjectId array, not strings!)
  planModules: [{
    type: ObjectId,
    ref: 'Module'
  }],

  accessTrial: Boolean,
  trialDays: Number,
  isRecommended: Boolean,
  status: String,
  description: String,
  logo: String,

  createdAt: Date,
  updatedAt: Date
}
```

### 4.5 **companies** Collection (FIXED)

```javascript
{
  _id: ObjectId,

  name: String,
  email: String,
  domain: String,
  phone: String,
  website: String,
  address: String,
  status: {
    type: String,
    default: 'Active'
  },

  // Reference to Plan (ObjectId, not string!)
  planId: {
    type: ObjectId,
    ref: 'Plan'
  },

  currency: String,
  logo: String,

  createdAt: Date,
  updatedAt: Date
}
```

---

## 5. PAGES INVENTORY

### 5.1 Complete Pages List (from user's requirements)

#### I. SUPER ADMIN (5 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 1 | Dashboard | `/super-admin/dashboard` | super-admin | read |
| 2 | Companies | `/super-admin/companies` | super-admin | read, create, write, delete, import, export |
| 3 | Subscriptions | `/super-admin/subscription` | super-admin | read, create, write, delete, import, export |
| 4 | Packages | `/super-admin/package` | super-admin | read, create, write, delete, import, export |
| 5 | Modules | `/super-admin/modules` | super-admin | read, create, write, delete |

#### II. USERS & PERMISSIONS (3 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 6 | Users | `/users` | users-permissions | read, create, write, delete, import, export |
| 7 | Roles & Permissions | `/roles-permissions` | users-permissions | read, create, write, delete |
| 8 | Permission | `/permission` | users-permissions | read, create, write, delete |

#### III. DASHBOARDS (5 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 9 | Admin Dashboards | `/admin-dashboard` | dashboards | read |
| 10 | HR Dashboard | `/hr-dashboard` | dashboards | read |
| 11 | Employee Dashboard | `/employee-dashboard` | dashboards | read |
| 12 | Deals Dashboard | `/deals-dashboard` | dashboards | read |
| 13 | Leads Dashboard | `/leads-dashboard` | dashboards | read |

#### IV. HRM - EMPLOYEES (5 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 14 | Employees List | `/employees` | hrm | read, create, write, delete, import, export |
| 15 | Department | `/departments` | hrm | read, create, write, delete, import, export |
| 16 | Designation | `/designations` | hrm | read, create, write, delete, import, export |
| 17 | Policies | `/policy` | hrm | read, create, write, delete |
| 18 | Tickets List | `/tickets/ticket-list` | hrm | read, create, write, delete |
| 19 | Tickets Detail | `/tickets/ticket-details` | hrm | read, write |
| 20 | Holidays | `/hrm/holidays` | hrm | read, create, write, delete, import, export |

#### V. HRM - ATTENDANCE (8 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 21 | Leaves (Admin) | `/leaves` | hrm | read, create, write, delete, approve, import, export |
| 22 | Leaves (Employee) | `/leaves-employee` | hrm | read, create, write |
| 23 | Leave Settings | `/leave-settings` | hrm | read, write |
| 24 | Attendance (Admin) | `/attendance-admin` | hrm | read, create, write, delete, import, export |
| 25 | Attendance (Employee) | `/attendance-employee` | hrm | read, create |
| 26 | Timesheet | `/timesheets` | hrm | read, create, write, delete, approve, import, export |
| 27 | Shift & Schedule | `/schedule-timing` | hrm | read, create, write, delete, import, export |
| 28 | Shift Management | `/shifts-management` | hrm | read, create, write, delete, import, export |
| 29 | Shift Batches | `/batches-management` | hrm | read, create, write, delete, import, export |
| 30 | Overtime | `/overtime` | hrm | read, create, write, delete, approve, import, export |

#### VI. HRM - PERFORMANCE (5 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 31 | Performance Indicator | `/performance/performance-indicator` | hrm | read, create, write, delete, import, export |
| 32 | Performance Review | `/performance/performance-review` | hrm | read, create, write, delete, approve |
| 33 | Performance Appraisal | `/performance/performance-appraisal` | hrm | read, create, write, delete, approve |
| 34 | Goal List | `/performance/goal-tracking` | hrm | read, create, write, delete, import, export |
| 35 | Goal Type | `/performance/goal-type` | hrm | read, create, write, delete, import, export |

#### VII. HRM - TRAINING (3 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 36 | Training List | `/training/training-list` | hrm | read, create, write, delete, import, export |
| 37 | Trainers | `/training/trainers` | hrm | read, create, write, delete, import, export |
| 38 | Training Type | `/training/training-type` | hrm | read, create, write, delete, import, export |

#### VIII. HRM - OTHER (3 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 39 | Promotions | `/promotions` | hrm | read, create, write, delete, approve |
| 40 | Resignation | `/resignation` | hrm | read, create, write, delete, approve |
| 41 | Termination | `/termination` | hrm | read, create, write, delete |

#### IX. RECRUITMENT (3 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 42 | Jobs | `/jobs` | recruitment | read, create, write, delete, import, export |
| 43 | Candidates | `/candidates` | recruitment | read, create, write, delete, import, export |
| 44 | Referrals | `/referrals` | recruitment | read, create, write, delete, import, export |

#### X. PROJECTS (4 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 45 | Clients | `/clients-grid` | projects | read, create, write, delete, import, export |
| 46 | Projects | `/projects-grid` | projects | read, create, write, delete, import, export |
| 47 | Task | `/tasks` | projects | read, create, write, delete, import, export |
| 48 | Task Board | `/task-board` | projects | read, create, write, delete |

#### XI. CRM (7 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 49 | Contacts | `/contacts` | crm | read, create, write, delete, import, export |
| 50 | Companies | `/companies` | crm | read, create, write, delete, import, export |
| 51 | Deals | `/deals` | crm | read, create, write, delete, import, export |
| 52 | Leads | `/leads` | crm | read, create, write, delete, import, export |
| 53 | Pipeline | `/pipeline` | crm | read, create, write, delete |
| 54 | Analytics | `/analytics` | crm | read |
| 55 | Activities | `/activities` | crm | read, create, write, delete |

#### XII. APPLICATIONS (10 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 56 | Chat | `/application/chat` | applications | read, create, write, delete |
| 57 | Voice Call | `/application/voice-call` | applications | read, create, write |
| 58 | Video Call | `/application/video-call` | applications | read, create, write |
| 59 | Outgoing Call | `/application/outgoing-call` | applications | read, create, write |
| 60 | Incoming Call | `/application/incoming-call` | applications | read |
| 61 | Call History | `/application/call-history` | applications | read, delete |
| 62 | Calendar | `/calendar` | applications | read, create, write, delete |
| 63 | Email | `/application/email` | applications | read, create, write, delete |
| 64 | To Do | `/application/todo` | applications | read, create, write, delete |
| 65 | Notes | `/notes` | applications | read, create, write, delete |
| 66 | Social Feed | `/application/social-feed` | applications | read, create, write, delete |
| 67 | File Manager | `/application/file-manager` | applications | read, create, write, delete |
| 68 | Kanban | `/application/kanban-view` | applications | read, create, write, delete |
| 69 | Invoices | `/application/invoices` | applications | read, create, write, delete, import, export |

#### XIII. FINANCE & ACCOUNTS (17 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 70 | Estimates | `/finance/sales/estimates` | finance | read, create, write, delete, import, export |
| 71 | Invoices | `/finance/sales/invoices` | finance | read, create, write, delete, import, export |
| 72 | Payments | `/finance/sales/payments` | finance | read, create, write, delete, import, export |
| 73 | Expenses | `/finance/sales/expenses` | finance | read, create, write, delete, import, export |
| 74 | Provident Fund | `/finance/sales/provident-fund` | finance | read, create, write, delete |
| 75 | Taxes | `/finance/sales/taxes` | finance | read, create, write, delete |
| 76 | Categories | `/finance/accounting/categories` | finance | read, create, write, delete |
| 77 | Budgets | `/finance/accounting/budgets` | finance | read, create, write, delete, import, export |
| 78 | Budget Expenses | `/finance/accounting/budget-expenses` | finance | read, create, write, delete, import, export |
| 79 | Budget Revenues | `/finance/accounting/budget-revenues` | finance | read, create, write, delete, import, export |
| 80 | Employee Salary | `/finance/payroll/employee-salary` | finance | read, create, write, delete, import, export |
| 81 | Payslip | `/finance/payroll/payslip` | finance | read, create, delete |
| 82 | Payroll Items | `/finance/payroll/payroll-items` | finance | read, create, write, delete |

#### XIV. ADMINISTRATION (27 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 83 | Assets | `/administration/assets/assets` | administration | read, create, write, delete, import, export |
| 84 | Asset Categories | `/administration/assets/asset-categories` | administration | read, create, write, delete |
| 85 | Knowledge Base | `/administration/help/knowledge-base` | administration | read, create, write, delete |
| 86 | Activities (Help) | `/administration/help/activities` | administration | read, create, write, delete |
| 87 | Users (Admin) | `/administration/user-management/users` | administration | read, create, write, delete, import, export |
| 88 | Roles & Permissions (Admin) | `/administration/user-management/roles-permissions` | administration | read, create, write, delete |
| 89 | Expense Report | `/administration/reports/expense-report` | administration | read, export |
| 90 | Invoice Report | `/administration/reports/invoice-report` | administration | read, export |
| 91 | Payment Report | `/administration/reports/payment-report` | administration | read, export |
| 92 | Project Report | `/administration/reports/project-report` | administration | read, export |
| 93 | Task Report | `/administration/reports/task-report` | administration | read, export |
| 94 | User Report | `/administration/reports/user-report` | administration | read, export |
| 95 | Employee Report | `/administration/reports/employee-report` | administration | read, export |
| 96 | Payslip Report | `/administration/reports/payslip-report` | administration | read, export |
| 97 | Attendance Report | `/administration/reports/attendance-report` | administration | read, export |
| 98 | Leave Report | `/administration/reports/leave-report` | administration | read, export |
| 99 | Daily Report | `/administration/reports/daily-report` | administration | read, export |
| 100 | General Settings | `/administration/settings/general-settings` | administration | read, write |
| 101 | Website Settings | `/administration/settings/website-settings` | administration | read, write |
| 102 | App Settings | `/administration/settings/app-settings` | administration | read, write |
| 103 | System Settings | `/administration/settings/system-settings` | administration | read, write |
| 104 | Financial Settings | `/administration/settings/financial-settings` | administration | read, write |
| 105 | Other Settings | `/administration/settings/other-settings` | administration | read, write |

#### XV. CONTENT (9 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 106 | Pages | `/content/pages` | content | read, create, write, delete |
| 107 | All Blogs | `/content/blogs/all-blogs` | content | read, create, write, delete |
| 108 | Categories | `/content/blogs/categories` | content | read, create, write, delete |
| 109 | Comments | `/content/blogs/comments` | content | read, create, write, delete |
| 110 | Blog Tags | `/content/blogs/blog-tags` | content | read, create, write, delete |
| 111 | Countries | `/content/locations/countries` | content | read, create, write, delete, import, export |
| 112 | States | `/content/locations/states` | content | read, create, write, delete, import, export |
| 113 | Cities | `/content/locations/cities` | content | read, create, write, delete, import, export |
| 114 | Testimonials | `/content/testimonials` | content | read, create, write, delete, import, export |
| 115 | FAQs | `/content/faqs` | content | read, create, write, delete |

#### XVI. PAGES (12 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 116 | Starter | `/starter` | pages | read |
| 117 | Profile | `/profile` | pages | read, write |
| 118 | Gallery | `/gallery` | pages | read |
| 119 | Search Results | `/search-results` | pages | read |
| 120 | Timeline | `/timeline` | pages | read |
| 121 | Pricing | `/pricing` | pages | read |
| 122 | Coming Soon | `/coming-soon` | pages | read |
| 123 | Under Maintenance | `/under-maintenance` | pages | read |
| 124 | Under Construction | `/under-construction` | pages | read |
| 125 | API Keys | `/api-keys` | pages | read, create, write, delete |
| 126 | Privacy Policy | `/privacy-policy` | pages | read |
| 127 | Terms & Conditions | `/terms-conditions` | pages | read |

#### XVII. AUTHENTICATION (7 variants × 7 pages = 49 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 128-134 | Login | `/auth/login/*` | auth | read |
| 135-141 | Register | `/auth/register/*` | auth | read |
| 142-148 | Forgot Password | `/auth/forgot-password/*` | auth | read |
| 149-155 | Reset Password | `/auth/reset-password/*` | auth | read |
| 156-162 | Email Verification | `/auth/email-verification/*` | auth | read |
| 163-169 | 2 Step Verification | `/auth/2-step-verification/*` | auth | read |
| 170 | Lock Screen | `/auth/lock-screen` | auth | read |
| 171 | 404 Error | `/error-404` | auth | read |
| 172 | 500 Error | `/error-500` | auth | read |

#### XVIII. UI INTERFACE (7 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 173 | Base UI | `/ui/base-ui` | ui | read |
| 174 | Advanced UI | `/ui/advanced-ui` | ui | read |
| 175 | Charts | `/ui/charts` | ui | read |
| 176 | Icons | `/ui/icons` | ui | read |
| 177 | Forms | `/ui/forms` | ui | read |
| 178 | Tables | `/ui/tables` | ui | read |
| 179 | Maps | `/ui/maps` | ui | read |

#### XIX. EXTRAS (2 pages)
| # | Page Name | Route | Category | Actions |
|---|-----------|-------|----------|---------|
| 180 | Documentation | `/extras/documentation` | extras | read |
| 181 | Change Log | `/extras/change-log` | extras | read |

**TOTAL PAGES: 181 pages**

---

## 6. IMPLEMENTATION PHASES

### Phase 1: Pages Collection Enhancement
**Priority: CRITICAL**
**Duration: 2-3 days**

1. Add `availableActions` field to Pages schema
2. Create seed data for all 181 pages with proper routes and actions
3. Create API endpoints for Pages CRUD
4. Create SuperAdmin "Pages" management UI

**Deliverables:**
- Updated `page.schema.js` with `availableActions` field
- Pages seed data file with all 181 pages
- API routes for pages management
- New SuperAdmin page for managing pages

### Phase 2: Roles Restructuring
**Priority: CRITICAL**
**Duration: 2-3 days**

1. Update Role schema to use `allowedPages` instead of embedded permissions
2. Migrate existing role permissions to new structure
3. Update role service methods
4. Update permission UI to work with pages

**Deliverables:**
- Updated `role.schema.js` with `allowedPages` structure
- Migration script for existing data
- Updated role service
- Updated permission UI

### Phase 3: Modules Restructuring
**Priority: HIGH**
**Duration: 2 days**

1. Update Module schema to use `allowedPages` as ObjectId array
2. Update module service methods
3. Update modules UI to assign pages
4. Create module-page relationship management

**Deliverables:**
- Updated `module.schema.js`
- Updated module service
- Updated modules UI

### Phase 4: Plans & Companies Fix
**Priority: HIGH**
**Duration: 1-2 days**

1. Update Plan schema to use ObjectId references for modules
2. Update Company schema to use ObjectId reference for plan
3. Migrate existing data
4. Update plans and companies UI

**Deliverables:**
- Updated `package.schema.js`
- Migration script for existing data
- Updated plans UI

### Phase 5: Permission Middleware & Route Protection
**Priority: MEDIUM**
**Duration: 2-3 days**

1. Create permission checking middleware
2. Implement route protection based on role-page permissions
3. Create permission helper utilities
4. Update frontend to use permission checks

**Deliverables:**
- Permission middleware
- Route protection implementation
- Permission helper utilities
- Frontend permission components

### Phase 6: Menu Generation & UI Updates
**Priority: MEDIUM**
**Duration: 2 days**

1. Create dynamic menu generation based on user's role permissions
2. Update sidebar to use dynamic menu
3. Add permission-based component rendering
4. Update all pages to use new permission system

**Deliverables:**
- Dynamic menu generation service
- Updated sidebar component
- Permission-based rendering components

### Phase 7: Testing & Documentation
**Priority: MEDIUM**
**Duration: 2-3 days**

1. Write unit tests for all RBAC components
2. Write integration tests
3. Create API documentation
4. Create user guide for RBAC system

**Deliverables:**
- Test suite
- API documentation
- User guide

---

## 7. MULTI-TENANCY ARCHITECTURE REVIEW

### 7.1 Current Architecture

The system uses **multi-tenant architecture** where:
- Each company gets its own MongoDB database
- Main "AmasQIS" database stores:
  - Companies
  - Plans/Packages
  - Modules
  - Pages
  - Roles (system roles)
  - Permissions (to be deprecated)

### 7.2 User's Questions & Recommendations

#### Q1: "All admins are a company, so the platform needs to route each time to the main 'AmasQIS' dashboard for the access. Is this a recommended way?"

**Answer:** NO, this is NOT the recommended approach.

**Issues:**
1. Routing to main dashboard every time creates security risks
2. Users should stay within their company's context
3. AmasQIS dashboard should be for SuperAdmin only

**Recommended Approach:**
- Each company has its own subdomain (e.g., `company1.amasqis.com`)
- OR Each company has its own path prefix (e.g., `amasqis.com/company1`)
- Authentication token includes `companyId` claim
- All database operations use company-specific connection
- SuperAdmin users have special flag to access AmasQIS dashboard

#### Q2: "Admins are the company, so we store the admin details in the 'AmasQIS' db for their profiles. Is this a recommended way? Or can we place the details in the separate database [created when company created] there?"

**Answer:** ADMIN USERS should be in the MAIN DATABASE, company users in COMPANY DATABASE.

**Recommended Structure:**

**AmasQIS Database (Main):**
```javascript
// SuperAdmin Users
{
  _id: ObjectId,
  clerkUserId: String,      // Clerk authentication
  email: String,
  name: String,
  role: "super-admin",      // Fixed role for main database
  permissions: ["all"]      // Full access
}

// Companies
{
  _id: ObjectId,
  name: String,
  domain: String,
  status: String,
  planId: ObjectId,         // Reference to Plan
  // Company admin reference (the person who created the company)
  adminUserId: ObjectId,
  createdAt: Date
}

// Plans
{
  _id: ObjectId,
  planName: String,
  planModules: [ObjectId]   // References to Module IDs
}

// Modules
{
  _id: ObjectId,
  name: String,
  allowedPages: [ObjectId]  // References to Page IDs
}

// Pages
{
  _id: ObjectId,
  name: String,
  route: String,
  availableActions: [String]
}

// System Roles (templates)
{
  _id: ObjectId,
  name: String,
  displayName: String,
  allowedPages: [{pageId, permissions}],
  isSystem: true
}
```

**Company Database (e.g., "company_acme"):**
```javascript
// Company Users
{
  _id: ObjectId,
  clerkUserId: String,      // Clerk authentication
  email: String,
  name: String,
  role: ObjectId,           // Reference to company-specific role
  companyId: ObjectId,      // Reference back to main DB company
  // Employee-specific fields
  employeeId: String,
  department: String,
  designation: String,
  // ... other employee fields
}

// Company Roles (copied from system roles or custom)
{
  _id: ObjectId,
  name: String,
  displayName: String,
  allowedPages: [{pageId, permissions}],
  isCustom: Boolean
}

// All company-specific collections (employees, departments, etc.)
```

### 7.3 Authentication Flow

```
1. User logs in via Clerk
2. Clerk returns JWT with claims
3. Backend middleware:
   a. Checks if user is SuperAdmin (role = "super-admin")
      -> Use AmasQIS database
   b. Checks if user is Company User
      -> Extract companyId from JWT
      -> Use company-specific database
4. All subsequent requests use the appropriate database
```

### 7.4 API Endpoint Structure

```
// SuperAdmin endpoints (AmasQIS database)
/api/super-admin/companies
/api/super-admin/plans
/api/super-admin/modules
/api/super-admin/pages
/api/super-admin/roles (system roles)

// Company endpoints (company-specific database)
/api/employees
/api/departments
/api/attendance
/api/leaves
// ... all company-specific endpoints

// Shared endpoints (with database switching)
/api/users/me           // Returns current user from appropriate DB
/api/roles              // Returns roles from appropriate DB
/api/permissions/check  // Checks permissions based on context
```

### 7.5 Database Connection Management

```javascript
// utils/db.js (enhanced)
import mongoose from 'mongoose';

const connections = new Map();

export async function getDatabase(companyId = null) {
  // SuperAdmin or no company -> use main database
  if (!companyId) {
    if (!connections.has('AmasQIS')) {
      connections.set('AmasQIS', mongoose.createConnection(
        process.env.MONGODB_URI + '/AmasQIS'
      ));
    }
    return connections.get('AmasQIS');
  }

  // Company -> use company-specific database
  if (!connections.has(companyId)) {
    connections.set(companyId, mongoose.createConnection(
      process.env.MONGODB_URI + `/company_${companyId}`
    ));
  }
  return connections.get(companyId);
}

// Middleware to use in routes
export function useDatabase(req, res, next) {
  const companyId = req.user?.companyId;
  const isSuperAdmin = req.user?.role === 'super-admin';

  req.db = isSuperAdmin ? null : companyId;
  req.dbConnection = await getDatabase(req.db);

  // Attach models to request
  req.models = {
    User: req.dbConnection.model('User', userSchema),
    Role: req.dbConnection.model('Role', roleSchema),
    // ... other models
  };

  next();
}
```

---

## 8. SUMMARY OF REQUIRED CHANGES

### 8.1 Schema Changes

| Collection | Change | Priority |
|------------|--------|----------|
| Pages | Add `availableActions` field | CRITICAL |
| Roles | Restructure to use `allowedPages` | CRITICAL |
| Modules | Change `pages` to `allowedPages` as ObjectId array | HIGH |
| Plans | Change `planModules` to ObjectId array | HIGH |
| Companies | Change `plan_id` to ObjectId reference | HIGH |
| Permissions | DEPRECATED - Will be removed | MEDIUM |
| RolePermissions | DEPRECATED - Will be removed | MEDIUM |

### 8.2 New Files to Create

| File | Purpose | Phase |
|------|---------|-------|
| `backend/models/rbac/page.schema.js` (updated) | Pages with availableActions | 1 |
| `backend/models/rbac/role.schema.js` (updated) | Roles with allowedPages | 2 |
| `backend/models/rbac/module.schema.js` (updated) | Modules with allowedPages | 3 |
| `backend/models/superadmin/package.schema.js` (updated) | Plans with proper references | 4 |
| `backend/routes/api/rbac/pages.js` | Pages API endpoints | 1 |
| `backend/services/rbac/page.service.js` | Pages service | 1 |
| `backend/controllers/rbac/page.controller.js` | Pages controller | 1 |
| `react/src/feature-module/super-admin/pages.tsx` | Pages management UI | 1 |
| `backend/middleware/permission.js` | Permission checking middleware | 5 |
| `backend/services/menu.service.js` | Dynamic menu generation | 6 |
| `backend/seed/pages.seed.js` | Pages seed data | 1 |

### 8.3 Files to Update

| File | Changes | Phase |
|------|---------|-------|
| `backend/services/rbac/role.service.js` | Update to use allowedPages | 2 |
| `backend/services/rbac/module.service.js` | Update to use allowedPages | 3 |
| `react/src/feature-module/super-admin/permissionpage.tsx` | Update to use pages | 2 |
| `react/src/feature-module/super-admin/modules.tsx` | Update to use allowedPages | 3 |
| `backend/routes/companies.routes.js` | Update to use ObjectId references | 4 |

---

## 9. RISK ASSESSMENT

| Risk | Severity | Mitigation |
|------|----------|------------|
| Data loss during migration | HIGH | Create backup, use transactions |
| Breaking existing functionality | HIGH | Test thoroughly, gradual rollout |
| Performance degradation | MEDIUM | Add indexes, monitor queries |
| Security vulnerabilities | HIGH | Security review of all permission checks |
| User confusion | MEDIUM | Clear documentation, training |

---

## 10. NEXT STEPS

1. **Immediate Actions:**
   - Review this report with the development team
   - Prioritize phases based on business needs
   - Create detailed task breakdown for Phase 1

2. **Development Approach:**
   - Start with Phase 1 (Pages enhancement)
   - Work on one phase at a time
   - Test thoroughly before moving to next phase
   - Keep existing functionality working during transition

3. **Communication:**
   - Document all changes
   - Keep stakeholders informed
   - Provide regular updates

---

## APPENDICES

### Appendix A: File Inventory

**Backend Models:**
- `backend/models/rbac/role.schema.js`
- `backend/models/rbac/permission.schema.js`
- `backend/models/rbac/module.schema.js`
- `backend/models/rbac/page.schema.js`
- `backend/models/rbac/rolePermission.schema.js`
- `backend/models/superadmin/package.schema.js`

**Backend Services:**
- `backend/services/rbac/role.service.js`
- `backend/services/rbac/module.service.js`
- `backend/services/rbac/permission.service.js`

**Backend Routes:**
- `backend/routes/api/rbac/roles.js`
- `backend/routes/api/rbac/permissions.js`
- `backend/routes/api/rbac/modules.js`

**Frontend Components:**
- `react/src/feature-module/super-admin/rolePermission.tsx`
- `react/src/feature-module/super-admin/permissionpage.tsx`
- `react/src/feature-module/super-admin/modules.tsx`

### Appendix B: Database Connection File

**File:** `backend/config/db.js`
**Status:** Uses multi-tenant architecture with `useDb()` method
**Issue:** Need to enhance with proper connection caching and SuperAdmin handling

---

**Report Generated:** 2026-02-10
**Analyst:** Claude Code AI
**Version:** 1.0
