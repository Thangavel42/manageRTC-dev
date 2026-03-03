# Attendance & Leave Management System Fixes - Implementation Plan

## Overview
This document outlines the phased implementation plan to fix all identified issues in the Attendance and Leave Management System.

---

## PHASE 1: CRITICAL - Leave ↔ Attendance Integration
**Priority:** CRITICAL
**Estimated Time:** 2-3 hours
**Files to Modify:**
- `backend/controllers/rest/leave.controller.js`
- `backend/services/leaves/leaveAttendanceSync.service.js` (NEW)

### 1.1 Create Attendance Sync Service (NEW FILE)
**Location:** `backend/services/leaves/leaveAttendanceSync.service.js`

**Purpose:** Centralized service to handle attendance record creation/update/cleanup when leaves are approved, modified, or cancelled.

**Functions to Implement:**
```javascript
// Create attendance records for approved leave days
export const createAttendanceForLeave(companyId, leave)

// Update attendance records when leave is modified
export const updateAttendanceForLeave(companyId, leave, oldDates)

// Remove/cleanup attendance records when leave is cancelled
export const removeAttendanceForLeave(companyId, leave)

// Check if attendance record already exists for a date
export const checkExistingAttendance(companyId, employeeId, date)

// Sync all approved leaves to attendance (for backfilling)
export const syncApprovedLeavesToAttendance(companyId)
```

### 1.2 Modify `approveLeave()` Function
**File:** `backend/controllers/rest/leave.controller.js`
**Location:** Lines 919-1074

**Changes:**
1. After leave status update and balance update, add attendance sync
2. Import and use `leaveAttendanceSync` service
3. Wrap in try-catch (attendance sync failure shouldn't fail leave approval)

### 1.3 Modify `managerActionLeave()` Function
**File:** `backend/controllers/rest/leave.controller.js`
**Location:** Lines 1193-1334

**Changes:**
1. Same as approveLeave - add attendance sync after approval

### 1.4 Modify `cancelLeave()` Function
**File:** `backend/controllers/rest/leave.controller.js`
**Location:** Lines 1341-1478

**Changes:**
1. Add cleanup of "on-leave" attendance records after cancellation
2. Remove leaveId reference from attendance records
3. Update status based on whether employee clocked in that day

### 1.5 Modify `updateLeave()` Function
**File:** `backend/controllers/rest/leave.controller.js`
**Location:** Lines 601-689

**Changes:**
1. If dates are being modified and leave is already approved, resync attendance

---

## PHASE 2: HIGH PRIORITY Fixes
**Priority:** HIGH
**Estimated Time:** 1-2 hours
**Files to Modify:**
- `backend/controllers/rest/attendance.controller.js`
- `backend/controllers/rest/leave.controller.js`
- `backend/models/attendance/attendance.schema.js`

### 2.1 Fix Attendance Date Overlap Vulnerability
**File:** `backend/controllers/rest/attendance.controller.js`
**Function:** `createAttendance()`
**Location:** Lines 151-231

**Changes:**
1. Add unique constraint check on (employeeId, date)
2. Return error if attendance exists for same day
3. Prevent multiple attendance records per day per employee

### 2.2 Add Tenant Isolation Validation
**File:** `backend/controllers/rest/leave.controller.js`
**Function:** `getEmployeeLeaveBalance()` helper
**Location:** Lines 96-158

**Changes:**
1. Validate employee belongs to the company
2. Add companyId check in employee lookup

### 2.3 Add Database Indexes
**File:** `backend/models/attendance/attendance.schema.js`
**Location:** Lines 270-278

**Changes:**
1. Add compound index: `{ companyId: 1, employeeId: 1, status: 1 }`
2. Add compound index: `{ companyId: 1, employeeId: 1, date: 1 }`

---

## PHASE 3: MEDIUM PRIORITY Security Fixes
**Priority:** MEDIUM
**Estimated Time:** 2-3 hours
**Files to Modify:**
- `backend/controllers/rest/attendance.controller.js`
- `backend/middleware/attendanceValidators.js` (NEW)

### 3.1 Add Authorization Checks (IDOR Fix)
**File:** `backend/controllers/rest/attendance.controller.js`
**Functions to Update:**
- `getAttendanceById()` - Line 121
- `updateAttendance()` - Line 238
- `deleteAttendance()` - Line 330

**Changes:**
1. Add employee/owner check - users can only access their own attendance
2. Admin/HR/Superadmin can access all
3. Use role-based access control

### 3.2 Add Date Range Validation
**File:** `backend/controllers/rest/attendance.controller.js`
**Function:** `getAttendanceByDateRange()`
**Location:** Lines 438-476

**Changes:**
1. Validate startDate < endDate
2. Add maximum range limit (e.g., 365 days)
3. Validate dates are valid Date objects

### 3.3 Create Audit Logging Service
**New File:** `backend/services/audit/attendanceAudit.service.js`

**Purpose:** Track all attendance modifications

**Functions:**
```javascript
export const logAttendanceCreation(companyId, attendanceId, userId, changes)
export const logAttendanceUpdate(companyId, attendanceId, userId, changes)
export const logAttendanceDeletion(companyId, attendanceId, userId, reason)
export const getAttendanceAuditLog(companyId, attendanceId)
```

### 3.4 Add Input Sanitization
**File:** `backend/controllers/rest/attendance.controller.js`

**Changes:**
1. Sanitize notes fields before saving
2. Strip HTML/script tags
3. Use a sanitization library or regex

---

## PHASE 4: CODE QUALITY Improvements
**Priority:** LOW
**Estimated Time:** 1-2 hours
**Files to Modify:**
- `backend/controllers/rest/leave.controller.js`
- `backend/controllers/rest/attendance.controller.js`
- Various model files

### 4.1 Remove Deprecated Fields
**File:** `backend/controllers/rest/leave.controller.js`
**Location:** Lines 74-90

**Changes:**
1. Remove `normalizeLeaveStatuses()` function
2. Remove deprecated field assignments in response objects
3. Update frontend to use main `status` field only

### 4.2 Standardize Field Naming
**Files:** Multiple
**Changes:**
1. Create migration plan to standardize field names
2. Use consistent naming: `hoursWorked` (not `workHours`)
3. Document all field name standards

### 4.3 Remove Unused Code
**Files:** Multiple
**Changes:**
1. Remove unused imports
2. Remove unused functions
3. Clean up commented-out code

### 4.4 Add Missing Indexes
**File:** `backend/models/attendance/attendance.schema.js`

**Changes:**
1. Add index on frequently queried fields
2. Update migration script if needed

---

## TESTING PLAN

### Phase 1 Testing
- [ ] Create leave request → Approve → Verify attendance records created
- [ ] Cancel approved leave → Verify attendance cleaned up
- [ ] Modify approved leave dates → Verify attendance updated
- [ ] Backfill script for existing approved leaves

### Phase 2 Testing
- [ ] Try creating duplicate attendance for same day → Should fail
- [ ] Test tenant isolation → Cannot access other company data

### Phase 3 Testing
- [ ] Regular user tries to access another's attendance → Should fail
- [ ] Invalid date range query → Should return error
- [ ] Verify audit logs are created

### Phase 4 Testing
- [ ] Verify all routes work without deprecated fields
- [ ] Performance test with new indexes

---

## BACKWARDS COMPATIBILITY NOTES

### Phase 1 Changes
- Existing approved leaves won't have attendance records automatically
- Run backfill script to sync historical data
- Frontend may need updates to handle `on-leave` status

### Phase 2 Changes
- Database migration required for new indexes
- No breaking API changes

### Phase 3 Changes
- Some API calls that previously returned data will now return 403
- Frontend error handling needed for authorization failures

### Phase 4 Changes
- Breaking change: deprecated fields removed from API responses
- Frontend must be updated to use `status` field only

---

## ROLLBACK PLAN

Each phase includes a rollback strategy:

1. **Phase 1:** Set flag to disable attendance sync, revert code changes
2. **Phase 2:** Drop new indexes, revert validation
3. **Phase 3:** Disable audit logging, revert authorization
4. **Phase 4:** Revert to old field names in responses

---

## DEPLOYMENT CHECKLIST

- [ ] Database backup before deployment
- [ ] Run database migrations
- [ ] Deploy backend code
- [ ] Run backfill script for existing data
- [ ] Monitor error logs
- [ ] Verify attendance sync is working
- [ ] Update frontend if needed

---

*Created: 2026-02-23*
*Author: Claude Code*
*Status: Implementation Phase 1 In Progress*
