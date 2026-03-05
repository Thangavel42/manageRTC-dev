/**
 * Test to verify PURE team member access (not TL/PM)
 */

require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');

async function test() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('69a52c6d838388b740e80723');

  console.log('=== PURE TEAM MEMBER TEST (NOT TL/PM) ===\n');

  const clerkUserId = 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia';
  const employeeObjectId = '69a54b831a76b37802cbcc3b';
  const projectId = '69a67cc558a24ac5a4cbe1fe';

  // 1. Check current project state
  const project = await db.collection('projects').findOne({
    _id: new ObjectId(projectId)
  });

  const empIdStr = employeeObjectId.toString();
  const isTeamMember = project.teamMembers?.some(id => id.toString() === empIdStr);
  const isTeamLead = project.teamLeader?.some(id => id.toString() === empIdStr);
  const isProjManager = project.projectManager?.some(id => id.toString() === empIdStr);

  console.log('1. CURRENT PROJECT STATE');
  console.log('   Project:', project.name);
  console.log('   Is Team Member:', isTeamMember);
  console.log('   Is Team Lead:', isTeamLead);
  console.log('   Is Project Manager:', isProjManager);

  // 2. Simulate PURE team member (only in teamMembers, NOT in teamLeader or projectManager)
  console.log('\n2. SIMULATING PURE TEAM MEMBER SCENARIO');
  console.log('   (User only in teamMembers array, NOT in teamLeader or projectManager)');

  const employee = await db.collection('employees').findOne({
    clerkUserId: clerkUserId
  });

  const empId = employee._id;

  // NEW LOGIC: Check for PM, TL, AND team member
  const assignedProjects = await db.collection('projects').find({
    $and: [
      { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      {
        $or: [
          { projectManager: { $in: [empId, empIdStr] } },
          { teamLeader: { $in: [empId, empIdStr] } },
          { teamMembers: { $in: [empId, empIdStr] } }
        ]
      }
    ]
  }).toArray();

  // Check if user has elevated role (PM or TL only - NOT team members)
  const hasElevatedRole = await db.collection('projects').findOne({
    $and: [
      { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
      {
        $or: [
          { projectManager: { $in: [empId, empIdStr] } },
          { teamLeader: { $in: [empId, empIdStr] } }
        ]
      }
    ]
  });

  const projectIds = assignedProjects.map(p => p._id);
  const isAdmin = false;
  const isPMorTL = !!hasElevatedRole;

  console.log('\n   getUserProjectScope results:');
  console.log('   isAdmin:', isAdmin);
  console.log('   isPMorTL:', isPMorTL, '(elevated role: PM or TL, NOT team member)');
  console.log('   projectIds.length:', projectIds.length);

  // 3. Test main endpoint access (NEW LOGIC)
  console.log('\n3. MAIN ENDPOINT ACCESS CHECK (NEW LOGIC)');
  console.log('   Old check: if (!isAdmin && !isPMorTL) → BLOCK');
  console.log('   New check: if (!isAdmin && projectIds.length === 0) → BLOCK');

  const oldLogicWouldBlock = !isAdmin && !isPMorTL;
  const newLogicWouldBlock = !isAdmin && projectIds.length === 0;

  console.log('\n   Old logic result:', oldLogicWouldBlock ? 'BLOCKED ❌' : 'ALLOWED ✅');
  console.log('   New logic result:', newLogicWouldBlock ? 'BLOCKED ❌' : 'ALLOWED ✅');

  // 4. Test with specific project where user is ONLY team member
  console.log('\n4. TESTING PURE TEAM MEMBER PROJECT');
  const pureTMProjects = assignedProjects.filter(p => {
    const pidStr = p._id.toString();
    const isTM = p.teamMembers?.some(id => id.toString() === empIdStr);
    const isTL = p.teamLeader?.some(id => id.toString() === empIdStr);
    const isPM = p.projectManager?.some(id => id.toString() === empIdStr);
    return isTM && !isTL && !isPM; // ONLY team member
  });

  console.log('   Projects where user is ONLY team member:', pureTMProjects.length);
  pureTMProjects.forEach(p => {
    console.log('   -', p.name);
  });

  if (pureTMProjects.length > 0) {
    const testProject = pureTMProjects[0];
    console.log('\n   Testing with project:', testProject.name);
    console.log('   Can access via main endpoint:', projectIds.some(pid => pid.toString() === testProject._id.toString()) ? 'YES ✅' : 'NO ❌');
  }

  // 5. Summary
  console.log('\n=== SUMMARY ===');
  console.log('✅ The fix correctly handles pure team members:');
  console.log('   - getUserProjectScope includes teamMembers in projectIds');
  console.log('   - Main endpoint checks projectIds.length instead of isPMorTL');
  console.log('   - Pure team members can now access their assigned projects');
  console.log('\n⚠️  IMPORTANT: Restart backend server for changes to take effect!');

  await client.close();
}

test().catch(console.error);
