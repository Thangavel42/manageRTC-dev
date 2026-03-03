/**
 * Fix Company and Admin Profile Pages
 *
 * 1. Move admin.profile from Administration to Pages category
 * 2. Fix double slash in admin.profile route (//admin/profile → /admin/profile)
 * 3. Move crm.company-details to Main Menu category under super-admin.companies parent
 * 4. Update level for crm.company-details to be child (level 2)
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

const fix = async () => {
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
    console.log('✅ Connected to MongoDB\n');

    // Get categories
    const pagesCategory = await PageCategory.findOne({ identifier: 'XI' }).exec(); // Pages category
    const mainMenuCategory = await PageCategory.findOne({ identifier: 'I' }).exec(); // Main Menu category

    if (!pagesCategory) {
      console.error('❌ Pages category (VII) not found!');
      process.exit(1);
    }

    if (!mainMenuCategory) {
      console.error('❌ Main Menu category (I) not found!');
      process.exit(1);
    }

    console.log(`✅ Found Pages category: ${pagesCategory.displayName}`);
    console.log(`✅ Found Main Menu category: ${mainMenuCategory.displayName}\n`);

    // Find companies parent page
    const companiesParent = await Page.findOne({ name: 'super-admin.companies' }).exec();

    if (!companiesParent) {
      console.error('❌ Companies parent page (super-admin.companies) not found!');
      process.exit(1);
    }

    console.log(`✅ Found Companies parent: ${companiesParent.displayName} (${companiesParent.name})\n`);

    // 1. Fix admin.profile page
    console.log('📝 Fixing admin.profile page...');
    const adminProfilePage = await Page.findOne({ name: 'admin.profile' }).exec();

    if (adminProfilePage) {
      const updates = {};
      let changes = [];

      // Move to Pages category
      if (adminProfilePage.category.toString() !== pagesCategory._id.toString()) {
        updates.category = pagesCategory._id;
        changes.push(`Category: Administration → Pages`);
      }

      // Fix double slash if exists
      if (adminProfilePage.route.startsWith('//')) {
        updates.route = adminProfilePage.route.replace('//', '/');
        changes.push(`Route: ${adminProfilePage.route} → ${updates.route}`);
      }

      if (Object.keys(updates).length > 0) {
        await Page.updateOne({ _id: adminProfilePage._id }, { $set: updates });
        console.log(`✅ Updated admin.profile:`);
        changes.forEach(change => console.log(`   - ${change}`));
      } else {
        console.log('⏭️  admin.profile already correct');
      }
    } else {
      console.log('⚠️  admin.profile page not found');
    }

    console.log('');

    // 2. Fix crm.company-details page
    console.log('📝 Moving crm.company-details page...');
    const crmCompanyDetails = await Page.findOne({ name: 'crm.company-details' }).exec();

    if (crmCompanyDetails) {
      const updates = {
        category: mainMenuCategory._id,
        parentPage: companiesParent._id,
        level: 2, // Child level
      };

      await Page.updateOne({ _id: crmCompanyDetails._id }, { $set: updates });
      console.log(`✅ Updated crm.company-details:`);
      console.log(`   - Category: CRM → Main Menu`);
      console.log(`   - Parent: None → super-admin.companies`);
      console.log(`   - Level: 1 → 2`);
    } else {
      console.log('⚠️  crm.company-details page not found');
    }

    console.log('\n📊 Summary of changes:');
    const adminProfileAfter = await Page.findOne({ name: 'admin.profile' }).populate('category').exec();
    const crmCompanyDetailsAfter = await Page.findOne({ name: 'crm.company-details' }).populate('category').populate('parentPage').exec();

    if (adminProfileAfter) {
      console.log(`\n  admin.profile:`);
      console.log(`    - Display: ${adminProfileAfter.displayName}`);
      console.log(`    - Route: ${adminProfileAfter.route}`);
      console.log(`    - Category: ${adminProfileAfter.category?.displayName || 'N/A'}`);
      console.log(`    - Level: ${adminProfileAfter.level}`);
    }

    if (crmCompanyDetailsAfter) {
      console.log(`\n  crm.company-details:`);
      console.log(`    - Display: ${crmCompanyDetailsAfter.displayName}`);
      console.log(`    - Route: ${crmCompanyDetailsAfter.route}`);
      console.log(`    - Category: ${crmCompanyDetailsAfter.category?.displayName || 'N/A'}`);
      console.log(`    - Parent: ${crmCompanyDetailsAfter.parentPage?.displayName || 'None'}`);
      console.log(`    - Level: ${crmCompanyDetailsAfter.level}`);
    }

    // Show companies parent structure
    const companiesChildren = await Page.find({ parentPage: companiesParent._id }).exec();
    console.log(`\n  super-admin.companies children (${companiesChildren.length} total):`);
    companiesChildren.forEach(child => {
      console.log(`    - ${child.name} (${child.displayName}) - Route: ${child.route}`);
    });

    console.log('\n✅ Migration completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

fix();
