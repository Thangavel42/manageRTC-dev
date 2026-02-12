/**
 * Rollback Script: Revert from Embedded Permissions to Junction Table
 *
 * This script reverses the migration by:
 * 1. Clearing the embedded permissions array in roles
 * 2. The junction table (rolePermissions) still has the original data
 *
 * IMPORTANT: Run this ONLY if you need to revert to the old structure.
 * The junction table data was NOT deleted during migration.
 *
 * Usage: node scripts/rollbackEmbeddedPermissions.js
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Role from '../models/rbac/role.schema.js';
import RolePermission from '../models/rbac/rolePermission.schema.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

const stats = {
  rolesProcessed: 0,
  permissionsCleared: 0,
  errors: []
};

async function rollback() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   Database: ${dbName}`);
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected!\n');

    // Check current state
    const rolesWithEmbedded = await Role.countDocuments({ 'permissions.0': { $exists: true } });
    const junctionCount = await RolePermission.countDocuments();

    console.log('📊 Current State:');
    console.log(`   Roles with embedded permissions: ${rolesWithEmbedded}`);
    console.log(`   Junction table entries: ${junctionCount}`);
    console.log();

    if (rolesWithEmbedded === 0) {
      console.log('ℹ️  No embedded permissions found. Nothing to rollback.');
      await mongoose.disconnect();
      return;
    }

    if (junctionCount === 0) {
      console.log('⚠️  WARNING: Junction table is empty!');
      console.log('   Rolling back will result in roles with NO permissions.');
      console.log('   Are you sure you want to continue?');
      console.log();
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('🔄 Starting rollback...\n');

    // Get all roles with embedded permissions
    const roles = await Role.find({ 'permissions.0': { $exists: true } });

    for (const role of roles) {
      try {
        const permCount = role.permissions.length;
        console.log(`   Processing: ${role.displayName} (${role.name})`);
        console.log(`      Clearing ${permCount} embedded permissions...`);

        // Clear embedded permissions
        role.permissions = [];
        role.permissionStats = {
          totalPermissions: 0,
          categories: [],
          lastUpdatedAt: new Date()
        };

        await role.save();

        stats.rolesProcessed++;
        stats.permissionsCleared += permCount;

        console.log(`      ✅ Cleared`);

      } catch (error) {
        console.error(`      ❌ Error: ${error.message}`);
        stats.errors.push({ role: role.displayName, error: error.message });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 ROLLBACK SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Roles processed: ${stats.rolesProcessed}`);
    console.log(`✅ Permissions cleared: ${stats.permissionsCleared}`);
    console.log(`❌ Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors details:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.role}: ${err.error}`);
      });
    }

    // Verify rollback
    console.log('\n🔍 Verifying rollback...');
    const afterRollback = await Role.countDocuments({ 'permissions.0': { $exists: true } });
    console.log(`   Roles with embedded permissions: ${afterRollback}`);
    console.log(`   Junction table entries: ${junctionCount} (unchanged)`);

    if (afterRollback === 0) {
      console.log('\n✅ Rollback successful!');
    } else {
      console.log('\n⚠️  Warning: Some roles still have embedded permissions');
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 NEXT STEPS');
    console.log('='.repeat(60));
    console.log('1. ✅ Rollback completed!');
    console.log('2. 📝 Revert role.schema.js to remove embedded permissions fields');
    console.log('3. 📝 Revert services to use junction table only');
    console.log('4. 📝 Revert controllers if needed');
    console.log('5. 🧪 Test the application');

    await mongoose.disconnect();
    console.log('\n✅ Done!');

  } catch (error) {
    console.error('\n❌ Rollback failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

rollback();
