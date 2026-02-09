# HRM Module - Schema Type Mismatches Fixed

**Date:** 2026-02-07
**Phase:** Phase 1 - Bug Fixes & Stabilization
**Task:** 1.1.3 - Fix Schema Type Mismatches

---

## Summary

Fixed critical schema type inconsistency where `departmentId` was stored as `String` in promotion schemas while all other schemas used `mongoose.Schema.Types.ObjectId`.

---

## Issues Found

### 1. Critical Issue: departmentId Type Mismatch

**Files Affected:**
- `backend/models/promotion/promotion.schema.js`
- `backend/models/performance/promotion.model.js`

**Issue:**
```javascript
// BEFORE (String type - INCORRECT)
promotionTo: {
  departmentId: {
    type: String,           // ❌ Should be ObjectId
    required: true
  },
  designationId: {
    type: String,           // ❌ Should be ObjectId
    required: true
  }
}
```

**Impact:**
- Cannot use MongoDB `populate()` to join with Department collection
- Query inconsistencies when comparing department IDs
- Data integrity issues across the system
- Frontend may receive String while expecting ObjectId

---

## Fixes Applied

### 1. Updated Promotion Schema

**File:** `backend/models/promotion/promotion.schema.js`

```javascript
// AFTER (ObjectId type - CORRECT)
promotionTo: {
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  designationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: true
  }
},
promotionFrom: {
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  designationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation'
  }
}
```

### 2. Updated Performance Promotion Model

**File:** `backend/models/performance/promotion.model.js`

```javascript
// AFTER (ObjectId type - CORRECT)
promotionTo: {
  departmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: true
  },
  designationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Designation',
    required: true
  }
}
```

### 3. Created Migration Script

**File:** `backend/migrations/fixPromotionDepartmentIdType.js`

**Purpose:** Convert existing String departmentId values to ObjectId

**Usage:**
```bash
# Migrate all companies
node backend/migrations/fixPromotionDepartmentIdType.js migrate

# Migrate specific company
node backend/migrations/fixPromotionDepartmentIdType.js migrate <companyId>

# Rollback (if needed)
node backend/migrations/fixPromotionDepartmentIdType.js rollback <companyId>
```

---

## Additional Naming Inconsistency Identified

### Issue: Field Name Inconsistency

| Schema | Field Name | Type |
|--------|------------|------|
| **employee.schema.js** | `department` | ObjectId ❌ Inconsistent name |
| **employee.schema.js** | `designation` | ObjectId ❌ Inconsistent name |
| All other schemas | `departmentId` | ObjectId ✅ |
| All other schemas | `designationId` | ObjectId ✅ |

**Recommendation:** Standardize to use `*Id` suffix for all foreign keys
- `department` → `departmentId`
- `designation` → `designationId`

**Priority:** 🟠 Medium - Less critical than type mismatch, but should be addressed for consistency

**Estimate:** 4-6 hours (requires updating all references across codebase)

---

## Schema Type Consistency Matrix

| Schema | departmentId Type | designationId Type | shiftId Type | Status |
|--------|-------------------|-------------------|--------------|--------|
| employee.schema | `department`: ObjectId ✅ | `designation`: ObjectId ✅ | N/A | Name inconsistency |
| designation.schema | ObjectId ✅ | N/A | N/A | ✅ Good |
| department.schema | N/A | N/A | N/A | ✅ Good |
| promotion.schema | ObjectId ✅ (Fixed) | ObjectId ✅ (Fixed) | N/A | ✅ Fixed |
| promotion.model (perf) | ObjectId ✅ (Fixed) | ObjectId ✅ (Fixed) | N/A | ✅ Fixed |
| batch.schema | ObjectId ✅ | N/A | ObjectId ✅ | ✅ Good |
| policy.schema | ObjectId ✅ | ObjectId ✅ | N/A | ✅ Good |
| shift.schema | N/A | N/A | N/A | ✅ Good |
| attendance.schema | N/A | N/A | ObjectId ✅ | ✅ Good |
| leave.schema | N/A | N/A | N/A | ✅ Good |

---

## Testing Required

### 1. Migration Test
- [ ] Test migration script on staging database
- [ ] Verify String → ObjectId conversion
- [ ] Test rollback functionality
- [ ] Validate data integrity after migration

### 2. API Test
- [ ] Test promotion creation with ObjectId
- [ ] Test promotion listing with populate
- [ ] Test promotion queries by department
- [ ] Test frontend integration

### 3. Frontend Test
- [ ] Verify frontend sends ObjectId for departmentId
- [ ] Test UI components that display promotions
- [ ] Test filters by department

---

## Next Steps

1. ✅ **COMPLETED:** Update promotion schemas to use ObjectId
2. ⏳ **PENDING:** Run migration script on staging
3. ⏳ **PENDING:** Test all promotion-related endpoints
4. ⏳ **PENDING:** Address employee schema field name inconsistency (department → departmentId)
5. ⏳ **PENDING:** Update validation schemas

---

## References

- **Implementation Plan:** `.ferb/docs/docs_output/MODULES/HRM/final/IMPLEMENTATION_PLAN_PHASE_BY_PHASE.md`
- **Task:** 1.1.3 Fix Schema Type Mismatches
- **Estimated Time:** 6 hours (2 hours for schema fix + 4 hours for migration and testing)

---

**Status:** ✅ Schema definitions updated, migration script created
**Remaining:** Run migration and test
