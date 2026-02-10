/**
 * Module Cleanup Script
 * Removes unwanted modules from the database, keeping only HRM, Projects, and CRM
 *
 * Usage: node scripts/cleanupModules.js
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Module from '../models/rbac/module.schema.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

// Only these modules should remain in the database
const ALLOWED_MODULES = ['hrm', 'projects', 'crm'];

async function cleanupModules() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   Database: ${dbName}`);
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected!\n');

    console.log('🧹 Starting Module Cleanup...\n');
    console.log('='.repeat(70));

    // Get all modules
    const allModules = await Module.find({});
    console.log(`📋 Found ${allModules.length} total modules in database\n`);

    // Separate modules to keep and delete
    const modulesToKeep = [];
    const modulesToDelete = [];

    for (const module of allModules) {
      if (ALLOWED_MODULES.includes(module.name)) {
        modulesToKeep.push(module);
        console.log(`✅ KEEP: ${module.displayName} (${module.name})`);
      } else {
        modulesToDelete.push(module);
        console.log(`❌ DELETE: ${module.displayName} (${module.name})`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log(`📊 SUMMARY:`);
    console.log(`   Modules to keep: ${modulesToKeep.length}`);
    console.log(`   Modules to delete: ${modulesToDelete.length}`);

    if (modulesToDelete.length > 0) {
      console.log('\n⚠️  Deleting unwanted modules...');
      const deleteIds = modulesToDelete.map(m => m._id);
      const result = await Module.deleteMany({ _id: { $in: deleteIds } });
      console.log(`✅ Deleted ${result.deletedCount} modules`);
    } else {
      console.log('\n✅ No modules to delete - database is clean!');
    }

    // Verify remaining modules
    console.log('\n📋 Remaining modules in database:');
    const remainingModules = await Module.find({}).sort({ sortOrder: 1 });
    if (remainingModules.length === 0) {
      console.log('   ⚠️  No modules found! Run seedModules.js to create the default modules.');
    } else {
      remainingModules.forEach(mod => {
        console.log(`   ✅ ${mod.displayName} (${mod.name})`);
        console.log(`      Route: ${mod.route} | Active: ${mod.isActive}`);
      });
    }

    console.log('\n✅ Module cleanup complete!');

    await mongoose.disconnect();

  } catch (error) {
    console.error('\n❌ Cleanup Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

cleanupModules();
