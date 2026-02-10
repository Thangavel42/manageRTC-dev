import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = resolve(__dirname, '../.env');
console.log('=== DEBUG INFO ===');
console.log('Env path:', envPath);
console.log('File exists:', existsSync(envPath));

// Read and show first few lines
try {
  const envContent = readFileSync(envPath, 'utf8');
  console.log('First 200 chars of .env:');
  console.log(envContent.substring(0, 200));
} catch (e) {
  console.log('Error reading .env:', e.message);
}

const result = config({ path: envPath });
console.log('Dotenv result error:', result.error);

console.log('MONGODB_URI after config:', process.env.MONGODB_URI);
console.log('==================');

import mongoose from 'mongoose';

async function testConnection() {
  try {
    console.log('\nConnecting to:', process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected! DB Name:', mongoose.connection.name);
    console.log('DB from client options:', mongoose.connection.client.options.dbName);

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections:', collections.map(c => c.name));

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testConnection();
