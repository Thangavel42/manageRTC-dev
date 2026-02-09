# Role-Based Access Control - Pages Access Matrix (CORRECTED)

## Overview
This document defines all pages in the manageRTC platform and which roles can access them.

## Architecture Overview

**Multi-Tenant Platform Structure:**
- **SuperAdmin** = Platform Owner Company (manages all companies)
- **Admin** = Company Owner (each company has one Admin)
- **HR** = HR Manager (added by Admin)
- **Employee** = Regular Employee (added by Admin)

**Key Principle:** SuperAdmin only sees analytics about companies. SuperAdmin CANNOT access HRM, PM, CRM, or any business modules of other companies.

---

## Roles Defined

| Role | Code | Description | Company Scope |
|------|------|-------------|---------------|
| Super Admin | `superadmin` | Platform administrator. Manages all companies. Can ONLY see Super Admin Dashboard and analytics. | Platform-wide (all companies) |
| Admin | `admin` | Company Owner. Full access to their company's data. Cannot access HR Dashboard (that's for HR role). | Own company only |
| HR Manager | `hr` | HR role. Access to HRM, Leads, Deals dashboards. | Own company only |
| Employee | `employee` | Regular employee. Limited access - no Leads/Deals dashboards, no Recruitment, no Clients/Contacts. | Own company only |
| Manager | `manager` | Manager role (partially implemented - inconsistent across system) | Own company only |
| Leads | `leads` | Sales/Lead role (exists in socket routes but not in schema enum) | Own company only |

---

## DASHBOARDS MODULE

| Page | Route | SuperAdmin | Admin | HR | Employee | Manager | Notes |
|------|-------|:----------:|:----:|:--:|:--------:|:-------:|-------|
| Super Admin Dashboard | `/super-admin/dashboard` | ✅ | ❌ | ❌ | ❌ | ❌ | Analytics about all companies |
| Admin Dashboard | `/admin-dashboard` | ❌ | ✅ | ❌ | ❌ | ❌ | Company overview for Admin |
| HR Dashboard | `/hr-dashboard` | ❌ | ❌ | ✅ | ❌ | ❌ | HR specific dashboard |
| Employee Dashboard | `/employee-dashboard` | ❌ | ✅ | ✅ | ✅ | ✅ | Standard employee dashboard |
| Leads Dashboard | `/leads-dashboard` | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ Employee |
| Deals Dashboard | `/deals-dashboard` | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ Employee |

### Dashboard Access Rules

**SuperAdmin:** Can ONLY access Super Admin Dashboard. No other dashboards.
**Admin:** Can access Admin Dashboard, Employee Dashboard, Leads Dashboard, Deals Dashboard. CANNOT access HR Dashboard.
**HR:** Can access HR Dashboard, Employee Dashboard, Leads Dashboard, Deals Dashboard.
**Employee:** Can ONLY access Employee Dashboard. CANNOT access Leads or Deals dashboards.

### Dashboard Files
- [super-admin/dashboard/index.tsx](react/src/feature-module/super-admin/dashboard/index.tsx)
- [adminDashboard/index.tsx](react/src/feature-module/mainMenu/adminDashboard/index.tsx)
- [hrDashboard/index.tsx](react/src/feature-module/mainMenu/hrDashboard/index.tsx)
- [employeeDashboard/index.tsx](react/src/feature-module/mainMenu/employeeDashboard/index.tsx)

### 🔴 Issues Found

**1. HR Dashboard Shows All Dashboards**
**Location:** [hrDashboard/index.tsx:67-96](react/src/feature-module/mainMenu/hrDashboard/index.tsx#L67-L96)

Should only show HR-appropriate dashboards (HR, Leads, Deals).

**2. Employee Dashboard Shows All Dashboards**
**Location:** [employeeDashboard/index.tsx](react/src/feature-module/mainMenu/employeeDashboard/index.tsx)

Should only show Employee Dashboard.

**3. SuperAdmin May Have Access to Other Dashboards**
**Location:** Navigation components and sidebar menus

SuperAdmin should ONLY see Super Admin Dashboard card/link.

---

## HRM MODULE

| Page | Route | SuperAdmin | Admin | HR | Employee | Manager | Notes |
|------|-------|:----------:|:----:|:--:|:--------:|:-------:|-------|
| Employees List | `/employees` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin - no company data access |
| Employees Grid | `/employee-grid` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Employee Details | `/employee-details` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Departments | `/departments` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Designations | `/designations` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Policies | `/policy` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Tickets | `/tickets/ticket-list` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Ticket Details | `/tickets/ticket-details` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Holidays | `/holidays` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Leaves (Admin) | `/leave-admin` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Leaves (Employee) | `/leave-employee` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Leave Settings | `/leave-settings` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Attendance (Admin) | `/attendance-admin` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Attendance (Employee) | `/attendance-employee` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Timesheet | `/timesheet` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Shift & Schedule | `/schedule-timing` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Shifts Management | `/shifts-management` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Shift Batches | `/batches-management` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Overtime | `/overtime` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Performance Indicator | `/performance/performance-indicator` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Performance Review | `/performance/performance-review` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Performance Appraisal | `/performance/performance-appraisal` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Goal List | `/performance/goal-tracking` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Goal Type | `/performance/goal-type` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Training List | `/training/training-list` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Trainers | `/training/trainers` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Training Type | `/training/training-type` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Promotion | `/promotion` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Resignation | `/resignation` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Termination | `/termination` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |

### HRM Module Access Rules

**SuperAdmin:** ❌ NO ACCESS to any HRM pages. Only analytics via Super Admin Dashboard.
**Admin:** ✅ Full access to all HRM pages.
**HR:** ✅ Full access to all HRM pages.
**Employee:** Limited access (Holidays, own Leave, own Attendance, Timesheet).

---

## PROJECT MANAGEMENT MODULE

| Page | Route | SuperAdmin | Admin | HR | Employee | Manager | Notes |
|------|-------|:----------:|:----:|:--:|:--------:|:-------:|-------|
| Clients | `/clients` | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ Employee, ❌ SuperAdmin |
| Projects | `/projects` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Project Details | `/project-details` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Tasks | `/tasks` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Task Board | `/task-board` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |

### PM Module Access Rules

**SuperAdmin:** ❌ NO ACCESS to any PM pages.
**Admin:** ✅ Full access.
**HR:** ✅ Full access.
**Employee:** ✅ Access to Projects, Project Details, Tasks, Task Board. ❌ NO access to Clients.
**Manager:** ✅ Full access.

---

## CRM MODULE

| Page | Route | SuperAdmin | Admin | HR | Employee | Manager | Notes |
|------|-------|:----------:|:----:|:--:|:--------:|:-------:|-------|
| Contacts | `/contacts` | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ Employee, ❌ SuperAdmin |
| Companies | `/companies` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Deals | `/deals` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Leads | `/leads` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Pipeline | `/pipeline` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Analytics | `/analytics` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |
| Activities | `/activities` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ SuperAdmin |

### CRM Module Access Rules

**SuperAdmin:** ❌ NO ACCESS to any CRM pages.
**Admin:** ✅ Full access.
**HR:** ✅ Full access.
**Employee:** ✅ Access to Companies, Deals, Leads, Pipeline, Analytics, Activities. ❌ NO access to Contacts.
**Manager:** ✅ Full access.

---

## RECRUITMENT MODULE

| Page | Route | SuperAdmin | Admin | HR | Employee | Manager | Notes |
|------|-------|:----------:|:----:|:--:|:--------:|:-------:|-------|
| Jobs | `/jobs` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ Employee, ❌ SuperAdmin |
| Candidates | `/candidates` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ Employee, ❌ SuperAdmin |
| Referrals | `/referral` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ Employee, ❌ SuperAdmin |

### Recruitment Module Access Rules

**SuperAdmin:** ❌ NO ACCESS to any Recruitment pages.
**Admin:** ✅ Full access.
**HR:** ✅ Full access.
**Employee:** ❌ NO ACCESS to any Recruitment pages.

---

## FINANCE & ACCOUNTS MODULE

| Page | Route | SuperAdmin | Admin | HR | Employee | Manager | Notes |
|------|-------|:----------:|:----:|:--:|:--------:|:-------:|-------|
| Estimates | `/estimates` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Invoices | `/invoices` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Payments | `/payments` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Expenses | `/expenses` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Provident Fund | `/provident-fund` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Taxes | `/taxes` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Categories | `/categories` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Budgets | `/budgets` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Budget Expenses | `/budget-expenses` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Budget Revenues | `/budget-revenues` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Employee Salary | `/employee-salary` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Payslip | `/payslip` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |
| Payroll Items | `/payroll-items` | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin |

### Finance Module Access Rules

**SuperAdmin:** ❌ NO ACCESS to any Finance pages.
**Admin:** ✅ Full access.
**HR:** ✅ Full access.
**Employee:** ❌ NO ACCESS to Finance pages (except maybe view own payslip - check requirements).

---

## ADMINISTRATION MODULE

| Page | Route | SuperAdmin | Admin | HR | Employee | Manager | Notes |
|------|-------|:----------:|:----:|:--:|:--------:|:-------:|-------|
| Assets | `/assets` | ❌ | ✅ | ❌ | ❌ | ❌ | Admin Only |
| Asset Categories | `/asset-categories` | ❌ | ✅ | ❌ | ❌ | ❌ | Admin Only |
| Knowledge Base | `/knowledgebase` | ❌ | ✅ | ❌ | ❌ | ❌ | Admin Only |
| Users | `/users` | ❌ | ✅ | ❌ | ❌ | ❌ | Admin Only |
| Roles & Permissions | `/roles-permissions` | ❌ | ✅ | ❌ | ❌ | ❌ | Admin Only |
| All Reports | `/reports/*` | ❌ | ✅ | ❌ | ❌ | ❌ | Admin Only |

### Administration Module Access Rules

**SuperAdmin:** ❌ NO ACCESS (company-level administration is for Admin only).
**Admin:** ✅ Full access (Admin manages their company's settings).
**HR:** ❌ NO ACCESS (Administration is for Admin only).
**Employee:** ❌ NO ACCESS.

---

## SUPER ADMIN MODULE (Platform Owner)

| Page | Route | SuperAdmin | Admin | HR | Employee | Manager | Notes |
|------|-------|:----------:|:----:|:--:|:--------:|:-------:|-------|
| Companies | `/super-admin/companies` | ✅ | ❌ | ❌ | ❌ | ❌ | SuperAdmin only |
| Subscriptions | `/super-admin/subscription` | ✅ | ❌ | ❌ | ❌ | ❌ | SuperAdmin only |
| Packages | `/super-admin/package` | ✅ | ❌ | ❌ | ❌ | ❌ | SuperAdmin only |
| Domain | `/super-admin/domain` | ✅ | ❌ | ❌ | ❌ | ❌ | SuperAdmin only |
| Purchase Transaction | `/super-admin/purchase-transaction` | ✅ | ❌ | ❌ | ❌ | ❌ | SuperAdmin only |

### SuperAdmin Module Access Rules

**SuperAdmin:** ✅ Full access to platform-level management.
**All other roles:** ❌ NO ACCESS.

---

## APPLICATIONS MODULE (Common to All Authenticated Users - Company Scope)

| Page | Route | SuperAdmin | Admin | HR | Employee | Manager | Notes |
|------|-------|:----------:|:----:|:--:|:--------:|:-------:|-------|
| Chat | `/application/chat` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |
| Voice Call | `/application/voice-call` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |
| Video Call | `/application/video-call` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |
| Call History | `/application/call-history` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |
| Calendar | `/calendar` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |
| Email | `/application/email` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |
| To Do | `/application/todo` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |
| Notes | `/notes` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |
| Social Feed | `/application/social-feed` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |
| File Manager | `/application/file-manager` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |
| Kanban | `/application/kanban-view` | ❌ | ✅ | ✅ | ✅ | ✅ | SuperAdmin not needed |

### Applications Module Access Rules

**SuperAdmin:** ❌ NO ACCESS (SuperAdmin manages platform, doesn't use company applications).
**All other authenticated users:** ✅ Access to applications within their company.

---

## GENERAL MODULE (Common Pages)

| Page | Route | All Roles |
|------|-------|:---------:|
| Profile | `/profile` | ✅ |
| Lock Screen | `/lock-screen` | ✅ |
| Login | `/login` | ✅ |
| Register | `/register` | ✅ |
| Forgot Password | `/forgot-password` | ✅ |
| 404 Not Found | `/error-404` | ✅ |
| 500 Error | `/error-500` | ✅ |

---

## Role Access Summary Table

| Module | SuperAdmin | Admin | HR | Employee |
|--------|:----------:|:----:|:--:|:--------:|
| **Dashboards** | Super Admin Dashboard only | Admin, Employee, Leads, Deals | HR, Employee, Leads, Deals | Employee only |
| **HRM** | ❌ None | ✅ All | ✅ All | ⚠️ Limited (own data, holidays) |
| **Project Management** | ❌ None | ✅ All | ✅ All | ⚠️ No Clients |
| **CRM** | ❌ None | ✅ All | ✅ All | ⚠️ No Contacts |
| **Recruitment** | ❌ None | ✅ All | ✅ All | ❌ None |
| **Finance** | ❌ None | ✅ All | ✅ All | ❌ None |
| **Administration** | ❌ None | ✅ Admin Only | ❌ None | ❌ None |
| **SuperAdmin Module** | ✅ All | ❌ None | ❌ None | ❌ None |
| **Applications** | ❌ None | ✅ All | ✅ All | ✅ All |

---

## Navigation Menu Files Reference

| Component | File Path | Needs Fix |
|-----------|-----------|:---------:|
| Sidebar Menu | [react/src/core/data/json/sidebarMenu.jsx](react/src/core/data/json/sidebarMenu.jsx) | ✅ Yes |
| Horizontal Sidebar | [react/src/core/data/json/horizontalSidebar.tsx](react/src/core/data/json/horizontalSidebar.tsx) | ✅ Yes |
| Stacked Sidebar | [react/src/core/common/stacked-sidebar/index.tsx](react/src/core/common/stacked-sidebar/index.tsx) | ✅ Yes |
| Two Column | [react/src/core/common/two-column/index.tsx](react/src/core/common/two-column/index.tsx) | ✅ Yes |
| Routes Definition | [react/src/feature-module/router/all_routes.tsx](react/src/feature-module/router/all_routes.tsx) | - |

---

## Access Control Principles

### SuperAdmin (Platform Owner)
- ONLY accesses Super Admin Dashboard
- ONLY manages companies at platform level
- Sees analytics about all companies
- CANNOT access any business data (HRM, PM, CRM, Finance, Recruitment)
- CANNOT access company applications (Chat, Calendar, etc.)

### Admin (Company Owner)
- Full access to their company's data
- Can manage employees, HR settings, projects, CRM, finance
- CANNOT access HR Dashboard (that's for HR role specifically)
- Manages Administration module for their company

### HR Manager
- Access to HRM module fully
- Access to CRM (Leads, Deals)
- Access to HR Dashboard
- NO access to Administration module (Admin only)

### Employee
- Access to Employee Dashboard only
- Access to own data (attendance, leave, timesheet)
- Access to Projects and Tasks (but NOT Clients)
- Access to CRM (but NOT Contacts)
- NO access to Recruitment module
- NO access to Leads/Deals dashboards
- NO access to Finance
- NO access to Administration
