# HARDCODED MENUS REPORT - RBAC Integration Audit

**Generated:** 2026-02-16
**Scope:** All sidebar/navigation components and their data files
**Status:** CRITICAL - Multiple hardcoded menu structures found across 8 files
**Severity:** HIGH - None of the navigation components use the Dynamic RBAC Permission system

---

## Executive Summary

The codebase has **8 files** containing hardcoded menu structures with **old-style role-based filtering** (`roles: ['admin', 'hr', ...]`) instead of the Dynamic RBAC permission system (`usePageAccess`, `PermissionContext`, `hasPermission`). None of the sidebar data files or sidebar rendering components import or use the RBAC hooks/context.

**Key Finding:** Zero sidebar components use `usePageAccess`, `PermissionContext`, or any RBAC-based permission check. All menu visibility is controlled by hardcoded `roles` arrays in static data files, or by a massive `switch(userRole)` statement.

---

## FILE-BY-FILE ANALYSIS

---

### 1. CRITICAL: `horizontalSidebar.tsx` (Horizontal Sidebar Data)

**Full Path:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\data\json\horizontalSidebar.tsx`
**Lines:** 1913 lines
**Severity:** CRITICAL

#### Issues Found

**Issue 1: Entire menu structure is a hardcoded static export (Lines 4-1913)**
```typescript
export const HorizontalSidebarData = [
  {
    title: 'Main',
    showAsTab: false,
    separateRoute: false,
    menu: [
      // ~1900 lines of hardcoded menus
    ],
  },
];
```
- **Problem:** This is a static `const` export, not a function or hook. It cannot access any React context (like PermissionContext) or hooks (like usePageAccess).
- **Impact:** The entire horizontal sidebar is ungoverned by RBAC.

**Issue 2: Hardcoded `roles` arrays throughout (Lines 16, 22, 28, 34, 40, 46, 56, 102, 142, 381, 392, 423, 541, 641, 658)**

```typescript
// Line 16 - Dashboard menu
roles: ['admin', 'hr', 'manager', 'leads', 'employee'],

// Line 56 - Super Admin menu
roles: ['superadmin'],

// Line 102 - Users & Permissions menu
roles: ['superadmin'],

// Line 142 - Application menu
roles: ['admin', 'hr', 'manager', 'leads', 'employee'],

// Line 381 - Projects menu
roles: ['admin', 'hr', 'manager', 'leads', 'employee'],

// Line 541 - Attendance (Employee) specific
roles: ['hr', 'manager', 'leads', 'employee'],

// Line 641 - Administration menu
roles: ['admin'],

// Line 658 - Requirement submenu
roles: ['admin', 'hr', 'manager'],
```
- **Problem:** 15 hardcoded `roles` arrays. Adding a new role requires editing this file manually.
- **Impact:** Cannot dynamically add/remove role access through RBAC UI.

**Issue 3: Many menu items have NO roles property at all (Lines 263-374, 968-1313, etc.)**
```typescript
// Lines 263-374 - Layouts menu has NO roles property
{
  menuValue: 'Layouts',
  hasSubRoute: true,
  // NO roles: [...] property - visible to ALL users
  subMenus: [...]
}

// Lines 968-1313 - Assets, Reports, Settings submenus have NO roles
{
  menuValue: 'Assets',
  base: 'assets',
  customSubmenuTwo: true,
  // NO roles property
  subMenusTwo: [...]
}
```
- **Problem:** Menu items without `roles` default to visible for everyone.
- **Impact:** Settings, Reports, Assets, and other admin pages are visible to all roles.

**Issue 4: Duplicate menu sections (Lines 741-966)**

The Payroll submenu (line 742) contains deeply nested duplicates of CRM, Employee, Attendance, Performance, Training, Promotion, Resignation, and Termination menus -- all hardcoded.

#### Implementation Plan
1. Convert `HorizontalSidebarData` from a static export to a React hook (`useHorizontalSidebarData`)
2. Import `usePageAccess` or `usePermissionContext` inside the hook
3. Replace all hardcoded `roles: [...]` with dynamic permission checks: filter menu items based on `hasPageAccess(pageName, 'read')`
4. Map each `menuValue`/`route` to a corresponding RBAC page name
5. Remove duplicate menu sections

---

### 2. CRITICAL: `horizontal-sidebar/index.tsx` (Horizontal Sidebar Component)

**Full Path:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\common\horizontal-sidebar\index.tsx`
**Lines:** 127 lines
**Severity:** CRITICAL

#### Issues Found

**Issue 1: Old-style `hasAccess` function using role string matching (Lines 15-26)**
```typescript
// Line 15-18
const getUserRole = (): string => {
  if (!user) return "guest";
  return (user.publicMetadata?.role as string)?.toLowerCase() || "employee";
};

// Line 21-26
const hasAccess = (roles?: string[]): boolean => {
  if (!roles || roles.length === 0) return true;
  if (roles.includes("public")) return true;
  const userRole = getUserRole();
  return roles.includes(userRole);
};
```
- **Problem:** Uses `user.publicMetadata.role` string comparison instead of RBAC permissions
- **Impact:** Cannot respect dynamic permission changes made via the RBAC UI

**Issue 2: Filter chains using old `hasAccess` (Lines 55, 72, 91)**
```typescript
// Line 55 - Top level filtering
{mainMenu?.menu?.filter((data: any) => hasAccess(data?.roles)).map(...)}

// Line 72 - Submenu filtering
{((data?.subMenus || []) as any[]).filter((subMenu: any) => hasAccess(subMenu?.roles)).map(...)}

// Line 91 - Sub-submenu filtering
{subMenu.subMenusTwo.filter((subMenuTwo: any) => hasAccess(subMenuTwo?.roles)).map(...)}
```
- **Problem:** All three levels of menu filtering use the old `hasAccess(roles)` pattern
- **Impact:** No RBAC integration at any nesting level

**Issue 3: No RBAC imports (Line 1-5)**
```typescript
import { HorizontalSidebarData } from '../../data/json/horizontalSidebar'
import { useUser } from '@clerk/clerk-react';
// Missing: usePageAccess, usePermissionContext, PermissionContext
```

#### Implementation Plan
1. Import `usePageAccess` hook
2. Replace `hasAccess(roles)` with `hasPageAccess(menuItem.pageName, 'read')` for each menu level
3. Add `pageName` property mapping to each menu item (or derive from route)
4. Remove `getUserRole()` function entirely

---

### 3. CRITICAL: `sidebarMenu.jsx` (Vertical Sidebar Data)

**Full Path:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\data\json\sidebarMenu.jsx`
**Lines:** 6,309 lines
**Severity:** CRITICAL - Largest hardcoded menu file

#### Issues Found

**Issue 1: Massive switch statement by role (Lines 57-6309)**
```javascript
switch (userRole) {
  case 'superadmin':    // Line 58 - returns ~2000 lines of menu
  case 'admin':         // Line 2101 - returns ~900 lines of menu
  case 'hr':            // Line 3029 - returns ~600 lines of menu
  case 'manager':       // Line 3669 - returns ~270 lines of menu
  case 'leads':         // Line 3945 - returns ~140 lines of menu
  case 'employee':      // Line 4087 - returns ~170 lines of menu
  default:              // Line 4260 - returns ~2000 lines of menu
}
```
- **Problem:** Each role gets a completely separate, duplicated menu structure. 6,309 lines of mostly duplicated hardcoded menus.
- **Impact:** Adding a new role requires duplicating hundreds of lines. Changing a menu item requires editing up to 7 places.

**Issue 2: Debug logging everywhere (Lines 8-55)**
```javascript
console.log('%c=== SIDEBAR MENU DEBUG START ===', 'background: #ff0000; ...');
console.log('[BRUTAL DEBUG] User object:', user);
console.log('[BRUTAL DEBUG] user?.publicMetadata:', user?.publicMetadata);
// ... many more console.log statements
```
- **Problem:** Excessive debug logging in production code
- **Impact:** Performance degradation, console noise

**Issue 3: Emergency fallback bypass (Lines 49-55)**
```javascript
if (userRole === 'hr') {
  console.warn('%c[EMERGENCY FALLBACK] Detected HR role, bypassing switch statement!', ...);
}
```
- **Problem:** Leftover emergency debugging code

**Issue 4: Hardcoded `roles` arrays within switch cases (Lines 394-431, 2119-2133, 3052-3062)**
```javascript
// Inside superadmin case, lines 394-431
submenuItems: [
  { label: 'Users', link: routes.users, roles: ['superadmin'] },
  { label: 'Roles & Permissions', link: routes.rolePermission, roles: ['superadmin'] },
  { label: 'Permission', link: routes.permissionpage, roles: ['superadmin'] },
  // ...
]
```
- **Problem:** Even within role-specific switch cases, additional hardcoded role filtering exists

**Issue 5: No RBAC permission checks anywhere in 6,309 lines**
- Zero imports of `usePageAccess`, `PermissionContext`, or any permission hook
- The file is a hook (`useSidebarData`) but only uses `useUser` from Clerk

#### Implementation Plan
1. Replace the entire `switch(userRole)` with a single unified menu structure
2. Define ONE canonical menu tree (similar to what the Pages hierarchy in the database already defines)
3. Filter menu items dynamically using `usePageAccess` hook
4. Each menu item maps to an RBAC page via its route
5. Remove all 6,309 lines and replace with ~200-300 lines + permission filtering
6. Remove all debug logging

---

### 4. HIGH: `sidebar/index.tsx` (Vertical Sidebar Component)

**Full Path:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\common\sidebar\index.tsx`
**Lines:** 483 lines
**Severity:** HIGH

#### Issues Found

**Issue 1: Old `hasAccess` with excessive debug logging (Lines 22-52)**
```typescript
const getUserRole = (): string => {
  if (!user) return "guest";
  return (user.publicMetadata?.role as string)?.toLowerCase() || "employee";
};

const hasAccess = (roles?: string[]): boolean => {
  if (!roles || roles.length === 0) {
    console.log('[Sidebar hasAccess] No roles specified - ALLOWING');
    return true;
  }
  // ... extensive logging
  const normalizedRoles = roles.map(r => r?.toLowerCase());
  const hasAccessResult = normalizedRoles.includes(userRole?.toLowerCase());
  console.log('[Sidebar hasAccess]', { userRole, requiredRoles: roles, ... });
  return hasAccessResult;
};
```
- **Problem:** Same old role-string-matching pattern with heavy console logging

**Issue 2: Debug logging on every render (Lines 109-122)**
```typescript
console.log('[Sidebar Component] Rendering sidebar with data:', { ... });
console.log('[Sidebar Component] Layout info:', { ... });
```

**Issue 3: Filter calls using old pattern (Lines 377, 425)**
```typescript
// Line 377
{title?.submenuItems?.filter((item: any) => hasAccess(item?.roles)).map(...)}

// Line 425
{item?.submenuItems?.filter((items: any) => hasAccess(items?.roles)).map(...)}
```

**Issue 4: Hardcoded role display names (Lines 203-208, 248-253)**
```typescript
{(user?.publicMetadata?.role as string)?.toLowerCase() === "admin" ? "Admin" :
 (user?.publicMetadata?.role as string)?.toLowerCase() === "hr" ? "HR" :
 (user?.publicMetadata?.role as string)?.toLowerCase() === "superadmin" ? "Super Admin" :
 (user?.publicMetadata?.role as string)?.toLowerCase() === "manager" ? "Manager" :
 (user?.publicMetadata?.role as string)?.toLowerCase() === "leads" ? "Leads" :
 "Employee"}
```
- **Problem:** Hardcoded role-to-display-name mapping (duplicated twice in same file)

#### Implementation Plan
1. Import `usePageAccess` hook
2. Replace `hasAccess(roles)` with RBAC permission checks
3. Replace hardcoded role display with role name from user's RBAC role object
4. Remove all debug console.log statements
5. The data source (`useSidebarData`) must also be migrated (see #3 above)

---

### 5. HIGH: `twoColData.tsx` (Two-Column/Stacked Sidebar Data)

**Full Path:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\data\json\twoColData.tsx`
**Lines:** 1,849 lines
**Severity:** HIGH

#### Issues Found

**Issue 1: Static export with hardcoded roles (Lines 1-1849)**
```typescript
export const TowColData = [
  {
    tittle: 'Main',
    menu: [
      {
        menuValue: 'Dashboard',
        roles: ['admin', 'hr', 'manager', 'leads', 'employee'],
        subMenus: [
          { menuValue: 'Admin Dashboard', roles: ['admin', 'manager'] },
          { menuValue: 'Employee Dashboard', roles: ['employee', 'admin', 'hr', 'manager', 'leads'] },
          // ...
        ],
      },
      // ...
    ],
  },
];
```
- **Problem:** Same hardcoded `roles` pattern as `horizontalSidebar.tsx`. Static export cannot use React hooks.

**Issue 2: Only 7 `roles` entries in 1,849 lines (Lines 20, 26, 32, 38, 44, 50, 181)**
```typescript
roles: ['admin', 'hr', 'manager', 'leads', 'employee'],  // Line 20 - Dashboard
roles: ['admin', 'manager'],                               // Line 26 - Admin Dashboard
roles: ['employee', 'admin', 'hr', 'manager', 'leads'],   // Line 32 - Employee Dashboard
roles: ['admin', 'hr', 'manager', 'leads'],                // Line 38 - Deals Dashboard
roles: ['admin', 'hr', 'manager', 'leads'],                // Line 44 - Leads Dashboard
roles: ['hr', 'manager', 'leads'],                         // Line 50 - HR Dashboard
roles: ['superadmin'],                                      // Line 181 - Super Admin section
```
- **Problem:** Only 7 out of ~100+ menu items have roles defined. The vast majority are unprotected.

**Issue 3: Mutable state on module-level export**
```typescript
// The stacked-sidebar mutates this directly:
mainMenus.showMyTab = true;
```
- **Problem:** Module-level export is mutated directly, causing potential cross-component state issues

#### Implementation Plan
1. Convert to a hook (`useTwoColData`) so it can access PermissionContext
2. Add RBAC permission filtering to all menu items
3. Remove hardcoded `roles` arrays
4. Fix mutable state issue by using React state instead of direct mutation

---

### 6. HIGH: `stacked-sidebar/index.tsx` (Stacked Sidebar Component)

**Full Path:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\common\stacked-sidebar\index.tsx`
**Lines:** 308 lines
**Severity:** HIGH

#### Issues Found

**Issue 1: Old `hasAccess` pattern (Lines 16-27)**
```typescript
const getUserRole = (): string => {
  if (!user) return "guest";
  return (user.publicMetadata?.role as string)?.toLowerCase() || "employee";
};

const hasAccess = (roles?: string[]): boolean => {
  if (!roles || roles.length === 0) return true;
  if (roles.includes("public")) return true;
  const userRole = getUserRole();
  return roles.includes(userRole);
};
```

**Issue 2: Filter calls at two levels (Lines 135, 179)**
```typescript
// Line 135 - Top-level icons
{(mainMenu.menu as any[]).filter((title: any) => hasAccess(title?.roles)).map(...)}

// Line 179 - Submenu items
{title.subMenus.filter((subMenu: any) => hasAccess(subMenu?.roles)).map(...)}
```

**Issue 3: No filtering on sub-submenu level (Line 236)**
```typescript
// Line 236 - subMenusTwo has NO role filtering
{subMenus.subMenusTwo.map((subMenuTwo: any, k: number) => (
  <li key={`submenu-two-${j}-${k}`}>
    <Link ...>{subMenuTwo.menuValue}</Link>
  </li>
))}
```
- **Problem:** Third-level menus are always shown regardless of role

**Issue 4: Hardcoded role display (Lines 118-123)**
```typescript
{getUserRole() === "admin" ? "Admin" :
 getUserRole() === "hr" ? "HR" :
 getUserRole() === "superadmin" ? "Super Admin" :
 getUserRole() === "manager" ? "Manager" :
 getUserRole() === "leads" ? "Leads" :
 "Employee"}
```

#### Implementation Plan
1. Import `usePageAccess` and replace `hasAccess`
2. Add permission filtering to sub-submenu level (line 236)
3. Replace hardcoded role display names
4. Data source (`TowColData`) must also be migrated (see #5)

---

### 7. HIGH: `two-column/index.tsx` (Two-Column Sidebar Component)

**Full Path:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\common\two-column\index.tsx`
**Lines:** 1,593 lines
**Severity:** HIGH

#### Issues Found

**Issue 1: Old `hasAccess` pattern (Lines 19-29)**
```typescript
const getUserRole = (): string => { ... };
const hasAccess = (roles?: string[]): boolean => { ... };
```

**Issue 2: Filter calls at multiple levels (Lines 86, 157, 210)**
```typescript
// Line 86 - Icon tabs
{(mainMenu.menu as any[]).filter((title: any) => hasAccess(title?.roles)).map(...)}

// Line 157 - Submenu items
{title.subMenus.filter((subMenu: any) => hasAccess(subMenu?.roles)).map(...)}

// Line 210 - Sub-submenu items (GOOD - has filtering, unlike stacked-sidebar)
{subMenus.subMenusTwo.filter((subMenuTwo: any) => hasAccess(subMenuTwo?.roles)).map(...)}
```

**Issue 3: MASSIVE block of hardcoded HTML menus (Lines 262-1585)**

This is the worst offender. Lines 262-1585 contain **1,323 lines of completely hardcoded HTML menu items** with `.html` file extensions pointing to non-existent files:

```tsx
// Lines 262-303 - Hardcoded APPLICATION tab
<div className="tab-pane fade" id="application">
  <ul>
    <li><Link to="voice-call.html">Voice Call</Link></li>
    <li><Link to="video-call.html">Video Call</Link></li>
    <li><Link to="calendar.html">Calendar</Link></li>
    // ... all pointing to .html files
  </ul>
</div>

// Lines 305-331 - Hardcoded SUPER ADMIN tab
<div className="tab-pane fade" id="super-admin">
  <ul>
    <li><Link to="dashboard.html">Dashboard</Link></li>
    <li><Link to="companies.html">Companies</Link></li>
    // ... all pointing to .html files
  </ul>
</div>

// Lines 332-408 - Hardcoded LAYOUT tab (all .html links)
// Lines 409-435 - Hardcoded PROJECTS tab (all .html links)
// Lines 436-477 - Hardcoded CRM tab (all .html links)
// Lines 478-636 - Hardcoded HRM tab (all .html links)
// Lines 637-706 - Hardcoded FINANCE tab (all .html links)
// Lines 707-961 - Hardcoded ADMINISTRATION tab (all .html links)
// Lines 962-1014 - Hardcoded CONTENT tab (all .html links)
// Lines 1015-1081 - Hardcoded PAGES tab (all .html links)
// Lines 1082-1194 - Hardcoded AUTHENTICATION tab (all .html links)
// Lines 1196-1532 - Hardcoded UI INTERFACE tab (all .html links)
// Lines 1533-1585 - Hardcoded EXTRAS tab
```
- **Problem:** These are leftover template HTML links (`.html` extensions) that are completely non-functional in a React SPA
- **Impact:** These never render correctly AND have zero RBAC filtering
- **No role filtering at all** on these hardcoded sections

**Issue 4: Hardcoded role display (Lines 134-139)**
```typescript
{getUserRole() === "admin" ? "Admin" : ... "Employee"}
```

#### Implementation Plan
1. DELETE all hardcoded HTML tab panes (lines 262-1585) -- these are non-functional template leftovers
2. The dynamic TowColData-driven section (lines 147-260) is the correct approach
3. Import `usePageAccess` and replace `hasAccess`
4. Data source (`TowColData`) must also be migrated
5. Replace hardcoded role display names

---

### 8. MEDIUM: `header/index.tsx` (Header Component)

**Full Path:** `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\common\header\index.tsx`
**Severity:** MEDIUM

#### Issues Found

**Issue 1: Old `getUserRole` and `hasAccess` (Lines 125-136)**
```typescript
const getUserRole = (): string => {
  if (!user) return "Guest";
  return (user.publicMetadata?.role as string) || "Employee";
};

const hasAccess = (roles?: string[]): boolean => {
  if (!roles || roles.length === 0) return true;
  if (roles.includes("public")) return true;
  const userRole = (getUserRole() || "").toLowerCase();
  return roles.includes(userRole);
};
```

**Issue 2: Hardcoded role-based conditional display (Lines 944-948)**
```typescript
<p className="fs-10 text-muted mb-0">
  Role: {getUserRole()}
</p>
<p className="fs-10 text-muted mt-0 mb-0">
  {getUserRole() === 'admin' ? `CId: ${getCompanyId()}` : `Emp ID: N/A`}
</p>
```
- **Problem:** Hardcoded role check for displaying company ID vs employee ID

#### Implementation Plan
1. Import RBAC context for role display name
2. Replace `getUserRole() === 'admin'` with permission-based check
3. Keep `hasAccess` only if header has menu items that need filtering

---

## SUMMARY TABLE

| # | File | Lines | Hardcoded Roles | RBAC Integration | Severity |
|---|------|-------|----------------|------------------|----------|
| 1 | `horizontalSidebar.tsx` | 1,913 | 15 `roles` arrays | NONE | CRITICAL |
| 2 | `horizontal-sidebar/index.tsx` | 127 | `hasAccess(roles)` at 3 levels | NONE | CRITICAL |
| 3 | `sidebarMenu.jsx` | 6,309 | 7-case `switch` + `roles` arrays | NONE | CRITICAL |
| 4 | `sidebar/index.tsx` | 483 | `hasAccess(roles)` at 2 levels | NONE | HIGH |
| 5 | `twoColData.tsx` | 1,849 | 7 `roles` arrays | NONE | HIGH |
| 6 | `stacked-sidebar/index.tsx` | 308 | `hasAccess(roles)` at 2 levels | NONE | HIGH |
| 7 | `two-column/index.tsx` | 1,593 | `hasAccess(roles)` + 1,323 lines hardcoded HTML | NONE | HIGH |
| 8 | `header/index.tsx` | ~1000 | `getUserRole()` comparison | NONE | MEDIUM |

**Total hardcoded menu lines:** ~14,582 lines across 8 files
**RBAC integration status:** 0 out of 8 files use the Dynamic RBAC system

---

## CRITICAL PATTERNS TO ELIMINATE

### Pattern 1: Hardcoded `roles` Array (Found in 3 data files)
```typescript
// OLD - Must be eliminated
roles: ['admin', 'hr', 'manager', 'leads', 'employee'],
```
```typescript
// NEW - Use RBAC permission
// Menu item visible if user has 'read' permission on the corresponding page
```

### Pattern 2: `getUserRole()` + `hasAccess()` (Found in 5 components)
```typescript
// OLD - Must be eliminated
const getUserRole = (): string => {
  return (user.publicMetadata?.role as string)?.toLowerCase() || "employee";
};
const hasAccess = (roles?: string[]): boolean => {
  return roles.includes(getUserRole());
};
```
```typescript
// NEW - Use RBAC hook
const { hasPageAccess } = usePageAccess();
// Filter: hasPageAccess('hrm.employees', 'read')
```

### Pattern 3: `switch(userRole)` Mega-Block (Found in sidebarMenu.jsx)
```javascript
// OLD - 6,309 lines of duplicated menus per role
switch (userRole) {
  case 'superadmin': return [...2000 lines...];
  case 'admin': return [...900 lines...];
  case 'hr': return [...600 lines...];
  // ...
}
```
```javascript
// NEW - Single unified menu, filtered by permissions
const allMenuItems = [...]; // ~200 lines, ONE definition
return allMenuItems.filter(item => hasPageAccess(item.pageName, 'read'));
```

### Pattern 4: Hardcoded `.html` Links (Found in two-column/index.tsx)
```tsx
// OLD - Non-functional template leftovers
<Link to="voice-call.html">Voice Call</Link>
<Link to="calendar.html">Calendar</Link>
```
```tsx
// NEW - Delete entirely, use dynamic data-driven menus
```

---

## RECOMMENDED IMPLEMENTATION ORDER

### Phase 1: Create Shared Permission Filter Hook
1. Create `useMenuPermissions()` hook that wraps `usePageAccess`
2. Provides `isMenuVisible(routePath)` function
3. Maps route paths to RBAC page names
4. Single source of truth for all sidebar components

### Phase 2: Migrate Vertical Sidebar (Highest Impact)
1. Replace `sidebarMenu.jsx` (6,309 lines) with single unified menu + permission filtering
2. Update `sidebar/index.tsx` to use new permission filter
3. Remove debug logging

### Phase 3: Migrate Horizontal Sidebar
1. Convert `horizontalSidebar.tsx` to a hook
2. Update `horizontal-sidebar/index.tsx`

### Phase 4: Migrate Two-Column & Stacked Sidebars
1. Convert `twoColData.tsx` to a hook
2. Delete hardcoded HTML in `two-column/index.tsx` (lines 262-1585)
3. Update `stacked-sidebar/index.tsx`

### Phase 5: Migrate Header
1. Update `header/index.tsx` role display

### Expected Result
- **Before:** 14,582 lines of hardcoded menus across 8 files
- **After:** ~500-800 lines total (single menu definition + permission filtering)
- **Benefit:** All menu visibility controlled through RBAC UI, no code changes needed for new roles

---

## CROSS-REFERENCE

- RBAC Backend: `backend/services/rbac/`, `backend/middleware/pageAccess.js`
- RBAC Frontend Hook: `react/src/hooks/usePageAccess.tsx`
- RBAC Context: `react/src/contexts/PermissionContext`
- Pages Database: Hierarchical tree via `GET /api/rbac/pages/tree-structure`
- My Permissions API: `GET /api/rbac/my-permissions`
