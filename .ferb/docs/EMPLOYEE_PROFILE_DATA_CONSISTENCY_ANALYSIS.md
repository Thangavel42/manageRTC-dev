# Employee Profile Data Structure Consistency Analysis

**Date:** 2026-02-26
**Analyzed Files:**
- `react/src/feature-module/hrm/employees/employeedetails.tsx` (HR Admin View)
- `react/src/feature-module/pages/profile/index.tsx` (Employee Self-Service View)
- `backend/models/employee/employee.schema.js` (Database Schema)
- `backend/controllers/rest/userProfile.controller.js` (API Controller)

---

## Executive Summary

The employee profile data is stored with **inconsistent field names and structures** between:
1. **HR Admin View** (`employeedetails.tsx`) - Uses legacy field names
2. **Employee Self-Service View** (`profile/index.tsx`) - Uses newer field names
3. **Database Schema** (`employee.schema.js`) - Source of truth

**Root Cause:** The codebase has evolved over time, with newer features using consistent field names (`bankDetails`, `personal.*`) while older HR admin views still use legacy field names (`bank`, root-level fields).

---

## Critical Data Structure Gaps

### 1. Bank Details (CRITICAL - Different Structure)

| Location | Field Path | Notes |
|----------|-----------|-------|
| **Schema** | `bankDetails.bankName` | ✅ Source of Truth |
| **Schema** | `bankDetails.accountNumber` | ✅ Source of Truth |
| **Schema** | `bankDetails.ifscCode` | ✅ Source of Truth |
| **Schema** | `bankDetails.accountType` | ✅ Source of Truth (Savings/Current) |
| **Schema** | ❌ NO `branch` field | ⚠️ MISSING |
| **Schema** | ❌ NO `accountHolderName` field | ⚠️ MISSING (derived from firstName + lastName) |
| **Profile Page** | `bankDetails.*` | ✅ Matches schema |
| **Employee Details** | `bank.bankName` | ❌ Uses `bank` not `bankDetails` |
| **Employee Details** | `bank.branch` | ⚠️ Field doesn't exist in schema |

**Impact:** Bank details saved from HR admin view are stored under `bank` prefix, while profile page saves under `bankDetails`. This creates two separate storage locations.

---

### 2. Emergency Contact (CRITICAL - Different Structure)

| Location | Field Path | Type | Notes |
|----------|-----------|------|-------|
| **Schema** | `emergencyContact.name` | string | ✅ Source of Truth |
| **Schema** | `emergencyContact.phone` | string | ✅ Single phone number |
| **Schema** | `emergencyContact.relationship` | string | ✅ Source of Truth |
| **Profile Page** | `emergencyContact.phone` | string | ✅ Matches schema |
| **Employee Details** | `emergencyContacts` | array | ❌ Uses array format |
| **Employee Details** | `emergencyContacts[0].phone` | string[] | ❌ Phone as array |

**Impact:** Employee details stores emergency contact as array with phone as array `[phone1, phone2]`, while schema expects single object with single phone string.

---

### 3. Personal Information (CRITICAL - Nested vs Flat)

| Location | Field Path | Notes |
|----------|-----------|-------|
| **Schema** | `personal.maritalStatus` | ✅ Nested under `personal` |
| **Schema** | `personal.noOfChildren` | ✅ Nested under `personal` |
| **Schema** | `personal.passport.number` | ✅ Nested under `personal.passport` |
| **Schema** | `personal.nationality` | ✅ Nested under `personal` |
| **Schema** | `personal.religion` | ✅ Nested under `personal` |
| **Profile Page** | `personal.*` | ✅ Matches schema |
| **Employee Details** | `maritalStatus` (root) | ❌ Flat structure |
| **Employee Details** | `noOfChildren` (root) | ❌ Flat structure |

**Impact:** HR admin view stores personal info at root level, creating duplicate/misplaced data.

---

### 4. Social Links (MISMATCH - Different Field Names)

| Location | Field Path | Notes |
|----------|-----------|-------|
| **Schema** | `socialProfiles.linkedin` | ✅ Source of Truth |
| **Schema** | `socialProfiles.twitter` | ✅ Source of Truth |
| **Schema** | `socialProfiles.github` | ✅ Source of Truth |
| **Schema** | ❌ NO `facebook` | ⚠️ MISSING |
| **Schema** | ❌ NO `instagram` | ⚠️ MISSING |
| **Profile Page** | `socialLinks.linkedin` | ⚠️ Uses `socialLinks` not `socialProfiles` |
| **Profile Page** | `socialLinks.facebook` | ⚠️ Field doesn't exist in schema |
| **Profile Page** | `socialLinks.instagram` | ⚠️ Field doesn't exist in schema |

**Impact:** Profile page uses `socialLinks` with facebook/instagram, but schema defines `socialProfiles` with github.

---

### 5. Address (CORRECT)

| Location | Field Path | Notes |
|----------|-----------|-------|
| **Schema** | `address.street` | ✅ |
| **Schema** | `address.city` | ✅ |
| **Schema** | `address.state` | ✅ |
| **Schema** | `address.country` | ✅ |
| **Schema** | `address.postalCode` | ✅ |
| **Profile Page** | `address.*` | ✅ Matches schema |
| **Employee Details** | `address.*` | ✅ Matches schema |

**Status:** ✅ **CONSISTENT** - No changes needed.

---

### 6. Other Notable Differences

| Field | Schema | Profile Page | Employee Details | Status |
|-------|--------|--------------|------------------|--------|
| Profile Image | `profileImage` | `profilePhoto` / `profileImage` | `avatarUrl` / `profileImage` | ⚠️ 3 different names |
| Date of Birth | `dateOfBirth` (Date) | `dateOfBirth` | `dateOfBirth` / `birthday` | ⚠️ Mixed |
| Joining Date | `joiningDate` (Date) | `joiningDate` | `dateOfJoining` | ⚠️ Two names |
| Employment Status | `employmentStatus` | `status` | `status` | ⚠️ Two names |
| Notes | `notes` | `about` | `about` | ⚠️ Two names |

---

## Database Schema Definition (Source of Truth)

From `backend/models/employee/employee.schema.js`:

```javascript
// Bank Details (lines 381-390)
bankDetails: {
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  accountType: { type: String, enum: ['Savings', 'Current'] }
  // NOTE: 'branch' field does NOT exist in schema
  // NOTE: 'accountHolderName' does NOT exist (use firstName + lastName)
}

// Emergency Contact (lines 361-379)
emergencyContact: {
  name: { type: String, trim: true },
  relationship: { type: String, trim: true },
  phone: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true }
}

// Personal Information (lines 44-86)
personal: {
  passport: {
    number: String,
    expiryDate: Date,
    country: String
  },
  nationality: String,
  religion: String,
  maritalStatus: {
    type: String,
    enum: ['Single', 'Married', 'Divorced', 'Widowed', 'Other'],
    default: 'Single'
  },
  noOfChildren: { type: Number, default: 0, min: 0, max: 50 }
}

// Social Profiles (lines 392-397)
socialProfiles: {
  linkedin: String,
  github: String,
  twitter: String
  // NOTE: 'facebook' and 'instagram' do NOT exist
}

// Address (lines 12-38)
address: {
  street: String,
  city: String,
  state: String,
  country: String,
  postalCode: String
}
```

---

## Implementation Plan

### Phase 1: Schema Update (Required for Missing Fields)

**File:** `backend/models/employee/employee.schema.js`

**Changes needed:**

1. **Add `branch` to bankDetails:**
```javascript
bankDetails: {
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  branch: String,        // ADD THIS
  accountType: { type: String, enum: ['Savings', 'Current', 'Salary'] }
}
```

2. **Add `accountHolderName` to bankDetails:**
```javascript
bankDetails: {
  accountHolderName: String,  // ADD THIS (optional, can be derived)
  // ... other fields
}
```

3. **Expand socialProfiles to match frontend:**
```javascript
socialProfiles: {
  linkedin: String,
  twitter: String,
  facebook: String,    // ADD THIS
  instagram: String,   // ADD THIS
  github: String
}
```

4. **Add `email` to emergencyContact** (already in schema, ensure frontend uses it)

---

### Phase 2: Frontend - Profile Page Alignment

**File:** `react/src/feature-module/pages/profile/index.tsx`

**Changes needed:**

1. **Change `socialLinks` to `socialProfiles`:**
   - Search/replace `socialLinks` → `socialProfiles`
   - Update form field names: `socialProfiles.linkedin`, etc.

2. **Verify bank details form uses correct schema:**
   - Currently using `bankDetails.*` ✅ (correct)
   - Ensure `branch` field is included when schema is updated

---

### Phase 3: Frontend - Employee Details Page Alignment

**File:** `react/src/feature-module/hrm/employees/employeedetails.tsx`

**Changes needed:**

1. **Change `bank` to `bankDetails`:**
```javascript
// BEFORE (line 343-349)
const [bankFormData, setBankFormData] = useState({
  accountHolderName: '',
  bankName: '',
  accountNumber: '',
  ifscCode: '',
  branch: '',
});

// Form fields use: bank.bankName, bank.accountNumber, etc.
// Backend API call: employeesREST.updateBankDetails(employee._id, bankData)

// AFTER
// Update all references from `bank` to `bankDetails`
// Update backend API to save under `bankDetails` instead of `bank`
```

2. **Change `emergencyContacts` array to `emergencyContact` object:**
```javascript
// BEFORE (lines 369-375)
const [emergencyFormData, setEmergencyFormData] = useState({
  name: '',
  relationship: '',
  phone1: '',
  phone2: '',
});

// Storage as array:
const emergencyContacts = [{
  name: emergencyFormData.name,
  relationship: emergencyFormData.relationship,
  phone: [emergencyFormData.phone1, emergencyFormData.phone2],
}];

// AFTER
const [emergencyFormData, setEmergencyFormData] = useState({
  name: '',
  relationship: '',
  phone: '',  // Single phone
  email: '',  // Add email field
});

// Storage as object:
const emergencyContact = {
  name: emergencyFormData.name,
  relationship: emergencyFormData.relationship,
  phone: emergencyFormData.phone,
  email: emergencyFormData.email,
};
```

3. **Change root-level personal fields to nested `personal`:**
```javascript
// BEFORE (lines 355-358)
const [personalFormData, setPersonalFormData] = useState({
  maritalStatus: 'Select',
  noOfChildren: 0,
});

// SAVING to: { maritalStatus, noOfChildren } at root level

// AFTER
const [personalFormData, setPersonalFormData] = useState({
  maritalStatus: 'Select',
  noOfChildren: 0,
  nationality: '',
  religion: '',
});

// SAVING to: { personal: { maritalStatus, noOfChildren, nationality, religion } }
```

---

### Phase 4: Backend API Update

**Files to update:**
- `backend/controllers/rest/userProfile.controller.js` - Ensure consistency
- `backend/services/employees/` - Update employee update service

**Changes needed:**

1. **Handle both old and new field names for migration:**
```javascript
// In updateCurrentUserProfile or similar function
const updateData = {
  // Always use new structure
  bankDetails: data.bankDetails || data.bank,  // Migrate old to new
  emergencyContact: data.emergencyContact || data.emergencyContacts?.[0],  // Migrate
  personal: data.personal || {
    maritalStatus: data.maritalStatus,
    noOfChildren: data.noOfChildren,
    // ... other fields
  }
};
```

2. **Update employee update endpoints to normalize data:**
   - Convert `bank` → `bankDetails`
   - Convert `emergencyContacts` → `emergencyContact`
   - Convert root-level personal fields → `personal.*`

---

### Phase 5: Data Migration Script

**Create:** `backend/seed/migrateEmployeeProfileFields.js`

```javascript
/**
 * Migrate employee profile fields to match schema
 * - bank → bankDetails
 * - emergencyContacts → emergencyContact
 * - root-level personal fields → personal.*
 * - socialLinks → socialProfiles
 */

import { getTenantCollections } from '../config/db.js';

export async function migrateEmployeeProfileFields(companyId) {
  const collections = getTenantCollections(companyId);

  const employees = await collections.employees.find({}).toArray();

  for (const employee of employees) {
    const updates = {};

    // Migrate bank → bankDetails
    if (employee.bank && !employee.bankDetails) {
      updates.bankDetails = {
        bankName: employee.bank.bankName,
        accountNumber: employee.bank.accountNumber,
        ifscCode: employee.bank.ifscCode,
        branch: employee.bank.branch || '',
        accountType: employee.bank.accountType || 'Savings',
        accountHolderName: employee.bank.accountHolderName ||
          `${employee.firstName} ${employee.lastName}`.trim()
      };
      updates.$unset = { bank: '' };
    }

    // Migrate emergencyContacts → emergencyContact
    if (employee.emergencyContacts && !employee.emergencyContact) {
      const contact = Array.isArray(employee.emergencyContacts)
        ? employee.emergencyContacts[0]
        : employee.emergencyContacts;

      if (contact) {
        updates.emergencyContact = {
          name: contact.name,
          relationship: contact.relationship,
          phone: Array.isArray(contact.phone) ? contact.phone[0] : contact.phone,
          email: contact.email || ''
        };
        updates.$unset = { ...updates.$unset, emergencyContacts: '' };
      }
    }

    // Migrate root-level personal fields → personal.*
    if (!employee.personal) {
      const personal = {};
      let needsMigration = false;

      if (employee.maritalStatus) {
        personal.maritalStatus = employee.maritalStatus;
        needsMigration = true;
      }
      if (employee.noOfChildren !== undefined) {
        personal.noOfChildren = employee.noOfChildren;
        needsMigration = true;
      }
      if (employee.nationality) {
        personal.nationality = employee.nationality;
        needsMigration = true;
      }

      if (needsMigration) {
        updates.personal = personal;
        updates.$unset = { ...updates.$unset,
          maritalStatus: '', noOfChildren: '', nationality: ''
        };
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await collections.employees.updateOne(
        { _id: employee._id },
        updates
      );
    }
  }

  console.log(`Migrated ${employees.length} employees`);
}
```

---

## Priority Ranking

| Priority | Issue | Impact | Effort |
|----------|-------|--------|--------|
| 🔴 **P0** | Bank: `bank` vs `bankDetails` | Data saved to wrong location | Medium |
| 🔴 **P0** | Emergency: array vs object | Data structure mismatch | Medium |
| 🟡 **P1** | Personal: root vs nested | Data saved to wrong location | Low |
| 🟡 **P1** | Social: `socialLinks` vs `socialProfiles` | Field name mismatch | Low |
| 🟢 **P2** | Profile image: 3 different names | Confusion but works | Low |
| 🟢 **P2** | Date/Status aliases | Already handled by API | Low |

---

## Testing Checklist

After implementing changes:

- [ ] HR can save bank details from employee details page
- [ ] Employee can view/edit bank details from profile page
- [ ] Both pages show same bank data
- [ ] Emergency contact saves correctly from both pages
- [ ] Personal info (marital status, children) saves correctly
- [ ] Social links save and display correctly
- [ ] Address continues to work (no regression)
- [ ] Migration script successfully converts existing data
- [ ] No data loss during migration

---

## Summary

The root cause is **evolutionary code development** where newer features (profile page) use the schema-defined structure, while older features (HR employee details) use legacy field names that don't match the current schema.

**Recommended Approach:**
1. Update schema to include missing fields
2. Update employee details page to match schema
3. Create migration script for existing data
4. Update backend APIs to handle both old/new during transition
