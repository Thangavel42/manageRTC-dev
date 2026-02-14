/**
 * RBAC Migration Script (Fixed Version)
 * Migrates existing data to use proper ObjectId references
 *
 * Run with: node backend/seed/migrate-rbac-refs.js
 *
 * This script will:
 * 1. Sync Permissions with Pages (add pageId references)
 * 2. Update Plans to use ObjectId for module references
 * 3. Update Companies to use ObjectId for plan references
 * 4. Update Role permissions to include pageId references
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Build MongoDB URI with database name
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'AmasQIS';
const MONGODB_URI = MONGO_URI.includes('?')
  ? `${MONGO_URI}&dbName=${DB_NAME}`
  : `${MONGO_URI}${MONGO_URI.endsWith('/') ? '' : '/'}${DB_NAME}`;

console.log('Environment check:');
console.log(`  MONGO_URI: ${MONGO_URI ? '✓ Set' : '✗ Not set'}`);
console.log(`  DB_NAME: ${DB_NAME}`);

/**
 * Step 1: Migrate Permissions to reference Pages
 */
async function migratePermissions() {
  console.log('\n📊 Step 1: Migrating Permissions to reference Pages...');

  const Permission = mongoose.model('Permission');
  const Page = mongoose.model('Page');

  const permissions = await Permission.find({});
  console.log(`   Found ${permissions.length} existing permissions`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // First, ensure all pages have corresponding permissions
  const pages = await Page.find({ isActive: true });
  console.log(`   Found ${pages.length} active pages`);

  for (const page of pages) {
    try {
      let permission = await Permission.findOne({ pageId: page._id });

      if (!permission) {
        // Check for legacy permission by module name
        permission = await Permission.findOne({ module: page.name });

        if (permission) {
          // Update existing permission
          permission.pageId = page._id;
          permission.displayName = page.displayName;
          permission.category = page.moduleCategory || permission.category;
          permission.availableActions = page.availableActions || permission.availableActions;
          permission.isMigrated = true;
          await permission.save();
          updated++;
          console.log(`   ✓ Updated permission for page: ${page.name}`);
        } else {
          // Create new permission
          await Permission.create({
            pageId: page._id,
            module: page.name,
            displayName: page.displayName,
            category: page.moduleCategory || 'other',
            description: page.description || '',
            sortOrder: page.sortOrder || 0,
            availableActions: page.availableActions || ['read', 'create', 'write', 'delete'],
            isMigrated: true,
          });
          created++;
          console.log(`   + Created permission for page: ${page.name}`);
        }
      } else {
        // Update existing linked permission to ensure it's current
        let needsUpdate = false;
        if (permission.displayName !== page.displayName) {
          permission.displayName = page.displayName;
          needsUpdate = true;
        }
        if (permission.category !== page.moduleCategory && page.moduleCategory) {
          permission.category = page.moduleCategory;
          needsUpdate = true;
        }
        if (needsUpdate) {
          await permission.save();
          updated++;
        } else {
          skipped++;
        }
      }
    } catch (error) {
      console.log(`   ✗ Error processing page ${page.name}: ${error.message}`);
    }
  }

  console.log(`   Summary: ${created} created, ${updated} updated, ${skipped} skipped`);
  return { created, updated, skipped };
}

/**
 * Step 2: Migrate Plans to use ObjectId for modules
 */
async function migratePlans() {
  console.log('\n📦 Step 2: Migrating Plans to use ObjectId for modules...');

  const Plan = mongoose.model('Plan');
  const Module = mongoose.model('Module');

  const plans = await Plan.find({});
  console.log(`   Found ${plans.length} plans`);

  const modules = await Module.find({});
  console.log(`   Found ${modules.length} modules`);
  const moduleMap = new Map(modules.map(m => [m.name, m._id]));

  let migrated = 0;
  let skipped = 0;
  const errors = [];

  for (const plan of plans) {
    try {
      let hasChanges = false;

      for (const planModule of plan.planModules) {
        // Check if already has valid ObjectId
        if (planModule.moduleId && mongoose.Types.ObjectId.isValid(planModule.moduleId)) {
          continue;
        }

        const moduleName = planModule.moduleName || planModule.moduleIdLegacy;
        const moduleObjectId = moduleMap.get(moduleName);

        if (moduleObjectId) {
          planModule.moduleId = moduleObjectId;
          planModule.moduleIdLegacy = moduleName;
          hasChanges = true;
          console.log(`   → Linked module "${moduleName}" to ${moduleObjectId}`);
        } else {
          console.log(`   ⚠ Module not found: ${moduleName}`);
        }
      }

      if (hasChanges || !plan.isMigrated) {
        plan.isMigrated = true;
        await plan.save();
        migrated++;
        console.log(`   ✓ Migrated plan: ${plan.planName}`);
      } else {
        skipped++;
      }
    } catch (error) {
      errors.push({ planId: plan._id, error: error.message });
      console.log(`   ✗ Error migrating plan ${plan.planName}: ${error.message}`);
    }
  }

  console.log(`   Summary: ${migrated} migrated, ${skipped} skipped, ${errors.length} errors`);
  return { migrated, skipped, errors };
}

/**
 * Step 3: Migrate Companies to use ObjectId for plans
 */
async function migrateCompanies() {
  console.log('\n🏢 Step 3: Migrating Companies to use ObjectId for plans...');

  const Company = mongoose.model('Company');
  const Plan = mongoose.model('Plan');

  const companies = await Company.find({});
  console.log(`   Found ${companies.length} companies`);

  const plans = await Plan.find({});
  console.log(`   Found ${plans.length} plans`);

  const planMap = new Map();
  plans.forEach(p => {
    planMap.set(p._id.toString(), p._id);
    planMap.set(p.planName, p._id);
    planMap.set(p.planName?.toLowerCase(), p._id);
  });

  let migrated = 0;
  let skipped = 0;
  const errors = [];

  for (const company of companies) {
    try {
      // If already migrated with valid planId, skip
      if (company.isMigrated && company.planId && mongoose.Types.ObjectId.isValid(company.planId)) {
        skipped++;
        continue;
      }

      let planId = null;

      // Try to find plan by various means
      if (company.plan_id && mongoose.Types.ObjectId.isValid(company.plan_id)) {
        planId = company.plan_id;
      } else if (company.plan_name) {
        planId = planMap.get(company.plan_name) || planMap.get(company.plan_name?.toLowerCase());
      }

      if (planId) {
        company.planId = planId;
        company.isMigrated = true;
        await company.save();
        migrated++;
        console.log(`   ✓ Migrated company: ${company.name} → Plan: ${company.plan_name}`);
      } else {
        skipped++;
        console.log(`   ⚠ Plan not found for company: ${company.name}`);
      }
    } catch (error) {
      errors.push({ companyId: company._id, error: error.message });
      console.log(`   ✗ Error migrating company ${company.name}: ${error.message}`);
    }
  }

  console.log(`   Summary: ${migrated} migrated, ${skipped} skipped, ${errors.length} errors`);
  return { migrated, skipped, errors };
}

/**
 * Step 4: Migrate Role permissions to include pageId
 */
async function migrateRoles() {
  console.log('\n👤 Step 4: Migrating Role permissions to include pageId...');

  const Role = mongoose.model('Role');
  const Permission = mongoose.model('Permission');
  const Page = mongoose.model('Page');

  const roles = await Role.find({});
  console.log(`   Found ${roles.length} roles`);

  let updated = 0;
  let skipped = 0;
  const errors = [];

  for (const role of roles) {
    try {
      if (!role.permissions || role.permissions.length === 0) {
        skipped++;
        continue;
      }

      let hasChanges = false;

      for (const perm of role.permissions) {
        if (perm.pageId) continue; // Already has pageId

        // Try to get pageId from permission document
        if (perm.permissionId) {
          const permDoc = await Permission.findById(perm.permissionId);
          if (permDoc?.pageId) {
            perm.pageId = permDoc.pageId;
            hasChanges = true;
            continue;
          }
        }

        // Try to find page by module name
        if (perm.module) {
          const page = await Page.findOne({ name: perm.module });
          if (page) {
            perm.pageId = page._id;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        await role.save();
        updated++;
        console.log(`   ✓ Updated role: ${role.displayName}`);
      } else {
        skipped++;
      }
    } catch (error) {
      errors.push({ roleId: role._id, error: error.message });
      console.log(`   ✗ Error updating role ${role.displayName}: ${error.message}`);
    }
  }

  console.log(`   Summary: ${updated} updated, ${skipped} skipped, ${errors.length} errors`);
  return { updated, skipped, errors };
}

/**
 * Main migration function
 */
async function runMigration() {
  console.log('🚀 Starting RBAC Migration...');
  console.log('='.repeat(50));
  console.log(`Database: ${MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@')}`);

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    // Import models dynamically
    console.log('\n📋 Loading models...');
    await import('../models/rbac/page.schema.js');
    await import('../models/rbac/permission.schema.js');
    await import('../models/rbac/role.schema.js');
    await import('../models/rbac/module.schema.js');
    await import('../models/superadmin/package.schema.js');
    console.log('✓ Models loaded');

    // List available models
    console.log('\n📦 Available models:', Object.keys(mongoose.models).join(', '));

    const results = {
      permissions: await migratePermissions(),
      plans: await migratePlans(),
      companies: await migrateCompanies(),
      roles: await migrateRoles(),
    };

    console.log('\n' + '='.repeat(50));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('='.repeat(50));
    console.log('\n📊 Summary:');
    console.log(`  Permissions: ${results.permissions.created} created, ${results.permissions.updated} updated`);
    console.log(`  Plans:       ${results.plans.migrated} migrated`);
    console.log(`  Companies:   ${results.companies.migrated} migrated`);
    console.log(`  Roles:       ${results.roles.updated} updated`);

    const totalErrors = [
      ...results.plans.errors || [],
      ...results.companies.errors || [],
      ...results.roles.errors || [],
    ];

    if (totalErrors.length > 0) {
      console.log(`\n⚠️  ${totalErrors.length} errors occurred during migration`);
      totalErrors.forEach(e => console.log(`  - ${e.error}`));
    }

    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration
runMigration();
