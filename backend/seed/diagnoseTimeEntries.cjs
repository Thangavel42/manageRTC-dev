require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

async function diagnose() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✓ Connected to MongoDB');

    // Check AmasQIS database for companies
    const mainDb = client.db('AmasQIS');

    // List companies
    const companies = await mainDb.collection('companies').find({}).toArray();
    console.log('\n=== Companies in AmasQIS database ===');
    console.log(`Total: ${companies.length}`);

    for (const company of companies) {
      console.log(`\n- ${company.name}`);
      console.log(`  _id: ${company._id}`);
      console.log(`  companyId: ${company.companyId}`);
    }

    // Now check each company database for time entries
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();

    const companyDbs = databases.databases.filter(db =>
      db.name.length === 24 && /^[0-9a-f]{24}$/i.test(db.name)
    );

    console.log(`\n\n=== Checking Company Databases for Time Entries ===`);

    for (const dbInfo of companyDbs) {
      const companyDb = client.db(dbInfo.name);

      const timeEntriesCount = await companyDb.collection('timeEntries').countDocuments({
        isDeleted: { $ne: true }
      });

      const employeesCount = await companyDb.collection('employees').countDocuments({
        isDeleted: { $ne: true }
      });

      if (timeEntriesCount > 0 || employeesCount > 0) {
        console.log(`\nDatabase: ${dbInfo.name}`);
        console.log(`  Employees: ${employeesCount}`);
        console.log(`  Time Entries: ${timeEntriesCount}`);

        if (timeEntriesCount > 0) {
          const entries = await companyDb.collection('timeEntries').find({
            isDeleted: { $ne: true }
          }).sort({ createdAt: -1 }).limit(5).toArray();

          console.log('\n  Recent Entries:');
          for (const entry of entries) {
            console.log(`    - ${entry.timeEntryId || entry._id}`);
            console.log(`      userId: ${entry.userId}`);
            console.log(`      description: ${(entry.description || '').substring(0, 40)}...`);
            console.log(`      status: ${entry.status}`);

            // Check if there's an employee with this userId
            const emp = await companyDb.collection('employees').findOne({
              clerkUserId: entry.userId
            });
            if (emp) {
              console.log(`      → Employee: ${emp.employeeId} - ${emp.firstName} ${emp.lastName}`);
            } else {
              console.log(`      → No employee found with clerkUserId = ${entry.userId}`);
            }
          }
        }

        if (employeesCount > 0) {
          const employees = await companyDb.collection('employees').find({
            isDeleted: { $ne: true }
          }).limit(5).toArray();

          console.log('\n  Employees:');
          for (const emp of employees) {
            console.log(`    - ${emp.employeeId}`);
            console.log(`      Name: ${emp.firstName} ${emp.lastName}`);
            console.log(`      clerkUserId: ${emp.clerkUserId}`);
            console.log(`      _id: ${emp._id}`);
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

diagnose();
