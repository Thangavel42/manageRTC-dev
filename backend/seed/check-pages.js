import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Build proper connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'AmasQIS';
const MONGODB_URI = MONGO_URI.includes('?')
  ? `${MONGO_URI}&dbName=${DB_NAME}`
  : `${MONGO_URI}${MONGO_URI.endsWith('/') ? '' : '/'}${DB_NAME}`;

async function check() {
  await mongoose.connect(MONGODB_URI);

  // Check one specific page
  const page = await mongoose.connection.db.collection('pages').findOne({ name: 'hrm.employees' });
  console.log('hrm.employees:', page ? 'FOUND' : 'NOT FOUND');

  const page2 = await mongoose.connection.db.collection('pages').findOne({ name: 'super-admin.dashboard' });
  console.log('super-admin.dashboard:', page2 ? 'FOUND' : 'NOT FOUND');

  const page3 = await mongoose.connection.db.collection('pages').findOne({ name: 'dashboards.admin' });
  console.log('dashboards.admin:', page3 ? 'FOUND' : 'NOT FOUND');

  // Count
  const count = await mongoose.connection.db.collection('pages').countDocuments();
  console.log('Total pages:', count);

  await mongoose.disconnect();
}

check();
