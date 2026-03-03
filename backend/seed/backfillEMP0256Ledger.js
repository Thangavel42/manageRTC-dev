/**
 * Backfill Script for EMP-0256 Missing Ledger Entries
 * Creates "used" ledger entries for approved leaves that have no corresponding ledger entries
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const COMPANY_ID = '6982468548550225cc5585a9'; // amasQIS.ai
const EMPLOYEE_ID = 'EMP-0256';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function backfillLedger() {
  const client = new MongoClient(DB_URI);

  try {
    await client.connect();
    log('✅ Connected to MongoDB\n', 'green');

    const db = client.db(COMPANY_ID);
    const leaves = db.collection('leaves');
    const leaveLedger = db.collection('leaveLedger');

    // Get all approved leaves for EMP-0256
    const approvedLeaves = await leaves.find({
      employeeId: EMPLOYEE_ID,
      $or: [
        { status: 'approved' },
        { finalStatus: 'approved' }
      ],
      isDeleted: { $ne: true }
    }).toArray();

    log(`Found ${approvedLeaves.length} approved leaves for backfilling\n`, 'cyan');

    let backfilled = 0;
    let skipped = 0;

    for (const leave of approvedLeaves) {
      const leaveTypeLower = (leave.leaveType || '').toLowerCase();

      // Check if ledger entry already exists
      const existingEntry = await leaveLedger.findOne({
        leaveRequestId: leave._id.toString(),
        transactionType: 'used'
      });

      if (existingEntry) {
        log(`  ✓ Skipped ${leave.leaveId} - ledger entry already exists`, 'green');
        skipped++;
        continue;
      }

      // Get current balance from latest entry for this leave type
      const latestEntry = await leaveLedger.findOne({
        employeeId: EMPLOYEE_ID,
        leaveType: leaveTypeLower,
        isDeleted: { $ne: true }
      }, { sort: { transactionDate: -1 } });

      // Default opening balances if no ledger entry exists
      const defaultBalances = {
        earned: 15,
        sick: 10,
        casual: 12,
        maternity: 90,
        paternity: 5,
        bereavement: 3,
        compensatory: 0,
        unpaid: 0,
        special: 5
      };

      const balanceBefore = latestEntry ? latestEntry.balanceAfter : (defaultBalances[leaveTypeLower] || 0);
      const balanceAfter = balanceBefore - leave.duration;

      // Get approval date for transactionDate
      const approvedAt = leave.approvedAt || leave.updatedAt || leave.createdAt;
      const approvedDate = new Date(approvedAt);

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
        transactionDate: approvedDate,
        financialYear: `FY${approvedDate.getFullYear()}-${approvedDate.getFullYear() + 1}`,
        year: approvedDate.getFullYear(),
        month: approvedDate.getMonth() + 1,
        description: `Leave approved by ${leave.approvedByName || 'Manager'} (backfilled)`,
        details: {
          startDate: leave.startDate,
          endDate: leave.endDate,
          duration: leave.duration,
          reason: leave.reason
        },
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await leaveLedger.insertOne(entry);

      log(`  ✓ Created ledger entry for ${leave.leaveId}:`, 'yellow');
      log(`     Type: ${leave.leaveType} (${leaveTypeLower})`, 'cyan');
      log(`     Duration: -${leave.duration} days`, 'cyan');
      log(`     Balance: ${balanceBefore} → ${balanceAfter}`, 'cyan');
      console.log('');

      backfilled++;
    }

    log(`\n✅ Backfill Complete!`, 'green');
    log(`   Backfilled: ${backfilled} entries`, 'cyan');
    log(`   Skipped: ${skipped} entries (already had ledger entries)`, 'cyan');

    // Verify the fix
    log(`\n📊 Verifying balances...`, 'yellow');

    const finalLedgerEntries = await leaveLedger.find({
      employeeId: EMPLOYEE_ID,
      isDeleted: { $ne: true }
    }).sort({ transactionDate: -1 }).toArray();

    // Group by leave type and get latest balance
    const latestByType = {};
    for (const entry of finalLedgerEntries) {
      if (!latestByType[entry.leaveType] || new Date(entry.transactionDate) > new Date(latestByType[entry.leaveType].transactionDate)) {
        latestByType[entry.leaveType] = entry;
      }
    }

    for (const [type, entry] of Object.entries(latestByType)) {
      log(`   ${type}: balanceAfter = ${entry.balanceAfter}`, 'cyan');
    }

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await client.close();
  }
}

backfillLedger();
