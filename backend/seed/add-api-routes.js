/**
 * Add API Routes to Key Pages
 * Maps pages to their API endpoints for automatic route protection
 *
 * Run with: node backend/seed/add-api-routes.js
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
console.log('  ADD API ROUTES TO PAGES');
console.log('='.repeat(70));

// API Routes mapping for pages
// Format: pageName -> [{ method, path, action, description }]
const apiRoutesMapping = {
  // ============================================
  // SUPER ADMIN PAGES
  // ============================================
  'super-admin.companies': [
    { method: 'GET', path: '/api/superadmin/companies', action: 'read', description: 'List all companies' },
    { method: 'GET', path: '/api/superadmin/companies/:id', action: 'read', description: 'Get company details' },
    { method: 'POST', path: '/api/superadmin/companies', action: 'create', description: 'Create company' },
    { method: 'PUT', path: '/api/superadmin/companies/:id', action: 'write', description: 'Update company' },
    { method: 'DELETE', path: '/api/superadmin/companies/:id', action: 'delete', description: 'Delete company' },
  ],
  'super-admin.packages': [
    { method: 'GET', path: '/api/superadmin/packages', action: 'read', description: 'List all packages' },
    { method: 'GET', path: '/api/superadmin/packages/:id', action: 'read', description: 'Get package details' },
    { method: 'POST', path: '/api/superadmin/packages', action: 'create', description: 'Create package' },
    { method: 'PUT', path: '/api/superadmin/packages/:id', action: 'write', description: 'Update package' },
    { method: 'DELETE', path: '/api/superadmin/packages/:id', action: 'delete', description: 'Delete package' },
  ],
  'super-admin.modules': [
    { method: 'GET', path: '/api/rbac/modules', action: 'read', description: 'List all modules' },
    { method: 'GET', path: '/api/rbac/modules/:id', action: 'read', description: 'Get module details' },
    { method: 'POST', path: '/api/rbac/modules', action: 'create', description: 'Create module' },
    { method: 'PUT', path: '/api/rbac/modules/:id', action: 'write', description: 'Update module' },
    { method: 'DELETE', path: '/api/rbac/modules/:id', action: 'delete', description: 'Delete module' },
  ],
  'super-admin.pages': [
    { method: 'GET', path: '/api/rbac/pages', action: 'read', description: 'List all pages' },
    { method: 'GET', path: '/api/rbac/pages/:id', action: 'read', description: 'Get page details' },
    { method: 'POST', path: '/api/rbac/pages', action: 'create', description: 'Create page' },
    { method: 'PUT', path: '/api/rbac/pages/:id', action: 'write', description: 'Update page' },
    { method: 'DELETE', path: '/api/rbac/pages/:id', action: 'delete', description: 'Delete page' },
  ],
  'super-admin.subscriptions': [
    { method: 'GET', path: '/api/superadmin/subscriptions', action: 'read', description: 'List subscriptions' },
    { method: 'POST', path: '/api/superadmin/subscriptions', action: 'create', description: 'Create subscription' },
    { method: 'PUT', path: '/api/superadmin/subscriptions/:id', action: 'write', description: 'Update subscription' },
    { method: 'DELETE', path: '/api/superadmin/subscriptions/:id', action: 'delete', description: 'Cancel subscription' },
  ],

  // ============================================
  // USERS & PERMISSIONS PAGES
  // ============================================
  'users-permissions.users': [
    { method: 'GET', path: '/api/users', action: 'read', description: 'List users' },
    { method: 'GET', path: '/api/users/:id', action: 'read', description: 'Get user details' },
    { method: 'POST', path: '/api/users', action: 'create', description: 'Create user' },
    { method: 'PUT', path: '/api/users/:id', action: 'write', description: 'Update user' },
    { method: 'DELETE', path: '/api/users/:id', action: 'delete', description: 'Delete user' },
  ],
  'users-permissions.roles': [
    { method: 'GET', path: '/api/rbac/roles', action: 'read', description: 'List roles' },
    { method: 'GET', path: '/api/rbac/roles/:id', action: 'read', description: 'Get role details' },
    { method: 'POST', path: '/api/rbac/roles', action: 'create', description: 'Create role' },
    { method: 'PUT', path: '/api/rbac/roles/:id', action: 'write', description: 'Update role' },
    { method: 'DELETE', path: '/api/rbac/roles/:id', action: 'delete', description: 'Delete role' },
  ],
  'users-permissions.permission': [
    { method: 'GET', path: '/api/rbac/permissions', action: 'read', description: 'List permissions' },
    { method: 'GET', path: '/api/rbac/permissions/:id', action: 'read', description: 'Get permission details' },
    { method: 'POST', path: '/api/rbac/permissions', action: 'create', description: 'Create permission' },
    { method: 'PUT', path: '/api/rbac/permissions/:id', action: 'write', description: 'Update permission' },
    { method: 'DELETE', path: '/api/rbac/permissions/:id', action: 'delete', description: 'Delete permission' },
  ],

  // ============================================
  // HRM PAGES
  // ============================================
  'hrm.employees': [
    { method: 'GET', path: '/api/employees', action: 'read', description: 'List employees' },
    { method: 'GET', path: '/api/employees/:id', action: 'read', description: 'Get employee details' },
    { method: 'POST', path: '/api/employees', action: 'create', description: 'Create employee' },
    { method: 'PUT', path: '/api/employees/:id', action: 'write', description: 'Update employee' },
    { method: 'DELETE', path: '/api/employees/:id', action: 'delete', description: 'Delete employee' },
  ],
  'hrm.departments': [
    { method: 'GET', path: '/api/departments', action: 'read', description: 'List departments' },
    { method: 'GET', path: '/api/departments/:id', action: 'read', description: 'Get department' },
    { method: 'POST', path: '/api/departments', action: 'create', description: 'Create department' },
    { method: 'PUT', path: '/api/departments/:id', action: 'write', description: 'Update department' },
    { method: 'DELETE', path: '/api/departments/:id', action: 'delete', description: 'Delete department' },
  ],
  'hrm.designations': [
    { method: 'GET', path: '/api/designations', action: 'read', description: 'List designations' },
    { method: 'POST', path: '/api/designations', action: 'create', description: 'Create designation' },
    { method: 'PUT', path: '/api/designations/:id', action: 'write', description: 'Update designation' },
    { method: 'DELETE', path: '/api/designations/:id', action: 'delete', description: 'Delete designation' },
  ],
  'hrm.leaves': [
    { method: 'GET', path: '/api/leaves', action: 'read', description: 'List leaves' },
    { method: 'POST', path: '/api/leaves', action: 'create', description: 'Create leave request' },
    { method: 'PUT', path: '/api/leaves/:id', action: 'write', description: 'Update leave' },
    { method: 'PUT', path: '/api/leaves/:id/approve', action: 'approve', description: 'Approve leave' },
    { method: 'DELETE', path: '/api/leaves/:id', action: 'delete', description: 'Delete leave' },
  ],
  'hrm.attendance': [
    { method: 'GET', path: '/api/attendance', action: 'read', description: 'List attendance' },
    { method: 'POST', path: '/api/attendance', action: 'create', description: 'Create attendance record' },
    { method: 'PUT', path: '/api/attendance/:id', action: 'write', description: 'Update attendance' },
    { method: 'DELETE', path: '/api/attendance/:id', action: 'delete', description: 'Delete attendance' },
  ],
  'hrm.timesheets': [
    { method: 'GET', path: '/api/timesheets', action: 'read', description: 'List timesheets' },
    { method: 'POST', path: '/api/timesheets', action: 'create', description: 'Create timesheet' },
    { method: 'PUT', path: '/api/timesheets/:id', action: 'write', description: 'Update timesheet' },
    { method: 'PUT', path: '/api/timesheets/:id/approve', action: 'approve', description: 'Approve timesheet' },
    { method: 'DELETE', path: '/api/timesheets/:id', action: 'delete', description: 'Delete timesheet' },
  ],
  'hrm.shifts': [
    { method: 'GET', path: '/api/shifts', action: 'read', description: 'List shifts' },
    { method: 'POST', path: '/api/shifts', action: 'create', description: 'Create shift' },
    { method: 'PUT', path: '/api/shifts/:id', action: 'write', description: 'Update shift' },
    { method: 'DELETE', path: '/api/shifts/:id', action: 'delete', description: 'Delete shift' },
  ],

  // ============================================
  // CRM PAGES
  // ============================================
  'crm.clients': [
    { method: 'GET', path: '/api/clients', action: 'read', description: 'List clients' },
    { method: 'GET', path: '/api/clients/:id', action: 'read', description: 'Get client' },
    { method: 'POST', path: '/api/clients', action: 'create', description: 'Create client' },
    { method: 'PUT', path: '/api/clients/:id', action: 'write', description: 'Update client' },
    { method: 'DELETE', path: '/api/clients/:id', action: 'delete', description: 'Delete client' },
  ],
  'crm.contacts': [
    { method: 'GET', path: '/api/contacts', action: 'read', description: 'List contacts' },
    { method: 'POST', path: '/api/contacts', action: 'create', description: 'Create contact' },
    { method: 'PUT', path: '/api/contacts/:id', action: 'write', description: 'Update contact' },
    { method: 'DELETE', path: '/api/contacts/:id', action: 'delete', description: 'Delete contact' },
  ],
  'crm.leads': [
    { method: 'GET', path: '/api/leads', action: 'read', description: 'List leads' },
    { method: 'POST', path: '/api/leads', action: 'create', description: 'Create lead' },
    { method: 'PUT', path: '/api/leads/:id', action: 'write', description: 'Update lead' },
    { method: 'PUT', path: '/api/leads/:id/assign', action: 'assign', description: 'Assign lead' },
    { method: 'DELETE', path: '/api/leads/:id', action: 'delete', description: 'Delete lead' },
  ],
  'crm.deals': [
    { method: 'GET', path: '/api/deals', action: 'read', description: 'List deals' },
    { method: 'POST', path: '/api/deals', action: 'create', description: 'Create deal' },
    { method: 'PUT', path: '/api/deals/:id', action: 'write', description: 'Update deal' },
    { method: 'PUT', path: '/api/deals/:id/approve', action: 'approve', description: 'Approve deal' },
    { method: 'DELETE', path: '/api/deals/:id', action: 'delete', description: 'Delete deal' },
  ],
  'crm.pipeline': [
    { method: 'GET', path: '/api/pipeline', action: 'read', description: 'Get pipeline' },
    { method: 'PUT', path: '/api/pipeline/:id', action: 'write', description: 'Update pipeline stage' },
  ],

  // ============================================
  // PROJECTS PAGES
  // ============================================
  'projects.list': [
    { method: 'GET', path: '/api/projects', action: 'read', description: 'List projects' },
    { method: 'GET', path: '/api/projects/:id', action: 'read', description: 'Get project' },
    { method: 'POST', path: '/api/projects', action: 'create', description: 'Create project' },
    { method: 'PUT', path: '/api/projects/:id', action: 'write', description: 'Update project' },
    { method: 'DELETE', path: '/api/projects/:id', action: 'delete', description: 'Delete project' },
  ],
  'projects.tasks': [
    { method: 'GET', path: '/api/tasks', action: 'read', description: 'List tasks' },
    { method: 'POST', path: '/api/tasks', action: 'create', description: 'Create task' },
    { method: 'PUT', path: '/api/tasks/:id', action: 'write', description: 'Update task' },
    { method: 'PUT', path: '/api/tasks/:id/assign', action: 'assign', description: 'Assign task' },
    { method: 'DELETE', path: '/api/tasks/:id', action: 'delete', description: 'Delete task' },
  ],

  // ============================================
  // FINANCE PAGES
  // ============================================
  'finance.invoices': [
    { method: 'GET', path: '/api/invoices', action: 'read', description: 'List invoices' },
    { method: 'GET', path: '/api/invoices/:id', action: 'read', description: 'Get invoice' },
    { method: 'POST', path: '/api/invoices', action: 'create', description: 'Create invoice' },
    { method: 'PUT', path: '/api/invoices/:id', action: 'write', description: 'Update invoice' },
    { method: 'PUT', path: '/api/invoices/:id/approve', action: 'approve', description: 'Approve invoice' },
    { method: 'DELETE', path: '/api/invoices/:id', action: 'delete', description: 'Delete invoice' },
  ],
  'finance.payments': [
    { method: 'GET', path: '/api/payments', action: 'read', description: 'List payments' },
    { method: 'POST', path: '/api/payments', action: 'create', description: 'Create payment' },
    { method: 'PUT', path: '/api/payments/:id', action: 'write', description: 'Update payment' },
    { method: 'DELETE', path: '/api/payments/:id', action: 'delete', description: 'Delete payment' },
  ],
  'finance.expenses': [
    { method: 'GET', path: '/api/expenses', action: 'read', description: 'List expenses' },
    { method: 'POST', path: '/api/expenses', action: 'create', description: 'Create expense' },
    { method: 'PUT', path: '/api/expenses/:id', action: 'write', description: 'Update expense' },
    { method: 'PUT', path: '/api/expenses/:id/approve', action: 'approve', description: 'Approve expense' },
    { method: 'DELETE', path: '/api/expenses/:id', action: 'delete', description: 'Delete expense' },
  ],
  'finance.payroll': [
    { method: 'GET', path: '/api/payroll', action: 'read', description: 'List payroll' },
    { method: 'POST', path: '/api/payroll', action: 'create', description: 'Create payroll' },
    { method: 'PUT', path: '/api/payroll/:id', action: 'write', description: 'Update payroll' },
    { method: 'PUT', path: '/api/payroll/:id/approve', action: 'approve', description: 'Approve payroll' },
    { method: 'DELETE', path: '/api/payroll/:id', action: 'delete', description: 'Delete payroll' },
  ],

  // ============================================
  // RECRUITMENT PAGES
  // ============================================
  'recruitment.jobs': [
    { method: 'GET', path: '/api/jobs', action: 'read', description: 'List jobs' },
    { method: 'POST', path: '/api/jobs', action: 'create', description: 'Create job' },
    { method: 'PUT', path: '/api/jobs/:id', action: 'write', description: 'Update job' },
    { method: 'DELETE', path: '/api/jobs/:id', action: 'delete', description: 'Delete job' },
  ],
  'recruitment.candidates': [
    { method: 'GET', path: '/api/candidates', action: 'read', description: 'List candidates' },
    { method: 'POST', path: '/api/candidates', action: 'create', description: 'Create candidate' },
    { method: 'PUT', path: '/api/candidates/:id', action: 'write', description: 'Update candidate' },
    { method: 'DELETE', path: '/api/candidates/:id', action: 'delete', description: 'Delete candidate' },
  ],

  // ============================================
  // CONTENT PAGES
  // ============================================
  'content.blogs': [
    { method: 'GET', path: '/api/blogs', action: 'read', description: 'List blogs' },
    { method: 'POST', path: '/api/blogs', action: 'create', description: 'Create blog' },
    { method: 'PUT', path: '/api/blogs/:id', action: 'write', description: 'Update blog' },
    { method: 'DELETE', path: '/api/blogs/:id', action: 'delete', description: 'Delete blog' },
  ],
  'content.pages': [
    { method: 'GET', path: '/api/content/pages', action: 'read', description: 'List content pages' },
    { method: 'POST', path: '/api/content/pages', action: 'create', description: 'Create page' },
    { method: 'PUT', path: '/api/content/pages/:id', action: 'write', description: 'Update page' },
    { method: 'DELETE', path: '/api/content/pages/:id', action: 'delete', description: 'Delete page' },
  ],

  // ============================================
  // REPORTS PAGES (Read + Export only)
  // ============================================
  'reports.expenses': [
    { method: 'GET', path: '/api/reports/expenses', action: 'read', description: 'Get expense report' },
    { method: 'GET', path: '/api/reports/expenses/export', action: 'export', description: 'Export expense report' },
  ],
  'reports.invoice': [
    { method: 'GET', path: '/api/reports/invoices', action: 'read', description: 'Get invoice report' },
    { method: 'GET', path: '/api/reports/invoices/export', action: 'export', description: 'Export invoice report' },
  ],
  'reports.attendance': [
    { method: 'GET', path: '/api/reports/attendance', action: 'read', description: 'Get attendance report' },
    { method: 'GET', path: '/api/reports/attendance/export', action: 'export', description: 'Export attendance report' },
  ],
  'reports.employee': [
    { method: 'GET', path: '/api/reports/employees', action: 'read', description: 'Get employee report' },
    { method: 'GET', path: '/api/reports/employees/export', action: 'export', description: 'Export employee report' },
  ],
};

async function addApiRoutes() {
  try {
    // Connect to MongoDB
    console.log('\n[1/3] Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('      Connected!');

    // Load models
    console.log('\n[2/3] Loading models...');
    await import('../models/rbac/page.schema.js');
    const Page = mongoose.model('Page');

    // Update pages with API routes
    console.log('\n[3/3] Adding API routes to pages...');
    console.log(`      Pages to update: ${Object.keys(apiRoutesMapping).length}\n`);

    let updated = 0;
    let skipped = 0;
    let notFound = 0;

    for (const [pageName, apiRoutes] of Object.entries(apiRoutesMapping)) {
      const page = await Page.findOne({ name: pageName });

      if (!page) {
        console.log(`      ⚠️  Page not found: ${pageName}`);
        notFound++;
        continue;
      }

      // Check if already has API routes
      if (page.apiRoutes && page.apiRoutes.length > 0) {
        console.log(`      ⊘  Skipped (already has routes): ${pageName}`);
        skipped++;
        continue;
      }

      // Update page with API routes
      page.apiRoutes = apiRoutes;
      await page.save();
      console.log(`      ✓ Updated: ${pageName} (${apiRoutes.length} routes)`);
      updated++;
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('  API ROUTES UPDATE COMPLETE');
    console.log('='.repeat(70));
    console.log(`  Pages Updated:  ${updated}`);
    console.log(`  Pages Skipped:  ${skipped}`);
    console.log(`  Pages Not Found: ${notFound}`);
    console.log(`  Total Routes:   ${Object.values(apiRoutesMapping).flat().length}`);

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

addApiRoutes();
