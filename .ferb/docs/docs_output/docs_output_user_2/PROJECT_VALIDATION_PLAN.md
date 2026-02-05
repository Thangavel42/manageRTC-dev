# Brutal Validation Check Plan: project.tsx & projectdetails.tsx

## Executive Summary

This document provides a comprehensive validation plan for project management components in manageRTC-dev. The analysis covers end-to-end processes for add/edit tasks and projects, team member loading, API endpoints, and identifies critical issues.

## Files Being Validated

| File               | Path                                                         | Purpose                                | Lines of Code |
| ------------------ | ------------------------------------------------------------ | -------------------------------------- | ------------- |
| project.tsx        | react/src/feature-module/projects/project/project.tsx        | Project list, add/edit/delete projects | ~2,595        |
| projectdetails.tsx | react/src/feature-module/projects/project/projectdetails.tsx | Project details, task/note management  | ~3,987        |

---

## CRITICAL ISSUES FOUND

### 1. ✅ FIXED: Employees Never Loaded in project.tsx

**File:** `project.tsx`
**Severity:** CRITICAL
**Impact:** Team member selection is completely broken
**Status:** ✅ FIXED (Feb 3, 2026)

**Issue:** The employees state variable is declared but NEVER populated from an API call.

```typescript
// State exists but is never populated!
const [employees, setEmployees] = useState<
  Array<{
    value: string;
    label: string;
    position: string;
    department: string;
    employeeId: string;
  }>
>([]);
```

**Fix Applied:** Added employee loading useEffect:

```typescript
useEffect(() => {
  const loadEmployees = async () => {
    const response = await apiGet('/employees', { params: { limit: 100 } });
    // Process and setEmployees
  };
  loadEmployees();
}, []);
```

**Verification:** ✅ Employee dropdowns now populated in add/edit project modals

### 2. ✅ FIXED: Clients Extracted Instead of Fetched

**File:** `project.tsx`
**Severity:** MEDIUM
**Impact:** Only shows clients that have projects, not all clients
**Status:** ✅ FIXED (Feb 3, 2026)

**Issue:** Clients are derived from existing projects instead of calling `/api/clients`

**Fix Applied:** Call `/api/clients?limit=100` on mount

**Verification:** ✅ All clients now appear in dropdown, including those without projects

## END-TO-END VALIDATION TASKS

### A. ADD PROJECT (project.tsx)

**Flow:** Add Button → Modal Step 1 (Basic Info) → Modal Step 2 (Team Members) → API Call

**STATUS: ✅ COMPLETED - All critical issues fixed (Feb 3, 2026)**

| Step | Validation Point                                               | Status         | Notes                                  |
| ---- | -------------------------------------------------------------- | -------------- | -------------------------------------- |
| 1    | Modal opens correctly                                          | ✅ VERIFIED    | State resets properly                  |
| 2    | Required fields validated (name, client, start, due, priority) | ✅ IMPLEMENTED | `validateAddStepOne()` implemented     |
| 3    | Client dropdown has options                                    | ✅ FIXED       | Now loads from `/api/clients`          |
| 4    | Step 2: Team members can be selected                           | ✅ FIXED       | Employees loaded from `/api/employees` |
| 5    | Team leader can be selected                                    | ✅ FIXED       | Employees loaded from `/api/employees` |
| 6    | Project manager can be selected                                | ✅ FIXED       | Employees loaded from `/api/employees` |
| 7    | Logo upload works (Cloudinary)                                 | ✅ IMPLEMENTED | Max 4MB validation in place            |
| 8    | API POST to /api/projects                                      | ✅ IMPLEMENTED | Response handling verified             |
| 9    | Success toast shown                                            | ✅ IMPLEMENTED | Toast displays on success              |
| 10   | Project list refreshes                                         | ✅ IMPLEMENTED | Socket.IO real-time update             |
| 11   | Modal closes after success                                     | ✅ VERIFIED    | Modal state managed correctly          |
| 12   | Form resets after close                                        | ✅ VERIFIED    | Form data resets to initialFormData    |

**API Endpoint:** `POST /api/projects`
**Request Body:** `{ name, client, description, startDate, dueDate, priority, projectValue, teamMembers, teamLeader, projectManager, logo }`

### B. EDIT PROJECT (project.tsx)

**Flow:** Edit Button → Modal with Tabs → Save Changes → API Call

**STATUS: ✅ COMPLETED (Feb 3, 2026)** - See TEST_CASE_2_COMPLETION.md

| Step | Validation Point                       | Status      | Notes                         |
| ---- | -------------------------------------- | ----------- | ----------------------------- |
| 1    | Edit modal opens with pre-filled data  | ✅ VERIFIED | handleEdit() maps data        |
| 2    | Basic Info tab validates all fields    | ✅ VERIFIED | `validateEditBasicInfo()`     |
| 3    | Team Members tab loads current members | ✅ FIXED    | Employees loaded from API     |
| 4    | Can add/remove team members            | ✅ FIXED    | Employee options available    |
| 5    | Can add/remove team leaders            | ✅ FIXED    | Employee options available    |
| 6    | Can add/remove project managers        | ✅ FIXED    | Employee options available    |
| 7    | API PUT to /api/projects/:id           | ✅ VERIFIED | handleUpdateProject() working |
| 8    | Success toast shown                    | ✅ FIXED    | Toast added for both tabs     |
| 9    | Changes reflect in list                | ✅ VERIFIED | Socket.IO real-time           |
| 10   | Date validation (due > start)          | ✅ VERIFIED | Validation logic in place     |

**API Endpoint:** `PUT /api/projects/:projectId`

### C. DELETE PROJECT (project.tsx)

**STATUS: ✅ VERIFIED (Feb 3, 2026)** - See TEST_CASE_3_COMPLETION.md

| Step | Validation Point                | Status      | Notes                             |
| ---- | ------------------------------- | ----------- | --------------------------------- |
| 1    | Confirmation modal appears      | ✅ VERIFIED | Clear warning with project name   |
| 2    | API DELETE to /api/projects/:id | ✅ VERIFIED | REST hook deleteProject() working |
| 3    | Soft delete (backend)           | ✅ VERIFIED | Sets isDeleted: true, deletedAt   |
| 4    | Success toast shown             | ✅ VERIFIED | message.success() in REST hook    |
| 5    | Project removed from list       | ✅ VERIFIED | Socket.IO real-time update        |

### D. ADD TASK (projectdetails.tsx)

**Flow:** Add Task Button → Modal → Form Validation → REST API POST → Success Toast

**STATUS: ✅ VERIFIED (Feb 3, 2026)** - See TEST_CASE_4_COMPLETION.md

**Architecture: ✅ REST API (Correct)** - Socket.IO only for real-time broadcasting

| Step | Validation Point                       | Status      | Notes                          |
| ---- | -------------------------------------- | ----------- | ------------------------------ |
| 1    | Add Task modal opens                   | ✅ VERIFIED | Modal ID: add_task             |
| 2    | Title required (min 3 chars)           | ✅ VERIFIED | validateTaskField() enforces   |
| 3    | Description required (min 10 chars)    | ✅ VERIFIED | validateTaskField() enforces   |
| 4    | Priority required                      | ✅ VERIFIED | Dropdown validation            |
| 5    | Assignee required (at least 1)         | ✅ VERIFIED | Multi-select with employees    |
| 6    | Due date required & before project end | ✅ VERIFIED | DatePicker with validation     |
| 7    | Employee dropdown has options          | ✅ VERIFIED | loadEmployeesAndClients() REST |
| 8    | API POST to /api/tasks                 | ✅ VERIFIED | createTask() in useTasksREST   |
| 9    | Task appears in list                   | ✅ VERIFIED | Socket.IO + local state update |
| 10   | Success toast shown                    | ✅ VERIFIED | message.success() in REST hook |

**API Endpoint:** `POST /api/tasks` (REST API)
**Request Body:** `{ title, description, priority, assignees, dueDate, projectId, tags, status }`

### E. EDIT TASK (projectdetails.tsx)

**STATUS: ✅ VERIFIED (Feb 3, 2026)** - See TEST_CASE_5_COMPLETION.md

**Architecture: ✅ REST API (Correct)** - PUT /api/tasks/:id

| Step | Validation Point                      | Status      | Notes                                |
| ---- | ------------------------------------- | ----------- | ------------------------------------ |
| 1    | Edit modal opens with pre-filled data | ✅ VERIFIED | handleOpenEditTask() maps all fields |
| 2    | All validations same as add           | ✅ VERIFIED | validateEditTaskForm() enforces      |
| 3    | Status can be changed                 | ✅ VERIFIED | Dropdown with dynamic statuses       |
| 4    | API PUT to /api/tasks/:id             | ✅ VERIFIED | updateTask() in useTasksREST hook    |
| 5    | Changes reflect immediately           | ✅ VERIFIED | Socket.IO + local state update       |
| 6    | Success toast shown                   | ✅ VERIFIED | message.success() in REST hook       |

**API Endpoint:** `PUT /api/tasks/:taskId` (REST API)

### F. DELETE TASK (projectdetails.tsx)

**STATUS: ✅ VERIFIED (Feb 3, 2026)** - See TEST_CASE_6_COMPLETION.md

**Architecture: ✅ REST API (Correct)** - DELETE /api/tasks/:id

| Step | Validation Point             | Status      | Notes                             |
| ---- | ---------------------------- | ----------- | --------------------------------- |
| 1    | Confirmation modal appears   | ✅ VERIFIED | Shows task name and warning       |
| 2    | API DELETE to /api/tasks/:id | ✅ VERIFIED | deleteTask() in useTasksREST hook |
| 3    | Task removed from list       | ✅ VERIFIED | Socket.IO + local state update    |
| 4    | Success toast shown          | ✅ VERIFIED | message.success() in REST hook    |

### G. TEAM MEMBER LOAD (projectdetails.tsx) - ✅ COMPLETED

**Architecture: ✅ REST API (Correct)** - GET /api/employees?limit=100

| Step | Validation Point                 | Status      | Notes                                            |
| ---- | -------------------------------- | ----------- | ------------------------------------------------ |
| 1    | Employees loaded on mount        | ✅ VERIFIED | loadEmployeesAndClients() called in useEffect    |
| 2    | API GET /api/employees?limit=100 | ✅ VERIFIED | apiGet('/employees', { params: { limit: 100 } }) |
| 3    | Employee options populated       | ✅ VERIFIED | setEmployeeOptions(employees)                    |
| 4    | Can view current team members    | ✅ VERIFIED | Displays in project details section              |
| 5    | Can add team members             | ✅ VERIFIED | Modal with employeeOptions dropdown              |
| 6    | Can add team leaders             | ✅ VERIFIED | Modal with employeeOptions dropdown              |
| 7    | Can add project managers         | ✅ VERIFIED | Modal with employeeOptions dropdown              |

**Documentation:** TEST_CASE_7_COMPLETION.md

---

## API ENDPOINTS SUMMARY

### Project APIs

| Method | Endpoint                   | Purpose         | Validation Needed          |
| ------ | -------------------------- | --------------- | -------------------------- |
| GET    | /api/projects              | List projects   | ✅                         |
| POST   | /api/projects              | Create project  | ❌ Verify employees/client |
| GET    | /api/projects/:id          | Get project     | ✅                         |
| PUT    | /api/projects/:id          | Update project  | ❌ Verify employees/client |
| DELETE | /api/projects/:id          | Delete project  | ✅                         |
| GET    | /api/projects/stats        | Statistics      | ✅                         |
| PATCH  | /api/projects/:id/progress | Update progress | ✅                         |

### Task APIs

| Method | Endpoint                      | Purpose           | Validation Needed |
| ------ | ----------------------------- | ----------------- | ----------------- |
| GET    | /api/tasks/project/:projectId | Get project tasks | ✅                |
| POST   | /api/tasks                    | Create task       | ✅                |
| GET    | /api/tasks/:id                | Get task          | ✅                |
| PUT    | /api/tasks/:id                | Update task       | ✅                |
| DELETE | /api/tasks/:id                | Delete task       | ✅                |
| GET    | /api/tasks/statuses           | Task statuses     | ✅                |

### Employee/Client APIs

| Method | Endpoint                 | Purpose        | Status                         |
| ------ | ------------------------ | -------------- | ------------------------------ |
| GET    | /api/employees?limit=100 | Load employees | ✅ Works in projectdetails.tsx |
| GET    | /api/clients?limit=100   | Load clients   | ❌ NOT called in project.tsx   |

---

## MISSING VALIDATIONS

### Form Validations

| Field            | Current Validation    | Missing                             |
| ---------------- | --------------------- | ----------------------------------- |
| Project Name     | Required              | Duplicate check, max length         |
| Project Value    | Required, positive    | Maximum value                       |
| Description      | Required              | Max length                          |
| Due Date         | After start date      | Duration limit (e.g., max 10 years) |
| Team Size        | At least 1 each       | Maximum limits                      |
| Logo             | 4MB limit, type check | Aspect ratio, dimensions            |
| Task Title       | Min 3 chars           | Max length                          |
| Task Description | Min 10 chars          | Max length                          |
| Tags             | -                     | Max count, format validation        |

---

## STATE MANAGEMENT ISSUES

| Issue                         | Location    | Impact                   |
| ----------------------------- | ----------- | ------------------------ |
| employees never set           | project.tsx | Team selection broken    |
| clients derived from projects | project.tsx | Incomplete client list   |
| No success toast on edit      | project.tsx | Poor UX                  |
| No form reset on modal close  | project.tsx | Dirty state possible     |
| Missing useCallback deps      | Both        | Potential stale closures |

---

## VERIFICATION CHECKLIST

### Pre-Implementation Testing

- [ ] Confirm employees API endpoint works: `GET /api/employees?limit=100`
- [ ] Confirm clients API endpoint works: `GET /api/clients?limit=100`
- [ ] Check backend logs for any errors
- [ ] Verify Socket.IO connection works

### Post-Implementation Testing

- [ ] Add project with all fields
- [ ] Add project without optional fields
- [ ] Edit project basic info
- [ ] Edit project team members
- [ ] Delete project with no tasks
- [ ] Delete project with active tasks (should fail)
- [ ] Add task to project
- [ ] Edit task
- [ ] Delete task
- [ ] Change task status
- [ ] Add/edit/delete notes
- [ ] Test all validation error messages
- [ ] Test date edge cases
- [ ] Test with large datasets (pagination)

---

## FILES TO MODIFY

### Critical Fixes Required

**react/src/feature-module/projects/project/project.tsx**

- Add employee loading useEffect
- Add client API loading useEffect
- Add success toast for edit operations
- Fix form reset on modal close

**react/src/feature-module/projects/project/projectdetails.tsx**

- Review and ensure employee loading is robust
- Consider extracting validation to custom hook

### Related Files (Reference)

- `react/src/services/api.ts` - HTTP client
- `backend/routes/api/projects.js` - Project routes
- `backend/controllers/rest/project.controller.js` - Project controller
- `backend/routes/api/employees.js` - Employee routes
- `backend/routes/api/clients.js` - Client routes

---

## VALIDATION TEST SCENARIOS

### Scenario 1: Add New Project (Happy Path)

1. Navigate to Projects page
2. Click "Add New Project"
3. Fill Basic Information tab:
   - Name: "Test Project"
   - Client: [Select from dropdown]
   - Description: "Test description"
   - Start Date: Today
   - Due Date: Next month
   - Priority: High
   - Project Value: 50000
4. Click Next
5. Add Team Members tab:
   - Select 2 team members
   - Select 1 team leader
   - Select 1 project manager
6. Click Save

**Expected:** Success toast, project appears in list

### Scenario 2: Add Project - Validation Errors

1. Click "Add New Project"
2. Leave all fields empty
3. Click Next

**Expected:** All required field errors shown

### Scenario 3: Edit Project

1. Click Edit on existing project
2. Change project name
3. Add new team member
4. Click Save

**Expected:** Changes saved, success toast

### Scenario 4: Add Task

1. Open project details
2. Click "Add Task"
3. Fill task form

**Expected:** Task created, appears in list

| --- | Estimated Impact                      | Status                       |
| --- | ------------------------------------- | ---------------------------- | -------------------------- |
| P0  | Load employees in project.tsx         | Blocks team member selection | ✅ COMPLETED (Feb 3, 2026) |
| P0  | Load clients via API in project.tsx   | Incomplete client dropdown   | ✅ COMPLETED (Feb 3, 2026) |
| P1  | Add success toast for edit operations | Poor feedback                | ✅ COMPLETED (Feb 3, 2026) |
| P1  | Fix form reset on modal close         | Dirty state issues           | ✅ WORKING (Verified)      |
| P2  | Add duplicate project name check      | Data integrity               | ⏳ NOT IMPLEMENTED         |
| P2  | Add max length validations            | Data quality                 | ⏳ NOT IMPLEMENTED         |
| P3  | Extract validation to custom hook     | Code maintainability         | ⏳ NOT IMPLEMENTED         |
| P1  | Fix form reset on modal close         | Dirty state issues           |
| P2  | Add duplicate project name check      | Data integrity               |
| P2  | Add max length validations            | Data quality                 |
| P3  | Extract validation to custom hook     | Code maintainability         |

---

## TODO DOCUMENT CONTENT

To be created at: `react/src/feature-module/projects/VALIDATION_TODO.md`

````markdown
# Project & Task Validation TODO

> Generated: 2026-02-03
> Status: DOCUMENTATION ONLY - No fixes to be implemented

## 🚨 CRITICAL ISSUES TO FIX

### [P0] Fix Employee Loading in project.tsx

**File:** `react/src/feature-module/projects/project/project.tsx`
**Line:** ~70 (employees state declaration)

**Problem:** Employees state is never populated, making team member selection impossible.

**Solution:**

```typescript
// Add this useEffect after the clients useEffect (~line 480)
useEffect(() => {
  const loadEmployees = async () => {
    try {
      const response = await apiGet('/employees', { params: { limit: 100 } });
      const options = response.data.map((emp: any) => ({
        value: emp._id,
        label: `${emp.firstName} ${emp.lastName}`,
        position: emp.position || 'N/A',
        department: emp.department || 'N/A',
        employeeId: emp.employeeId || 'N/A',
      }));
      setEmployees(options);
    } catch (error) {
      console.error('[Project] Failed to load employees:', error);
    }
  };
  loadEmployees();
}, []);
```
````

**Verification:**

- [ ] Add project modal shows employee options
- [ ] Edit project modal shows employee options
- [ ] Team members can be selected
- [ ] Team leaders can be selected
- [ ] Project managers can be selected

### [P0] Fix Client Loading in project.tsx

**File:** `react/src/feature-module/projects/project/project.tsx`

**Problem:** Clients are extracted from existing projects instead of calling the clients API.

**Current Code** (~line 474):

```typescript
const clients = useMemo(() => {
  const uniqueClients = new Set(projects.map((p) => p.client).filter(Boolean));
  return Array.from(uniqueClients).map((client) => ({ value: client, label: client }));
}, [projects]);
```

**Solution:** Replace with API call:

```typescript
const [clients, setClients] = useState<Array<{ value: string; label: string }>>([]);

useEffect(() => {
  const loadClients = async () => {
    try {
      const response = await apiGet('/clients', { params: { limit: 100 } });
      const options = response.data.map((client: any) => ({
        value: client.name, // or client._id depending on requirements
        label: client.name,
      }));
      setClients(options);
    } catch (error) {
      console.error('[Project] Failed to load clients:', error);
    }
  };
  loadClients();
}, []);
```

**Verification:**

- [ ] All clients appear in dropdown (not just those with projects)
- [ ] New clients (without projects) can be selected

### [P1] Add Success Toast for Edit Operations

**File:** `react/src/feature-module/projects/project/project.tsx`
**Function:** `handleEditProjectSave` (~line 1450)

**Problem:** No success feedback when editing a project.

**Solution:** Add after successful update:

```typescript
message.success('Project updated successfully!');
```

### [P1] Fix Form Reset on Modal Close

**File:** `react/src/feature-module/projects/project/project.tsx`

**Problem:** Form state may persist when modal is closed, causing dirty state on next open.

**Solution:** Ensure all form states are reset in `handleAddModalClose`, `handleEditModalClose`

---

## VALIDATION CHECKLIST FOR TESTING

### Test Case 1: Add Project

- [ ] Navigate to Projects page
- [ ] Click "Add New Project" button
- [ ] Verify Basic Information tab opens
- [ ] Leave all fields empty, click "Next" → Should show validation errors
- [ ] Fill only required fields, click "Next" → Should proceed to Step 2
- [ ] Verify employee dropdown has options
- [ ] Select at least 1 team member, 1 team leader, 1 project manager
- [ ] Click "Save Project"
- [ ] Verify success toast appears
- [ ] Verify project appears in list
- [ ] Verify project has correct data

### Test Case 2: Edit Project

- [ ] Click "Edit" on any project
- [ ] Verify modal opens with pre-filled data
- [ ] Change project name
- [ ] Switch to Team Members tab
- [ ] Verify current members are selected
- [ ] Add a new team member
- [ ] Click "Save Changes"
- [ ] Verify success toast appears
- [ ] Verify changes reflect in list

### Test Case 3: Delete Project

- [ ] Click "Delete" on a project with no tasks
- [ ] Verify confirmation modal appears
- [ ] Confirm deletion
- [ ] Verify project is removed from list
- [ ] Try deleting project with tasks → Should show error

### Test Case 4: Add Task (from Project Details)

- [ ] Open project details page
- [ ] Click "Add Task" button
- [ ] Leave title empty, try to save → Should show error
- [ ] Enter title (less than 3 chars), try to save → Should show error
- [ ] Enter valid title (3+ chars)
- [ ] Enter description (less than 10 chars), try to save → Should show error
- [ ] Enter valid description (10+ chars)
- [ ] Verify employee dropdown has options
- [ ] Select at least 1 assignee
- [ ] Select due date beyond project end date → Should show error
- [ ] Select valid due date
- [ ] Click "Save Task"
- [ ] Verify task appears in list

### Test Case 5: Edit Task

- [ ] Click "Edit" on any task
- [ ] Verify modal opens with pre-filled data
- [ ] Change task title
- [ ] Change task status
- [ ] Click "Update Task"
- [ ] Verify changes reflect immediately

### Test Case 6: Team Member Load

- [ ] Open project details
- [ ] Click "Team Members" section
- [ ] Verify all team members are displayed
- [ ] Click "Add Member" or edit button
- [ ] Verify employee dropdown is populated
- [ ] Add new team member
- [ ] Save changes
- [ ] Verify new member appears in list

### Test Case 7: API Endpoints Verification

- [ ] `GET /api/employees?limit=100` → Returns employee list
- [ ] `GET /api/clients?limit=100` → Returns client list
- [ ] `GET /api/projects` → Returns project list
- [ ] `POST /api/projects` → Creates new project
- [ ] `PUT /api/projects/:id` → Updates project
- [ ] `DELETE /api/projects/:id` → Deletes project
- [ ] `GET /api/tasks/project/:projectId` → Returns project tasks
- [ ] `POST /api/tasks` → Creates new task
- [ ] `PUT /api/tasks/:id` → Updates task
- [ ] `DELETE /api/tasks/:id` → Deletes task

---

## EDGE CASES TO TEST

| Scenario                            | Expected Behavior                                     |
| ----------------------------------- | ----------------------------------------------------- |
| Due date before start date          | Error: "Due date must be after start date"            |
| Project value = 0 or negative       | Error: "Project value must be positive"               |
| No team members selected            | Error: "At least one team member required"            |
| Task due date > project end date    | Error: "Task due date cannot exceed project end date" |
| Empty project name                  | Error: "Project name is required"                     |
| Duplicate project name              | Currently not validated - consider adding             |
| Very long project name (>100 chars) | Currently not validated - consider adding             |
| Logo upload > 4MB                   | Error: "File size must be less than 4MB"              |
| Invalid logo type                   | Error: "Only jpeg, png, jpg, ico allowed"             |
| Deleting project with active tasks  | Error: "Cannot delete project with active tasks"      |

---

## API ENDPOINTS REFERENCE

### Project API

```
GET    /api/projects              → List all projects
POST   /api/projects              → Create project
GET    /api/projects/:id          → Get single project
PUT    /api/projects/:id          → Update project
DELETE /api/projects/:id          → Delete project
GET    /api/projects/stats        → Get statistics
PATCH  /api/projects/:id/progress → Update progress
```

### Task API

```
GET    /api/tasks/project/:projectId → Get project tasks
POST   /api/tasks                    → Create task
GET    /api/tasks/:id                → Get task
PUT    /api/tasks/:id                → Update task
DELETE /api/tasks/:id                → Delete task
GET    /api/tasks/statuses           → Get task statuses
```

### Employee API

```
GET /api/employees?limit=100 → Get employee list
```

### Client API

```
GET /api/clients?limit=100 → Get client list
```

---

## NOTES

- Socket.IO is used for real-time updates
- All forms use inline validation
- Error messages auto-scroll to first error field
- Soft delete pattern used (isDeleted flag)
- Multi-tenant architecture (company-specific collections)

```

---

**Document Generated:** February 3, 2026
**Status:** Documentation Complete
**Next Steps:** Review and implement P0 critical fixes
```
