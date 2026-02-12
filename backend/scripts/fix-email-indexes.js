/**
 * Fix MongoDB Email Uniqueness Indexes
 *
 * This script drops the unique index on email field from all company collections
 * Run with: node scripts/fix-email-indexes.js
 */

import { client, connectDB, getTenantCollections } from '../config/db.js';

const fixEmailIndexes = async () => {
  try {
    console.log('\n🔧 Starting email indexes cleanup...\n');

    // Connect to database
    await connectDB();

    const db = client.db('managertcdev');

    // Get all companies
    const companies = await db.collection('companies').find({}).toArray();
    console.log(`Found ${companies.length} companies\n`);

    let indexesDropped = 0;

    for (const company of companies) {
      const companyId = company._id.toString();
      console.log(`\n📁 Processing company: ${company.companyName || 'Unknown'} (${companyId})`);

      try {
        const collections = getTenantCollections(companyId);
        const employeesCollection = collections.employees;

        // Get all indexes for this collection
        const indexes = await employeesCollection.indexes();
        console.log(`   Indexes found: ${indexes.length}`);

        // Drop unique email indexes
        for (const index of indexes) {
          const name = index.name;

          // Look for email-related indexes
          if (name.includes('email') && index.unique) {
            console.log(`   ♻️  Dropping unique index: ${name}`);
            await employeesCollection.collection.dropIndex(name);
            indexesDropped++;
          }
        }

        // Create a non-unique index on email if needed (for better query performance)
        try {
          await employeesCollection.createIndex({ email: 1 });
          console.log(`   ✅ Created non-unique index on email field`);
        } catch (err) {
          if (err.message.includes('already exists')) {
            console.log(`   ℹ️  Non-unique email index already exists`);
          } else {
            throw err;
          }
        }
      } catch (err) {
        console.error(`   ❌ Error processing company: ${err.message}`);
      }
    }

    console.log(`\n✅ Cleanup complete! Dropped ${indexesDropped} unique email indexes.\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
};

fixEmailIndexes();
