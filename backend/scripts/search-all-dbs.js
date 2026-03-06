/**
 * List all databases and find Sowndharya
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manageRTC';

async function searchAllDatabases() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    const adminDb = mongoose.connection.db.admin();

    // List all databases
    const dbs = await adminDb.listDatabases();
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('ALL DATABASES:');
    console.log('═══════════════════════════════════════════════════════════════');
    dbs.databases.forEach(db => {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });

    // Search company_* databases for employees
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SEARCHING COMPANY DATABASES FOR SOWNDHARYA:');
    console.log('═══════════════════════════════════════════════════════════════');

    for (const dbInfo of dbs.databases) {
      if (dbInfo.name.startsWith('company_')) {
        const db = mongoose.connection.useDb(dbInfo.name);
        const employeesCol = db.collection('employees');

        const employee = await employeesCol.findOne({
          $or: [
            { email: { $regex: /sowndharya/i } },
            { firstName: { $regex: /sowndharya/i } }
          ]
        });

        if (employee) {
          console.log(`\n✅ FOUND in ${dbInfo.name}:`);
          console.log(`   _id:         ${employee._id}`);
          console.log(`   employeeId:  ${employee.employeeId}`);
          console.log(`   name:        ${employee.firstName} ${employee.lastName}`);
          console.log(`   email:       ${employee.email}`);
          console.log(`   clerkUserId: ${employee.clerkUserId || '❌ NOT SET'}`);
          console.log(`   account:     ${JSON.stringify(employee.account)}`);
          console.log(`   isDeleted:   ${employee.isDeleted}`);
        }

        // Also check employee count
        const count = await employeesCol.countDocuments({});
        if (count > 0) {
          console.log(`\n📊 ${dbInfo.name}: ${count} employees`);
        }
      }
    }

    // Search main database
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SEARCH MAIN DATABASE (manageRTC):');
    console.log('═══════════════════════════════════════════════════════════════');

    const mainDb = mongoose.connection.useDb('manageRTC');
    const mainEmployees = mainDb.collection('employees');

    const mainCount = await mainEmployees.countDocuments({});
    console.log(`Total employees in main DB: ${mainCount}`);

    if (mainCount > 0) {
      const allMain = await mainEmployees.find({}).limit(20).toArray();
      console.log('\nFirst 20 employees:');
      allMain.forEach(emp => {
        console.log(`  - ${emp.firstName || 'N/A'} ${emp.lastName || ''} | ${emp.email || 'N/A'} | company: ${emp.companyId}`);
      });

      // Search for Sowndharya
      const sow = await mainEmployees.findOne({
        $or: [
          { email: { $regex: /sowndharya/i } },
          { firstName: { $regex: /sowndharya/i } }
        ]
      });
      if (sow) {
        console.log('\n✅ FOUND Sowndharya in main DB!');
        console.log(JSON.stringify(sow, null, 2));
      }
    }

    // Also check "users" collection
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('CHECK USERS COLLECTION:');
    console.log('═══════════════════════════════════════════════════════════════');

    const usersCol = mainDb.collection('users');
    const userCount = await usersCol.countDocuments({});
    console.log(`Total users: ${userCount}`);

    const sowUser = await usersCol.findOne({
      $or: [
        { email: { $regex: /sowndharya/i } },
        { firstName: { $regex: /sowndharya/i } }
      ]
    });
    if (sowUser) {
      console.log('\n✅ FOUND in users collection:');
      console.log(JSON.stringify(sowUser, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  }
}

searchAllDatabases();
