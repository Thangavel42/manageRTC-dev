/**
 * Export Pages from Development Database
 * Exports all pages with proper hierarchy and structure
 */

import fs from 'fs';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEV_URI = 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const DB_NAME = 'AmasQIS';

async function main() {
  console.log('=== EXPORTING PAGES FROM DEVELOPMENT DB ===\n');

  await mongoose.connect(DEV_URI, { dbName: DB_NAME });
  console.log('✓ Connected to Development DB\n');

  // Get Page and PageCategory models
  const Page = mongoose.model('Page', new mongoose.Schema({}, { strict: false }));
  const PageCategory = mongoose.model('PageCategory', new mongoose.Schema({}, { strict: false }));

  // Export categories first
  const categories = await PageCategory.find({}).sort({ sortOrder: 1 }).lean();
  console.log(`Found ${categories.length} page categories`);

  // Export all pages
  const pages = await Page.find({}).sort({ name: 1 }).lean();
  console.log(`Found ${pages.length} pages`);

  // Create category map for reference
  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat._id.toString()] = {
      identifier: cat.identifier,
      label: cat.label,
      displayName: cat.displayName
    };
  });

  // Process pages and add category info for reference
  const processedPages = pages.map(page => {
    const catInfo = categoryMap[page.category?.toString()];
    return {
      ...page,
      _categoryInfo: catInfo, // For reference only, will be resolved during seed
      _parentName: null // Will be filled in next step
    };
  });

  // Add parent names for reference
  const pageMap = {};
  pages.forEach(p => pageMap[p._id.toString()] = p.name);
  processedPages.forEach(page => {
    if (page.parentPage) {
      const parentId = page.parentPage.toString();
      page._parentName = pageMap[parentId] || null;
    }
  });

  // Prepare export data
  const exportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      sourceDB: 'Development (cluster0.iooxltd.mongodb.net)',
      totalCategories: categories.length,
      totalPages: pages.length,
      pagesWithParent: pages.filter(p => p.parentPage).length,
      menuGroups: pages.filter(p => p.isMenuGroup).length,
      levels: {
        level1: pages.filter(p => p.level === 1).length,
        level2: pages.filter(p => p.level === 2).length,
        level3: pages.filter(p => p.level === 3).length,
      }
    },
    categories: categories.map(cat => ({
      identifier: cat.identifier,
      label: cat.label,
      displayName: cat.displayName,
      description: cat.description,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      icon: cat.icon
    })),
    pages: processedPages
  };

  // Write to file
  const outputPath = path.join(__dirname, '../data/pagesExport.json');
  fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));

  console.log(`\n✓ Exported to: ${outputPath}`);
  console.log(`\nExport Summary:`);
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Total Pages: ${pages.length}`);
  console.log(`  Pages with Parent: ${pages.filter(p => p.parentPage).length}`);
  console.log(`  Menu Groups: ${pages.filter(p => p.isMenuGroup).length}`);
  console.log(`  Level 1: ${pages.filter(p => p.level === 1).length}`);
  console.log(`  Level 2: ${pages.filter(p => p.level === 2).length}`);
  console.log(`  Level 3: ${pages.filter(p => p.level === 3).length}`);

  await mongoose.disconnect();
  console.log('\n✓ Export complete!');
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
