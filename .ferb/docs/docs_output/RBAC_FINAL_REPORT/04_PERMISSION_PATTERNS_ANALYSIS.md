# Permission Usage Patterns Analysis Report

**Date**: 2026-02-16
**Status**: Analysis Complete
**Agent**: Permission Patterns Analyzer

---

## Executive Summary

This report analyzes current permission usage patterns across the codebase and provides recommendations for migrating to the dynamic RBAC system. The analysis reveals a mixed permission system with both legacy role-based checks and modern page-level permissions.

---

## Key Findings

### 1. Permission Function Definitions

#### Backend Permission Functions

| Function | Occurrences | Files | Type |
|----------|-------------|-------|------|
| `requireRole()` | 165 | 24 | Legacy - Static role-based |
| `requirePageAccess()` | 16 | 4 | Modern - Page-level action-based |
| `Role.hasPageAccess()` | Core | 1 | Dynamic RBAC core logic |

#### Frontend Permission Functions

| Function | Status | Type |
|----------|--------|------|
| `usePageAccess` Hook | Production-ready | Modern permission checks |
| `RoleBasedRenderer` | Legacy | Role-based UI rendering |
| `PermissionField` | Active | Field-level permissions |

---

### 2. Permission Data Structures

#### Static Permission Configuration

| File | Lines | Description |
|------|-------|-------------|
| `fieldPermissions.ts` | 457 | Static field-level permissions |
| `backend/constants/roles.json` | ~50 | Simple role constants |
| Component role arrays | ~100 | Hardcoded role checks |

#### Dynamic Permission Structures

| Schema | Fields | Status |
|--------|--------|--------|
| Page | `availableActions[]` | ✅ Active |
| Permission | `pageId`, `actions[]` | ✅ Active |
| Role-Permission | Junction table | ✅ Active |

---

### 3. High Priority Files Requiring Migration

#### Backend Route Files (requireRole → requirePageAccess)

| File | requireRole Count | Priority |
|------|-------------------|----------|
| `backend/routes/api/attendance.js` | 12 | HIGH |
| `backend/routes/api/employees.js` | 11 | HIGH |
| `backend/routes/api/admin-dashboard.js` | 14 | HIGH |
| `backend/routes/api/asset-categories.js` | 5 | MEDIUM |
| `backend/routes/api/budgets.js` | 7 | MEDIUM |
| `backend/routes/api/clients.js` | 8 | MEDIUM |
| `backend/routes/api/departments.js` | 6 | MEDIUM |
| `backend/routes/api/designations.js` | 6 | MEDIUM |
| `backend/routes/api/holidays.js` | 5 | MEDIUM |
| `backend/routes/api/leave.js` | 15 | HIGH |
| `backend/routes/api/overtime.js` | 4 | LOW |
| `backend/routes/api/policies.js` | 5 | LOW |
| `backend/routes/api/projects.js` | 9 | MEDIUM |
| `backend/routes/api/promotions.js` | 4 | LOW |
| `backend/routes/api/resignations.js` | 4 | LOW |
| `backend/routes/api/resources.js` | 3 | LOW |
| `backend/routes/api/shifts.js` | 4 | LOW |
| `backend/routes/api/tasks.js` | 6 | MEDIUM |
| `backend/routes/api/timesheets.js` | 4 | LOW |
| `backend/routes/api/userProfile.js` | 5 | MEDIUM |

**Total Backend Migration**: 165 requireRole calls across 20+ files

#### Frontend Component Files

| Component | Issue | Priority |
|-----------|-------|----------|
| `RoleBasedRenderer/index.tsx` | Legacy role-based rendering | HIGH |
| `fieldPermissions.ts` | Static config | MEDIUM |
| `withRoleCheck.jsx` | HOC pattern | HIGH |

---

### 4. Migration Strategy

#### Phase 1: Backend Migration

**Steps**:
1. Create migration script for `requireRole` → `requirePageAccess`
2. Update high-priority route files (attendance, employees, leave)
3. Update medium-priority files
4. Test all migrated routes with different user roles

**Example Migration**:
```javascript
// Before:
router.get('/employees', authenticate, requireRole('admin', 'hr'), employeeController.getAll);

// After:
router.get('/employees', authenticate, requirePageAccess('hrm.employees', 'read'), employeeController.getAll);
```

#### Phase 2: Frontend Migration

**Steps**:
1. Replace `RoleBasedRenderer` with `PermissionGuard` component
2. Update all frontend permission checks to use `usePageAccess`
3. Implement proper error handling for permission denials
4. Add loading states for permission checks

**Example Migration**:
```javascript
// Before:
<RoleBasedRenderer allowedRoles={['admin', 'hr']}>
  <EmployeeList />
</RoleBasedRenderer>

// After:
import { PageAccessGuard } from '@/hooks/usePageAccess';

<PageAccessGuard page="hrm.employees" action="read">
  <EmployeeList />
</PageAccessGuard>
```

#### Phase 3: Field-Level Permissions

**Steps**:
1. Create field-level permission API endpoints
2. Update `PermissionField` component to use dynamic permissions
3. Keep static config as fallback during transition
4. Deprecate static `fieldPermissions.ts` file

---

### 5. Missing Permission Checks

#### Backend Gaps

| Location | Issue | Risk |
|----------|-------|------|
| Socket controllers | No proper permission checks | HIGH |
| Some REST controllers | Bypassing middleware | MEDIUM |
| Third-party integrations | No protection | LOW |

#### Frontend Gaps

| Location | Issue | Risk |
|----------|-------|------|
| Direct route access | No permission validation | HIGH |
| API calls | No validation before rendering | MEDIUM |
| Action buttons | Visible without permission checks | HIGH |

---

### 6. Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Backend Routes Protected | 100% | ~20% |
| requireRole References | 0 | 165 |
| Permission Check Speed | <100ms | N/A |
| Frontend Coverage | 100% | ~10% |
| Security Incidents | 0 | Monitoring |

---

### 7. Permission Action Types

**Standard Actions**:
- `read` - View/list data
- `create` - Create new records
- `write` / `update` - Modify existing records
- `delete` - Remove records
- `import` - Bulk import data
- `export` - Export/download data

**Custom Actions** (if needed):
- `approve` - Approve requests
- `reject` - Reject requests
- `publish` - Publish content
- `archive` - Archive records

---

### 8. Recommended Implementation Order

#### Sprint 1: Core HRM (Week 1)
- Attendance routes (12 migrations)
- Employee routes (11 migrations)
- Department/Designation routes (12 migrations)

#### Sprint 2: Leave Management (Week 2)
- Leave routes (15 migrations)
- Holiday routes (5 migrations)
- Overtime routes (4 migrations)

#### Sprint 3: Projects & Tasks (Week 3)
- Project routes (9 migrations)
- Task routes (6 migrations)
- Client routes (8 migrations)

#### Sprint 4: Remaining Modules (Week 4)
- All other route files
- Frontend components
- Testing & validation

---

## Conclusion

The codebase has a solid foundation for dynamic RBAC with `requirePageAccess` middleware and `usePageAccess` hook already implemented. The main task is migrating from the legacy `requireRole` system to the new page-based approach.

With 165 `requireRole` calls to migrate across 20+ backend files and extensive frontend component updates, this is a significant but achievable migration that can be completed in 4 weeks with proper planning.

---

**Status**: ✅ Analysis Complete
**Next Phase**: Generate Master Implementation Guide
