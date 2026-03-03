/**
 * Quick diagnostic script to check lock/unlock status
 */

// Load environment variables FIRST before importing anything
import dotenv from 'dotenv';
dotenv.config();

import { clerkClient } from '@clerk/clerk-sdk-node';
import { MongoClient } from 'mongodb';

// Verify environment is loaded
if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in environment variables');
  console.error('Current .env file location:', process.cwd());
  process.exit(1);
}

// Create client directly to avoid db.js import issues
const client = new MongoClient(process.env.MONGODB_URI);

async function main() {
  console.log('=== Clerk Lock/Unlock Diagnostic ===\n');

  // Connect to MongoDB
  await client.connect();
  console.log('Connected to MongoDB\n');

  // Get company ID from first company
  const db = client.db('AmasQIS');
  const companies = await db.collection('companies').find({}, {projection: {name: 1, _id: 1}}).limit(1).toArray();

  if (companies.length === 0) {
    console.log('No companies found');
    await client.close();
    process.exit(1);
  }

  const companyId = companies[0]._id.toString();
  console.log(`Using Company: ${companyId}\n`);

  // Get employees with clerkUserId
  const employeesDb = client.db(companyId);
  const employees = await employeesDb.collection('employees').find({
    isDeleted: { $ne: true },
    clerkUserId: { $exists: true, $ne: null }
  }).limit(10).toArray();

  console.log(`Found ${employees.length} employees linked to Clerk\n`);

  for (const emp of employees) {
    console.log(`\n--- Employee: ${emp.employeeId} ---`);
    console.log(`Name: ${emp.firstName} ${emp.lastName}`);
    console.log(`Status: ${emp.employmentStatus || emp.status || 'N/A'}`);
    console.log(`isActive: ${emp.isActive}`);
    console.log(`Clerk ID: ${emp.clerkUserId}`);

    // Check Clerk status
    try {
      const user = await clerkClient.users.getUser(emp.clerkUserId);
      const isLocked = !!(user?.locked);

      console.log(`Clerk Status: ${isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}`);
      if (user.locked) {
        console.log(`Locked At: ${new Date(user.locked).toISOString()}`);
      }

      // Check if in sync
      const shouldLock = emp.employmentStatus === 'Inactive' ||
                        emp.employmentStatus === 'Terminated' ||
                        emp.employmentStatus === 'Resigned' ||
                        emp.status === 'Inactive' ||
                        emp.status === 'Terminated' ||
                        emp.status === 'Resigned' ||
                        emp.isActive === false;

      const inSync = shouldLock === isLocked;
      console.log(`Sync Status: ${inSync ? '✅ IN SYNC' : '❌ MISMATCH'}`);
      console.log(`  - Should be locked: ${shouldLock}`);
      console.log(`  - Is locked: ${isLocked}`);

    } catch (error) {
      console.log(`Clerk Error: ${error.message}`);
    }
  }

  console.log('\n\n=== Testing Unlock on a Locked User ===');

  // Find a user who is locked in Clerk but should be unlocked
  for (const emp of employees) {
    try {
      const user = await clerkClient.users.getUser(emp.clerkUserId);
      if (user.locked) {
        const shouldLock = emp.employmentStatus === 'Inactive' ||
                          emp.employmentStatus === 'Terminated' ||
                          emp.employmentStatus === 'Resigned' ||
                          emp.status === 'Inactive' ||
                          emp.status === 'Terminated' ||
                          emp.status === 'Resigned' ||
                          emp.isActive === false;

        if (!shouldLock) {
          console.log(`\nFound MISMATCH: ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
          console.log(`Status: ${emp.employmentStatus || emp.status}, isActive: ${emp.isActive}`);
          console.log(`Clerk: LOCKED (locked: ${user.locked})`);

          // Try to unlock
          console.log(`\n>>> Attempting to unlock...`);
          const beforeUser = await clerkClient.users.getUser(emp.clerkUserId);
          console.log(`Before unlock: locked = ${!!beforeUser.locked}`);

          await clerkClient.users.unlockUser(emp.clerkUserId);
          console.log(`unlockUser API call completed`);

          // Wait a bit and check again
          await new Promise(resolve => setTimeout(resolve, 1000));

          const afterUser = await clerkClient.users.getUser(emp.clerkUserId);
          console.log(`After unlock: locked = ${!!afterUser.locked}, locked = ${afterUser.locked || 'null'}`);

          if (afterUser.locked) {
            console.log(`\n⚠️  UNLOCK FAILED - User is still locked!`);
          } else {
            console.log(`\n✅ UNLOCK SUCCESSFUL!`);
          }

          break; // Only test one user
        }
      }
    } catch (error) {
      // Skip errors
    }
  }

  await client.close();
  console.log('\n=== Diagnostic Complete ===');
}

main().catch(err => {
  console.error('ERROR:', err.message);
  console.error(err.stack);
  process.exit(1);
});
