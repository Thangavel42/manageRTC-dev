/**
 * Add Ticket Permissions to Manager Role
 *
 * This script adds permissions for ticket pages to the Manager role
 * so that users with Manager role can see and access Tickets menu items.
 *
 * Run: cd backend && node seed/add-ticket-permissions-to-manager.js
 */

import 'dotenv/config';
import { connectDB, client } from '../config/db.js';
import { ObjectId } from 'mongodb';

async function run() {
  await connectDB();
  console.log('🔧 Adding Ticket Permissions to Manager Role\n');

  const amasqisDb = client.db('AmasQIS');

  // 1. Find the Manager role
  const managerRole = await amasqisDb.collection('roles').findOne({ name: 'manager' });
  if (!managerRole) {
    console.error('❌ Manager role not found!');
    process.exit(1);
  }

  console.log('✅ Manager Role found:', managerRole.name, '(' + managerRole._id + ')');

  // 2. Find all ticket pages
  const ticketPages = await amasqisDb.collection('pages').find({
    $or: [
      { name: { $regex: 'ticket', $options: 'i' } },
      { route: { $regex: 'ticket', $options: 'i' } }
    ]
  }).toArray();

  console.log('\nFound', ticketPages.length, 'ticket pages:');
  ticketPages.forEach(page => {
    console.log('  -', page.name, '| Route:', page.route, '| _id:', page._id);
  });

  // 3. Check which permissions already exist
  const existingPermissions = await amasqisDb.collection('role_permissions').find({
    roleId: managerRole._id,
    pageId: { $in: ticketPages.map(p => p._id) }
  }).toArray();

  console.log('\nExisting permissions:', existingPermissions.length);
  existingPermissions.forEach(ep => {
    const page = ticketPages.find(p => p._id.toString() === ep.pageId?.toString());
    console.log('  -', page?.name || 'Unknown', '| Actions:', ep.actions);
  });

  const existingPageIds = existingPermissions.map(ep => ep.pageId.toString());
  const pagesToAdd = ticketPages.filter(p => !existingPageIds.includes(p._id.toString()));

  if (pagesToAdd.length === 0) {
    console.log('\n✅ All ticket permissions already exist for Manager role!');
    process.exit(0);
  }

  console.log('\nAdding', pagesToAdd.length, 'new permissions:');

  // 4. Add permissions for missing pages
  const permissionsToAdd = pagesToAdd.map(page => ({
    roleId: managerRole._id,
    permissionId: new ObjectId(), // Generate new permission ID
    pageId: page._id,
    actions: ['create', 'read', 'update', 'delete'], // Full access
    createdAt: new Date(),
    updatedAt: new Date()
  }));

  for (const perm of permissionsToAdd) {
    const page = ticketPages.find(p => p._id.toString() === perm.pageId.toString());
    console.log('  - Adding:', page?.name, '| Actions:', perm.actions);
  }

  const result = await amasqisDb.collection('role_permissions').insertMany(permissionsToAdd);

  console.log('\n✅ Successfully added', result.insertedCount, 'permissions to Manager role!');
  console.log('\n--- ✅ SETUP COMPLETE ---');
  console.log('Please ask the user to:');
  console.log('1. Sign out from their account');
  console.log('2. Sign back in');
  console.log('3. The Tickets menu should now appear');

  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
