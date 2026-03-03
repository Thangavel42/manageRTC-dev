/**
 * Analyze Pages Collection Structure
 * Shows total count, parent-child relationships, and company-related pages
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

const analyze = async () => {
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

    // Get total count
    const totalCount = await Page.countDocuments();
    console.log(`📊 Total pages in collection: ${totalCount}\n`);

    // Get company-related pages
    console.log('🏢 Company-related pages:');
    const companyPages = await Page.find({
      $or: [
        { name: { $regex: 'compan', $options: 'i' } },
        { route: { $regex: 'compan', $options: 'i' } }
      ]
    }).populate('category').populate('parentPage').lean();

    companyPages.forEach(p => {
      console.log(`\n  Name: ${p.name}`);
      console.log(`  Display: ${p.displayName}`);
      console.log(`  Route: ${p.route || 'No route'}`);
      console.log(`  Category: ${p.category?.displayName || 'No category'}`);
      console.log(`  Parent: ${p.parentPage?.name || 'None'}`);
      console.log(`  Level: ${p.level}`);
    });

    // Get all parent pages (level 1 with no parent)
    console.log('\n\n📁 Top-level pages (potential parents):');
    const topPages = await Page.find({ level: 1, parentPage: null })
      .populate('category')
      .sort({ sortOrder: 1 })
      .lean();

    topPages.forEach(p => {
      console.log(`  - ${p.name} (${p.displayName}) - Category: ${p.category?.displayName}`);
    });

    // Check for Companies parent page
    console.log('\n\n🔍 Searching for Companies parent page...');
    const companiesParent = await Page.findOne({
      $or: [
        { name: 'super-admin.companies' },
        { name: 'superadmin.companies' },
        { route: '/super-admin/companies' }
      ]
    }).lean();

    if (companiesParent) {
      console.log('✅ Found Companies parent page:');
      console.log(`  ID: ${companiesParent._id}`);
      console.log(`  Name: ${companiesParent.name}`);
      console.log(`  Route: ${companiesParent.route}`);

      // Check children
      const children = await Page.find({ parentPage: companiesParent._id }).lean();
      console.log(`  Children count: ${children.length}`);
      children.forEach(c => {
        console.log(`    - ${c.name} (${c.displayName})`);
      });
    } else {
      console.log('❌ No Companies parent page found!');
    }

    // Check categories
    console.log('\n\n📂 All Page Categories:');
    const categories = await PageCategory.find().sort({ sortOrder: 1 }).lean();
    categories.forEach(cat => {
      console.log(`  ${cat.identifier}. ${cat.displayName} (${cat.label})`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Analysis complete');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

analyze();
