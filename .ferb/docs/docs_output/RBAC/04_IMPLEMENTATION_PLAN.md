# RBAC Implementation Plan
## Phase-by-Phase Implementation Guide

**Document Version:** 1.0
**Date:** February 10, 2026
**Estimated Duration:** 6-8 weeks

---

## Table of Contents
1. [Implementation Overview](#1-implementation-overview)
2. [Phase 1: Foundation (Week 1-2)](#2-phase-1-foundation-week-1-2)
3. [Phase 2: Backend Core (Week 3-4)](#3-phase-2-backend-core-week-3-4)
4. [Phase 3: Frontend Core (Week 5-6)](#4-phase-3-frontend-core-week-5-6)
5. [Phase 4: Integration & Testing (Week 7)](#5-phase-4-integration--testing-week-7)
6. [Phase 5: Packages & Company Features (Week 8)](#6-phase-5-packages--company-features-week-8)
7. [File Creation Checklist](#7-file-creation-checklist)
8. [Validation Criteria](#8-validation-criteria)

---

## 1. Implementation Overview

### 1.1 Implementation Strategy

**Approach:** Incremental implementation with backward compatibility

1. **Phase 1:** Setup database schemas and infrastructure
2. **Phase 2:** Build backend API and services
3. **Phase 3:** Create frontend components
4. **Phase 4:** Integrate with existing code
5. **Phase 5:** Add package and company features

### 1.2 Technology Stack

| Layer | Technology |
|-------|-----------|
| Database | MongoDB (Mongoose) |
| Backend API | Node.js, Express |
| Caching | Redis |
| Frontend | React, TypeScript |
| State | React Context |
| UI Components | Existing Bootstrap-based |

### 1.3 Dependencies

```json
{
  "backend": {
    "mongoose": "^8.0.0",
    "redis": "^4.6.0",
    "joi": "^17.11.0"
  },
  "frontend": {
    "react": "^18.2.0",
    "@tanstack/react-query": "^5.0.0"
  }
}
```

---

## 2. Phase 1: Foundation (Week 1-2)

### 2.1 Objectives
- Create all database schemas
- Setup seeding scripts
- Create base folder structure

### 2.2 Backend Tasks

#### Task 1.1: Create Folder Structure
```bash
# Create RBAC directories
mkdir -p backend/models/rbac
mkdir -p backend/controllers/rbac
mkdir -p backend/routes/api/rbac
mkdir -p backend/services/rbac
mkdir -p backend/middleware
mkdir -p backend/utils
```

#### Task 1.2: Create Schema Files
| File | Purpose |
|------|---------|
| `backend/models/rbac/role.schema.js` | Role definitions |
| `backend/models/rbac/permission.schema.js` | Permission definitions |
| `backend/models/rbac/rolePermission.schema.js` | Role-Permission junction |
| `backend/models/rbac/userRole.schema.js` | User-Role assignment |
| `backend/models/rbac/permissionPackage.schema.js` | Package definitions |
| `backend/models/rbac/companyPermission.schema.js` | Company permissions |
| `backend/models/rbac/permissionAudit.schema.js` | Audit trail |

**Reference:** See [03_DATABASE_SCHEMAS.md](./03_DATABASE_SCHEMAS.md)

#### Task 1.3: Create Seeding Script
```javascript
// backend/scripts/seedRbac.js
import mongoose from 'mongoose';
import { seedRoles, seedPermissions, seedRolePermissions } from '../services/rbac/seed.service.js';

async function seed() {
  await seedRoles();
  await seedPermissions();
  await seedRolePermissions();
  console.log('RBAC seeding completed');
}

seed().catch(console.error);
```

#### Task 1.4: Module Configuration File
```json
// react/src/core/data/json/moduleConfig.json
{
  "modules": [
    {
      "id": "super-admin.dashboard",
      "name": "Dashboard",
      "category": "super-admin",
      "route": "/super-admin/dashboard",
      "actions": ["all"],
      "sortOrder": 1
    },
    {
      "id": "hrm.employees",
      "name": "Employees",
      "category": "hrm",
      "route": "/employees",
      "actions": ["read", "create", "write", "delete", "import", "export"],
      "sortOrder": 1
    }
    // ... add all modules from requirements
  ]
}
```

### 2.3 Frontend Tasks

#### Task 1.5: Create Frontend Structure
```bash
# Create RBAC directories
mkdir -p react/src/feature-module/rbac/permission
mkdir -p react/src/feature-module/rbac/roles
mkdir -p react/src/feature-module/rbac/packages
mkdir -p react/src/core/rbac
mkdir -p react/src/core/rbac/hooks
```

#### Task 1.6: Create Types
```typescript
// react/src/core/rbac/types.ts
export interface Permission {
  _id: string;
  module: string;
  displayName: string;
  category: string;
  actions: string[];
  subPages?: SubPage[];
}

export interface Role {
  _id: string;
  name: string;
  displayName: string;
  type: 'system' | 'custom';
  level: number;
  isActive: boolean;
}

export interface RolePermission {
  permissionId: string;
  actions: {
    all: boolean;
    read: boolean;
    create: boolean;
    write: boolean;
    delete: boolean;
    import: boolean;
    export: boolean;
  };
}

export interface UserPermission {
  userId: string;
  primaryRole: Role;
  roles: Role[];
  permissions: Map<string, RolePermission>;
}
```

---

## 3. Phase 2: Backend Core (Week 3-4)

### 3.1 Objectives
- Create middleware for permission checking
- Build service layer
- Create API controllers and routes

### 3.2 Middleware

#### Task 2.1: Permission Middleware
```javascript
// backend/middleware/permission.middleware.js
import { getUserPermissions } from '../services/rbac/permission.service.js';

export const checkPermission = (module, action) => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const permissions = await getUserPermissions(user.id, user.companyId);

      if (!hasPermission(permissions, module, action)) {
        return res.status(403).json({
          success: false,
          error: { message: `Insufficient permissions for ${module}:${action}` }
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const checkRole = (allowedRoles) => {
  return async (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase();
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: { message: 'Access denied' }
      });
    }
    next();
  };
};
```

### 3.2 Service Layer

#### Task 2.2: Permission Service
```javascript
// backend/services/rbac/permission.service.js
import Role from '../../models/rbac/role.schema.js';
import RolePermission from '../../models/rbac/rolePermission.schema.js';
import UserRole from '../../models/rbac/userRole.schema.js';

export async function getUserPermissions(userId, companyId) {
  // Get user's primary role
  const userRole = await UserRole.getUserPrimaryRole(userId, companyId);
  if (!userRole) return null;

  // Get role permissions with inheritance
  const permissions = await getRoleWithPermissions(userRole.roleId, companyId);

  // Apply user-specific overrides
  const overrides = userRole.permissionOverrides || [];

  return {
    role: userRole.roleId,
    permissions: permissions,
    overrides: overrides,
    effective: calculateEffectivePermissions(permissions, overrides)
  };
}

export async function getRoleWithPermissions(roleId, companyId) {
  const rolePermissions = await RolePermission.find({ roleId, companyId })
    .populate('permissionId');

  const result = {};
  for (const rp of rolePermissions) {
    result[rp.permissionId.module] = rp.actions;
  }

  // Handle inheritance
  const role = await Role.findById(roleId);
  if (role?.inheritsFrom) {
    const parentPermissions = await getRoleWithPermissions(role.inheritsFrom, companyId);
    return { ...parentPermissions, ...result };
  }

  return result;
}

export function hasPermission(permissions, module, action) {
  if (!permissions) return false;

  const modulePerms = permissions.effective?.[module];
  if (!modulePerms) return false;

  if (modulePerms.all) return true;
  return modulePerms[action] === true;
}
```

#### Task 2.3: Role Service
```javascript
// backend/services/rbac/role.service.js
import Role from '../../models/rbac/role.schema.js';
import RolePermission from '../../models/rbac/rolePermission.schema.js';

export async function createRole(data) {
  const role = new Role(data);
  await role.save();
  return role;
}

export async function updateRole(roleId, data) {
  const role = await Role.findByIdAndUpdate(roleId, data, { new: true });
  return role;
}

export async function deleteRole(roleId) {
  const role = await Role.findByIdAndUpdate(roleId, {
    isDeleted: true,
    deletedAt: new Date()
  });
  return role;
}

export async function getRoles(companyId, filters = {}) {
  const query = { companyId, isDeleted: false, ...filters };
  return Role.find(query).sort({ level: 1 });
}

export async function assignPermissions(roleId, companyId, permissions) {
  // Delete existing permissions
  await RolePermission.deleteMany({ roleId, companyId });

  // Create new permissions
  const docs = permissions.map(p => ({
    roleId,
    companyId,
    permissionId: p.permissionId,
    actions: p.actions
  }));

  await RolePermission.insertMany(docs);
  return true;
}
```

### 3.3 Controllers

#### Task 2.4: Role Controller
```javascript
// backend/controllers/rbac/role.controller.js
import { createRole, updateRole, deleteRole, getRoles, assignPermissions } from '../../services/rbac/role.service.js';
import { asyncHandler, sendCreated, sendSuccess } from '../../middleware/errorHandler.js';

export const create = asyncHandler(async (req, res) => {
  const role = await createRole(req.body);
  return sendCreated(res, role, 'Role created successfully');
});

export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const role = await updateRole(id, req.body);
  return sendSuccess(res, role, 'Role updated successfully');
});

export const remove = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await deleteRole(id);
  return sendSuccess(res, null, 'Role deleted successfully');
});

export const list = asyncHandler(async (req, res) => {
  const { companyId } = req.user;
  const roles = await getRoles(companyId, req.query);
  return sendSuccess(res, roles);
});

export const getPermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { companyId } = req.user;
  const permissions = await RolePermission.find({ roleId: id, companyId })
    .populate('permissionId');
  return sendSuccess(res, permissions);
});

export const setPermissions = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { companyId } = req.user;
  const { permissions } = req.body;
  await assignPermissions(id, companyId, permissions);
  return sendSuccess(res, null, 'Permissions assigned successfully');
});

export default {
  create, update, remove, list, getPermissions, setPermissions
};
```

#### Task 2.5: Permission Controller
```javascript
// backend/controllers/rbac/permission.controller.js
import Permission from '../../models/rbac/permission.schema.js';
import { asyncHandler, sendSuccess } from '../../middleware/errorHandler.js';

export const list = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const filter = category ? { category } : {};
  const permissions = await Permission.find(filter).sort({ category: 1, sortOrder: 1 });
  return sendSuccess(res, permissions);
});

export const getModules = asyncHandler(async (req, res) => {
  const modules = await Permission.aggregate([
    { $group: { _id: '$category', modules: { $push: '$$ROOT' } } },
    { $sort: { _id: 1 } }
  ]);
  return sendSuccess(res, modules);
});

export default { list, getModules };
```

### 3.4 Routes

#### Task 2.6: Create Routes
```javascript
// backend/routes/api/rbac/roles.js
import express from 'express';
import roleController from '../../../controllers/rbac/role.controller.js';
import { authenticate } from '../../../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.route('/')
  .get(roleController.list)
  .post(roleController.create);

router.route('/:id')
  .get(roleController.getPermissions)
  .put(roleController.update)
  .delete(roleController.remove);

router.route('/:id/permissions')
  .get(roleController.getPermissions)
  .put(roleController.setPermissions);

export default router;

// backend/routes/api/rbac/permissions.js
import express from 'express';
import permissionController from '../../../controllers/rbac/permission.controller.js';
import { authenticate } from '../../../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', permissionController.list);
router.get('/modules', permissionController.getModules);

export default router;
```

---

## 4. Phase 3: Frontend Core (Week 5-6)

### 4.1 Objectives
- Create permission context and hooks
- Build reusable permission components
- Create role management pages

### 4.2 Permission Context

#### Task 3.1: Permission Context
```typescript
// react/src/core/rbac/PermissionContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserPermission } from './types';

interface PermissionContextValue {
  permissions: UserPermission | null;
  loading: boolean;
  checkPermission: (module: string, action: string) => boolean;
  hasAnyPermission: (modules: string[]) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextValue | null>(null);

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<UserPermission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    // Fetch from API
    const response = await fetch('/api/rbac/permissions/me');
    const data = await response.json();
    setPermissions(data);
    setLoading(false);
  };

  const checkPermission = (module: string, action: string): boolean => {
    if (!permissions) return false;

    const modulePerms = permissions.effective[module];
    if (!modulePerms) return false;

    if (modulePerms.all) return true;
    return modulePerms[action] === true;
  };

  const hasAnyPermission = (modules: string[]): boolean => {
    return modules.some(module => checkPermission(module, 'read'));
  };

  return (
    <PermissionContext.Provider value={{
      permissions,
      loading,
      checkPermission,
      hasAnyPermission,
      refreshPermissions: loadPermissions
    }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within PermissionProvider');
  }
  return context;
};
```

### 4.3 Permission Components

#### Task 3.2: PermissionGuard Component
```typescript
// react/src/core/rbac/PermissionGuard.tsx
import React from 'react';
import { usePermissions } from './PermissionContext';
import { Navigate } from 'react-router-dom';

interface PermissionGuardProps {
  module: string;
  action?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  module,
  action = 'read',
  children,
  fallback = <Navigate to="/unauthorized" />
}) => {
  const { checkPermission, loading } = usePermissions();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!checkPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

#### Task 3.3: PermissionCheck Component
```typescript
// react/src/core/rbac/PermissionCheck.tsx
import React from 'react';
import { usePermissions } from './PermissionContext';

interface PermissionCheckProps {
  module: string;
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const PermissionCheck: React.FC<PermissionCheckProps> = ({
  module,
  action = 'read',
  fallback = null,
  children
}) => {
  const { checkPermission } = usePermissions();

  if (!checkPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
```

### 4.4 Permission Matrix Component

#### Task 3.4: PermissionMatrix Component
```typescript
// react/src/feature-module/rbac/permission/PermissionMatrix.tsx
import React, { useState } from 'react';
import { Permission, RolePermission } from '../../../core/rbac/types';

interface PermissionMatrixProps {
  permissions: Permission[];
  rolePermissions: Record<string, RolePermission>;
  onChange: (permissionId: string, actions: RolePermission['actions']) => void;
  readonly?: boolean;
}

const ACTIONS = ['read', 'create', 'write', 'delete', 'import', 'export'] as const;

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
  permissions,
  rolePermissions,
  onChange,
  readonly = false
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleActionChange = (permissionId: string, action: string) => {
    if (readonly) return;

    const current = rolePermissions[permissionId]?.actions || {
      all: false,
      read: false,
      create: false,
      write: false,
      delete: false,
      import: false,
      export: false
    };

    const newActions = {
      ...current,
      [action]: !current[action]
    };

    onChange(permissionId, newActions);
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) {
      acc[perm.category] = [];
    }
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="permission-matrix">
      <table className="table table-bordered">
        <thead>
          <tr>
            <th style={{ width: '30%' }}>Module</th>
            <th style={{ width: '10%' }}>All</th>
            {ACTIONS.map(action => (
              <th key={action} style={{ width: '10%', textTransform: 'capitalize' }}>
                {action}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(groupedPermissions).map(([category, perms]) => (
            <React.Fragment key={category}>
              <tr className="category-header">
                <td colSpan={8}>
                  <button
                    className="btn btn-link"
                    onClick={() => toggleCategory(category)}
                  >
                    <i className={`ti ti-chevron-${expandedCategories.has(category) ? 'down' : 'right'}`} />
                    {category}
                  </button>
                </td>
              </tr>
              {expandedCategories.has(category) && perms.map(perm => (
                <tr key={perm._id}>
                  <td>{perm.displayName}</td>
                  <td>
                    <input
                      type="checkbox"
                      checked={rolePermissions[perm._id]?.actions?.all || false}
                      onChange={() => handleActionChange(perm._id, 'all')}
                      disabled={readonly}
                    />
                  </td>
                  {ACTIONS.map(action => (
                    <td key={action}>
                      <input
                        type="checkbox"
                        checked={rolePermissions[perm._id]?.actions?.[action] || false}
                        onChange={() => handleActionChange(perm._id, action)}
                        disabled={readonly}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### 4.5 Role Management Pages

#### Task 3.5: Update rolePermission.tsx
```typescript
// react/src/feature-module/super-admin/rolePermission.tsx
import React, { useState, useEffect } from 'react';
import { all_routes } from '../router/all_routes';
import { Link } from 'react-router-dom';
import Table from '../../core/common/dataTable/index';
import { Role } from '../../core/rbac/types';
import { PermissionMatrix } from '../rbac/permission/PermissionMatrix';

const RolesPermission = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState({});

  // Fetch roles
  useEffect(() => {
    fetch('/api/rbac/roles')
      .then(res => res.json())
      .then(data => setRoles(data.data));
  }, []);

  // Fetch permissions when role selected
  useEffect(() => {
    if (selectedRole) {
      fetch(`/api/rbac/roles/${selectedRole._id}/permissions`)
        .then(res => res.json())
        .then(data => {
          const rpMap = {};
          data.data.forEach(rp => {
            rpMap[rp.permissionId._id] = rp;
          });
          setRolePermissions(rpMap);
        });

      fetch('/api/rbac/permissions/modules')
        .then(res => res.json())
        .then(data => setPermissions(data.data));
    }
  }, [selectedRole]);

  const columns = [
    { title: 'Role', dataIndex: 'displayName' },
    { title: 'Type', dataIndex: 'type' },
    { title: 'Level', dataIndex: 'level' },
    { title: 'Status', dataIndex: 'isActive' },
    {
      title: 'Actions',
      render: (_: any, record: Role) => (
        <button onClick={() => setSelectedRole(record)}>
          <i className="ti ti-shield" /> Permissions
        </button>
      )
    }
  ];

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="page-breadcrumb">
          <h2>Roles & Permissions</h2>
          <Link to={all_routes.adminDashboard}>Dashboard</Link>
        </div>

        {!selectedRole ? (
          <div className="card">
            <Table dataSource={roles} columns={columns} />
          </div>
        ) : (
          <div className="card">
            <div className="card-header">
              <h5>Permissions: {selectedRole.displayName}</h5>
              <button onClick={() => setSelectedRole(null)}>Back to Roles</button>
            </div>
            <PermissionMatrix
              permissions={permissions}
              rolePermissions={rolePermissions}
              onChange={(permissionId, actions) => {
                // Save permission changes
                fetch(`/api/rbac/roles/${selectedRole._id}/permissions`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    permissions: [{ permissionId, actions }]
                  })
                });
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default RolesPermission;
```

---

## 5. Phase 4: Integration & Testing (Week 7)

### 5.1 Objectives
- Integrate permission checks in existing controllers
- Update sidebar menu for dynamic filtering
- Update users page with role selection

### 5.2 Backend Integration

#### Task 4.1: Update Existing Controllers
For each controller file, add permission middleware:

```javascript
// Example: backend/controllers/rest/client.controller.js
import { checkPermission } from '../../middleware/permission.middleware.js';

// Add to existing routes
export const getClients = asyncHandler(async (req, res) => {
  // Permission check now in middleware
  const user = extractUser(req);
  // ... existing code
});
```

#### Task 4.2: Update Route Files
```javascript
// backend/routes/api/clients.js
import express from 'express';
import clientController from '../../controllers/rest/client.controller.js';
import { checkPermission } from '../../middleware/permission.middleware.js';

const router = express.Router();

router.get('/',
  checkPermission('crm.clients', 'read'),
  clientController.getClients
);

router.post('/',
  checkPermission('crm.clients', 'create'),
  clientController.createClient
);

router.put('/:id',
  checkPermission('crm.clients', 'write'),
  clientController.updateClient
);

router.delete('/:id',
  checkPermission('crm.clients', 'delete'),
  clientController.deleteClient
);
```

### 5.3 Frontend Integration

#### Task 4.3: Update Sidebar Menu
```jsx
// react/src/core/data/json/sidebarMenu.jsx
import { usePermissions } from '../rbac/PermissionContext';
import moduleConfig from './moduleConfig.json';

const useSidebarData = () => {
  const { checkPermission } = usePermissions();
  const { user } = useUser();
  const routes = all_routes;

  const filterMenuItem = (item) => {
    // Check if user has permission for this route
    const module = item.permissionModule;
    if (module && !checkPermission(module, 'read')) {
      return false;
    }

    // Filter submenu items
    if (item.submenuItems) {
      item.submenuItems = item.submenuItems.filter(filterMenuItem);
      return item.submenuItems.length > 0;
    }

    return true;
  };

  const menuItems = MENU_ITEMS.filter(filterMenuItem);

  return menuItems;
};
```

#### Task 4.4: Update Users Page
```typescript
// react/src/feature-module/super-admin/users.tsx
// Add role selection from database
const [roles, setRoles] = useState<Role[]>([]);

useEffect(() => {
  fetch('/api/rbac/roles')
    .then(res => res.json())
    .then(data => setRoles(data.data));
}, []);

// In modal
<select name="role" value={formData.role} onChange={handleChange}>
  {roles.map(role => (
    <option key={role._id} value={role._id}>
      {role.displayName}
    </option>
  ))}
</select>
```

---

## 6. Phase 5: Packages & Company Features (Week 8)

### 6.1 Objectives
- Implement permission packages
- Company-level permission overrides
- Package management UI

### 6.2 Package Controller
```javascript
// backend/controllers/rbac/package.controller.js
import PermissionPackage from '../../models/rbac/permissionPackage.schema.js';
import CompanyPermission from '../../models/rbac/companyPermission.schema.js';

export const getPackages = async (req, res) => {
  const packages = await PermissionPackage.find({ isActive: true });
  return sendSuccess(res, packages);
};

export const createPackage = async (req, res) => {
  const pkg = new PermissionPackage(req.body);
  await pkg.save();
  return sendCreated(res, pkg);
};

export const assignPackage = async (req, res) => {
  const { companyId, packageId, overrides } = req.body;

  const companyPerm = await CompanyPermission.findOneAndUpdate(
    { companyId },
    {
      packageId,
      permissionOverrides: overrides || [],
      subscription: { isActive: true }
    },
    { upsert: true, new: true }
  );

  return sendSuccess(res, companyPerm);
};

export default { getPackages, createPackage, assignPackage };
```

### 6.3 Package UI
```typescript
// react/src/feature-module/rbac/packages/PackageBuilder.tsx
const PackageBuilder = () => {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [permissions, setPermissions] = useState({});

  return (
    <div className="package-builder">
      {/* Module selection */}
      {/* Permission matrix */}
      {/* Package details */}
      {/* Save button */}
    </div>
  );
};
```

---

## 7. File Creation Checklist

### 7.1 Backend Files

| Status | File Path |
|--------|-----------|
| ⬜ | `backend/models/rbac/role.schema.js` |
| ⬜ | `backend/models/rbac/permission.schema.js` |
| ⬜ | `backend/models/rbac/rolePermission.schema.js` |
| ⬜ | `backend/models/rbac/userRole.schema.js` |
| ⬜ | `backend/models/rbac/permissionPackage.schema.js` |
| ⬜ | `backend/models/rbac/companyPermission.schema.js` |
| ⬜ | `backend/models/rbac/permissionAudit.schema.js` |
| ⬜ | `backend/services/rbac/permission.service.js` |
| ⬜ | `backend/services/rbac/role.service.js` |
| ⬜ | `backend/services/rbac/package.service.js` |
| ⬜ | `backend/services/rbac/seed.service.js` |
| ⬜ | `backend/controllers/rbac/role.controller.js` |
| ⬜ | `backend/controllers/rbac/permission.controller.js` |
| ⬜ | `backend/controllers/rbac/package.controller.js` |
| ⬜ | `backend/middleware/permission.middleware.js` |
| ⬜ | `backend/routes/api/rbac/roles.js` |
| ⬜ | `backend/routes/api/rbac/permissions.js` |
| ⬜ | `backend/routes/api/rbac/packages.js` |
| ⬜ | `backend/scripts/seedRbac.js` |
| ⬜ | `backend/utils/permissionHelper.js` |

### 7.2 Frontend Files

| Status | File Path |
|--------|-----------|
| ⬜ | `react/src/core/rbac/types.ts` |
| ⬜ | `react/src/core/rbac/PermissionContext.tsx` |
| ⬜ | `react/src/core/rbac/PermissionGuard.tsx` |
| ⬜ | `react/src/core/rbac/PermissionCheck.tsx` |
| ⬜ | `react/src/core/rbac/hooks/usePermissions.ts` |
| ⬜ | `react/src/feature-module/rbac/permission/PermissionMatrix.tsx` |
| ⬜ | `react/src/feature-module/rbac/permission/PermissionBuilder.tsx` |
| ⬜ | `react/src/feature-module/rbac/roles/RoleForm.tsx` |
| ⬜ | `react/src/feature-module/rbac/roles/RoleList.tsx` |
| ⬜ | `react/src/feature-module/rbac/packages/PackageBuilder.tsx` |
| ⬜ | `react/src/feature-module/rbac/packages/PackageList.tsx` |
| ⬜ | `react/src/core/data/json/moduleConfig.json` |

### 7.3 Files to Update

| Status | File Path | Changes Required |
|--------|-----------|------------------|
| ⬜ | `react/src/feature-module/super-admin/permissionpage.tsx` | Connect to API, add state management |
| ⬜ | `react/src/feature-module/super-admin/rolePermission.tsx` | API integration, permission matrix |
| ⬜ | `react/src/feature-module/super-admin/users.tsx` | Dynamic role selection |
| ⬜ | `react/src/core/data/json/sidebarMenu.jsx` | Permission-based filtering |
| ⬜ | `react/src/feature-module/router/router.link.tsx` | Add permission guards |
| ⬜ | `backend/controllers/rest/*.js` | Add permission middleware |

---

## 8. Validation Criteria

### 8.1 Backend Validation

| Test Case | Expected Result |
|-----------|----------------|
| Create role | Role created in database |
| Assign permissions | Permissions saved in role_permissions |
| Get user permissions | Returns role + inherited + overrides |
| Permission check middleware | Blocks access without permission |
| Permission check middleware | Allows access with permission |
| Cache permissions | Redis cache populated |
| Invalidate cache | Cache cleared on permission change |

### 8.2 Frontend Validation

| Test Case | Expected Result |
|-----------|----------------|
| Permission matrix renders | All modules shown grouped by category |
| Check action checkbox | Checkbox toggles |
| Save permissions | API call succeeds |
| Role dropdown shows roles | Lists all active roles |
| Sidebar filters by permission | Unauthorized items hidden |
| Route protection | Unauthorized redirects |
| PermissionCheck component | Children hidden without permission |

### 8.3 Integration Validation

| Test Case | Expected Result |
|-----------|----------------|
| User with HR role accesses employees | Allowed |
| User with Employee role tries to delete client | Blocked |
| Super admin accesses everything | Allowed |
| User without specific permission | Gets 403 |
| Permission cache hit | Returns from cache |
| Permission cache miss | Queries database |

---

## 9. Rollout Plan

### 9.1 Staging Deployment
1. Deploy database changes
2. Run seed scripts
3. Deploy backend code
4. Test all endpoints
5. Deploy frontend code
6. End-to-end testing

### 9.2 Production Deployment
1. Backup database
2. Deploy during low-traffic period
3. Run seed scripts (idempotent)
4. Monitor error logs
5. Verify critical user flows

### 9.3 Post-Deployment
1. Monitor cache performance
2. Check permission check timing
3. Verify audit logs
4. Gather user feedback

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Permission check performance | Implement Redis caching |
| Database query overhead | Optimize indexes, cache frequently accessed |
| Backward compatibility | Maintain existing role checks alongside new system |
| Data migration | Seed existing roles before activating |
| Cache invalidation | Implement clear cache on permission changes |

---

**Documents in this Series:**
1. [01_RBAC_REQUIREMENTS_ANALYSIS.md](./01_RBAC_REQUIREMENTS_ANALYSIS.md)
2. [02_FILE_VALIDATION_REPORT.md](./02_FILE_VALIDATION_REPORT.md)
3. [03_DATABASE_SCHEMAS.md](./03_DATABASE_SCHEMAS.md)
4. [04_IMPLEMENTATION_PLAN.md](./04_IMPLEMENTATION_PLAN.md) ← You are here
