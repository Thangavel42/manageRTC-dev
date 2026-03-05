/**
 * Diagnostic script to analyze why Sowndharya can't see her time entries
 */

const { MongoClient, ObjectId } = require('mongodb');

async function analyze() {
  const client = new MongoClient('mongodb://localhost:27017');

  try {
    await client.connect();
    const db = client.db('69a52c6d838388b740e80723');

    const clerkUserId = 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia';
    const employeeObjectId = '69a54b831a76b37802cbcc3b';
    const projectId = '69a67cc558a24ac5a4cbe1fe';

    console.log('=== EMPLOYEE ANALYSIS ===');
    const employee = await db.collection('employees').findOne({
      _id: new ObjectId(employeeObjectId)
    });
    console.log('Employee found:', !!employee);
    if (employee) {
      console.log('Employee _id:', employee._id.toString());
      console.log('Employee employeeId:', employee.employeeId);
      console.log('Employee clerkUserId:', employee.clerkUserId);
      console.log('Employee firstName:', employee.firstName);
      console.log('Employee lastName:', employee.lastName);
      console.log('Employee status:', employee.status);
    }

    console.log('\n=== PROJECT ANALYSIS ===');
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    });
    console.log('Project found:', !!project);
    if (project) {
      console.log('Project _id:', project._id.toString());
      console.log('Project name:', project.name);
      console.log('Project projectId:', project.projectId);

      console.log('\n--- Project Team Members ---');
      console.log('teamMembers count:', project.teamMembers?.length || 0);
      console.log('teamMembers:', project.teamMembers?.map(id => id.toString()) || []);

      console.log('\n--- Project Team Leaders ---');
      console.log('teamLeader count:', project.teamLeader?.length || 0);
      console.log('teamLeader:', project.teamLeader?.map(id => id.toString()) || []);

      console.log('\n--- Project Managers ---');
      console.log('projectManager count:', project.projectManager?.length || 0);
      console.log('projectManager:', project.projectManager?.map(id => id.toString()) || []);

      // Check if employee is in the project
      const empIdStr = employeeObjectId.toString();
      const isTeamMember = project.teamMembers?.some(id => id.toString() === empIdStr);
      const isTeamLeader = project.teamLeader?.some(id => id.toString() === empIdStr);
      const isProjectManager = project.projectManager?.some(id => id.toString() === empIdStr);

      console.log('\n--- Is employee in project? ---');
      console.log('As Team Member:', isTeamMember);
      console.log('As Team Leader:', isTeamLeader);
      console.log('As Project Manager:', isProjectManager);
      console.log('Has ANY role:', isTeamMember || isTeamLeader || isProjectManager);
    }

    console.log('\n=== TIME ENTRY ANALYSIS ===');
    const timeEntry = await db.collection('timeEntries').findOne({
      userId: clerkUserId,
      projectId: new ObjectId(projectId)
    });
    console.log('Time entry found:', !!timeEntry);
    if (timeEntry) {
      console.log('Time entry userId:', timeEntry.userId);
      console.log('Time entry projectId:', timeEntry.projectId.toString());
      console.log('Time entry status:', timeEntry.status);
      console.log('Time entry isDeleted:', timeEntry.isDeleted);
    }

    console.log('\n=== GET /api/projects/my SIMULATION ===');
    // Simulate what getMyProjects returns for this user
    const myProjects = await db.collection('projects').find({
      isDeleted: false,
      $or: [
        { teamMembers: new ObjectId(employeeObjectId) },
        { teamLeader: new ObjectId(employeeObjectId) },
        { projectManager: new ObjectId(employeeObjectId) }
      ]
    }).toArray();

    console.log('Projects returned by getMyProjects:', myProjects.length);
    myProjects.forEach(p => {
      const empIdStr = employeeObjectId.toString();
      const pmIds = (p.projectManager || []).map(id => id.toString());
      const tlIds = (p.teamLeader || []).map(id => id.toString());

      let userRole = 'teamMember';
      if (pmIds.includes(empIdStr)) {
        userRole = 'projectManager';
      } else if (tlIds.includes(empIdStr)) {
        userRole = 'teamLeader';
      }

      console.log(`  - ${p.name} (userRole: ${userRole})`);
    });

    // Now let's check what getTimeEntriesByUser would return
    console.log('\n=== GET /api/timetracking/user/:userId SIMULATION ===');
    const userTimeEntries = await db.collection('timeEntries').find({
      userId: clerkUserId,
      isDeleted: { $ne: true }
    }).toArray();
    console.log('Time entries for user:', userTimeEntries.length);
    userTimeEntries.forEach(te => {
      console.log(`  - ${te.description} (project: ${te.projectId}, status: ${te.status})`);
    });

    // With project filter
    console.log('\n=== WITH PROJECT FILTER ===');
    const userTimeEntriesWithProjectFilter = await db.collection('timeEntries').find({
      userId: clerkUserId,
      projectId: new ObjectId(projectId),
      isDeleted: { $ne: true }
    }).toArray();
    console.log('Time entries for user with project filter:', userTimeEntriesWithProjectFilter.length);
    userTimeEntriesWithProjectFilter.forEach(te => {
      console.log(`  - ${te.description} (status: ${te.status})`);
    });

    // Check if there's a mismatch between userId stored and userId used for query
    console.log('\n=== CHECKING ALL TIME ENTRIES ===');
    const allEntries = await db.collection('timeEntries').find({
      isDeleted: { $ne: true }
    }).limit(10).toArray();
    console.log('Recent time entries in database:');
    allEntries.forEach(te => {
      console.log(`  - ${te.description} | userId: ${te.userId} | createdBy: ${te.createdBy}`);
    });

  } finally {
    await client.close();
  }
}

analyze().catch(console.error);
