/**
 * Diagnostic script to analyze why Sowndharya can't see her time entries
 */

const { MongoClient, ObjectId } = require('mongodb');

async function analyze() {
  const client = new MongoClient('mongodb://localhost:27017');
  try {
    await client.connect();

    // Use the companyId as database name from the time entry
    const companyId = '69a52c6d838388b740e80723';
    const db = client.db(companyId);

    console.log('=== CHECKING DATABASE:', companyId, '===');

    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // Check if timeEntries collection exists
    if (collections.some(c => c.name === 'timeEntries')) {
      // Find the specific time entry
      const timeEntry = await db.collection('timeEntries').findOne({
        timeEntryId: 'TME-0027'
      });
      if (timeEntry) {
        console.log('\n=== TIME ENTRY TME-0027 FOUND ===');
        console.log('_id:', timeEntry._id.toString());
        console.log('userId:', timeEntry.userId);
        console.log('createdBy:', timeEntry.createdBy);
        console.log('projectId:', timeEntry.projectId?.toString());
        console.log('employeeObjectId:', timeEntry.employeeObjectId?.toString());
        console.log('status:', timeEntry.status);
        console.log('isDeleted:', timeEntry.isDeleted);
      } else {
        console.log('\nTime entry TME-0027 NOT FOUND');
      }

      // Check all time entries for this user
      const clerkUserId = 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia';
      const userEntries = await db.collection('timeEntries').find({
        userId: clerkUserId,
        isDeleted: { $ne: true }
      }).toArray();
      console.log('\n=== TIME ENTRIES FOR userId:', clerkUserId, '===');
      console.log('Count:', userEntries.length);
      userEntries.forEach(te => {
        console.log('  -', te.description);
        console.log('    _id:', te._id.toString());
        console.log('    projectId:', te.projectId?.toString());
        console.log('    status:', te.status);
      });

      // Check with project filter
      const projectId = '69a67cc558a24ac5a4cbe1fe';
      const userEntriesWithProject = await db.collection('timeEntries').find({
        userId: clerkUserId,
        projectId: new ObjectId(projectId),
        isDeleted: { $ne: true }
      }).toArray();
      console.log('\n=== WITH PROJECT FILTER (projectId:', projectId, ') ===');
      console.log('Count:', userEntriesWithProject.length);
      userEntriesWithProject.forEach(te => {
        console.log('  -', te.description);
      });
    }

    // Check employees
    if (collections.some(c => c.name === 'employees')) {
      const employees = await db.collection('employees').find({}).limit(10).toArray();
      console.log('\n=== EMPLOYEES ===');
      employees.forEach(emp => {
        console.log('  -', emp.firstName, emp.lastName, '| clerkUserId:', emp.clerkUserId, '| employeeId:', emp.employeeId);
      });

      // Find Sowndharya
      const sowndharya = await db.collection('employees').findOne({
        firstName: 'Sowndharya'
      });
      if (sowndharya) {
        console.log('\n=== SOWNDHARYA ===');
        console.log('_id:', sowndharya._id.toString());
        console.log('employeeId:', sowndharya.employeeId);
        console.log('clerkUserId:', sowndharya.clerkUserId);
        console.log('firstName:', sowndharya.firstName);
        console.log('lastName:', sowndharya.lastName);
        console.log('email:', sowndharya.email);
      }

      // Also try to find by the clerkUserId from the time entry
      const employeeByClerkId = await db.collection('employees').findOne({
        clerkUserId: 'user_3ANkWuAQk8W6KxoaRPL1FM931Ia'
      });
      if (employeeByClerkId) {
        console.log('\n=== EMPLOYEE BY clerkUserId ===');
        console.log('_id:', employeeByClerkId._id.toString());
        console.log('employeeId:', employeeByClerkId.employeeId);
        console.log('clerkUserId:', employeeByClerkId.clerkUserId);
        console.log('firstName:', employeeByClerkId.firstName);
        console.log('lastName:', employeeByClerkId.lastName);
      }
    }

    // Check projects
    if (collections.some(c => c.name === 'projects')) {
      const projects = await db.collection('projects').find({}).toArray();
      console.log('\n=== ALL PROJECTS ===');
      projects.forEach(p => {
        console.log('  -', p.name, '| _id:', p._id.toString());
      });

      // Find StyleSync
      const stylesync = await db.collection('projects').findOne({
        name: 'StyleSync'
      });
      if (stylesync) {
        console.log('\n=== STYLESYNC PROJECT ===');
        console.log('_id:', stylesync._id.toString());
        console.log('teamMembers:', stylesync.teamMembers?.map(id => id.toString()) || []);
        console.log('teamLeader:', stylesync.teamLeader?.map(id => id.toString()) || []);
        console.log('projectManager:', stylesync.projectManager?.map(id => id.toString()) || []);
      }
    }

  } finally {
    await client.close();
  }
}

analyze().catch(console.error);
