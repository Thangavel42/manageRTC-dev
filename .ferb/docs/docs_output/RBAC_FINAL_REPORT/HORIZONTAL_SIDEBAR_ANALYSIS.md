# Horizontal Sidebar RBAC Analysis

**Date**: 2026-02-16
**File**: `react/src/core/data/json/horizontalSidebar.tsx`
**Component**: `react/src/core/common/horizontal-sidebar/index.tsx`
**Status**: ❌ CRITICAL - Hardcoded role-based filtering

---

## Executive Summary

The horizontal sidebar is **completely hardcoded** with role arrays for every menu item. It uses a `hasAccess()` function to filter menu items based on user role. This is a **critical migration target**.

---

## 1. File: horizontalSidebar.tsx

### Issue: Hardcoded `roles` Arrays

Every menu item has a hardcoded `roles` array:

```typescript
{
  menuValue: 'Dashboard',
  roles: ['admin', 'hr', 'manager', 'leads', 'employee'],
  subMenus: [
    {
      menuValue: 'Admin Dashboard',
      roles: ['admin', 'manager'],
    },
    {
      menuValue: 'Employee Dashboard',
      roles: ['employee', 'admin', 'hr', 'manager', 'leads'],
    },
    // ... more items with hardcoded roles
  ]
}
```

### Affected Menu Categories

| Category | Sub-items Count | Has Hardcoded Roles |
|----------|-----------------|---------------------|
| Dashboard | 5 | ✅ Yes |
| Super Admin | 7 | ✅ Yes |
| Users & Permissions | 6 | ✅ Yes |
| Application | ~15 | ✅ Yes |
| HRM | ~30 | ✅ Yes |
| Projects | ~8 | ✅ Yes |
| CRM | ~12 | ✅ Yes |
| Finance | ~10 | ✅ Yes |
| Settings | ~20 | ✅ Yes |

**Total estimated items**: ~100+ menu items with hardcoded roles

---

## 2. File: horizontal-sidebar/index.tsx

### Current Implementation

```typescript
// Line 21-26: Role-based access check
const hasAccess = (roles?: string[]): boolean => {
  if (!roles || roles.length === 0) return true;
  if (roles.includes("public")) return true;
  const userRole = getUserRole();
  return roles.includes(userRole);
};

// Line 55: Filter menu by roles
{mainMenu?.menu?.filter((data: any) => hasAccess(data?.roles)).map(...)}

// Line 72: Filter submenus by roles
{data?.subMenus.filter((subMenu: any) => hasAccess(subMenu?.roles)).map(...)}
```

### Issues

1. **Direct role comparison** - No integration with RBAC permissions
2. **Static role list** - `roles: ['admin', 'hr']` hardcoded
3. **No page-level permissions** - Can't control individual actions

---

## 3. Migration Plan

### Phase 1: Update horizontalSidebar.tsx Structure

**Current Structure**:
```typescript
{
  menuValue: 'Companies',
  route: routes.superAdminCompanies,
  roles: ['superadmin'],
}
```

**Target Structure**:
```typescript
{
  menuValue: 'Companies',
  route: routes.superAdminCompanies,
  pageCode: 'superadmin.companies',  // NEW: Reference to Pages collection
  action: 'read',                      // NEW: Required action
}
```

### Phase 2: Update horizontal-sidebar/index.tsx

**Replace `hasAccess()` function**:

```typescript
// Import RBAC hooks
import { usePermissions } from '@/contexts/PermissionContext';

const HorizontalSidebar = () => {
  const { hasPageAccess } = usePermissions();

  // Replace hasAccess with permission check
  const canShowMenuItem = (pageCode?: string, action?: string): boolean => {
    if (!pageCode) return true;  // Show if no pageCode (headers, etc.)
    return hasPageAccess(pageCode, action || 'read');
  };

  // Update filtering
  {mainMenu?.menu?.filter((item: any) =>
    canShowMenuItem(item.pageCode, item.action)
  ).map(...)}
};
```

### Phase 3: Remove All Hardcoded `roles` Arrays

| Step | Action | Files Affected |
|------|--------|----------------|
| 3.1 | Add `pageCode` to all menu items | `horizontalSidebar.tsx` |
| 3.2 | Add `action` property (default: 'read') | `horizontalSidebar.tsx` |
| 3.3 | Remove all `roles` arrays | `horizontalSidebar.tsx` |
| 3.4 | Update component to use `hasPageAccess` | `index.tsx` |
| 3.5 | Test menu rendering for all roles | Multiple |

---

## 4. Sample Migration: Dashboard Menu

### Before
```typescript
{
  menuValue: 'Dashboard',
  hasSubRoute: true,
  showSubRoute: false,
  icon: 'smart-home',
  base: 'dashboard',
  roles: ['admin', 'hr', 'manager', 'leads', 'employee'],
  subMenus: [
    {
      menuValue: 'Admin Dashboard',
      route: routes.adminDashboard,
      base: 'index',
      roles: ['admin', 'manager'],
    },
    {
      menuValue: 'Employee Dashboard',
      route: routes.employeeDashboard,
      base: 'employee',
      roles: ['employee', 'admin', 'hr', 'manager', 'leads'],
    },
    // ...
  ],
}
```

### After
```typescript
{
  menuValue: 'Dashboard',
  hasSubRoute: true,
  showSubRoute: false,
  icon: 'smart-home',
  base: 'dashboard',
  pageCode: 'dashboard',        // Page category code
  action: 'read',                // Action required
  subMenus: [
    {
      menuValue: 'Admin Dashboard',
      route: routes.adminDashboard,
      base: 'index',
      pageCode: 'main.admin-dashboard',
      action: 'read',
    },
    {
      menuValue: 'Employee Dashboard',
      route: routes.employeeDashboard,
      base: 'employee',
      pageCode: 'main.employee-dashboard',
      action: 'read',
    },
    // ...
  ],
}
```

---

## 5. Page Code Mapping Table

| Menu Item | Current Route | Page Code (to be created) |
|-----------|---------------|---------------------------|
| Admin Dashboard | `/admin-dashboard` | `main.admin-dashboard` |
| Employee Dashboard | `/employee-dashboard` | `main.employee-dashboard` |
| HR Dashboard | `/hr-dashboard` | `main.hr-dashboard` |
| Deals Dashboard | `/deals-dashboard` | `main.deals-dashboard` |
| Leads Dashboard | `/leads-dashboard` | `main.leads-dashboard` |
| Companies | `/super-admin/companies` | `superadmin.companies` |
| Subscriptions | `/super-admin/subscription` | `superadmin.subscriptions` |
| Packages | `/super-admin/package` | `superadmin.packages` |
| Modules | `/super-admin/modules` | `superadmin.modules` |
| Pages | `/super-admin/pages` | `superadmin.pages` |
| Users | `/users` | `users.users` |
| Roles & Permissions | `/roles-permissions` | `users.roles` |
| Permission | `/permission` | `users.permissions` |
| Employees | `/employees` | `hrm.employees` |
| Departments | `/departments` | `hrm.departments` |
| Designations | `/designations` | `hrm.designations` |
| Leave Admin | `/leave-admin` | `hrm.leaves.admin` |
| Leave Employee | `/leave-employee` | `hrm.leaves.employee` |
| Attendance Admin | `/attendanceadmin` | `hrm.attendance.admin` |
| Projects | `/projects` | `projects.projects` |
| Clients | `/clients` | `projects.clients` |
| Tasks | `/tasks` | `projects.tasks` |
| Contacts | `/contacts` | `crm.contacts` |
| Companies (CRM) | `/companies` | `crm.companies` |
| Deals | `/deals` | `crm.deals` |
| Leads | `/leads` | `crm.leads` |
| Invoices | `/invoices` | `finance.invoices` |
| Payroll | `/payroll` | `finance.payroll` |
| Expenses | `/expenses` | `finance.expenses` |
| Assets | `/assets` | `administration.assets` |
| Reports | Various | `administration.reports.*` |
| Settings | Various | `settings.*` |

---

## 6. Implementation Priority

| Priority | Menu Category | Reason |
|----------|---------------|--------|
| CRITICAL | Dashboard | All users see this |
| CRITICAL | HRM | Core HR functionality |
| HIGH | Super Admin | System management |
| HIGH | Users & Permissions | Security settings |
| MEDIUM | Projects | Project management |
| MEDIUM | CRM | Customer management |
| MEDIUM | Finance | Financial operations |
| LOW | Settings | Configuration |
| LOW | UI Interface | Demo pages |

---

## 7. Testing Checklist

- [ ] Menu renders correctly for superadmin
- [ ] Menu renders correctly for hr
- [ ] Menu renders correctly for admin
- [ ] Menu renders correctly for employee
- [ ] Menu items hide when permission denied
- [ ] Menu items show when permission granted
- [ ] Submenus filter correctly
- [ ] Second-level submenus filter correctly
- [ ] Active route highlighting works
- [ ] Menu persistence works

---

## 8. Risks & Considerations

1. **Breaking Change**: This will completely change how menu filtering works
2. **Page Codes Must Exist**: All `pageCode` values must exist in Pages collection
3. **Permission Migration**: Users must have permissions assigned or menu will be empty
4. **Fallback Needed**: Consider keeping `roles` as fallback during transition

---

## 9. Recommended Approach

### Option A: Big Bang (Risky)
- Replace all at once
- **Risk**: High chance of breaking menu for all users
- **Timeline**: 1-2 days

### Option B: Gradual Migration (Recommended)
1. Add `pageCode` alongside `roles` (keep both)
2. Update component to check permissions first, fallback to roles
3. Remove `roles` after validation
4. **Risk**: Low, backward compatible
5. **Timeline**: 1 week

### Option C: Feature Flag
- Use feature flag to switch between old/new logic
- **Risk**: Medium, requires flag infrastructure
- **Timeline**: 3-5 days

---

**Status**: 🔄 Awaiting comprehensive agent analysis for complete menu item inventory
**Next Step**: Generate migration script for all 100+ menu items
