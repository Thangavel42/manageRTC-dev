/**
 * Verification Script for Page Schema and Data
 * Checks if all enhancements are implemented and pages are properly categorized
 *
 * Run with: node backend/seed/verify-pages.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'AmasQIS';
const MONGODB_URI = MONGO_URI.includes('?')
  ? `${MONGO_URI}&dbName=${DB_NAME}`
  : `${MONGO_URI}${MONGO_URI.endsWith('/') ? '' : '/'}${DB_NAME}`;

console.log('='.repeat(70));
console.log('  PAGE SCHEMA & DATA VERIFICATION');
console.log('='.repeat(70));

async function runVerification() {
  try {
    // Connect to MongoDB
    console.log('\n[1/5] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('      Connected!');

    // Load models
    console.log('\n[2/5] Loading models...');
    await import('../models/rbac/page.schema.js');
    await import('../models/rbac/permission.schema.js');
    await import('../models/rbac/role.schema.js');
    const Page = mongoose.model('Page');
    const Permission = mongoose.model('Permission');
    const Role = mongoose.model('Role');

    // 3. Check Schema Enhancements
    console.log('\n[3/5] Checking Schema Enhancements...');
    const schemaPaths = Object.keys(Page.schema.paths);

    const enhancements = {
      'apiRoutes': schemaPaths.includes('apiRoutes'),
      'accessConditions': schemaPaths.includes('accessConditions'),
      'accessConditions.requiresCompany': schemaPaths.includes('accessConditions.requiresCompany'),
      'accessConditions.allowedRoles': schemaPaths.includes('accessConditions.allowedRoles'),
      'featureFlags': schemaPaths.includes('featureFlags'),
      'featureFlags.requiresFeature': schemaPaths.includes('featureFlags.requiresFeature'),
      'featureFlags.minimumPlanTier': schemaPaths.includes('featureFlags.minimumPlanTier'),
      'dataScope': schemaPaths.includes('dataScope'),
      'dataScope.filterByCompany': schemaPaths.includes('dataScope.filterByCompany'),
    };

    console.log('\n      Schema Fields Status:');
    Object.entries(enhancements).forEach(([field, exists]) => {
      console.log(`      ${exists ? '✓' : '✗'} ${field}`);
    });

    const allEnhancementsPresent = Object.values(enhancements).every(v => v);

    // 4. Check Page Categories and Data
    console.log('\n[4/5] Checking Page Categories and Data...');

    // Get category distribution
    const categoryStats = await Page.aggregate([
      { $group: { _id: '$moduleCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n      Pages by Category:');
    categoryStats.forEach(cat => {
      console.log(`      ${cat._id || 'null'}: ${cat.count} pages`);
    });

    // Check for null/undefined categories
    const nullCategoryCount = await Page.countDocuments({
      $or: [
        { moduleCategory: null },
        { moduleCategory: { $exists: false } }
      ]
    });

    if (nullCategoryCount > 0) {
      console.log(`\n      ⚠️  WARNING: ${nullCategoryCount} pages have null/undefined category`);
    }

    // Check for invalid categories
    const validCategories = ['super-admin', 'users-permissions', 'applications', 'hrm', 'projects',
                           'crm', 'recruitment', 'finance', 'administration', 'content',
                           'pages', 'auth', 'ui', 'extras', 'dashboards', 'reports', null];

    const invalidCategoryPages = await Page.find({
      moduleCategory: { $nin: validCategories }
    });

    if (invalidCategoryPages.length > 0) {
      console.log(`\n      ⚠️  WARNING: ${invalidCategoryPages.length} pages have invalid categories:`);
      invalidCategoryPages.forEach(p => {
        console.log(`         - ${p.name}: "${p.moduleCategory}"`);
      });
    }

    // 5. Check Data Population
    console.log('\n[5/5] Checking Data Population...');

    const totalPages = await Page.countDocuments();
    const activePages = await Page.countDocuments({ isActive: true });
    const systemPages = await Page.countDocuments({ isSystem: true });
    const pagesWithApiRoutes = await Page.countDocuments({ 'apiRoutes.0': { $exists: true } });
    const pagesWithFeatureFlags = await Page.countDocuments({
      $or: [
        { 'featureFlags.requiresFeature.0': { $exists: true } },
        { 'featureFlags.minimumPlanTier': { $ne: null } }
      ]
    });

    // Check permissions
    const totalPermissions = await Permission.countDocuments();
    const permissionsWithPageId = await Permission.countDocuments({ pageId: { $exists: true, $ne: null } });

    // Check roles
    const totalRoles = await Role.countDocuments();

    console.log('\n      Page Statistics:');
    console.log(`      Total Pages:          ${totalPages}`);
    console.log(`      Active Pages:         ${activePages}`);
    console.log(`      System Pages:         ${systemPages}`);
    console.log(`      Pages with API Routes: ${pagesWithApiRoutes}`);
    console.log(`      Pages with Features:  ${pagesWithFeatureFlags}`);

    console.log('\n      Permission Statistics:');
    console.log(`      Total Permissions:       ${totalPermissions}`);
    console.log(`      With Page Reference:     ${permissionsWithPageId}`);

    console.log('\n      Role Statistics:');
    console.log(`      Total Roles:         ${totalRoles}`);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('  VERIFICATION SUMMARY');
    console.log('='.repeat(70));

    const issues = [];

    if (!allEnhancementsPresent) {
      issues.push('❌ Schema enhancements not fully implemented');
    } else {
      console.log('✅ Schema enhancements: ALL PRESENT');
    }

    if (nullCategoryCount > 0) {
      issues.push(`❌ ${nullCategoryCount} pages have null category`);
    } else {
      console.log('✅ Page categories: ALL SET');
    }

    if (invalidCategoryPages.length > 0) {
      issues.push(`❌ ${invalidCategoryPages.length} pages have invalid categories`);
    } else {
      console.log('✅ Category values: ALL VALID');
    }

    if (pagesWithApiRoutes === 0) {
      issues.push('⚠️  No pages have API routes configured (optional enhancement)');
    }

    if (issues.length > 0) {
      console.log('\n  Issues Found:');
      issues.forEach(issue => console.log(`    ${issue}`));
    } else {
      console.log('\n  ✅ All checks passed!');
    }

    return {
      success: issues.length === 0,
      totalPages,
      activePages,
      enhancements: allEnhancementsPresent,
      nullCategories: nullCategoryCount,
      invalidCategories: invalidCategoryPages.length
    };

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  } finally {
    await mongoose.disconnect();
    console.log('\n  Disconnected from MongoDB.');
  }
}

runVerification();
