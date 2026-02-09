# HRM Module - Implementation Plan (Phase by Phase)

**Report Date:** 2026-02-07
**Module:** Human Resource Management (HRM)
**Timeline:** 12-16 weeks
**Approach:** Agile, 2-week sprints

---

## EXECUTIVE SUMMARY

This implementation plan addresses all identified issues in the HRM module through a structured, phased approach. The plan prioritizes **critical security fixes** first, followed by **missing features**, then **code quality improvements**, and finally **testing & documentation**.

### Overall Timeline

```
Phase 0: Critical Security Fixes      → 2 weeks  [W1-2]
Phase 1: Bug Fixes & Stabilization    → 2 weeks  [W3-4]
Phase 2: Missing Features             → 6 weeks  [W5-10]
Phase 3: Code Quality & Refactoring   → 3 weeks  [W11-13]
Phase 4: Testing & Documentation      → 3 weeks  [W14-16]
```

---

## PHASE 0: CRITICAL SECURITY FIXES (Weeks 1-2)

**Priority:** 🔴 CRITICAL
**Goal:** Secure all vulnerable endpoints
**Team:** Backend + Security

### Sprint 0.1: Authentication Middleware (Week 1)

#### Task 0.1.1: Add Auth to Attendance Routes
**File:** `backend/routes/api/attendance.js`
**Estimate:** 2 hours

**Before:**
```javascript
import express from 'express';
const router = express.Router();

router.get('/', getAttendances); // NO AUTH!
```

**After:**
```javascript
import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';

const router = express.Router();

// Apply authentication to ALL routes
router.use(authenticate);

// Admin/HR/Superadmin endpoints
router.get('/', authorize(['admin', 'hr', 'superadmin']), getAttendances);
router.get('/stats', authorize(['admin', 'hr', 'superadmin']), getAttendanceStats);
router.delete('/:id', authorize(['admin', 'superadmin']), deleteAttendance);

// Employee accessible endpoints
router.post('/', authorize(['admin', 'hr', 'employee']), createAttendance);
router.put('/:id', authorize(['admin', 'hr', 'employee']), updateAttendance);
router.get('/my', authorize(['admin', 'hr', 'employee', 'manager']), getMyAttendance);
```

**Acceptance Criteria:**
- [ ] All routes protected by authenticate middleware
- [ ] Role-based authorization on each endpoint
- [ ] 401 response for unauthenticated requests
- [ ] 403 response for unauthorized roles
- [ ] Tests pass for all role combinations

---

#### Task 0.1.2: Add Auth to Leave Routes
**File:** `backend/routes/api/leave.js`
**Estimate:** 2 hours

Same pattern as Task 0.1.1.

**Acceptance Criteria:**
- [ ] All routes protected
- [ ] Employees can only access own leaves
- [ ] Admin/HR can access all leaves
- [ ] Approval/rejection restricted to Admin/HR/Manager

---

#### Task 0.1.3: Add Auth to Promotion Routes
**File:** `backend/routes/api/promotions.js`
**Estimate:** 1 hour

**Acceptance Criteria:**
- [ ] All routes protected
- [ ] Only Admin/HR can create/update/delete
- [ ] Employees cannot modify promotions

---

#### Task 0.1.4: Add Auth to Resignation Routes
**File:** `backend/routes/api/resignations.js`
**Estimate:** 1 hour

**Acceptance Criteria:**
- [ ] All routes protected
- [ ] Employees can submit own resignation
- [ ] Only Admin/HR can approve/reject

---

#### Task 0.1.5: Add Auth to Termination Routes
**File:** `backend/routes/api/terminations.js`
**Estimate:** 1 hour

**Acceptance Criteria:**
- [ ] All routes protected
- [ ] Only Admin/HR can create/update

---

### Sprint 0.2: Role-Based Authorization (Week 2)

#### Task 0.2.1: Add Role Checks to Department Controller
**File:** `backend/controllers/rest/department.controller.js`
**Estimate:** 3 hours

**Implementation:**
```javascript
import { hasRole } from '../../utils/authorization.js';

export const createDepartment = async (req, res) => {
  const { role, companyId, userId: hrId } = req.user;

  // SECURITY: Role check
  if (!hasRole(role, ['admin', 'hr'])) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only Admin and HR can create departments'
      }
    });
  }

  if (!companyId) {
    return res.status(401).json({
      success: false,
      error: { message: 'Company ID required' }
    });
  }

  const result = await addDepartment(companyId, hrId, req.body);
  // ...
};
```

**Functions to Update:**
- [ ] createDepartment
- [ ] getAllDepartments
- [ ] getDepartmentById
- [ ] updateDepartment
- [ ] deleteDepartment
- [ ] updateDepartmentStatus

---

#### Task 0.2.2: Add Role Checks to Designation Controller
**File:** `backend/controllers/rest/designation.controller.js`
**Estimate:** 3 hours

Same pattern as Task 0.2.1.

---

#### Task 0.2.3: Create Authorization Utility
**File:** `backend/utils/authorization.js` (NEW)
**Estimate:** 2 hours

**Implementation:**
```javascript
/**
 * Check if user has required role
 */
export const hasRole = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole);
};

/**
 * Check if user owns resource or has admin role
 */
export const isOwnerOrAdmin = (userId, resourceOwnerId, userRole) => {
  return userId === resourceOwnerId || ['admin', 'hr'].includes(userRole);
};

/**
 * Check if user belongs to same company
 */
export const isSameCompany = (userCompanyId, resourceCompanyId) => {
  return userCompanyId === resourceCompanyId;
};
```

---

#### Task 0.2.4: Security Audit & Testing
**Estimate:** 4 hours

**Tasks:**
- [ ] Manual test all endpoints with different roles
- [ ] Verify SuperAdmin cannot access company data
- [ ] Verify Employee cannot access admin endpoints
- [ ] Test direct URL access (bypassing UI)
- [ ] Document any remaining issues

---

## PHASE 1: BUG FIXES & STABILIZATION (Weeks 3-4)

**Priority:** 🟠 HIGH
**Goal:** Fix all runtime bugs and stabilize the system
**Team:** Backend + Frontend

### Sprint 1.1: Backend Bug Fixes (Week 3)

#### Task 1.1.1: Fix HR Dashboard Const Reassignment
**File:** `backend/services/hr/hrm.dashboard.js:80-120`
**Estimate:** 1 hour

**Bug:**
```javascript
const stats = { totalEmployees: 0 };
stats = { totalEmployees: 100 }; // ERROR: Const reassignment!
```

**Fix:**
```javascript
let stats = { totalEmployees: 0 };
stats = { totalEmployees: 100 }; // OK
// OR
const stats = { totalEmployees: 0 };
const updatedStats = { ...stats, totalEmployees: 100 }; // OK
```

---

#### Task 1.1.2: Fix Frontend Hooks Endpoint Mismatches
**Files:** Multiple `react/src/hooks/use*.ts` files
**Estimate:** 4 hours

**Issues Found:**
- `useEmployeesREST.ts` - Wrong endpoint for bulk delete
- `useLeaveREST.ts` - Missing cancel endpoint
- `useAttendanceREST.ts` - Wrong regularization endpoints

**Fix Pattern:**
```typescript
// Before
const deleteEmployee = async (id: string) => {
  return await axios.delete(`/api/employee/${id}`); // Wrong!
};

// After
const deleteEmployee = async (id: string) => {
  return await axios.delete(`/api/employees/${id}`); // Correct!
};
```

---

#### Task 1.1.3: Fix Schema Type Mismatches
**Files:** All schema files
**Estimate:** 6 hours

**Issue:** `departmentId` stored as both ObjectId and String

**Approach:**
1. Standardize all foreign keys to ObjectId
2. Add migration script to convert existing data
3. Update all queries to use ObjectId

**Migration Script:**
```javascript
// backend/migrations/fixDepartmentIdTypes.js
export async function up() {
  const collections = await getTenantCollections();
  const companies = await getCompanies();

  for (const company of companies) {
    const collections = getTenantCollections(company._id);

    // Convert string departmentId to ObjectId
    await collections.employees.updateMany(
      { departmentId: { $type: 'string' } },
      [{ $set: { departmentId: { $toObjectId: '$departmentId' } } }]
    );
  }
}
```

---

#### Task 1.1.4: Add Missing Validation
**Estimate:** 4 hours

**Create Joi schemas:**
```javascript
// backend/validation/department.validation.js
import Joi from 'joi';

export const createDepartmentSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().max(500),
  managerId: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive').default('active')
});

export const updateDepartmentSchema = Joi.object({
  name: Joi.string().min(2).max(100),
  description: Joi.string().max(500),
  managerId: Joi.string().optional(),
  status: Joi.string().valid('active', 'inactive')
}).min(1);
```

**Apply to routes:**
```javascript
router.post('/', validate(createDepartmentSchema), createDepartment);
router.put('/:id', validate(updateDepartmentSchema), updateDepartment);
```

---

### Sprint 1.2: Frontend Stabilization (Week 4)

#### Task 1.2.1: Fix Dashboard Content Display
**Files:** Dashboard components
**Estimate:** 3 hours

**Issue:** Dashboards show cards for all dashboards regardless of role

**Fix:**
```typescript
// Before
const DashboardCards = () => (
  <>
    <AdminDashboardCard />
    <HRDashboardCard />
    <EmployeeDashboardCard />
  </>
);

// After
const DashboardCards = () => {
  const { role } = useAuth();

  return (
    <>
      {role === 'admin' && <AdminDashboardCard />}
      {(role === 'hr' || role === 'manager' || role === 'leads') && <HRDashboardCard />}
      <EmployeeDashboardCard />
    </>
  );
};
```

---

#### Task 1.2.2: Add Error Boundaries
**Files:** All major components
**Estimate:** 4 hours

**Implementation:**
```typescript
// react/src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong</h2>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

#### Task 1.2.3: Improve Loading States
**Files:** All components with API calls
**Estimate:** 3 hours

**Add skeleton loaders:**
```typescript
const EmployeeList = () => {
  const { data, loading, error } = useEmployeesREST();

  if (loading) {
    return <EmployeeListSkeleton />;
  }

  if (error) {
    return <ErrorMessage error={error} />;
  }

  return <EmployeeListTable data={data} />;
};
```

---

## PHASE 2: MISSING FEATURES (Weeks 5-10)

**Priority:** ⚠️ MEDIUM-HIGH
**Goal:** Complete all partially implemented features
**Team:** Full Stack

### Sprint 2.1: Timesheet Module (Weeks 5-6)

#### Task 2.1.1: Create Timesheet Schema
**File:** `backend/models/timesheet/timesheet.schema.js` (NEW)
**Estimate:** 4 hours

**Schema Design:**
```javascript
import mongoose from 'mongoose';

const timesheetEntrySchema = new mongoose.Schema({
  date: { type: Date, required: true },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  task: { type: String },
  description: { type: String, required: true },
  hours: { type: Number, required: true, min: 0, max: 24 },
  isBillable: { type: Boolean, default: false }
});

const timesheetSchema = new mongoose.Schema({
  timesheetId: { type: String, unique: true, required: true },
  employeeId: { type: String, required: true },
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  weekStartDate: { type: Date, required: true },
  weekEndDate: { type: Date, required: true },
  entries: [timesheetEntrySchema],
  totalHours: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft'
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedAt: { type: Date },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  rejectionReason: { type: String },
  companyId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  isDeleted: { type: Boolean, default: false }
});

export default timesheetSchema;
```

---

#### Task 2.1.2: Create Timesheet Controller
**File:** `backend/controllers/rest/timesheet.controller.js` (NEW)
**Estimate:** 8 hours

**Endpoints:**
```javascript
// Get all timesheets (Admin/HR)
export const getTimesheets = asyncHandler(async (req, res) => {
  const { page, limit, status, employee, weekStart } = req.query;
  const user = extractUser(req);

  const collections = getTenantCollections(user.companyId);
  const filter = { isDeleted: { $ne: true } };

  if (status) filter.status = status;
  if (employee) filter.employeeId = employee;
  if (weekStart) {
    filter.weekStartDate = {
      $gte: new Date(weekStart),
      $lt: new Date(new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000)
    };
  }

  const timesheets = await collections.timesheets
    .find(filter)
    .sort({ weekStartDate: -1 })
    .toArray();

  return sendSuccess(res, timesheets);
});

// Create timesheet entry
export const createTimesheet = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { weekStart, entries } = req.body;

  const collections = getTenantCollections(user.companyId);
  const employee = await getEmployeeByClerkId(collections, user.userId);

  const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);

  const timesheet = {
    timesheetId: `TS_${Date.now()}`,
    employeeId: employee.employeeId,
    employee: employee._id,
    weekStartDate: new Date(weekStart),
    weekEndDate: new Date(new Date(weekStart).getTime() + 6 * 24 * 60 * 60 * 1000),
    entries,
    totalHours,
    status: 'draft',
    companyId: user.companyId,
    createdAt: new Date()
  };

  const result = await collections.timesheets.insertOne(timesheet);

  // Broadcast event
  const io = getSocketIO(req);
  if (io) {
    broadcastTimesheetEvents.created(io, user.companyId, timesheet);
  }

  return sendCreated(res, timesheet);
});

// Submit timesheet for approval
export const submitTimesheet = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  const collections = getTenantCollections(user.companyId);

  await collections.timesheets.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: 'submitted',
        submittedBy: user.userId,
        submittedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  // Broadcast event
  const io = getSocketIO(req);
  if (io) {
    io.to(`company_${user.companyId}`).emit('timesheet:submitted', { timesheetId: id });
  }

  return sendSuccess(res, null, 'Timesheet submitted successfully');
});

// Approve timesheet
export const approveTimesheet = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;
  const user = extractUser(req);

  const collections = getTenantCollections(user.companyId);

  await collections.timesheets.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: 'approved',
        approvedBy: user.userId,
        approvedAt: new Date(),
        approvalComments: comments,
        updatedAt: new Date()
      }
    }
  );

  // Broadcast event
  const io = getSocketIO(req);
  if (io) {
    io.to(`company_${user.companyId}`).emit('timesheet:approved', { timesheetId: id });
  }

  return sendSuccess(res, null, 'Timesheet approved successfully');
});

export default {
  getTimesheets,
  createTimesheet,
  submitTimesheet,
  approveTimesheet
};
```

---

#### Task 2.1.3: Create Timesheet Routes
**File:** `backend/routes/api/timesheets.js` (NEW)
**Estimate:** 2 hours

```javascript
import express from 'express';
import { authenticate } from '../../middleware/auth.js';
import { authorize } from '../../middleware/rbac.js';
import * as timesheetController from '../../controllers/rest/timesheet.controller.js';

const router = express.Router();

router.use(authenticate);

router.get('/', authorize(['admin', 'hr', 'superadmin']), timesheetController.getTimesheets);
router.get('/my', authorize(['admin', 'hr', 'employee', 'manager']), timesheetController.getMyTimesheets);
router.post('/', authorize(['admin', 'hr', 'employee', 'manager']), timesheetController.createTimesheet);
router.post('/:id/submit', authorize(['admin', 'hr', 'employee', 'manager']), timesheetController.submitTimesheet);
router.post('/:id/approve', authorize(['admin', 'hr', 'manager']), timesheetController.approveTimesheet);
router.post('/:id/reject', authorize(['admin', 'hr', 'manager']), timesheetController.rejectTimesheet);

export default router;
```

---

#### Task 2.1.4: Create Timesheet Frontend Hook
**File:** `react/src/hooks/useTimesheetsREST.ts` (NEW)
**Estimate:** 3 hours

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';

const API_BASE = '/api/timesheets';

export const useTimesheetsREST = () => {
  const queryClient = useQueryClient();

  // Get all timesheets
  const getTimesheets = async (params = {}) => {
    const response = await axios.get(API_BASE, { params });
    return response.data;
  };

  const useGetTimesheets = (params) => {
    return useQuery({
      queryKey: ['timesheets', params],
      queryFn: () => getTimesheets(params)
    });
  };

  // Create timesheet
  const createTimesheet = async (data) => {
    const response = await axios.post(API_BASE, data);
    return response.data;
  };

  const useCreateTimesheet = () => {
    return useMutation({
      mutationFn: createTimesheet,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        toast.success('Timesheet created successfully');
      }
    });
  };

  // Submit timesheet
  const submitTimesheet = async (id) => {
    const response = await axios.post(`${API_BASE}/${id}/submit`);
    return response.data;
  };

  const useSubmitTimesheet = () => {
    return useMutation({
      mutationFn: submitTimesheet,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        toast.success('Timesheet submitted successfully');
      }
    });
  };

  return {
    useGetTimesheets,
    useCreateTimesheet,
    useSubmitTimesheet
  };
};
```

---

### Sprint 2.2: Overtime Module (Weeks 7-8)

#### Task 2.2.1: Complete Overtime Controller
**File:** `backend/controllers/rest/overtime.controller.js`
**Estimate:** 6 hours

**Implementation pattern similar to Timesheet:**
- Create overtime request
- Submit for approval
- Approve/reject workflow
- Calculate overtime pay based on rate
- Broadcast Socket.IO events

---

### Sprint 2.3: Complete Lifecycle Features (Weeks 9-10)

#### Task 2.3.1: Complete Promotion Workflow
**File:** `backend/controllers/rest/promotion.controller.js`
**Estimate:** 4 hours

**Add missing:**
- Notification on promotion
- Update employee designation
- Update salary (if provided)
- Create history record

---

#### Task 2.3.2: Complete Resignation Workflow
**File:** `backend/controllers/rest/resignation.controller.js`
**Estimate:** 6 hours

**Add missing:**
- Offboarding checklist
- Asset handover tracking
- Clearance workflow
- Final settlement calculation
- Exit interview

---

#### Task 2.3.3: Complete Termination Workflow
**File:** `backend/controllers/rest/termination.controller.js`
**Estimate:** 6 hours

**Add missing:**
- Document generation (termination letter)
- Compliance checks
- Final settlement
- Access revocation
- Legal hold (if needed)

---

## PHASE 3: CODE QUALITY & REFACTORING (Weeks 11-13)

**Priority:** ⚠️ MEDIUM
**Goal:** Improve code quality and consistency
**Team:** Backend + Frontend

### Sprint 3.1: Backend Refactoring (Week 11)

#### Task 3.1.1: Implement Transaction Support
**Estimate:** 8 hours

**Pattern:**
```javascript
import { ClientSession } from 'mongodb';

export const approveLeave = async (req, res) => {
  const session = await startSession();
  session.startTransaction();

  try {
    // Update leave status
    await collections.leaves.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: 'approved' } },
      { session }
    );

    // Deduct from balance
    await collections.employees.updateOne(
      { employeeId: leave.employeeId },
      { $inc: { 'leaveBalances.$[elem].balance': -leave.duration } },
      { session }
    );

    await session.commitTransaction();
    return sendSuccess(res, updatedLeave);
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};
```

---

#### Task 3.1.2: Standardize Soft Delete
**Estimate:** 4 hours

**Create base schema plugin:**
```javascript
// backend/models/plugins/softDelete.js
export const softDeletePlugin = (schema) => {
  schema.pre('find', function() {
    this.where({ isDeleted: { $ne: true } });
  });

  schema.pre('findOne', function() {
    this.where({ isDeleted: { $ne: true } });
  });

  schema.methods.softDelete = async function(userId) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = userId;
    return this.save();
  };
};
```

---

#### Task 3.1.3: Remove Console.log Statements
**Estimate:** 2 hours

**Replace with logger:**
```javascript
// Before
console.log('Employee created:', employee);

// After
logger.info('Employee created', { employeeId: employee.employeeId, userId: req.user.userId });
```

---

### Sprint 3.2: Frontend Refactoring (Week 12)

#### Task 3.2.1: Standardize Error Handling
**Estimate:** 4 hours

**Create error handler:**
```typescript
// react/src/utils/errorHandler.ts
export const handleApiError = (error) => {
  if (error.response?.status === 401) {
    toast.error('Session expired. Please login again.');
    // Redirect to login
    window.location.href = '/login';
  } else if (error.response?.status === 403) {
    toast.error('You don\'t have permission to perform this action.');
  } else if (error.response?.status === 404) {
    toast.error('Resource not found.');
  } else {
    toast.error(error.response?.data?.error?.message || 'An error occurred');
  }
};
```

---

#### Task 3.2.2: Implement Consistent Loading States
**Estimate:** 4 hours

**Create reusable loader component:**
```typescript
// react/src/components/LoadingSpinner.tsx
export const LoadingSpinner = ({ size = 'md' }) => (
  <div className={`spinner spinner-${size}`}>
    <div className="double-bounce1"></div>
    <div className="double-bounce2"></div>
  </div>
);
```

---

### Sprint 3.3: Performance Optimization (Week 13)

#### Task 3.3.1: Add Database Indexes
**Estimate:** 4 hours

```javascript
// backend/models/employee/employee.schema.js
employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ companyId: 1, status: 1 });
employeeSchema.index({ departmentId: 1 });
employeeSchema.index({ designationId: 1 });
employeeSchema.index({ 'employmentInfo.email': 1 });
employeeSchema.index({ isDeleted: 1 });
```

---

#### Task 3.3.2: Implement Response Caching
**Estimate:** 4 hours

```javascript
import NodeCache from 'node-cache';
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

export const getDepartments = async (req, res) => {
  const cacheKey = `departments_${req.user.companyId}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return res.json(cached);
  }

  const result = await fetchDepartments();
  cache.set(cacheKey, result);
  return res.json(result);
};
```

---

## PHASE 4: TESTING & DOCUMENTATION (Weeks 14-16)

**Priority:** ⚠️ MEDIUM
**Goal:** Comprehensive testing and documentation
**Team:** Full Stack + QA

### Sprint 4.1: Unit Testing (Week 14)

#### Task 4.1.1: Test Services
**Estimate:** 12 hours

**Example:**
```javascript
// backend/services/hr/__tests__/hrm.employee.test.js
import { createEmployee } from '../hrm.employee.js';

describe('Employee Service', () => {
  describe('createEmployee', () => {
    it('should create employee with valid data', async () => {
      const data = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com'
      };

      const result = await createEmployee('company123', 'user123', data);

      expect(result.done).toBe(true);
      expect(result.data.employeeId).toMatch(/^EMP-\d{4}-\d{4}$/);
    });

    it('should reject duplicate email', async () => {
      const data = {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'john@example.com' // Duplicate
      };

      const result = await createEmployee('company123', 'user123', data);

      expect(result.done).toBe(false);
      expect(result.error).toContain('already exists');
    });
  });
});
```

---

### Sprint 4.2: Integration Testing (Week 15)

#### Task 4.2.1: Test API Endpoints
**Estimate:** 16 hours

```javascript
// backend/integration-tests/api/employees.test.js
import request from 'supertest';
import app from '../../app.js';

describe('Employee API', () => {
  let authToken;

  beforeAll(async () => {
    // Setup test user and get auth token
    authToken = await getTestAuthToken('admin');
  });

  describe('POST /api/employees', () => {
    it('should create employee when authenticated as admin', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send({
          firstName: 'Test',
          lastName: 'User'
        });

      expect(response.status).toBe(401);
    });

    it('should return 403 when authenticated as employee', async () => {
      const employeeToken = await getTestAuthToken('employee');

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          firstName: 'Test',
          lastName: 'User'
        });

      expect(response.status).toBe(403);
    });
  });
});
```

---

### Sprint 4.3: Documentation & Deployment (Week 16)

#### Task 4.3.1: Update API Documentation
**Estimate:** 8 hours

**Create OpenAPI spec:**
```yaml
# backend/docs/openapi.yaml
openapi: 3.0.0
info:
  title: HRM API
  version: 1.0.0

paths:
  /api/employees:
    get:
      summary: Get all employees
      tags: [Employees]
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
        - name: limit
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: List of employees
        '401':
          description: Unauthorized
        '403':
          description: Forbidden
```

---

#### Task 4.3.2: Create Deployment Guide
**Estimate:** 4 hours

**Include:**
- Environment variables
- Database setup
- Migration steps
- CI/CD pipeline
- Monitoring setup

---

## DELIVERABLES SUMMARY

### Phase 0 Deliverables
- [ ] All routes protected with authentication middleware
- [ ] Role-based authorization on all endpoints
- [ ] Security audit report
- [ ] Penetration test results

### Phase 1 Deliverables
- [ ] All runtime bugs fixed
- [ ] Schema migrations applied
- [ ] Validation schemas added
- [ ] Error boundaries implemented

### Phase 2 Deliverables
- [ ] Timesheet module complete
- [ ] Overtime module complete
- [ ] Promotion workflow complete
- [ ] Resignation workflow complete
- [ ] Termination workflow complete

### Phase 3 Deliverables
- [ ] Transaction support added
- [ ] Soft delete standardized
- [ ] Code quality metrics met
- [ ] Performance benchmarks

### Phase 4 Deliverables
- [ ] 80%+ test coverage
- [ ] API documentation complete
- [ ] Deployment guide complete
- [ ] Production deployment

---

## RISK ASSESSMENT

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Security vulnerabilities not found | 🔴 High | 🟠 Medium | External security audit |
| Data migration issues | 🟠 Medium | 🟠 Medium | Comprehensive testing, rollback plan |
| Scope creep | 🟠 Medium | 🔴 High | Strict change control process |
| Resource constraints | 🟠 Medium | 🟠 Medium | Prioritize critical path |
| Integration issues | 🟠 Medium | 🟠 Medium | Incremental integration testing |

---

## SUCCESS CRITERIA

### Must Have (Phase 0)
- All critical security issues resolved
- No authentication bypass possible
- Role-based access control enforced

### Should Have (Phase 1-2)
- All bugs fixed
- Missing features implemented
- 80% test coverage

### Could Have (Phase 3-4)
- Performance optimizations
- Enhanced documentation
- Additional monitoring

---

**Report Generated:** 2026-02-07
**Next Review:** Weekly sprint reviews
**Owner:** HRM Development Team
**Approach:** Agile, 2-week sprints
