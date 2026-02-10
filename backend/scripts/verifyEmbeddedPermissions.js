/**
 * Verify Embedded Permissions Migration
 * Shows detailed info about the new embedded permissions structure
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Role from '../models/rbac/role.schema.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

async function verifyEmbeddedPermissions() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   Database: ${dbName}`);
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected!\n');

    const roles = await Role.find({ isDeleted: false }).sort({ level: 1 });

    console.log('📊 EMBEDDED PERMISSIONS VERIFICATION');
    console.log('='.repeat(70));

    for (const role of roles) {
      console.log(`\n📋 Role: ${role.displayName} (${role.name})`);
      console.log(`   Level: ${role.level} | Type: ${role.type}`);

      if (!role.permissions || role.permissions.length === 0) {
        console.log('   ℹ️  No embedded permissions found');
        continue;
      }

      console.log(`   ✅ Embedded Permissions: ${role.permissions.length}`);
      console.log(`   📦 Permission Stats:`);
      console.log(`      Total: ${role.permissionStats?.totalPermissions || 0}`);
      console.log(`      Categories: ${(role.permissionStats?.categories || []).join(', ')}`);

      // Show sample permissions
      const samples = role.permissions.slice(0, 3);
      console.log(`   📝 Sample Permissions:`);
      samples.forEach(p => {
        const actions = Object.keys(p.actions)
          .filter(a => p.actions[a])
          .join(', ');
        console.log(`      - [${p.category}] ${p.displayName}`);
        console.log(`        Module: ${p.module}`);
        console.log(`        Actions: ${actions || 'none'}`);
      });

      if (role.permissions.length > 3) {
        console.log(`      ... and ${role.permissions.length - 3} more`);
      }
    }

    // Statistics
    const rolesWithPerms = roles.filter(r => r.permissions && r.permissions.length > 0);
    const totalEmbeddedPerms = roles.reduce((sum, r) => sum + (r.permissions?.length || 0), 0);

    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Roles: ${roles.length}`);
    console.log(`Roles with Embedded Permissions: ${rolesWithPerms.length}`);
    console.log(`Total Embedded Permissions: ${totalEmbeddedPerms}`);

    if (totalEmbeddedPerms === 144) {
      console.log('\n✅ All Super Admin permissions successfully migrated!');
    } else {
      console.log(`\n⚠️  Expected 144 permissions, found ${totalEmbeddedPerms}`);
    }

    console.log('\n✅ Verification complete!');
    await mongoose.disconnect();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

verifyEmbeddedPermissions();
