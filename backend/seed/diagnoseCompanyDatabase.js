/**
 * Diagnostic script to check company databases for employees
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';

async function diagnoseCompanyDatabases() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    // List all databases
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();

    console.log('=== ALL DATABASES ===');
    const companyDbs = databases.databases
      .map(d => d.name)
      .filter(name =>
        name !== 'admin' &&
        name !== 'local' &&
        name !== 'config' &&
        name.length === 24 // ObjectId length
      );

    console.log('Potential company databases:', companyDbs);
    console.log();

    // Check each company database
    for (const dbName of companyDbs) {
      console.log(`=== CHECKING DATABASE: ${dbName} ===`);
      const db = client.db(dbName);

      // Check employees
      const employees = await db.collection('employees').find({}).limit(5).toArray();
      console.log(`Employees: ${employees.length} total`);

      if (employees.length > 0) {
        employees.forEach(emp => {
          console.log(` - ${emp.employeeId}: ${emp.firstName || ''} ${emp.lastName || ''}`);
          console.log(`   clerkUserId: ${emp.clerkUserId || 'NONE'}`);
          console.log(`   companyId: ${emp.companyId || 'NONE'}`);
          console.log(`   hasLeaveBalance: ${!!emp.leaveBalance?.balances}`);
          if (emp.leaveBalance?.balances) {
            console.log(`   Balances: ${emp.leaveBalance.balances.map(b => `${b.type}=${b.balance}`).join(', ')}`);
          }
        });
      }

      // Check leaveTypes
      const leaveTypes = await db.collection('leaveTypes').find({
        isActive: true,
        isDeleted: { $ne: true }
      }).toArray();
      console.log(`LeaveTypes: ${leaveTypes.length} active types`);
      if (leaveTypes.length > 0) {
        leaveTypes.forEach(lt => {
          console.log(` - ${lt.code} (${lt.name}): quota=${lt.annualQuota}`);
        });
      }

      console.log();
    }

    // Also check AmasQIS
    console.log('=== CHECKING AmasQIS DATABASE ===');
    const amasQIS = client.db('AmasQIS');
    const amasEmployees = await amasQIS.collection('employees').find({}).limit(5).toArray();
    console.log(`Employees: ${amasEmployees.length} total`);
    if (amasEmployees.length > 0) {
      amasEmployees.forEach(emp => {
        console.log(` - ${emp.employeeId}: ${emp.firstName} ${emp.lastName}`);
        console.log(`   clerkUserId: ${emp.clerkUserId || 'NONE'}`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

diagnoseCompanyDatabases();
