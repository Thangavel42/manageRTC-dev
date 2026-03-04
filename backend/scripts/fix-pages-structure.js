/**
 * Comprehensive Seed Script: Fix Pages Collection Structure
 *
 * Creates proper parent-child hierarchy for:
 * 1. Super Admin → Companies → Company Details
 * 2. Admin Profile (standalone under Administration)
 *
 * Usage: node backend/scripts/fix-pages-structure.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Page from '../models/rbac/page.schema.js';
import PageCategory from '../models/rbac/pageCategory.schema.js';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manageRTC';
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully\n');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
};

/**
 * Ensure category exists
 */
const ensureCategory = async (identifier, displayName, label, sortOrder) => {
  let category = await PageCategory.findOne({ identifier }).exec();

  if (!category) {
    console.log(`  Creating category: ${displayName} (${identifier})`);
    category = await PageCategory.create({
      identifier,
      displayName,
      label,
      sortOrder,
      isActive: true,
    });
  } else {
    console.log(`  ✓ Category exists: ${displayName}`);
  }

  return category;
};

/**
 * Create or update a page
 */
const upsertPage = async (pageData) => {
  const existing = await Page.findOne({ name: pageData.name }).exec();

  if (existing) {
    // Update existing page
    await Page.findByIdAndUpdate(existing._id, pageData);
    console.log(`  ✓ Updated: ${pageData.displayName}`);
    return existing;
  } else {
    // Create new page
    const newPage = await Page.create(pageData);
    console.log(`  ✅ Created: ${pageData.displayName}`);
    return newPage;
  }
};

/**
 * Main seed function
 */
const seedPages = async () => {
  try {
    console.log('🌱 Starting pages structure fix...\n');

    // 1. Ensure categories exist
    console.log('📂 Step 1: Ensuring categories exist...');
    const mainMenuCategory = await ensureCategory('I', 'Main Menu', 'main-menu', 1);
    const superAdminCategory = await ensureCategory('II', 'Super Admin', 'super-admin', 2);
    const administrationCategory = await ensureCategory('X', 'Administration', 'administration', 10);

    console.log('\n📄 Step 2: Creating/updating pages...\n');

    // 2. Create Super Admin parent page (if needed)
    console.log('Creating Super Admin parent structure:');
    const superAdminParent = await upsertPage({
      name: 'super-admin',
      displayName: 'Super Admin',
      description: 'Super Admin module for system-wide management',
      route: '/super-admin',
      icon: 'ti ti-shield-lock',
      category: superAdminCategory._id,
      parentPage: null,
      level: 1,
      sortOrder: 1,
      isActive: true,
      permissions: ['view'],
    });

    // 3. Create Companies parent page
    console.log('\nCreating Companies list page:');
    const companiesListPage = await upsertPage({
      name: 'super-admin.companies',
      displayName: 'Companies',
      description: 'Manage companies and subscriptions',
      route: '/super-admin/companies',
      icon: 'ti ti-building',
      category: superAdminCategory._id,
      parentPage: superAdminParent._id,
      level: 2,
      sortOrder: 10,
      isActive: true,
      permissions: ['view', 'create', 'edit', 'delete'],
    });

    // 4. Create Company Details child page
    console.log('\nCreating Company Details child page:');
    await upsertPage({
      name: 'super-admin.companies.details',
      displayName: 'Company Details',
      description: 'View and edit detailed company information',
      route: '/super-admin/companies/:id',
      icon: 'ti ti-building',
      category: superAdminCategory._id,
      parentPage: companiesListPage._id,
      level: 3,
      sortOrder: 1,
      isActive: true,
      permissions: ['view', 'edit'],
    });

    // 5. Create Admin Profile page (standalone)
    console.log('\nCreating Admin Profile page:');
    await upsertPage({
      name: 'admin.profile',
      displayName: 'Admin Profile',
      description: 'Admin profile with company info and subscription details',
      route: '/admin/profile',
      icon: 'ti ti-user-circle',
      category: administrationCategory._id,
      parentPage: null,
      level: 1,
      sortOrder: 100,
      isActive: true,
      permissions: ['view', 'edit', 'request-change'],
    });

    // 6. Verify structure
    console.log('\n📊 Step 3: Verifying structure...\n');
    const totalPages = await Page.countDocuments();
    console.log(`Total pages: ${totalPages}`);

    const superAdminPages = await Page.find({
      category: { $in: [superAdminCategory._id, administrationCategory._id] }
    }).populate('parentPage').lean();

    console.log('\n✅ Created/Updated Pages:');
    superAdminPages.forEach(p => {
      const indent = '  '.repeat(p.level - 1);
      console.log(`${indent}- ${p.displayName} (${p.name})`);
      console.log(`${indent}  Route: ${p.route || 'No route'}`);
      console.log(`${indent}  Parent: ${p.parentPage?.name || 'None'}`);
      console.log(`${indent}  Level: ${p.level}`);
    });

    console.log('\n✅ Pages structure fixed successfully!\n');

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
    console.log('✅ Seed script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed script failed:', error);
    process.exit(1);
  }
};

main();
