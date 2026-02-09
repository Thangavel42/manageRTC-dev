# Multi-Tenant Architecture Report

## Platform Overview

**manageRTC** is a multi-tenant SaaS platform where:
- **SuperAdmin** = Platform Owner Company (your company)
- **Admin** = Company Owner (each company you onboard has one Admin)
- **HR** = HR Manager (added by Company Admin)
- **Employee** = Regular Employee (added by Company Admin)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    manageRTC PLATFORM                            │
│                    (SuperAdmin's Company)                        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ SuperAdmin Role
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPER ADMIN DASHBOARD                         │
│                    (Platform Analytics Only)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Companies│  │Packages  │  │Subscript.│  │Revenue   │        │
│  │ Analytics│  │Management│  │Management│  │Analytics │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Multi-Tenant Isolation (by companyId)
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TENANTS (Companies)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Company A   │  │  Company B   │  │  Company C   │         │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │         │
│  │  │ Admin  │  │  │  │ Admin  │  │  │  │ Admin  │  │         │
│  │  └───┬────┘  │  │  └───┬────┘  │  │  └───┬────┘  │         │
│  │      │       │  │      │       │  │      │       │         │
│  │      ├─ HR's │  │      ├─ HR's │  │      ├─ HR's │         │
│  │      │       │  │      │       │  │      │       │         │
│  │      └─ Employees│      └─ Employees│      └─ Employees│  │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Role Hierarchy & Permissions

### SuperAdmin (Platform Owner)

**Scope:** Platform-wide (all companies)

**Can Access:**
| Module | Access Type |
|--------|-------------|
| Super Admin Dashboard | ✅ Analytics & Charts |
| Companies Management | ✅ CRUD (onboard/modify companies) |
| Packages | ✅ CRUD (create subscription plans) |
| Subscriptions | ✅ CRUD (manage company subscriptions) |
| Domains | ✅ CRUD (manage custom domains) |
| Purchase Transactions | ✅ Read (revenue tracking) |
| Platform Analytics | ✅ Read (user counts, active companies, revenue) |

**CANNOT Access:**
| Module | ❌ Blocked |
|--------|-----------|
| HRM Module (Employees, Attendance, Leaves, etc.) | ❌ NO ACCESS |
| Project Management (Projects, Tasks, Clients) | ❌ NO ACCESS |
| CRM (Leads, Deals, Contacts) | ❌ NO ACCESS |
| Recruitment (Jobs, Candidates) | ❌ NO ACCESS |
| Finance (Invoices, Expenses, Payroll) | ❌ NO ACCESS |
| Administration (Assets, Users, Roles) | ❌ NO ACCESS |
| Applications (Chat, Calendar, File Manager) | ❌ NO ACCESS |

**Key Principle:** SuperAdmin manages the platform, not the business data of tenant companies.

---

### Admin (Company Owner)

**Scope:** Own company only (enforced by `companyId`)

**Can Access:**
| Module | Access Level |
|--------|--------------|
| Admin Dashboard | ✅ Full (company overview) |
| HRM Module | ✅ Full (employees, attendance, leaves, shifts, etc.) |
| Project Management | ✅ Full (projects, tasks, clients) |
| CRM | ✅ Full (leads, deals, contacts, companies) |
| Recruitment | ✅ Full (jobs, candidates, referrals) |
| Finance | ✅ Full (invoices, expenses, payroll, budgets) |
| Administration | ✅ Full (assets, knowledge base, users, roles, reports) |
| Applications | ✅ Full (chat, calendar, email, tasks, etc.) |

**CANNOT Access:**
| Module | ❌ Blocked |
|--------|-----------|
| Super Admin Dashboard | ❌ NO ACCESS |
| HR Dashboard | ❌ NO ACCESS (that's for HR role) |
| Other Companies' Data | ❌ NO ACCESS (enforced by companyId) |
| Platform Management | ❌ NO ACCESS |

---

### HR Manager

**Scope:** Own company only

**Can Access:**
| Module | Access Level |
|--------|--------------|
| HR Dashboard | ✅ Full (HR-specific metrics) |
| Employee Dashboard | ✅ Full |
| Leads Dashboard | ✅ Full |
| Deals Dashboard | ✅ Full |
| HRM Module | ✅ Full (all HR functions) |
| Project Management | ✅ Full (projects, tasks) - NOT Clients |
| CRM | ✅ Full (leads, deals) |
| Applications | ✅ Full |

**CANNOT Access:**
| Module | ❌ Blocked |
|--------|-----------|
| Super Admin Dashboard | ❌ NO ACCESS |
| Admin Dashboard | ❌ NO ACCESS |
| Administration Module | ❌ NO ACCESS (Admin only) |
| Finance (Sensitive) | ⚠️ Limited (check requirements) |

---

### Employee

**Scope:** Own data + assigned items only

**Can Access:**
| Module | Access Level |
|--------|--------------|
| Employee Dashboard | ✅ Full (only this dashboard) |
| HRM Module (Limited) | ⚠️ Own data (attendance, leave, timesheet, holidays) |
| Project Management | ⚠️ Assigned projects/tasks only - NO Clients |
| CRM | ⚠️ Read only - NO Contacts |
| Applications | ✅ Full |

**CANNOT Access:**
| Module | ❌ Blocked |
|--------|-----------|
| Super Admin Dashboard | ❌ NO ACCESS |
| Admin Dashboard | ❌ NO ACCESS |
| HR Dashboard | ❌ NO ACCESS |
| Leads Dashboard | ❌ NO ACCESS |
| Deals Dashboard | ❌ NO ACCESS |
| Clients (PM) | ❌ NO ACCESS |
| Contacts (CRM) | ❌ NO ACCESS |
| Recruitment (Jobs, Candidates) | ❌ NO ACCESS |
| Finance | ❌ NO ACCESS |
| Administration | ❌ NO ACCESS |

---

## Multi-Tenant Data Isolation

### Company ID as Isolation Key

Every business entity is tied to a `companyId`:

```
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE STRUCTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  companies (platform-level, SuperAdmin access)              │
│    ├─ _id: "company_123"                                    │
│    ├─ name: "Company A"                                     │
│    ├─ domain: "companya.manageRTC.com"                      │
│    ├─ subscriptionId: "sub_456"                             │
│    └─ status: "active"                                      │
│                                                             │
│  employees (isolated by companyId)                          │
│    ├─ _id: "emp_789"                                        │
│    ├─ companyId: "company_123"  ← ISOLATION KEY            │
│    ├─ name: "John Doe"                                      │
│    └─ role: "employee"                                      │
│                                                             │
│  projects (isolated by companyId)                           │
│    ├─ _id: "proj_101"                                       │
│    ├─ companyId: "company_123"  ← ISOLATION KEY            │
│    └─ name: "Website Redesign"                              │
│                                                             │
│  leads (isolated by companyId)                              │
│    ├─ _id: "lead_202"                                       │
│    ├─ companyId: "company_123"  ← ISOLATION KEY            │
│    └─ name: "Acme Corp Lead"                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Isolation Enforcement

**Backend Middleware:** [backend/middleware/auth.js](backend/middleware/auth.js)

```javascript
// requireCompany middleware ensures queries are scoped to user's company
function requireCompany(req, res, next) {
  const companyId = req.user?.publicMetadata?.companyId;
  if (!companyId) {
    return res.status(403).json({ error: "Company ID required" });
  }
  req.companyId = companyId; // Available to controllers for scoping
  next();
}
```

**Every query MUST include:**
```javascript
// ✅ CORRECT - Isolated
const employees = await Employee.find({ companyId: req.companyId });

// ❌ WRONG - Cross-company data leak
const employees = await Employee.find({}); // Returns ALL employees!
```

---

## SuperAdmin Analytics Only

### What SuperAdmin Sees

SuperAdmin dashboard shows **aggregate analytics**, NOT individual business data:

| Analytics | Description | Source |
|-----------|-------------|--------|
| Total Companies | Count of active companies | `companies` collection |
| Total Users | Sum of all users across companies | Aggregated count |
| Active Subscriptions | Count of active subscriptions | `subscriptions` collection |
| Revenue | MRR/ARR from subscriptions | `transactions` collection |
| Company Growth | New companies per month | `companies` createdAt |
| User Growth | New users per month | Aggregated |
| Package Distribution | Users per package tier | Aggregated |

### What SuperAdmin NEVER Sees

| Data Type | ❌ Blocked |
|-----------|-----------|
| Individual employee names/details | ❌ |
| Company project details | ❌ |
| Company CRM data (leads, deals) | ❌ |
| Company financial data | ❌ |
| Company attendance/leave data | ❌ |
| Chat messages, emails, files | ❌ |

---

## Company Onboarding Flow

```
┌──────────────┐
│   SuperAdmin │
│  (Platform)  │
└──────┬───────┘
       │ 1. Create Company
       ▼
┌─────────────────────────────────────────────────────────────┐
│              CREATE COMPANY FORM                            │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Company Name   │  │ Domain         │  │ Package       │ │
│  │ "Acme Corp"    │  │ "acme.manageRTC"│  │ "Premium"    │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────┘
       │ 2. Generate credentials
       ▼
┌─────────────────────────────────────────────────────────────┐
│              ADMIN ACCOUNT CREATED                          │
│  Email: admin@acme.manageRTC.com                            │
│  Password: {temp_password}                                  │
│  Role: admin                                                │
│  CompanyId: company_123                                     │
└─────────────────────────────────────────────────────────────┘
       │ 3. Email credentials
       ▼
┌──────────────┐
│   New Admin  │ ──► 4. Login and onboard HR/Employees
│  (Acme Corp) │
└──────────────┘
```

---

## File Locations Reference

### SuperAdmin Module
| Component | File Path |
|-----------|-----------|
| Super Admin Dashboard | [react/src/feature-module/super-admin/dashboard/index.tsx](react/src/feature-module/super-admin/dashboard/index.tsx) |
| Companies Service | [backend/services/superadmin/companies.services.js](backend/services/superadmin/companies.services.js) |
| Dashboard Service | [backend/services/superadmin/dashboard.services.js](backend/services/superadmin/dashboard.services.js) |

### Multi-Tenant Middleware
| Component | File Path |
|-----------|-----------|
| Auth Middleware | [backend/middleware/auth.js](backend/middleware/auth.js) |
| requireCompany | [backend/middleware/auth.js](backend/middleware/auth.js) (line ~50) |
| Clerk Auth | [backend/middleware/auth.js](backend/middleware/auth.js) |

### Company Model
| Component | File Path |
|-----------|-----------|
| Company Schema | [backend/models/company/company.schema.js](backend/models/company/company.schema.js) |
| Package Schema | [backend/models/package/package.schema.js](backend/models/package/package.schema.js) |
