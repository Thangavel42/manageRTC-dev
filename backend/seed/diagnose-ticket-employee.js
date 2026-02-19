/**
 * Diagnostic script to check ticket-employee relationships
 * Run with: node backend/seed/diagnose-ticket-employee.js
 */

import { getTenantCollections } from '../config/db.js';
import { ObjectId } from 'mongodb';

const TICKET_ID = 'TIC-001'; // Change this to your ticket ID
const ASSIGNEE_ID = '6989b7b93deea110e653ea9b'; // The assignedTo ObjectId from your document

async function diagnoseTicketEmployee() {
  console.log('🔍 Diagnosing Ticket-Employee Relationship\n');
  console.log(`📋 Ticket ID: ${TICKET_ID}`);
  console.log(`👤 Assignee ID: ${ASSIGNEE_ID}\n`);

  try {
    // Get the collections (replace 'AmasQIS' with your tenant DB name if different)
    const collections = getTenantCollections('AmasQIS');

    // 1. Check the ticket document
    console.log('--- 1. Checking Ticket Document ---');
    const ticket = await collections.tickets.findOne({ ticketId: TICKET_ID });
    if (ticket) {
      console.log('✅ Ticket found');
      console.log('   Title:', ticket.title);
      console.log('   Status:', ticket.status);
      console.log('   AssignedTo:', ticket.assignedTo);
      console.log('   AssignedBy:', ticket.assignedBy);
      console.log('   CreatedBy:', ticket.createdBy);
    } else {
      console.log('❌ Ticket not found!');
      return;
    }

    // 2. Check if assignee exists in employees
    console.log('\n--- 2. Checking Assignee Employee ---');
    const assigneeObjectId = new ObjectId(ASSIGNEE_ID);
    const assignee = await collections.employees.findOne(
      { _id: assigneeObjectId },
      { projection: { employeeId: 1, firstName: 1, lastName: 1, email: 1, avatarUrl: 1, avatar: 1 } }
    );

    if (assignee) {
      console.log('✅ Assignee employee found');
      console.log('   Employee ID:', assignee.employeeId);
      console.log('   Name:', `${assignee.firstName} ${assignee.lastName}`);
      console.log('   Email:', assignee.email);
      console.log('   Avatar URL:', assignee.avatarUrl || 'None');
      console.log('   Avatar:', assignee.avatar || 'None');
    } else {
      console.log('❌ Assignee employee NOT FOUND!');
      console.log(`   ⚠️ No employee found with _id: ${ASSIGNEE_ID}`);

      // Check if there are any employees at all
      const employeeCount = await collections.employees.countDocuments();
      console.log(`   📊 Total employees in database: ${employeeCount}`);

      // Try to find the employee by other IDs
      console.log('\n--- 3. Searching for employee by other fields ---');

      // Get some sample employees to understand the structure
      const sampleEmployees = await collections.employees
        .find({})
        .limit(3)
        .project({ employeeId: 1, firstName: 1, lastName: 1, _id: 1 })
        .toArray();

      if (sampleEmployees.length > 0) {
        console.log('Sample employees in database:');
        sampleEmployees.forEach(emp => {
          console.log(`   - ${emp._id}: ${emp.employeeId} ${emp.firstName} ${emp.lastName}`);
        });
      }
    }

    // 3. Check createdBy employee
    console.log('\n--- 4. Checking CreatedBy Employee ---');
    const createdBy = await collections.employees.findOne(
      { _id: ticket.createdBy },
      { projection: { employeeId: 1, firstName: 1, lastName: 1, avatarUrl: 1 } }
    );

    if (createdBy) {
      console.log('✅ CreatedBy employee found');
      console.log('   Name:', `${createdBy.firstName} ${createdBy.lastName}`);
      console.log('   Avatar:', createdBy.avatarUrl || 'None');
    } else {
      console.log('❌ CreatedBy employee NOT FOUND!');
    }

    // 4. List all employees with their IDs for reference
    console.log('\n--- 5. All Employees in Database ---');
    const allEmployees = await collections.employees
      .find({})
      .project({ employeeId: 1, firstName: 1, lastName: 1, avatarUrl: 1, avatar: 1 })
      .toArray();

    console.log(`Total: ${allEmployees.length} employees`);
    allEmployees.forEach(emp => {
      console.log(`   ${emp._id}: ${emp.employeeId} ${emp.firstName} ${emp.lastName} - Avatar: ${emp.avatarUrl || emp.avatar || 'None'}`);
    });

    console.log('\n--- ✅ Diagnostic Complete ---');

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  }
}

// Run the diagnostic
diagnoseTicketEmployee().then(() => {
  console.log('\nDone.');
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
