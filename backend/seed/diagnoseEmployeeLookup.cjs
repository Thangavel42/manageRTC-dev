/**
 * Diagnostic to check why employee lookup fails in time tracking
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function diagnose() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('69a52c6d838388b740e80723');

  console.log('=== EMPLOYEE LOOKUP DIAGNOSTIC ===\n');

  // Simulate what the controller does
  const userIdFromToken = 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia'; // This is what req.user.userId would be

  console.log('1. SIMULATING CONTROLLER EMPLOYEE LOOKUP');
  console.log('   userId from token:', userIdFromToken);

  // This is exactly what the controller does:
  const employee = await db.collection('employees').findOne(
    {
      $or: [
        { clerkUserId: userIdFromToken },
        { 'account.userId': userIdFromToken }
      ],
      isDeleted: { $ne: true }
    },
    { projection: { _id: 1 } }
  );

  console.log('   Employee found:', !!employee);
  if (employee) {
    console.log('   Employee _id:', employee._id.toString());
  } else {
    console.log('   ❌ EMPLOYEE LOOKUP FAILED!');
  }

  console.log('\n2. DIRECT LOOKUP (no projection, no isDeleted check)');
  const directEmployee = await db.collection('employees').findOne({
    clerkUserId: userIdFromToken
  });
  console.log('   Found:', !!directEmployee);
  if (directEmployee) {
    console.log('   _id:', directEmployee._id.toString());
    console.log('   clerkUserId:', directEmployee.clerkUserId);
    console.log('   isDeleted:', directEmployee.isDeleted);
    console.log('   firstName:', directEmployee.firstName);
    console.log('   lastName:', directEmployee.lastName);
  }

  console.log('\n3. CHECKING ALL EMPLOYEES');
  const allEmployees = await db.collection('employees').find({}).toArray();
  console.log('   Total employees:', allEmployees.length);
  console.log('\n   All clerkUserIds:');
  allEmployees.forEach(emp => {
    console.log('   -', emp.clerkUserId, '|', emp.firstName, emp.lastName, '| isDeleted:', emp.isDeleted);
  });

  console.log('\n4. CHECKING FOR ACCOUNT.USERID');
  const withAccountUserId = await db.collection('employees').findOne({
    'account.userId': userIdFromToken
  });
  console.log('   Found by account.userId:', !!withAccountUserId);

  await client.close();
}

diagnose().catch(console.error);
