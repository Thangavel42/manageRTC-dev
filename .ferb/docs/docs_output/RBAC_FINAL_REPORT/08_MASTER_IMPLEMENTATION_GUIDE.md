# Dynamic RBAC Implementation - Master Guide

**Project**: manageRTC-my
**Date**: 2026-02-16
**Version**: 1.0
**Status**: Ready for Implementation

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Implementation Roadmap](#implementation-roadmap)
4. [Phase-by-Phase Details](#phase-by-phase-details)
5. [Migration Scripts](#migration-scripts)
6. [Testing Strategy](#testing-strategy)
7. [Rollout Plan](#rollout-plan)

---

## Executive Summary

### Critical Findings

| Area | Current State | Target State | Gap |
|------|---------------|--------------|-----|
| **Backend Route Protection** | 165 `requireRole()` calls | 100% `requirePageAccess()` | 165 migrations |
| **Frontend Button Protection** | 0% protected | 100% protected | 500+ buttons |
| **Menu Dynamic Filtering** | Hardcoded switch | Permission-based | 2 files |
| **Pages Collection** | 134 pages | 223 pages | 89 missing |
| **Permission Checks** | Role-based | Page + Action-based | Complete refactor |

### Risk Assessment

| Risk Level | Area | Issue |
|------------|------|-------|
| 🔴 CRITICAL | Button Actions | 100% of buttons lack permission checks |
| 🔴 CRITICAL | Finance Module | Money operations unprotected |
| 🟠 HIGH | HR Module | Employee PII unprotected |
| 🟠 HIGH | Super Admin | User management unprotected |
| 🟡 MEDIUM | Navigation | Direct route access possible |
| 🟡 MEDIUM | Menus | Hardcoded, not dynamic |

---

## Current State Analysis

### Backend Authorization

**Legacy Pattern (165 occurrences)**:
```javascript
// Found in 20+ files
router.get('/employees', requireRole('admin', 'hr'), controller.getAll);
```

**Target Pattern**:
```javascript
router.get('/employees', requirePageAccess('hrm.employees', 'read'), controller.getAll);
```

### Files Requiring Migration

| Priority | File | Calls | Module |
|----------|------|-------|--------|
| HIGH | `routes/api/leave.js` | 15 | HRM |
| HIGH | `routes/api/admin-dashboard.js` | 14 | Admin |
| HIGH | `routes/api/attendance.js` | 12 | HRM |
| HIGH | `routes/api/employees.js` | 11 | HRM |
| MEDIUM | `routes/api/projects.js` | 9 | Projects |
| MEDIUM | `routes/api/clients.js` | 8 | CRM |
| MEDIUM | `routes/api/departments.js` | 6 | HRM |
| MEDIUM | `routes/api/designations.js` | 6 | HRM |
| MEDIUM | `routes/api/tasks.js` | 6 | Projects |
| MEDIUM | `routes/api/budgets.js` | 7 | Finance |

### Frontend Authorization

**Current State**: No permission controls on any buttons or navigation

**Required Migrations**:
- 500+ buttons to wrap in `PermissionButton`
- 107 navigation links to wrap in `PageAccessGuard`
- 2 menu files to refactor

### Pages Collection Gaps

| Status | Count | Action |
|--------|-------|--------|
| Verified Pages | 134 | ✅ Ready |
| Missing Pages | 89 | ❌ Create |
| Orphaned Pages | 45 | ⚠️ Add routes |
| No RBAC Needed | 141 | ➖ Skip |

---

## Implementation Roadmap

### 8-Week Implementation Plan

```
Week 1-2: Foundation (Pages Collection + Core Backend)
Week 3-4: Backend Migration (All Routes)
Week 5-6: Frontend Migration (Buttons + Navigation)
Week 7-8: Menu Dynamic Filtering + Testing
```

---

## Phase-by-Phase Details

### Phase 1: Foundation (Week 1-2)

#### Week 1: Create Missing Pages

**Script**: `backend/seed/createMissingPages.js`

**Priority Pages to Create**:
```javascript
const highPriorityPages = [
  // Category V: Recruitment (ALL)
  { name: 'recruitment.jobs', displayName: 'Jobs', route: '/job-grid', category: 'V' },
  { name: 'recruitment.candidates', displayName: 'Candidates', route: '/candidates-grid', category: 'V' },
  { name: 'recruitment.referrals', displayName: 'Referrals', route: '/referrals', category: 'V' },

  // Category VI: Finance
  { name: 'finance.estimates', displayName: 'Estimates', route: '/estimates', category: 'VI' },
  { name: 'finance.payments', displayName: 'Payments', route: '/payments', category: 'VI' },
  { name: 'finance.payslip', displayName: 'Payslip', route: '/payslip', category: 'VI' },
  { name: 'finance.payroll', displayName: 'Payroll', route: '/payroll', category: 'VI' },

  // Category VIII: Reports (ALL)
  { name: 'reports.expenses', displayName: 'Expense Report', route: '/expenses-report', category: 'VIII' },
  { name: 'reports.invoices', displayName: 'Invoice Report', route: '/invoice-report', category: 'VIII' },
  { name: 'reports.employees', displayName: 'Employee Report', route: '/employee-report', category: 'VIII' },
  { name: 'reports.attendance', displayName: 'Attendance Report', route: '/attendance-report', category: 'VIII' },
  { name: 'reports.leaves', displayName: 'Leave Report', route: '/leave-report', category: 'VIII' },
];
```

**Command**:
```bash
cd backend
node seed/createMissingPages.js
```

#### Week 2: Core Backend Migration

**Files**: Top 5 high-priority route files

1. `routes/api/leave.js` (15 migrations)
2. `routes/api/admin-dashboard.js` (14 migrations)
3. `routes/api/attendance.js` (12 migrations)
4. `routes/api/employees.js` (11 migrations)
5. `routes/api/projects.js` (9 migrations)

**Migration Pattern**:
```javascript
// Before:
router.get('/api/leave', authenticate, requireRole('admin', 'hr'), leaveController.getAll);

// After:
router.get('/api/leave', authenticate, requirePageAccess('hrm.leaves.admin', 'read'), leaveController.getAll);
```

**Validation**:
```bash
# Test each endpoint with different roles
npm run test:rbac
```

---

### Phase 2: Backend Migration (Week 3-4)

#### Week 3: HRM Complete Migration

**Files**:
- `routes/api/departments.js` (6 migrations)
- `routes/api/designations.js` (6 migrations)
- `routes/api/holidays.js` (5 migrations)
- `routes/api/overtime.js` (4 migrations)
- `routes/api/policies.js` (5 migrations)
- `routes/api/promotions.js` (4 migrations)
- `routes/api/resignations.js` (4 migrations)
- `routes/api/terminations.js` (4 migrations)

**Page Code Mapping**:
| Route Old | Route New | Page Code | Action |
|-----------|-----------|-----------|--------|
| `requireRole('admin', 'hr')` | `requirePageAccess()` | `hrm.departments` | `read` |
| `requireRole('admin', 'hr')` | `requirePageAccess()` | `hrm.designations` | `read` |
| `requireRole('admin', 'hr')` | `requirePageAccess()` | `hrm.holidays` | `read` |

#### Week 4: Remaining Modules

**Files**:
- `routes/api/budgets.js` (7 migrations)
- `routes/api/tasks.js` (6 migrations)
- `routes/api/milestones.js` (3 migrations)
- `routes/api/pipelines.js` (5 migrations)
- `routes/api/leads.js` (6 migrations)
- `routes/api/invoices.js` (4 migrations)

**Total Backend Migrations**: 165 complete

---

### Phase 3: Frontend Migration (Week 5-6)

#### Week 5: Critical Button Protection

**Priority Modules**:
1. Super Admin (`superadmin-users.tsx`)
2. HRM Employees (`employeesList.tsx`)
3. Finance (`invoices.tsx`, `payroll.tsx`)

**Button Pattern**:
```javascript
// Before:
<button onClick={handleAddEmployee} className="btn btn-primary">
  Add Employee
</button>

// After:
import { PermissionButton } from '@/hooks/usePageAccess';

<PermissionButton
  page="hrm.employees"
  action="create"
  onClick={handleAddEmployee}
  className="btn btn-primary"
>
  Add Employee
</PermissionButton>
```

**Files to Update**: ~50 high-priority files

#### Week 6: Navigation & Remaining Buttons

**Navigation Protection**:
```javascript
// Before:
<Link to={all_routes.employees}>Employees</Link>

// After:
import { PageAccessGuard } from '@/hooks/usePageAccess';

<PageAccessGuard page="hrm.employees" action="read" fallback={null}>
  <Link to={all_routes.employees}>Employees</Link>
</PageAccessGuard>
```

**Files to Update**: ~100 files

---

### Phase 4: Menu Dynamic Filtering (Week 7-8)

#### Week 7: Sidebar & Horizontal Menu

**File**: `react/src/core/data/json/sidebarMenu.jsx`

**Current Pattern**:
```javascript
switch (userRole) {
  case 'superadmin': return [/* hardcoded menu */];
  case 'hr': return [/* hardcoded menu */];
  // ...
}
```

**Target Pattern**:
```javascript
const { hasPageAccess } = usePermissions();

const menuItems = allMenuItems.filter(item => {
  if (!item.pageCode) return true; // Headers
  return hasPageAccess(item.pageCode, 'read');
});

return menuItems;
```

**File**: `react/src/core/data/json/horizontalSidebar.tsx`

**Remove**: All `roles: ['admin', 'hr']` arrays
**Add**: `pageCode` and `action` properties

#### Week 8: Testing & Validation

**Test Matrix**:
| Role | Pages Accessible | Buttons Visible | Menu Items |
|------|------------------|-----------------|------------|
| superadmin | All | All | All |
| hr | HRM only | HRM actions | HRM menu |
| admin | Dashboard | Admin actions | Admin menu |
| employee | Limited | Limited | Limited |

---

## Migration Scripts

### Script 1: Backend Route Migration

```javascript
/**
 * backend/scripts/migrateRequireRoleToPageAccess.js
 */

const fs = require('fs');
const path = require('path');

const routeFiles = [
  'backend/routes/api/leave.js',
  'backend/routes/api/employees.js',
  // ... all files
];

const roleToPageMapping = {
  '/api/leave': { page: 'hrm.leaves.admin', action: 'read' },
  '/api/employees': { page: 'hrm.employees', action: 'read' },
  // ... complete mapping
};

routeFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace requireRole with requirePageAccess
  Object.entries(roleToPageMapping).forEach(([route, { page, action }]) => {
    const regex = new RegExp(
      `requireRole\\(['"](.*?)['"]\\)`,
      'g'
    );
    content = content.replace(regex, `requirePageAccess('${page}', '${action}')`);
  });

  fs.writeFileSync(file, content);
  console.log(`Migrated: ${file}`);
});
```

### Script 2: Frontend Button Migration

```javascript
/**
 * react/scripts/migrateButtonsToPermissionButtons.js
 */

const fs = require('fs');
const glob = require('glob');

const tsxFiles = glob.sync('react/src/feature-module/**/*.tsx');

tsxFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Find buttons and wrap in PermissionButton
  // This is a simplified example - actual implementation would be more sophisticated

  content = content.replace(
    /<button onClick={(\w+)} className="btn btn-primary">([\s\S]*?)<\/button>/g,
    '<PermissionButton page="$MODULE.page" action="create" onClick={$1} className="btn btn-primary">$2</PermissionButton>'
  );

  fs.writeFileSync(file, content);
  console.log(`Migrated: ${file}`);
});
```

### Script 3: Pages Creation

```javascript
/**
 * backend/seed/createMissingPages.js
 */

const mongoose = require('mongoose');
const Page = require('../models/rbac/page.schema');
const PageCategory = require('../models/rbac/pageCategory.schema');

const missingPages = [
  {
    name: 'recruitment.jobs',
    displayName: 'Jobs',
    route: '/job-grid',
    categoryIdentifier: 'recruitment',
    icon: 'ti ti-briefcase',
    availableActions: ['read', 'create', 'update', 'delete'],
  },
  // ... all 89 missing pages
];

async function createMissingPages() {
  await mongoose.connect(process.env.MONGODB_URI);

  for (const pageData of missingPages) {
    const category = await PageCategory.findOne({ identifier: pageData.categoryIdentifier });
    if (!category) {
      console.log(`Category not found: ${pageData.categoryIdentifier}`);
      continue;
    }

    const existing = await Page.findOne({ name: pageData.name });
    if (existing) {
      console.log(`Page exists: ${pageData.name}`);
      continue;
    }

    await Page.create({
      ...pageData,
      category: category._id,
      isActive: true,
      isSystem: true,
    });

    console.log(`Created: ${pageData.name}`);
  }

  console.log('Migration complete!');
  process.exit(0);
}

createMissingPages();
```

---

## Testing Strategy

### Unit Tests

```javascript
// tests/rbac/pageAccess.test.js
describe('requirePageAccess', () => {
  it('should allow access with valid permission', async () => {
    const req = mockRequestWithPermission('hrm.employees', 'read');
    const res = mockResponse();
    const next = mockNext();

    await requirePageAccess('hrm.employees', 'read')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should deny access without permission', async () => {
    const req = mockRequestWithoutPermission();
    const res = mockResponse();
    const next = mockNext();

    await requirePageAccess('hrm.employees', 'delete')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

### Integration Tests

```javascript
// tests/integration/employeeFlow.test.js
describe('Employee CRUD Flow', () => {
  it('should allow HR to create employee', async () => {
    const response = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send(employeeData);

    expect(response.status).toBe(201);
  });

  it('should deny employee from creating employee', async () => {
    const response = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send(employeeData);

    expect(response.status).toBe(403);
  });
});
```

### E2E Tests

```javascript
// tests/e2e/menuVisibility.test.js
describe('Menu Visibility', () => {
  it('should show HR menu to HR users', async () => {
    await loginAs('hr');
    const menuItem = await screen.findByText('Employees');
    expect(menuItem).toBeVisible();
  });

  it('should hide HR menu from employees', async () => {
    await loginAs('employee');
    const menuItem = await screen.queryByText('Employees');
    expect(menuItem).not.toBeInTheDocument();
  });
});
```

---

## Rollout Plan

### Staging Deployment

1. **Week 1**: Deploy to staging environment
2. **Week 2**: QA testing with all role types
3. **Week 3**: Bug fixes and refinements
4. **Week 4**: Stakeholder approval

### Production Deployment

#### Option A: Big Bang (Not Recommended)
- Deploy all changes at once
- **Risk**: High
- **Downtime**: Potential

#### Option B: Feature Flags (Recommended)
```javascript
// Use feature flags to enable RBAC gradually
const USE_DYNAMIC_RBAC = process.env.FEATURE_DYNAMIC_RBAC === 'true';

if (USE_DYNAMIC_RBAC) {
  // Use requirePageAccess
} else {
  // Use requireRole (fallback)
}
```

#### Option C: Gradual Rollout (Recommended)
1. **Week 1**: Super Admin module only
2. **Week 2**: Add HRM module
3. **Week 3**: Add Finance module
4. **Week 4**: Add remaining modules
5. **Week 5**: Monitor and adjust

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Backend Migration | 100% | Zero `requireRole` calls |
| Frontend Protection | 100% | All buttons use `PermissionButton` |
| Menu Dynamic | 100% | No hardcoded role switches |
| Pages Coverage | 100% | All routes have pages |
| Security Incidents | 0 | Monitor logs |
| Performance | <100ms | Permission check timing |

---

## Monitoring & Logging

### Key Metrics to Track

```javascript
// Log all permission denials
logger.info('Permission denied', {
  userId: req.user.userId,
  role: req.user.role,
  page: pageCode,
  action: requiredAction,
  timestamp: new Date(),
});

// Alert on suspicious patterns
if (deniedPermissionsCount > 10) {
  alertSecurityTeam();
}
```

---

## Rollback Plan

### If Issues Occur

1. **Immediate**: Revert feature flag
2. **Database**: Restore Pages collection backup
3. **Code**: Revert to previous commit
4. **Communication**: Notify users of rollback

### Rollback Command

```bash
# Revert to previous version
git revert <commit-hash>

# Disable RBAC feature flag
export FEATURE_DYNAMIC_RBAC=false

# Restore database
mongorestore --db manageRTC backup/rbac/
```

---

## Appendix

### A. Page Code Reference

See [`ROUTES_TO_PAGES_MAPPING.md`](./ROUTES_TO_PAGES_MAPPING.md)

### B. Permission Action Reference

| Action | Description | Use When |
|--------|-------------|----------|
| `read` | View/list data | Page load, list views |
| `create` | Add new records | Add buttons, forms |
| `update` / `write` | Modify records | Edit buttons, save actions |
| `delete` | Remove records | Delete buttons |
| `import` | Bulk import | Import buttons |
| `export` | Export data | Export buttons |

### C. File Status Tracker

See [`files_status.csv`](./files_status.csv) - Updated after each file migration

---

## Conclusion

This implementation plan provides a structured approach to migrating from hardcoded role-based access control to a dynamic, page-based RBAC system. The migration is estimated to take 8 weeks with proper testing and validation.

**Critical Success Factors**:
1. Create all 89 missing pages first
2. Migrate backend routes before frontend
3. Test thoroughly at each phase
4. Use feature flags for gradual rollout
5. Monitor for permission denials and issues

**Next Steps**:
1. Review and approve this plan
2. Set up feature flag infrastructure
3. Create missing pages in database
4. Begin Phase 1 implementation

---

**Document Status**: ✅ Complete
**Last Updated**: 2026-02-16
**Version**: 1.0
