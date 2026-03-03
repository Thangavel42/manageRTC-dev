/**
 * Test when BOTH status and isActive are changed
 */

import dotenv from 'dotenv';
dotenv.config();

import { clerkClient } from '@clerk/clerk-sdk-node';
import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

async function main() {
  console.log('=== Testing Status AND isActive Change ===\n');

  await client.connect();

  const db = client.db('AmasQIS');
  const companies = await db.collection('companies').find({}, {projection: {_id: 1}}).limit(1).toArray();
  const companyId = companies[0]._id.toString();
  const employeesDb = client.db(companyId);

  const employeeStatusService = await import('../services/employee/employeeStatus.service.js');

  const employees = await employeesDb.collection('employees').find({
    isDeleted: { $ne: true },
    clerkUserId: { $exists: true, $ne: null }
  }).limit(1).toArray();

  const emp = employees[0];

  console.log('[SCENARIO 1] Inactive → Active, isActive: false → true (BOTH changed)\n');

  // Initial state
  const employee1 = {
    ...emp,
    employmentStatus: 'Inactive',
    isActive: false
  };

  // Frontend sends BOTH updates
  const updateData1 = {
    employmentStatus: 'Active',
    isActive: true
  };

  const updatedEmployee1 = {
    ...employee1,
    employmentStatus: 'Active',
    isActive: true
  };

  console.log('  oldStatus: Inactive');
  console.log('  newStatus: Active');
  console.log('  old isActive: false');
  console.log('  new isActive: true');

  // Lock the user first
  await clerkClient.users.lockUser(emp.clerkUserId);

  console.log('\n  Calling syncClerkLockStatus...');
  const syncResult1 = await employeeStatusService.default.syncClerkLockStatus(
    emp.clerkUserId,
    updateData1.employmentStatus,
    employee1.employmentStatus,
    updatedEmployee1.isActive
  );

  const finalUser1 = await clerkClient.users.getUser(emp.clerkUserId);
  console.log('\n  RESULT:');
  console.log('    action:', syncResult1.action);
  console.log('    User locked:', finalUser1.locked ? 'YES 🔒' : 'NO 🔓');

  if (!finalUser1.locked && syncResult1.action === 'unlocked') {
    console.log('\n  ✅ SCENARIO 1 PASSED: User unlocked when both status and isActive changed\n');
  } else {
    console.log('\n  ❌ SCENARIO 1 FAILED: User should be unlocked\n');
  }

  console.log('\n[SCENARIO 2] Inactive → Active, isActive stays false (only status changed)\n');

  // Reset
  await clerkClient.users.lockUser(emp.clerkUserId);

  const employee2 = {
    ...emp,
    employmentStatus: 'Inactive',
    isActive: false
  };

  const updateData2 = {
    employmentStatus: 'Active'
    // isActive NOT changed
  };

  const updatedEmployee2 = {
    ...employee2,
    employmentStatus: 'Active',
    isActive: false  // Still false
  };

  console.log('  oldStatus: Inactive');
  console.log('  newStatus: Active');
  console.log('  isActive: false (unchanged)');

  console.log('\n  Calling syncClerkLockStatus...');
  const syncResult2 = await employeeStatusService.default.syncClerkLockStatus(
    emp.clerkUserId,
    updateData2.employmentStatus,
    employee2.employmentStatus,
    updatedEmployee2.isActive
  );

  const finalUser2 = await clerkClient.users.getUser(emp.clerkUserId);
  console.log('\n  RESULT:');
  console.log('    action:', syncResult2.action);
  console.log('    User locked:', finalUser2.locked ? 'YES 🔒' : 'NO 🔓');

  if (finalUser2.locked && syncResult2.action === 'locked') {
    console.log('\n  ✅ SCENARIO 2 PASSED: User stays locked because isActive=false');
    console.log('     (This is CORRECT - isActive=false means the account is disabled)\n');
  } else {
    console.log('\n  ⚠️  SCENARIO 2: User unlocked despite isActive=false');
    console.log('     (This may be intentional if you want status to override isActive)\n');
  }

  // Cleanup
  await clerkClient.users.unlockUser(emp.clerkUserId);
  await employeesDb.collection('employees').updateOne(
    { _id: emp._id },
    { $set: { employmentStatus: 'Active', isActive: true } }
  );

  await client.close();

  console.log('\n=== SUMMARY ===');
  console.log('If you want to unlock an employee, you need to:');
  console.log('1. Change employmentStatus to Active (or other non-lockable status)');
  console.log('2. AND ensure isActive is true');
  console.log('');
  console.log('If isActive is false, the employee will remain locked');
  console.log('regardless of employmentStatus.\n');
}

main().catch(console.error);
