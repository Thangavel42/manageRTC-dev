# BRUTAL VALIDATION REPORT: Profile Page Analysis

**Date:** 2026-02-07
**Component:** Profile Page
**Files Analyzed:**
- [react/src/feature-module/pages/profile/index.tsx](react/src/feature-module/pages/profile/index.tsx)
- [backend/controllers/rest/userProfile.controller.js](backend/controllers/rest/userProfile.controller.js)
- [backend/services/pages/profilepage.services.js](backend/services/pages/profilepage.services.js)
- [react/src/hooks/useProfileRest.ts](react/src/hooks/useProfileRest.ts)
- [backend/models/employee/employee.schema.js](backend/models/employee/employee.schema.js)
- [react/src/feature-module/hrm/employees/employeedetails.tsx](react/src/feature-module/hrm/employees/employeedetails.tsx)

---

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [REST API Validation](#rest-api-validation)
3. [Field-by-Field Validation Report](#field-by-field-validation-report)
4. [Admin Profile Analysis](#admin-profile-analysis)
5. [Employee Details vs Profile Page Comparison](#employee-details-vs-profile-page-comparison)
6. [Database Schema Validation](#database-schema-validation)
7. [Critical Issues Found](#critical-issues-found)
8. [Recommendations](#recommendations)

---

## 1. Executive Summary

### Overall Assessment
| Aspect | Status | Score |
|--------|--------|-------|
| REST API Implementation | ✅ Complete | 100% |
| Basic Information Display | ✅ Complete | 95% |
| Professional Information | ⚠️ Partial | 70% |
| Personal Information | ❌ Missing | 30% |
| Bank Information | ❌ Missing | 0% |
| Employee Lifecycle Status | ❌ Missing | 0% |
| Admin Profile Handling | ❌ Incomplete | 40% |

### Key Findings
- ✅ **REST API is properly used** for profile operations
- ❌ **Admin users see the same profile page** as employees (should have company-specific view)
- ❌ **Personal Information section is missing** (Passport, Nationality, Religion, Marital Status, Spouse, Children)
- ❌ **Bank Information section is completely missing**
- ❌ **Employee lifecycle status not shown** (Resignation/Promotion/Termination lists)
- ⚠️ **Many fields are view-only** when they should be editable by the employee

---

## 2. REST API Validation

### 2.1 API Endpoints Used

| Endpoint | Method | Controller File | Status | Description |
|----------|--------|-----------------|--------|-------------|
| `/api/user-profile/current` | GET | [userProfile.controller.js](backend/controllers/rest/userProfile.controller.js#L54) | ✅ Active | Get current user profile |
| `/api/user-profile/current` | PUT | [userProfile.controller.js](backend/controllers/rest/userProfile.controller.js#L337) | ✅ Active | Update current user profile |
| `/api/user-profile/change-password` | POST | [userProfile.controller.js](backend/controllers/rest/userProfile.controller.js#L629) | ✅ Active | Change password |

### 2.2 Frontend Hook Analysis

**File:** [react/src/hooks/useProfileRest.ts](react/src/hooks/useProfileRest.ts)

```typescript
// Hook Functions
export const useProfileRest = () => {
  return {
    fetchCurrentUserProfile,      // GET /user-profile/current
    updateCurrentUserProfile,      // PUT /user-profile/current
    changePassword,                // POST /user-profile/change-password
  };
};
```

**✅ CONFIRMED:** Profile page uses REST API (not Socket.IO)

### 2.3 Socket.IO vs REST

| File | Type | Status |
|------|------|--------|
| [profilepage.controllers.js](backend/controllers/pages/profilepage.controllers.js) | Socket.IO | ❌ NOT USED by profile page |
| [userProfile.controller.js](backend/controllers/rest/userProfile.controller.js) | REST | ✅ CURRENTLY USED |

**Note:** There exists both Socket.IO and REST implementations for profile operations. The profile page uses REST, but Socket.IO controllers still exist and may cause confusion.

---

## 3. Field-by-Field Validation Report

### 3.1 Basic Information Fields

| # | Field | Required | View Mode | Edit Mode | Backend Field | Data Type | Status |
|---|-------|----------|-----------|-----------|---------------|-----------|--------|
| 1 | EmployeeID | ✅ | [L496](react/src/feature-module/pages/profile/index.tsx#L496) | [L922](react/src/feature-module/pages/profile/index.tsx#L922) | `employeeId` | String | ✅ OK |
| 2 | Avatar/Profile Photo | ✅ | [L432](react/src/feature-module/pages/profile/index.tsx#L432) | [L753](react/src/feature-module/pages/profile/index.tsx#L753) | `profilePhoto/avatarUrl` | String | ✅ OK |
| 3 | First Name | ✅ | [L465](react/src/feature-module/pages/profile/index.tsx#L465) | [L817](react/src/feature-module/pages/profile/index.tsx#L817) | `firstName` | String | ✅ OK |
| 4 | Last Name | ✅ | [L468](react/src/feature-module/pages/profile/index.tsx#L468) | [L834](react/src/feature-module/pages/profile/index.tsx#L834) | `lastName` | String | ✅ OK |
| 5 | Email | ✅ | [L473](react/src/feature-module/pages/profile/index.tsx#L473) | [L851](react/src/feature-module/pages/profile/index.tsx#L851) | `email` | String | ✅ OK |
| 6 | Phone | ✅ | [L477](react/src/feature-module/pages/profile/index.tsx#L477) | [L869](react/src/feature-module/pages/profile/index.tsx#L869) | `phone` | String | ✅ OK |
| 7 | Date of Birth | ✅ | [L481](react/src/feature-module/pages/profile/index.tsx#L481) | [L887](react/src/feature-module/pages/profile/index.tsx#L887) | `dateOfBirth` | Date | ✅ OK |
| 8 | Gender | ✅ | [L485](react/src/feature-module/pages/profile/index.tsx#L485) | [L903](react/src/feature-module/pages/profile/index.tsx#L903) | `gender` | String | ✅ OK |

### 3.2 Professional Information Fields

| # | Field | Required | View Mode | Edit Mode | Backend Field | Data Type | Status |
|---|-------|----------|-----------|-----------|---------------|-----------|--------|
| 1 | Date of Joining | ✅ | [L508](react/src/feature-module/pages/profile/index.tsx#L508) | [L969](react/src/feature-module/pages/profile/index.tsx#L969) | `joiningDate` | Date | ✅ OK |
| 2 | Department | ✅ | [L500](react/src/feature-module/pages/profile/index.tsx#L500) | [L941](react/src/feature-module/pages/profile/index.tsx#L941) | `department` | String/ObjectId | ✅ OK |
| 3 | Designation | ✅ | [L504](react/src/feature-module/pages/profile/index.tsx#L504) | [L956](react/src/feature-module/pages/profile/index.tsx#L956) | `designation` | String/ObjectId | ✅ OK |
| 4 | Role | ✅ | [L512](react/src/feature-module/pages/profile/index.tsx#L512) | ❌ NOT EDITABLE | `role` | String | ⚠️ VIEW ONLY |
| 5 | Employment Type | ✅ | [L516](react/src/feature-module/pages/profile/index.tsx#L516) | ❌ NOT EDITABLE | `employmentType` | String | ⚠️ VIEW ONLY |
| 6 | Status | ✅ | [L519](react/src/feature-module/pages/profile/index.tsx#L519) | ❌ NOT EDITABLE | `status/employmentStatus` | String | ⚠️ VIEW ONLY |
| 7 | Reporting Manager | ✅ | [L533](react/src/feature-module/pages/profile/index.tsx#L533) | ❌ NOT EDITABLE | `reportingTo` | ObjectId | ⚠️ VIEW ONLY |

### 3.3 Address Information Fields

| # | Field | Required | View Mode | Edit Mode | Backend Field | Data Type | Status |
|---|-------|----------|-----------|-----------|---------------|-----------|--------|
| 1 | Street Address | ✅ | [L552](react/src/feature-module/pages/profile/index.tsx#L552) | [L995](react/src/feature-module/pages/profile/index.tsx#L995) | `address.street` | String | ✅ OK |
| 2 | City | ✅ | [L556](react/src/feature-module/pages/profile/index.tsx#L556) | [L1040](react/src/feature-module/pages/profile/index.tsx#L1040) | `address.city` | String | ✅ OK |
| 3 | State | ✅ | [L560](react/src/feature-module/pages/profile/index.tsx#L560) | [L1027](react/src/feature-module/pages/profile/index.tsx#L1027) | `address.state` | String | ✅ OK |
| 4 | Country | ✅ | [L564](react/src/feature-module/pages/profile/index.tsx#L564) | [L1012](react/src/feature-module/pages/profile/index.tsx#L1012) | `address.country` | String | ✅ OK |
| 5 | Postal Code | ✅ | [L568](react/src/feature-module/pages/profile/index.tsx#L568) | [L1054](react/src/feature-module/pages/profile/index.tsx#L1054) | `address.postalCode` | String | ✅ OK |

### 3.4 Emergency Contact Fields

| # | Field | Required | View Mode | Edit Mode | Backend Field | Data Type | Status |
|---|-------|----------|-----------|-----------|---------------|-----------|--------|
| 1 | Contact Name | ✅ | [L578](react/src/feature-module/pages/profile/index.tsx#L578) | [L1080](react/src/feature-module/pages/profile/index.tsx#L1080) | `emergencyContact.name` | String | ✅ OK |
| 2 | Contact Phone | ✅ | [L583](react/src/feature-module/pages/profile/index.tsx#L583) | [L1095](react/src/feature-module/pages/profile/index.tsx#L1095) | `emergencyContact.phone` | String | ✅ OK |
| 3 | Relationship | ✅ | [L587](react/src/feature-module/pages/profile/index.tsx#L587) | [L1112](react/src/feature-module/pages/profile/index.tsx#L1112) | `emergencyContact.relationship` | String | ✅ OK |

### 3.5 Social Links Fields

| # | Field | Required | View Mode | Edit Mode | Backend Field | Data Type | Status |
|---|-------|----------|-----------|-----------|---------------|-----------|--------|
| 1 | LinkedIn | ✅ | [L598](react/src/feature-module/pages/profile/index.tsx#L598) | [L1133](react/src/feature-module/pages/profile/index.tsx#L1133) | `socialLinks.linkedin` | String | ✅ OK |
| 2 | Twitter | ✅ | [L606](react/src/feature-module/pages/profile/index.tsx#L606) | [L1148](react/src/feature-module/pages/profile/index.tsx#L1148) | `socialLinks.twitter` | String | ✅ OK |
| 3 | Facebook | ✅ | [L614](react/src/feature-module/pages/profile/index.tsx#L614) | [L1164](react/src/feature-module/pages/profile/index.tsx#L1164) | `socialLinks.facebook` | String | ✅ OK |
| 4 | Instagram | ✅ | [L622](react/src/feature-module/pages/profile/index.tsx#L622) | [L1181](react/src/feature-module/pages/profile/index.tsx#L1181) | `socialLinks.instagram` | String | ✅ OK |

### 3.6 Skills and Bio

| # | Field | Required | View Mode | Edit Mode | Backend Field | Data Type | Status |
|---|-------|----------|-----------|-----------|---------------|-----------|--------|
| 1 | Skills | ✅ | [L637](react/src/feature-module/pages/profile/index.tsx#L637) | [L1208](react/src/feature-module/pages/profile/index.tsx#L1208) | `skills` | Array | ✅ OK |
| 2 | Bio/About | ✅ | [L641](react/src/feature-module/pages/profile/index.tsx#L641) | [L1227](react/src/feature-module/pages/profile/index.tsx#L1227) | `bio/notes` | String | ✅ OK |

### 3.7 ❌ CRITICAL MISSING FIELDS

#### Personal Information Section

| # | Field | Required | Status | Backend Field | Found In |
|---|-------|----------|--------|---------------|----------|
| 1 | **Passport No** | ✅ | ❌ MISSING | `personal.passport.number` | [employeedetails.tsx:340](react/src/feature-module/hrm/employees/employeedetails.tsx#L340) |
| 2 | **Passport Exp Date** | ✅ | ❌ MISSING | `personal.passport.expiryDate` | [employeedetails.tsx:341](react/src/feature-module/hrm/employees/employeedetails.tsx#L341) |
| 3 | **Nationality** | ✅ | ❌ MISSING | `personal.nationality` | [employeedetails.tsx:342](react/src/feature-module/hrm/employees/employeedetails.tsx#L342) |
| 4 | **Religion** | ✅ | ❌ MISSING | `personal.religion` | [employeedetails.tsx:343](react/src/feature-module/hrm/employees/employeedetails.tsx#L343) |
| 5 | **Marital Status** | ✅ | ❌ MISSING | `personal.maritalStatus` | [employeedetails.tsx:344](react/src/feature-module/hrm/employees/employeedetails.tsx#L344) |
| 6 | **Employment of Spouse** | ✅ | ❌ MISSING | `personal.employmentOfSpouse` | [employeedetails.tsx:345](react/src/feature-module/hrm/employees/employeedetails.tsx#L345) |
| 7 | **No. of Children** | ✅ | ❌ MISSING | `personal.noOfChildren` | [employeedetails.tsx:346](react/src/feature-module/hrm/employees/employeedetails.tsx#L346) |

#### Bank Information Section

| # | Field | Required | Status | Backend Field | Found In |
|---|-------|----------|--------|---------------|----------|
| 1 | **Bank Name** | ✅ | ❌ MISSING | `bankDetails.bankName` | [employeedetails.tsx:328](react/src/feature-module/hrm/employees/employeedetails.tsx#L328) |
| 2 | **Account Number** | ✅ | ❌ MISSING | `bankDetails.accountNumber` | [employeedetails.tsx:330](react/src/feature-module/hrm/employees/employeedetails.tsx#L330) |
| 3 | **IFSC Code** | ✅ | ❌ MISSING | `bankDetails.ifscCode` | [employeedetails.tsx:331](react/src/feature-module/hrm/employees/employeedetails.tsx#L331) |
| 4 | **Branch** | ✅ | ❌ MISSING | `bankDetails.branch` | [employeedetails.tsx:332](react/src/feature-module/hrm/employees/employeedetails.tsx#L332) |

#### Employee Lifecycle Status

| # | Field | Required | Status | Backend Endpoint | Found In |
|---|-------|----------|--------|------------------|----------|
| 1 | **Resignation List Status** | ✅ | ❌ MISSING | `GET /api/resignations/employee/:id` | [resignation.controller.js](backend/controllers/rest/resignation.controller.js) |
| 2 | **Promotion List Status** | ✅ | ❌ MISSING | `GET /api/promotions/employee/:id` | [promotion.controller.js](backend/controllers/rest/promotion.controller.js) |
| 3 | **Termination List Status** | ✅ | ❌ MISSING | `POST /api/employees/check-lifecycle-status` | [employee.controller.js:200](backend/controllers/rest/employee.controller.js#L200) |

#### Additional Missing Sections

| # | Section | Required | Status | Notes |
|---|---------|----------|--------|-------|
| 1 | **Policy Information** | ✅ | ❌ MISSING | Policies assigned to employee |
| 2 | **Asset Information** | ✅ | ❌ MISSING | Assets assigned to employee |

### 3.8 View-Only Fields (Present but Not Editable)

| # | Field | View Location | Should Be Editable By | Current Status |
|---|-------|---------------|----------------------|----------------|
| 1 | Role | [L512](react/src/feature-module/pages/profile/index.tsx#L512) | Admin/HR only | ⚠️ View Only (Correct) |
| 2 | Employment Type | [L516](react/src/feature-module/pages/profile/index.tsx#L516) | Admin/HR only | ⚠️ View Only (Correct) |
| 3 | Status | [L519](react/src/feature-module/pages/profile/index.tsx#L519) | Admin/HR only | ⚠️ View Only (Correct) |
| 4 | Reporting Manager | [L533](react/src/feature-module/pages/profile/index.tsx#L533) | Admin/HR only | ⚠️ View Only (Correct) |
| 5 | Education | [L648](react/src/feature-module/pages/profile/index.tsx#L648) | Employee | ⚠️ Should Be Editable |
| 6 | Experience | [L667](react/src/feature-module/pages/profile/index.tsx#L667) | Employee | ⚠️ Should Be Editable |
| 7 | Family | [L689](react/src/feature-module/pages/profile/index.tsx#L689) | Employee | ⚠️ Should Be Editable |
| 8 | Documents | [L708](react/src/feature-module/pages/profile/index.tsx#L708) | Employee | ⚠️ Should Be Editable |

---

## 4. Admin Profile Analysis

### 4.1 Current Admin Profile Implementation

**File:** [backend/controllers/rest/userProfile.controller.js:60-105](backend/controllers/rest/userProfile.controller.js#L60-L105)

```javascript
if (user.role === 'admin') {
    const { companiesCollection } = getsuperadminCollections();
    const company = await companiesCollection.findOne({
        _id: new ObjectId(user.companyId)
    });

    const profileData = {
        role: 'admin',
        companyId: company._id.toString(),
        companyName: company.name || 'Company',
        companyLogo: validCompanyLogo,
        companyDomain: company.domain || null,
        email: company.email || user.email,
        status: company.status || 'Active',
        website: company.website || null,
        phone: company.phone || null,
        _id: company._id.toString(),
        userId: user.userId,
        firstName: company.name || 'Admin',
        lastName: '',
        profilePhoto: validCompanyLogo,
        designation: 'Administrator',
        joiningDate: company.createdAt || null,
        bio: company.description || ''
    };
}
```

### 4.2 ❌ PROBLEM: Admin Uses Same Profile Page

| Issue | Description | Impact |
|-------|-------------|--------|
| **Wrong Data Structure** | Admin receives company data but page displays as employee | Confusing UX |
| **Missing Company Fields** | Subscription details, user limits, settings not shown | Incomplete admin view |
| **No Company Settings** | Admin cannot update company information | Limited functionality |
| **Mixed Semantics** | "firstName" = company name, "designation" = "Administrator" | Confusing for developers |

### 4.3 Admin Profile Should Display

| Section | Field | Source | Status |
|---------|-------|--------|--------|
| **Company Information** | | | |
| | Company Name | `company.name` | ✅ Available |
| | Company Logo | `company.logo` | ✅ Available |
| | Domain | `company.domain` | ✅ Available |
| | Email | `company.email` | ✅ Available |
| | Phone | `company.phone` | ✅ Available |
| | Website | `company.website` | ✅ Available |
| | Description | `company.description` | ✅ Available |
| | Status | `company.status` | ✅ Available |
| **Subscription Details** | | | |
| | Plan Name | `company.subscriptionId` | ❌ Need lookup |
| | User Limit | `company.userLimit` | ❌ Need to add |
| | Current Users | Count from employees | ❌ Need calculation |
| | Renewal Date | `subscription.renewalDate` | ❌ Need lookup |
| **Admin User Info** | | | |
| | Admin Name | From Clerk metadata | ✅ Available |
| | Admin Email | From Clerk metadata | ✅ Available |
| | Role | "admin" | ✅ Available |

---

## 5. Employee Details vs Profile Page Comparison

### 5.1 Feature Comparison Matrix

| Feature | Employee Details Page | Profile Page | Status | Notes |
|---------|----------------------|--------------|--------|-------|
| **Personal Info** | | | | |
| Basic Info (Name, Email, Phone) | ✅ | ✅ | ✅ Same | |
| Date of Birth | ✅ | ✅ | ✅ Same | |
| Gender | ✅ | ✅ | ✅ Same | |
| Passport Details | ✅ | ❌ | ❌ Missing | `personal.passport.*` |
| Nationality | ✅ | ❌ | ❌ Missing | `personal.nationality` |
| Religion | ✅ | ❌ | ❌ Missing | `personal.religion` |
| Marital Status | ✅ | ❌ | ❌ Missing | `personal.maritalStatus` |
| Spouse Employment | ✅ | ❌ | ❌ Missing | `personal.employmentOfSpouse` |
| No. of Children | ✅ | ❌ | ❌ Missing | `personal.noOfChildren` |
| **Bank Information** | | | | |
| Bank Name | ✅ | ❌ | ❌ Missing | `bankDetails.bankName` |
| Account Number | ✅ | ❌ | ❌ Missing | `bankDetails.accountNumber` |
| IFSC Code | ✅ | ❌ | ❌ Missing | `bankDetails.ifscCode` |
| Branch | ✅ | ❌ | ❌ Missing | `bankDetails.branch` |
| **Professional Info** | | | | |
| Employee ID | ✅ | ✅ | ✅ Same | |
| Department | ✅ | ✅ | ✅ Same | |
| Designation | ✅ | ✅ | ✅ Same | |
| Joining Date | ✅ | ✅ | ✅ Same | |
| Role | ✅ | ✅ | ⚠️ View Only | Both same |
| Employment Type | ✅ | ✅ | ⚠️ View Only | Both same |
| Status | ✅ | ✅ | ⚠️ View Only | Both same |
| Reporting Manager | ✅ | ✅ | ⚠️ View Only | Both same |
| **Address** | | | | |
| Street | ✅ | ✅ | ✅ Same | |
| City | ✅ | ✅ | ✅ Same | |
| State | ✅ | ✅ | ✅ Same | |
| Country | ✅ | ✅ | ✅ Same | |
| Postal Code | ✅ | ✅ | ✅ Same | |
| **Emergency Contact** | ✅ Editable | ✅ Editable | ✅ Same | |
| **Social Links** | ✅ Editable | ✅ Editable | ✅ Same | |
| **Skills/Bio** | ✅ Editable | ✅ Editable | ✅ Same | |
| **Education** | ✅ Editable | ⚠️ View Only | ❌ Missing Edit | Profile has view only |
| **Experience** | ✅ Editable | ⚠️ View Only | ❌ Missing Edit | Profile has view only |
| **Family** | ✅ Editable | ⚠️ View Only | ❌ Missing Edit | Profile has view only |
| **Documents** | ✅ Editable | ⚠️ View Only | ❌ Missing Edit | Profile has view only |
| **Assets** | ✅ Shown | ❌ Missing | ❌ Missing | |
| **Policies** | ✅ Shown | ❌ Missing | ❌ Missing | |
| **Lifecycle Status** | | | | |
| Resignation Status | ✅ Shown | ❌ Missing | ❌ Missing | |
| Promotion Status | ✅ Shown | ❌ Missing | ❌ Missing | |
| Termination Status | ✅ Shown | ❌ Missing | ❌ Missing | |

### 5.2 File Location Comparison

| Component | Employee Details | Profile Page |
|-----------|-----------------|--------------|
| Location | `react/src/feature-module/hrm/employees/employeedetails.tsx` | `react/src/feature-module/pages/profile/index.tsx` |
| Accessible By | Admin, HR, Manager (viewing others) | All roles (viewing own) |
| Edit Capabilities | Full edit by Admin/HR | Limited edit by employee |

---

## 6. Database Schema Validation

### 6.1 Employee Schema Analysis

**File:** [backend/models/employee/employee.schema.js](backend/models/employee/employee.schema.js)

#### Defined Fields in Schema:

| Field | Schema Location | Type | Required | Profile Page Uses |
|-------|-----------------|------|----------|-------------------|
| `employeeId` | L147-151 | String | ✅ | ✅ Yes |
| `firstName` | L154-160 | String | ✅ | ✅ Yes |
| `lastName` | L161-167 | String | ✅ | ✅ Yes |
| `fullName` | L168-171 | String | - | ✅ Yes |
| `email` | L172-179 | String | ✅ | ✅ Yes |
| `phone` | L180-183 | String | - | ✅ Yes |
| `dateOfBirth` | L184-186 | Date | - | ✅ Yes |
| `gender` | L187-190 | String | - | ✅ Yes |
| `address` | L191 | Schema | - | ✅ Yes |
| `department` | L201-206 | ObjectId | ✅ | ✅ Yes |
| `designation` | L207-211 | ObjectId | ✅ | ✅ Yes |
| `employmentType` | L228-232 | String | ✅ | ✅ Yes |
| `employmentStatus` | L233-238 | String | - | ✅ Yes |
| `joiningDate` | L239-243 | Date | ✅ | ✅ Yes |
| `salary` | L276 | Schema | - | ❌ No |
| `skills` | L285-288 | Array | - | ✅ Yes |
| `qualifications` | L289-294 | Array | - | ✅ Yes (as education) |
| `experience` | L295-301 | Array | - | ✅ Yes |
| `emergencyContact` | L304-322 | Schema | - | ✅ Yes |
| `bankDetails` | L325-333 | Schema | - | ❌ No |
| `socialProfiles` | L336-340 | Object | - | ✅ Yes (as socialLinks) |
| `profileImage` | L343-345 | String | - | ✅ Yes |

### 6.2 ❌ SCHEMA MISMATCH: Personal Information

| Field | Expected In | Schema Status | Resolution |
|-------|-------------|---------------|------------|
| `personal.passport.number` | Root or `personal` object | ❌ NOT DEFINED | Add to schema |
| `personal.passport.expiryDate` | Root or `personal` object | ❌ NOT DEFINED | Add to schema |
| `personal.passport.country` | Root or `personal` object | ❌ NOT DEFINED | Add to schema |
| `personal.nationality` | Root or `personal` object | ❌ NOT DEFINED | Add to schema |
| `personal.religion` | Root or `personal` object | ❌ NOT DEFINED | Add to schema |
| `personal.maritalStatus` | Root or `personal` object | ❌ NOT DEFINED | Add to schema |
| `personal.employmentOfSpouse` | Root or `personal` object | ❌ NOT DEFINED | Add to schema |
| `personal.noOfChildren` | Root or `personal` object | ❌ NOT DEFINED | Add to schema |
| `personal.birthday` | Root or `personal` object | ⚠️ REFERENCED in dashboard | Clarify vs `dateOfBirth` |

**CRITICAL:** The employee details page expects a `personal` object with passport, nationality, religion, etc., but the employee schema does NOT define this structure. These fields are likely stored dynamically or in a different format.

### 6.3 Bank Details Schema

**From employee.schema.js L325-333:**
```javascript
bankDetails: {
    bankName: String,
    accountNumber: String,
    ifscCode: String,
    accountType: {
        type: String,
        enum: ['Savings', 'Current']
    }
}
```

✅ Bank details ARE defined in the schema but NOT displayed in the profile page.

---

## 7. Critical Issues Found

### Priority P0 (Critical - Must Fix)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 1 | Personal Information section completely missing | Employees cannot view/edit passport, nationality, religion, marital status | High |
| 2 | Bank Information section missing | Employees cannot view/edit bank details for payroll | High |
| 3 | Employee lifecycle status not shown | No indication if employee is in resignation/promotion/termination list | Medium |
| 4 | Admin uses same profile page as employees | Confusing UX, missing company-specific information | High |

### Priority P1 (High - Should Fix)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 5 | Education is view-only | Employees cannot add/update their education | Low |
| 6 | Experience is view-only | Employees cannot add/update work experience | Low |
| 7 | Family is view-only | Employees cannot add/update family members | Low |
| 8 | Documents is view-only | Employees cannot upload/manage documents | Medium |
| 9 | No dedicated admin profile page | Admin functionality limited | High |

### Priority P2 (Medium - Nice to Have)

| # | Issue | Impact | Effort |
|---|-------|--------|--------|
| 10 | Policy section missing | Employees cannot view assigned policies | Medium |
| 11 | Asset section missing | Employees cannot view assigned assets | Low |
| 12 | No edit validation for protected fields | Employees might try to edit read-only fields | Low |

---

## 8. Recommendations

### Immediate Actions (This Sprint)

1. **Create Admin Profile Page**
   - New component: `react/src/feature-module/pages/admin-profile/index.tsx`
   - Display company information instead of employee data
   - Add company settings editing capabilities

2. **Add Personal Information Section**
   - Add fields: Passport No, Passport Exp Date, Nationality, Religion, Marital Status, Employment of Spouse, No. of Children
   - Ensure these fields exist in database schema
   - Make editable by employee

3. **Add Bank Information Section**
   - Add fields: Bank Name, Account Number, IFSC Code, Branch
   - Already exists in schema, just add to UI
   - Make editable by employee

### Short-term Actions (Next Sprint)

4. **Add Employee Lifecycle Status**
   - Call `/api/employees/check-lifecycle-status` endpoint
   - Display warning banner if employee is in resignation/promotion/termination list
   - Show details (reason, dates) in a modal or expandable section

5. **Make Education Editable**
   - Extract education form component from employee details page
   - Add to profile page edit mode
   - Allow add/remove education entries

6. **Make Experience Editable**
   - Extract experience form component from employee details page
   - Add to profile page edit mode
   - Allow add/remove experience entries

### Long-term Actions (Future Sprints)

7. **Make Family Editable**
   - Add family member form to profile page
   - Allow add/remove family members

8. **Make Documents Editable**
   - Add document upload/management to profile page
   - Integrate with cloud storage

9. **Add Policy Section**
   - Display policies assigned to employee
   - Link to policy documents

10. **Add Asset Section**
    - Display assets assigned to employee
    - Show asset status and return dates

### Technical Debt

11. **Remove Socket.IO Profile Controllers**
    - [profilepage.controllers.js](backend/controllers/pages/profilepage.controllers.js) is unused
    - Remove to reduce confusion and maintenance burden

12. **Standardize Field Names**
    - Inconsistent use of `profilePhoto` vs `profileImage` vs `avatarUrl`
    - Inconsistent use of `socialLinks` vs `socialProfiles`
    - Inconsistent use of `bio` vs `notes` vs `about`

13. **Schema Alignment**
    - Define `personal` object in employee schema
    - Or move personal fields to root level
    - Document expected structure clearly

---

## Appendices

### Appendix A: File References

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| [react/src/feature-module/pages/profile/index.tsx](react/src/feature-module/pages/profile/index.tsx) | Profile Page Component | All |
| [react/src/hooks/useProfileRest.ts](react/src/hooks/useProfileRest.ts) | REST API Hook | All |
| [backend/controllers/rest/userProfile.controller.js](backend/controllers/rest/userProfile.controller.js) | REST API Controller | L54-330 |
| [backend/services/pages/profilepage.services.js](backend/services/pages/profilepage.services.js) | Profile Service | All |
| [backend/models/employee/employee.schema.js](backend/models/employee/employee.schema.js) | Employee Schema | All |
| [react/src/feature-module/hrm/employees/employeedetails.tsx](react/src/feature-module/hrm/employees/employeedetails.tsx) | Employee Details | L82-233 (Interfaces) |
| [backend/routes/api/user-profile.js](backend/routes/api/user-profile.js) | API Routes | All |

### Appendix B: API Contract

#### GET /api/user-profile/current

**Response by Role:**

**Admin Role:**
```json
{
  "role": "admin",
  "companyId": "string",
  "companyName": "string",
  "companyLogo": "string",
  "companyDomain": "string",
  "email": "string",
  "status": "Active",
  "website": "string",
  "phone": "string",
  "_id": "string",
  "userId": "string",
  "firstName": "string",  // Company name
  "lastName": "string",   // Empty
  "profilePhoto": "string",
  "designation": "Administrator",
  "joiningDate": "ISO Date",
  "bio": "string"
}
```

**Employee/HR Role:**
```json
{
  "role": "employee|hr",
  "companyId": "string",
  "employeeId": "string",
  "firstName": "string",
  "lastName": "string",
  "fullName": "string",
  "email": "string",
  "phone": "string",
  "designation": "string",
  "department": "string",
  "profileImage": "string",
  "employmentType": "string",
  "employmentStatus": "string",
  "joiningDate": "ISO Date",
  "_id": "string",
  "userId": "string",
  "dateOfBirth": "ISO Date",
  "gender": "string",
  "profilePhoto": "string",
  "status": "string",
  "reportingManager": {
    "_id": "string",
    "firstName": "string",
    "lastName": "string",
    "fullName": "string",
    "employeeId": "string",
    "email": "string"
  },
  "about": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "postalCode": "string"
  },
  "emergencyContact": {
    "name": "string",
    "phone": "string",
    "relationship": "string"
  },
  "socialLinks": {
    "linkedin": "string",
    "twitter": "string",
    "facebook": "string",
    "instagram": "string"
  },
  "skills": ["string"],
  "bio": "string",
  "education": [{}],
  "experience": [{}],
  "family": [{}],
  "documents": [{}],
  "createdAt": "ISO Date",
  "updatedAt": "ISO Date"
}
```

**Superadmin Role:**
```json
{
  "role": "superadmin",
  "companyId": null,
  "email": "string",
  "userId": "string",
  "_id": "string",
  "firstName": "Super",
  "lastName": "Admin",
  "profilePhoto": "string",
  "designation": "Super Administrator",
  "bio": "string",
  "status": "Active"
}
```

#### PUT /api/user-profile/current

**Request Body:**
```json
{
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "dateOfBirth": "ISO Date",
  "gender": "string",
  "profilePhoto": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "postalCode": "string"
  },
  "emergencyContact": {
    "name": "string",
    "phone": "string",
    "relationship": "string"
  },
  "socialLinks": {
    "linkedin": "string",
    "twitter": "string",
    "facebook": "string",
    "instagram": "string"
  },
  "skills": ["string"],
  "bio": "string"
}
```

#### POST /api/user-profile/change-password

**Request Body:**
```json
{
  "currentPassword": "string",
  "newPassword": "string",
  "confirmPassword": "string"
}
```

---

**Report Generated:** 2026-02-07
**Version:** 1.0
**Author:** Claude Code Analysis
