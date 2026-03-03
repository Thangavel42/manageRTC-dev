/**
 * End-to-end test: Update employee status and verify Clerk sync
 */

import dotenv from 'dotenv';
dotenv.config();

import { clerkClient } from '@clerk/clerk-sdk-node';
import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

async function testUnlockViaEmployeeUpdate() {
  console.log('=== End-to-End Unlock Test ===\n');

  await client.connect();

  const db = client.db('AmasQIS');
  const companies = await db.collection('companies').find({}, {projection: {_id: 1}}).limit(1).toArray();
  const companyId = companies[0]._id.toString();

  const employeesDb = client.db(companyId);

  // Step 1: Find an Active employee to test with
  console.log('[STEP 1] Finding an Active employee...');
  const employees = await employeesDb.collection('employees').find({
    isDeleted: { $ne: true },
    clerkUserId: { $exists: true, $ne: null },
    employmentStatus: 'Active'
  }).limit(1).toArray();

  if (employees.length === 0) {
    console.log('No Active employees found');
    await client.close();
    process.exit(1);
  }

  const emp = employees[0];
  console.log(`  Found: ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
  console.log(`  Current Status: ${emp.employmentStatus}`);
  console.log(`  Clerk ID: ${emp.clerkUserId}\n`);

  // Step 2: Lock the user first (simulate setting to Inactive)
  console.log('[STEP 2] Locking user (setting status to Inactive)...');
  await clerkClient.users.lockUser(emp.clerkUserId);
  await new Promise(resolve => setTimeout(resolve, 500));

  const afterLock = await clerkClient.users.getUser(emp.clerkUserId);
  console.log(`  User locked: ${afterLock.locked ? 'YES 🔒' : 'NO 🔓'}`);

  if (!afterLock.locked) {
    console.log('  ERROR: Failed to lock user!');
    await client.close();
    process.exit(1);
  }

  // Step 3: Update employee in database to Inactive
  console.log('\n[STEP 3] Updating employee status to Inactive in database...');
  await employeesDb.collection('employees').updateOne(
    { _id: emp._id },
    { $set: { employmentStatus: 'Inactive' } }
  );
  console.log('  Status updated to Inactive\n');

  // Step 4: Now simulate changing status back to Active (this should trigger unlock)
  console.log('[STEP 4] Changing status back to Active (should trigger unlock)...');
  console.log('  This simulates what happens when you update via the API\n');

  // Get current employee state
  const currentEmployee = await employeesDb.collection('employees').findOne({ _id: emp._id });
  const oldStatus = currentEmployee.employmentStatus; // 'Inactive'
  const newStatus = 'Active';

  console.log(`  oldStatus: ${oldStatus}`);
  console.log(`  newStatus: ${newStatus}`);

  // Import and call the service function
  const employeeStatusService = await import('../services/employee/employeeStatus.service.js');

  console.log('\n[STEP 5] Calling syncClerkLockStatus...');
  const syncResult = await employeeStatusService.default.syncClerkLockStatus(
    emp.clerkUserId,
    newStatus,
    oldStatus
  );

  console.log('\n[STEP 6] Sync Result:');
  console.log(`  success: ${syncResult.success}`);
  console.log(`  action: ${syncResult.action}`);
  console.log(`  message: ${syncResult.message}`);

  // Step 7: Verify Clerk user is actually unlocked
  console.log('\n[STEP 7] Verifying Clerk user state...');
  await new Promise(resolve => setTimeout(resolve, 500));
  const finalUser = await clerkClient.users.getUser(emp.clerkUserId);
  const isLocked = !!(finalUser?.locked);

  console.log(`  User locked: ${isLocked ? 'YES 🔒' : 'NO 🔓'}`);
  console.log(`  locked field: ${finalUser?.locked}`);

  // Restore employee to Active status
  console.log('\n[CLEANUP] Restoring employee status to Active...');
  await employeesDb.collection('employees').updateOne(
    { _id: emp._id },
    { $set: { employmentStatus: 'Active' } }
  );

  // Unlock if still locked
  if (isLocked) {
    console.log('  Unlocking user...');
    await clerkClient.users.unlockUser(emp.clerkUserId);
  }

  await client.close();

  // Final verdict
  console.log('\n' + '='.repeat(60));
  if (isLocked) {
    console.log('❌ TEST FAILED: User is still locked after sync!');
    console.log('   The unlock operation did not work correctly.');
    process.exit(1);
  } else {
    console.log('✅ TEST PASSED: User successfully unlocked!');
    console.log('   The unlock operation worked correctly.');
    process.exit(0);
  }
}

testUnlockViaEmployeeUpdate().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
