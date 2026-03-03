import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

import PageCategory from '../models/rbac/pageCategory.schema.js';

const check = async () => {
  try {
    let mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/manageRTC';
    const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';
    
    if (!mongoURI.endsWith('/') && !mongoURI.includes('/' + dbName)) {
      mongoURI += '/' + dbName;
    } else if (mongoURI.endsWith('/')) {
      mongoURI += dbName;
    }
    
    await mongoose.connect(mongoURI);
    
    const cats = await PageCategory.find().sort({ sortOrder: 1 });
    console.log('\nPage Categories:');
    cats.forEach(c => console.log(`  ${c.identifier}. ${c.displayName} (${c.label})`));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

check();
