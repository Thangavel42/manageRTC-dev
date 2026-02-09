/**
 * Sync Employee Role from MongoDB to Clerk
 *
 * This script updates Clerk user's publicMetadata.role to match the MongoDB employee's account.role
 *
 * Usage: node scripts/syncEmployeeRoleToClerk.js <employeeEmail>
 *
 * Example: node scripts/syncEmployeeRoleToClerk.js hr1@gmail.com
 */

import { clerkClient } from '@clerk/clerk-sdk-node';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'manage-rtc';

async function syncEmployeeRole(email) {
  console.log(`[Sync Role] Starting sync for employee: ${email}`);

  let client;
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('[Sync Role] Connected to MongoDB');

    const db = client.db(DB_NAME);

    // Find employee by email
    const employee = await db.collection('employees').findOne({
      email: email,
      isDeleted: { $ne: true }
    });

    if (!employee) {
      console.error(`[Sync Role] Employee not found: ${email}`);
      return;
    }

    console.log('[Sync Role] Found employee:', {
      employeeId: employee.employeeId,
      name: `${employee.firstName} ${employee.lastName}`,
      clerkUserId: employee.clerkUserId,
      mongoRole: employee.account?.role
    });

    if (!employee.clerkUserId) {
      console.error('[Sync Role] Employee has no clerkUserId - cannot sync');
      return;
    }

    // Get the current role from MongoDB
    const mongoRole = employee.account?.role;
    if (!mongoRole) {
      console.error('[Sync Role] Employee has no role in account.role field');
      return;
    }

    // Normalize role to lowercase for Clerk
    const normalizedRole = mongoRole.toLowerCase();
    const validRoles = ['superadmin', 'admin', 'hr', 'manager', 'leads', 'employee'];

    if (!validRoles.includes(normalizedRole)) {
      console.error(`[Sync Role] Invalid role: ${mongoRole} (normalized: ${normalizedRole})`);
      return;
    }

    console.log(`[Sync Role] Syncing role to Clerk: ${mongoRole} -> ${normalizedRole}`);

    // Update Clerk user's metadata
    const updatedUser = await clerkClient.users.updateUser(employee.clerkUserId, {
      publicMetadata: {
        ...employee.publicMetadata, // Preserve existing metadata
        role: normalizedRole,
        companyId: employee.companyId || null,
        employeeId: employee.employeeId || null
      }
    });

    console.log('[Sync Role] ✓ Successfully updated Clerk user:', {
      clerkUserId: updatedUser.id,
      newRole: updatedUser.publicMetadata?.role,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.emailAddresses?.[0]?.emailAddress
    });

    console.log('[Sync Role] ✓ Please refresh your browser to see the updated sidebar menu');

  } catch (error) {
    console.error('[Sync Role] Error:', error.message);
    if (error.clerkError) {
      console.error('[Sync Role] Clerk Error:', error.clerkError);
    }
  } finally {
    if (client) {
      await client.close();
      console.log('[Sync Role] MongoDB connection closed');
    }
  }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.error('Usage: node syncEmployeeRoleToClerk.js <employeeEmail>');
  console.error('Example: node syncEmployeeRoleToClerk.js hr1@gmail.com');
  process.exit(1);
}

syncEmployeeRole(email);
