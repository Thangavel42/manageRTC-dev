# Fixes Required & Next Steps

## Overview

This report documents all fixes required to implement the correct role-based access control (RBAC) for the manageRTC multi-tenant platform.

---

## Priority Classification

| Priority | Description | Timeline |
|----------|-------------|----------|
| 🚨 P0 - Critical | Security vulnerabilities that allow unauthorized access | Immediate |
| ⚠️ P1 - High | Functional issues that break business rules | Within 1 week |
| 📋 P2 - Medium | Consistency issues and code quality improvements | Within 2 weeks |
| 💡 P3 - Low | Nice to have improvements | Future |

---

## 🚨 P0 - CRITICAL FIXES (Security)

### 1. Department Controller - Missing Role Checks

**Issue:** Any authenticated user can create, update, or delete departments.

**File:** [backend/controllers/rest/department.controller.js](backend/controllers/rest/department.controller.js)

**Current Behavior:**
```javascript
// No role checks - all authenticated users can access
export const createDepartment = async (req, res) => {
  const department = await Department.create(req.body);
  res.status(201).json(department);
};
```

**Required Fix:**
```javascript
// Add requireRole middleware to routes
import { requireRole } from '../../middleware/auth.js';

router.post('/departments', authenticate, requireRole('admin', 'hr', 'superadmin'), createDepartment);
router.put('/departments/:id', authenticate, requireRole('admin', 'hr', 'superadmin'), updateDepartment);
router.delete('/departments/:id', authenticate, requireRole('admin', 'superadmin'), deleteDepartment);
```

**Action Items:**
- [ ] Add `requireRole` middleware to all department routes
- [ ] Ensure SuperAdmin is blocked (should be admin/hr only, NOT superadmin for company departments)
- [ ] Test role access for each endpoint

---

### 2. SuperAdmin Access to Business Modules

**Issue:** SuperAdmin may have access to HRM, PM, CRM, Finance, Recruitment modules.

**Files to Fix:**
- [react/src/core/data/json/sidebarMenu.jsx](react/src/core/data/json/sidebarMenu.jsx)
- [react/src/core/data/json/horizontalSidebar.tsx](react/src/core/data/json/horizontalSidebar.tsx)
- [react/src/core/common/stacked-sidebar/index.tsx](react/src/core/common/stacked-sidebar/index.tsx)
- [react/src/core/common/two-column/index.tsx](react/src/core/common/two-column/index.tsx)

**Required Fix:**
```typescript
// Filter menu items based on role
const filteredMenu = sidebarMenu.filter(item => {
  // SuperAdmin only sees Super Admin Dashboard and Super Admin module
  if (userRole === 'superadmin') {
    return item.module === 'super-admin' || item.path === '/super-admin/dashboard';
  }
  // Employee role filtering
  if (userRole === 'employee') {
    const employeeAllowed = [
      '/employee-dashboard',
      '/projects',
      '/tasks',
      '/attendance-employee',
      '/leave-employee',
      '/timesheet',
      '/holidays',
      // Applications
      '/application/chat',
      '/calendar',
      // etc.
    ];
    return employeeAllowed.includes(item.path);
  }
  return true; // Admin and HR see most items
});
```

**Action Items:**
- [ ] Update sidebarMenu.jsx with role-based filtering
- [ ] Update horizontalSidebar.tsx with role-based filtering
- [ ] Update stacked-sidebar/index.tsx with role-based filtering
- [ ] Update two-column/index.tsx with role-based filtering
- [ ] Test SuperAdmin only sees platform management options
- [ ] Test Employee only sees allowed pages

---

### 3. Employee Access to Restricted Pages

**Issue:** Employee can access Clients, Contacts, Leads Dashboard, Deals Dashboard, Recruitment.

**Files to Fix:**
- [react/src/feature-module/mainMenu/hrDashboard/index.tsx](react/src/feature-module/mainMenu/hrDashboard/index.tsx)
- [react/src/feature-module/mainMenu/employeeDashboard/index.tsx](react/src/feature-module/mainMenu/employeeDashboard/index.tsx)
- [react/src/feature-module/mainMenu/leadsDashboard/index.tsx](react/src/feature-module/mainMenu/leadsDashboard/index.tsx)
- [react/src/feature-module/mainMenu/dealsDashboard/index.tsx](react/src/feature-module/mainMenu/dealsDashboard/index.tsx)

**HR Dashboard Fix:**
```typescript
// react/src/feature-module/mainMenu/hrDashboard/index.tsx
// Current: Shows all dashboards
// Fix: Show only HR, Leads, Deals dashboards

const hrDashboardCards = [
  { title: "HR Dashboard", icon: "ri-team-line", link: "/hr-dashboard", roles: ["hr"] },
  { title: "Leads Dashboard", icon: "ri-funds-line", link: "/leads-dashboard", roles: ["hr"] },
  { title: "Deals Dashboard", icon: "ri-hand-coin-line", link: "/deals-dashboard", roles: ["hr"] },
];
```

**Employee Dashboard Fix:**
```typescript
// Employee should ONLY see Employee Dashboard card
const employeeDashboardCards = [
  { title: "Employee Dashboard", icon: "ri-user-smile-line", link: "/employee-dashboard", roles: ["employee", "admin", "hr"] },
];
```

**Action Items:**
- [ ] Update HR Dashboard to show only HR/Leads/Deals cards
- [ ] Update Employee Dashboard to show only Employee card
- [ ] Add route guards to block Employees from /leads-dashboard and /deals-dashboard
- [ ] Add route guards to block Employees from /clients and /contacts

---

### 4. Backend Route Guards for Employee

**Issue:** Backend routes may not properly block Employee from restricted endpoints.

**Files to Fix:**
- [backend/routes/api/clients.js](backend/routes/api/clients.js)
- [backend/routes/api/leads.js](backend/routes/api/leads.js)
- [backend/routes/api/deals](backend/controllers/deal/deal.controller.js)
- Contact routes (if exists)

**Required Fix:**
```javascript
// backend/routes/api/clients.js
import { requireRole } from '../../middleware/auth.js';

// Block employee from accessing clients
router.get('/', authenticate, requireRole('admin', 'hr'), getClients);
router.post('/', authenticate, requireRole('admin', 'hr'), createClient);
router.put('/:id', authenticate, requireRole('admin', 'hr'), updateClient);
router.delete('/:id', authenticate, requireRole('admin'), deleteClient);
```

**Action Items:**
- [ ] Add `requireRole` to client routes (exclude employee)
- [ ] Add `requireRole` to contact routes (exclude employee)
- [ ] Verify leads/deals routes (employees can read assigned only)
- [ ] Verify recruitment routes block employee

---

### 5. Admin Access to HR Dashboard

**Issue:** Admin should NOT access HR Dashboard (that's specific to HR role).

**File:** [react/src/core/data/json/horizontalSidebar.tsx](react/src/core/data/json/horizontalSidebar.tsx)

**Required Fix:**
```typescript
{
  menuValue: "HR Dashboard",
  route: routes.hrDashboard,
  roles: ["hr"], // Remove "admin" - only HR role
},
```

**Action Items:**
- [ ] Remove admin role from HR Dashboard in horizontalSidebar.tsx
- [ ] Remove admin role from HR Dashboard in sidebarMenu.jsx
- [ ] Test Admin cannot navigate to HR Dashboard

---

## ⚠️ P1 - HIGH PRIORITY FIXES

### 6. HR Access to Administration Module

**Issue:** HR may have access to Administration module (should be Admin only).

**File:** [react/src/core/data/json/sidebarMenu.jsx](react/src/core/data/json/sidebarMenu.jsx)

**Required Fix:**
```typescript
// Administration section - Admin only
{
  menutitle: "ADMINISTRATION",
  menuItems: [
    {
      title: "Assets",
      roles: ["admin"], // Remove "hr"
    },
    {
      title: "Users",
      roles: ["admin"], // Remove "hr"
    },
    // etc.
  ]
}
```

**Action Items:**
- [ ] Remove HR role from all Administration menu items
- [ ] Add backend role checks if missing
- [ ] Test HR cannot access Administration pages

---

### 7. Manager Role Schema Inconsistency

**Issue:** `manager` role is used in controllers but not in employee schema enum.

**File:** [backend/models/employee/employee.schema.js:369-373](backend/models/employee/employee.schema.js#L369-L373)

**Current:**
```javascript
role: {
  type: String,
  enum: ['superadmin', 'admin', 'hr', 'employee'],
  default: 'employee'
}
```

**Option A - Add Manager to Schema:**
```javascript
role: {
  type: String,
  enum: ['superadmin', 'admin', 'hr', 'employee', 'manager'],
  default: 'employee'
}
```

**Option B - Remove Manager References:**
Remove manager role from all controllers that use it.

**Action Items:**
- [ ] Decide: Keep manager role OR remove all references
- [ ] If keeping: Add to schema, update socket router, add to frontend
- [ ] If removing: Remove from deal controller, performance controllers, attendance/overtime routes

---

### 8. Leads Role Schema Inconsistency

**Issue:** `leads` role exists in socket routes but not in employee schema enum.

**File:** [backend/socket/router.js:119-124](backend/socket/router.js#L119-L124)

**Current:**
```javascript
case 'leads':
  leadController(socket, io);
  break;
```

**Action Items:**
- [ ] Decide: Keep leads role OR remove from socket router
- [ ] If keeping: Add to schema, add to REST API middleware
- [ ] If removing: Remove leads case from socket router

---

### 9. Deal Controller Blocking SuperAdmin

**Issue:** Deal controller explicitly excludes SuperAdmin.

**File:** [backend/controllers/deal/deal.controller.js:30](backend/controllers/deal/deal.controller.js#L30)

**Current:**
```javascript
if (!ensureRole(req, ["admin", "manager"])) {
  return res.status(403).json({ error: "Forbidden" });
}
```

**Note:** Per requirements, SuperAdmin should NOT access business modules. So this is actually correct behavior.

**Action Items:**
- [ ] Verify this is correct per requirements (SuperAdmin blocked from CRM)
- [ ] Document why SuperAdmin is explicitly blocked

---

## 📋 P2 - MEDIUM PRIORITY FIXES

### 10. Frontend Role Mismatch ("public" vs "employee")

**Issue:** Frontend uses "public" role but backend schema uses "employee".

**File:** [react/src/core/data/json/horizontalSidebar.tsx](react/src/core/data/json/horizontalSidebar.tsx)

**Required Fix:**
```typescript
// Change "public" to actual role names
{
  menuValue: "Employee Dashboard",
  route: routes.employeeDashboard,
  roles: ["employee", "admin", "hr"], // Instead of ["public"]
}
```

**Action Items:**
- [ ] Replace all "public" role references with actual roles
- [ ] Ensure consistency across all menu files

---

### 11. Inconsistent Authorization Patterns

**Issue:** Some controllers use inline role checks instead of middleware.

**Files:**
- [backend/controllers/performance/performanceIndicator.controller.js](backend/controllers/performance/performanceIndicator.controller.js)

**Required Fix:**
```javascript
// Instead of inline checks:
const ensureRole = (req, allowedRoles = []) => {
  const role = req.user?.publicMetadata?.role;
  return allowedRoles.includes(role);
};

if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });

// Use middleware in routes:
import { requireRole } from '../../middleware/auth.js';
router.post('/', authenticate, requireRole('admin', 'manager'), create);
```

**Action Items:**
- [ ] Audit all controllers for inline role checks
- [ ] Replace with middleware pattern
- [ ] Document authorization pattern in code standards

---

### 12. Development Mode Security Bypass

**Issue:** DEV_COMPANY_ID workaround in auth middleware.

**File:** [backend/middleware/auth.js:117-139](backend/middleware/auth.js#L117-L139)

**Required Action:**
```javascript
// BEFORE PRODUCTION: Remove this code!
if (isDevelopment && (role === "admin" || role === "hr") && !companyId) {
  const devCompanyId = process.env.DEV_COMPANY_ID;
  if (devCompanyId) {
    companyId = devCompanyId;
    console.warn(`🔧 DEVELOPMENT WORKAROUND...`); // REMOVE THIS
  }
}
```

**Action Items:**
- [ ] Document this must be removed before production
- [ ] Add pre-deployment checklist item
- [ ] Consider adding environment check to fail fast if not configured

---

### 13. Project Routes Missing requireCompany

**Issue:** Company validation is disabled on project routes.

**File:** [backend/routes/api/projects.js:20](backend/routes/api/projects.js#L20)

**Current:**
```javascript
import {
  authenticate,
  requireRole,
  // requireCompany, // Temporarily disabled - Clerk auth not working properly
  attachRequestId
} from '../../middleware/auth.js';
```

**Required Fix:** Re-enable and fix requireCompany middleware.

**Action Items:**
- [ ] Fix Clerk auth integration
- [ ] Re-enable requireCompany on project routes
- [ ] Verify multi-tenant isolation works

---

## 💡 P3 - LOW PRIORITY IMPROVEMENTS

### 14. Create Centralized RBAC Config

**Suggestion:** Create a single source of truth for role permissions.

**File to Create:** `backend/config/rbac.js`

```javascript
export const RBAC_CONFIG = {
  superadmin: {
    dashboards: ['super-admin'],
    modules: ['super-admin'],
    pages: ['/super-admin/*']
  },
  admin: {
    dashboards: ['admin-dashboard', 'employee-dashboard', 'leads-dashboard', 'deals-dashboard'],
    modules: ['hrm', 'pm', 'crm', 'recruitment', 'finance', 'administration'],
    exclude: ['/hr-dashboard']
  },
  hr: {
    dashboards: ['hr-dashboard', 'employee-dashboard', 'leads-dashboard', 'deals-dashboard'],
    modules: ['hrm', 'pm', 'crm'],
    exclude: ['/admin-dashboard', 'administration']
  },
  employee: {
    dashboards: ['employee-dashboard'],
    modules: ['applications'],
    exclude: [
      '/leads-dashboard',
      '/deals-dashboard',
      '/clients',
      '/contacts',
      '/jobs',
      '/candidates',
      '/administration'
    ]
  }
};
```

**Action Items:**
- [ ] Create centralized RBAC config
- [ ] Refactor frontend to use config
- [ ] Refactor backend to use config
- [ ] Keep both files in sync via shared types

---

### 15. Add Resource-Level Authorization

**Suggestion:** Check not just role but also resource ownership.

**Example:** Employee can only update their own profile.

```javascript
// middleware/resourceAuth.js
export const requireOwnership = (getModel) => {
  return async (req, res, next) => {
    const resource = await getModel.findById(req.params.id);
    if (!resource) return res.status(404).json({ error: "Not found" });

    // Admin can access any resource in their company
    if (req.user.role === 'admin' && resource.companyId === req.user.companyId) {
      return next();
    }

    // User can access their own resources
    if (resource.employeeId === req.user.id) {
      return next();
    }

    return res.status(403).json({ error: "Forbidden" });
  };
};
```

**Action Items:**
- [ ] Design resource-level authorization pattern
- [ ] Implement for employee profile updates
- [ ] Implement for leave requests
- [ ] Document pattern

---

### 16. Add Audit Logging

**Suggestion:** Log all authorization failures for security monitoring.

```javascript
// middleware/auditLog.js
export const auditLog = (event) => {
  return async (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode === 403) {
        AuditLog.create({
          event,
          userId: req.user?.id,
          role: req.user?.role,
          ip: req.ip,
          path: req.path,
          method: req.method,
          timestamp: new Date()
        });
      }
    });
    next();
  };
};
```

**Action Items:**
- [ ] Design audit log schema
- [ ] Add to authentication middleware
- [ ] Create audit log viewer for Admin
- [ ] Set up alerts for repeated failures

---

## Implementation Order

### Phase 1: Critical Security Fixes (Week 1)
1. Fix Department controller role checks
2. Block SuperAdmin from business modules (frontend)
3. Block Employee from restricted pages (frontend + backend)
4. Remove Admin from HR Dashboard

### Phase 2: High Priority Fixes (Week 2)
5. Block HR from Administration module
6. Resolve Manager role inconsistency
7. Resolve Leads role inconsistency
8. Verify Deal controller behavior

### Phase 3: Medium Priority (Week 3-4)
9. Fix frontend role mismatches
10. Standardize authorization patterns
11. Fix development workarounds
12. Re-enable requireCompany on projects

### Phase 4: Low Priority (Future)
13. Create centralized RBAC config
14. Add resource-level authorization
15. Add audit logging

---

## Testing Checklist

After implementing fixes, verify:

### SuperAdmin
- [ ] Can only access Super Admin Dashboard
- [ ] Can access Companies, Packages, Subscriptions management
- [ ] CANNOT access any HRM, PM, CRM, Finance, Recruitment pages
- [ ] CANNOT access Chat, Calendar, or other applications

### Admin
- [ ] Can access Admin Dashboard (NOT HR Dashboard)
- [ ] Can access all HRM, PM, CRM, Recruitment, Finance modules
- [ ] Can access Administration module
- [ ] CANNOT access Super Admin Dashboard
- [ ] CANNOT access other companies' data

### HR
- [ ] Can access HR Dashboard
- [ ] Can access all HRM features
- [ ] Can access CRM (Leads, Deals)
- [ ] CANNOT access Administration module
- [ ] CANNOT access Admin Dashboard

### Employee
- [ ] Can ONLY access Employee Dashboard (not Leads/Deals)
- [ ] Can access own attendance, leave, timesheet
- [ ] Can access assigned projects and tasks
- [ ] CANNOT access Clients
- [ ] CANNOT access Contacts
- [ ] CANNOT access Recruitment (Jobs, Candidates)
- [ ] CANNOT access Finance
- [ ] CANNOT access Administration

---

## Files Requiring Changes

### Frontend Files
| File | Changes |
|------|---------|
| [react/src/core/data/json/sidebarMenu.jsx](react/src/core/data/json/sidebarMenu.jsx) | Add role filtering |
| [react/src/core/data/json/horizontalSidebar.tsx](react/src/core/data/json/horizontalSidebar.tsx) | Add role filtering |
| [react/src/core/common/stacked-sidebar/index.tsx](react/src/core/common/stacked-sidebar/index.tsx) | Add role filtering |
| [react/src/core/common/two-column/index.tsx](react/src/core/common/two-column/index.tsx) | Add role filtering |
| [react/src/feature-module/mainMenu/hrDashboard/index.tsx](react/src/feature-module/mainMenu/hrDashboard/index.tsx) | Filter dashboard cards |
| [react/src/feature-module/mainMenu/employeeDashboard/index.tsx](react/src/feature-module/mainMenu/employeeDashboard/index.tsx) | Filter dashboard cards |
| [react/src/feature-module/mainMenu/leadsDashboard/index.tsx](react/src/feature-module/mainMenu/leadsDashboard/index.tsx) | Add role guard |
| [react/src/feature-module/mainMenu/dealsDashboard/index.tsx](react/src/feature-module/mainMenu/dealsDashboard/index.tsx) | Add role guard |

### Backend Files
| File | Changes |
|------|---------|
| [backend/controllers/rest/department.controller.js](backend/controllers/rest/department.controller.js) | Add requireRole |
| [backend/routes/api/clients.js](backend/routes/api/clients.js) | Add requireRole |
| [backend/routes/api/leads.js](backend/routes/api/leads.js) | Verify requireRole |
| [backend/models/employee/employee.schema.js](backend/models/employee/employee.schema.js) | Add manager/leads to enum |
| [backend/socket/router.js](backend/socket/router.js) | Sync roles with schema |
| [backend/middleware/auth.js](backend/middleware/auth.js) | Remove dev workaround |

---

## Next Steps

1. **Review this report with the team** and confirm priority order
2. **Create a GitHub Project** with cards for each fix
3. **Assign fixes to developers** based on priority
4. **Set up testing environment** for role testing
5. **Implement fixes** following the phases above
6. **Test thoroughly** using the testing checklist
7. **Document any deviations** from this report
8. **Update documentation** as changes are made

---

## Questions to Answer

Before starting implementation:

1. **Manager Role:** Should we keep the manager role and fully implement it, or remove all references?
2. **Leads Role:** Same question - keep or remove?
3. **Employee Access to CRM:** Can employees read (not edit) leads/deals they're assigned to?
4. **Finance for HR:** Should HR have full access to Finance module, or limited access?
5. **Admin Dashboard vs HR Dashboard:** What's the difference? Why separate?
6. **Testing:** Do we have test users for each role configured?
