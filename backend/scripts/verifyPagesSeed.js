/**
 * Verify Pages Seed
 * Quick verification script to check pages count and hierarchy
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';
config();

async function main() {
  const uri = process.env.MONGO_URI;
  const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

  await mongoose.connect(uri, { dbName });

  const Page = mongoose.model('Page', new mongoose.Schema({}, { strict: false }));
  const PageCategory = mongoose.model('PageCategory', new mongoose.Schema({}, { strict: false }));

  const totalPages = await Page.countDocuments();
  const totalCategories = await PageCategory.countDocuments();
  const withParent = await Page.countDocuments({ parentPage: { $ne: null } });
  const menuGroups = await Page.countDocuments({ isMenuGroup: true });

  const level1 = await Page.countDocuments({ level: 1 });
  const level2 = await Page.countDocuments({ level: 2 });
  const level3 = await Page.countDocuments({ level: 3 });

  console.log('\n=== PAGES VERIFICATION ===\n');
  console.log(`Database: ${dbName}`);
  console.log(`URI: ${uri.substring(0, 30)}...\n`);

  console.log('Categories:', totalCategories);
  console.log('Total Pages:', totalPages);
  console.log('Pages with parent:', withParent);
  console.log('Menu groups:', menuGroups);
  console.log('\nHierarchy Levels:');
  console.log('  Level 1:', level1);
  console.log('  Level 2:', level2);
  console.log('  Level 3:', level3);

  // Expected values from development
  const expected = {
    pages: 232,
    categories: 14,
    withParent: 119,
    menuGroups: 24,
    level1: 113,
    level2: 73,
    level3: 46
  };

  console.log('\n=== COMPARISON WITH DEVELOPMENT ===\n');
  console.log(`Pages: ${totalPages} / ${expected.pages} ${totalPages === expected.pages ? '✓' : '✗'}`);
  console.log(`Categories: ${totalCategories} / ${expected.categories} ${totalCategories === expected.categories ? '✓' : '✗'}`);
  console.log(`With Parent: ${withParent} / ${expected.withParent} ${withParent === expected.withParent ? '✓' : '✗'}`);
  console.log(`Menu Groups: ${menuGroups} / ${expected.menuGroups} ${menuGroups === expected.menuGroups ? '✓' : '✗'}`);
  console.log(`Level 1: ${level1} / ${expected.level1} ${level1 === expected.level1 ? '✓' : '✗'}`);
  console.log(`Level 2: ${level2} / ${expected.level2} ${level2 === expected.level2 ? '✓' : '✗'}`);
  console.log(`Level 3: ${level3} / ${expected.level3} ${level3 === expected.level3 ? '✓' : '✗'}`);

  if (totalPages === expected.pages && withParent === expected.withParent) {
    console.log('\n✅ SUCCESS: Pages collection is correctly seeded!');
  } else {
    console.log('\n⚠️  WARNING: Some discrepancies found');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
