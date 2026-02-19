import { connectDB, client } from '../config/db.js';

async function addSubContractsPage() {
  await connectDB();
  const db = client.db('AmasQIS');

  try {
    // Find the Projects category (VI)
    const categoryVI = await db.collection('pagecategories').findOne({ identifier: 'VI' });

    if (!categoryVI) {
      console.error('❌ Category VI (Projects) not found!');
      await client.close();
      return;
    }

    console.log('✅ Found Category VI:', categoryVI.name);

    // Check if sub-contracts page already exists
    const existingPage = await db.collection('pages').findOne({ route: '/sub-contracts' });

    if (existingPage) {
      console.log('⚠️ Sub-Contracts page already exists! Updating...');

      // Update the existing page
      await db.collection('pages').updateOne(
        { route: '/sub-contracts' },
        {
          $set: {
            name: 'sub-contracts',
            displayName: 'Sub-Contracts',
            route: 'sub-contracts',
            category: categoryVI._id,
            description: 'Manage project sub-contracts',
            availableActions: ['create', 'read', 'update', 'delete'],
            isActive: true,
            isMenuGroup: false,
            menuGroupLevel: null,
            level: 1,
            depth: 1,
            sortOrder: 45,
            parentPage: null,
            updatedAt: new Date()
          }
        }
      );

      console.log('✅ Sub-Contracts page updated successfully!');
    } else {
      // Find the projects-menu parent page
      const projectsMenu = await db.collection('pages').findOne({ name: 'projects.projects-menu' });

      // Create the new sub-contracts page
      const subContractsPage = {
        name: 'sub-contracts',
        displayName: 'Sub-Contracts',
        route: 'sub-contracts',
        category: categoryVI._id,
        description: 'Manage project sub-contracts and vendor agreements',
        availableActions: ['create', 'read', 'update', 'delete'],
        isActive: true,
        isMenuGroup: false,
        menuGroupLevel: null,
        level: 1,
        depth: 1,
        sortOrder: 45,
        parentPage: null, // Direct child of Projects category, not nested under projects-menu
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.collection('pages').insertOne(subContractsPage);
      console.log('✅ Sub-Contracts page created with _id:', result.insertedId);
    }

    // Now update the Modules to include this page
    console.log('\\n📦 Adding Sub-Contracts page to all active modules...');

    const modules = await db.collection('modules').find({ isActive: true }).toArray();

    for (const module of modules) {
      // Check if sub-contracts page is already in the module
      const pageExists = module.pages && module.pages.some(p => p.pageId && p.pageId.toString() === (existingPage?._id?.toString() || ''));

      if (pageExists) {
        console.log('⏭️ Skipping', module.name, '- page already exists');
        continue;
      }

      // Get the sub-contracts page
      const subContractsPage = await db.collection('pages').findOne({ route: '/sub-contracts' });

      if (!subContractsPage) {
        console.log('⚠️ Could not find sub-contracts page for module:', module.name);
        continue;
      }

      // Add the page to the module
      await db.collection('modules').updateOne(
        { _id: module._id },
        {
          $push: {
            pages: {
              pageId: subContractsPage._id,
              isActive: true,
              addedAt: new Date()
            }
          }
        }
      );

      console.log('✅ Added Sub-Contracts to module:', module.name);
    }

    console.log('\\n✅ Sub-Contracts page setup complete!');
    console.log('\\n📋 Summary:');
    console.log('  - Route: /sub-contracts');
    console.log('  - Category: Projects (VI)');
    console.log('  - Actions: create, read, update, delete');
    console.log('  - Added to all active modules');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

addSubContractsPage().catch(console.error);
