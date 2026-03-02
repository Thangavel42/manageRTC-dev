/**
 * Comprehensive Pages and Categories Seed Script
 * Seeds all page categories and pages with proper parent-child hierarchy
 *
 * This script:
 * 1. Seeds all page categories first
 * 2. Seeds pages in correct order (parents before children)
 * 3. Maintains proper hierarchy relationships
 * 4. Can be run multiple times (idempotent)
 *
 * Usage:
 *   node scripts/seedPagesComplete.js
 *
 * For new database setup:
 *   node scripts/seedPagesComplete.js --fresh
 */

import { config } from 'dotenv';
import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Page and PageCategory models
import Page from '../models/rbac/page.schema.js';
import PageCategory from '../models/rbac/pageCategory.schema.js';

const FRESH_INSTALL = process.argv.includes('--fresh');

async function main() {
  console.log('=== COMPREHENSIVE PAGES SEED SCRIPT ===\n');
  console.log(`Mode: ${FRESH_INSTALL ? 'FRESH INSTALL (will clear existing)' : 'UPDATE (will preserve existing)'}\n`);

  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

  console.log(`Database: ${dbName}`);
  console.log(`URI: ${uri?.substring(0, 30)}...`);

  await mongoose.connect(uri, { dbName });
  console.log('✓ Connected\n');

  // Load export data
  const exportPath = path.join(__dirname, '../data/pagesExport.json');
  if (!fs.existsSync(exportPath)) {
    console.error('❌ Export file not found. Please run scripts/exportPagesFromDev.js first');
    process.exit(1);
  }

  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
  console.log(`Loaded export data:`);
  console.log(`  Categories: ${exportData.categories.length}`);
  console.log(`  Pages: ${exportData.pages.length}`);
  console.log(`  Export Date: ${exportData.metadata.exportDate}\n`);

  // Step 1: Clear existing data if fresh install
  if (FRESH_INSTALL) {
    console.log('🗑️  Clearing existing pages and categories...');
    await Page.deleteMany({});
    await PageCategory.deleteMany({});
    console.log('✓ Cleared\n');
  }

  // Step 2: Seed Categories
  console.log('📁 Seeding Page Categories...');
  const categoryMap = {}; // old ID -> new ID mapping
  const categoryIdentifierMap = {}; // identifier -> new ID

  for (const catData of exportData.categories) {
    try {
      let category = await PageCategory.findOne({ identifier: catData.identifier });

      if (!category) {
        category = await PageCategory.create({
          identifier: catData.identifier,
          label: catData.label,
          displayName: catData.displayName || catData.label,
          description: catData.description,
          sortOrder: catData.sortOrder,
          isActive: catData.isActive !== false,
          icon: catData.icon
        });
        console.log(`  ✓ Created: ${catData.label}`);
      } else {
        console.log(`  ↻ Exists: ${catData.label}`);
      }

      categoryIdentifierMap[catData.identifier] = category._id;
    } catch (error) {
      console.error(`  ✗ Error creating category ${catData.identifier}:`, error.message);
    }
  }

  console.log(`\n✓ Categories seeded: ${Object.keys(categoryIdentifierMap).length}\n`);

  // Step 3: Prepare pages - Sort by hierarchy (parents first)
  console.log('🔄 Sorting pages by hierarchy...');

  // Separate pages by level to ensure proper order
  const level1Pages = exportData.pages.filter(p => p.level === 1 || !p.parentPage);
  const level2Pages = exportData.pages.filter(p => p.level === 2 && p.parentPage);
  const level3Pages = exportData.pages.filter(p => p.level === 3 && p.parentPage);

  const sortedPages = [...level1Pages, ...level2Pages, ...level3Pages];
  console.log(`  Level 1: ${level1Pages.length} pages`);
  console.log(`  Level 2: ${level2Pages.length} pages`);
  console.log(`  Level 3: ${level3Pages.length} pages`);
  console.log(`  Total: ${sortedPages.length} pages\n`);

  // Step 4: Seed Pages
  console.log('📄 Seeding Pages...');
  const pageIdMap = {}; // old ID -> new ID mapping
  const pageNameMap = {}; // name -> new ID mapping

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const pageData of sortedPages) {
    try {
      const oldId = pageData._id?.toString();

      // Resolve category ID
      let categoryId = null;
      if (pageData._categoryInfo?.identifier) {
        categoryId = categoryIdentifierMap[pageData._categoryInfo.identifier];
      }

      if (!categoryId) {
        console.log(`  ⚠️  No category found for ${pageData.name}, skipping`);
        errors++;
        continue;
      }

      // Resolve parent page ID
      let parentPageId = null;
      if (pageData.parentPage) {
        const oldParentId = pageData.parentPage.toString();
        parentPageId = pageIdMap[oldParentId];

        // If parent not found in ID map, try looking up by name
        if (!parentPageId && pageData._parentName) {
          parentPageId = pageNameMap[pageData._parentName];
        }

        if (!parentPageId) {
          console.log(`  ⚠️  Parent not found for ${pageData.name} (parent: ${pageData._parentName}), will set as null`);
          // Continue without parent rather than failing
        }
      }

      // Check if page already exists
      let page = await Page.findOne({ name: pageData.name });

      // Prepare page document
      const pageDoc = {
        name: pageData.name,
        displayName: pageData.displayName,
        description: pageData.description,
        route: pageData.route,
        icon: pageData.icon,
        category: categoryId,
        parentPage: parentPageId,
        level: pageData.level || 1,
        depth: pageData.depth || 1,
        hierarchyPath: pageData.hierarchyPath || [],
        isMenuGroup: pageData.isMenuGroup || false,
        menuGroupLevel: pageData.menuGroupLevel,
        sortOrder: pageData.sortOrder || 0,
        isSystem: pageData.isSystem !== false,
        isActive: pageData.isActive !== false,
        availableActions: pageData.availableActions || ['read', 'create', 'write', 'delete', 'import', 'export'],
        meta: pageData.meta || { keywords: [], layout: 'default' },
        featureFlags: pageData.featureFlags || {
          enabledForAll: false,
          minimumPlanTier: null,
          requiresFeature: []
        },
        accessConditions: pageData.accessConditions || {
          requiresCompany: true,
          requiresPlan: false,
          allowedRoles: [],
          deniedRoles: [],
          timeRestricted: { enabled: false, allowedDays: [] },
          ipRestricted: { enabled: false, allowedIPs: [], deniedIPs: [] }
        },
        dataScope: pageData.dataScope || {
          filterByCompany: true,
          filterByDepartment: false,
          filterByUser: false,
          restrictedFields: []
        },
        apiRoutes: pageData.apiRoutes || []
      };

      if (page) {
        // Update existing page
        Object.assign(page, pageDoc);
        await page.save();
        updated++;
        console.log(`  ↻ Updated: ${pageData.name}`);
      } else {
        // Create new page
        page = await Page.create(pageDoc);
        created++;
        console.log(`  ✓ Created: ${pageData.name}`);
      }

      // Store mapping
      if (oldId) {
        pageIdMap[oldId] = page._id;
      }
      pageNameMap[pageData.name] = page._id;

    } catch (error) {
      console.error(`  ✗ Error processing ${pageData.name}:`, error.message);
      errors++;
    }
  }

  // Step 5: Verify and update hierarchy paths
  console.log('\n🔍 Verifying hierarchy...');
  const allPages = await Page.find({}).lean();

  let hierarchyFixed = 0;
  for (const page of allPages) {
    try {
      const hierarchyPath = [page.category];

      // Build hierarchy path by traversing parents
      if (page.parentPage) {
        const parent = allPages.find(p => p._id.toString() === page.parentPage.toString());
        if (parent && parent.hierarchyPath) {
          hierarchyPath.push(...parent.hierarchyPath.filter(id => !hierarchyPath.includes(id)));
        }
        hierarchyPath.push(page.parentPage);
      }

      // Update if different
      if (JSON.stringify(page.hierarchyPath) !== JSON.stringify(hierarchyPath)) {
        await Page.updateOne(
          { _id: page._id },
          { $set: { hierarchyPath } }
        );
        hierarchyFixed++;
      }
    } catch (error) {
      console.error(`  ✗ Error fixing hierarchy for ${page.name}:`, error.message);
    }
  }

  console.log(`  ✓ Fixed ${hierarchyFixed} hierarchy paths\n`);

  // Final Statistics
  console.log('\n=== SEED COMPLETE ===');
  console.log(`\nCategories:`);
  console.log(`  Total: ${Object.keys(categoryIdentifierMap).length}`);

  console.log(`\nPages:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Total Processed: ${created + updated + skipped}`);

  // Final verification
  const finalPageCount = await Page.countDocuments();
  const finalCategoryCount = await PageCategory.countDocuments();
  const pagesWithParent = await Page.countDocuments({ parentPage: { $ne: null } });
  const menuGroups = await Page.countDocuments({ isMenuGroup: true });

  console.log(`\nFinal Database State:`);
  console.log(`  Categories: ${finalCategoryCount}`);
  console.log(`  Total Pages: ${finalPageCount}`);
  console.log(`  Pages with Parent: ${pagesWithParent}`);
  console.log(`  Menu Groups: ${menuGroups}`);

  // Verify expected count
  if (finalPageCount === exportData.pages.length) {
    console.log(`\n✅ SUCCESS: All ${finalPageCount} pages seeded correctly!`);
  } else {
    console.log(`\n⚠️  WARNING: Expected ${exportData.pages.length} pages but got ${finalPageCount}`);
  }

  await mongoose.disconnect();
  console.log('\n✓ Disconnected');

  process.exit(0);
}

main().catch(error => {
  console.error('\n❌ Seed failed:', error);
  process.exit(1);
});
