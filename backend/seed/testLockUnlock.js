/**
 * Test Lock and Unlock operations via Clerk API
 */

import dotenv from 'dotenv';
dotenv.config();

import { clerkClient } from '@clerk/clerk-sdk-node';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

async function testLockUnlock(clerkUserId, employeeInfo) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TESTING: ${employeeInfo.employeeId} - ${employeeInfo.firstName} ${employeeInfo.lastName}`);
  console.log(`Clerk ID: ${clerkUserId}`);
  console.log(`${'='.repeat(60)}\n`);

  // ============================================
  // TEST 1: Check initial state
  // ============================================
  console.log(`[TEST 1] Checking initial state...`);
  const user1 = await clerkClient.users.getUser(clerkUserId);
  const initialLocked = !!(user1?.locked);
  console.log(`  Initial state: ${initialLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}`);
  console.log(`  locked: ${user1?.locked || 'null'}`);

  // ============================================
  // TEST 2: Lock the user
  // ============================================
  console.log(`\n[TEST 2] Locking user...`);
  try {
    await clerkClient.users.lockUser(clerkUserId);
    console.log(`  ✅ lockUser API call succeeded`);

    // Wait a moment for Clerk to process
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify lock worked
    const user2 = await clerkClient.users.getUser(clerkUserId);
    const isLockedAfterLock = !!(user2?.locked);
    console.log(`  After lock: ${isLockedAfterLock ? '🔒 LOCKED' : '🔓 UNLOCKED'}`);
    console.log(`  locked: ${user2?.locked || 'null'}`);

    if (!isLockedAfterLock) {
      console.log(`  ❌ LOCK FAILED - User is still unlocked!`);
      return false;
    }
    console.log(`  ✅ Lock successful!`);
  } catch (error) {
    console.log(`  ❌ Lock failed: ${error.message}`);
    return false;
  }

  // ============================================
  // TEST 3: Unlock the user
  // ============================================
  console.log(`\n[TEST 3] Unlocking user...`);
  try {
    await clerkClient.users.unlockUser(clerkUserId);
    console.log(`  ✅ unlockUser API call succeeded`);

    // Wait a moment for Clerk to process
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify unlock worked
    const user3 = await clerkClient.users.getUser(clerkUserId);
    const isLockedAfterUnlock = !!(user3?.locked);
    console.log(`  After unlock: ${isLockedAfterUnlock ? '🔒 LOCKED' : '🔓 UNLOCKED'}`);
    console.log(`  locked: ${user3?.locked || 'null'}`);

    if (isLockedAfterUnlock) {
      console.log(`  ❌ UNLOCK FAILED - User is still locked!`);
      console.log(`  🔍 This is the issue you're experiencing!`);
      return false;
    }
    console.log(`  ✅ Unlock successful!`);
  } catch (error) {
    console.log(`  ❌ Unlock failed: ${error.message}`);
    console.error(`  Error details:`, error);
    return false;
  }

  // ============================================
  // TEST 4: Final verification
  // ============================================
  console.log(`\n[TEST 4] Final verification...`);
  const user4 = await clerkClient.users.getUser(clerkUserId);
  const finalState = !!(user4?.locked);
  console.log(`  Final state: ${finalState ? '🔒 LOCKED' : '🔓 UNLOCKED'}`);

  if (finalState) {
    console.log(`  ❌ FINAL STATE INCORRECT - User should be unlocked`);
    return false;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ ALL TESTS PASSED!`);
  console.log(`${'='.repeat(60)}`);
  return true;
}

async function main() {
  console.log('=== Clerk Lock/Unlock API Test ===\n');

  await client.connect();
  console.log('Connected to MongoDB\n');

  const db = client.db('AmasQIS');
  const companies = await db.collection('companies').find({}, {projection: {name: 1, _id: 1}}).limit(1).toArray();

  if (companies.length === 0) {
    console.log('No companies found');
    await client.close();
    process.exit(1);
  }

  const companyId = companies[0]._id.toString();

  // Get an employee to test with (prefer an Active employee)
  const employeesDb = client.db(companyId);
  const employees = await employeesDb.collection('employees').find({
    isDeleted: { $ne: true },
    clerkUserId: { $exists: true, $ne: null },
    employmentStatus: 'Active'
  }).limit(1).toArray();

  if (employees.length === 0) {
    console.log('No active employees found to test with');
    await client.close();
    process.exit(1);
  }

  const emp = employees[0];
  console.log(`Testing with employee: ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
  console.log(`Status: ${emp.employmentStatus}\n`);

  // Run the test
  const success = await testLockUnlock(emp.clerkUserId, emp);

  await client.close();

  if (success) {
    console.log('\n✅ Lock/Unlock functionality is working correctly!');
    process.exit(0);
  } else {
    console.log('\n❌ Lock/Unlock test failed!');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
