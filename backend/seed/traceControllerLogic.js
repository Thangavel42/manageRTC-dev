/**
 * Trace the exact controller logic to find the bug
 */

import dotenv from 'dotenv';
dotenv.config();

import { clerkClient } from '@clerk/clerk-sdk-node';
import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

async function main() {
  console.log('=== Tracing Controller Logic ===\n');

  await client.connect();

  const db = client.db('AmasQIS');
  const companies = await db.collection('companies').find({}, {projection: {_id: 1}}).limit(1).toArray();
  const companyId = companies[0]._id.toString();
  const employeesDb = client.db(companyId);

  // Import service
  const employeeStatusService = await import('../services/employee/employeeStatus.service.js');

  // Scenario: Employee is Inactive (locked in Clerk), we want to change to Active
  console.log('[SCENARIO] Employee is Inactive, changing to Active\n');

  // Find an employee
  const employees = await employeesDb.collection('employees').find({
    isDeleted: { $ne: true },
    clerkUserId: { $exists: true, $ne: null }
  }).limit(1).toArray();

  if (employees.length === 0) {
    console.log('No employees found');
    await client.close();
    process.exit(1);
  }

  const emp = employees[0];

  // Simulate the controller's logic
  console.log('[STEP 1] Simulating controller logic...\n');

  // Initial state (before update)
  const employee = {
    ...emp,
    employmentStatus: 'Inactive',
    isActive: true
  };

  // Update data coming from frontend
  const normalizedUpdateData = {
    employmentStatus: 'Active'
  };

  // After database update
  const updatedEmployee = {
    ...employee,
    employmentStatus: 'Active',
    isActive: true  // This is important - isActive wasn't changed!
  };

  // Controller's logic:
  const oldStatus = employee.employmentStatus || employee.status;
  const newStatus = normalizedUpdateData.employmentStatus;

  console.log('  oldStatus:', oldStatus);
  console.log('  newStatus:', newStatus);
  console.log('  employee.isActive:', employee.isActive);
  console.log('  updatedEmployee.isActive:', updatedEmployee.isActive);

  // The critical calculation
  const shouldLockNow = !updatedEmployee.isActive ||
                        employeeStatusService.shouldLockUser(newStatus);

  console.log('\n  shouldLockUser(newStatus):', employeeStatusService.shouldLockUser(newStatus));
  console.log('  !updatedEmployee.isActive:', !updatedEmployee.isActive);
  console.log('  shouldLockNow:', shouldLockNow);

  // What gets passed to syncClerkLockStatus
  const passedStatus = shouldLockNow ? 'Terminated' : newStatus;
  console.log('\n  Status passed to syncClerkLockStatus:', passedStatus);

  if (passedStatus === 'Terminated') {
    console.log('\n❌ BUG FOUND! Controller passes "Terminated" instead of "Active"');
    console.log('   This means syncClerkLockStatus will try to LOCK, not UNLOCK!');
  }

  // Now call the actual service function with what the controller would pass
  console.log('\n[STEP 2] Calling syncClerkLockStatus with what controller passes...\n');

  // First lock the user
  await clerkClient.users.lockUser(emp.clerkUserId);
  const lockedUser = await clerkClient.users.getUser(emp.clerkUserId);
  console.log('  User is now locked:', lockedUser.locked ? 'YES 🔒' : 'NO 🔓');

  // Call syncClerkLockStatus with the controller's logic
  const syncResult = await employeeStatusService.default.syncClerkLockStatus(
    emp.clerkUserId,
    passedStatus,
    oldStatus
  );

  console.log('\n[STEP 3] Sync result:');
  console.log('  action:', syncResult.action);
  console.log('  success:', syncResult.success);
  console.log('  message:', syncResult.message);

  // Check final state
  const finalUser = await clerkClient.users.getUser(emp.clerkUserId);
  console.log('\n[STEP 4] Final user state:');
  console.log('  locked:', finalUser.locked ? 'YES 🔒' : 'NO 🔓');

  // Cleanup
  await clerkClient.users.unlockUser(emp.clerkUserId);
  await employeesDb.collection('employees').updateOne(
    { _id: emp._id },
    { $set: { employmentStatus: 'Active' } }
  );

  await client.close();

  if (finalUser.locked) {
    console.log('\n❌ CONFIRMED: User is still locked - BUG EXISTS!');
    console.log('\nROOT CAUSE: Controller logic is passing wrong status to syncClerkLockStatus');
    process.exit(1);
  } else {
    console.log('\n✅ User was unlocked - no bug found in this scenario');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
