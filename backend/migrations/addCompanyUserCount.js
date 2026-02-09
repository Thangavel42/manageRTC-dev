/**
 * Company UserCount Migration Script
 *
 * This script adds the userCount field to existing companies and
 * populates it with the current count of active employees from each
 * company's tenant database.
 *
 * Run this script once after deploying the schema changes to ensure
 * all existing companies have the userCount field populated.
 *
 * Usage:
 *   node backend/migrations/addCompanyUserCount.js
 */

import { connectDB, getTenantCollections } from '../config/db.js';

/**
 * Update userCount for a single company
 */
async function updateCompanyUserCount(company) {
  const tenantDbName = company._id.toString();
  const companyName = company.name || 'Unknown Company';

  console.log(`\nProcessing: ${companyName} (${tenantDbName})`);

  try {
    // Get tenant collections for this company
    const tenantCollections = getTenantCollections(tenantDbName);

    // Count active employees
    const userCount = await tenantCollections.employees.countDocuments({
      status: "Active",
      isDeleted: { $ne: true }
    });

    console.log(`  Found ${userCount} active employees`);

    // Update company document with userCount
    const { getsuperadminCollections } = await import('../config/db.js');
    const { companiesCollection } = getsuperadminCollections();

    const result = await companiesCollection.updateOne(
      { _id: company._id },
      {
        $set: {
          userCount: userCount,
          userCountLastUpdated: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`  ✅ Updated userCount to ${userCount}`);
      return { success: true, userCount };
    } else {
      console.log(`  ℹ️  userCount already set to ${userCount} (no update needed)`);
      return { success: true, userCount, unchanged: true };
    }
  } catch (error) {
    console.error(`  ❌ Error updating company ${companyName}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('==========================================');
  console.log('Company UserCount Migration');
  console.log('==========================================');
  console.log(`Started at: ${new Date().toISOString()}`);

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected');

    // Get superadmin collections
    const { getsuperadminCollections } = await import('../config/db.js');
    const { companiesCollection } = getsuperadminCollections();

    // Get all companies
    const companies = await companiesCollection
      .find({})
      .toArray();

    console.log(`\nFound ${companies.length} companies to process`);

    let updated = 0;
    let skipped = 0;
    let failed = 0;

    // Process each company
    for (const company of companies) {
      const result = await updateCompanyUserCount(company);

      if (result.success) {
        if (result.unchanged) {
          skipped++;
        } else {
          updated++;
        }
      } else {
        failed++;
      }
    }

    console.log('\n==========================================');
    console.log('Migration Summary');
    console.log('==========================================');
    console.log(`Total companies processed: ${companies.length}`);
    console.log(`✅ Updated: ${updated}`);
    console.log(`ℹ️  Skipped (already set): ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Completed at: ${new Date().toISOString()}`);

    if (failed === 0) {
      console.log('✅ Migration completed successfully!');
      process.exit(0);
    } else {
      console.log('⚠️  Migration completed with some failures. Review logs above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
runMigration();
