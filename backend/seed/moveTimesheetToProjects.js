/**
 * Migration: Move Timesheet page from HRM/Attendance category to Projects category
 *
 * The Timesheet page (name: 'hrm.timesheet') was previously in the HRM > Attendance
 * L2 group. This script moves it to the Projects > Projects L1 group.
 */

import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

const DB_URI = process.env.MONGO_URI || 'mongodb+srv://admin:AdMin-2025@cluster0.iooxltd.mongodb.net/';
const MAIN_DB = 'AmasQIS';

const log = (msg, type = 'info') => {
  const colors = { info: '\x1b[36m', success: '\x1b[32m', error: '\x1b[31m', warn: '\x1b[33m' };
  console.log(`${colors[type] || ''}${msg}\x1b[0m`);
};

async function moveTimesheetToProjects() {
  const client = new MongoClient(DB_URI);
  try {
    await client.connect();
    log('Connected to MongoDB', 'success');

    const db = client.db(MAIN_DB);
    const pages = db.collection('pages');
    const categories = db.collection('pageCategories');

    // 1. Find the Timesheet page
    const timesheetPage = await pages.findOne({ name: 'hrm.timesheet' });
    if (!timesheetPage) {
      log('Timesheet page (hrm.timesheet) not found in pages collection!', 'error');
      return;
    }
    log(`Found Timesheet page: ${timesheetPage._id} (current name: ${timesheetPage.name})`, 'info');

    // 2. Find Projects category
    const projectsCategory = await categories.findOne({ identifier: 'VI' });
    if (!projectsCategory) {
      log('Projects category (identifier: VI) not found!', 'error');
      return;
    }
    log(`Found Projects category: ${projectsCategory._id}`, 'info');

    // 3. Find HRM category (current parent)
    const hrmCategory = await categories.findOne({ identifier: 'IV' });
    log(`Found HRM category: ${hrmCategory?._id}`, 'info');

    // 4. Find the Projects > Projects-menu L1 group to use as parentPage
    const projectsMenuPage = await pages.findOne({ name: 'projects.projects-menu' });
    log(`Found projects.projects-menu: ${projectsMenuPage?._id}`, 'info');

    // 5. Find the HRM Attendance L2 group (current parentPage of Timesheet)
    const attendancePage = await pages.findOne({ name: 'hrm.attendance-menu' });
    log(`Current parentPage (hrm.attendance-menu): ${attendancePage?._id}`, 'info');

    // 6. Update the Timesheet page
    const updateResult = await pages.updateOne(
      { name: 'hrm.timesheet' },
      {
        $set: {
          name: 'projects.timesheet',
          category: projectsCategory._id,
          parentPage: projectsMenuPage?._id || null,
          sortOrder: 40,
          updatedAt: new Date(),
        },
      }
    );

    if (updateResult.modifiedCount === 1) {
      log('✅ Timesheet page moved to Projects category successfully!', 'success');
      log('   - name: hrm.timesheet → projects.timesheet', 'success');
      log(`   - category: HRM (${hrmCategory?._id}) → Projects (${projectsCategory._id})`, 'success');
      log(`   - parentPage: Attendance menu → Projects menu (${projectsMenuPage?._id})`, 'success');
    } else {
      log('No changes made (page may already be in Projects category)', 'warn');
    }

    // 7. Remove Timesheet from Attendance L2 group's children reference (if stored in parentPage children array)
    if (attendancePage) {
      const attendanceUpdate = await pages.updateOne(
        { name: 'hrm.attendance-menu' },
        { $pull: { children: timesheetPage._id } }
      );
      if (attendanceUpdate.modifiedCount > 0) {
        log('✅ Removed Timesheet from hrm.attendance-menu children array', 'success');
      }
    }

    // 8. Add Timesheet to Projects-menu children (if stored in children array)
    if (projectsMenuPage) {
      const projectsUpdate = await pages.updateOne(
        { name: 'projects.projects-menu' },
        { $addToSet: { children: timesheetPage._id } }
      );
      if (projectsUpdate.modifiedCount > 0) {
        log('✅ Added Timesheet to projects.projects-menu children array', 'success');
      }
    }

    // 9. Verify the change
    const updated = await pages.findOne({ _id: timesheetPage._id });
    log('\n=== VERIFICATION ===', 'info');
    log(`name: ${updated.name}`, 'info');
    log(`category: ${updated.category}`, 'info');
    log(`parentPage: ${updated.parentPage}`, 'info');

  } catch (err) {
    log(`Error: ${err.message}`, 'error');
    console.error(err);
  } finally {
    await client.close();
    log('Connection closed', 'info');
  }
}

moveTimesheetToProjects();
