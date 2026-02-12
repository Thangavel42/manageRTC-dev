# Role-Based Access Control (RBAC) System
## Comprehensive Requirements Analysis

**Document Version:** 1.0
**Date:** February 10, 2026
**Author:** System Analysis

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Requirements Overview](#3-requirements-overview)
4. [Modules & Pages Inventory](#4-modules--pages-inventory)
5. [Permission Types](#5-permission-types)
6. [Role Hierarchy](#6-role-hierarchy)
7. [Feature Requirements](#7-feature-requirements)
8. [Integration Points](#8-integration-points)

---

## 1. Executive Summary

This document provides a comprehensive analysis of the Role-Based Access Control (RBAC) system requirements for the manageRTC application. The system needs to support:

- **Multi-tenant architecture** with company-specific permissions
- **Hierarchical roles** (Super Admin, Admin, HR, Manager, Employee, Client)
- **Granular permissions** at module and page levels
- **Permission packages** for subscription management
- **Custom company-level permission overrides**

---

## 2. Current State Analysis

### 2.1 Existing Role System
Based on the analysis of the codebase:

| Component | Current State | Gap |
|-----------|--------------|-----|
| **Roles** | Hardcoded in sidebar (`superadmin`, `admin`, `hr`, `manager`, `employee`, `client`) | Not stored in database |
| **Permissions** | Static checkboxes in UI | Not functional, no backend integration |
| **Role-Permission Mapping** | None | Missing entirely |
| **Company-Level Permissions** | Basic role check in controllers | No granular control |
| **Package Permissions** | Package schema exists | Not linked to permissions |

### 2.2 Current Files Analyzed

| File | Purpose | Status |
|------|---------|--------|
| `permissionpage.tsx` | Permission management UI | Static UI only |
| `rolePermission.tsx` | Role list UI | Static UI only |
| `users.tsx` | User management | Has socket integration, basic role selection |
| `sidebarMenu.jsx` | Menu based on roles | Role-based but hardcoded |
| `client.controller.js` | Role checking example | Uses `ensureRole()` helper |

### 2.3 Current Permission Check Pattern
```javascript
// Example from client.controller.js
const ensureRole = (user, allowedRoles = []) => {
  const role = user?.role?.toLowerCase();
  return allowedRoles.includes(role);
};

// Usage
if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin'])) {
  return sendForbidden(res, 'You do not have permission');
}
```

**Gap:** This checks only role names, not granular permissions.

---

## 3. Requirements Overview

### 3.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-001 | Create/Edit/Delete custom roles | High |
| FR-002 | Assign granular permissions to roles | High |
| FR-003 | Assign roles to users | High |
| FR-004 | Create permission packages | Medium |
| FR-005 | Assign packages to companies | Medium |
| FR-006 | Override permissions at company level | Medium |
| FR-007 | Audit trail for permission changes | Low |
| FR-008 | Permission inheritance | Medium |
| FR-009 | Bulk permission assignment | Low |
| FR-010 | Permission templates | Low |

### 3.2 Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-001 | Permission check < 50ms | High |
| NFR-002 | Support 1000+ concurrent users | High |
| NFR-003 | Cache permissions for performance | High |
| NFR-004 | Real-time permission updates | Medium |

---

## 4. Modules & Pages Inventory

### 4.1 Complete Module Hierarchy

Based on analysis of `sidebarMenu.jsx` and `all_routes.tsx`:

#### I. SUPER ADMIN
| Module | Route | Sub-Pages |
|--------|-------|-----------|
| Dashboard | `/super-admin/dashboard` | - |
| Companies | `/super-admin/companies` | - |
| Subscriptions | `/super-admin/subscription` | - |
| Packages | `/super-admin/package` | Grid, List |
| Users & Permissions | | |
| - Users | `/users` | - |
| - Roles & Permissions | `/roles-permissions` | - |
| - Permission | `/permission` | - |

#### II. APPLICATIONS
| Module | Route | Sub-Pages |
|--------|-------|-----------|
| Chat | `/application/chat` | - |
| Calls | | |
| - Voice Call | `/application/voice-call` | - |
| - Video Call | `/application/video-call` | - |
| - Outgoing Call | `/application/outgoing-call` | - |
| - Incoming Call | `/application/incoming-call` | - |
| - Call History | `/application/call-history` | - |
| Calendar | `/calendar` | - |
| Email | `/application/email` | - |
| To Do | `/application/todo` | - |
| Notes | `/notes` | - |
| Social Feed | `/application/social-feed` | - |
| File Manager | `/application/file-manager` | - |
| Kanban | `/application/kanban-view` | - |
| Invoices | `/application/invoices` | - |

#### III. HRM (Human Resource Management)
| Module | Route | Sub-Pages |
|--------|-------|-----------|
| Employees | | |
| - Employees List | `/employees` | List, Grid, Details |
| - Departments | `/departments` | - |
| - Designations | `/designations` | - |
| - Policies | `/policy` | - |
| Tickets | | |
| - Tickets List | `/tickets/ticket-list` | - |
| - Tickets Detail | `/tickets/ticket-details` | - |
| Holidays | `/hrm/holidays` | - |
| Attendance | | |
| - Leaves (Admin) | `/leaves` | - |
| - Leaves (Employee) | `/leaves-employee` | - |
| - Leave Settings | `/leave-settings` | - |
| - Attendance (Admin) | `/attendance-admin` | - |
| - Attendance (Employee) | `/attendance-employee` | - |
| - Timesheet | `/timesheets` | - |
| - Shift & Schedule | `/schedule-timing` | - |
| - Shifts Management | `/shifts-management` | - |
| - Shift Batches | `/batches-management` | - |
| - Overtime | `/overtime` | - |
| Performance | | |
| - Performance Indicator | `/performance/performance-indicator` | - |
| - Performance Review | `/performance/performance-review` | - |
| - Performance Appraisal | `/preformance/performance-appraisal` | - |
| - Goal List | `/performance/goal-tracking` | - |
| - Goal Type | `/performance/goal-type` | - |
| Training | | |
| - Training List | `/training/training-list` | - |
| - Trainers | `/training/trainers` | - |
| - Training Type | `/training/training-type` | - |
| Promotion | `/promotion` | - |
| Resignation | `/resignation` | - |
| Termination | `/termination` | - |

#### IV. PROJECTS
| Module | Route | Sub-Pages |
|--------|-------|-----------|
| Clients | `/clients-grid` | Grid, List, Details |
| Projects | | |
| - Projects | `/projects-grid` | Grid, List, Details |
| - Tasks | `/tasks` | - |
| - Task Board | `/task-board` | - |

#### V. CRM
| Module | Route | Sub-Pages |
|--------|-------|-----------|
| Contacts | `/contact-list` | Grid, List, Details |
| Companies | `/companies-list` | Grid, List, Details |
| Deals | `/deals-list` | Grid, List, Details |
| Leads | `/leads-list` | Grid, List, Details |
| Pipeline | `/pipeline` | - |
| Analytics | `/analytics` | - |
| Activities | `/activity` | - |

#### VI. RECRUITMENT
| Module | Route | Sub-Pages |
|--------|-------|-----------|
| Jobs | `/job-grid` | Grid, List, Details |
| Candidates | `/candidates-grid` | Grid, List, Kanban |
| Referrals | `/refferals` | - |

#### VII. FINANCE & ACCOUNTS
| Module | Route | Sub-Pages |
|--------|-------|-----------|
| Sales | | |
| - Estimates | `/estimates` | - |
| - Invoices | `/invoices` | - |
| - Payments | `/payments` | - |
| - Expenses | `/expenses` | - |
| - Provident Fund | `/provident-fund` | - |
| - Taxes | `/taxes` | - |
| Accounting | | |
| - Categories | `/accounting/categories` | - |
| - Budgets | `/accounting/budgets` | - |
| - Budget Expenses | `/accounting/budgets-expenses` | - |
| - Budget Revenues | `/accounting/budget-revenues` | - |
| Payroll | | |
| - Employee Salary | `/employee-salary` | - |
| - Payslip | `/payslip` | - |
| - Payroll Items | `/payroll` | - |

#### VIII. ADMINISTRATION
| Module | Route | Sub-Pages |
|--------|-------|-----------|
| Assets | | |
| - Assets | `/assets` | - |
| - Asset Categories | `/asset-categories` | - |
| Help & Supports | | |
| - Knowledge Base | `/knowledgebase` | - |
| - Activities | `/activity` | - |
| Reports | | |
| - Expense Report | `/expenses-report` | - |
| - Invoice Report | `/invoice-report` | - |
| - Payment Report | `/payment-report` | - |
| - Project Report | `/project-report` | - |
| - Task Report | `/task-report` | - |
| - User Report | `/user-report` | - |
| - Employee Report | `/employee-report` | - |
| - Payslip Report | `/payslip-report` | - |
| - Attendance Report | `/attendance-report` | - |
| - Leave Report | `/leave-report` | - |
| - Daily Report | `/daily-report` | - |
| Settings | | |
| - General Settings | | Profile, Security, Notifications, Connected Apps |
| - Website Settings | | Business, SEO, Localization, Prefixes, Preferences, Appearance, Language, Authentication, AI |
| - App Settings | | Salary, Approval, Invoice, Leave Type, Custom Fields |
| - System Settings | | Email, SMS, OTP, GDPR, Maintenance |
| - Financial Settings | | Payment Gateways, Tax Rates, Currencies |
| - Other Settings | | Custom CSS/JS, Cronjob, Storage, Ban IP, Backup, Cache |

#### IX. CONTENT
| Module | Route | Sub-Pages |
|--------|-------|-----------|
| Pages | `/content/pages` | - |
| Blogs | | |
| - All Blogs | `/blogs` | - |
| - Categories | `/blog-categories` | - |
| - Comments | `/blog-comments` | - |
| - Blog Tags | `/blog-tags` | - |
| Locations | | |
| - Countries | `/countries` | - |
| - States | `/content/states` | - |
| - Cities | `/content/cities` | - |
| Testimonials | `/testimonials` | - |
| FAQ's | `/faq` | - |

#### X. PAGES
| Module | Route |
|--------|-------|
| Starter | `/starter` |
| Profile | `/pages/profile` |
| Gallery | `/gallery` |
| Search Results | `/search-result` |
| Timeline | `/timeline` |
| Pricing | `/pricing` |
| Coming Soon | `/coming-soon` |
| Under Maintenance | `/under-maintenance` |
| Under Construction | `/under-construction` |
| API Keys | `/api-keys` |
| Privacy Policy | `/privacy-policy` |
| Terms & Conditions | `/terms-condition` |

#### XI. DASHBOARDS
| Module | Route |
|--------|-------|
| Admin Dashboard | `/admin-dashboard` |
| Employee Dashboard | `/employee-dashboard` |
| HR Dashboard | `/hr-dashboard` |
| Leads Dashboard | `/leads-dashboard` |
| Deals Dashboard | `/deals-dashboard` |

---

## 5. Permission Types

### 5.1 Standard Permission Actions

| Action | Code | Description |
|--------|------|-------------|
| **Allow All** | `all` | Full access to all actions |
| **Read/View** | `read` | Can view/list records |
| **Create** | `create` | Can create new records |
| **Write/Update** | `write` | Can edit existing records |
| **Delete** | `delete` | Can delete records |
| **Import** | `import` | Can import data |
| **Export** | `export` | Can export data |
| **Approve** | `approve` | Can approve requests (optional) |
| **Assign** | `assign` | Can assign to others (optional) |

### 5.2 Permission Matrix Structure

```javascript
{
  module: "employees",
  permissions: {
    all: false,
    read: true,
    create: true,
    write: true,
    delete: false,
    import: false,
    export: true
  }
}
```

---

## 6. Role Hierarchy

### 6.1 System Roles (Fixed)

| Role | Level | Description |
|------|-------|-------------|
| **Super Admin** | 1 | Platform administrator, full access |
| **Admin** | 2 | Company administrator |
| **HR** | 3 | HR department access |
| **Manager** | 4 | Team/Project manager |
| **Employee** | 5 | Standard employee |
| **Client** | 6 | External client access |

### 6.2 Custom Roles (User-Defined)

- Can be created by Super Admin and Admin
- Inherit from a base role
- Can have additional restrictions or permissions
- Company-specific (multi-tenant)

### 6.3 Role Permission Defaults

| Module | Super Admin | Admin | HR | Manager | Employee | Client |
|--------|-------------|-------|-----|---------|----------|--------|
| Super Admin Dashboard | Full | None | None | None | None | None |
| Companies | Full | Read | None | None | None | None |
| Employees | Full | Full | Full | Read | Self | None |
| Projects | Full | Full | Read | Full | Assigned | Assigned |
| Tasks | Full | Full | Read | Full | Assigned | Assigned |
| Reports | Full | Full | Full | Team | Self | None |
| Settings | Full | Full | Limited | None | None | None |

---

## 7. Feature Requirements

### 7.1 Permission Management Page

**Purpose:** Define and manage permission sets

**Features:**
1. List all modules with sub-pages
2. Toggle permissions per module (Allow All, Read, Create, Write, Delete, Import, Export)
3. Bulk selection (Select All / Deselect All)
4. Search/filter modules
5. Category grouping (HRM, CRM, Finance, etc.)
6. Save as permission template
7. Clone existing permission set

### 7.2 Role Management Page

**Purpose:** Manage roles and assign permissions

**Features:**
1. CRUD operations for roles
2. Assign permission sets to roles
3. Clone role from existing
4. Set role hierarchy/inheritance
5. Preview users with this role
6. Audit trail for role changes

### 7.3 User Management Page

**Purpose:** Assign roles to users

**Features:**
1. List users with their current roles
2. Assign/change user roles
3. Add custom permissions per user (override)
4. Bulk role assignment
5. View effective permissions

### 7.4 Package Management (Super Admin)

**Purpose:** Create permission packages for subscriptions

**Features:**
1. Create packages with permission sets
2. Assign packages to companies
3. Company-level permission overrides
4. Package comparison view
5. Limit features per package

### 7.5 Company Permission Override

**Purpose:** Customize permissions per company

**Features:**
1. Select company
2. View inherited permissions from package
3. Override specific permissions
4. Audit changes

---

## 8. Integration Points

### 8.1 Frontend Integration

| Component | Integration Required |
|-----------|---------------------|
| Sidebar Menu | Show/hide menu items based on permissions |
| Page Routes | Route protection with permission check |
| Action Buttons | Show/hide Create, Edit, Delete buttons |
| API Calls | Middleware permission verification |
| Data Tables | Row-level actions based on permissions |

### 8.2 Backend Integration

| Component | Integration Required |
|-----------|---------------------|
| REST API | Middleware for permission check |
| Socket Events | Permission validation before emit |
| Controllers | Granular permission checks |
| Services | Business logic permission validation |

### 8.3 Database Integration

| Collection | Purpose |
|------------|---------|
| `roles` | Store role definitions |
| `permissions` | Store permission definitions |
| `role_permissions` | Map roles to permissions |
| `user_roles` | Map users to roles |
| `packages` | Permission packages |
| `company_permissions` | Company-level overrides |

---

## Appendix A: Module Code Reference

```javascript
const MODULES = {
  // Super Admin
  'super-admin.dashboard': { name: 'Dashboard', category: 'super-admin' },
  'super-admin.companies': { name: 'Companies', category: 'super-admin' },
  'super-admin.subscriptions': { name: 'Subscriptions', category: 'super-admin' },
  'super-admin.packages': { name: 'Packages', category: 'super-admin' },

  // Users & Permissions
  'users.list': { name: 'Users', category: 'administration' },
  'users.roles': { name: 'Roles & Permissions', category: 'administration' },
  'users.permissions': { name: 'Permissions', category: 'administration' },

  // Applications
  'applications.chat': { name: 'Chat', category: 'applications' },
  'applications.voice-call': { name: 'Voice Call', category: 'applications' },
  'applications.video-call': { name: 'Video Call', category: 'applications' },
  'applications.calendar': { name: 'Calendar', category: 'applications' },
  'applications.email': { name: 'Email', category: 'applications' },
  'applications.todo': { name: 'To Do', category: 'applications' },
  'applications.notes': { name: 'Notes', category: 'applications' },
  'applications.social-feed': { name: 'Social Feed', category: 'applications' },
  'applications.file-manager': { name: 'File Manager', category: 'applications' },
  'applications.kanban': { name: 'Kanban', category: 'applications' },
  'applications.invoices': { name: 'Invoices', category: 'applications' },

  // HRM
  'hrm.employees': { name: 'Employees', category: 'hrm' },
  'hrm.departments': { name: 'Departments', category: 'hrm' },
  'hrm.designations': { name: 'Designations', category: 'hrm' },
  'hrm.policies': { name: 'Policies', category: 'hrm' },
  'hrm.tickets': { name: 'Tickets', category: 'hrm' },
  'hrm.holidays': { name: 'Holidays', category: 'hrm' },
  'hrm.leaves': { name: 'Leaves', category: 'hrm' },
  'hrm.attendance': { name: 'Attendance', category: 'hrm' },
  'hrm.timesheet': { name: 'Timesheet', category: 'hrm' },
  'hrm.shifts': { name: 'Shifts Management', category: 'hrm' },
  'hrm.performance': { name: 'Performance', category: 'hrm' },
  'hrm.training': { name: 'Training', category: 'hrm' },
  'hrm.promotion': { name: 'Promotion', category: 'hrm' },
  'hrm.resignation': { name: 'Resignation', category: 'hrm' },
  'hrm.termination': { name: 'Termination', category: 'hrm' },

  // Projects
  'projects.clients': { name: 'Clients', category: 'projects' },
  'projects.list': { name: 'Projects', category: 'projects' },
  'projects.tasks': { name: 'Tasks', category: 'projects' },

  // CRM
  'crm.contacts': { name: 'Contacts', category: 'crm' },
  'crm.companies': { name: 'Companies', category: 'crm' },
  'crm.deals': { name: 'Deals', category: 'crm' },
  'crm.leads': { name: 'Leads', category: 'crm' },
  'crm.pipeline': { name: 'Pipeline', category: 'crm' },
  'crm.analytics': { name: 'Analytics', category: 'crm' },
  'crm.activities': { name: 'Activities', category: 'crm' },

  // Recruitment
  'recruitment.jobs': { name: 'Jobs', category: 'recruitment' },
  'recruitment.candidates': { name: 'Candidates', category: 'recruitment' },
  'recruitment.referrals': { name: 'Referrals', category: 'recruitment' },

  // Finance
  'finance.estimates': { name: 'Estimates', category: 'finance' },
  'finance.invoices': { name: 'Invoices', category: 'finance' },
  'finance.payments': { name: 'Payments', category: 'finance' },
  'finance.expenses': { name: 'Expenses', category: 'finance' },
  'finance.payroll': { name: 'Payroll', category: 'finance' },
  'finance.budgets': { name: 'Budgets', category: 'finance' },

  // Administration
  'admin.assets': { name: 'Assets', category: 'administration' },
  'admin.reports': { name: 'Reports', category: 'administration' },
  'admin.settings': { name: 'Settings', category: 'administration' },

  // Content
  'content.pages': { name: 'Pages', category: 'content' },
  'content.blogs': { name: 'Blogs', category: 'content' },
  'content.locations': { name: 'Locations', category: 'content' },

  // Dashboards
  'dashboards.admin': { name: 'Admin Dashboard', category: 'dashboards' },
  'dashboards.employee': { name: 'Employee Dashboard', category: 'dashboards' },
  'dashboards.hr': { name: 'HR Dashboard', category: 'dashboards' },
};
```

---

**Next Document:** [02_FILE_VALIDATION_REPORT.md](./02_FILE_VALIDATION_REPORT.md)
