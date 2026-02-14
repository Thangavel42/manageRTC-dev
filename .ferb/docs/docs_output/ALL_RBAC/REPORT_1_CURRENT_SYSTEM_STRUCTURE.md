# Report 1: Current System Structure Report

**Generated**: 2026-02-12
**Scope**: Complete analysis of existing RBAC, routing, and permission handling

---

## Table of Contents
1. [Existing Role Handling Structure](#1-existing-role-handling-structure)
2. [Existing Routing Structure](#2-existing-routing-structure)
3. [Existing CRUD Handling](#3-existing-crud-handling)
4. [Existing Approval Logic](#4-existing-approval-logic)
5. [Database Structure](#5-database-structure)
6. [Hardcoded Logic Analysis](#6-hardcoded-logic-analysis)

---

## 1. Existing Role Handling Structure

### 1.1 User Roles (Clerk-based)

The system uses Clerk authentication with role-based metadata:

```javascript
// User metadata structure (from socket/index.js lines 127-128)
user.publicMetadata = {
  role: 'admin' | 'hr' | 'employee' | 'superadmin' | 'manager' | 'leads' | 'client' | 'guest',
  companyId: string,
  isAdminVerified: boolean
}
```

**Current Roles:**
| Role | Level | Description | Access Pattern |
|-------|--------|-------------|-----------------|
| superadmin | 1 | Platform administrator | Full system access, no company required |
| admin | 10 | Company administrator | Full company access |
| hr | 20 | HR Manager | HR module + team management |
| manager | 30 | Team/Project manager | Project + performance management |
| leads | 40 | Lead/Sales person | Lead management |
| employee | 50 | Standard employee | Self-service access |
| client | 60 | External client | Limited access |
| guest | - | Unauthenticated | Public access only |

### 1.2 Role Sources

**Clerk Metadata** (Primary)
- Location: `user.publicMetadata.role`
- Retrieved via: `clerkClient.users.getUser()`
- Used in: Socket authentication, API requests

**Database Roles** (RBAC System)
- Collection: `Role`
- Fields: name, displayName, type (system/custom), level, permissions (embedded)
- Location: [backend/models/rbac/role.schema.js](../../models/rbac/role.schema.js)

### 1.3 Socket Role-Based Routing

**File**: [backend/socket/router.js](../../socket/router.js)

```javascript
// Lines 44-158: Role-based socket controller mapping
switch (role) {
  case 'superadmin': // Full access
  case 'admin':     // HR, admin, lead, project, etc.
  case 'hr':        // HR modules + project + performance
  case 'manager':    // Project + performance
  case 'leads':      // Lead + user
  case 'employee':    // Self data only
  case 'guest':      // Social feed only
}
```

### 1.4 Role-Based Room Isolation

**File**: [backend/socket/index.js](../../socket/index.js)

```javascript
// Lines 233-268: Room joining based on role
superadmin → "superadmin_room"
admin      → "admin_room_${companyId}"
hr          → "hr_room_${companyId}"
manager     → (no specific room)
employee    → "employee_room_${companyId}"
```

---

## 2. Existing Routing Structure

### 2.1 Route Protection Patterns

**Pattern 1: Basic Authentication**
```javascript
router.get('/me', authenticate, getMyProfile)
```

**Pattern 2: Role-Based Access**
```javascript
router.get('/', authenticate, requireCompany, requireRole('admin', 'hr', 'superadmin'), getEmployees)
```

**Pattern 3: Company-Scoped Access**
```javascript
router.get('/:id', authenticate, requireCompany, getEmployeeById)
```

### 2.2 Middleware Chain

**File**: [backend/middleware/auth.js](../../middleware/auth.js)

| Middleware | Purpose | Role Usage |
|------------|---------|------------|
| `authenticate` | Extract user from JWT | Adds `req.user` |
| `requireCompany` | Validate companyId | Ensures company exists |
| `requireRole(roles...)` | Role-based access | Hardcoded role list |
| `attachRequestId` | Request tracking | Debugging |

### 2.3 Current Route Limitations

1. **Hardcoded Roles**: `requireRole()` uses string literals
2. **No Permission Checks**: Routes don't check granular permissions
3. **No Field-Level Control**: All-or-nothing access
4. **No Action Validation**: No read/write/delete distinction at route level

---

## 3. Existing CRUD Handling

### 3.1 Service Layer Patterns

**Employee Service** ([backend/services/hr/hrm.employee.js](../../services/hr/hrm.employee.js))

```javascript
// Lines 92-262: getEmployeesStats - No role filtering
// Lines 531-677: updateEmployeeDetails - No permission checks
// Lines 1120-1300: addEmployee - Creates with permissions
```

**Permission Creation Pattern** (Old System):
```javascript
// Lines 1245-1251: Separate permissions document
const permissionsResult = await collections.permissions.insertOne({
  employeeId,
  enabledModules: {...},
  permissions: {
    holidays: { read, write, create, delete, import, export },
    leaves: { read, write, create, delete, import, export },
    // ... other modules
  }
});
```

### 3.2 CRUD Operations by Module

| Module | Create | Read | Update | Delete | Action-Level |
|---------|---------|--------|---------|----------|---------------|
| Employees | ✅ | ✅ | ✅ | ✅ | ❌ |
| Leaves | ✅ | ✅ | ✅ | ✅ (cancel) | Partial (approval) |
| Attendance | ✅ | ✅ | ✅ | ✅ | ❌ |
| Assets | ✅ | ✅ | ✅ | ✅ | ❌ |
| Projects | ✅ | ✅ | ✅ | ✅ | ❌ |
| Tasks | ✅ | ✅ | ✅ | ✅ | ❌ |
| Tickets | ✅ | ✅ | ✅ | ❌ | ❌ |

### 3.3 Data Isolation

**Company-Based Isolation**:
```javascript
// Used in most queries
{ companyId: user.companyId }
```

**Self-Data for Employees**:
```javascript
// Limited implementation
employeeId === user.employeeId
```

**No Team-Based Filtering**: Not implemented

---

## 4. Existing Approval Logic

### 4.1 Leave Approval

**File**: [backend/services/leaveValidation.js](../../services/leaveValidation.js)

```javascript
// Lines 201-238: Role-based approval validation
const isAdminOrHR = approver.role === 'admin' || approver.role === 'hr' || approver.role === 'superadmin';
const isReportingManager = leave.employee.reportingManagerId === approverId;

if (!isAdminOrHR && !isReportingManager) {
  throw new Error('Not authorized to approve');
}
```

**Approval Workflow**:
1. Employee submits → status: `pending`
2. Manager/HR reviews → can `approve` or `reject`
3. Status updates → `approved` or `rejected`

### 4.2 Self-Approval Prevention

```javascript
// Lines 159-169: Block self-approval
if (employee.reportingManagerId === employeeId) {
  throw new Error('Self-approval not allowed');
}
```

### 4.3 Lifecycle Workflows

**Resignation**: [Lines 46-62 in hrm.employee.js](../../services/hr/hrm.employee.js)
- Status: `pending` → `approved`
- Blocks manual status changes when active

**Termination**: [Lines 64-79]
- Status: `pending` → `processed`
- Blocks manual status changes when active

---

## 5. Database Structure

### 5.1 RBAC Collections

**Role Collection**:
```javascript
{
  _id: ObjectId,
  name: String,           // 'admin', 'hr', etc.
  displayName: String,
  type: String,           // 'system' | 'custom'
  level: Number,           // Hierarchy level
  isActive: Boolean,
  isDeleted: Boolean,
  permissions: [{          // EMBEDDED (new)
    permissionId: ObjectId,
    module: String,
    category: String,
    displayName: String,
    actions: {
      all: Boolean,
      read: Boolean,
      write: Boolean,
      create: Boolean,
      delete: Boolean,
      import: Boolean,
      export: Boolean,
      approve: Boolean,
      // ... other actions
    }
  }],
  permissionStats: {
    totalPermissions: Number,
    categories: [String],
    lastUpdatedAt: Date
  }
}
```

**Permission Collection**:
```javascript
{
  _id: ObjectId,
  pageId: ObjectId,        // NEW: References Page
  module: String,          // 'hrm.employees-list'
  displayName: String,     // 'Employees List'
  category: String,        // 'hrm'
  sortOrder: Number,
  isActive: Boolean
}
```

**Page Collection** (New):
```javascript
{
  _id: ObjectId,
  route: String,           // '/employees'
  base: String,           // 'employees-list'
  title: String,          // 'Employees List'
  category: String,        // 'hrm'
  availableActions: [String] // ['read', 'write', 'create', 'delete']
}
```

**Module Collection**:
```javascript
{
  _id: ObjectId,
  name: String,
  displayName: String,
  icon: String,
  sortOrder: Number,
  pages: [{
    pageId: ObjectId,       // References Page
    visible: Boolean
  }]
}
```

### 5.2 Legacy Permission System

**Employee Permissions Collection** (Old - being phased out):
```javascript
{
  _id: ObjectId,
  employeeId: ObjectId,
  enabledModules: Boolean,
  permissions: {
    holidays: { read, write, create, delete, import, export },
    leaves: { read, write, create, delete, import, export },
    // ... flat structure
  }
}
```

### 5.3 Company Structure

```javascript
{
  _id: ObjectId,
  name: String,
  planId: ObjectId,        // References Plan
  // ... other fields
}
```

### 5.4 Plan → Module → Page → Permission Chain

```
Company.planId → Plan
  → Plan.planModules[].moduleId → Module
      → Module.pages[].pageId → Page
          → Page.availableActions
          → Permission.pageId → Page
              → Role.permissions[].permissionId → Permission
```

---

## 6. Hardcoded Logic Analysis

### 6.1 Hardcoded Role Checks

**Locations**:
- [backend/socket/router.js](../../socket/router.js): Lines 44-158 (switch on role)
- [backend/socket/index.js](../../socket/index.js): Lines 154-268 (room assignment)
- [backend/routes/api/employees.js](../../routes/api/employees.js): Multiple `requireRole()` calls
- [backend/tests/setup.js](../../tests/setup.js): Lines 53, 61 (mock role: 'admin')
- [backend/services/leaveValidation.js](../../services/leaveValidation.js): Line 227 (role checks)

### 6.2 Hardcoded Permission Actions

**Old Permission Structure** ([backend/services/hr/hrm.employee.js](../../services/hr/hrm.employee.js)):
```javascript
// Lines 679-858: Fixed action set
{
  holidays: { read, write, create, delete, import, export },
  leaves: { read, write, create, delete, import, export },
  clients: { read, write, create, delete, import, export },
  // ... same 6 actions for each module
}
```

### 6.3 Missing Dynamic Features

1. **No Field-Level Permissions**: Cannot hide specific fields
2. **No Time-Based Permissions**: Cannot grant temporary access
3. **No IP-Based Restrictions**: No location-based rules
4. **No Approval Delegation**: Cannot delegate approval rights
5. **No Dynamic Menu Generation**: Menu is static

---

## 7. Current Security Features

### 7.1 Implemented Features

✅ **Role-Based Socket Rooms**: Cross-tenant isolation
✅ **Rate Limiting**: 100 requests/minute per user
✅ **JWT Authentication**: Via Clerk with token verification
✅ **Company Isolation**: All queries scoped to companyId
✅ **Soft Delete**: For roles and permissions
✅ **System Role Protection**: Cannot delete system roles

### 7.2 Security Gaps

❌ **No Granular Permission Checks**: Routes use role, not permissions
❌ **No Field-Level Access**: All fields visible if page accessible
❌ **No Audit Logging**: Permission changes not tracked
❌ **No Session Validation**: No concurrent session limits
❌ **No IP Whitelisting**: For sensitive operations

---

## Summary

### What Works
- ✅ Basic role-based access via Clerk metadata
- ✅ RBAC collections properly structured
- ✅ Socket authentication with role-based rooms
- ✅ Company-based data isolation
- ✅ Leave approval workflow with role checks

### What Needs Work
- ❌ Migrate from hardcoded `requireRole()` to permission-based checks
- ❌ Implement page-level access control middleware
- ❌ Add action-level permissions (read/write/delete) in routes
- ❌ Replace employee-specific permissions with role-based
- ❌ Add dynamic menu generation based on permissions
- ❌ Implement field-level permission controls

---

**End of Report 1**
