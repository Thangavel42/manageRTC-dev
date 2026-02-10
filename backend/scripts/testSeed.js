/**
 * Test script to verify RBAC seeding
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Permission from '../models/rbac/permission.schema.js';
import Role from '../models/rbac/role.schema.js';
import RolePermission from '../models/rbac/rolePermission.schema.js';
import { seed } from './seedRbac.js';

async function testSeed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/managerteam');
    console.log('✅ Connected to MongoDB');

    console.log('\n📊 Current database state:');
    const permissionCount = await Permission.countDocuments();
    const roleCount = await Role.countDocuments();
    const rolePermissionCount = await RolePermission.countDocuments();
    console.log(`  Permissions: ${permissionCount}`);
    console.log(`  Roles: ${roleCount}`);
    console.log(`  Role Permissions: ${rolePermissionCount}`);

    // Clear existing data if any
    if (permissionCount > 0) {
      console.log('\n🗑️  Clearing existing data...');
      await Permission.deleteMany({});
      await RolePermission.deleteMany({});
      console.log('✅ Data cleared');
    }

    // Run seed
    console.log('\n🌱 Running seed...');
    await seed();

    // Verify results
    const newPermissionCount = await Permission.countDocuments();
    const newRoleCount = await Role.countDocuments({ type: 'system' });
    const newRolePermissionCount = await RolePermission.countDocuments();

    console.log('\n📊 New database state:');
    console.log(`  Permissions: ${newPermissionCount}`);
    console.log(`  System Roles: ${newRoleCount}`);
    console.log(`  Role Permissions: ${newRolePermissionCount}`);

    // Show sample permissions
    const samplePermissions = await Permission.find({}).limit(5);
    console.log('\n📝 Sample permissions:');
    samplePermissions.forEach(p => {
      console.log(`  - [${p.category}] ${p.displayName} (${p.module})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testSeed();
