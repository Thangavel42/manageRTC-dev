/**
 * Migration: Clean up duplicate employee fields
 *
 * Problem: Employees have duplicate data in both nested (contact, personal)
 * and root-level (email, phone, gender, dateOfBirth, address) fields.
 *
 * Solution: Remove nested contact and personal objects, keep only root-level fields.
 *
 * Run: node backend/migrations/cleanupEmployeeDuplicateFields.js
 */

import { client } from '../config/db.js';

const cleanupEmployeeDuplicates = async () => {
  console.log('🔧 Starting employee duplicate field cleanup migration...\n');

  try {
    // Get list of all company databases
    const admin = client.db().admin();
    const { databases } = await admin.listDatabases();

    let totalProcessed = 0;
    let totalUpdated = 0;

    for (const dbInfo of databases) {
      const dbName = dbInfo.name;

      // Skip system databases
      if (dbName === 'admin' || dbName === 'local' || dbName === 'config' || dbName === 'manageRTC_superadmin') {
        continue;
      }

      console.log(`📂 Processing database: ${dbName}`);

      const db = client.db(dbName);
      const employeesCollection = db.collection('employees');

      // Count total employees
      const totalEmployees = await employeesCollection.countDocuments({});
      console.log(`   Found ${totalEmployees} employees`);

      if (totalEmployees === 0) {
        console.log(`   ⏭️  Skipping (no employees)\n`);
        continue;
      }

      // Find employees that have duplicate nested fields
      const employeesWithDuplicates = await employeesCollection.find({
        $or: [
          { 'contact': { $exists: true } },
          { 'personal': { $exists: true } }
        ]
      }).toArray();

      console.log(`   Found ${employeesWithDuplicates.length} employees with duplicate fields`);

      for (const employee of employeesWithDuplicates) {
        const updates = {};
        const unsets = {};

        // Extract nested contact fields to root if they exist
        if (employee.contact) {
          if (employee.contact.email && !employee.email) {
            updates.email = employee.contact.email;
          }
          if (employee.contact.phone && !employee.phone) {
            updates.phone = employee.contact.phone;
          }
          // Remove contact object
          unsets.contact = '';
        }

        // Extract nested personal fields to root if they exist
        if (employee.personal) {
          if (employee.personal.gender && !employee.gender) {
            updates.gender = employee.personal.gender;
          }
          if (employee.personal.birthday && !employee.dateOfBirth) {
            updates.dateOfBirth = employee.personal.birthday;
          }
          if (employee.personal.address && !employee.address) {
            updates.address = employee.personal.address;
          }
          // Remove personal object
          unsets.personal = '';
        }

        // Apply updates
        const updateDoc = {};
        if (Object.keys(updates).length > 0) {
          updateDoc.$set = updates;
        }
        if (Object.keys(unsets).length > 0) {
          updateDoc.$unset = unsets;
        }

        if (Object.keys(updateDoc).length > 0) {
          await employeesCollection.updateOne(
            { _id: employee._id },
            updateDoc
          );
          totalUpdated++;
        }

        totalProcessed++;
      }

      console.log(`   ✅ Updated ${employeesWithDuplicates.length} employees\n`);
    }

    console.log('✅ Migration completed successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Total employees processed: ${totalProcessed}`);
    console.log(`   - Total employees updated: ${totalUpdated}`);
    console.log(`   - Duplicate fields removed: contact, personal`);
    console.log(`   - Canonical fields preserved: email, phone, gender, dateOfBirth, address\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
  }
};

// Run migration
cleanupEmployeeDuplicates()
  .then(() => {
    console.log('👋 Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });
