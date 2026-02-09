# ROLE-BASED FIELD PERMISSIONS REPORT
## Profile Page - Editable vs Read-Only Fields by Role

**Date:** 2026-02-07
**Component:** Profile Page & Employee Details
**Purpose:** Define what fields can be edited by each role

---

## Table of Contents
1. [Role Definitions](#role-definitions)
2. [Permission Matrix - All Fields](#permission-matrix---all-fields)
3. [Role-Specific Permissions](#role-specific-permissions)
4. [Current Implementation Status](#current-implementation-status)
5. [Permission Enforcement Strategy](#permission-enforcement-strategy)

---

## 1. Role Definitions

| Role | Description | Hierarchy | Profile Access |
|------|-------------|-----------|----------------|
| **Superadmin** | Platform administrator | Level 5 | Own profile (basic) |
| **Admin** | Company administrator | Level 4 | Own profile (company view) + All employees |
| **HR** | Human Resources | Level 3 | Own profile + All employees |
| **Manager** | Department manager | Level 2 | Own profile + Department employees |
| **Employee** | Regular employee | Level 1 | Own profile only |
| **Lead** | Team lead | Level 2 | Own profile + Team members |

---

## 2. Permission Matrix - All Fields

### Legend
- ✅ **Full Edit** - Can add/edit/delete this field
- ✅ **Edit Own** - Can edit only for self, not others
- 👁️ **View Only** - Can view but not edit
- ❌ **Hidden** - Cannot view or edit
- 🔒 **Protected** - System field, no direct edit

### 2.1 Basic Information Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **EmployeeID** | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 👁️ | `employeeId` |
| 2 | **Avatar/Profile Photo** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `profilePhoto/avatarUrl` |
| 3 | **First Name** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `firstName` |
| 4 | **Last Name** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `lastName` |
| 5 | **Email** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ❌ | `email` |
| 6 | **Phone** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `phone` |
| 7 | **Date of Birth** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `dateOfBirth` |
| 8 | **Gender** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `gender` |

### 2.2 Personal Information Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **Passport No** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `personal.passport.number` |
| 2 | **Passport Exp Date** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `personal.passport.expiryDate` |
| 3 | **Nationality** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `personal.nationality` |
| 4 | **Religion** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `personal.religion` |
| 5 | **Marital Status** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `personal.maritalStatus` |
| 6 | **Employment of Spouse** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `personal.employmentOfSpouse` |
| 7 | **No. of Children** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `personal.noOfChildren` |

### 2.3 Professional Information Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **Date of Joining** | 🔒 | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | 👁️ | `joiningDate` |
| 2 | **Department** | 🔒 | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | 👁️ | `department` |
| 3 | **Designation** | 🔒 | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | 👁️ | `designation` |
| 4 | **Role** | 🔒 | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | 👁️ | `role` |
| 5 | **Employment Type** | 🔒 | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | 👁️ | `employmentType` |
| 6 | **Status** | 🔒 | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | 👁️ | `status/employmentStatus` |
| 7 | **Reporting Manager** | 🔒 | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | 👁️ | `reportingTo` |
| 8 | **Confirmation Date** | 🔒 | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | 👁️ | `confirmationDate` |
| 9 | **Resignation Date** | 🔒 | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ❌ | `resignationDate` |
| 10 | **Last Working Date** | 🔒 | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ❌ | `lastWorkingDate` |

### 2.4 Address Information Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **Street Address** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `address.street` |
| 2 | **City** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `address.city` |
| 3 | **State** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `address.state` |
| 4 | **Country** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `address.country` |
| 5 | **Postal Code** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `address.postalCode` |

### 2.5 Emergency Contact Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **Contact Name** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `emergencyContact.name` |
| 2 | **Contact Phone** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `emergencyContact.phone` |
| 3 | **Relationship** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `emergencyContact.relationship` |

### 2.6 Bank Information Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **Bank Name** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `bankDetails.bankName` |
| 2 | **Account Number** | ✅ Edit Own | 👁️ | 👁️ | ❌ | ❌ | ✅ Edit Own | `bankDetails.accountNumber` |
| 3 | **IFSC Code** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `bankDetails.ifscCode` |
| 4 | **Branch** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `bankDetails.branch` |
| 5 | **Account Type** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `bankDetails.accountType` |

**Note:** Account Number is masked (✅👁️) for Admin/HR - can verify but not see full number for security.

### 2.7 Social Links Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **LinkedIn** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `socialLinks.linkedin` |
| 2 | **Twitter** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `socialLinks.twitter` |
| 3 | **Facebook** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `socialLinks.facebook` |
| 4 | **Instagram** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `socialLinks.instagram` |

### 2.8 Skills and Bio

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **Skills** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `skills` |
| 2 | **Bio/About** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `bio/notes` |

### 2.9 Education Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **Degree** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `qualifications[].degree` |
| 2 | **Institution** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `qualifications[].institution` |
| 3 | **Year** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `qualifications[].year` |
| 4 | **Field** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `qualifications[].field` |

### 2.10 Experience Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **Company** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `experience[].company` |
| 2 | **Position** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `experience[].position` |
| 3 | **Start Date** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `experience[].startDate` |
| 4 | **End Date** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `experience[].endDate` |
| 5 | **Currently Working** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `experience[].current` |

### 2.11 Family Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **Name** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `family[].name` |
| 2 | **Relationship** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `family[].relationship` |
| 3 | **Phone** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | ❌ | ❌ | ✅ Edit Own | `family[].contact` |

### 2.12 Documents Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **Document Type** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `documents[].type` |
| 2 | **File Name** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `documents[].fileName` |
| 3 | **File URL** | ✅ Edit Own | ✅ Full Edit | ✅ Full Edit | 👁️ | 👁️ | ✅ Edit Own | `documents[].fileUrl` |

### 2.13 System/Protected Fields

| # | Field | Superadmin | Admin | HR | Manager | Lead | Employee | Backend Field |
|---|-------|------------|-------|----|---------|------|----------|---------------|
| 1 | **_id** | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `_id` |
| 2 | **userId** | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `userId/clerkUserId` |
| 3 | **companyId** | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `companyId` |
| 4 | **createdAt** | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `createdAt` |
| 5 | **updatedAt** | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `updatedAt` |
| 6 | **isDeleted** | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `isDeleted` |
| 7 | **createdBy** | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `createdBy` |
| 8 | **updatedBy** | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | 🔒 | `updatedBy` |

---

## 3. Role-Specific Permissions

### 3.1 Superadmin Permissions

**Profile Access:** Own profile (basic view)
**Employee Access:** None (platform-level only)

**Can Edit (Own Profile):**
```typescript
{
  // Basic Info
  firstName: true,
  lastName: true,
  email: true,
  phone: true,

  // Personal Info
  dateOfBirth: true,
  gender: true,

  // Address
  address: true,

  // Emergency Contact
  emergencyContact: true,

  // Social Links
  socialLinks: true,

  // Skills & Bio
  skills: true,
  bio: true,

  // Extended (if implemented)
  personal: true,  // passport, nationality, religion, etc.
  bankDetails: true,
  qualifications: true,
  experience: true,
  family: true,
  documents: true
}
```

### 3.2 Admin Permissions

**Profile Access:** Own profile (company view) + All employees
**Employee Access:** Full access to all company employees

**Can Edit (Own Profile - Company Info):**
```typescript
{
  companyName: true,
  companyLogo: true,
  phone: true,
  website: true,
  description: true,
  companySettings: true
}
```

**Can Edit (Any Employee):**
```typescript
{
  // Basic Info
  firstName: true,
  lastName: true,
  email: true,
  phone: true,

  // Personal Info
  dateOfBirth: true,
  gender: true,
  personal: {
    passport: true,
    nationality: true,
    religion: true,
    maritalStatus: true,
    employmentOfSpouse: true,
    noOfChildren: true
  },

  // Professional Info
  employeeId: true,
  department: true,
  designation: true,
  role: true,
  employmentType: true,
  status: true,
  reportingTo: true,
  joiningDate: true,
  confirmationDate: true,
  resignationDate: true,
  lastWorkingDate: true,

  // Address
  address: true,

  // Emergency Contact
  emergencyContact: true,

  // Bank Info
  bankDetails: {
    bankName: true,
    ifscCode: true,
    branch: true,
    accountType: true
  },
  // Note: accountNumber is view-only (masked)

  // Social Links
  socialLinks: true,

  // Skills & Bio
  skills: true,
  bio: true,

  // Extended
  qualifications: true,
  experience: true,
  family: true,
  documents: true
}
```

### 3.3 HR Permissions

**Profile Access:** Own profile + All employees
**Employee Access:** Full access to all company employees

**Can Edit (Same as Admin):**
```typescript
// HR has same edit permissions as Admin
// except cannot change company-level settings
```

### 3.4 Manager Permissions

**Profile Access:** Own profile + Department employees
**Employee Access:** View only department employees (can recommend changes but not edit directly)

**Can Edit (Own Profile):**
```typescript
{
  // Basic Info
  firstName: true,
  lastName: true,
  phone: true,
  // Note: email is read-only for employees

  // Personal Info
  dateOfBirth: true,
  gender: true,
  personal: {
    passport: true,
    nationality: true,
    religion: true,
    maritalStatus: true,
    employmentOfSpouse: true,
    noOfChildren: true
  },

  // Address
  address: true,

  // Emergency Contact
  emergencyContact: true,

  // Bank Info
  bankDetails: true,

  // Social Links
  socialLinks: true,

  // Skills & Bio
  skills: true,
  bio: true,

  // Extended
  qualifications: true,
  experience: true,
  family: true,
  documents: true
}
```

**Can View (Department Employees):**
```typescript
{
  // All fields are view-only
  // Can recommend changes via separate workflow
}
```

### 3.5 Lead Permissions

**Profile Access:** Own profile + Team members (same as Manager)
**Employee Access:** View only team members

**Same as Manager**

### 3.6 Employee Permissions

**Profile Access:** Own profile only
**Employee Access:** None

**Can Edit (Own Profile):**
```typescript
{
  // Basic Info
  firstName: true,
  lastName: true,
  phone: true,
  // Note: email is read-only for employees

  // Personal Info
  dateOfBirth: true,
  gender: true,
  personal: {
    passport: true,
    nationality: true,
    religion: true,
    maritalStatus: true,
    employmentOfSpouse: true,
    noOfChildren: true
  },

  // Address
  address: true,

  // Emergency Contact
  emergencyContact: true,

  // Bank Info
  bankDetails: true,

  // Social Links
  socialLinks: true,

  // Skills & Bio
  skills: true,
  bio: true,

  // Extended
  qualifications: true,
  experience: true,
  family: true,
  documents: true
}
```

**View Only (Own Profile):**
```typescript
{
  employeeId: true,
  email: true,  // Read-only
  department: true,
  designation: true,
  role: true,
  employmentType: true,
  status: true,
  reportingTo: true,
  joiningDate: true
}
```

---

## 4. Current Implementation Status

### 4.1 Profile Page Current Edit Permissions

**File:** [react/src/feature-module/pages/profile/index.tsx](react/src/feature-module/pages/profile/index.tsx)

| Field | Edit Mode Available | Role Check Implemented | Status |
|-------|---------------------|----------------------|--------|
| Basic Information | ✅ Yes | ❌ No (all authenticated users) | ⚠️ Open |
| Address | ✅ Yes | ❌ No | ⚠️ Open |
| Emergency Contact | ✅ Yes | ❌ No | ⚠️ Open |
| Social Links | ✅ Yes | ❌ No | ⚠️ Open |
| Skills/Bio | ✅ Yes | ❌ No | ⚠️ Open |
| Personal Information | ❌ No | - | ❌ Missing |
| Bank Information | ❌ No | - | ❌ Missing |
| Education | ❌ No | - | ❌ Missing |
| Experience | ❌ No | - | ❌ Missing |
| Family | ❌ No | - | ❌ Missing |
| Documents | ❌ No | - | ❌ Missing |

### 4.2 Backend Validation Status

**File:** [backend/controllers/rest/userProfile.controller.js](backend/controllers/rest/userProfile.controller.js)

**Current Update Logic (L337-622):**
```javascript
// Admin role - limited fields
if (user.role === 'admin') {
  allowedFields = ['phone', 'website', 'description'];
}

// HR and Employee roles - employee profile
if (user.role === 'hr' || user.role === 'employee') {
  // Can update these fields
  - firstName
  - lastName
  - dateOfBirth
  - gender
  - profilePhoto
  - about/bio
  - skills
  - phone
  - address
  - emergencyContact
  - socialLinks
}
```

**⚠️ WARNING:** Backend allows HR/Employee to update fields, but there is NO role-based field validation. Any authenticated user can update any field that's sent in the request.

---

## 5. Permission Enforcement Strategy

### 5.1 Frontend Permission Strategy

#### Step 1: Create Permission Configuration

**File:** `react/src/config/fieldPermissions.ts`

```typescript
export interface FieldPermission {
  view: boolean;
  edit: boolean;
}

export interface RolePermissions {
  [field: string]: FieldPermission;
}

export const FIELD_PERMISSIONS: Record<string, RolePermissions> = {
  superadmin: {
    // Basic Info
    firstName: { view: true, edit: true },
    lastName: { view: true, edit: true },
    email: { view: true, edit: true },
    phone: { view: true, edit: true },
    employeeId: { view: true, edit: false },

    // Personal Info
    dateOfBirth: { view: true, edit: true },
    gender: { view: true, edit: true },
    'personal.passport.number': { view: true, edit: true },
    'personal.nationality': { view: true, edit: true },
    'personal.religion': { view: true, edit: true },
    'personal.maritalStatus': { view: true, edit: true },
    'personal.employmentOfSpouse': { view: true, edit: true },
    'personal.noOfChildren': { view: true, edit: true },

    // Professional Info
    joiningDate: { view: true, edit: false },
    department: { view: false, edit: false },
    designation: { view: false, edit: false },
    role: { view: true, edit: false },
    employmentType: { view: false, edit: false },
    status: { view: false, edit: false },
    reportingTo: { view: false, edit: false },

    // Address
    'address.street': { view: true, edit: true },
    'address.city': { view: true, edit: true },
    'address.state': { view: true, edit: true },
    'address.country': { view: true, edit: true },
    'address.postalCode': { view: true, edit: true },

    // Emergency Contact
    'emergencyContact.name': { view: true, edit: true },
    'emergencyContact.phone': { view: true, edit: true },
    'emergencyContact.relationship': { view: true, edit: true },

    // Bank Info
    'bankDetails.bankName': { view: true, edit: true },
    'bankDetails.accountNumber': { view: true, edit: true },
    'bankDetails.ifscCode': { view: true, edit: true },
    'bankDetails.branch': { view: true, edit: true },

    // Social Links
    'socialLinks.linkedin': { view: true, edit: true },
    'socialLinks.twitter': { view: true, edit: true },
    'socialLinks.facebook': { view: true, edit: true },
    'socialLinks.instagram': { view: true, edit: true },

    // Skills & Bio
    skills: { view: true, edit: true },
    bio: { view: true, edit: true },

    // Extended
    qualifications: { view: true, edit: true },
    experience: { view: true, edit: true },
    family: { view: true, edit: true },
    documents: { view: true, edit: true }
  },

  admin: {
    // Admin has full edit on all employee fields
    // Same structure but with different permissions
  },

  hr: {
    // HR has full edit on all employee fields (same as admin)
  },

  manager: {
    // Manager has limited edit on own profile, view-only for team
  },

  lead: {
    // Lead has limited edit on own profile, view-only for team
  },

  employee: {
    // Employee has edit on own profile only
    // Professional fields are read-only
  }
};

export function canEditField(role: string, field: string): boolean {
  const rolePerms = FIELD_PERMISSIONS[role];
  if (!rolePerms) return false;

  const fieldPerms = rolePerms[field];
  if (!fieldPerms) return false;

  return fieldPerms.edit;
}

export function canViewField(role: string, field: string): boolean {
  const rolePerms = FIELD_PERMISSIONS[role];
  if (!rolePerms) return false;

  const fieldPerms = rolePerms[field];
  if (!fieldPerms) return false;

  return fieldPerms.view;
}
```

#### Step 2: Create Field Wrapper Component

**File:** `react/src/components/PermissionField.tsx`

```typescript
import React from 'react';
import { canEditField, canViewField } from '../config/fieldPermissions';
import { useAuth } from '../hooks/useAuth';

interface PermissionFieldProps {
  field: string;
  children: React.ReactNode;
  editMode?: boolean;
  fallback?: React.ReactNode;
}

export const PermissionField: React.FC<PermissionFieldProps> = ({
  field,
  children,
  editMode = false,
  fallback = null
}) => {
  const { role } = useAuth();

  if (editMode) {
    if (!canEditField(role, field)) {
      return <>{fallback}</>;
    }
  } else {
    if (!canViewField(role, field)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
};
```

### 5.2 Backend Permission Strategy

#### Step 1: Create Field Validation Middleware

**File:** `backend/middleware/validateFieldPermissions.js`

```javascript
import { extractUser } from '../utils/apiResponse.js';

const FIELD_PERMISSIONS = {
  superadmin: {
    // Can edit own basic info
    editable: ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'gender',
               'address', 'emergencyContact', 'bankDetails', 'socialLinks',
               'skills', 'bio', 'personal', 'qualifications', 'experience',
               'family', 'documents'],
    ownOnly: true
  },

  admin: {
    editable: ['*'], // All fields
    ownOnly: false
  },

  hr: {
    editable: ['*'], // All fields
    ownOnly: false
  },

  manager: {
    editable: ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender',
               'personal', 'address', 'emergencyContact', 'bankDetails',
               'socialLinks', 'skills', 'bio', 'qualifications', 'experience',
               'family', 'documents'],
    ownOnly: true
  },

  employee: {
    editable: ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender',
               'personal', 'address', 'emergencyContact', 'bankDetails',
               'socialLinks', 'skills', 'bio', 'qualifications', 'experience',
               'family', 'documents'],
    ownOnly: true
  }
};

export const validateFieldPermissions = (req, res, next) => {
  const user = extractUser(req);
  const permissions = FIELD_PERMISSIONS[user.role];

  if (!permissions) {
    return res.status(403).json({
      success: false,
      error: 'Role not recognized'
    });
  }

  // If editing own profile
  if (permissions.ownOnly && req.params.id !== user.userId) {
    return res.status(403).json({
      success: false,
      error: 'You can only edit your own profile'
    });
  }

  // Filter fields based on permissions
  if (!permissions.editable.includes('*')) {
    const updateData = req.body;
    const sanitizedData = {};

    for (const field of permissions.editable) {
      if (updateData[field] !== undefined) {
        sanitizedData[field] = updateData[field];
      }
    }

    // Handle nested fields
    if (updateData.address) {
      const hasAddressPermission = permissions.editable.some(f => f.startsWith('address'));
      if (hasAddressPermission) {
        sanitizedData.address = updateData.address;
      }
    }

    // Similar for other nested objects...

    req.body = sanitizedData;
  }

  next();
};
```

#### Step 2: Apply to Routes

**File:** `backend/routes/api/user-profile.js`

```javascript
import { validateFieldPermissions } from '../../middleware/validateFieldPermissions.js';

router.put(
  '/current',
  authenticate,
  validateFieldPermissions,
  updateCurrentUserProfile
);
```

---

## 6. Implementation Checklist

### Phase 1: Permission Configuration
- [ ] Create `fieldPermissions.ts` configuration file
- [ ] Define all fields and their permissions per role
- [ ] Create utility functions `canEditField()` and `canViewField()`
- [ ] Write unit tests for permission logic

### Phase 2: Frontend Components
- [ ] Create `PermissionField` wrapper component
- [ ] Create `PermissionSection` wrapper component
- [ ] Update profile page to use permission wrappers
- [ ] Add role-based conditional rendering

### Phase 3: Backend Validation
- [ ] Create `validateFieldPermissions` middleware
- [ ] Apply middleware to profile update routes
- [ ] Add unit tests for middleware
- [ ] Test with different roles

### Phase 4: Integration & Testing
- [ ] Test all roles in profile page
- [ ] Test direct API calls with different roles
- [ ] Verify frontend/backend alignment
- [ ] Document any edge cases

---

## 7. Security Considerations

### Sensitive Fields Handling

| Field | Sensitivity | Display Rule | Edit Rule |
|-------|-------------|--------------|-----------|
| `bankDetails.accountNumber` | HIGH | Masked: `XXXX-XXXX-XXXX-1234` | Full edit only by owner |
| `personal.passport.number` | HIGH | Full view for Admin/HR | Full edit by owner/Admin/HR |
| `email` | MEDIUM | Full view | Read-only for Employee |
| `phone` | LOW | Full view | Editable by owner |
| `salary` | HIGH | Hidden from profile page | Edit by Admin/HR only |
| `performance` | HIGH | Hidden from profile page | Edit by Admin/HR only |

### Audit Trail

All updates to profile fields should log:
```javascript
{
  timestamp: ISO Date,
  userId: string,
  targetEmployeeId: string,
  role: string,
  fieldsChanged: string[],
  previousValues: object,
  newValues: object,
  ipAddress: string
}
```

---

**Report Generated:** 2026-02-07
**Version:** 1.0
