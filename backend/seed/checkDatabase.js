import { MongoClient } from 'mongodb';

async function checkDatabase() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  console.log('Connecting to:', uri);

  const client = await MongoClient.connect(uri);

  // List all databases
  const admin = client.db('AmasQIS').admin();
  const databases = await admin.listDatabases();
  console.log('\n=== Available Databases ===');
  databases.databases.forEach(db => {
    console.log('  -', db.name);
  });

  // Check AmasQIS database
  const mainDb = client.db('AmasQIS');
  const collections = await mainDb.listCollections().toArray();
  console.log('\n=== Collections in AmasQIS ===');
  collections.forEach(c => {
    console.log('  -', c.name);
  });

  // Check for various collections
  const collectionsToCheck = ['companies', 'employees', 'leaves', 'attendance'];
  for (const collName of collectionsToCheck) {
    try {
      const count = await mainDb.collection(collName).countDocuments();
      console.log(`\n  ${collName}: ${count} documents`);
    } catch (e) {
      console.log(`\n  ${collName}: collection not found`);
    }
  }

  await client.close();
  console.log('\nDone!');
}

checkDatabase().catch(console.error);
