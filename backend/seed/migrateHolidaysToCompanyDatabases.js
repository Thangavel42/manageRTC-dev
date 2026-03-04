/**
 * Migrate holidays and holiday types from default AmasQIS database to company-specific databases
 *
 * ISSUE: The REST API was using Mongoose models connected to the default 'AmasQIS' database,
 * causing holidays to be stored in the superadmin database instead of company-specific databases.
 *
 * FIX: This script migrates existing holidays to their correct company databases.
 *       The holiday controller has been updated to use tenant collections.
 *
 * Usage: node backend/seed/migrateHolidaysToCompanyDatabases.js
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load .env from backend directory or project root
const envPaths = [
  join(__dirname, '../.env'),
  join(__dirname, '../../.env'),
  join(__dirname, '../../../.env')
];

let DB_URI = null;
for (const envPath of envPaths) {
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const match = envContent.match(/MONGODB_URI=(.+)/);
    if (match && match[1]) {
      DB_URI = match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes
      console.log(`Found MONGODB_URI in: ${envPath}`);
      break;
    }
  } catch (e) {
    // File doesn't exist, continue
  }
}

if (!DB_URI) {
  console.error('ERROR: MONGODB_URI not found in .env files');
  console.error('Checked paths:', envPaths);
  process.exit(1);
}

const SUPERADMIN_DB = 'AmasQIS';

async function migrateHolidaysAndTypes() {
  const client = new MongoClient(DB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas\n');

    const superadminDb = client.db(SUPERADMIN_DB);

    // ============================================
    // MIGRATE HOLIDAY TYPES
    // ============================================
    console.log(`=== MIGRATING HOLIDAY TYPES ===`);
    const typesCollection = superadminDb.collection('holidayTypes');
    const types = await typesCollection.find({}).toArray();

    console.log(`Found ${types.length} holiday types in ${SUPERADMIN_DB} database\n`);

    let typesMigrated = 0;
    let typesSkipped = 0;
    const typesByCompany = new Map();

    for (const type of types) {
      const companyId = type.companyId?.toString();

      if (!companyId) {
        console.log(`⚠️  Skipping holiday type "${type.name}" - no companyId`);
        typesSkipped++;
        continue;
      }

      try {
        const targetDb = client.db(companyId);
        const targetCollection = targetDb.collection('holidayTypes');

        // Check if type already exists in target database
        const existing = await targetCollection.findOne({ _id: type._id });

        if (existing) {
          console.log(`⏭️  Holiday type "${type.name}" already exists in ${companyId}`);
          typesSkipped++;
          continue;
        }

        // Insert type into target database
        await targetCollection.insertOne(type);

        // Track by company
        if (!typesByCompany.has(companyId)) {
          typesByCompany.set(companyId, []);
        }
        typesByCompany.get(companyId).push(type.name);

        console.log(`✅ Migrated holiday type "${type.name}" to ${companyId}`);
        typesMigrated++;

      } catch (error) {
        console.error(`❌ Error migrating holiday type "${type.name}":`, error.message);
      }
    }

    console.log(`\n--- Holiday Types Migration Complete ---`);
    console.log(`Migrated: ${typesMigrated}`);
    console.log(`Skipped: ${typesSkipped}\n`);

    // ============================================
    // MIGRATE HOLIDAYS
    // ============================================
    console.log(`\n=== MIGRATING HOLIDAYS ===`);
    const holidaysCollection = superadminDb.collection('holidays');
    const holidays = await holidaysCollection.find({}).toArray();

    console.log(`Found ${holidays.length} holidays in ${SUPERADMIN_DB} database\n`);

    let holidaysMigrated = 0;
    let holidaysSkipped = 0;
    let holidaysWithInvalidType = 0;
    const holidaysByCompany = new Map();

    for (const holiday of holidays) {
      const companyId = holiday.companyId?.toString();

      if (!companyId) {
        console.log(`⚠️  Skipping holiday "${holiday.name || holiday.title}" - no companyId`);
        holidaysSkipped++;
        continue;
      }

      try {
        const targetDb = client.db(companyId);
        const targetCollection = targetDb.collection('holidays');

        // Check if holiday already exists in target database
        const existing = await targetCollection.findOne({ _id: holiday._id });

        if (existing) {
          console.log(`⏭️  Holiday "${holiday.name || holiday.title}" already exists in ${companyId}`);
          holidaysSkipped++;
          continue;
        }

        // Validate holidayTypeId exists in target database
        if (holiday.holidayTypeId) {
          const typeCheck = await targetDb.collection('holidayTypes').findOne({
            _id: holiday.holidayTypeId
          });

          if (!typeCheck) {
            console.log(`⚠️  Holiday "${holiday.name || holiday.title}" has invalid holidayTypeId - setting to null`);
            holiday.holidayTypeId = null;
            holidaysWithInvalidType++;
          }
        }

        // Insert holiday into target database
        await targetCollection.insertOne(holiday);

        // Track by company
        if (!holidaysByCompany.has(companyId)) {
          holidaysByCompany.set(companyId, []);
        }
        holidaysByCompany.get(companyId).push(holiday.name || holiday.title);

        const dateStr = holiday.date ? new Date(holiday.date).toLocaleDateString('en-GB') : 'N/A';
        console.log(`✅ Migrated holiday "${holiday.name || holiday.title}" to ${companyId} (${dateStr})`);
        holidaysMigrated++;

      } catch (error) {
        console.error(`❌ Error migrating holiday "${holiday.name || holiday.title}":`, error.message);
      }
    }

    console.log(`\n--- Holidays Migration Complete ---`);
    console.log(`Migrated: ${holidaysMigrated}`);
    console.log(`Skipped: ${holidaysSkipped}`);
    console.log(`With invalid type (fixed): ${holidaysWithInvalidType}\n`);

    // ============================================
    // SUMMARY BY COMPANY
    // ============================================
    console.log(`\n=== SUMMARY BY COMPANY DATABASE ===\n`);

    const allCompanies = new Set([...typesByCompany.keys(), ...holidaysByCompany.keys()]);

    for (const companyId of allCompanies) {
      const typeCount = typesByCompany.get(companyId)?.length || 0;
      const holidayCount = holidaysByCompany.get(companyId)?.length || 0;

      if (typeCount > 0 || holidayCount > 0) {
        console.log(`${companyId}:`);
        console.log(`  - Holiday Types: ${typeCount}`);
        console.log(`  - Holidays: ${holidayCount}`);
        console.log('');
      }
    }

    // ============================================
    // VERIFICATION
    // ============================================
    console.log(`\n=== VERIFICATION ===\n`);

    let verifyTypes = 0;
    let verifyHolidays = 0;

    for (const companyId of allCompanies) {
      const targetDb = client.db(companyId);

      const typeCount = await targetDb.collection('holidayTypes').countDocuments();
      const holidayCount = await targetDb.collection('holidays').countDocuments();

      verifyTypes += typeCount;
      verifyHolidays += holidayCount;

      if (typeCount > 0 || holidayCount > 0) {
        console.log(`${companyId}: ${holidayCount} holidays, ${typeCount} types`);
      }
    }

    console.log(`\n--- Total Verified ---`);
    console.log(`Holiday Types in company DBs: ${verifyTypes}`);
    console.log(`Holidays in company DBs: ${verifyHolidays}`);

    // ============================================
    // CLEANUP OPTIONS
    // ============================================
    console.log(`\n=== CLEANUP OPTIONS ===\n`);
    console.log(`Migration complete! Data has been copied to company-specific databases.`);
    console.log(`\nNOTE: Original data in ${SUPERADMIN_DB} was NOT deleted.`);
    console.log(`\nTo verify and clean up:`);
    console.log(`1. Test the holidays page to ensure everything works correctly`);
    console.log(`2. Run this script again to verify all data is migrated`);
    console.log(`3. Once verified, you can optionally delete from ${SUPERADMIN_DB}:`);
    console.log(`   - db.holidayTypes.deleteMany({})`);
    console.log(`   - db.holidays.deleteMany({})`);

  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await client.close();
    console.log('\n✅ Connection closed');
  }
}

// Run migration
migrateHolidaysAndTypes();
