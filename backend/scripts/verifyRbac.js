/**
 * Verify RBAC Data in MongoDB
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Permission from '../models/rbac/permission.schema.js';
import Role from '../models/rbac/role.schema.js';

async function verifyData() {
  try {
    console.log('🔌 Connecting to MongoDB (AmasQIS database)...');
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected to:', mongoose.connection.name);
    console.log('📍 Database:', mongoose.connection.client.options.dbName);

    console.log('\n📊 COLLECTIONS & DATA:');
    console.log('==================================');

    // Check permissions collection
    const permissionCount = await Permission.countDocuments();
    console.log(`\n📝 Collection: "permissions"`);
    console.log(`   Total count: ${permissionCount}`);

    if (permissionCount > 0) {
      // Group by category
      const categoryCounts = await Permission.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);

      console.log(`   Categories: ${categoryCounts.length}`);
      categoryCounts.forEach(cat => {
        console.log(`     - ${cat._id}: ${cat.count} permissions`);
      });

      // Show some examples
      const examples = await Permission.find({}).limit(10);
      console.log(`\n   Sample permissions:`);
      examples.forEach(p => {
        console.log(`     - [${p.category}] ${p.displayName} (${p.module})`);
      });
    } else {
      console.log('   ⚠️  No permissions found!');
    }

    // Check roles collection
    const roleCount = await Role.countDocuments();
    console.log(`\n👥 Collection: "roles"`);
    console.log(`   Total count: ${roleCount}`);

    if (roleCount > 0) {
      const roles = await Role.find({}).select('name displayName type level');
      console.log(`   Roles list:`);
      roles.forEach(r => {
        console.log(`     - ${r.displayName} (${r.name}) - Level: ${r.level}, Type: ${r.type}`);
      });
    } else {
      console.log('   ⚠️  No roles found!');
    }

    await mongoose.disconnect();
    console.log('\n✅ Verification complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

verifyData();
