/**
 * Full Seed Script Runner
 * Seeds all pages and runs RBAC migration
 *
 * Usage:
 *   node backend/seed/run-full-seed.js
 *   node backend/seed/run-full-seed.js --skip-migration
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { seedAllPages } from './pages-full.seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Build MongoDB URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'AmasQIS';
const MONGODB_URI = MONGO_URI.includes('?')
  ? `${MONGO_URI}&dbName=${DB_NAME}`
  : `${MONGO_URI}${MONGO_URI.endsWith('/') ? '' : '/'}${DB_NAME}`;

const SKIP_MIGRATION = process.argv.includes('--skip-migration');

console.log('='.repeat(60));
console.log('  FULL PAGES SEED SCRIPT');
console.log('='.repeat(60));
console.log(`Database: ${DB_NAME}`);
console.log(`Skip Migration: ${SKIP_MIGRATION}`);
console.log('='.repeat(60));

async function runFullSeed() {
  let connection;

  try {
    // Step 1: Connect to MongoDB
    console.log('\n[1/3] Connecting to MongoDB...');
    connection = await mongoose.connect(MONGODB_URI);
    console.log('      Connected successfully!');
    console.log(`      Host: ${connection.connection.host}`);

    // Step 2: Load Models
    console.log('\n[2/3] Loading models...');
    await import('../models/rbac/page.schema.js');
    await import('../models/rbac/permission.schema.js');
    await import('../models/rbac/role.schema.js');
    console.log('      Models loaded: Page, Permission, Role');

    const Page = mongoose.model('Page');

    // Step 3: Seed Pages
    console.log('\n[3/3] Seeding pages...');
    const result = await seedAllPages(Page);

    if (!result.success) {
      throw new Error(result.error);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('  SEEDING COMPLETE');
    console.log('='.repeat(60));
    console.log(`  Total Pages in Seed: ${result.created + result.updated + result.skipped}`);
    console.log(`  New Pages Created:   ${result.created}`);
    console.log(`  Pages Updated:       ${result.updated}`);
    console.log(`  Pages Skipped:       ${result.skipped}`);

    if (result.errors && result.errors.length > 0) {
      console.log(`\n  Errors (${result.errors.length}):`);
      result.errors.forEach(e => console.log(`    - ${e.page}: ${e.error}`));
    }

    // Migration reminder
    if (!SKIP_MIGRATION) {
      console.log('\n' + '-'.repeat(60));
      console.log('  NEXT STEP: Run RBAC Migration');
      console.log('-'.repeat(60));
      console.log('  To sync permissions with new pages, run:');
      console.log('  node backend/seed/migrate-rbac-refs.js');
    }

    console.log('\n' + '='.repeat(60));
    console.log('  Done!');
    console.log('='.repeat(60));

    return result;

  } catch (error) {
    console.error('\n' + '!'.repeat(60));
    console.error('  ERROR DURING SEEDING');
    console.error('!'.repeat(60));
    console.error(`  ${error.message}`);
    console.error('\n  Stack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      console.log('\n  Disconnected from MongoDB.');
    }
    process.exit(0);
  }
}

// Run the seed
runFullSeed();
