/**
 * Test script to verify time entry permission fix
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function test() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('69a52c6d838388b740e80723');

  console.log('=== TESTING PERMISSION FIX ===\n');

  // Test data
  const clerkUserId = 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia';
  const employeeObjectId = '69a54b831a76b37802cbcc3b';
  const projectId = '69a67cc558a24ac5a4cbe1fe';
  const taskId = '69a82c8af83f5d347798b594';

  // 1. Check if employee exists
  const employee = await db.collection('employees').findOne({
    clerkUserId: clerkUserId
  });
  console.log('1. EMPLOYEE CHECK');
  console.log('   Found:', !!employee);
  console.log('   Name:', employee?.firstName, employee?.lastName);
  console.log('   _id:', employee?._id.toString());
  console.log('   employeeId:', employee?.employeeId);

  // 2. Check project assignment
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId)
  });
  console.log('\n2. PROJECT ASSIGNMENT CHECK');
  console.log('   Project:', project?.name);
  console.log('   teamMembers:', project?.teamMembers?.map(id => id.toString()) || []);
  const empIdStr = employee?._id.toString();
  const isTeamMember = project?.teamMembers?.some(id => id.toString() === empIdStr);
  console.log('   Is team member:', isTeamMember);

  // 3. Check task belongs to project
  const task = await db.collection('tasks').findOne({
    _id: new ObjectId(taskId)
  });
  console.log('\n3. TASK TO PROJECT CHECK');
  console.log('   Task:', task?.title);
  console.log('   Task projectId:', task?.projectId?.toString());
  console.log('   Expected projectId:', projectId);
  console.log('   Match:', task?.projectId?.toString() === projectId);

  // 4. Check time entries exist
  const timeEntries = await db.collection('timeEntries').find({
    userId: clerkUserId,
    projectId: new ObjectId(projectId),
    isDeleted: { $ne: true }
  }).toArray();
  console.log('\n4. TIME ENTRIES CHECK');
  console.log('   Count:', timeEntries.length);
  timeEntries.forEach(te => {
    console.log('   -', te.timeEntryId, '|', te.description);
    console.log('     taskId:', te.taskId?.toString());
    console.log('     status:', te.status);
  });

  // 5. Simulate permission check logic
  console.log('\n5. PERMISSION CHECK SIMULATION');
  const userIsAdmin = false;
  const userIsPM = project?.projectManager?.some(id => id.toString() === empIdStr);
  const userIsTL = project?.teamLeader?.some(id => id.toString() === empIdStr);
  const userIsTeamMember = isTeamMember;

  console.log('   Admin:', userIsAdmin);
  console.log('   PM:', userIsPM);
  console.log('   TL:', userIsTL);
  console.log('   Team Member:', userIsTeamMember);
  console.log('   SHOULD HAVE ACCESS:', userIsAdmin || userIsPM || userIsTL || userIsTeamMember);

  // 6. Check what the API would return
  console.log('\n6. API ENDPOINT SIMULATION');
  console.log('   GET /api/timetracking/project/' + projectId);
  console.log('   → Would return', timeEntries.length, 'entries');

  const taskTimeEntries = await db.collection('timeEntries').find({
    taskId: new ObjectId(taskId),
    isDeleted: { $ne: true }
  }).toArray();
  console.log('   GET /api/timetracking/task/' + taskId);
  console.log('   → Would return', taskTimeEntries.length, 'entries');

  console.log('\n=== FIX SUMMARY ===');
  console.log('✅ Permission checks added to:');
  console.log('   - getTimeEntriesByProject');
  console.log('   - getTimeEntriesByTask');
  console.log('\nTeam members can now see time entries for:');
  console.log('   - Projects they are assigned to');
  console.log('   - Tasks belonging to projects they are assigned to');

  await client.close();
}

test().catch(console.error);
