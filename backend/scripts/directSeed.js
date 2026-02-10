/**
 * Direct seed script using environment variables
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Permission from '../models/rbac/permission.schema.js';
import Role from '../models/rbac/role.schema.js';
import RolePermission from '../models/rbac/rolePermission.schema.js';

async function directSeed() {
  try {
    const uri = process.env.MONGO_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
    const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

    console.log('🔌 Connecting to MongoDB...');
    console.log(`   Database: ${dbName}`);
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected!');
    console.log('📍 Database:', mongoose.connection.name);

    // Check current state
    const permCount = await Permission.countDocuments();
    const roleCount = await Role.countDocuments();

    console.log('\n📊 Current state:');
    console.log(`  Permissions: ${permCount}`);
    console.log(`  Roles: ${roleCount}`);

    if (permCount === 144) {
      console.log('\n✅ Permissions already seeded!');
    } else {
      console.log('\n🌱 Seeding permissions...');
      // Import and run seed
      const { seed } = await import('./seedRbac.js');
      await seed();
    }

    // Verify final state
    const finalPermCount = await Permission.countDocuments();
    const finalRoleCount = await Role.countDocuments({ type: 'system' });

    console.log('\n📊 Final state:');
    console.log(`  Permissions: ${finalPermCount}`);
    console.log(`  System Roles: ${finalRoleCount}`);

    // Show some permissions
    const samples = await Permission.find({}).limit(5);
    console.log('\n📝 Sample permissions:');
    samples.forEach(p => {
      console.log(`  - [${p.category}] ${p.displayName} (${p.module})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

directSeed();
