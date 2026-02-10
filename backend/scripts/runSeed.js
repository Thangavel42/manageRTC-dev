/**
 * Run RBAC Seed Script
 * Ensures database connection before seeding
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import { seed } from './seedRbac.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

async function runSeed() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   URI: ${uri}`);
    console.log(`   Database: ${dbName}`);
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected!\n');

    await seed();

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runSeed();
