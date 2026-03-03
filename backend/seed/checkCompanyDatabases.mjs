import { MongoClient } from 'mongodb';

async function checkCompanyDatabases() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  console.log('Connecting to:', uri);

  const client = await MongoClient.connect(uri);

  // First, let's check all databases
  const admin = client.db('AmasQIS').admin();
  const databases = await admin.listDatabases();

  console.log('\n=== Checking for company-specific databases ===\n');

  for (const dbInfo of databases.databases) {
    const dbName = dbInfo.name;

    // Skip system databases
    if (['admin', 'local', 'config'].includes(dbName)) continue;

    try {
      const db = client.db(dbName);

      // Check for leaves collection
      const leavesCount = await db.collection('leaves').countDocuments();

      // Check for attendance collection
      const attendanceCount = await db.collection('attendance').countDocuments();

      // Only show databases that have data
      if (leavesCount > 0 || attendanceCount > 0) {
        console.log(`\n📊 Database: ${dbName}`);
        console.log(`  - Leaves: ${leavesCount} documents`);
        console.log(`  - Attendance: ${attendanceCount} documents`);

        // If there are leaves, check for approved ones
        if (leavesCount > 0) {
          const approvedLeaves = await db.collection('leaves').countDocuments({
            status: 'approved',
            isDeleted: { $ne: true }
          });
          console.log(`  - Approved leaves: ${approvedLeaves} documents`);
        }
      }
    } catch (e) {
      // Database not accessible, skip
    }
  }

  await client.close();
  console.log('\n✅ Done!\n');
}

checkCompanyDatabases().catch(console.error);
