/**
 * Backfill Script for Custom Policy Ledger Entries
 * Creates "custom_adjustment" ledger entries for existing custom policies
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const COMPANY_ID = '6982468548550225cc5585a9'; // amasQIS.ai

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

async function backfillCustomPolicyLedgerEntries() {
  const client = new MongoClient(DB_URI);

  try {
    await client.connect();
    log('✅ Connected to MongoDB\n', 'green');

    const db = client.db(COMPANY_ID);
    const customPolicies = db.collection('custom_leave_policies');
    const leaveLedger = db.collection('leaveLedger');
    const leaveTypes = db.collection('leaveTypes');

    // Get all active custom policies
    const policies = await customPolicies.find({
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    log(`Found ${policies.length} active custom policies\n`, 'cyan');

    if (policies.length === 0) {
      log('No custom policies to backfill', 'yellow');
      return;
    }

    let entriesCreated = 0;
    let skipped = 0;

    for (const policy of policies) {
      log(`Processing policy: "${policy.name}"`, 'yellow');

      const { leaveTypeId, annualQuota, employeeIds, name, _id } = policy;
      const policyId = _id.toString();

      // Get leave type details
      const leaveType = await leaveTypes.findOne({
        _id: leaveTypeId,
        isDeleted: { $ne: true }
      });

      if (!leaveType) {
        log(`  ⚠ Leave type not found, skipping`, 'yellow');
        continue;
      }

      const leaveTypeCode = leaveType.code.toLowerCase();
      const defaultQuota = leaveType.annualQuota || 0;
      const adjustment = annualQuota - defaultQuota;

      log(`  Leave Type: ${leaveType.name} (${leaveTypeCode})`, 'cyan');
      log(`  Default Quota: ${defaultQuota} days`, 'cyan');
      log(`  Custom Quota: ${annualQuota} days`, 'cyan');
      log(`  Adjustment: ${adjustment >= 0 ? '+' : ''}${adjustment} days`, 'cyan');
      log(`  Employees: ${employeeIds.length}`, 'cyan');

      // Process each employee
      for (const employeeId of employeeIds) {
        // Check if a custom_adjustment entry already exists for this policy
        const existingEntry = await leaveLedger.findOne({
          employeeId,
          leaveType: leaveTypeCode,
          transactionType: 'custom_adjustment',
          customPolicyId: policyId,
          isDeleted: { $ne: true }
        });

        if (existingEntry) {
          log(`  ✓ Skipped ${employeeId} - ledger entry already exists`, 'green');
          skipped++;
          continue;
        }

        // Get current balance from latest entry
        const latestEntry = await leaveLedger.findOne({
          employeeId,
          leaveType: leaveTypeCode,
          isDeleted: { $ne: true }
        }, { sort: { transactionDate: -1 } });

        const currentBalance = latestEntry ? latestEntry.balanceAfter : defaultQuota;
        const balanceAfter = currentBalance + adjustment;

        // Create ledger entry
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const financialYear = `FY${year}-${year + 1}`;

        const entry = {
          employeeId,
          companyId: COMPANY_ID,
          leaveType: leaveTypeCode,
          transactionType: 'custom_adjustment',
          amount: adjustment,
          balanceBefore: currentBalance,
          balanceAfter,
          customPolicyId: policyId,
          transactionDate: now,
          financialYear,
          year,
          month,
          description: `Custom policy "${name}" applied (${annualQuota} days, ${adjustment >= 0 ? '+' : ''}${adjustment} adjustment) [BACKFILLED]`,
          details: {
            customQuota: annualQuota,
            defaultQuota,
            adjustment,
            policyName: name,
            policyId,
            backfilled: true
          },
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        };

        await leaveLedger.insertOne(entry);

        log(`  ✓ Created ledger entry for ${employeeId}:`, 'green');
        log(`     Balance: ${currentBalance} → ${balanceAfter}`, 'cyan');
        entriesCreated++;
      }

      console.log('');
    }

    log(`\n✅ Backfill Complete!`, 'green');
    log(`   Entries Created: ${entriesCreated}`, 'cyan');
    log(`   Skipped: ${skipped}`, 'cyan');

    // Verify the fix
    log(`\n📊 Verifying custom adjustment entries...`, 'yellow');

    const adjustmentEntries = await leaveLedger.find({
      transactionType: 'custom_adjustment',
      isDeleted: { $ne: true }
    }).sort({ transactionDate: -1 }).toArray();

    log(`   Total custom_adjustment entries: ${adjustmentEntries.length}`, 'cyan');

    for (const entry of adjustmentEntries.slice(0, 5)) {
      log(`   - ${entry.employeeId}: ${entry.leaveType} ${entry.amount >= 0 ? '+' : ''}${entry.amount} days (${entry.description?.substring(0, 50)}...)`, 'cyan');
    }

    if (adjustmentEntries.length > 5) {
      log(`   ... and ${adjustmentEntries.length - 5} more`, 'cyan');
    }

  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    await client.close();
  }
}

backfillCustomPolicyLedgerEntries();
