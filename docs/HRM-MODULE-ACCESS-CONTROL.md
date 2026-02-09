# HRM Module Access Control Analysis & Implementation Plan

## Document Information
- **Created**: 2026-02-09
- **Purpose**: Analyze and implement HR role access to all HRM modules
- **Status**: Implementation in Progress

---

## Executive Summary

This document provides a comprehensive analysis of the HRM (Human Resource Management) module's access control system and outlines the implementation plan to grant full HRM access to users with the **'HR' role**.

### Current State
- **Backend**: HR role already has access to most HRM APIs (shared with admin/superadmin)
- **Frontend**: All HRM routes are marked as `'public'` - meaning **ANYONE can access them**
- **Security Gap**: Frontend allows unauthorized users to view HRM pages (backend API calls will fail)

### Target State
- **HR role** should have full access to all HRM modules (same as admin level)
- **Frontend routes** should be restricted to authorized roles only
- **Security**: Defense in depth with both frontend and backend access control

---

## 1. Access Control Architecture

### 1.1 Authentication & Authorization Flow

```
User Request → Clerk Auth → Role Extraction → Frontend Route Check → Component Access Control → Backend API Check
                                    ↓                                ↓                            ↓
                            router.link.tsx                 RoleBasedRenderer          auth middleware
```

### 1.2 Key Components

| Component | File Path | Purpose |
|-----------|-----------|---------|
| **Frontend Router** | `react/src/feature-module/router/router.link.tsx` | Defines route-level permissions |
| **Role HOC** | `react/src/feature-module/router/withRoleCheck.jsx` | Wraps routes with role verification |
| **Role Renderer** | `react/src/core/components/RoleBasedRenderer/index.tsx` | Component-level access control |
| **Auth Hook** | `react/src/hooks/useAuth.ts` | Provides user role to components |
| **Backend Middleware** | `backend/middleware/auth.js` | API-level authentication & authorization |

### 1.3 Role Hierarchy

```
superadmin (100)
    ↓
admin (80)
    ↓
hr (60)
    ↓
manager (50)
    ↓
leads (40)
    ↓
employee (20)
    ↓
public/guest (0)
```

---

## 2. Current HRM Module Access Analysis

### 2.1 HRM Routes and Current Permissions

| Route Path | Component | Current Roles | Required Change |
|------------|-----------|---------------|-----------------|
| `/employees` | EmployeeList | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/employees-grid` | EmployeesGrid | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/employees/:employeeId` | EmployeeDetails | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/departments` | Department | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/designations` | Designations | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/policy` | Policy | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/hrm/holidays` | Holidays | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/leaves` | LeaveAdmin | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/leaves-employee` | LeaveEmployee | `['public']` | → `['admin', 'hr', 'manager', 'superadmin']` |
| `/leave-settings` | LeaveSettings | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/attendance-admin` | AttendanceAdmin | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/attendance-employee` | AttendanceEmployee | `['public']` | → `['employee', 'admin', 'hr', 'manager', 'superadmin']` |
| `/timesheets` | TimeSheet | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/schedule-timing` | ScheduleTiming | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/shifts-management` | ShiftsList | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/batches-management` | BatchesList | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/overtime` | OverTime | `['public']` | → `['admin', 'hr', 'superadmin']` |
| `/promotion` | Promotion | `['hr']` | ✅ Already correct |
| `/resignation` | Resignation | `['hr', 'employee']` | ✅ Already correct |
| `/termination` | Termination | `['hr']` | ✅ Already correct |

### 2.2 Dashboard Access

| Dashboard Route | Current Roles | Status |
|-----------------|---------------|--------|
| `/admin-dashboard` | `['admin', 'manager']` | ✅ OK |
| `/hr-dashboard` | `['hr', 'manager', 'leads']` | ✅ OK |
| `/employee-dashboard` | `['employee', 'admin', 'hr', 'manager', 'leads']` | ✅ OK |

---

## 3. Backend API Access Control

### 3.1 Employee Controller Permissions

The backend `employee.controller.js` uses the following permission structure:

| Operation | Required Roles | HR Access |
|-----------|----------------|-----------|
| Create Employee | `admin`, `hr`, `superadmin` | ✅ Yes |
| Update Employee | `admin`, `hr`, `superadmin` | ✅ Yes |
| Delete Employee | `admin`, `superadmin` | ⚠️ Limited |
| View All Employees | `admin`, `hr`, `superadmin` | ✅ Yes |
| Bulk Operations | `admin`, `hr`, `superadmin` | ✅ Yes |

### 3.2 Backend Middleware

The `requireRole()` middleware in `backend/middleware/auth.js`:
- Normalizes all roles to lowercase (case-insensitive)
- Checks if user role is in allowed roles array
- Returns 403 Forbidden if unauthorized

---

## 4. Implementation Plan

### Phase 1: Frontend Route Permissions Update

**Objective**: Update all HRM route permissions in `router.link.tsx`

**Files to Modify**:
- `react/src/feature-module/router/router.link.tsx`

**Changes Required**:
```javascript
// Before (Current - INSECURE)
{
  path: routes.employeeList,
  element: <EmployeeList />,
  route: Route,
  roles: ['public'],  // ❌ Anyone can access
}

// After (Secure)
{
  path: routes.employeeList,
  element: <EmployeeList />,
  route: Route,
  roles: ['admin', 'hr', 'superadmin'],  // ✅ Only authorized roles
}
```

### Phase 2: Component-Level Access Control (Optional Enhancement)

**Objective**: Add additional protection at component level

**Recommended Components**:
- `RoleBasedRenderer` - Already available
- `HROnly` - Pre-configured for HR+ roles

**Usage Example**:
```tsx
import { HROnly } from '../../../core/components/RoleBasedRenderer';

<HROnly fallback={<AccessDenied />}>
  <SensitiveHRMContent />
</HROnly>
```

### Phase 3: Backend Verification

**Objective**: Ensure all HRM endpoints properly validate HR role

**Files to Review**:
- `backend/controllers/rest/employee.controller.js`
- `backend/routes/*` - All HRM related routes

**Verification Checklist**:
- [ ] All HRM endpoints use `authenticate` middleware
- [ ] Employee operations use `requireRole('admin', 'hr', 'superadmin')`
- [ ] Delete operations may require `requireRole('admin', 'superadmin')` only

---

## 5. Implementation Checklist

### Frontend Changes

- [ ] Update employee list route permissions
- [ ] Update employee grid route permissions
- [ ] Update employee details route permissions
- [ ] Update departments route permissions
- [ ] Update designations route permissions
- [ ] Update policy route permissions
- [ ] Update holidays route permissions
- [ ] Update leave admin route permissions
- [ ] Update leave settings route permissions
- [ ] Update attendance admin route permissions
- [ ] Update timesheet route permissions
- [ ] Update schedule timing route permissions
- [ ] Update shifts management route permissions
- [ ] Update batches management route permissions
- [ ] Update overtime route permissions

### Backend Verification

- [ ] Verify employee controller permissions
- [ ] Check leave management endpoints
- [ ] Check attendance endpoints
- [ ] Verify all HRM routes have authentication middleware

### Testing

- [ ] Test HR role can access all HRM pages
- [ ] Test employee role cannot access admin-only HRM pages
- [ ] Test public/unauthenticated users are redirected
- [ ] Test API calls with HR token
- [ ] Test API calls with employee token (should fail for admin operations)

---

## 6. Security Considerations

### 6.1 Current Vulnerabilities

1. **Frontend Route Exposure**: All HRM routes accessible to anyone
2. **UI Information Leakage**: Unauthorized users can see HRM interface
3. **No Hardening**: Single layer of defense (backend only)

### 6.2 Defense in Depth Strategy

```
Layer 1: Frontend Router (Prevent unauthorized navigation)
   ↓
Layer 2: Component Access Control (Hide sensitive UI elements)
   ↓
Layer 3: Backend Authentication (Verify JWT token)
   ↓
Layer 4: Backend Authorization (Check role permissions)
```

### 6.3 Best Practices

1. **Never trust frontend validation** - Backend must always verify
2. **Use HTTPS** - Prevent token interception
3. **Implement proper error handling** - Don't reveal system information
4. **Audit trails** - Log all HRM operations
5. **Regular security reviews** - Check for permission creep

---

## 7. Post-Implementation Validation

### 7.1 Test Cases

| Scenario | Expected Behavior | Status |
|----------|-------------------|--------|
| HR user navigates to `/employees` | Page loads successfully | ⏳ |
| Employee navigates to `/employees` | Redirected to unauthorized/dashboard | ⏳ |
| HR user creates employee | API call succeeds | ⏳ |
| Employee tries to create employee | API returns 403 Forbidden | ⏳ |
| Unauthenticated user accesses any HRM route | Redirected to login | ⏳ |

### 7.2 Performance Impact

- **Frontend**: Minimal - role check is O(1) array lookup
- **Backend**: No change - existing middleware already validates roles
- **User Experience**: Improved - unauthorized users no longer see broken UI

---

## 8. Maintenance & Future Enhancements

### 8.1 Recommended Future Work

1. **Create HRM-Only Component**:
```tsx
// New specialized component for HRM operations
export const HRMOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RoleBasedRenderer
    allowedRoles={['admin', 'hr', 'superadmin']}
    includeHigherPrivileges
  >
    {children}
  </RoleBasedRenderer>
);
```

2. **Permission Constants File**:
```typescript
// react/src/config/permissions.ts
export const HRM_PERMISSIONS = {
  EMPLOYEE_MANAGEMENT: ['admin', 'hr', 'superadmin'] as UserRole[],
  LEAVE_MANAGEMENT: ['admin', 'hr', 'manager', 'superadmin'] as UserRole[],
  // ...
};
```

3. **Role-Based Menu Rendering**:
   - Show/hide sidebar menu items based on user role
   - Prevents showing links to inaccessible pages

### 8.2 Documentation Updates

- Update user manual with role permissions matrix
- Document any custom permission logic
- Maintain changelog for permission changes

---

## 9. References

### 9.1 Related Files

| File | Purpose |
|------|---------|
| `react/src/feature-module/router/router.link.tsx` | Route definitions |
| `react/src/feature-module/router/withRoleCheck.jsx` | Route protection HOC |
| `react/src/core/components/RoleBasedRenderer/index.tsx` | Component access control |
| `react/src/hooks/useAuth.ts` | Authentication hook |
| `backend/middleware/auth.js` | Backend auth middleware |
| `backend/controllers/rest/employee.controller.js` | Employee API endpoints |

### 9.2 External Dependencies

- **Clerk**: Authentication provider (JWT verification)
- **React Router**: Client-side routing
- **Express**: Backend API framework

---

## 10. Troubleshooting: HR Role Not Showing Full Menu

### Issue Description
If you are logged in as an HR user but the sidebar menu is not showing all HRM modules, the issue is likely that your **Clerk user's `publicMetadata.role` is not correctly set**.

### Root Cause
The sidebar menu reads the role from **Clerk's `publicMetadata.role`**, not from the MongoDB employee record. If these two get out of sync, the menu will display incorrectly.

### Solution: Sync Role from MongoDB to Clerk

#### Option 1: Use the Sync Role API Endpoint
```bash
POST /api/sync-role
Authorization: Bearer <your-clerk-jwt-token>
Content-Type: application/json

{
  "email": "hr1@gmail.com"
}
```

#### Option 2: Use the Sync Script
```bash
node scripts/syncEmployeeRoleToClerk.js hr1@gmail.com
```

#### Option 3: Update Clerk Metadata via Clerk Dashboard
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users**
3. Find your user (e.g., hr1@gmail.com)
4. Click on **User** → **Metadata** or **Public Metadata**
5. Add/Update the `role` field: `{"role": "hr"}`
6. **Important**: Use lowercase `"hr"`, not `"HR"`
7. Save and refresh your browser

### How to Verify the Fix
1. Open browser console (F12)
2. Look for `[Sidebar Menu] User Role Detection:` log
3. It should show `normalizedRole: "hr"`
4. If it shows `"guest"` or `"employee"`, the sync didn't work

### Example Console Log (After Fix)
```
[Sidebar Menu] User Role Detection: {
  originalRole: "hr",
  normalizedRole: "hr",
  userPublicMetadata: { role: "hr", companyId: "...", employeeId: "EMP-1180" },
  userFullName: "hr hr"
}
```

---

## 11. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2026-02-09 | 1.0 | Initial analysis and implementation plan | Claude Code |
| 2026-02-09 | 1.1 | Updated frontend route permissions for HRM modules | Claude Code |
| 2026-02-09 | 1.2 | Updated HR sidebar menu with all HRM modules | Claude Code |
| 2026-02-09 | 1.3 | Added Tickets, Performance, Training routes for HR | Claude Code |
| 2026-02-09 | 1.4 | Added comprehensive debugging for sidebar rendering | Claude Code |
| 2026-02-09 | 1.5 | Added dual sidebar system documentation and troubleshooting guide | Claude Code |

---

## 12. Dual Sidebar System & Debugging

### 12.1 Understanding the Two Sidebar Types

This application uses **two separate sidebar systems** that render simultaneously:

| Sidebar Type | Component | File | When Visible |
|-------------|-----------|------|--------------|
| **Vertical Sidebar** | `<Sidebar />` | `sidebar/index.tsx` | Default layout |
| **Horizontal Sidebar** | `<HorizontalSidebar />` | `horizontal-sidebar/index.tsx` | When `dataLayout` is horizontal variants |

**Layout Detection:**
- Vertical sidebar: Default, mini, two-column, stacked layouts
- Horizontal sidebar: `horizontal`, `horizontal-single`, `horizontal-overlay`, `horizontal-box`

### 12.2 HRM Menu Structure in Both Sidebars

#### Vertical Sidebar (sidebarMenu.jsx)
- **HRM section**: Employees, Departments, Designations, Time Sheet, Shift & Schedule, Leave Management, Attendance, Overtime, Holidays, Policies, Resignation, Termination
- **Tickets section**: Tickets, Tickets Grid
- **Performance section**: Performance Indicator, Performance Review, Performance Appraisal, Goal List, Goal Type
- **Training section**: Training List, Trainers, Training Type
- **Projects section**: Clients, Projects, Tasks, Task Board
- **CRM section**: Contacts, Companies, Deals, Leads, Pipeline
- **Recruitment section**: Jobs, Candidates, Referrals
- **Reports section**: Various reports

#### Horizontal Sidebar (horizontalSidebar.tsx)
All HRM modules are nested under the **"Projects"** menu section:
- Employee (Employees List, Departments, Designations, Policies)
- Tickets, Holidays
- Attendance (Leaves, Attendance, Timesheet, Shift & Schedule, Overtime)
- Performance (Indicator, Review, Appraisal, Goals)
- Training (List, Trainers, Type)
- Promotion, Resignation, Termination

### 12.3 Debugging Steps for Menu Issues

#### Step 1: Check Browser Console Logs

Open browser console (F12) and look for these logs:

```javascript
// From sidebarMenu.jsx:
[Sidebar Menu] User Role Detection: {
  originalRole: "hr",
  normalizedRole: "hr",
  userPublicMetadata: { role: "hr", companyId: "...", employeeId: "..." },
  userFullName: "hr hr"
}

[Sidebar Menu] Switch case matching for role: hr - will match hr case: true

[Sidebar Menu] HR Menu constructed successfully: {
  sectionCount: 8,
  sections: ["Main Menu", "HRM", "PROJECTS", "CRM", "RECRUITMENT", "Tickets", "Performance", "Training", "Reports"],
  hrmSection: ["Employees", "Departments", "Designations", ...],
  ...
}

// From sidebar/index.tsx:
[Sidebar Component] Rendering sidebar with data: {
  dataReceived: true,
  dataLength: 8,
  sections: ["Main Menu", "HRM", "PROJECTS", ...],
  userRole: "hr"
}

[Sidebar Component] Layout info: {
  dataLayout: "default",
  isHorizontalLayout: false,
  verticalSidebarVisible: true
}
```

#### Step 2: Verify Clerk Metadata

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Users** → Find your HR user
3. Check **Public Metadata**:
   ```json
   {
     "role": "hr",
     "companyId": "your-company-id",
     "employeeId": "EMP-xxxx"
   }
   ```
4. **Important**: Role must be lowercase `"hr"`, not `"HR"`

#### Step 3: Check Redux State for Layout

In browser console:
```javascript
// Check Redux store state
window.__REDUX_DEVTOOLS_EXTENSION__?.getState?.()

// Or check the dataLayout setting
// If isHorizontalLayout is true, you're seeing horizontal sidebar
// If verticalSidebarVisible is true, you're seeing vertical sidebar
```

#### Step 4: Clear Browser Cache

1. **Hard Refresh**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Clear Cache**: F12 → Application → Clear storage → Clear site data
3. **Logout and Login Again**: This refreshes the Clerk token

#### Step 5: Check CSS Visibility

Inspect the sidebar elements in browser:
```css
/* Check if vertical sidebar is hidden */
.sidebar { display: none; }  /* Should NOT be present */

/* Check if horizontal class is applied */
.main-wrapper.menu-horizontal .sidebar { display: none; }  /* Expected for horizontal layout */
```

### 12.4 Common Issues and Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Console shows `normalizedRole: "guest"` | Clerk metadata missing role | Update Clerk metadata with role field |
| Console shows `normalizedRole: "employee"` | Role not synced to Clerk | Use sync API or update Clerk Dashboard |
| `isHorizontalLayout: true` | User on horizontal layout | HRM items are under "Projects" menu |
| Menu shows but items missing | CSS hiding items | Check for display:none on specific menu items |
| Old menu still showing | Browser cache | Hard refresh (Ctrl+Shift+R) and clear cache |

### 12.5 Test URLs for HR User

After login as HR, try navigating directly to:
- `/employees` - Employee List
- `/departments` - Departments
- `/tickets` - Tickets
- `/performance-indicator` - Performance
- `/training-list` - Training

If direct URLs work but menu doesn't show, it's a **sidebar rendering issue**, not a permission issue.

---

## 13. Implementation Summary

### Changes Made

#### Frontend Routes Updated ([router.link.tsx](react/src/feature-module/router/router.link.tsx)):
| Route Path | Old Roles | New Roles |
|------------|-----------|-----------|
| `/employees` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/employees-grid` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/employees/:employeeId` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/departments` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/designations` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/policy` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/hrm/holidays` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/leaves` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/leaves-employee` | `['public']` | `['employee', 'admin', 'hr', 'manager', 'superadmin']` |
| `/leave-settings` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/attendance-admin` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/attendance-employee` | `['public']` | `['employee', 'admin', 'hr', 'manager', 'superadmin']` |
| `/timesheets` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/schedule-timing` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/shifts-management` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/batches-management` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/overtime` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/tickets` | `['public']` | `['admin', 'hr', 'manager', 'leads', 'superadmin']` |
| `/tickets-grid` | `['public']` | `['admin', 'hr', 'manager', 'leads', 'superadmin']` |
| `/performance-indicator` | `['public']` | `['admin', 'hr', 'manager', 'superadmin']` |
| `/performance-review` | `['public']` | `['admin', 'hr', 'manager', 'superadmin']` |
| `/performance-appraisal` | `['public']` | `['admin', 'hr', 'manager', 'superadmin']` |
| `/goal-tracking` | `['public']` | `['admin', 'hr', 'manager', 'superadmin']` |
| `/goal-type` | `['public']` | `['admin', 'hr', 'manager', 'superadmin']` |
| `/training-list` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/trainers` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/training-type` | `['public']` | `['admin', 'hr', 'superadmin']` |
| `/tasks` | `['public']` | `['admin', 'hr', 'manager', 'leads', 'superadmin']` |
| `/task-board` | `['public']` | `['admin', 'hr', 'manager', 'leads', 'superadmin']` |

#### Sidebar Menu Updated ([sidebarMenu.jsx](react/src/core/data/json/sidebarMenu.jsx)):
Added the following sections to the HR role menu:
- **Tickets** section with Tickets and Tickets Grid
- **Resignation** menu item
- **Termination** menu item
- **Shifts Management** submenu under Shift & Schedule
- **Shift Batches** submenu under Shift & Schedule

#### Backend Verification:
- Employee controller permissions already correctly configured
- All HRM endpoints use proper `requireRole('admin', 'hr', 'superadmin')` middleware

### Files Modified:
1. `react/src/feature-module/router/router.link.tsx` - Route permissions
2. `react/src/core/data/json/sidebarMenu.jsx` - Sidebar menu structure
3. `docs/HRM-MODULE-ACCESS-CONTROL.md` - This documentation

---

*This document is a living document and should be updated as the access control system evolves.*
