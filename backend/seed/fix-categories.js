/**
 * Fix Pages with Null Categories
 * Assigns proper categories to pages that have null/undefined moduleCategory
 *
 * Run with: node backend/seed/fix-categories.js
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
console.log('  FIX NULL PAGE CATEGORIES');
console.log('='.repeat(70));

// Category mapping based on page name patterns
const categoryMapping = {
  // Super Admin
  'super-admin': /^super-admin\./,

  // Users & Permissions
  'users-permissions': /^users-permissions\.|^user-management\./,

  // Dashboards
  'dashboards': /^dashboards\.|^dashboard\./,

  // Applications
  'applications': /^applications\.|^application\./,

  // HRM
  'hrm': /^hrm\.|^performance\.|^training\./,

  // CRM
  'crm': /^crm\./,

  // Projects
  'projects': /^projects\./,

  // Recruitment
  'recruitment': /^recruitment\./,

  // Finance
  'finance': /^finance\.|^membership\.|^accounting\./,

  // Reports
  'reports': /^reports\./,

  // Administration
  'administration': /^administration\.|^support\.|^settings\./,

  // Content
  'content': /^content\./,

  // Pages
  'pages': /^pages\./,

  // Auth
  'auth': /^auth\.|^login|^register|^forgot|^two-step|^email-verification|^reset-password|^lock-screen/,

  // UI
  'ui': /^ui\.|^ui-|icon\.|^forms\.|^form-|^map-|^layout-/,
};

// Special case mappings for specific pages
const specialMappings = {
  // UI Components
  'ui-alert': 'ui',
  'ui-accordion': 'ui',
  'ui-avatar': 'ui',
  'ui-badges': 'ui',
  'ui-borders': 'ui',
  'ui-buttons': 'ui',
  'ui-cards': 'ui',
  'ui-carousel': 'ui',
  'ui-colors': 'ui',
  'ui-dropdowns': 'ui',
  'ui-grid': 'ui',
  'ui-images': 'ui',
  'ui-lightbox': 'ui',
  'ui-media': 'ui',
  'ui-modals': 'ui',
  'ui-navtabs': 'ui',
  'ui-offcanvas': 'ui',
  'ui-pagination': 'ui',
  'ui-placeholder': 'ui',
  'ui-popover': 'ui',
  'ui-progress': 'ui',
  'ui-rangeslider': 'ui',
  'ui-spinner': 'ui',
  'ui-toasts': 'ui',
  'ui-tooltip': 'ui',
  'ui-typography': 'ui',
  'ui-video': 'ui',
  'ui-sortable': 'ui',
  'ui-swiperjs': 'ui',
  'ui-apexchart': 'ui',
  'ui-prime-chart': 'ui',
  'ui-chart-js': 'ui',
  'ui-feather-icon': 'ui',
  'ui-fontawesome': 'ui',
  'ui-material-icon': 'ui',
  'ui-icon-pe7': 'ui',
  'ui-simpleline': 'ui',
  'ui-themify': 'ui',
  'ui-typicon': 'ui',
  'ui-weather-icon': 'ui',

  // Icons
  'icon-ionic': 'ui',
  'icon-bootstrap': 'ui',
  'icon-remix': 'ui',
  'icon-flag': 'ui',

  // Forms
  'forms-basic-input': 'ui',
  'form-checkbox-radios': 'ui',
  'form-input-groups': 'ui',
  'form-grid-gutters': 'ui',
  'form-select': 'ui',
  'form-mask': 'ui',
  'form-fileupload': 'ui',
  'form-horizontal': 'ui',
  'form-pickers': 'ui',
  'form-vertical': 'ui',
  'form-floating-labels': 'ui',
  'form-validation': 'ui',
  'form-wizard': 'ui',

  // Maps
  'map-leaflet': 'ui',

  // Layouts
  'layout-default': 'ui',
  'layout-mini': 'ui',
  'layout-rtl': 'ui',
  'layout-box': 'ui',
  'layout-dark': 'ui',
  'layout-horizontal': 'ui',
  'layout-detached': 'ui',
  'layout-hovered': 'ui',
  'layout-modern': 'ui',
  'layout-twocolumn': 'ui',

  // Auth pages
  'login': 'auth',
  'login-2': 'auth',
  'login-3': 'auth',
  'register': 'auth',
  'register-2': 'auth',
  'register-3': 'auth',
  'forgot-password': 'auth',
  'forgot-password-2': 'auth',
  'forgot-password-3': 'auth',
  'two-step-verification': 'auth',
  'two-step-verification-2': 'auth',
  'two-step-verification-3': 'auth',
  'email-verification': 'auth',
  'email-verification-2': 'auth',
  'email-verification-3': 'auth',
  'reset-password': 'auth',
  'reset-password-2': 'auth',
  'reset-password-3': 'auth',
  'lock-screen': 'auth',

  // Extra pages
  'coming-soon': 'extras',
  'error-404': 'extras',
  'error-500': 'extras',
  'under-maintenance': 'extras',
  'under-construction': 'extras',
  'starter': 'extras',
  'success': 'extras',
  'success-2': 'extras',
  'success-3': 'extras',

  // Calendar
  'calendar': 'applications',

  // Notes
  'notes': 'applications',

  // Data tables
  'data-tables': 'ui',
  'tables-basic': 'ui',

  // Misc
  'sweetalert': 'ui',
  'clipboard': 'ui',
  'counter': 'ui',
  'dragandDrop': 'ui',
  'rating': 'ui',
  'ribbon': 'ui',
  'stickyNotes': 'ui',
  'textEditor': 'ui',
  'timeLine': 'ui',
  'scrollBar': 'ui',
};

function determineCategory(pageName, pageRoute) {
  // Check special mappings first
  if (specialMappings[pageName]) {
    return specialMappings[pageName];
  }

  // Check route-based mapping
  if (pageRoute) {
    if (pageRoute.startsWith('/super-admin/')) return 'super-admin';
    if (pageRoute.startsWith('/application/')) return 'applications';
    if (pageRoute.startsWith('/hrm/')) return 'hrm';
    if (pageRoute.startsWith('/performance/')) return 'hrm';
    if (pageRoute.startsWith('/training/')) return 'hrm';
    if (pageRoute.startsWith('/support/')) return 'administration';
    if (pageRoute.startsWith('/tickets/')) return 'administration';
    if (pageRoute.startsWith('/content/')) return 'content';
    if (pageRoute.startsWith('/user-management/')) return 'users-permissions';
    if (pageRoute.startsWith('/app-settings/')) return 'administration';
    if (pageRoute.startsWith('/general-settings/')) return 'administration';
    if (pageRoute.startsWith('/website-settings/')) return 'administration';
    if (pageRoute.startsWith('/financial-settings/')) return 'finance';
    if (pageRoute.startsWith('/system-settings/')) return 'administration';
    if (pageRoute.startsWith('/other-settings/')) return 'administration';
    if (pageRoute.startsWith('/accounting/')) return 'finance';
    if (pageRoute.startsWith('/pages/')) return 'pages';
    if (pageRoute.startsWith('/ui-')) return 'ui';
    if (pageRoute.startsWith('/form-')) return 'ui';
    if (pageRoute.startsWith('/forms-')) return 'ui';
    if (pageRoute.startsWith('/icon-')) return 'ui';
    if (pageRoute.startsWith('/layout-')) return 'ui';
    if (pageRoute.startsWith('/map-')) return 'ui';
  }

  // Check pattern mappings
  for (const [category, pattern] of Object.entries(categoryMapping)) {
    if (pattern.test(pageName)) {
      return category;
    }
  }

  // Default to 'extras' for unmatched pages
  return 'extras';
}

async function fixNullCategories() {
  try {
    // Connect to MongoDB
    console.log('\n[1/3] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('      Connected!');

    // Load models
    console.log('\n[2/3] Loading models...');
    await import('../models/rbac/page.schema.js');
    const Page = mongoose.model('Page');

    // Find pages with null categories
    console.log('\n[3/3] Finding and fixing pages with null categories...');
    const nullPages = await Page.find({
      $or: [
        { moduleCategory: null },
        { moduleCategory: { $exists: false } }
      ]
    });

    console.log(`      Found ${nullPages.length} pages with null category\n`);

    const updates = [];
    const updateLog = [];

    for (const page of nullPages) {
      const newCategory = determineCategory(page.name, page.route);

      updates.push({
        updateOne: {
          filter: { _id: page._id },
          update: { $set: { moduleCategory: newCategory } }
        }
      });

      updateLog.push({
        name: page.name,
        route: page.route,
        oldCategory: page.moduleCategory,
        newCategory: newCategory
      });

      console.log(`      ${page.name} → ${newCategory}`);
    }

    if (updates.length > 0) {
      console.log('\n      Applying updates...');
      const result = await Page.bulkWrite(updates);
      console.log(`      Updated ${result.modifiedCount} pages`);
    }

    // Verify the fix
    console.log('\n      Verifying fix...');
    const remainingNull = await Page.countDocuments({
      $or: [
        { moduleCategory: null },
        { moduleCategory: { $exists: false } }
      ]
    });

    console.log(`      Remaining pages with null category: ${remainingNull}`);

    // Show updated category distribution
    const categoryStats = await Page.aggregate([
      { $group: { _id: '$moduleCategory', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\n      Updated Category Distribution:');
    categoryStats.forEach(cat => {
      console.log(`      ${cat._id || 'null'}: ${cat.count} pages`);
    });

    console.log('\n' + '='.repeat(70));
    console.log('  FIX COMPLETE');
    console.log('='.repeat(70));

    return { success: true, updated: updates.length };

  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  } finally {
    await mongoose.disconnect();
    console.log('\n  Disconnected from MongoDB.');
  }
}

fixNullCategories();
