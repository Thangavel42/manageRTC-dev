/**
 * Search actual company databases (using companyId as DB name directly)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manageRTC';

async function searchActualDbs() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Check 69a52c6d838388b740e80723 database directly
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('CHECKING DATABASE: 69a52c6d838388b740e80723');
    console.log('═══════════════════════════════════════════════════════════════');

    const companyDb = mongoose.connection.useDb('69a52c6d838388b740e80723');

    // List all collections
    const collections = await companyDb.db.listCollections().toArray();
    console.log('\nCollections in this database:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    // Check employees collection
    const employeesCol = companyDb.collection('employees');
    const empCount = await employeesCol.countDocuments({});
    console.log(`\nTotal employees: ${empCount}`);

    if (empCount > 0) {
      const allEmps = await employeesCol.find({}).toArray();
      console.log('\nAll employees:');
      allEmps.forEach(emp => {
        console.log(`\n  📌 ${emp.firstName} ${emp.lastName}`);
        console.log(`     email:       ${emp.email}`);
        console.log(`     employeeId:  ${emp.employeeId}`);
        console.log(`     clerkUserId: ${emp.clerkUserId || '❌ NOT SET'}`);
        console.log(`     account:     ${emp.account?.userId || '❌ NO ACCOUNT'}`);
        console.log(`     isDeleted:   ${emp.isDeleted}`);
        console.log(`     status:      ${emp.status}`);
      });

      // Find Sowndharya specifically
      const sow = await employeesCol.findOne({
        $or: [
          { email: { $regex: /sowndharya/i } },
          { firstName: { $regex: /sowndharya/i } }
        ]
      });

      if (sow) {
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('SOWNDHARYA FULL RECORD:');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(JSON.stringify(sow, null, 2));
      }
    }

    // Check AmasQIS database too
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('CHECKING DATABASE: AmasQIS');
    console.log('═══════════════════════════════════════════════════════════════');

    const amasqisDb = mongoose.connection.useDb('AmasQIS');
    const amasqisCols = await amasqisDb.db.listCollections().toArray();
    console.log('\nCollections:');
    amasqisCols.forEach(col => console.log(`  - ${col.name}`));

    const amasqisEmps = amasqisDb.collection('employees');
    const amasqisCount = await amasqisEmps.countDocuments({});
    console.log(`\nTotal employees: ${amasqisCount}`);

    if (amasqisCount > 0) {
      const sowInAmasqis = await amasqisEmps.findOne({
        $or: [
          { email: { $regex: /sowndharya/i } },
          { firstName: { $regex: /sowndharya/i } }
        ]
      });
      if (sowInAmasqis) {
        console.log('\n✅ FOUND Sowndharya in AmasQIS:');
        console.log(`   clerkUserId: ${sowInAmasqis.clerkUserId}`);
        console.log(`   account: ${JSON.stringify(sowInAmasqis.account)}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  }
}

searchActualDbs();
