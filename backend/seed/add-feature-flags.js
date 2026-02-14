/**
 * Add Feature Flags to Pages
 * Configures plan-based access control for pages
 *
 * Run with: node backend/seed/add-feature-flags.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGODB_DATABASE || 'AmasQIS';
const MONGODB_URI = MONGO_URI.includes('?')
  ? `${MONGO_URI}&dbName=${DB_NAME}`
  : `${MONGO_URI}${MONGO_URI.endsWith('/') ? '' : '/'}${DB_NAME}`;

console.log('='.repeat(70));
console.log('  ADD FEATURE FLAGS TO PAGES');
console.log('='.repeat(70));

// Feature flags mapping - using exact page names from database
// Format: pageName -> { requiresFeature, minimumPlanTier, enabledForAll }
const featureFlagsMapping = {
  // ============================================
  // FREE TIER PAGES (Available to all)
  // ============================================
  'dashboard.admin': {
    enabledForAll: true,
  },
  'dashboard.employee': {
    enabledForAll: true,
  },
  'dashboards.hr': {
    enabledForAll: true,
  },
  'pages.profile': {
    enabledForAll: true,
  },
  'settings.profile': {
    enabledForAll: true,
  },
  'settings.security': {
    enabledForAll: true,
  },
  'settings.notifications': {
    enabledForAll: true,
  },
  'user.profile': {
    enabledForAll: true,
  },

  // ============================================
  // BASIC TIER PAGES
  // ============================================
  'hrm.employees': {
    minimumPlanTier: 'basic',
  },
  'hrm.departments': {
    minimumPlanTier: 'basic',
  },
  'hrm.designations': {
    minimumPlanTier: 'basic',
  },
  'hrm.attendance': {
    minimumPlanTier: 'basic',
  },
  'hrm.attendance-employee': {
    minimumPlanTier: 'basic',
  },
  'hrm.leaves-employee': {
    minimumPlanTier: 'basic',
  },
  'crm.clients': {
    minimumPlanTier: 'basic',
  },
  'crm.contacts': {
    minimumPlanTier: 'basic',
  },
  'projects.list': {
    minimumPlanTier: 'basic',
  },
  'projects.tasks': {
    minimumPlanTier: 'basic',
  },

  // ============================================
  // PRO TIER PAGES
  // ============================================
  'hrm.leaves': {
    minimumPlanTier: 'pro',
    requiresFeature: ['leave-management'],
  },
  'hrm.attendance-admin': {
    minimumPlanTier: 'pro',
    requiresFeature: ['attendance-tracking'],
  },
  'hrm.timesheets': {
    minimumPlanTier: 'pro',
    requiresFeature: ['timesheet-management'],
  },
  'hrm.shifts': {
    minimumPlanTier: 'pro',
    requiresFeature: ['shift-scheduling'],
  },
  'crm.leads': {
    minimumPlanTier: 'pro',
    requiresFeature: ['lead-management'],
  },
  'crm.deals': {
    minimumPlanTier: 'pro',
    requiresFeature: ['deal-tracking'],
  },
  'crm.pipeline': {
    minimumPlanTier: 'pro',
    requiresFeature: ['sales-pipeline'],
  },
  'recruitment.jobs': {
    minimumPlanTier: 'pro',
    requiresFeature: ['recruitment'],
  },
  'recruitment.candidates': {
    minimumPlanTier: 'pro',
    requiresFeature: ['recruitment'],
  },
  'finance.invoices': {
    minimumPlanTier: 'pro',
    requiresFeature: ['invoicing'],
  },
  'finance.payments': {
    minimumPlanTier: 'pro',
    requiresFeature: ['payment-processing'],
  },
  'finance.expenses': {
    minimumPlanTier: 'pro',
    requiresFeature: ['expense-tracking'],
  },
  'performance.indicator': {
    minimumPlanTier: 'pro',
    requiresFeature: ['performance-management'],
  },
  'performance.review': {
    minimumPlanTier: 'pro',
    requiresFeature: ['performance-management'],
  },
  'hrm.training-list': {
    minimumPlanTier: 'pro',
    requiresFeature: ['training-management'],
  },

  // ============================================
  // ENTERPRISE TIER PAGES
  // ============================================
  'finance.payroll': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['payroll-management', 'tax-calculations'],
  },
  'finance.employee-salary': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['payroll-management', 'tax-calculations'],
  },
  'finance.payslip': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['payroll-management', 'tax-calculations'],
  },
  'performance.appraisal': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['performance-management', 'appraisal-system'],
  },
  'reports.expenses': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['advanced-reporting'],
  },
  'reports.invoice': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['advanced-reporting'],
  },
  'reports.attendance': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['advanced-reporting'],
  },
  'reports.employee': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['advanced-reporting'],
  },
  'reports.payslip': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['advanced-reporting', 'payroll-management'],
  },
  'administration.assets': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['asset-management'],
  },
  'support.tickets': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['helpdesk'],
  },
  'accounting.budgets': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['budget-management'],
  },

  // ============================================
  // SUPER ADMIN PAGES (Role-based only, no plan restriction)
  // ============================================
  'super-admin.dashboard': {
    enabledForAll: false,
  },
  'super-admin.companies': {
    enabledForAll: false,
  },
  'super-admin.packages': {
    enabledForAll: false,
  },
  'super-admin.modules': {
    enabledForAll: false,
  },
  'super-admin.pages': {
    enabledForAll: false,
  },
  'super-admin.subscriptions': {
    enabledForAll: false,
  },

  // ============================================
  // SETTINGS PAGES (Plan-based)
  // ============================================
  'settings.invoice-settings': {
    minimumPlanTier: 'pro',
    requiresFeature: ['invoicing'],
  },
  'settings.salary-settings': {
    minimumPlanTier: 'enterprise',
    requiresFeature: ['payroll-management'],
  },
  'settings.approval-settings': {
    minimumPlanTier: 'pro',
  },
  'settings.leave-type': {
    minimumPlanTier: 'pro',
    requiresFeature: ['leave-management'],
  },
};

async function addFeatureFlags() {
  try {
    // Connect to MongoDB
    console.log('\n[1/3] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('      Connected!');

    // Use native MongoDB collection directly
    const pagesCollection = mongoose.connection.db.collection('pages');

    // Update pages with feature flags
    console.log('\n[2/3] Adding feature flags to pages...');
    console.log(`      Pages to update: ${Object.keys(featureFlagsMapping).length}\n`);

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const [pageName, flags] of Object.entries(featureFlagsMapping)) {
      const page = await pagesCollection.findOne({ name: pageName });

      if (!page) {
        console.log(`      ⚠️  Page not found: ${pageName}`);
        notFound++;
        continue;
      }

      // Build feature flags object
      const featureFlags = {
        enabledForAll: flags.enabledForAll || false,
        minimumPlanTier: flags.minimumPlanTier || null,
        requiresFeature: flags.requiresFeature || [],
      };

      // Update page using native driver
      await pagesCollection.updateOne(
        { name: pageName },
        { $set: { featureFlags } }
      );

      const tierLabel = flags.minimumPlanTier
        ? `[${flags.minimumPlanTier.toUpperCase()}]`
        : flags.enabledForAll
          ? '[ALL]'
          : '[ROLE-ONLY]';

      const featuresLabel = flags.requiresFeature?.length
        ? ` (${flags.requiresFeature.join(', ')})`
        : '';

      console.log(`      ✓ ${pageName} ${tierLabel}${featuresLabel}`);
      updated++;
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('  FEATURE FLAGS UPDATE COMPLETE');
    console.log('='.repeat(70));
    console.log(`  Pages Updated:  ${updated}`);
    console.log(`  Pages Skipped:  ${skipped}`);
    console.log(`  Pages Not Found: ${notFound}`);

    // Show tier distribution
    console.log('\n  Tier Distribution:');
    const tiers = { free: 0, basic: 0, pro: 0, enterprise: 0, all: 0, roleOnly: 0 };

    for (const [, flags] of Object.entries(featureFlagsMapping)) {
      if (flags.enabledForAll) tiers.all++;
      else if (!flags.minimumPlanTier) tiers.roleOnly++;
      else if (flags.minimumPlanTier === 'basic') tiers.basic++;
      else if (flags.minimumPlanTier === 'pro') tiers.pro++;
      else if (flags.minimumPlanTier === 'enterprise') tiers.enterprise++;
      else tiers.free++;
    }

    console.log(`    Free/All:    ${tiers.all} pages`);
    console.log(`    Basic:       ${tiers.basic} pages`);
    console.log(`    Pro:         ${tiers.pro} pages`);
    console.log(`    Enterprise:  ${tiers.enterprise} pages`);
    console.log(`    Role Only:   ${tiers.roleOnly} pages`);

    return { success: true, updated, skipped, notFound };

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  } finally {
    await mongoose.disconnect();
    console.log('\n  Disconnected from MongoDB.');
  }
}

addFeatureFlags();
