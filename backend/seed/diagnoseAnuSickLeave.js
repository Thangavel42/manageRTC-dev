/**
 * Diagnostic script for Anu Arun's Sick Leave balance
 * Run: node backend/seed/diagnoseAnuSickLeave.js
 */

import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const COMPANY_ID = '6982468548550225cc5585a9';
const EMPLOYEE_ID = 'EMP-2865'; // Anu Arun
const EMPLOYEE_DB_ID = '6982c7cca0ceeb38da48ba58'; // MongoDB _id for Anu Arun
const LEAVE_TYPE = 'sick'; // Sick Leave

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
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60));
}

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    log('✅ Connected to MongoDB\n', 'green');

    const db = client.db(COMPANY_ID);

    // ============================================
    // 1. CHECK EMPLOYEE DOCUMENT
    // ============================================
    logSection('1. EMPLOYEE DOCUMENT');

    const employee = await db.collection('employees').findOne({
      _id: new ObjectId(EMPLOYEE_DB_ID),
      isDeleted: { $ne: true }
    });

    if (employee) {
      log('  ✅ Employee FOUND', 'green');
      console.log('     Name:', employee.firstName, employee.lastName);
      console.log('     employeeId:', employee.employeeId);
      console.log('     _id:', employee._id);

      if (employee.leaveBalance?.balances) {
        console.log('\n     Embedded Balance:');
        employee.leaveBalance.balances.forEach(b => {
          console.log(`       - ${b.type}: total=${b.total}, used=${b.used}, balance=${b.balance}`);
        });

        const sickBalance = employee.leaveBalance.balances.find(b => b.type === LEAVE_TYPE);
        if (sickBalance) {
          log(`\n  📊 Sick Leave (embedded): ${sickBalance.balance} remaining (total: ${sickBalance.total}, used: ${sickBalance.used})`, 'blue');
        }
      }
    } else {
      log('  ❌ Employee NOT FOUND', 'red');
      return;
    }

    // ============================================
    // 2. CHECK LEAVE LEDGER
    // ============================================
    logSection('2. LEAVE LEDGER ENTRIES');

    const ledgerEntries = await db.collection('leaveLedger').find({
      employeeId: EMPLOYEE_ID,
      leaveType: LEAVE_TYPE,
      isDeleted: { $ne: true }
    }).sort({ transactionDate: -1 }).toArray();

    if (ledgerEntries.length > 0) {
      log(`  ✅ Found ${ledgerEntries.length} ledger entries`, 'green');
      console.log('\n     Latest entries (most recent first):');
      ledgerEntries.slice(0, 10).forEach((entry, idx) => {
        console.log(`       ${idx + 1}. ${entry.transactionType}: ${entry.amount} days`);
        console.log(`          Date: ${entry.transactionDate}`);
        console.log(`          Balance After: ${entry.balanceAfter}`);
        console.log(`          Description: ${entry.description || 'N/A'}`);
        console.log('');
      });

      const latestBalance = ledgerEntries[0].balanceAfter;
      log(`  📊 Sick Leave (ledger): ${latestBalance} remaining`, 'blue');
    } else {
      log('  ❌ No ledger entries found', 'yellow');
      log('  This means the system will use embedded balance', 'yellow');
    }

    // ============================================
    // 3. CHECK APPROVED LEAVE REQUESTS
    // ============================================
    logSection('3. APPROVED LEAVE REQUESTS');

    const approvedLeaves = await db.collection('leaves').find({
      employeeId: EMPLOYEE_ID,
      leaveType: LEAVE_TYPE,
      status: 'approved',
      isDeleted: { $ne: true }
    }).toArray();

    if (approvedLeaves.length > 0) {
      log(`  ✅ Found ${approvedLeaves.length} approved leave requests`, 'green');
      console.log('\n     Approved leaves:');
      let totalApprovedDays = 0;
      approvedLeaves.forEach((leave) => {
        console.log(`       - ${leave.startDate} to ${leave.endDate}: ${leave.duration} days`);
        console.log(`         Status: ${leave.status}, Leave ID: ${leave.leaveId}`);
        totalApprovedDays += leave.duration || 0;
      });
      log(`\n  📊 Total approved sick leave days: ${totalApprovedDays}`, 'blue');
    } else {
      log('  ⚠️  No approved sick leave requests found', 'yellow');
    }

    // ============================================
    // 4. CHECK ALL LEAVE REQUESTS (any status)
    // ============================================
    logSection('4. ALL LEAVE REQUESTS');

    const allLeaves = await db.collection('leaves').find({
      employeeId: EMPLOYEE_ID,
      leaveType: LEAVE_TYPE,
      isDeleted: { $ne: true }
    }).toArray();

    if (allLeaves.length > 0) {
      log(`  ✅ Found ${allLeaves.length} total leave requests`, 'green');
      console.log('\n     All leaves:');
      allLeaves.forEach((leave) => {
        console.log(`       - ${leave.startDate} to ${leave.endDate}: ${leave.duration} days`);
        console.log(`         Status: ${leave.status}, Leave ID: ${leave.leaveId}`);
      });
    }

    // ============================================
    // 5. CALCULATE EXPECTED BALANCE
    // ============================================
    logSection('5. EXPECTED BALANCE CALCULATION');

    const sickEmbedded = employee.leaveBalance?.balances?.find(b => b.type === LEAVE_TYPE);
    const totalQuota = sickEmbedded?.total || 0;
    const embeddedUsed = sickEmbedded?.used || 0;
    const embeddedBalance = sickEmbedded?.balance || 0;

    // Calculate based on approved leaves
    const calculatedUsed = approvedLeaves.reduce((sum, leave) => sum + (leave.duration || 0), 0);
    const calculatedBalance = totalQuota - calculatedUsed;

    console.log(`  Total Quota: ${totalQuota}`);
    console.log(`  Used (embedded): ${embeddedUsed}`);
    console.log(`  Used (approved leaves): ${calculatedUsed}`);
    console.log(`  Balance (embedded): ${embeddedBalance}`);
    console.log(`  Balance (calculated): ${calculatedBalance}`);
    console.log(`  Balance (ledger): ${ledgerEntries.length > 0 ? ledgerEntries[0].balanceAfter : 'N/A'}`);

    // ============================================
    // 6. ROOT CAUSE ANALYSIS
    // ============================================
    logSection('6. ROOT CAUSE ANALYSIS');

    if (ledgerEntries.length === 0) {
      log('  ⚠️  ISSUE: No ledger entries found', 'yellow');
      log('  The system is using embedded balance which may not be accurate', 'yellow');
    }

    if (embeddedUsed !== calculatedUsed) {
      log('  ⚠️  ISSUE: Mismatch between embedded used and actual approved leaves', 'yellow');
      log(`     Embedded shows ${embeddedUsed} days used, but ${calculatedUsed} days are actually approved`, 'yellow');
    }

    if (ledgerEntries.length > 0) {
      const ledgerBalance = ledgerEntries[0].balanceAfter;
      log(`  ✅ Ledger balance is ${ledgerBalance}`, 'green');
      log('  This should be the correct balance shown in the UI', 'green');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await client.close();
    log('\n✅ Diagnostic complete', 'green');
  }
}

main();
