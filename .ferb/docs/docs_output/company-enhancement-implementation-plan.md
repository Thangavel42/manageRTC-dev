# Company Enhancement & Admin Profile - Implementation Plan

**Date:** 2026-03-02
**Project:** manageRTC-dev
**Author:** Claude Code Analysis

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Suggested Company Fields](#2-suggested-company-fields)
3. [Company Details Page Plan](#3-company-details-page-plan)
4. [Admin Profile Page Plan](#4-admin-profile-page-plan)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [File Changes Summary](#6-file-changes-summary)

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
| address | String | Required |
| status | String | Default: "Active" |
| planId | ObjectId | Ref to Plan |
| plan_id | String | Legacy |
| plan_name | String | Denormalized |
| plan_type | String | Denormalized |
| currency | String | - |
| logo | String | - |

**Problem:** The company schema is very minimal. It stores `address` as a single string (no structure), has no industry/size/tax/registration details, no social links, and no founder/contact person information.

### 1.2 Current Company Creation (from Superadmin)

**Frontend:** `react/src/feature-module/super-admin/companies/index.tsx` uses `useSuperadminCompaniesREST` hook
**Backend:** `backend/services/superadmin/companies.services.js` → `addCompany()`

Fields collected: `name, email, domain, phone, website, address, plan_id, plan_name, plan_type, logo`

### 1.3 Current Admin Profile Page

**File:** `react/src/feature-module/pages/admin-profile/index.tsx`

Currently shows:
- Company logo, name, domain, status
- Email, phone, website, description (phone/website/description editable)
- Subscription info (plan name, user count, status, renewal date)
- Admin account info (name, email, role)
- Quick action links

**Missing:** Detailed company info, admin personal details, structured address, industry info, tax/registration, social links, billing history.

### 1.4 How Employee Details Page Works (Reference)

**File:** `react/src/feature-module/hrm/employees/employeedetails.tsx`

The employee details page is a comprehensive profile view with:
- Header section (avatar, name, ID, designation, department, status badge)
- Tabbed/sectioned layout covering: Basic Info, Address, Employment, Shift, Compensation, Leave Balance, Documents, Skills & Qualifications, Emergency Contact, Bank Details, Social Profiles, Permissions
- Edit modal integration (`EditEmployeeModal`)
- Uses `useParams()` to get employee ID, fetches via REST API

### 1.5 How Employee Profile Works (Self-Login)

**File:** `react/src/feature-module/mainMenu/employeeDashboard/employee-dashboard.tsx`
**Hook:** `react/src/hooks/useUserProfileREST.ts`
**Backend:** `backend/controllers/rest/userProfile.controller.js`

- Employee sees their own profile via `/api/user-profile/current`
- Shows: personal info, employment info, leave balance, attendance stats, working hours
- Limited edit capability (address, emergency contact, social links, bio)

---

## 2. Suggested Company Fields

### 2.1 Fields to Add to Company Schema (Superadmin DB)

Below are the recommended fields organized by category. Fields marked with `*` are **recommended as required**.

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
| incorporationDate | Date | Date company was registered/incorporated |
| incorporationCountry | String | Country of incorporation |

#### C. Industry & Classification (NEW)

| Field | Type | Notes |
|-------|------|-------|
| industry* | String | Primary industry (IT, Healthcare, Manufacturing, etc.) |
| subIndustry | String | Sub-industry/specialization |
| companySize | String | Enum: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5000+ |
| companyType | String | Enum: Startup, SME, Enterprise, Government, NGO |
| annualRevenue | String | Revenue range (optional, for analytics) |

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
| contactPerson.email | String | Contact person email (may differ from company email) |
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

#### G. Branding & Preferences (NEW)

| Field | Type | Notes |
|-------|------|-------|
| brandColor | String | Primary brand color (hex) |
| timezone* | String | Company timezone (e.g., Asia/Kolkata) |
| dateFormat | String | Preferred date format (DD/MM/YYYY, MM/DD/YYYY, etc.) |
| fiscalYearStart | String | Fiscal year start month (e.g., "April", "January") |

#### H. Subscription & Billing (Enhanced)

| Field | Type | Notes |
|-------|------|-------|
| planId | ObjectId | Already exists (ref to Plan) |
| subscriptionStartDate | Date | When subscription started |
| subscriptionEndDate | Date | When subscription expires |
| billingEmail | String | Separate billing email |
| billingAddress | Object | Same structure as address (if different) |
| userCount | Number | Current active users |
| userCountLastUpdated | Date | Last count update time |

#### I. System/Audit Fields

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
- Information Technology
- Healthcare & Pharmaceuticals
- Finance & Banking
- Manufacturing
- Retail & E-Commerce
- Education
- Real Estate & Construction
- Telecommunications
- Media & Entertainment
- Transportation & Logistics
- Energy & Utilities
- Agriculture
- Hospitality & Tourism
- Legal Services
- Consulting
- Non-Profit
- Government
- Other

Company Size:
- 1-10 (Micro)
- 11-50 (Small)
- 51-200 (Medium)
- 201-500 (Large)
- 501-1000 (Enterprise)
- 1001-5000 (Large Enterprise)
- 5000+ (Corporation)

Legal Entity Types:
- Sole Proprietorship
- Partnership
- LLP (Limited Liability Partnership)
- Private Limited
- Public Limited
- Corporation
- LLC (Limited Liability Company)
- Non-Profit
- Government Entity
- Other
```

---

## 3. Company Details Page Plan

### 3.1 Overview

Create a new **Company Details** page accessible from the superadmin panel, similar to how `employeedetails.tsx` shows all employee information. This page will display all company information in a structured, sectioned layout.

### 3.2 Page Design (Modeled after Employee Details)

**Route:** `/super-admin/companies/:id`
**Component:** `react/src/feature-module/super-admin/companies/company-details.tsx`

#### Layout Structure:

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
│  ── Basic Information ──────────────────────    │
│  Email          | Phone         | Phone 2       │
│  Website        | Fax           | Domain         │
│  Description                                    │
│                                                 │
│  ── Registration & Legal ───────────────────    │
│  Legal Name     | Legal Entity Type             │
│  Registration # | Tax ID (GST/VAT)              │
│  Incorporation Date | Incorporation Country     │
│                                                 │
│  ── Industry & Classification ──────────────    │
│  Industry       | Sub-Industry                  │
│  Company Size   | Company Type                  │
│  Annual Revenue                                 │
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
│  ── Branding & Preferences ─────────────────    │
│  Brand Color    | Timezone                      │
│  Date Format    | Fiscal Year Start             │
│                                                 │
│  ── Subscription Details ───────────────────    │
│  Plan Name      | Plan Type      | Price        │
│  Start Date     | End Date       | Status       │
│  Users: 45/200  [━━━━━━░░░░] 22.5%             │
│  Billing Email  | Billing Address               │
│                                                 │
│  ── Enabled Modules ────────────────────────    │
│  ☑ HRM  ☑ CRM  ☑ Finance  ☐ Projects           │
│  ☑ Support  ☐ Assets  ☑ Attendance              │
│                                                 │
│  ── Audit Information ──────────────────────    │
│  Created On     | Created By                    │
│  Last Updated   | Updated By                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3.3 Backend Changes

1. **Update Company Schema** — Add all new fields from Section 2
2. **Update Superadmin Company Service** — `viewCompany()` to populate plan and module data
3. **Update Superadmin Company Controller** — Return enriched company data
4. **Create/Update Edit Company Modal** — Add tabs for new field categories

### 3.4 Frontend Changes

1. **Create `company-details.tsx`** — New page component
2. **Create `EditCompanyDetailModal.tsx`** — Enhanced edit modal with tabbed form
3. **Update route definitions** — Add `/super-admin/companies/:id`
4. **Update company list** — Add "View Details" action linking to new page

---

## 4. Admin Profile Page Plan

### 4.1 Overview

The current admin profile page (`react/src/feature-module/pages/admin-profile/index.tsx`) is basic. We need to create a **comprehensive Admin Profile** page that shows:
- Admin's personal details (like employee profile)
- Company information
- Subscription details with billing history
- Account settings

### 4.2 Page Design

**Route:** `/admin/profile` (existing, to be enhanced)
**Component:** `react/src/feature-module/pages/admin-profile/index.tsx` (rewrite)

#### Layout Structure:

```
┌─────────────────────────────────────────────────┐
│  Breadcrumb: Dashboard > My Profile             │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌──────────┐                                   │
│  │ PROFILE  │  Admin Name            [Admin]    │
│  │  PHOTO   │  admin@company.com                │
│  │          │  Company Name                     │
│  └──────────┘  [Edit Profile]                   │
│                                                 │
│  ═══════════════════════════════════════════     │
│  [My Details] [Company Info] [Subscription]     │
│  ═══════════════════════════════════════════     │
│                                                 │
│  ┌─── TAB 1: My Details ───────────────────┐    │
│  │                                         │    │
│  │  ── Personal Information ─────────────  │    │
│  │  Full Name     | Email                  │    │
│  │  Phone         | Gender                 │    │
│  │  Date of Birth | Address                │    │
│  │                                         │    │
│  │  ── Account Information ──────────────  │    │
│  │  Role          | Account Status         │    │
│  │  Member Since  | Last Login             │    │
│  │                                         │    │
│  │  ── Security ─────────────────────────  │    │
│  │  [Change Password]                      │    │
│  │  Two-Factor Auth: Enabled/Disabled      │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─── TAB 2: Company Info ─────────────────┐    │
│  │                                         │    │
│  │  ── Company Details ──────────────────  │    │
│  │  Company Name  | Domain                 │    │
│  │  Industry      | Company Size           │    │
│  │  Email         | Phone                  │    │
│  │  Website       | Status                 │    │
│  │  Description                            │    │
│  │                                         │    │
│  │  ── Address ──────────────────────────  │    │
│  │  Full formatted address                 │    │
│  │                                         │    │
│  │  ── Employees Overview ───────────────  │    │
│  │  Total: 45 | Active: 42 | On Leave: 3  │    │
│  │  Departments: 5 | Designations: 12     │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─── TAB 3: Subscription ────────────────┐     │
│  │                                         │    │
│  │  ── Current Plan ─────────────────────  │    │
│  │  ┌─────────────────────────────────┐    │    │
│  │  │  Plan: Professional             │    │    │
│  │  │  Type: Monthly | Price: $99/mo  │    │    │
│  │  │  Status: Active                 │    │    │
│  │  │  Renewal: March 15, 2026        │    │    │
│  │  │  Users: 45/200 [━━━━░░░] 22.5% │    │    │
│  │  └─────────────────────────────────┘    │    │
│  │                                         │    │
│  │  ── Enabled Modules ──────────────────  │    │
│  │  ☑ HRM  ☑ CRM  ☑ Finance  ☑ Projects  │    │
│  │  ☑ Support  ☑ Attendance  ☐ Assets     │    │
│  │                                         │    │
│  │  ── Plan Limits ──────────────────────  │    │
│  │  Max Users: 200                         │    │
│  │  Max Customers: 500                     │    │
│  │  Max Invoices: 1000                     │    │
│  │                                         │    │
│  │  ── Billing History ──────────────────  │    │
│  │  (Future: list of past invoices)        │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4.3 Backend Changes

1. **Enhance `/api/user-profile/admin` endpoint** to return:
   - Admin's personal details (from Clerk + any stored admin profile)
   - Company details (from superadmin DB companies collection)
   - Subscription/plan details (joined from packages collection)
   - Employee statistics (count by status, departments)
   - Enabled modules list

2. **Create admin profile update endpoint** for admin personal details

### 4.4 Frontend Changes

1. **Rewrite `admin-profile/index.tsx`** with tabbed layout
2. **Create sub-components:**
   - `AdminPersonalInfo.tsx` — Tab 1
   - `AdminCompanyInfo.tsx` — Tab 2
   - `AdminSubscriptionInfo.tsx` — Tab 3
3. **Create `EditAdminProfileModal.tsx`** — For editing admin personal details
4. **Update `useUserProfileREST.ts`** or create `useAdminProfileREST.ts` — Enhanced hook

---

## 5. Implementation Roadmap

### Phase 1: Schema & Backend Updates (Priority: HIGH)

| # | Task | Files to Modify | Effort |
|---|------|-----------------|--------|
| 1.1 | Update Company Schema with new fields | `backend/models/superadmin/package.schema.js` | Medium |
| 1.2 | Create migration script for existing companies | `backend/migrations/` (new file) | Medium |
| 1.3 | Update superadmin company service — addCompany() | `backend/services/superadmin/companies.services.js` | Medium |
| 1.4 | Update superadmin company service — viewCompany() | Same file | Low |
| 1.5 | Update superadmin company service — updateCompany() | Same file | Medium |
| 1.6 | Enhance admin profile API endpoint | `backend/controllers/rest/userProfile.controller.js` | Medium |
| 1.7 | Add employee stats aggregation for admin profile | `backend/services/` (new or existing) | Low |

### Phase 2: Company Creation Enhancement (Priority: HIGH)

| # | Task | Files to Modify | Effort |
|---|------|-----------------|--------|
| 2.1 | Update AddCompany form/modal with new fields | `react/src/feature-module/super-admin/companies/index.tsx` or modal | High |
| 2.2 | Add tabbed form layout (Basic, Legal, Address, Social, Preferences) | Same component | Medium |
| 2.3 | Add field validations (tax ID format, URL format, etc.) | Same component | Medium |
| 2.4 | Update `useSuperadminCompaniesREST` hook if needed | `react/src/hooks/useSuperadminCompaniesREST.ts` | Low |

### Phase 3: Company Details Page (Priority: MEDIUM)

| # | Task | Files to Modify | Effort |
|---|------|-----------------|--------|
| 3.1 | Create CompanyDetails page component | `react/src/feature-module/super-admin/companies/company-details.tsx` (new) | High |
| 3.2 | Create EditCompanyDetailModal component | `react/src/core/modals/EditCompanyDetailModal.tsx` (new) | High |
| 3.3 | Add route for `/super-admin/companies/:id` | `react/src/feature-module/router/all_routes.tsx` + `router.jsx` | Low |
| 3.4 | Update company list with "View Details" action | Companies list component | Low |
| 3.5 | Add backend endpoint for detailed company view | Backend controller/service | Medium |

### Phase 4: Admin Profile Page (Priority: MEDIUM)

| # | Task | Files to Modify | Effort |
|---|------|-----------------|--------|
| 4.1 | Rewrite admin profile page with tabs | `react/src/feature-module/pages/admin-profile/index.tsx` | High |
| 4.2 | Create AdminPersonalInfo tab component | `react/src/feature-module/pages/admin-profile/AdminPersonalInfo.tsx` (new) | Medium |
| 4.3 | Create AdminCompanyInfo tab component | `react/src/feature-module/pages/admin-profile/AdminCompanyInfo.tsx` (new) | Medium |
| 4.4 | Create AdminSubscriptionInfo tab component | `react/src/feature-module/pages/admin-profile/AdminSubscriptionInfo.tsx` (new) | Medium |
| 4.5 | Create EditAdminProfileModal | `react/src/core/modals/EditAdminProfileModal.tsx` (new) | Medium |
| 4.6 | Create/update admin profile REST hook | `react/src/hooks/useAdminProfileREST.ts` (new) | Medium |
| 4.7 | Backend: enhanced admin profile endpoint | `backend/controllers/rest/userProfile.controller.js` | Medium |

### Phase 5: Testing & Polish (Priority: HIGH)

| # | Task | Effort |
|---|------|--------|
| 5.1 | Test company creation with all new fields | Medium |
| 5.2 | Test company details page display | Low |
| 5.3 | Test admin profile page with all tabs | Medium |
| 5.4 | Test backward compatibility (existing companies without new fields) | Medium |
| 5.5 | Responsive design validation | Low |

---

## 6. File Changes Summary

### New Files to Create

| File | Purpose |
|------|---------|
| `react/src/feature-module/super-admin/companies/company-details.tsx` | Company details page (like employee details) |
| `react/src/core/modals/EditCompanyDetailModal.tsx` | Enhanced company edit modal |
| `react/src/feature-module/pages/admin-profile/AdminPersonalInfo.tsx` | Admin personal info tab |
| `react/src/feature-module/pages/admin-profile/AdminCompanyInfo.tsx` | Admin company info tab |
| `react/src/feature-module/pages/admin-profile/AdminSubscriptionInfo.tsx` | Admin subscription tab |
| `react/src/core/modals/EditAdminProfileModal.tsx` | Admin profile edit modal |
| `react/src/hooks/useAdminProfileREST.ts` | Admin profile data hook |
| `backend/migrations/add-company-fields.js` | Migration for existing companies |

### Existing Files to Modify

| File | Changes |
|------|---------|
| `backend/models/superadmin/package.schema.js` | Add new company fields |
| `backend/services/superadmin/companies.services.js` | Update addCompany, viewCompany, updateCompany |
| `backend/controllers/rest/userProfile.controller.js` | Enhance admin profile endpoint |
| `react/src/feature-module/router/all_routes.tsx` | Add company details route |
| `react/src/feature-module/router/router.jsx` | Register company details route |
| `react/src/feature-module/pages/admin-profile/index.tsx` | Rewrite with tabs |
| `react/src/hooks/useSuperadminCompaniesREST.ts` | Add viewCompanyDetails method |
| Company creation form/modal (superadmin) | Add new fields with tabs |
| `react/src/core/data/json/sidebarMenu.jsx` | Verify admin profile link exists |

---

## 7. Key Decisions Needed Before Implementation

1. **Which new company fields should be required vs optional?**
   - Recommendation: Only `industry`, `timezone`, and structured address fields (city, state, country, postalCode) should be required. Rest optional.

2. **Should the superadmin company creation form collect ALL fields or just essentials?**
   - Recommendation: Creation form collects essentials (Basic + Address + Industry). Other fields can be added later via edit.

3. **Should admin be able to edit company registration/legal details?**
   - Recommendation: No. Only superadmin should edit legal/registration fields. Admin can edit description, phone, website, social links, branding preferences.

4. **Should we create a separate admin user schema or use employee schema?**
   - Currently admin is a Clerk user with metadata. No dedicated admin schema exists in the tenant DB.
   - Recommendation: Store admin personal details in the superadmin companies collection (nested `adminDetails` object) or create a lightweight admin profile schema.

5. **Billing history feature scope?**
   - Recommendation: Phase 1 shows current plan only. Billing history can be a future phase.

6. **Should company details page be accessible to admin users too (read-only)?**
   - Recommendation: Yes, via the admin profile's "Company Info" tab (read-only view of their own company).

---

## 8. Comparison: Employee vs Company Detail Coverage

| Aspect | Employee Details | Company Details (Proposed) |
|--------|-----------------|---------------------------|
| Basic Info | Name, Email, Phone, DOB, Gender | Name, Email, Phone, Website, Domain |
| Identity | Employee ID, Passport | Registration #, Tax ID, Legal Name |
| Classification | Department, Designation, Role | Industry, Size, Type |
| Address | Structured (street, city, state, country, zip) | Structured (same format) |
| Contact | Emergency Contact | Contact Person, Founder |
| Social | LinkedIn, GitHub, Twitter | LinkedIn, Twitter, Facebook, Instagram |
| Financial | Salary, Bank Details | Plan, Pricing, Billing |
| Documents | Resume, ID Proof, etc. | (Future: Certificates, Licenses) |
| Status | Employment Status | Company Status, Subscription Status |
| Preferences | - | Timezone, Date Format, Brand Color, Fiscal Year |
| Activity | Login Count, Last Login | User Count, Last Updated |

---

*This document serves as the analysis and implementation blueprint. Please review and discuss before we begin implementation.*
