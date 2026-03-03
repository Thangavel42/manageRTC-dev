/**
 * Diagnostic script to check EMP-0256 leave balance issue
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
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function diagnoseEMP0256Balance() {
  const client = new MongoClient(DB_URI);

  try {
    await client.connect();
    log('✅ Connected to MongoDB\n', 'green');

    const db = client.db(COMPANY_ID);
    const ledger = db.collection('leaveLedger');
    const employees = db.collection('employees');
    const leaveTypes = db.collection('leaveTypes');

    // 1. Check employee embedded balance
    log('=== EMPLOYEE EMBEDDED BALANCE ===', 'yellow');
    const emp = await employees.findOne({ employeeId: EMPLOYEE_ID });

    if (!emp) {
      log(`❌ Employee ${EMPLOYEE_ID} not found!`, 'red');
      return;
    }

    log(`Employee: ${emp.firstName} ${emp.lastName} (${emp.email})`, 'cyan');
    log(`Employee ID: ${emp.employeeId}`, 'cyan');

    if (emp.leaveBalance && emp.leaveBalance.balances) {
      log('\nEmbedded leaveBalance.balances:', 'cyan');
      emp.leaveBalance.balances.forEach(b => {
        log(`  ${b.type}: total=${b.total}, used=${b.used}, balance=${b.balance}`, 'cyan');
      });
    } else {
      log('\n  No embedded leaveBalance found', 'yellow');
    }

    // 2. Check all ledger entries
    log('\n=== ALL LEDGER ENTRIES ===', 'yellow');
    const allEntries = await ledger.find({
      employeeId: EMPLOYEE_ID,
      isDeleted: { $ne: true }
    }).sort({ transactionDate: -1 }).toArray();

    log(`Total ledger entries: ${allEntries.length}`, 'cyan');

    if (allEntries.length === 0) {
      log('  ❌ NO LEDGER ENTRIES FOUND!', 'red');
      log('  This is why balance shows 0 - no opening/allocated entries exist', 'red');
    } else {
      // Group by leave type
      const byType = {};
      allEntries.forEach(e => {
        if (!byType[e.leaveType]) byType[e.leaveType] = [];
        byType[e.leaveType].push(e);
      });

      for (const [type, entries] of Object.entries(byType)) {
        log(`\n  ${type.toUpperCase()} (${entries.length} entries):`, 'magenta');
        entries.slice(0, 5).forEach(e => {
          const date = new Date(e.transactionDate).toISOString().split('T')[0];
          log(`    ${date} | ${e.transactionType.padEnd(15)} | amount: ${e.amount.toString().padStart(3)} | balance: ${e.balanceAfter}`, 'cyan');
        });
        if (entries.length > 5) {
          log(`    ... and ${entries.length - 5} more`, 'cyan');
        }

        // Show latest balance
        const latest = entries[0];
        log(`    → Latest balance: ${latest.balanceAfter}`, 'green');
      }
    }

    // 3. Check active leave types
    log('\n=== ACTIVE LEAVE TYPES ===', 'yellow');
    const activeLeaveTypes = await leaveTypes.find({
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    log(`Active leave types: ${activeLeaveTypes.length}`, 'cyan');
    activeLeaveTypes.forEach(lt => {
      log(`  ${lt.code}: ${lt.name} (annualQuota: ${lt.annualQuota || 0})`, 'cyan');
    });

    // 4. Identify missing opening entries
    log('\n=== DIAGNOSIS ===', 'yellow');
    const typesWithEntries = new Set(allEntries.map(e => e.leaveType));
    const missingTypes = [];

    for (const lt of activeLeaveTypes) {
      const code = lt.code.toLowerCase();
      if (!typesWithEntries.has(code)) {
        missingTypes.push({ code, name: lt.name, annualQuota: lt.annualQuota });
      }
    }

    if (missingTypes.length > 0) {
      log(`\n❌ Missing opening entries for:`, 'red');
      missingTypes.forEach(t => {
        log(`  - ${t.code}: ${t.name} (annualQuota: ${t.annualQuota})`, 'cyan');
      });
      log('\n💡 SOLUTION: Create opening entries for these leave types', 'yellow');
    } else {
      log('\n✅ All leave types have ledger entries', 'green');
    }

    // 5. Calculate expected balance from ledger
    log('\n=== EXPECTED BALANCE (from ledger) ===', 'yellow');
    for (const lt of activeLeaveTypes) {
      const code = lt.code.toLowerCase();
      const latest = allEntries.find(e => e.leaveType === code);
      const balance = latest ? latest.balanceAfter : 0;
      const total = lt.annualQuota || 0;

      // Get used count
      const used = allEntries.filter(e => e.leaveType === code && e.transactionType === 'used').length;

      log(`  ${code.padEnd(12)} | total: ${total.toString().padStart(2)} | used: ${used.toString().padStart(2)} | balance: ${balance.toString().padStart(2)}`, 'cyan');
    }

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await client.close();
  }
}

diagnoseEMP0256Balance();
