/**
 * Diagnostic script to check employee-Clerk ID linkage
 * Usage: node scripts/check-employee-clerk.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manageRTC';
const COMPANY_ID = '69a52c6d838388b740e80723'; // From the logs

async function checkEmployeeClerkLinkage() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Get the company-specific database
    const db = mongoose.connection.useDb(`company_${COMPANY_ID}`);
    const employeesCollection = db.collection('employees');

    // Find Sowndharya by email
    const sowndharya = await employeesCollection.findOne({
      $or: [
        { email: 'sowndharya@amasqis.ai' },
        { 'account.email': 'sowndharya@amasqis.ai' },
        { firstName: 'Sowndharya' }
      ]
    });

    if (!sowndharya) {
      console.log('❌ Employee "Sowndharya" not found in database');

      // List all employees for reference
      console.log('\n📋 All employees in database:');
      const allEmployees = await employeesCollection.find({}).toArray();
      allEmployees.forEach(emp => {
        console.log(`  - ${emp.firstName} ${emp.lastName} | ${emp.email} | clerkUserId: ${emp.clerkUserId || 'NOT SET'}`);
      });
    } else {
      console.log('✅ Found employee "Sowndharya":\n');
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('EMPLOYEE RECORD ANALYSIS');
      console.log('═══════════════════════════════════════════════════════════════');

      console.log('\n📌 Basic Info:');
      console.log(`   _id:          ${sowndharya._id}`);
      console.log(`   employeeId:   ${sowndharya.employeeId}`);
      console.log(`   firstName:    ${sowndharya.firstName}`);
      console.log(`   lastName:     ${sowndharya.lastName}`);
      console.log(`   email:        ${sowndharya.email}`);
      console.log(`   isDeleted:    ${sowndharya.isDeleted}`);
      console.log(`   status:       ${sowndharya.status}`);

      console.log('\n🔑 CLERK LINKAGE (Critical):');
      console.log(`   clerkUserId:     ${sowndharya.clerkUserId || '❌ NOT SET'}`);
      console.log(`   account.userId:  ${sowndharya.account?.userId || '❌ NOT SET'}`);
      console.log(`   account.email:   ${sowndharya.account?.email || 'NOT SET'}`);

      console.log('\n📊 Expected from Auth Logs:');
      console.log(`   Expected Clerk ID: user_3ANkW... (from your error log)`);

      // Check for mismatch
      const clerkIdInDb = sowndharya.clerkUserId || sowndharya.account?.userId;
      if (!clerkIdInDb) {
        console.log('\n⚠️  ISSUE DETECTED: No Clerk User ID linked to this employee!');
        console.log('   The employee record exists but is not linked to a Clerk account.');
        console.log('   This can happen after password reset if re-registration occurred.');
      } else if (!clerkIdInDb.startsWith('user_3ANkW')) {
        console.log('\n⚠️  POSSIBLE MISMATCH DETECTED!');
        console.log(`   DB has:    ${clerkIdInDb}`);
        console.log('   Auth has:  user_3ANkW... (from logs)');
        console.log('   These may not match - verify the full IDs');
      } else {
        console.log('\n✅ Clerk ID appears to match the authenticated user');
      }

      // Show full account object
      console.log('\n📦 Full account object:');
      console.log(JSON.stringify(sowndharya.account, null, 2));

      // Check timestamps
      console.log('\n⏰ Timestamps:');
      console.log(`   createdAt: ${sowndharya.createdAt}`);
      console.log(`   updatedAt: ${sowndharya.updatedAt}`);
    }

    // Also search for any employee with user_3ANkW clerk ID
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('SEARCHING FOR user_3ANkW... IN ALL EMPLOYEES');
    console.log('═══════════════════════════════════════════════════════════════');

    const byClerkId = await employeesCollection.find({
      $or: [
        { clerkUserId: { $regex: /^user_3ANkW/i } },
        { 'account.userId': { $regex: /^user_3ANkW/i } }
      ]
    }).toArray();

    if (byClerkId.length === 0) {
      console.log('❌ No employee found with Clerk ID starting with "user_3ANkW"');
      console.log('   This confirms a MISMATCH - the authenticated user has no linked employee record');
    } else {
      console.log(`✅ Found ${byClerkId.length} employee(s) with matching Clerk ID:`);
      byClerkId.forEach(emp => {
        console.log(`   - ${emp.firstName} ${emp.lastName} (${emp.email})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n\nDisconnected from MongoDB');
  }
}

checkEmployeeClerkLinkage();
