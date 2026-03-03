# Employee Pages Analysis Report

**Date:** 2026-02-25
**Files Analysed:**
- `react/src/feature-module/hrm/employees/employeedetails.tsx` — HR Admin view of a single employee
- `react/src/feature-module/pages/profile/index.tsx` — Employee self-service profile page

---

## 1. Employee Details Page — All DB Values

> **Page Purpose:** HR admin view (accessed via `/employees/:id`). Shows a specific employee's full record.
> **API Hook:** `useEmployeesREST` → REST calls to `/api/employees/:id`
> **Primary DB Collection:** `employees` in company-specific database
> **Accessed by:** HR, Super Admin, Manager

### Left Sidebar — Display Fields

| Field (DB Key) | Label Shown | DB Collection | Note |
|---|---|---|---|
| `avatarUrl` / `profileImage` | Profile Photo | `employees` | Cloudinary URL |
| `firstName` + `lastName` | Full Name | `employees` | — |
| `account.role` / `role` | Role | `employees` | System role |
| `designation` (via `designationId`) | Designation | `designations` | Resolved via lookup |
| `employeeId` | Employee ID | `employees` | e.g. `EMP-1234` |
| `dateOfJoining` | Date Of Join | `employees` | ISO date |
| `department` (via `departmentId`) | Department | `departments` | Resolved via lookup |
| `reportingManagerName` | Reporting Manager | `employees` | Denormalized name |
| `shiftId`, `shiftName`, `shiftTiming`, `shiftColor` | Shift Assignment (Direct) | `shifts` | Direct shift |
| `batchId`, `batchName`, `batchShiftName`, `batchShiftTiming`, `batchShiftColor` | Shift Assignment (Rotation) | `batches` | Rotation batch |
| `phone` | Phone | `employees` | — |
| `email` | Email | `employees` | — |
| `gender` | Gender | `employees` | — |
| `dateOfBirth` | Birthday | `employees` | — |
| `address.street` | Address | `employees` | Embedded sub-doc |
| `address.city` | City | `employees` | Embedded sub-doc |
| `address.state` | State | `employees` | Embedded sub-doc |
| `address.country` | Country | `employees` | Embedded sub-doc |
| `address.postalCode` | Postal Code | `employees` | Embedded sub-doc |
| `passport.number` | Passport No | `employees` | Embedded sub-doc |
| `passport.expiryDate` | Passport Exp Date | `employees` | Embedded sub-doc |
| `passport.country` | Nationality | `employees` | Mislabelled as "Nationality" in UI |
| `maritalStatus` | Marital Status | `employees` | Root-level field |
| `noOfChildren` | No. of Children | `employees` | Root-level field |
| `emergencyContacts[0].name` | Emergency Contact Name | `employees` | Embedded array |
| `emergencyContacts[0].relationship` | Relationship | `employees` | Embedded array |
| `emergencyContacts[0].phone[0]` | Phone Number 1 | `employees` | Embedded array |
| `emergencyContacts[0].phone[1]` | Phone Number 2 | `employees` | Embedded array |

### Right Panel — Accordion Sections

| Field (DB Key) | Label Shown | DB Collection |
|---|---|---|
| `about` | About Employee | `employees` |
| `bank.accountHolderName` | Account Holder Name | `employees` (embedded) |
| `bank.bankName` | Bank Name | `employees` (embedded) |
| `bank.accountNumber` | Account Number | `employees` (embedded) |
| `bank.ifscCode` | IFSC Code | `employees` (embedded) |
| `bank.branch` | Branch | `employees` (embedded) |
| `family[].Name` | Family Member Name | `employees` (embedded array) |
| `family[].relationship` | Relationship | `employees` (embedded array) |
| `family[].phone` | Phone | `employees` (embedded array) |
| `education[].institution` | Institution Name | `employees` (embedded array) |
| `education[].degree` | Course Name | `employees` (embedded array) |
| `education[].startDate` | Start Date | `employees` (embedded array) |
| `education[].endDate` | End Date | `employees` (embedded array) |
| `experience[].previousCompany` | Previous Company | `employees` (embedded array) |
| `experience[].designation` | Designation | `employees` (embedded array) |
| `experience[].startDate` | Start Date | `employees` (embedded array) |
| `experience[].endDate` | End Date | `employees` (embedded array) |

### Bank & Statutory Modal (`#add_bank_statutory`)

| Field (DB Key) | Label | DB Collection |
|---|---|---|
| `statutory.salary.basic` | Basic Salary | `employees` (embedded) |
| `statutory.salary.hra` | HRA | `employees` (embedded) |
| `statutory.salary.allowance` | Allowance | `employees` (embedded) |
| `statutory.salary.total` | Total | `employees` (embedded) |
| `statutory.pf.accountNumber` | PF Account Number | `employees` (embedded) |
| `statutory.pf.contributionPercent` | PF Employee Contribution % | `employees` (embedded) |
| `statutory.pf.employerContributionPercent` | PF Employer Contribution % | `employees` (embedded) |
| `statutory.esi.number` | ESI Number | `employees` (embedded) |
| `statutory.esi.contributionPercent` | ESI Employee Contribution % | `employees` (embedded) |
| `statutory.esi.employerContributionPercent` | ESI Employer Contribution % | `employees` (embedded) |

### Cross-Collection Data

| Data | Source Collection |
|---|---|
| Promotions shown in sidebar | `promotions` |
| Resignation shown in sidebar | `resignations` |
| Termination shown in sidebar | `terminations` |
| Assets assigned | `assetUsers` |
| Policies applicable | `policies` |

---

## 2. Profile Page — All DB Values

> **Page Purpose:** Self-service profile page for the logged-in user (all roles: employee, HR, admin).
> **API Hook:** `useProfileRest` → REST calls to `/api/user-profile/current`
> **Primary DB Collection:** `employees` in company-specific database
> **Accessed by:** All authenticated users (employee, hr, superadmin)

### View Mode — All Fields Displayed

| Field (DB Key) | Label Shown | Section | DB Collection |
|---|---|---|---|
| `profilePhoto` / `avatarUrl` | Profile Photo | Header | `employees` |
| `firstName` + `lastName` | Full Name | Header | `employees` |
| `email` | Email | Header | `employees` |
| `designation` | Designation Badge | Header | `employees`/`designations` |
| `employeeId` | Employee ID Badge | Header | `employees` |
| `firstName` | First Name | Basic Info | `employees` |
| `lastName` | Last Name | Basic Info | `employees` |
| `email` | Email | Basic Info | `employees` |
| `phone` | Phone | Basic Info | `employees` |
| `dateOfBirth` | Date of Birth | Basic Info | `employees` |
| `gender` | Gender | Basic Info | `employees` |
| `personal.passport.number` | Passport Number | Personal Info | `employees` (embedded) |
| `personal.passport.expiryDate` | Passport Expiry Date | Personal Info | `employees` (embedded) |
| `personal.nationality` | Nationality | Personal Info | `employees` (embedded) |
| `personal.religion` | Religion | Personal Info | `employees` (embedded) |
| `personal.maritalStatus` | Marital Status | Personal Info | `employees` (embedded) |
| `personal.noOfChildren` | No. of Children | Personal Info | `employees` (embedded) |
| `bankDetails.bankName` | Bank Name | Bank Information | `employees` (embedded) |
| `bankDetails.accountNumber` | Account Number (masked) | Bank Information | `employees` (embedded) |
| `bankDetails.ifscCode` | IFSC Code | Bank Information | `employees` (embedded) |
| `bankDetails.branch` | Branch | Bank Information | `employees` (embedded) |
| `bankDetails.accountType` | Account Type | Bank Information | `employees` (embedded) |
| `employeeId` | Employee ID | Professional Info | `employees` |
| `department` | Department | Professional Info | `employees`/`departments` |
| `designation` | Designation | Professional Info | `employees`/`designations` |
| `joiningDate` / `dateOfJoining` | Date of Joining | Professional Info | `employees` |
| `role` | Role | Professional Info | `employees` |
| `employmentType` | Employment Type | Professional Info | `employees` |
| `status` | Status | Professional Info | `employees` |
| `reportingManager.fullName` | Reporting Manager | Professional Info | `employees` (populated ref) |
| `address.street` | Address | Address Info | `employees` (embedded) |
| `address.city` | City | Address Info | `employees` (embedded) |
| `address.state` | State | Address Info | `employees` (embedded) |
| `address.country` | Country | Address Info | `employees` (embedded) |
| `address.postalCode` | Postal Code | Address Info | `employees` (embedded) |
| `emergencyContact.name` | Contact Name | Emergency Contact | `employees` (embedded) |
| `emergencyContact.phone` | Contact Phone | Emergency Contact | `employees` (embedded) |
| `emergencyContact.relationship` | Relationship | Emergency Contact | `employees` (embedded) |
| `socialLinks.linkedin` | LinkedIn | Social Links | `employees` (embedded) |
| `socialLinks.twitter` | Twitter | Social Links | `employees` (embedded) |
| `socialLinks.facebook` | Facebook | Social Links | `employees` (embedded) |
| `socialLinks.instagram` | Instagram | Social Links | `employees` (embedded) |
| `skills` | Skills | Additional Info | `employees` |
| `bio` / `about` | About/Bio | Additional Info | `employees` |
| `education[]` | Education | Education Section | `employees` (embedded array) |
| `experience[]` | Experience | Experience Section | `employees` (embedded array) |
| `family[]` | Family | Family Section | `employees` (embedded array) |
| `documents[]` | Documents | Documents Section | `employees` (embedded array) |

---

## 3. Comparison Table — Fields Present in Each Page

> **Legend:**
> ✅ Yes — Present and displayed / editable
> ❌ No — Not present at all
> 🔒 Read Only — Present and displayed, but not editable (view only)
> ⚠️ Partial — Present but incomplete or needs approval workflow

| # | Field | DB Key | Employee Details Page | Profile Page | CRUD Recommendation |
|---|---|---|---|---|---|
| 1 | Profile Photo | `avatarUrl` / `profilePhoto` | ✅ | ✅ | ✅ **Employee can Upload/Remove** — Low risk personal photo |
| 2 | First Name | `firstName` | ✅ | ✅ | ⚠️ **Employee can edit BUT needs HR approval** — Name changes affect official records |
| 3 | Last Name | `lastName` | ✅ | ✅ | ⚠️ **Employee can edit BUT needs HR approval** — Name changes affect official records |
| 4 | Employee ID | `employeeId` | ✅ | ✅ | 🔒 **Read Only — Never editable by employee** — System-assigned, affects payroll & ledger |
| 5 | Department | `department` / `departmentId` | ✅ | ✅ | 🔒 **Read Only — HR Only** — Org structure, affects leave policy, reports |
| 6 | Designation | `designation` / `designationId` | ✅ | ✅ | 🔒 **Read Only — HR Only** — Role hierarchy, salary bands |
| 7 | Date of Joining | `dateOfJoining` / `joiningDate` | ✅ | ✅ | 🔒 **Read Only — HR Only** — Legal/contractual, affects leave entitlement |
| 8 | Role (System) | `role` / `account.role` | ✅ | ✅ | 🔒 **Read Only — Super Admin Only** — RBAC access control |
| 9 | Employment Type | `employmentType` | ✅ | ✅ | 🔒 **Read Only — HR Only** — Contractual field |
| 10 | Status | `status` | ✅ | ✅ | 🔒 **Read Only — HR Only** — Active/Resigned/Terminated managed by HR workflows |
| 11 | Reporting Manager | `reportingManagerName` | ✅ | ✅ | 🔒 **Read Only — HR Only** — Org hierarchy, must not be self-assigned |
| 12 | Email | `email` | ✅ | ✅ | ⚠️ **Employee can view, HR edits** — Login credential, Clerk auth sync required |
| 13 | Phone | `phone` | ✅ | ✅ | ✅ **Employee can Edit** — Personal contact info |
| 14 | Gender | `gender` | ✅ | ✅ | ✅ **Employee can Edit** — Personal info |
| 15 | Date of Birth | `dateOfBirth` | ✅ | ✅ | ✅ **Employee can Edit** — Personal info (no downstream impact) |
| 16 | Address (Street) | `address.street` | ✅ | ✅ | ✅ **Employee can Edit** — Residential address |
| 17 | Address (City) | `address.city` | ✅ | ✅ | ✅ **Employee can Edit** |
| 18 | Address (State) | `address.state` | ✅ | ✅ | ✅ **Employee can Edit** |
| 19 | Address (Country) | `address.country` | ✅ | ✅ | ✅ **Employee can Edit** |
| 20 | Address (Postal Code) | `address.postalCode` | ✅ | ✅ | ✅ **Employee can Edit** |
| 21 | Passport Number | `passport.number` / `personal.passport.number` | ✅ | ✅ | ✅ **Employee can Edit** — Travel document, HR may verify |
| 22 | Passport Expiry Date | `passport.expiryDate` / `personal.passport.expiryDate` | ✅ | ✅ | ✅ **Employee can Edit** |
| 23 | Passport Country | `passport.country` / `personal.passport.country` | ✅ (as Nationality) | ✅ | ✅ **Employee can Edit** |
| 24 | Nationality | `personal.nationality` | ❌ | ✅ | ✅ **Employee can Edit** — Missing from Employee Details page |
| 25 | Religion | `personal.religion` | ❌ | ✅ | ✅ **Employee can Edit** — Missing from Employee Details page |
| 26 | Marital Status | `maritalStatus` / `personal.maritalStatus` | ✅ | ✅ | ✅ **Employee can Edit** — May affect insurance/benefits |
| 27 | No. of Children | `noOfChildren` / `personal.noOfChildren` | ✅ | ✅ | ✅ **Employee can Edit** — May affect benefits |
| 28 | Emergency Contact Name | `emergencyContacts.name` / `emergencyContact.name` | ✅ | ✅ | ✅ **Employee can Edit** — Safety information |
| 29 | Emergency Contact Phone | `emergencyContacts.phone` / `emergencyContact.phone` | ✅ (2 numbers) | ✅ (1 number) | ✅ **Employee can Edit** — Profile only stores 1 phone, details stores 2 |
| 30 | Emergency Contact Relationship | `emergencyContacts.relationship` | ✅ | ✅ | ✅ **Employee can Edit** |
| 31 | Bank — Account Holder Name | `bank.accountHolderName` | ✅ | ❌ | ⚠️ **Missing in Profile** — Should be added |
| 32 | Bank — Bank Name | `bank.bankName` / `bankDetails.bankName` | ✅ | ✅ | ⚠️ **Employee can Edit WITH HR Approval** — See Bank Details section below |
| 33 | Bank — Account Number | `bank.accountNumber` / `bankDetails.accountNumber` | ✅ | ✅ | ⚠️ **Employee can Edit WITH HR Approval** — Payroll risk if wrong |
| 34 | Bank — IFSC Code | `bank.ifscCode` / `bankDetails.ifscCode` | ✅ | ✅ | ⚠️ **Employee can Edit WITH HR Approval** |
| 35 | Bank — Branch | `bank.branch` / `bankDetails.branch` | ✅ | ✅ | ⚠️ **Employee can Edit WITH HR Approval** |
| 36 | Bank — Account Type | `bankDetails.accountType` | ❌ | ✅ | ⚠️ **Missing in Employee Details** — Should be added |
| 37 | About / Bio | `about` / `bio` | ✅ | ✅ | ✅ **Employee can Edit** — Self-description |
| 38 | Skills | `skills` | ❌ | ✅ | ✅ **Employee can Edit** — Missing from Employee Details |
| 39 | Social Links (LinkedIn) | `socialLinks.linkedin` | ❌ | ✅ | ✅ **Employee can Edit** — Missing from Employee Details |
| 40 | Social Links (Twitter) | `socialLinks.twitter` | ❌ | ✅ | ✅ **Employee can Edit** — Missing from Employee Details |
| 41 | Social Links (Facebook) | `socialLinks.facebook` | ❌ | ✅ | ✅ **Employee can Edit** — Missing from Employee Details |
| 42 | Social Links (Instagram) | `socialLinks.instagram` | ❌ | ✅ | ✅ **Employee can Edit** — Missing from Employee Details |
| 43 | Education | `education[]` | ✅ | ✅ | ✅ **Employee can Add/Edit/Delete** — Low risk |
| 44 | Experience | `experience[]` | ✅ | ✅ | ✅ **Employee can Add/Edit/Delete** — Low risk |
| 45 | Family Members | `family[]` | ✅ | ✅ | ✅ **Employee can Add/Edit/Delete** — May affect insurance/benefits |
| 46 | Documents | `documents[]` | ❌ | ✅ (view only) | ⚠️ **HR Manages** — No upload in Profile page currently |
| 47 | Shift Assignment | `shiftId` / `shiftName` / `shiftTiming` | ✅ | 🔒 Read Only | 🔒 **HR Only (Edit)** — Employee can view their shift schedule, cannot change |
| 48 | Batch Assignment | `batchId` / `batchName` / `batchShiftName` | ✅ | 🔒 Read Only | 🔒 **HR Only (Edit)** — Employee can view their rotation batch, cannot change |
| 49 | Salary (Basic/HRA/Allowance/Total) | `statutory.salary.*` | ✅ | 🔒 Read Only | 🔒 **HR/Finance Only (Edit)** — Employee can view their own salary breakdown |
| 50 | PF Details | `statutory.pf.*` | ✅ | 🔒 Read Only | 🔒 **HR/Finance Only (Edit)** — Employee can view their PF account & contributions |
| 51 | ESI Details | `statutory.esi.*` | ✅ | 🔒 Read Only | 🔒 **HR/Finance Only (Edit)** — Employee can view their ESI number & contributions |
| 52 | Assets Assigned | `assets[]` from `assetUsers` | ✅ | 🔒 Read Only | 🔒 **IT/Admin Only (Edit)** — Employee can view assets assigned to them |
| 53 | Policies Applied | from `policies` collection | ✅ | 🔒 Read Only | 🔒 **HR Only (Edit)** — Employee can view policies applicable to their role |
| 54 | Promotion History | from `promotions` collection | ✅ | 🔒 Read Only | 🔒 **HR Only (Edit)** — Employee can view their promotion history |
| 55 | Resignation Details | from `resignations` collection | ✅ | 🔒 Read Only | 🔒 **HR Only (Edit)** — Employee can view their resignation status & dates |
| 56 | Termination Details | from `terminations` collection | ✅ | 🔒 Read Only | 🔒 **HR Only (Edit)** — Employee can view termination record if applicable |
| 57 | Time Zone | `timeZone` | ✅ | 🔒 Read Only | ✅ **Employee can Edit** — Should be editable (affects attendance/timesheet) |
| 58 | Company Name | `companyName` | ✅ | 🔒 Read Only | 🔒 **Read Only always** — Company-level data, never editable |
| 59 | Password | Clerk Auth | ❌ | ✅ | ✅ **Employee can Change** — Via secure modal |
| 60 | Permissions | `permissions.*` | ✅ | 🔒 Read Only | 🔒 **HR/Admin Only (Edit)** — Employee can view their own module permissions |

---

## 4. Detailed CRUD Recommendations

### Bank Details — Special Recommendation 🔐

**Current State:** Profile page allows employees to directly edit bank details (no approval flow).
**Risk:** A wrong bank account number leads to **payroll being sent to wrong account** — a serious financial risk.

**Recommended Approach:**
```
Employee requests bank detail change
  → Saved as "Pending Change" (not immediately active)
  → HR receives notification/email
  → HR reviews and approves/rejects
  → On approval: old bank details archived, new details become active
  → Employee notified of outcome
```

**Implementation needed:**
- Add `bankChangeRequests` collection or add `pendingBankDetails` field in employee record
- HR can see pending changes in Employee Details page
- Employee sees "Pending Approval" badge in Profile page
- Audit trail: who changed, when, who approved

---

### Fields Locked by Role (Not Editable by Employee)

These fields should be **read-only in the Profile page** and only editable by HR/Admin:

| Field | Reason |
|---|---|
| Employee ID | System-assigned unique identifier |
| Department | Org structure, affects leave policies |
| Designation | Role hierarchy, salary bands |
| Date of Joining | Legal/contractual date |
| System Role | RBAC access control |
| Employment Type | Contractual agreement |
| Status | Managed via HR workflows (Termination, Resignation) |
| Reporting Manager | Org hierarchy, prevents self-assignment loops |
| Shift Assignment | Schedule managed by HR/manager |
| Batch Assignment | Schedule managed by HR/manager |
| Salary/PF/ESI | Confidential payroll data |
| Permissions | RBAC module access |

---

### Fields Employee CAN Self-Edit (Profile Page)

| Field | Notes |
|---|---|
| Profile Photo | Upload to Cloudinary, safe |
| First/Last Name | Consider name-change approval flow |
| Phone | Basic contact info |
| Date of Birth | Identity info |
| Gender | Personal preference |
| Address | Residential address |
| Passport Info | Travel document, employee maintains |
| Nationality | Personal identity |
| Religion | Personal identity (sensitive) |
| Marital Status | May affect benefits |
| No. of Children | May affect benefits |
| Emergency Contact | Safety critical, employee knows best |
| Social Links | Professional profile |
| Skills | Professional development |
| Bio / About | Self-description |
| Education | Academic history |
| Experience | Work history |
| Family Members | Insurance/emergency |
| Password | Security — secure modal with confirmation |

---

## 5. Issues Found & Gaps

### Bug: Profile Page Allows Editing of Locked Fields

**Issue:** The Profile page edit form includes input fields for:
- `employeeId` — editable text input
- `department` — editable dropdown (static hardcoded options, not from DB)
- `designation` — editable text input
- `joiningDate` — editable date input

**Recommendation:** These fields should be removed from the edit form and displayed as read-only labels in the Profile page.

**File:** [profile/index.tsx](react/src/feature-module/pages/profile/index.tsx) — lines 1007–1071
**Fix:** Convert to `<p className="form-control-plaintext">` read-only display

---

### Gap: Profile Page Missing Fields Present in Employee Details

| Missing Field | Where to Add in Profile |
|---|---|
| `bank.accountHolderName` | Bank Information section |
| `bankDetails.accountType` | Already in Profile page ✅ (but missing in Employee Details) |
| `skills` | Present in Profile ✅ (missing from Employee Details) |
| `socialLinks.*` | Present in Profile ✅ (missing from Employee Details) |
| `timeZone` | Should be in Profile page (missing) |

---

### Gap: Employee Details Page Missing Fields Present in Profile

| Missing Field | Where to Add in Employee Details |
|---|---|
| `personal.nationality` (distinct from passport.country) | Personal Information section |
| `personal.religion` | Personal Information section |
| `bankDetails.accountType` | Bank Information accordion |
| `skills` | About section |
| `socialLinks.*` | Could be added in a new section |

---

### Schema Inconsistency: Bank Details Field Names

The two pages use **different field names** for the same data:

| Profile Page | Employee Details Page | DB Field |
|---|---|---|
| `bankDetails.bankName` | `bank.bankName` | `bank.bankName` |
| `bankDetails.accountNumber` | `bank.accountNumber` | `bank.accountNumber` |
| `bankDetails.ifscCode` | `bank.ifscCode` | `bank.ifscCode` |
| `bankDetails.branch` | `bank.branch` | `bank.branch` |
| `bankDetails.accountType` | N/A | `bank.accountType` or `bankDetails.accountType` |

**Recommendation:** Standardise both pages to use the same field name (`bankDetails.*`).

---

### Schema Inconsistency: Emergency Contact Format

| Profile Page | Employee Details Page |
|---|---|
| `emergencyContact` (single object) | `emergencyContacts` (array) |
| `emergencyContact.phone` (single string) | `emergencyContacts[0].phone` (array of strings — 2 numbers) |

**Recommendation:** Profile page should support 2 phone numbers for emergency contact (like Employee Details page).

---

## 6. Access Summary by Role

| Role | Employee Details Page Access | Profile Page Access |
|---|---|---|
| **Super Admin** | Full CRUD on all fields | Full CRUD on own profile |
| **HR** | Full CRUD on all fields including salary, statutory | Full CRUD on own profile (same employee limitations apply) |
| **Manager** | Read access + limited edit (depends on RBAC permissions) | Full CRUD on own profile |
| **Employee** | ❌ Cannot access Employee Details for others | Edit only allowed fields (locked fields should be read-only) |

---

## 7. Priority Fixes Recommended

| Priority | Fix | File | Effort |
|---|---|---|---|
| 🔴 High | Lock `employeeId`, `department`, `designation`, `joiningDate` in Profile edit form | `profile/index.tsx` | Low |
| 🔴 High | Add bank change approval workflow (prevent direct bank edit) | Backend + Frontend | High |
| 🟡 Medium | Add `timeZone` field to Profile page | `profile/index.tsx` | Low |
| 🟡 Medium | Add `personal.nationality` and `personal.religion` to Employee Details sidebar | `employeedetails.tsx` | Low |
| 🟡 Medium | Add `bankDetails.accountType` to Employee Details bank section | `employeedetails.tsx` | Low |
| 🟡 Medium | Add 2nd emergency phone number support in Profile page | `profile/index.tsx` | Low |
| 🟢 Low | Add `skills` display to Employee Details page | `employeedetails.tsx` | Low |
| 🟢 Low | Add social links display to Employee Details page | `employeedetails.tsx` | Low |
| 🟢 Low | Standardise bank field names: use `bankDetails.*` consistently | Backend + Frontend | Medium |
| 🟢 Low | Fix `passport.country` mislabelled as "Nationality" in Employee Details | `employeedetails.tsx` | Low |

---

*Report generated: 2026-02-25*
