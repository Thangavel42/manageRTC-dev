/**
 * Fix Employee Role in Clerk Metadata - Version 2
 *
 * This script searches for an employee across ALL tenant databases
 * and updates their role in Clerk's publicMetadata to match their database role.
 * It also fixes the isDeleted flag if set to true.
 *
 * Usage: node backend/seed/fix-employee-role-in-clerk-v2.js <employee_clerkUserId>
 */

import 'dotenv/config';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { connectDB, client } from '../config/db.js';

const CLERK_USER_ID = process.argv[2]; // The clerkUserId from employee document

if (!CLERK_USER_ID) {
  console.error('❌ Please provide clerkUserId as argument:');
  console.error('   node backend/seed/fix-employee-role-in-clerk-v2.js user_39SByLX1SOIXX8SY4XQhy08qvPc');
  process.exit(1);
}

async function findEmployeeAcrossDbs(clerkUserId) {
  console.log('--- Searching for employee across all databases ---');

  const adminDb = client.db().admin();
  const result = await adminDb.listDatabases();

  for (const dbInfo of result.databases) {
    if (dbInfo.name === 'admin' || dbInfo.name === 'local') continue;

    try {
      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();

      if (collections.some(c => c.name === 'employees')) {
        const employee = await db.collection('employees').findOne({ clerkUserId });
        if (employee) {
          console.log(`✅ Found in database: ${dbInfo.name}`);
          return { employee, dbName: dbInfo.name, db };
        }
      }
    } catch (error) {
      // Skip databases we can't access
    }
  }

  return null;
}

async function fixEmployeeRole() {
  console.log('🔧 Fixing Employee Role in Clerk Metadata\n');
  console.log(`👤 Clerk User ID: ${CLERK_USER_ID}\n`);

  // Connect to database first
  console.log('--- Connecting to database ---');
  await connectDB();
  console.log('✅ Database connected\n');

  try {
    // Step 1: Get the user from Clerk
    console.log('--- Step 1: Fetching user from Clerk ---');
    const clerkUser = await clerkClient.users.getUser(CLERK_USER_ID);

    if (!clerkUser) {
      console.error('❌ User not found in Clerk:', CLERK_USER_ID);
      return;
    }

    console.log('✅ User found in Clerk');
    console.log('   Current publicMetadata.role:', clerkUser.publicMetadata?.role || 'NOT SET');
    console.log('   Email:', clerkUser.emailAddresses[0]?.emailAddress);
    console.log('   Name:', `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim());

    // Step 2: Search for employee across all databases
    const { employee, dbName, db } = await findEmployeeAcrossDbs(CLERK_USER_ID);

    if (!employee) {
      console.log('❌ Employee not found in any database');
      return;
    }

    console.log('\n--- Step 2: Employee Details ---');
    console.log('   Database:', dbName);
    console.log('   _id:', employee._id);
    console.log('   employeeId:', employee.employeeId);
    console.log('   Name:', `${employee.firstName} ${employee.lastName}`);
    console.log('   Email:', employee.email);
    console.log('   Database role:', employee.role);
    console.log('   Account role:', employee.account?.role);
    console.log('   isDeleted:', employee.isDeleted);
    console.log('   Status:', employee.status);
    console.log('   isActive:', employee.isActive);

    // Step 3: Determine the correct role from database
    const correctRole = employee.account?.role?.toLowerCase() || employee.role?.toLowerCase() || 'employee';
    console.log(`\n   🎯 Determined role from database: ${correctRole}`);

    // Step 4: Update Clerk user metadata
    console.log('\n--- Step 3: Updating Clerk user metadata ---');

    const updatedUser = await clerkClient.users.updateUser(CLERK_USER_ID, {
      publicMetadata: {
        ...clerkUser.publicMetadata,
        role: correctRole,
        employeeId: employee.employeeId?.toString() || null,
        companyId: clerkUser.publicMetadata?.companyId || dbName
      }
    });

    console.log('✅ Clerk metadata updated successfully!');
    console.log('   Old role:', clerkUser.publicMetadata?.role || 'NOT SET');
    console.log('   New role:', updatedUser.publicMetadata.role);
    console.log('   employeeId:', updatedUser.publicMetadata.employeeId);

    // Step 5: Fix isDeleted flag if needed
    if (employee.isDeleted) {
      console.log('\n--- Step 4: Fixing isDeleted flag ---');

      await db.collection('employees').updateOne(
        { _id: employee._id },
        {
          $set: {
            isDeleted: false,
            status: 'Active',
            isActive: true,
            deletedAt: null,
            deletedBy: null
          }
        }
      );

      console.log('✅ Employee reactivated (isDeleted flag removed)');
    } else {
      console.log('\n--- Step 4: isDeleted flag is already correct (false) ---');
    }

    console.log('\n--- ✅ FIX COMPLETE ---');
    console.log('Please ask the user to:');
    console.log('1. Sign out from their account');
    console.log('2. Sign back in');
    console.log('3. The menu should now appear correctly');

  } catch (error) {
    if (error?.errors?.[0]?.message?.includes('Member not found')) {
      console.error('\n❌ ERROR: Clerk member not found!');
      console.error('   This user was likely deleted from Clerk but still exists in the database.');
      console.error('   Solution: The user needs to be recreated in Clerk first.');
    } else {
      console.error('\n❌ Error:', error.message);
      if (error.errors) {
        console.error('   Details:', JSON.stringify(error.errors, null, 2));
      }
    }
  }
}

// Run the fix
fixEmployeeRole().then(() => {
  console.log('\nDone.');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
