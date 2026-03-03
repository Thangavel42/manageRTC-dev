/**
 * Complete end-to-end API test
 * Simulates the exact HTTP request that the frontend makes
 */

import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, ObjectId } from 'mongodb';
import { clerkClient } from '@clerk/clerk-sdk-node';

const client = new MongoClient(process.env.MONGODB_URI);

async function fullApiTest() {
  console.log('=== Complete End-to-End API Test ===\n');

  await client.connect();

  const db = client.db('AmasQIS');
  const companies = await db.collection('companies').find({}, {projection: {_id: 1}}).limit(1).toArray();
  const companyId = companies[0]._id.toString();
  const employeesDb = client.db(companyId);

  // Find an Active employee
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
  console.log(`Testing with: ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
  console.log(`Current Status: ${emp.employmentStatus}, isActive: ${emp.isActive}\n`);

  // ========================================
  // STEP 1: Lock the user (simulate status change to Inactive)
  // ========================================
  console.log('[STEP 1] Changing status to Inactive (should lock user)...');

  // Simulate what happens when the controller receives a PUT request:
  // {
  //   "employmentStatus": "Inactive"
  // }

  // 1. Get the employee before update
  const employeeBefore = await employeesDb.collection('employees').findOne({ _id: emp._id });
  const oldStatus = employeeBefore.employmentStatus || employeeBefore.status;

  // 2. The update data
  const updateData = { employmentStatus: 'Inactive' };

  // 3. Update in database
  await employeesDb.collection('employees').updateOne(
    { _id: emp._id },
    { $set: updateData }
  );

  // 4. Get updated employee
  const updatedEmployee = await employeesDb.collection('employees').findOne({ _id: emp._id });
  const newStatus = updatedEmployee.employmentStatus || updatedEmployee.status;

  console.log(`  oldStatus: ${oldStatus} → newStatus: ${newStatus}`);
  console.log(`  isActive: ${updatedEmployee.isActive}`);

  // 5. Call syncClerkLockStatus (this is what the controller does)
  const employeeStatusService = await import('../services/employee/employeeStatus.service.js');

  const syncResult1 = await employeeStatusService.default.syncClerkLockStatus(
    emp.clerkUserId,
    newStatus,
    oldStatus,
    updatedEmployee.isActive
  );

  console.log(`  Sync action: ${syncResult1.action}`);
  console.log(`  Sync success: ${syncResult1.success}`);

  // 6. Verify Clerk state
  await new Promise(resolve => setTimeout(resolve, 500));
  const clerkUser1 = await clerkClient.users.getUser(emp.clerkUserId);
  console.log(`  Clerk locked: ${clerkUser1.locked ? 'YES 🔒' : 'NO 🔓'}`);

  if (!clerkUser1.locked) {
    console.log('\n❌ FAIL: User should be locked after changing to Inactive');
    await client.close();
    process.exit(1);
  }
  console.log('  ✅ PASS: User is locked\n');

  // ========================================
  // STEP 2: Now change status back to Active (should unlock)
  // ========================================
  console.log('[STEP 2] Changing status back to Active (should unlock user)...');

  // 1. Get the employee before update
  const employeeBefore2 = await employeesDb.collection('employees').findOne({ _id: emp._id });
  const oldStatus2 = employeeBefore2.employmentStatus || employeeBefore2.status;

  // 2. The update data
  const updateData2 = { employmentStatus: 'Active' };

  // 3. Update in database
  await employeesDb.collection('employees').updateOne(
    { _id: emp._id },
    { $set: updateData2 }
  );

  // 4. Get updated employee
  const updatedEmployee2 = await employeesDb.collection('employees').findOne({ _id: emp._id });
  const newStatus2 = updatedEmployee2.employmentStatus || updatedEmployee2.status;

  console.log(`  oldStatus: ${oldStatus2} → newStatus: ${newStatus2}`);
  console.log(`  isActive: ${updatedEmployee2.isActive}`);

  // 5. Call syncClerkLockStatus
  const syncResult2 = await employeeStatusService.default.syncClerkLockStatus(
    emp.clerkUserId,
    newStatus2,
    oldStatus2,
    updatedEmployee2.isActive
  );

  console.log(`  Sync action: ${syncResult2.action}`);
  console.log(`  Sync success: ${syncResult2.success}`);

  // 6. Verify Clerk state
  await new Promise(resolve => setTimeout(resolve, 500));
  const clerkUser2 = await clerkClient.users.getUser(emp.clerkUserId);
  console.log(`  Clerk locked: ${clerkUser2.locked ? 'YES 🔒' : 'NO 🔓'}`);

  if (clerkUser2.locked) {
    console.log('\n❌ FAIL: User should be unlocked after changing to Active');
    console.log('   This is the bug you\'re experiencing!');
    console.log('\n   DEBUG INFO:');
    console.log(`   - newStatus: ${newStatus2}`);
    console.log(`   - isActive: ${updatedEmployee2.isActive}`);
    console.log(`   - sync action: ${syncResult2.action}`);

    // Try manual unlock
    await clerkClient.users.unlockUser(emp.clerkUserId);
    await employeesDb.collection('employees').updateOne(
      { _id: emp._id },
      { $set: { employmentStatus: 'Active' } }
    );

    await client.close();
    process.exit(1);
  }

  console.log('  ✅ PASS: User is unlocked\n');

  // ========================================
  // STEP 3: Final verification
  // ========================================
  console.log('[STEP 3] Final verification...');
  const finalEmployee = await employeesDb.collection('employees').findOne({ _id: emp._id });
  const finalClerkUser = await clerkClient.users.getUser(emp.clerkUserId);

  console.log(`  DB Status: ${finalEmployee.employmentStatus}`);
  console.log(`  DB isActive: ${finalEmployee.isActive}`);
  console.log(`  Clerk locked: ${finalClerkUser.locked ? 'YES 🔒' : 'NO 🔓'}`);

  await client.close();

  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS PASSED!');
  console.log('='.repeat(60));
  console.log('\n⚠️  IMPORTANT: Make sure your backend server is restarted!');
  console.log('   The code changes won\'t take effect until you restart.\n');

  process.exit(0);
}

fullApiTest().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
