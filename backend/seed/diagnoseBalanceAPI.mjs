/**
 * Test API response for /api/leaves/balance endpoint
 * Simulates the exact same logic as the backend controller
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const COMPANY_ID = '6982468548550225cc5585a9';
const EMPLOYEE_ID = 'EMP-0256';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testBalanceAPI() {
  const client = new MongoClient(DB_URI);

  try {
    await client.connect();
    log('✅ Connected to MongoDB\n', 'green');

    const db = client.db(COMPANY_ID);
    const collections = {
      employees: db.collection('employees'),
      leaveLedger: db.collection('leaveLedger'),
      leaveTypes: db.collection('leaveTypes')
    };

    // 1. Find employee
    log('=== STEP 1: Find Employee ===', 'yellow');
    const employee = await collections.employees.findOne({
      employeeId: EMPLOYEE_ID,
      isDeleted: { $ne: true }
    });

    if (!employee) {
      log(`❌ Employee ${EMPLOYEE_ID} not found!`, 'red');
      return;
    }
    log(`✓ Found: ${employee.firstName} ${employee.lastName}`, 'cyan');

    // 2. Get active leave types
    log('\n=== STEP 2: Get Active Leave Types ===', 'yellow');
    const leaveTypeRecords = await collections.leaveTypes.find({
      companyId: COMPANY_ID,
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    const activeLeaveTypeCodes = leaveTypeRecords.map(lt => lt.code.toLowerCase());
    log(`✓ Found ${activeLeaveTypeCodes.length} active leave types`, 'cyan');
    activeLeaveTypeCodes.forEach(code => log(`  - ${code}`, 'cyan'));

    // 3. For each leave type, calculate balance (same as getEmployeeLeaveBalance)
    log('\n=== STEP 3: Calculate Balance for Each Type ===', 'yellow');

    const balances = {};

    for (const leaveType of activeLeaveTypeCodes) {
      log(`\n[${leaveType.toUpperCase()}]`, 'magenta');

      // Find the leave type record
      const leaveTypeRecord = leaveTypeRecords.find(
        lt => lt.code.toLowerCase() === leaveType
      );

      // Get balance info from embedded employee record
      const balanceInfo = employee.leaveBalance?.balances?.find(
        b => b.type === leaveType
      );

      let totalDays = balanceInfo?.total || 0;
      let usedDays = balanceInfo?.used || 0;
      let balanceDays = balanceInfo?.balance || 0;

      log(`  Embedded: total=${totalDays}, used=${usedDays}, balance=${balanceDays}`, 'cyan');

      // Check ledger for actual current balance
      const latestLedgerEntry = await collections.leaveLedger.findOne({
        employeeId: EMPLOYEE_ID,
        leaveType: leaveType,
        isDeleted: { $ne: true }
      }, { sort: { transactionDate: -1 } });

      // Use ledger balance if available
      if (latestLedgerEntry) {
        balanceDays = latestLedgerEntry.balanceAfter;
        log(`  Ledger: balanceAfter=${balanceDays}`, 'cyan');
      } else {
        log(`  Ledger: No entry found`, 'yellow');
      }

      // Build balance response
      balances[leaveType] = {
        type: leaveType,
        total: totalDays,
        used: usedDays,
        balance: balanceDays
      };

      log(`  → Final: total=${totalDays}, used=${usedDays}, balance=${balanceDays}`, 'green');
    }

    // 4. Show final API response format
    log('\n=== STEP 4: Final API Response ===', 'yellow');
    log(JSON.stringify(balances, null, 2), 'cyan');

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await client.close();
  }
}

testBalanceAPI();
