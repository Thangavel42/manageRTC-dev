/**
 * Diagnostic Script for EMP-0256 (snehaselvarajonboard@gmail.com)
 * To troubleshoot why ledger is not updating after leave approval
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const COMPANY_ID = '6982468548550225cc5585a9'; // amasQIS.ai
const EMPLOYEE_ID = 'EMP-0256';
const EMPLOYEE_EMAIL = 'snehaselvarajonboard@gmail.com';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(70));
  log(title, 'cyan');
  console.log('='.repeat(70));
}

async function diagnoseEMP0256() {
  const client = new MongoClient(DB_URI);

  try {
    await client.connect();
    log('✅ Connected to MongoDB\n', 'green');

    const db = client.db(COMPANY_ID);

    // ============================================================
    // 1. CHECK EMPLOYEE EXISTS
    // ============================================================
    logSection('1. CHECKING EMPLOYEE RECORD');

    const employees = db.collection('employees');
    const employee = await employees.findOne({
      $or: [
        { employeeId: EMPLOYEE_ID },
        { email: EMPLOYEE_EMAIL }
      ],
      isDeleted: { $ne: true }
    });

    if (!employee) {
      log(`  ❌ Employee NOT FOUND!`, 'red');
      log(`     Searched for: employeeId='${EMPLOYEE_ID}' OR email='${EMPLOYEE_EMAIL}'`, 'yellow');
      return;
    }

    log(`  ✅ Employee Found:`, 'green');
    log(`     Employee ID: ${employee.employeeId}`, 'cyan');
    log(`     Name: ${employee.firstName} ${employee.lastName}`, 'cyan');
    log(`     Email: ${employee.email}`, 'cyan');
    log(`     Clerk User ID: ${employee.clerkUserId || 'Not set'}`, 'cyan');

    // ============================================================
    // 2. CHECK EMPLOYEE LEAVE BALANCE
    // ============================================================
    logSection('2. CHECKING EMPLOYEE LEAVE BALANCE');

    if (!employee.leaveBalance) {
      log(`  ❌ No leaveBalance field found!`, 'red');
    } else {
      log(`  ✅ leaveBalance exists`, 'green');
      log(`  Balances (${employee.leaveBalance.balances?.length || 0} entries):`, 'blue');

      if (employee.leaveBalance.balances && employee.leaveBalance.balances.length > 0) {
        for (const bal of employee.leaveBalance.balances) {
          log(`    - ${bal.type}:`, 'yellow');
          log(`       Total: ${bal.total || 0}, Used: ${bal.used || 0}, Balance: ${bal.balance || 0}`);
        }
      } else {
        log(`    ⚠️  No balance entries found!`, 'yellow');
      }
    }

    // ============================================================
    // 3. CHECK LEAVE REQUESTS FOR THIS EMPLOYEE
    // ============================================================
    logSection('3. CHECKING LEAVE REQUESTS');

    const leaves = db.collection('leaves');
    const employeeLeaves = await leaves.find({
      employeeId: employee.employeeId,
      isDeleted: { $ne: true }
    }).sort({ createdAt: -1 }).toArray();

    log(`  Found ${employeeLeaves.length} leave requests\n`, 'blue');

    if (employeeLeaves.length === 0) {
      log(`  ⚠️  No leave requests found for this employee`, 'yellow');
    } else {
      for (const leave of employeeLeaves.slice(0, 5)) {
        log(`  📋 Leave Request:`, 'yellow');
        log(`     Leave ID: ${leave.leaveId}`);
        log(`     Leave Type: ${leave.leaveType} (leaveTypeId: ${leave.leaveTypeId || 'N/A'})`);
        log(`     Status: ${leave.status} (managerStatus: ${leave.managerStatus}, finalStatus: ${leave.finalStatus})`);
        log(`     Duration: ${leave.duration} days`);
        log(`     Dates: ${leave.startDate} to ${leave.endDate}`);
        log(`     Created: ${leave.createdAt}`);
        log(`     Approved By: ${leave.approvedBy || 'N/A'} at ${leave.approvedAt || 'N/A'}`);
        console.log('');
      }
    }

    // ============================================================
    // 4. CHECK LEDGER ENTRIES FOR THIS EMPLOYEE
    // ============================================================
    logSection('4. CHECKING LEAVE LEDGER ENTRIES');

    const leaveLedger = db.collection('leaveLedger');
    const ledgerEntries = await leaveLedger.find({
      employeeId: employee.employeeId,
      companyId: COMPANY_ID,
      isDeleted: { $ne: true }
    }).sort({ transactionDate: -1 }).toArray();

    log(`  Found ${ledgerEntries.length} ledger entries\n`, 'blue');

    if (ledgerEntries.length === 0) {
      log(`  ❌ NO LEDGER ENTRIES FOUND!`, 'red');
      log(`     This is why the ledger page shows nothing!`, 'yellow');
      log(`     Possible reasons:`, 'yellow');
      log(`       1. Ledger was never initialized for this employee`, 'cyan');
      log(`       2. Leave approval failed to create ledger entries`, 'cyan');
      log(`       3. Ledger entries were deleted`, 'cyan');
    } else {
      log(`  Recent ledger entries:`, 'yellow');
      for (const entry of ledgerEntries.slice(0, 10)) {
        log(`    - ${entry.transactionDate.toISOString().split('T')[0]} | ${entry.transactionType.toUpperCase()} | ${entry.leaveType}`, 'cyan');
        log(`       Amount: ${entry.amount} | Balance Before: ${entry.balanceBefore} | Balance After: ${entry.balanceAfter}`);
        log(`       Description: ${entry.description}`);
        if (entry.leaveRequestId) {
          log(`       Related Leave: ${entry.leaveRequestId}`);
        }
        console.log('');
      }
    }

    // ============================================================
    // 5. FIND APPROVED LEAVES THAT SHOULD HAVE LEDGER ENTRIES
    // ============================================================
    logSection('5. CROSS-REFERENCE: APPROVED LEAVES vs LEDGER');

    const approvedLeaves = employeeLeaves.filter(l => l.status === 'approved' || l.finalStatus === 'approved');
    log(`  Found ${approvedLeaves.length} approved leaves\n`, 'blue');

    if (approvedLeaves.length > 0) {
      for (const leave of approvedLeaves) {
        const matchingLedgerEntry = ledgerEntries.find(
          entry => entry.leaveRequestId === leave._id.toString() || entry.leaveRequestId === leave.leaveId
        );

        log(`  Leave: ${leave.leaveId} (${leave.leaveType}, ${leave.duration} days, status: ${leave.status})`, 'yellow');

        if (matchingLedgerEntry) {
          log(`    ✅ HAS ledger entry`, 'green');
          log(`       Transaction: ${matchingLedgerEntry.transactionType}, Amount: ${matchingLedgerEntry.amount}`);
        } else {
          log(`    ❌ MISSING ledger entry!`, 'red');
          log(`       This leave was approved but no ledger entry was created!`);
          log(`       Leave details:`, 'cyan');
          log(`       - Created: ${leave.createdAt}`);
          log(`       - Approved At: ${leave.approvedAt || 'N/A'}`);
          log(`       - Approved By: ${leave.approvedBy || 'N/A'}`);
          log(`       - Duration: ${leave.duration} days`);
        }
        console.log('');
      }
    }

    // ============================================================
    // 6. CHECK LEDGER BY LEAVE TYPE
    // ============================================================
    logSection('6. LEDGER ENTRIES BY LEAVE TYPE');

    const leaveTypes = db.collection('leaveTypes');
    const allLeaveTypes = await leaveTypes.find({
      companyId: COMPANY_ID,
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    for (const lt of allLeaveTypes) {
      const type = lt.code.toLowerCase();
      const typeLedgerEntries = ledgerEntries.filter(e => e.leaveType === type);
      const latestEntry = typeLedgerEntries.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0];

      log(`  ${lt.name} (${lt.code}):`, 'yellow');
      log(`     Ledger Entries: ${typeLedgerEntries.length}`);
      log(`     Latest Balance: ${latestEntry?.balanceAfter || 'No entries'}`);

      const empBalance = employee.leaveBalance?.balances?.find(b => b.type.toLowerCase() === type);
      if (empBalance) {
        log(`     Employee Balance Field: ${empBalance.balance || 0}`);
        if (latestEntry && latestEntry.balanceAfter !== empBalance.balance) {
          log(`     ⚠️  MISMATCH! Ledger says ${latestEntry.balanceAfter}, employee.balance says ${empBalance.balance}`, 'red');
        }
      }
      console.log('');
    }

    // ============================================================
    // 7. RECOMMENDATIONS
    // ============================================================
    logSection('7. DIAGNOSIS & RECOMMENDATIONS');

    const issues = [];
    const recommendations = [];

    // Issue 1: No ledger entries
    if (ledgerEntries.length === 0) {
      issues.push('No ledger entries found for this employee');
      recommendations.push('Run initialization: node backend/seed/initializeLeaveLedger.js');
    }

    // Issue 2: Approved leaves without ledger entries
    const approvedWithoutLedger = approvedLeaves.filter(l =>
      !ledgerEntries.some(e => e.leaveRequestId === l._id.toString() || e.leaveRequestId === l.leaveId)
    );
    if (approvedWithoutLedger.length > 0) {
      issues.push(`${approvedWithoutLedger.length} approved leaves have no ledger entries`);
      recommendations.push('Check backend logs for ledger recording errors');
      recommendations.push('Verify leaveLedger.service.recordLeaveUsage is being called');
    }

    // Issue 3: Balance mismatch
    const balanceTypes = allLeaveTypes.map(lt => lt.code.toLowerCase());
    for (const type of balanceTypes) {
      const typeLedgerEntries = ledgerEntries.filter(e => e.leaveType === type);
      const latestEntry = typeLedgerEntries.sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate))[0];
      const empBalance = employee.leaveBalance?.balances?.find(b => b.type.toLowerCase() === type);

      if (latestEntry && empBalance && latestEntry.balanceAfter !== empBalance.balance) {
        issues.push(`Balance mismatch for ${type}: ledger=${latestEntry.balanceAfter}, employee.balance=${empBalance.balance}`);
        recommendations.push(`Run balance reconciliation script for ${type}`);
      }
    }

    if (issues.length === 0) {
      log(`  ✅ No issues detected! Everything looks correct.`, 'green');
    } else {
      log(`  Issues Found:`, 'red');
      for (let i = 0; i < issues.length; i++) {
        log(`    ${i + 1}. ${issues[i]}`, 'red');
      }
      console.log('');
      log(`  Recommendations:`, 'yellow');
      for (let i = 0; i < recommendations.length; i++) {
        log(`    ${i + 1}. ${recommendations[i]}`, 'cyan');
      }
    }

    console.log('\n');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await client.close();
  }
}

diagnoseEMP0256();
