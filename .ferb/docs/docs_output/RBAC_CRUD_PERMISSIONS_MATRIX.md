# Role-Based Access Control - CRUD Permissions Matrix (CORRECTED)

## Overview
This document defines CRUD (Create, Read, Update, Delete) permissions for all entities/attributes in the manageRTC platform by role.

## Architecture Overview

**Multi-Tenant Platform:**
- **SuperAdmin** = Platform Owner (manages all companies, sees analytics only)
- **Admin** = Company Owner (full access to their company's data)
- **HR** = HR Manager (HRM + CRM access)
- **Employee** = Regular Employee (limited access, no sensitive data)

**Key Principle:** SuperAdmin CANNOT access any business data from other companies. Only company analytics.

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Allowed |
| ❌ | Not Allowed |
| 🔒 | Owner Only (user can only access their own data) |
| ⚠️ | Partial Access (see notes) |
| 🚨 | Security Issue Found |

---

# ENTITY: Employee

**Schema:** [backend/models/employee/employee.schema.js](backend/models/employee/employee.schema.js)
**Routes:** [backend/routes/api/employees.js](backend/routes/api/employees.js)
**Controller:** [backend/controllers/rest/employee.controller.js](backend/controllers/rest/employee.controller.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Manager | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|:-------:|-------|
| Create | POST /api/employees | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ SuperAdmin - no company data access |
| Read (All) | GET /api/employees | ❌ | ✅ | ✅ | ❌ | ❌ | By company only |
| Read (Own Profile) | GET /api/employees/me | ❌ | ✅ | ✅ | ✅ | ✅ | |
| Read (By ID) | GET /api/employees/:id | ❌ | ✅ | ✅ | 🔒 | 🔒 | Same company only |
| Update | PUT /api/employees/:id | ❌ | ✅ | ✅ | ❌ | ❌ | |
| Update (Own Profile) | PUT /api/employees/me | ❌ | ✅ | ✅ | ✅ | ✅ | Limited fields |
| Delete | DELETE /api/employees/:id | ❌ | ✅ | ❌ | ❌ | ❌ | Admin only |
| Delete (Multiple) | DELETE /api/employees | ❌ | ✅ | ❌ | ❌ | ❌ | |
| Search | GET /api/employees/search | ❌ | ✅ | ✅ | ❌ | ❌ | |
| Bulk Upload | POST /api/employees/bulk-upload | ❌ | ✅ | ✅ | ❌ | ❌ | |
| Upload Image | POST /api/employees/:id/image | ❌ | ✅ | ✅ | 🔒 | 🔒 | |
| Deactivate | PUT /api/employees/:id/deactivate | ❌ | ✅ | ❌ | ❌ | ❌ | |
| Reactivate | PUT /api/employees/:id/reactivate | ❌ | ✅ | ❌ | ❌ | ❌ | |
| Stats | GET /api/employees/stats | ❌ | ✅ | ✅ | ❌ | ❌ | Company stats |

### Employee Attributes & Field-Level Access

| Attribute | SuperAdmin | Admin | HR | Employee (Own) | Notes |
|-----------|:----------:|:----:|:--:|:------:|-------|
| personalInfo.firstName | ❌ | Read/Write | Read/Write | Read/Write | |
| personalInfo.lastName | ❌ | Read/Write | Read/Write | Read/Write | |
| personalInfo.email | ❌ | Read/Write | Read/Write | Read | |
| personalInfo.phone | ❌ | Read/Write | Read/Write | Read/Write | |
| personalInfo.dateOfBirth | ❌ | Read/Write | Read/Write | Read | Sensitive |
| personalInfo.gender | ❌ | Read/Write | Read/Write | Read/Write | |
| personalInfo.bloodGroup | ❌ | Read/Write | Read/Write | Read | |
| personalInfo.maritalStatus | ❌ | Read/Write | Read/Write | Read | Sensitive |
| personalInfo.nationality | ❌ | Read/Write | Read/Write | Read/Write | |
| address | ❌ | Read/Write | Read/Write | Read/Write | Sensitive |
| employmentInfo.employeeId | ❌ | Read/Write | Read/Write | Read | |
| employmentInfo.companyId | ❌ | Read | Read | Hidden | Multi-tenant key |
| employmentInfo.department | ❌ | Read/Write | Read/Write | Read | |
| employmentInfo.designation | ❌ | Read/Write | Read/Write | Read | |
| employmentInfo.joiningDate | ❌ | Read/Write | Read/Write | Read | |
| employmentInfo.employmentType | ❌ | Read/Write | Read/Write | Read | |
| employmentInfo.reportingManager | ❌ | Read/Write | Read/Write | Read | |
| employmentInfo.role | ❌ | Read/Write | Read/Write | Hidden | Sensitive |
| employmentInfo.status | ❌ | Read/Write | Read/Write | Read | |
| bankAccount | ❌ | Read/Write | Read/Write | Read | Highly sensitive |
| emergencyContact | ❌ | Read/Write | Read/Write | Read/Write | |
| profileImage | ❌ | Read/Write | Read/Write | Read/Write | |
| salary | ❌ | Read/Write | Read/Write | ❌ | Highly sensitive |

---

# ENTITY: Company (SuperAdmin Analytics)

**Services:** [backend/services/superadmin/companies.services.js](backend/services/superadmin/companies.services.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create Company | POST /api/super-admin/companies | ✅ | ❌ | ❌ | ❌ | |
| Read (All Companies) | GET /api/super-admin/companies | ✅ | ❌ | ❌ | ❌ | Analytics only |
| Update Company | PUT /api/super-admin/companies/:id | ✅ | ❌ | ❌ | ❌ | Platform settings |
| Delete Company | DELETE /api/super-admin/companies/:id | ✅ | ❌ | ❌ | ❌ | |
| Update Status | PUT /api/super-admin/companies/:id/status | ✅ | ❌ | ❌ | ❌ | Active/Inactive |
| Get User Count | GET /api/super-admin/companies/:id/users | ✅ | ❌ | ❌ | ❌ | Analytics |
| Get Analytics | GET /api/super-admin/analytics | ✅ | ❌ | ❌ | ❌ | Platform analytics |
| Read Company Details | GET /api/super-admin/companies/:id | ✅ | ❌ | ❌ | ❌ | For analytics only |

### Company Attributes (SuperAdmin)

| Attribute | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|:----------:|:----:|:--:|:--------:|-------|
| companyName | Read/Write | Read (own) | Read (own) | Read (own) | |
| domain | Read/Write | - | - | - | Platform level |
| status | Read/Write | - | - | - | Active/Inactive |
| subscriptionId | Read | - | - | - | Foreign key |
| packageId | Read | - | - | - | Foreign key |
| userCount | Read | - | - | - | Analytics |
| createdAt | Read | - | - | - | Analytics |
| subscriptionExpiry | Read | - | - | - | Analytics |

---

# ENTITY: Attendance

**Schema:** [backend/models/attendance/attendance.schema.js](backend/models/attendance/attendance.schema.js)
**Routes:** [backend/routes/api/attendance.js](backend/routes/api/attendance.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create (Clock In) | POST /api/attendance/clock-in | ❌ | ✅ | ✅ | ✅ | |
| Update (Clock Out) | PUT /api/attendance/clock-out | ❌ | ✅ | ✅ | ✅ | |
| Read (All) | GET /api/attendance | ❌ | ✅ | ✅ | ❌ | Company data only |
| Read (Own) | GET /api/attendance/my | ❌ | ✅ | ✅ | ✅ | |
| Delete | DELETE /api/attendance/:id | ❌ | ✅ | ❌ | ❌ | |
| Regularize Request | POST /api/attendance/regularize | ❌ | ✅ | ✅ | ✅ | |
| Approve Regularization | PUT /api/attendance/regularize/:id/approve | ❌ | ✅ | ✅ | ❌ | |
| Reject Regularization | PUT /api/attendance/regularize/:id/reject | ❌ | ✅ | ✅ | ❌ | |
| Reports | GET /api/attendance/reports | ❌ | ✅ | ✅ | ❌ | |
| Export | GET /api/attendance/export | ❌ | ✅ | ✅ | ❌ | |
| Stats | GET /api/attendance/stats | ❌ | ✅ | ✅ | ❌ | |

---

# ENTITY: Leave

**Schema:** [backend/models/leave/leave.schema.js](backend/models/leave/leave.schema.js)
**Routes:** [backend/routes/api/leave.js](backend/routes/api/leave.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create (Request) | POST /api/leaves | ❌ | ✅ | ✅ | ✅ | |
| Read (All) | GET /api/leaves | ❌ | ✅ | ✅ | ❌ | Company data only |
| Read (Own) | GET /api/leaves/my | ❌ | ✅ | ✅ | ✅ | |
| Update | PUT /api/leaves/:id | ❌ | ✅ | ✅ | ❌ | |
| Delete | DELETE /api/leaves/:id | ❌ | ✅ | ❌ | ❌ | |
| Approve | PUT /api/leaves/:id/approve | ❌ | ✅ | ✅ | ❌ | |
| Reject | PUT /api/leaves/:id/reject | ❌ | ✅ | ✅ | ❌ | |
| Cancel | PUT /api/leaves/:id/cancel | ❌ | ✅ | ✅ | ✅ | Owner only |
| Get Balance | GET /api/leaves/balance | ❌ | ✅ | ✅ | ✅ | |
| Get Types | GET /api/leaves/types | ❌ | ✅ | ✅ | ✅ | |

---

# ENTITY: Shift

**Schema:** [backend/models/shift/shift.schema.js](backend/models/shift/shift.schema.js)
**Routes:** [backend/routes/api/shifts.js](backend/routes/api/shifts.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/shifts | ❌ | ✅ | ✅ | ❌ | |
| Read (All) | GET /api/shifts | ❌ | ✅ | ✅ | ❌ | |
| Read (Active) | GET /api/shifts/active | ❌ | ✅ | ✅ | ✅ | |
| Read (Default) | GET /api/shifts/default | ❌ | ✅ | ✅ | ✅ | |
| Update | PUT /api/shifts/:id | ❌ | ✅ | ✅ | ❌ | |
| Delete | DELETE /api/shifts/:id | ❌ | ✅ | ❌ | ❌ | |
| Set Default | PUT /api/shifts/:id/set-default | ❌ | ✅ | ✅ | ❌ | |
| Assign to Employee | POST /api/shifts/assign | ❌ | ✅ | ✅ | ❌ | |
| Bulk Assign | POST /api/shifts/bulk-assign | ❌ | ✅ | ✅ | ❌ | |
| Remove Assignment | DELETE /api/shifts/:employeeId | ❌ | ✅ | ✅ | ❌ | |

---

# ENTITY: Project

**Schema:** [backend/models/project/project.schema.js](backend/models/project/project.schema.js)
**Routes:** [backend/routes/api/projects.js](backend/routes/api/projects.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/projects | ❌ | ✅ | ✅ | ❌ | |
| Read (All) | GET /api/projects | ❌ | ✅ | ✅ | ✅ | |
| Read (Own) | GET /api/projects/my | ❌ | ✅ | ✅ | ✅ | |
| Update | PUT /api/projects/:id | ❌ | ✅ | ✅ | ❌ | |
| Delete | DELETE /api/projects/:id | ❌ | ✅ | ❌ | ❌ | |
| Update Progress | PUT /api/projects/:id/progress | ❌ | ✅ | ✅ | ❌ | |
| Stats | GET /api/projects/stats | ❌ | ✅ | ✅ | ❌ | |

---

# ENTITY: Task

**Schema:** [backend/models/task/task.schema.js](backend/models/task/task.schema.js)
**Routes:** [backend/routes/api/tasks.js](backend/routes/api/tasks.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/tasks | ❌ | ✅ | ✅ | ❌ | |
| Read (All) | GET /api/tasks | ❌ | ✅ | ✅ | ✅ | |
| Read (Own) | GET /api/tasks/my | ❌ | ✅ | ✅ | ✅ | |
| Update | PUT /api/tasks/:id | ❌ | ✅ | ✅ | ❌ | |
| Delete | DELETE /api/tasks/:id | ❌ | ✅ | ❌ | ❌ | |
| Update Status | PUT /api/tasks/:id/status | ❌ | ✅ | ✅ | ❌ | |
| Stats | GET /api/tasks/stats | ❌ | ✅ | ✅ | ❌ | |

---

# ENTITY: Client (CRM)

**Schema:** [backend/models/client/client.schema.js](backend/models/client/client.schema.js)
**Routes:** [backend/routes/api/clients.js](backend/routes/api/clients.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/clients | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Read (All) | GET /api/clients | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Update | PUT /api/clients/:id | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Delete | DELETE /api/clients/:id | ❌ | ✅ | ❌ | ❌ | ❌ Employee |
| Stats | GET /api/clients/stats | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Export PDF | GET /api/clients/export/pdf | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Export Excel | GET /api/clients/export/excel | ❌ | ✅ | ✅ | ❌ | ❌ Employee |

---

# ENTITY: Lead (CRM)

**Schema:** [backend/models/lead/lead.schema.js](backend/models/lead/lead.schema.js)
**Routes:** [backend/routes/api/leads.js](backend/routes/api/leads.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/leads | ❌ | ✅ | ✅ | ❌ | |
| Read (All) | GET /api/leads | ❌ | ✅ | ✅ | ✅ | |
| Read (Own) | GET /api/leads/my | ❌ | ✅ | ✅ | ✅ | |
| Update | PUT /api/leads/:id | ❌ | ✅ | ✅ | ❌ | |
| Delete | DELETE /api/leads/:id | ❌ | ✅ | ❌ | ❌ | |
| Update Stage | PUT /api/leads/:id/stage | ❌ | ✅ | ✅ | ❌ | |
| Convert to Client | POST /api/leads/:id/convert | ❌ | ✅ | ✅ | ❌ | |
| Stats | GET /api/leads/stats | ❌ | ✅ | ✅ | ❌ | |

---

# ENTITY: Deal (CRM)

**Controller:** [backend/controllers/deal/deal.controller.js](backend/controllers/deal/deal.controller.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/deals | ❌ | ✅ | ❌ | ❌ | ❌ Employee |
| Read (All) | GET /api/deals | ❌ | ✅ | ❌ | ❌ | ❌ Employee |
| Update | PUT /api/deals/:id | ❌ | ✅ | ❌ | ❌ | ❌ Employee |

---

# ENTITY: Contact (CRM)

**Routes:** CRM contacts routes

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/contacts | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Read (All) | GET /api/contacts | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Update | PUT /api/contacts/:id | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Delete | DELETE /api/contacts/:id | ❌ | ✅ | ❌ | ❌ | ❌ Employee |

---

# ENTITY: Department

**Controller:** [backend/controllers/rest/department.controller.js](backend/controllers/rest/department.controller.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/departments | ❌ | ✅ | ✅ | 🚨 | 🚨 No role check |
| Read (All) | GET /api/departments | ❌ | ✅ | ✅ | ✅ | |
| Update | PUT /api/departments/:id | ❌ | ✅ | ✅ | 🚨 | 🚨 No role check |
| Delete | DELETE /api/departments/:id | ❌ | ✅ | ❌ | 🚨 | 🚨 No role check |
| Update Status | PUT /api/departments/:id/status | ❌ | ✅ | ✅ | 🚨 | 🚨 No role check |

---

# ENTITY: Performance Indicators

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee |
|-----------|----------|:----------:|:----:|:--:|:--------:|
| Create | POST /api/performance-indicators | ❌ | ✅ | ❌ | ❌ |
| Read (All) | GET /api/performance-indicators | ❌ | ✅ | ✅ | ✅ |
| Update | PUT /api/performance-indicators/:id | ❌ | ✅ | ❌ | ❌ |
| Delete | DELETE /api/performance-indicators/:id | ❌ | ✅ | ❌ | ❌ |

---

# ENTITY: Job (Recruitment)

**Model:** [backend/models/job/job.model.js](backend/models/job/job.model.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/jobs | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Read (All) | GET /api/jobs | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Read (Public) | GET /api/jobs/public | ❌ | ✅ | ✅ | ❌ | Public job board |
| Update | PUT /api/jobs/:id | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Delete | DELETE /api/jobs/:id | ❌ | ✅ | ❌ | ❌ | ❌ Employee |

---

# ENTITY: Candidate (Recruitment)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/candidates | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Read (All) | GET /api/candidates | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Update | PUT /api/candidates/:id | ❌ | ✅ | ✅ | ❌ | ❌ Employee |
| Delete | DELETE /api/candidates/:id | ❌ | ✅ | ❌ | ❌ | ❌ Employee |

---

# ENTITY: Asset (Administration)

**Schema:** [backend/models/asset/asset.schema.js](backend/models/asset/asset.schema.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/assets | ❌ | ✅ | ❌ | ❌ | Admin only |
| Read (All) | GET /api/assets | ❌ | ✅ | ❌ | ❌ | Admin only |
| Update | PUT /api/assets/:id | ❌ | ✅ | ❌ | ❌ | Admin only |
| Delete | DELETE /api/assets/:id | ❌ | ✅ | ❌ | ❌ | Admin only |
| Assign | POST /api/assets/:id/assign | ❌ | ✅ | ❌ | ❌ | Admin only |
| Return | POST /api/assets/:id/return | ❌ | ✅ | ❌ | ❌ | Admin only |

---

# ENTITY: Invoice (Finance)

**Schema:** [backend/models/invoice/invoice.schema.js](backend/models/invoice/invoice.schema.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee | Notes |
|-----------|----------|:----------:|:----:|:--:|:--------:|-------|
| Create | POST /api/invoices | ❌ | ✅ | ✅ | ❌ | |
| Read (All) | GET /api/invoices | ❌ | ✅ | ✅ | ❌ | |
| Update | PUT /api/invoices/:id | ❌ | ✅ | ✅ | ❌ | |
| Delete | DELETE /api/invoices/:id | ❌ | ✅ | ❌ | ❌ | |

---

# ENTITY: Package (SuperAdmin)

**Schema:** [backend/models/package/package.schema.js](backend/models/package/package.schema.js)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee |
|-----------|----------|:----------:|:----:|:--:|:--------:|
| Create | POST /api/packages | ✅ | ❌ | ❌ | ❌ |
| Read (All) | GET /api/packages | ✅ | ❌ | ❌ | ❌ |
| Update | PUT /api/packages/:id | ✅ | ❌ | ❌ | ❌ |
| Delete | DELETE /api/packages/:id | ✅ | ❌ | ❌ | ❌ |

---

# ENTITY: Subscription (SuperAdmin)

| Operation | Endpoint | SuperAdmin | Admin | HR | Employee |
|-----------|----------|:----------:|:----:|:--:|:--------:|
| Create | POST /api/subscriptions | ✅ | ❌ | ❌ | ❌ |
| Read (All) | GET /api/subscriptions | ✅ | ❌ | ❌ | ❌ |
| Update | PUT /api/subscriptions/:id | ✅ | ❌ | ❌ | ❌ |
| Cancel | DELETE /api/subscriptions/:id | ✅ | ❌ | ❌ | ❌ |

---

# Summary Table: All Entity Permissions

| Entity | SuperAdmin | Admin | HR | Employee |
|--------|:----------:|:----:|:--:|:--------:|
| **Company Management** | ✅ Analytics only | ❌ | ❌ | ❌ |
| **Package** | ✅ Full | ❌ | ❌ | ❌ |
| **Subscription** | ✅ Full | ❌ | ❌ | ❌ |
| **Employee** | ❌ | ✅ Full | ✅ Full | 🔒 Own only |
| **Attendance** | ❌ | ✅ Full | ✅ Full | 🔒 Own only |
| **Leave** | ❌ | ✅ Full | ✅ Full | 🔒 Own only |
| **Shift** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Project** | ❌ | ✅ Full | ✅ Full | ⚠️ Assigned only |
| **Task** | ❌ | ✅ Full | ✅ Full | ⚠️ Assigned only |
| **Client** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Lead** | ❌ | ✅ Full | ✅ Full | ⚠️ Assigned only |
| **Deal** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Contact** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Department** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Performance** | ❌ | ✅ Full | ❌ | ❌ |
| **Job (Recruitment)** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Candidate** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Asset** | ❌ | ✅ Admin only | ❌ | ❌ |
| **Invoice** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Budget** | ❌ | ✅ Full | ✅ Full | ❌ |
| **Training** | ❌ | ✅ Full | ✅ Full | ❌ |

---

# Critical Security Issues Summary

| Issue | Severity | Location | Impact |
|-------|----------|----------|--------|
| No role checks on Department controller | 🚨 Critical | [backend/controllers/rest/department.controller.js](backend/controllers/rest/department.controller.js) | Any authenticated user can create/update/delete departments |
| SuperAdmin may have access to business modules | 🚨 Critical | Multiple files | SuperAdmin should ONLY access Super Admin Dashboard and company analytics |
| Employee may have access to Clients/Contacts | 🚨 Critical | PM/CRM routes | Employee should NOT access Clients or Contacts |
| Employee may have access to Leads/Deals dashboards | 🚨 Critical | Dashboard components | Employee should NOT see Leads/Deals dashboards |
| Employee may have access to Recruitment | 🚨 Critical | Recruitment routes | Employee should NOT access Jobs/Candidates |
| HR may have access to Administration | 🚨 Critical | Admin routes | Administration is Admin-only |
| Manager role not in schema enum | ⚠️ High | [backend/models/employee/employee.schema.js](backend/models/employee/employee.schema.js) | Inconsistent behavior |
| Leads role not in schema enum | ⚠️ High | [backend/models/employee/employee.schema.js](backend/models/employee/employee.schema.js) | Inconsistent behavior |
