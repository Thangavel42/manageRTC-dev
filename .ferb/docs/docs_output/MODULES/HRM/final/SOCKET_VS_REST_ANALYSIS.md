# HRM Module - Socket.IO vs REST API Analysis

**Report Date:** 2026-02-07
**Scope:** All HRM Backend Operations
**Architecture:** Hybrid REST + Socket.IO

---

## Executive Summary

The HRM module uses a **hybrid architecture** combining REST APIs for CRUD operations with Socket.IO for real-time updates. This analysis documents all operations handled by each protocol and their integration patterns.

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  REST API Calls  │         │  Socket.IO Client │         │
│  │  (axios/fetch)   │         │  (socket.io-client)│        │
│  └────────┬─────────┘         └────────┬─────────┘         │
└───────────┼──────────────────────────┼──────────────────────┘
            │                          │
            ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend Server                          │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  REST Controllers│────────▶│  Socket Router    │         │
│  │  (Express)       │         │  (socket.io)      │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                            │                     │
│           ▼                            ▼                     │
│  ┌──────────────────────────────────────────────────┐      │
│  │           Service Layer (Business Logic)          │      │
│  └──────────────────────┬───────────────────────────┘      │
│                         │                                  │
│                         ▼                                  │
│  ┌──────────────────────────────────────────────────┐      │
│  │              Database (MongoDB)                   │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. SOCKET.IO IMPLEMENTATION

### 1.1 Connection Flow

**Entry Point:** `backend/socket/index.js` (299 lines)

```javascript
// Connection authentication
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  // Verify token with Clerk
  const verifiedToken = await verifyToken(token, {
    jwtKey: process.env.CLERK_JWT_KEY,
    authorizedParties
  });

  // Get user from Clerk
  const user = await clerkClient.users.getUser(verifiedToken.sub);

  // Extract role and companyId
  const role = user.publicMetadata?.role;
  const companyId = user.publicMetadata?.companyId || user.publicMetadata?.company;

  // Security checks
  if (role === 'admin' && (!companyId || !user.publicMetadata?.isAdminVerified)) {
    return next(new Error('Unauthorized: Admin access requires companyId and verification'));
  }

  // Store on socket
  socket.userId = verifiedToken.sub;
  socket.role = role;
  socket.companyId = companyId;
  socket.authenticated = true;

  // Join role-based rooms
  switch (role) {
    case 'superadmin':
      socket.join('superadmin_room');
      break;
    case 'admin':
      socket.join(`admin_room_${companyId}`);
      socket.join(`company_${companyId}`);
      socket.join(`user_${user.id}`);
      break;
    case 'hr':
      socket.join(`hr_room_${companyId}`);
      socket.join(`company_${companyId}`);
      socket.join(`user_${user.id}`);
      break;
    case 'employee':
      socket.join(`employee_room_${companyId}`);
      socket.join(`company_${companyId}`);
      socket.join(`user_${user.id}`);
      break;
  }

  return next();
});
```

### 1.2 Socket Rooms

| Role | Rooms Joined | Purpose |
|------|--------------|---------|
| **superadmin** | `superadmin_room` | Platform-level updates |
| **admin** | `admin_room_{companyId}`, `company_{companyId}`, `user_{userId}` | Admin-specific, company-wide, personal |
| **hr** | `hr_room_{companyId}`, `company_{companyId}`, `user_{userId}` | HR-specific, company-wide, personal |
| **employee** | `employee_room_{companyId}`, `company_{companyId}`, `user_{userId}` | Employee-specific, company-wide, personal |

### 1.3 Socket Router

**File:** `backend/socket/router.js` (162 lines)

```javascript
const router = (socket, io, role) => {
  // Chat controllers (all authenticated users with companyId)
  if (socket.companyId) {
    new ChatController(socket, io);
    new ChatUsersController(socket, io);
  }

  // Role-based controller routing
  switch (role) {
    case 'superadmin':
      superAdminController(socket, io);
      socialFeedSocketController(socket, io);
      break;

    case 'admin':
      // All HRM controllers
      hrDashboardController(socket, io);
      adminController(socket, io);

      // Performance controllers
      performanceIndicatorController(socket, io);
      performanceAppraisalController(socket, io);
      performanceReviewController(socket, io);
      goalTypeController(socket, io);
      goalTrackingController(socket, io);
      promotionController(socket, io);

      // Training controllers
      trainersController(socket, io);
      trainingTypesController(socket, io);
      trainingListController(socket, io);
      break;

    case 'hr':
      // Similar to admin but without adminController
      hrDashboardController(socket, io);
      performanceIndicatorController(socket, io);
      // ...
      break;
  }
};
```

---

## 2. SOCKET CONTROLLERS (HRM MODULE)

### 2.1 HR Dashboard Controller

**File:** `backend/controllers/hr/hr.controller.js`

**Purpose:** Real-time HR dashboard statistics updates

**Events:**
```javascript
// Client emits
'hr:getStats'         → Request dashboard statistics
'hr:getEmployeeCount' → Request employee count
'hr:getNewHires'      → Request new hires data

// Server broadcasts
'hr:statsUpdated'     → Dashboard stats updated
'hr:employeeAdded'    → New employee added
'hr:employeeUpdated'  → Employee details updated
```

---

### 2.2 Holiday Controllers

**File:** `backend/controllers/hr/holidays.controller.js`

**Purpose:** Real-time holiday management

**Events:**
```javascript
// Client emits
'holiday:create'       → Create new holiday
'holiday:update'       → Update holiday
'holiday:delete'       → Delete holiday
'holiday:getAll'       → Get all holidays

// Server broadcasts
'holiday:created'      → New holiday created
'holiday:updated'      → Holiday updated
'holiday:deleted'      → Holiday deleted
```

---

### 2.3 Resignation Controller

**File:** `backend/controllers/hr/resignation.controller.js`

**Purpose:** Real-time resignation workflow

**Events:**
```javascript
// Client emits
'resignation:submit'   → Submit resignation
'resignation:approve'  → Approve resignation
'resignation:reject'   → Reject resignation
'resignation:getAll'   → Get all resignations

// Server broadcasts
'resignation:submitted' → New resignation submitted
'resignation:approved'  → Resignation approved
'resignation:rejected'  → Resignation rejected
'resignation:withdrawn' → Resignation withdrawn
```

---

### 2.4 Termination Controller

**File:** `backend/controllers/hr/termination.controller.js`

**Purpose:** Real-time termination workflow

**Events:**
```javascript
// Client emits
'termination:initiate' → Initiate termination
'termination:approve'  → Approve termination
'termination:complete' → Complete termination
'termination:getAll'   → Get all terminations

// Server broadcasts
'termination:initiated' → New termination initiated
'termination:approved'  → Termination approved
'termination:completed' → Termination completed
```

---

### 2.5 Training Controllers

**Files:**
- `backend/controllers/hr/trainingList.controller.js`
- `backend/controllers/hr/trainers.controller.js`
- `backend/controllers/hr/trainingTypes.controller.js`

**Events:**
```javascript
// Client emits
'training:create'       → Create training
'training:enroll'       → Enroll in training
'training:complete'     → Mark training complete
'trainer:create'        → Add trainer
'trainingType:add'      → Add training type

// Server broadcasts
'training:created'      → New training created
'training:updated'      → Training updated
'training:enrolled'     → User enrolled
'training:completed'    → Training completed
```

---

### 2.6 Performance Controllers

**Files:**
- `backend/controllers/performance/promotion.controller.js`
- `backend/controllers/performance/performanceIndicator.controller.js`
- `backend/controllers/performance/performanceReview.controller.js`
- `backend/controllers/performance/goalTracking.controller.js`

**Events:**
```javascript
// Client emits
'promotion:create'           → Create promotion
'promotion:approve'          → Approve promotion
'indicator:create'           → Create KPI
'review:start'               → Start review
'goal:create'                → Create goal
'goal:update'                → Update goal progress

// Server broadcasts
'promotion:created'          → New promotion created
'promotion:approved'         → Promotion approved
'indicator:updated'          → KPI updated
'review:completed'           → Review completed
'goal:updated'               → Goal progress updated
```

---

## 3. REST API ENDPOINTS (HRM MODULE)

### 3.1 Employee Management (12 endpoints)

```
GET    /api/employees              → List all employees
GET    /api/employees/:id          → Get employee by ID
POST   /api/employees              → Create employee
PUT    /api/employees/:id          → Update employee
DELETE /api/employees/:id          → Delete employee
GET    /api/employees/search       → Search employees
GET    /api/employees/stats        → Employee statistics
POST   /api/employees/bulk         → Bulk operations
POST   /api/employees/check-duplicates → Check duplicates
GET    /api/employees/me           → Get current user profile
PUT    /api/employees/me           → Update current user profile
```

---

### 3.2 Department Management (5 endpoints)

```
GET    /api/departments            → List all departments
GET    /api/departments/:id        → Get by ID
POST   /api/departments            → Create department
PUT    /api/departments/:id        → Update department
DELETE /api/departments/:id        → Delete department
```

---

### 3.3 Designation Management (5 endpoints)

```
GET    /api/designations           → List all designations
GET    /api/designations/:id       → Get by ID
POST   /api/designations           → Create designation
PUT    /api/designations/:id       → Update designation
DELETE /api/designations/:id       → Delete designation
```

---

### 3.4 Attendance Management (17 endpoints)

```
GET    /api/attendance             → List all attendance
GET    /api/attendance/:id         → Get by ID
POST   /api/attendance             → Clock in
PUT    /api/attendance/:id         → Clock out
DELETE /api/attendance/:id         → Delete record
GET    /api/attendance/my          → My attendance
GET    /api/attendance/daterange   → By date range
GET    /api/attendance/employee/:id → By employee
GET    /api/attendance/stats       → Statistics
POST   /api/attendance/bulk        → Bulk actions
POST   /api/attendance/:id/request-regularization → Request
POST   /api/attendance/:id/approve-regularization → Approve
POST   /api/attendance/:id/reject-regularization → Reject
GET    /api/attendance/regularization/pending → Pending requests
POST   /api/attendance/report      → Generate report
POST   /api/attendance/report/employee/:id → Employee report
GET    /api/attendance/export      → Export data
```

---

### 3.5 Leave Management (14 endpoints)

```
GET    /api/leaves                 → List all leaves
GET    /api/leaves/:id             → Get by ID
POST   /api/leaves                 → Create leave
PUT    /api/leaves/:id             → Update leave
DELETE /api/leaves/:id             → Delete leave
GET    /api/leaves/my              → My leaves
GET    /api/leaves/status/:status  → By status
POST   /api/leaves/:id/approve     → Approve leave
POST   /api/leaves/:id/reject      → Reject leave
POST   /api/leaves/:id/cancel      → Cancel leave
GET    /api/leaves/balance         → Get balance
GET    /api/leaves/team            → Team leaves
POST   /api/leaves/:leaveId/attachments → Upload attachment
DELETE /api/leaves/:leaveId/attachments/:attachmentId → Delete
GET    /api/leaves/:leaveId/attachments → Get attachments
```

---

### 3.6 Shift Management (10 endpoints)

```
GET    /api/shifts                 → List all shifts
GET    /api/shifts/:id             → Get by ID
POST   /api/shifts                 → Create shift
PUT    /api/shifts/:id             → Update shift
DELETE /api/shifts/:id             → Delete shift
GET    /api/shifts/active          → Get active shifts
GET    /api/shifts/default         → Get default shift
PUT    /api/shifts/:id/set-default → Set as default
POST   /api/shifts/assign          → Assign to employee
POST   /api/shifts/bulk-assign     → Bulk assign
DELETE /api/shifts/:employeeId     → Remove assignment
```

---

### 3.7 Holiday Management (7 endpoints)

```
GET    /api/holidays               → List all holidays
GET    /api/holidays/:id           → Get by ID
POST   /api/holidays               → Create holiday
PUT    /api/holidays/:id           → Update holiday
DELETE /api/holidays/:id           → Delete holiday
GET    /api/holidays/year/:year    → Get by year
POST   /api/holidays/bulk          → Bulk import
```

---

### 3.8 Promotion Management (5 endpoints)

```
GET    /api/promotions             → List all promotions
GET    /api/promotions/:id         → Get by ID
POST   /api/promotions             → Create promotion
PUT    /api/promotions/:id         → Update promotion
DELETE /api/promotions/:id         → Delete promotion
```

---

### 3.9 Resignation Management (6 endpoints)

```
GET    /api/resignations           → List all resignations
GET    /api/resignations/:id       → Get by ID
POST   /api/resignations           → Submit resignation
PUT    /api/resignations/:id       → Update resignation
DELETE /api/resignations/:id       → Delete resignation
POST   /api/resignations/:id/approve → Approve resignation
```

---

### 3.10 Termination Management (5 endpoints)

```
GET    /api/terminations           → List all terminations
GET    /api/terminations/:id       → Get by ID
POST   /api/terminations           → Create termination
PUT    /api/terminations/:id       → Update termination
DELETE /api/terminations/:id       → Delete termination
```

---

### 3.11 Training Management (8 endpoints)

```
GET    /api/training               → List all training
GET    /api/training/:id           → Get by ID
POST   /api/training               → Create training
PUT    /api/training/:id           → Update training
DELETE /api/training/:id           → Delete training
POST   /api/training/:id/enroll    → Enroll employee
POST   /api/training/:id/complete  → Mark complete
GET    /api/training/types         → Get training types
```

---

## 4. INTEGRATION PATTERN

### 4.1 REST Controller with Socket Broadcast

**Pattern:** REST endpoints handle CRUD and broadcast Socket.IO events

```javascript
// Example: Department Controller
export const createDepartment = async (req, res) => {
  const { companyId, userId: hrId } = req.user;
  const payload = req.body;

  // Create department via service
  const result = await addDepartment(companyId, hrId, payload);

  // Get the created department
  const displayResult = await displayDepartments(companyId, null, { _id: result.data._id });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io && displayResult.data && displayResult.data.length > 0) {
    broadcastDepartmentEvents.created(io, companyId, displayResult.data[0]);
  }

  return res.status(201).json({
    success: true,
    data: displayResult.data[0],
    message: 'Department created successfully'
  });
};
```

### 4.2 Socket Broadcaster Utility

**File:** `backend/utils/socketBroadcaster.js`

```javascript
export const broadcastDepartmentEvents = {
  created: (io, companyId, department) => {
    io.to(`company_${companyId}`).emit('department:created', department);
  },
  updated: (io, companyId, department) => {
    io.to(`company_${companyId}`).emit('department:updated', department);
  },
  deleted: (io, companyId, departmentId, userId) => {
    io.to(`company_${companyId}`).emit('department:deleted', { departmentId, userId });
  }
};
```

---

## 5. PROTOCOL SELECTION GUIDELINES

### 5.1 Use REST API For:

| Use Case | Reason |
|----------|--------|
| CRUD Operations | Standard HTTP semantics |
| File Uploads | Better support for multipart/form-data |
| Pagination | Easy with query parameters |
| Caching | Built-in HTTP caching |
| API Versioning | URL-based versioning |
| External Integration | Standard web API |
| Bulk Operations | Request body can handle arrays |

### 5.2 Use Socket.IO For:

| Use Case | Reason |
|----------|--------|
| Real-time Updates | Instant push notifications |
| Collaborative Features | Multiple users see changes immediately |
| Dashboard Live Updates | Statistics change in real-time |
| Notifications | Immediate delivery |
| Chat/Messaging | Bidirectional communication |
| Presence Tracking | User online/offline status |
| Progress Updates | Long-running operation status |

---

## 6. ARCHITECTURAL DECISIONS

### 6.1 Why Hybrid Architecture?

**Benefits:**
1. **Flexibility:** Use the right tool for each use case
2. **Performance:** REST for standard CRUD, Socket for real-time
3. **Scalability:** Can scale each component independently
4. **Developer Experience:** REST is easier to test and debug
5. **Integration:** REST is better for third-party integrations

**Trade-offs:**
1. **Complexity:** Two protocols to maintain
2. **Code Duplication:** Similar logic in REST and Socket controllers
3. **Consistency:** Need to keep both in sync

### 6.2 Data Consistency

**Approach:**
- REST is the **source of truth** for data mutations
- Socket.IO is for **notifications** only
- Socket controllers can mutate data but must broadcast events

**Pattern:**
```javascript
// REST Controller (source of truth)
const result = await createEmployee(data);
broadcastEvent('employee:created', result);

// Socket Controller (can also mutate)
socket.on('employee:create', async (data) => {
  const result = await createEmployee(data);
  io.to('company_' + companyId).emit('employee:created', result);
});
```

---

## 7. CURRENT ISSUES

### 7.1 Inconsistent Implementation

**Issue:** Some controllers use Socket.IO, others don't

**Examples:**
- ✅ Employee: Has both REST and Socket controllers
- ✅ Training: Has both REST and Socket controllers
- ❌ Department: REST only, no Socket events
- ❌ Designation: REST only, no Socket events
- ❌ Attendance: REST only, no Socket events

**Impact:** Users don't get real-time updates for all entities

### 7.2 Missing Socket Events

**Entities without Socket broadcasts:**
1. Department changes
2. Designation changes
3. Policy updates
4. Shift assignments
5. Holiday additions

---

## 8. RECOMMENDATIONS

### 8.1 Short Term

1. **Add Socket broadcasts** to all REST controllers
2. **Implement Socket events** for missing entities
3. **Standardize** the broadcast pattern

### 8.2 Medium Term

1. **Create base controller class** with built-in broadcast support
2. **Implement event replay** for reconnecting clients
3. **Add Socket authentication** to all controllers

### 8.3 Long Term

1. **Consider event-sourcing** for complete audit trail
2. **Implement CQRS** for read/write separation
3. **Add message queue** for reliable event delivery

---

## 9. SUMMARY TABLE

| Entity | REST Endpoints | Socket Events | Status |
|--------|---------------|---------------|--------|
| Employee | ✅ 12 endpoints | ✅ Full | Complete |
| Department | ✅ 5 endpoints | ❌ None | Add Socket |
| Designation | ✅ 5 endpoints | ❌ None | Add Socket |
| Policy | ✅ 5 endpoints | ❌ None | Add Socket |
| Attendance | ✅ 17 endpoints | ❌ None | Add Socket |
| Leave | ✅ 14 endpoints | ❌ None | Add Socket |
| Shift | ✅ 10 endpoints | ❌ None | Add Socket |
| Holiday | ✅ 7 endpoints | ✅ Partial | Complete |
| Promotion | ✅ 5 endpoints | ✅ Full | Complete |
| Resignation | ✅ 6 endpoints | ✅ Full | Complete |
| Termination | ✅ 5 endpoints | ✅ Full | Complete |
| Training | ✅ 8 endpoints | ✅ Full | Complete |
| Performance | ✅ Multiple | ✅ Full | Complete |
| Timesheet | ❌ Not implemented | ❌ None | Not Started |
| Overtime | ❌ Not implemented | ❌ None | Not Started |

---

**Report Generated:** 2026-02-07
**Next Review:** After Socket event implementation
**Owner:** Backend Architecture Team
