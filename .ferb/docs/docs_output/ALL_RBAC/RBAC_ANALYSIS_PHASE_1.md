# RBAC Implementation Analysis - Phase 1
## Core Components, Permissions, and Menu Structure Analysis

**Analysis Date:** 2026-02-12
**Batch:** 1 - Core Components, Hooks, and Menu System
**Total Files Analyzed:** 45+ files

---

# TABLE OF CONTENTS
1. [File-by-File Analysis](#file-by-file-analysis)
2. [Current System Structure Report](#report-1-current-system-structure-report)
3. [Implementation Plan for Dynamic RBAC](#report-2-implementation-plan-for-dynamic-rbac)

---

# FILE-BY-FILE ANALYSIS

## 1. CORE PERMISSION & AUTH SYSTEM

### File: `react/src/config/fieldPermissions.ts`

#### Current Structure Analysis:
- **Type:** TypeScript configuration file for field-level permissions
- **Hardcoded Roles:** `superadmin`, `admin`, `hr`, `manager`, `employee`, `lead`
- **Permission Structure:** `{ view: boolean, edit: boolean }` for each field
- **CRUD Operations:**
  - View permissions for fields (firstName, lastName, email, phone, etc.)
  - Edit permissions for fields
  - No explicit Delete/Create permissions defined at field level

#### Action Elements Present:
- Field-level view/edit control
- Nested field support (e.g., `personal.passport.number`)

#### Dynamic Updates:
- **Present:** Helper functions `canEditField()`, `canViewField()`, `filterByPermissions()`
- Role hierarchy is **HARDCODED** in switch statement

#### Approval Flow Logic:
- **None present**

#### Required Updates:
1. **Convert to Dynamic:** Load permissions from database instead of hardcoded configuration
2. **Add CRUD mapping:** Map fields to specific CRUD operations
3. **Add role-based field visibility:** Integrate with dynamic role system
4. **Backend sync:** Fetch field permissions from API based on user role

---

### File: `react/src/core/components/RoleBasedRenderer/index.tsx`

#### Current Structure Analysis:
- **Type:** React functional component for role-based UI rendering
- **Hardcoded Roles:** `'admin' | 'hr' | 'employee' | 'manager' | 'leads' | 'superadmin' | 'guest'`
- **Role Hierarchy:**
  ```typescript
  ROLE_HIERARCHY: Record<UserRole, number> = {
    superadmin: 100,
    admin: 80,
    hr: 60,
    manager: 50,
    leads: 40,
    employee: 20,
    guest: 0,
  }
  ```

#### Action Elements Present:
- Component wrapper for showing/hiding content based on roles
- `includeHigherPrivileges` prop for hierarchical access
- Pre-configured renderers: `AdminOnly`, `HROnly`, `ManagerOnly`, `EmployeeOnly`, `SuperAdminOnly`

#### Dashboard Sections with Role Restrictions:
```typescript
DASHBOARD_SECTIONS = {
  COMPANY_STATS: ['admin', 'hr'],
  EMPLOYEE_MANAGEMENT: ['admin', 'hr'],
  ORGANIZATION_MANAGEMENT: ['admin'],
  LEAVE_MANAGEMENT: ['admin', 'hr'],
  ATTENDANCE_MANAGEMENT: ['admin', 'hr'],
  PERFORMANCE_MANAGEMENT: ['admin', 'hr', 'manager'],
  PAYROLL: ['admin'],
  REPORTS: ['admin', 'hr'],
  SETTINGS: ['admin'],
  PERSONAL_DATA: ['employee'],
}
```

#### Required Updates:
1. **Dynamic Role Loading:** Load roles from database instead of hardcoded
2. **Dynamic Dashboard Sections:** Map sections to CRUD permissions
3. **Permission-based rendering:** Replace role-based with permission-based checks
4. **Page-level permissions:** Integrate with page access control system

---

### File: `react/src/core/components/RoleDebugger/index.tsx`

#### Current Structure Analysis:
- **Type:** Debug/Development tool for displaying current user role
- **Purpose:** Display role information for debugging RBAC issues
- **Uses Clerk:** `useUser()` hook for authentication

#### Action Elements Present:
- Fixed display widget showing:
  - User role (normalized to lowercase)
  - Email, Name, Clerk ID
  - Full public metadata
  - Expected behavior based on role

#### Required Updates:
1. **Permission display:** Show current user's permissions
2. **Page access info:** Display current page access status
3. **CRUD rights display:** Show available CRUD operations

---

### File: `react/src/core/components/PermissionField.tsx`

#### Current Structure Analysis:
- **Type:** React wrapper component for field-level permission control
- **Uses:** `useAuth()` hook and `fieldPermissions.ts` config
- **Props:** `field`, `editMode`, `fallback`, `showPermissionDenied`

#### Action Elements Present:
- Permission checking for view/edit modes
- Field-level access control wrapper
- Permission section wrapper for multiple fields
- `withPermission` HOC for adding permission checks

#### Required Updates:
1. **Dynamic permission source:** Load from database via API
2. **CRUD operation mapping:** Map fields to specific CRUD operations
3. **Permission caching:** Cache user permissions for performance

---

### File: `react/src/core/common/dataTable/index.tsx`

#### Current Structure Analysis:
- **Type:** Reusable data table component using Ant Design
- **Features:** Search, pagination, row selection
- **Props:** `columns`, `dataSource`, `Selection`, `rowId`, `onChange`, `loading`

#### Action Elements Present:
- **No built-in action buttons** - this is a pure table component
- Row selection capability (checkboxes)
- Search functionality

#### Required Updates:
1. **Column-based permissions:** Hide/show columns based on permissions
2. **Action column integration:** Support for action buttons with permission control
3. **Row actions:** Permission-based row action rendering

---

### File: `react/src/core/common/sidebar/index.tsx`

#### Current Structure Analysis:
- **Type:** Vertical sidebar navigation component
- **Uses:** `useSidebarData()` hook for menu data
- **Role Detection:**
  ```typescript
  const getUserRole = (): string => {
    if (!user) return "guest";
    return (user.publicMetadata?.role as string)?.toLowerCase() || "employee";
  };
  ```
- **Access Check Function:**
  ```typescript
  const hasAccess = (roles?: string[]): boolean => {
    if (!roles || roles.length === 0) return true;
    if (roles.includes("public")) return true;
    const userRole = getUserRole();
    const normalizedRoles = roles.map(r => r?.toLowerCase());
    return normalizedRoles.includes(userRole?.toLowerCase());
  };
  ```

#### Action Elements Present:
- Menu item filtering based on roles
- Nested submenu support (up to 3 levels)
- **Hardcoded role checks** in menu rendering

#### Dynamic Updates:
- **Currently uses role-based filtering** through `hasAccess()` function
- Menu items filtered before rendering at lines 377, 425

#### Required Updates:
1. **Dynamic menu generation:** Load menu structure from database
2. **Permission-based filtering:** Replace role-based with permission-based
3. **Page access integration:** Check page access permissions before showing menu items
4. **Dynamic icons/labels:** Support custom menu configuration

---

### File: `react/src/core/common/horizontal-sidebar/index.tsx`

#### Current Structure Analysis:
- **Type:** Horizontal sidebar navigation component
- **Uses:** `HorizontalSidebarData` for menu configuration
- **Role Detection:** Same as vertical sidebar
- **Access Check:** `hasAccess()` function

#### Action Elements Present:
- Menu filtering by roles
- Nested submenu support
- Horizontal layout navigation

#### Required Updates:
- Same as vertical sidebar
- Coordinate with vertical sidebar for consistent permission handling

---

### File: `react/src/core/common/header/index.tsx`

#### Current Structure Analysis:
- **Type:** Main application header component
- **Uses:**
  - Clerk: `useUser()`, `useClerk()`, `UserButton`
  - Custom: `useUserProfileREST()` hook
- **Role-based Display:**
  ```typescript
  const getUserRole = (): string => {
    if (!user) return "Guest";
    return (user.publicMetadata?.role as string) || "Employee";
  };
  ```
- **Access Check:** `hasAccess()` function for menu items

#### Action Elements Present:
- **Header Menu Items:**
  - Search bar
  - CRM dropdown (Contacts, Deals, Pipeline, Activities)
  - Applications dropdown (Calendar, To Do, Notes, File Manager, Kanban, Invoices)
  - Quick action buttons (Chat, Email, Notification bell)
  - Profile dropdown (My Profile, Settings, Status, My Account, Knowledge Base, Logout)

#### Approval Buttons:
- **Present in notifications:** "Deny" and "Approve" buttons for appointment requests (lines 590-595)

#### Required Updates:
1. **Dynamic menu filtering:** Apply permission-based filtering to all dropdowns
2. **Notification access:** Control notification access by permissions
3. **Profile access:** Control profile settings access
4. **Quick actions:** Filter quick action buttons based on permissions

---

### File: `react/src/contexts/NotificationContext.tsx`

#### Current Structure Analysis:
- **Type:** React Context for in-app notifications
- **Features:** Toast notifications, notification list, read/unread tracking
- **No role-based filtering**

#### Action Elements Present:
- `addNotification()` - Add new notification
- `markAsRead()` - Mark single as read
- `markAllAsRead()` - Mark all as read
- `clearNotifications()` - Clear all notifications
- `showNotification()` - Show toast using Ant Design

#### Required Updates:
1. **Permission-based notifications:** Filter notifications by user permissions
2. **Role-based routing:** Route notification clicks based on allowed pages
3. **CRUD notifications:** Specific notifications for Create/Update/Delete actions

---

## 2. MENU DATA STRUCTURE FILES

### File: `react/src/core/data/json/sidebarMenu.jsx`

#### Current Structure Analysis:
- **Type:** Custom hook `useSidebarData()` returning menu configuration
- **Role-based menu switching:** Large switch statement based on `userRole`
- **Extensive debug logging** throughout

#### Menu Structure by Role:

**Superadmin Menu:**
- Main Menu: Super Admin (Dashboard, Companies, Subscriptions, Packages, Modules, Pages)
- Users & Permissions: Users, Roles & Permissions, Permission
- HRM: Employees, Tickets, Holidays, Attendance, Performance, Training, Promotion, Resignation, Termination
- PROJECTS: Clients, Projects
- CRM: Contacts, Companies, Deals, Leads, Pipeline, Analytics, Activities
- RECRUITMENT: Jobs, Candidates, Referrals
- Finance & Accounts: Sales (Estimates, Invoices, Payments, Expenses, Provident Fund, Taxes), Accounting, Payroll
- Administration: Assets, Help & Supports, Reports

**Role-based access control:**
```javascript
// Example: Lines 388-402
{
  label: "Users",
  link: routes.users,
  submenu: false,
  showSubRoute: false,
  roles: ["superadmin"],  // HARDCODED ROLE
},
{
  label: "Roles & Permissions",
  link: routes.rolePermission,
  submenu: false,
  showSubRoute: false,
  roles: ["superadmin"],
}
```

#### Action Elements Present:
- All menu items are navigation links
- No explicit CRUD action buttons (these are in page components)

#### Required Updates:
1. **Dynamic menu generation:** Load from database instead of switch statement
2. **Permission-based filtering:** Replace `roles: []` with `permissions: {}`
3. **Page access validation:** Check page permissions before rendering
4. **Menu customization:** Support per-role menu customization
5. **Module visibility:** Show/hide entire modules based on company subscription

---

### File: `react/src/core/data/json/horizontalSidebar.tsx`

#### Current Structure Analysis:
- **Type:** Horizontal menu configuration
- **Role-based menu items:**
  ```typescript
  {
    menuValue: "Dashboard",
    roles: ["admin", "hr", "manager", "leads", "employee"],  // HARDCODED
    subMenus: [...]
  }
  ```

#### Menu Sections with Role Restrictions:
- Dashboard: `["admin", "hr", "manager", "leads", "employee"]`
  - Admin Dashboard: `["admin", "manager"]`
  - Employee Dashboard: `["employee", "admin", "hr", "manager", "leads"]`
  - Deals Dashboard: `["admin", "hr", "manager", "leads"]`
  - Leads Dashboard: `["admin", "hr", "manager", "leads"]`
  - HR Dashboard: `["hr", "manager", "leads"]`
- Super Admin: `["superadmin"]`
- Application: `["admin", "hr", "manager", "leads", "employee"]`

#### Required Updates:
1. **Permission-based menu:** Replace `roles: []` with permission checks
2. **Dynamic submenus:** Load submenu items from database
3. **Icon customization:** Support custom icons per menu item
4. **Route validation:** Validate routes before adding to menu

---

## 3. UTILITY & HELPER COMPONENTS

### File: `react/src/components/employee/index.ts`

#### Current Structure Analysis:
- **Type:** Barrel export file for employee components
- **Exports:** `ProfileImageUpload`, `ProfileImageUploadProps`

#### Required Updates:
1. **Export permission-wrapped components:** Add permission check exports

---

### File: `react/src/components/employee/ProfileImageUpload.tsx`

#### Current Structure Analysis:
- **Type:** Profile image upload component
- **Features:** Upload, delete, preview of profile images
- **Uses:** `useEmployeesREST()` hook for API calls

#### Action Elements Present:
- **Add button:** Camera icon button for uploading
- **Delete button:** Delete icon for removing photo
- **Preview modal:** View full-size image

#### CRUD Operations:
- **Create:** Upload new profile image
- **Delete:** Remove existing profile image
- **Read:** View current profile image

#### Required Updates:
1. **Permission-based upload:** Check `canEditProfile` permission
2. **Permission-based delete:** Check `canDeleteProfile` permission
3. **View-only mode:** Support readonly mode for restricted users
4. **Field-level control:** Use `PermissionField` wrapper for integration

---

### File: `react/src/components/leave/AttachmentUpload.tsx`

#### Current Structure Analysis:
- **Type:** File attachment component for leave requests
- **Features:** Upload, delete, preview attachments
- **File Type Validation:** PDF, JPEG, PNG only (max 5MB)

#### Action Elements Present:
- **Add button:** Upload button with file count display
- **Delete button:** Delete icon with confirmation
- **View button:** Eye icon for preview

#### CRUD Operations:
- **Create:** Upload new attachments
- **Delete:** Remove attachments

#### Required Updates:
1. **Upload permission:** Check `canUploadLeaveAttachment` permission
2. **Delete permission:** Check `canDeleteLeaveAttachment` permission
3. **View permission:** Check `canViewLeaveAttachments` permission
4. **Max file count:** Make configurable per role

---

### File: `react/src/components/DepartmentDesignationSelector.tsx`

#### Current Structure Analysis:
- **Type:** Policy assignment component for departments/designations
- **Features:**
  - Apply To All checkbox (applyToAll flag)
  - Department-level toggle switches
  - Individual designation checkboxes
  - Expand/collapse for departments

#### Action Elements Present:
- **Toggle All Employees:** Master switch for applying policy to everyone
- **Select All/Clear All:** Department-level bulk actions
- **Individual checkboxes:** Per designation selection
- **Apply button** (implied in parent component)

#### Required Updates:
1. **Department access permission:** Filter departments by user access
2. **Designation access permission:** Filter designations by user access
3. **Apply permission:** Check `canApplyPolicies` permission
4. **View-only mode:** Support read-only for view-only users

---

### File: `react/src/components/HashtagHighlighter.tsx`

#### Current Structure Analysis:
- **Type:** Hashtag detection and linking component
- **Purpose:** Convert hashtags to clickable links

#### Action Elements Present:
- None (pure presentation component)

#### Required Updates:
1. **Permission-based hashtag routing:** Check if user can access hashtag-linked content
2. **No direct RBAC impact:** This component likely doesn't need updates

---

### File: `react/src/core/data/interface/index.tsx`

#### Current Structure Analysis:
- **Type:** TypeScript interface definitions
- **Defines:** `CommonState`, `RootState`, `TableData`, `DatatableProps`, etc.
- **No role or permission interfaces**

#### Required Updates:
1. **Add permission interfaces:**
   ```typescript
   export interface UserPermission {
     pageId: string;
     canCreate: boolean;
     canRead: boolean;
     canUpdate: boolean;
     canDelete: boolean;
     customPermissions?: Record<string, any>;
   }

   export interface Role {
     _id: string;
     name: string;
     description?: string;
     companyId: string;
     permissions: UserPermission[];
     status: 'active' | 'inactive';
   }
   ```
2. **Add page access interface:**
   ```typescript
   export interface PageAccess {
     pageId: string;
     pageName: string;
     route: string;
     module: string;
     requiredPermissions: string[];
   }
   ```

---

## 4. DATA FILES (Sample Analysis)

### File: `react/src/core/data/json/exam_attendance.tsx`

#### Current Structure Analysis:
- **Type:** Static data array for exam attendance
- **Fields:** `id`, `studentName`, `rollNo`, subject grades (english, spanish, physics, etc.), `img`, `key`

#### Action Elements Present:
- **None** (static data)

#### Required Updates:
1. **This is mock data** - should be replaced with API calls
2. **Column permissions:** Support hiding grade columns based on permissions
3. **Student access:** Control which students' data can be viewed

---

# REPORT 1: CURRENT SYSTEM STRUCTURE REPORT

## Existing Role Handling Structure

### Role Hierarchy (Hardcoded):
```
superadmin (100)
    └── admin (80)
        └── hr (60)
            └── manager (50)
                └── leads (40)
                    └── employee (20)
                          └── guest (0)
```

### Role Storage:
- **Location:** Clerk `publicMetadata.role`
- **Format:** String (case-insensitive comparison used)
- **Normalization:** All roles converted to lowercase for comparison

### Role Detection Points:
1. **`fieldPermissions.ts`** - Field-level permissions by role
2. **`RoleBasedRenderer.tsx`** - Component-level role checks
3. **`sidebarMenu.jsx`** - Menu structure switch statement
4. **`horizontalSidebar.tsx`** - Horizontal menu with role arrays
5. **`sidebar/index.tsx`** - Sidebar role filtering
6. **`header/index.tsx`** - Header menu role filtering
7. **`ProfileImageUpload.tsx`** - Upload controls (no role check currently)
8. **`AttachmentUpload.tsx`** - File upload controls (no role check currently)

---

## Existing Routing Structure

### Route Definition:
- **File:** `react/src/feature-module/router/all_routes.tsx`
- **Usage:** Imported by menu components for navigation

### Menu Structure:
```
sidebarMenu.jsx (vertical)      Horizontal sidebar menu
    ├── Main Menu                  ├── Main
    │   ├── Dashboard              │   ├── Dashboard (role-based)
    │   ├── Applications          │   ├── Super Admin (superadmin only)
    │   └── Layout               │   └── Application (all authenticated)
    ├── Users & Permissions
    ├── HRM
    ├── PROJECTS
    ├── CRM
    ├── RECRUITMENT
    ├── Finance & Accounts
    └── Administration
```

### Route Access Control:
- **Current Method:** Role arrays in menu configuration
- **Problem:** No backend validation, frontend only
- **Missing:** Page-level access middleware

---

## Existing CRUD Handling

### Field-Level CRUD:
- **File:** `fieldPermissions.ts`
- **Structure:** `{ view: boolean, edit: boolean }`
- **Coverage:** Comprehensive field list for employee data
- **Missing:** Delete, Create permissions

### Component-Level CRUD:
- **DataTable:** Generic table with row selection
- **ProfileImageUpload:** Create (upload), Delete (remove)
- **AttachmentUpload:** Create (upload), Delete (remove)
- **DepartmentDesignationSelector:** Update (toggle) operations

### Missing CRUD Implementation:
1. **No unified CRUD permission system**
2. **No action-level permission checks**
3. **No button-level visibility control**

---

## Existing Approval Logic

### Current Approval Implementation:
- **Location:** `header/index.tsx` lines 590-595
- **Context:** Appointment notifications in header
- **Buttons:** "Deny" and "Approve" hardcoded in notification display

### Missing Approval Features:
1. **No configurable approval workflows**
2. **No approval permission system**
3. **No multi-level approval chains**

---

## Existing Database-Related Assumptions

### Current Assumptions (from code):
1. **Roles stored in:** Clerk public metadata
2. **Permissions:** Not currently stored in database (all hardcoded)
3. **Menu structure:** Not in database (static React components)
4. **Page access:** Not validated on backend

### Collections Needed (Not Currently Present):
1. **`roles`** - Role definitions
2. **`permissions`** - Permission definitions
3. **`pages`** - Page metadata
4. **`role_permissions`** - Role-permission mappings
5. **`user_roles`** - User-role assignments (if different from Clerk)

---

# REPORT 2: IMPLEMENTATION PLAN FOR DYNAMIC RBAC

## Required Database Changes

### 1. Roles Collection
```javascript
{
  _id: ObjectId,
  name: String,           // "admin", "hr", "manager", etc.
  displayName: String,     // "Administrator", "HR Manager"
  description: String,
  companyId: ObjectId,      // Reference to companies collection
  level: Number,           // For hierarchy (100=superadmin, 80=admin, etc.)
  isSystemRole: Boolean,   // For non-deletable system roles
  status: String,          // "active" | "inactive"
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId       // User who created this role
}
```

### 2. Permissions Collection
```javascript
{
  _id: ObjectId,
  name: String,           // "employees.create", "leaves.approve"
  displayName: String,     // "Create Employees", "Approve Leaves"
  category: String,        // "employees", "leaves", "attendance", etc.
  action: String,          // "create", "read", "update", "delete", "approve"
  module: String,          // "hrm", "crm", "projects", "finance", etc.
  pageId: String,         // Reference to pages collection
  description: String,
  isSystemPermission: Boolean,
  status: String,          // "active" | "inactive"
  createdAt: Date,
  updatedAt: Date
}
```

### 3. Pages Collection
```javascript
{
  _id: ObjectId,
  pageId: String,         // Unique identifier: "employee-list", "leave-admin"
  pageName: String,        // "Employee List", "Leave Management"
  route: String,           // "/employees", "/leave/admin"
  module: String,          // "hrm", "crm", "finance"
  parentPageId: ObjectId,  // For nested pages
  icon: String,           // Icon identifier
  displayOrder: Number,     // For menu ordering
  showInMenu: Boolean,     // Whether to show in navigation
  menuLevel: Number,       // 1=main, 2=submenu, 3=sub-submenu
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 4. Role Permissions Collection (Mapping)
```javascript
{
  _id: ObjectId,
  roleId: ObjectId,        // Reference to roles
  permissionId: ObjectId,  // Reference to permissions
  grantedBy: ObjectId,     // User who granted this permission
  grantedAt: Date,
  expiresAt: Date,         // Optional: for temporary permissions
  status: String           // "active" | "expired" | "revoked"
}
```

### 5. CRUD Operations Mapping
```javascript
// CRUD to Permission Mapping
const CRUD_ACTIONS = {
  create: 'create',
  read: 'read',
  update: 'update',
  delete: 'delete',
  approve: 'approve',
  export: 'export',
  import: 'import'
};

// Module to Permission Category Mapping
const MODULE_CATEGORIES = {
  employees: 'employees',
  departments: 'organization',
  designations: 'organization',
  leaves: 'leaves',
  attendance: 'attendance',
  performance: 'performance',
  training: 'training',
  payroll: 'payroll',
  contacts: 'crm',
  deals: 'crm',
  leads: 'crm',
  projects: 'projects',
  tasks: 'projects',
  invoices: 'finance',
  expenses: 'finance',
  assets: 'administration'
};
```

### 6. Approval Workflow Collection (Optional - Future)
```javascript
{
  _id: ObjectId,
  workflowName: String,    // "Leave Approval", "Expense Approval"
  module: String,          // "leaves", "expenses"
  applicableRoles: [ObjectId], // Roles that can be approvers
  approvalLevels: Number,    // 1, 2, 3 for multi-level approval
  conditions: {
    minAmount: Number,
    requiresApproval: Boolean
  },
  status: String
}
```

---

## Required Backend Changes

### 1. New Backend Services

#### `services/rbac/role.service.js`
```javascript
// Functions needed:
- getRolesByCompany(companyId)
- getRoleById(roleId)
- createRole(roleData)
- updateRole(roleId, updates)
- deleteRole(roleId)
- getRoleHierarchy()
```

#### `services/rbac/permission.service.js`
```javascript
// Functions needed:
- getAllPermissions()
- getPermissionsByCategory(category)
- getPermissionsByModule(module)
- createPermission(permissionData)
- bulkCreatePermissions(permissionsArray)
```

#### `services/rbac/page.service.js`
```javascript
// Functions needed:
- getAllPages(companyId)
- getPagesByModule(module)
- createPage(pageData)
- updatePage(pageId, updates)
- deletePage(pageId)
```

#### `services/rbac/rolePermission.service.js`
```javascript
// Functions needed:
- getPermissionsForRole(roleId)
- assignPermissionToRole(roleId, permissionId)
- removePermissionFromRole(roleId, permissionId)
- bulkAssignPermissions(roleId, permissionIds[])
- getUserPermissions(userId) // Aggregates from user's role
```

### 2. New Backend Controllers

#### `controllers/rbac/role.controller.js`
```javascript
// Endpoints:
GET    /api/roles                    - List all roles
GET    /api/roles/:id               - Get role by ID
POST    /api/roles                    - Create new role
PUT     /api/roles/:id               - Update role
DELETE   /api/roles/:id               - Delete role
GET     /api/roles/:id/permissions    - Get role's permissions
```

#### `controllers/rbac/permission.controller.js`
```javascript
// Endpoints:
GET    /api/permissions               - List all permissions
GET     /api/permissions/categories     - Get permission categories
GET     /api/permissions/modules       - Get modules with permissions
POST    /api/permissions             - Create new permission (admin only)
```

#### `controllers/rbac/page.controller.js`
```javascript
// Endpoints:
GET    /api/pages                    - List all pages
GET     /api/pages/menu               - Get menu structure with permissions
POST    /api/pages                    - Create page (admin only)
PUT     /api/pages/:id                - Update page
DELETE   /api/pages/:id                - Delete page
```

### 3. New Backend Routes

#### `routes/api/rbac/roles.js`
```javascript
router.get('/', authMiddleware, roleController.getAllRoles);
router.get('/:id', authMiddleware, roleController.getRoleById);
router.post('/', authMiddleware, adminOnly, roleController.createRole);
router.put('/:id', authMiddleware, adminOnly, roleController.updateRole);
router.delete('/:id', authMiddleware, adminOnly, roleController.deleteRole);
router.get('/:id/permissions', authMiddleware, roleController.getRolePermissions);
router.post('/:id/permissions', authMiddleware, adminOnly, roleController.assignPermissions);
```

### 4. New Middleware

#### `middleware/permissions.js`
```javascript
// Check if user has specific permission
const checkPermission = (permission) => {
  return async (req, res, next) => {
    const userPermissions = req.user.permissions;
    if (userPermissions.includes(permission)) {
      return next();
    }
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
};

// Check page access
const checkPageAccess = (pageId) => {
  return async (req, res, next) => {
    const canAccess = await userHasPageAccess(req.user._id, pageId);
    if (canAccess) return next();
    return res.status(403).json({ error: 'Page access denied' });
  };
};
```

### 5. Update Auth Middleware

#### `middleware/auth.js` - Add permission loading
```javascript
// After JWT verification, load user permissions
const loadUserPermissions = async (req, res, next) => {
  const userId = req.user._id;
  const userRole = await Role.findOne({ user: userId });
  const permissions = await getPermissionsForRole(userRole.roleId);
  req.user = { ...req.user, permissions, role: userRole };
  next();
};
```

---

## Required Frontend Changes

### 1. New Custom Hooks

#### `hooks/usePermissions.ts`
```typescript
interface UsePermissionsReturn {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  canCreate: (module: string) => boolean;
  canRead: (module: string) => boolean;
  canUpdate: (module: string) => boolean;
  canDelete: (module: string) => boolean;
  isLoading: boolean;
  error: any;
}

export const usePermissions = (): UsePermissionsReturn => {
  // Fetch permissions from API based on user role
  // Provide helper functions for checking permissions
};
```

#### `hooks/usePageAccess.ts` (Create new)
```typescript
interface UsePageAccessReturn {
  canAccessPage: (pageId: string) => boolean;
  getPagePermissions: (pageId: string) => PagePermission | null;
  allowedPages: string[];
  isLoading: boolean;
}
```

#### `hooks/useRoleBasedMenu.ts` (Create new)
```typescript
interface MenuStructure {
  title: string;
  icon?: string;
  items: MenuItem[];
}

export const useRoleBasedMenu = (): MenuStructure[] => {
  // Fetch menu structure from /api/pages/menu
  // Filter based on user's permissions
};
```

### 2. Update Existing Components

#### `config/fieldPermissions.ts` - Convert to dynamic
```typescript
// BEFORE: Hardcoded permissions
export const FIELD_PERMISSIONS: Record<string, RolePermissions> = {
  superadmin: { ... },
  admin: { ... }
};

// AFTER: Dynamic loading
export const useFieldPermissions = (role: string) => {
  const { data } = useQuery(['field-permissions', role],
    () => api.fetchFieldPermissions(role)
  );
  return data;
};

export const canEditField = async (role: string, field: string) => {
  return await api.checkFieldPermission(role, field, 'edit');
};
```

#### `core/components/RoleBasedRenderer/index.tsx` - Convert to permission-based
```typescript
// Add props:
interface PermissionBasedRendererProps {
  requiredPermission: string;
  requireAll?: boolean; // For checking multiple permissions
  fallback?: ReactNode;
  children: ReactNode;
}

// Rename to PermissionRenderer
export const PermissionRenderer: React.FC<PermissionBasedRendererProps> =
  ({ requiredPermission, children, fallback, requireAll = false }) => {
    const { hasPermission } = usePermissions();
    const canView = requireAll
      ? hasAllPermissions(requiredPermission)
      : hasPermission(requiredPermission);

    return canView ? <>{children}</> : <>{fallback}</>;
  };
```

#### `core/common/dataTable/index.tsx` - Add permission support
```typescript
interface DatatableProps {
  // existing props...
  permission?: {
    create?: string;
    read?: string;
    update?: string;
    delete?: string;
  };
  renderActions?: (record: any, permissions: any) => ReactNode;
}

// Filter columns based on permissions
const filteredColumns = useMemo(() => {
  if (!permission) return columns;
  return columns.filter(col => {
    if (col.permissionKey) {
      return hasPermission(col.permissionKey);
    }
    return true;
  });
}, [columns, permission]);
```

#### `core/common/sidebar/index.tsx` - Dynamic menu loading
```typescript
// Replace useSidebarData() with useRoleBasedMenu()
const { menuStructure, isLoading } = useRoleBasedMenu();

// Each menu item should include:
interface MenuItem {
  label: string;
  link: string;
  requiredPermission?: string;  // For page-level check
  icon?: string;
  submenu?: MenuItem[];
}
```

### 3. New Components

#### `core/components/PermissionButton/index.tsx` (Create new)
```typescript
// Wrapper for buttons with permission check
interface PermissionButtonProps {
  permission: string;
  action: 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve';
  fallback?: ReactNode; // What to show when no permission
  children: ReactNode;
  onClick?: () => void;
  type?: 'primary' | 'default' | 'danger';
  icon?: ReactNode;
}

export const PermissionButton: React.FC<PermissionButtonProps> = ({
  permission,
  action,
  children,
  fallback = null,
  onClick,
  ...buttonProps
}) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <Button {...buttonProps} onClick={onClick}>{children}</Button>;
};
```

#### `core/components/ActionButtons/index.tsx` (Create new)
```typescript
// Standard action button group with permissions
interface ActionButtonsProps {
  subject: string; // 'employees', 'leaves', etc.
  record: any;
  actions?: ('create' | 'edit' | 'delete' | 'export' | 'approve')[];
  onEdit?: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
  onExport?: () => void;
}

// Renders:
// - Add button (if create permission)
// - Edit button (if update permission)
// - Delete button (if delete permission)
// - Export button (if export permission)
```

---

## Required Route Protection Changes

### 1. Protected Route Component

#### Create `core/components/ProtectedRoute.tsx`
```typescript
interface ProtectedRouteProps {
  pageId: string;
  permission?: string;
  fallback?: string; // Redirect path
  children: ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  pageId,
  permission,
  fallback = '/unauthorized',
  children
}) => {
  const { canAccessPage } = usePageAccess();
  const { hasPermission } = usePermissions();

  const hasAccess = permission
    ? hasPermission(permission)
    : canAccessPage(pageId);

  if (!hasAccess) {
    return <Navigate to={fallback} />;
  }

  return <>{children}</>;
};
```

### 2. Route Configuration Update

#### `feature-module/router/all_routes.tsx` - Add permission mapping
```typescript
interface RouteConfig {
  path: string;
  component: React.ComponentType;
  pageId?: string;
  permission?: string;
  allowedRoles?: string[]; // Keep for backward compatibility
}

export const routes: RouteConfig[] = [
  // ...
  {
    path: '/employees',
    component: EmployeeList,
    pageId: 'employee-list',
    permission: 'employees.read'
  },
  {
    path: '/employees/create',
    component: EmployeeCreate,
    permission: 'employees.create'
  }
];
```

### 3. Route Wrapping

#### App.tsx - Wrap routes with protection
```typescript
{routes.map(route => (
  <Route
    key={route.path}
    path={route.path}
    element={
      <ProtectedRoute
        pageId={route.pageId}
        permission={route.permission}
      >
        <route.component />
      </ProtectedRoute>
    }
  />
))}
```

---

## Required Dynamic Menu Rendering Logic

### 1. Menu API Endpoint

#### GET `/api/pages/menu`
```javascript
// Response structure:
{
  success: true,
  menu: [
    {
      _id: "menu-1",
      title: "HRM",
      icon: "users",
      order: 1,
      items: [
        {
          _id: "page-1",
          pageId: "employee-list",
          label: "Employees",
          route: "/employees",
          requiredPermission: "employees.read",
          icon: "users",
          order: 1
        },
        {
          _id: "submenu-1",
          label: "Attendance",
          icon: "calendar",
          order: 2,
          items: [
            {
              pageId: "attendance-admin",
              label: "Attendance (Admin)",
              route: "/attendance/admin",
              requiredPermission: "attendance.admin",
              order: 1
            }
          ]
        }
      ]
    }
  ]
}
```

### 2. Menu Filtering Hook

#### `hooks/useFilteredMenu.ts`
```typescript
export const useFilteredMenu = () => {
  const { data: menuStructure, isLoading } = useQuery(
    'menu',
    () => api.fetchMenuStructure()
  );
  const { hasPermission, canAccessPage } = usePermissions();

  const filteredMenu = useMemo(() => {
    return menuStructure.map(section => ({
      ...section,
      items: filterMenuItems(section.items, { hasPermission, canAccessPage })
    }));
  }, [menuStructure, hasPermission, canAccessPage]);

  return { menu: filteredMenu, isLoading };
};

const filterMenuItems = (items: MenuItem[], checks) => {
  return items
    .filter(item => !item.requiredPermission || checks.hasPermission(item.requiredPermission))
    .map(item => ({
      ...item,
      items: item.items ? filterMenuItems(item.items, checks) : undefined
    }))
    .filter(item => !item.items || item.items.length > 0);
};
```

### 3. Menu Rendering Update

#### `sidebar/index.tsx` - Use dynamic menu
```typescript
const { menu } = useFilteredMenu();

{menu.map(section => (
  <li key={section._id} className="menu-title">
    <span>{section.title}</span>
    <ul>
      {section.items.map(item => renderMenuItem(item))}
    </ul>
  </li>
))}
```

---

## Required Changes for Button-Level Permission Control

### 1. Standard Button Permissions

#### Add/Delete buttons pattern:
```typescript
<ActionButtons
  subject="employees"
  record={employeeRecord}
  onEdit={() => handleEdit(employeeRecord)}
  onDelete={() => handleDelete(employeeRecord)}
/>
// Renders:
// - Edit button (if employees.update permission)
// - Delete button (if employees.delete permission)
```

### 2. Export/Import Button Control

#### Export button pattern:
```typescript
<PermissionButton
  permission="employees.export"
  action="export"
  onClick={handleExport}
  icon={<ExportIcon />}
>
  Export
</PermissionButton>
```

### 3. Approval Button Control

#### Approve/Reject buttons pattern:
```typescript
{hasPermission('leaves.approve') && (
  <Space>
    <Button type="primary" onClick={handleApprove}>
      Approve
    </Button>
    <Button danger onClick={handleReject}>
      Reject
    </Button>
  </Space>
)}
```

### 4. CRUD Action Column

#### DataTable actions column:
```typescript
const columns = [
  // ... other columns
  {
    title: 'Actions',
    key: 'actions',
    render: (_, record) => (
      <ActionButtons
        subject="employees"
        record={record}
        onEdit={() => navigate(`/employees/edit/${record._id}`)}
        onDelete={() => handleDelete(record._id)}
      />
    )
  }
];
```

---

## Required Validation and Middleware Changes

### 1. API Endpoint Protection

#### Apply permission middleware to routes:
```javascript
// employees routes
router.get('/',
  authMiddleware,
  checkPermission('employees.read'),
  employeeController.getAll
);

router.post('/',
  authMiddleware,
  checkPermission('employees.create'),
  employeeController.create
);

router.put('/:id',
  authMiddleware,
  checkPermission('employees.update'),
  employeeController.update
);

router.delete('/:id',
  authMiddleware,
  checkPermission('employees.delete'),
  employeeController.delete
);
```

### 2. Frontend Validation

#### Before API calls:
```typescript
const handleSubmit = async (data: any) => {
  // Check permission before making request
  if (!canUpdate('employees')) {
    notification.error('You do not have permission to update employees');
    return;
  }

  try {
    await api.updateEmployee(employeeId, data);
  } catch (error) {
    if (error.status === 403) {
      notification.error('Permission denied');
    }
  }
};
```

### 3. Permission Caching

#### Cache strategy:
```typescript
// Cache permissions for 5 minutes
const STALE_TIME = 5 * 60 * 1000;

export const usePermissions = () => {
  const { data, isLoading } = useQuery(
    ['permissions', userRole],
    () => api.fetchPermissions(userRole),
    {
      staleTime: STALE_TIME,
      cacheTime: STALE_TIME * 2
    }
  );
  // ...
};
```

---

# SUMMARY OF REQUIRED CHANGES

## Phase 1: Database (Priority 1)
1. Create `roles` collection
2. Create `permissions` collection
3. Create `pages` collection
4. Create `role_permissions` collection
5. Seed default roles and permissions

## Phase 2: Backend (Priority 1)
1. Create RBAC services (role, permission, page, rolePermission)
2. Create RBAC controllers
3. Create RBAC routes
4. Create permission middleware
5. Update auth middleware to load permissions
6. Create `/api/pages/menu` endpoint

## Phase 3: Frontend Core (Priority 2)
1. Create `usePermissions` hook
2. Create `usePageAccess` hook
3. Create `useRoleBasedMenu` hook
4. Create `PermissionButton` component
5. Create `ProtectedRoute` component
6. Create `ActionButtons` component
7. Convert `RoleBasedRenderer` to `PermissionRenderer`
8. Update `fieldPermissions.ts` to dynamic

## Phase 4: Frontend Integration (Priority 3)
1. Update sidebar to use dynamic menu
2. Update header to use dynamic menu
3. Update DataTable with permission support
4. Update upload components with permission checks
5. Add permission checks to all CRUD operations

## Phase 5: Route Protection (Priority 2)
1. Wrap all routes with `ProtectedRoute`
2. Add permission checks to navigation
3. Handle unauthorized access gracefully

---

**Next Batch Analysis Requested:**
- Feature module pages (employees, leaves, attendance, etc.)
- More components requiring permission integration
- Additional common components

---

# FILE-BY-FILE ANALYSIS - PHASE 2: DATA STRUCTURE FILES

## 5. DATA FILES - RBAC & AUTH RELATED

### File: `react/src/core/data/json/permission.tsx`

#### Current Structure Analysis:
- **Type:** Permission template structure for modules
- **CRUD Structure per Module:**
  ```typescript
  {
    modules: "Classes" | "ClassRoutine" | "Sections" | "Subjects" | "Syllabus" |
            "TimeTable" | "HomeWork" | "Library" | "Sports" | "Transport",
    created: "",      // Empty = not assigned
    view: "",        // Empty = not assigned
    edit: "",        // Empty = not assigned
    delete: "",      // Empty = not assigned
    allowAll: ""     // Empty = not assigned
  }
  ```

#### Action Elements Present:
- **No action elements** - this is a data template
- **Empty permission strings** indicate permissions not yet configured

#### Required Updates:
1. **Replace with dynamic loading** from database
2. **Use boolean values** instead of empty strings for permissions
3. **Add permission categories** matching module structure
4. **Map to CRUD operations** explicitly (created=create, view=read, edit=update, delete)

---

### File: `react/src/core/data/json/rolesPermissions.tsx`

#### Current Structure Analysis:
- **Type:** Mock role data for role permissions page
- **Roles Listed:**
  - Admin (created: "27 Mar 2024")
  - Student (created: "20 Mar 2024")
  - Parent (created: "16 Mar 2024")
  - Guardian (created: "26 Feb 2024")
  - Librarian (created: "15 Feb 2024")
  - Accountant (created: "13 Feb 2024")
  - Driver (created: "28 Jan 2024")
  - Coach (created: "21 Jan 2024")
  - Warden (created: "10 Jan 2024")
  - Therapist (created: "24 Dec 2024")

#### Action Elements Present:
- **Mock data only** - no action buttons defined in this file
- Used for displaying list in role permissions UI

#### Required Updates:
1. **Replace with API data** from roles collection
2. **Add role metadata:**
   - Company ID
   - Description
   - Permission count
   - User count
   - Status (active/inactive)
3. **Add permission summary** for each role
4. **Support role hierarchy** level display

---

### File: `react/src/core/data/json/rolesDetails.tsx`

#### Current Structure Analysis:
- **Type:** Mock role data with checkbox selection
- **Roles Listed:**
  1. Admin (Active)
  2. HR Manager (Active)
  3. Recuitment Manager (Active)
  4. Payroll Manager (Active)
  5. Leave Manager (Active)
  6. Performance Manager (Active)
  7. Reports Analyst (Active)
  8. Employee (Active)
  9. Client (Active)
  10. Department Head (Active)

#### Action Elements Present:
- **Checkbox field** for bulk selection
- **Status display** (Active)

#### CRUD Operations:
- **Read:** Display role list
- **Update:** Not shown in data (UI would provide)
- **Delete:** Not shown in data (UI would provide)
- **Create:** Not shown in data (UI would provide)

#### Required Updates:
1. **Replace with API data** from roles collection
2. **Add permission counts** for each role
3. **Add user counts** assigned to each role
4. **Support role hierarchy** indicators
5. **Add isSystemRole flag** for non-deletable roles

---

### File: `react/src/core/data/json/pages_data.tsx`

#### Current Structure Analysis:
- **Type:** Page visibility configuration (likely for school module)
- **Pages Listed:**
  1. Students (slug: "students", status: true)
  2. Teachers (slug: "teachers", status: true)
  3. Parents (slug: "parents", status: true)
  4. Guardians (slug: "guardians", status: true)
  5. Classes (slug: "classes", status: true)
  6. Hostel (slug: "hostel", status: true)

#### Action Elements Present:
- **Status toggle** (boolean) for enabling/disabling pages
- **Slug field** for routing

#### Required Updates:
1. **Expand to full system** pages (HRM, CRM, Finance, etc.)
2. **Add permission requirements** for each page
3. **Add module assignment** (which module each page belongs to)
4. **Add menu hierarchy** (parent page, ordering)
5. **Add display settings** (icon, show in menu, menu level)

---

### File: `react/src/core/data/json/pageDetails.tsx`

#### Current Structure Analysis:
- **Type:** Page configuration with role selection
- **Pages Listed:**
  1. Employee (page_slug: "employee", Active)
  2. Clients (page_slug: "clients", Active)
  3. Projects (page_slug: "projects", Active)
  4. Tickets (page_slug: "tickets", Active)
  5. Contacts (page_slug: "contacts", Active)
  6. Companies (page_slug: "companies", Active)
  7. Deals (page_slug: "deals", Active)
  8. Leads (page_slug: "leads", Active)
  9. Pipeline (page_slug: "pipeline", Active)
  10. Activities (page_slug: "activities", Active)

#### Action Elements Present:
- **Checkbox** for selecting pages (likely for role assignment)
- **Status field** (Active)

#### CRUD Operations:
- **Read:** Page list display
- **Update:** Status toggle (checkbox)
- **Create/Delete:** Not shown (would be in UI)

#### Required Updates:
1. **Add permission requirements** (which permissions needed for page)
2. **Add route validation** (ensure page_slug matches actual route)
3. **Add module categorization** (HRM, CRM, Projects, etc.)
4. **Add parent-child relationships** for nested menu items
5. **Add icon configuration** per page

---

## 6. DATA FILES - HRM MODULE

### File: `react/src/core/data/json/employees_list_details.tsx`

#### Current Structure Analysis:
- **Type:** Employee list data with role information
- **Fields per Employee:**
  - key, EmpId, Name, Image
  - CurrentRole (Finance, Developer, Executive Officer, Manager, Executive)
  - Email, Phone, Designation
  - JoiningDate, Status (Active/Inactive)

#### Action Elements Present:
- **No action buttons** in data (UI would add)
- **Status indicator** (Active/Inactive)
- **Role display** (CurrentRole field)

#### CRUD Operations:
- **Create:** Add new employees
- **Read:** View employee list
- **Update:** Edit employee details
- **Delete:** Remove employees

#### Required Updates:
1. **Replace with API data** from employees collection
2. **Add department info** (currently has designation only)
3. **Add permission fields** (canView, canEdit, canDelete per employee based on role)
4. **Add reporting hierarchy** (who reports to whom)
5. **Add employment history** tracking

---

### File: `react/src/core/data/json/leaveData.tsx`

#### Current Structure Analysis:
- **Type:** Leave request data
- **Fields:**
  - key, leaveType, leaveDate, noOfDays, appliedOn, status
- **Leave Types:** Medical Leave, Casual Leave, Special Leave
- **Status Values:** Approved, Pending

#### Action Elements Present:
- **No action buttons** in data
- **Status tracking** (Approved/Pending)

#### CRUD Operations:
- **Create:** Submit leave request
- **Read:** View leave list
- **Update:** Edit/Approve/Reject leave
- **Delete:** Cancel leave request

#### Required Updates:
1. **Replace with API data** from leaves collection
2. **Add approval workflow** fields:
   - Current approval level
   - Approver name/role
   - Required approval count
3. **Add balance tracking** (available leave days per type)
4. **Add carry forward** information
5. **Add attachment references** (link to attachments)

---

### File: `react/src/core/data/json/leaveadmin_details.tsx`

#### Current Structure Analysis:
- **Type:** Leave admin view data (HR view of leave requests)
- **Fields:**
  - key, Image, Employee, Role, LeaveType
  - From, To, NoOfDays
- **Leave Types:** Medical Leave, Casual Leave, Annual Leave

#### Action Elements Present:
- **No action buttons** in data
- **Employee info display** with Image and Role

#### CRUD Operations:
- **Read:** View leave requests
- **Update:** Approve/Reject leave actions
- **Create:** Not applicable (employees create leave)
- **Delete:** Cancel leave

#### Approval Flow Logic:
- **Status visible** (Approved/Pending) in data
- **No approver information** stored
- **No approval timestamp** tracking

#### Required Updates:
1. **Replace with API data** from leave approvals collection
2. **Add approver info** (who approved/rejected)
3. **Add approval timestamps** (when approved/rejected)
4. **Add approval comments** (reason for rejection)
5. **Add multi-level approval** support fields
6. **Add notification flags** (was user notified)

---

### File: `react/src/core/data/json/attendance.tsx`

#### Current Structure Analysis:
- **Type:** Monthly attendance data structure
- **Fields:**
  - key, date (01-10)
  - Monthly breakdown: jan, feb, mar, apr, may, jun, jul, aug, sep, oct, nov, dec
- **Value Format:** Numeric (likely attendance days or hours)

#### Action Elements Present:
- **No action buttons** in data
- **Time series data** only

#### CRUD Operations:
- **Read:** View attendance data
- **Create:** Mark attendance
- **Update:** Modify attendance
- **Delete:** Remove attendance records

#### Required Updates:
1. **Replace with API data** from attendance collection
2. **Add employee reference** (whose attendance)
3. **Add attendance type** (present, absent, late, half-day)
4. **Add work hours** (if tracking hours instead of days)
5. **Add overtime tracking** fields
6. **Add shift information** (which shift for attendance)

---

## 7. DATA FILES - PROJECTS & CRM MODULE

### File: `react/src/core/data/json/projectsData.tsx`

#### Current Structure Analysis:
- **Type:** Project management data
- **Fields per Project:**
  - id, si_no, star, name, client
  - pro_img, client_img, priority
  - start_date, end_date, stage, type, status, value, hrs
  - mem_image1, mem_image2, mem_image3 (team members)
  - budget, currently_spend, Action, key

#### Action Elements Present:
- **No action buttons** in data
- **Priority indicators** (High, Medium, Low)
- **Status indicators** (Active, Inactive)
- **Star flag** (starred projects)

#### CRUD Operations:
- **Create:** Create new projects
- **Read:** View project list/details
- **Update:** Edit project information
- **Delete:** Archive/delete projects

#### Stages: Plan, Develop, Design, Completed

#### Required Updates:
1. **Replace with API data** from projects collection
2. **Add permission-based filtering** (canView, canCreate, canEdit, canDelete)
3. **Add project manager field** (who is managing)
4. **Add team member structure** (currently has images, needs IDs)
5. **Add milestone tracking** (key project milestones)
6. **Add document attachments** support
7. **Add project access control** (private/team/company-wide)

---

### File: `react/src/core/data/json/dealsData.tsx`

#### Current Structure Analysis:
- **Type:** CRM deals/opportunities data
- **Fields:**
  - id, dealName, stage, dealValue, tag1, closeDate, createdDate, owner, source, probability, status, key

#### Stages: Qualify To Buy, Proposal Made, Contact Made, Presentation, Appointment
#### Status: Won, Lost, Open
#### Sources: Paid Social, Referrals, Campaigns, Google

#### Action Elements Present:
- **No action buttons** in data
- **Probability percentage** tracking
- **Status tracking**

#### CRUD Operations:
- **Create:** Create new deals
- **Read:** View deal pipeline
- **Update:** Move deals through stages, edit deal info
- **Delete:** Remove deals

#### Required Updates:
1. **Replace with API data** from deals collection
2. **Add contact person reference** (who is deal contact)
3. **Add company reference** (linked company)
4. **Add expected close date** validation
5. **Add stage transition history** (track stage changes)
6. **Add competition tracking** (competing deals)
7. **Add permission controls** per stage (who can move to which stage)

---

### File: `react/src/core/data/json/leadsList.tsx`

#### Current Structure Analysis:
- **Type:** CRM leads data
- **Fields:**
  - key, LeadName, CompanyName, Phone, Email, Tags, CreatedDate, Image, LeadOwner

#### Tags: Closed, Contacted, Lost, Not Contacted

#### Action Elements Present:
- **No action buttons** in data
- **Lead Owner** assignment tracking
- **Tags** for lead status

#### CRUD Operations:
- **Create:** Capture new leads
- **Read:** View lead list
- **Update:** Convert to deal, update lead info
- **Delete:** Remove leads

#### Required Updates:
1. **Replace with API data** from leads collection
2. **Add lead source tracking** (where lead came from)
3. **Add lead quality score** (hot/warm/cold)
4. **Add conversion tracking** (when converted to deal)
5. **Add follow-up reminders** (next action date)
6. **Add communication history** (emails, calls, meetings)
7. **Add permission controls** (who can view/edit/delete leads)

---

## 8. DATA FILES - FINANCE MODULE

### File: `react/src/core/data/json/invoices_details.tsx`

#### Current Structure Analysis:
- **Type:** Invoice/billing data
- **Fields:**
  - key, Invoice, Image, Name, Roll (email), Created_On
  - Total, Amount_Due, Due_Date, Status

#### Status Values: Paid, Overdue, Pending, Draft

#### Action Elements Present:
- **No action buttons** in data
- **Payment tracking** (Amount_Due)
- **Due date** tracking

#### CRUD Operations:
- **Create:** Create new invoices
- **Read:** View invoice list
- **Update:** Edit invoice, mark as paid
- **Delete:** Void/delete invoices
- **Special Actions:** Send invoice, record payment

#### Required Updates:
1. **Replace with API data** from invoices collection
2. **Add client reference** (billed to whom)
3. **Add line items structure** (products/services)
4. **Add tax calculation** fields
5. **Add payment history** (multiple payments per invoice)
6. **Add invoice template** support
7. **Add permission controls** (who can create, approve, void invoices)

---

### File: `react/src/core/data/json/expenses_details.tsx`

#### Current Structure Analysis:
- **Type:** Expense tracking data
- **Fields:**
  - key, Expense_Name, Date, Payment_Method, Amount

#### Expense Types: Online Course, Employee Benefits, Travel, Office Supplies, Welcome Kit,
                     Equipment, Miscellaneous, Payroll, Cafeteria, Cleaning Supplies

#### Payment Methods: Cash, Cheque

#### Action Elements Present:
- **No action buttons** in data
- **Amount tracking** per expense

#### CRUD Operations:
- **Create:** Add new expenses
- **Read:** View expense reports
- **Update:** Edit expense details
- **Delete:** Remove expenses
- **Special Actions:** Categorize, approve expense reports

#### Required Updates:
1. **Replace with API data** from expenses collection
2. **Add category structure** (hierarchical expense categories)
3. **Add receipt attachment** support
4. **Add approval workflow** (expense approval chain)
5. **Add reimbursement tracking** (who needs to be reimbursed)
6. **Add budget codes** (link to budget tracking)
7. **Add permission controls** (expense limits per role)

---

### File: `react/src/core/data/json/payroll_addition.tsx`

#### Current Structure Analysis:
- **Type:** Payroll additions/deductions data
- **Fields:**
  - key, Name, Category, Amount

#### Items Listed:
1. Leave Balance Amount - Monthly Remuneration
2. Arrears of Salary - Additional Remuneration
3. Gratuity - Monthly Remuneration

#### Action Elements Present:
- **No action buttons** in data
- **Fixed payroll items** configuration

#### CRUD Operations:
- **Create:** Add new payroll items
- **Read:** View payroll item list
- **Update:** Edit item name/category/amount
- **Delete:** Remove payroll items
- **Special Actions:** Apply to salary calculation

#### Required Updates:
1. **Replace with API data** from payroll_items collection
2. **Add item type classification** (earning vs deduction)
3. **Add calculation formula** support (percentage vs fixed)
4. **Add tax configuration** (tax tables)
5. **Add effective date ranges** (when item applies)
6. **Add approval workflow** (who can modify items)
7. **Add permission controls** (who can configure payroll)

---

### File: `react/src/core/data/json/pipelineData.tsx`

#### Current Structure Analysis:
- **Type:** Sales pipeline data
- **Fields:**
  - key, Pipeline_Name, Total_Deal_Value, No_of_Deals, Stages, Created_Date, Status

#### Pipeline Types: Sales, Marketing, Calls, Email, Chats, Operational, Collaborative, Differentiate, Identify

#### Stages: Won, In Pipeline, Conversation, Follow Up, Schedule Service, Lost

#### Action Elements Present:
- **No action buttons** in data
- **Pipeline statistics** (total value, deal count)

#### CRUD Operations:
- **Create:** Create new pipelines
- **Read:** View pipeline list
- **Update:** Modify pipeline stages
- **Delete:** Archive pipelines
- **Special Actions:** Reorder stages, change probabilities

#### Required Updates:
1. **Replace with API data** from pipelines collection
2. **Add stage configuration** (customizable stages per pipeline)
3. **Add probability mapping** (win probability per stage)
4. **Add deal routing rules** (auto-move deals between stages)
5. **Add pipeline owner assignment** (who can modify)
6. **Add conversion tracking** (stage-to-stage time metrics)
7. **Add permission controls** (who can view/edit pipelines)

---

# UPDATED: CURRENT SYSTEM STRUCTURE REPORT

## Existing Role Handling Structure (Updated)

### Current Data Structure Findings:
1. **Roles stored in multiple places:**
   - Clerk `publicMetadata.role` (production)
   - Hardcoded in `RoleBasedRenderer/index.tsx`
   - Hardcoded in `fieldPermissions.ts`
   - Hardcoded in `sidebarMenu.jsx`
   - Mock data in `rolesPermissions.tsx`
   - Mock data in `rolesDetails.tsx`

2. **Permission Templates Found:**
   - `permission.tsx` - Module-level CRUD template (empty strings = not configured)
   - `fieldPermissions.ts` - Field-level view/edit config

3. **Page Configuration Files:**
   - `pages_data.tsx` - School module pages (6 pages)
   - `pageDetails.tsx` - HRM/CRM pages (10 pages)

### Role Hierarchy from Data Files:
```
From rolesDetails.tsx:
1. Admin (Active)
2. HR Manager (Active)
3. Recruitment Manager (Active)
4. Payroll Manager (Active)
5. Leave Manager (Active)
6. Performance Manager (Active)
7. Reports Analyst (Active)
8. Employee (Active)
9. Client (Active)
10. Department Head (Active)
```

### Missing Role Features:
1. **No role descriptions**
2. **No role hierarchy levels**
3. **No permission count per role**
4. **No user count per role**
5. **No isSystemRole flag**

---

# UPDATED: IMPLEMENTATION PLAN FOR DYNAMIC RBAC

## Additional Required Database Collections (Phase 2 Updates)

### Update to Permissions Collection Schema:
```javascript
// Enhanced schema based on permission.tsx analysis
{
  _id: ObjectId,
  permissionId: String,     // e.g., "classes.create", "leaves.approve"
  displayName: String,     // "Create Classes", "Approve Leaves"
  module: String,          // "hrm", "crm", "finance", "projects", "academics"
  category: String,         // "employees", "leaves", "attendance", "deals", "leads"
  action: String,          // "create", "read", "update", "delete", "approve", "export"
  appliesTo: String,        // "self", "team", "department", "company", "all"
  isCustom: Boolean,        // System vs Custom permission
  status: String,          // "active" | "inactive"
  createdAt: Date,
  updatedAt: Date
}
```

### Update to Pages Collection Schema:
```javascript
// Enhanced schema based on pageDetails.tsx analysis
{
  _id: ObjectId,
  pageId: String,          // Unique identifier: "employee-list", "leave-admin"
  pageName: String,        // "Employee List", "Leave Management"
  route: String,           // "/employees", "/leave/admin"
  module: String,          // "hrm", "crm", "projects", "finance"
  parentPageId: ObjectId,  // For submenu items
  icon: String,           // Icon identifier or SVG path
  displayOrder: Number,     // For sorting in menu
  showInMenu: Boolean,     // Display in navigation
  menuLevel: Number,       // 1=main, 2=submenu, 3=sub-submenu
  requiredPermissions: [String],  // Array of permission IDs needed
  status: String,          // "active" | "inactive" | "hidden"
  companyId: ObjectId,      // Company-specific pages
  createdAt: Date,
  updatedAt: Date
}
```

### New Collection: Leave Approvals (Approval Workflow)
```javascript
{
  _id: ObjectId,
  leaveId: ObjectId,        // Reference to leaves collection
  requesterId: ObjectId,    // User requesting leave
  approverId: ObjectId,    // User who approved
  approvalLevel: Number,    // 1, 2, 3 for multi-level
  status: String,          // "pending" | "approved" | "rejected" | "cancelled"
  comments: String,         // Approval/rejection comments
  approvedAt: Date,
  createdAt: Date,
  companyId: ObjectId
}
```

### New Collection: Expense Categories
```javascript
{
  _id: ObjectId,
  name: String,            // "Travel", "Office Supplies", etc.
  parentId: ObjectId,        // For hierarchical categories
  code: String,            // Unique category code
  budgetRequired: Boolean,  // Requires budget assignment
  approvalRequired: Boolean, // Needs approval before reimbursement
  companyId: ObjectId,
  status: String
}
```

---

## Additional Backend Requirements (Phase 2 Updates)

### New Services Needed:

#### `services/rbac/module.service.js` (New)
```javascript
// Functions needed:
- getModulesByCompany(companyId)
- getModulePermissions(moduleId)
- createModule(moduleData)
- updateModule(moduleId, updates)
```

#### `services/rbac/leaveApproval.service.js` (New)
```javascript
// Functions needed:
- getPendingApprovals(companyId)
- approveLeave(approvalId, approverId, comments)
- rejectLeave(approvalId, approverId, comments)
- getApprovalChain(leaveId)
- getNextApprover(leaveId)
```

#### `services/collections/project.service.js` (New)
```javascript
// Functions needed:
- getProjectsByPermission(userId, permission)
- getProjectById(projectId)
- createProject(projectData)
- updateProject(projectId, updates)
- addProjectMember(projectId, userId)
- removeProjectMember(projectId, userId)
```

### New Controllers Needed:

#### `controllers/rbac/module.controller.js` (New)
```javascript
// Endpoints:
GET    /api/modules                    - List all modules
GET     /api/modules/:id               - Get module by ID
POST    /api/modules                    - Create new module (superadmin only)
PUT     /api/modules/:id               - Update module
DELETE   /api/modules/:id               - Delete module
GET     /api/modules/:id/permissions    - Get module's permissions
```

---

## Additional Frontend Requirements (Phase 2 Updates)

### New Data Type Definitions:

#### `core/data/interface/permissionInterface.tsx` (Create New)
```typescript
export interface Permission {
  permissionId: string;
  displayName: string;
  module: Module;
  category: PermissionCategory;
  action: PermissionAction;
  appliesTo: 'self' | 'team' | 'department' | 'company' | 'all';
  isCustom: boolean;
}

export interface RoleDetail {
  _id: string;
  name: string;
  description?: string;
  level: number;
  companyId: string;
  permissionCount: number;
  userCount: number;
  status: 'active' | 'inactive';
  isSystemRole: boolean;
  createdAt: Date;
}

export interface PageDetail {
  pageId: string;
  pageName: string;
  route: string;
  module: string;
  parentPageId?: string;
  icon: string;
  displayOrder: number;
  showInMenu: boolean;
  menuLevel: number;
  requiredPermissions: string[];
  status: 'active' | 'inactive' | 'hidden';
}

export type Module = 'hrm' | 'crm' | 'projects' | 'finance' | 'academics' | 'administration';
export type PermissionCategory = 'employees' | 'leaves' | 'attendance' | 'deals' | 'leads' | 'invoices' | 'expenses' | 'projects' | 'classes';
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'import';
```

### New Hooks Needed:

#### `hooks/useLeaveApproval.tsx` (Create New)
```typescript
interface UseLeaveApprovalReturn {
  pendingApprovals: LeaveApproval[];
  canApprove: (leaveId: string) => boolean;
  canReject: (leaveId: string) => boolean;
  approve: (leaveId: string, comments?: string) => Promise<void>;
  reject: (leaveId: string, reason: string) => Promise<void>;
  isLoading: boolean;
}
```

#### `hooks/useProjectData.tsx` (Create New)
```typescript
interface UseProjectDataReturn {
  projects: Project[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createProject: (data: ProjectCreate) => Promise<void>;
  updateProject: (id: string, data: ProjectUpdate) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}
```

---

## Additional UI Components Needed (Phase 2)

### Permission Management Components:

#### `core/components/PermissionMatrix/index.tsx` (Create New)
```typescript
// Matrix view for role-permission assignment
interface PermissionMatrixProps {
  roleId: string;
  permissions: Permission[];
  onPermissionToggle: (permissionId: string, granted: boolean) => void;
  onSave: () => void;
}
// Displays: Grid with roles as columns, permissions as rows
// Cells: Checkboxes for permission assignment
```

#### `core/components/RoleSelector/index.tsx` (Create New)
```typescript
// Role selection dropdown with hierarchy
interface RoleSelectorProps {
  value?: string;
  onChange: (roleId: string) => void;
  includeInactive?: boolean;
  showDescription?: boolean;
  showUserCount?: boolean;
}
```

#### `core/components/PageVisibilityToggle/index.tsx` (Create New)
```typescript
// Page visibility configuration
interface PageVisibilityProps {
  pages: PageDetail[];
  selectedPages: string[];
  onSelectionChange: (pageIds: string[]) => void;
  modules?: Module[];
}
```

---

## Complete CRUD Mapping by Module

### HRM Module Permissions:
```
EMPLOYEES:
- employees.create       - Add employee
- employees.read         - View employee list
- employees.read.self    - View own profile
- employees.update       - Edit employee
- employees.update.self   - Edit own profile
- employees.delete       - Delete employee
- employees.export       - Export employee data
- employees.import       - Import employee data

DEPARTMENTS:
- departments.create     - Create department
- departments.read       - View departments
- departments.update     - Edit department
- departments.delete     - Delete department

DESIGNATIONS:
- designations.create    - Create designation
- designations.read      - View designations
- designations.update    - Edit designation
- designations.delete    - Delete designation

LEAVES:
- leaves.create         - Submit leave request
- leaves.read           - View leave list
- leaves.read.self       - View own leaves
- leaves.approve        - Approve leave (HR/Manager)
- leaves.cancel         - Cancel own leave
- leaves.delete         - Delete leave records
- leaves.export         - Export leave reports

ATTENDANCE:
- attendance.create     - Mark attendance
- attendance.read       - View attendance
- attendance.read.self   - View own attendance
- attendance.update     - Modify attendance
- attendance.delete     - Delete attendance records
- attendance.export     - Export attendance reports

PERFORMANCE:
- performance.create    - Create performance review
- performance.read      - View performance data
- performance.update    - Update performance
- performance.delete    - Delete performance records

TRAINING:
- training.create       - Create training
- training.read         - View training
- training.update       - Update training
- training.delete       - Delete training

PAYROLL:
- payroll.read         - View payroll (admin only)
- payroll.create       - Create payslip
- payroll.update       - Modify payroll
```

### CRM Module Permissions:
```
CONTACTS:
- contacts.create       - Add contact
- contacts.read         - View contacts
- contacts.update      - Edit contact
- contacts.delete      - Delete contact
- contacts.import       - Import contacts

COMPANIES:
- companies.create     - Add company
- companies.read       - View companies
- companies.update     - Edit company
- companies.delete     - Delete company

DEALS:
- deals.create         - Create deal
- deals.read           - View deals
- deals.update         - Update deal
- deals.delete         - Delete deal
- deals.convert        - Convert to project
- deals.export         - Export deals

LEADS:
- leads.create         - Add lead
- leads.read           - View leads
- leads.update         - Update lead
- leads.delete         - Delete lead
- leads.convert        - Convert to deal
- leads.import         - Import leads

PIPELINE:
- pipeline.read         - View pipelines
- pipeline.update       - Update pipeline stages
- pipeline.delete       - Delete pipeline

ACTIVITIES:
- activities.create     - Log activity
- activities.read      - View activities
- activities.update    - Edit activity
- activities.delete    - Delete activity
```

### Projects Module Permissions:
```
PROJECTS:
- projects.create       - Create project
- projects.read         - View projects
- projects.update       - Update project
- projects.delete       - Delete project
- projects.archive      - Archive project

TASKS:
- tasks.create         - Create task
- tasks.read           - View tasks
- tasks.update         - Update task
- tasks.delete         - Delete task
- tasks.assign        - Assign task to user

MILESTONES:
- milestones.create    - Create milestone
- milestones.read      - View milestones
- milestones.update    - Update milestone
- milestones.delete    - Delete milestone
```

### Finance Module Permissions:
```
INVOICES:
- invoices.create      - Create invoice
- invoices.read        - View invoices
- invoices.update      - Edit invoice
- invoices.delete      - Delete invoice
- invoices.send        - Send invoice
- invoices.void        - Void invoice
- invoices.export      - Export invoices

EXPENSES:
- expenses.create      - Create expense
- expenses.read        - View expenses
- expenses.update      - Edit expense
- expenses.delete      - Delete expense
- expenses.approve     - Approve expense
- expenses.export      - Export expenses

PAYROLL:
- payroll.read         - View payroll
- payroll.create       - Create payroll
- payroll.update       - Update payroll
- payroll.process      - Process payroll
- payroll.export       - Export payslips
```

---

**Phase 2 Analysis Complete**
**Total Data Files Analyzed: 100+ files across Phase 1 & 2**

**Next Batch Requested:**
- Feature module pages (employees, leaves, attendance components)
- Additional common components
- More UI components requiring analysis

---

# FILE-BY-FILE ANALYSIS - PHASE 3: FEATURE MODULE COMPONENTS

**Analysis Date:** 2026-02-12
**Batch:** 3 - Feature Module Pages & Components
**Total Files Analyzed:** 200+ files

## FEATURE MODULE OVERVIEW

### Module Breakdown by Category:

| Module | Files | Key Components |
|---------|--------|----------------|
| CRM | 3 | leadsGrid, leadsList, pipeline, editPipeline |
| Finance & Accounts - Payroll | 5 | employee_salary, payroll, payrollDeduction, payrollOvertime, payslip |
| Finance & Accounts - Sales | 6 | add_invoices, estimates, expenses, invoices_details, invoices, payment, provident_fund, taxes |
| HRM - Attendance | 9 | leaveAdmin, leaveEmployee, leavesettings, attendance_employee, attendanceadmin, batchesList, batchesManagement, overtime, scheduletiming, shiftsList, shiftsManagement, timesheet |
| HRM - Employees | 5 | deparment, designations, employeedetails, employeesGrid, employeesList, policy |
| HRM - Other | 4 | holidays, promotion, resignation, termination |
| Main Menu - Dashboards | 7 | adminDashboard, employeeDashboard (circleProgress, circleProgressSmall, employee-dashboard), dealsDashboard, hrDashboard, leadsDashboard, layout-dashboard |
| Membership | 3 | membershipaddon, membershipplan, membershiptrasaction |
| Pages | 14 | admin-profile, api-keys (addKeyModal, editKeyModal), error (error-404, error-500), gallery, pricing, profile (components: BankInfoSection, EducationSection, ExperienceSection, FamilySection, PersonalInfoSection, profile-management), search-result, terms-condition, timeline, comingSoon, underConstruction, underMaintenance, starter |
| Performance | 5 | goalTracking, goalType, performanceAppraisal, performanceIndicator, performanceReview |
| Projects | 9 | client (add_client, clientlist, clientdetails, delete_client, edit_client), project (project, projectdetails), task (task, taskdetails, task-board) |
| Recruitment | 15 | candidates (add_candidate, candidategrid, candidatekanban, candidatelist, candidatelistDetails, delete_candidate, edit_candidate), joblist, joblistdetails, jobs (add_job, delete_job, edit_job, jobgrid, joblist), refferal (refferallist, refferallistDetails) |
| Router | 4 | all_routes, router, router.link, withRoleCheck |
| Sales | 2 | invoice, invoiceDetails |
| Settings | 37 | appSettings (approval-settings, customFields, invoiceSettings, leave-type, salary-settings), financialSettings (currencies, paymentGateways, taxRates), generalSettings (connected-apps, notifications-settings, profile-settings, security-settings), otherSettings (backup, banIpaddress, clearCache, cronjob, cronjobSchedule, custom-css, custom-js, storage), systemSettings (email-templates, emailSettings, gdprCookies, maintenance-mode, otp-settings, sms-template, smsSettings), websiteSettings (add-language, ai-settings, appearance, authentication-settings, bussiness-settings, companySettings, language-web, language, localization-settings, preferences, prefixes, seo-settings, socialAuthentication) |
| Super Admin | 8 | companies, dashboard, domin, modules, packages (packagegrid, packagelist), pages (super-admin), permissionpage, purchase-transaction, rolePermission, subscription, users |
| Support | 2 | contactMessages, tickets (tickets-sidebar) |
| Tables | 2 | basicTable, dataTable (data-tables) |
| Tickets | 4 | tickets-grid (tickets-grid.js), tickets (tickets.js), ticket-details |
| Training | 3 | trainers, trainingList, trainingType |
| UI Interface | 51 | advanced-ui (clipboard, counter, custom-declaration, dragdrop, rangeslider, rating, ribbon, stickynote, texteditor, timeline, uiscrollbar), base-ui (ui-sortable: cloning, disable-sorting, index, multiple-drag, nested-sortable, shared-list, simple-list, sortable-grid, sorting-handle, swapping, sorting-filter, accordion, alert, alert-ui, avatar, borders, badges, breadcrumb, buttons, buttonsgroup, cards, carousel, colors, dropdowns, grid, images, lightbox, media, modals, navtabs, offcanvas, pagination, placeholder, popover, progress, rangeslider, spinner, swiperjs, toasts, tooltips, typography, video), charts (apexcharts, chartjs, prime-react-chart), forms (formelements: checkbox-radios, basic-inputs, fileupload, form-mask, form-select, form-wizard, formpickers, grid-gutters, input-group, layouts: floating-label, form-horizontal, form-select2, form-validation, form-vertical), icons (bootstrapicons, feathericon, flagicon, flagicons, fontawesome, ionicicons, materialicon, pe7icons, remixIcons, simplelineicon, themify, typicons, weathericons), map (leaflet), table (data-tables, tables-basic) |
| User Management | 3 | deleteRequest, manageusers, permission, rolesPermissions |

---

## DETAILED COMPONENT ANALYSIS

### 1. SUPER ADMIN MODULE COMPONENTS

#### File: `react/src/feature-module/super-admin/companies/index.tsx`

**Component:** Companies Management Page
**Route:** `superAdminCompanies` → `/super-admin/companies`
**Module:** Super Admin

**Current Features:**
- Company listing grid
- Add/Edit/Delete company operations
- Company status management (Active/Inactive)
- Subscription plan display

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Company" button | Needs permission check |
| Read | Company list view | Filter by subscription |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |

**Required Permissions:**
- `companies.create` - Add new companies
- `companies.read` - View company list
- `companies.update` - Edit company details
- `companies.delete` - Delete companies
- `companies.manage` - Manage company subscriptions

**Required Updates:**
1. Add permission-based button visibility
2. Integrate with Companies REST API
3. Add permission checks for CRUD operations
4. Implement `useSuperadminCompaniesREST` hook

---

#### File: `react/src/feature-module/super-admin/dashboard/index.tsx`

**Component:** Super Admin Dashboard
**Route:** `superAdminDashboard` → `/super-admin/dashboard`
**Module:** Super Admin

**Current Features:**
- Company statistics overview
- Subscription metrics
- User activity charts
- Revenue analytics

**Dashboard Sections:**
- Total Companies card
- Active Subscriptions card
- Revenue chart
- Recent Activity list

**Required Permissions:**
- `superadmin.dashboard.read` - View dashboard
- `companies.read` - View company stats
- `subscriptions.read` - View subscription stats
- `analytics.read` - View analytics

**Required Updates:**
1. Create `useSuperAdminDashboardREST` hook
2. Add permission-based section visibility
3. Implement data filtering based on company access
4. Add export functionality with permission check

---

#### File: `react/src/feature-module/super-admin/packages/packagegrid.tsx`

**Component:** Packages Grid View
**Route:** `superAdminPackages` → `/super-admin/package-grid`
**Module:** Super Admin

**Current Features:**
- Package grid layout
- Package status badges
- Module count per package
- Create/Edit/Delete operations

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Package" button | Needs permission check |
| Read | Package grid view | Filter by status |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |

**Required Permissions:**
- `packages.create` - Create new packages
- `packages.read` - View package list
- `packages.update` - Edit package details
- `packages.delete` - Delete packages
- `packages.manage` - Manage package modules

**Required Updates:**
1. Add `PermissionButton` for CRUD operations
2. Implement `usePackagesREST` hook
3. Add module assignment permission check
4. Filter packages by company access

---

#### File: `react/src/feature-module/super-admin/rolePermission.tsx`

**Component:** Roles & Permissions Management
**Route:** `rolePermission` → `/roles-permissions`
**Module:** Users & Permissions

**Current Features:**
- Role listing with status
- Add/Edit/Delete role operations
- Permission assignment interface
- Role hierarchy display

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Role" button | Needs permission check |
| Read | Role list table | Filter by status |
| Update | Edit icon + Permission page link | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |

**Required Permissions:**
- `roles.create` - Create new roles
- `roles.read` - View role list
- `roles.update` - Edit role details
- `roles.delete` - Delete roles
- `roles.assign` - Assign permissions to roles
- `permissions.read` - View permissions

**Required Updates:**
1. Implement `useRolesREST` hook
2. Add permission matrix component for role-permission mapping
3. Add role hierarchy visualization
4. Implement permission inheritance
5. Add bulk permission assignment

---

#### File: `react/src/feature-module/super-admin/permissionpage.tsx`

**Component:** Permission Management Page
**Route:** `permissionpage` → `/permission`
**Module:** Users & Permissions

**Current Features:**
- Permission listing by category
- Create/Edit/Delete permission operations
- Module-based filtering
- Permission type indicators

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Permission" button | Needs permission check |
| Read | Permission list view | Filter by category/module |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |

**Required Permissions:**
- `permissions.create` - Create new permissions (superadmin only)
- `permissions.read` - View permission list
- `permissions.update` - Edit permission details
- `permissions.delete` - Delete permissions
- `permissions.manage` - Manage system permissions

**Required Updates:**
1. Implement `usePermissionsREST` hook
2. Add permission category filtering
3. Add permission search functionality
4. Implement permission audit log

---

#### File: `react/src/feature-module/super-admin/users.tsx`

**Component:** User Management Page
**Route:** `users` → `/users`
**Module:** Users & Permissions

**Current Features:**
- User listing grid
- Add/Edit/Delete user operations
- Role assignment interface
- User status management

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add User" button | Needs permission check |
| Read | User list table | Filter by role/status |
| Update | Edit icon + Role dropdown | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |

**Required Permissions:**
- `users.create` - Create new users
- `users.read` - View user list
- `users.update` - Edit user details
- `users.delete` - Delete users
- `users.assign-role` - Assign roles to users
- `users.manage` - Manage user accounts

**Required Updates:**
1. Implement `useUsersREST` hook
2. Add role assignment dropdown with permission check
3. Implement user status management
4. Add bulk user operations
5. Implement user audit trail

---

### 2. HRM MODULE COMPONENTS

#### File: `react/src/feature-module/hrm/employees/employeesList.tsx`

**Component:** Employee List Page
**Route:** `employeeList` → `/employees`
**Module:** HRM → Employees

**Current Features:**
- Employee data table with search
- Add employee modal
- Import/Export functionality
- Employee status badges

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Employee" button | Needs permission check |
| Read | Employee table view | Filter by department/status |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |
| Export | Export dropdown | Needs permission check |
| Import | Import button | Needs permission check |

**Required Permissions:**
- `employees.create` - Add new employees
- `employees.read` - View employee list
- `employees.read.self` - View own profile
- `employees.update` - Edit employee details
- `employees.update.self` - Edit own profile
- `employees.delete` - Delete employees
- `employees.export` - Export employee data
- `employees.import` - Import employee data

**Required Updates:**
1. Wrap all buttons with `PermissionButton`
2. Implement `useEmployeesREST` hook
3. Add field-level permissions using `PermissionField`
4. Add department-based filtering
5. Implement export permission check

---

#### File: `react/src/feature-module/hrm/attendance/leaveAdmin.tsx`

**Component:** Leave Administration (HR View)
**Route:** `leaveadmin` → `/leaves`
**Module:** HRM → Attendance → Leaves

**Current Features:**
- Leave request list (admin view)
- Approve/Reject buttons
- Leave type filtering
- Date range filter

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | N/A (employees create) | - |
| Read | Leave list table | Filter by status/type |
| Update | Approve/Reject buttons | Needs permission check |
| Delete | Cancel button | Needs permission check |

**Approval Flow:**
- Status: Approved/Pending visible
- Approve/Reject buttons in table
- No approval history tracking

**Required Permissions:**
- `leaves.read` - View all leave requests
- `leaves.read.self` - View own leaves
- `leaves.approve` - Approve leave requests
- `leaves.reject` - Reject leave requests
- `leaves.cancel` - Cancel leave requests
- `leaves.export` - Export leave reports

**Required Updates:**
1. Add `PermissionButton` for Approve/Reject
2. Implement `useLeaveREST` hook for admin
3. Add approval workflow support
4. Track approval history
5. Add multi-level approval support

---

#### File: `react/src/feature-module/hrm/attendance/leavesettings.tsx`

**Component:** Leave Settings Configuration
**Route:** `leavesettings` → `/leave-settings`
**Module:** HRM → Attendance → Leaves

**Current Features:**
- Leave type configuration
- Leave balance settings
- Approval workflow settings
- Carry forward rules

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Leave Type" button | Needs permission check |
| Read | Settings view | - |
| Update | Edit settings | Needs permission check |
| Delete | Delete leave type | Needs permission check |

**Required Permissions:**
- `leaves.settings.read` - View leave settings
- `leaves.settings.update` - Modify leave settings
- `leaves.types.create` - Create leave types
- `leaves.types.delete` - Delete leave types
- `leaves.approval.configure` - Configure approval workflow

**Required Updates:**
1. Add permission-based section visibility
2. Implement `useLeaveTypesREST` hook
3. Add leave type CRUD with permissions
4. Add approval chain configuration
5. Add carry forward rules management

---

#### File: `react/src/feature-module/hrm/attendance/attendanceadmin.tsx`

**Component:** Attendance Administration
**Route:** `attendanceadmin` → `/attendance-admin`
**Module:** HRM → Attendance

**Current Features:**
- Monthly attendance calendar
- Employee attendance marking
- Attendance summary reports
- Date range filtering

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Mark Attendance" button | Needs permission check |
| Read | Attendance calendar view | Filter by employee/date |
| Update | Edit attendance | Needs permission check |
| Delete | Remove attendance | Needs permission check |

**Required Permissions:**
- `attendance.read` - View attendance records
- `attendance.read.self` - View own attendance
- `attendance.create` - Mark attendance
- `attendance.update` - Modify attendance
- `attendance.delete` - Remove attendance records
- `attendance.export` - Export attendance reports
- `attendance.approve` - Approve attendance corrections

**Required Updates:**
1. Add `PermissionButton` for mark/edit
2. Implement `useAttendanceREST` hook
3. Add employee filter with permission check
4. Add bulk attendance marking
5. Implement attendance correction workflow

---

#### File: `react/src/feature-module/hrm/attendance/shiftsManagement.tsx`

**Component:** Shifts Management
**Route:** `shiftsManagement` → `/shifts-management`
**Module:** HRM → Attendance

**Current Features:**
- Shift listing grid
- Add/Edit/Delete shift operations
- Shift assignment to employees
- Shift timing configuration

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Shift" button | Needs permission check |
| Read | Shift list view | Filter by department |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |

**Required Permissions:**
- `shifts.create` - Create new shifts
- `shifts.read` - View shift list
- `shifts.update` - Edit shift details
- `shifts.delete` - Delete shifts
- `shifts.assign` - Assign shifts to employees
- `shifts.manage` - Manage shift configurations

**Required Updates:**
1. Implement `useShiftsREST` hook
2. Add permission-based CRUD buttons
3. Add shift template functionality
4. Implement shift rotation rules
5. Add shift conflict detection

---

### 3. FINANCE & ACCOUNTS MODULE COMPONENTS

#### File: `react/src/feature-module/finance-accounts/sales/invoices.tsx`

**Component:** Invoices Management
**Route:** `invoices` → `/invoices`
**Module:** Finance & Accounts → Sales

**Current Features:**
- Invoice listing with filters
- Add/Edit/Delete invoice operations
- Payment recording
- Invoice status tracking

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Invoice" button | Needs permission check |
| Read | Invoice table view | Filter by status/client |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |
| Special | Send Invoice, Record Payment | Needs permission check |

**Required Permissions:**
- `invoices.create` - Create new invoices
- `invoices.read` - View invoice list
- `invoices.update` - Edit invoice details
- `invoices.delete` - Delete invoices
- `invoices.send` - Send invoices to clients
- `invoices.void` - Void invoices
- `invoices.payment` - Record payments
- `invoices.export` - Export invoice reports

**Required Updates:**
1. Wrap all action buttons with permissions
2. Implement `useInvoicesREST` hook
3. Add invoice template selection
4. Implement payment recording workflow
5. Add invoice approval workflow

---

#### File: `react/src/feature-module/finance-accounts/sales/expenses.tsx`

**Component:** Expenses Management
**Route:** `expenses` → `/expenses`
**Module:** Finance & Accounts → Sales

**Current Features:**
- Expense listing with filters
- Add/Edit/Delete expense operations
- Category-based organization
- Approval workflow

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Expense" button | Needs permission check |
| Read | Expense table view | Filter by category/status |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |
| Special | Approve/Reject | Needs permission check |

**Required Permissions:**
- `expenses.create` - Create new expenses
- `expenses.read` - View expense list
- `expenses.read.self` - View own expenses
- `expenses.update` - Edit expense details
- `expenses.delete` - Delete expenses
- `expenses.approve` - Approve expenses
- `expenses.export` - Export expense reports
- `expenses.reimburse` - Process reimbursements

**Required Updates:**
1. Add `PermissionButton` for all actions
2. Implement `useExpensesREST` hook
3. Add expense category management
4. Implement approval workflow
5. Add reimbursement tracking

---

#### File: `react/src/feature-module/finance-accounts/payrool/payslip.tsx`

**Component:** Payslip Management
**Route:** `payslip` → `/payslip`
**Module:** Finance & Accounts → Payroll

**Current Features:**
- Payslip listing with filters
- Generate payslip operation
- Email payslip functionality
- Payslip template selection

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Generate Payslip" button | Needs permission check |
| Read | Payslip table view | Filter by employee/month |
| Update | Regenerate option | Needs permission check |
| Delete | Void payslip | Needs permission check |
| Special | Send Email | Needs permission check |

**Required Permissions:**
- `payroll.read` - View payslips
- `payroll.generate` - Generate payslips
- `payroll.send` - Email payslips
- `payroll.void` - Void payslips
- `payroll.export` - Export payslip reports
- `payroll.approve` - Approve payroll

**Required Updates:**
1. Add `PermissionButton` for generate/send
2. Implement `usePayslipsREST` hook
3. Add payslip template management
4. Implement bulk generation
5. Add payslip approval workflow

---

### 4. CRM MODULE COMPONENTS

#### File: `react/src/feature-module/crm/leads/leadsList.tsx`

**Component:** Leads Management
**Route:** `leadsList` → `/leads-list`
**Module:** CRM → Leads

**Current Features:**
- Leads listing with filters
- Add/Edit/Delete lead operations
- Lead source tracking
- Convert to Deal functionality

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Lead" button | Needs permission check |
| Read | Leads table view | Filter by source/status |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |
| Special | Convert to Deal | Needs permission check |

**Required Permissions:**
- `leads.create` - Create new leads
- `leads.read` - View lead list
- `leads.read.self` - View own leads
- `leads.update` - Edit lead details
- `leads.delete` - Delete leads
- `leads.convert` - Convert leads to deals
- `leads.import` - Import leads
- `leads.export` - Export leads
- `leads.assign` - Assign leads to users

**Required Updates:**
1. Add `PermissionButton` for convert action
2. Implement `useLeadsREST` hook
3. Add lead quality scoring
4. Implement lead assignment workflow
5. Add lead source tracking

---

#### File: `react/src/feature-module/crm/pipeline/pipeline.tsx`

**Component:** Pipeline Management
**Route:** `pipeline` → `/pipeline`
**Module:** CRM → Pipeline

**Current Features:**
- Pipeline listing
- Add/Edit/Delete pipeline operations
- Stage configuration
- Deal flow visualization

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Pipeline" button | Needs permission check |
| Read | Pipeline list view | - |
| Update | Edit pipeline stages | Needs permission check |
| Delete | Delete pipeline | Needs permission check |

**Required Permissions:**
- `pipeline.read` - View pipelines
- `pipeline.create` - Create new pipelines
- `pipeline.update` - Edit pipeline stages
- `pipeline.delete` - Delete pipelines
- `pipeline.configure` - Configure stage settings

**Required Updates:**
1. Add `PermissionButton` for CRUD operations
2. Implement `usePipelinesREST` hook
3. Add stage configuration UI
4. Implement deal flow rules
5. Add pipeline analytics

---

### 5. PROJECTS MODULE COMPONENTS

#### File: `react/src/feature-module/projects/client/clientlist.tsx`

**Component:** Clients Management
**Route:** `clientlist` → `/clients`
**Module:** Projects → Clients

**Current Features:**
- Client listing grid
- Add/Edit/Delete client operations
- Client details view
- Project count per client

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Client" button | Needs permission check |
| Read | Client table view | Filter by type |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |

**Required Permissions:**
- `clients.create` - Create new clients
- `clients.read` - View client list
- `clients.update` - Edit client details
- `clients.delete` - Delete clients
- `clients.export` - Export client data

**Required Updates:**
1. Add `PermissionButton` for CRUD operations
2. Implement `useClientsREST` hook
3. Add client type categorization
4. Implement client-projects association
5. Add client contact management

---

#### File: `react/src/feature-module/projects/project/project.tsx`

**Component:** Projects Management
**Route:** `project` → `/projects-grid`
**Module:** Projects

**Current Features:**
- Project listing with filters
- Add/Edit/Delete project operations
- Team member assignment
- Project status tracking

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Project" button | Needs permission check |
| Read | Project grid/list view | Filter by status/client |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |

**Required Permissions:**
- `projects.create` - Create new projects
- `projects.read` - View project list
- `projects.read.self` - View assigned projects
- `projects.update` - Edit project details
- `projects.delete` - Delete projects
- `projects.archive` - Archive projects
- `projects.assign` - Assign team members
- `projects.export` - Export project data

**Required Updates:**
1. Add `PermissionButton` for all actions
2. Implement `useProjectsREST` hook
3. Add team member management
4. Implement project milestone tracking
5. Add project time tracking

---

#### File: `react/src/feature-module/projects/task/task-board.tsx`

**Component:** Task Board (Kanban)
**Route:** `taskboard` → `/task-board`
**Module:** Projects → Tasks

**Current Features:**
- Kanban board with columns
- Drag-and-drop task management
- Add/Edit/Delete task operations
- Task assignment

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Task" button | Needs permission check |
| Read | Kanban board view | Filter by assignee/status |
| Update | Drag to column/Edit | Needs permission check |
| Delete | Delete icon in card | Needs permission check |

**Required Permissions:**
- `tasks.create` - Create new tasks
- `tasks.read` - View task board
- `tasks.read.self` - View assigned tasks
- `tasks.update` - Edit task details
- `tasks.delete` - Delete tasks
- `tasks.assign` - Assign tasks to users
- `tasks.move` - Move between columns
- `tasks.complete` - Mark as complete

**Required Updates:**
1. Add `PermissionButton` for task actions
2. Implement `useTasksREST` hook
3. Add task drag-and-drop permission check
4. Implement task dependencies
5. Add task time tracking

---

### 6. RECRUITMENT MODULE COMPONENTS

#### File: `react/src/feature-module/recruitment/jobs/jobgrid.tsx`

**Component:** Jobs Management
**Route:** `jobgrid` → `/job-grid`
**Module:** Recruitment → Jobs

**Current Features:**
- Job listing grid
- Add/Edit/Delete job operations
- Application tracking
- Job status management

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Job" button | Needs permission check |
| Read | Job grid view | Filter by status/department |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |

**Required Permissions:**
- `jobs.create` - Create new job postings
- `jobs.read` - View job list
- `jobs.update` - Edit job details
- `jobs.delete` - Delete jobs
- `jobs.publish` - Publish/unpublish jobs
- `jobs.export` - Export job data
- `jobs.applications` - View applications

**Required Updates:**
1. Add `PermissionButton` for CRUD operations
2. Implement `useJobsREST` hook
3. Add job template functionality
4. Implement application management
5. Add job posting to external sites

---

#### File: `react/src/feature-module/recruitment/candidates/candidategrid.tsx`

**Component:** Candidates Management
**Route:** `candidatesGrid` → `/candidates-grid`
**Module:** Recruitment → Candidates

**Current Features:**
- Candidates listing grid
- Add/Edit/Delete candidate operations
- Resume attachment support
- Interview scheduling

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Candidate" button | Needs permission check |
| Read | Candidate grid view | Filter by status/job |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |
| Special | Schedule Interview | Needs permission check |

**Required Permissions:**
- `candidates.create` - Add new candidates
- `candidates.read` - View candidate list
- `candidates.update` - Edit candidate details
- `candidates.delete` - Delete candidates
- `candidates.hire` - Convert to employee
- `candidates.interview` - Schedule interviews
- `candidates.export` - Export candidate data
- `candidates.notes` - Add candidate notes

**Required Updates:**
1. Add `PermissionButton` for all actions
2. Implement `useCandidatesREST` hook
3. Add resume parsing support
4. Implement interview scheduling
5. Add candidate scoring/ranking

---

### 7. SETTINGS MODULE COMPONENTS

#### File: `react/src/feature-module/settings/appSettings/salary-settings.tsx`

**Component:** Salary Settings
**Route:** `salarySettings` → `/app-settings/salary-settings`
**Module:** Settings → App Settings

**Current Features:**
- Salary component configuration
- Allowance/deduction setup
- Pay frequency settings
- Tax configuration

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Component" button | Needs permission check |
| Read | Settings view | - |
| Update | Edit component values | Needs permission check |
| Delete | Delete component | Needs permission check |

**Required Permissions:**
- `settings.salary.read` - View salary settings
- `settings.salary.update` - Modify salary settings
- `settings.salary.components` - Manage salary components
- `settings.salary.calculate` - Configure salary calculation

**Required Updates:**
1. Add permission-based section access
2. Implement `useSalarySettingsREST` hook
3. Add salary calculation formula editor
4. Add component type management
5. Implement salary preview

---

#### File: `react/src/feature-module/settings/generalSettings/profile-settings.tsx`

**Component:** Profile Settings
**Route:** `profilesettings` → `/general-settings/profile-settings`
**Module:** Settings → General Settings

**Current Features:**
- User profile information
- Security settings (password change)
- Notification preferences
- Account settings

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Update | "Save Changes" button | Needs permission check |
| Read | Settings view | - |

**Required Permissions:**
- `settings.profile.read` - View profile settings
- `settings.profile.update` - Modify own profile
- `settings.profile.security` - Change password
- `settings.profile.notifications` - Manage notifications

**Required Updates:**
1. Add permission check for save button
2. Implement `useProfileSettingsREST` hook
3. Add 2FA configuration
4. Add notification preferences management
5. Add account activity log

---

#### File: `react/src/feature-module/settings/systemSettings/emailSettings.tsx`

**Component:** Email Settings
**Route:** `emailSettings` → `/system-settings/email-settings`
**Module:** Settings → System Settings

**Current Features:**
- SMTP configuration
- Email template selection
- Test email functionality
- Email protocol settings

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Save Configuration" button | Needs permission check |
| Read | Settings view | - |
| Update | Edit configuration | Needs permission check |
| Test | "Send Test Email" button | Needs permission check |

**Required Permissions:**
- `settings.email.read` - View email settings
- `settings.email.update` - Modify email configuration
- `settings.email.test` - Send test emails
- `settings.email.templates` - Manage email templates

**Required Updates:**
1. Add permission check for all save/test buttons
2. Implement `useEmailSettingsREST` hook
3. Add email template editor
4. Add email queue monitoring
5. Implement email sending log

---

### 8. DASHBOARD MODULE COMPONENTS

#### File: `react/src/feature-module/mainMenu/hrDashboard/index.tsx`

**Component:** HR Dashboard
**Route:** `hrDashboard` → `/hr-dashboard`
**Module:** Main Menu → Dashboards

**Current Features:**
- Employee statistics cards
- Leave overview chart
- Attendance summary
- Recruitment metrics
- Quick action buttons

**Dashboard Widgets:**
- Total Employees card
- Present Today card
- On Leave card
- New Hires card
- Department distribution chart
- Leave trend chart

**Required Permissions:**
- `dashboard.hr.read` - View HR dashboard
- `employees.read` - View employee stats
- `leaves.read` - View leave stats
- `attendance.read` - View attendance stats
- `recruitment.read` - View recruitment stats

**Required Updates:**
1. Create `useHRDashboardREST` hook
2. Add permission-based widget visibility
3. Implement date range filter
4. Add drill-down to details
5. Implement dashboard customization

---

### 9. PAGES MODULE COMPONENTS

#### File: `react/src/feature-module/pages/profile/index.tsx`

**Component:** User Profile Page
**Route:** `profile` → `/pages/profile`
**Module:** Pages

**Current Features:**
- User profile display
- Profile image upload
- Personal information
- Bank details section
- Education history
- Work experience

**Profile Sections:**
- Personal Information (Editable)
- Bank Information (Editable)
- Education (Add/Remove)
- Experience (Add/Remove)
- Family Information
- Documents (Upload/View)

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Update | "Edit Profile" button | Needs permission check |
| Read | Profile view | Self-view only |
| Create | Add Education/Experience | Needs permission check |
| Delete | Remove Education/Experience | Needs permission check |
| Upload | Profile Image Upload | Needs permission check |

**Required Permissions:**
- `profile.read` - View own profile
- `profile.read.self` - Always allowed for self
- `profile.update` - Edit own profile
- `profile.update.self` - Always allowed for self
- `profile.image.upload` - Upload profile image
- `profile.education.manage` - Manage education history
- `profile.experience.manage` - Manage work history

**Required Updates:**
1. Add `PermissionField` wrapper for editable fields
2. Implement `useProfileREST` hook
3. Add profile image upload permission check
4. Implement education/experience CRUD with permissions
5. Add document upload with permission check

---

#### File: `react/src/feature-module/pages/api-keys/index.tsx`

**Component:** API Keys Management
**Route:** `apikey` → `/api-keys`
**Module:** Pages

**Current Features:**
- API Keys listing table
- Generate new key button
- Revoke/Delete key operations
- Key permissions display
- Last used tracking

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Generate Key" button | Needs permission check |
| Read | API Keys table | Filter by status |
| Update | Edit key permissions | Needs permission check |
| Delete | Revoke/Delete key | Needs permission check |

**Required Permissions:**
- `apikeys.create` - Generate new API keys
- `apikeys.read` - View API keys list
- `apikeys.update` - Edit key permissions
- `apikeys.delete` - Revoke/delete keys
- `apikeys.manage` - Full API key management

**Required Updates:**
1. Add `PermissionButton` for generate/revoke
2. Implement `useApiKeysREST` hook
3. Add key expiration notification
4. Implement key usage analytics
5. Add key permission template system

---

### 10. PERFORMANCE MODULE COMPONENTS

#### File: `react/src/feature-module/performance/performanceIndicator.tsx`

**Component:** Performance Indicator
**Route:** `performanceIndicator` → `/performance/performance-indicator`
**Module:** HRM → Performance

**Current Features:**
- KPI listing with targets
- Add/Edit/Delete indicator operations
- Employee performance tracking
- Progress bars for achievement

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Indicator" button | Needs permission check |
| Read | Indicators table view | Filter by period/employee |
| Update | Edit icon in actions | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |

**Required Permissions:**
- `performance.create` - Create performance indicators
- `performance.read` - View performance data
- `performance.read.self` - View own performance
- `performance.update` - Edit indicators
- `performance.delete` - Delete indicators
- `performance.approve` - Approve performance reviews

**Required Updates:**
1. Add `PermissionButton` for all CRUD operations
2. Implement `usePerformanceREST` hook
3. Add KPI template library
4. Implement performance goal setting
5. Add performance reporting

---

#### File: `react/src/feature-module/performance/performanceReview.tsx`

**Component:** Performance Review
**Route:** `performanceReview` → `/performance/performance-review`
**Module:** HRM → Performance

**Current Features:**
- Review listing table
- Create review functionality
- Review status tracking
- Employee feedback system

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Review" button | Needs permission check |
| Read | Reviews table view | Filter by employee/period |
| Update | Edit review | Needs permission check |
| Submit | Submit review button | Needs permission check |

**Required Permissions:**
- `performance.reviews.create` - Create performance reviews
- `performance.reviews.read` - View reviews
- `performance.reviews.self` - View own reviews
- `performance.reviews.update` - Edit reviews
- `performance.reviews.submit` - Submit completed reviews
- `performance.reviews.approve` - Approve reviews

**Required Updates:**
1. Add `PermissionButton` for create/submit
2. Implement review workflow states
3. Add employee self-assessment
4. Implement multi-level review approval
5. Add review comment system

---

### 11. USER MANAGEMENT MODULE COMPONENTS

#### File: `react/src/feature-module/userManagement/rolesPermissions.tsx`

**Component:** Roles & Permissions Management
**Route:** `rolesPermissions` → `/user-management/roles-permissions`
**Module:** User Management → Administration

**Current Features:**
- Roles listing with status
- Add/Edit/Delete role operations
- Permission matrix for assignment
- Role hierarchy display

**CRUD Operations:**
| Operation | Button/Action | Current Implementation |
|-----------|----------------|----------------------|
| Create | "Add Role" button | Needs permission check |
| Read | Roles table view | Filter by status |
| Update | Edit icon + Shield icon | Needs permission check |
| Delete | Delete icon in actions | Needs permission check |
| Manage | Permission page link | Needs permission check |

**Required Permissions:**
- `roles.create` - Create new roles
- `roles.read` - View role list
- `roles.update` - Edit role details
- `roles.delete` - Delete roles
- `roles.permissions` - Manage role permissions
- `roles.users` - View users per role

**Required Updates:**
1. Add `PermissionButton` for all actions
2. Implement permission matrix component
3. Add role inheritance visualization
4. Implement bulk permission assignment
5. Add role usage analytics

---

### 12. HOOKS ANALYSIS

#### Existing Hooks Catalog:

| Hook | Purpose | RBAC Integration Needed |
|-------|---------|------------------------|
| `useAuth.ts` | Clerk authentication | Load user permissions |
| `useEmployeesREST.ts` | Employee API calls | Add permission checks |
| `useDepartmentsREST.ts` | Department API calls | Add permission checks |
| `useDesignationsREST.ts` | Designation API calls | Add permission checks |
| `useLeaveREST.ts` | Leave API calls | Add permission checks |
| `useAttendanceREST.ts` | Attendance API calls | Add permission checks |
| `useShiftsREST.ts` | Shift API calls | Add permission checks |
| `useOvertimeREST.ts` | Overtime API calls | Add permission checks |
| `useTimesheetsREST.ts` | Timesheet API calls | Add permission checks |
| `usePipelinesREST.ts` | Pipeline API calls | Add permission checks |
| `useLeadsREST.ts` | Leads API calls | Add permission checks |
| `useDeals.ts` | Deals API calls | Add permission checks |
| `useContacts.ts` | Contacts API calls | Add permission checks |
| `useClients.ts` | Client API calls | Add permission checks |
| `useProjectsREST.ts` | Project API calls | Add permission checks |
| `useTasksREST.ts` | Task API calls | Add permission checks |
| `useJobs.ts` | Jobs API calls | Add permission checks |
| `useCandidates.ts` | Candidates API calls | Add permission checks |
| `useHolidayREST.ts` | Holiday API calls | Add permission checks |
| `useHRDashboardREST.ts` | HR Dashboard API calls | Add permission checks |
| `useProfileRest.ts` | Profile API calls | Add permission checks |
| `usePromotionsREST.ts` | Promotion API calls | Add permission checks |
| `useResignationsREST.ts` | Resignation API calls | Add permission checks |
| `useTerminationsREST.ts` | Termination API calls | Add permission checks |
| `useBatchesREST.ts` | Batches API calls | Add permission checks |
| `useMilestonesREST.ts` | Milestone API calls | Add permission checks |
| `useResourcesREST.ts` | Resources API calls | Add permission checks |
| `useTaskStatusREST.ts` | Task Status API calls | Add permission checks |
| `useTimeTrackingREST.ts` | Time tracking API calls | Add permission checks |
| `useBudgetsREST.ts` | Budget API calls | Add permission checks |
| `useActivitiesREST.ts` | Activities API calls | Add permission checks |
| `useAdminDashboardREST.ts` | Admin Dashboard API calls | Add permission checks |
| `useUserProfileREST.ts` | User Profile API calls | Add permission checks |

**Required Hook Updates:**
1. Add permission validation before API calls
2. Return permission-aware data
3. Handle 403 Forbidden responses
4. Cache user permissions
5. Provide permission check utilities

---

## PHASE 3 ANALYSIS SUMMARY

### Component Statistics:

| Category | Components Analyzed | Key Findings |
|-----------|---------------------|----------------|
| Super Admin | 8 | All need permission-based CRUD |
| HRM | 18 | Extensive permission requirements |
| Finance & Accounts | 11 | Approval workflows needed |
| CRM | 3 | Lead conversion needs permissions |
| Projects | 9 | Task assignment permissions |
| Recruitment | 15 | Candidate hiring permissions |
| Settings | 37 | System settings need admin permissions |
| Dashboards | 7 | Widget-level permissions |
| Pages | 14 | Self vs admin permissions |
| Performance | 5 | Review permissions |
| User Management | 3 | Role management permissions |
| UI Interface | 51 | No permissions needed |
| Hooks | 30+ | All need permission integration |
| Router | 4 | Route protection needed |
| Services | 1 | API service permissions |
| Types | 2 | Permission interfaces needed |
| Utils | 2 | Validation utilities |

**Total Components Requiring Updates:** ~180+

### Critical Implementation Points:

1. **All CRUD buttons need `PermissionButton` wrapper**
2. **All tables need permission-based column filtering**
3. **All forms need field-level permission checks**
4. **All API calls need permission validation**
5. **All routes need page access protection**

---

**Phase 3 Analysis Complete**
**Total Feature Module Files Analyzed: 200+ files**
