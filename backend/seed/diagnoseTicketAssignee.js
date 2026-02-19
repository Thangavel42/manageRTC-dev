import { connectDB, client } from '../config/db.js';
import { getTenantCollections } from '../config/db.js';

async function diagnose() {
  await connectDB();
  console.log('🔗 Connected to MongoDB\n');

  // First, let's check what databases exist
  const admin = client.db().admin();
  const companies = await admin.listDatabases();
  console.log('📊 Available databases:');
  companies.databases.forEach(db => {
    console.log(`   - ${db.name}`);
  });

  // Check tickets in AmasQIS
  console.log('\n🔍 Checking tickets in AmasQIS database...');
  const amasQISCollections = getTenantCollections('AmasQIS');

  const tickets = await amasQISCollections.tickets.find({
    assignedTo: { $exists: true, $ne: null }
  }).limit(5).toArray();

  for (const ticket of tickets) {
    console.log(`\n📋 Ticket: ${ticket.ticketId}`);
    console.log(`   AssignedTo ObjectId: ${ticket.assignedTo}`);
    console.log(`   CreatedBy ObjectId: ${ticket.createdBy}`);

    // Try to find assignedTo employee in AmasQIS
    const assigneeInAmasQIS = await amasQISCollections.employees.findOne({
      _id: ticket.assignedTo
    });
    console.log(`   ✅ Assignee found in AmasQIS: ${assigneeInAmasQIS ? 'YES' : 'NO'}`);

    if (assigneeInAmasQIS) {
      console.log(`   👤 Employee: ${assigneeInAmasQIS.employeeId} ${assigneeInAmasQIS.firstName} ${assigneeInAmasQIS.lastName}`);
      console.log(`   🖼️ Avatar: ${assigneeInAmasQIS.avatarUrl || assigneeInAmasQIS.avatar || 'No avatar'}`);
    } else {
      // Check if this employee exists in 6982468548550225cc5585a9 database
      console.log(`   🔍 Checking database 6982468548550225cc5585a9...`);
      const tenantCollections = getTenantCollections('6982468548550225cc5585a9');
      const assigneeInTenant = await tenantCollections.employees.findOne({
        _id: ticket.assignedTo
      });
      console.log(`   ✅ Assignee found in 6982468548550225cc5585a9: ${assigneeInTenant ? 'YES' : 'NO'}`);

      if (assigneeInTenant) {
        console.log(`   👤 Employee: ${assigneeInTenant.employeeId} ${assigneeInTenant.firstName} ${assigneeInTenant.lastName}`);
        console.log(`   🖼️ Avatar: ${assigneeInTenant.avatarUrl || assigneeInTenant.avatar || 'No avatar'}`);
        console.log(`   ⚠️ ISSUE: Ticket in AmasQIS, but employee in 6982468548550225cc5585a9 (cross-tenant reference!)`);
      } else {
        console.log(`   ❌ Employee not found in any database!`);
      }
    }
  }

  // Also check if EMP-0364 exists in each database
  console.log('\n\n👤 Checking EMP-0364 across databases...');

  const emp0364InAmasQIS = await amasQISCollections.employees.findOne({ employeeId: 'EMP-0364' });
  console.log(`   EMP-0364 in AmasQIS: ${emp0364InAmasQIS ? '✅ Found' : '❌ Not Found'}`);
  if (emp0364InAmasQIS) {
    console.log(`      _id: ${emp0364InAmasQIS._id}`);
    console.log(`      Name: ${emp0364InAmasQIS.firstName} ${emp0364InAmasQIS.lastName}`);
    console.log(`      Avatar: ${emp0364InAmasQIS.avatarUrl || emp0364InAmasQIS.avatar || 'No avatar'}`);
  }

  const tenantCollections = getTenantCollections('6982468548550225cc5585a9');
  const emp0364InTenant = await tenantCollections.employees.findOne({ employeeId: 'EMP-0364' });
  console.log(`   EMP-0364 in 6982468548550225cc5585a9: ${emp0364InTenant ? '✅ Found' : '❌ Not Found'}`);
  if (emp0364InTenant) {
    console.log(`      _id: ${emp0364InTenant._id}`);
    console.log(`      Name: ${emp0364InTenant.firstName} ${emp0364InTenant.lastName}`);
    console.log(`      Avatar: ${emp0364InTenant.avatarUrl || emp0364InTenant.avatar || 'No avatar'}`);
  }

  // Close connection
  await client.close();
  console.log('\n✅ Diagnostic complete');
}

diagnose().catch(console.error);
