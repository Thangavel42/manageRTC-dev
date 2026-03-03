# Leave Ledger System - Complete Guide

## Table of Contents
1. [What is Leave Ledger?](#what-is-leave-ledger)
2. [Purpose & Benefits](#purpose--benefits)
3. [Architecture](#architecture)
4. [Transaction Types](#transaction-types)
5. [Why Does It Have 95 Documents?](#why-does-it-have-95-documents)
6. [Is This a Recommended Approach?](#is-this-a-recommended-approach)
7. [How It Works](#how-it-works)
8. [API Endpoints](#api-endpoints)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## What is Leave Ledger?

The **Leave Ledger** is a comprehensive **double-entry accounting system** for tracking employee leave balances. Similar to financial accounting ledgers, it records **every transaction** that affects an employee's leave balance, creating a complete **audit trail**.

### Key Concept: Immutable Transaction History

Unlike a simple balance counter, the ledger **never modifies or deletes** past entries. Instead, each transaction:
- Creates a **new record** with `balanceBefore` and `balanceAfter`
- Records the **transaction type** (used, restored, allocated, etc.)
- Stores **metadata** (dates, leave request references, descriptions)

This ensures **data integrity** and provides a **complete history** of all balance changes.

---

## Purpose & Benefits

### 1. **Complete Audit Trail**
Every balance change is recorded with:
- Who made the change (`changedBy`)
- When it happened (`transactionDate`)
- Why it happened (`description`, `adjustmentReason`)
- What changed (`amount`, `balanceBefore`, `balanceAfter`)
- Related leave request (`leaveRequestId`)

### 2. **Data Integrity**
- **Immutable history**: Past entries are never modified
- **Reconcilable**: Can verify balance at any point in time
- **Transparent**: All changes are visible and traceable

### 3. **Financial Year Tracking**
- Supports carry-forward calculations
- Tracks leave expiry
- Generates year-end reports

### 4. **Multi-Tenancy Support**
- Each company has its own ledger in their database
- Isolated data per tenant
- Scalable architecture

### 5. **Advanced Features**
- Leave encashment tracking
- Manual adjustments by HR
- Leave expiry handling
- Custom policy support

---

## Architecture

### Schema Structure

```javascript
{
  _id: ObjectId,
  employeeId: "EMP-7884",          // Employee identifier
  companyId: "69824...",           // Company (also database name)
  leaveType: "earned",             // Leave type code (lowercase)
  transactionType: "used",         // Transaction type
  amount: -2,                      // Amount (negative for debit)
  balanceBefore: 15,               // Balance before transaction
  balanceAfter: 13,                // Balance after transaction
  leaveRequestId: "LREQ-...",      // Related leave request
  transactionDate: ISODate,        // When transaction occurred
  financialYear: "FY2024-2025",    // Financial year
  year: 2024,                      // Year
  month: 2,                        // Month
  description: "Leave used",       // Human-readable description
  details: {                       // Additional context
    startDate: ISODate,
    endDate: ISODate,
    duration: 2,
    reason: "Family vacation"
  },
  changedBy: ObjectId,             // Who made manual changes
  adjustmentReason: String,        // Reason for manual adjustment
  isDeleted: false,                // Soft delete flag
  createdAt: ISODate,
  updatedAt: ISODate
}
```

### Collection Location

**Multi-Tenant Architecture:**
- Each company has its own **separate database**
- Database name = `companyId` (e.g., `6982468548550225cc5585a9`)
- Collection name: `leaveLedger`

```javascript
// In company-specific database:
db.leaveLedger.find({ employeeId: "EMP-7884" })
```

### Compound Indexes

```javascript
{ employeeId: 1, leaveType: 1, transactionDate: -1 }  // Employee history
{ companyId: 1, transactionDate: -1 }                 // Company-wide reports
{ employeeId: 1, financialYear: 1, leaveType: 1 }     // Financial year queries
{ employeeId: 1, year: 1, month: 1, leaveType: 1 }    // Monthly reports
```

---

## Transaction Types

| Type | Description | Amount Sign | Example |
|------|-------------|-------------|---------|
| `opening` | Opening balance at period start | 0 | Initial balance when employee joins |
| `allocated` | Leave credited/earned | Positive (+) | Monthly accrual, annual allocation |
| `used` | Leave taken (approved) | Negative (-) | 2 days leave approved |
| `restored` | Leave credited back | Positive (+) | Cancelled leave request |
| `carry_forward` | Balance carried from previous year | Positive (+) | 5 days carried forward |
| `encashed` | Leave converted to cash | Negative (-) | 3 days encashed |
| `adjustment` | Manual HR adjustment | ± | HR adds/removes leave manually |
| `expired` | Leave lapsed/expired | Negative (-) | Unused leave expired |

### Transaction Flow Examples

**Example 1: Employee Takes Leave**
```
1. Opening Balance: 15 days
2. Transaction: "used" -2 days
3. Result: balanceBefore=15, amount=-2, balanceAfter=13
```

**Example 2: Leave Cancelled**
```
1. Current Balance: 13 days
2. Transaction: "restored" +2 days
3. Result: balanceBefore=13, amount=+2, balanceAfter=15
```

**Example 3: Year-End Carry Forward**
```
1. Current Year: FY2024-2025, Balance: 5 days
2. Transaction: "carry_forward" +3 days (max limit)
3. New FY: FY2025-2026, Balance: 3 days
4. Transaction: "expired" -2 days (remainder lapsed)
```

---

## Why Does It Have 95 Documents?

### Understanding Your Current State

Your `leaveLedger` collection has **95 documents**. Here's what they likely represent:

#### Scenario 1: Initial Migration
If you ran a migration script like `initializeLeaveLedger.js`:
- **95 entries** ≈ 10 employees × ~9 leave types each
- Each employee gets one **"opening"** transaction per leave type
- Example: `EMP-7884` would have 9 entries (casual, sick, earned, etc.)

#### Scenario 2: Active Usage
If employees have been taking leave:
- **Opening balances** for each employee/leave type combination
- **Usage transactions** when leave was approved
- **Restoration transactions** when leave was cancelled

#### Scenario 3: Hybrid
Most likely:
- Some opening balances from initialization
- Some actual leave transactions
- Manual adjustments

### Check Your Current State

Run this diagnostic script to see exactly what's in your ledger:

```bash
cd backend
node seed/diagnoseLeaveLedgerFull.js
```

This will show:
- Total entries by transaction type
- Entries per employee
- Entries by leave type
- Any missing data

---

## Is This a Recommended Approach?

### ✅ YES - This is an **excellent** architecture!

#### Industry Best Practices

The Leave Ledger pattern follows **double-entry accounting** principles used in:

1. **Banking Systems**
   - Every transaction is recorded
   - Complete audit trail
   - Never modify past entries

2. **Financial Accounting**
   - General ledger pattern
   - Reconcilable at any time
   - Regulatory compliance

3. **Inventory Management**
   - Perpetual inventory system
   - Real-time balance tracking
   - Transaction history

#### Advantages Over Simple Balance Counter

| Feature | Simple Counter | Ledger System |
|---------|----------------|---------------|
| Audit Trail | ❌ No | ✅ Complete history |
| Error Recovery | ❌ Difficult | ✅ Easy (add reversing entry) |
| Reconciliation | ❌ Impossible | ✅ Any time |
| Compliance | ❌ Poor | ✅ Excellent |
| Transparency | ❌ Low | ✅ High |
| Debugging | ❌ Hard | ✅ Easy |

#### When to Use Ledger System

**Use when:**
- ✅ You need audit trails (HR compliance)
- ✅ Multiple people modify balances (HR, managers, system)
- ✅ You need historical reports (YTD, financial year)
- ✅ Regulations require transparency
- ✅ You need to investigate discrepancies

**Simple counter might suffice when:**
- ❌ Single admin, no audit needed
- ❌ No historical reporting
- ❌ Simple use case only

---

## How It Works

### 1. Employee Onboarding

When a new employee joins:

```javascript
// initializeEmployeeLedger() creates opening balances
{
  employeeId: "EMP-9999",
  leaveType: "earned",
  transactionType: "opening",
  amount: 0,
  balanceBefore: 0,
  balanceAfter: 15,        // Company's annual quota
  description: "Opening balance"
}
```

**Creates one entry per active leave type.**

### 2. Employee Requests Leave

When leave is requested (pending):
- **No ledger entry** yet
- Balance is not affected

### 3. Leave Approval (Credit Reduction)

```javascript
// In approveLeave() function
await recordLeaveUsage(
  companyId,
  employeeId,
  leaveType,      // "earned"
  amount,         // 2
  leaveId,        // "LREQ-1234"
  startDate,
  endDate,
  "Leave used: Family vacation"
);

// Creates ledger entry:
{
  transactionType: "used",
  amount: -2,
  balanceBefore: 15,
  balanceAfter: 13
}
```

### 4. Leave Cancellation (Credit Restoration)

```javascript
// In cancelLeave() function
await recordLeaveRestoration(
  companyId,
  employeeId,
  leaveType,
  amount,
  leaveId,
  "Leave cancelled by employee"
);

// Creates ledger entry:
{
  transactionType: "restored",
  amount: +2,
  balanceBefore: 13,
  balanceAfter: 15
}
```

### 5. Getting Current Balance

```javascript
// Get latest entry for employee + leave type
const latestEntry = await leaveLedger.findOne(
  { employeeId, leaveType, isDeleted: { $ne: true } },
  { sort: { transactionDate: -1 } }
);

return latestEntry.balanceAfter;  // Current balance
```

### 6. Balance History View

```javascript
// Get all transactions for employee
const history = await leaveLedger.find(
  { employeeId, isDeleted: { $ne: true } },
  { sort: { transactionDate: -1 } }
).toArray();

// Returns:
[
  { date: "2025-02-23", type: "used", amount: -2, balanceAfter: 13 },
  { date: "2025-02-15", type: "restored", amount: +2, balanceAfter: 15 },
  { date: "2025-01-01", type: "opening", amount: 0, balanceAfter: 15 }
]
```

---

## API Endpoints

### Get Balance Summary
```http
GET /api/leave-ledger/my/summary
```

Returns current balances for all leave types:
```json
{
  "success": true,
  "data": {
    "earned": {
      "total": 20,
      "used": 5,
      "balance": 15,
      "ledgerBalance": 15,
      "lastTransaction": "2025-02-23T10:30:00Z",
      "leaveTypeName": "Annual Leave",
      "hasCustomPolicy": false
    },
    "sick": { ... },
    "casual": { ... }
  }
}
```

### Get Balance History
```http
GET /api/leave-ledger/my/history?leaveType=earned&limit=50
```

Returns transaction history:
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "_id": "...",
        "transactionType": "used",
        "amount": -2,
        "balanceBefore": 15,
        "balanceAfter": 13,
        "transactionDate": "2025-02-23T10:30:00Z",
        "description": "Leave used",
        "details": {
          "startDate": "2025-02-25",
          "endDate": "2025-02-26",
          "duration": 2,
          "reason": "Family vacation"
        }
      }
    ],
    "summary": {
      "totalUsed": 5,
      "totalRestored": 0,
      "currentBalance": 13
    }
  }
}
```

### Get Financial Year History
```http
GET /api/leave-ledger/my/financial-year/FY2024-2025
```

### Export History
```http
GET /api/leave-ledger/my/export?year=2024
```

---

## Best Practices

### 1. **Always Record Transactions**

❌ **Don't:**
```javascript
// Bad: Direct balance update
employee.leaveBalance.balances[0].balance -= 2;
```

✅ **Do:**
```javascript
// Good: Record in ledger
await recordLeaveUsage(companyId, employeeId, leaveType, 2, leaveId, ...);
// Then update employee balance (if needed)
```

### 2. **Use Soft Delete**

Never `deleteOne()` - use `updateOne({ isDeleted: true })`:

```javascript
await leaveLedger.updateOne(
  { _id: entryId },
  {
    $set: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: adminUserId
    }
  }
);
```

### 3. **Always Include Context**

```javascript
{
  description: "Leave used",  // Good
  description: "Leave used for family vacation from Feb 25-26, 2025",  // Better!
  details: {  // Even better!
    startDate: new Date("2025-02-25"),
    endDate: new Date("2025-02-26"),
    duration: 2,
    reason: "Family vacation"
  }
}
```

### 4. **Index for Performance**

Ensure these indexes exist:
```javascript
db.leaveLedger.createIndex({ employeeId: 1, leaveType: 1, transactionDate: -1 });
db.leaveLedger.createIndex({ companyId: 1, transactionDate: -1 });
```

### 5. **Use Transactions for Multi-Step Operations**

```javascript
// When approving leave and deducting balance:
withTransaction(companyId, async (collections, session) => {
  // 1. Update leave status
  await collections.leaves.updateOne(
    { _id: leaveId },
    { $set: { status: 'approved' } },
    { session }
  );

  // 2. Record in ledger
  await collections.leaveLedger.insertOne(
    ledgerEntry,
    { session }
  );

  // 3. Update employee balance
  await collections.employees.updateOne(
    { employeeId },
    { $inc: { 'leaveBalance.balances.$[elem].balance': -days } },
    {
      session,
      arrayFilters: [{ 'elem.type': leaveType }]
    }
  );
});
```

---

## Troubleshooting

### Issue: Balance Shows 0/0

**Cause:** No ledger entries exist for this employee.

**Solution:**
```bash
cd backend
node seed/initializeLeaveLedger.js
```

### Issue: Balance Doesn't Update After Approval

**Check:**
1. Is `recordLeaveUsage()` being called?
2. Is `leaveType` lowercase? (ledger uses lowercase codes)
3. Check browser console for API errors

**Debug:**
```javascript
// In leave.controller.js approveLeave()
console.log('[approveLeave] Recording usage:', {
  employeeId,
  leaveType: leave.leaveType?.toLowerCase(),
  amount: leave.duration
});
```

### Issue: Transaction History Not Showing

**Check:**
1. API endpoint returning data?
2. Frontend processing response?
3. `isDeleted: false` filter applied?

### Issue: Duplicate Entries

**Cause:** Recording twice (e.g., in both manager and HR approval).

**Solution:**
Add check before recording:
```javascript
const existingEntry = await leaveLedger.findOne({
  leaveRequestId: leaveId,
  transactionType: 'used',
  isDeleted: false
});

if (!existingEntry) {
  await recordLeaveUsage(...);
}
```

---

## Summary

### Key Takeaways

1. **Leave Ledger = Accounting System** for leave balances
2. **95 documents** = Normal for initialization + some transactions
3. **Recommended approach** ✅ - Industry-standard pattern
4. **Benefits**: Audit trail, data integrity, compliance
5. **Never delete** - Always add new entries
6. **Multi-tenant** - Each company has own database/collection

### File Reference

| File | Purpose |
|------|---------|
| `models/leave/leaveLedger.schema.js` | Schema with static methods |
| `services/leaves/leaveLedger.service.js` | Business logic |
| `controllers/leaves/leaveLedger.controller.js` | HTTP endpoints |
| `routes/api/leave.js` | Route definitions |
| `seed/initializeLeaveLedger.js` | Initialization script |
| `seed/diagnoseLeaveLedgerFull.js` | Diagnostic tool |

### Quick Commands

```bash
# Diagnose ledger state
node backend/seed/diagnoseLeaveLedgerFull.js

# Initialize ledger for all employees
node backend/seed/initializeLeaveLedger.js

# Check specific employee
node backend/seed/diagnoseEmployeeBalanceField.js EMP-7884
```

---

**Last Updated:** 2025-02-23
**Version:** 1.0
