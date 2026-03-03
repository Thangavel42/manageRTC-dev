/**
 * Check custom policy for EMP-0256
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const COMPANY_ID = '6982468548550225cc5585a9';
const EMPLOYEE_ID = 'EMP-0256';

async function checkCustomPolicy() {
  const client = new MongoClient(DB_URI);

  try {
    await client.connect();
    const db = client.db(COMPANY_ID);
    const customPolicies = db.collection('custom_leave_policies');
    const employees = db.collection('employees');

    console.log('Checking custom policy for EMP-0256...\n');

    // Check employee exists
    const employee = await employees.findOne({ employeeId: EMPLOYEE_ID });
    if (!employee) {
      console.log('❌ Employee EMP-0256 not found');
      return;
    }

    console.log(`✅ Employee Found: ${employee.firstName} ${employee.lastName}\n`);

    // Check for custom policies
    const policies = await customPolicies.find({
      companyId: COMPANY_ID,
      employeeIds: { $in: [EMPLOYEE_ID] },
      isDeleted: { $ne: true }
    }).toArray();

    console.log(`Custom Policies found: ${policies.length}\n`);

    if (policies.length === 0) {
      console.log('❌ No custom policies found for EMP-0256');
      console.log('   This employee uses the default company quotas for all leave types.\n');

      // Show default balance
      if (employee.leaveBalance?.balances) {
        console.log('Current Balances (Default):');
        for (const bal of employee.leaveBalance.balances) {
          console.log(`  - ${bal.type}: ${bal.balance} / ${bal.total}`);
        }
      }
    } else {
      for (const policy of policies) {
        console.log(`✅ Custom Policy: "${policy.name}"`);
        console.log(`   Days: ${policy.annualQuota} days/year`);
        console.log(`   Leave Type: ${policy.leaveTypeId}`);
        console.log(`   Employees: ${policy.employeeIds?.join(', ') || 'N/A'}`);
        console.log(`   Active: ${policy.isActive ? 'Yes' : 'No'}`);
        console.log('');
      }
    }

    // Check ledger balance
    const leaveLedger = db.collection('leaveLedger');
    const earnedLedger = await leaveLedger.find({
      employeeId: EMPLOYEE_ID,
      leaveType: 'earned',
      isDeleted: { $ne: true }
    }).sort({ transactionDate: -1 }).limit(1).toArray();

    console.log(`\nLatest Earned Leave Ledger Entry:`);
    if (earnedLedger.length > 0) {
      const entry = earnedLedger[0];
      console.log(`   Balance After: ${entry.balanceAfter}`);
      console.log(`   Transaction Date: ${entry.transactionDate}`);
      console.log(`   Description: ${entry.description}`);
    } else {
      console.log(`   No ledger entries found for 'earned' type`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

checkCustomPolicy();
