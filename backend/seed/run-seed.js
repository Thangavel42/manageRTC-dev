/**
 * Seed Script Runner
 * Run this script to seed the database with initial data
 * Usage: node seed/run-seed.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedSuperAdminPages } from './pages.seed.js';
import Page from '../models/rbac/page.schema.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manageRTC';

async function runSeed() {
  try {
    console.log('========================================');
    console.log('Starting Database Seeding...');
    console.log('========================================\n');

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB successfully!\n');

    // Run SuperAdmin Pages seeding
    console.log('Seeding SuperAdmin Pages...');
    const pagesResult = await seedSuperAdminPages(Page);

    if (pagesResult.success) {
      console.log(`\nSuccessfully seeded ${pagesResult.count} pages!`);
    } else {
      console.error('\nError seeding pages:', pagesResult.error);
    }

    console.log('\n========================================');
    console.log('Seeding Completed!');
    console.log('========================================');

  } catch (error) {
    console.error('Fatal error during seeding:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB.');
    process.exit(0);
  }
}

// Run the seed
runSeed();
