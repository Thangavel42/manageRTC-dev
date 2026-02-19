import { connectDB, client } from '../config/db.js';

async function addSubContractsPermissions() {
  await connectDB();
  const db = client.db('AmasQIS');

  try {
    // Find the sub-contracts page
    const subContractsPage = await db.collection('pages').findOne({ route: '/sub-contracts' });

    if (!subContractsPage) {
      console.error('❌ Sub-Contracts page not found! Run addSubContractsPage.js first.');
      await client.close();
      return;
    }

    console.log('✅ Found Sub-Contracts page:', subContractsPage._id);

    // Check if permission already exists
    const existingPermission = await db.collection('permissions').findOne({ pageId: subContractsPage._id });

    if (existingPermission) {
      console.log('⚠️ Permission already exists! Updating...');

      await db.collection('permissions').updateOne(
        { pageId: subContractsPage._id },
        {
          $set: {
            availableActions: ['create', 'read', 'update', 'delete'],
            isActive: true,
            updatedAt: new Date()
          }
        }
      );

      console.log('✅ Permission updated successfully!');
    } else {
      // Create permission for sub-contracts page
      const permission = {
        pageId: subContractsPage._id,
        pageName: subContractsPage.name,
        pageDisplayName: subContractsPage.displayName,
        availableActions: ['create', 'read', 'update', 'delete'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('permissions').insertOne(permission);
      console.log('✅ Permission created with _id:', result.insertedId);
    }

    // Get the permission
    const permission = await db.collection('permissions').findOne({ pageId: subContractsPage._id });

    // Now add this permission to all roles that should have access
    console.log('\\n🔐 Adding Sub-Contracts permission to roles...');

    const roles = await db.collection('roles').find({}).toArray();

    for (const role of roles) {
      // Check if permission already exists in this role
      const hasPermission = role.permissions && role.permissions.some(
        p => p.permissionId && p.permissionId.toString() === permission?._id?.toString()
      );

      if (hasPermission) {
        console.log('⏭️ Skipping', role.name, '- permission already exists');
        continue;
      }

      // Add permission to role
      await db.collection('roles').updateOne(
        { _id: role._id },
        {
          $push: {
            permissions: {
              permissionId: permission._id,
              actions: ['create', 'read', 'update', 'delete'],
              addedAt: new Date()
            }
          }
        }
      );

      console.log('✅ Added Sub-Contracts permission to role:', role.name);
    }

    console.log('\\n✅ Sub-Contracts permissions setup complete!');
    console.log('\\n📋 Summary:');
    console.log('  - Page: Sub-Contracts (/sub-contracts)');
    console.log('  - Permission ID:', permission._id);
    console.log('  - Actions: create, read, update, delete');
    console.log('  - Added to all roles');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

addSubContractsPermissions().catch(console.error);
