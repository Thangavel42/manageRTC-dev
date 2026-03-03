/**
 * Debug Clerk lockUser API response
 */

import dotenv from 'dotenv';
dotenv.config();

import { clerkClient } from '@clerk/clerk-sdk-node';
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

async function main() {
  console.log('=== Debug Clerk Lock API ===\n');

  await client.connect();

  const db = client.db('AmasQIS');
  const companies = await db.collection('companies').find({}, {projection: {name: 1, _id: 1}}).limit(1).toArray();
  const companyId = companies[0]._id.toString();

  const employeesDb = client.db(companyId);
  const employees = await employeesDb.collection('employees').find({
    isDeleted: { $ne: true },
    clerkUserId: { $exists: true, $ne: null },
    employmentStatus: 'Active'
  }).limit(1).toArray();

  if (employees.length === 0) {
    console.log('No employees found');
    await client.close();
    process.exit(1);
  }

  const emp = employees[0];
  const clerkUserId = emp.clerkUserId;

  console.log(`Testing with: ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
  console.log(`Clerk ID: ${clerkUserId}\n`);

  // Check initial state
  console.log('[1] Before lockUser call:');
  const userBefore = await clerkClient.users.getUser(clerkUserId);
  console.log(`  lockedAt: ${userBefore?.lockedAt || 'null'}`);
  console.log(`  Full user object keys: ${Object.keys(userBefore).join(', ')}`);

  // Call lockUser and capture the response
  console.log('\n[2] Calling lockUser...');
  let lockResponse;
  try {
    lockResponse = await clerkClient.users.lockUser(clerkUserId);
    console.log(`  lockUser returned:`, JSON.stringify(lockResponse, null, 2));
  } catch (error) {
    console.log(`  lockUser threw error:`, error);
    await client.close();
    process.exit(1);
  }

  // Check if the response has a lockedAt field
  console.log('\n[3] Checking lock response:');
  console.log(`  Response has lockedAt: ${lockResponse?.lockedAt || 'null'}`);

  // Check user state after lock
  console.log('\n[4] After lockUser call (immediate):');
  const userAfter1 = await clerkClient.users.getUser(clerkUserId);
  console.log(`  lockedAt: ${userAfter1?.lockedAt || 'null'}`);

  // Wait and check again
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('\n[5] After lockUser call (2 seconds later):');
  const userAfter2 = await clerkClient.users.getUser(clerkUserId);
  console.log(`  lockedAt: ${userAfter2?.lockedAt || 'null'}`);

  // Try the alternative approach - update user with lockedAt
  console.log('\n[6] Trying alternative: updateUser...');
  try {
    const updateResponse = await clerkClient.users.updateUser(clerkUserId, {
      locked: true
    });
    console.log(`  updateUser response:`, JSON.stringify(updateResponse, null, 2));
  } catch (error) {
    console.log(`  updateUser threw error:`, error);
  }

  console.log('\n[7] After updateUser:');
  const userAfterUpdate = await clerkClient.users.getUser(clerkUserId);
  console.log(`  lockedAt: ${userAfterUpdate?.lockedAt || 'null'}`);

  await client.close();
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
