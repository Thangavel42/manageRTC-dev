/**
 * Migration Script: Migrate Role Permissions from Junction Table to Embedded Structure
 *
 * This script migrates data from the rolePermissions junction table
 * to the new embedded permissions array in the roles collection.
 *
 * Before running:
 * 1. Backup your database!
 * 2. Ensure role.schema.js has been updated with the new permissions array
 * 3. Run with: node scripts/migrateRolePermissions.js
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Role from '../models/rbac/role.schema.js';
import Permission from '../models/rbac/permission.schema.js';
import RolePermission from '../models/rbac/rolePermission.schema.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

// Migration statistics
const stats = {
  rolesProcessed: 0,
  permissionsMigrated: 0,
  rolesSkipped: 0,
  errors: []
};

async function migrate() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   Database: ${dbName}`);
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected!\n');

    // Check current state
    const roleCount = await Role.countDocuments({ isDeleted: false });
    const rolePermCount = await RolePermission.countDocuments();

    console.log('📊 Current State:');
    console.log(`   Roles: ${roleCount}`);
    console.log(`   RolePermissions (junction): ${rolePermCount}`);
    console.log();

    // Check if migration already done
    const rolesWithPerms = await Role.countDocuments({ 'permissions.0': { $exists: true } });
    if (rolesWithPerms > 0) {
      console.log(`⚠️  Found ${rolesWithPerms} roles with embedded permissions already.`);
      console.log('⚠️  This migration may have already been run!');
      const readline = await import('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      const answer = await new Promise(resolve => {
        rl.question('Continue anyway? This may duplicate data. (y/N): ', resolve);
      });
      rl.close();
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ Migration cancelled.');
        process.exit(0);
      }
    }

    console.log('🔄 Starting migration...\n');

    // Get all roles
    const roles = await Role.find({ isDeleted: false }).sort({ level: 1 });
    console.log(`   Found ${roles.length} roles to migrate\n`);

    for (const role of roles) {
      try {
        console.log(`   Processing: ${role.displayName} (${role.name})...`);

        // Get all permissions for this role from junction table
        const rolePerms = await RolePermission.find({ roleId: role._id });

        if (rolePerms.length === 0) {
          console.log(`      ℹ️  No permissions found, skipping...`);
          stats.rolesSkipped++;
          continue;
        }

        // Build embedded permissions array
        const permissions = [];
        const categories = new Set();

        for (const rp of rolePerms) {
          // Get permission details
          const perm = await Permission.findById(rp.permissionId);
          if (!perm) {
            console.warn(`      ⚠️  Permission not found: ${rp.permissionId}, skipping...`);
            continue;
          }

          permissions.push({
            permissionId: perm._id,
            module: perm.module,
            category: perm.category,
            displayName: perm.displayName,
            actions: rp.actions
          });

          categories.add(perm.category);
        }

        // Update role with embedded permissions
        role.permissions = permissions;
        role.permissionStats = {
          totalPermissions: permissions.length,
          categories: Array.from(categories),
          lastUpdatedAt: new Date()
        };

        await role.save();

        stats.rolesProcessed++;
        stats.permissionsMigrated += permissions.length;

        console.log(`      ✅ Migrated ${permissions.length} permissions`);
        console.log(`         Categories: ${Array.from(categories).join(', ')}`);

      } catch (error) {
        console.error(`      ❌ Error processing role ${role.displayName}:`, error.message);
        stats.errors.push({ role: role.displayName, error: error.message });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Roles processed: ${stats.rolesProcessed}`);
    console.log(`✅ Permissions migrated: ${stats.permissionsMigrated}`);
    console.log(`⏭️  Roles skipped: ${stats.rolesSkipped}`);
    console.log(`❌ Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Errors details:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.role}: ${err.error}`);
      });
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const afterRoles = await Role.find({ 'permissions.0': { $exists: true } });
    const afterCount = afterRoles.reduce((sum, r) => sum + (r.permissions?.length || 0), 0);

    console.log(`   Roles with embedded permissions: ${afterRoles.length}`);
    console.log(`   Total embedded permissions: ${afterCount}`);

    if (afterCount === stats.permissionsMigrated) {
      console.log('\n✅ Verification passed! All permissions migrated successfully.');
    } else {
      console.log('\n⚠️  Verification warning: Count mismatch!');
      console.log(`   Expected: ${stats.permissionsMigrated}, Found: ${afterCount}`);
    }

    // Backup recommendation
    console.log('\n' + '='.repeat(60));
    console.log('📋 NEXT STEPS');
    console.log('='.repeat(60));
    console.log('1. ✅ Migration completed successfully!');
    console.log('2. 📦 Backup the rolePermissions collection before deleting:');
    console.log(`      mongodump --uri="${uri}" --db=${dbName} --collection=rolePermissions --out=backup/`);
    console.log('3. 🧪 Test the application with the new structure');
    console.log('4. 🗑️  After verification, you can optionally remove rolePermissions collection');
    console.log('5. 📝 Update permission.service.js to use embedded structure');
    console.log('6. 📝 Update permission.controller.js for new API responses');

    console.log('\n✅ Migration complete!');
    console.log('📍 Database:', mongoose.connection.name);

    await mongoose.disconnect();

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
migrate();
