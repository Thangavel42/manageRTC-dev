# Enhanced RBAC & Module Management System
## Complete Implementation Guide with Company-Based Customization

> **Version:** 2.0 (Enhanced with Module Management)
> **Status:** Ready for Implementation
> **Estimated Effort:** Medium-Large (4-5 sprints)
> **Priority:** High for enterprise scalability

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Proposed Enhanced Architecture](#proposed-enhanced-architecture)
4. [Database Schema Changes](#database-schema-changes)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Module Management System](#module-management-system)
8. [Company Module Customization](#company-module-customization)
9. [Security Considerations](#security-considerations)
10. [Phase-by-Phase Implementation Plan](#phase-by-phase-implementation-plan)
11. [Testing Strategy](#testing-strategy)

---

## 1. Executive Summary

### 1.1 Problem Statement

The current system has several limitations:
1. **Hardcoded modules** in packages - each plan must individually select modules
2. **No module combinations** - cannot create reusable module sets
3. **No per-company customization** - companies inherit all modules from their plan
4. **No module-level permissions** - roles don't have explicit module access control
5. **Manual employee role assignment** - no bulk operations with modal-based field mapping

### 1.2 Solution Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ENHANCED RBAC & MODULE SYSTEM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                        SUPER ADMIN PAGES                              │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │                                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │   Modules    │  │  Module      │  │  Custom      │                │   │
│  │  │   Page       │  │  Sets        │  │  Modules     │                │   │
│  │  │              │  │  (Plans)     │  │  (Company)   │                │   │
│  │  │ • Define     │  │              │  │              │                │   │
│  │  │   modules    │  │ • Select     │  │ • Override   │                │   │
│  │  │ • Configure  │  │   module     │  │   plan       │                │   │
│  │  │   settings   │  │   sets       │  │   modules    │                │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │   │
│  │                                                                        │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │   │
│  │  │   Roles      │  │ Permissions  │  │   Bulk       │                │   │
│  │  │   Page       │  │   Page       │  │   Assign     │                │   │
│  │  │              │  │              │  │              │                │   │
│  │  │ • Map to     │  │ • CRUD ops   │  │ • Modal      │                │   │
│  │  │   modules    │  │ • Role-perm  │  │   based      │                │   │
│  │  │ • Custom     │  │   matrix     │  │   fields     │                │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 New Features

| Feature | Description | Business Value |
|---------|-------------|----------------|
| **Module Registry** | Centralized module definitions | Single source of truth |
| **Module Sets** | Reusable combinations of modules | Faster plan creation |
| **Company Module Override** | Per-company module customization | Flexible subscription model |
| **Role-Module Mapping** | Explicit module access per role | Better access control |
| **Modal-based Role Fields** | Dynamic field configuration per role | Custom employee forms |

---

## 2. Comprehensive RBAC Codebase Analysis

### 2.1 Current Role Definitions

**7 Roles Defined in System:**

| Role | Level | Description |
|------|-------|-------------|
| `superadmin` | 100 | Platform owner, multi-tenant management |
| `admin` | 80 | Company administrator |
| `hr` | 60 | HR Manager with full employee access |
| `manager` | 50 | Department/Team manager |
| `leads` | 40 | Team lead (limited management) |
| `employee` | 20 | Regular employee |
| `guest` | 0 | Unauthenticated user |

**Role Definition Files:**
- `backend/constants/roles.json` - Role constants
- `backend/models/employee/employee.schema.js` - Employee role enum
- `react/src/core/components/RoleBasedRenderer/index.tsx` - Frontend role hierarchy
- `react/src/config/fieldPermissions.ts` - Field-level permissions

### 2.2 Complete RBAC File Inventory

#### 2.2.1 Backend Role Files (40+ Controllers)

**Authentication & Middleware:**
- `backend/middleware/auth.js` - Core auth: `authenticate`, `requireRole`, `requireCompany`
- `backend/utils/checkroles.js` - Legacy socket role checker
- `backend/middleware/validate.js` - Validation middleware

**Socket Controllers (with role checks):**
- `backend/controllers/activities/activities.controllers.js`
- `backend/controllers/addInvoice/addInvoice.socket.controller.js`
- `backend/controllers/assets/asset.socket.controller.js`
- `backend/controllers/assets/assetCategory.socket.controller.js`
- `backend/controllers/candidates/candidates.controllers.js`
- `backend/controllers/hr/hr.controller.js`
- `backend/controllers/jobs/jobs.controllers.js`
- `backend/controllers/kaban/kaban.controller.js`
- `backend/controllers/lead/lead.controller.js`
- `backend/controllers/pages/profilepage.controllers.js`
- `backend/controllers/performance/performanceAppraisal.controller.js`
- `backend/controllers/performance/performanceIndicator.controller.js`
- `backend/controllers/performance/performanceReview.controller.js`
- `backend/controllers/performance/goalTracking.controller.js`
- `backend/controllers/performance/goalType.controller.js`

**REST Controllers (with role checks):**
- `backend/controllers/rest/employee.controller.js`
- `backend/controllers/rest/userProfile.controller.js`
- `backend/controllers/rest/overtime.controller.js`
- `backend/controllers/rest/department.controller.js`
- `backend/controllers/rest/project.controller.js`
- `backend/controllers/rest/leave.controller.js`
- `backend/controllers/rest/timesheet.controller.js`
- `backend/controllers/rest/attendance.controller.js`
- `backend/controllers/rest/client.controller.js`
- `backend/controllers/rest/designation.controller.js`
- `backend/controllers/rest/resignation.controller.js`
- `backend/controllers/rest/termination.controller.js`
- `backend/controllers/rest/promotion.controller.js`
- `backend/controllers/rest/adminDashboard.controller.js`
- `backend/controllers/rest/hrDashboard.controller.js`

#### 2.2.2 Protected Route Files (20+)

- `backend/routes/api/employees.js`
- `backend/routes/api/promotions.js`
- `backend/routes/api/resignations.js`
- `backend/routes/api/terminations.js`
- `backend/routes/api/overtime.js`
- `backend/routes/api/leave.js`
- `backend/routes/api/attendance.js`
- `backend/routes/api/departments.js`
- `backend/routes/api/designations.js`
- `backend/routes/api/projects.js`
- `backend/routes/api/tasks.js`
- `backend/routes/api/clients.js`
- `backend/routes/api/invoices.js`

#### 2.2.3 Frontend Role Components (30+)

**Core Components:**
- `react/src/core/components/RoleBasedRenderer/index.tsx`
- `react/src/core/components/PermissionField.tsx`
- `react/src/core/components/ErrorBoundary/`
- `react/src/core/components/LoadingStates/`

**Hooks:**
- `react/src/hooks/useAuth.ts`
- `react/src/hooks/useUserProfileREST.ts`
- `react/src/hooks/useResignationsREST.ts`
- `react/src/hooks/useTerminationsREST.ts`

**Config:**
- `react/src/config/fieldPermissions.ts`

**Utilities:**
- `react/src/core/utils/dashboardRoleFilter.ts`
- `react/src/utils/errorHandler.ts`

**Menu:**
- `react/src/core/data/json/sidebarMenu.jsx`

**Layout:**
- `react/src/core/common/header/index.tsx`
- `react/src/core/common/sidebar/index.tsx`
- `react/src/core/common/horizontal-sidebar/index.tsx`
- `react/src/core/common/two-column/index.tsx`
- `react/src/core/common/stacked-sidebar/index.tsx`

**Router:**
- `react/src/feature-module/router/withRoleCheck.jsx`

**Dashboard Pages:**
- `react/src/feature-module/mainMenu/adminDashboard/index.tsx`
- `react/src/feature-module/mainMenu/hrDashboard/index.tsx`
- `react/src/feature-module/mainMenu/employeeDashboard/employee-dashboard.tsx`
- `react/src/feature-module/super-admin/dashboard/index.tsx`

**Feature Modules:**
- `react/src/feature-module/hrm/employees/employeedetails.tsx`
- `react/src/feature-module/hrm/promotion.tsx`
- `react/src/feature-module/hrm/resignation.tsx`
- `react/src/feature-module/hrm/termination.tsx`
- `react/src/feature-module/projects/task/task.tsx`
- `react/src/feature-module/projects/project/project.tsx`
- `react/src/feature-module/pages/profile/profile-management.tsx`
- `react/src/feature-module/pages/profile/components/EducationSection.tsx`
- `react/src/feature-module/pages/profile/components/FamilySection.tsx`
- `react/src/feature-module/pages/profile/components/ExperienceSection.tsx`
- `react/src/feature-module/pages/profile/components/BankInfoSection.tsx`
- `react/src/feature-module/pages/profile/components/PersonalInfoSection.tsx`

**CRM Modules:**
- `react/src/feature-module/crm/companies/companiesList.tsx`
- `react/src/feature-module/crm/contacts/contactList.tsx`
- `react/src/feature-module/crm/companies/companiesGrid.tsx`
- `react/src/feature-module/crm/contacts/contactGrid.tsx`

**Modals:**
- `react/src/core/modals/PromotionDetailsModal.tsx`
- `react/src/core/modals/ResignationDetailsModal.tsx`
- `react/src/core/modals/TerminationDetailsModal.tsx`
- `react/src/core/modals/requestModal.tsx`
- `react/src/core/modals/edit_contact.tsx`
- `react/src/core/modals/edit_company.tsx`
- `react/src/core/modals/add_company.tsx`
- `react/src/core/modals/add_contact.tsx`

### 2.3 Current Role Check Patterns

**Pattern 1: Middleware Role Check**
```javascript
// backend/middleware/auth.js
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Usage in routes
router.get('/', requireRole('admin', 'hr', 'superadmin'), getEmployees);
```

**Pattern 2: Socket Role Check**
```javascript
// In socket controllers
const isAdmin = socket.userMetadata?.role === "admin";
const isHR = socket.userMetadata?.role === "hr";
const isAuthorized = isAdmin || isHR || isSuperadmin;
if (!isAuthorized) throw new Error("Unauthorized");
```

**Pattern 3: Frontend Role-Based Renderer**
```typescript
<RoleBasedRenderer allowedRoles={['admin', 'hr']}>
  <SensitiveContent />
</RoleBasedRenderer>
```

**Pattern 4: Field-Level Permissions**
```typescript
<PermissionField field="bankDetails.accountNumber" editMode={true}>
  <BankAccountInput />
</PermissionField>
```

### 2.4 Export Functionality Protection

**Current Protected Export Operations:**

| Module | PDF Export | Excel Export | Role Check |
|--------|------------|--------------|------------|
| Candidates | ✅ | ✅ | Logs role in socket |
| Profiles | ✅ | ✅ | Logs role in socket |
| Jobs | ✅ | ✅ | Logs role in socket |

**Files with Export Protection:**
- `backend/controllers/candidates/candidates.controllers.js`
- `backend/controllers/pages/profilepage.controllers.js`
- `backend/controllers/jobs/jobs.controllers.js`

**Export Authorization Flow:**
1. User authenticated via Clerk JWT
2. Role extracted from `socket.userMetadata?.role`
3. Export event handlers log role for audit
4. Admin/HR/Superadmin typically have export access

**⚠️ SECURITY NOTE:** Currently exports only log roles but don't enforce permission checks. The new system must add explicit permission checks.

### 2.5 Application/Workflow Role Usage

**Approval Workflows:**

| Workflow | Create | Approve | Delete | View |
|----------|--------|---------|--------|------|
| **Leave** | Employee | Admin/HR/Manager | - | All |
| **Resignation** | Admin/HR/Super | Admin/HR/Super | Admin/Super | Admin/HR/Super |
| **Promotion** | Admin/HR/Super | - | Admin/Super | Admin/HR/Super |
| **Termination** | Admin/HR/Super | - | Admin/Super | Admin/HR/Super |
| **Overtime** | Employee | Admin/HR/Manager | - | All |

**Performance Management:**

| Feature | Admin | HR | Manager | Employee |
|---------|-------|-------|---------|----------|
| Performance Reviews | Full | View | View Team | Own |
| Goals & Appraisals | Full | View | View Team | Own |
| Indicators | Full | View | View | - |

### 2.6 Existing Package/Plan Structure

**Location:** `backend/models/superadmin/package.schema.js`

```javascript
{
  planName: String,           // "Basic Plan", "Premium Plan"
  planModules: [String],      // ["Employees", "Invoices", "Projects"]
  // Current: hardcoded module strings, no reuse
}
```

**Problems:**
- Each plan stores its own module list
- No way to create "module templates"
- Changing a module requires updating every plan
- Companies get ALL plan modules with no customization

### 2.2 Current Company Schema

**Location:** `backend/models/superadmin/company.schema.js`

```javascript
{
  name: String,
  plan_id: String,           // References package
  plan_name: String,
  // Missing: module customization fields
}
```

**Problems:**
- No field to override modules
- Cannot enable/disable specific modules per company
- All companies with same plan have identical access

### 2.3 Current Module Access Flow

```
User Request → JWT Verification → Role Check → Access Decision
                                    ↓
                           No module validation!
```

**Problems:**
- Menu items filtered by role only
- No check if user's company has access to module
- Employees see all their role's modules regardless of plan

### 2.4 Current Add Employee Modal

**Location:** `react/src/feature-module/hrm/employees/employeedetails.tsx`

**Current Role Options:**
```typescript
const roleOptions = [
  { value: "", label: "Select Role" },
  { value: "HR", label: "HR" },
  { value: "Employee", label: "Employee" }
];
```

**Problems:**
- Hardcoded role dropdown
- No field-level configuration per role
- Cannot add/remove fields based on role

---

## 3. Proposed Enhanced Architecture

### 3.1 New Data Models

```
┌─────────────────────────────────────────────────────────────────┐
│                      MODULE REGISTRY                            │
├─────────────────────────────────────────────────────────────────┤
│  Module                                                         │
│  ├── id: ObjectId                                               │
│  ├── code: "employees" | "invoices" | "projects"              │
│  ├── name: "Employees" | "Invoices" | "Projects"             │
│  ├── category: "hrm" | "finance" | "operations"              │
│  ├── icon: string                                              │
│  ├── route: "/employees" | "/invoices"                        │
│  ├── permissions: Permission[]                                 │
│  └── configurableFields: FieldConfig[]                        │
└─────────────────────────────────────────────────────────────────┘
           │
           │ used by
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MODULE SET                                 │
├─────────────────────────────────────────────────────────────────┤
│  ModuleSet (reusable for Plans)                                │
│  ├── id: ObjectId                                               │
│  ├── name: "Basic HRM" | "Full Suite"                          │
│  ├── description: string                                        │
│  ├── modules: [ModuleId]                                       │
│  ├── isDefault: boolean                                        │
│  └── createdAt: Date                                           │
└─────────────────────────────────────────────────────────────────┘
           │
           │ selected by
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PACKAGE/PLAN                               │
├─────────────────────────────────────────────────────────────────┤
│  Package                                                        │
│  ├── id: ObjectId                                               │
│  ├── planName: string                                          │
│  ├── moduleSetId: ModuleSetId  (CHANGED from planModules!)     │
│  ├── price: number                                             │
│  └── ...other fields                                           │
└─────────────────────────────────────────────────────────────────┘
           │
           │ subscribed by
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      COMPANY                                    │
├─────────────────────────────────────────────────────────────────┤
│  Company                                                        │
│  ├── id: ObjectId                                               │
│  ├── name: string                                              │
│  ├── planId: PackageId                                         │
│  ├── moduleSetId: ModuleSetId (inherited from plan)            │
│  ├── customModuleIds: [ModuleId] (ADDITIONAL modules)         │
│  ├── disabledModuleIds: [ModuleId] (REMOVED from plan)        │
│  └── isCustomModuleSet: boolean                                │
└─────────────────────────────────────────────────────────────────┘
           │
           │ employs
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      EMPLOYEE                                   │
├─────────────────────────────────────────────────────────────────┤
│  Employee                                                       │
│  ├── id: ObjectId                                               │
│  ├── roleId: RoleId                                            │
│  └── ...other fields                                           │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Enhanced Role-Module-Permission Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                    ACCESS CHECK DECISION TREE                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  1. User makes request to /employees                                  │
│         │                                                              │
│         ▼                                                              │
│  2. Get User's Role → [Admin]                                         │
│         │                                                              │
│         ▼                                                              │
│  3. Get Role's Allowed Modules → [employees, projects, invoices]      │
│         │                                                              │
│         ▼                                                              │
│  4. Get User's Company                                                │
│         │                                                              │
│         ▼                                                              │
│  5. Get Company's Active Modules:                                     │
│     ┌─────────────────────────────────────────────────────────┐       │
│     │ Base Modules from Plan → [employees, projects]           │       │
│     │ + Custom Modules → []                                    │       │
│     │ - Disabled Modules → [invoices]                          │       │
│     │ = Final: [employees, projects]                           │       │
│     └─────────────────────────────────────────────────────────┘       │
│         │                                                              │
│         ▼                                                              │
│  6. Check Intersection:                                                │
│     Role Modules ∩ Company Modules = [employees] ✓                    │
│         │                                                              │
│         ▼                                                              │
│  7. Check Permission: employees.view ✓                                │
│         │                                                              │
│         ▼                                                              │
│  8. ACCESS GRANTED                                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.3 New Super Admin Routes

```
/super-admin/modules                    - Module registry (define all modules)
/super-admin/module-sets                - Create reusable module combinations
/super-admin/module-sets/:id/modules    - Configure modules in a set
/super-admin/companies/:id/modules      - Customize company modules
/super-admin/custom-modules             - List companies with custom modules
/super-admin/rbac                       - Main RBAC dashboard
/super-admin/rbac/roles                 - Role CRUD with module mapping
/super-admin/rbac/permissions           - Permission definitions
/super-admin/rbac/role-permissions      - Role-Permission matrix
/super-admin/rbac/bulk-assign           - Bulk role assignment with modal fields
/super-admin/rbac/role-fields           - Configure fields per role
```

---

## 4. Database Schema Changes

### 4.1 Module Registry Schema

```javascript
// backend/models/rbac/module.schema.js
const mongoose = require('mongoose');

const fieldConfigSchema = new mongoose.Schema({
  fieldName: {
    type: String,
    required: true
    // e.g., "firstName", "joinDate", "department"
  },
  fieldType: {
    type: String,
    enum: ['text', 'email', 'date', 'select', 'multiselect', 'number', 'textarea', 'file'],
    required: true
  },
  label: String,
  placeholder: String,
  required: {
    type: Boolean,
    default: false
  },
  options: [{
    // For select/multiselect fields
    value: String,
    label: String
  }],
  validation: {
    min: Number,
    max: Number,
    pattern: String,
    custom: String
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  isEditable: {
    type: Boolean,
    default: true
  }
});

const moduleSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[a-z_]+$/
    // e.g., "employees", "invoices", "projects"
  },
  name: {
    type: String,
    required: true
    // e.g., "Employees", "Invoices", "Projects"
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    enum: ['hrm', 'projects', 'finance', 'sales', 'operations', 'admin', 'reports'],
    required: true
  },
  icon: {
    type: String,
    default: 'grid'
    // Material-UI icon name
  },
  route: {
    type: String,
    required: true
    // e.g., "/employees", "/projects/list"
  },
  parentModule: {
    type: String,
    default: null
    // For nested modules
  },
  order: {
    type: Number,
    default: 0
    // For sorting in menus
  },
  permissions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  configurableFields: [fieldConfigSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    // Additional module-specific settings
    features: [String],
    limits: mongoose.Schema.Types.Mixed,
    settings: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
moduleSchema.index({ code: 1 });
moduleSchema.index({ category: 1, isActive: 1 });
moduleSchema.index({ order: 1 });

moduleSchema.path('code').index({ unique: true });

module.exports = mongoose.model('Module', moduleSchema);
```

### 4.2 Module Set Schema

```javascript
// backend/models/rbac/moduleSet.schema.js
const mongoose = require('mongoose');

const moduleSetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
    // e.g., "Basic HRM", "Full Suite", "Starter Plan"
  },
  code: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[a-z_]+$/
  },
  displayName: {
    type: String,
    required: true
  },
  description: String,
  modules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  isSystem: {
    type: Boolean,
    default: false
    // System sets cannot be deleted
  },
  isActive: {
    type: Boolean,
    default: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
    // null = global (available to all plans)
  },
  metadata: {
    // Additional settings
    recommendedPlan: String,
    tags: [String]
  }
}, {
  timestamps: true
});

// Indexes
moduleSetSchema.index({ code: 1 });
moduleSetSchema.index({ isActive: 1 });
moduleSetSchema.index({ companyId: 1 });

module.exports = mongoose.model('ModuleSet', moduleSetSchema);
```

### 4.3 Updated Package/Plan Schema

```javascript
// backend/models/superadmin/package.schema.js
const packageSchema = new mongoose.Schema({
  // ... existing fields ...

  // NEW: Reference to module set instead of hardcoded array
  moduleSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ModuleSet',
    required: true
  },

  // DEPRECATED (keep for migration, remove later)
  planModules: {
    type: [String],
    default: []
    // Will be migrated to moduleSetId
  }
}, {
  timestamps: true
});

// Virtual to get actual modules
packageSchema.virtual('modules', {
  ref: 'ModuleSet',
  localField: 'moduleSetId',
  foreignField: '_id',
  justOne: false
});
```

### 4.4 Updated Company Schema

```javascript
// backend/models/superadmin/company.schema.js
const companySchema = new mongoose.Schema({
  // ... existing fields ...

  // Inherited from plan (for reference)
  moduleSetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ModuleSet'
  },

  // NEW: Company-specific module overrides
  customModules: {
    enabled: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module'
      // Additional modules beyond plan
    }],
    disabled: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module'
      // Modules to remove from plan
    }]
  },

  isCustomModuleSet: {
    type: Boolean,
    default: false
    // Flag to quickly identify companies with custom modules
  },

  // Track module customization history
  moduleChangeLog: [{
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module'
    },
    action: {
      type: String,
      enum: ['enabled', 'disabled']
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
}, {
  timestamps: true
});

// Method to get active modules for company
companySchema.methods.getActiveModules = async function() {
  const ModuleSet = mongoose.model('ModuleSet');
  const Module = mongoose.model('Module');

  // Get base module set from plan
  const moduleSet = await ModuleSet.findById(this.moduleSetId).populate('modules');
  let baseModules = moduleSet?.modules || [];

  // Apply customizations
  if (this.isCustomModuleSet) {
    // Remove disabled modules
    baseModules = baseModules.filter(m =>
      !this.customModules.disabled.some(dm => dm._id.equals(m._id))
    );

    // Add enabled modules
    const enabledModules = await Module.find({
      _id: { $in: this.customModules.enabled }
    });
    baseModules = [...baseModules, ...enabledModules];
  }

  return baseModules;
};
```

### 4.5 Updated Role Schema with Module Mapping

```javascript
// backend/models/rbac/role.schema.js
const roleSchema = new mongoose.Schema({
  // ... existing fields ...

  // NEW: Explicit module access
  allowedModules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
    // Which modules this role can access
  }],

  // NEW: Modal field configuration for this role
  modalFields: {
    employee: {
      // Field configuration for "Add Employee" modal
      sections: [{
        title: String,
        fields: [{
          fieldName: String,
          isVisible: Boolean,
          isRequired: Boolean,
          isEditable: Boolean,
          order: Number
        }]
      }]
    }
    // Can add more modals as needed
  },

  // NEW: Module-specific permission overrides
  modulePermissions: [{
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module'
    },
    permissions: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Permission'
    }],
    // Override default permissions for specific module
    isDenyList: {
      type: Boolean,
      default: false
      // true = these permissions are denied
      // false = only these permissions are allowed
    }
  }]
}, {
  timestamps: true
});

// Method to check if role can access module
roleSchema.methods.canAccessModule = function(moduleId) {
  // Superadmin wildcard
  if (this.level >= 100) return true;

  // Check explicit module access
  return this.allowedModules.some(m => m._id.equals(moduleId));
};

// Method to get permissions for a specific module
roleSchema.prototype.getPermissionsForModule = function(moduleId) {
  const modulePerm = this.modulePermissions?.find(mp =>
    mp.moduleId.equals(moduleId)
  );

  if (modulePerm) {
    return {
      permissions: modulePerm.permissions,
      isDenyList: modulePerm.isDenyList
    };
  }

  // Return default permissions
  return {
    permissions: this.permissions,
    isDenyList: false
  };
};
```

---

## 5. Backend Implementation

### 5.1 Directory Structure

```
backend/
├── models/
│   ├── rbac/
│   │   ├── permission.schema.js
│   │   ├── role.schema.js
│   │   ├── roleAssignment.schema.js
│   │   ├── module.schema.js          # NEW
│   │   └── moduleSet.schema.js       # NEW
│   └── superadmin/
│       ├── package.schema.js         # UPDATED
│       └── company.schema.js         # UPDATED
├── controllers/
│   ├── rbac/
│   │   ├── permissions.controller.js
│   │   ├── roles.controller.js
│   │   ├── rolePermissions.controller.js
│   │   ├── bulkAssignment.controller.js
│   │   ├── modules.controller.js         # NEW
│   │   ├── moduleSets.controller.js      # NEW
│   │   └── companyModules.controller.js  # NEW
│   └── superadmin/
│       └── companies.controller.js        # UPDATED
├── routes/
│   ├── api/
│   │   ├── rbac.js                    # UPDATED
│   │   └── modules.js                 # NEW
├── middleware/
│   ├── checkPermission.js
│   ├── checkModuleAccess.js           # NEW
│   └── rbacAudit.js
└── services/
    └── rbac/
        ├── permission.service.js
        ├── role.service.js
        ├── cache.service.js
        └── moduleAccess.service.js    # NEW
```

### 5.2 Modules Controller

```javascript
// backend/controllers/rbac/modules.controller.js
const Module = require('../../models/rbac/module.schema');
const Permission = require('../../models/rbac/permission.schema');

exports.getAllModules = async (req, res) => {
  try {
    const { category, isActive, includePermissions } = req.query;
    const filter = {};

    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    let query = Module.find(filter).sort({ category: 1, order: 1, name: 1 });

    if (includePermissions === 'true') {
      query = query.populate('permissions');
    }

    const modules = await query;

    res.json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getModuleById = async (req, res) => {
  try {
    const module = await Module.findById(req.params.id)
      .populate('permissions');

    if (!module) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    res.json({ success: true, data: module });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createModule = async (req, res) => {
  try {
    const module = await Module.create(req.body);
    await module.populate('permissions');

    res.status(201).json({ success: true, data: module });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateModule = async (req, res) => {
  try {
    const module = await Module.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('permissions');

    if (!module) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    // Clear related caches
    await clearModuleCache(module._id);

    res.json({ success: true, data: module });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteModule = async (req, res) => {
  try {
    // Check if module is used in any active module set
    const ModuleSet = require('../models/rbac/moduleSet.schema');
    const usageCount = await ModuleSet.countDocuments({
      modules: req.params.id,
      isActive: true
    });

    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Module is used in ${usageCount} active module sets. Please remove it first.`
      });
    }

    await Module.findByIdAndUpdate(req.params.id, { isActive: false });

    res.json({ success: true, message: 'Module deactivated' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateModuleFields = async (req, res) => {
  try {
    const { configurableFields } = req.body;

    const module = await Module.findByIdAndUpdate(
      req.params.id,
      { configurableFields },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: module });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Helper: Clear module-related caches
async function clearModuleCache(moduleId) {
  const redis = require('../../config/redis');
  const keys = await redis.keys(`modules:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### 5.3 Module Sets Controller

```javascript
// backend/controllers/rbac/moduleSets.controller.js
const ModuleSet = require('../../models/rbac/moduleSet.schema');
const Module = require('../../models/rbac/module.schema');

exports.getAllModuleSets = async (req, res) => {
  try {
    const { includeModules, isActive } = req.query;
    const filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Non-superadmin can only see global sets
    if (req.user.role !== 'superadmin') {
      filter.companyId = null;
    }

    let query = ModuleSet.find(filter).sort({ name: 1 });

    if (includeModules === 'true') {
      query = query.populate('modules');
    }

    const moduleSets = await query;

    res.json({ success: true, data: moduleSets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createModuleSet = async (req, res) => {
  try {
    const { name, code, displayName, description, modules } = req.body;

    // Verify all modules exist
    const moduleDocs = await Module.find({ _id: { $in: modules }, isActive: true });
    if (moduleDocs.length !== modules.length) {
      return res.status(400).json({
        success: false,
        error: 'Some modules are invalid or inactive'
      });
    }

    const moduleSet = await ModuleSet.create({
      name,
      code,
      displayName,
      description,
      modules,
      companyId: req.user.role === 'superadmin' ? null : req.user.companyId
    });

    await moduleSet.populate('modules');

    res.status(201).json({ success: true, data: moduleSet });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.updateModuleSet = async (req, res) => {
  try {
    const moduleSet = await ModuleSet.findById(req.params.id);

    if (!moduleSet) {
      return res.status(404).json({ success: false, error: 'Module set not found' });
    }

    if (moduleSet.isSystem) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify system module sets'
      });
    }

    if (req.body.modules) {
      // Verify all modules exist
      const moduleDocs = await Module.find({
        _id: { $in: req.body.modules },
        isActive: true
      });
      if (moduleDocs.length !== req.body.modules.length) {
        return res.status(400).json({
          success: false,
          error: 'Some modules are invalid or inactive'
        });
      }
    }

    Object.assign(moduleSet, req.body);
    await moduleSet.save();
    await moduleSet.populate('modules');

    res.json({ success: true, data: moduleSet });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.deleteModuleSet = async (req, res) => {
  try {
    const moduleSet = await ModuleSet.findById(req.params.id);

    if (moduleSet?.isSystem) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete system module sets'
      });
    }

    // Check if used by any active plan
    const Package = require('../../models/superadmin/package.schema');
    const usageCount = await Package.countDocuments({
      moduleSetId: req.params.id,
      status: 'Active'
    });

    if (usageCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Module set is used by ${usageCount} active plans`
      });
    }

    await ModuleSet.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Module set deactivated' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

exports.cloneModuleSet = async (req, res) => {
  try {
    const original = await ModuleSet.findById(req.params.id).populate('modules');

    if (!original) {
      return res.status(404).json({ success: false, error: 'Module set not found' });
    }

    const cloned = await ModuleSet.create({
      name: `${original.name} (Copy)`,
      code: `${original.code}_copy`,
      displayName: `${original.displayName} (Copy)`,
      description: original.description,
      modules: original.modules.map(m => m._id),
      isSystem: false
    });

    await cloned.populate('modules');

    res.status(201).json({ success: true, data: cloned });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
```

### 5.4 Company Modules Controller

```javascript
// backend/controllers/rbac/companyModules.controller.js
const Company = require('../../models/superadmin/company.schema');
const Module = require('../../models/rbac/module.schema');

exports.getCompanyModules = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('moduleSetId')
      .populate('customModules.enabled')
      .populate('customModules.disabled');

    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    // Get active modules
    const activeModules = await company.getActiveModules();

    res.json({
      success: true,
      data: {
        companyId: company._id,
        companyame: company.name,
        moduleSetId: company.moduleSetId,
        isCustom: company.isCustomModuleSet,
        baseModules: company.moduleSetId?.modules || [],
        customEnabled: company.customModules?.enabled || [],
        customDisabled: company.customModules?.disabled || [],
        activeModules,
        changeLog: company.moduleChangeLog
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.enableModuleForCompany = async (req, res) => {
  try {
    const { moduleId, reason } = req.body;
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    // Verify module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    // Initialize customModules if needed
    if (!company.customModules) {
      company.customModules = { enabled: [], disabled: [] };
    }

    // Check if already enabled
    if (company.customModules.enabled.some(m => m.equals(moduleId))) {
      return res.status(400).json({
        success: false,
        error: 'Module already enabled for this company'
      });
    }

    // Remove from disabled if present
    company.customModules.disabled = company.customModules.disabled.filter(
      m => !m.equals(moduleId)
    );

    // Add to enabled
    company.customModules.enabled.push(moduleId);
    company.isCustomModuleSet = true;

    // Log the change
    company.moduleChangeLog = company.moduleChangeLog || [];
    company.moduleChangeLog.push({
      moduleId,
      action: 'enabled',
      changedBy: req.user.userId,
      changedAt: new Date(),
      reason
    });

    await company.save();

    // Clear company module cache
    await clearCompanyModuleCache(company._id);

    res.json({
      success: true,
      message: 'Module enabled successfully',
      data: { moduleId, moduleName: module.name }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.disableModuleForCompany = async (req, res) => {
  try {
    const { moduleId, reason } = req.body;
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    // Verify module exists
    const module = await Module.findById(moduleId);
    if (!module) {
      return res.status(404).json({ success: false, error: 'Module not found' });
    }

    // Initialize customModules if needed
    if (!company.customModules) {
      company.customModules = { enabled: [], disabled: [] };
    }

    // Check if already disabled
    if (company.customModules.disabled.some(m => m.equals(moduleId))) {
      return res.status(400).json({
        success: false,
        error: 'Module already disabled for this company'
      });
    }

    // Remove from enabled if present
    company.customModules.enabled = company.customModules.enabled.filter(
      m => !m.equals(moduleId)
    );

    // Add to disabled
    company.customModules.disabled.push(moduleId);
    company.isCustomModuleSet = true;

    // Log the change
    company.moduleChangeLog = company.moduleChangeLog || [];
    company.moduleChangeLog.push({
      moduleId,
      action: 'disabled',
      changedBy: req.user.userId,
      changedAt: new Date(),
      reason
    });

    await company.save();

    // Clear company module cache
    await clearCompanyModuleCache(company._id);

    res.json({
      success: true,
      message: 'Module disabled successfully',
      data: { moduleId, moduleName: module.name }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.resetCompanyModules = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return res.status(404).json({ success: false, error: 'Company not found' });
    }

    // Reset to plan default
    company.customModules = { enabled: [], disabled: [] };
    company.isCustomModuleSet = false;
    company.moduleChangeLog = [];

    await company.save();

    // Clear company module cache
    await clearCompanyModuleCache(company._id);

    res.json({
      success: true,
      message: 'Company modules reset to plan default'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getCompaniesWithCustomModules = async (req, res) => {
  try {
    const companies = await Company.find({
      isCustomModuleSet: true,
      status: 'Active'
    })
      .select('name email plan_name moduleSetId isCustomModuleSet')
      .populate('moduleSetId', 'name displayName')
      .sort({ name: 1 });

    res.json({ success: true, data: companies });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Helper: Clear company module cache
async function clearCompanyModuleCache(companyId) {
  const redis = require('../../config/redis');
  const keys = await redis.keys(`company:${companyId}:modules:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

### 5.5 Module Access Middleware

```javascript
// backend/middleware/checkModuleAccess.js
const Module = require('../models/rbac/module.schema');
const Role = require('../models/rbac/role.schema');
const redis = require('../config/redis');

// Cache duration: 30 minutes
const CACHE_TTL = 1800;

/**
 * Check if user's role can access the requested module
 * Usage: app.get('/employees', checkModuleAccess('employees'), ...)
 */
exports.checkModuleAccess = (moduleCode) => {
  return async (req, res, next) => {
    try {
      if (!req.user?.roleId) {
        return res.status(403).json({
          success: false,
          error: 'No role assigned'
        });
      }

      // Get the module
      const module = await Module.findOne({ code: moduleCode, isActive: true });
      if (!module) {
        return res.status(404).json({
          success: false,
          error: 'Module not found'
        });
      }

      // Get user's role with allowed modules
      const cacheKey = `role:${req.user.roleId}:modules`;
      let roleModules = await redis.get(cacheKey);

      if (!roleModules) {
        const role = await Role.findById(req.user.roleId)
          .populate('allowedModules');

        roleModules = role?.allowedModules?.map(m => m.code) || [];

        // Cache for 30 minutes
        await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(roleModules));
      } else {
        roleModules = JSON.parse(roleModules);
      }

      // Check if role has access to module
      if (!roleModules.includes(moduleCode) && !roleModules.includes('*')) {
        return res.status(403).json({
          success: false,
          error: `Access denied: ${module.name} module not available for your role`
        });
      }

      // Now check if user's company has this module
      if (req.user.role !== 'superadmin') {
        const companyCacheKey = `company:${req.user.companyId}:modules`;
        let companyModules = await redis.get(companyCacheKey);

        if (!companyModules) {
          const Company = require('../models/superadmin/company.schema');
          const company = await Company.findById(req.user.companyId)
            .populate('moduleSetId');

          const activeModules = await company.getActiveModules();
          companyModules = activeModules.map(m => m.code);

          await redis.setex(companyCacheKey, CACHE_TTL, JSON.stringify(companyModules));
        } else {
          companyModules = JSON.parse(companyModules);
        }

        if (!companyModules.includes(moduleCode)) {
          return res.status(403).json({
            success: false,
            error: `Access denied: ${module.name} module not included in your company's subscription`
          });
        }
      }

      // Attach module to request for use in controllers
      req.module = module;
      next();
    } catch (error) {
      console.error('Module access check error:', error);
      res.status(500).json({ success: false, error: 'Module access check failed' });
    }
  };
};

/**
 * Get all accessible modules for the current user
 * Returns a list of modules the user can access based on role + company subscription
 */
exports.getAccessibleModules = async (req, res) => {
  try {
    const Role = require('../models/rbac/role.schema');
    const Company = require('../models/superadmin/company.schema');

    const role = await Role.findById(req.user.roleId).populate('allowedModules');
    let roleModuleCodes = role?.allowedModules?.map(m => m.code) || [];

    if (roleModuleCodes.includes('*')) {
      // Superadmin - get all active modules
      const modules = await Module.find({ isActive: true }).sort({ category: 1, order: 1 });
      return res.json({ success: true, data: modules });
    }

    // Get company modules
    const company = await Company.findById(req.user.companyId).populate('moduleSetId');
    const activeModules = await company.getActiveModules();
    const companyModuleCodes = activeModules.map(m => m.code);

    // Intersection of role modules and company modules
    const accessibleModules = activeModules.filter(m =>
      roleModuleCodes.includes(m.code)
    );

    res.json({ success: true, data: accessibleModules });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Helper to clear module-related caches
exports.clearModuleCache = async (roleId, companyId) => {
  const redis = require('../config/redis');
  const keys = [];

  if (roleId) {
    keys.push(`role:${roleId}:modules`);
  }
  if (companyId) {
    keys.push(`company:${companyId}:modules`);
  }

  if (keys.length > 0) {
    await redis.del(...keys);
  }
};
```

### 5.6 Updated Routes

```javascript
// backend/routes/api/modules.js
const express = require('express');
const router = express.Router();
const modulesController = require('../../controllers/rbac/modules.controller');
const moduleSetsController = require('../../controllers/rbac/moduleSets.controller');
const companyModulesController = require('../../controllers/rbac/companyModules.controller');
const { requireRole } = require('../../middleware/auth');

// All module routes require superadmin
router.use(requireRole('superadmin'));

// Modules CRUD
router.get('/modules', modulesController.getAllModules);
router.get('/modules/:id', modulesController.getModuleById);
router.post('/modules', modulesController.createModule);
router.put('/modules/:id', modulesController.updateModule);
router.put('/modules/:id/fields', modulesController.updateModuleFields);
router.delete('/modules/:id', modulesController.deleteModule);

// Module Sets CRUD
router.get('/module-sets', moduleSetsController.getAllModuleSets);
router.post('/module-sets', moduleSetsController.createModuleSet);
router.put('/module-sets/:id', moduleSetsController.updateModuleSet);
router.delete('/module-sets/:id', moduleSetsController.deleteModuleSet);
router.post('/module-sets/:id/clone', moduleSetsController.cloneModuleSet);

// Company Module Customization
router.get('/companies/:id/modules', companyModulesController.getCompanyModules);
router.post('/companies/:id/modules/enable', companyModulesController.enableModuleForCompany);
router.post('/companies/:id/modules/disable', companyModulesController.disableModuleForCompany);
router.post('/companies/:id/modules/reset', companyModulesController.resetCompanyModules);
router.get('/companies/custom-modules', companyModulesController.getCompaniesWithCustomModules);

module.exports = router;

// Register in server.js
app.use('/api/super-admin', modulesRoutes);
```

---

## 6. Frontend Implementation

### 6.1 Directory Structure

```
react/src/
├── feature-module/
│   └── super-admin/
│       ├── modules/
│       │   ├── index.tsx                    # Module registry page
│       │   ├── ModuleForm.tsx
│       │   └── ModuleFieldConfig.tsx
│       ├── module-sets/
│       │   ├── index.tsx                    # Module sets page
│       │   ├── ModuleSetForm.tsx
│       │   └── ModuleSetBuilder.tsx
│       ├── custom-modules/
│       │   ├── index.tsx                    # Companies with custom modules
│       │   └── CompanyModuleEditor.tsx
│       └── rbac/
│           ├── index.tsx
│           ├── roles/
│           ├── permissions/
│           ├── bulk-assign/
│           └── role-fields/                 # NEW
│               └── index.tsx
├── hooks/
│   ├── useModules.ts                        # NEW
│   ├── useModuleSets.ts                     # NEW
│   ├── useCompanyModules.ts                 # NEW
│   ├── usePermissions.ts
│   ├── useRoles.ts
│   └── useBulkRoleAssignment.ts
├── types/
│   ├── rbac.ts
│   └── modules.ts                           # NEW
├── contexts/
│   └── ModuleAccessContext.tsx              # NEW
└── utils/
    └── moduleAccess.ts                      # NEW
```

### 6.2 Type Definitions

```typescript
// react/src/types/modules.ts
export interface FieldConfig {
  fieldName: string;
  fieldType: 'text' | 'email' | 'date' | 'select' | 'multiselect' | 'number' | 'textarea' | 'file';
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  isVisible?: boolean;
  isEditable?: boolean;
  order?: number;
}

export interface Module {
  _id: string;
  code: string;
  name: string;
  displayName: string;
  description?: string;
  category: 'hrm' | 'projects' | 'finance' | 'sales' | 'operations' | 'admin' | 'reports';
  icon: string;
  route: string;
  parentModule?: string;
  order: number;
  permissions?: Permission[];
  configurableFields?: FieldConfig[];
  isActive: boolean;
  metadata?: {
    features?: string[];
    limits?: Record<string, any>;
    settings?: Record<string, any>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ModuleSet {
  _id: string;
  name: string;
  code: string;
  displayName: string;
  description?: string;
  modules: Module[];
  isDefault: boolean;
  isSystem: boolean;
  isActive: boolean;
  companyId?: string;
  metadata?: {
    recommendedPlan?: string;
    tags?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CompanyModules {
  companyId: string;
  companyName: string;
  moduleSetId: ModuleSet;
  isCustom: boolean;
  baseModules: Module[];
  customEnabled: Module[];
  customDisabled: Module[];
  activeModules: Module[];
  changeLog: Array<{
    moduleId: string;
    action: 'enabled' | 'disabled';
    changedBy: string;
    changedAt: string;
    reason?: string;
  }>;
}

export interface RoleModuleMapping {
  roleId: string;
  allowedModules: string[];
  modulePermissions: Array<{
    moduleId: string;
    permissions: string[];
    isDenyList: boolean;
  }>;
}
```

### 6.3 Custom Hooks

```typescript
// react/src/hooks/useModules.ts
import { useState, useEffect } from 'react';
import { Module } from '../types/modules';
import api from '../services/api';

export const useModules = (filters?: { category?: string; isActive?: boolean }) => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/modules', { params: filters });
      setModules(response.data.data);
    } finally {
      setLoading(false);
    }
  };

  const createModule = async (moduleData: Partial<Module>) => {
    const response = await api.post('/super-admin/modules', moduleData);
    await fetchModules();
    return response.data;
  };

  const updateModule = async (id: string, moduleData: Partial<Module>) => {
    const response = await api.put(`/super-admin/modules/${id}`, moduleData);
    await fetchModules();
    return response.data;
  };

  const deleteModule = async (id: string) => {
    await api.delete(`/super-admin/modules/${id}`);
    await fetchModules();
  };

  useEffect(() => {
    fetchModules();
  }, [filters]);

  return {
    modules,
    loading,
    createModule,
    updateModule,
    deleteModule,
    refetch: fetchModules
  };
};

// react/src/hooks/useModuleSets.ts
import { useState, useEffect } from 'react';
import { ModuleSet } from '../types/modules';
import api from '../services/api';

export const useModuleSets = (includeModules = true) => {
  const [moduleSets, setModuleSets] = useState<ModuleSet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchModuleSets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/module-sets', {
        params: { includeModules }
      });
      setModuleSets(response.data.data);
    } finally {
      setLoading(false);
    }
  };

  const createModuleSet = async (setData: Partial<ModuleSet>) => {
    const response = await api.post('/super-admin/module-sets', setData);
    await fetchModuleSets();
    return response.data;
  };

  const updateModuleSet = async (id: string, setData: Partial<ModuleSet>) => {
    const response = await api.put(`/super-admin/module-sets/${id}`, setData);
    await fetchModuleSets();
    return response.data;
  };

  const deleteModuleSet = async (id: string) => {
    await api.delete(`/super-admin/module-sets/${id}`);
    await fetchModuleSets();
  };

  const cloneModuleSet = async (id: string) => {
    const response = await api.post(`/super-admin/module-sets/${id}/clone`);
    await fetchModuleSets();
    return response.data;
  };

  useEffect(() => {
    fetchModuleSets();
  }, [includeModules]);

  return {
    moduleSets,
    loading,
    createModuleSet,
    updateModuleSet,
    deleteModuleSet,
    cloneModuleSet,
    refetch: fetchModuleSets
  };
};

// react/src/hooks/useCompanyModules.ts
import { useState, useEffect } from 'react';
import { CompanyModules } from '../types/modules';
import api from '../services/api';

export const useCompanyModules = (companyId: string) => {
  const [data, setData] = useState<CompanyModules | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanyModules = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const response = await api.get(`/super-admin/companies/${companyId}/modules`);
      setData(response.data.data);
    } finally {
      setLoading(false);
    }
  };

  const enableModule = async (moduleId: string, reason?: string) => {
    const response = await api.post(`/super-admin/companies/${companyId}/modules/enable`, {
      moduleId,
      reason
    });
    await fetchCompanyModules();
    return response.data;
  };

  const disableModule = async (moduleId: string, reason?: string) => {
    const response = await api.post(`/super-admin/companies/${companyId}/modules/disable`, {
      moduleId,
      reason
    });
    await fetchCompanyModules();
    return response.data;
  };

  const resetToPlan = async () => {
    const response = await api.post(`/super-admin/companies/${companyId}/modules/reset`);
    await fetchCompanyModules();
    return response.data;
  };

  useEffect(() => {
    fetchCompanyModules();
  }, [companyId]);

  return {
    data,
    loading,
    enableModule,
    disableModule,
    resetToPlan,
    refetch: fetchCompanyModules
  };
};

// react/src/hooks/useCompaniesWithCustomModules.ts
import { useState, useEffect } from 'react';
import api from '../services/api';

interface CompanyWithCustomModules {
  _id: string;
  name: string;
  email: string;
  plan_name: string;
  moduleSetId: {
    _id: string;
    name: string;
    displayName: string;
  };
  isCustomModuleSet: boolean;
}

export const useCompaniesWithCustomModules = () => {
  const [companies, setCompanies] = useState<CompanyWithCustomModules[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/companies/custom-modules');
      setCompanies(response.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  return { companies, loading, refetch: fetchCompanies };
};
```

### 6.4 Module Access Context

```typescript
// react/src/contexts/ModuleAccessContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Module } from '../types/modules';
import api from '../services/api';

interface ModuleAccessContextType {
  accessibleModules: Module[];
  loading: boolean;
  canAccessModule: (moduleCode: string) => boolean;
  refreshModules: () => Promise<void>;
}

const ModuleAccessContext = createContext<ModuleAccessContextType | undefined>(undefined);

export const ModuleAccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accessibleModules, setAccessibleModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAccessibleModules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/modules/accessible');
      setAccessibleModules(response.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccessibleModules();
  }, []);

  const canAccessModule = (moduleCode: string): boolean => {
    return accessibleModules.some(m => m.code === moduleCode);
  };

  return (
    <ModuleAccessContext.Provider
      value={{
        accessibleModules,
        loading,
        canAccessModule,
        refreshModules: fetchAccessibleModules
      }}
    >
      {children}
    </ModuleAccessContext.Provider>
  );
};

export const useModuleAccess = () => {
  const context = useContext(ModuleAccessContext);
  if (!context) {
    throw new Error('useModuleAccess must be used within ModuleAccessProvider');
  }
  return context;
};
```

### 6.5 Main Components

#### 6.5.1 Modules Registry Page

```typescript
// react/src/feature-module/super-admin/modules/index.tsx
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import { useModules } from '../../../../hooks/useModules';
import { Module } from '../../../../types/modules';
import ModuleForm from './ModuleForm';
import ModuleFieldConfig from './ModuleFieldConfig';

const ModulesRegistry: React.FC = () => {
  const { modules, loading, createModule, updateModule, deleteModule } = useModules();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [fieldConfigOpen, setFieldConfigOpen] = useState(false);
  const [categoryTab, setCategoryTab] = useState('all');

  const categories = ['all', 'hrm', 'projects', 'finance', 'sales', 'operations', 'admin', 'reports'];

  const filteredModules = categoryTab === 'all'
    ? modules
    : modules.filter(m => m.category === categoryTab);

  const handleEdit = (module: Module) => {
    setEditingModule(module);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this module?')) {
      await deleteModule(id);
    }
  };

  const handleSave = async (moduleData: Partial<Module>) => {
    if (editingModule) {
      await updateModule(editingModule._id, moduleData);
    } else {
      await createModule(moduleData);
    }
    setDialogOpen(false);
    setEditingModule(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Module Registry</h1>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Add Module
        </Button>
      </div>

      <Tabs value={categoryTab} onChange={(_, v) => setCategoryTab(v)} className="mb-4">
        {categories.map(cat => (
          <Tab key={cat} label={cat === 'all' ? 'All Modules' : cat.toUpperCase()} value={cat} />
        ))}
      </Tabs>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Module Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Route</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredModules.map((module) => (
              <TableRow key={module._id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`ti ti-${module.icon}`}></span>
                    {module.displayName}
                  </div>
                </TableCell>
                <TableCell><code>{module.code}</code></TableCell>
                <TableCell>
                  <Chip label={module.category.toUpperCase()} size="small" variant="outlined" />
                </TableCell>
                <TableCell><code>{module.route}</code></TableCell>
                <TableCell>
                  <Chip
                    label={module.isActive ? 'Active' : 'Inactive'}
                    color={module.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleEdit(module)} size="small">
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => {
                      setEditingModule(module);
                      setFieldConfigOpen(true);
                    }}
                    size="small"
                    title="Configure Fields"
                  >
                    <Settings fontSize="small" />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDelete(module._id)}
                    size="small"
                    color="error"
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingModule(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <ModuleForm
          module={editingModule}
          onSave={handleSave}
          onCancel={() => {
            setDialogOpen(false);
            setEditingModule(null);
          }}
        />
      </Dialog>

      <Dialog
        open={fieldConfigOpen}
        onClose={() => setFieldConfigOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <ModuleFieldConfig
          module={editingModule}
          onClose={() => setFieldConfigOpen(false)}
        />
      </Dialog>
    </div>
  );
};

export default ModulesRegistry;
```

#### 6.5.2 Module Form

```typescript
// react/src/feature-module/super-admin/modules/ModuleForm.tsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Module } from '../../../../types/modules';

interface ModuleFormProps {
  module?: Module | null;
  onSave: (moduleData: Partial<Module>) => Promise<void>;
  onCancel: () => void;
}

const ModuleForm: React.FC<ModuleFormProps> = ({ module, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    displayName: '',
    description: '',
    category: 'hrm' as Module['category'],
    icon: 'grid',
    route: '',
    parentModule: '',
    order: 0,
    isActive: true
  });

  useEffect(() => {
    if (module) {
      setFormData({
        code: module.code,
        name: module.name,
        displayName: module.displayName,
        description: module.description || '',
        category: module.category,
        icon: module.icon,
        route: module.route,
        parentModule: module.parentModule || '',
        order: module.order,
        isActive: module.isActive
      });
    }
  }, [module]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const categories: Module['category'][] = ['hrm', 'projects', 'finance', 'sales', 'operations', 'admin', 'reports'];

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
      <h2>{module ? 'Edit Module' : 'Add New Module'}</h2>

      <Stack spacing={3} sx={{ mt: 2 }}>
        <TextField
          label="Display Name"
          fullWidth
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          required
        />

        <TextField
          label="Code"
          fullWidth
          value={formData.code}
          onChange={(e) => setFormData({
            ...formData,
            code: e.target.value.toLowerCase().replace(/-/g, '_')
          })}
          helperText="Lowercase, underscores only (e.g., employees, timesheets)"
          required
          disabled={!!module}
        />

        <TextField
          label="Route"
          fullWidth
          value={formData.route}
          onChange={(e) => setFormData({ ...formData, route: e.target.value })}
          helperText="Frontend route (e.g., /employees, /projects/list)"
          required
        />

        <FormControl fullWidth>
          <InputLabel>Category</InputLabel>
          <Select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value as Module['category'] })}
            label="Category"
          >
            {categories.map(cat => (
              <MenuItem key={cat} value={cat}>{cat.toUpperCase()}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="Icon"
          fullWidth
          value={formData.icon}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          helperText="Tabler icon name (e.g., grid, users, briefcase)"
        />

        <TextField
          label="Order"
          type="number"
          fullWidth
          value={formData.order}
          onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
          helperText="Display order in menus"
        />

        <TextField
          label="Parent Module Code"
          fullWidth
          value={formData.parentModule}
          onChange={(e) => setFormData({ ...formData, parentModule: e.target.value })}
          helperText="For nested modules (leave empty if top-level)"
        />

        <TextField
          label="Description"
          fullWidth
          multiline
          rows={2}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <FormControlLabel
          control={
            <Switch
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            />
          }
          label="Active"
        />

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="contained" type="submit">
            {module ? 'Update' : 'Create'} Module
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ModuleForm;
```

#### 6.5.3 Module Sets Page

```typescript
// react/src/feature-module/super-admin/module-sets/index.tsx
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Stack
} from '@mui/material';
import { Edit, Delete, Add, ContentCopy } from '@mui/icons-material';
import { useModuleSets } from '../../../../hooks/useModuleSets';
import { ModuleSet } from '../../../../types/modules';
import ModuleSetForm from './ModuleSetForm';
import ModuleSetBuilder from './ModuleSetBuilder';

const ModuleSetsPage: React.FC = () => {
  const { moduleSets, loading, createModuleSet, updateModuleSet, deleteModuleSet, cloneModuleSet } = useModuleSets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<ModuleSet | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const handleEdit = (set: ModuleSet) => {
    setEditingSet(set);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this module set?')) {
      await deleteModuleSet(id);
    }
  };

  const handleClone = async (id: string) => {
    await cloneModuleSet(id);
  };

  const handleSave = async (setData: Partial<ModuleSet>) => {
    if (editingSet) {
      await updateModuleSet(editingSet._id, setData);
    } else {
      await createModuleSet(setData);
    }
    setDialogOpen(false);
    setEditingSet(null);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Module Sets</h1>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setDialogOpen(true)}
        >
          Create Module Set
        </Button>
      </div>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Modules Count</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {moduleSets.map((set) => (
              <TableRow key={set._id}>
                <TableCell>{set.displayName}</TableCell>
                <TableCell><code>{set.code}</code></TableCell>
                <TableCell>{set.modules.length} modules</TableCell>
                <TableCell>
                  <Chip
                    label={set.isSystem ? 'System' : 'Custom'}
                    color={set.isSystem ? 'default' : 'primary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={set.isActive ? 'Active' : 'Inactive'}
                    color={set.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1}>
                    <IconButton onClick={() => handleEdit(set)} size="small">
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={() => {
                        setEditingSet(set);
                        setBuilderOpen(true);
                      }}
                      size="small"
                      title="Configure Modules"
                    >
                      <Apps fontSize="small" />
                    </IconButton>
                    <IconButton onClick={() => handleClone(set._id)} size="small">
                      <ContentCopy fontSize="small" />
                    </IconButton>
                    {!set.isSystem && (
                      <IconButton
                        onClick={() => handleDelete(set._id)}
                        size="small"
                        color="error"
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditingSet(null);
        }}
        maxWidth="md"
        fullWidth
      >
        <ModuleSetForm
          moduleSet={editingSet}
          onSave={handleSave}
          onCancel={() => {
            setDialogOpen(false);
            setEditingSet(null);
          }}
        />
      </Dialog>

      <Dialog
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <ModuleSetBuilder
          moduleSet={editingSet}
          onClose={() => setBuilderOpen(false)}
        />
      </Dialog>
    </div>
  );
};

export default ModuleSetsPage;
```

#### 6.5.4 Module Set Builder

```typescript
// react/src/feature-module/super-admin/module-sets/ModuleSetBuilder.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Divider,
  Checkbox,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useModules } from '../../../../hooks/useModules';
import { ModuleSet } from '../../../../types/modules';
import api from '../../../../services/api';

interface ModuleSetBuilderProps {
  moduleSet: ModuleSet | null;
  onClose: () => void;
}

const ModuleSetBuilder: React.FC<ModuleSetBuilderProps> = ({ moduleSet, onClose }) => {
  const { modules } = useModules();
  const [selectedModules, setSelectedModules] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (moduleSet) {
      setSelectedModules(new Set(moduleSet.modules.map(m => m._id)));
    }
  }, [moduleSet]);

  // Group modules by category
  const groupedModules = React.useMemo(() => {
    const groups: Record<string, typeof modules> = {};
    modules.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [modules]);

  const handleToggleModule = (moduleId: string) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  const handleCategoryToggle = (categoryModules: typeof modules) => {
    const allSelected = categoryModules.every(m => selectedModules.has(m._id));
    setSelectedModules(prev => {
      const next = new Set(prev);
      categoryModules.forEach(m => {
        if (allSelected) {
          next.delete(m._id);
        } else {
          next.add(m._id);
        }
      });
      return next;
    });
  };

  const handleSave = async () => {
    if (!moduleSet) return;
    setSaving(true);
    try {
      await api.put(`/super-admin/module-sets/${moduleSet._id}`, {
        modules: Array.from(selectedModules)
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Configure Modules: {moduleSet?.displayName}
      </Typography>

      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Typography variant="body2" color="text.secondary">
          {selectedModules.size} modules selected
        </Typography>
      </Stack>

      {Object.entries(groupedModules).map(([category, categoryModules]) => {
        const selectedInCategory = categoryModules.filter(m => selectedModules.has(m._id)).length;

        return (
          <Accordion key={category} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box display="flex" alignItems="center" gap={2} width="100%">
                <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                  {category}
                </Typography>
                <Chip
                  size="small"
                  label={`${selectedInCategory}/${categoryModules.length}`}
                  color={selectedInCategory > 0 ? 'primary' : 'default'}
                />
                <Checkbox
                  checked={selectedInCategory === categoryModules.length}
                  indeterminate={selectedInCategory > 0 && selectedInCategory < categoryModules.length}
                  onChange={() => handleCategoryToggle(categoryModules)}
                  onClick={(e) => e.stopPropagation()}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box display="grid" gridTemplateColumns="repeat(auto-fill, minmax(250px, 1fr))" gap={2}>
                {categoryModules.map(module => (
                  <Box
                    key={module._id}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: selectedModules.has(module._id) ? 'primary.main' : 'divider',
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor: selectedModules.has(module._id) ? 'action.selected' : 'background.paper'
                    }}
                    onClick={() => handleToggleModule(module._id)}
                  >
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedModules.has(module._id)}
                          onChange={() => handleToggleModule(module._id)}
                        />
                      }
                      label={
                        <Box>
                          <Typography variant="body2">
                            {module.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {module.code}
                          </Typography>
                        </Box>
                      }
                    />
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Divider sx={{ my: 3 }} />

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Stack>
    </Box>
  );
};

export default ModuleSetBuilder;
```

#### 6.5.5 Custom Modules (Company) Page

```typescript
// react/src/feature-module/super-admin/custom-modules/index.tsx
import React, { useState } from 'react';
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import { Settings } from '@mui/icons-material';
import { useCompaniesWithCustomModules } from '../../../../hooks/useCompaniesWithCustomModules';
import CompanyModuleEditor from './CompanyModuleEditor';

const CustomModulesPage: React.FC = () => {
  const { companies, loading } = useCompaniesWithCustomModules();
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const handleEditCompany = (company: any) => {
    setSelectedCompany(company);
    setEditorOpen(true);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Company Module Customization</h1>
        <Chip
          label={`${companies.length} companies with custom modules`}
          color="primary"
        />
      </div>

      <p className="text-gray-600 mb-4">
        Companies listed here have customized their module set beyond their plan's default configuration.
      </p>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Current Plan</TableCell>
              <TableCell>Base Module Set</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company._id}>
                <TableCell>{company.name}</TableCell>
                <TableCell>{company.email}</TableCell>
                <TableCell>{company.plan_name}</TableCell>
                <TableCell>{company.moduleSetId?.displayName || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label="Custom"
                    color="warning"
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Settings />}
                    onClick={() => handleEditCompany(company)}
                  >
                    Configure
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {companies.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="body1" color="text.secondary">
            No companies with custom modules found.
          </Typography>
        </Box>
      )}

      <CompanyModuleEditor
        companyId={selectedCompany?._id}
        open={editorOpen}
        onClose={() => {
          setEditorOpen(false);
          setSelectedCompany(null);
        }}
      />
    </div>
  );
};

export default CustomModulesPage;
```

#### 6.5.6 Company Module Editor

```typescript
// react/src/feature-module/super-admin/custom-modules/CompanyModuleEditor.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  TextField,
  Alert
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Add, Remove } from '@mui/icons-material';
import { useCompanyModules } from '../../../../hooks/useCompanyModules';
import { useModuleSets } from '../../../../hooks/useModuleSets';

interface CompanyModuleEditorProps {
  companyId: string | null;
  open: boolean;
  onClose: () => void;
}

const CompanyModuleEditor: React.FC<CompanyModuleEditorProps> = ({ companyId, open, onClose }) => {
  const { data, loading, enableModule, disableModule, resetToPlan } = useCompanyModules(companyId || '');
  const [reason, setReason] = useState('');
  const [pendingAction, setPendingAction] = useState<{ type: 'enable' | 'disable', moduleId: string } | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  if (!companyId) return null;

  const groupedModules = React.useMemo(() => {
    if (!data?.baseModules) return {};

    const groups: Record<string, any[]> = {};
    data.baseModules.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    return groups;
  }, [data]);

  const isModuleEnabled = (moduleId: string) => {
    return data?.activeModules?.some(m => m._id === moduleId);
  };

  const isModuleCustomEnabled = (moduleId: string) => {
    return data?.customEnabled?.some(m => m._id === moduleId);
  };

  const isModuleCustomDisabled = (moduleId: string) => {
    return data?.customDisabled?.some(m => m._id === moduleId);
  };

  const getModuleStatus = (moduleId: string) => {
    if (isModuleCustomDisabled(moduleId)) return 'disabled';
    if (isModuleCustomEnabled(moduleId)) return 'custom-enabled';
    if (isModuleEnabled(moduleId)) return 'enabled';
    return 'not-in-plan';
  };

  const handleModuleAction = (type: 'enable' | 'disable', moduleId: string) => {
    setPendingAction({ type, moduleId });
    setConfirmDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    try {
      if (pendingAction.type === 'enable') {
        await enableModule(pendingAction.moduleId, reason);
      } else {
        await disableModule(pendingAction.moduleId, reason);
      }
      setConfirmDialogOpen(false);
      setPendingAction(null);
      setReason('');
    } catch (error) {
      console.error('Error updating module:', error);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Reset all module customizations to plan default?')) {
      await resetToPlan();
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          Module Configuration for {data?.companyName}
        </DialogTitle>

        <DialogContent>
          {loading ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>Loading...</Box>
          ) : (
            <>
              {data?.isCustom && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  This company has customized modules. <Button onClick={handleReset}>Reset to Plan</Button>
                </Alert>
              )}

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Plan: <strong>{data?.moduleSetId?.displayName}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active Modules: <strong>{data?.activeModules?.length}</strong>
                </Typography>
              </Box>

              {Object.entries(groupedModules).map(([category, modules]) => (
                <Accordion key={category} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                      {category}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={1}>
                      {modules.map((module) => {
                        const status = getModuleStatus(module._id);

                        return (
                          <Box
                            key={module._id}
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              p: 1.5,
                              border: '1px solid',
                              borderColor: 'divider',
                              borderRadius: 1
                            }}
                          >
                            <Box>
                              <Typography variant="body2">{module.displayName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {module.code}
                              </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} alignItems="center">
                              <Chip
                                size="small"
                                label={
                                  status === 'custom-enabled' ? 'Custom Enabled' :
                                  status === 'custom-disabled' ? 'Disabled' :
                                  status === 'enabled' ? 'From Plan' :
                                  'Not Available'
                                }
                                color={
                                  status === 'custom-enabled' ? 'success' :
                                  status === 'custom-disabled' ? 'error' :
                                  status === 'enabled' ? 'default' :
                                  'default'
                                }
                              />

                              {status !== 'not-in-plan' && (
                                <Button
                                  size="small"
                                  variant={status === 'custom-disabled' ? 'contained' : 'outlined'}
                                  startIcon={status === 'custom-disabled' ? <Add /> : <Remove />}
                                  onClick={() => handleModuleAction(
                                    status === 'custom-disabled' ? 'enable' : 'disable',
                                    module._id
                                  )}
                                >
                                  {status === 'custom-disabled' ? 'Enable' : 'Disable'}
                                </Button>
                              )}
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              ))}

              {data?.changeLog && data.changeLog.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" gutterBottom>Recent Changes</Typography>
                  <Stack spacing={1}>
                    {data.changeLog.slice(-5).reverse().map((log, idx) => (
                      <Box key={idx} sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                        <Typography variant="caption">
                          {log.action === 'enabled' ? 'Enabled' : 'Disabled'} module - {new Date(log.changedAt).toLocaleString()}
                          {log.reason && ` (${log.reason})`}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>Confirm Module Change</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Reason (optional)"
            multiline
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this change being made?"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmAction} variant="contained">
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CompanyModuleEditor;
```

### 6.6 Updated Packages Page

```typescript
// react/src/feature-module/super-admin/packages/packagegrid.tsx
// UPDATE the plan modules selection in Edit Plan Modal

// Instead of hardcoded checkboxes:
<div className="col-lg-12">
  <h6>Plan Modules</h6>
  <FormControl fullWidth>
    <InputLabel>Select Module Set</InputLabel>
    <Select
      value={planData.moduleSetId || ''}
      onChange={(e) => setPlanData({ ...planData, moduleSetId: e.target.value })}
      label="Module Set"
    >
      {moduleSets.map(set => (
        <MenuItem key={set._id} value={set._id}>
          {set.displayName} ({set.modules.length} modules)
        </MenuItem>
      ))}
    </Select>
  </FormControl>
  <Button
    size="small"
    onClick={() => navigate('/super-admin/module-sets')}
    sx={{ mt: 1 }}
  >
    Manage Module Sets
  </Button>
</div>
```

---

## 7. Module Management System

### 7.1 Module Registry Design

The Module Registry serves as the single source of truth for all modules in the system.

**Key Features:**
1. **Centralized Module Definition** - All modules defined in one place
2. **Field Configuration** - Each module can define its configurable fields
3. **Permission Mapping** - Modules link to their required permissions
4. **Categorization** - Modules organized by category (HRM, Projects, Finance, etc.)

**Default Modules to Seed:**

| Code | Name | Category | Route |
|------|------|----------|-------|
| `employees` | Employees | hrm | /employees |
| `attendance` | Attendance | hrm | /attendance |
| `leaves` | Leave Management | hrm | /leaves |
| `holidays` | Holidays | hrm | /holidays |
| `payroll` | Payroll | hrm | /payroll |
| `performance` | Performance | hrm | /performance |
| `projects` | Projects | projects | /projects |
| `tasks` | Tasks | projects | /tasks |
| `kanban` | Kanban Board | projects | /kanban |
| `invoices` | Invoices | finance | /invoices |
| `expenses` | Expenses | finance | /expenses |
| `estimates` | Estimates | finance | /estimates |
| `reports` | Reports | admin | /reports |
| `settings` | Settings | admin | /settings |
| `leads` | Leads | sales | /leads |
| `deals` | Deals | sales | /deals |
| `tickets` | Tickets | operations | /tickets |
| `assets` | Assets | operations | /assets |

### 7.2 Module Set Design

Module Sets are reusable combinations of modules that can be assigned to plans.

**Default Module Sets:**

| Code | Name | Modules |
|------|------|---------|
| `starter` | Starter | employees, attendance, leaves |
| `basic_hrm` | Basic HRM | employees, attendance, leaves, holidays, payroll |
| `professional` | Professional | + projects, tasks, reports |
| `enterprise` | Enterprise | + invoices, expenses, assets, performance |
| `full_suite` | Full Suite | All modules |

---

## 8. Company Module Customization

### 8.1 Customization Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   COMPANY MODULE CUSTOMIZATION                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Company subscribes to Plan X                                 │
│     └── Plan X has Module Set Y (e.g., "Basic HRM")               │
│         └── Modules: [employees, attendance, leaves, payroll]    │
│                                                                  │
│  2. Super Admin adds custom module for company:                  │
│     └── Enable: [projects, tasks]                                │
│     └── Disable: [payroll]                                       │
│                                                                  │
│  3. Company's Active Modules:                                    │
│     └── [employees, attendance, leaves, projects, tasks]          │
│                                                                  │
│  4. Employees inherit company's active modules + role check       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 API Response for Company Modules

```json
{
  "success": true,
  "data": {
    "companyId": "64abc123",
    "companyName": "Acme Corporation",
    "moduleSetId": {
      "_id": "64xyz789",
      "name": "Basic HRM",
      "displayName": "Basic HRM Package",
      "modules": [
        { "_id": "m1", "code": "employees", "name": "Employees" },
        { "_id": "m2", "code": "attendance", "name": "Attendance" },
        { "_id": "m3", "code": "leaves", "name": "Leave Management" },
        { "_id": "m4", "code": "payroll", "name": "Payroll" }
      ]
    },
    "isCustom": true,
    "baseModules": [...],
    "customEnabled": [
      { "_id": "m5", "code": "projects", "name": "Projects" },
      { "_id": "m6", "code": "tasks", "name": "Tasks" }
    ],
    "customDisabled": [
      { "_id": "m4", "code": "payroll", "name": "Payroll" }
    ],
    "activeModules": [
      { "_id": "m1", "code": "employees", "name": "Employees" },
      { "_id": "m2", "code": "attendance", "name": "Attendance" },
      { "_id": "m3", "code": "leaves", "name": "Leave Management" },
      { "_id": "m5", "code": "projects", "name": "Projects" },
      { "_id": "m6", "code": "tasks", "name": "Tasks" }
    ],
    "changeLog": [
      {
        "moduleId": "m5",
        "action": "enabled",
        "changedBy": "admin@company.com",
        "changedAt": "2025-01-15T10:30:00Z",
        "reason": "Client requested project management features"
      }
    ]
  }
}
```

---

## 9. Security Considerations

### 9.1 Module Access Security Matrix

| Level | Check | Description |
|-------|-------|-------------|
| **L1** | Authentication | User is logged in |
| **L2** | Role Check | User's role exists |
| **L3** | Module Access | Role has access to module |
| **L4** | Company Subscription | Company has module in plan |
| **L5** | Permission | User has specific permission (e.g., employees.edit) |
| **L6** | Field Access | User can access specific field (e.g., salary) |

### 9.2 Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                        CACHE KEYS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Role Modules:    role:{roleId}:modules      (30 min TTL)       │
│  Company Modules:  company:{companyId}:modules (30 min TTL)      │
│  Module Sets:     moduleSet:{setId}:modules  (1 hour TTL)       │
│  Permissions:     permissions:{roleId}        (1 hour TTL)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Cache Invalidation Triggers

| Event | Cache Keys to Clear |
|-------|-------------------|
| Role updated | `role:{roleId}:modules`, `permissions:{roleId}` |
| Module Set updated | `moduleSet:{setId}:modules`, all `company:*:modules` using set |
| Company module customized | `company:{companyId}:modules` |
| Plan updated (new module set) | All `company:*:modules` using this plan |

---

## 10. "All Modules & Permissions" Feature

### 10.1 Feature Overview

When a role is assigned ALL available modules and permissions, it should have access to ALL UI elements and functionality (except Super Admin exclusive features).

### 10.2 Implementation

**Role Schema Enhancement:**

```javascript
// backend/models/rbac/role.schema.js
const roleSchema = new mongoose.Schema({
  // ... existing fields ...

  // Flag to indicate this role has all access (except superadmin features)
  hasAllAccess: {
    type: Boolean,
    default: false
  },

  // Wildcard permission for all modules
  allowedModules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Module'
  }],

  // Helper method to check if role has access to everything
  hasAccessToAllModules: function() {
    return this.hasAllAccess || this.allowedModules.length === 0; // Empty = all
  }
});
```

**Permission Check Logic:**

```javascript
// backend/middleware/checkPermission.js
exports.checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const role = await Role.findById(req.user.roleId).populate('allowedModules permissions');

      // Superadmin bypass
      if (role.level >= 100) {
        return next();
      }

      // Check if role has all access
      if (role.hasAllAccess || role.allowedModules.length === 0) {
        // Still exclude superadmin-only routes
        const superAdminOnlyRoutes = ['/super-admin', '/api/super-admin'];
        const isSuperAdminRoute = superAdminOnlyRoutes.some(route =>
          req.originalUrl.startsWith(route)
        );

        if (isSuperAdminRoute) {
          return res.status(403).json({
            success: false,
            error: 'Super Admin access required'
          });
        }

        return next();
      }

      // Regular permission check
      // ... existing logic
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  };
};
```

**Frontend "Select All" Handler:**

```typescript
// react/src/feature-module/super-admin/rbac/roles/RolePermissionsMatrix.tsx

const handleSelectAllModules = () => {
  setSelectedModules(new Set(modules.map(m => m._id)));
  setIsAllAccess(true);
};

const handleDeselectAllModules = () => {
  setSelectedModules(new Set());
  setIsAllAccess(false);
};

// When saving
const handleSave = async () => {
  const roleData = isAllAccess
    ? {
        ...formData,
        allowedModules: [], // Empty array = all modules
        hasAllAccess: true,
        permissions: [] // Empty = all permissions
      }
    : {
        ...formData,
        allowedModules: Array.from(selectedModules),
        hasAllAccess: false,
        permissions: Array.from(selectedPermissions)
      };

  await updateRole(roleId, roleData);
};
```

**UI Indicator:**

```typescript
// Show badge when role has all access
{role.hasAllAccess && (
  <Chip
    icon={<Star />}
    label="Full Access (All Modules)"
    color="primary"
    size="small"
  />
)}
```

### 10.3 Access Matrix for "All Access" Role

| Feature | Superadmin | All Access Role | Regular Role |
|---------|-----------|-----------------|--------------|
| All Company Modules | ✅ | ✅ | ✅ (if assigned) |
| Super Admin Dashboard | ✅ | ❌ | ❌ |
| Company Management | ✅ | ❌ | ❌ |
| Package Management | ✅ | ❌ | ❌ |
| Module Registry | ✅ | ❌ | ❌ |
| RBAC Management | ✅ | ❌ | ❌ |
| Employee CRUD | ✅ | ✅ | Role-based |
| Export Functions | ✅ | ✅ | Role-based |
| All Module UI | ✅ | ✅ | Role-based |
| Settings | ✅ | ✅ | Role-based |

---

## 11. Migration Strategy for Existing Role Checks

### 11.1 Files Requiring Migration

**40+ Backend Controllers** need gradual migration:

**Priority 1 - Critical Business Logic:**
1. `backend/controllers/rest/employee.controller.js`
2. `backend/controllers/rest/leave.controller.js`
3. `backend/controllers/rest/attendance.controller.js`
4. `backend/controllers/rest/payroll.controller.js`
5. `backend/controllers/rest/resignation.controller.js`
6. `backend/controllers/rest/termination.controller.js`
7. `backend/controllers/rest/promotion.controller.js`

**Priority 2 - High Volume Operations:**
8. `backend/controllers/candidates/candidates.controllers.js`
9. `backend/controllers/projects/project.controller.js`
10. `backend/controllers/jobs/jobs.controllers.js`
11. `backend/controllers/invoice/invoice.controller.js`
12. `backend/controllers/assets/asset.controller.js`

**Priority 3 - Supporting Features:**
13-40. All other controllers

**30+ Frontend Components** need gradual migration:

**Priority 1 - Core Navigation:**
1. `react/src/core/data/json/sidebarMenu.jsx`
2. `react/src/core/common/header/index.tsx`
3. `react/src/core/common/sidebar/index.tsx`

**Priority 2 - Major Features:**
4. `react/src/feature-module/hrm/employees/employeedetails.tsx`
5. `react/src/feature-module/mainMenu/adminDashboard/index.tsx`
6. `react/src/feature-module/mainMenu/hrDashboard/index.tsx`
7. `react/src/feature-module/pages/profile/profile-management.tsx`

**Priority 3 - Supporting Features:**
8-30. All other role-based components

### 11.2 Migration Approach

**Phase A - Add New System Alongside Old (Week 1-2)**

```javascript
// Example: Adding new check alongside existing
// backend/controllers/rest/employee.controller.js

// OLD - Keep working
exports.getEmployees = async (req, res) => {
  if (!['admin', 'hr', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  // ... existing logic
};

// NEW - Add alongside, not replacing
exports.getEmployeesV2 = async (req, res) => {
  // Use new middleware
  const hasModuleAccess = await checkModuleAccess(req.user.roleId, 'employees');
  const hasPermission = await checkPermission(req.user.roleId, 'employees.view');

  if (!hasModuleAccess || !hasPermission) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  // ... same logic
};
```

**Phase B - Feature Flag Toggle (Week 2-3)**

```javascript
// backend/config/features.js
module.exports = {
  USE_NEW_RBAC_SYSTEM: process.env.USE_NEW_RBAC_SYSTEM === 'true',
  RBAC_MIGRATION_MODE: process.env.RBAC_MIGRATION_MODE || 'off' // off, logging, enforced
};

// Usage in controllers
const { USE_NEW_RBAC_SYSTEM, RBAC_MIGRATION_MODE } = require('../config/features');

exports.getEmployees = async (req, res) => {
  let authorized = false;

  if (USE_NEW_RBAC_SYSTEM) {
    // New check
    authorized = await checkNewRBAC(req);
  } else {
    // Old check
    authorized = ['admin', 'hr', 'superadmin'].includes(req.user.role);
  }

  // Migration mode - log but don't enforce
  if (RBAC_MIGRATION_MODE === 'logging') {
    const oldAuth = ['admin', 'hr', 'superadmin'].includes(req.user.role);
    const newAuth = await checkNewRBAC(req);
    if (oldAuth !== newAuth) {
      console.warn(`RBAC MISMATCH: ${req.originalUrl}`, {
        user: req.user.userId,
        role: req.user.role,
        old: oldAuth,
        new: newAuth
      });
    }
    authorized = oldAuth; // Still use old during migration
  }

  if (!authorized) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  // ... existing logic
};
```

**Phase C - Gradual Controller Migration (Week 3-6)**

Create a migration tracker:

```javascript
// backend/migrations/rbacMigrationStatus.js
module.exports = {
  MIGRATED_CONTROLLERS: new Set([
    'employee.controller.js',
    'leave.controller.js',
    // Add as migrated
  ]),

  CONTROLLER_MIGRATION_PRIORITY: {
    'employee.controller.js': 1,
    'leave.controller.js': 1,
    'attendance.controller.js': 1,
    'payroll.controller.js': 1,
    'resignation.controller.js': 1,
    'termination.controller.js': 1,
    'promotion.controller.js': 1,
    // ... rest with priorities
  }
};
```

**Phase D - Frontend Component Migration (Week 4-7)**

```typescript
// react/src/core/components/RoleBasedRenderer/index.tsx

// Add compatibility layer
interface RoleBasedRendererProps {
  allowedRoles?: UserRole[];
  allowedModules?: string[]; // NEW
  allowedPermissions?: string[]; // NEW
  useNewRBAC?: boolean; // Feature flag
}

export const RoleBasedRenderer: React.FC<RoleBasedRendererProps> = ({
  allowedRoles,
  allowedModules,
  allowedPermissions,
  useNewRBAC = false,
  children
}) => {
  const { role } = useAuth();
  const { accessibleModules, hasPermission } = useModuleAccess();

  let canView = false;

  if (useNewRBAC && allowedModules && allowedPermissions) {
    // New check
    const moduleAccessible = allowedModules.some(m =>
      accessibleModules.some(am => am.code === m)
    );
    const hasRequiredPermission = allowedPermissions.some(p =>
      hasPermission(p)
    );
    canView = moduleAccessible && hasRequiredPermission;
  } else if (allowedRoles) {
    // Old check
    canView = hasPermission(role, allowedRoles);
  }

  return canView ? <>{children}</> : null;
};
```

### 11.3 Migration Script

```javascript
// backend/migrations/migrateRoleChecks.js
const fs = require('fs');
const path = require('path');

const ROLE_CHECK_PATTERNS = [
  /req\.user\.role\s*===?\s*['"`]([^'"`]+)['"`]/g,
  /socket\.userMetadata\?\.role\s*===?\s*['"`]([^'"`]+)['"`]/g,
  /\[?['"]?(admin|hr|manager|employee|superadmin)['"]?\]?.*\.includes\s*\(\s*req\.user\.role/g,
  /requireRole\s*\(\s*\([^)]+\)\s*\)/g
];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const findings = [];

  ROLE_CHECK_PATTERNS.forEach((pattern, index) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      findings.push({
        type: `Pattern_${index}`,
        match: match[0],
        line: content.substring(0, match.index).split('\n').length
      });
    }
  });

  return findings;
}

function scanDirectory(dir, extension) {
  const findings = [];

  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      findings.push(...scanDirectory(fullPath, extension));
    } else if (file.name.endsWith(extension)) {
      const fileFindings = scanFile(fullPath);
      if (fileFindings.length > 0) {
        findings.push({ file: fullPath, findings: fileFindings });
      }
    }
  }

  return findings;
}

// Run scan
const controllerFindings = scanDirectory(
  path.join(__dirname, '../controllers'),
  '.js'
);
const componentFindings = scanDirectory(
  path.join(__dirname, '../../react/src'),
  '.tsx'
);

console.log('Files requiring migration:');
console.log(JSON.stringify(controllerFindings, null, 2));
console.log(JSON.stringify(componentFindings, null, 2));
```

### 11.4 Export Function Migration

**Current State:** Export operations log roles but don't enforce permissions.

**Required Changes:**

```javascript
// backend/controllers/candidates/candidates.controllers.js

// BEFORE (current)
socket.on('candidate:export-pdf', async (data, callback) => {
  console.log('Role:', socket.userMetadata?.role); // Only logs!
  // ... export logic
});

// AFTER (with permission check)
const { checkPermission } = require('../../middleware/auth');
const { checkModuleAccess } = require('../../middleware/checkModuleAccess');

socket.on('candidate:export-pdf', async (data, callback) => {
  // Check if user can access candidates module
  const hasModuleAccess = await checkModuleAccess(socket, 'candidates');
  if (!hasModuleAccess) {
    return callback({ done: false, message: 'Module access denied' });
  }

  // Check export permission
  const hasExportPermission = await checkPermission(socket, 'candidates.export');
  if (!hasExportPermission) {
    return callback({ done: false, message: 'Export permission denied' });
  }

  // Log for audit
  console.log('Export PDF by:', {
    userId: socket.userId,
    role: socket.userMetadata?.role,
    action: 'candidate:export-pdf',
    timestamp: new Date()
  });

  // ... export logic
});
```

**Export Permissions to Add:**

| Module | Permission |
|--------|------------|
| candidates | `candidates.export` |
| profiles | `profiles.export` |
| jobs | `jobs.export` |
| employees | `employees.export` |
| payroll | `payroll.export` |
| attendance | `attendance.export` |
| leaves | `leaves.export` |
| projects | `projects.export` |
| invoices | `invoices.export` |

### 11.5 Rollback Plan

If issues arise during migration:

1. **Immediate Rollback:**
   ```bash
   # Environment variable
   export USE_NEW_RBAC_SYSTEM=false
   ```

2. **Database Rollback:**
   ```javascript
   // Keep old role field until migration complete
   // Don't remove until all controllers migrated
   role: {
     type: String,
     enum: ['superadmin', 'admin', 'hr', 'manager', 'leads', 'employee'],
     default: 'employee'
   },
   // New field
   roleId: {
     type: mongoose.Schema.Types.ObjectId,
     ref: 'Role'
   }
   ```

3. **Code Rollback:**
   - Git revert specific commits
   - Keep migration branches separate from main

---

## 12. Phase-by-Phase Implementation Plan (Updated)

### Phase 0: Pre-Implementation (Week 0)

**Planning & Analysis:**
- [ ] Review complete RBAC file inventory (40+ controllers, 30+ components)
- [ ] Map all role check patterns in codebase
- [ ] Identify export operations requiring permission checks
- [ ] Document all approval workflows and their role requirements
- [ ] Create migration priority list
- [ ] Set up feature flags for gradual rollout

**Deliverable:** Complete migration roadmap with file-by-file breakdown

---

### Phase 1: Foundation (Week 1-2)

**Backend:**
- [ ] Create Module schema (`backend/models/rbac/module.schema.js`)
- [ ] Create ModuleSet schema (`backend/models/rbac/moduleSet.schema.js`)
- [ ] Create Permission schema (`backend/models/rbac/permission.schema.js`)
- [ ] Create Role schema (`backend/models/rbac/role.schema.js`) with `hasAllAccess` flag
- [ ] Create RoleAssignment schema (`backend/models/rbac/roleAssignment.schema.js`)
- [ ] Update Package schema to use `moduleSetId`
- [ ] Update Company schema with `customModules` and `getActiveModules()` method
- [ ] Update Employee schema to add `roleId` field (keep `role` for migration)
- [ ] Create modules controller
- [ ] Create module sets controller
- [ ] Create company modules controller
- [ ] Add `checkModuleAccess` middleware
- [ ] Add `checkPermission` with "All Access" support
- [ ] Add export permission checks to all export operations

**Database:**
- [ ] Run migration to create new collections
- [ ] Seed default modules (20+ modules including: employees, attendance, leaves, holidays, payroll, performance, projects, tasks, kanban, invoices, expenses, estimates, reports, settings, leads, deals, tickets, assets)
- [ ] Seed default permissions (100+ permissions across all modules)
- [ ] Create default module sets: Starter, Basic HRM, Professional, Enterprise, Full Suite
- [ ] Create system roles with permission mappings
- [ ] Migrate existing `planModules` to module sets
- [ ] Create migration script to link existing employees to Role documents

**Frontend:**
- [ ] Create `react/src/types/modules.ts`
- [ ] Create `react/src/types/rbac.ts`
- [ ] Create `react/src/contexts/ModuleAccessContext.tsx`
- [ ] Add feature flag: `USE_NEW_RBAC_SYSTEM`

**Deliverable:** Database ready, API endpoints working, feature flags in place

---

### Phase 2: Super Admin Module Management UI (Week 2-3)

**Frontend:**
- [ ] Create Modules Registry page (`/super-admin/modules`)
- [ ] Create Module Set Builder page (`/super-admin/module-sets`)
- [ ] Create hooks: `useModules`, `useModuleSets`
- [ ] Add module form with field configuration
- [ ] Add module set builder with drag-drop interface

**Integration:**
- [ ] Connect frontend to backend APIs
- [ ] Test module CRUD operations
- [ ] Test module set creation and editing

**Deliverable:** Super Admin can manage modules and module sets

---

### Phase 3: Company Module Customization (Week 3-4)

**Backend:**
- [ ] Create company modules controller
- [ ] Add `getActiveModules()` method to Company schema
- [ ] Implement module change logging

**Frontend:**
- [ ] Create Custom Modules page (`/super-admin/custom-modules`)
- [ ] Create Company Module Editor component
- [ ] Add hooks: `useCompanyModules`, `useCompaniesWithCustomModules`

**Deliverable:** Super Admin can customize modules per company

---

### Phase 4: Update Packages Page (Week 4)

**Frontend:**
- [ ] Update Edit Plan modal to use Module Set dropdown
- [ ] Remove hardcoded module checkboxes
- [ ] Add link to Module Sets page

**Backend:**
- [ ] Ensure backward compatibility with `planModules` array

**Deliverable:** Plans now reference module sets instead of hardcoded arrays

---

### Phase 5: Role-Module Integration (Week 5)

**Backend:**
- [ ] Update Role schema with `allowedModules` array
- [ ] Update Role schema with `modulePermissions` array
- [ ] Add `hasAllAccess` flag and helper methods to Role schema
- [ ] Update roles controller to handle module mapping
- [ ] Update module access check to validate both role + company
- [ ] Add wildcard support for "All Access" roles
- [ ] Add permission cache invalidation on role changes

**Frontend:**
- [ ] Update Role Management page to include module selection
- [ ] Add "Select All Modules" checkbox with "Full Access" badge
- [ ] Add module selection matrix in Role Permissions
- [ ] Update sidebar to filter by accessible modules
- [ ] Add module access to `useAuth` hook
- [ ] Create `useModuleAccess` hook

**Critical Files to Update:**
- [ ] `react/src/hooks/useAuth.ts` - Add module access
- [ ] `react/src/core/data/json/sidebarMenu.jsx` - Module filtering
- [ ] `react/src/core/common/sidebar/index.tsx` - Dynamic menu based on modules

**Deliverable:** Roles now have explicit module access control + "All Access" feature

---

### Phase 6: RBAC Dashboard Integration (Week 5-6)

**Frontend:**
- [ ] Create unified RBAC dashboard with tabs:
  - Roles (with module mapping)
  - Permissions
  - Bulk Assignment
  - Audit Log
- [ ] Add navigation to:
  - Modules Registry (`/super-admin/modules`)
  - Module Sets (`/super-admin/module-sets`)
  - Custom Modules (`/super-admin/custom-modules`)
  - RBAC (`/super-admin/rbac`)
- [ ] Add Role Fields Configuration page (`/super-admin/rbac/role-fields`)
- [ ] Update Super Admin sidebar to include new menu items

**Super Admin Menu Updates:**
- [ ] Add "Module Registry" menu item
- [ ] Add "Module Sets" menu item
- [ ] Add "Custom Modules" menu item
- [ ] Add "Role Management" menu item (consolidates RBAC)

**Deliverable:** Complete RBAC + Module management interface

---

### Phase 7: Backend Controller Migration (Week 6-8)

**Priority 1 Controllers - Core Business Logic:**
- [ ] `backend/controllers/rest/employee.controller.js` - Add module + permission checks
- [ ] `backend/controllers/rest/leave.controller.js` - Add module + permission checks
- [ ] `backend/controllers/rest/attendance.controller.js` - Add module + permission checks
- [ ] `backend/controllers/rest/payroll.controller.js` - Add module + permission checks (if exists)
- [ ] `backend/controllers/rest/resignation.controller.js` - Add module + permission checks
- [ ] `backend/controllers/rest/termination.controller.js` - Add module + permission checks
- [ ] `backend/controllers/rest/promotion.controller.js` - Add module + permission checks

**Priority 2 Controllers - High Volume Operations:**
- [ ] `backend/controllers/candidates/candidates.controllers.js` - Add export permission checks
- [ ] `backend/controllers/projects/project.controller.js` - Add module + permission checks
- [ ] `backend/controllers/jobs/jobs.controllers.js` - Add export permission checks
- [ ] `backend/controllers/invoice/invoice.socket.controller.js` - Add module + permission checks
- [ ] `backend/controllers/assets/asset.socket.controller.js` - Add module + permission checks

**Export Function Migration:**
- [ ] Add `candidates.export` permission check to `candidate:export-pdf`
- [ ] Add `candidates.export` permission check to `candidate:export-excel`
- [ ] Add `profiles.export` permission check to `profile:export-pdf`
- [ ] Add `profiles.export` permission check to `profile:export-excel`
- [ ] Add `jobs.export` permission check to `job:export-pdf`
- [ ] Add `jobs.export` permission check to `job:export-excel`

**Approval Workflow Migration:**
- [ ] `backend/controllers/rest/leave.controller.js` - Workflow: Employee request → Manager/Admin/HR approve
- [ ] `backend/controllers/rest/overtime.controller.js` - Workflow: Employee request → Manager/Admin/HR approve
- [ ] Ensure role hierarchy in approvals (Manager > HR > Admin)

**Migration Approach:**
- [ ] Use feature flag: `RBAC_MIGRATION_MODE = 'logging'` first
- [ ] Log mismatches between old and new checks
- [ ] Gradually enable enforcement per controller
- [ ] Keep old checks as fallback

**Deliverable:** All controllers migrated to new RBAC system with permission checks

---

### Phase 8: Frontend Component Migration (Week 7-9)

**Priority 1 Components - Core Navigation:**
- [ ] `react/src/core/data/json/sidebarMenu.jsx` - Module-based menu filtering
- [ ] `react/src/core/common/header/index.tsx` - Update for module access
- [ ] `react/src/core/common/sidebar/index.tsx` - Dynamic menu based on accessible modules

**Priority 2 Components - Major Features:**
- [ ] `react/src/feature-module/hrm/employees/employeedetails.tsx` - Use PermissionField for all fields
- [ ] `react/src/feature-module/mainMenu/adminDashboard/index.tsx` - Module-based card filtering
- [ ] `react/src/feature-module/mainMenu/hrDashboard/index.tsx` - Module-based card filtering
- [ ] `react/src/feature-module/pages/profile/profile-management.tsx` - Field-level permissions

**RoleBasedRenderer Updates:**
- [ ] Add `allowedModules` prop support
- [ ] Add `allowedPermissions` prop support
- [ ] Add `useNewRBAC` feature flag
- [ ] Update all existing `<RoleBasedRenderer>` usage gradually

**PermissionField Updates:**
- [ ] Ensure all field-level permissions respect module access
- [ ] Add export permission checks to export buttons
- [ ] Add edit/create/delete permission checks

**Components to Update (30+):**
- [ ] `react/src/core/modals/PromotionDetailsModal.tsx`
- [ ] `react/src/core/modals/ResignationDetailsModal.tsx`
- [ ] `react/src/core/modals/TerminationDetailsModal.tsx`
- [ ] `react/src/feature-module/hrm/promotion.tsx`
- [ ] `react/src/feature-module/hrm/resignation.tsx`
- [ ] `react/src/feature-module/hrm/termination.tsx`
- [ ] `react/src/feature-module/projects/task/task.tsx`
- [ ] `react/src/feature-module/projects/project/project.tsx`
- [ ] `react/src/feature-module/crm/companies/companiesList.tsx`
- [ ] `react/src/feature-module/crm/contacts/contactList.tsx`
- [ ] And 20+ more components...

**Deliverable:** All frontend components using new RBAC system

---

### Phase 9: Testing & Rollout (Week 9-10)

**Testing:**
- [ ] Unit tests for all new controllers
- [ ] Integration tests for module access flow
- [ ] Frontend component tests
- [ ] End-to-end testing

**Staging:**
- [ ] Deploy to staging environment
- [ ] Test with real companies
- [ ] Performance testing with cache

**Production Rollout:**
- [ ] Deploy backend changes
- [ ] Deploy frontend changes
- [ ] Monitor logs and performance
- [ ] Create documentation for admins

**Deliverable:** Production-ready module management system

---

### Phase 8: Advanced Features (Week 7-8) - Optional

**Features:**
- [ ] Modal-based field configuration per role
- [ ] Field-level permissions in UI
- [ ] Module usage analytics
- [ ] Module recommendations based on company size
- [ ] Bulk company module operations
- [ ] Module dependency management

---

## 11. Testing Strategy

### 11.1 Backend Tests

```javascript
// backend/integration-tests/modules.test.js
describe('Module Management API', () => {
  describe('Modules CRUD', () => {
    it('should create a new module', async () => {
      const response = await request(app)
        .post('/api/super-admin/modules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'test_module',
          name: 'Test Module',
          displayName: 'Test Module',
          category: 'hrm',
          route: '/test',
          icon: 'grid'
        });

      expect(response.status).toBe(201);
      expect(response.body.data.code).toBe('test_module');
    });

    it('should not allow duplicate module codes', async () => {
      const response = await request(app)
        .post('/api/super-admin/modules')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          code: 'employees', // duplicate
          name: 'Duplicate',
          displayName: 'Duplicate Module',
          category: 'hrm',
          route: '/duplicate'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Module Sets', () => {
    it('should create a module set with modules', async () => {
      const response = await request(app)
        .post('/api/super-admin/module-sets')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          name: 'Test Set',
          code: 'test_set',
          displayName: 'Test Set',
          modules: [module1Id, module2Id]
        });

      expect(response.status).toBe(201);
    });

    it('should not allow deleting system module sets', async () => {
      const response = await request(app)
        .delete('/api/super-admin/module-sets/system-id')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('Company Module Customization', () => {
    it('should enable module for company', async () => {
      const response = await request(app)
        .post('/api/super-admin/companies/companyId/modules/enable')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          moduleId: newModuleId,
          reason: 'Client request'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.customEnabled).toContain(newModuleId);
    });

    it('should get active modules for company', async () => {
      const response = await request(app)
        .get('/api/super-admin/companies/companyId/modules')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.activeModules).toBeDefined();
    });
  });

  describe('Module Access Check', () => {
    it('should allow access when role + company both have module', async () => {
      const response = await request(app)
        .get('/employees')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
    });

    it('should deny access when company lacks module', async () => {
      // Company has disabled 'projects' module
      const response = await request(app)
        .get('/projects')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('not included in your company');
    });

    it('should deny access when role lacks module', async () => {
      // Role does not have 'payroll' module
      const response = await request(app)
        .get('/payroll')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('not available for your role');
    });
  });
});
```

### 11.2 Frontend Tests

```typescript
// react/src/components/__tests__/ModuleManagement.test.tsx
describe('Module Management', () => {
  it('should render modules registry page', () => {
    render(<ModulesRegistry />);
    expect(screen.getByText('Module Registry')).toBeInTheDocument();
  });

  it('should create a new module', async () => {
    render(<ModulesRegistry />);

    fireEvent.click(screen.getByText('Add Module'));

    fireEvent.change(screen.getByLabelText('Display Name'), {
      target: { value: 'Test Module' }
    });
    fireEvent.change(screen.getByLabelText('Code'), {
      target: { value: 'test_module' }
    });

    fireEvent.click(screen.getByText('Create Module'));

    await waitFor(() => {
      expect(screen.getByText('Module created successfully')).toBeInTheDocument();
    });
  });

  it('should build module set with modules', async () => {
    render(<ModuleSetBuilder moduleSet={mockSet} onClose={jest.fn()} />);

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select first module

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/super-admin/module-sets/set123',
        expect.objectContaining({
          modules: expect.arrayContaining([expect.any(String)])
        })
      );
    });
  });

  it('should enable module for company', async () => {
    render(<CompanyModuleEditor companyId="comp123" open={true} onClose={jest.fn()} />);

    fireEvent.click(screen.getByText('Enable'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/super-admin/companies/comp123/modules/enable',
        expect.objectContaining({
          moduleId: expect.any(String)
        })
      );
    });
  });
});

describe('"All Access" Role Feature', () => {
  it('should show "Full Access" badge when role has all modules', () => {
    const mockRole = {
      _id: 'role1',
      name: 'Full Admin',
      hasAllAccess: true,
      allowedModules: []
    };

    render(<RoleForm role={mockRole} onSave={jest.fn()} onCancel={jest.fn()} />);

    expect(screen.getByText('Full Access (All Modules)')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /select all modules/i })).toBeChecked();
  });

  it('should allow access to all modules except superadmin', async () => {
    const { result } = renderHook(() => useModuleAccess(), {
      wrapper: ({ children }) => (
        <ModuleAccessProvider>
          {children}
        </ModuleAccessProvider>
      )
    });

    // Mock "All Access" role
    act(() => {
      result.current.setRole({
        _id: 'allAccessRole',
        hasAllAccess: true,
        allowedModules: []
      });
    });

    // Should have access to regular modules
    expect(result.current.canAccessModule('employees')).toBe(true);
    expect(result.current.canAccessModule('payroll')).toBe(true);

    // But NOT superadmin modules
    expect(result.current.canAccessModule('super-admin-companies')).toBe(false);
  });

  it('should save empty arrays when "All Access" is selected', async () => {
    const mockSave = jest.fn();

    render(<RolePermissionsMatrix
      role={{ _id: 'role1', hasAllAccess: true, allowedModules: [] }}
      onSave={mockSave}
      onClose={jest.fn()}
    />);

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith({
        allowedModules: [], // Empty = all
        hasAllAccess: true,
        permissions: [] // Empty = all
      });
    });
  });
});

describe('Export Permission Tests', () => {
  it('should deny export when user lacks export permission', async () => {
    // Mock user without export permission
    const mockUser = {
      userId: 'user1',
      roleId: 'role1',
      role: 'hr'
    };

    const response = await request(app)
      .post('/socket.io/')
      .send({
        event: 'candidate:export-pdf',
        data: {}
      })
      .set('Authorization', `Bearer ${getTokenForUser(mockUser)}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('Export permission denied');
  });

  it('should allow export when user has export permission', async () => {
    // Mock user with export permission
    const mockUser = {
      userId: 'user1',
      roleId: 'roleWithExport',
      role: 'hr',
      permissions: ['candidates.view', 'candidates.export']
    };

    const response = await request(app)
      .post('/socket.io/')
      .send({
        event: 'candidate:export-pdf',
        data: {}
      })
      .set('Authorization', `Bearer ${getTokenForUser(mockUser)}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveProperty('pdfUrl');
  });

  it('should log all export operations for audit', async () => {
    const auditLogSpy = jest.spyOn(AuditLog, 'create');

    await request(app)
      .post('/socket.io/')
      .send({
        event: 'candidate:export-excel',
        data: {}
      })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(auditLogSpy).toHaveBeenCalledWith({
      userId: expect.any(String),
      action: 'candidate:export-excel',
      moduleId: 'candidates',
      permission: 'candidates.export',
      timestamp: expect.any(Date)
    });
  });
});

describe('Role + Company Module Intersection', () => {
  it('should grant access when both role and company have module', async () => {
    // Role has: employees, projects
    // Company has: employees, projects, payroll
    // Result: employees, projects (intersection)

    const response = await request(app)
      .get('/employees')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(response.status).toBe(200);
  });

  it('should deny access when role lacks module (even if company has it)', async () => {
    // Role has: employees only
    // Company has: employees, projects, payroll
    // Result: employees only (projects denied - role doesn't have it)

    const response = await request(app)
      .get('/projects')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('not available for your role');
  });

  it('should deny access when company lacks module (even if role has it)', async () => {
    // Role has: employees, projects, payroll
    // Company has: employees, projects only
    // Result: employees, projects only (payroll denied - company doesn't have it)

    const response = await request(app)
      .get('/payroll')
      .set('Authorization', `Bearer ${regularUserToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('not included in your company');
  });
});

describe('Approval Workflow Permission Tests', () => {
  it('should allow manager to approve team leave requests', async () => {
    const managerToken = getTokenForUser({
      userId: 'manager1',
      role: 'manager',
      departmentId: 'dept1'
    });

    const response = await request(app)
      .put('/api/leaves/leave123/approve')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reason: 'Approved' });

    expect(response.status).toBe(200);
  });

  it('should deny manager approving outside department leave', async () => {
    const managerToken = getTokenForUser({
      userId: 'manager1',
      role: 'manager',
      departmentId: 'dept1'
    });

    // Leave request from dept2
    const response = await request(app)
      .put('/api/leaves/leave456/approve') // Different department
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reason: 'Approved' });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain('not in your department');
  });

  it('should allow hr to approve any leave request', async () => {
    const hrToken = getTokenForUser({
      userId: 'hr1',
      role: 'hr'
    });

    const response = await request(app)
      .put('/api/leaves/leave123/approve')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ reason: 'Approved' });

    expect(response.status).toBe(200);
  });
});
  });
});
```

### 11.3 Integration Checklist

**Module Management:**
- [ ] Module created appears in module sets
- [ ] Module set assigned to plan works correctly
- [ ] Company inherits plan modules
- [ ] Company can enable additional modules
- [ ] Company can disable plan modules
- [ ] Disabled modules don't appear in employee menu

**Role-Based Access:**
- [ ] Role without module access gets 403
- [ ] Superadmin can access all modules regardless
- [ ] "All Access" role works correctly (all modules except superadmin)
- [ ] Role hierarchy respected in approvals

**Permissions:**
- [ ] Module access check is cached properly
- [ ] Cache invalidates on module changes
- [ ] Export operations require export permission
- [ ] Field-level permissions hide sensitive data
- [ ] CRUD operations respect role permissions

**Audit & Logging:**
- [ ] Audit log records all company module changes
- [ ] Audit log records all role changes
- [ ] Export operations logged with user info
- [ ] Permission denials logged for security review

**Migration:**
- [ ] Old role checks still work during migration
- [ ] Feature flags can disable new system instantly
- [ ] No data loss during migration
- [ ] Reset to plan default works correctly

---

## 14. Summary & Success Criteria

### 14.1 Enhanced RBAC & Module Management System Provides:

| Feature | Description | Business Value |
|---------|-------------|----------------|
| **Centralized Module Registry** | Single source of truth for all 20+ modules | Consistent module definitions |
| **Reusable Module Sets** | Quick plan configuration with pre-built sets | Faster plan setup, reduced errors |
| **Company-Level Customization** | Override plan modules per company | Flexible subscription model |
| **Role-Module Mapping** | Explicit module access per role | Better access control, security |
| **"All Access" Feature** | Roles can have all modules (except superadmin) | Simplified admin role configuration |
| **Field Configuration** | Dynamic forms per role | Customized employee data collection |
| **Complete Audit Trail** | Track all module/role/permission changes | Compliance, security monitoring |
| **Export Permission Protection** | Granular control over data export | Data security, compliance |
| **Performance Optimization** | Redis caching for fast lookups | Sub-millisecond permission checks |
| **Gradual Migration Strategy** | Phase-by-phase rollout with feature flags | Zero downtime, minimal risk |

### 14.2 Success Criteria

**Must Have (P0):**
1. ✅ Super Admin can define all modules in registry
2. ✅ Super Admin can create reusable module sets
3. ✅ Super Admin can customize modules per company
4. ✅ Super Admin can create custom roles dynamically
5. ✅ Roles can be assigned specific modules
6. ✅ "All Access" role works for all modules except superadmin
7. ✅ Export operations require explicit export permission
8. ✅ All 40+ backend controllers migrated to new system
9. ✅ All 30+ frontend components using new RBAC
10. ✅ Complete audit trail for all changes

**Should Have (P1):**
1. ✅ Module access caching for performance
2. ✅ Company module override with audit log
3. ✅ Bulk role assignment functionality
4. ✅ Field-level permissions respected
5. ✅ Approval workflows respect role hierarchy

**Nice to Have (P2):**
1. ✅ Modal-based field configuration per role
2. ✅ Module usage analytics
3. ✅ Module recommendations
4. ✅ Time-based permissions

### 14.3 Files to Modify Summary

**Backend: 40+ Controllers**
- Priority 1: 7 core business logic controllers
- Priority 2: 5 high volume operation controllers
- Priority 3: 28+ supporting feature controllers

**Frontend: 30+ Components**
- Priority 1: 3 navigation/layout components
- Priority 2: 6 major feature components
- Priority 3: 20+ supporting components

**New Files to Create:**
- Backend: 8 new schemas, 4 controllers, 2 middleware
- Frontend: 5 pages, 8 hooks, 3 contexts, 2 types files

### 14.4 Risk Mitigation

| Risk | Mitigation |
|------|------------|
| **Breaking existing access** | Feature flags, gradual migration, rollback plan |
| **Performance degradation** | Redis caching, indexed queries, load testing |
| **Data loss during migration** | Database backups, keep old fields, transaction safety |
| **Incomplete permission checks** | Comprehensive testing, audit logging |
| **User confusion** | Documentation, training, gradual UI changes |

### 14.5 Total Estimated Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 0 | 1 week | Planning, analysis, roadmap |
| Phase 1 | 2 weeks | Database, APIs, feature flags |
| Phase 2 | 1 week | Module Registry UI |
| Phase 3 | 1 week | Company Module Customization |
| Phase 4 | 1 week | Packages Page Update |
| Phase 5 | 1 week | Role-Module Integration |
| Phase 6 | 1 week | RBAC Dashboard Integration |
| Phase 7 | 2 weeks | Backend Controller Migration (40+ files) |
| Phase 8 | 2 weeks | Frontend Component Migration (30+ files) |
| Phase 9 | 2 weeks | Testing & Production Rollout |
| Phase 10 | 2 weeks | Advanced Features (optional) |

**Total: 10-12 weeks for complete implementation**
**Minimum Viable: 6-8 weeks (Phases 0-6)**

---

## Appendix A: Complete File Inventory

### Backend Files Requiring Modification (40+):

**Core Middleware:**
- `backend/middleware/auth.js` - Add module access checks
- `backend/middleware/checkModuleAccess.js` - NEW
- `backend/utils/checkroles.js` - Update or deprecate

**Socket Controllers (15+):**
- `backend/controllers/activities/activities.controllers.js`
- `backend/controllers/addInvoice/addInvoice.socket.controller.js`
- `backend/controllers/assets/asset.socket.controller.js`
- `backend/controllers/assets/assetCategory.socket.controller.js`
- `backend/controllers/candidates/candidates.controllers.js` - Export permissions
- `backend/controllers/hr/hr.controller.js`
- `backend/controllers/jobs/jobs.controllers.js` - Export permissions
- `backend/controllers/kaban/kaban.controller.js`
- `backend/controllers/lead/lead.controller.js`
- `backend/controllers/pages/profilepage.controllers.js` - Export permissions
- `backend/controllers/performance/performanceAppraisal.controller.js`
- `backend/controllers/performance/performanceIndicator.controller.js`
- `backend/controllers/performance/performanceReview.controller.js`
- `backend/controllers/performance/goalTracking.controller.js`
- `backend/controllers/performance/goalType.controller.js`

**REST Controllers (25+):**
- `backend/controllers/rest/employee.controller.js`
- `backend/controllers/rest/userProfile.controller.js`
- `backend/controllers/rest/overtime.controller.js`
- `backend/controllers/rest/department.controller.js`
- `backend/controllers/rest/project.controller.js`
- `backend/controllers/rest/leave.controller.js`
- `backend/controllers/rest/timesheet.controller.js`
- `backend/controllers/rest/attendance.controller.js`
- `backend/controllers/rest/client.controller.js`
- `backend/controllers/rest/designation.controller.js`
- `backend/controllers/rest/resignation.controller.js`
- `backend/controllers/rest/termination.controller.js`
- `backend/controllers/rest/promotion.controller.js`
- `backend/controllers/rest/adminDashboard.controller.js`
- `backend/controllers/rest/hrDashboard.controller.js`
- All other REST controllers...

**Routes (15+):**
- All route files using `requireRole` middleware

### Frontend Files Requiring Modification (30+):

**Core Components (5+):**
- `react/src/core/components/RoleBasedRenderer/index.tsx` - Add module support
- `react/src/core/components/PermissionField.tsx`
- `react/src/core/data/json/sidebarMenu.jsx` - Module-based filtering
- `react/src/core/common/header/index.tsx`
- `react/src/core/common/sidebar/index.tsx`

**Hooks (5+):**
- `react/src/hooks/useAuth.ts` - Add module access
- `react/src/hooks/useUserProfileREST.ts`
- `react/src/config/fieldPermissions.ts`

**Feature Modules (20+):**
- All files in `react/src/feature-module/hrm/`
- All files in `react/src/feature-module/projects/`
- All files in `react/src/feature-module/crm/`
- All files in `react/src/feature-module/pages/`

**Modals (10+):**
- All files in `react/src/core/modals/`

---

**Document Version:** 2.1 (Comprehensive Analysis)
**Last Updated:** 2025
**Total Lines:** 4500+
**Status:** Ready for Implementation
**Files Analyzed:** 100+ (40+ backend controllers, 30+ frontend components)

---

**Document Version:** 2.0 (Enhanced)
**Last Updated:** 2025
**Status:** Ready for Implementation
