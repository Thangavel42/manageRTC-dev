# Company Enhancement & Admin Profile - Implementation Plan (v3)

**Date:** 2026-03-02 | **Revised:** 2026-03-02 (v3)
**Project:** manageRTC-dev
**Author:** Claude Code Analysis

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Suggested Company Fields](#2-suggested-company-fields)
3. [Field Permission Matrix — Three-Tier Access](#3-field-permission-matrix--three-tier-access)
4. [Existing Change Request System (Reference)](#4-existing-change-request-system-reference)
5. [Admin Change Request Flow (New)](#5-admin-change-request-flow-new)
6. [Company Details Page (Superadmin Only)](#6-company-details-page-superadmin-only)
7. [Admin Profile Page](#7-admin-profile-page)
8. [Implementation Roadmap](#8-implementation-roadmap)
9. [File Changes Summary](#9-file-changes-summary)
10. [Key Decisions Before Implementation](#10-key-decisions-before-implementation)

---

## 1. Current State Analysis

### 1.1 Current Company Schema (Superadmin DB)

**File:** `backend/models/superadmin/package.schema.js` (companySchema)

| Field | Type | Status |
|-------|------|--------|
| name | String | Required |
| email | String | Required |
| domain | String | Required |
| phone | String | Required |
| website | String | Required |
| address | String | Required (single string) |
| status | String | Default: "Active" |
| planId | ObjectId | Ref to Plan |
| plan_id | String | Legacy |
| plan_name | String | Denormalized |
| plan_type | String | Denormalized |
| currency | String | - |
| logo | String | - |

**Problem:** Minimal schema. Address is a flat string, no industry/legal/social fields, no structured contact info.

### 1.2 Current Company Creation (from Superadmin)

**Frontend:** `react/src/feature-module/super-admin/companies/index.tsx`
**Backend:** `backend/services/superadmin/companies.services.js` → `addCompany()`

Fields collected: `name, email, domain, phone, website, address, plan_id, plan_name, plan_type, logo`

### 1.3 Current Admin Profile Page

**File:** `react/src/feature-module/pages/admin-profile/index.tsx`
**Backend:** `backend/controllers/rest/userProfile.controller.js` → `getAdminProfile()` / `updateAdminProfile()`

Admin can currently edit only: `phone`, `website`, `description`, `logo`

### 1.4 Existing Change Request System (Employee → HR/Admin)

The project already has a **field-level change request system** used by employees:

**Schema:** `backend/models/changeRequest/changeRequest.schema.js`
**Hook:** `react/src/hooks/useChangeRequestREST.ts`
**Components:** `ChangeRequestModal.tsx`, `MyChangeRequestsModal.tsx`, `ChangeRequestsModal.tsx`

**Currently supports:** Bank details, name, phone, address, emergency contact
**Flow:** Employee submits request → HR/Admin reviews → Per-field approve/reject → Auto-applied on approval

This same pattern will be extended for **Admin → Superadmin** change requests.

---

## 2. Suggested Company Fields

### 2.1 Fields to Add to Company Schema (Superadmin DB)

Fields marked with `*` are **recommended as required**.

#### A. Basic Information (Existing + Enhanced)

| Field | Type | Notes |
|-------|------|-------|
| name* | String | Already exists |
| email* | String | Already exists |
| domain* | String | Already exists |
| phone* | String | Already exists |
| phone2 | String | Secondary phone |
| fax | String | Fax number |
| website | String | Already exists |
| logo | String | Already exists |
| description | String | Company description/about |

#### B. Registration & Legal Details (NEW)

| Field | Type | Notes |
|-------|------|-------|
| registrationNumber | String | Company registration / incorporation number |
| taxId | String | Tax ID (GST/VAT/EIN depending on country) |
| taxIdType | String | Enum: GST, VAT, EIN, TIN, PAN, Other |
| legalName | String | Official registered legal name (may differ from brand name) |
| legalEntityType | String | Enum: Sole Proprietorship, Partnership, LLP, Private Limited, Public Limited, Corporation, LLC, Non-Profit, Other |
| incorporationCountry | String | Country of incorporation |

#### C. Industry & Classification (NEW)

| Field | Type | Notes |
|-------|------|-------|
| industry* | String | Primary industry (IT, Healthcare, Manufacturing, etc.) |
| subIndustry | String | Sub-industry/specialization |
| companySize | String | Enum: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+ |
| companyType | String | Enum: Startup, SME, Enterprise, Government, NGO |

#### D. Structured Address (REPLACE single string)

| Field | Type | Notes |
|-------|------|-------|
| address.street | String | Street address line 1 |
| address.street2 | String | Address line 2 (suite, floor, etc.) |
| address.city* | String | City |
| address.state* | String | State/Province |
| address.country* | String | Country |
| address.postalCode* | String | ZIP/Postal code |
| address.fullAddress | String | Auto-computed full address |

#### E. Contact Person / Founder (NEW)

| Field | Type | Notes |
|-------|------|-------|
| contactPerson.name | String | Primary contact person name |
| contactPerson.email | String | Contact person email |
| contactPerson.phone | String | Contact person direct phone |
| contactPerson.designation | String | Title/designation of contact person |
| founderName | String | Founder/CEO name |

#### F. Social Links (NEW)

| Field | Type | Notes |
|-------|------|-------|
| social.linkedin | String | LinkedIn company page URL |
| social.twitter | String | Twitter/X handle |
| social.facebook | String | Facebook page URL |
| social.instagram | String | Instagram handle |

#### G. Subscription & Billing (Enhanced)

| Field | Type | Notes |
|-------|------|-------|
| planId | ObjectId | Already exists (ref to Plan) |
| subscriptionStartDate | Date | When subscription started |
| subscriptionEndDate | Date | When subscription expires |
| billingEmail | String | Separate billing email |
| billingAddress | Object | Same structure as address |
| userCount | Number | Current active users |
| userCountLastUpdated | Date | Last count update time |

#### H. System/Audit Fields

| Field | Type | Notes |
|-------|------|-------|
| status | String | Already exists |
| isActive | Boolean | Soft active/inactive |
| clerkUserId | String | Admin's Clerk user ID |
| createdBy | ObjectId | Already exists |
| updatedBy | ObjectId | Already exists |
| createdAt | Date | Timestamp |
| updatedAt | Date | Timestamp |

### 2.2 Suggested Enum Values

```
Industry Options:
- Information Technology        - Healthcare & Pharmaceuticals
- Finance & Banking             - Manufacturing
- Retail & E-Commerce           - Education
- Real Estate & Construction    - Telecommunications
- Media & Entertainment         - Transportation & Logistics
- Energy & Utilities            - Agriculture
- Hospitality & Tourism         - Legal Services
- Consulting                    - Non-Profit
- Government                    - Other

Company Size:                   Legal Entity Types:
- 1-10 (Micro)                  - Sole Proprietorship
- 11-50 (Small)                 - Partnership
- 51-200 (Medium)               - LLP (Limited Liability Partnership)
- 201-500 (Large)               - Private Limited
- 501-1000 (Enterprise)         - Public Limited
- 1001-5000 (Large Enterprise)  - Corporation
- 5000+ (Corporation)           - LLC (Limited Liability Company)
                                - Non-Profit
Company Type:                   - Government Entity
- Startup                       - Other
- SME
- Enterprise
- Government
- NGO
```

---

## 3. Field Permission Matrix — Three-Tier Access

Every company field falls into one of **three categories** for the admin:

### Tier 1: Direct Edit (Admin can change immediately)

These are operational fields the admin manages day-to-day.

| Field | Category | Reason |
|-------|----------|--------|
| phone | Basic Info | Admin manages their own company phone |
| phone2 | Basic Info | Secondary contact number |
| fax | Basic Info | Operational contact |
| website | Basic Info | Admin controls company website |
| logo | Basic Info | Admin manages branding |
| description | Basic Info | Admin writes company description |
| social.linkedin | Social Links | Admin manages social presence |
| social.twitter | Social Links | Admin manages social presence |
| social.facebook | Social Links | Admin manages social presence |
| social.instagram | Social Links | Admin manages social presence |

### Tier 2: Read-Only (Admin can view, cannot edit or request)

These are set by superadmin during company creation/management. Admin has no control over these — they are reference information.

| Field | Category | Reason |
|-------|----------|--------|
| name | Basic Info | Company name set by superadmin during registration |
| email | Basic Info | Primary company email tied to account creation |
| domain | Basic Info | Subdomain is system-configured, DNS-managed |
| status | System | Company status controlled by superadmin |
| plan_name / plan_type | Subscription | Subscription managed by superadmin |
| subscriptionStartDate | Subscription | Superadmin-managed |
| subscriptionEndDate | Subscription | Superadmin-managed |
| userCount / userLimit | Subscription | System-tracked |
| enabledModules | Subscription | Determined by plan, managed by superadmin |
| clerkUserId | System | Internal system reference |
| createdAt / updatedAt | Audit | System timestamps |
| createdBy / updatedBy | Audit | System-managed |

### Tier 3: Request to Edit (Admin can view + request change → Superadmin approves)

These are **sensitive fields** that the admin can see but should not change without superadmin review. Changes require a formal request, similar to how employees request bank detail changes.

| Field | Category | Why Request Required |
|-------|----------|---------------------|
| **billingEmail** | Billing | Financial correspondence — wrong email means missed invoices |
| **billingAddress** | Billing | Legal/tax implications — billing address affects invoicing |
| **address** (full object) | Company Address | Registered address may have legal/compliance implications |
| **registrationNumber** | Legal | Government-issued, must be verified |
| **taxId** | Legal | Tax compliance — incorrect value has legal consequences |
| **taxIdType** | Legal | Must match actual tax registration type |
| **legalName** | Legal | Official registered name — legal document implications |
| **legalEntityType** | Legal | Determines compliance requirements |
| **incorporationCountry** | Legal | Affects tax jurisdiction and compliance |
| **industry** | Classification | May affect plan/module eligibility |
| **subIndustry** | Classification | Segmentation data |
| **companySize** | Classification | May affect plan pricing or limits |
| **companyType** | Classification | May affect plan eligibility |
| **contactPerson.name** | Contact | Superadmin's primary contact reference |
| **contactPerson.email** | Contact | Superadmin's communication channel |
| **contactPerson.phone** | Contact | Superadmin's communication channel |
| **contactPerson.designation** | Contact | Context for superadmin |
| **founderName** | Contact | Company leadership reference |

### 3.1 Summary Table

| Permission Level | Field Count | Admin Action | Approval By |
|-----------------|-------------|--------------|-------------|
| **Tier 1: Direct Edit** | 10 fields | Edit & save immediately | None needed |
| **Tier 2: Read-Only** | 12+ fields | View only | N/A |
| **Tier 3: Request to Edit** | 19 fields | View + submit change request | Superadmin |

### 3.2 Visual Reference — How Each Tier Appears in Admin Profile

```
┌─── Direct Edit (Tier 1) ──────────────────────────────┐
│  Phone: [+91 9876543210]  [✏️ Edit]                    │
│  Website: [https://company.com]  [✏️ Edit]             │
│  Description: [We are a tech company...]  [✏️ Edit]    │
│  Social: [linkedin] [twitter] [facebook]  [✏️ Edit]    │
└────────────────────────────────────────────────────────┘

┌─── Read-Only (Tier 2) ────────────────────────────────┐
│  Company Name: Acme Corp                    🔒         │
│  Domain: acme.managertc.com                 🔒         │
│  Email: admin@acme.com                      🔒         │
│  Status: Active                             🔒         │
│  Plan: Professional (Monthly)               🔒         │
└────────────────────────────────────────────────────────┘

┌─── Request to Edit (Tier 3) ──────────────────────────┐
│  Billing Email: billing@acme.com   [📝 Request Change] │
│  Company Address: 123 Main St...   [📝 Request Change] │
│  Tax ID: GST1234567890             [📝 Request Change] │
│  Legal Name: Acme Corp Pvt Ltd     [📝 Request Change] │
│  Industry: Information Technology  [📝 Request Change] │
│  Contact Person: John Doe          [📝 Request Change] │
│                                                        │
│  ⓘ Changes to these fields require superadmin approval │
└────────────────────────────────────────────────────────┘
```

---

## 4. Existing Change Request System (Reference)

The project already has a robust change request system for employees. We will reuse and extend this pattern.

### 4.1 Current Architecture

```
Employee                    HR / Admin                   Database
   │                            │                           │
   ├─── Submit Request ────────>│                           │
   │    POST /api/change-requests                           │
   │    { fields: [             │                           │
   │      { field, oldValue,    │                           │
   │        newValue, label }   │──── Store Request ────────>│
   │    ], reason }             │    changeRequests collection│
   │                            │                           │
   │                            │<── Notification ──────────│
   │                            │    (pending request)      │
   │                            │                           │
   │                            ├─── Review Request ────────>│
   │                            │    PATCH .../approve       │
   │                            │    or .../reject           │
   │                            │                           │
   │                            │    On Approve:             │
   │                            │    Auto-apply newValue ───>│
   │                            │    to employee document    │
   │<── Status Update ─────────│                           │
   │    (approved/rejected)     │                           │
```

### 4.2 Key Schema Fields (changeRequest.schema.js)

```javascript
{
  employeeId / companyId,          // Who submitted
  requestType: 'bankDetails' | 'name' | 'phone' | 'address' | ...,
  fields: [{
    field: 'bankDetails.accountNumber',  // dot-notation path
    label: 'Account Number',             // human-readable
    oldValue: Mixed,                     // captured at request time
    newValue: Mixed,                     // requested value
    status: 'pending' | 'approved' | 'rejected',
    reviewNote: String,                  // reviewer's feedback
    reviewedAt: Date
  }],
  reason: String,                  // min 5 chars
  status: 'pending' | 'partially_approved' | 'completed' | 'cancelled',
  reviewedBy, reviewerName, reviewedAt
}
```

### 4.3 Key Frontend Components

| Component | Purpose |
|-----------|---------|
| `ChangeRequestModal.tsx` | Form to submit a change request |
| `MyChangeRequestsModal.tsx` | Employee views their request history |
| `ChangeRequestsModal.tsx` | HR reviews/approves/rejects requests |
| `PendingChangeRequests.tsx` | Shows pending requests for specific employee |
| `useChangeRequestREST.ts` | Hook for all CRUD operations |

---

## 5. Admin Change Request Flow (New)

### 5.1 How It Differs from Employee Change Requests

| Aspect | Employee → HR/Admin | Admin → Superadmin (NEW) |
|--------|--------------------|-----------------------|
| **Requester** | Employee | Admin |
| **Approver** | HR / Admin | Superadmin |
| **Target Document** | Employee (tenant DB) | Company (superadmin DB) |
| **Collection** | `changeRequests` (tenant) | `companyChangeRequests` (superadmin DB) |
| **Fields** | bankDetails, name, phone, address, emergencyContact | billing, legal, industry, contact, address |
| **On Approval** | Auto-update employee document | Auto-update company document |

### 5.2 New Schema: Company Change Request

**Collection:** `companyChangeRequests` (in superadmin database)

```javascript
{
  companyId: ObjectId,             // Which company
  companyName: String,             // Denormalized for display
  requestedBy: String,             // Admin's clerkUserId
  requestedByName: String,         // Admin's name

  requestType: String,             // 'billing' | 'legal' | 'classification' | 'address' |
                                   // 'contact' | 'multiple'

  fields: [{
    field: String,                 // e.g., 'billingEmail', 'taxId', 'address.city'
    label: String,                 // e.g., 'Billing Email', 'Tax ID'
    oldValue: Mixed,               // Current value at request time
    newValue: Mixed,               // Requested new value
    status: 'pending' | 'approved' | 'rejected',
    reviewNote: String,
    reviewedAt: Date
  }],

  reason: String,                  // Why admin wants the change (min 5 chars)
  status: 'pending' | 'partially_approved' | 'completed' | 'cancelled',

  reviewedBy: ObjectId,            // Superadmin who reviewed
  reviewerName: String,
  reviewedAt: Date,

  cancelledBy: String,
  cancelledAt: Date,
  cancellationReason: String,

  isDeleted: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 5.3 Allowed Fields for Admin Change Request

```javascript
const ADMIN_CHANGE_REQUEST_FIELDS = {
  // Billing
  'billingEmail':             { label: 'Billing Email',         type: 'billing',         validate: 'email' },
  'billingAddress':           { label: 'Billing Address',       type: 'billing',         validate: 'address' },
  'billingAddress.street':    { label: 'Billing Street',        type: 'billing' },
  'billingAddress.city':      { label: 'Billing City',          type: 'billing' },
  'billingAddress.state':     { label: 'Billing State',         type: 'billing' },
  'billingAddress.country':   { label: 'Billing Country',       type: 'billing' },
  'billingAddress.postalCode':{ label: 'Billing Postal Code',   type: 'billing' },

  // Company Address
  'address':                  { label: 'Company Address',       type: 'address',         validate: 'address' },
  'address.street':           { label: 'Street',                type: 'address' },
  'address.street2':          { label: 'Street Line 2',         type: 'address' },
  'address.city':             { label: 'City',                  type: 'address' },
  'address.state':            { label: 'State',                 type: 'address' },
  'address.country':          { label: 'Country',               type: 'address' },
  'address.postalCode':       { label: 'Postal Code',           type: 'address' },

  // Legal
  'registrationNumber':       { label: 'Registration Number',   type: 'legal' },
  'taxId':                    { label: 'Tax ID',                type: 'legal' },
  'taxIdType':                { label: 'Tax ID Type',           type: 'legal' },
  'legalName':                { label: 'Legal Name',            type: 'legal' },
  'legalEntityType':          { label: 'Legal Entity Type',     type: 'legal' },
  'incorporationCountry':     { label: 'Incorporation Country', type: 'legal' },

  // Classification
  'industry':                 { label: 'Industry',              type: 'classification' },
  'subIndustry':              { label: 'Sub-Industry',          type: 'classification' },
  'companySize':              { label: 'Company Size',          type: 'classification' },
  'companyType':              { label: 'Company Type',          type: 'classification' },

  // Contact Person
  'contactPerson.name':       { label: 'Contact Person Name',   type: 'contact' },
  'contactPerson.email':      { label: 'Contact Person Email',  type: 'contact' },
  'contactPerson.phone':      { label: 'Contact Person Phone',  type: 'contact' },
  'contactPerson.designation':{ label: 'Contact Person Title',  type: 'contact' },
  'founderName':              { label: 'Founder / CEO Name',    type: 'contact' },
};
```

### 5.4 Admin Flow Diagram

```
Admin (Profile Page)              Superadmin                    Database
       │                              │                           │
       │  Sees Tier 3 field           │                           │
       │  Tax ID: GST1234...          │                           │
       │  [📝 Request Change]         │                           │
       │                              │                           │
       ├── Click "Request Change" ──> │                           │
       │   Modal opens:               │                           │
       │   Current: GST1234...        │                           │
       │   New: [GST5678...]          │                           │
       │   Reason: [Updated GST...]   │                           │
       │                              │                           │
       ├── Submit ────────────────────>│                           │
       │   POST /api/company-change-requests                      │
       │   { fields: [{               │                           │
       │     field: 'taxId',          │                           │
       │     oldValue: 'GST1234',     │──── Store ────────────────>│
       │     newValue: 'GST5678'      │    companyChangeRequests   │
       │   }], reason: '...' }        │                           │
       │                              │                           │
       │                              │<── Sees pending request ──│
       │                              │    in company details     │
       │                              │                           │
       │                              ├── Approve / Reject ──────>│
       │                              │   PATCH .../approve       │
       │                              │                           │
       │                              │   On Approve:             │
       │                              │   Auto-update company ───>│
       │                              │   taxId = 'GST5678'       │
       │                              │                           │
       │<── Status: Approved ─────────│                           │
       │   Profile shows new value    │                           │
```

### 5.5 API Endpoints (New)

| Method | Endpoint | Access | Purpose |
|--------|----------|--------|---------|
| POST | `/api/company-change-requests` | Admin | Submit change request |
| GET | `/api/company-change-requests/my` | Admin | View own requests + status |
| GET | `/api/company-change-requests` | Superadmin | List all pending requests (with filters) |
| GET | `/api/company-change-requests/stats` | Superadmin | Count pending/completed requests |
| PATCH | `/api/company-change-requests/:id/field/:idx/approve` | Superadmin | Approve specific field |
| PATCH | `/api/company-change-requests/:id/field/:idx/reject` | Superadmin | Reject specific field (with reason) |
| PATCH | `/api/company-change-requests/:id/bulk-approve` | Superadmin | Approve all pending fields |
| PATCH | `/api/company-change-requests/:id/bulk-reject` | Superadmin | Reject all pending fields |
| PATCH | `/api/company-change-requests/:id/cancel` | Admin | Cancel own pending request |

---

## 6. Company Details Page (Superadmin Only)

### 6.1 Overview

New page accessible **only from superadmin panel**. Shows ALL company fields. Includes a **Pending Change Requests** section (similar to PendingChangeRequests component in employee details).

### 6.2 Page Design

**Route:** `/super-admin/companies/:id`
**Component:** `react/src/feature-module/super-admin/companies/company-details.tsx`

```
┌─────────────────────────────────────────────────┐
│  Breadcrumb: Super Admin > Companies > [Name]   │
├─────────────────────────────────────────────────┤
│  ┌──────────┐                                   │
│  │  LOGO    │  Company Name          [Active]   │
│  │          │  domain.managertc.com             │
│  │          │  Industry: IT | Size: 51-200      │
│  └──────────┘  [Edit] [Manage Subscription]     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ⚠️ PENDING CHANGE REQUESTS (3)                 │
│  ┌─────────────────────────────────────────┐    │
│  │ Field        │ Old      │ New      │ ⚡ │    │
│  │ Tax ID       │ GST1234  │ GST5678  │ ✓✗│    │
│  │ Billing Email│ old@..   │ new@..   │ ✓✗│    │
│  │ Industry     │ IT       │ Finance  │ ✓✗│    │
│  │              [Bulk Approve] [Bulk Reject]│    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ── Basic Information ──────────────────────    │
│  Email          | Phone         | Phone 2       │
│  Website        | Fax           | Domain        │
│  Description                                    │
│                                                 │
│  ── Registration & Legal ───────────────────    │
│  Legal Name     | Legal Entity Type             │
│  Registration # | Tax ID (type + value)         │
│  Incorporation Country                          │
│                                                 │
│  ── Industry & Classification ──────────────    │
│  Industry       | Sub-Industry                  │
│  Company Size   | Company Type                  │
│                                                 │
│  ── Address ────────────────────────────────    │
│  Street         | Street 2                      │
│  City           | State                         │
│  Country        | Postal Code                   │
│                                                 │
│  ── Contact Person ─────────────────────────    │
│  Name           | Email                         │
│  Phone          | Designation                   │
│  Founder/CEO                                    │
│                                                 │
│  ── Social Links ───────────────────────────    │
│  LinkedIn       | Twitter                       │
│  Facebook       | Instagram                     │
│                                                 │
│  ── Subscription Details ───────────────────    │
│  Plan Name      | Plan Type      | Price        │
│  Start Date     | End Date       | Status       │
│  Users: 45/200  [━━━━━━░░░░] 22.5%             │
│  Billing Email  | Billing Address               │
│                                                 │
│  ── Enabled Modules ────────────────────────    │
│  ☑ HRM  ☑ CRM  ☑ Finance  ☐ Projects           │
│                                                 │
│  ── Audit Information ──────────────────────    │
│  Created On     | Created By                    │
│  Last Updated   | Updated By                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 7. Admin Profile Page

### 7.1 Overview

Rewrite the existing admin profile page with **3-tab layout**. Each section clearly indicates whether a field is editable, read-only, or request-to-edit.

### 7.2 Page Design

**Route:** `/admin/profile` (existing, enhanced)
**Component:** `react/src/feature-module/pages/admin-profile/index.tsx` (rewrite)

```
┌──────────────────────────────────────────────────────────┐
│  Breadcrumb: Dashboard > My Profile                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐                                            │
│  │ PROFILE  │  Admin Name              [Admin]           │
│  │  PHOTO   │  admin@company.com                         │
│  │          │  Acme Corp Pvt Ltd                         │
│  └──────────┘  [Edit Profile]                            │
│                                                          │
│  ══════════════════════════════════════════════════       │
│  [My Details] [Company Info] [Subscription]              │
│  ══════════════════════════════════════════════════       │
│                                                          │
│  ┌─── TAB 1: My Details ─────────────────────────────┐   │
│  │                                                   │   │
│  │  ── Personal Information ───────────────────────  │   │
│  │  Full Name      | Email                           │   │
│  │  Phone          | Address                         │   │
│  │                                                   │   │
│  │  ── Account Information ────────────────────────  │   │
│  │  Role           | Account Status                  │   │
│  │  Member Since   | Last Login                      │   │
│  │                                                   │   │
│  │  ── Security ───────────────────────────────────  │   │
│  │  [Change Password]                                │   │
│  │                                                   │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─── TAB 2: Company Info ───────────────────────────┐   │
│  │                                                   │   │
│  │  ── Basic Details ─────── ✏️ Direct Edit ───────  │   │
│  │  Company Name    🔒  | Domain          🔒         │   │
│  │  Email           🔒  | Status          🔒         │   │
│  │  Phone        [Edit] | Phone 2      [Edit]        │   │
│  │  Fax          [Edit] | Website      [Edit]        │   │
│  │  Description  [Edit]                              │   │
│  │  Logo         [Edit]                              │   │
│  │                                                   │   │
│  │  ── Social Links ─────── ✏️ Direct Edit ───────── │   │
│  │  LinkedIn     [Edit] | Twitter      [Edit]        │   │
│  │  Facebook     [Edit] | Instagram    [Edit]        │   │
│  │                                                   │   │
│  │  ── Registration & Legal ── 📝 Request to Edit ── │   │
│  │  Legal Name: Acme Corp Pvt Ltd  [📝 Request]     │   │
│  │  Entity Type: Private Limited   [📝 Request]     │   │
│  │  Reg Number: CIN12345           [📝 Request]     │   │
│  │  Tax ID: GST1234567890          [📝 Request]     │   │
│  │  Tax Type: GST                  [📝 Request]     │   │
│  │  Inc. Country: India            [📝 Request]     │   │
│  │                                                   │   │
│  │  ── Industry & Classification ── 📝 Request ──── │   │
│  │  Industry: Information Technology  [📝 Request]   │   │
│  │  Sub-Industry: SaaS               [📝 Request]   │   │
│  │  Company Size: 51-200             [📝 Request]   │   │
│  │  Company Type: Startup            [📝 Request]   │   │
│  │                                                   │   │
│  │  ── Contact Person ───── 📝 Request to Edit ──── │   │
│  │  Name: John Doe                   [📝 Request]   │   │
│  │  Email: john@acme.com             [📝 Request]   │   │
│  │  Phone: +91 98765...              [📝 Request]   │   │
│  │  Designation: CTO                 [📝 Request]   │   │
│  │  Founder: Jane Doe                [📝 Request]   │   │
│  │                                                   │   │
│  │  ── Company Address ───── 📝 Request to Edit ─── │   │
│  │  123 Main St, Suite 100           [📝 Request]   │   │
│  │  Bangalore, Karnataka, India                      │   │
│  │  560001                                           │   │
│  │                                                   │   │
│  │  ── Billing ──────────── 📝 Request to Edit ──── │   │
│  │  Billing Email: billing@acme.com  [📝 Request]   │   │
│  │  Billing Address: Same as above   [📝 Request]   │   │
│  │                                                   │   │
│  │  ── Employees Overview ─────────────── 🔒 ────── │   │
│  │  Total: 45 | Active: 42 | On Leave: 3            │   │
│  │  Departments: 5 | Designations: 12               │   │
│  │                                                   │   │
│  │  ── My Change Requests ──────────────────────     │   │
│  │  [View My Requests (2 pending)]                   │   │
│  │                                                   │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─── TAB 3: Subscription (Read-Only) ───────────────┐   │
│  │                                                   │   │
│  │  ── Current Plan ─────────────────────────────    │   │
│  │  ┌─────────────────────────────────────────┐      │   │
│  │  │  Plan: Professional                     │      │   │
│  │  │  Type: Monthly                          │      │   │
│  │  │  Status: Active                         │      │   │
│  │  │  Renewal: March 15, 2026                │      │   │
│  │  │  Users: 45/200 [━━━━━░░░░░] 22.5%      │      │   │
│  │  └─────────────────────────────────────────┘      │   │
│  │                                                   │   │
│  │  ── Enabled Modules ──────────────────────────    │   │
│  │  ☑ HRM  ☑ CRM  ☑ Finance  ☑ Projects            │   │
│  │  ☑ Support  ☑ Attendance  ☐ Assets               │   │
│  │                                                   │   │
│  │  ── Plan Limits ──────────────────────────────    │   │
│  │  Max Users: 200                                   │   │
│  │  Max Customers: 500                               │   │
│  │  Max Invoices: 1000                               │   │
│  │                                                   │   │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 7.3 Admin Edit Capabilities Summary

| Section | Tier | Admin Action |
|---------|------|-------------|
| Basic Details (phone, fax, website, description, logo) | Tier 1: Direct Edit | Edit & save |
| Social Links | Tier 1: Direct Edit | Edit & save |
| Company Name, Email, Domain, Status | Tier 2: Read-Only | View only (🔒) |
| Registration & Legal (all fields) | Tier 3: Request | View + Request Change (📝) |
| Industry & Classification (all fields) | Tier 3: Request | View + Request Change (📝) |
| Contact Person / Founder (all fields) | Tier 3: Request | View + Request Change (📝) |
| Company Address | Tier 3: Request | View + Request Change (📝) |
| Billing Email & Address | Tier 3: Request | View + Request Change (📝) |
| Subscription / Plan / Modules | Tier 2: Read-Only | View only (🔒) |
| Employee Stats | Tier 2: Read-Only | View only (🔒) |

### 7.4 Backend Changes

1. **Enhance `getAdminProfile()`** — Return ALL company fields (admin sees everything now, just with different edit permissions)
2. **Enhance `updateAdminProfile()`** — Accept Tier 1 fields only for direct update; reject Tier 2/3 fields
3. **Create company change request endpoints** — New controller, routes, schema
4. **Add employee stats aggregation** — Count employees by status, departments, designations
5. **Add pending request indicator** — Return count of pending requests for admin's company

### 7.5 Frontend Changes

1. **Rewrite `admin-profile/index.tsx`** with 3-tab layout
2. **Create tab sub-components** — AdminPersonalInfo, AdminCompanyInfo, AdminSubscriptionInfo
3. **Create `CompanyChangeRequestModal.tsx`** — Reuse pattern from `ChangeRequestModal.tsx`
4. **Create `MyCompanyChangeRequestsModal.tsx`** — Admin views their request history
5. **Create `PendingCompanyChangeRequests.tsx`** — Superadmin reviews in company details page
6. **Create `useCompanyChangeRequestREST.ts`** — Hook for change request CRUD
7. **Create `useAdminProfileREST.ts`** — Hook for admin profile data

---

## 8. Implementation Roadmap

### Phase 1: Schema & Backend Foundation (Priority: HIGH)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1.1 | Update Company Schema — add all new fields | `backend/models/superadmin/package.schema.js` | Medium |
| 1.2 | Create Company Change Request schema | `backend/models/superadmin/companyChangeRequest.schema.js` (new) | Medium |
| 1.3 | Create migration script for existing companies (address string → object) | `backend/migrations/` (new) | Medium |
| 1.4 | Update superadmin company service — addCompany() with new fields | `backend/services/superadmin/companies.services.js` | Medium |
| 1.5 | Update superadmin company service — viewCompany() with full data | Same file | Low |
| 1.6 | Update superadmin company service — updateCompany() with all fields | Same file | Medium |

### Phase 2: Change Request Backend (Priority: HIGH)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 2.1 | Create company change request controller | `backend/controllers/rest/companyChangeRequest.controller.js` (new) | High |
| 2.2 | Create company change request routes | `backend/routes/api/companyChangeRequest.js` (new) | Low |
| 2.3 | Implement auto-apply on approval (update company document) | Same controller | Medium |
| 2.4 | Add duplicate request prevention (check pending requests for same field) | Same controller | Low |
| 2.5 | Enhance `getAdminProfile()` — return all fields + pending request count | `backend/controllers/rest/userProfile.controller.js` | Medium |
| 2.6 | Enhance `updateAdminProfile()` — enforce Tier 1 only | Same file | Low |

### Phase 3: Company Creation Enhancement (Priority: HIGH)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 3.1 | Update AddCompany form with new fields (tabbed: Basic, Legal, Address, Social, Contact) | Superadmin companies component/modal | High |
| 3.2 | Add field validations (tax ID, URL, phone) | Same component | Medium |
| 3.3 | Update `useSuperadminCompaniesREST` hook if needed | `react/src/hooks/useSuperadminCompaniesREST.ts` | Low |

### Phase 4: Company Details Page — Superadmin (Priority: MEDIUM)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 4.1 | Create CompanyDetails page (all fields + pending requests panel) | `super-admin/companies/company-details.tsx` (new) | High |
| 4.2 | Create PendingCompanyChangeRequests component | `core/modals/PendingCompanyChangeRequests.tsx` (new) | Medium |
| 4.3 | Create EditCompanyDetailModal (superadmin full edit) | `core/modals/EditCompanyDetailModal.tsx` (new) | High |
| 4.4 | Add route `/super-admin/companies/:id` | `all_routes.tsx` + `router.jsx` | Low |
| 4.5 | Update company list — add "View Details" action | Companies list component | Low |

### Phase 5: Admin Profile Page (Priority: MEDIUM)

| # | Task | Files | Effort |
|---|------|-------|--------|
| 5.1 | Rewrite admin profile page with 3-tab layout | `pages/admin-profile/index.tsx` | High |
| 5.2 | Create AdminPersonalInfo tab | `admin-profile/AdminPersonalInfo.tsx` (new) | Medium |
| 5.3 | Create AdminCompanyInfo tab (with Tier indicators + request buttons) | `admin-profile/AdminCompanyInfo.tsx` (new) | High |
| 5.4 | Create AdminSubscriptionInfo tab (read-only) | `admin-profile/AdminSubscriptionInfo.tsx` (new) | Medium |
| 5.5 | Create CompanyChangeRequestModal (admin submits) | `core/modals/CompanyChangeRequestModal.tsx` (new) | Medium |
| 5.6 | Create MyCompanyChangeRequestsModal (admin views history) | `core/modals/MyCompanyChangeRequestsModal.tsx` (new) | Medium |
| 5.7 | Create useCompanyChangeRequestREST hook | `hooks/useCompanyChangeRequestREST.ts` (new) | Medium |
| 5.8 | Create useAdminProfileREST hook | `hooks/useAdminProfileREST.ts` (new) | Medium |

### Phase 6: Testing & Polish (Priority: HIGH)

| # | Task | Effort |
|---|------|--------|
| 6.1 | Test company creation with all new fields | Medium |
| 6.2 | Test company details page — all sections render | Low |
| 6.3 | Test admin profile — Tier 1 direct edit works | Medium |
| 6.4 | Test admin profile — Tier 2 fields are read-only | Medium |
| 6.5 | Test admin profile — Tier 3 request submission | High |
| 6.6 | Test superadmin — approve/reject change requests | High |
| 6.7 | Test auto-apply — approved changes update company document | High |
| 6.8 | Test backward compatibility (existing companies) | Medium |
| 6.9 | Responsive design validation | Low |

---

## 9. File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| **Backend** | |
| `backend/models/superadmin/companyChangeRequest.schema.js` | Company change request schema |
| `backend/controllers/rest/companyChangeRequest.controller.js` | Change request CRUD + approve/reject |
| `backend/routes/api/companyChangeRequest.js` | API routes for company change requests |
| `backend/migrations/add-company-fields.js` | Migration for existing companies |
| **Frontend — Pages** | |
| `react/src/feature-module/super-admin/companies/company-details.tsx` | Company details page (superadmin) |
| `react/src/feature-module/pages/admin-profile/AdminPersonalInfo.tsx` | Admin profile Tab 1 |
| `react/src/feature-module/pages/admin-profile/AdminCompanyInfo.tsx` | Admin profile Tab 2 (with tier indicators) |
| `react/src/feature-module/pages/admin-profile/AdminSubscriptionInfo.tsx` | Admin profile Tab 3 |
| **Frontend — Modals** | |
| `react/src/core/modals/EditCompanyDetailModal.tsx` | Superadmin full company edit |
| `react/src/core/modals/EditAdminProfileModal.tsx` | Admin personal details edit |
| `react/src/core/modals/CompanyChangeRequestModal.tsx` | Admin submits change request |
| `react/src/core/modals/MyCompanyChangeRequestsModal.tsx` | Admin views request history |
| `react/src/core/modals/PendingCompanyChangeRequests.tsx` | Superadmin reviews requests |
| **Frontend — Hooks** | |
| `react/src/hooks/useAdminProfileREST.ts` | Admin profile data hook |
| `react/src/hooks/useCompanyChangeRequestREST.ts` | Company change request CRUD hook |

### Existing Files to Modify

| File | Changes |
|------|---------|
| `backend/models/superadmin/package.schema.js` | Add new company schema fields |
| `backend/services/superadmin/companies.services.js` | Update addCompany, viewCompany, updateCompany |
| `backend/controllers/rest/userProfile.controller.js` | Enhance getAdminProfile (return all fields), enforce Tier 1 in updateAdminProfile |
| `backend/routes/api/` (main route index) | Register new companyChangeRequest routes |
| `react/src/feature-module/router/all_routes.tsx` | Add company details route |
| `react/src/feature-module/router/router.jsx` | Register company details route |
| `react/src/feature-module/pages/admin-profile/index.tsx` | Rewrite with 3-tab layout |
| `react/src/hooks/useSuperadminCompaniesREST.ts` | Add viewCompanyDetails method |
| Superadmin company creation form/modal | Add new fields with tabbed form |

---

## 10. Key Decisions Before Implementation

1. **Which fields are required during company creation?**
   - Recommendation: Only `industry` and structured address (city, state, country, postalCode). Legal, contact, billing fields optional — can be added later.

2. **Admin personal details storage?**
   - Currently admin is only a Clerk user with metadata. No dedicated schema.
   - Recommendation: Store as nested `adminDetails` in company document: `{ name, email, phone, profileImage, memberSince }`.

3. **Should admin see pending request status inline on profile?**
   - Recommendation: Yes. If a Tier 3 field has a pending request, show a yellow badge "Pending" next to it. The "Request Change" button should be disabled for that field until current request is resolved.

4. **Address migration (string → object)?**
   - Existing companies have `address` as a plain string.
   - Migration: Copy string to `address.fullAddress`, leave sub-fields empty.
   - Backend: Handle both formats gracefully during transition.

5. **Should superadmin get notifications for pending requests?**
   - Recommendation: Phase 1: Show count badge on company list + company details page. Future: Email/in-app notifications.

6. **Can admin cancel their own pending request?**
   - Recommendation: Yes, same as employee change request pattern. Only pending requests can be cancelled.

---

## 11. Comparison: Employee Change Request vs Company Change Request

| Aspect | Employee → HR/Admin | Admin → Superadmin |
|--------|--------------------|--------------------|
| Schema | `changeRequest.schema.js` | `companyChangeRequest.schema.js` (new) |
| Collection | `changeRequests` (tenant DB) | `companyChangeRequests` (superadmin DB) |
| Requester | Employee | Admin |
| Approver | HR / Admin | Superadmin |
| Target | Employee document | Company document |
| Fields | bankDetails, name, phone, address, emergencyContact | billing, legal, classification, address, contact |
| Hook | `useChangeRequestREST.ts` | `useCompanyChangeRequestREST.ts` (new) |
| Submit Modal | `ChangeRequestModal.tsx` | `CompanyChangeRequestModal.tsx` (new) |
| History Modal | `MyChangeRequestsModal.tsx` | `MyCompanyChangeRequestsModal.tsx` (new) |
| Review Panel | `PendingChangeRequests.tsx` | `PendingCompanyChangeRequests.tsx` (new) |
| Auto-apply | Updates employee doc | Updates company doc |
| Duplicate check | Per employee + field | Per company + field |

---

*This document serves as the complete analysis and implementation blueprint. Please review and discuss before we begin implementation.*
