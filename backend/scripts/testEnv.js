import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Manually parse .env file
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf8');

// Parse each line and set environment variables
envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key, ...valueParts] = trimmedLine.split('=');
    const value = valueParts.join('=');
    if (key && value !== undefined) {
      process.env[key] = value;
    }
  }
});

console.log('=== MANUAL ENV PARSING ===');
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('====================');

async function testConnection() {
  try {
    console.log('\nConnecting to:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!');
    console.log('📍 Database:', mongoose.connection.name);
    console.log('📍 DB from client options:', mongoose.connection.client.options.dbName);

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📊 Collections:', collections.map(c => c.name));

    // Count permissions
    const permissions = await mongoose.connection.db.collection('permissions').countDocuments();
    const roles = await mongoose.connection.db.collection('roles').countDocuments();
    console.log(`\n📝 Permissions: ${permissions}`);
    console.log(`👥 Roles: ${roles}`);

    await mongoose.disconnect();
    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testConnection();
