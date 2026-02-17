# RBAC Validation - Preliminary Manual Findings

**Date**: 2026-02-16
**Status**: Initial Manual Analysis (Agents Running)
**Analyst**: Claude Opus

---

## Executive Summary

Based on initial manual analysis of key files, the codebase contains **extensive hardcoded role checks** that need to be migrated to the dynamic RBAC system.

### Critical Findings
- **Backend**: 8+ controller files with hardcoded role checks
- **Frontend**: `withRoleCheck` HOC used for role-based routing
- **Sidebar Menu**: Hardcoded menu structure based on switch statement
- **Auth Middleware**: `requireRole()` function still used for authorization

---

## 1. Backend Hardcoded Roles (REST Controllers)

### 1.1 High Priority Issues

#### File: `backend/controllers/rest/employee.controller.js`
**Line 758**
```javascript
if (user.role !== 'admin' && user.role !== 'hr' && user.role !== 'superadmin') {
```
**Issue**: Hardcoded role check for employee access control
**Implementation Plan**: Replace with `requirePageAccess('hrm.employees', 'read')` middleware
**Priority**: HIGH

---

#### File: `backend/controllers/rest/userProfile.controller.js`
**Lines 861, 977**
```javascript
if (user.role !== 'admin') {
```
**Issue**: Direct admin role check for profile operations
**Implementation Plan**: Replace with `requirePageAccess('user.profile', 'update')`
**Priority**: HIGH

---

#### File: `backend/controllers/rest/syncRole.controller.js`
**Line 35**
```javascript
if (user.role !== 'admin' && user.role !== 'superadmin') {
```
**Issue**: Hardcoded admin/superadmin check for role sync
**Implementation Plan**: Replace with `requirePageAccess('users.roles', 'update')`
**Priority**: HIGH

---

#### File: `backend/controllers/rest/project.controller.js`
**Lines 612, 649, 752**
```javascript
if (user.role?.toLowerCase() !== 'superadmin') {
```
**Issue**: Direct superadmin role checks
**Implementation Plan**: Replace with `requirePageAccess('projects.manage', 'delete')`
**Priority**: MEDIUM

---

#### File: `backend/controllers/rest/project.controller.js`
**Line 66**
```javascript
if (user.role?.toLowerCase() === 'employee') {
```
**Issue**: Employee-specific filtering
**Implementation Plan**: Use company-based filtering with `requirePageAccess('projects.view', 'read')`
**Priority**: MEDIUM

---

### 1.2 User Role References (Logging/Context)

The following files reference `user.role` for logging or context (not authorization):

| File | Lines | Usage |
|------|-------|-------|
| `department.controller.js` | 52 | Logging only |
| `attendance.controller.js` | 767 | Context variable |
| `leave.controller.js` | 293, 354, 724, 852, 949, 1114, 1273, 1358, 1461 | Context variables |
| `overtime.controller.js` | 462, 577 | Context variables |
| `userProfile.controller.js` | 63, 69, 366, 376, 391, 397, 803, 925 | Context/logging |

**Note**: These are lower priority but should be reviewed for potential authorization logic.

---

## 2. Frontend Hardcoded Roles

### 2.1 withRoleCheck HOC

#### File: `react/src/feature-module/router/withRoleCheck.jsx`
**Status**: Core role-based routing component

**Issues**:
1. Hardcoded `ROLE_REDIRECTS` mapping (lines 8-16)
2. Direct role comparison for access (line 46)
3. No integration with dynamic permissions

**Implementation Plan**:
```javascript
// Current pattern:
withRoleCheck(Component, ['admin', 'hr', 'superadmin'])

// Should migrate to:
import { usePageAccess } from '@/hooks/usePageAccess';
const { canAccess } = usePageAccess('hrm.employees', 'read');
if (!canAccess) return <Navigate to="/unauthorized" />;
```

**Priority**: HIGH - Used throughout the app

---

### 2.2 Sidebar Menu Structure

#### File: `react/src/core/data/json/sidebarMenu.jsx`
**Lines 1-100+**

**Issues**:
1. **Hardcoded switch statement** based on `userRole` (line 57)
2. **Menu items hardcoded** within each role case
3. **Emergency fallback** for HR role (lines 50-55) - indicates existing bugs

**Current Structure**:
```javascript
switch (userRole) {
  case 'superadmin': return [/* superadmin menu */];
  case 'hr': return [/* hr menu */];
  case 'admin': return [/* admin menu */];
  // ...
}
```

**Implementation Plan**:
1. Fetch user permissions from `/api/rbac/my-permissions`
2. Filter menu items based on page access permissions
3. Remove hardcoded role-based switch statement
4. Use `PermissionContext` for dynamic menu filtering

**Priority**: CRITICAL - Affects all users

---

## 3. Auth Middleware Status

### File: `backend/middleware/auth.js`

**Status**: ✅ Contains `requireRole()` function (lines 257-302)

**Function**:
```javascript
export const requireRole = (...roles) => {
  return (req, res, next) => {
    // Role-based authorization
  };
};
```

**Issue**: This is the **legacy** role-based function that should be replaced with `requirePageAccess()`

**Migration Path**:
- Keep `requireRole` for backward compatibility during transition
- New code should use `requirePageAccess(pageCode, action)` from `pageAccess.js`
- Gradually migrate existing `requireRole` calls

---

## 4. Initial File Status Summary

| File | Status | RBAC Issues | Priority |
|------|--------|-------------|----------|
| `backend/controllers/rest/employee.controller.js` | ❌ | Hardcoded role checks | HIGH |
| `backend/controllers/rest/userProfile.controller.js` | ❌ | Hardcoded admin checks | HIGH |
| `backend/controllers/rest/syncRole.controller.js` | ❌ | Hardcoded admin/superadmin | HIGH |
| `backend/controllers/rest/project.controller.js` | ❌ | Superadmin role checks | MEDIUM |
| `backend/middleware/auth.js` | 🔄 | Legacy requireRole function | MEDIUM |
| `react/src/feature-module/router/withRoleCheck.jsx` | ❌ | HOC role checking | HIGH |
| `react/src/core/data/json/sidebarMenu.jsx` | ❌ | Hardcoded menu structure | CRITICAL |
| `backend/controllers/rest/leave.controller.js` | ⚠️ | Role context variables | LOW |
| `backend/controllers/rest/attendance.controller.js` | ⚠️ | Role context variables | LOW |
| `backend/controllers/rest/overtime.controller.js` | ⚠️ | Role context variables | LOW |

---

## 5. Migration Strategy

### Phase 1: Backend Route Migration
1. Replace `requireRole('admin', 'hr')` with `requirePageAccess('hrm.employees', 'read')`
2. Update all 8 REST controllers
3. Test each endpoint

### Phase 2: Frontend Component Migration
1. Replace `withRoleCheck(Component, ['admin'])` with permission-based checks
2. Update `usePageAccess` hook usage
3. Test component access

### Phase 3: Menu Migration
1. Create dynamic menu filtering based on permissions
2. Remove hardcoded switch statement
3. Test menu rendering for all roles

### Phase 4: Testing & Validation
1. Test all routes with different roles
2. Verify button visibility based on permissions
3. Validate menu items

---

## 6. Next Steps

1. ⏳ **Waiting for agent analysis completion** for comprehensive file-by-file breakdown
2. **Generate detailed migration scripts** for each affected file
3. **Create automated tests** for RBAC compliance
4. **Implement gradual migration** with backward compatibility

---

**Report Status**: 🔄 Preliminary - Agents running for comprehensive analysis
**Next Update**: When agents complete (expected comprehensive file list)
