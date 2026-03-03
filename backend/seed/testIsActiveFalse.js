/**
 * Test when isActive is false
 */

import dotenv from 'dotenv';
dotenv.config();

import { clerkClient } from '@clerk/clerk-sdk-node';
import { MongoClient, ObjectId } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

async function main() {
  console.log('=== Testing isActive=false Scenario ===\n');

  await client.connect();

  const db = client.db('AmasQIS');
  const companies = await db.collection('companies').find({}, {projection: {_id: 1}}).limit(1).toArray();
  const companyId = companies[0]._id.toString();
  const employeesDb = client.db(companyId);

  const employeeStatusService = await import('../services/employee/employeeStatus.service.js');

  // Find an employee
  const employees = await employeesDb.collection('employees').find({
    isDeleted: { $ne: true },
    clerkUserId: { $exists: true, $ne: null }
  }).limit(1).toArray();

  const emp = employees[0];

  console.log('[SCENARIO] Employee has isActive=false, status changes from Inactive to Active\n');

  // Initial state
  const employee = {
    ...emp,
    employmentStatus: 'Inactive',
    isActive: false  // Employee is inactive!
  };

  // Frontend sends update
  const normalizedUpdateData = {
    employmentStatus: 'Active'
    // Note: isActive is NOT being changed from false to true!
  };

  // After DB update
  const updatedEmployee = {
    ...employee,
    employmentStatus: 'Active',
    isActive: false  // Still false because it wasn't updated
  };

  console.log('BEFORE UPDATE:');
  console.log('  employmentStatus:', employee.employmentStatus);
  console.log('  isActive:', employee.isActive);

  console.log('\nAFTER UPDATE (what controller sees):');
  console.log('  employmentStatus:', updatedEmployee.employmentStatus);
  console.log('  isActive:', updatedEmployee.isActive);

  // NEW Controller logic (after fix)
  const oldStatus = employee.employmentStatus;
  const newStatus = normalizedUpdateData.employmentStatus;

  console.log('\nNEW CONTROLLER LOGIC (after fix):');
  console.log('  oldStatus:', oldStatus);
  console.log('  newStatus:', newStatus);
  console.log('  updatedEmployee.isActive:', updatedEmployee.isActive);

  // After fix: controller passes actual status and isActive
  const passedStatus = newStatus;
  const passedIsActive = updatedEmployee.isActive;

  console.log('\n  Parameters to syncClerkLockStatus:');
  console.log('    clerkUserId:', emp.clerkUserId);
  console.log('    newStatus:', passedStatus);
  console.log('    oldStatus:', oldStatus);
  console.log('    isActive:', passedIsActive);

  // Test actual call
  await clerkClient.users.lockUser(emp.clerkUserId);

  console.log('\nCALLING syncClerkLockStatus...');
  const syncResult = await employeeStatusService.default.syncClerkLockStatus(
    emp.clerkUserId,
    passedStatus,
    oldStatus,
    passedIsActive  // Now passing isActive parameter
  );

  console.log('\nRESULT:');
  console.log('  action:', syncResult.action);
  console.log('  success:', syncResult.success);

  const finalUser = await clerkClient.users.getUser(emp.clerkUserId);
  console.log('  User locked:', finalUser.locked ? 'YES 🔒' : 'NO 🔓');

  // Cleanup
  if (finalUser.locked) {
    await clerkClient.users.unlockUser(emp.clerkUserId);
  }
  await employeesDb.collection('employees').updateOne(
    { _id: emp._id },
    { $set: { employmentStatus: 'Active', isActive: true } }
  );

  await client.close();

  if (!finalUser.locked && syncResult.action === 'unlocked') {
    console.log('\n✅ FIX WORKS! User was unlocked despite isActive=false');
    console.log('   The syncClerkLockStatus now correctly handles the isActive parameter');
    process.exit(0);
  } else {
    console.log('\n❌ Still not working correctly');
    process.exit(1);
  }
}

main().catch(console.error);
