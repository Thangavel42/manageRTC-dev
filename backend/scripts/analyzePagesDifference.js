/**
 * Analyze Pages Difference Between Development and Acceptance DBs
 * Identifies missing pages in acceptance DB
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';
config();

const DEV_URI = 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const ACC_URI = 'mongodb+srv://amasQISAdminACC:sT0jJICEV1YiwFr8@managertc-acc-cluster.mffqa03.mongodb.net/?appName=manageRTC-acc-cluster';
const DB_NAME = 'AmasQIS';

async function getPages(uri, label) {
  const conn = await mongoose.createConnection(uri, { dbName: DB_NAME }).asPromise();
  const Page = conn.model('Page', new mongoose.Schema({}, { strict: false }));
  const PageCategory = conn.model('PageCategory', new mongoose.Schema({}, { strict: false }));

  const pages = await Page.find({}, {
    name: 1,
    displayName: 1,
    route: 1,
    moduleCategory: 1,
    parentPage: 1,
    category: 1,
    level: 1,
    depth: 1,
    hierarchyPath: 1,
    isMenuGroup: 1,
    sortOrder: 1,
    isActive: 1
  }).sort({ name: 1 }).lean();

  const categories = await PageCategory.find({}).lean();

  await conn.close();

  console.log(`\n${label}:`);
  console.log(`Total Pages: ${pages.length}`);
  console.log(`Total Categories: ${categories.length}`);

  return { pages, categories };
}

async function main() {
  console.log('=== ANALYZING PAGES DIFFERENCE ===\n');

  // Get pages from both databases
  const dev = await getPages(DEV_URI, 'Development DB');
  const acc = await getPages(ACC_URI, 'Acceptance DB');

  // Create sets of page names
  const devNames = new Set(dev.pages.map(p => p.name));
  const accNames = new Set(acc.pages.map(p => p.name));

  // Find missing pages in acceptance
  const missingInAcc = dev.pages.filter(p => !accNames.has(p.name));

  // Find extra pages in acceptance (shouldn't happen)
  const extraInAcc = acc.pages.filter(p => !devNames.has(p.name));

  console.log(`\n\n=== ANALYSIS RESULTS ===`);
  console.log(`\nPages in Development: ${dev.pages.length}`);
  console.log(`Pages in Acceptance: ${acc.pages.length}`);
  console.log(`Missing in Acceptance: ${missingInAcc.length}`);
  console.log(`Extra in Acceptance: ${extraInAcc.length}`);

  if (missingInAcc.length > 0) {
    console.log(`\n\n=== MISSING PAGES IN ACCEPTANCE (${missingInAcc.length}) ===`);

    // Group by moduleCategory
    const grouped = {};
    missingInAcc.forEach(page => {
      const cat = page.moduleCategory || 'no-category';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(page);
    });

    Object.keys(grouped).sort().forEach(cat => {
      console.log(`\n[${cat}] - ${grouped[cat].length} pages:`);
      grouped[cat].forEach(page => {
        const parent = page.parentPage ? '↳ ' : '• ';
        const menuGroup = page.isMenuGroup ? ' [MENU GROUP]' : '';
        console.log(`  ${parent}${page.name} (${page.displayName})${menuGroup}`);
      });
    });
  }

  if (extraInAcc.length > 0) {
    console.log(`\n\n=== EXTRA PAGES IN ACCEPTANCE (${extraInAcc.length}) ===`);
    extraInAcc.forEach(page => {
      console.log(`  • ${page.name} (${page.displayName})`);
    });
  }

  // Analyze hierarchy differences
  console.log(`\n\n=== HIERARCHY ANALYSIS ===`);
  console.log(`\nDevelopment DB:`);
  const devLevels = {};
  dev.pages.forEach(p => {
    const level = p.level || 'undefined';
    devLevels[level] = (devLevels[level] || 0) + 1;
  });
  Object.keys(devLevels).sort().forEach(level => {
    console.log(`  Level ${level}: ${devLevels[level]} pages`);
  });

  console.log(`\nAcceptance DB:`);
  const accLevels = {};
  acc.pages.forEach(p => {
    const level = p.level || 'undefined';
    accLevels[level] = (accLevels[level] || 0) + 1;
  });
  Object.keys(accLevels).sort().forEach(level => {
    console.log(`  Level ${level}: ${accLevels[level]} pages`);
  });

  // Check pages with parent-child relationships
  console.log(`\n\n=== PARENT-CHILD RELATIONSHIPS ===`);
  const devWithParent = dev.pages.filter(p => p.parentPage).length;
  const accWithParent = acc.pages.filter(p => p.parentPage).length;
  console.log(`Development - Pages with parent: ${devWithParent}`);
  console.log(`Acceptance - Pages with parent: ${accWithParent}`);
  console.log(`Difference: ${devWithParent - accWithParent}`);

  // Check menu groups
  const devMenuGroups = dev.pages.filter(p => p.isMenuGroup).length;
  const accMenuGroups = acc.pages.filter(p => p.isMenuGroup).length;
  console.log(`\nDevelopment - Menu groups: ${devMenuGroups}`);
  console.log(`Acceptance - Menu groups: ${accMenuGroups}`);
  console.log(`Difference: ${devMenuGroups - accMenuGroups}`);

  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
