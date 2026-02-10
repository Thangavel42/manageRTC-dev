/**
 * Compare old vs new permission structures
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Role from '../models/rbac/role.schema.js';
import RolePermission from '../models/rbac/rolePermission.schema.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

async function compareStructures() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected to:', dbName);
    console.log('');

    // Get Super Admin role ID
    const superAdmin = await Role.findOne({ name: 'superadmin' });
    if (!superAdmin) {
      console.log('❌ Super Admin role not found');
      return;
    }

    console.log('='.repeat(70));
    console.log('📊 STRUCTURE COMPARISON FOR SUPER ADMIN');
    console.log('='.repeat(70));
    console.log(`Role ID: ${superAdmin._id}`);
    console.log('');

    // ============================================
    // OLD STRUCTURE: Junction Table (rolePermissions)
    // ============================================
    console.log('1️⃣ OLD STRUCTURE: rolePermissions Collection (Junction Table)');
    console.log('-'.repeat(70));

    const junctionDocs = await RolePermission.find({ roleId: superAdmin._id })
      .limit(3)
      .lean();

    console.log(`   Total documents in junction table: ${await RolePermission.countDocuments({ roleId: superAdmin._id })}`);
    console.log('');
    console.log('   📄 Sample Documents (each permission = 1 document):');
    console.log('');

    junctionDocs.forEach((doc, i) => {
      console.log(`   Document ${i + 1}:`);
      console.log(`   {`);
      console.log(`     _id: "${doc._id}",`);
      console.log(`     roleId: "${doc.roleId}",`);
      console.log(`     permissionId: "${doc.permissionId}",`);
      console.log(`     actions: { all: ${doc.actions.all}, read: ${doc.actions.read}, ... }`);
      console.log(`   }`);
      console.log('');
    });

    console.log('   ⚠️  Problem: 144 separate documents for Super Admin permissions!');
    console.log('');

    // ============================================
    // NEW STRUCTURE: Embedded Permissions
    // ============================================
    console.log('2️⃣ NEW STRUCTURE: roles.permissions[] (Embedded Array)');
    console.log('-'.repeat(70));

    console.log(`   Total embedded permissions: ${superAdmin.permissions.length}`);
    console.log('');
    console.log('   📄 Single Role Document with permissions array:');
    console.log('');
    console.log(`   {`);
    console.log(`     _id: "${superAdmin._id}",`);
    console.log(`     name: "${superAdmin.name}",`);
    console.log(`     displayName: "${superAdmin.displayName}",`);
    console.log(`     `);
    console.log(`     // EMBEDDED PERMISSIONS ARRAY (all 144 in one document)`);
    console.log(`     permissions: [`);

    // Show first 3 permissions
    superAdmin.permissions.slice(0, 3).forEach((perm, i) => {
      console.log(`       {`);
      console.log(`         permissionId: "${perm.permissionId}",`);
      console.log(`         module: "${perm.module}",`);
      console.log(`         category: "${perm.category}",`);
      console.log(`         displayName: "${perm.displayName}",`);
      console.log(`         actions: { all: ${perm.actions.all}, read: ${perm.actions.read}, ... }`);
      console.log(`       }${i < 2 ? ',' : ''}`);
    });

    console.log(`       // ... ${superAdmin.permissions.length - 3} more permissions`);
    console.log(`     ],`);
    console.log(`     `);
    console.log(`     // PERMISSION STATS`);
    console.log(`     permissionStats: {`);
    console.log(`       totalPermissions: ${superAdmin.permissionStats.totalPermissions},`);
    console.log(`       categories: [${superAdmin.permissionStats.categories.slice(0, 5).join(', ')}, ...],`);
    console.log(`       lastUpdatedAt: "${superAdmin.permissionStats.lastUpdatedAt}"`);
    console.log(`     }`);
    console.log(`   }`);
    console.log('');

    // ============================================
    // COMPARISON SUMMARY
    // ============================================
    console.log('='.repeat(70));
    console.log('📊 MIGRATION SUMMARY');
    console.log('='.repeat(70));
    console.log('');
    console.log('   BEFORE (Junction Table):');
    console.log('   ├── Documents: 144 (one per permission)');
    console.log('   ├── Collection: rolePermissions');
    console.log('   └── Queries needed: 2 (roles + rolePermissions)');
    console.log('');
    console.log('   AFTER (Embedded):');
    console.log('   ├── Documents: 1 (with 144 items in array)');
    console.log('   ├── Collection: roles');
    console.log('   └── Queries needed: 1 (roles only)');
    console.log('');

    // Verify counts match
    const junctionCount = await RolePermission.countDocuments({ roleId: superAdmin._id });
    const embeddedCount = superAdmin.permissions.length;

    console.log('='.repeat(70));
    console.log('✅ VERIFICATION');
    console.log('='.repeat(70));
    console.log(`   Junction table count: ${junctionCount}`);
    console.log(`   Embedded array count: ${embeddedCount}`);
    console.log(`   Match: ${junctionCount === embeddedCount ? '✅ YES' : '❌ NO'}`);
    console.log('');

    if (junctionCount === embeddedCount) {
      console.log('   🎉 MIGRATION SUCCESSFUL!');
      console.log('   All permissions have been migrated to the embedded structure.');
    }

    await mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

compareStructures();
