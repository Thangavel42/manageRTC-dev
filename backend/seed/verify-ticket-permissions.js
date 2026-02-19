/**
 * Diagnostic script to verify employee fix and check ticket permissions for manager role
 * Run: cd backend && node seed/verify-ticket-permissions.js
 */

import 'dotenv/config';
import { connectDB, client } from '../config/db.js';

async function run() {
  await connectDB();

  // 1. Verify employee is fixed
  const db = client.db('6982468548550225cc5585a9');
  const employee = await db.collection('employees').findOne({ clerkUserId: 'user_39SByLX1SOIXX8SY4XQhy08qvPc' });
  console.log('--- Employee Status After Fix ---');
  console.log('isDeleted:', employee.isDeleted);
  console.log('status:', employee.status);
  console.log('account.role:', employee.account?.role);

  // 2. Check Tickets pages in permissions
  console.log('\n--- Checking Tickets Pages in Permissions ---');
  const amasqisDb = client.db('AmasQIS');
  const ticketPages = await amasqisDb.collection('pages').find({
    $or: [
      { name: { $regex: 'ticket', $options: 'i' } },
      { route: { $regex: 'ticket', $options: 'i' } }
    ]
  }).toArray();

  console.log('Found', ticketPages.length, 'ticket-related pages:');
  ticketPages.forEach(page => {
    console.log('  -', page.name, '| Route:', page.route, '| _id:', page._id);
  });

  // 3. Check manager role permissions for tickets
  console.log('\n--- Checking Manager Role Permissions for Tickets ---');
  const managerRole = await amasqisDb.collection('roles').findOne({ name: { $regex: 'manager', $options: 'i' } });

  if (managerRole) {
    console.log('Manager Role ID:', managerRole._id);
    console.log('Manager Role Name:', managerRole.name);

    const rolePermissions = await amasqisDb.collection('role_permissions').find({
      roleId: managerRole._id
    }).toArray();

    const ticketPageIds = ticketPages.map(p => p._id.toString());
    const ticketPermissions = rolePermissions.filter(rp =>
      ticketPageIds.includes(rp.pageId?.toString())
    );

    console.log('Manager has', ticketPermissions.length, 'ticket page permissions');

    if (ticketPermissions.length > 0) {
      ticketPermissions.forEach(tp => {
        const page = ticketPages.find(p => p._id.toString() === tp.pageId?.toString());
        console.log('  - Page:', page?.name || 'Unknown', '| Actions:', tp.actions);
      });
    } else {
      console.log('❌ No ticket permissions found for Manager role!');
      console.log('\nThis is why the Tickets menu is not visible to the Manager.');
    }
  } else {
    console.log('❌ Manager role not found!');
  }

  // 4. Check what roles exist
  console.log('\n--- All Roles in System ---');
  const allRoles = await amasqisDb.collection('roles').find({}).project({ name: 1 }).toArray();
  allRoles.forEach(role => console.log('  -', role.name, '(' + role._id + ')'));

  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
