/**
 * Module Seed Script
 * Seeds the modules collection with predefined system modules
 *
 * Usage: node scripts/seedModules.js
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Module from '../models/rbac/module.schema.js';
import Permission from '../models/rbac/permission.schema.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

// Module definitions with their features
// Only include the 3 modules requested: HRM, Projects, CRM
const moduleDefinitions = [
  {
    name: 'hrm',
    displayName: 'HRM',
    description: 'Human Resource Management - Employees, attendance, leaves, payroll',
    icon: 'ti ti-users',
    category: 'hr-management',
    permissionCategory: 'hrm',
    route: '/hrm',
    isSystem: true,
    sortOrder: 10,
    features: [
      { name: 'dashboard', displayName: 'Dashboard', route: '/hrm/dashboard', icon: 'ti ti-dashboard' },
      { name: 'employees', displayName: 'Employees', route: '/hrm/employees', icon: 'ti ti-user', permissionModule: 'hrm.employees-list' },
      { name: 'departments', displayName: 'Departments', route: '/hrm/departments', icon: 'ti ti-building-community', permissionModule: 'hrm.departments' },
      { name: 'designations', displayName: 'Designations', route: '/hrm/designations', icon: 'ti ti-badge', permissionModule: 'hrm.designations' },
      { name: 'attendance', displayName: 'Attendance', route: '/hrm/attendance', icon: 'ti ti-calendar-check', permissionModule: 'hrm.attendance' },
      { name: 'leaves', displayName: 'Leaves', route: '/hrm/leaves', icon: 'ti ti-calendar-off', permissionModule: 'hrm.leaves' },
      { name: 'holidays', displayName: 'Holidays', route: '/hrm/holidays', icon: 'ti ti-calendar-event', permissionModule: 'hrm.holidays' },
      { name: 'shifts', displayName: 'Shifts', route: '/hrm/shifts', icon: 'ti ti-clock', permissionModule: 'hrm.shifts-scheduling' },
    ],
  },
  {
    name: 'projects',
    displayName: 'Projects',
    description: 'Project management - Tasks, milestones, tracking',
    icon: 'ti ti-subtask',
    category: 'project-management',
    permissionCategory: 'projects',
    route: '/projects',
    isSystem: true,
    sortOrder: 20,
    features: [
      { name: 'dashboard', displayName: 'Dashboard', route: '/projects/dashboard', icon: 'ti ti-dashboard' },
      { name: 'projects-list', displayName: 'Projects', route: '/projects/projects-list', icon: 'ti ti-folder', permissionModule: 'projects.projects-list' },
      { name: 'tasks', displayName: 'Tasks', route: '/projects/tasks', icon: 'ti ti-checkbox', permissionModule: 'projects.tasks' },
      { name: 'milestones', displayName: 'Milestones', route: '/projects/milestones', icon: 'ti ti-flag', permissionModule: 'projects.milestones' },
      { name: 'activities', displayName: 'Activities', route: '/projects/activities', icon: 'ti ti-activity', permissionModule: 'projects.activities' },
    ],
  },
  {
    name: 'crm',
    displayName: 'CRM',
    description: 'Customer Relationship Management - Leads, deals, contacts',
    icon: 'ti ti-handshake',
    category: 'customer-management',
    permissionCategory: 'crm',
    route: '/crm',
    isSystem: true,
    sortOrder: 30,
    features: [
      { name: 'dashboard', displayName: 'Dashboard', route: '/crm/dashboard', icon: 'ti ti-dashboard' },
      { name: 'leads', displayName: 'Leads', route: '/crm/leads', icon: 'ti ti-user-plus', permissionModule: 'crm.leads' },
      { name: 'deals', displayName: 'Deals', route: '/crm/deals', icon: 'ti ti-handshake', permissionModule: 'crm.deals' },
      { name: 'contacts', displayName: 'Contacts', route: '/crm/contacts', icon: 'ti ti-address-book', permissionModule: 'crm.contacts' },
      { name: 'pipelines', displayName: 'Pipelines', route: '/crm/pipelines', icon: 'ti ti-git-branch', permissionModule: 'crm.pipelines' },
      { name: 'companies', displayName: 'Companies', route: '/crm/companies', icon: 'ti ti-building', permissionModule: 'crm.companies' },
    ],
  },
];

const stats = {
  created: 0,
  updated: 0,
  skipped: 0,
  errors: [],
};

async function seedModules() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   Database: ${dbName}`);
    await mongoose.connect(uri, { dbName });
    console.log('✅ Connected!\n');

    console.log('📦 Starting Module Seed...\n');
    console.log('='.repeat(70));

    // Get existing permission categories
    const existingCategories = await Permission.distinct('category');
    console.log(`📋 Found ${existingCategories.length} permission categories`);
    console.log(`   Categories: ${existingCategories.join(', ')}\n`);

    for (const moduleDef of moduleDefinitions) {
      try {
        // Validate permission category exists
        if (!existingCategories.includes(moduleDef.permissionCategory)) {
          console.log(`⚠️  Skipping ${moduleDef.name}: Permission category '${moduleDef.permissionCategory}' not found`);
          stats.skipped++;
          continue;
        }

        // Get permissions for this category
        const categoryPermissions = await Permission.find({
          category: moduleDef.permissionCategory,
          isActive: true
        });

        // Build assigned permissions array with default actions
        const assignedPermissions = categoryPermissions.map(perm => ({
          permissionId: perm._id,
          module: perm.module,
          displayName: perm.displayName,
          actions: {
            all: false,
            read: true,  // Default to read access
            create: false,
            write: false,
            delete: false,
            import: false,
            export: false,
          },
          isActive: true,
        }));

        // Check if module already exists
        let module = await Module.findOne({ name: moduleDef.name });

        if (module) {
          // Update existing module (preserve existing permission config if any)
          const updateData = {
            ...moduleDef,
            updatedAt: new Date(),
          };
          // Don't overwrite assignedPermissions if they already exist
          if (!module.assignedPermissions || module.assignedPermissions.length === 0) {
            updateData.assignedPermissions = assignedPermissions;
          }
          Object.assign(module, updateData);
          await module.save();

          stats.updated++;
          console.log(`✏️  Updated: ${moduleDef.displayName} (${moduleDef.name})`);
        } else {
          // Create new module with assigned permissions
          module = new Module({
            ...moduleDef,
            assignedPermissions,
          });
          await module.save();

          stats.created++;
          console.log(`✅ Created: ${moduleDef.displayName} (${moduleDef.name})`);
        }

        // Log features and permissions
        if (moduleDef.features && moduleDef.features.length > 0) {
          console.log(`   Features: ${moduleDef.features.map(f => f.displayName).join(', ')}`);
        }
        console.log(`   Permissions: ${assignedPermissions.length} assigned with read access`);

      } catch (error) {
        console.error(`❌ Error processing ${moduleDef.name}: ${error.message}`);
        stats.errors.push({ module: moduleDef.name, error: error.message });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 SEED SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Created: ${stats.created}`);
    console.log(`✏️  Updated: ${stats.updated}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log(`❌ Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n❌ Error Details:');
      stats.errors.forEach(err => {
        console.log(`   - ${err.module}: ${err.error}`);
      });
    }

    // Verify modules
    console.log('\n📋 Modules in Database:');
    const modules = await Module.find().sort({ sortOrder: 1 });
    modules.forEach(mod => {
      console.log(`   ${mod.isSystem ? '🔒' : '📦'} ${mod.displayName} (${mod.name})`);
      console.log(`      Category: ${mod.category} | Route: ${mod.route}`);
      console.log(`      Features: ${mod.features.length} | Active: ${mod.isActive}`);
    });

    console.log('\n✅ Module seed complete!');

    await mongoose.disconnect();

  } catch (error) {
    console.error('\n❌ Seed Error:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedModules();
