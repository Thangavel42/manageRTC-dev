# Timesheet Page — Implementation Plan

## Context

The Timesheet page (`timesheet.tsx`) has three problems:
1. **Project dropdown shows ALL company projects** instead of only the ones the current user is assigned to (as team member / leader / manager).
2. **No Submit flow for employees** — time entries default to `Draft` status, but there is no "Submit" button in the UI.
3. **No Approval/Rejection UI for HR/Admin** — the backend and hook support approval but nothing is rendered on screen.

Backend + hook code is already production-ready for all three features. This plan fixes the frontend only (plus verifies route ordering is correct).

---

## Current State

| Layer | Project Filter | Submit | Approve/Reject |
|-------|---------------|--------|----------------|
| Backend | ✅ `GET /api/projects/my` filters by assigned members | ✅ `POST /api/timetracking/submit` | ✅ `POST /api/timetracking/approve` + reject |
| Hook | ✅ `getMyProjects()` in `useProjectsREST` | ✅ `submitTimesheet()` in `useTimeTrackingREST` | ✅ `approveTimesheet()` + `rejectTimesheet()` |
| UI | ❌ `fetchProjects()` loads all | ❌ No submit button | ❌ No approve/reject UI |

---

## Key Files

| File | Purpose |
|------|---------|
| `react/src/feature-module/hrm/attendance/timesheet.tsx` | Main page — all changes here |
| `react/src/hooks/useProjectsREST.ts` | `getMyProjects()` at line 235 (calls `GET /api/projects/my`) |
| `react/src/hooks/useTimeTrackingREST.ts` | `submitTimesheet()`, `approveTimesheet()`, `rejectTimesheet()` |
| `react/src/hooks/useAuth.ts` | `role`, `userId`, `employeeId` |
| `backend/routes/api/timetracking.js` | Route order already fixed (`/stats` before `/:id`) |

---

## Phase 1 — Fix Project Dropdown (Assigned Projects Only)

**File**: `timesheet.tsx`

**Change**: Replace `fetchProjects()` with role-aware loading:
- Employees/Managers → call `getMyProjects()` (only assigned projects)
- HR/Admin → call `fetchProjects()` (all projects, for full visibility)

```diff
- const { projects, fetchProjects } = useProjectsREST();
+ const { projects, fetchProjects, getMyProjects } = useProjectsREST();

// In useEffect:
- fetchProjects();
+ if (isEmployeeOrManager) {
+   getMyProjects();
+ } else {
+   fetchProjects();
+ }
```

Also add `getMyProjects` to the `useEffect` dependency array.

**Result**: Employees see only their assigned projects. HR/admin see all.

---

## Phase 2 — Add "Submit" Button for Employees (Draft → Submitted)

**File**: `timesheet.tsx`

### 2a. Add Submit State
```typescript
const [submitting, setSubmitting] = useState(false);
```

### 2b. Add handleSubmitTimesheet Function
```typescript
const handleSubmitAll = async () => {
  // Submit all Draft entries at once
  const draftIds = timeEntries.filter(e => e.status === 'Draft').map(e => e._id);
  if (draftIds.length === 0) {
    message.warning('No draft entries to submit');
    return;
  }
  setSubmitting(true);
  await submitTimesheet(draftIds);
  setSubmitting(false);
  // Re-fetch to show updated statuses
  const userIdForApi = clerkUserId || employeeId;
  getTimeEntriesByUser(userIdForApi, { page: 1, limit: 50 });
};
```

### 2c. Show Submit Button in Header (only for employees with draft entries)
Add below the "Add Today's Work" button in the breadcrumb action bar:
```tsx
{isEmployeeOrManager && draftCount > 0 && (
  <button
    className="btn btn-warning d-flex align-items-center me-2"
    onClick={handleSubmitAll}
    disabled={submitting}
  >
    <i className="ti ti-send me-2" />
    {submitting ? 'Submitting...' : `Submit ${draftCount} Draft${draftCount > 1 ? 's' : ''}`}
  </button>
)}
```

### 2d. Add Per-Row Submit Button in Actions Column
For each `Draft` entry, show a submit icon:
```tsx
{record.status === 'Draft' && (
  <Link to="#" className="me-2" onClick={() => handleSubmitSingle(record._id)} title="Submit">
    <i className="ti ti-send" />
  </Link>
)}
```

---

## Phase 3 — Add Approve / Reject UI for HR/Admin

**File**: `timesheet.tsx`

### 3a. Add State for Reject Modal
```typescript
const [rejectEntryId, setRejectEntryId] = useState<string | null>(null);
const [rejectReason, setRejectReason] = useState('');
const [approving, setApproving] = useState<string | null>(null); // entry id being approved
```

### 3b. Add handleApprove and handleReject Functions
```typescript
const handleApprove = async (entryId: string, userId: string) => {
  setApproving(entryId);
  const success = await approveTimesheet(userId, [entryId]);
  setApproving(null);
  if (success) {
    // Update entry in local state
    setTimeEntries(prev =>
      prev.map(e => e._id === entryId ? { ...e, status: 'Approved' } : e)
    );
  }
};

const handleRejectConfirm = async () => {
  if (!rejectEntryId || !rejectReason.trim()) {
    message.error('Please enter a rejection reason');
    return;
  }
  const entry = timeEntries.find(e => e._id === rejectEntryId);
  await rejectTimesheet(entry?.userId || '', [rejectEntryId], rejectReason);
  setRejectEntryId(null);
  setRejectReason('');
};
```

### 3c. Add Approve/Reject Columns to Table (only for canManageTimesheet)
```tsx
// Add to columns array (conditionally):
...(canManageTimesheet ? [{
  title: "Actions",
  render: (_: any, record: TimeEntry) => (
    <div className="action-icon d-inline-flex">
      {record.status === 'Submitted' && (
        <>
          <button className="btn btn-sm btn-success me-1"
            onClick={() => handleApprove(record._id, record.userId)}
            disabled={approving === record._id}>
            <i className="ti ti-check" /> Approve
          </button>
          <button className="btn btn-sm btn-danger"
            onClick={() => { setRejectEntryId(record._id); }}
            data-bs-toggle="modal" data-bs-target="#reject_modal">
            <i className="ti ti-x" /> Reject
          </button>
        </>
      )}
      {/* Edit/Delete only for Draft */}
      {record.status === 'Draft' && (/* existing edit/delete */)}
    </div>
  )
}] : [/* employee column with submit per row */])
```

### 3d. Add Reject Modal
```tsx
<div className="modal fade" id="reject_modal">
  <div className="modal-dialog modal-dialog-centered">
    <div className="modal-content">
      <div className="modal-header">
        <h4 className="modal-title">Reject Time Entry</h4>
        <button type="button" className="btn-close custom-btn-close" data-bs-dismiss="modal">
          <i className="ti ti-x" />
        </button>
      </div>
      <div className="modal-body">
        <label className="form-label">Rejection Reason <span className="text-danger">*</span></label>
        <textarea
          className="form-control"
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Explain why this entry is being rejected..."
        />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-light" data-bs-dismiss="modal"
          onClick={() => { setRejectEntryId(null); setRejectReason(''); }}>
          Cancel
        </button>
        <button type="button" className="btn btn-danger" data-bs-dismiss="modal"
          onClick={handleRejectConfirm}>
          Reject Entry
        </button>
      </div>
    </div>
  </div>
</div>
```

---

## Phase 4 — Add Status Filter Tabs (Visual Improvement)

Add Bootstrap nav-tabs to filter entries by status, especially useful for HR:

```tsx
const [statusFilter, setStatusFilter] = useState<string>('all');

// Computed filtered entries:
const displayedEntries = statusFilter === 'all'
  ? timeEntries
  : timeEntries.filter(e => e.status === statusFilter);

// Tabs UI above the table:
<ul className="nav nav-tabs mb-3">
  {['all','Draft','Submitted','Approved','Rejected'].map(tab => (
    <li key={tab} className="nav-item">
      <button
        className={`nav-link ${statusFilter === tab ? 'active' : ''}`}
        onClick={() => setStatusFilter(tab)}>
        {tab === 'all' ? 'All' : tab}
        {tab === 'Submitted' && submittedCount > 0 && (
          <span className="badge bg-danger ms-1">{submittedCount}</span>
        )}
      </button>
    </li>
  ))}
</ul>
```

---

## Phase 5 — Generate Implementation Plan .md File (this file)

Generate and save this plan as a markdown document in `memory/TIMESHEET_IMPLEMENTATION_PLAN.md`.

---

## Complete Flow After Implementation

```
Employee (Draft → Submit)
  1. Employee logs in
  2. Opens Timesheet page
  3. Clicks "Add Today's Work"
     → Project dropdown: shows ONLY assigned projects (getMyProjects)
  4. Fills form → time entry saved as Draft
  5. "Submit 2 Drafts" button appears in header
  6. Clicks Submit → POST /api/timetracking/submit → status = Submitted
  7. Entry disappears from Draft tab, appears in Submitted tab

HR/Admin (Review → Approve/Reject)
  1. HR opens Timesheet page
  2. Sees all entries; "Submitted" tab has badge count
  3. Clicks "Submitted" tab → filters to pending approvals
  4. Each row has [Approve] [Reject] buttons
  5. Clicks Approve → POST /api/timetracking/approve → status = Approved
  6. OR clicks Reject → modal asks for reason → POST /api/timetracking/reject → status = Rejected

Employee sees rejection
  1. Entry appears in "Rejected" tab with rejection reason
  2. Employee can edit the entry (back to editable state)
  3. Employee re-submits
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `react/src/feature-module/hrm/attendance/timesheet.tsx` | All UI changes (Phases 1–4) — this is the **only file** that needs editing |

No backend changes needed — all APIs already exist and work correctly.

---

## Verification

1. Login as **employee** → Open Timesheet → "Add Today's Work" → Project dropdown should only show assigned projects
2. Create a time entry → it appears as `Draft` → "Submit X Drafts" button appears
3. Click Submit → entries status changes to `Submitted`
4. Login as **HR** → Open Timesheet → "Submitted" tab shows badge with count
5. Click Approve on a submitted entry → status changes to `Approved`
6. Click Reject → modal appears → enter reason → status changes to `Rejected`
7. Login as employee again → Rejected entry visible with reason → can edit → re-submit
