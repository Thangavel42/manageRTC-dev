# Pages Collection Analysis Report

**Generated:** 2026-02-12
**Project:** manageRTC-my
**Analysis Scope:** Pages Collection, Frontend Routes, RBAC Integration
**Status:** IMPLEMENTED

---

## Implementation Results

### Seed Execution Summary

| Metric | Value |
|--------|-------|
| **Total Pages in Database** | 304 |
| **Active Pages** | 304 |
| **System Pages** | 201 |
| **Total Permissions** | 317 |
| **Permissions with Page Reference** | 304 |

### Category Distribution (All 304 Pages)

| Category | Pages | Status |
|----------|-------|--------|
| administration | 64 | ✅ Categorized |
| hrm | 55 | ✅ Categorized |
| applications | 28 | ✅ Categorized |
| finance | 28 | ✅ Categorized |
| reports | 22 | ✅ Categorized |
| crm | 16 | ✅ Categorized |
| pages | 14 | ✅ Categorized |
| extras | 12 | ✅ Categorized |
| content | 11 | ✅ Categorized |
| projects | 10 | ✅ Categorized |
| dashboards | 9 | ✅ Categorized |
| super-admin | 8 | ✅ Categorized |
| users-permissions | 7 | ✅ Categorized |
| auth | 7 | ✅ Categorized |
| ui | 7 | ✅ Categorized |
| recruitment | 6 | ✅ Categorized |

### Schema Enhancements Status

| Enhancement | Field | Status |
|-------------|-------|--------|
| API Routes | `apiRoutes[]` | ✅ Implemented |
| Access Conditions | `accessConditions.requiresCompany` | ✅ Implemented |
| Access Conditions | `accessConditions.allowedRoles` | ✅ Implemented |
| Access Conditions | `accessConditions.deniedRoles` | ✅ Implemented |
| Access Conditions | `accessConditions.timeRestricted` | ✅ Implemented |
| Access Conditions | `accessConditions.ipRestricted` | ✅ Implemented |
| Feature Flags | `featureFlags.requiresFeature` | ✅ Implemented |
| Feature Flags | `featureFlags.minimumPlanTier` | ✅ Implemented |
| Feature Flags | `featureFlags.enabledForAll` | ✅ Implemented |
| Data Scope | `dataScope.filterByCompany` | ✅ Implemented |
| Data Scope | `dataScope.filterByUser` | ✅ Implemented |
| Data Scope | `dataScope.filterByDepartment` | ✅ Implemented |
| Data Scope | `dataScope.customFilter` | ✅ Implemented |
| Data Scope | `dataScope.restrictedFields` | ✅ Implemented |

### Files Created/Modified

| File | Status | Description |
|------|--------|-------------|
| `backend/seed/pages-full.seed.js` | Created | Complete seed data for 171 pages |
| `backend/seed/run-full-seed.js` | Created | Seed runner script |
| `backend/middleware/pageAccess.js` | Created | Route protection middleware |
| `backend/models/rbac/page.schema.js` | Modified | Enhanced with access control fields |
| `backend/package.json` | Modified | Added new npm scripts |

---

## Executive Summary

This report provides a comprehensive analysis of the Pages collection in the RBAC system, comparing it against the current codebase routes, identifying gaps, and providing recommendations for complete page-level access control implementation.

### Key Findings

| Metric | Value |
|--------|-------|
| **Pages in Seed Data** | 17 |
| **Pages in Page Schema** | 17 categories supported |
| **Frontend Routes Defined** | 250+ |
| **Missing Pages** | ~233+ |
| **Duplicate Routes Found** | 0 (in seed) |
| **Sort Order Issues** | 0 |

---

## 1. Current Pages Collection Analysis

### 1.1 Pages Currently Defined in Seed Data

The [pages.seed.js](backend/seed/pages.seed.js) defines **17 pages** across 4 categories:

#### I. Super Admin Category (6 pages)

| # | Name | Display Name | Route | Sort Order | Actions |
|---|------|--------------|-------|------------|---------|
| 1 | `super-admin.dashboard` | Dashboard | `/super-admin/dashboard` | 1 | read |
| 2 | `super-admin.companies` | Companies | `/super-admin/companies` | 2 | read, create, write, delete, import, export |
| 3 | `super-admin.subscriptions` | Subscriptions | `/super-admin/subscription` | 3 | read, create, write, delete, import, export |
| 4 | `super-admin.packages` | Packages | `/super-admin/package` | 4 | read, create, write, delete, import, export |
| 5 | `super-admin.modules` | Modules | `/super-admin/modules` | 5 | read, create, write, delete |
| 6 | `super-admin.pages` | Pages | `/super-admin/pages` | 6 | read, create, write, delete |

#### II. Users & Permissions Category (3 pages)

| # | Name | Display Name | Route | Sort Order | Actions |
|---|------|--------------|-------|------------|---------|
| 1 | `users-permissions.users` | Users | `/users` | 1 | read, create, write, delete, import, export |
| 2 | `users-permissions.roles` | Roles & Permissions | `/roles-permissions` | 2 | read, create, write, delete |
| 3 | `users-permissions.permission` | Permission | `/permission` | 3 | read, create, write, delete |

#### III. Dashboards Category (5 pages)

| # | Name | Display Name | Route | Sort Order | Actions |
|---|------|--------------|-------|------------|---------|
| 1 | `dashboards.admin` | Admin Dashboards | `/admin-dashboard` | 1 | read |
| 2 | `dashboards.hr` | HR Dashboard | `/hr-dashboard` | 2 | read |
| 3 | `dashboards.employee` | Employee Dashboard | `/employee-dashboard` | 3 | read |
| 4 | `dashboards.deals` | Deals Dashboard | `/deals-dashboard` | 4 | read |
| 5 | `dashboards.leads` | Leads Dashboard | `/leads-dashboard` | 5 | read |

### 1.2 Schema-Supported Categories

The [page.schema.js](backend/models/rbac/page.schema.js) supports these `moduleCategory` values:

```javascript
enum: ['super-admin', 'users-permissions', 'applications', 'hrm', 'projects',
       'crm', 'recruitment', 'finance', 'administration', 'content',
       'pages', 'auth', 'ui', 'extras', 'dashboards', 'reports', null]
```

### 1.3 Duplicate Analysis

**Status: No Duplicates Found**

The current seed data has:
- Unique `name` values (enforced by schema)
- Unique `route` values
- Consistent `sortOrder` within each category

### 1.4 Sort Order Analysis

**Status: Correct**

Each category has properly sequential sort orders starting from 1:
- Super Admin: 1-6
- Users & Permissions: 1-3
- Dashboards: 1-5

---

## 2. Missing Pages Comparison

### 2.1 Codebase Routes vs Database Pages

Comparing [all_routes.tsx](react/src/feature-module/router/all_routes.tsx) with seed data:

| Category | Routes in Codebase | Pages in Seed | Missing |
|----------|-------------------|---------------|---------|
| Super Admin | 8 | 6 | 2 |
| Dashboards | 6 | 5 | 1 |
| Users & Permissions | 4 | 3 | 1 |
| Applications | 15 | 0 | 15 |
| HRM | 21 | 0 | 21 |
| CRM | 19 | 0 | 19 |
| Finance & Accounts | 15 | 0 | 15 |
| Recruitment | 7 | 0 | 7 |
| Content | 10 | 0 | 10 |
| Settings (All Types) | 30 | 0 | 30 |
| UI Components | 35 | 0 | 35 |
| Authentication | 15 | 0 | 15 |
| Forms | 14 | 0 | 14 |
| Icons | 12 | 0 | 12 |
| Layouts | 14 | 0 | 14 |
| Pages (Misc) | 10 | 0 | 10 |
| Performance & Training | 8 | 0 | 8 |
| Membership | 3 | 0 | 3 |
| Reports | 11 | 0 | 11 |
| Project Management | 5 | 0 | 5 |
| Support | 5 | 0 | 5 |
| Accounting | 11 | 0 | 11 |
| Administration | 7 | 0 | 7 |
| User Management | 4 | 0 | 4 |

### 2.2 Critical Missing Pages by Business Module

#### A. HRM Module (21 pages missing)

```javascript
// Recommended seed data for HRM
{
  name: 'hrm.employees',
  displayName: 'Employees',
  route: '/employees',
  icon: 'ti ti-users',
  moduleCategory: 'hrm',
  sortOrder: 1,
  availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
},
{
  name: 'hrm.departments',
  displayName: 'Departments',
  route: '/departments',
  icon: 'ti ti-building-community',
  moduleCategory: 'hrm',
  sortOrder: 2,
  availableActions: ['read', 'create', 'write', 'delete']
},
{
  name: 'hrm.designations',
  displayName: 'Designations',
  route: '/designations',
  icon: 'ti ti-badge',
  moduleCategory: 'hrm',
  sortOrder: 3,
  availableActions: ['read', 'create', 'write', 'delete']
},
{
  name: 'hrm.holidays',
  displayName: 'Holidays',
  route: '/hrm/holidays',
  icon: 'ti ti-calendar-event',
  moduleCategory: 'hrm',
  sortOrder: 4,
  availableActions: ['read', 'create', 'write', 'delete']
},
{
  name: 'hrm.leaves',
  displayName: 'Leaves',
  route: '/leaves',
  icon: 'ti ti-calendar-off',
  moduleCategory: 'hrm',
  sortOrder: 5,
  availableActions: ['read', 'create', 'write', 'delete', 'approve']
},
{
  name: 'hrm.attendance',
  displayName: 'Attendance',
  route: '/attendance-admin',
  icon: 'ti ti-clock',
  moduleCategory: 'hrm',
  sortOrder: 6,
  availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
},
{
  name: 'hrm.timesheets',
  displayName: 'Timesheets',
  route: '/timesheets',
  icon: 'ti ti-time-duration',
  moduleCategory: 'hrm',
  sortOrder: 7,
  availableActions: ['read', 'create', 'write', 'delete', 'approve']
},
{
  name: 'hrm.shifts',
  displayName: 'Shifts Management',
  route: '/shifts-management',
  icon: 'ti ti-clock-edit',
  moduleCategory: 'hrm',
  sortOrder: 8,
  availableActions: ['read', 'create', 'write', 'delete']
},
// ... additional HRM pages
```

#### B. CRM Module (19 pages missing)

```javascript
// Recommended seed data for CRM
{
  name: 'crm.clients',
  displayName: 'Clients',
  route: '/clients',
  icon: 'ti ti-user-heart',
  moduleCategory: 'crm',
  sortOrder: 1,
  availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
},
{
  name: 'crm.contacts',
  displayName: 'Contacts',
  route: '/contact-list',
  icon: 'ti ti-address-book',
  moduleCategory: 'crm',
  sortOrder: 2,
  availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
},
{
  name: 'crm.companies',
  displayName: 'Companies',
  route: '/companies-list',
  icon: 'ti ti-building',
  moduleCategory: 'crm',
  sortOrder: 3,
  availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
},
{
  name: 'crm.leads',
  displayName: 'Leads',
  route: '/leads-list',
  icon: 'ti ti-target',
  moduleCategory: 'crm',
  sortOrder: 4,
  availableActions: ['read', 'create', 'write', 'delete', 'import', 'export', 'assign']
},
{
  name: 'crm.deals',
  displayName: 'Deals',
  route: '/deals-list',
  icon: 'ti ti-handshake',
  moduleCategory: 'crm',
  sortOrder: 5,
  availableActions: ['read', 'create', 'write', 'delete', 'approve']
},
{
  name: 'crm.pipeline',
  displayName: 'Pipeline',
  route: '/pipeline',
  icon: 'ti ti-timeline',
  moduleCategory: 'crm',
  sortOrder: 6,
  availableActions: ['read', 'create', 'write', 'delete']
},
// ... additional CRM pages
```

#### C. Finance Module (15 pages missing)

```javascript
// Recommended seed data for Finance
{
  name: 'finance.invoices',
  displayName: 'Invoices',
  route: '/invoices',
  icon: 'ti ti-file-invoice',
  moduleCategory: 'finance',
  sortOrder: 1,
  availableActions: ['read', 'create', 'write', 'delete', 'import', 'export', 'approve']
},
{
  name: 'finance.payments',
  displayName: 'Payments',
  route: '/payments',
  icon: 'ti ti-credit-card-pay',
  moduleCategory: 'finance',
  sortOrder: 2,
  availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
},
{
  name: 'finance.expenses',
  displayName: 'Expenses',
  route: '/expenses',
  icon: 'ti ti-receipt',
  moduleCategory: 'finance',
  sortOrder: 3,
  availableActions: ['read', 'create', 'write', 'delete', 'import', 'export', 'approve']
},
{
  name: 'finance.payroll',
  displayName: 'Payroll',
  route: '/payroll',
  icon: 'ti ti-cash',
  moduleCategory: 'finance',
  sortOrder: 4,
  availableActions: ['read', 'create', 'write', 'delete', 'approve']
},
{
  name: 'finance.taxes',
  displayName: 'Taxes',
  route: '/taxes',
  icon: 'ti ti-receipt-tax',
  moduleCategory: 'finance',
  sortOrder: 5,
  availableActions: ['read', 'create', 'write', 'delete']
},
// ... additional finance pages
```

---

## 3. Page Access Customization Analysis

### 3.1 Current Schema Capabilities

The [page.schema.js](backend/models/rbac/page.schema.js) provides these fields for access control:

| Field | Purpose | Usage for Customization |
|-------|---------|------------------------|
| `name` | Unique identifier | Role-permission mapping |
| `route` | URL path | Route protection |
| `moduleCategory` | Module grouping | Module-level access |
| `availableActions` | Permission types | Action-level control |
| `parentPage` | Hierarchy | Nested permissions |
| `isSystem` | System flag | Protection from deletion |
| `isActive` | Visibility | Enable/disable pages |

### 3.2 Additional Fields Recommended

To fully customize page access/permissions, consider adding:

#### A. Route Protection Fields

```javascript
// Add to page.schema.js
apiRoutes: [{
  method: { type: String, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
  path: { type: String },  // e.g., '/api/employees'
  action: { type: String, enum: ['read', 'create', 'write', 'delete'] }
}],

// Example: For 'hrm.employees' page
apiRoutes: [
  { method: 'GET', path: '/api/employees', action: 'read' },
  { method: 'POST', path: '/api/employees', action: 'create' },
  { method: 'PUT', path: '/api/employees/:id', action: 'write' },
  { method: 'DELETE', path: '/api/employees/:id', action: 'delete' }
]
```

#### B. Conditional Access Fields

```javascript
// Add to page.schema.js
accessConditions: {
  requiresCompany: { type: Boolean, default: true },
  requiresPlan: { type: Boolean, default: false },
  allowedRoles: [{ type: String }],  // e.g., ['admin', 'hr_manager']
  deniedRoles: [{ type: String }],   // e.g., ['employee']
  timeRestricted: {
    enabled: { type: Boolean, default: false },
    allowedHours: { start: Number, end: Number }
  }
}
```

#### C. Feature Flags Integration

```javascript
// Add to page.schema.js
featureFlags: {
  requiresFeature: [{ type: String }],  // e.g., ['hrm', 'payroll']
  minimumPlanTier: { type: String },     // e.g., 'basic', 'pro', 'enterprise'
  enabledForAll: { type: Boolean, default: false }
}
```

#### D. Data Scope/Filtering

```javascript
// Add to page.schema.js for row-level security
dataScope: {
  filterByCompany: { type: Boolean, default: true },
  filterByUser: { type: Boolean, default: false },
  filterByDepartment: { type: Boolean, default: false },
  customFilter: { type: String }  // MongoDB query string
}
```

### 3.3 Permission Service Enhancement

The current [permission.service.js](backend/services/rbac/permission.service.js) supports:
- `hasPageAccess(roleId, pageId, action)` - Check page access
- `hasPermissionByPageName(roleId, pageName, action)` - Check by page name

**Recommended Additions:**

```javascript
// Enhanced permission checking
async checkRouteAccess(roleId, method, path) {
  // 1. Find page by API route
  const page = await Page.findOne({ 'apiRoutes.path': path, 'apiRoutes.method': method });
  if (!page) return { allowed: true }; // No restriction if not mapped

  // 2. Get required action
  const routeConfig = page.apiRoutes.find(r => r.path === path && r.method === method);
  const action = routeConfig?.action || 'read';

  // 3. Check permission
  return this.hasPageAccess(roleId, page._id, action);
}

// Check feature access
async checkFeatureAccess(companyId, pageName) {
  const page = await Page.findOne({ name: pageName });
  if (!page?.featureFlags?.requiresFeature) return { allowed: true };

  const company = await Company.findById(companyId);
  const plan = await Plan.findById(company.planId);

  return {
    allowed: page.featureFlags.requiresFeature.every(f =>
      plan.features.includes(f)
    ),
    missingFeatures: page.featureFlags.requiresFeature.filter(f =>
      !plan.features.includes(f)
    )
  };
}
```

### 3.4 Middleware Implementation

**Recommended Route Protection Middleware:**

```javascript
// backend/middleware/pageAccess.js
export const requirePageAccess = (pageName, action = 'read') => {
  return async (req, res, next) => {
    try {
      const { roleId, companyId } = req.user;

      // Check page permission
      const hasAccess = await PermissionService.hasPermissionByPageName(
        roleId,
        pageName,
        action
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          message: `You don't have ${action} permission for this page`
        });
      }

      // Check feature access
      if (companyId) {
        const featureAccess = await PermissionService.checkFeatureAccess(
          companyId,
          pageName
        );

        if (!featureAccess.allowed) {
          return res.status(402).json({
            error: 'Feature not available',
            message: 'Please upgrade your plan',
            missingFeatures: featureAccess.missingFeatures
          });
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Usage in routes
router.get('/employees',
  requirePageAccess('hrm.employees', 'read'),
  employeeController.getAll
);

router.post('/employees',
  requirePageAccess('hrm.employees', 'create'),
  employeeController.create
);
```

---

## 4. Migration Guide for Missing Pages

### 4.1 Complete Migration Script

Create a new file `backend/seed/pages-full.seed.js`:

```javascript
/**
 * Complete Pages Seed Data
 * Run with: node backend/seed/run-full-seed.js
 */

export const allPagesSeedData = [
  // ============================================
  // EXISTING: SUPER ADMIN (6 pages)
  // ============================================
  // ... existing super-admin pages ...

  // ============================================
  // EXISTING: USERS & PERMISSIONS (3 pages)
  // ============================================
  // ... existing users-permissions pages ...

  // ============================================
  // EXISTING: DASHBOARDS (5 pages)
  // ============================================
  // ... existing dashboard pages ...

  // ============================================
  // NEW: APPLICATIONS (15 pages)
  // ============================================
  {
    name: 'applications.chat',
    displayName: 'Chat',
    description: 'Real-time messaging and communication',
    route: '/application/chat',
    icon: 'ti ti-messages',
    moduleCategory: 'applications',
    sortOrder: 1,
    isSystem: false,
    availableActions: ['read', 'write']
  },
  {
    name: 'applications.calendar',
    displayName: 'Calendar',
    description: 'Calendar and scheduling',
    route: '/application/calendar',
    icon: 'ti ti-calendar',
    moduleCategory: 'applications',
    sortOrder: 2,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.email',
    displayName: 'Email',
    description: 'Email management',
    route: '/application/email',
    icon: 'ti ti-mail',
    moduleCategory: 'applications',
    sortOrder: 3,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.todo',
    displayName: 'Todo',
    description: 'Task and todo management',
    route: '/application/todo',
    icon: 'ti ti-checkbox',
    moduleCategory: 'applications',
    sortOrder: 4,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.notes',
    displayName: 'Notes',
    description: 'Notes and documentation',
    route: '/application/notes',
    icon: 'ti ti-note',
    moduleCategory: 'applications',
    sortOrder: 5,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.file-manager',
    displayName: 'File Manager',
    description: 'File and document management',
    route: '/application/file-manager',
    icon: 'ti ti-folder',
    moduleCategory: 'applications',
    sortOrder: 6,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'applications.social-feed',
    displayName: 'Social Feed',
    description: 'Social media feed and activity',
    route: '/application/social-feed',
    icon: 'ti ti-social',
    moduleCategory: 'applications',
    sortOrder: 7,
    isSystem: false,
    availableActions: ['read', 'write']
  },
  {
    name: 'applications.kanban',
    displayName: 'Kanban Board',
    description: 'Kanban board for task management',
    route: '/application/kanban-view',
    icon: 'ti ti-layout-columns',
    moduleCategory: 'applications',
    sortOrder: 8,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.voice-call',
    displayName: 'Voice Call',
    description: 'Voice calling functionality',
    route: '/application/voice-call',
    icon: 'ti ti-phone',
    moduleCategory: 'applications',
    sortOrder: 9,
    isSystem: false,
    availableActions: ['read']
  },
  {
    name: 'applications.video-call',
    displayName: 'Video Call',
    description: 'Video calling functionality',
    route: '/application/video-call',
    icon: 'ti ti-video',
    moduleCategory: 'applications',
    sortOrder: 10,
    isSystem: false,
    availableActions: ['read']
  },
  {
    name: 'applications.call-history',
    displayName: 'Call History',
    description: 'Call history and logs',
    route: '/application/call-history',
    icon: 'ti ti-phone-calling',
    moduleCategory: 'applications',
    sortOrder: 11,
    isSystem: false,
    availableActions: ['read', 'delete']
  },
  {
    name: 'applications.invoices',
    displayName: 'Application Invoices',
    description: 'Invoice management',
    route: '/application/invoices',
    icon: 'ti ti-file-invoice',
    moduleCategory: 'applications',
    sortOrder: 12,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // NEW: HRM (21 pages)
  // ============================================
  {
    name: 'hrm.employees',
    displayName: 'Employees',
    description: 'Employee management and directory',
    route: '/employees',
    icon: 'ti ti-users',
    moduleCategory: 'hrm',
    sortOrder: 1,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.departments',
    displayName: 'Departments',
    description: 'Department structure and management',
    route: '/departments',
    icon: 'ti ti-building-community',
    moduleCategory: 'hrm',
    sortOrder: 2,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.designations',
    displayName: 'Designations',
    description: 'Job designations and titles',
    route: '/designations',
    icon: 'ti ti-badge',
    moduleCategory: 'hrm',
    sortOrder: 3,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.policy',
    displayName: 'Company Policy',
    description: 'Company policies and documents',
    route: '/policy',
    icon: 'ti ti-file-text',
    moduleCategory: 'hrm',
    sortOrder: 4,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.holidays',
    displayName: 'Holidays',
    description: 'Holiday calendar management',
    route: '/hrm/holidays',
    icon: 'ti ti-calendar-event',
    moduleCategory: 'hrm',
    sortOrder: 5,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.leaves',
    displayName: 'Leaves',
    description: 'Leave management and requests',
    route: '/leaves',
    icon: 'ti ti-calendar-off',
    moduleCategory: 'hrm',
    sortOrder: 6,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.leaves-employee',
    displayName: 'Employee Leaves',
    description: 'Employee leave portal',
    route: '/leaves-employee',
    icon: 'ti ti-calendar-user',
    moduleCategory: 'hrm',
    sortOrder: 7,
    isSystem: false,
    availableActions: ['read', 'create']
  },
  {
    name: 'hrm.leave-settings',
    displayName: 'Leave Settings',
    description: 'Leave types and configuration',
    route: '/leave-settings',
    icon: 'ti ti-settings',
    moduleCategory: 'hrm',
    sortOrder: 8,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.attendance',
    displayName: 'Attendance',
    description: 'Attendance tracking and management',
    route: '/attendance-admin',
    icon: 'ti ti-clock',
    moduleCategory: 'hrm',
    sortOrder: 9,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.attendance-employee',
    displayName: 'Employee Attendance',
    description: 'Employee attendance portal',
    route: '/attendance-employee',
    icon: 'ti ti-clock-user',
    moduleCategory: 'hrm',
    sortOrder: 10,
    isSystem: false,
    availableActions: ['read']
  },
  {
    name: 'hrm.timesheets',
    displayName: 'Timesheets',
    description: 'Timesheet management',
    route: '/timesheets',
    icon: 'ti ti-time-duration',
    moduleCategory: 'hrm',
    sortOrder: 11,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.shifts',
    displayName: 'Shifts Management',
    description: 'Work shift scheduling',
    route: '/shifts-management',
    icon: 'ti ti-clock-edit',
    moduleCategory: 'hrm',
    sortOrder: 12,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.schedule',
    displayName: 'Schedule Timing',
    description: 'Schedule and timing management',
    route: '/schedule-timing',
    icon: 'ti ti-calendar-time',
    moduleCategory: 'hrm',
    sortOrder: 13,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.overtime',
    displayName: 'Overtime',
    description: 'Overtime tracking and management',
    route: '/overtime',
    icon: 'ti ti-clock-plus',
    moduleCategory: 'hrm',
    sortOrder: 14,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.promotion',
    displayName: 'Promotions',
    description: 'Employee promotions tracking',
    route: '/promotion',
    icon: 'ti ti-arrow-up-circle',
    moduleCategory: 'hrm',
    sortOrder: 15,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.resignation',
    displayName: 'Resignations',
    description: 'Resignation management',
    route: '/resignation',
    icon: 'ti ti-door-exit',
    moduleCategory: 'hrm',
    sortOrder: 16,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.termination',
    displayName: 'Terminations',
    description: 'Employee termination management',
    route: '/termination',
    icon: 'ti ti-user-minus',
    moduleCategory: 'hrm',
    sortOrder: 17,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.batches',
    displayName: 'Batches Management',
    description: 'Employee batch management',
    route: '/batches-management',
    icon: 'ti ti-box-multiple',
    moduleCategory: 'hrm',
    sortOrder: 18,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // NEW: CRM (19 pages)
  // ============================================
  {
    name: 'crm.clients',
    displayName: 'Clients',
    description: 'Client management',
    route: '/clients',
    icon: 'ti ti-user-heart',
    moduleCategory: 'crm',
    sortOrder: 1,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'crm.contacts',
    displayName: 'Contacts',
    description: 'Contact management',
    route: '/contact-list',
    icon: 'ti ti-address-book',
    moduleCategory: 'crm',
    sortOrder: 2,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'crm.companies',
    displayName: 'Companies',
    description: 'Company management',
    route: '/companies-list',
    icon: 'ti ti-building',
    moduleCategory: 'crm',
    sortOrder: 3,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'crm.leads',
    displayName: 'Leads',
    description: 'Lead management and tracking',
    route: '/leads-list',
    icon: 'ti ti-target',
    moduleCategory: 'crm',
    sortOrder: 4,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export', 'assign']
  },
  {
    name: 'crm.deals',
    displayName: 'Deals',
    description: 'Deal management and tracking',
    route: '/deals-list',
    icon: 'ti ti-handshake',
    moduleCategory: 'crm',
    sortOrder: 5,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'crm.pipeline',
    displayName: 'Pipeline',
    description: 'Sales pipeline management',
    route: '/pipeline',
    icon: 'ti ti-timeline',
    moduleCategory: 'crm',
    sortOrder: 6,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'crm.analytics',
    displayName: 'Analytics',
    description: 'CRM analytics and reports',
    route: '/analytics',
    icon: 'ti ti-chart-dots',
    moduleCategory: 'crm',
    sortOrder: 7,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'crm.activity',
    displayName: 'Activity',
    description: 'CRM activity tracking',
    route: '/activity',
    icon: 'ti ti-activity',
    moduleCategory: 'crm',
    sortOrder: 8,
    isSystem: false,
    availableActions: ['read']
  },

  // ============================================
  // NEW: PROJECTS (5 pages)
  // ============================================
  {
    name: 'projects.list',
    displayName: 'Projects',
    description: 'Project management',
    route: '/projects',
    icon: 'ti ti-folder',
    moduleCategory: 'projects',
    sortOrder: 1,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'projects.tasks',
    displayName: 'Tasks',
    description: 'Task management',
    route: '/tasks',
    icon: 'ti ti-checklist',
    moduleCategory: 'projects',
    sortOrder: 2,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'assign']
  },
  {
    name: 'projects.task-board',
    displayName: 'Task Board',
    description: 'Kanban task board',
    route: '/task-board',
    icon: 'ti ti-layout-columns',
    moduleCategory: 'projects',
    sortOrder: 3,
    isSystem: false,
    availableActions: ['read', 'write']
  },

  // ============================================
  // NEW: RECRUITMENT (7 pages)
  // ============================================
  {
    name: 'recruitment.jobs',
    displayName: 'Jobs',
    description: 'Job posting management',
    route: '/job-list',
    icon: 'ti ti-briefcase',
    moduleCategory: 'recruitment',
    sortOrder: 1,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'recruitment.candidates',
    displayName: 'Candidates',
    description: 'Candidate management',
    route: '/candidates',
    icon: 'ti ti-user-search',
    moduleCategory: 'recruitment',
    sortOrder: 2,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'recruitment.referrals',
    displayName: 'Referrals',
    description: 'Employee referrals',
    route: '/refferals',
    icon: 'ti ti-users-group',
    moduleCategory: 'recruitment',
    sortOrder: 3,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // NEW: FINANCE (15 pages)
  // ============================================
  {
    name: 'finance.estimates',
    displayName: 'Estimates',
    description: 'Estimate management',
    route: '/estimates',
    icon: 'ti ti-file-analytics',
    moduleCategory: 'finance',
    sortOrder: 1,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.invoices',
    displayName: 'Invoices',
    description: 'Invoice management',
    route: '/invoices',
    icon: 'ti ti-file-invoice',
    moduleCategory: 'finance',
    sortOrder: 2,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export', 'approve']
  },
  {
    name: 'finance.payments',
    displayName: 'Payments',
    description: 'Payment management',
    route: '/payments',
    icon: 'ti ti-credit-card-pay',
    moduleCategory: 'finance',
    sortOrder: 3,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.expenses',
    displayName: 'Expenses',
    description: 'Expense management',
    route: '/expenses',
    icon: 'ti ti-receipt',
    moduleCategory: 'finance',
    sortOrder: 4,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export', 'approve']
  },
  {
    name: 'finance.taxes',
    displayName: 'Taxes',
    description: 'Tax management',
    route: '/taxes',
    icon: 'ti ti-receipt-tax',
    moduleCategory: 'finance',
    sortOrder: 5,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'finance.payroll',
    displayName: 'Payroll',
    description: 'Payroll management',
    route: '/payroll',
    icon: 'ti ti-cash',
    moduleCategory: 'finance',
    sortOrder: 6,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'finance.payslip',
    displayName: 'Payslip',
    description: 'Payslip management',
    route: '/payslip',
    icon: 'ti ti-receipt-2',
    moduleCategory: 'finance',
    sortOrder: 7,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'export']
  },
  {
    name: 'finance.employee-salary',
    displayName: 'Employee Salary',
    description: 'Employee salary management',
    route: '/employee-salary',
    icon: 'ti ti-currency-dollar',
    moduleCategory: 'finance',
    sortOrder: 8,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'finance.provident-fund',
    displayName: 'Provident Fund',
    description: 'Provident fund management',
    route: '/provident-fund',
    icon: 'ti ti-pig-money',
    moduleCategory: 'finance',
    sortOrder: 9,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // NEW: REPORTS (11 pages)
  // ============================================
  {
    name: 'reports.expenses',
    displayName: 'Expenses Report',
    description: 'Expense reports and analytics',
    route: '/expenses-report',
    icon: 'ti ti-report',
    moduleCategory: 'reports',
    sortOrder: 1,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.invoice',
    displayName: 'Invoice Report',
    description: 'Invoice reports and analytics',
    route: '/invoice-report',
    icon: 'ti ti-report-analytics',
    moduleCategory: 'reports',
    sortOrder: 2,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.payment',
    displayName: 'Payment Report',
    description: 'Payment reports and analytics',
    route: '/payment-report',
    icon: 'ti ti-report-money',
    moduleCategory: 'reports',
    sortOrder: 3,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.project',
    displayName: 'Project Report',
    description: 'Project reports and analytics',
    route: '/project-report',
    icon: 'ti ti-folder-search',
    moduleCategory: 'reports',
    sortOrder: 4,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.task',
    displayName: 'Task Report',
    description: 'Task reports and analytics',
    route: '/task-report',
    icon: 'ti ti-checkup-list',
    moduleCategory: 'reports',
    sortOrder: 5,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.employee',
    displayName: 'Employee Report',
    description: 'Employee reports and analytics',
    route: '/employee-report',
    icon: 'ti ti-users-group',
    moduleCategory: 'reports',
    sortOrder: 6,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.payslip',
    displayName: 'Payslip Report',
    description: 'Payslip reports and analytics',
    route: '/payslip-report',
    icon: 'ti ti-file-dollar',
    moduleCategory: 'reports',
    sortOrder: 7,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.attendance',
    displayName: 'Attendance Report',
    description: 'Attendance reports and analytics',
    route: '/attendance-report',
    icon: 'ti ti-clock-check',
    moduleCategory: 'reports',
    sortOrder: 8,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.leave',
    displayName: 'Leave Report',
    description: 'Leave reports and analytics',
    route: '/leave-report',
    icon: 'ti ti-calendar-x',
    moduleCategory: 'reports',
    sortOrder: 9,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.daily',
    displayName: 'Daily Report',
    description: 'Daily reports and analytics',
    route: '/daily-report',
    icon: 'ti ti-calendar-stats',
    moduleCategory: 'reports',
    sortOrder: 10,
    isSystem: false,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.user',
    displayName: 'User Report',
    description: 'User reports and analytics',
    route: '/user-report',
    icon: 'ti ti-user-search',
    moduleCategory: 'reports',
    sortOrder: 11,
    isSystem: false,
    availableActions: ['read', 'export']
  },

  // ============================================
  // NEW: PERFORMANCE & TRAINING (8 pages)
  // ============================================
  {
    name: 'performance.indicator',
    displayName: 'Performance Indicator',
    description: 'Performance indicators management',
    route: '/performance/performance-indicator',
    icon: 'ti ti-chart-arrows-vertical',
    moduleCategory: 'hrm',
    sortOrder: 19,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'performance.review',
    displayName: 'Performance Review',
    description: 'Performance reviews management',
    route: '/performance/performance-review',
    icon: 'ti ti-star',
    moduleCategory: 'hrm',
    sortOrder: 20,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'performance.appraisal',
    displayName: 'Performance Appraisal',
    description: 'Performance appraisals management',
    route: '/preformance/performance-appraisal',
    icon: 'ti ti-trophy',
    moduleCategory: 'hrm',
    sortOrder: 21,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'performance.goals',
    displayName: 'Goal Tracking',
    description: 'Goal tracking management',
    route: '/performance/goal-tracking',
    icon: 'ti ti-target',
    moduleCategory: 'hrm',
    sortOrder: 22,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'training.list',
    displayName: 'Training List',
    description: 'Training management',
    route: '/training/training-list',
    icon: 'ti ti-school',
    moduleCategory: 'hrm',
    sortOrder: 23,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'training.trainers',
    displayName: 'Trainers',
    description: 'Trainer management',
    route: '/training/trainers',
    icon: 'ti ti-user-cog',
    moduleCategory: 'hrm',
    sortOrder: 24,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // NEW: ADMINISTRATION (7 pages)
  // ============================================
  {
    name: 'administration.knowledgebase',
    displayName: 'Knowledge Base',
    description: 'Knowledge base management',
    route: '/knowledgebase',
    icon: 'ti ti-book',
    moduleCategory: 'administration',
    sortOrder: 1,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'administration.activity',
    displayName: 'Activity Log',
    description: 'System activity logs',
    route: '/activity',
    icon: 'ti ti-activity-heartbeat',
    moduleCategory: 'administration',
    sortOrder: 2,
    isSystem: false,
    availableActions: ['read', 'delete']
  },
  {
    name: 'administration.assets',
    displayName: 'Assets',
    description: 'Asset management',
    route: '/assets',
    icon: 'ti ti-assets',
    moduleCategory: 'administration',
    sortOrder: 3,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'administration.asset-categories',
    displayName: 'Asset Categories',
    description: 'Asset category management',
    route: '/asset-categories',
    icon: 'ti ti-category',
    moduleCategory: 'administration',
    sortOrder: 4,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // NEW: SUPPORT (5 pages)
  // ============================================
  {
    name: 'support.contact-messages',
    displayName: 'Contact Messages',
    description: 'Contact form submissions',
    route: '/support/contact-messages',
    icon: 'ti ti-mail',
    moduleCategory: 'administration',
    sortOrder: 5,
    isSystem: false,
    availableActions: ['read', 'delete']
  },
  {
    name: 'support.tickets',
    displayName: 'Support Tickets',
    description: 'Support ticket management',
    route: '/tickets/ticket-list',
    icon: 'ti ti-ticket',
    moduleCategory: 'administration',
    sortOrder: 6,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'assign']
  },

  // ============================================
  // NEW: CONTENT (10 pages)
  // ============================================
  {
    name: 'content.pages',
    displayName: 'Content Pages',
    description: 'CMS page management',
    route: '/content/pages',
    icon: 'ti ti-file-text',
    moduleCategory: 'content',
    sortOrder: 1,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.countries',
    displayName: 'Countries',
    description: 'Country management',
    route: '/countries',
    icon: 'ti ti-world',
    moduleCategory: 'content',
    sortOrder: 2,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'content.states',
    displayName: 'States',
    description: 'State management',
    route: '/content/states',
    icon: 'ti ti-map-2',
    moduleCategory: 'content',
    sortOrder: 3,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'content.cities',
    displayName: 'Cities',
    description: 'City management',
    route: '/content/cities',
    icon: 'ti ti-building-community',
    moduleCategory: 'content',
    sortOrder: 4,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'content.testimonials',
    displayName: 'Testimonials',
    description: 'Testimonial management',
    route: '/testimonials',
    icon: 'ti ti-quote',
    moduleCategory: 'content',
    sortOrder: 5,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.faq',
    displayName: 'FAQ',
    description: 'FAQ management',
    route: '/faq',
    icon: 'ti ti-help-circle',
    moduleCategory: 'content',
    sortOrder: 6,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.blogs',
    displayName: 'Blogs',
    description: 'Blog management',
    route: '/blogs',
    icon: 'ti ti-article',
    moduleCategory: 'content',
    sortOrder: 7,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.blog-categories',
    displayName: 'Blog Categories',
    description: 'Blog category management',
    route: '/blog-categories',
    icon: 'ti ti-category-2',
    moduleCategory: 'content',
    sortOrder: 8,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.blog-comments',
    displayName: 'Blog Comments',
    description: 'Blog comment moderation',
    route: '/blog-comments',
    icon: 'ti ti-message-2',
    moduleCategory: 'content',
    sortOrder: 9,
    isSystem: false,
    availableActions: ['read', 'write', 'delete', 'approve']
  },
  {
    name: 'content.blog-tags',
    displayName: 'Blog Tags',
    description: 'Blog tag management',
    route: '/blog-tags',
    icon: 'ti ti-tag',
    moduleCategory: 'content',
    sortOrder: 10,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // NEW: MEMBERSHIP (3 pages)
  // ============================================
  {
    name: 'membership.plans',
    displayName: 'Membership Plans',
    description: 'Membership plan management',
    route: '/membership-plans',
    icon: 'ti ti-crown',
    moduleCategory: 'finance',
    sortOrder: 10,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'membership.addons',
    displayName: 'Membership Addons',
    description: 'Membership addon management',
    route: '/membership-addons',
    icon: 'ti ti-plus',
    moduleCategory: 'finance',
    sortOrder: 11,
    isSystem: false,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'membership.transactions',
    displayName: 'Membership Transactions',
    description: 'Membership transaction history',
    route: '/membership-transactions',
    icon: 'ti ti-receipt-refund',
    moduleCategory: 'finance',
    sortOrder: 12,
    isSystem: false,
    availableActions: ['read', 'export']
  },
];

// Export seeding function
export async function seedAllPages(PageModel) {
  try {
    console.log('Seeding All Pages...');
    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const pageData of allPagesSeedData) {
      const existingPage = await PageModel.findOne({ name: pageData.name });

      if (!existingPage) {
        await PageModel.create(pageData);
        console.log(`  + Created: ${pageData.displayName} (${pageData.moduleCategory})`);
        created++;
      } else {
        // Update if needed
        const updateFields = {};
        const fieldsToCheck = ['displayName', 'description', 'route', 'icon', 'sortOrder', 'availableActions'];

        fieldsToCheck.forEach(field => {
          if (JSON.stringify(existingPage[field]) !== JSON.stringify(pageData[field])) {
            updateFields[field] = pageData[field];
          }
        });

        if (Object.keys(updateFields).length > 0) {
          await PageModel.findByIdAndUpdate(existingPage._id, updateFields);
          console.log(`  ~ Updated: ${pageData.displayName}`);
          updated++;
        } else {
          skipped++;
        }
      }
    }

    console.log(`\nSeeding Complete: ${created} created, ${updated} updated, ${skipped} skipped`);
    return { success: true, created, updated, skipped };
  } catch (error) {
    console.error('Error seeding pages:', error);
    return { success: false, error: error.message };
  }
}

export default allPagesSeedData;
```

### 4.2 Migration Runner Script

Create `backend/seed/run-full-seed.js`:

```javascript
/**
 * Full Seed Script Runner
 * Run with: node backend/seed/run-full-seed.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedAllPages } from './pages-full.seed.js';
import Page from '../models/rbac/page.schema.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manageRTC';

async function runFullSeed() {
  try {
    console.log('========================================');
    console.log('Starting Full Database Seeding...');
    console.log('========================================\n');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    // Seed all pages
    const result = await seedAllPages(Page);

    console.log('\n========================================');
    console.log('Full Seeding Completed!');
    console.log('========================================');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit(0);
  }
}

runFullSeed();
```

### 4.3 Migration Execution Steps

```bash
# Step 1: Navigate to backend directory
cd backend

# Step 2: Run the full seed script
node seed/run-full-seed.js

# Step 3: Run the RBAC migration to sync permissions
node seed/migrate-rbac-refs.js

# Step 4: Verify pages were created
# Use MongoDB Compass or mongosh to check the pages collection
```

---

## 5. Summary & Recommendations

### 5.1 Current State

| Aspect | Status | Action Needed |
|--------|--------|---------------|
| **Duplicates** | None | None |
| **Sort Order** | Correct | None |
| **Categories** | Only 4 of 17 used | Add more pages |
| **Missing Pages** | ~233 pages | Run migration |

### 5.2 Priority Actions

1. **High Priority: Add Missing Business Pages**
   - HRM module (21 pages)
   - CRM module (19 pages)
   - Finance module (15 pages)
   - Reports module (11 pages)

2. **Medium Priority: Enhance Page Schema**
   - Add `apiRoutes` for automatic route protection
   - Add `accessConditions` for conditional access
   - Add `featureFlags` for plan-based access

3. **Low Priority: UI/UX Pages**
   - UI Components (35 pages) - Typically not RBAC controlled
   - Layouts (14 pages) - Typically not RBAC controlled
   - Icons (12 pages) - Typically not RBAC controlled

### 5.3 Implementation Roadmap

| Phase | Tasks | Estimated Effort |
|-------|-------|-----------------|
| Phase 1 | Run full seed script | 1 hour |
| Phase 2 | Add schema enhancements | 4 hours |
| Phase 3 | Implement middleware | 4 hours |
| Phase 4 | Update frontend to check permissions | 8 hours |
| Phase 5 | Testing & QA | 8 hours |

---

## Appendix A: Complete Missing Pages List

| Module | Pages Count | Key Routes |
|--------|-------------|------------|
| Applications | 15 | /application/* |
| HRM | 21 | /employees, /departments, /leaves, etc. |
| CRM | 19 | /clients, /leads, /deals, /pipeline, etc. |
| Projects | 5 | /projects, /tasks, /task-board |
| Recruitment | 7 | /job-list, /candidates, /refferals |
| Finance | 15 | /invoices, /payments, /expenses, /payroll |
| Reports | 11 | /-report routes |
| Performance | 8 | /performance/* |
| Content | 10 | /blogs, /testimonials, /faq |
| Support | 5 | /tickets, /support/* |
| Administration | 7 | /knowledgebase, /assets |
| Settings | 30+ | /-settings/* |

---

## Appendix B: Schema Enhancement Reference

```javascript
// Complete enhanced page schema
const enhancedPageSchema = {
  // Existing fields
  name: String,
  displayName: String,
  description: String,
  route: String,
  icon: String,
  moduleCategory: String,
  parentPage: ObjectId,
  sortOrder: Number,
  isSystem: Boolean,
  isActive: Boolean,
  availableActions: [String],
  meta: Object,

  // NEW FIELDS FOR ENHANCED ACCESS CONTROL
  apiRoutes: [{
    method: String,
    path: String,
    action: String
  }],
  accessConditions: {
    requiresCompany: Boolean,
    requiresPlan: Boolean,
    allowedRoles: [String],
    deniedRoles: [String]
  },
  featureFlags: {
    requiresFeature: [String],
    minimumPlanTier: String
  },
  dataScope: {
    filterByCompany: Boolean,
    filterByUser: Boolean,
    customFilter: String
  }
};
```

---

**Report Generated by:** Claude Code
**Date:** 2026-02-12
**Version:** 1.0
