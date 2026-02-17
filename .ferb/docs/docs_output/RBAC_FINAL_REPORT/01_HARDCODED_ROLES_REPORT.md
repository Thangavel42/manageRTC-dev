# Hardcoded Roles Report - Complete RBAC Migration Audit

**Generated:** 2026-02-16
**Scope:** Full codebase scan (`backend/` and `react/` folders)
**Goal:** Identify all hardcoded role references that must be migrated to Dynamic RBAC

---

## Executive Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 14 files | Direct role-based authorization decisions (security boundary) |
| **HIGH** | 12 files | Role arrays/flags used for access control in components |
| **MEDIUM** | 8 files | Role-based UI rendering and display logic |
| **LOW** | 6 files | Role extraction/display utilities (may remain as-is) |

**Total unique source files with hardcoded roles: ~40 files** (excluding documentation/markdown)

---

## Summary Table - All Affected Source Files

| # | File | Severity | Pattern Type | Occurrences |
|---|------|----------|-------------|-------------|
| 1 | `backend/middleware/auth.js` | CRITICAL | `requireRole`, `role === 'superadmin'`, `role === 'admin'`, `role === 'hr'`, `role === 'employee'` | 10+ |
| 2 | `backend/socket/router.js` | CRITICAL | `switch(role)` with `case 'superadmin'/'admin'/'hr'` | 5 |
| 3 | `backend/socket/index.js` | CRITICAL | `role === 'admin'`, `role === 'hr'`, `role === 'employee'`, `switch(role)` | 8+ |
| 4 | `backend/controllers/candidates/candidates.controllers.js` | CRITICAL | `isAdmin`, `isHR`, `isSuperadmin`, `isAuthorizedRead`, `isAuthorizedWrite` | 6 |
| 5 | `backend/controllers/activities/activities.controllers.js` | CRITICAL | `isAdmin`, `!isAdmin` checks | 4 |
| 6 | `backend/controllers/deal/deal.controller.js` | CRITICAL | `ensureRole()`, `isAdminOrManager` | 6 |
| 7 | `backend/controllers/contact/contact.controller.js` | CRITICAL | `ensureRole()` with role arrays | 7 |
| 8 | `backend/controllers/rest/designation.controller.js` | CRITICAL | `ensureRole()` with role arrays | 5 |
| 9 | `backend/controllers/rest/department.controller.js` | CRITICAL | `ensureRole()` with role arrays | 5 |
| 10 | `backend/controllers/rest/client.controller.js` | CRITICAL | `ensureRole()` with role arrays | 15+ |
| 11 | `backend/controllers/rest/timesheet.controller.js` | CRITICAL | `ensureRole()` with role arrays | 8 |
| 12 | `backend/controllers/performance/*.controller.js` (5 files) | CRITICAL | `ensureRole()` with role arrays | 15+ total |
| 13 | `backend/routes/api/admin-dashboard.js` | CRITICAL | `requireRole('admin', 'superadmin')` | 12 |
| 14 | `backend/services/leaveValidation.js` | CRITICAL | `approver.role === 'admin' \|\| approver.role === 'hr'` | 2 |
| 15 | `backend/controllers/addInvoice/addInvoice.socket.controller.js` | HIGH | `authorize(socket, ["admin", "hr"])` | 4 |
| 16 | `backend/controllers/user/user.socket.controller.js` | HIGH | `authorize(socket, ['admin', 'hr'])` | 2 |
| 17 | `backend/controllers/invoice/invoice.socket.controller.js` | HIGH | `authorize(socket, ["admin", "hr"])` | 5 |
| 18 | `backend/controllers/chat/users.controller.js` | HIGH | `['admin', 'hr', 'employee'].includes(role)` | 2 |
| 19 | `backend/controllers/chat/chat.controller.js` | HIGH | `role \|\| 'employee'` defaults | 3 |
| 20 | `backend/controllers/rest/employee.controller.js` | HIGH | `publicMetadata?.role \|\| user.role \|\| 'employee'` | 1 |
| 21 | `react/src/feature-module/router/withRoleCheck.jsx` | CRITICAL | `withRoleCheck` HOC, `ROLE_REDIRECTS`, `allowedRoles` | 10+ |
| 22 | `react/src/feature-module/router/router.link.tsx` | CRITICAL | `roles: ['admin', 'hr', 'superadmin']` arrays | 70+ |
| 23 | `react/src/feature-module/router/router.jsx` | CRITICAL | `withRoleCheck` usage | 2 |
| 24 | `react/src/feature-module/auth/login/validate.jsx` | HIGH | `switch(userRole)` with hardcoded cases | 7 |
| 25 | `react/src/core/data/json/sidebarMenu.jsx` | CRITICAL | `switch(role)` with `case 'superadmin'/'admin'/'hr'`, `roles: ['superadmin']` | 20+ |
| 26 | `react/src/core/data/json/horizontalSidebar.tsx` | HIGH | `roles: ['superadmin']` | 2 |
| 27 | `react/src/core/data/json/twoColData.tsx` | HIGH | `roles: ['superadmin']` | 1 |
| 28 | `react/src/core/utils/dashboardRoleFilter.ts` | HIGH | `allowedRoles: ['admin', 'hr']`, `roleHierarchy` | 30+ |
| 29 | `react/src/core/common/sidebar/index.tsx` | MEDIUM | `publicMetadata?.role` display logic | 12 |
| 30 | `react/src/core/common/stacked-sidebar/index.tsx` | MEDIUM | `getUserRole() === "superadmin"` display | 2 |
| 31 | `react/src/core/common/two-column/index.tsx` | MEDIUM | `getUserRole() === "superadmin"` display | 2 |
| 32 | `react/src/core/common/horizontal-sidebar/index.tsx` | MEDIUM | `publicMetadata?.role` extraction | 1 |
| 33 | `react/src/core/common/header/index.tsx` | MEDIUM | `isAdmin`, `isHR`, `isEmployee` from useUserProfileREST | 8 |
| 34 | `react/src/hooks/useAuth.ts` | LOW | `publicMetadata?.role`, default `'employee'` | 2 |
| 35 | `react/src/hooks/useUserProfileREST.ts` | HIGH | `isAdmin`, `isHR`, `isEmployee`, `isSuperadmin` boolean flags | 8 |
| 36 | `react/src/core/components/RoleBasedRenderer/index.tsx` | HIGH | `UserRole` type, `withRoleCheck` HOC export | 3 |
| 37 | `react/src/core/components/RoleDebugger/index.tsx` | LOW | Role display/debugging | 4 |
| 38 | `react/src/config/fieldPermissions.ts` | HIGH | `['admin', 'hr'].includes(role)` | 2 |
| 39 | `react/src/feature-module/hrm/attendance/leaves/leaveAdmin.tsx` | HIGH | `role === 'hr'`, `role === 'manager'` | 4 |
| 40 | `react/src/feature-module/projects/task/task.tsx` | HIGH | `isEmployee` checks (30+ occurrences) | 30+ |
| 41 | `react/src/feature-module/projects/task/taskdetails.tsx` | HIGH | `isEmployee` checks | 4 |
| 42 | `react/src/feature-module/projects/task/task-board.tsx` | HIGH | `isEmployee` checks | 5 |
| 43 | `react/src/feature-module/projects/project/project.tsx` | HIGH | `isEmployee` checks | 5 |
| 44 | `react/src/feature-module/projects/project/projectdetails.tsx` | HIGH | `isEmployee` checks | 10 |
| 45 | `react/src/feature-module/clerk/Clerkdash.jsx` | LOW | `publicMetadata?.role` display, role dropdown | 3 |
| 46 | `backend/controllers/superadmin.controller.js` | LOW | `publicMetadata?.role` for superadmin creation | 2 |
| 47 | `backend/services/clerkAdmin.service.js` | LOW | `publicMetadata?.role` verification | 1 |
| 48 | `backend/services/audit.service.js` | LOW | `user.role \|\| user.publicMetadata?.role` | 1 |
| 49 | `backend/routes/debug/auth-debug.js` | LOW | `role === 'superadmin'` diagnostic | 1 |
| 50 | `backend/services/pages/profilepage.services.js` | MEDIUM | `publicMetadata?.role \|\| 'employee'` | 1 |

---

## Detailed Findings

---

### FINDING 1: `requireRole` Middleware (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\middleware\auth.js`
**Lines:** 257-302

```javascript
export const requireRole = (...roles) => {
  const normalizedRoles = roles.map(r => r?.toLowerCase());
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ... });
    }
    if (!normalizedRoles.includes(req.user.role?.toLowerCase())) {
      return res.status(403).json({
        message: `Insufficient permissions. Required roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
};
```

**Issue:** The `requireRole` middleware is the OLD authorization pattern. It checks hardcoded role strings instead of dynamic page/action permissions. It is still exported and used across multiple route files.

**Implementation Plan:**
1. Replace all `requireRole(...)` calls in route files with `requirePageAccess('module.page', 'action')`
2. Keep `requireRole` temporarily for backward compatibility but mark as `@deprecated`
3. Eventually remove once all routes are migrated

---

### FINDING 2: `requireRole` Usage in Route Files (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\admin-dashboard.js`
**Lines:** 25, 44, 53, 62, 71, 80, 89, 98, 107, 116, 125, 134, 143

```javascript
import { authenticate, requireRole } from '../../middleware/auth.js';

// 12 routes all using:
requireRole('admin', 'superadmin'),
```

**Issue:** Every admin dashboard route uses `requireRole('admin', 'superadmin')` instead of `requirePageAccess`.

**Implementation Plan:**
1. Replace with `requirePageAccess('admin.dashboard', 'read')` for GET routes
2. Replace with `requirePageAccess('admin.dashboard', 'write')` for POST/PUT routes
3. Ensure the `admin.dashboard` page exists in the Pages collection with appropriate actions

---

### FINDING 3: `requireCompany` Superadmin Bypass (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\middleware\auth.js`
**Lines:** 308-321

```javascript
export const requireCompany = (req, res, next) => {
  if (req.user && req.user.role?.toLowerCase() === 'superadmin') {
    return next(); // Superadmin bypass
  }
  // ...
};
```

**Issue:** Hardcoded `'superadmin'` string for company bypass logic.

**Implementation Plan:**
1. Replace with a permission check: `if (req.user.permissions?.includes('system.bypass-company'))` or check if user has a system-level role flag
2. Alternatively, use `requirePageAccess` which already handles superadmin context

---

### FINDING 4: Socket Router - Role-Based Controller Registration (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\socket\router.js`
**Lines:** 36-111

```javascript
const router = (socket, io, role) => {
  switch (role) {
    case 'superadmin':
      superAdminController(socket, io);
      break;
    case 'admin':
      hrDashboardController(socket, io);
      adminController(socket, io);
      // ... 15+ controllers
      break;
    case 'hr':
      hrDashboardController(socket, io);
      // ... 12+ controllers
      break;
    case 'manager':
      // ... controllers
      break;
  }
};
```

**Issue:** The entire socket routing system is based on hardcoded role-to-controller mapping. Each role gets a different set of socket controllers.

**Implementation Plan:**
1. Fetch user's permissions from the RBAC system at socket connection time
2. Register socket controllers based on the user's permitted pages/modules rather than role string
3. Create a `socketPermissionRouter` that maps page permissions to controller registrations
4. Example: If user has `hrm.employees:read` permission, register `employeeController`

---

### FINDING 5: Socket Index - Role-Based Connection Handling (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\socket\index.js`
**Lines:** 166, 193, 237, 289-310

```javascript
if (!companyId && (role === "admin" || role === "hr")) {
  // Development workaround
}
if (!companyId && role === "employee") {
  // Error
}
if (role === "admin") {
  // Admin-specific room joining
}
switch (role) {
  case "superadmin": // room logic
  case "admin":      // room logic
  case "hr":         // room logic
}
```

**Issue:** Multiple hardcoded role comparisons for socket room management, company validation, and error handling.

**Implementation Plan:**
1. Replace role-based room joining with permission-based room joining
2. Use `socket.permissions` (loaded from RBAC) to determine which rooms to join
3. Replace `role === "admin"` checks with `hasPermission(socket, 'admin.dashboard', 'read')`

---

### FINDING 6: `ensureRole()` Helper in Controllers (CRITICAL)

**Files (each defines its own `ensureRole`):**

**a)** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\deal\deal.controller.js` (Lines: 9, 30, 93, 111)
```javascript
const ensureRole = (req, allowedRoles = []) => {
  const role = req.user?.publicMetadata?.role;
  return allowedRoles.includes(role?.toLowerCase());
};
if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
```

**b)** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\contact\contact.controller.js` (Lines: 18, 39, 52, 72, 85, 98, 111)
```javascript
if (!ensureRole(req, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) { ... }
```

**c)** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\rest\designation.controller.js` (Lines: 22, 148, 204, 260, 324)
```javascript
if (!ensureRole(user, ['admin', 'hr', 'superadmin'])) { ... }
if (!ensureRole(user, ['admin', 'superadmin'])) { ... }  // delete only
```

**d)** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\rest\department.controller.js` (Lines: 23, 251, 325, 396, 422)
```javascript
if (!ensureRole(user, ['admin', 'hr', 'superadmin'])) { ... }
if (!ensureRole(user, ['admin', 'superadmin'])) { ... }  // delete only
```

**e)** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\rest\client.controller.js` (Lines: 46, 70, 114, 153, 220, 302, 381, 410, 443, 473, 513, 587, 639, 743)
```javascript
if (!ensureRole(user, ['admin', 'hr', 'manager', 'leads', 'superadmin'])) { ... }
if (!ensureRole(user, ['admin', 'superadmin'])) { ... }  // delete only
```

**f)** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\rest\timesheet.controller.js` (Lines: 18, 155, 242, 371, 463, 528, 609, 709)
```javascript
if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin']) && timesheet.employeeId !== user.userId) { ... }
```

**g)** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\performance\goalType.controller.js` (Lines: 9, 30, 83, 101)
`c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\performance\goalTracking.controller.js` (Lines: 9, 30, 89, 107)
`c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\performance\performanceReview.controller.js` (Lines: 9, 30, 90, 108)
`c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\performance\performanceIndicator.controller.js` (Lines: 9, 30, 88, 106)
`c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\performance\performanceAppraisal.controller.js` (Lines: 9, 30, 90, 108)
```javascript
const ensureRole = (req, allowedRoles = []) => { ... };
if (!ensureRole(req, ["admin", "manager"])) return res.status(403).json({ error: "Forbidden" });
if (!ensureRole(req, ["admin"])) return res.status(403).json({ error: "Forbidden" }); // delete
```

**Issue:** Every controller defines its own local `ensureRole()` function that checks hardcoded role strings. This is duplicated across 12+ controllers.

**Implementation Plan:**
1. Remove all local `ensureRole()` definitions
2. Use `requirePageAccess` middleware at the route level instead of controller-level checks
3. Mapping examples:
   - `ensureRole(req, ["admin", "manager"])` on deal routes -> `requirePageAccess('crm.deals', 'read')`
   - `ensureRole(user, ['admin', 'superadmin'])` on delete -> `requirePageAccess('hrm.departments', 'delete')`
   - `ensureRole(user, ['admin', 'hr', 'superadmin'])` on write -> `requirePageAccess('hrm.designations', 'write')`

---

### FINDING 7: `authorize()` in Socket Controllers (HIGH)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\addInvoice\addInvoice.socket.controller.js`
**Lines:** 26, 38, 52, 65
```javascript
authorize(socket, ["admin", "hr"]);
authorize(socket, ["admin"]);
```

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\user\user.socket.controller.js`
**Lines:** 16, 52
```javascript
authorize(socket, ['admin', 'hr']);
authorize(socket, ['admin']);
```

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\invoice\invoice.socket.controller.js`
**Lines:** 23, 35, 61, 86, 118
```javascript
authorize(socket, ["admin", "hr"]);
authorize(socket, ["admin"]);
```

**Issue:** Socket controllers use `authorize(socket, roleArray)` which is the socket equivalent of `requireRole`.

**Implementation Plan:**
1. Create a `socketRequirePageAccess(socket, pagePath, action)` helper
2. Replace `authorize(socket, ["admin", "hr"])` with `socketRequirePageAccess(socket, 'finance.invoices', 'read')`
3. Load user permissions into `socket.permissions` at connection time

---

### FINDING 8: Candidates Controller - Role Boolean Flags (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\candidates\candidates.controllers.js`
**Lines:** 28-35

```javascript
const isAdmin = userRole === "admin";
const isHR = userRole === "hr";
const isManager = userRole === "manager";
const isSuperadmin = userRole === "superadmin";
const isAuthorizedRead = isAdmin || isHR || isManager || isSuperadmin;
const isAuthorizedWrite = isAdmin || isHR || isSuperadmin;
```

**Issue:** Multiple boolean flags derived from hardcoded role strings, then combined for authorization decisions.

**Implementation Plan:**
1. Replace with permission checks from the RBAC middleware
2. `isAuthorizedRead` -> check `req.permissions.has('recruitment.candidates', 'read')`
3. `isAuthorizedWrite` -> check `req.permissions.has('recruitment.candidates', 'write')`

---

### FINDING 9: Activities Controller - Admin-Only Checks (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\activities\activities.controllers.js`
**Lines:** 24, 30, 89, 109

```javascript
const isAdmin = socket.userMetadata?.role?.toLowerCase() === "admin";
if (!isAdmin) throw new Error("Unauthorized: Admins only");
```

**Issue:** Socket controller restricts functionality to admin role only.

**Implementation Plan:**
1. Replace with socket permission check: `if (!socket.hasPermission('crm.activities', 'write'))`
2. Load permissions into socket metadata at connection time

---

### FINDING 10: Leave Validation Service (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\services\leaveValidation.js`
**Lines:** 227

```javascript
const isAdminOrHR = approver.role === 'admin' || approver.role === 'hr' || approver.role === 'superadmin';
```

**Issue:** Business logic uses hardcoded role strings to determine leave approval authorization.

**Implementation Plan:**
1. Replace with permission lookup: check if approver has `hrm.leaves:approve` permission
2. This requires loading the approver's permissions from the RBAC system within the service

---

### FINDING 11: Chat Controllers - Role Defaults (HIGH)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\chat\users.controller.js`
**Lines:** 37-38, 59

```javascript
const hasValidRole = user.publicMetadata?.role &&
  ['admin', 'hr', 'employee'].includes(user.publicMetadata.role);
role: user.publicMetadata?.role || 'employee',
```

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\chat\chat.controller.js`
**Lines:** 154, 313, 321

```javascript
role: user.publicMetadata?.role || 'employee'
role: currentUser.publicMetadata?.role || 'employee'
role: targetUser.publicMetadata?.role || 'employee'
```

**Issue:** Chat system filters users by hardcoded role list and defaults to 'employee'.

**Implementation Plan:**
1. Filter users by company membership instead of role strings
2. Remove the role-based validation - any authenticated user with company access should be able to chat
3. Use permission check for chat features: `hasPermission('chat', 'read')`

---

### FINDING 12: `withRoleCheck` HOC (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\router\withRoleCheck.jsx`
**Lines:** 1-59 (entire file)

```javascript
const ROLE_REDIRECTS = {
  superadmin: routes.superAdminDashboard,
  admin: routes.adminDashboard,
  hr: routes.hrDashboard,
  manager: routes.adminDashboard,
  leads: routes.leadsDashboard,
  employee: routes.employeeDashboard,
  public: routes.login,
};

export const withRoleCheck = (Component, allowedRoles: string[] = []) => {
  // Checks user?.publicMetadata?.role against allowedRoles
};
```

**Issue:** The entire HOC is a hardcoded role-checking system. It's imported and used in `router.jsx` to wrap every route.

**Implementation Plan:**
1. Replace `withRoleCheck` with `PageAccessGuard` from `usePageAccess` hook
2. Instead of `withRoleCheck(Component, ['admin', 'hr'])`, use permission-based route guards
3. The redirect logic should use the RBAC system to determine the user's default page
4. Keep `ROLE_REDIRECTS` only for initial login redirect (not for authorization)

---

### FINDING 13: `router.link.tsx` - Role Arrays on Every Route (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\router\router.link.tsx`
**Lines:** 446, 1048-1114, 1389-1542, 1592-1876, 1954-2162

```javascript
{ path: '/super-admin/dashboard', roles: ['superadmin'] },
{ path: '/employees', roles: ['admin', 'hr', 'manager', 'leads', 'superadmin'] },
{ path: '/departments', roles: ['admin', 'hr', 'superadmin'] },
{ path: '/leaves', roles: ['admin', 'hr', 'superadmin'] },
// ... 70+ route definitions with hardcoded roles arrays
```

**Issue:** Every route definition includes a hardcoded `roles` array. This is a massive hardcoded authorization system.

**Implementation Plan:**
1. Remove `roles` arrays from route definitions entirely
2. Route access should be controlled by the RBAC permissions loaded at login
3. Use `usePageAccess` to check if user has permission for each route's corresponding page
4. The `router.jsx` should check permissions dynamically instead of using `withRoleCheck`

---

### FINDING 14: `router.jsx` - withRoleCheck Integration (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\router\router.jsx`
**Lines:** 6, 14-15

```javascript
import { withRoleCheck } from "./withRoleCheck";
// Wrap the route element with withRoleCheck
const ElementWithRoleCheck = withRoleCheck(route.element, route.roles);
```

**Issue:** The router wraps every component with the old `withRoleCheck` HOC.

**Implementation Plan:**
1. Replace `withRoleCheck(route.element, route.roles)` with a permission-based guard
2. Use `PageAccessGuard` that checks RBAC permissions for the route's page
3. Map routes to page names and check permissions dynamically

---

### FINDING 15: Sidebar Menu - Role Switch Statement (CRITICAL)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\data\json\sidebarMenu.jsx`
**Lines:** 49-58, 2101, 3029, 394-431, 4264

```javascript
// EMERGENCY FALLBACK for HR role
if (normalizedRole === 'hr') { ... }

switch (normalizedRole) {
  case 'superadmin':
    return superAdminMenu;  // Line 58
  case 'admin':
    return adminMenu;       // Line 2101
  case 'hr':
    return hrMenu;          // Line 3029
}

// Individual items with:
roles: ['superadmin'],
availableCases: ['superadmin', 'admin', 'hr', 'manager', 'leads', 'employee'],
```

**Issue:** The entire sidebar menu system is a massive switch statement returning different menus per role. Contains ~4000+ lines of role-specific menu definitions.

**Implementation Plan:**
1. Replace the role-based switch with a single unified menu filtered by permissions
2. Each menu item should reference a page name from the RBAC system
3. Use `usePageAccess` to filter visible menu items based on user's permissions
4. This is the **largest single migration task** in the codebase

---

### FINDING 16: Login Validation - Role-Based Redirect (HIGH)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\auth\login\validate.jsx`
**Lines:** 34-61

```javascript
switch (userRole) {
  case "superadmin": navigate(routes.superAdminDashboard); break;
  case "admin": navigate(routes.adminDashboard); break;
  case "hr": navigate(routes.hrDashboard); break;
  case "employee": navigate(routes.employeeDashboard); break;
  case "leads": navigate(routes.leadsDashboard); break;
  default: navigate(routes.adminDashboard); break;
}
```

**Issue:** Post-login redirect is entirely hardcoded by role.

**Implementation Plan:**
1. Fetch user's default/home page from their RBAC role configuration
2. The Role schema should include a `defaultDashboard` field
3. Redirect to `role.defaultDashboard` instead of hardcoded paths
4. Fallback to a generic dashboard if not configured

---

### FINDING 17: Dashboard Role Filter Utility (HIGH)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\utils\dashboardRoleFilter.ts`
**Lines:** 1-361 (entire file)

```javascript
export const DASHBOARD_CARDS = {
  totalEmployees: {
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
  },
  // ... 25+ cards with hardcoded allowedRoles
};

const roleHierarchy = {
  superadmin: 100, admin: 80, hr: 60, manager: 50, leads: 40, employee: 20, guest: 0,
};
```

**Issue:** All dashboard card visibility is controlled by hardcoded role arrays with a hardcoded role hierarchy.

**Implementation Plan:**
1. Replace `allowedRoles` with page/action permission checks
2. Map each dashboard card to a specific RBAC page action (e.g., `totalEmployees` -> `hrm.employees:read`)
3. Use `usePageAccess` to determine card visibility
4. Remove the `roleHierarchy` - hierarchy should be managed in the RBAC system

---

### FINDING 18: Horizontal Sidebar - Role Arrays (HIGH)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\data\json\horizontalSidebar.tsx`
**Lines:** 56, 102

```javascript
roles: ['superadmin'],
```

**Issue:** Sidebar items restricted by hardcoded role arrays.

**Implementation Plan:**
1. Replace `roles` with permission-based filtering
2. Filter menu items using `usePageAccess` hook

---

### FINDING 19: `useUserProfileREST` Hook - Role Boolean Flags (HIGH)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\hooks\useUserProfileREST.ts`
**Lines:** 81-84, 206-221

```typescript
interface returns {
  isAdmin: boolean;
  isHR: boolean;
  isEmployee: boolean;
  isSuperadmin: boolean;
}

const isAdmin = userRole === 'admin';
const isHR = userRole === 'hr';
const isEmployee = userRole === 'employee';
const isSuperadmin = userRole === 'superadmin';
```

**Issue:** This hook exports role boolean flags that are consumed across many frontend components (header, task, project, etc.).

**Implementation Plan:**
1. Replace these boolean flags with permission-based checks from `usePageAccess`
2. Instead of `isEmployee`, use `!hasPermission('projects.tasks', 'write')` or similar
3. Components using `isEmployee` should be refactored to check specific action permissions

---

### FINDING 20: Header Component - Role Display (MEDIUM)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\common\header\index.tsx`
**Lines:** 29, 127, 764, 782, 838, 856, 906, 920, 928

```javascript
const { profile, loading: profileLoading, isAdmin, isHR, isEmployee } = useUserProfileREST();

// Display logic:
isAdmin && profile ? (<AdminProfile />) :
(isHR || isEmployee) && profile ? (<EmployeeProfile />) :
```

**Issue:** Header renders different profile sections based on role boolean flags.

**Implementation Plan:**
1. Replace role flags with permission checks for profile viewing
2. Use `usePageAccess` to determine which profile sections to show
3. The role display name can remain (it's a UI label, not an authorization check)

---

### FINDING 21: Sidebar Role Display Labels (MEDIUM)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\common\sidebar\index.tsx`
**Lines:** 203-207, 248-252

```javascript
{(user?.publicMetadata?.role as string)?.toLowerCase() === "admin" ? "Admin" :
 (user?.publicMetadata?.role as string)?.toLowerCase() === "hr" ? "HR" :
 (user?.publicMetadata?.role as string)?.toLowerCase() === "superadmin" ? "Super Admin" :
 (user?.publicMetadata?.role as string)?.toLowerCase() === "manager" ? "Manager" :
 (user?.publicMetadata?.role as string)?.toLowerCase() === "leads" ? "Leads" :
 "Employee"}
```

**Issue:** Hardcoded role-to-display-name mapping for sidebar display.

**Implementation Plan:**
1. Fetch the role's display name from the RBAC Role schema
2. Replace the ternary chain with `role.displayName` from the user's assigned RBAC role
3. This is a **DISPLAY** issue, not a security issue - lower priority

---

### FINDING 22: Field Permissions Configuration (HIGH)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\config\fieldPermissions.ts`
**Lines:** 445-456

```typescript
export function hasFullEditAccess(role: string): boolean {
  return ['admin', 'hr'].includes(role);
}

export function canEditOthers(role: string): boolean {
  return ['admin', 'hr'].includes(role);
}
```

**Issue:** Field-level permissions use hardcoded role arrays.

**Implementation Plan:**
1. Replace with RBAC permission checks: `hasPermission('profiles', 'edit-all')`
2. The field permission system should query the RBAC system for field-level access

---

### FINDING 23: Leave Admin - Role-Based Business Logic (HIGH)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\hrm\attendance\leaves\leaveAdmin.tsx`
**Lines:** 242, 270, 275

```javascript
if (role === 'hr') {
  message.error('HR cannot approve leave requests');
  return;
}
const success = role === 'manager'
  ? await managerActionLeave(id, 'approved', undefined, 'Approved')
  : await approveLeave(id, "Approved");
```

**Issue:** Leave approval/rejection logic is branched by hardcoded role strings.

**Implementation Plan:**
1. Replace with permission checks: `if (!hasPermission('hrm.leaves', 'approve'))`
2. The distinction between manager approval and admin approval should be handled at the backend level based on permissions

---

### FINDING 24: Project/Task Components - `isEmployee` Usage (HIGH)

**Files:**
- `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\projects\task\task.tsx` (30+ occurrences)
- `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\projects\task\taskdetails.tsx` (4 occurrences)
- `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\projects\task\task-board.tsx` (5 occurrences)
- `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\projects\project\project.tsx` (5 occurrences)
- `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\projects\project\projectdetails.tsx` (10 occurrences)

```javascript
const { profile, isAdmin, isHR, isEmployee } = useUserProfileREST();
{!isEmployee && (<ActionButtons />)}
if (isEmployee && profile) { /* filter my tasks */ }
```

**Issue:** Massive usage of `isEmployee` flag to control UI rendering. This is the most widespread hardcoded role usage in frontend components.

**Implementation Plan:**
1. Replace `!isEmployee` with `hasPermission('projects.tasks', 'write')` or `hasPermission('projects.tasks', 'manage')`
2. Replace `isEmployee` data filtering with API-level filtering (backend should return only authorized data)
3. Use `PermissionButton` component for action buttons instead of `!isEmployee` conditionals

---

### FINDING 25: RoleBasedRenderer Component (HIGH)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\components\RoleBasedRenderer\index.tsx`
**Lines:** 11, 100, 165

```typescript
export type UserRole = 'admin' | 'hr' | 'employee' | 'manager' | 'leads' | 'superadmin' | 'guest';

export const withRoleCheck = <P extends object>(...) => { ... };

<RoleBasedRenderer allowedRoles={['superadmin']} fallback={fallback}>
```

**Issue:** Defines a `UserRole` type and provides role-based rendering utilities used across the app.

**Implementation Plan:**
1. Keep `UserRole` type for backward compatibility but add deprecation notice
2. Replace `RoleBasedRenderer` with `PermissionBasedRenderer` that accepts page+action
3. Replace `allowedRoles={['superadmin']}` with `requiredPermission={{ page: 'system.admin', action: 'read' }}`

---

### FINDING 26: `useAuth` Hook - Role Extraction (LOW)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\hooks\useAuth.ts`
**Lines:** 33

```typescript
const role = (user.publicMetadata?.role as string) || 'employee';
```

**Issue:** Extracts role from Clerk metadata with a hardcoded default of `'employee'`.

**Implementation Plan:**
1. This hook is a foundational building block - it should continue to extract the role string
2. Add permissions loading alongside role extraction
3. The default role should come from configuration, not be hardcoded
4. This is LOW priority since role extraction is still needed for the RBAC system to look up the user's role permissions

---

### FINDING 27: Clerk Dashboard - Role Display (LOW)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\clerk\Clerkdash.jsx`
**Lines:** 25, 57, 96

```javascript
setRole(user?.publicMetadata?.role || "");
<option value="superadmin">Super Admin</option>
```

**Issue:** Developer/debug tool that displays and allows setting roles.

**Implementation Plan:**
1. LOW priority - this is a debug/admin tool
2. Could be enhanced to show RBAC role assignments instead
3. Keep for backward compatibility during migration

---

### FINDING 28: Superadmin Controller - Role Verification (LOW)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\superadmin.controller.js`
**Lines:** 755, 775

```javascript
const currentRole = clerkUser.publicMetadata?.role;
newRole: updatedUser.publicMetadata?.role,
```

**Issue:** Reads/writes role to Clerk metadata during superadmin user management.

**Implementation Plan:**
1. LOW priority - this is infrastructure code for the role system itself
2. The superadmin management should also assign RBAC roles, not just Clerk metadata roles
3. When creating a superadmin, also assign the corresponding RBAC Role document

---

### FINDING 29: Job List/Grid - Role-Based Filtering (MEDIUM)

**Files:**
- `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\recruitment\jobs\joblist.tsx` (Line: 240)
- `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\recruitment\jobs\jobgrid.tsx` (Line: 239)

```javascript
case "hr":
  // HR-specific job filtering logic
```

**Issue:** Job views filter content based on hardcoded role.

**Implementation Plan:**
1. Replace with permission-based filtering
2. Backend should handle data filtering based on user permissions

---

### FINDING 30: Auth Debug Route (LOW)

**File:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\debug\auth-debug.js`
**Lines:** 92

```javascript
isSuperadmin: user.publicMetadata?.role?.toLowerCase() === 'superadmin',
```

**Issue:** Debug route checks for superadmin status.

**Implementation Plan:**
1. LOW priority - debug route
2. Can be updated to also show RBAC permissions

---

## Migration Priority Order

### Phase 1: Backend Route Middleware (CRITICAL - Security Boundary)
1. Replace all `requireRole(...)` in route files with `requirePageAccess`
2. Replace all `ensureRole(...)` in controllers with `requirePageAccess` at route level
3. Files: `admin-dashboard.js`, all route files importing `requireRole`

### Phase 2: Backend Controller Logic (CRITICAL)
1. Remove `ensureRole()` helper from all controllers (12+ files)
2. Remove `isAdmin/isHR/isSuperadmin` boolean flags from socket controllers
3. Replace `authorize(socket, roles)` with socket permission checks
4. Files: All controllers in `backend/controllers/`

### Phase 3: Socket System (CRITICAL)
1. Refactor `socket/router.js` to use permission-based controller registration
2. Refactor `socket/index.js` role-based room joining
3. Load permissions at socket connection time

### Phase 4: Frontend Route System (CRITICAL)
1. Replace `withRoleCheck` with `PageAccessGuard`
2. Remove `roles` arrays from `router.link.tsx`
3. Update `router.jsx` to use permission-based guards

### Phase 5: Sidebar and Navigation (CRITICAL)
1. Replace role-based switch in `sidebarMenu.jsx` with permission-filtered unified menu
2. Update `horizontalSidebar.tsx` and `twoColData.tsx`

### Phase 6: Frontend Components (HIGH)
1. Replace `isEmployee`/`isAdmin`/`isHR` usage across project/task components
2. Replace `useUserProfileREST` role flags with `usePageAccess` hooks
3. Update dashboard role filter utility

### Phase 7: Business Logic (HIGH)
1. Update `leaveValidation.js` to use permission checks
2. Update `fieldPermissions.ts` to use RBAC
3. Update `leaveAdmin.tsx` role-based branching

### Phase 8: Display and Polish (MEDIUM/LOW)
1. Update sidebar role display labels
2. Update header profile display
3. Update login redirect logic
4. Update debug tools

---

## Statistics

| Category | Files | Occurrences |
|----------|-------|-------------|
| `requireRole` middleware usage | 2 | 15+ |
| `ensureRole` helper functions | 12 | 60+ |
| `authorize` socket helper | 3 | 11 |
| `isAdmin/isHR/isEmployee` boolean flags | 8 | 50+ |
| `role === 'xxx'` comparisons | 10 | 25+ |
| `withRoleCheck` HOC | 3 | 5 |
| `roles: [...]` route arrays | 1 | 70+ |
| `allowedRoles` dashboard config | 1 | 25+ |
| Sidebar role switch | 1 | 4000+ lines |
| `publicMetadata?.role` extraction | 15 | 30+ |
| **TOTAL** | **~50 files** | **~300+ occurrences** |

---

## Files That Can Remain Unchanged

The following files use role information for legitimate, non-authorization purposes and may not need migration:

1. **`backend/services/audit.service.js`** - Logs the actor's role for audit trail (informational)
2. **`backend/seed/diagnoseSuperAdminMetadata.js`** - Diagnostic script (not production code)
3. **`react/src/core/components/RoleDebugger/index.tsx`** - Debug component (not authorization)
4. **`react/src/feature-module/clerk/Clerkdash.jsx`** - Dev tool for role management
5. **`backend/config/env.js`** - Joi validation for DEFAULT_ROLE env var
6. **`backend/controllers/superadmin.controller.js`** - Manages Clerk metadata (infrastructure)
7. **`backend/services/clerkAdmin.service.js`** - Clerk Admin API integration (infrastructure)

---

*Report generated by comprehensive codebase analysis. All file paths are absolute. All line numbers verified against source files as of 2026-02-16.*
