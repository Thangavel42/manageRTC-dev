/**
 * Migration: Fix Promotion Schema departmentId Type Mismatch
 *
 * Issue: Promotion schema stores departmentId as String while all other schemas use ObjectId
 * Impact: Data inconsistency, issues with population and queries
 *
 * This migration:
 * 1. Converts String departmentId values to ObjectId in existing promotion records
 * 2. Updates the schema to use ObjectId type
 *
 * Run after: Updating promotion.schema.js
 * Rollback: Backup promotions collection before running
 */

import mongoose from 'mongoose';
import { getTenantCollections, client } from '../config/db.js';

/**
 * Validate if a string is a valid ObjectId
 */
function isValidObjectId(str) {
  if (!str) return false;
  if (typeof str !== 'string') return false;
  return /^[0-9a-fA-F]{24}$/.test(str);
}

/**
 * Convert String departmentId to ObjectId
 */
async function migratePromotionDepartmentIds(companyId) {
  try {
    const collections = getTenantCollections(companyId);
    const promotionsCollection = collections.promotions;

    console.log(`\n=== Migrating promotions for company: ${companyId} ===`);

    // Get all promotions
    const promotions = await promotionsCollection.find({}).toArray();
    console.log(`Found ${promotions.length} promotion records`);

    let updatedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const promotion of promotions) {
      try {
        const updateData = {};
        let needsUpdate = false;

        // Process promotionTo.departmentId
        if (promotion.promotionTo?.departmentId) {
          const toDeptId = promotion.promotionTo.departmentId;

          if (typeof toDeptId === 'string') {
            if (isValidObjectId(toDeptId)) {
              // Convert to ObjectId
              updateData['promotionTo.departmentId'] = new mongoose.Types.ObjectId(toDeptId);
              needsUpdate = true;
              console.log(`  Promotion ${promotion._id}: promotionTo.departmentId String -> ObjectId`);
            } else {
              errors.push(`Promotion ${promotion._id}: Invalid promotionTo.departmentId format: ${toDeptId}`);
              errorCount++;
            }
          }
        }

        // Process promotionFrom.departmentId
        if (promotion.promotionFrom?.departmentId) {
          const fromDeptId = promotion.promotionFrom.departmentId;

          if (typeof fromDeptId === 'string') {
            if (isValidObjectId(fromDeptId)) {
              // Convert to ObjectId
              updateData['promotionFrom.departmentId'] = new mongoose.Types.ObjectId(fromDeptId);
              needsUpdate = true;
              console.log(`  Promotion ${promotion._id}: promotionFrom.departmentId String -> ObjectId`);
            } else {
              errors.push(`Promotion ${promotion._id}: Invalid promotionFrom.departmentId format: ${fromDeptId}`);
              errorCount++;
            }
          }
        }

        if (needsUpdate) {
          await promotionsCollection.updateOne(
            { _id: promotion._id },
            { $set: updateData }
          );
          updatedCount++;
        }
      } catch (err) {
        errors.push(`Promotion ${promotion._id}: ${err.message}`);
        errorCount++;
      }
    }

    console.log(`\n=== Migration Summary for ${companyId} ===`);
    console.log(`Total records: ${promotions.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(err => console.log(`  - ${err}`));
    }

    return { total: promotions.length, updated: updatedCount, errors: errorCount };
  } catch (error) {
    console.error(`Error migrating company ${companyId}:`, error);
    throw error;
  }
}

/**
 * Get all company IDs and migrate each
 */
async function migrateAllCompanies() {
  try {
    // Get main database
    const adminDb = client.db('AmasQIS');

    // Get all companies
    const companies = await adminDb.collection('companies')
      .find({ isActive: true })
      .project({ _id: 1, name: 1 })
      .toArray();

    console.log(`Found ${companies.length} active companies`);

    const results = [];

    for (const company of companies) {
      const result = await migratePromotionDepartmentIds(company._id.toString());
      results.push({
        companyId: company._id.toString(),
        companyName: company.name,
        ...result
      });
    }

    console.log('\n=== Overall Migration Summary ===');
    console.log(JSON.stringify(results, null, 2));

    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);

    console.log(`\nTotal records updated: ${totalUpdated}`);
    console.log(`Total errors: ${totalErrors}`);

    if (totalErrors === 0) {
      console.log('\n✅ Migration completed successfully!');
    } else {
      console.log('\n⚠️ Migration completed with errors. Please review the errors above.');
    }

    return results;
  } catch (error) {
    console.error('Error in migrateAllCompanies:', error);
    throw error;
  }
}

/**
 * Rollback function - Convert ObjectId back to String
 * Use this if you need to revert the changes
 */
async function rollbackPromotionDepartmentIds(companyId) {
  try {
    const collections = getTenantCollections(companyId);
    const promotionsCollection = collections.promotions;

    console.log(`\n=== Rolling back promotions for company: ${companyId} ===`);

    const promotions = await promotionsCollection.find({}).toArray();
    console.log(`Found ${promotions.length} promotion records`);

    let rolledBackCount = 0;

    for (const promotion of promotions) {
      const updateData = {};
      let needsUpdate = false;

      // Convert promotionTo.departmentId back to String
      if (promotion.promotionTo?.departmentId instanceof mongoose.Types.ObjectId) {
        updateData['promotionTo.departmentId'] = promotion.promotionTo.departmentId.toString();
        needsUpdate = true;
      }

      // Convert promotionFrom.departmentId back to String
      if (promotion.promotionFrom?.departmentId instanceof mongoose.Types.ObjectId) {
        updateData['promotionFrom.departmentId'] = promotion.promotionFrom.departmentId.toString();
        needsUpdate = true;
      }

      if (needsUpdate) {
        await promotionsCollection.updateOne(
          { _id: promotion._id },
          { $set: updateData }
        );
        rolledBackCount++;
      }
    }

    console.log(`Rolled back ${rolledBackCount} records`);
    return rolledBackCount;
  } catch (error) {
    console.error(`Error rolling back company ${companyId}:`, error);
    throw error;
  }
}

// CLI interface
if (process.argv[2] === 'migrate') {
  const companyId = process.argv[3];

  if (companyId) {
    migratePromotionDepartmentIds(companyId)
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  } else {
    migrateAllCompanies()
      .then(() => process.exit(0))
      .catch(err => {
        console.error(err);
        process.exit(1);
      });
  }
} else if (process.argv[2] === 'rollback') {
  const companyId = process.argv[3];

  if (!companyId) {
    console.error('Please provide companyId for rollback');
    process.exit(1);
  }

  rollbackPromotionDepartmentIds(companyId)
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
} else {
  console.log('Usage:');
  console.log('  node migrations/fixPromotionDepartmentIdType.js migrate [companyId]');
  console.log('  node migrations/fixPromotionDepartmentIdType.js rollback <companyId>');
  process.exit(1);
}

export {
  migratePromotionDepartmentIds,
  migrateAllCompanies,
  rollbackPromotionDepartmentIds
};
