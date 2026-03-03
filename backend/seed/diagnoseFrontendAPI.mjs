/**
 * Simulate actual API call to /api/leaves/balance
 * Requires valid auth token - we'll test the endpoint directly
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const COMPANY_ID = '6982468548550225cc5585a9';
const EMPLOYEE_ID = 'EMP-0256';

// Simulate getEmployeeByClerkId - used by the controller
async function getEmployeeByClerkId(collections, clerkUserId, employeeId, email) {
  // Try multiple lookup strategies
  const employee = await collections.employees.findOne({
    $or: [
      { clerkUserId: clerkUserId },
      { employeeId: employeeId },
      { email: email }
    ],
    isDeleted: { $ne: true }
  });
  return employee;
}

// Simulate enrichBalanceResponse - used by the controller
function enrichBalanceResponse(data) {
  return {
    type: data.type,
    balance: data.balance,
    used: data.used,
    total: data.total,
    hasCustomPolicy: data.hasCustomPolicy || false,
    customPolicyId: data.customPolicyId,
    customPolicyName: data.customPolicyName,
    leaveTypeName: data.leaveTypeName,
    isPaid: data.isPaid,
    annualQuota: data.annualQuota
  };
}

// Simulate getEmployeeLeaveBalance - used by the controller
async function getEmployeeLeaveBalance(collections, employeeId, leaveType, companyId) {
  const employee = await collections.employees.findOne({
    employeeId: employeeId,
    isDeleted: { $ne: true }
  });

  const leaveTypeRecord = await collections.leaveTypes.findOne({
    code: leaveType.toUpperCase(),
    companyId: companyId,
    isActive: true,
    isDeleted: { $ne: true }
  });

  let customPolicy = null;
  try {
    // Check custom policy (simulate the service call)
    const matchingLeaveTypes = await collections.leaveTypes.find({
      code: leaveType.toUpperCase(),
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    if (matchingLeaveTypes.length > 0) {
      const leaveTypeId = matchingLeaveTypes[0]._id;
      customPolicy = await collections.customLeavePolicies?.findOne({
        leaveTypeId: leaveTypeId,
        employeeIds: employeeId,
        isActive: true,
        isDeleted: { $ne: true }
      });
    }
  } catch (error) {
    // Ignore errors
  }

  if (!employee || !employee.leaveBalance?.balances) {
    if (customPolicy) {
      const totalDays = customPolicy.annualQuota ?? customPolicy.days ?? 0;
      return enrichBalanceResponse({
        type: leaveType,
        balance: totalDays,
        used: 0,
        total: totalDays,
        hasCustomPolicy: true,
        customPolicyId: customPolicy._id?.toString(),
        customPolicyName: customPolicy.name
      });
    }
    if (leaveTypeRecord && leaveTypeRecord.annualQuota > 0) {
      return enrichBalanceResponse({
        type: leaveType,
        balance: leaveTypeRecord.annualQuota,
        used: 0,
        total: leaveTypeRecord.annualQuota,
        hasCustomPolicy: false
      });
    }
    return enrichBalanceResponse({ type: leaveType, balance: 0, used: 0, total: 0, hasCustomPolicy: false });
  }

  const balanceInfo = employee.leaveBalance.balances.find(b => b.type === leaveType);
  let totalDays = balanceInfo?.total || 0;
  let usedDays = balanceInfo?.used || 0;
  let balanceDays = balanceInfo?.balance || 0;

  const latestLedgerEntry = await collections.leaveLedger.findOne({
    employeeId: employeeId,
    leaveType: leaveType,
    isDeleted: { $ne: true }
  }, { sort: { transactionDate: -1 } });

  if (latestLedgerEntry) {
    balanceDays = latestLedgerEntry.balanceAfter;
  }

  if (customPolicy) {
    totalDays = customPolicy.annualQuota ?? customPolicy.days ?? totalDays;
    return enrichBalanceResponse({
      type: leaveType,
      balance: balanceDays,
      used: usedDays,
      total: totalDays,
      hasCustomPolicy: true,
      customPolicyId: customPolicy._id?.toString(),
      customPolicyName: customPolicy.name
    });
  }

  return enrichBalanceResponse({
    type: leaveType,
    balance: balanceDays,
    used: usedDays,
    total: totalDays,
    hasCustomPolicy: false
  });
}

async function testFullAPIFlow() {
  const client = new MongoClient(DB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(COMPANY_ID);
    const collections = {
      employees: db.collection('employees'),
      leaveLedger: db.collection('leaveLedger'),
      leaveTypes: db.collection('leaveTypes'),
      customLeavePolicies: db.collection('custom_leave_policies')
    };

    // Simulate the exact flow of getLeaveBalance controller
    console.log('=== SIMULATING /api/leaves/balance ===\n');

    // 1. Get leave type records
    const leaveTypeRecords = await collections.leaveTypes.find({
      companyId: COMPANY_ID,
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    const activeLeaveTypeCodes = leaveTypeRecords.map(lt => lt.code.toLowerCase());
    console.log('Active leave types:', activeLeaveTypeCodes);
    console.log('');

    // 2. Get employee
    const employee = await getEmployeeByClerkId(
      collections,
      'user_2plf3x7xKNtGdX0uUXkYFqSRAgX', // Sample clerk user ID
      EMPLOYEE_ID,
      'snehaselvarajonboard@gmail.com'
    );

    if (!employee) {
      console.log('❌ Employee not found!');
      return;
    }
    console.log(`✓ Employee: ${employee.firstName} ${employee.lastName}\n`);

    // 3. Get balances for each type
    const balances = {};
    for (const type of activeLeaveTypeCodes) {
      balances[type] = await getEmployeeLeaveBalance(collections, employee.employeeId, type, COMPANY_ID);
    }

    // 4. Return the final response
    console.log('=== FINAL API RESPONSE ===');
    console.log(JSON.stringify(balances, null, 2));

    // 5. Check specific types
    console.log('\n=== CHECKING SPECIFIC VALUES ===');
    console.log('earned balance:', balances.earned?.balance ?? 'MISSING');
    console.log('sick balance:', balances.sick?.balance ?? 'MISSING');
    console.log('casual balance:', balances.casual?.balance ?? 'MISSING');

    // 6. Verify all types have balance
    console.log('\n=== BALANCE COMPLETENESS CHECK ===');
    for (const type of activeLeaveTypeCodes) {
      const bal = balances[type];
      if (!bal) {
        console.log(`❌ ${type}: MISSING`);
      } else if (bal.balance === 0 && bal.total === 0) {
        console.log(`⚠️  ${type}: balance=0, total=0 (might be unpaid leave type)`);
      } else if (bal.balance === 0) {
        console.log(`⚠️  ${type}: balance=0 (used all leaves?)`);
      } else {
        console.log(`✅ ${type}: balance=${bal.balance}, total=${bal.total}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

testFullAPIFlow();
