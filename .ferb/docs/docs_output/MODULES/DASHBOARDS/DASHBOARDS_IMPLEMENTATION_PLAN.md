# Employee & HR Dashboard - Implementation Plan

**Date:** 2026-02-06
**Based On:** Validation Reports for Employee & HR Dashboards
**Priority:** CRITICAL (Employee Dashboard has breaking bugs)

---

## Summary of Issues

| Dashboard | Critical | Warning | Info | Total |
|-----------|----------|---------|------|-------|
| Employee Dashboard | 3 | 2 | 0 | 5 |
| HR Dashboard | 0 | 0 | 1 | 1 |
| **TOTAL** | **3** | **2** | **1** | **6** |

---

## Phase 1: Critical Fixes (Employee Dashboard) - Week 1

### Priority: 🔴 URGENT - These are breaking bugs

#### Fix 1.1: ID Consistency in Break Functions

**Files to Modify:**
- `backend/services/employee/dashboard.services.js`

**Functions Affected:**
- `startBreak()` (lines 484-536)
- `resumeBreak()` (lines 538-614)
- `getLastDayTimings()` (lines 1369-1435)

**Changes Required:**

```javascript
// ❌ WRONG (Current code)
const employee = await collections.employees.findOne({
  _id: new ObjectId(employeeId),  // employeeId is a string, not ObjectId
});

const attendance = await collections.attendance.findOne({
  employeeId: new ObjectId(employeeId),  // Wrong field name + wrong type
  date: todayCompany,
});

// ✅ CORRECT (Fixed code)
const employee = await collections.employees.findOne({
  userId: employeeId,  // Use userId field with string
});

const attendance = await collections.attendance.findOne({
  userId: employeeId,  // Use userId field (not employeeId)
  date: todayCompany,
});
```

**Specific Line Changes:**

1. **`startBreak()` function:**
   - Line 488: Change `_id: new ObjectId(employeeId)` → `userId: employeeId`
   - Line 501: Change `employeeId: new ObjectId(employeeId)` → `userId: employeeId`

2. **`resumeBreak()` function:**
   - Line 542: Change `_id: new ObjectId(employeeId)` → `userId: employeeId`
   - Line 555: Change `employeeId: new ObjectId(employeeId)` → `userId: employeeId`

3. **`getLastDayTimings()` function:**
   - Line 1372: Remove `new ObjectId()` wrapper
   - Line 1377: Change query to use `userId: employeeId`
   - Line 1382: Change query to use `userId: employeeId`

---

#### Fix 1.2: Schema Field Mismatch

**Files to Modify:**
- `backend/services/employee/dashboard.services.js`

**Function Affected:**
- `getWorkingHoursStats()` (lines 616-744)

**Changes Required:**

```javascript
// ❌ WRONG (Line 688)
const work = rec.totalProductiveDuration || 0;  // This field doesn't exist

// ✅ CORRECT (Fixed)
const totalHours = parseFloat(rec.totalProductiveHours || 0);
const work = totalHours * 60;  // Convert to minutes
```

**Specific Line Changes:**

1. **`getWorkingHoursStats()` function:**
   - Line 688: Change field reference and add conversion
   - Ensure consistent use of minutes for calculations

---

#### Fix 1.3: Team Members Query Fix

**Files to Modify:**
- `backend/services/employee/dashboard.services.js`

**Function Affected:**
- `getTeamMembers()` (lines 1100-1132)

**Changes Required:**

**Investigation needed:** Determine the correct field for team lead/manager relationship.

**Options:**
1. Use `reportingTo` field (if exists)
2. Use `managerId` field (if exists)
3. Use `department` + `designation` to find team
4. Add new `teamId` or `leadId` field to schema

**Proposed Fix:**
```javascript
// ✅ PROPOSED (Need to verify correct field)
const pipeline = [
  {
    $match: {
      $or: [
        { reportingTo: employeeId },  // Option 1: Direct report
        { managerId: employeeId },     // Option 2: Manager field
        { leadId: employee.leadId },   // Option 3: Use if available
      ]
    }
  },
  // ...
];
```

---

## Phase 2: Testing (Employee Dashboard) - Week 1

### Unit Tests to Create

| Test File | Tests | Priority |
|-----------|-------|----------|
| `backend/services/employee/__tests__/dashboard.breaks.test.js` | Break tracking tests | 🔴 CRITICAL |
| `backend/services/employee/__tests__/dashboard.workinghours.test.js` | Working hours tests | 🔴 CRITICAL |
| `backend/services/employee/__tests__/dashboard.teammembers.test.js` | Team members tests | 🟡 MEDIUM |

### Integration Tests to Create

| Test File | Scenarios | Priority |
|-----------|-----------|----------|
| `backend/integration-tests/employee-breaks.integration.test.js` | Full break flow | 🔴 CRITICAL |

### Test Scenarios

1. **Break Tracking Tests:**
   - Start break after punch-in → Should succeed
   - Start break without punch-in → Should fail
   - Start break twice → Should fail (already on break)
   - End break → Should calculate duration
   - End break without active break → Should fail
   - Multiple breaks in a day → Should sum correctly

2. **Working Hours Tests:**
   - Today's hours calculation
   - Weekly hours aggregation
   - Monthly hours with overtime
   - Empty attendance records → Should return 0

3. **Team Members Tests:**
   - Returns correct team
   - Empty team for employees without reports
   - Handles missing manager field

---

## Phase 3: Enhancement (HR Dashboard) - Week 2

### Enhancement 3.1: Implement Growth Metrics

**File to Modify:**
- `backend/services/hr/hrm.dashboard.js`

**Current State:**
```javascript
// Lines 821-823 - Hardcoded zeros
activeGrowth: 0,
inactiveGrowth: 0,
joinersGrowth: 0,
```

**Proposed Solution:**

**Option A: Store Historical Data (Recommended)**
1. Create `employeeStatsHistory` collection
2. Store monthly snapshots of employee counts
3. Calculate growth from historical data

**Option B: Calculate on Demand**
1. Query last month's employee count
2. Calculate percentage difference
3. May have performance impact

**Schema for Option A:**
```javascript
{
  companyId: "manageRTC",
  year: 2026,
  month: 1,  // January
  totalEmployees: 42,
  activeEmployees: 38,
  inactiveEmployees: 4,
  newJoiners: 5,
  resignations: 2,
  terminations: 1,
  recordedAt: new Date("2026-01-31T23:59:59Z")
}
```

---

## Phase 4: Documentation - Week 2

### Documentation to Create

1. **Field Reference Guide**
   - Document all employee ID fields
   - Standardize naming conventions

2. **API Documentation**
   - Update Swagger/OpenAPI docs
   - Document fixed endpoints

3. **Testing Documentation**
   - How to run new tests
   - Coverage requirements

---

## Implementation Checklist

### Week 1 Checklist

- [ ] Fix 1.1: Update `startBreak()` function
- [ ] Fix 1.1: Update `resumeBreak()` function
- [ ] Fix 1.1: Update `getLastDayTimings()` function
- [ ] Fix 1.2: Update `getWorkingHoursStats()` function
- [ ] Fix 1.3: Investigate and fix `getTeamMembers()` function
- [ ] Create break tracking unit tests
- [ ] Create working hours unit tests
- [ ] Create team members unit tests
- [ ] Create integration tests
- [ ] Run all tests and verify fixes
- [ ] Manual testing of break tracking
- [ ] Manual testing of working hours display

### Week 2 Checklist

- [ ] Design employee stats history schema
- [ ] Implement growth metrics calculation
- [ ] Create migration for historical data
- [ ] Create cron job for monthly snapshots
- [ ] Update HR dashboard to use new growth metrics
- [ ] Update API documentation
- [ ] Create field reference guide
- [ ] Deploy to staging
- [ ] Final testing and validation

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing functionality | MEDIUM | HIGH | Comprehensive testing before deployment |
| Performance regression | LOW | MEDIUM | Benchmark before/after |
| Data migration issues | LOW | MEDIUM | Backup before running migrations |
| Frontend compatibility | LOW | MEDIUM | No frontend changes needed for fixes |

---

## Rollback Plan

If issues occur after deployment:

1. **Revert code changes** - Git revert to previous commit
2. **Restore database** - If migrations were run
3. **Verify functionality** - Run smoke tests

**Rollback Time:** ~5 minutes

---

## Success Criteria

### Phase 1 Success Criteria

- ✅ All 3 critical fixes implemented
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ Break tracking works end-to-end
- ✅ Working hours display correct values
- ✅ Team members list shows data

### Phase 2 Success Criteria

- ✅ Test coverage > 80% for affected functions
- ✅ No regressions in other dashboard features

### Phase 3 Success Criteria

- ✅ Growth metrics show real values
- ✅ Historical data collection working
- ✅ No performance degradation

---

## Estimated Effort

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| Phase 1: Critical Fixes | 5 fixes + testing | 3-4 days |
| Phase 2: Testing | Unit + Integration tests | 2-3 days |
| Phase 3: Enhancement | Growth metrics implementation | 2-3 days |
| Phase 4: Documentation | Docs + deployment | 1-2 days |
| **TOTAL** | **All phases** | **8-12 days** |

---

## Dependencies

### Internal Dependencies
- None for Phase 1 (critical fixes)
- Database schema design for Phase 3 (growth metrics)

### External Dependencies
- MongoDB (for testing)
- Jest (test runner)
- MongoMemoryServer (for integration tests)

---

## Notes

1. **Employee Dashboard issues are CRITICAL** - Break tracking is completely broken
2. **HR Dashboard is healthy** - Only enhancement needed
3. **Frontend does NOT need changes** - All issues are backend-only
4. **Testing is essential** - Don't skip tests for these fixes

---

**Next Steps:** Begin Phase 1, Fix 1.1 (ID Consistency) immediately.
