# Leave Ledger Not Updating - Root Cause Analysis & Fix

## Date: 2026-02-23
## Employee: EMP-0256 (Test test, snehaselvarajonboard@gmail.com)
## Approver: Anu Arun (user_39Bnp8VnoVEGdzU6eo4oNndh9rR)

---

## 🔍 ROOT CAUSE ANALYSIS

### Diagnostic Results

```
✅ Employee exists: EMP-0256
✅ Employee balance IS being updated:
   - earned: 15 → 14 (1 day used)
   - sick: 10 → 7 (3 days used)

❌ Ledger entries NOT being created:
   - Only 9 opening entries exist (from initialization)
   - 2 approved leaves have NO corresponding ledger entries!

❌ Balance mismatch:
   - earned: ledger=15 (stale), employee.balance=14 (correct)
   - sick: ledger=10 (stale), employee.balance=7 (correct)
```

### Why "Remaining Leaves: 10" Shows Wrong Value

The frontend `/leave-ledger` page fetches from the **ledger**, not from `employee.leaveBalance`. Since the ledger has no "used" transactions, it shows the opening balance (15) instead of the current balance (14).

---

## 🐛 THE BUG

### Location: `backend/controllers/rest/leave.controller.js` lines 1290-1309

```javascript
// Create ledger entry for leave usage
try {
  const approverName = currentEmployee ? ... : 'HR';
  await leaveLedgerService.recordLeaveUsage(
    user.companyId,
    leave.employeeId,
    leaveTypeLower,
    leave.duration,
    leave._id.toString(),
    leave.startDate,
    leave.endDate,
    `Leave approved by ${approverName}`
  );
  logger.info(`[Leave Approval] Ledger entry created...`);
} catch (ledgerError) {
  // Log error but don't fail the transaction
  logger.error('[Leave Approval] Failed to create ledger entry:', ledgerError);
}
```

### Problems:

1. **Silent Failure Pattern**: The `recordLeaveUsage` function catches errors internally and returns `{ success: false }` instead of throwing. The outer try-catch never catches anything!

2. **Transaction Isolation**: `recordLeaveUsage` is called INSIDE the MongoDB transaction context but doesn't use the session:
   ```javascript
   // In leaveLedger.service.js line 302:
   await leaveLedger.insertOne(entry);  // NO session parameter!
   ```

3. **Error Return Instead of Throw**:
   ```javascript
   // In leaveLedger.service.js lines 304-307:
   } catch (error) {
     console.error('Error recording leave usage:', error);
     return { success: false, error: error.message };  // Returns, doesn't throw!
   }
   ```

---

## ✅ THE FIX

### Fix 1: Update `recordLeaveUsage` to Accept and Use Session

**File**: `backend/services/leaves/leaveLedger.service.js`

```javascript
/**
 * Record leave usage in ledger
 * @param {string} companyId - Company ID
 * @param {string} employeeId - Employee ID
 * @param {string} leaveType - Leave type code (lowercase)
 * @param {number} amount - Number of days
 * @param {string} leaveId - Leave request ID
 * @param {Date} startDate - Leave start date
 * @param {Date} endDate - Leave end date
 * @param {string} description - Description
 * @param {ClientSession} session - MongoDB transaction session (optional)
 */
export const recordLeaveUsage = async (
  companyId,
  employeeId,
  leaveType,
  amount,
  leaveId,
  startDate,
  endDate,
  description,
  session = null  // NEW: Accept optional session parameter
) => {
  try {
    const { leaveLedger } = getTenantCollections(companyId);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const latestEntry = await getLatestEntry(leaveLedger, employeeId, leaveType);
    const balanceBefore = latestEntry ? latestEntry.balanceAfter : 0;
    const balanceAfter = balanceBefore - amount;

    const entry = {
      employeeId,
      companyId,
      leaveType,
      transactionType: 'used',
      amount: -amount,
      balanceBefore,
      balanceAfter,
      leaveRequestId: leaveId,
      transactionDate: now,
      financialYear: getFinancialYear(year),
      year,
      month,
      description: description || 'Leave used',
      details: { startDate, endDate, duration: amount },
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    // FIXED: Use session if provided (for transaction support)
    const options = session ? { session } : {};
    const result = await leaveLedger.insertOne(entry, options);

    return { success: true, data: { ...entry, _id: result.insertedId } };
  } catch (error) {
    console.error('Error recording leave usage:', error);
    // FIXED: Throw the error instead of returning failure
    throw error;  // This will be caught by the transaction's try-catch
  }
};
```

### Fix 2: Update `recordLeaveRestoration` Similarly

```javascript
export const recordLeaveRestoration = async (
  companyId,
  employeeId,
  leaveType,
  amount,
  leaveId,
  description,
  session = null  // NEW: Accept optional session parameter
) => {
  try {
    const { leaveLedger } = getTenantCollections(companyId);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const latestEntry = await getLatestEntry(leaveLedger, employeeId, leaveType);
    const balanceBefore = latestEntry ? latestEntry.balanceAfter : 0;
    const balanceAfter = balanceBefore + amount;

    const entry = {
      employeeId,
      companyId,
      leaveType,
      transactionType: 'restored',
      amount,
      balanceBefore,
      balanceAfter,
      leaveRequestId: leaveId,
      transactionDate: now,
      financialYear: getFinancialYear(year),
      year,
      month,
      description: description || 'Leave restored after cancellation',
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    // FIXED: Use session if provided
    const options = session ? { session } : {};
    const result = await leaveLedger.insertOne(entry, options);

    return { success: true, data: { ...entry, _id: result.insertedId } };
  } catch (error) {
    console.error('Error recording leave restoration:', error);
    // FIXED: Throw the error instead of returning failure
    throw error;
  }
};
```

### Fix 3: Update `approveLeave` to Pass Session

**File**: `backend/controllers/rest/leave.controller.js` lines 1290-1310

```javascript
        // Create ledger entry for leave usage
        const approverName = currentEmployee
          ? `${currentEmployee.firstName || ''} ${currentEmployee.lastName || ''}`.trim()
          : 'HR';

        // FIXED: Pass the session to recordLeaveUsage
        await leaveLedgerService.recordLeaveUsage(
          user.companyId,
          leave.employeeId,
          leaveTypeLower,
          leave.duration,
          leave._id.toString(),
          leave.startDate,
          leave.endDate,
          `Leave approved by ${approverName}`,
          session  // NEW: Pass session parameter
        );

        logger.info(`[Leave Approval] Ledger entry created for ${leave.employeeId}, ${leave.leaveType}, ${leave.duration} days`);
```

### Fix 4: Update `cancelLeave` Similarly

Search for all calls to `recordLeaveRestoration` and pass the session:

```javascript
// In cancelLeave function
await leaveLedgerService.recordLeaveRestoration(
  user.companyId,
  leave.employeeId,
  leaveTypeLower,
  leave.duration,
  leave._id.toString(),
  'Leave cancelled',
  session  // NEW: Pass session parameter
);
```

### Fix 5: Update `getLatestEntry` to Support Session

**File**: `backend/services/leaves/leaveLedger.service.js` lines 65-71

```javascript
/**
 * Get the latest ledger entry for an employee + leave type
 * @param {Collection} leaveLedger - Ledger collection
 * @param {string} employeeId - Employee ID
 * @param {string} leaveType - Leave type code
 * @param {ClientSession} session - Optional MongoDB session
 */
const getLatestEntry = async (leaveLedger, employeeId, leaveType, session = null) => {
  const options = session ? { session } : {};
  const entries = await leaveLedger.find(
    { employeeId, leaveType, isDeleted: { $ne: true } },
    { ...options, sort: { transactionDate: -1 }, limit: 1 }
  ).toArray();
  return entries[0] || null;
};
```

And update all calls to `getLatestEntry`:

```javascript
// In recordLeaveUsage
const latestEntry = await getLatestEntry(leaveLedger, employeeId, leaveType, session);

// In recordLeaveRestoration
const latestEntry = await getLatestEntry(leaveLedger, employeeId, leaveType, session);
```

---

## 📋 IMPLEMENTATION PLAN

### Step 1: Update Ledger Service Functions
- [ ] Modify `recordLeaveUsage` to accept `session` parameter
- [ ] Modify `recordLeaveRestoration` to accept `session` parameter
- [ ] Modify `getLatestEntry` to accept `session` parameter
- [ ] Change error handling from `return { success: false }` to `throw error`

### Step 2: Update Leave Controller
- [ ] Update `approveLeave` to pass `session` to `recordLeaveUsage`
- [ ] Update `cancelLeave` to pass `session` to `recordLeaveRestoration`
- [ ] Update `managerActionLeave` if it calls ledger functions
- [ ] Remove the try-catch wrapper that silences errors

### Step 3: Backfill Missing Ledger Entries
- [ ] Create script to find all approved leaves without ledger entries
- [ ] Create missing "used" ledger entries for approved leaves
- [ ] Create missing "restored" ledger entries for cancelled leaves

### Step 4: Validate
- [ ] Test approve leave → verify ledger entry created
- [ ] Test cancel leave → verify ledger entry created
- [ ] Verify balance summary matches ledger balance
- [ ] Verify frontend displays correct values

---

## 🔧 BACKFILL SCRIPT FOR EMP-0256

After applying the fixes, run this to create the missing ledger entries:

```javascript
// File: backend/seed/backfillEMP0256Ledger.js

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.MONGO_URI;
const COMPANY_ID = '6982468548550225cc5585a9';
const EMPLOYEE_ID = 'EMP-0256';

async function backfillLedger() {
  const client = new MongoClient(DB_URI);

  try {
    await client.connect();
    const db = client.db(COMPANY_ID);
    const leaves = db.collection('leaves');
    const leaveLedger = db.collection('leaveLedger');
    const leaveTypes = db.collection('leaveTypes');

    // Get all approved leaves for EMP-0256
    const approvedLeaves = await leaves.find({
      employeeId: EMPLOYEE_ID,
      status: 'approved',
      isDeleted: { $ne: true }
    }).toArray();

    console.log(`Found ${approvedLeaves.length} approved leaves`);

    for (const leave of approvedLeaves) {
      // Check if ledger entry exists
      const existingEntry = await leaveLedger.findOne({
        leaveRequestId: leave._id.toString(),
        transactionType: 'used'
      });

      if (existingEntry) {
        console.log(`✓ Ledger entry exists for ${leave.leaveId}`);
        continue;
      }

      // Get current balance from latest entry
      const leaveTypeLower = leave.leaveType.toLowerCase();
      const latestEntry = await leaveLedger.findOne({
        employeeId: EMPLOYEE_ID,
        leaveType: leaveTypeLower,
        isDeleted: { $ne: true }
      }, { sort: { transactionDate: -1 } });

      const balanceBefore = latestEntry ? latestEntry.balanceAfter :
        (leave.leaveType === 'earned' ? 15 : leave.leaveType === 'sick' ? 10 : 0);
      const balanceAfter = balanceBefore - leave.duration;

      // Create ledger entry
      const entry = {
        employeeId: EMPLOYEE_ID,
        companyId: COMPANY_ID,
        leaveType: leaveTypeLower,
        transactionType: 'used',
        amount: -leave.duration,
        balanceBefore,
        balanceAfter,
        leaveRequestId: leave._id.toString(),
        transactionDate: leave.approvedAt || leave.updatedAt,
        financialYear: `FY${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
        year: new Date(leave.approvedAt).getFullYear(),
        month: new Date(leave.approvedAt).getMonth() + 1,
        description: `Leave approved (backfilled)`,
        details: {
          startDate: leave.startDate,
          endDate: leave.endDate,
          duration: leave.duration
        },
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await leaveLedger.insertOne(entry);
      console.log(`✓ Created ledger entry for ${leave.leaveId}: ${leave.leaveType} -${leave.duration} days (balance: ${balanceBefore} → ${balanceAfter})`);
    }

    console.log('\n✅ Backfill complete!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

backfillLedger();
```

Run with:
```bash
node backend/seed/backfillEMP0256Ledger.js
```

---

## 🎯 VALIDATION CHECKLIST

After fixes and backfill:

- [ ] Ledger has 11 entries (9 opening + 2 used)
- [ ] Latest earned ledger entry shows balanceAfter: 14
- [ ] Latest sick ledger entry shows balanceAfter: 7
- [ ] Frontend `/leave-ledger` page shows transactions
- [ ] "Remaining Leaves: 14" displays correctly
- [ ] New leave approvals create ledger entries automatically

---

## 📊 SUMMARY

| Issue | Root Cause | Fix |
|-------|------------|-----|
| Ledger not updating | `recordLeaveUsage` called without session, errors silently caught | Pass session parameter, throw errors instead of returning |
| Balance mismatch | Ledger has stale opening entries, no "used" entries | Backfill missing entries |
| Frontend shows wrong value | Frontend reads from ledger (stale) instead of employee.balance | After fix+backfill, both will match |

---

**Next Steps:**
1. Apply fixes to `leaveLedger.service.js`
2. Apply fixes to `leave.controller.js` (approveLeave, cancelLeave)
3. Run backfill script for EMP-0256
4. Test with new leave approval
5. Verify frontend displays correctly
