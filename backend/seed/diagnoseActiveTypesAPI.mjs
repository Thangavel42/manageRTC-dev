/**
 * Test the /api/leave-types/active endpoint
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const COMPANY_ID = '6982468548550225cc5585a9';

async function testActiveTypesAPI() {
  const client = new MongoClient(DB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(COMPANY_ID);
    const leaveTypes = db.collection('leaveTypes');

    // Simulate the exact query from getActiveLeaveTypes
    const leaveTypesData = await leaveTypes.find({
      companyId: COMPANY_ID,
      isActive: true,
      isDeleted: { $ne: true }
    }).toArray();

    console.log('=== RAW DATA FROM LEAVETYPES COLLECTION ===');
    console.log(`Found ${leaveTypesData.length} active leave types\n`);

    leaveTypesData.forEach(lt => {
      console.log(`_id: ${lt._id}`);
      console.log(`code: ${lt.code}`);
      console.log(`name: ${lt.name}`);
      console.log(`---`);
    });

    // Transform to dropdown format (same as backend)
    const dropdownData = leaveTypesData.map(lt => ({
      value: lt._id.toString(),
      label: lt.name,
      code: lt.code,
      color: lt.color,
      icon: lt.icon,
      requiresApproval: lt.requiresApproval,
      isPaid: lt.isPaid
    }));

    console.log('\n=== DROPDOWN DATA (sent to frontend) ===');
    console.log(JSON.stringify(dropdownData, null, 2));

    // Check what codes are returned
    console.log('\n=== CODES (lowercase) FOR MATCHING ===');
    dropdownData.forEach(d => {
      console.log(`${d.code} -> ${d.code.toLowerCase()}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await client.close();
  }
}

testActiveTypesAPI();
