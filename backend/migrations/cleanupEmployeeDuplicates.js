/**
 * MongoDB Migration: Clean up duplicate employee data
 *
 * This script migrates employee documents to use the canonical schema structure:
 * - Moves data from legacy nested fields to canonical root-level fields
 * - Removes duplicate fields (contact, personal.birthday, personal.gender, personal.address)
 *
 * Run with: node migrations/cleanupEmployeeDuplicates.js
 */

import { client } from '../config/db.js';
import { getTenantCollections, connectDB } from '../config/db.js';
import { devLog, devError, devWarn } from '../utils/logger.js';

/**
 * Get all company IDs from the companies collection
 */
async function getAllCompanyIds() {
  try {
    const { getsuperadminCollections } = await import('../config/db.js');
    const { companiesCollection } = getsuperadminCollections();
    const companies = await companiesCollection.find({}, { projection: { _id: 1, name: 1 } }).toArray();
    return companies.map(c => c._id.toString());
  } catch (error) {
    devError('Error getting company IDs:', error);
    return [];
  }
}

/**
 * Clean up duplicate data for a single company
 */
async function cleanupCompanyEmployees(companyId) {
  const collections = getTenantCollections(companyId);

  console.log(`[Migration] Processing company: ${companyId}`);

  // Get all employees with duplicate data
  const employees = await collections.employees.find({
    $or: [
      { 'contact.email': { $exists: true } },
      { 'contact.phone': { $exists: true } },
      { 'personal.birthday': { $exists: true } },
      { 'personal.gender': { $exists: true } },
      { 'personal.address': { $exists: true } }
    ]
  }).toArray();

  console.log(`[Migration] Found ${employees.length} employees with duplicate data in company ${companyId}`);

  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const employee of employees) {
    try {
      const updates = {};
      const unsets = {};
      let hasChanges = false;

      // Migrate contact.email -> email
      if (employee.contact?.email && !employee.email) {
        updates.email = employee.contact.email;
        hasChanges = true;
        console.log(`[Migration] Migrating contact.email -> email for employee ${employee._id}`);
      }

      // Migrate contact.phone -> phone
      if (employee.contact?.phone && !employee.phone) {
        updates.phone = employee.contact.phone;
        hasChanges = true;
        console.log(`[Migration] Migrating contact.phone -> phone for employee ${employee._id}`);
      }

      // Migrate personal.birthday -> dateOfBirth
      if (employee.personal?.birthday && !employee.dateOfBirth) {
        updates.dateOfBirth = employee.personal.birthday;
        hasChanges = true;
        console.log(`[Migration] Migrating personal.birthday -> dateOfBirth for employee ${employee._id}`);
      }

      // Migrate personal.gender -> gender
      if (employee.personal?.gender && !employee.gender) {
        updates.gender = employee.personal.gender;
        hasChanges = true;
        console.log(`[Migration] Migrating personal.gender -> gender for employee ${employee._id}`);
      }

      // Migrate personal.address -> address
      if (employee.personal?.address && !employee.address) {
        updates.address = employee.personal.address;
        hasChanges = true;
        console.log(`[Migration] Migrating personal.address -> address for employee ${employee._id}`);
      }

      // Mark duplicate fields for removal
      if (employee.contact) {
        unsets.contact = '';
        hasChanges = true;
        console.log(`[Migration] Removing contact object for employee ${employee._id}`);
      }

      if (employee.personal?.birthday) {
        unsets['personal.birthday'] = '';
        hasChanges = true;
        console.log(`[Migration] Removing personal.birthday for employee ${employee._id}`);
      }

      if (employee.personal?.gender) {
        unsets['personal.gender'] = '';
        hasChanges = true;
        console.log(`[Migration] Removing personal.gender for employee ${employee._id}`);
      }

      if (employee.personal?.address) {
        unsets['personal.address'] = '';
        hasChanges = true;
        console.log(`[Migration] Removing personal.address for employee ${employee._id}`);
      }

      if (hasChanges) {
        updates.updatedAt = new Date();

        await collections.employees.updateOne(
          { _id: employee._id },
          {
            $set: updates,
            $unset: unsets
          }
        );
        processedCount++;
      } else {
        skippedCount++;
      }

    } catch (error) {
      errorCount++;
      console.error(`[Migration] Error processing employee ${employee._id}:`, error);
    }
  }

  return { processedCount, skippedCount, errorCount };
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('[Migration] ================================================');
  console.log('[Migration] Starting Employee Data Cleanup Migration');
  console.log('[Migration] ================================================');

  try {
    // Connect to MongoDB
    await connectDB();
    console.log('[Migration] Connected to MongoDB');

    // Get all companies
    const companyIds = await getAllCompanyIds();
    console.log(`[Migration] Found ${companyIds.length} companies`);

    if (companyIds.length === 0) {
      console.warn('[Migration] No companies found. Skipping migration.');
      return;
    }

    // Process each company
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const companyId of companyIds) {
      console.log(`[Migration] Processing company: ${companyId}`);
      const result = await cleanupCompanyEmployees(companyId);
      console.log(`[Migration] Company ${companyId} - Processed: ${result.processedCount}, Skipped: ${result.skippedCount}, Errors: ${result.errorCount}`);
      totalProcessed += result.processedCount;
      totalSkipped += result.skippedCount;
      totalErrors += result.errorCount;
    }

    console.log('[Migration] ================================================');
    console.log('[Migration] Migration Complete!');
    console.log('[Migration] ================================================');
    console.log(`[Migration] Total employees processed: ${totalProcessed}`);
    console.log(`[Migration] Total employees skipped (no changes needed): ${totalSkipped}`);
    console.log(`[Migration] Total errors: ${totalErrors}`);
    console.log('[Migration] ================================================');

  } catch (error) {
    console.error('[Migration] Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('[Migration] MongoDB connection closed');
  }
}

// Run migration if this script is executed directly
const isModule = process.argv[2] === '--module';

if (!isModule) {
  runMigration()
    .then(() => {
      console.log('[Migration] ✓ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Migration] ✗ Migration failed:', error);
      process.exit(1);
    });
}

export default runMigration;
