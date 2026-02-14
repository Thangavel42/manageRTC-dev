/**
 * List all page names in database
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'AmasQIS';
const MONGODB_URI = MONGO_URI.includes('?')
  ? `${MONGO_URI}&dbName=${DB_NAME}`
  : `${MONGO_URI}${MONGO_URI.endsWith('/') ? '' : '/'}${DB_NAME}`;

async function listPages() {
  await mongoose.connect(MONGODB_URI);

  const pages = await mongoose.connection.db.collection('pages')
    .find({})
    .project({ name: 1, displayName: 1, moduleCategory: 1 })
    .sort({ moduleCategory: 1, name: 1 })
    .toArray();

  // Group by category
  const grouped = {};
  pages.forEach(p => {
    const cat = p.moduleCategory || 'null';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(p.name);
  });

  console.log('Pages by Category:\n');
  Object.keys(grouped).sort().forEach(cat => {
    console.log(`${cat}:`);
    grouped[cat].forEach(name => console.log(`  ${name}`));
    console.log('');
  });

  await mongoose.disconnect();
}

listPages();
