/**
 * Migration Script: Add Personal Information Fields
 *
 * This script adds the personal information object to existing employee records
 * that don't have it yet.
 *
 * Run: node backend/migrations/addPersonalInfoFields.js
 */

import { client, getTenantCollections } from '../config/db.js';

/**
 * Default personal information structure
 */
const DEFAULT_PERSONAL_INFO = {
  passport: {
    number: '',
    expiryDate: null,
    country: ''
  },
  nationality: '',
  religion: '',
  maritalStatus: 'Single',
  employmentOfSpouse: '',
  noOfChildren: 0
};

/**
 * Main migration function
 */
export async function up() {
  console.log('[Migration] Starting: Add Personal Information Fields');

  try {
    // Connect to database
    await client.connect();
    console.log('[Migration] Connected to database');

    // Get all company databases
    const adminDb = client.db('superadmin');
    const companies = await adminDb.collection('companies').find({}).toArray();

    console.log(`[Migration] Found ${companies.length} companies`);

    let totalUpdated = 0;
    let totalProcessed = 0;

    // Process each company's database
    for (const company of companies) {
      const companyId = company._id.toString();
      console.log(`[Migration] Processing company: ${company.name} (${companyId})`);

      try {
        const collections = getTenantCollections(companyId);

        // Count employees without personal field
        const employeesWithoutPersonal = await collections.employees.countDocuments({
          personal: { $exists: false }
        });

        if (employeesWithoutPersonal === 0) {
          console.log(`[Migration]   All employees already have personal field - skipping`);
          continue;
        }

        console.log(`[Migration]   Found ${employeesWithoutPersonal} employees without personal field`);

        // Update all employees without personal field
        const updateResult = await collections.employees.updateMany(
          {
            personal: { $exists: false },
            isDeleted: { $ne: true }
          },
          {
            $set: {
              personal: DEFAULT_PERSONAL_INFO,
              updatedAt: new Date()
            }
          }
        );

        totalUpdated += updateResult.modifiedCount || 0;
        totalProcessed += employeesWithoutPersonal;

        console.log(`[Migration]   Updated ${updateResult.modifiedCount} employees`);

      } catch (companyError) {
        console.error(`[Migration] Error processing company ${company.name}:`, companyError.message);
        // Continue with next company
      }
    }

    console.log(`[Migration] Complete!`);
    console.log(`[Migration]   Total employees processed: ${totalProcessed}`);
    console.log(`[Migration]   Total employees updated: ${totalUpdated}`);

    return {
      success: true,
      totalProcessed,
      totalUpdated
    };

  } catch (error) {
    console.error('[Migration] Fatal error:', error);
    throw error;
  } finally {
    await client.close();
    console.log('[Migration] Database connection closed');
  }
}

/**
 * Rollback function (optional - removes personal field from all employees)
 */
export async function down() {
  console.log('[Migration Rollback] Removing personal information fields');

  try {
    await client.connect();
    console.log('[Migration] Connected to database');

    const adminDb = client.db('superadmin');
    const companies = await adminDb.collection('companies').find({}).toArray();

    let totalRemoved = 0;

    for (const company of companies) {
      const companyId = company._id.toString();
      console.log(`[Migration] Processing company: ${company.name}`);

      try {
        const collections = getTenantCollections(companyId);

        const result = await collections.employees.updateMany(
          {
            personal: { $exists: true },
            isDeleted: { $ne: true }
          },
          {
            $unset: { personal: '' },
            $set: { updatedAt: new Date() }
          }
        );

        totalRemoved += result.modifiedCount || 0;
        console.log(`[Migration]   Removed personal field from ${result.modifiedCount} employees`);

      } catch (companyError) {
        console.error(`[Migration] Error processing company ${company.name}:`, companyError.message);
      }
    }

    console.log(`[Migration] Rollback complete! Removed personal field from ${totalRemoved} employees`);

    return {
      success: true,
      totalRemoved
    };

  } catch (error) {
    console.error('[Migration] Fatal error during rollback:', error);
    throw error;
  } finally {
    await client.close();
  }
}

/**
 * Validation function - check if migration is needed
 */
export async function validate() {
  console.log('[Migration Validate] Checking if personal information migration is needed');

  try {
    await client.connect();
    const adminDb = client.db('superadmin');
    const companies = await adminDb.collection('companies').find({}).toArray();

    let companiesNeedingMigration = 0;
    let totalEmployeesNeedingMigration = 0;

    for (const company of companies) {
      const collections = getTenantCollections(company._id.toString());

      const count = await collections.employees.countDocuments({
        personal: { $exists: false },
        isDeleted: { $ne: true }
      });

      if (count > 0) {
        companiesNeedingMigration++;
        totalEmployeesNeedingMigration += count;
        console.log(`[Migration Validate] ${company.name}: ${count} employees need migration`);
      }
    }

    console.log(`[Migration Validate] Summary:`);
    console.log(`[Migration Validate]   Companies needing migration: ${companiesNeedingMigration}`);
    console.log(`[Migration Validate]   Total employees needing migration: ${totalEmployeesNeedingMigration}`);

    if (totalEmployeesNeedingMigration > 0) {
      console.log('[Migration Validate] ⚠️  Migration is REQUIRED');
    } else {
      console.log('[Migration Validate] ✓ Migration is NOT needed (already applied)');
    }

    return {
      needsMigration: totalEmployeesNeedingMigration > 0,
      companiesNeedingMigration,
      totalEmployeesNeedingMigration
    };

  } catch (error) {
    console.error('[Migration Validate] Error:', error);
    throw error;
  } finally {
    await client.close();
  }
}

// Run migration if called directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const command = process.argv[2] || 'up';

  switch (command) {
    case 'up':
      up()
        .then(result => {
          console.log('[Migration] Success:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('[Migration] Failed:', error);
          process.exit(1);
        });
      break;

    case 'down':
      down()
        .then(result => {
          console.log('[Migration] Rollback complete:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('[Migration] Rollback failed:', error);
          process.exit(1);
        });
      break;

    case 'validate':
      validate()
        .then(result => {
          console.log('[Migration] Validation complete:', result);
          process.exit(0);
        })
        .catch(error => {
          console.error('[Migration] Validation failed:', error);
          process.exit(1);
        });
      break;

    default:
      console.log('Usage: node addPersonalInfoFields.js [up|down|validate]');
      console.log('  up       - Add personal information fields to employee records');
      console.log('  down     - Remove personal information fields (rollback)');
      console.log('  validate - Check if migration is needed');
      process.exit(1);
  }
}

export default { up, down, validate };
