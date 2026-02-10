/**
 * Test connection to AmasQIS (with capital A)
 */

import mongoose from 'mongoose';
import Permission from '../models/rbac/permission.schema.js';
import Role from '../models/rbac/role.schema.js';

// Try with capital A
const MONGO_URI = 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/AmasQIS?retryWrites=true&w=majority';

async function testConnection() {
  try {
    console.log('🔌 Connecting to AmasQIS database (capital A)...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected!');
    console.log('📍 Database:', mongoose.connection.name);

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Collections:', collections.map(c => c.name));

    const permCount = await Permission.countDocuments();
    const roleCount = await Role.countDocuments();

    console.log(`\n📝 Permissions in "permissions" collection: ${permCount}`);
    console.log(`👥 Roles in "roles" collection: ${roleCount}`);

    if (permCount > 0) {
      const samples = await Permission.find({}).limit(5);
      console.log('\n📝 Sample permissions:');
      samples.forEach(p => {
        console.log(`  - [${p.category}] ${p.displayName} (${p.module})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testConnection();
