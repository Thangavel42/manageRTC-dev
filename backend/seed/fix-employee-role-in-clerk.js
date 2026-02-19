/**
 * Fix Employee Role in Clerk Metadata
 *
 * This script updates an employee's role in Clerk's publicMetadata
 * to match their role in the database.
 *
 * Usage: node backend/seed/fix-employee-role-in-clerk.js <employee_clerkUserId>
 */

import 'dotenv/config';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { getTenantCollections, connectDB } from '../config/db.js';

const CLERK_USER_ID = process.argv[2]; // The clerkUserId from employee document
const TARGET_ROLE = 'manager'; // or 'hr', 'superadmin', 'employee'

if (!CLERK_USER_ID) {
  console.error('❌ Please provide clerkUserId as argument:');
  console.error('   node backend/seed/fix-employee-role-in-clerk.js user_39SByLX1SOIXX8SY4XQhy08qvPc');
  process.exit(1);
}

async function fixEmployeeRole() {
  console.log('🔧 Fixing Employee Role in Clerk Metadata\n');
  console.log(`👤 Clerk User ID: ${CLERK_USER_ID}`);
  console.log(`🎯 Target Role: ${TARGET_ROLE}\n`);

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
    console.log('   Name:', `${clerkUser.firstName} ${clerkUser.lastName}`.trim());

    // Step 2: Get employee from database to find their correct role
    console.log('\n--- Step 2: Fetching employee from database ---');

    // Search in AmasQIS database
    const collections = getTenantCollections('AmasQIS');
    const employee = await collections.employees.findOne({
      clerkUserId: CLERK_USER_ID
    });

    if (!employee) {
      console.log('⚠️ Employee not found in AmasQIS database');
      console.log('   Searching across all departments might be needed...');
      return;
    }

    console.log('✅ Employee found in database');
    console.log('   _id:', employee._id);
    console.log('   employeeId:', employee.employeeId);
    console.log('   Database role:', employee.role);
    console.log('   Account role:', employee.account?.role);
    console.log('   isDeleted:', employee.isDeleted);

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
        companyId: clerkUser.publicMetadata?.companyId || 'AmasQIS'
      }
    });

    console.log('✅ Clerk metadata updated successfully!');
    console.log('   New role:', updatedUser.publicMetadata.role);
    console.log('   New employeeId:', updatedUser.publicMetadata.employeeId);

    // Step 5: Also fix isDeleted flag if needed
    if (employee.isDeleted) {
      console.log('\n--- Step 4: Fixing isDeleted flag ---');

      await collections.employees.updateOne(
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
