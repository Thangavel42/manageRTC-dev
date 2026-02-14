# Report 2: Implementation Plan for Dynamic Role-Based Access Control

**Generated**: 2026-02-12
**Purpose**: Comprehensive roadmap for implementing dynamic, permission-based RBAC

---

## Table of Contents
1. [Required Database Changes](#1-required-database-changes)
2. [Required Backend Changes](#2-required-backend-changes)
3. [Required Frontend Changes](#3-required-frontend-changes)
4. [Required Route Protection Changes](#4-required-route-protection-changes)
5. [Required Dynamic Menu Rendering](#5-required-dynamic-menu-rendering)
6. [Required Button-Level Permission Control](#6-required-button-level-permission-control)
7. [Required Validation & Middleware](#7-required-validation--middleware-changes)
8. [Implementation Phases](#8-implementation-phases)

---

## 1. Required Database Changes

### 1.1 Permission Collection Updates

**Current State**: Partially implemented
**Required Changes**:

```javascript
// Ensure all permissions have pageId reference
Permission.updateMany(
  { pageId: { $exists: false } },
  { $set: { pageId: <corresponding_page_id> } }
)
```

**Migration Script**: [backend/scripts/migrate-rbac-refs.js](../../scripts/migrate-rbac-refs.js)

### 1.2 Page Collection Completion

**Required Action**: Create missing pages

| Category | Pages to Create | Purpose |
|----------|-----------------|---------|
| hrm | employees-list, departments, designations, policies, tickets-list, tickets-detail | HR module pages |
| projects | clients, projects, tasks, task-board | Project management |
| crm | contacts, companies, deals, leads, pipeline, analytics, activities | CRM module |
| finance | All finance sub-module pages | Finance & accounting |
| administration | All admin pages | Admin module |

**Script**: [backend/scripts/seedPages.js](../../scripts/seedPages.js)

### 1.3 Module-Pages Relationships

**Update Script**:
```javascript
// For each module, populate pages array with proper pageIds
Module.updateMany(
  {},
  { $set: { pages: [...] } // Array of { pageId: ObjectId, visible: true }
)
```

### 1.4 Role Migration to Embedded Permissions

**Status**: Partially complete
**Remaining**:
```javascript
// Migrate all roles to use embedded permissions
// Role schema already supports this
// Need to populate for all custom roles
```

### 1.5 Indexes for Performance

```javascript
// Create compound indexes for efficient permission checks
db.Permission.createIndex({ module: 1, category: 1, isActive: 1 })
db.Role.createIndex({ 'permissions.module': 1, 'permissions.actions.all': 1 })
db.Page.createIndex({ route: 1, base: 1 })
```

---

## 2. Required Backend Changes

### 2.1 New Middleware Functions

**File**: [backend/middleware/pageAccess.js](../../middleware/pageAccess.js) (NEW)

```javascript
/**
 * Check if user has permission for specific page and action
 */
export const requirePageAccess = (pageBase, action = 'read') => {
  return async (req, res, next) => {
    const user = req.user;
    const role = await Role.findOne({ name: user.role });

    // Find permission for this page
    const pagePermission = role.permissions.find(p => p.module === pageBase);

    if (!pagePermission) {
      return res.status(403).json({ error: 'No access to this page' });
    }

    // Check action permission
    if (pagePermission.actions.all) {
      return next();
    }

    if (!pagePermission.actions[action]) {
      return res.status(403).json({
        error: `Permission denied: ${action} action not allowed`
      });
    }

    next();
  };
};

/**
 * Check field-level permission
 */
export const requireFieldAccess = (pageBase, field) => {
  // TODO: Implement field-level checks
};

/**
 * Check multiple permissions (OR condition)
 */
export const requireAnyPermission = (permissionModules) => {
  // For pages accessible via multiple permissions
};
```

### 2.2 Update Authentication Middleware

**File**: [backend/middleware/auth.js](../../middleware/auth.js)

```javascript
/**
 * NEW: Permission-based route protection
 * Replaces requireRole() for most routes
 */
export const requirePermission = (module, action = 'read') => {
  return async (req, res, next) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get user's role with permissions
    const role = await Role.findOne({ name: user.role })
      .select('permissions').lean();

    if (!role) {
      return res.status(403).json({ error: 'Invalid role' });
    }

    // Check permission for module
    const hasPermission = role.permissions?.some(p => {
      if (p.module !== module) return false;
      if (p.actions.all) return true;
      return p.actions[action] === true;
    });

    if (!hasPermission) {
      return res.status(403).json({
        error: `Permission denied: ${module}.${action}`
      });
    }

    // Attach permissions to request for use in controllers
    req.userPermissions = role.permissions;
    next();
  };
};

/**
 * NEW: Check if user can access specific company resource
 */
export const requireCompanyAccess = (resourceType) => {
  return async (req, res, next) => {
    const { companyId } = req.params;
    const userCompanyId = req.user.companyId;

    if (req.user.role === 'superadmin') {
      return next();
    }

    if (companyId !== userCompanyId) {
      return res.status(403).json({
        error: 'Cannot access resources from other companies'
      });
    }

    next();
  };
};
```

### 2.3 Service Layer Updates

**Pattern to Apply** across all services:

```javascript
/**
 * Template for permission-aware service functions
 */
export async function serviceMethod(params, user) {
  // 1. Get user's role permissions
  const role = await Role.findOne({ name: user.role })
    .select('permissions').lean();

  // 2. Check read permission
  const canRead = checkPermission(role, 'module.name', 'read');
  if (!canRead) {
    return { success: false, error: 'Permission denied' };
  }

  // 3. Build query with company isolation
  const query = {
    companyId: user.companyId,
    ...buildRoleBasedFilter(user, role)
  };

  // 4. Execute query
  const results = await Collection.find(query);

  // 5. Filter results based on field permissions
  return filterFields(results, role, 'module.name');
}
```

**Services Requiring Updates**:

| Service | Required Changes |
|----------|------------------|
| [backend/services/hr/hrm.employee.js](../../services/hr/hrm.employee.js) | Replace employee permissions with role-based filtering |
| [backend/services/timeTracking/timeTracking.service.js](../../services/timeTracking/timeTracking.service.js) | Add approval permission checks |
| [backend/services/tickets/tickets.services.js](../../services/tickets/tickets.services.js) | Role-based ticket visibility |
| [backend/services/project/project.services.js](../../services/project/project.services.js) | Team-based project access |
| [backend/services/assets/assets.services.js](../../services/assets/assets.services.js) | Assignment-based access |
| [backend/services/leaveValidation.js](../../services/leaveValidation.js) | Already good, minor updates |

### 2.4 Controller Layer Updates

**Pattern**:
```javascript
/**
 * Permission-aware controller
 */
export async function getEmployees(req, res) {
  // Permissions already attached by middleware
  const permissions = req.userPermissions;

  // Get data with role-based filtering
  const result = await employeeService.getEmployees(
    req.user,
    { companyId: req.user.companyId }
  );

  // Filter fields based on permissions
  const filteredResult = applyFieldRestrictions(result, permissions);

  res.json(filteredResult);
}

export async function createEmployee(req, res) {
  const permissions = req.userPermissions;

  // Check create permission
  const canCreate = hasPermission(permissions, 'hrm.employees-list', 'create');
  if (!canCreate) {
    return res.status(403).json({ error: 'Cannot create employees' });
  }

  // Proceed with creation
  const result = await employeeService.createEmployee(req.body, req.user);
  res.json(result);
}
```

---

## 3. Required Frontend Changes

### 3.1 Permission Context/Hook

**File**: `react/src/contexts/PermissionContext.jsx` (NEW)

```javascript
import { createContext, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';

const PermissionContext = createContext();

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  return context;
};

export const PermissionProvider = ({ children }) => {
  const { data: permissions } = useQuery({
    queryKey: ['user-permissions'],
    queryFn: async () => {
      const response = await fetch('/api/rbac/my-permissions');
      return response.json();
    }
  });

  const hasPermission = (module, action = 'read') => {
    if (!permissions) return false;

    const perm = permissions.find(p => p.module === module);
    if (!perm) return false;

    if (perm.actions.all) return true;
    return perm.actions[action] === true;
  };

  const canRead = (module) => hasPermission(module, 'read');
  const canWrite = (module) => hasPermission(module, 'write');
  const canCreate = (module) => hasPermission(module, 'create');
  const canDelete = (module) => hasPermission(module, 'delete');
  const canApprove = (module) => hasPermission(module, 'approve');

  return {
    permissions,
    hasPermission,
    canRead,
    canWrite,
    canCreate,
    canDelete,
    canApprove
  };
};
```

### 3.2 Permission Guard Component

**File**: `react/src/components/PermissionGuard.jsx` (NEW)

```javascript
import { usePermissions } from '../contexts/PermissionContext';

export const PermissionGuard = ({
  module,
  action = 'read',
  fallback = null,
  children
}) => {
  const { hasPermission } = usePermissions();

  if (!hasPermission(module, action)) {
    return fallback || null;
  }

  return children;
};

// Usage examples:
// <PermissionGuard module="hrm.employees-list" action="create">
//   <button>Add Employee</button>
// </PermissionGuard>
//
// <PermissionGuard module="hrm.employees-list" action="delete" fallback={<span>Read-only</span>}>
//   <button>Delete</button>
// </PermissionGuard>
```

### 3.3 Button Component Wrapper

**File**: `react/src/components/PermissionButton.jsx` (NEW)

```javascript
import { PermissionGuard } from './PermissionGuard';

export const PermissionButton = ({
  module,
  action,
  icon,
  label,
  variant = 'primary',
  ...props
}) => {
  return (
    <PermissionGuard module={module} action={action}>
      <button className={`btn btn-${variant}`} {...props}>
        {icon && <i className={icon}></i>}
        {label}
      </button>
    </PermissionGuard>
  );
};
```

---

## 4. Required Route Protection Changes

### 4.1 Route Wrapper Component

**File**: `react/src/components/ProtectedRoute.jsx` (UPDATE)

```javascript
import { usePermissions } from '../contexts/PermissionContext';
import { Navigate } from 'react-router-dom';

export const ProtectedRoute = ({
  path,
  element: Component,
  requiredModule,
  requiredAction = 'read'
}) => {
  const { hasPermission } = usePermissions();
  const user = useUser(); // From auth context

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredModule && !hasPermission(requiredModule, requiredAction)) {
    return <Navigate to="/unauthorized" />;
  }

  return <Component />;
};

// Usage in routes:
// <ProtectedRoute
//   path="/employees"
//   element={<EmployeeList />}
//   requiredModule="hrm.employees-list"
// />
```

### 4.2 App.jsx Updates

```javascript
import { PermissionProvider } from './contexts/PermissionContext';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <PermissionProvider>
      <Routes>
        {routes.map(route => (
          <ProtectedRoute
            key={route.path}
            path={route.path}
            element={route.element}
            requiredModule={route.requiredModule}
            requiredAction={route.requiredAction}
          />
        ))}
      </Routes>
    </PermissionProvider>
  );
}
```

---

## 5. Required Dynamic Menu Rendering

### 5.1 Sidebar Menu Component

**File**: `react/src/core/data/json/sidebarMenu.jsx` (UPDATE)

**Current State**: Static menu based on user role

**Required Changes**: Dynamic menu based on user permissions

```javascript
/**
 * Generate menu items based on user permissions
 */
export const getSidebarMenu = (permissions) => {
  const menuItems = [];

  // Super Admin
  if (permissions.some(p => p.category === 'super-admin')) {
    menuItems.push(
      {
        label: 'Super Admin',
        icon: 'ri-superadmin-line',
        base: 'super-admin',
        submenu: true,
        showSubRoute: false,
        submenuItems: [
          {
            link: routes.superAdminDashboard,
            base: 'super-admin-dashboard',
            label: 'Dashboard',
            icon: 'ri-dashboard-line'
          },
          // Add other superadmin items if permission exists
        ].filter(item =>
          hasPermission(permissions, item.base, 'read')
        )
      }
    );
  }

  // HRM Module
  const hrmPermissions = permissions.filter(p => p.category === 'hrm');
  if (hrmPermissions.length > 0) {
    menuItems.push({
      label: 'HRM',
      icon: 'ri-team-line',
      base: 'hrm',
      submenu: true,
      submenuItems: [
        {
          link: routes.employeesList,
          base: 'employees-list',
          label: 'Employees',
          icon: 'ri-user-line',
          requiredPermission: 'hrm.employees-list'
        },
        {
          link: routes.departments,
          base: 'departments',
          label: 'Departments',
          icon: 'ri-building-line',
          requiredPermission: 'hrm.departments'
        },
        // ... other HRM items
      ].filter(item =>
        hasPermission(permissions, item.requiredPermission, 'read')
      )
    });
  }

  return menuItems;
};
```

### 5.2 Menu Integration

**File**: `react/src/layout/Sidebar.jsx` (UPDATE)

```javascript
import { getSidebarMenu } from '../core/data/json/sidebarMenu';
import { usePermissions } from '../contexts/PermissionContext';

export const Sidebar = () => {
  const { permissions } = usePermissions();
  const menuItems = getSidebarMenu(permissions);

  return (
    <nav>
      {menuItems.map(item => (
        <MenuItem key={item.base} {...item} />
      ))}
    </nav>
  );
};
```

---

## 6. Required Button-Level Permission Control

### 6.1 Common Button Patterns

**Add Button**:
```javascript
<PermissionButton
  module="hrm.employees-list"
  action="create"
  label="Add Employee"
  icon="ri-add-line"
/>
```

**Edit Button**:
```javascript
<PermissionButton
  module="hrm.employees-list"
  action="write"
  label="Edit"
  icon="ri-edit-line"
/>
```

**Delete Button**:
```javascript
<PermissionButton
  module="hrm.employees-list"
  action="delete"
  label="Delete"
  icon="ri-delete-bin-line"
  variant="danger"
/>
```

**Approve/Reject Buttons**:
```javascript
<PermissionGuard module="hrm.leaves-admin" action="approve">
  <button onClick={onApprove}>Approve</button>
</PermissionGuard>

<PermissionGuard module="hrm.leaves-admin" action="reject">
  <button onClick={onReject}>Reject</button>
</PermissionGuard>
```

### 6.2 Table Action Columns

**File**: Table components need permission-aware action columns

```javascript
const getActionColumns = (permissions, item) => {
  const columns = [];

  // View action
  columns.push({
    icon: 'ri-eye-line',
    tooltip: 'View',
    onClick: () => onView(item)
  });

  // Edit action
  if (hasPermission(permissions, 'module.name', 'write')) {
    columns.push({
      icon: 'ri-edit-line',
      tooltip: 'Edit',
      onClick: () => onEdit(item)
    });
  }

  // Delete action
  if (hasPermission(permissions, 'module.name', 'delete')) {
    columns.push({
      icon: 'ri-delete-bin-line',
      tooltip: 'Delete',
      onClick: () => onDelete(item)
    });
  }

  return columns;
};
```

---

## 7. Required Validation & Middleware

### 7.1 Backend Middleware Chain

**Recommended Order**:
```javascript
router.post('/api/employees',
  attachRequestId,        // 1. Request tracking
  authenticate,            // 2. JWT validation
  requireCompany,          // 3. Company validation
  requirePermission(        // 4. Permission check (NEW)
    'hrm.employees-list',
    'create'
  ),
  validateBody(employeeSchema), // 5. Schema validation
  createEmployee           // 6. Controller
);
```

### 7.2 Frontend Form Validation

**Permission-Aware Validation**:
```javascript
const getValidationSchema = (permissions) => {
  const fields = {
    // Always visible
    firstName: { required: true },
    lastName: { required: true },
  };

  // Conditionally visible
  if (hasPermission(permissions, 'hrm.employees-list', 'write_salary')) {
    fields.salary = { required: true };
  }

  if (hasPermission(permissions, 'hrm.employees-list', 'write_bank')) {
    fields.bankAccount = { required: true };
  }

  return object(fields);
};
```

### 7.3 Audit Logging

**New Middleware**: `backend/middleware/auditLogger.js`

```javascript
export const auditLog = (action) => {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function(data) {
      // Log on success
      if (res.statusCode < 300) {
        await AuditLog.create({
          userId: req.user.userId,
          companyId: req.user.companyId,
          role: req.user.role,
          action,
          resource: req.path,
          timestamp: new Date()
        });
      }

      originalSend.call(this, data);
    };

    next();
  };
};

// Usage:
router.post('/employees',
  auditLog('employee.create'),
  // ... other middleware
  createEmployee
);
```

---

## 8. Implementation Phases

### Phase 1: Database & Foundation (Week 1-2)

**Tasks**:
1. ✅ Complete Page collection (all routes mapped to pages)
2. ✅ Run migration script for ObjectId references
3. ✅ Update all Roles with embedded permissions
4. ✅ Create database indexes for performance
5. ✅ Audit and fix any broken role-permission links

**Deliverables**:
- Complete RBAC database structure
- Migration script execution report
- Database performance indexes

### Phase 2: Backend Middleware (Week 3)

**Tasks**:
1. Create `pageAccess.js` middleware with permission checks
2. Update `auth.js` with `requirePermission()` function
3. Add audit logging middleware
4. Create permission helper utility functions

**Deliverables**:
- New middleware files
- Updated authentication flow
- Audit logging system

### Phase 3: Backend Service Updates (Week 4-5)

**Priority Services**:

| Priority | Service | Changes |
|----------|----------|----------|
| 1 | Employee | Replace permissions with role-based |
| 2 | Leave | Add permission checks to approve |
| 3 | Attendance | Role-based filtering |
| 4 | Projects | Team-based access |
| 5 | Assets | Assignment-based access |
| 6 | Time Tracking | Approval permissions |

**Deliverables**:
- Updated service files
- Permission-aware query builders
- Role-based data filtering

### Phase 4: Backend Routes Update (Week 6)

**Tasks**:
1. Replace `requireRole()` with `requirePermission()` in routes
2. Add action-level route protection
3. Update all CRUD endpoints

**Files to Update**:
- `backend/routes/api/*.js` (all API routes)
- `backend/routes/*.js` (root routes)

**Deliverables**:
- Permission-protected routes
- Action-level access control

### Phase 5: Frontend Foundation (Week 7)

**Tasks**:
1. Create PermissionContext
2. Create PermissionGuard component
3. Create PermissionButton component
4. Update ProtectedRoute component

**Deliverables**:
- Frontend permission infrastructure
- Reusable permission components

### Phase 6: Frontend Implementation (Week 8-9)

**Tasks**:
1. Update Sidebar with dynamic menu
2. Add permission checks to all tables
3. Update all forms with field-level permissions
4. Replace hardcoded buttons with PermissionButton

**Pages to Update**:
- All HRM pages
- All Project pages
- All Admin pages

**Deliverables**:
- Permission-aware UI components
- Dynamic menu system

### Phase 7: Testing & Validation (Week 10)

**Tasks**:
1. Unit tests for permission middleware
2. Integration tests for permission checks
3. E2E tests for role-based access
4. Security audit

**Deliverables**:
- Test suite for RBAC
- Security audit report
- Bug fixes

### Phase 8: Documentation & Training (Week 11)

**Tasks**:
1. Update RBAC documentation
2. Create developer guide for permissions
3. Create admin guide for role management
4. Create migration guide from old system

**Deliverables**:
- Complete documentation
- Training materials

---

## Success Criteria

### Functional Requirements

✅ **Granular Permissions**: All 244 permissions functional
✅ **Action-Level Control**: read, write, create, delete, approve working
✅ **Dynamic Menu**: Menu adapts to user permissions
✅ **Button Control**: All buttons permission-aware
✅ **Field-Level**: Sensitive fields can be hidden
✅ **Audit Trail**: All permission changes logged
✅ **Performance**: Permission checks < 50ms

### Security Requirements

✅ **No Hardcoded Roles**: All access via permissions
✅ **Cross-Tenant Isolation**: Company data separated
✅ **Session Management**: Concurrent sessions limited
✅ **IP Restrictions**: Optional IP whitelist for admins

### User Experience

✅ **Clear Errors**: "You don't have permission to..."
✅ **Request Access**: Button to request missing permissions
✅ **Consistent UI**: Same pattern across all pages

---

## Risk Mitigation

| Risk | Mitigation |
|-------|------------|
| Performance degradation | Add caching, use indexes |
| Broken access during migration | Run in phases, rollback plan |
| Permission confusion | Clear documentation, UI hints |
| Over-permissive users | Regular permission audits |

---

## Estimated Timeline

| Phase | Duration | Dependencies |
|--------|------------|--------------|
| Phase 1: Database | 2 weeks | None |
| Phase 2: Middleware | 1 week | Phase 1 |
| Phase 3: Services | 2 weeks | Phase 2 |
| Phase 4: Routes | 1 week | Phase 2 |
| Phase 5: Frontend Foundation | 1 week | Phase 2 |
| Phase 6: Frontend Implementation | 2 weeks | Phase 5 |
| Phase 7: Testing | 1 week | Phase 4, 6 |
| Phase 8: Documentation | 1 week | Phase 7 |

**Total**: 11-12 weeks

---

**End of Report 2**
