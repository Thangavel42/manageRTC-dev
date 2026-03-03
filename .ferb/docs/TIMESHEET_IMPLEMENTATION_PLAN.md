# Timesheet & Project Management — Implementation Plan

**Date:** 2026-02-25
**Reference:** [TIMESHEET_PROJECT_ANALYSIS_REPORT.md](./TIMESHEET_PROJECT_ANALYSIS_REPORT.md)
**Scope:** Phase-by-phase implementation for role-based timesheet system

---

## Overview: Role-Based Capability Matrix (Target)

| Role | Create Entry | View Entries | Project Scope | Approve/Reject | Filter by Employee | Filter by Project |
|------|-------------|--------------|---------------|---------------|-------------------|------------------|
| **Employee** | ✅ Own assigned | ✅ Own only | Only assigned (Active) | ❌ | ❌ | ❌ |
| **Leads** | ✅ Own assigned | ✅ Own only | Only assigned (Active) | ❌ | ❌ | ❌ |
| **Manager** | ✅ Own assigned | ✅ Own only | Only assigned (Active) | ❌ | ❌ | ❌ |
| **Team Leader** (project-assigned) | ✅ Own assigned | ✅ All in their projects | Only their projects | ✅ For their projects | ✅ Within their projects | ✅ Their projects |
| **Project Manager** (project-assigned) | ✅ Own assigned | ✅ All in their projects | Only their projects | ✅ For their projects | ✅ Within their projects | ✅ Their projects |
| **HR** | ✅ Any | ✅ All | All | ✅ All | ✅ All | ✅ All |
| **Admin** | ✅ Any | ✅ All | All | ✅ All | ✅ All | ✅ All |
| **Superadmin** | ✅ Any | ✅ All | All | ✅ All | ✅ All | ✅ All |

---

## Phase 1: Backend — Fix Project Assignment & Routing

### 1.1 Verify/Create `GET /api/projects/my` Endpoint

**File:** `backend/routes/api/projects.js` + `backend/controllers/rest/project.controller.js`

**Problem:** Frontend calls `GET /projects/my` via `getMyProjects()` but this dedicated route may not exist.

**Implementation:**

```javascript
// In project.controller.js — add getMyProjects function
export const getMyProjects = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const collections = getTenantCollections(user.companyId);

  // Find the employee document for this user
  const employee = await collections.employees.findOne({
    $or: [
      { clerkUserId: user.userId },
      { 'account.userId': user.userId }
    ],
    isDeleted: { $ne: true }
  });

  if (!employee) {
    return sendSuccess(res, [], 'No assigned projects found');
  }

  const employeeMongoId = employee._id;
  const employeeMongoIdStr = employee._id.toString();

  const ProjectModel = getTenantModel(user.companyId, 'Project', Project.schema);

  const projects = await ProjectModel.find({
    $and: [
      { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      { status: { $in: ['Active'] } },  // Only Active projects
      {
        $or: [
          { teamMembers: employeeMongoId },
          { teamMembers: employeeMongoIdStr },
          { teamLeader: employeeMongoId },
          { teamLeader: employeeMongoIdStr },
          { projectManager: employeeMongoId },
          { projectManager: employeeMongoIdStr }
        ]
      }
    ]
  })
  .select('_id projectId name status priority')
  .sort({ name: 1 })
  .lean();

  return sendSuccess(res, projects, 'My projects retrieved successfully');
});
```

**Route addition in `projects.js`:**
```javascript
router.get('/my', authenticate, getMyProjects);
// IMPORTANT: Must be before /:id to avoid 'my' being treated as an ID
```

**Files to modify:**
- `backend/controllers/rest/project.controller.js` — add `getMyProjects`
- `backend/routes/api/projects.js` — add `GET /my` route (before `/:id`)

---

### 1.2 Fix `manager` and `leads` Role Project Filtering

**File:** `backend/controllers/rest/project.controller.js`

**Problem:** Only `role === 'employee'` gets project assignment filtering. `manager` and `leads` roles get ALL projects.

**Fix in `getProjects`:**
```javascript
// Change from:
if (user.role?.toLowerCase() === 'employee') {

// Change to:
const restrictedRoles = ['employee', 'manager', 'leads'];
if (restrictedRoles.includes(user.role?.toLowerCase())) {
  // Apply same employee-based project filtering
}
```

**Files to modify:**
- `backend/controllers/rest/project.controller.js` — lines ~66-112

---

### 1.3 Determine if User is Project Manager or Team Leader

**New utility function** (add to `backend/utils/projectRole.js`):

```javascript
/**
 * Check if a user is a Project Manager or Team Leader for any project
 * Returns: { isProjectPM: bool, isProjectTL: bool, pmProjects: [ObjectId], tlProjects: [ObjectId] }
 */
export const getUserProjectRoles = async (collections, userId) => {
  // Find employee by Clerk userId
  const employee = await collections.employees.findOne({
    $or: [{ clerkUserId: userId }, { 'account.userId': userId }],
    isDeleted: { $ne: true }
  });

  if (!employee) return { isProjectPM: false, isProjectTL: false, pmProjects: [], tlProjects: [] };

  const eId = employee._id;
  const eIdStr = employee._id.toString();

  // Find projects where this employee is PM
  const pmProjects = await collections.projects.find({
    $and: [
      { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      { $or: [{ projectManager: eId }, { projectManager: eIdStr }] }
    ]
  }, { projection: { _id: 1 } }).toArray();

  // Find projects where this employee is TL
  const tlProjects = await collections.projects.find({
    $and: [
      { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      { $or: [{ teamLeader: eId }, { teamLeader: eIdStr }] }
    ]
  }, { projection: { _id: 1 } }).toArray();

  return {
    isProjectPM: pmProjects.length > 0,
    isProjectTL: tlProjects.length > 0,
    pmProjects: pmProjects.map(p => p._id),
    tlProjects: tlProjects.map(p => p._id),
    employee
  };
};
```

**Files to create:**
- `backend/utils/projectRole.js`

---

### 1.4 Add PM/TL Scope to TimeTracking Endpoints

**File:** `backend/controllers/rest/timetracking.controller.js`

**GET /api/timetracking — extend with PM/TL project scope:**
```javascript
export const getTimeEntries = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const collections = getTenantCollections(user.companyId);

  // Determine if user is PM or TL
  const { isProjectPM, isProjectTL, pmProjects, tlProjects } = await getUserProjectRoles(
    collections, user.userId
  );

  const isManager = ['admin', 'hr', 'superadmin'].includes(user.role?.toLowerCase());
  const canManage = isManager || isProjectPM || isProjectTL;

  if (!canManage) {
    // Regular employee — redirect to their own entries
    return res.status(403).json({ error: 'Access denied. Use /user/:userId for your entries.' });
  }

  let projectScope = null;
  if (!isManager && (isProjectPM || isProjectTL)) {
    // PM/TL: scope to their projects only
    projectScope = [...new Set([
      ...pmProjects.map(p => p.toString()),
      ...tlProjects.map(p => p.toString())
    ])];
  }

  const filters = { /* ... existing filters ... */ };

  // Apply project scope for PM/TL (override incoming projectId if not in their scope)
  if (projectScope) {
    if (filters.projectId) {
      if (!projectScope.includes(filters.projectId)) {
        return sendSuccess(res, [], 'No entries found for this project');
      }
    } else {
      filters.projectIds = projectScope; // Filter to all their projects
    }
  }

  // ... rest of existing logic
});
```

**POST /api/timetracking/approve — extend to allow PM/TL:**
```javascript
export const approveTimeEntries = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const collections = getTenantCollections(user.companyId);

  const isAdmin = ['admin', 'hr', 'superadmin'].includes(user.role?.toLowerCase());

  if (!isAdmin) {
    // Check if PM/TL for the entries' project
    const { isProjectPM, isProjectTL, pmProjects, tlProjects } = await getUserProjectRoles(
      collections, user.userId
    );

    if (!isProjectPM && !isProjectTL) {
      throw buildForbiddenError('Only admins, HR, Project Managers, or Team Leaders can approve timesheets');
    }

    // Validate that all entries being approved belong to PM/TL's projects
    const authorizedProjectIds = new Set([
      ...pmProjects.map(p => p.toString()),
      ...tlProjects.map(p => p.toString())
    ]);

    // Fetch the entries to validate project scope
    const entriesToApprove = await timeTrackingService.getEntriesByIds(user.companyId, timeEntryIds);
    const unauthorized = entriesToApprove.filter(e =>
      !authorizedProjectIds.has(e.projectId?.toString())
    );

    if (unauthorized.length > 0) {
      throw buildForbiddenError('You do not have permission to approve entries for some of these projects');
    }
  }

  // ... proceed with existing approval logic
});
```

**Files to modify:**
- `backend/controllers/rest/timetracking.controller.js`
- `backend/routes/api/timetracking.js` — relax role middleware from `requireRole('admin', 'hr')` to allow PM/TL check at controller level

---

### 1.5 Add Employee-Based Filter to TimeTracking

**Backend support (already exists via `userId` query param):**
The `GET /api/timetracking` already supports `userId` as a filter. No backend change needed.

**Frontend:** See Phase 2 for UI implementation.

---

## Phase 2: Frontend — Timesheet UI Enhancements

### 2.1 Enhanced Role Detection in timesheet.tsx

**File:** `react/src/feature-module/hrm/attendance/timesheet.tsx`

**Add PM/TL detection state:**
```typescript
// New state to track project-level roles
const [myManagedProjects, setMyManagedProjects] = useState<Project[]>([]);
const [isProjectManager, setIsProjectManager] = useState(false);
const [isTeamLeader, setIsTeamLeader] = useState(false);

// Derived permission flags
const isProjectLevelManager = isProjectManager || isTeamLeader;
const canApproveTimesheet = canManageTimesheet || isProjectLevelManager;
const canSeeAllEntries = canManageTimesheet || isProjectLevelManager;
```

**New useEffect to detect PM/TL role:**
```typescript
useEffect(() => {
  const detectProjectRoles = async () => {
    if (!isEmployeeOrManager) return; // Skip for admin/hr

    // Fetch all projects where user is PM or TL
    const allProjects = await fetchProjects({ status: 'Active' });
    const managedProjects = (allProjects || []).filter(p => {
      const userId = clerkUserId;
      return (
        p.projectManager?.includes(userId) ||
        p.teamLeader?.includes(userId)
      );
    });

    setMyManagedProjects(managedProjects);
    setIsProjectManager(managedProjects.some(p => p.projectManager?.includes(clerkUserId)));
    setIsTeamLeader(managedProjects.some(p => p.teamLeader?.includes(clerkUserId)));
  };

  detectProjectRoles();
}, [clerkUserId]);
```

> **Note:** The above requires the backend to return populated `projectManager` and `teamLeader` arrays with user IDs or employee IDs. Verify backend population in `GET /projects` response.

---

### 2.2 Employee Filter Dropdown (for HR/Admin/PM/TL)

**Add to the filter row in timesheet.tsx:**

```tsx
{/* Employee filter — visible to canSeeAllEntries users */}
{canSeeAllEntries && (
  <div className="dropdown me-3">
    <select
      className="form-select btn-white"
      value={selectedEmployee}
      onChange={(e) => handleEmployeeFilter(e.target.value)}
      style={{ minWidth: 180 }}
    >
      <option value="">All Employees</option>
      {employeeOptions.map(emp => (
        <option key={emp.value} value={emp.value}>
          {emp.label}
        </option>
      ))}
    </select>
  </div>
)}
```

**New state and handler:**
```typescript
const [selectedEmployee, setSelectedEmployee] = useState<string>('');
const [employees, setEmployees] = useState<Employee[]>([]);

const handleEmployeeFilter = (userId: string) => {
  setSelectedEmployee(userId);
  fetchTimeEntries({
    page: 1,
    limit: 50,
    ...(userId ? { userId } : {}),
    ...(selectedProject ? { projectId: selectedProject } : {}),
    ...dateRange
  });
};

// Employee options for dropdown
const employeeOptions = useMemo(() => {
  // If PM/TL: show only employees in their projects
  // If admin/HR: show all employees
  return employees.map(e => ({
    value: e.clerkUserId || e._id,
    label: `${e.firstName} ${e.lastName} (${e.employeeId})`
  }));
}, [employees]);
```

**New hook call** (add `useEmployeesREST` or use existing hook):
```typescript
const { employees, fetchEmployees } = useEmployeesREST();

useEffect(() => {
  if (canSeeAllEntries) {
    fetchEmployees({ status: 'Active' });
  }
}, [canSeeAllEntries]);
```

---

### 2.3 Project Selector for PM/TL View

When user is a PM or TL, show a **project selector** above the table that limits the view to that project's entries:

```tsx
{/* PM/TL: My Projects selector */}
{isProjectLevelManager && !canManageTimesheet && (
  <div className="alert alert-info d-flex align-items-center mb-3">
    <i className="ti ti-briefcase me-2 fs-5" />
    <span>
      <strong>Project Manager / Team Leader View</strong>
      — You can review and approve time entries for your assigned projects.
    </span>
  </div>
)}
```

The existing **Project filter dropdown** should be visible to PM/TL as well (currently only `canManageTimesheet`):
```typescript
// Change from:
{canManageTimesheet && (
  <div className="dropdown me-3">Project filter</div>
)}

// Change to:
{canSeeAllEntries && (
  <div className="dropdown me-3">Project filter</div>
)}
```

---

### 2.4 Task Dropdown in "Add Today's Work" Modal

**Add task selection after project is selected:**

```tsx
{/* Task selection (optional) */}
<div className="col-md-12">
  <div className="mb-3">
    <label className="form-label">Task (optional)</label>
    <select
      className="form-control"
      value={formData.taskId}
      onChange={(e) => handleInputChange('taskId', e.target.value)}
      disabled={!formData.projectId || loadingTasks}
    >
      <option value="">No specific task</option>
      {!formData.projectId && (
        <option disabled>Select a project first</option>
      )}
      {taskOptions.map(task => (
        <option key={task.value} value={task.value}>{task.label}</option>
      ))}
    </select>
    {isEmployeeOrManager && formData.projectId && taskOptions.length === 0 && !loadingTasks && (
      <small className="text-muted">No tasks assigned to you in this project.</small>
    )}
  </div>
</div>
```

**New state and effect:**
```typescript
const [taskOptions, setTaskOptions] = useState<{ value: string; label: string }[]>([]);
const [loadingTasks, setLoadingTasks] = useState(false);

// Load tasks when project changes
useEffect(() => {
  const loadTasks = async () => {
    if (!formData.projectId) {
      setTaskOptions([]);
      return;
    }
    setLoadingTasks(true);
    // Fetch tasks for this project, filtered by assignee if employee
    const tasks = await fetchTasks({
      projectId: formData.projectId,
      ...(isEmployeeOrManager ? { assignee: employeeId } : {})
    });
    setTaskOptions(
      (tasks || []).map(t => ({ value: t._id, label: t.title }))
    );
    setLoadingTasks(false);
  };
  loadTasks();
}, [formData.projectId]);
```

---

### 2.5 Active-Only Projects in Modal

**In the "Add Today's Work" modal, filter projectOptions to Active only:**
```typescript
const projectOptions = useMemo(() => {
  if (!projects) return [];
  return projects
    .filter(p => p.status === 'Active')  // Add this filter
    .map(p => ({ value: p._id, label: p.name }));
}, [projects]);
```

---

### 2.6 Approve/Reject Buttons for PM/TL

**In `buildActionsColumn`:**
```typescript
// Change from:
if (canManageTimesheet) {
  // show approve/reject

// Change to:
if (canApproveTimesheet) {
  // For PM/TL: only show if entry's project is in their managed projects
  const entryProjectId = record.projectId || record.projectDetails?.projectId;
  const canApproveThisEntry = canManageTimesheet ||
    myManagedProjects.some(p => p._id === entryProjectId || p.projectId === entryProjectId);

  if (record.status === 'Submitted' && canApproveThisEntry) {
    return (
      <div>Approve / Reject buttons...</div>
    );
  }
}
```

---

### 2.7 PM/TL Stats Cards (Project-Specific)

When PM/TL has a project selected, show project-specific stats:

```tsx
{/* PM/TL: Project-specific stats */}
{isProjectLevelManager && selectedProject && (
  <div className="row g-3 mb-3">
    <div className="col-md-3">
      <div className="card">
        <div className="card-body">
          <h6>Project Hours (This Month)</h6>
          <h4>{projectStats?.totalHours?.toFixed(1) || '0.0'}h</h4>
        </div>
      </div>
    </div>
    <div className="col-md-3">
      <div className="card">
        <div className="card-body">
          <h6>Team Members</h6>
          <h4>{projectStats?.memberCount || 0}</h4>
        </div>
      </div>
    </div>
    <div className="col-md-3">
      <div className="card">
        <div className="card-body">
          <h6>Pending Approvals</h6>
          <h4>{projectStats?.pendingCount || 0}</h4>
        </div>
      </div>
    </div>
    <div className="col-md-3">
      <div className="card">
        <div className="card-body">
          <h6>Billable Hours</h6>
          <h4>{projectStats?.billableHours?.toFixed(1) || '0.0'}h</h4>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## Phase 3: Backend — Timesheet Service Enhancements

### 3.1 Add `projectIds` (Array) Filter to TimeTracking Service

**File:** `backend/services/timeTracking/timeTracking.service.js`

Currently supports `projectId` (single). Add support for `projectIds` (array) for PM/TL:

```javascript
// In buildTimeEntryFilter or getTimeEntries:
if (filters.projectIds && Array.isArray(filters.projectIds)) {
  query.projectId = { $in: filters.projectIds.map(id => {
    try { return new ObjectId(id); } catch { return id; }
  }) };
} else if (filters.projectId) {
  try {
    query.projectId = new ObjectId(filters.projectId);
  } catch {
    query.projectId = filters.projectId;
  }
}
```

---

### 3.2 Project-Scoped Stats Endpoint

**Add new endpoint:** `GET /api/timetracking/project/:projectId/stats`

```javascript
export const getProjectTimesheetStats = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { startDate, endDate } = req.query;
  const user = extractUser(req);
  const collections = getTenantCollections(user.companyId);

  // Verify user has access to this project (PM, TL, admin, hr)
  const isAdmin = ['admin', 'hr', 'superadmin'].includes(user.role?.toLowerCase());
  if (!isAdmin) {
    const { pmProjects, tlProjects } = await getUserProjectRoles(collections, user.userId);
    const authorizedIds = [...pmProjects, ...tlProjects].map(p => p.toString());
    if (!authorizedIds.includes(projectId)) {
      throw buildForbiddenError('Not authorized to view stats for this project');
    }
  }

  // Build date filter
  const dateFilter = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);

  // Aggregate stats
  const stats = await collections.timeentries.aggregate([
    {
      $match: {
        projectId: new ObjectId(projectId),
        isDeleted: { $ne: true },
        ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
      }
    },
    {
      $group: {
        _id: '$userId',
        totalHours: { $sum: '$duration' },
        billableHours: { $sum: { $cond: ['$billable', '$duration', 0] } },
        entryCount: { $sum: 1 },
        pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'Submitted'] }, 1, 0] } }
      }
    }
  ]).toArray();

  const totals = {
    totalHours: stats.reduce((s, m) => s + m.totalHours, 0),
    billableHours: stats.reduce((s, m) => s + m.billableHours, 0),
    memberCount: stats.length,
    pendingCount: stats.reduce((s, m) => s + m.pendingCount, 0),
    memberBreakdown: stats
  };

  return sendSuccess(res, totals, 'Project timesheet stats retrieved');
});
```

---

### 3.3 Validate Project Assignment on Entry Creation

**File:** `backend/controllers/rest/timetracking.controller.js`

When an employee creates a time entry, verify they are actually assigned to that project:

```javascript
export const createTimeEntry = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { projectId } = req.body;
  const collections = getTenantCollections(user.companyId);

  // For non-admin users: verify project assignment
  const isAdmin = ['admin', 'hr', 'superadmin'].includes(user.role?.toLowerCase());
  if (!isAdmin && projectId) {
    const employee = await collections.employees.findOne({
      $or: [{ clerkUserId: user.userId }, { 'account.userId': user.userId }],
      isDeleted: { $ne: true }
    });

    if (employee) {
      const eId = employee._id;
      const eIdStr = employee._id.toString();

      const project = await collections.projects.findOne({
        _id: new ObjectId(projectId),
        $or: [
          { teamMembers: eId }, { teamMembers: eIdStr },
          { teamLeader: eId }, { teamLeader: eIdStr },
          { projectManager: eId }, { projectManager: eIdStr }
        ],
        isDeleted: { $ne: true }
      });

      if (!project) {
        throw buildForbiddenError('You are not assigned to this project');
      }
    }
  }

  // ... rest of existing create logic
});
```

---

## Phase 4: Frontend — New useTasksREST Hook Integration

### 4.1 Verify/Create useTasksREST Hook

**File:** `react/src/hooks/useTasksREST.ts` (create if missing)

```typescript
export const useTasksREST = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async (filters: TaskFilters = {}) => {
    setLoading(true);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Task[]> = await get('/tasks', { params });
      if (response.success && response.data) {
        setTasks(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { tasks, loading, fetchTasks };
};
```

---

## Phase 5: New "Project Timesheet" View (PM/TL Dedicated Tab)

Consider adding a dedicated tab/section for PM/TL to see their projects' timesheets in an organized way:

### 5.1 Project-Based Summary Table

When a PM/TL selects a project from the project dropdown, show a **per-employee summary** view as well as individual entries:

```
[Project Selector: Dropdown of PM's projects]

[Summary Table]
Employee | Total Hours | Billable | Approved | Pending | Rejected
---------|------------|---------|---------|---------|--------
John Doe |    40.5h   |  32.0h  |   8     |   2     |    0
Jane Smith |  38.0h   |  38.0h  |   6     |   1     |    1
                                                    [Approve All Pending]
```

This requires a new aggregation endpoint: `GET /api/timetracking/project/:projectId/summary`

### 5.2 Employee → Timesheet Drill-Down

From the summary, PM/TL can click an employee to see their individual entries:

```
[Back to Project Summary] John Doe's entries — Project: E-Commerce Redesign

Date    | Task      | Description         | Hours | Status   | Action
--------|-----------|---------------------|-------|----------|--------
Feb 25  | Frontend  | Built login page     |  4.0h | Submitted | [✓] [✗]
Feb 24  | Backend   | API integration      |  6.5h | Submitted | [✓] [✗]
Feb 23  | Testing   | Unit tests written   |  3.0h | Approved  | —
```

---

## Phase 6: Export Functionality

### 6.1 Backend Export Endpoint

**New endpoint:** `GET /api/timetracking/export`

```javascript
export const exportTimeEntries = asyncHandler(async (req, res) => {
  const { format, projectId, userId, startDate, endDate, status } = req.query;
  const user = extractUser(req);

  // ... fetch entries with filters ...

  if (format === 'csv') {
    const csv = convertToCSV(entries);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="timesheet.csv"');
    return res.send(csv);
  }

  if (format === 'pdf') {
    // Use a PDF library like puppeteer or pdfkit
    const pdf = await generatePDF(entries);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="timesheet.pdf"');
    return res.send(pdf);
  }
});
```

### 6.2 Frontend Export Wiring

Replace the current placeholder export buttons in timesheet.tsx:

```tsx
<li>
  <button
    className="dropdown-item rounded-1"
    onClick={() => handleExport('pdf')}
  >
    <i className="ti ti-file-type-pdf me-1" />Export as PDF
  </button>
</li>
<li>
  <button
    className="dropdown-item rounded-1"
    onClick={() => handleExport('csv')}
  >
    <i className="ti ti-file-type-xls me-1" />Export as Excel/CSV
  </button>
</li>
```

---

## Implementation Sequence & Priority

### Sprint 1 (High Priority — Core Role-Based Access)

| Task | File(s) | Effort | Priority |
|------|---------|--------|---------|
| Create `GET /api/projects/my` route | `project.controller.js`, `projects.js` | Small | P0 |
| Fix `manager`/`leads` project filtering | `project.controller.js` | Small | P0 |
| Create `backend/utils/projectRole.js` | New file | Small | P0 |
| Validate project assignment on entry create | `timetracking.controller.js` | Small | P1 |
| PM/TL approve/reject in backend | `timetracking.controller.js` | Medium | P1 |
| PM/TL role detection in frontend | `timesheet.tsx` | Medium | P1 |
| Show project filter to PM/TL | `timesheet.tsx` | Small | P1 |
| Show approve/reject to PM/TL | `timesheet.tsx` | Medium | P1 |

### Sprint 2 (Medium Priority — Enhanced Filters & UX)

| Task | File(s) | Effort | Priority |
|------|---------|--------|---------|
| Employee filter dropdown in timesheet | `timesheet.tsx` + hook | Medium | P2 |
| Task dropdown in Add Entry modal | `timesheet.tsx` | Medium | P2 |
| Active-only project filter in modal | `timesheet.tsx` | Small | P2 |
| PM/TL view banner/alert | `timesheet.tsx` | Small | P2 |
| Project-scoped stats endpoint | `timetracking.controller.js` | Medium | P2 |
| PM/TL stats cards in frontend | `timesheet.tsx` | Medium | P2 |

### Sprint 3 (Lower Priority — Project Summary View & Export)

| Task | File(s) | Effort | Priority |
|------|---------|--------|---------|
| Project-based summary table for PM/TL | New component + endpoint | Large | P3 |
| Employee drill-down from summary | New component + endpoint | Large | P3 |
| CSV/PDF export backend | `timetracking.controller.js` | Medium | P3 |
| Export button wiring in frontend | `timesheet.tsx` | Small | P3 |

---

## File Change Summary

### New Files to Create
| File | Purpose |
|------|---------|
| `backend/utils/projectRole.js` | Helper to determine PM/TL role for a user |
| `react/src/hooks/useTasksREST.ts` | Task fetching hook for modal |
| `react/src/hooks/useEmployeesREST.ts` | Employee list hook for filter dropdown (if not exists) |

### Existing Files to Modify

| File | Changes |
|------|---------|
| `backend/controllers/rest/project.controller.js` | Add `getMyProjects()`, fix `manager`/`leads` filtering |
| `backend/routes/api/projects.js` | Add `GET /my` route |
| `backend/controllers/rest/timetracking.controller.js` | PM/TL access, project assignment validation, project stats |
| `backend/services/timeTracking/timeTracking.service.js` | Add `projectIds` array filter |
| `react/src/feature-module/hrm/attendance/timesheet.tsx` | PM/TL detection, employee filter, task dropdown, active project filter, PM/TL approve buttons |
| `react/src/hooks/useProjectsREST.ts` | Ensure `getMyProjects` works correctly |

---

## UI Wireframe: Timesheet Page by Role

### Employee View
```
┌─────────────────────────────────────────────────────────────────┐
│ Timesheets                              [Submit 3 Drafts] [+ Add] │
├──────────┬──────────┬───────────┬──────────────────────────────┤
│ Total 40h │Billable 32h│ 8 Entries │ ■ 3 Draft ■ 2 Submitted ■ 3 Approved │
├─────────────────────────────────────────────────────────────────┤
│                                    [Filter by Date ▼]           │
│ [All] [Draft 3] [Submitted 2] [Approved 3] [Rejected 0]         │
├────────┬──────┬──────────────┬───────────┬──────┬────────┬──────┤
│Employee│ Date │   Project    │Description│ Hours│ Status │Action│
│(you)   │Feb25 │Project Alpha │ Work done │ 4.0h │ Draft  │→ ✎ 🗑│
└────────┴──────┴──────────────┴───────────┴──────┴────────┴──────┘
```

### Project Manager / Team Leader View
```
┌─────────────────────────────────────────────────────────────────┐
│ Timesheets — Project Manager View              [+ Add My Work]   │
├─────────────────────────────────────────────────────────────────┤
│ ℹ️  Project Manager/Team Leader View — Review team time entries  │
├──────────┬──────────┬───────────┬──────────────────────────────┤
│Total 240h│Billable 180h│14 Members│ ■ 5 Pending Approval         │
│          │          │           │ ■ 42 Submitted ■ 120 Approved  │
├─────────────────────────────────────────────────────────────────┤
│ ⚠️ 42 entries pending approval                    [→ View All]   │
├───────────────────────────────────────────────────────────────┤
│  [Project: E-Commerce Redesign ▼] [Employee: All ▼] [Date ▼]  │
│  [All] [Draft] [Submitted 42] [Approved] [Rejected]            │
├────────┬──────┬──────────────┬───────────┬──────┬────────┬──────┤
│Employee│ Date │   Project    │Description│Hours │ Status │Action│
│John Doe│Feb25 │E-Commerce... │ Login page│ 4.0h │Submit  │✓ ✗  │
│Jane S. │Feb25 │E-Commerce... │ API tests │ 6.5h │Submit  │✓ ✗  │
└────────┴──────┴──────────────┴───────────┴──────┴────────┴──────┘
```

### HR / Admin View
```
┌─────────────────────────────────────────────────────────────────┐
│ Timesheets — HR Admin View                         [+ Add] [Export ▼] │
├──────────┬──────────┬───────────┬──────────────────────────────┤
│Total 850h│Billable X│ 65 Entries│ ■ 18 Pending                 │
├─────────────────────────────────────────────────────────────────┤
│ ⚠️ 18 entries pending your approval               [→ View]       │
├─────────────────────────────────────────────────────────────────┤
│ [Project: All ▼] [Employee: All ▼] [Date ▼]                    │
│ [All] [Draft] [Submitted 18] [Approved] [Rejected]              │
├────────┬──────┬──────────────┬───────────┬──────┬────────┬──────┤
│Employee│ Date │   Project    │Description│Hours │ Status │Action│
│John Doe│Feb25 │Project Alpha │ Login page│ 4.0h │Submit  │✓ ✗  │
└────────┴──────┴──────────────┴───────────┴──────┴────────┴──────┘
```

---

## Edge Cases to Handle

| Case | Handling |
|------|---------|
| Employee assigned to 0 projects | Show warning in Add modal: "Not assigned to any active projects" |
| PM approves entry not in their project | Backend returns 403 Forbidden |
| Employee submits entry for project they're not assigned to | Backend returns 403 Forbidden |
| PM is also an employee (dual role) | Check project.projectManager[] using their employee ObjectId |
| TL is moved out of a project mid-week | Entries already submitted before removal: allow existing approvers to handle; new entries from that employee go to HR |
| Project is moved to "On Hold" or "Cancelled" | Existing entries remain; new entries cannot be added for that project |
| Employee switches projects (reassigned) | Historical entries remain as-is; new entries use new project |

---

*Plan created: 2026-02-25*
*Analysis reference: [TIMESHEET_PROJECT_ANALYSIS_REPORT.md](./TIMESHEET_PROJECT_ANALYSIS_REPORT.md)*
