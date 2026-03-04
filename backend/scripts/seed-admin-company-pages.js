/**
 * Seed Script: Add Company Details and Admin Profile Pages
 *
 * Adds/ensures two pages in the pages collection:
 * 1. Company Details - Child page under super-admin.companies (Level 3, Super Admin category)
 *    Route: /super-admin/companies/:id
 *    Parent: super-admin.companies
 *
 * 2. Admin Profile - Top-level page (Level 1, Administration category)
 *    Route: /admin/profile
 *    Parent: null
 *
 * Prerequisites:
 * - The parent page 'super-admin.companies' must exist before running this script
 * - PageCategory 'II' (Super Admin) and 'X' (Administration) should exist
 *
 * Usage: node backend/scripts/seed-admin-company-pages.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Import models
import Page from '../models/rbac/page.schema.js';
import PageCategory from '../models/rbac/pageCategory.schema.js';

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manageRTC';
    const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

    // Append database name if not already present
    if (!mongoURI.endsWith('/') && !mongoURI.includes('/' + dbName)) {
      mongoURI += '/' + dbName;
    } else if (mongoURI.endsWith('/')) {
      mongoURI += dbName;
    }

    console.log(`🔗 Connecting to database: ${dbName}`);
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
};

/**
 * Find or create PageCategory
 */
const ensureCategory = async (identifier, displayName, label, sortOrder) => {
  let category = await PageCategory.findOne({ identifier }).exec();

  if (!category) {
    console.log(`Creating category: ${displayName} (${identifier})`);
    category = await PageCategory.create({
      identifier,
      displayName,
      label,
      sortOrder,
      isActive: true,
    });
  } else {
    console.log(`Category exists: ${displayName} (${identifier})`);
  }

  return category;
};

/**
 * Seed pages
 */
const seedPages = async () => {
  try {
    console.log('\n🌱 Starting pages seeding...\n');

    // 1. Ensure categories exist
    const superAdminCategory = await ensureCategory('II', 'Super Admin', 'super-admin', 2);
    const adminCategory = await ensureCategory('X', 'Administration', 'administration', 10);

    // 2. Find parent pages
    const companiesParentPage = await Page.findOne({ name: 'super-admin.companies' }).exec();

    if (!companiesParentPage) {
      console.error('❌ Error: Companies parent page (super-admin.companies) not found!');
      console.log('   Please ensure the main Companies page is seeded first.');
      throw new Error('Missing parent page: super-admin.companies');
    }

    console.log(`✅ Found parent page: ${companiesParentPage.displayName} (${companiesParentPage.name})`);

    // 3. Check if pages already exist
    const existingCompanyDetails = await Page.findOne({ name: 'super-admin.companies.details' }).exec();
    const existingAdminProfile = await Page.findOne({ name: 'admin.profile' }).exec();

    let created = 0;
    let skipped = 0;

    // 4. Create Company Details Page as child of Companies (if not exists)
    if (!existingCompanyDetails) {
      await Page.create({
        name: 'super-admin.companies.details',
        displayName: 'Company Details',
        description: 'View and edit detailed company information',
        route: '/super-admin/companies/:id',
        icon: 'ti ti-building',
        category: superAdminCategory._id,
        parentPage: companiesParentPage._id,
        level: 3,
        sortOrder: 10,
        isActive: true,
        permissions: ['view', 'edit'],
      });
      console.log('✅ Created: Company Details page (as child of Companies)');
      created++;
    } else {
      console.log('⏭️  Skipped: Company Details page (already exists)');
      skipped++;
    }

    // 5. Create Admin Profile Page in Administration category (if not exists)
    if (!existingAdminProfile) {
      await Page.create({
        name: 'admin.profile',
        displayName: 'Admin Profile',
        description: 'Admin profile with company info and subscription details',
        route: '/admin/profile',
        icon: 'ti ti-user-circle',
        category: adminCategory._id,
        parentPage: null,
        level: 1,
        sortOrder: 101,
        isActive: true,
        permissions: ['view', 'edit', 'request-change'],
      });
      console.log('✅ Created: Admin Profile page (top-level in Administration)');
      created++;
    } else {
      console.log('⏭️  Skipped: Admin Profile page (already exists)');
      skipped++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   - Created: ${created}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Total: ${created + skipped}`);
    console.log('\n✅ Pages seeding completed successfully!\n');

  } catch (error) {
    console.error('❌ Error seeding pages:', error);
    throw error;
  }
};

/**
 * Main execution
 */
const main = async () => {
  const connected = await connectDB();

  if (!connected) {
    console.error('❌ Failed to connect to database');
    process.exit(1);
  }

  try {
    await seedPages();
    console.log('\n✅ Seed script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  }
};

// Run the script
main();
