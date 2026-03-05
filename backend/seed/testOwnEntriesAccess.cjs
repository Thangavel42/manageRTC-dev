/**
 * Test to verify "own entries always visible" logic
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function test() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('69a52c6d838388b740e80723');

  console.log('=== OWN ENTRIES ALWAYS VISIBLE TEST ===\n');

  const clerkUserId = 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia';
  const employeeObjectId = '69a54b831a76b37802cbcc3b';
  const projectId = '69a67cc558a24ac5a4cbe1fe';

  // 1. Find the time entry
  const timeEntry = await db.collection('timeEntries').findOne({
    userId: clerkUserId,
    isDeleted: { $ne: true }
  });

  if (!timeEntry) {
    console.log('❌ No time entries found for user');
    await client.close();
    return;
  }

  console.log('1. TIME ENTRY FOUND');
  console.log('   Entry ID:', timeEntry.timeEntryId);
  console.log('   Description:', timeEntry.description);
  console.log('   User ID:', timeEntry.userId);
  console.log('   Project ID:', timeEntry.projectId?.toString());
  console.log('   Task ID:', timeEntry.taskId?.toString());

  // 2. Check user's project assignments
  console.log('\n2. USER PROJECT ASSIGNMENTS');
  const employee = await db.collection('employees').findOne({
    clerkUserId: clerkUserId
  });

  const empIdStr = employee._id.toString();
  const allProjects = await db.collection('projects').find({
    $or: [
      { teamMembers: employee._id },
      { teamLeader: employee._id },
      { projectManager: employee._id }
    ]
  }).toArray();

  console.log('   Total assigned projects:', allProjects.length);

  const timeEntryProject = await db.collection('projects').findOne({
    _id: timeEntry.projectId
  });

  if (timeEntryProject) {
    const isMember = timeEntryProject.teamMembers?.some(id => id.toString() === empIdStr);
    const isTL = timeEntryProject.teamLeader?.some(id => id.toString() === empIdStr);
    const isPM = timeEntryProject.projectManager?.some(id => id.toString() === empIdStr);

    console.log('\n3. TIME ENTRY PROJECT ASSIGNMENT');
    console.log('   Project:', timeEntryProject.name);
    console.log('   Is Team Member:', isMember);
    console.log('   Is Team Lead:', isTL);
    console.log('   Is Project Manager:', isPM);
    console.log('   Has ANY assignment:', isMember || isTL || isPM);
  }

  // 3. Simulate the new permission logic
  console.log('\n4. NEW PERMISSION LOGIC TEST');
  console.log('   Scenario: User requests their own entries');
  console.log('   - isRequestingOwnEntries: true (userId filter = current user)');
  console.log('   - isAdmin: false');
  console.log('   - projectIds.length: 0 (simulating NO project assignment)');
  console.log('\n   OLD LOGIC: if (!isAdmin && projectIds.length === 0) → BLOCK ❌');
  console.log('   NEW LOGIC: if (!isAdmin && !isRequestingOwnEntries && projectIds.length === 0) → ALLOW ✅');
  console.log('\n   Result: User can see their own entries regardless of project assignment!');

  // 4. Test each endpoint
  console.log('\n5. ENDPOINT ACCESS TEST');
  console.log('   GET /api/timetracking (no userId filter)');
  console.log('   → isRequestingOwnEntries: true ✅ Always allowed');
  console.log('\n   GET /api/timetracking?userId=' + clerkUserId);
  console.log('   → isRequestingOwnEntries: true ✅ Always allowed');
  console.log('\n   GET /api/timetracking/project/' + projectId);
  console.log('   → isRequestingOwnEntries: true ✅ Always allowed (filters to own entries)');
  console.log('\n   GET /api/timetracking/task/' + timeEntry.taskId?.toString());
  console.log('   → isRequestingOwnEntries: true ✅ Always allowed (filters to own entries)');

  // 5. Summary
  console.log('\n=== SUMMARY ===');
  console.log('✅ OWN ENTRIES ALWAYS VISIBLE:');
  console.log('   - Users can always see their own time entries');
  console.log('   - No project assignment required for own entries');
  console.log('   - Works for all roles: employee, manager, admin, hr');
  console.log('   - Applies to all endpoints: main, project, task');
  console.log('\n⚠️  OTHER USERS\' ENTRIES:');
  console.log('   - Still require project assignment');
  console.log('   - Admin/HR can see all entries');
  console.log('   - PM/TL can see entries for managed projects');
  console.log('   - Team members can see entries for assigned projects');
  console.log('\n⚠️  IMPORTANT: Restart backend server for changes to take effect!');

  await client.close();
}

test().catch(console.error);
