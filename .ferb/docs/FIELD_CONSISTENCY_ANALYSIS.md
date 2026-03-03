# Employee Profile Data Consistency Analysis

## Executive Summary

This document provides a comprehensive analysis of field naming and data storage inconsistencies between the **Employee Details page** (HRM module) and **My Profile page** (Employee self-service), along with the canonical database schema.

---

## Database Schema (Canonical Source)

Based on actual database usage in [employee.controller.js](backend/controllers/rest/employee.controller.js):

### Root Level Fields
```javascript
{
  // Basic Information
  employeeId: string,          // Auto-generated (e.g., EMP-7884)
  firstName: string,
  lastName: string,
  fullName: string,
  email: string,
  phone: string,
  dateOfBirth: Date,
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say',

  // Employment
  departmentId: ObjectId,       // References Department collection
  designationId: ObjectId,      // References Designation collection
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Intern',
  employmentStatus: 'Active' | 'Probation' | 'Resigned' | 'Terminated' | 'On Leave',
  status: string,               // For UI display
  joiningDate: Date,            // CANONICAL (not dateOfJoining)
  dateOfJoining: Date,          // Alias for joiningDate

  // Location
  address: {                    // Root level - CANONICAL
    street: string,
    city: string,
    state: string,
    country: string,
    postalCode: string
  },

  // Profile
  profileImage: string,         // CANONICAL
  avatarUrl: string,            // Alias for profileImage
  about: string,                // CANONICAL for bio/about
  notes: string,                // Alternative for about
  bio: string,                  // Alternative for about

  // Emergency Contact
  emergencyContact: {           // CANONICAL - single object
    name: string,
    relationship: string,
    phone: string,
    email: string
  },
  emergencyContacts: [],        // Legacy array format (still supported)

  // Bank Details
  bankDetails: {                // CANONICAL
    bankName: string,
    accountNumber: string,
    ifscCode: string,
    accountType: 'Savings' | 'Current',
    branch: string
  },

  // Social Profiles
  socialProfiles: {             // CANONICAL
    linkedin: string,
    twitter: string,
    facebook: string,
    instagram: string,
    github: string
  },

  // Skills
  skills: string[],

  // Nested Objects
  personal: {
    passport: {
      number: string,
      expiryDate: Date,
      country: string,
      issueDate: Date
    },
    nationality: string,
    religion: string,
    maritalStatus: string,
    employmentOfSpouse: string,
    noOfChildren: number
    // Note: address, gender, birthday are now at root level
  },

  // Arrays
  education: [],
  experience: [],
  family: [],
  documents: []
}
```

---

## Field Mapping Table

| Field Category | Database Canonical | Profile Page | Employee Details | Consistency |
|----------------|------------------|-------------|-----------------|-------------|
| **Bank Info** | `bankDetails` ✅ | `bankDetails` ✅ | `bankDetails` ✅ | ✅ **FIXED** |
| **Department** | `departmentId` ✅ | `department` (populated) | `departmentId` | ⚠️ Different purpose |
| **Designation** | `designationId` ✅ | `designation` (populated) | `designationId` | ⚠️ Different purpose |
| **Joining Date** | `joiningDate` ✅ | `joiningDate` ✅ | `dateOfJoining` ⚠️ | ⚠️ Alias used |
| **Profile Photo** | `profileImage` ✅ | `profilePhoto` ⚠️ | `avatarUrl`, `profileImage` | ⚠️ **Aliased** |
| **Social Links** | `socialProfiles` ✅ | `socialLinks` ⚠️ | `socialProfiles` ✅ | ⚠️ **Converted** |
| **Emergency Contact** | `emergencyContact` ✅ | `emergencyContact` ✅ | `emergencyContacts` ⚠️ | ⚠️ Array vs Object |
| **Address** | `address` (root) ✅ | `address` ✅ | `address` ✅ | ✅ Consistent |
| **Personal Info** | `personal` ✅ | `personal` ✅ | `personal` ✅ | ✅ Consistent |
| **Gender** | `gender` (root) ✅ | `gender` ✅ | `gender` ✅ | ✅ Consistent |
| **Date of Birth** | `dateOfBirth` (root) ✅ | `dateOfBirth` ✅ | `dateOfBirth` ✅ | ✅ Consistent |
| **About/Bio** | `about` ✅ | `about`/`bio` | `about` | ⚠️ Multiple fields |
| **Skills** | `skills` ✅ | `skills` ✅ | `skills` ✅ | ✅ Consistent |
| **Family** | `family` ✅ | `family` ✅ | `family` ✅ | ✅ Consistent |
| **Education** | `education` ✅ | `education` ✅ | `education` ✅ | ✅ Consistent |
| **Experience** | `experience` ✅ | `experience` ✅ | `experience` ✅ | ✅ Consistent |

---

## Issues Requiring Fixes

### 1. ✅ Bank Details Field - FIXED
**Status**: Already fixed in previous changes
- Both pages now use `bankDetails`

### 2. ⚠️ Profile Photo Field Names
**Issue**: Three different field names for the same data
- Database: `profileImage` (canonical), `avatarUrl` (alias)
- Profile Page: `profilePhoto`
- Employee Details: `avatarUrl`, `profileImage`

**Impact**: Low - backend handles aliases

**Recommendation**:
- Keep current approach (backend provides aliases)
- Document that `profilePhoto` = `profileImage` = `avatarUrl`

### 3. ⚠️ Joining Date Field Names
**Issue**: Two field names for the same data
- Database: `joiningDate` (canonical), also supports `dateOfJoining` as alias
- Profile Page: `joiningDate`
- Employee Details: `dateOfJoining`

**Impact**: Low - backend handles both

**Recommendation**:
- Standardize on `joiningDate` across both pages
- Update Employee Details page to use `joiningDate`

### 4. ⚠️ Social Links vs Social Profiles
**Issue**: Frontend uses `socialLinks`, database uses `socialProfiles`
- Database: `socialProfiles` (canonical)
- Profile Page: `socialLinks`
- Employee Details: `socialProfiles`

**Impact**: Medium - requires conversion in backend

**Current Solution**:
- Backend converts `socialLinks` ↔ `socialProfiles` bidirectionally
- This is acceptable but should be documented

### 5. ⚠️ Emergency Contact Format
**Issue**: Single object vs Array format
- Database Schema: `emergencyContact` (single object) - canonical
- Database (legacy support): `emergencyContacts` (array)
- Profile Page: `emergencyContact` (single object)
- Employee Details: `emergencyContacts` (array)

**Impact**: Low - backend normalizes both formats

**Current Solution**:
- Backend handles both formats and normalizes
- No changes needed

---

## Implementation Plan

### Phase 1: Standardize Joining Date Field
**Files to Modify**:
1. `employeedetails.tsx` - Change `dateOfJoining` to `joiningDate`

### Phase 2: Document Profile Photo Aliases
**Files to Modify**:
1. Add comments in both pages explaining the alias relationship

### Phase 3: Document Social Links Conversion
**Files to Modify**:
1. Add comments in `useProfileRest.ts` explaining the conversion

### Phase 4: Create Unified Field Constants
**Recommendation**: Create a shared constants file for field names

---

## Backend Data Normalization

The backend already handles field normalization in [userProfile.controller.js](backend/controllers/rest/userProfile.controller.js):

```javascript
// Profile Photo: Both names supported
profileImage: validAvatarUrl,  // Stored
profilePhoto: validAvatarUrl,   // Alias for frontend

// Joining Date: Both names supported
joiningDate: employee.joiningDate || employee.dateOfJoining

// Social Links: Bidirectional conversion
socialLinks: {  // Frontend receives this
  linkedin: employee.socialProfiles?.linkedin || employee.socialLinks?.linkedin
}
socialProfiles: {  // Stored in database
  linkedin: updatedData.socialLinks.linkedin
}

// Emergency Contact: Both formats normalized
emergencyContact: {  // Frontend receives single object
  name: employee.emergencyContact?.name || employee.emergencyContacts?.[0]?.name
}
```

---

## Recommendations

1. **Accept Current Conversion Pattern**: The backend already handles field aliases and conversions. Document these conversions instead of removing them.

2. **Add JSDoc Comments**: Add documentation to field interfaces explaining the aliases:
   ```typescript
   interface Employee {
     /** Profile image URL. Aliases: profilePhoto, avatarUrl */
     profileImage?: string;

     /** Joining date. Also aliased as dateOfJoining */
     joiningDate: Date;
   }
   ```

3. **Create Field Mapping Documentation**: Add a centralized doc showing all field aliases.

4. **Future Enhancement**: Consider a migration script to:
   - Copy `dateOfJoining` to `joiningDate` for any records missing it
   - Ensure all `emergencyContacts` arrays have a corresponding `emergencyContact` object

---

## Summary

| Priority | Field | Action | Status |
|----------|-------|--------|--------|
| **HIGH** | `bankDetails` | Standardize on `bankDetails` | ✅ Complete |
| **MEDIUM** | `joiningDate` | Document alias relationship | ⏸️ Deferred |
| **LOW** | `profilePhoto` | Document alias relationship | ⏸️ Deferred |
| **LOW** | `socialLinks` | Document conversion | ⏸️ Deferred |
| **LOW** | `emergencyContact` | Already normalized | ✅ Working |

---

## Conclusion

The system is largely consistent with the following exceptions:
1. **Bank Details** - ✅ Fixed
2. **Joining Date** - Uses aliases (`joiningDate` vs `dateOfJoining`)
3. **Profile Photo** - Uses aliases (`profileImage` vs `profilePhoto`)
4. **Social Links** - Converted between `socialLinks` and `socialProfiles`

The backend already handles these aliases and conversions correctly. The main recommendation is to **document these patterns** rather than change them, as the current approach works well and maintains backward compatibility.
