/**
 * Deep diagnostic for time entry access issue
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function diagnose() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('69a52c6d838388b740e80723');

  console.log('=== DEEP ACCESS DIAGNOSTIC ===\n');

  const clerkUserId = 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia';
  const employeeObjectId = '69a54b831a76b37802cbcc3b';
  const projectId = '69a67cc558a24ac5a4cbe1fe';

  // 1. Check all ways the employee might be stored
  console.log('1. EMPLOYEE LOOKUP TESTS');

  const byClerkUserId = await db.collection('employees').findOne({
    clerkUserId: clerkUserId
  });
  console.log('   By clerkUserId:', !!byClerkUserId, '| _id:', byClerkUserId?._id.toString());

  const byAccountUserId = await db.collection('employees').findOne({
    'account.userId': clerkUserId
  });
  console.log('   By account.userId:', !!byAccountUserId, '| _id:', byAccountUserId?._id.toString());

  const byId = await db.collection('employees').findOne({
    _id: new ObjectId(employeeObjectId)
  });
  console.log('   By _id:', !!byId, '| _id:', byId?._id.toString());

  // 2. Check the exact project membership arrays
  console.log('\n2. PROJECT MEMBERSHIP DETAIL');
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId)
  });

  console.log('   teamMembers type:', Array.isArray(project.teamMembers));
  console.log('   teamMembers:', project.teamMembers);
  console.log('   teamMembers as strings:', project.teamMembers?.map(id => id.toString()));

  const empIdStr = employeeObjectId.toString();
  const empIdObj = new ObjectId(employeeObjectId);

  console.log('\n   Checking membership...');
  console.log('   empIdStr:', empIdStr);
  console.log('   teamMembers.includes(empIdStr):', project.teamMembers?.some(id => id.toString() === empIdStr));

  // 3. Simulate the exact query from the controller
  console.log('\n3. CONTROLLER QUERY SIMULATION');
  const controllerQuery = {
    _id: new ObjectId(projectId),
    $or: [
      { isDeleted: false },
      { isDeleted: { $exists: false } }
    ],
    $or: [
      { teamMembers: empIdObj },
      { teamMembers: empIdStr },
      { teamLeader: empIdObj },
      { teamLeader: empIdStr },
      { projectManager: empIdObj },
      { projectManager: empIdStr }
    ]
  };

  const projectByControllerQuery = await db.collection('projects').findOne(controllerQuery);
  console.log('   Project found by controller query:', !!projectByControllerQuery);

  // 4. Check if there are any type mismatches
  console.log('\n4. TYPE MISMATCH CHECK');
  console.log('   employeeObjectId type:', typeof employeeObjectId);
  console.log('   teamMembers[0] type:', typeof project.teamMembers?.[0]);
  console.log('   Are they both ObjectIds?', project.teamMembers?.[0] instanceof ObjectId);

  // 5. Try a simpler query
  console.log('\n5. SIMPLIFIED QUERY TEST');
  const simpleQuery = {
    _id: new ObjectId(projectId),
    teamMembers: new ObjectId(employeeObjectId)
  };
  const projectBySimple = await db.collection('projects').findOne(simpleQuery);
  console.log('   Found by simple teamMembers query:', !!projectBySimple);

  // 6. Check the raw document
  console.log('\n6. RAW PROJECT DOCUMENT');
  console.log('   teamMembers raw:', JSON.stringify(project.teamMembers));

  await client.close();
}

diagnose().catch(console.error);
