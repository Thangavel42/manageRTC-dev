/**
 * Diagnostic script to analyze time entry access issue
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function analyze() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('69a52c6d838388b740e80723');

  // Find Sowndharya employee
  const sowndharya = await db.collection('employees').findOne({
    clerkUserId: 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia'
  });
  console.log('=== SOWNDHARYA EMPLOYEE ===');
  console.log('_id:', sowndharya?._id.toString());
  console.log('employeeId:', sowndharya?.employeeId);
  console.log('clerkUserId:', sowndharya?.clerkUserId);
  console.log('firstName:', sowndharya?.firstName);
  console.log('lastName:', sowndharya?.lastName);

  // Find project
  const project = await db.collection('projects').findOne({
    _id: new ObjectId('69a67cc558a24ac5a4cbe1fe')
  });
  console.log('\n=== PROJECT (StyleSync?) ===');
  console.log('_id:', project?._id.toString());
  console.log('name:', project?.name);
  console.log('projectId:', project?.projectId);
  console.log('teamMembers:', project?.teamMembers?.map(id => id.toString()) || []);
  console.log('teamLeader:', project?.teamLeader?.map(id => id.toString()) || []);
  console.log('projectManager:', project?.projectManager?.map(id => id.toString()) || []);

  // Check if she's in the project
  const empIdStr = sowndharya?._id.toString();
  console.log('\n=== PROJECT MEMBERSHIP ===');
  console.log('Is teamMember:', project?.teamMembers?.some(id => id.toString() === empIdStr));
  console.log('Is teamLeader:', project?.teamLeader?.some(id => id.toString() === empIdStr));
  console.log('Is projectManager:', project?.projectManager?.some(id => id.toString() === empIdStr));

  // Find all projects she belongs to
  const myProjects = await db.collection('projects').find({
    $or: [
      { teamMembers: sowndharya?._id },
      { teamLeader: sowndharya?._id },
      { projectManager: sowndharya?._id }
    ]
  }).toArray();
  console.log('\n=== ALL PROJECTS SOWNDHARYA BELONGS TO (' + myProjects.length + ') ===');
  myProjects.forEach(p => {
    const isTM = p.teamMembers?.some(id => id.toString() === empIdStr);
    const isTL = p.teamLeader?.some(id => id.toString() === empIdStr);
    const isPM = p.projectManager?.some(id => id.toString() === empIdStr);
    console.log('-', p.name, '(TM:', isTM, 'TL:', isTL, 'PM:', isPM, ')');
  });

  // Find her time entries
  const timeEntries = await db.collection('timeEntries').find({
    userId: 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia',
    isDeleted: { $ne: true }
  }).toArray();
  console.log('\n=== TIME ENTRIES (' + timeEntries.length + ') ===');
  timeEntries.forEach(te => {
    console.log('-', te.timeEntryId, '|', te.description);
    console.log('  projectId:', te.projectId?.toString());
    console.log('  status:', te.status);
  });

  // Check what task board would query - time entries by task
  console.log('\n=== CHECKING HOW TASK BOARD GETS TIME ENTRIES ===');
  console.log('The task board likely calls: GET /api/timetracking/task/:taskId');
  const taskId = '69a82c8af83f5d347798b594';
  const taskTimeEntries = await db.collection('timeEntries').find({
    taskId: new ObjectId(taskId),
    isDeleted: { $ne: true }
  }).toArray();
  console.log('Time entries for task', taskId, ':', taskTimeEntries.length);

  await client.close();
}

analyze().catch(console.error);
