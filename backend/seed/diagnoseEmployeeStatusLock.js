/**
 * Employee Status Lock Diagnostics
 * Tests and verifies the employee status lock/unlock functionality
 *
 * Usage:
 *   node backend/seed/diagnoseEmployeeStatusLock.js
 *   node backend/seed/diagnoseEmployeeStatusLock.js --employee-id EMP-1234
 *   node backend/seed/diagnoseEmployeeStatusLock.js --test-lock <clerkUserId>
 *   node backend/seed/diagnoseEmployeeStatusLock.js --test-unlock <clerkUserId>
 */

import dotenv from 'dotenv';
dotenv.config();

import { clerkClient } from '@clerk/clerk-sdk-node';
import { client, getTenantCollections } from '../config/db.js';
import employeeStatusService from '../services/employee/employeeStatus.service.js';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('');
  log('═'.repeat(60), 'cyan');
  log(`  ${title}`, 'cyan');
  log('═'.repeat(60), 'cyan');
}

/**
 * Check if a Clerk user is locked
 */
async function checkClerkUserLockStatus(clerkUserId) {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    return {
      exists: true,
      locked: !!(user?.lockedAt),
      lockedAt: user?.lockedAt,
      email: user?.primaryEmailAddress?.emailAddress,
      firstName: user?.firstName,
      lastName: user?.lastName
    };
  } catch (error) {
    return {
      exists: false,
      error: error.message
    };
  }
}

/**
 * Diagnose a specific employee
 */
async function diagnoseEmployee(employeeId, companyId) {
  logSection(`Diagnosing Employee: ${employeeId}`);

  const collections = getTenantCollections(companyId);
  const employee = await collections.employees.findOne({ employeeId });

  if (!employee) {
    log(`❌ Employee not found in database`, 'red');
    return null;
  }

  log(`✓ Employee found in database`, 'green');
  log(`  - Name: ${employee.firstName} ${employee.lastName}`, 'reset');
  log(`  - Email: ${employee.email}`, 'reset');
  log(`  - Clerk User ID: ${employee.clerkUserId || 'Not linked'}`, 'reset');
  log(`  - Status: ${employee.employmentStatus || employee.status || 'N/A'}`, 'reset');
  log(`  - isActive: ${employee.isActive}`, 'reset');
  log(`  - isDeleted: ${employee.isDeleted}`, 'reset');

  // Check if employee should be locked
  const validation = employeeStatusService.validateEmployeeAccess(employee);
  log(`\n  Access Validation:`, validation.canAccess ? 'green' : 'red');
  log(`    - Can Access: ${validation.canAccess}`, 'reset');
  log(`    - Reason: ${validation.reason}`, 'reset');
  log(`    - Code: ${validation.code}`, 'reset');

  // Check Clerk lock status
  if (employee.clerkUserId) {
    log(`\n  Clerk Status:`, 'blue');
    const clerkStatus = await checkClerkUserLockStatus(employee.clerkUserId);

    if (!clerkStatus.exists) {
      log(`    - Clerk user not found (may have been deleted)`, 'yellow');
    } else {
      log(`    - Email: ${clerkStatus.email}`, 'reset');
      log(`    - Locked: ${clerkStatus.locked ? '🔒 Yes' : '🔓 No'}`, clerkStatus.locked ? 'red' : 'green');
      if (clerkStatus.lockedAt) {
        log(`    - Locked At: ${new Date(clerkStatus.lockedAt).toISOString()}`, 'reset');
      }
    }

    // Check if database status matches Clerk lock status
    const shouldBeLocked = !validation.canAccess;
    const isLockedInClerk = clerkStatus.locked;

    log(`\n  Sync Status:`, 'blue');
    if (shouldBeLocked === isLockedInClerk) {
      log(`    ✅ Database status matches Clerk lock status`, 'green');
    } else {
      log(`    ⚠️  MISMATCH detected!`, 'yellow');
      log(`       - Database says: ${shouldBeLocked ? 'Should be locked' : 'Should be unlocked'}`, 'yellow');
      log(`       - Clerk status: ${isLockedInClerk ? 'Locked' : 'Unlocked'}`, 'yellow');
      log(`       - Action needed: ${shouldBeLocked ? 'Lock user in Clerk' : 'Unlock user in Clerk'}`, 'yellow');
    }

    return {
      employee,
      validation,
      clerkStatus,
      inSync: shouldBeLocked === isLockedInClerk
    };
  } else {
    log(`\n  ⚠️  No Clerk User ID - employee not linked to Clerk`, 'yellow');
    return {
      employee,
      validation,
      clerkStatus: null,
      inSync: null
    };
  }
}

/**
 * Test lock functionality
 */
async function testLock(clerkUserId) {
  logSection(`Testing Lock Function: ${clerkUserId}`);

  const beforeStatus = await checkClerkUserLockStatus(clerkUserId);
  log(`Before:`, beforeStatus.locked ? 'red' : 'green');
  log(`  - Locked: ${beforeStatus.locked ? '🔒 Yes' : '🔓 No'}`, 'reset');

  log(`\n⏳ Locking user...`, 'yellow');
  const result = await employeeStatusService.lockUserInClerk(clerkUserId);
  log(`Result: ${result.success ? '✅ Success' : '❌ Failed'}`, result.success ? 'green' : 'red');
  log(`  - Message: ${result.message}`, 'reset');

  const afterStatus = await checkClerkUserLockStatus(clerkUserId);
  log(`\nAfter:`, afterStatus.locked ? 'red' : 'green');
  log(`  - Locked: ${afterStatus.locked ? '🔒 Yes' : '🔓 No'}`, 'reset');

  return result;
}

/**
 * Test unlock functionality
 */
async function testUnlock(clerkUserId) {
  logSection(`Testing Unlock Function: ${clerkUserId}`);

  const beforeStatus = await checkClerkUserLockStatus(clerkUserId);
  log(`Before:`, beforeStatus.locked ? 'red' : 'green');
  log(`  - Locked: ${beforeStatus.locked ? '🔒 Yes' : '🔓 No'}`, 'reset');

  log(`\n⏳ Unlocking user...`, 'yellow');
  const result = await employeeStatusService.unlockUserInClerk(clerkUserId);
  log(`Result: ${result.success ? '✅ Success' : '❌ Failed'}`, result.success ? 'green' : 'red');
  log(`  - Message: ${result.message}`, 'reset');

  const afterStatus = await checkClerkUserLockStatus(clerkUserId);
  log(`\nAfter:`, afterStatus.locked ? 'red' : 'green');
  log(`  - Locked: ${afterStatus.locked ? '🔒 Yes' : '🔓 No'}`, 'reset');

  return result;
}

/**
 * List all employees with their status
 */
async function listAllEmployees(companyId) {
  logSection('All Employees Status Check');

  const collections = getTenantCollections(companyId);
  const employees = await collections.employees.find({
    isDeleted: { $ne: true }
  }).toArray();

  log(`Total employees: ${employees.length}`, 'blue');

  let lockedInClerk = 0;
  let shouldBeLocked = 0;
  let mismatches = 0;
  let notLinkedToClerk = 0;

  for (const emp of employees) {
    const validation = employeeStatusService.validateEmployeeAccess(emp);
    const shouldLock = !validation.canAccess;

    if (shouldLock) shouldBeLocked++;

    let clerkLocked = false;
    if (emp.clerkUserId) {
      const clerkStatus = await checkClerkUserLockStatus(emp.clerkUserId);
      clerkLocked = clerkStatus.locked;
      if (clerkLocked) lockedInClerk++;

      if (shouldLock !== clerkLocked) {
        mismatches++;
        log(`\n⚠️  MISMATCH: ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`, 'yellow');
        log(`    Status: ${emp.employmentStatus || emp.status || 'N/A'}`, 'reset');
        log(`    isActive: ${emp.isActive}`, 'reset');
        log(`    Should be locked: ${shouldLock}`, 'reset');
        log(`    Clerk locked: ${clerkLocked}`, 'reset');
      }
    } else {
      notLinkedToClerk++;
    }
  }

  logSection('Summary');
  log(`Total employees: ${employees.length}`, 'blue');
  log(`Should be locked (inactive): ${shouldBeLocked}`, 'red');
  log(`Locked in Clerk: ${lockedInClerk}`, 'red');
  log(`Not linked to Clerk: ${notLinkedToClerk}`, 'yellow');
  log(`Mismatches found: ${mismatches}`, mismatches > 0 ? 'red' : 'green');

  if (mismatches > 0) {
    log(`\n⚠️  Action required: Run sync to fix mismatches`, 'yellow');
  } else {
    log(`\n✅ All employees are in sync!`, 'green');
  }

  return {
    total: employees.length,
    shouldBeLocked,
    lockedInClerk,
    notLinkedToClerk,
    mismatches
  };
}

/**
 * Sync all employee lock statuses with Clerk
 */
async function syncAllLockStatuses(companyId) {
  logSection('Syncing All Employee Lock Statuses with Clerk');

  const collections = getTenantCollections(companyId);
  const employees = await collections.employees.find({
    isDeleted: { $ne: true },
    clerkUserId: { $exists: true, $ne: null }
  }).toArray();

  log(`Found ${employees.length} employees linked to Clerk`, 'blue');

  const batchData = employees.map(emp => ({
    clerkUserId: emp.clerkUserId,
    status: emp.employmentStatus || emp.status || 'Active'
  }));

  log(`\n⏳ Syncing lock statuses...`, 'yellow');
  const result = await employeeStatusService.batchSyncClerkLockStatus(batchData);

  log(`\n✅ Sync complete:`, 'green');
  log(`  - Locked: ${result.locked}`, 'red');
  log(`  - Unlocked: ${result.unlocked}`, 'green');
  log(`  - Failed: ${result.failed}`, 'red');

  if (result.failed > 0) {
    log(`\n⚠️  Failed operations:`, 'yellow');
    for (const fail of result.results.filter(r => !r.success)) {
      log(`  - ${fail.clerkUserId}: ${fail.message}`, 'yellow');
    }
  }

  return result;
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  const companyId = process.env.DEV_COMPANY_ID || process.env.DEFAULT_COMPANY_ID;

  if (!companyId) {
    log('❌ No company ID found. Set DEV_COMPANY_ID or DEFAULT_COMPANY_ID in .env', 'red');
    process.exit(1);
  }

  log('Employee Status Lock Diagnostics', 'bright');
  log(`Company ID: ${companyId}`, 'blue');

  try {
    if (args.includes('--test-lock')) {
      const clerkUserId = args[args.indexOf('--test-lock') + 1];
      if (!clerkUserId) {
        log('❌ Please provide clerkUserId after --test-lock', 'red');
        process.exit(1);
      }
      await testLock(clerkUserId);
    } else if (args.includes('--test-unlock')) {
      const clerkUserId = args[args.indexOf('--test-unlock') + 1];
      if (!clerkUserId) {
        log('❌ Please provide clerkUserId after --test-unlock', 'red');
        process.exit(1);
      }
      await testUnlock(clerkUserId);
    } else if (args.includes('--sync')) {
      await syncAllLockStatuses(companyId);
    } else if (args.includes('--employee-id')) {
      const employeeId = args[args.indexOf('--employee-id') + 1];
      if (!employeeId) {
        log('❌ Please provide employee ID after --employee-id', 'red');
        process.exit(1);
      }
      await diagnoseEmployee(employeeId, companyId);
    } else {
      // Default: list all employees
      const summary = await listAllEmployees(companyId);

      if (summary.mismatches > 0) {
        log(`\n💡 To fix mismatches, run: node backend/seed/diagnoseEmployeeStatusLock.js --sync`, 'cyan');
      }
    }

    log('\n✅ Done!', 'green');
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
