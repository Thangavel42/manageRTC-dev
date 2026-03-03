/**
 * Backfill Script: Sync Approved Leaves to Attendance Records
 *
 * This script creates attendance records for all existing approved leaves
 * that don't have corresponding attendance records with "on-leave" status.
 *
 * Usage:
 *   node backend/seed/backfillLeaveAttendance.js
 *   node backend/seed/backfillLeaveAttendance.js --company <companyId>
 *   node backend/seed/backfillLeaveAttendance.js --employee <employeeId>
 *
 * Options:
 *   --company <companyId>  - Process only this company
 *   --employee <employeeId> - Process only this employee
 *   --dry-run             - Show what would be done without making changes
 *   --verbose             - Show detailed output
 */

import { getTenantCollections } from '../config/db.js';
import leaveAttendanceSyncService from '../services/leaves/leaveAttendanceSync.service.js';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  companyId: null,
  employeeId: null,
  dryRun: false,
  verbose: false
};

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--company':
      options.companyId = args[++i];
      break;
    case '--employee':
      options.employeeId = args[++i];
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--help':
      console.log(`
Usage: node backfillLeaveAttendance.js [options]

Options:
  --company <companyId>  Process only this company (default: all companies)
  --employee <employeeId> Process only this employee (default: all employees)
  --dry-run             Show what would be done without making changes
  --verbose             Show detailed output
  --help                Show this help message
      `);
      process.exit(0);
  }
}

/**
 * Get all companies from the database
 */
async function getAllCompanies() {
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost:27017');

  await client.connect();
  const db = client.db('AmasQIS'); // Main database

  const companies = await db.collection('companies')
    .find({ isDeleted: { $ne: true } })
    .project({ _id: 1, name: 1, companyId: 1 })
    .toArray();

  await client.close();
  return companies;
}

/**
 * Process a single company
 */
async function processCompany(company) {
  const companyId = company.companyId || company._id.toString();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Processing Company: ${company.name || companyId}`);
  console.log(`${'='.repeat(60)}`);

  try {
    const { leaves } = getTenantCollections(companyId);

    // Build filter for approved leaves
    const filter = {
      status: 'approved',
      isDeleted: { $ne: true }
    };

    if (options.employeeId) {
      filter.employeeId = options.employeeId;
    }

    // Get count first
    const totalLeaves = await leaves.countDocuments(filter);

    if (totalLeaves === 0) {
      console.log(`  No approved leaves found.`);
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    console.log(`  Found ${totalLeaves} approved leave(s) to process.`);

    // If dry-run, just show what would be done
    if (options.dryRun) {
      const sampleLeaves = await leaves.find(filter).limit(5).toArray();
      console.log(`\n  Sample leaves (first 5 of ${totalLeaves}):`);
      sampleLeaves.forEach((leave, i) => {
        console.log(`    ${i + 1}. ${leave.employeeId} - ${leave.leaveType} (${leave.startDate} to ${leave.endDate})`);
      });
      if (totalLeaves > 5) {
        console.log(`    ... and ${totalLeaves - 5} more`);
      }
      return { processed: totalLeaves, succeeded: totalLeaves, failed: 0 };
    }

    // Process the leaves
    const result = await leaveAttendanceSyncService.syncApprovedLeavesToAttendance(companyId);

    if (result.success) {
      console.log(`  ✓ Sync completed successfully`);
      console.log(`    Processed: ${result.results.processed}`);
      console.log(`    Succeeded: ${result.results.succeeded}`);
      console.log(`    Failed: ${result.results.failed}`);

      if (result.results.errors.length > 0) {
        console.log(`\n  Errors encountered:`);
        result.results.errors.forEach((error, i) => {
          if (options.verbose || i < 5) {
            console.log(`    ${i + 1}. Leave ${error.leaveId} (${error.employeeId}): ${error.error}`);
          }
        });
        if (result.results.errors.length > 5 && !options.verbose) {
          console.log(`    ... and ${result.results.errors.length - 5} more errors (use --verbose to see all)`);
        }
      }

      return result.results;
    } else {
      console.log(`  ✗ Sync failed: ${result.error}`);
      return { processed: 0, succeeded: 0, failed: totalLeaves };
    }

  } catch (error) {
    console.error(`  ✗ Error processing company:`, error.message);
    return { processed: 0, succeeded: 0, failed: 0 };
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`LEAVE → ATTENDANCE BACKFILL SCRIPT`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Started at: ${new Date().toISOString()}`);

  if (options.dryRun) {
    console.log(`** DRY RUN MODE ** - No changes will be made`);
  }

  const startTime = Date.now();
  let totalStats = { processed: 0, succeeded: 0, failed: 0 };

  try {
    let companies = [];

    if (options.companyId) {
      // Process specific company
      companies = [{ companyId: options.companyId, name: `Company ${options.companyId}` }];
    } else {
      // Get all companies
      companies = await getAllCompanies();
      if (companies.length === 0) {
        console.log('\nNo companies found in database.');
        return;
      }
    }

    console.log(`\nProcessing ${companies.length} company/companies...`);

    // Process each company
    for (const company of companies) {
      const stats = await processCompany(company);
      totalStats.processed += stats.processed;
      totalStats.succeeded += stats.succeeded;
      totalStats.failed += stats.failed;
    }

    // Print summary
    const elapsed = Date.now() - startTime;
    console.log(`\n${'='.repeat(60)}`);
    console.log(`SUMMARY`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Total Processed:  ${totalStats.processed}`);
    console.log(`Total Succeeded:  ${totalStats.succeeded}`);
    console.log(`Total Failed:     ${totalStats.failed}`);
    console.log(`Time Elapsed:     ${(elapsed / 1000).toFixed(2)}s`);
    console.log(`${'='.repeat(60)}\n`);

    if (totalStats.failed > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('\nFATAL ERROR:', error);
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);
