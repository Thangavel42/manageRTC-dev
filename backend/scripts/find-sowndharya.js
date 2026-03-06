/**
 * Diagnostic script to find Sowndharya's employee record across all databases
 * Usage: node scripts/find-sowndharya.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manageRTC';
const COMPANY_ID = '69a52c6d838388b740e80723';

async function findSowndharya() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Check main database first
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('CHECKING MAIN DATABASE (manageRTC)');
    console.log('═══════════════════════════════════════════════════════════════');

    const mainDb = mongoose.connection.db;
    const mainEmployees = mainDb.collection('employees');

    const sowndharya = await mainEmployees.findOne({
      $or: [
        { email: { $regex: /sowndharya/i } },
        { 'account.email': { $regex: /sowndharya/i } },
        { firstName: { $regex: /sowndharya/i } }
      ]
    });

    if (sowndharya) {
      console.log('\n✅ Found Sowndharya in MAIN database:\n');
      console.log(`   _id:           ${sowndharya._id}`);
      console.log(`   employeeId:    ${sowndharya.employeeId}`);
      console.log(`   firstName:     ${sowndharya.firstName}`);
      console.log(`   lastName:      ${sowndharya.lastName}`);
      console.log(`   email:         ${sowndharya.email}`);
      console.log(`   companyId:     ${sowndharya.companyId}`);
      console.log(`   clerkUserId:   ${sowndharya.clerkUserId || '❌ NOT SET'}`);
      console.log(`   account.userId: ${sowndharya.account?.userId || '❌ NOT SET'}`);
      console.log(`   isDeleted:     ${sowndharya.isDeleted}`);
      console.log(`   status:        ${sowndharya.status}`);

      // Full account object
      console.log('\n📦 Full account object:');
      console.log(JSON.stringify(sowndharya.account, null, 2));
    } else {
      console.log('❌ Not found in main database');
    }

    // Check tenant-specific database
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`CHECKING TENANT DATABASE (company_${COMPANY_ID})`);
    console.log('═══════════════════════════════════════════════════════════════');

    const tenantDb = mongoose.connection.useDb(`company_${COMPANY_ID}`);
    const tenantEmployees = tenantDb.collection('employees');

    const tenantEmp = await tenantEmployees.findOne({
      $or: [
        { email: { $regex: /sowndharya/i } },
        { 'account.email': { $regex: /sowndharya/i } },
        { firstName: { $regex: /sowndharya/i } }
      ]
    });

    if (tenantEmp) {
      console.log('\n✅ Found in tenant database');
      console.log(`   clerkUserId: ${tenantEmp.clerkUserId || '❌ NOT SET'}`);
    } else {
      console.log('❌ Not found in tenant database');

      // Count records
      const count = await tenantEmployees.countDocuments({});
      console.log(`   Total employees in tenant DB: ${count}`);
    }

    // Search for user_3ANkW across ALL employees in main DB
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('SEARCHING FOR Clerk ID "user_3ANkW*" IN MAIN DATABASE');
    console.log('═══════════════════════════════════════════════════════════════');

    const byClerk = await mainEmployees.findOne({
      $or: [
        { clerkUserId: { $regex: /^user_3ANkW/i } },
        { 'account.userId': { $regex: /^user_3ANkW/i } }
      ]
    });

    if (byClerk) {
      console.log(`\n✅ Found employee with Clerk ID user_3ANkW...:`);
      console.log(`   Name: ${byClerk.firstName} ${byClerk.lastName}`);
      console.log(`   Email: ${byClerk.email}`);
      console.log(`   clerkUserId: ${byClerk.clerkUserId}`);
    } else {
      console.log('❌ No employee with that Clerk ID found');
    }

    // List all employees in the company
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`ALL EMPLOYEES FOR COMPANY ${COMPANY_ID}`);
    console.log('═══════════════════════════════════════════════════════════════');

    const companyEmployees = await mainEmployees.find({
      companyId: COMPANY_ID
    }).toArray();

    if (companyEmployees.length === 0) {
      // Try with ObjectId
      const { ObjectId } = mongoose.Types;
      const companyEmployeesById = await mainEmployees.find({
        companyId: new ObjectId(COMPANY_ID)
      }).toArray();

      console.log(`Found ${companyEmployeesById.length} employees (by ObjectId):`);
      companyEmployeesById.forEach(emp => {
        console.log(`  - ${emp.firstName} ${emp.lastName} | ${emp.email} | clerk: ${emp.clerkUserId || 'NONE'}`);
      });
    } else {
      console.log(`Found ${companyEmployees.length} employees (by string):`);
      companyEmployees.forEach(emp => {
        console.log(`  - ${emp.firstName} ${emp.lastName} | ${emp.email} | clerk: ${emp.clerkUserId || 'NONE'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  }
}

findSowndharya();
