# Employee Data Flow Analysis Report

**Generated:** 2026-03-05
**Version:** 1.0
**Analysis Scope:** All employee-related frontend pages, backend controllers, database schema, and Clerk integration

---

## Executive Summary

This report provides a comprehensive analysis of how employee data flows through the manageRTC system across different pages, the database, and Clerk authentication. The analysis reveals several important findings:

### Key Findings
1. **Dual Role Storage**: Role is stored in BOTH `account.role` and root-level `role` fields
2. **Clerk Sync Issue**: Role changes in the database are NOT synced to Clerk `publicMetadata.role`
3. **Multiple Date Field Names**: Joining date uses both `dateOfJoining` (frontend) and `joiningDate` (backend)
4. **Inconsistent Department/Designation Fields**: Both ID strings and ObjectIds are used
5. **Password Storage**: Passwords are stored in MongoDB (for reference) but authentication uses Clerk

### Critical Issues Found
| Issue | Severity | Impact |
|-------|----------|--------|
| Role not synced to Clerk on update | 🔴 HIGH | Role changes don't affect user's actual permissions |
| Dual role storage causes confusion | 🟡 MEDIUM | Data inconsistency between fields |
| Password reset doesn't update Clerk | 🟡 MEDIUM | Clerk password remains unchanged on reset |

---

## Table of Contents

1. [Database Schema Analysis](#database-schema-analysis)
2. [Page-to-Field Mapping Table](#page-to-field-mapping-table)
3. [Role Storage & Clerk Sync Issue](#role-storage--clerk-sync-issue)
4. [Password Reset Flow Analysis](#password-reset-flow-analysis)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Field Name Inconsistencies](#field-name-inconsistencies)
7. [Recommendations](#recommendations)

---

## Database Schema Analysis

### Employee Collection Structure

The `employees` collection uses the following schema ([employee.schema.js](backend/models/employee/employee.schema.js)):

#### Core Identity Fields
| Field | Type | Required | Indexed | Notes |
|-------|------|----------|---------|-------|
| `_id` | ObjectId | Auto | ✅ | Primary key |
| `employeeId` | String | ✅ | ✅ | Format: EMP-XXXX (auto-generated) |
| `clerkUserId` | String | ❌ | ✅ | Clerk user ID (sparse unique) |
| `firstName` | String | ✅ | ❌ | 2-50 chars |
| `lastName` | String | ✅ | ❌ | 2-50 chars |
| `fullName` | String | ❌ | ❌ | Computed from first+last |
| `email` | String | ✅ | ❌ | Validated format |
| `phone` | String | ❌ | ❌ | Phone number |
| `phoneCode` | String | ❌ | ❌ | Default: +1 |

#### Authentication & Authorization
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `account.userName` | String | ❌ | Login username |
| `account.password` | String | ❌ | **⚠️ Stored for reference only** |
| `account.role` | String | ❌ | **⚠️ Role (lowercase)** |
| `role` | String | ❌ | **⚠️ Duplicate of account.role** |

#### Role Field Analysis
```javascript
// Schema Definition (lines 436-458)
account: {
  userName: { type: String, trim: true },
  password: { type: String, trim: true },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'hr', 'manager', 'leads', 'employee'],
    default: 'employee'
  }
},
// Root level duplicate (lines 452-458)
role: {
  type: String,
  enum: ['superadmin', 'admin', 'hr', 'manager', 'leads', 'employee'],
  default: 'employee'
}
```

#### Employment Fields
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `departmentId` | String | ✅ | **⚠️ String format** |
| `designationId` | String | ✅ | **⚠️ String format** |
| `reportingTo` | ObjectId | ❌ | Reference to Employee |
| `employmentType` | String | ✅ | Full-time/Part-time/Contract/Intern |
| `status` | String | ❌ | **⚠️ NOT in schema - using employmentStatus** |
| `employmentStatus` | String | ❌ | Active/Probation/Resigned/Terminated/On Leave |
| `joiningDate` | Date | ✅ | **Canonical field name** |
| `dateOfJoining` | Date | ❌ | **Alias for joiningDate** |

#### Date Fields
| Field | Type | Required | Storage Format | Frontend Format |
|-------|------|----------|----------------|-----------------|
| `dateOfBirth` | Date | ❌ | Date object | DD-MM-YYYY string |
| `joiningDate` | Date | ✅ | Date object | DD-MM-YYYY string |
| `dateOfJoining` | Date | ❌ | Alias | DD-MM-YYYY string |
| `confirmationDate` | Date | ❌ | Date object | DD-MM-YYYY string |
| `resignationDate` | Date | ❌ | Date object | DD-MM-YYYY string |
| `lastWorkingDate` | Date | ❌ | Date object | DD-MM-YYYY string |

#### Personal Information
```javascript
address: {
  street: String,
  city: String,
  state: String,
  country: String,
  postalCode: String
}

personal: {
  passport: {
    number: String,
    expiryDate: Date,
    country: String
  },
  nationality: String,
  religion: String,
  maritalStatus: String,
  employmentOfSpouse: String,
  noOfChildren: Number
}
```

#### Other Important Fields
| Field | Type | Notes |
|-------|------|-------|
| `profileImage` / `avatarUrl` | String | Profile image URL |
| `shiftId` | ObjectId | Reference to Shift |
| `batchId` | ObjectId | Reference to Batch |
| `companyId` | ObjectId | Multi-tenant company ID |
| `isActive` | Boolean | Active flag |
| `isDeleted` | Boolean | Soft delete flag |

---

## Page-to-Field Mapping Table

### Complete Field Mapping Across All Pages

| Database Field | Employees List | Employee Details | Add Modal | Edit Modal | Profile Page | Clerk |
|----------------|---------------|-----------------|-----------|------------|--------------|-------|
| **Identity** |
| `_id` | ✅ `employee._id` | ✅ `_id` | ❌ | ❌ | ✅ `_id` | ❌ |
| `employeeId` | ✅ `employeeId` | ✅ `employeeId` | ✅ Generated | ✅ Read-only | ✅ `employeeId` | ❌ |
| `clerkUserId` | ✅ | ✅ | ❌ Auto-created | ❌ Read-only | ❌ | ✅ `id` |
| `firstName` | ✅ `firstName` | ✅ `firstName` | ✅ `firstName` | ✅ `firstName` | ✅ `firstName` | ✅ `firstName` |
| `lastName` | ✅ `lastName` | ✅ `lastName` | ✅ `lastName` | ✅ `lastName` | ✅ `lastName` | ✅ `lastName` |
| `fullName` | ✅ Computed | ✅ `fullName` | ❌ | ❌ | ❌ | Computed |
| `email` | ✅ `email` | ✅ `email` | ✅ `email` | ✅ `email` | ✅ `email` | ✅ `emailAddresses[0]` |
| `phone` | ✅ `phone` | ✅ `phone` | ✅ `phone` | ✅ `phone` | ✅ `phone` | ✅ `phoneNumbers[0]` |
| `phoneCode` | ❌ | ✅ `phoneCode` | ✅ `phoneCode` | ✅ `phoneCode` | ❌ | ❌ |
| **Authentication** |
| `account.userName` | ❌ | ✅ `account.userName` | ✅ `account.userName` | ✅ `account.userName` | ❌ | ❌ |
| `account.password` | ❌ | ❌ | ❌ Auto-gen | ❌ | ❌ | ❌ |
| `account.role` | ❌ | ❌ | ✅ `account.role` | ✅ `account.role` | ❌ | **❌ NOT SYNCED** |
| `role` (root) | ✅ `role` | ✅ `role` | ✅ Mapped | ✅ `role` | ✅ `role` | **❌ NOT SYNCED** |
| **Employment** |
| `departmentId` | ✅ `departmentId` | ✅ `departmentId` | ✅ `departmentId` | ✅ `departmentId` | ✅ `department` | ❌ |
| `department` (populated) | ✅ `department` | ✅ `department` | ❌ | ❌ | ❌ | ❌ |
| `designationId` | ✅ `designationId` | ✅ `designationId` | ✅ `designationId` | ✅ `designationId` | ✅ `designation` | ❌ |
| `designation` (populated) | ✅ `designation` | ✅ `designation` | ❌ | ❌ | ❌ | ❌ |
| `reportingTo` | ✅ `reportingTo` | ✅ `reportingTo` | ✅ `reportingTo` | ✅ `reportingTo` | ❌ | ❌ |
| `reportingManagerName` | ✅ Populated | ✅ Populated | ❌ | ❌ | ✅ `reportingManager` | ❌ |
| `employmentType` | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `status` | ✅ `status` | ✅ `status` | ✅ `status` | ✅ `status` | ✅ `status` | ❌ |
| `joiningDate` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `dateOfJoining` | ✅ | ✅ | ✅ `dateOfJoining` | ✅ | ❌ | ❌ |
| **Personal** |
| `dateOfBirth` | ❌ | ✅ `dateOfBirth` | ✅ `dateOfBirth` | ✅ | ❌ | ❌ |
| `gender` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `address.street` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `address.city` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `address.state` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `address.country` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `address.postalCode` | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| `personal.nationality` | ❌ | ✅ `nationality` | ✅ `personal.nationality` | ✅ | ❌ | ❌ |
| `personal.religion` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `personal.maritalStatus` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| `personal.passport.number` | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Shift & Batch** |
| `shiftId` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `shiftName` (populated) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `batchId` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `batchName` (populated) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Profile** |
| `profileImage` | ❌ | ✅ `avatarUrl` | ❌ | ✅ `avatarUrl` | ✅ `profilePhoto` | ✅ `imageUrl` |
| `about` | ✅ | ✅ | ✅ | ✅ | ✅ `bio` | ❌ |
| **Company** |
| `companyId` | ❌ | ✅ | ❌ Auto | ❌ | ✅ | ✅ `publicMetadata.companyId` |
| `companyName` | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |

### Legend
- ✅ = Field is used/stored
- ❌ = Field is NOT used
- **Bold** = Critical issue
- ❌ NOT SYNCED = Data not synchronized between systems

---

## Role Storage & Clerk Sync Issue

### 🔴 CRITICAL ISSUE: Role Not Synced to Clerk

#### Problem Description
When an employee's role is changed through the Edit Employee Modal or Employee Details page, the role is updated in MongoDB but **NOT synced to Clerk's `publicMetadata.role`**. This causes a disconnect between the database and the actual authentication/authorization system.

#### Current Behavior

**1. Role is stored in TWO places in MongoDB:**
```javascript
// In employee document
{
  role: "hr",                    // Root level
  account: {
    role: "hr"                   // Nested in account
  }
}
```

**2. Clerk stores role in publicMetadata:**
```javascript
// In Clerk user object
{
  publicMetadata: {
    role: "hr",                  // Used for authentication
    companyId: "69824685..."
  }
}
```

**3. When role is changed via Edit Modal:**

Flow from [EditEmployeeModal.tsx](react/src/core/modals/EditEmployeeModal.tsx):
```typescript
// Frontend sends update
PUT /api/employees/:id
{
  account: {
    role: "manager"  // New role
  }
}
```

Backend controller [employee.controller.js](backend/controllers/rest/employee.controller.js:1757-1900):
```javascript
// Update happens in MongoDB
await collections.employees.updateOne(
  { _id: new ObjectId(id) },
  { $set: { 'account.role': newRole, role: newRole } }
);

// ❌ Clerk is NOT updated!
// ❌ publicMetadata.role remains old value
```

**4. Role fetch from Clerk (auth.js line 144):**
```javascript
// Role is ALWAYS fetched from Clerk for authentication
let role = (user.publicMetadata?.role || 'public')?.toLowerCase();
```

#### Impact

| Scenario | MongoDB Role | Clerk Role | Actual Access | Issue |
|----------|--------------|------------|--------------|-------|
| Admin changes HR to Manager | `"manager"` | `"hr"` | **Still HR** | ❌ No change |
| Admin changes Employee to HR | `"hr"` | `"employee"` | **Still Employee** | ❌ No change |
| User logs out and back in | `"manager"` | `"hr"` | **Still HR** | ❌ Clerk takes precedence |

#### Code Evidence

**Create Flow (Clerk IS updated):**
```javascript
// employee.controller.js lines 1456-1459
const createdUser = await clerkClient.users.createUser({
  emailAddress: [normalizedWithDates.email],
  username: candidate,
  password: password,
  publicMetadata: {
    role: clerkRole,  // ✅ Set on create
    companyId: user.companyId,
  },
});
```

**Update Flow (Clerk NOT updated):**
```javascript
// employee.controller.js lines 1757-1900
// Update function does NOT call clerkClient.users.updateUser()
// Only MongoDB is updated
await collections.employees.updateOne(
  { _id: new ObjectId(id) },
  { $set: updateData }
);
// ❌ No Clerk sync here!
```

#### Where Role is Used

**Frontend Components:**
- [employeesList.tsx](react/src/feature-module/hrm/employees/employeesList.tsx:91) - `employee.role`
- [employeedetails.tsx](react/src/feature-module/hrm/employees/employeedetails.tsx:287) - `role`
- [EditEmployeeModal.tsx](react/src/core/modals/EditEmployeeModal.tsx:149-154) - Role dropdown
- [AddEmployeeModal.tsx](react/src/core/modals/AddEmployeeModal.tsx:154-159) - Role dropdown
- [profile-management.tsx](react/src/feature-module/pages/profile/profile-management.tsx:201) - `profile.role`

**Backend Controllers:**
- [employee.controller.js](backend/controllers/rest/employee.controller.js:144) - Filter by role
- [auth.js](backend/middleware/auth.js:144) - Extract role from Clerk metadata
- [auth.js](backend/middleware/auth.js:181) - Attach to req.user.role

#### Role Values Allowed

**Frontend Role Options (EditEmployeeModal.tsx lines 149-154):**
```typescript
const roleOptions = [
  { value: "", label: "Select Role" },
  { value: "hr", label: "HR" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];
// ❌ 'admin' and 'superadmin' are NOT in dropdown
```

**Database Schema (employee.schema.js lines 445-448, 454-457):**
```javascript
// Account role
enum: ['superadmin', 'admin', 'hr', 'manager', 'leads', 'employee']
// Root role
enum: ['superadmin', 'admin', 'hr', 'manager', 'leads', 'employee']
```

**Note:** The schema allows more roles than the UI exposes. Admin/Superadmin roles must be managed separately (not through employee modals).

---

## Password Reset Flow Analysis

### Current Password Flow

#### 1. Employee Creation (Password Generated)

**Backend Controller** ([employee.controller.js](backend/controllers/rest/employee.controller.js:1355-1365)):
```javascript
// Generate secure random password
export function generateSecurePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => chars[v % chars.length]).join('');
}

const password = generateSecurePassword(12);
```

**Storage in MongoDB** (line 1557-1561):
```javascript
account: {
  userName: normalizedWithDates.account?.userName,
  password: password,  // ✅ Stored for reference
  role: normalizedWithDates.account?.role || 'Employee',
}
```

**Storage in Clerk** (lines 1452-1456):
```javascript
const createdUser = await clerkClient.users.createUser({
  emailAddress: [normalizedWithDates.email],
  username: candidate,
  password: password,  // ✅ Password set in Clerk
  publicMetadata: {
    role: clerkRole,
    companyId: user.companyId,
  },
});
```

**Email Sent** (lines 1710-1718):
```javascript
await sendEmployeeCredentialsEmail({
  to: normalizedWithDates.email,
  password: password,  // ✅ Password in email
  userName: username,
  loginLink: loginLink,
  firstName: normalizedWithDates.firstName,
  lastName: normalizedWithDates.lastName,
  companyName: normalizedWithDates.companyName || 'Your Company',
});
```

#### 2. Send Credentials (Resend Password)

**API Endpoint:** `POST /api/employees/:id/send-credentials`

**Hook** ([useEmployeesREST.ts](react/src/hooks/useEmployeesREST.ts:1245-1259)):
```typescript
const sendCredentials = useCallback(async (employeeId: string): Promise<boolean> => {
  const response: ApiResponse = await post(`/employees/${employeeId}/send-credentials`, {});
  if (response.success) {
    message.success('Credentials sent to employee email successfully');
    return true;
  }
  return false;
}, []);
```

**Backend Controller** ([employee.controller.js](backend/controllers/rest/employee.controller.js:~3500)):
```javascript
export const sendEmployeeCredentials = async (req, res) => {
  const { id } = req.params;
  // Get employee
  const employee = await collections.employees.findOne({ _id: new ObjectId(id) });

  // Generate NEW password
  const newPassword = generateSecurePassword(12);

  // Update MongoDB
  await collections.employees.updateOne(
    { _id: new ObjectId(id) },
    { $set: { 'account.password': newPassword } }
  );

  // ⚠️ Clerk NOT updated!

  // Send email
  await sendEmployeeCredentialsEmail({
    to: employee.email,
    password: newPassword,
    // ...
  });
}
```

#### 3. Change Employee Password (Admin/HR Action)

**API Endpoint:** `POST /api/employees/:id/change-password`

**Hook** ([useEmployeesREST.ts](react/src/hooks/useEmployeesREST.ts:1262-1279)):
```typescript
const changeEmployeePassword = useCallback(async (
  employeeId: string,
  data: { newPassword: string; confirmPassword: string }
): Promise<boolean> => {
  const response: ApiResponse = await post(`/employees/${employeeId}/change-password`, data);
  if (response.success) {
    message.success('Password updated and notification sent to employee');
    return true;
  }
  return false;
}, []);
```

**Backend Implementation Needed:** ⚠️ This endpoint may not be fully implemented or may not update Clerk.

#### 4. User Self Password Change

**Profile Page Hook** ([useProfile.ts](react/src/hooks/useProfile.ts:305-335)):
```typescript
const changePassword = useCallback(async (passwordData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<boolean> => {
  socket.emit('profile:changePassword', passwordData);
  // ...
}, []);
```

### 🔴 CRITICAL ISSUE: Password Reset Doesn't Update Clerk

| Operation | MongoDB Updated | Clerk Updated | Issue |
|-----------|----------------|---------------|-------|
| Create Employee | ✅ Yes | ✅ Yes | None |
| Send Credentials | ✅ Yes | ❌ **No** | **⚠️ New password only in MongoDB** |
| Change Password (Admin) | ✅ Yes | ❌ **No** | **⚠️ Clerk password unchanged** |
| Change Password (Self) | ❓ Unknown | ❌ **No** | **⚠️ Clerk password unchanged** |

**Authentication Flow:**
1. User logs in via Clerk
2. Clerk validates password
3. If MongoDB password differs from Clerk password, **Clerk's password wins**
4. User cannot log in with the MongoDB password

---

## Data Flow Diagrams

### Employee Creation Flow

```
┌─────────────────┐
│  Add Employee   │
│     Modal       │
└────────┬────────┘
         │ POST /api/employees
         │ {
         │   firstName, lastName,
         │   email, phone,
         │   account.role,
         │   departmentId,
         │   dateOfJoining, ...
         │ }
         ▼
┌─────────────────────────────────┐
│   Backend Controller            │
│   (employee.controller.js)      │
│                                 │
│   1. Validate data              │
│   2. Generate password          │
│   3. Create Clerk user          │
│      └─ publicMetadata.role ✅  │
│   4. Insert to MongoDB          │
│      └─ account.role ✅         │
│      └─ role ✅ (duplicate)     │
│   5. Send credentials email     │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────┐
│   MongoDB       │    │    Clerk     │
│   employees     │    │    users     │
└─────────────────┘    └──────────────┘
```

### Employee Update Flow (Role Change)

```
┌─────────────────┐
│  Edit Employee  │
│     Modal       │
└────────┬────────┘
         │ PUT /api/employees/:id
         │ {
         │   account: { role: "manager" }
         │ }
         ▼
┌─────────────────────────────────┐
│   Backend Controller            │
│   (employee.controller.js)      │
│                                 │
│   1. Sanitize update data       │
│   2. Update MongoDB             │
│      └─ account.role ✅         │
│      └─ role ✅                 │
│   3. ❌ Clerk NOT updated       │
│      └─ publicMetadata.role ❌  │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────┐
│   MongoDB       │    │    Clerk     │
│   role:         │    │  (STALE)     │
│   "manager" ✅  │    │  role: "hr"  │
└─────────────────┘    └──────────────┘

         ⚠️ AUTHENTICATION FAILS
         (Clerk role is used for auth)
```

### Authentication Flow

```
┌──────────────┐
│ User Login   │
└──────┬───────┘
       │ Clerk JWT Token
       ▼
┌─────────────────────────────────┐
│   Auth Middleware               │
│   (auth.js)                     │
│                                 │
│   1. Verify JWT token           │
│   2. Fetch user from Clerk      │
│   3. Extract role from:         │
│      user.publicMetadata.role ✅│
│   4. Check if user.locked ❌    │
│   5. Attach to req.user.role ✅ │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│   Protected Route               │
│   Uses req.user.role            │
│   (from Clerk, NOT MongoDB)     │
└─────────────────────────────────┘
```

---

## Field Name Inconsistencies

### Date Fields

| Database Field | Frontend Field | API Payload | Notes |
|----------------|----------------|-------------|-------|
| `joiningDate` | `dateOfJoining` | `dateOfJoining` | **Canonical: joiningDate** |
| `joiningDate` | `joiningDate` | `joiningDate` | Alias for dateOfJoining |
| `dateOfBirth` | `dateOfBirth` | `dateOfBirth` | Consistent ✅ |
| `personal.passport.expiryDate` | `personal.passport.expiryDate` | `personal.passport.expiryDate` | Consistent ✅ |

**Date Normalization** ([employee.controller.js:154-193](backend/controllers/rest/employee.controller.js:154-193)):
```javascript
// Backend normalizes dateOfJoining to joiningDate
const normalizeEmployeeDates = (data) => {
  const normalized = { ...data };
  if ('dateOfJoining' in normalized) {
    normalized.joiningDate = parseDateField(normalized.dateOfJoining, 'dateOfJoining');
  }
  // ...
  return normalized;
};

// Backend formats joiningDate back to dateOfJoining for response
const formatEmployeeDates = (employee) => {
  const formatted = { ...employee };
  formatted.joiningDate = formatDDMMYYYY(formatted.joiningDate || formatted.dateOfJoining);
  formatted.dateOfJoining = formatted.joiningDate;
  return formatted;
};
```

### Department/Designation Fields

| Database Field | Frontend Field | Type | Notes |
|----------------|----------------|------|-------|
| `department` | ❌ Not used | ObjectId | Schema definition |
| `departmentId` | ✅ `departmentId` | String | **Primary field used** |
| `designation` | ❌ Not used | ObjectId | Schema definition |
| `designationId` | ✅ `designationId` | String | **Primary field used** |

**Aggregation Pipeline** ([employee.controller.js:457-502](backend/controllers/rest/employee.controller.js:457-502)):
```javascript
// Backend converts departmentId string to ObjectId for $lookup
departmentObjId: {
  $cond: {
    if: { $and: [{ $ne: ['$departmentId', null] }, { $ne: ['$departmentId', ''] }] },
    then: { $toObjectId: '$departmentId' },  // String → ObjectId
    else: null
  }
}
```

### Reporting Manager Fields

| Database Field | Frontend Field | Populated Field | Notes |
|----------------|----------------|-----------------|-------|
| `reportingTo` | ✅ `reportingTo` | ❌ | ObjectId stored |
| `reportingToName` | ❌ | ✅ | Computed from lookup |
| `reportingManagerName` | ✅ | ✅ | Computed from lookup |
| `reportingToEmployeeId` | ❌ | ✅ | Employee ID of manager |

### Profile Image Fields

| Database Field | Frontend Field | Notes |
|----------------|----------------|-------|
| `profileImage` | ✅ `profileImage`, `avatarUrl` | Canonical field |
| `avatarUrl` | ✅ `avatarUrl` | Alias (added in aggregation) |
| `profileImagePath` | ❌ | Server file path |
| `imageUrl` (Clerk) | ❌ | Clerk profile image |

---

## Recommendations

### 🔴 High Priority Fixes

#### 1. Fix Role Sync to Clerk

**File:** [backend/controllers/rest/employee.controller.js](backend/controllers/rest/employee.controller.js)

**Location:** In `updateEmployee` function (after line 1900)

**Add:**
```javascript
// After MongoDB update, sync role to Clerk
if (updateData.account?.role || updateData.role) {
  const newRole = updateData.account?.role || updateData.role;
  try {
    await clerkClient.users.updateUser(employee.clerkUserId, {
      publicMetadata: {
        role: newRole.toLowerCase(),
        companyId: user.companyId,
      },
    });
    devLog('[Employee Controller] Role synced to Clerk:', newRole);
  } catch (clerkError) {
    devError('[Employee Controller] Failed to sync role to Clerk:', clerkError);
    // Don't fail the update - log the error
  }
}
```

#### 2. Fix Password Reset to Update Clerk

**File:** [backend/controllers/rest/employee.controller.js](backend/controllers/rest/employee.controller.js)

**Location:** In password change endpoints

**Add:**
```javascript
// After updating MongoDB, update Clerk password
if (newPassword) {
  try {
    await clerkClient.users.updateUser(employee.clerkUserId, {
      password: newPassword,
    });
    devLog('[Employee Controller] Password synced to Clerk');
  } catch (clerkError) {
    devError('[Employee Controller] Failed to sync password to Clerk:', clerkError);
    throw new Error('Failed to update password in authentication system');
  }
}
```

### 🟡 Medium Priority Improvements

#### 3. Consolidate Role Fields

**Action:** Remove the duplicate `role` field at root level and use only `account.role`

**Files to Update:**
- [employee.schema.js](backend/models/employee/employee.schema.js)
- [employee.controller.js](backend/controllers/rest/employee.controller.js)
- [useEmployeesREST.ts](react/src/hooks/useEmployeesREST.ts)
- All frontend components

#### 4. Standardize Date Field Names

**Action:** Use only `joiningDate` in database, alias to `dateOfJoining` in API responses only

**Migration Plan:**
1. Keep `joiningDate` as canonical field
2. Remove `dateOfJoining` from all insert/update operations
3. Add `dateOfJoining` only in response formatting

#### 5. Standardize Department/Designation Fields

**Action:** Use consistent ObjectId references

**Options:**
- **Option A:** Change all `departmentId`/`designationId` to ObjectIds in database
- **Option B:** Keep string IDs but remove the unused `department`/`designation` ObjectId fields from schema

**Recommended:** Option B (less migration risk)

### 🟢 Low Priority Improvements

#### 6. Add Clerk Sync Monitoring

**Action:** Create a sync verification endpoint

**Implementation:**
```javascript
GET /api/employees/:id/clerk-sync-status
// Returns:
{
  mongodbRole: "hr",
  clerkRole: "manager",  // if different, sync is broken
  inSync: false
}
```

#### 7. Add Audit Trail for Role Changes

**Action:** Log all role changes with timestamps and user info

**Implementation:**
```javascript
{
  employeeId: "EMP-1234",
  changeType: "ROLE_CHANGE",
  oldValue: "employee",
  newValue: "hr",
  changedBy: "admin@company.com",
  changedAt: "2026-03-05T10:30:00Z",
  clerkSynced: true
}
```

---

## Appendix

### Related Files

#### Frontend
- [employeesList.tsx](react/src/feature-module/hrm/employees/employeesList.tsx) - Main employee list page
- [employeedetails.tsx](react/src/feature-module/hrm/employees/employeedetails.tsx) - Employee details page
- [AddEmployeeModal.tsx](react/src/core/modals/AddEmployeeModal.tsx) - Create employee modal
- [EditEmployeeModal.tsx](react/src/core/modals/EditEmployeeModal.tsx) - Edit employee modal
- [profile-management.tsx](react/src/feature-module/pages/profile/profile-management.tsx) - Profile management page
- [useEmployeesREST.ts](react/src/hooks/useEmployeesREST.ts) - Employee REST API hook
- [useProfile.ts](react/src/hooks/useProfile.ts) - Profile REST API hook

#### Backend
- [employee.schema.js](backend/models/employee/employee.schema.js) - Employee Mongoose schema
- [employee.controller.js](backend/controllers/rest/employee.controller.js) - Employee REST controller
- [auth.js](backend/middleware/auth.js) - Authentication middleware
- [emailer.js](backend/utils/emailer.js) - Email utilities
- [employeeStatus.service.js](backend/services/employee/employeeStatus.service.js) - Employee status & Clerk lock service

### API Endpoints

| Method | Endpoint | Description | Clerk Sync |
|--------|----------|-------------|------------|
| GET | `/api/employees` | Get all employees | N/A |
| GET | `/api/employees/:id` | Get single employee | N/A |
| POST | `/api/employees` | Create employee | ✅ Yes |
| PUT | `/api/employees/:id` | Update employee | ❌ **No** |
| DELETE | `/api/employees/:id` | Delete employee | ❌ No |
| POST | `/api/employees/:id/send-credentials` | Send credentials | ❌ **No** |
| POST | `/api/employees/:id/change-password` | Change password | ❌ **No** |
| POST | `/api/employees/sync-my-employee` | Sync from Clerk | N/A |

### Role Values

| Role Value | Database | Clerk | Can Assign via UI | Notes |
|------------|----------|-------|------------------|-------|
| `superadmin` | ✅ | ✅ | ❌ | Managed separately |
| `admin` | ✅ | ✅ | ❌ | Not in dropdown |
| `hr` | ✅ | ✅ | ✅ | In dropdown |
| `manager` | ✅ | ✅ | ✅ | In dropdown |
| `leads` | ✅ | ✅ | ❌ | Not in dropdown |
| `employee` | ✅ | ✅ | ✅ | Default |

---

## Change Log

| Date | Version | Changes |
|------|---------|---------|
| 2026-03-05 | 1.0 | Initial analysis report |

---

**Report End**
