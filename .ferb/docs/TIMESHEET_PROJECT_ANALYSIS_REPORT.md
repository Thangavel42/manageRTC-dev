# Timesheet & Project Management — Comprehensive Analysis Report

**Date:** 2026-02-25
**Scope:** Full-stack analysis of Timesheet, Project Management, and Task Management modules
**Status:** Pre-implementation analysis — identifies current state and all gaps

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Current Architecture](#2-current-architecture)
3. [Data Models & Relationships](#3-data-models--relationships)
4. [Frontend: Timesheet Component (Current State)](#4-frontend-timesheet-component-current-state)
5. [Backend: TimeTracking Controller (Current State)](#5-backend-timetracking-controller-current-state)
6. [Backend: Project Controller (Current State)](#6-backend-project-controller-current-state)
7. [Role Matrix — What Each Role Can Currently Do](#7-role-matrix--what-each-role-can-currently-do)
8. [Critical Gaps & Missing Implementations](#8-critical-gaps--missing-implementations)
9. [API Endpoint Inventory](#9-api-endpoint-inventory)
10. [UI Flow — Current vs Required](#10-ui-flow--current-vs-required)

---

## 1. System Overview

The system uses two separate time recording models that are **not yet integrated**:

| System | Model | Period | API | Frontend Hook | Status |
|--------|-------|--------|-----|---------------|--------|
| **Time Tracking** (Daily) | `TimeEntry` | Per entry/day | `/api/timetracking` | `useTimeTrackingREST` | **Active in UI** |
| **Timesheet** (Weekly) | `Timesheet` | Weekly periods | `/api/timesheets` | Not wired to UI | Backend ready, UI not connected |

> **`timesheet.tsx` currently uses the Time Tracking (daily) system** — it calls `/api/timetracking` endpoints via `useTimeTrackingREST`, NOT the weekly timesheet endpoints.

---

## 2. Current Architecture

### Multi-Tenant Database Architecture
```
MongoDB Atlas
  ├── AmasQIS (default/platform DB)
  └── <companyId> (tenant-specific DB, e.g., 6982468548550225cc5585a9)
        ├── employees
        ├── projects
        ├── tasks
        ├── timeentries        ← TimeEntry (daily logs)
        ├── timesheets         ← Timesheet (weekly, backend-ready)
        ├── attendance
        └── shifts
```

### Authentication & Role Detection
- **Auth Provider:** Clerk
- **Role storage:** `user.publicMetadata.role` (set at company join time)
- **System roles:** `superadmin`, `admin`, `hr`, `manager`, `leads`, `employee`
- **Role detection in timesheet.tsx:**
  ```typescript
  const isEmployeeOrManager = ['employee', 'manager'].includes(role);
  const canManageTimesheet = ['admin', 'hr', 'superadmin'].includes(role);
  ```
- **MISSING:** `leads` role is not handled; project-level roles (PM, TL) are not considered

---

## 3. Data Models & Relationships

### 3.1 Project Schema
**File:** `backend/models/project/project.schema.js`

```javascript
{
  projectId: String (unique, auto-generated)
  name: String (required)
  description: String
  client: String (required)
  companyId: String (required, indexed)
  startDate: Date (required)
  dueDate: Date (required)
  priority: 'High' | 'Medium' | 'Low' (default: 'Medium')
  status: 'Active' | 'Completed' | 'On Hold' | 'Cancelled' (default: 'Active')
  projectValue: Number (default: 0)
  progress: Number (0-100, default: 0)

  // ⭐ KEY ROLE ASSIGNMENT FIELDS
  teamMembers: [ObjectId → Employee]     // Regular assigned team members
  teamLeader: [ObjectId → Employee]      // Team leaders (can approve timesheets)
  projectManager: [ObjectId → Employee]  // Project managers (can approve timesheets)

  milestones: [ObjectId → Milestone]
  budgetId: ObjectId → Budget
  tags: [String]
  logo: String
  isDeleted: Boolean (default: false)
}
```

### 3.2 TimeEntry Schema (Daily — Currently Used in UI)
**File:** `backend/models/timeEntry/timeEntry.schema.js`

```javascript
{
  timeEntryId: String (unique, auto-generated)
  projectId: ObjectId → Project (required)
  taskId: ObjectId → Task (optional)
  milestoneId: ObjectId → Milestone (optional)
  userId: String (Clerk user ID of entry creator)
  description: String (required)
  duration: Number (hours, required)
  billable: Boolean (default: false)
  billRate: Number (default: 0)
  date: Date (required)
  startTime: String (optional, HH:MM)
  endTime: String (optional, HH:MM)
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' (default: 'Draft')
  approvedBy: String
  approvedDate: Date
  rejectionReason: String
  companyId: String (required)
  projectDetails: { projectId, name }   // denormalized for query performance
  taskDetails: { title, status }
  userDetails: { firstName, lastName, employeeId, userId, avatar }
  isDeleted: Boolean (default: false)
}
```

### 3.3 Timesheet Schema (Weekly — Backend Ready, UI Not Connected)
**File:** `backend/models/timesheet/timesheet.schema.js`

```javascript
{
  timesheetId: String (unique)
  employeeId: String (required)
  employee: ObjectId → Employee
  weekStartDate: Date (required)
  weekEndDate: Date (required)
  entries: [{
    date: Date
    project: ObjectId → Project
    task: String
    description: String
    hours: Number (0-24)
    isBillable: Boolean
    regularHours: Number
    overtimeHours: Number
  }]
  totalHours: Number
  totalRegularHours: Number
  totalOvertimeHours: Number
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled'
  submittedBy: ObjectId, submittedAt: Date
  approvedBy: ObjectId, approvedAt: Date, approvalComments: String
  rejectedBy: ObjectId, rejectedAt: Date, rejectionReason: String
  validation: { isValid, hasWarnings, warningCount, discrepancies, validatedAt }
  validationOverride: Boolean
  companyId: String (required)
  isDeleted: Boolean
}
```

### 3.4 Task Schema
**File:** `backend/models/task/task.schema.js`

```javascript
{
  title: String (required)
  description: String
  projectId: ObjectId → Project (required)
  status: String (from taskstatus collection)
  priority: 'Low' | 'Medium' | 'High'
  assignee: [ObjectId → Employee]  // Multiple assignees
  tags: [String]
  milestoneId: ObjectId → Milestone
  timeEntryIds: [ObjectId → TimeEntry]
  startDate: Date
  dueDate: Date
  estimatedHours: Number (default: 0)
  actualHours: Number (default: 0)
  isDeleted: Boolean (default: false)
}
```

### 3.5 Employee Schema (Relevant Fields)
**File:** `backend/models/employee/employee.schema.js`

```javascript
{
  employeeId: String (unique)
  firstName: String, lastName: String
  email: String
  clerkUserId: String (auth link)
  department: ObjectId → Department
  designation: ObjectId → Designation
  level: 'Entry' | 'Junior' | 'Mid' | 'Senior' | 'Lead' | 'Manager' | 'Director' | 'Executive'
  reportingTo: ObjectId → Employee
  role: 'superadmin' | 'admin' | 'hr' | 'manager' | 'leads' | 'employee'
  shiftId: ObjectId → Shift
  employmentStatus: 'Active' | 'Probation' | 'Resigned' | 'Terminated' | 'On Leave'

  // NOTE: No direct project assignment fields
  // Project assignment is ONLY stored on the Project document:
  //   Project.teamMembers[], Project.teamLeader[], Project.projectManager[]
}
```

---

## 4. Frontend: Timesheet Component (Current State)

**File:** `react/src/feature-module/hrm/attendance/timesheet.tsx` (1,328 lines)

### 4.1 Role Detection (Current)
```typescript
const isEmployeeOrManager = ['employee', 'manager'].includes(role);
const canManageTimesheet = ['admin', 'hr', 'superadmin'].includes(role);
```

**MISSING:** No detection of `projectManager` or `teamLeader` context from project assignments.

### 4.2 Project Loading for Employees
```typescript
// In useEffect on mount:
if (isEmployeeOrManager) {
  getMyProjects();  // Calls GET /projects/my
} else {
  fetchProjects();  // Calls GET /projects (all)
}
```

`getMyProjects()` → `GET /projects/my` — This endpoint **does NOT exist yet** in the backend. The frontend calls it but the route likely returns 404.

**The actual project filtering for employees is handled in `GET /projects`** via the `project.controller.js` which checks `role === 'employee'` and filters by `teamMembers`, `teamLeader`, `projectManager`.

### 4.3 Current Project Dropdown Behavior in "Add Today's Work" Modal
```tsx
<label>
  Project <span className="text-danger">*</span>
  {isEmployeeOrManager && (
    <span className="text-muted ms-2 fs-12">(Your assigned projects)</span>
  )}
</label>
<select>
  {projectOptions.length === 0 && (
    <option disabled>No assigned projects found</option>
  )}
  {projectOptions.map(project => (...))}
</select>
{isEmployeeOrManager && projectOptions.length === 0 && (
  <small className="text-warning">You are not assigned to any active projects.</small>
)}
```

✅ The UI already shows "Your assigned projects" label for employees
❌ But the backend route `/projects/my` may not exist — needs verification
❌ No filtering by `status === 'Active'` — cancelled/on-hold projects should be excluded

### 4.4 Current Filters in Table
- **Date range:** All Time, Last 7 Days, Today, This Month, Last Month, This Week ✅
- **Project filter:** Only visible to `canManageTimesheet` (admin/hr/superadmin) ✅
- **Status tabs:** All, Draft, Submitted, Approved, Rejected ✅
- **Employee filter:** ❌ MISSING — No way for HR/Admin to filter by specific employee

### 4.5 Current Approval Flow
```
Employee → Creates Draft → Submits for Approval
HR/Admin/Superadmin → Approves or Rejects
```

**MISSING:**
- Project Managers and Team Leaders (assigned to the project) cannot approve/reject
- Approver cannot see WHICH project the entry belongs to (no project column in approval workflow) — wait, it IS shown in the table
- No project-level scoping of approval rights (PM of Project A should only approve entries for Project A)

---

## 5. Backend: TimeTracking Controller (Current State)

**File:** `backend/controllers/rest/timetracking.controller.js`

### 5.1 GET /api/timetracking
- **Access:** Admin, HR, Superadmin (role-restricted at route level)
- **Employee access:** Via `/api/timetracking/user/:userId`
- **Filters:** userId, projectId, taskId, status, billable, search, startDate, endDate, sortBy

### 5.2 Project-Level Filtering Support
The controller supports `projectId` as a filter but does NOT validate:
- That the requesting user is the project manager/team leader of that project
- That the requesting employee is assigned to that project

### 5.3 Approval Logic (Current)
```javascript
// POST /api/timetracking/approve
// Only admin/hr/superadmin can approve (route-level middleware)
approveTimeEntries(userId, timeEntryIds)
```

**MISSING:** No check that approver is a PM/TL of the project associated with those entries.

### 5.4 Stats Endpoint
- GET `/api/timetracking/stats` — Returns totalHours, billableHours, draftEntries, etc.
- **MISSING:** No breakdown by project for PM/TL views

---

## 6. Backend: Project Controller (Current State)

**File:** `backend/controllers/rest/project.controller.js`

### 6.1 Employee Project Filtering (GET /api/projects)
```javascript
if (user.role?.toLowerCase() === 'employee') {
  // Filter: only projects where employee is in teamMembers, teamLeader, OR projectManager
  filter = {
    $or: [
      { teamMembers: employeeMongoId },
      { teamMembers: employeeMongoIdStr },
      { teamLeader: employeeMongoId },
      { teamLeader: employeeMongoIdStr },
      { projectManager: employeeMongoId },
      { projectManager: employeeMongoIdStr }
    ]
  };
}
```

✅ Employee filtering is correctly implemented
❌ Does NOT distinguish between PM/TL vs regular team member role within the project
❌ `GET /projects/my` endpoint — needs verification if it exists as separate route
❌ `manager` role employees also get ALL projects (no filtering) — should be same as `employee`

### 6.2 Project Manager / Team Leader: No Dedicated Access Logic
When an employee has `role === 'manager'`:
- Falls into `isEmployeeOrManager` in frontend
- But the backend `getProjects` only applies employee filtering for `role === 'employee'`
- So `manager` role gets ALL projects without filtering (same as admin)
- This is incorrect — `manager` should also see only their assigned projects

---

## 7. Role Matrix — What Each Role Can Currently Do

| Action | Employee | Manager | Leads | HR | Admin | Superadmin | PM (project-assigned) | TL (project-assigned) |
|--------|----------|---------|-------|----|----|------------|----------------------|----------------------|
| View own time entries | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | — | — |
| Create time entry | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | — | — |
| Select only assigned projects | ✅ (partial) | ❌ | ❌ | ❌ | ❌ | ❌ | — | — |
| View ALL time entries | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| View project's time entries | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Approve/Reject time entries | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Filter by employee | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Filter by project | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Export timesheet data | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |

**Legend:** ✅ Working | ❌ Missing/Broken | — Not applicable

---

## 8. Critical Gaps & Missing Implementations

### GAP 1: `/projects/my` Route May Not Exist
**Severity:** HIGH
**Impact:** `getMyProjects()` in frontend calls `GET /projects/my` — if the route doesn't exist employees get 404 and see no projects in dropdown.
**Fix:** Verify or create `GET /api/projects/my` that returns only projects where the authenticated user is assigned.

### GAP 2: Project Manager / Team Leader Cannot Approve Timesheets
**Severity:** HIGH (Core Business Requirement)
**Impact:** PMs and TLs assigned to a project cannot approve the time entries submitted by their team members.
**Fix:**
- Backend: When evaluating approval permission, check if the approver is a PM or TL of the project referenced in the time entry
- Frontend: Show Approve/Reject buttons to users who are PM or TL of at least one project
- Backend: Scope the visible time entries for PM/TL to only their project's entries

### GAP 3: Employee Filter Missing from Timesheet UI
**Severity:** HIGH
**Impact:** HR/Admin/PM/TL cannot filter the timesheet table to see a specific employee's entries.
**Fix:** Add employee dropdown filter to the timesheet header filters section, visible to `canManageTimesheet` users.

### GAP 4: `manager` and `leads` Roles Not Handled for Project Filtering
**Severity:** MEDIUM
**Impact:** Employees with `role === 'manager'` get ALL projects in dropdown (same as admin), instead of only their assigned projects.
**Fix:** Extend the backend project filter to also apply to `manager` and `leads` roles (same filtering logic as `employee`).

### GAP 5: No Project-Scoped Timesheet View for PM/TL
**Severity:** HIGH
**Impact:** Project Managers and Team Leaders need a view that shows ONLY their project's time entries across all assigned team members.
**Fix:**
- Backend: Add `GET /api/timetracking/project/:projectId` with PM/TL authorization
- Frontend: When user is PM/TL, show "My Projects' Timesheets" view with project selector

### GAP 6: Active Project Filter for Employees
**Severity:** MEDIUM
**Impact:** Employees can select cancelled/on-hold projects in the Add Entry modal.
**Fix:** Filter projectOptions to only show `status === 'Active'` projects in the modal dropdown.

### GAP 7: No Project-Scoped Stats for PM/TL
**Severity:** MEDIUM
**Impact:** The stats cards show global stats (total hours, billable hours), but PM/TL need project-specific stats.
**Fix:** Add project-filtered stats endpoint and dynamic stats cards based on selected project.

### GAP 8: Task Dropdown Missing from Add Entry Modal
**Severity:** MEDIUM
**Impact:** The `taskId` field exists in the form data and TimeEntry schema, but there's no task selection dropdown in the modal.
**Fix:** After project selection, dynamically load tasks assigned to that employee in that project and show a task dropdown.

### GAP 9: Two Time Systems — Not Integrated
**Severity:** HIGH (Architecture)
**Impact:** Both TimeEntry (daily, used in UI) and Timesheet (weekly, backend-only) exist independently. No rollup or linking mechanism.
**Decision Required:** Either merge both into one system, or clearly define how daily entries aggregate into weekly timesheets.

### GAP 10: No Real Export Functionality
**Severity:** LOW
**Impact:** "Export as PDF" and "Export as Excel" buttons are UI-only with no backend implementation.
**Fix:** Implement export endpoints in backend and wire frontend buttons.

---

## 9. API Endpoint Inventory

### TimeTracking (Daily Entries) — `/api/timetracking`

| Method | Endpoint | Auth | Current Role Restriction | Notes |
|--------|----------|------|--------------------------|-------|
| GET | `/api/timetracking` | Yes | Admin/HR/Superadmin only | ❌ PM/TL excluded |
| GET | `/api/timetracking/:id` | Yes | All authenticated | ✅ |
| GET | `/api/timetracking/user/:userId` | Yes | All authenticated | Used by employees |
| GET | `/api/timetracking/project/:projectId` | Yes | All authenticated | ❌ No PM/TL scope check |
| GET | `/api/timetracking/task/:taskId` | Yes | All authenticated | ✅ |
| GET | `/api/timetracking/stats` | Yes | All authenticated | ❌ No project-level stats for PM/TL |
| POST | `/api/timetracking` | Yes | All authenticated | ❌ No project assignment validation |
| PUT | `/api/timetracking/:id` | Yes | Owner or Admin | ✅ |
| DELETE | `/api/timetracking/:id` | Yes | Owner or Admin | ✅ |
| POST | `/api/timetracking/submit` | Yes | All authenticated | ✅ |
| POST | `/api/timetracking/approve` | Yes | Admin/HR/Superadmin | ❌ PM/TL excluded |
| POST | `/api/timetracking/reject` | Yes | Admin/HR/Superadmin | ❌ PM/TL excluded |

### Projects — `/api/projects`

| Method | Endpoint | Auth | Current Role Restriction | Notes |
|--------|----------|------|--------------------------|-------|
| GET | `/api/projects` | Yes | All (employee-filtered) | ❌ `manager`/`leads` not filtered |
| GET | `/api/projects/my` | Yes | All | ❌ May not exist |
| GET | `/api/projects/:id` | Yes | All | ✅ |
| GET | `/api/projects/stats` | Yes | All | ✅ |
| POST | `/api/projects` | Yes | Admin/HR/Manager | ✅ |
| PUT | `/api/projects/:id` | Yes | Admin/HR/Manager | ✅ |
| DELETE | `/api/projects/:id` | Yes | Admin/HR/Manager | ✅ |

### Tasks — `/api/tasks`

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/tasks` | Supports `project`, `assignee` filters |
| GET | `/api/tasks/:id` | Full task with populated data |
| POST | `/api/tasks` | Admin/HR/Manager only |
| PUT | `/api/tasks/:id` | Admin/HR/Manager only |
| DELETE | `/api/tasks/:id` | Admin/HR/Manager only |

---

## 10. UI Flow — Current vs Required

### Current Flow
```
Employee:
  Login → Timesheet Page → Add Today's Work modal
    → Selects project from dropdown (all active projects if /projects/my is broken)
    → Enters hours, description, date
    → Save as Draft
    → Submit Draft → Status: Submitted
    → HR/Admin reviews → Approve/Reject

HR/Admin:
  Login → Timesheet Page → Sees ALL entries (submitted tab auto-selected)
    → Project filter available
    → Approve/Reject submitted entries
```

### Required Flow (After Implementation)

```
Employee (regular team member):
  Login → Timesheet Page → "Add Today's Work"
    → Projects dropdown: ONLY shows Active projects they're assigned to
    → Task dropdown: ONLY shows tasks assigned to them in selected project
    → Submit → Appears in PM/TL's approval queue for that project

Project Manager / Team Leader:
  Login → Timesheet Page → Special "Project Manager" view
    → Top: Project selector showing only their managed projects
    → Table: Shows ALL team members' entries for selected project
    → Employee filter: Filter by specific team member
    → Date filter: Same as current
    → Status tabs: All, Draft, Submitted, Approved, Rejected
    → Approve/Reject buttons on Submitted entries
    → Stats cards: Project-specific (total hours, billable hours, per-member breakdown)

HR / Admin:
  Login → Timesheet Page → Full cross-project view
    → Project filter: ALL projects
    → Employee filter: ALL employees
    → All actions: Approve, Reject, Override
    → Export functionality
```

---

## Summary of Findings

| Category | Current Status | Priority |
|----------|----------------|---------|
| Employee project filtering | Partial (backend OK, `/projects/my` unverified) | HIGH |
| PM/TL timesheet view | Missing entirely | HIGH |
| PM/TL approve/reject | Missing entirely | HIGH |
| Employee filter in UI | Missing | HIGH |
| `manager`/`leads` role project filtering | Broken (gets all projects) | MEDIUM |
| Task dropdown in Add Entry modal | Missing | MEDIUM |
| Active-only project filter in modal | Missing | MEDIUM |
| Project-scoped stats for PM/TL | Missing | MEDIUM |
| Weekly timesheet ↔ daily entry integration | Not defined | HIGH (Architecture) |
| Export functionality | UI-only, no backend | LOW |

---

*Report generated: 2026-02-25*
*Next: See [TIMESHEET_IMPLEMENTATION_PLAN.md](./TIMESHEET_IMPLEMENTATION_PLAN.md) for the full phase-by-phase implementation plan.*
