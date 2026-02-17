# 03 - Hardcoded Permissions Audit Report

**Generated**: 2026-02-16
**Scope**: Full codebase audit of `manageRTC-my`
**Purpose**: Identify ALL hardcoded permission patterns that must be migrated to the Dynamic RBAC system

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Backend Routes Using `requirePageAccess` (Dynamic RBAC - CORRECT)](#2-backend-routes-using-requirepageaccess)
3. [Backend Routes Using `requireRole` (HARDCODED - MUST MIGRATE)](#3-backend-routes-using-requirerole)
4. [Backend Routes With Only `authenticate` (NO AUTHORIZATION - MUST ADD)](#4-backend-routes-with-only-authenticate)
5. [Backend Routes With NO Auth Middleware (CRITICAL)](#5-backend-routes-with-no-auth-middleware)
6. [Socket Controllers With Hardcoded Role Checks (MUST MIGRATE)](#6-socket-controllers-with-hardcoded-role-checks)
7. [REST Controllers With Hardcoded Role Checks (MUST MIGRATE)](#7-rest-controllers-with-hardcoded-role-checks)
8. [Frontend `usePageAccess` Hook Usage](#8-frontend-usepageaccess-hook-usage)
9. [Frontend `PermissionButton` and `PageAccessGuard` Usage](#9-frontend-permissionbutton-and-pageaccessguard-usage)
10. [Frontend Hardcoded Role Checks (MUST MIGRATE)](#10-frontend-hardcoded-role-checks)
11. [RBAC Routes Missing Permission Protection](#11-rbac-routes-missing-permission-protection)
12. [Summary Statistics](#12-summary-statistics)
13. [Migration Priority Matrix](#13-migration-priority-matrix)
14. [Implementation Plan](#14-implementation-plan)

---

## 1. Executive Summary

### Current State

| Category | Count | Status |
|----------|-------|--------|
| Routes using `requirePageAccess` (Dynamic RBAC) | 3 route files (16 endpoints) | CORRECT |
| Routes using `requireRole` (Hardcoded) | 22 route files (~150+ endpoints) | MUST MIGRATE |
| Routes with only `authenticate` (No authorization) | 12 route files (~80+ endpoints) | MUST ADD RBAC |
| Routes with NO auth at all | 5 route files (~30+ endpoints) | CRITICAL |
| Socket controllers with hardcoded role checks | 12 controller files | MUST MIGRATE |
| REST controllers with hardcoded role checks | 4 controller files | MUST MIGRATE |
| Frontend files with hardcoded roles | 6+ files | MUST MIGRATE |
| Frontend using `usePageAccess` | 1 file (definition only) | NOT IN USE by pages |
| Frontend using `PermissionButton` | 0 files (defined but unused) | NOT IN USE |
| Frontend using `PageAccessGuard` | 0 files (defined but unused) | NOT IN USE |

**Overall RBAC Coverage: ~10% migrated. ~90% still uses hardcoded patterns.**

---

## 2. Backend Routes Using `requirePageAccess` (Dynamic RBAC - CORRECT)

These files are **correctly** integrated with the Dynamic RBAC system.

### 2.1 `backend/routes/api/hrm.employees.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\hrm.employees.js`
- **Status**: MIGRATED

| Line | Endpoint | Page | Action |
|------|----------|------|--------|
| 23 | `GET /` | `hrm.employees` | `read` |
| 50 | `GET /:id` | `hrm.employees` | `read` |
| 72 | `POST /` | `hrm.employees` | `create` |
| 100 | `PUT /:id` | `hrm.employees` | `write` |
| 127 | `DELETE /:id` | `hrm.employees` | `delete` |

### 2.2 `backend/routes/api/rbac/pageCategories.routes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\rbac\pageCategories.routes.js`
- **Status**: MIGRATED

| Line | Endpoint | Page | Action |
|------|----------|------|--------|
| 133 | `POST /` | `super-admin.pages` | `create` |
| 147 | `PUT /:id` | `super-admin.pages` | `write` |
| 161 | `DELETE /:id` | `super-admin.pages` | `delete` |
| 175 | `PATCH /:id/toggle-status` | `super-admin.pages` | `write` |
| 190 | `POST /reorder` | `super-admin.pages` | `write` |

**Note**: GET routes in this file have NO `requirePageAccess` (read operations are unprotected).

### 2.3 `backend/routes/api/rbac/pagesHierarchy.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\rbac\pagesHierarchy.js`
- **Status**: MIGRATED

| Line | Endpoint | Page | Action |
|------|----------|------|--------|
| 48 | `POST /` | `super-admin.pages` | `create` |
| 51 | `PUT /:id` | `super-admin.pages` | `write` |
| 54 | `PUT /batch/orders` | `super-admin.pages` | `write` |
| 57 | `DELETE /:id` | `super-admin.pages` | `delete` |
| 60 | `PATCH /:id/toggle-status` | `super-admin.pages` | `write` |

**Note**: GET routes (tree-structure, flattened, stats, /:id) have NO `requirePageAccess`.

---

## 3. Backend Routes Using `requireRole` (HARDCODED - MUST MIGRATE)

### 3.1 `backend/routes/api/admin-dashboard.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\admin-dashboard.js`
- **Hardcoded Roles**: `('admin', 'superadmin')`
- **Lines**: 44, 53, 62, 71, 80, 89, 98, 107, 116, 125, 134, 143, 152, 161
- **Endpoints**: 14 endpoints (all dashboard stats/data)
- **Code Pattern**:
  ```javascript
  requireRole('admin', 'superadmin')
  ```
- **Issue**: Hardcoded to `admin` and `superadmin` roles only. HR and custom roles cannot access admin dashboard data.
- **Migration Plan**: Replace with `requirePageAccess('admin.dashboard', 'read')`

### 3.2 `backend/routes/api/hr-dashboard.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\hr-dashboard.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')`
- **Lines**: 36, 45, 54, 63, 72, 81
- **Endpoints**: 6 endpoints
- **Migration Plan**: Replace with `requirePageAccess('hr.dashboard', 'read')`

### 3.3 `backend/routes/api/employees.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\employees.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 83, 102, 112, 121, 131, 140, 149, 171, 181, 191, 200
- **Endpoints**: 11+ endpoints
- **Issue**: This is the OLD employees route (vs `hrm.employees.js` which is migrated). Both may be active.
- **Migration Plan**: Replace with `requirePageAccess('hrm.employees', '<action>')` or deprecate in favor of `hrm.employees.js`

### 3.4 `backend/routes/api/attendance.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\attendance.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')`, `('admin', 'superadmin')`, `('admin', 'hr', 'manager', 'superadmin')`
- **Lines**: 20, 34, 41, 48, 55, 83, 97, 104, 111, 118, 125, 132
- **Endpoints**: 12 endpoints
- **Code Snippets**:
  ```javascript
  // Line 20 - List
  router.get('/', requireRole('admin', 'hr', 'superadmin'), attendanceController.getAttendances);
  // Line 83 - Delete
  router.delete('/:id', requireRole('admin', 'superadmin'), attendanceController.deleteAttendance);
  // Line 97 - Approve regularization
  router.post('/:id/approve-regularization', requireRole('admin', 'hr', 'manager', 'superadmin'), attendanceController.approveRegularization);
  ```
- **Migration Plan**: Replace with `requirePageAccess('hrm.attendance', '<action>')` and `requirePageAccess('hrm.attendance', 'approve')` for regularization

### 3.5 `backend/routes/api/asset-categories.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\asset-categories.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 20, 29, 38, 45, 52
- **Endpoints**: 5 endpoints
- **Migration Plan**: Replace with `requirePageAccess('administration.assets', '<action>')`

### 3.6 `backend/routes/api/batches.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\batches.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')`
- **Lines**: 68, 77, 86, 95, 104, 113, 122
- **Endpoints**: 7 endpoints
- **Migration Plan**: Replace with `requirePageAccess('hrm.batches', '<action>')`

### 3.7 `backend/routes/api/budgets.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\budgets.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 68, 77, 86, 99, 108, 117, 126
- **Endpoints**: 7 endpoints
- **Migration Plan**: Replace with `requirePageAccess('finance.budgets', '<action>')`

### 3.8 `backend/routes/api/clients.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\clients.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 75, 84, 93, 113, 133, 142, 150
- **Endpoints**: 7 endpoints
- **Migration Plan**: Replace with `requirePageAccess('projects.clients', '<action>')`

### 3.9 `backend/routes/api/invoices.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\invoices.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 31, 40, 49, 58, 67
- **Endpoints**: 5 endpoints
- **Migration Plan**: Replace with `requirePageAccess('finance.invoices', '<action>')`

### 3.10 `backend/routes/api/leads.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\leads.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 66, 86, 106, 115, 123, 131
- **Endpoints**: 6 endpoints
- **Migration Plan**: Replace with `requirePageAccess('crm.leads', '<action>')`

### 3.11 `backend/routes/api/milestones.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\milestones.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 39, 68, 77, 90, 99, 108, 117
- **Endpoints**: 7 endpoints
- **Migration Plan**: Replace with `requirePageAccess('projects.milestones', '<action>')`

### 3.12 `backend/routes/api/overtime.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\overtime.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')`, `('admin', 'hr', 'manager', 'superadmin')`, `('admin', 'superadmin')`
- **Lines**: 22, 36, 43, 71, 78, 92
- **Endpoints**: 6 endpoints
- **Migration Plan**: Replace with `requirePageAccess('hrm.overtime', '<action>')` with `approve`/`reject` actions

### 3.13 `backend/routes/api/project-notes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\project-notes.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')`
- **Lines**: 38, 47, 56
- **Endpoints**: 3 endpoints
- **Migration Plan**: Replace with `requirePageAccess('projects.project-notes', '<action>')`

### 3.14 `backend/routes/api/projects.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\projects.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 51, 73, 95, 105, 114
- **Endpoints**: 5 endpoints
- **Migration Plan**: Replace with `requirePageAccess('projects.projects', '<action>')`

### 3.15 `backend/routes/api/promotions.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\promotions.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 25, 32, 39, 46, 53, 60, 67, 74, 81, 88
- **Endpoints**: 10 endpoints
- **Migration Plan**: Replace with `requirePageAccess('hrm.promotions', '<action>')`

### 3.16 `backend/routes/api/resignations.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\resignations.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 22, 29, 36, 43, 50, 57, 64, 71, 78, 85, 92
- **Endpoints**: 11 endpoints
- **Migration Plan**: Replace with `requirePageAccess('hrm.resignations', '<action>')` with `approve`/`reject` actions

### 3.17 `backend/routes/api/resources.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\resources.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 59, 68, 77, 86, 99, 108, 117
- **Endpoints**: 7 endpoints
- **Migration Plan**: Replace with `requirePageAccess('projects.resources', '<action>')`

### 3.18 `backend/routes/api/schedule.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\schedule.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')`
- **Lines**: 35, 44, 53, 62, 71
- **Endpoints**: 5 endpoints
- **Migration Plan**: Replace with `requirePageAccess('hrm.schedule', '<action>')`

### 3.19 `backend/routes/api/shifts.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\shifts.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 66, 79, 88, 97, 106, 115, 124, 133, 142
- **Endpoints**: 9 endpoints
- **Migration Plan**: Replace with `requirePageAccess('hrm.shifts', '<action>')`

### 3.20 `backend/routes/api/tasks.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\tasks.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 39, 45, 53, 67, 80, 96, 102, 108
- **Endpoints**: 8 endpoints
- **Migration Plan**: Replace with `requirePageAccess('projects.tasks', '<action>')`

### 3.21 `backend/routes/api/terminations.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\terminations.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')` and `('admin', 'superadmin')`
- **Lines**: 22, 29, 36, 43, 50, 57, 64, 71
- **Endpoints**: 8 endpoints
- **Migration Plan**: Replace with `requirePageAccess('hrm.terminations', '<action>')`

### 3.22 `backend/routes/api/timetracking.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\timetracking.js`
- **Hardcoded Roles**: `('admin', 'hr', 'superadmin')`
- **Lines**: 119, 128, 137, 146
- **Endpoints**: 4 endpoints (admin-only routes; other routes use only `authenticate`)
- **Migration Plan**: Replace with `requirePageAccess('projects.time-tracking', '<action>')`

### 3.23 `backend/routes/api/superadmin.companies.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\superadmin.companies.js`
- **Hardcoded Roles**: `('superadmin')` (router-level)
- **Line**: 25
- **Code**: `router.use(requireRole('superadmin'));`
- **Migration Plan**: Replace with `requirePageAccess('super-admin.companies', '<action>')` per endpoint

### 3.24 `backend/routes/api/syncRole.routes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\syncRole.routes.js`
- **Hardcoded Roles**: `('admin', 'superadmin')`
- **Line**: 23
- **Migration Plan**: Replace with `requirePageAccess('admin.sync-roles', 'write')`

---

## 4. Backend Routes With Only `authenticate` (NO AUTHORIZATION - MUST ADD)

These routes verify identity but do **not** check role or permission. Any authenticated user can access all CRUD operations.

### 4.1 `backend/routes/api/holidays.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\holidays.js`
- **Auth**: `authenticateUser` (router-level)
- **Endpoints**: 10 (GET, POST, PUT, DELETE)
- **Issue**: Any authenticated user can create/update/delete holidays
- **Migration Plan**: Add `requirePageAccess('hrm.holidays', '<action>')`

### 4.2 `backend/routes/api/leave.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\leave.js`
- **Auth**: `authenticate` (router-level)
- **Endpoints**: 16+ (includes approve/reject which should be restricted)
- **Issue**: Any user can approve/reject leaves. Lines 84, 91 (`approve`, `reject`) are critical.
- **Migration Plan**: Add `requirePageAccess('hrm.leaves', '<action>')` with `approve`/`reject` for admin routes

### 4.3 `backend/routes/api/assets.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\assets.js`
- **Auth**: `authenticate` (router-level)
- **Endpoints**: 8
- **Issue**: Any authenticated user can create/delete assets
- **Migration Plan**: Add `requirePageAccess('administration.assets', '<action>')`

### 4.4 `backend/routes/api/departments.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\departments.js`
- **Auth**: `authenticate` (router-level)
- **Endpoints**: 8
- **Issue**: Any authenticated user can create/delete departments
- **Migration Plan**: Add `requirePageAccess('hrm.departments', '<action>')`

### 4.5 `backend/routes/api/designations.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\designations.js`
- **Auth**: `authenticate` (router-level)
- **Endpoints**: 6
- **Issue**: Any authenticated user can create/delete designations
- **Migration Plan**: Add `requirePageAccess('hrm.designations', '<action>')`

### 4.6 `backend/routes/api/leaveTypes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\leaveTypes.js`
- **Auth**: `authenticate` (router-level)
- **Endpoints**: ~5
- **Issue**: Any authenticated user can manage leave types
- **Migration Plan**: Add `requirePageAccess('hrm.leave-types', '<action>')`

### 4.7 `backend/routes/api/assetUsers.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\assetUsers.js`
- **Auth**: `authenticate` (router-level)
- **Issue**: Any authenticated user can manage asset assignments
- **Migration Plan**: Add `requirePageAccess('administration.assets', '<action>')`

### 4.8 `backend/routes/api/timesheets.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\timesheets.js`
- **Auth**: `authenticate` (router-level)
- **Migration Plan**: Add `requirePageAccess('hrm.timesheets', '<action>')`

### 4.9 `backend/routes/api/pipelines.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\pipelines.js`
- **Auth**: `authenticate` (router-level)
- **Issue**: Any authenticated user can manage CRM pipelines
- **Migration Plan**: Add `requirePageAccess('crm.pipelines', '<action>')`

### 4.10 `backend/routes/api/activities.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\activities.js`
- **Auth**: `authenticate` (router-level)
- **Migration Plan**: Add `requirePageAccess('crm.activities', '<action>')`

### 4.11 `backend/routes/api/holiday-types.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\holiday-types.js`
- **Auth**: `authenticate` (router-level)
- **Migration Plan**: Add `requirePageAccess('hrm.holiday-types', '<action>')`

### 4.12 `backend/routes/api/policies.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\policies.js`
- **Auth**: `authenticate` (router-level)
- **Migration Plan**: Add `requirePageAccess('hrm.policies', '<action>')`

### 4.13 `backend/routes/api/training.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\training.js`
- **Auth**: `authenticate` (router-level)
- **Migration Plan**: Add `requirePageAccess('hrm.training', '<action>')`

### 4.14 `backend/routes/api/superadmin.routes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\superadmin.routes.js`
- **Auth**: `authenticate` (router-level)
- **Issue**: Super admin user management routes have only authentication, no role check
- **Migration Plan**: Add `requirePageAccess('super-admin.users', '<action>')`

### 4.15 `backend/routes/api/admin.users.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\admin.users.js`
- **Auth**: `authenticate` (router-level)
- **Migration Plan**: Add `requirePageAccess('admin.users', '<action>')`

---

## 5. Backend Routes With NO Auth Middleware (CRITICAL)

These route files have **zero** authentication or authorization middleware. They rely on socket authentication or custom middleware only.

### 5.1 `backend/routes/contacts.routes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\contacts.routes.js`
- **Auth**: Uses `contactsMiddleware` (custom, not RBAC)
- **Endpoints**: 6 (list, export, create, getById, update, delete)
- **Issue**: No standard auth middleware, relies on custom middleware from controller
- **Migration Plan**: Add `authenticate` + `requirePageAccess('crm.contacts', '<action>')`

### 5.2 `backend/routes/companies.routes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\companies.routes.js`
- **Auth**: Uses `companiesMiddleware` (custom, not RBAC)
- **Endpoints**: 6 (list, export, create, getById, update, delete)
- **Migration Plan**: Add `authenticate` + `requirePageAccess('crm.companies', '<action>')`

### 5.3 `backend/routes/deal.routes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\deal.routes.js`
- **Auth**: `authenticateUser` in production only; dev bypasses auth
- **Endpoints**: 5 (CRUD)
- **Issue**: Development environment has NO authentication at all
- **Migration Plan**: Always apply `authenticate` + `requirePageAccess('crm.deals', '<action>')`

### 5.4 `backend/routes/jobs.routes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\jobs.routes.js`
- **Auth**: None (uses tenant collection middleware only)
- **Endpoints**: 12 (list, details, create, update, delete, bulk delete, etc.)
- **Issue**: **CRITICAL** - No authentication at all. Anyone can CRUD jobs.
- **Migration Plan**: Add `authenticate` + `requirePageAccess('recruitment.jobs', '<action>')`

### 5.5 `backend/routes/tickets.routes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\tickets.routes.js`
- **Auth**: None (uses tenant collection middleware only)
- **Endpoints**: 8 (list, details, create, update, delete, comments, bulk delete)
- **Issue**: **CRITICAL** - No authentication at all.
- **Migration Plan**: Add `authenticate` + `requirePageAccess('administration.tickets', '<action>')`

### 5.6 `backend/routes/reports.routes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\reports.routes.js`
- **Auth**: `requireAuth` only (authentication, no authorization)
- **Issue**: Any authenticated user can access ALL reports
- **Migration Plan**: Add `requirePageAccess('administration.reports', 'read')`

### 5.7 `backend/routes/payroll.routes.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\payroll.routes.js`
- **Auth**: `requireAuth` only (authentication, no authorization)
- **Issue**: Any authenticated user can access payroll data
- **Migration Plan**: Add `requirePageAccess('finance.payroll', '<action>')`

---

## 6. Socket Controllers With Hardcoded Role Checks (MUST MIGRATE)

### 6.1 `backend/controllers/activities/activities.controllers.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\activities\activities.controllers.js`
- **Line 24**: `const isAdmin = socket.userMetadata?.role?.toLowerCase() === "admin";`
- **Lines 30, 89, 109**: `if (!isAdmin) throw new Error("Unauthorized: Admins only");`
- **Events protected**: `activity:create`, `activity:update`, `activity:delete`
- **Events unprotected**: `activity:getAll`, `activity:getById`, `activity:getStats`, `activity:getOwners`, `activity:getAllData`
- **Issue**: Only checks for literal `"admin"` role. Superadmin and custom roles with CRM permissions are blocked.
- **Migration Plan**: Replace with dynamic RBAC check using `checkRolePageAccess(socket.roleId, pageId, action)`

### 6.2 `backend/controllers/pipeline/pipeline.controllers.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\pipeline\pipeline.controllers.js`
- **Line 25**: `const isAdmin = socket.userMetadata?.role?.toLowerCase() === "admin";`
- **Lines 31, 65, 82, 201, 218, 235**: `if (!isAdmin) throw new Error("Unauthorized: Admins only");`
- **Events protected**: `pipeline:create`, `pipeline:update`, `pipeline:delete`, `stage:add`, `stage:update`, `stage:overwrite`
- **Issue**: Only checks `"admin"` - blocks superadmin and HR.
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'crm.pipelines', action)`

### 6.3 `backend/controllers/deal/deal.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\deal\deal.controller.js`
- **Line 144**: `const isAdminOrManager = ["admin", "manager"].includes(socket.userMetadata?.role);`
- **Lines 148, 191**: `if (!isAdminOrManager) throw new Error("Unauthorized: Admins or Managers only");`
- **Line 203**: `if (socket.userMetadata?.role !== "admin") throw new Error("Unauthorized: Admins only");`
- **Events**: `deal:update`, `deal:updateStage`, `deal:delete`
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'crm.deals', action)`

### 6.4 `backend/controllers/candidates/candidates.controllers.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\candidates\candidates.controllers.js`
- **Lines 27-35**:
  ```javascript
  const userRole = socket.userMetadata?.role?.toLowerCase();
  const isAdmin = userRole === "admin";
  const isHR = userRole === "hr";
  const isManager = userRole === "manager";
  const isSuperadmin = userRole === "superadmin";
  const isAuthorizedRead = isAdmin || isHR || isManager || isSuperadmin;
  const isAuthorizedWrite = isAdmin || isHR || isSuperadmin;
  ```
- **Issue**: Hardcoded role checks for all CRUD operations
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'recruitment.candidates', action)`

### 6.5 `backend/controllers/jobs/jobs.controllers.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\jobs\jobs.controllers.js`
- **Lines 27-35**: Same pattern as candidates (isAdmin, isHR, isManager, isSuperadmin)
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'recruitment.jobs', action)`

### 6.6 `backend/controllers/performance/goalTracking.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\performance\goalTracking.controller.js`
- **Line 140**: `const isAdminOrManager = ["admin", "manager"].includes(socket.userMetadata?.role);`
- **Lines 144, 184**: `if (!isAdminOrManager) throw new Error("Unauthorized");`
- **Line 196**: `if (socket.userMetadata?.role !== "admin") throw new Error("Unauthorized: Admins only");`
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'performance.goal-tracking', action)`

### 6.7 `backend/controllers/performance/goalType.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\performance\goalType.controller.js`
- **Line 134**: `const isAdminOrManager = ["admin", "manager"].includes(socket.userMetadata?.role);`
- **Lines 138, 175, 187**: Same hardcoded pattern
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'performance.goal-type', action)`

### 6.8 `backend/controllers/performance/performanceAppraisal.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\performance\performanceAppraisal.controller.js`
- **Line 141**: `const isAdminOrManager = ["admin", "manager"].includes(socket.userMetadata?.role);`
- **Lines 145, 185, 197**: Same pattern
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'performance.appraisals', action)`

### 6.9 `backend/controllers/performance/performanceReview.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\performance\performanceReview.controller.js`
- **Line 141**: `const isAdminOrManager = ["admin", "manager"].includes(socket.userMetadata?.role);`
- **Lines 145, 185, 197**: Same pattern
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'performance.reviews', action)`

### 6.10 `backend/controllers/performance/performanceIndicator.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\performance\performanceIndicator.controller.js`
- **Line 139**: `const isAdminOrManager = ["admin", "manager"].includes(socket.userMetadata?.role);`
- **Lines 143, 182, 194**: Same pattern
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'performance.indicators', action)`

### 6.11 `backend/controllers/project/project.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\project\project.controller.js`
- **Line 25**: `const isAuthorized = socket.userMetadata?.role?.toLowerCase() === 'admin' || socket.userMetadata?.role?.toLowerCase() === 'hr';`
- **Issue**: Only admin and HR can manage projects via socket. No superadmin, no custom roles.
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'projects.projects', action)`

### 6.12 `backend/controllers/project/project.notes.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\project\project.notes.controller.js`
- **Line 26**: `const isAuthorized = socket.userMetadata?.role?.toLowerCase() === 'admin' || socket.userMetadata?.role?.toLowerCase() === 'hr';`
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'projects.project-notes', action)`

### 6.13 `backend/controllers/task/task.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\task\task.controller.js`
- **Line 25**: `const isAuthorized = socket.userMetadata?.role?.toLowerCase() === 'admin' || socket.userMetadata?.role?.toLowerCase() === 'hr';`
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'projects.tasks', action)`

### 6.14 `backend/controllers/pages/profilepage.controllers.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\pages\profilepage.controllers.js`
- **Line 29**: `const isAdmin = userRole === "admin";`
- **Line 220**: `if (!isAdmin) throw new Error("Unauthorized: Only admin can delete profiles");`
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'user-profile', 'delete')`

### 6.15 `backend/controllers/employee/dashboard.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\employee\dashboard.controller.js`
- **Line 27**: `if (socket.userMetadata?.role !== "employee")`
- **Issue**: Restricts to `employee` role only - blocks admins from viewing employee dashboard
- **Migration Plan**: Replace with `checkRolePageAccess(socket.roleId, 'employee.dashboard', 'read')`

---

## 7. REST Controllers With Hardcoded Role Checks (MUST MIGRATE)

### 7.1 `backend/controllers/rest/leave.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\rest\leave.controller.js`
- **Line 971**: `const isAdmin = userRole === 'admin' || userRole === 'superadmin';`
- **Line 1115**: `const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';`
- **Line 1359**: `const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';`
- **Line 1462**: Same pattern
- **Issue**: Multiple places with inconsistent admin definitions (some include HR, some don't)
- **Migration Plan**: Use `req.permissions` from RBAC middleware to check dynamically

### 7.2 `backend/controllers/rest/attendance.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\rest\attendance.controller.js`
- **Line 768**: `const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';`
- **Migration Plan**: Use `req.permissions` from RBAC middleware

### 7.3 `backend/controllers/rest/overtime.controller.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\controllers\rest\overtime.controller.js`
- **Line 463**: `const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';`
- **Line 578**: Same pattern
- **Migration Plan**: Use `req.permissions` from RBAC middleware

### 7.4 `backend/services/leaveValidation.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\services\leaveValidation.js`
- **Line 227**: `const isAdminOrHR = approver.role === 'admin' || approver.role === 'hr' || approver.role === 'superadmin';`
- **Issue**: Leave approval logic uses hardcoded role checks in service layer
- **Migration Plan**: Accept permission context as parameter; check `hasPermission('hrm.leaves', 'approve')`

---

## 8. Frontend `usePageAccess` Hook Usage

### 8.1 Hook Definition
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\hooks\usePageAccess.tsx`
- **Status**: DEFINED but **NOT IMPORTED/USED by any feature page**

The hook exposes:
- `usePageAccess(pageName, action?)` - Main hook
- `PageAccessGuard` - Guard component (line 192)
- `PermissionButton` - Permission-aware button (line 219)

**Finding**: Zero feature-module pages import or use `usePageAccess`. The hook exists but adoption is 0%.

---

## 9. Frontend `PermissionButton` and `PageAccessGuard` Usage

### 9.1 `PermissionButton`
- **Defined at**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\hooks\usePageAccess.tsx` (line 219)
- **Usage**: **ZERO** files import PermissionButton outside the definition file.
- **Issue**: Component is ready but completely unused. No button in any feature page checks permissions.

### 9.2 `PageAccessGuard`
- **Defined at**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\hooks\usePageAccess.tsx` (line 192)
- **Usage**: **ZERO** files import PageAccessGuard outside the definition file.
- **Issue**: Guard component is ready but unused. No page is wrapped with permission guards.

---

## 10. Frontend Hardcoded Role Checks (MUST MIGRATE)

### 10.1 `react/src/feature-module/router/router.link.tsx` (CRITICAL - 80+ hardcoded role arrays)
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\router\router.link.tsx`
- **Lines**: 317, 323, 329, 335, 341, 351, 356, 361, 366, 371, 446, 1048-1114, 1389-1542, 1592-1640, 1664-1676, 1766-1876, 1954-1966, 2156-2162
- **Pattern**: Each route has `roles: ['admin', 'hr', 'superadmin']` etc.
- **Code Example**:
  ```typescript
  { path: '/employees', element: <Employees />, roles: ['admin', 'hr', 'superadmin'] }
  { path: '/super-admin/dashboard', element: <SADashboard />, roles: ['superadmin'] }
  ```
- **Issue**: **80+ routes** with hardcoded role arrays. These override RBAC completely on the frontend.
- **Migration Plan**: Replace `roles` array with page name reference. `withRoleCheck` HOC should check permissions from `PermissionContext` instead of hardcoded roles.

### 10.2 `react/src/feature-module/router/withRoleCheck.jsx`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\router\withRoleCheck.jsx`
- **Line 18**: `export const withRoleCheck = (Component, allowedRoles: string[] = []) => {`
- **Line 46**: `const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRole);`
- **Issue**: This HOC wraps every route component and checks `allowedRoles` against a hardcoded user role string. It completely bypasses RBAC.
- **Migration Plan**: Rewrite to check permissions from `PermissionContext` using page name lookup.

### 10.3 `react/src/core/utils/dashboardRoleFilter.ts`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\utils\dashboardRoleFilter.ts`
- **Lines**: 32-260 (30+ dashboard card definitions with `allowedRoles` arrays)
- **Pattern**: `allowedRoles: ['admin', 'hr']`
- **Issue**: Dashboard widgets are shown/hidden based on hardcoded role arrays, not RBAC permissions.
- **Migration Plan**: Replace `allowedRoles` with page name references; filter using permission context.

### 10.4 `react/src/core/components/RoleBasedRenderer/index.tsx`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\core\components\RoleBasedRenderer\index.tsx`
- **Lines**: 60-167 (convenience components: `AdminOnly`, `HROnly`, `ManagerOnly`, `EmployeeOnly`, `SuperAdminOnly`)
- **Issue**: These components render children based on hardcoded role hierarchy. Used in dashboards and other places.
- **Migration Plan**: Replace with `PageAccessGuard` or `PermissionButton` that check dynamic RBAC.

### 10.5 `react/src/feature-module/hrm/attendance/leaves/leaveAdmin.tsx`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\hrm\attendance\leaves\leaveAdmin.tsx`
- **Line 242**: `if (role === 'hr') {`
- **Line 247**: `const success = role === 'manager'`
- **Line 270**: `if (role === 'hr') {`
- **Line 275**: `const success = role === 'manager'`
- **Issue**: Leave approval/rejection flow uses hardcoded role checks
- **Migration Plan**: Replace with `usePageAccess('hrm.leaves')` and check `canApprove` dynamically

### 10.6 `react/src/feature-module/projects/task/task.tsx`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\projects\task\task.tsx`
- **Line 335**: `if (profile && (userRole === 'employee' || userRole === 'hr') && '_id' in profile) {`
- **Line 872**: Same pattern
- **Issue**: Task assignment logic uses hardcoded role checks
- **Migration Plan**: Replace with `usePageAccess('projects.tasks')` permission check

### 10.7 `react/src/feature-module/super-admin/dashboard/index.tsx`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\super-admin\dashboard\index.tsx`
- **Line 9**: `import { SuperAdminOnly } from "../../../core/components/RoleBasedRenderer";`
- **Issue**: Uses hardcoded `SuperAdminOnly` wrapper
- **Migration Plan**: Replace with `PageAccessGuard pageName="super-admin.dashboard"`

### 10.8 `react/src/feature-module/mainMenu/hrDashboard/index.tsx`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\mainMenu\hrDashboard\index.tsx`
- **Line 20**: `import { RoleBasedRenderer, HROnly } from "../../../core/components/RoleBasedRenderer";`
- **Issue**: Uses hardcoded `HROnly` wrapper
- **Migration Plan**: Replace with `PageAccessGuard pageName="hr.dashboard"`

### 10.9 `react/src/feature-module/mainMenu/adminDashboard/index.tsx`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\react\src\feature-module\mainMenu\adminDashboard\index.tsx`
- **Line 22**: `import { AdminOnly } from "../../../core/components/RoleBasedRenderer";`
- **Issue**: Uses hardcoded `AdminOnly` wrapper
- **Migration Plan**: Replace with `PageAccessGuard pageName="admin.dashboard"`

---

## 11. RBAC Routes Missing Permission Protection

### 11.1 `backend/routes/api/rbac/pages.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\rbac\pages.js`
- **Auth**: **NONE** (no `authenticate`, no `requireRole`, no `requirePageAccess`)
- **Issue**: **CRITICAL** - RBAC page management routes have zero protection
- **Migration Plan**: Add `authenticate` + `requirePageAccess('super-admin.pages', '<action>')`

### 11.2 `backend/routes/api/rbac/permissions.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\rbac\permissions.js`
- **Auth**: **NONE**
- **Issue**: **CRITICAL** - Permission management routes have zero protection. Anyone can read/modify permissions.
- **Migration Plan**: Add `authenticate` + `requirePageAccess('super-admin.permissions', '<action>')`

### 11.3 `backend/routes/api/rbac/roles.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\rbac\roles.js`
- **Auth**: **NONE**
- **Issue**: **CRITICAL** - Role management routes have zero protection. Anyone can create/modify roles.
- **Migration Plan**: Add `authenticate` + `requirePageAccess('super-admin.roles', '<action>')`

### 11.4 `backend/routes/api/rbac/modules.js`
- **File Path**: `c:\Users\SUDHAKAR\Documents\GitHub\manageRTC-my\backend\routes\api\rbac\modules.js`
- **Auth**: **NONE**
- **Issue**: **CRITICAL** - Module management routes have zero protection.
- **Migration Plan**: Add `authenticate` + `requirePageAccess('super-admin.modules', '<action>')`

---

## 12. Summary Statistics

### Backend Route Files

| Protection Level | Count | Files |
|-----------------|-------|-------|
| `requirePageAccess` (Dynamic RBAC) | 3 | hrm.employees, pageCategories.routes, pagesHierarchy |
| `requireRole` (Hardcoded) | 22 | admin-dashboard, attendance, assets, batches, budgets, clients, employees, hr-dashboard, invoices, leads, milestones, overtime, project-notes, projects, promotions, resignations, resources, schedule, shifts, superadmin.companies, syncRole.routes, tasks, terminations, timetracking |
| `authenticate` only (No authorization) | 15 | activities, admin.users, assetUsers, assets, departments, designations, holiday-types, holidays, leave, leaveTypes, pipelines, policies, superadmin.routes, timesheets, training |
| No auth at all | 9 | companies.routes, contacts.routes, deal.routes, jobs.routes, tickets.routes, rbac/pages, rbac/permissions, rbac/roles, rbac/modules |
| `requireAuth` only | 2 | reports.routes, payroll.routes |

### Socket Controllers

| Pattern | Count |
|---------|-------|
| `isAdmin = role === "admin"` | 3 (activities, pipeline, profilepage) |
| `isAdminOrManager = ["admin","manager"].includes(role)` | 5 (deal, goalTracking, goalType, performanceAppraisal, performanceReview, performanceIndicator) |
| `isAuthorized = role === 'admin' \|\| role === 'hr'` | 3 (project, project.notes, task) |
| `isAdmin/isHR/isManager/isSuperadmin` full check | 2 (candidates, jobs) |
| `role !== "employee"` | 1 (employee dashboard) |
| **Total with hardcoded checks** | **14 controllers** |

### Frontend

| Pattern | Count |
|---------|-------|
| `roles: [...]` in router.link.tsx | 80+ route definitions |
| `withRoleCheck` HOC (hardcoded) | Wraps ALL routes |
| `allowedRoles` in dashboardRoleFilter | 30+ card definitions |
| `RoleBasedRenderer` / convenience wrappers | 3 dashboard pages |
| `role === 'hr'` / `role === 'employee'` inline | 2 feature pages |
| `usePageAccess` usage in feature pages | **0** |
| `PermissionButton` usage | **0** |
| `PageAccessGuard` usage | **0** |

---

## 13. Migration Priority Matrix

### Priority 1 - CRITICAL SECURITY (No Auth)
Must fix immediately - routes accessible by anyone.

| File | Risk |
|------|------|
| `backend/routes/api/rbac/pages.js` | Anyone can modify RBAC pages |
| `backend/routes/api/rbac/permissions.js` | Anyone can modify permissions |
| `backend/routes/api/rbac/roles.js` | Anyone can create/modify roles |
| `backend/routes/api/rbac/modules.js` | Anyone can modify modules |
| `backend/routes/jobs.routes.js` | Anyone can CRUD job postings |
| `backend/routes/tickets.routes.js` | Anyone can CRUD tickets |

### Priority 2 - HIGH (Auth but No Authorization)
Authenticated users can access everything.

| File | Risk |
|------|------|
| `backend/routes/api/leave.js` | Any user can approve/reject leaves |
| `backend/routes/api/departments.js` | Any user can delete departments |
| `backend/routes/api/designations.js` | Any user can manage designations |
| `backend/routes/api/assets.js` | Any user can create/delete assets |
| `backend/routes/api/holidays.js` | Any user can create/delete holidays |
| `backend/routes/api/superadmin.routes.js` | Any user can access superadmin features |
| `backend/routes/reports.routes.js` | Any user can access all reports |
| `backend/routes/payroll.routes.js` | Any user can access payroll |

### Priority 3 - MEDIUM (Hardcoded requireRole)
Working but not dynamic - changes require code deployment.

| File | Endpoints |
|------|-----------|
| All 22 files in Section 3 | ~150+ endpoints |
| All 14 socket controllers in Section 6 | ~60+ socket events |
| All 4 REST controllers in Section 7 | ~8+ inline checks |

### Priority 4 - LOW (Frontend Hardcoded)
Visual/UX issue - backend still enforces (once migrated).

| File | Items |
|------|-------|
| `router.link.tsx` | 80+ route role arrays |
| `withRoleCheck.jsx` | Route wrapping HOC |
| `dashboardRoleFilter.ts` | 30+ dashboard cards |
| `RoleBasedRenderer/index.tsx` | Convenience wrappers |
| Individual feature pages | 2+ pages with inline checks |

---

## 14. Implementation Plan

### Phase 1: Critical Security Fixes (Week 1)
1. Add `authenticate` + `requirePageAccess('super-admin.pages', '<action>')` to `rbac/pages.js`
2. Add `authenticate` + `requirePageAccess('super-admin.permissions', '<action>')` to `rbac/permissions.js`
3. Add `authenticate` + `requirePageAccess('super-admin.roles', '<action>')` to `rbac/roles.js`
4. Add `authenticate` + `requirePageAccess('super-admin.modules', '<action>')` to `rbac/modules.js`
5. Add `authenticate` to `jobs.routes.js` and `tickets.routes.js`

### Phase 2: Add Authorization to Auth-Only Routes (Week 2)
1. Add `requirePageAccess` to all 15 routes that only have `authenticate`
2. Ensure correct page name mapping for each endpoint
3. Create missing Page documents in RBAC for any unmapped pages

### Phase 3: Migrate requireRole to requirePageAccess (Weeks 3-4)
1. For each of 22 route files:
   - Replace `import { requireRole }` with `import { requirePageAccess }`
   - Replace `requireRole('admin', 'hr', 'superadmin')` with `requirePageAccess('<page>', '<action>')`
   - Map HTTP methods: GET -> 'read', POST -> 'create', PUT -> 'write', DELETE -> 'delete'
   - Special actions: approve, reject, export for specific endpoints

### Phase 4: Migrate Socket Controllers (Week 5)
1. Create a `socketRequirePageAccess(socket, pageName, action)` helper function
2. Migrate all 14 socket controllers to use the helper
3. Ensure `socket.roleId` is available (set during socket authentication in `backend/socket/index.js`)

### Phase 5: Migrate REST Controller Inline Checks (Week 5)
1. Replace `const isAdmin = userRole === 'admin'` patterns with `req.hasPermission(page, action)` or equivalent
2. Migrate 4 controller files with inline checks

### Phase 6: Frontend Migration (Weeks 6-7)
1. Rewrite `withRoleCheck.jsx` to use `PermissionContext` instead of hardcoded roles
2. Replace `roles: [...]` arrays in `router.link.tsx` with `pageName` references
3. Replace `allowedRoles` in `dashboardRoleFilter.ts` with page-based filtering
4. Replace `RoleBasedRenderer` convenience wrappers with `PageAccessGuard` in dashboard pages
5. Migrate inline role checks in `leaveAdmin.tsx` and `task.tsx`
6. Add `PermissionButton` usage to all CRUD buttons in feature pages

### Phase 7: Cleanup and Testing (Week 8)
1. Remove unused `requireRole` export from `auth.js` (or deprecate)
2. Remove `RoleBasedRenderer` convenience wrappers if fully replaced
3. Run full permission matrix testing
4. Document final RBAC coverage

---

## Appendix A: Action String Mapping

| HTTP Method / Socket Event | RBAC Action |
|---------------------------|-------------|
| GET (list/read) | `read` |
| POST (create) | `create` |
| PUT / PATCH (update) | `write` |
| DELETE | `delete` |
| POST /:id/approve | `approve` |
| POST /:id/reject | `reject` |
| GET /export | `export` |
| POST /import | `import` |
| POST /bulk | `write` or `create` |

## Appendix B: Page Name Mapping for Routes

| Route File | Suggested RBAC Page Name |
|-----------|-------------------------|
| admin-dashboard | `admin.dashboard` |
| hr-dashboard | `hr.dashboard` |
| employees / hrm.employees | `hrm.employees` |
| attendance | `hrm.attendance` |
| leave | `hrm.leaves` |
| leaveTypes | `hrm.leave-types` |
| holidays | `hrm.holidays` |
| holiday-types | `hrm.holiday-types` |
| departments | `hrm.departments` |
| designations | `hrm.designations` |
| shifts | `hrm.shifts` |
| overtime | `hrm.overtime` |
| timesheets | `hrm.timesheets` |
| schedule | `hrm.schedule` |
| batches | `hrm.batches` |
| policies | `hrm.policies` |
| resignations | `hrm.resignations` |
| terminations | `hrm.terminations` |
| promotions | `hrm.promotions` |
| training | `hrm.training` |
| assets | `administration.assets` |
| asset-categories | `administration.asset-categories` |
| assetUsers | `administration.asset-users` |
| projects | `projects.projects` |
| project-notes | `projects.project-notes` |
| tasks | `projects.tasks` |
| clients | `projects.clients` |
| milestones | `projects.milestones` |
| resources | `projects.resources` |
| timetracking | `projects.time-tracking` |
| budgets | `finance.budgets` |
| invoices | `finance.invoices` |
| payroll | `finance.payroll` |
| leads | `crm.leads` |
| deals | `crm.deals` |
| contacts | `crm.contacts` |
| companies (CRM) | `crm.companies` |
| pipelines | `crm.pipelines` |
| activities (CRM) | `crm.activities` |
| reports | `administration.reports` |
| tickets | `administration.tickets` |
| jobs | `recruitment.jobs` |
| candidates | `recruitment.candidates` |
| admin.users | `admin.users` |
| superadmin.routes | `super-admin.users` |
| superadmin.companies | `super-admin.companies` |
| syncRole | `admin.sync-roles` |
| rbac/pages | `super-admin.pages` |
| rbac/permissions | `super-admin.permissions` |
| rbac/roles | `super-admin.roles` |
| rbac/modules | `super-admin.modules` |
| performance/* | `performance.*` |

---

*End of Report*
