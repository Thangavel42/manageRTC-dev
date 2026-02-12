/**
 * RBAC Seed Script
 * Populates initial permissions and system roles
 * Comprehensive permission structure for manageRTC application
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Permission from '../models/rbac/permission.schema.js';
import Role from '../models/rbac/role.schema.js';
import RolePermission from '../models/rbac/rolePermission.schema.js';

// ============================================
// COMPREHENSIVE PERMISSION DEFINITIONS
// ============================================
const permissionDefinitions = [
  // ============================================
  // I. SUPER ADMIN
  // ============================================
  { module: 'super-admin.dashboard', displayName: 'Dashboard', category: 'super-admin', sortOrder: 1 },
  { module: 'super-admin.companies', displayName: 'Companies', category: 'super-admin', sortOrder: 2 },
  { module: 'super-admin.subscriptions', displayName: 'Subscriptions', category: 'super-admin', sortOrder: 3 },
  { module: 'super-admin.packages', displayName: 'Packages', category: 'super-admin', sortOrder: 4 },

  // ============================================
  // II. USERS & PERMISSIONS
  // ============================================
  { module: 'users-permissions.users', displayName: 'Users', category: 'users-permissions', sortOrder: 1 },
  { module: 'users-permissions.roles', displayName: 'Roles & Permissions', category: 'users-permissions', sortOrder: 2 },
  { module: 'users-permissions.permissions', displayName: 'Permission', category: 'users-permissions', sortOrder: 3 },

  // ============================================
  // III. APPLICATIONS
  // ============================================
  { module: 'applications.chat', displayName: 'Chat', category: 'applications', sortOrder: 1 },
  { module: 'applications.voice-call', displayName: 'Voice Call', category: 'applications', sortOrder: 2 },
  { module: 'applications.video-call', displayName: 'Video Call', category: 'applications', sortOrder: 3 },
  { module: 'applications.outgoing-call', displayName: 'Outgoing Call', category: 'applications', sortOrder: 4 },
  { module: 'applications.incoming-call', displayName: 'Incoming Call', category: 'applications', sortOrder: 5 },
  { module: 'applications.call-history', displayName: 'Call History', category: 'applications', sortOrder: 6 },
  { module: 'applications.calendar', displayName: 'Calendar', category: 'applications', sortOrder: 7 },
  { module: 'applications.email', displayName: 'Email', category: 'applications', sortOrder: 8 },
  { module: 'applications.todo', displayName: 'To Do', category: 'applications', sortOrder: 9 },
  { module: 'applications.notes', displayName: 'Notes', category: 'applications', sortOrder: 10 },
  { module: 'applications.social-feed', displayName: 'Social Feed', category: 'applications', sortOrder: 11 },
  { module: 'applications.file-manager', displayName: 'File Manager', category: 'applications', sortOrder: 12 },
  { module: 'applications.kanban', displayName: 'Kanban', category: 'applications', sortOrder: 13 },
  { module: 'applications.invoices', displayName: 'Invoices', category: 'applications', sortOrder: 14 },

  // ============================================
  // IV. HRM
  // ============================================
  // Employees
  { module: 'hrm.employees-list', displayName: 'Employees List', category: 'hrm', sortOrder: 1 },
  { module: 'hrm.departments', displayName: 'Department', category: 'hrm', sortOrder: 2 },
  { module: 'hrm.designations', displayName: 'Designation', category: 'hrm', sortOrder: 3 },
  { module: 'hrm.policies', displayName: 'Policies', category: 'hrm', sortOrder: 4 },

  // Tickets
  { module: 'hrm.tickets-list', displayName: 'Tickets List', category: 'hrm', sortOrder: 5 },
  { module: 'hrm.tickets-detail', displayName: 'Tickets Detail', category: 'hrm', sortOrder: 6 },

  // Holidays
  { module: 'hrm.holidays', displayName: 'Holidays', category: 'hrm', sortOrder: 7 },

  // Attendance & Leaves
  { module: 'hrm.leaves-admin', displayName: 'Leaves (Admin)', category: 'hrm', sortOrder: 8 },
  { module: 'hrm.leaves-employee', displayName: 'Leaves (Employee)', category: 'hrm', sortOrder: 9 },
  { module: 'hrm.leave-settings', displayName: 'Leave Settings', category: 'hrm', sortOrder: 10 },
  { module: 'hrm.attendance-admin', displayName: 'Attendance (Admin)', category: 'hrm', sortOrder: 11 },
  { module: 'hrm.attendance-employee', displayName: 'Attendance (Employee)', category: 'hrm', sortOrder: 12 },
  { module: 'hrm.timesheet', displayName: 'Timesheet', category: 'hrm', sortOrder: 13 },
  { module: 'hrm.shift-schedule', displayName: 'Shift & Schedule', category: 'hrm', sortOrder: 14 },
  { module: 'hrm.shift-management', displayName: 'Shift Management', category: 'hrm', sortOrder: 15 },
  { module: 'hrm.shift-batches', displayName: 'Shift Batches', category: 'hrm', sortOrder: 16 },
  { module: 'hrm.overtime', displayName: 'Overtime', category: 'hrm', sortOrder: 17 },

  // Performance
  { module: 'hrm.performance-indicator', displayName: 'Performance Indicator', category: 'hrm', sortOrder: 18 },
  { module: 'hrm.performance-review', displayName: 'Performance Review', category: 'hrm', sortOrder: 19 },
  { module: 'hrm.performance-appraisal', displayName: 'Performance Appraisal', category: 'hrm', sortOrder: 20 },
  { module: 'hrm.goal-tracking', displayName: 'Goal Tracking', category: 'hrm', sortOrder: 21 },
  { module: 'hrm.goal-type', displayName: 'Goal Type', category: 'hrm', sortOrder: 22 },

  // Training
  { module: 'hrm.training-list', displayName: 'Training List', category: 'hrm', sortOrder: 23 },
  { module: 'hrm.trainers', displayName: 'Trainers', category: 'hrm', sortOrder: 24 },
  { module: 'hrm.training-type', displayName: 'Training Type', category: 'hrm', sortOrder: 25 },

  // Others
  { module: 'hrm.promotions', displayName: 'Promotions', category: 'hrm', sortOrder: 26 },
  { module: 'hrm.resignation', displayName: 'Resignation', category: 'hrm', sortOrder: 27 },
  { module: 'hrm.termination', displayName: 'Termination', category: 'hrm', sortOrder: 28 },

  // ============================================
  // V. PROJECTS
  // ============================================
  { module: 'projects.clients', displayName: 'Clients', category: 'projects', sortOrder: 1 },
  { module: 'projects.projects', displayName: 'Projects', category: 'projects', sortOrder: 2 },
  { module: 'projects.tasks', displayName: 'Tasks', category: 'projects', sortOrder: 3 },
  { module: 'projects.task-board', displayName: 'Task Board', category: 'projects', sortOrder: 4 },

  // ============================================
  // VI. CRM
  // ============================================
  { module: 'crm.contacts', displayName: 'Contacts', category: 'crm', sortOrder: 1 },
  { module: 'crm.companies', displayName: 'Companies', category: 'crm', sortOrder: 2 },
  { module: 'crm.deals', displayName: 'Deals', category: 'crm', sortOrder: 3 },
  { module: 'crm.leads', displayName: 'Leads', category: 'crm', sortOrder: 4 },
  { module: 'crm.pipeline', displayName: 'Pipeline', category: 'crm', sortOrder: 5 },
  { module: 'crm.analytics', displayName: 'Analytics', category: 'crm', sortOrder: 6 },
  { module: 'crm.activities', displayName: 'Activities', category: 'crm', sortOrder: 7 },

  // ============================================
  // VII. RECRUITMENT
  // ============================================
  { module: 'recruitment.jobs', displayName: 'Jobs', category: 'recruitment', sortOrder: 1 },
  { module: 'recruitment.candidates', displayName: 'Candidates', category: 'recruitment', sortOrder: 2 },
  { module: 'recruitment.referrals', displayName: 'Referrals', category: 'recruitment', sortOrder: 3 },

  // ============================================
  // VIII. FINANCE & ACCOUNTS
  // ============================================
  // Sales
  { module: 'finance.estimates', displayName: 'Estimates', category: 'finance', sortOrder: 1 },
  { module: 'finance.invoices', displayName: 'Invoices', category: 'finance', sortOrder: 2 },
  { module: 'finance.payments', displayName: 'Payments', category: 'finance', sortOrder: 3 },
  { module: 'finance.expenses', displayName: 'Expenses', category: 'finance', sortOrder: 4 },
  { module: 'finance.provident-fund', displayName: 'Provident Fund', category: 'finance', sortOrder: 5 },
  { module: 'finance.taxes', displayName: 'Taxes', category: 'finance', sortOrder: 6 },

  // Accounting
  { module: 'finance.categories', displayName: 'Categories', category: 'finance', sortOrder: 7 },
  { module: 'finance.budgets', displayName: 'Budgets', category: 'finance', sortOrder: 8 },
  { module: 'finance.budget-expenses', displayName: 'Budget Expenses', category: 'finance', sortOrder: 9 },
  { module: 'finance.budget-revenues', displayName: 'Budget Revenues', category: 'finance', sortOrder: 10 },

  // Payroll
  { module: 'finance.employee-salary', displayName: 'Employee Salary', category: 'finance', sortOrder: 11 },
  { module: 'finance.payslip', displayName: 'Payslip', category: 'finance', sortOrder: 12 },
  { module: 'finance.payroll-items', displayName: 'Payroll Items', category: 'finance', sortOrder: 13 },

  // ============================================
  // IX. ADMINISTRATION
  // ============================================
  { module: 'administration.assets', displayName: 'Assets', category: 'administration', sortOrder: 1 },
  { module: 'administration.asset-categories', displayName: 'Asset Categories', category: 'administration', sortOrder: 2 },
  { module: 'administration.knowledge-base', displayName: 'Knowledge Base', category: 'administration', sortOrder: 3 },
  { module: 'administration.activities', displayName: 'Activities', category: 'administration', sortOrder: 4 },
  { module: 'administration.users', displayName: 'User Management', category: 'administration', sortOrder: 5 },
  { module: 'administration.roles-permissions', displayName: 'Roles & Permissions', category: 'administration', sortOrder: 6 },

  // Reports
  { module: 'administration.expense-report', displayName: 'Expense Report', category: 'administration', sortOrder: 7 },
  { module: 'administration.invoice-report', displayName: 'Invoice Report', category: 'administration', sortOrder: 8 },
  { module: 'administration.payment-report', displayName: 'Payment Report', category: 'administration', sortOrder: 9 },
  { module: 'administration.project-report', displayName: 'Project Report', category: 'administration', sortOrder: 10 },
  { module: 'administration.task-report', displayName: 'Task Report', category: 'administration', sortOrder: 11 },
  { module: 'administration.user-report', displayName: 'User Report', category: 'administration', sortOrder: 12 },
  { module: 'administration.employee-report', displayName: 'Employee Report', category: 'administration', sortOrder: 13 },
  { module: 'administration.payslip-report', displayName: 'Payslip Report', category: 'administration', sortOrder: 14 },
  { module: 'administration.attendance-report', displayName: 'Attendance Report', category: 'administration', sortOrder: 15 },
  { module: 'administration.leave-report', displayName: 'Leave Report', category: 'administration', sortOrder: 16 },
  { module: 'administration.daily-report', displayName: 'Daily Report', category: 'administration', sortOrder: 17 },

  // Settings
  { module: 'administration.general-settings', displayName: 'General Settings', category: 'administration', sortOrder: 18 },
  { module: 'administration.website-settings', displayName: 'Website Settings', category: 'administration', sortOrder: 19 },
  { module: 'administration.app-settings', displayName: 'App Settings', category: 'administration', sortOrder: 20 },
  { module: 'administration.system-settings', displayName: 'System Settings', category: 'administration', sortOrder: 21 },
  { module: 'administration.financial-settings', displayName: 'Financial Settings', category: 'administration', sortOrder: 22 },
  { module: 'administration.other-settings', displayName: 'Other Settings', category: 'administration', sortOrder: 23 },

  // ============================================
  // X. CONTENT
  // ============================================
  { module: 'content.pages', displayName: 'Pages', category: 'content', sortOrder: 1 },
  { module: 'content.blogs', displayName: 'Blogs', category: 'content', sortOrder: 2 },
  { module: 'content.blog-categories', displayName: 'Blog Categories', category: 'content', sortOrder: 3 },
  { module: 'content.blog-comments', displayName: 'Blog Comments', category: 'content', sortOrder: 4 },
  { module: 'content.blog-tags', displayName: 'Blog Tags', category: 'content', sortOrder: 5 },
  { module: 'content.countries', displayName: 'Countries', category: 'content', sortOrder: 6 },
  { module: 'content.states', displayName: 'States', category: 'content', sortOrder: 7 },
  { module: 'content.cities', displayName: 'Cities', category: 'content', sortOrder: 8 },
  { module: 'content.testimonials', displayName: 'Testimonials', category: 'content', sortOrder: 9 },
  { module: 'content.faq', displayName: 'FAQ\'s', category: 'content', sortOrder: 10 },

  // ============================================
  // XI. PAGES
  // ============================================
  { module: 'pages.starter', displayName: 'Starter', category: 'pages', sortOrder: 1 },
  { module: 'pages.profile', displayName: 'Profile', category: 'pages', sortOrder: 2 },
  { module: 'pages.gallery', displayName: 'Gallery', category: 'pages', sortOrder: 3 },
  { module: 'pages.search-results', displayName: 'Search Results', category: 'pages', sortOrder: 4 },
  { module: 'pages.timeline', displayName: 'Timeline', category: 'pages', sortOrder: 5 },
  { module: 'pages.pricing', displayName: 'Pricing', category: 'pages', sortOrder: 6 },
  { module: 'pages.coming-soon', displayName: 'Coming Soon', category: 'pages', sortOrder: 7 },
  { module: 'pages.maintenance', displayName: 'Under Maintenance', category: 'pages', sortOrder: 8 },
  { module: 'pages.construction', displayName: 'Under Construction', category: 'pages', sortOrder: 9 },
  { module: 'pages.api-keys', displayName: 'API Keys', category: 'pages', sortOrder: 10 },
  { module: 'pages.privacy-policy', displayName: 'Privacy Policy', category: 'pages', sortOrder: 11 },
  { module: 'pages.terms-conditions', displayName: 'Terms & Conditions', category: 'pages', sortOrder: 12 },

  // ============================================
  // XII. AUTHENTICATIONS
  // ============================================
  { module: 'auth.login', displayName: 'Login', category: 'auth', sortOrder: 1 },
  { module: 'auth.register', displayName: 'Register', category: 'auth', sortOrder: 2 },
  { module: 'auth.forgot-password', displayName: 'Forgot Password', category: 'auth', sortOrder: 3 },
  { module: 'auth.reset-password', displayName: 'Reset Password', category: 'auth', sortOrder: 4 },
  { module: 'auth.email-verification', displayName: 'Email Verification', category: 'auth', sortOrder: 5 },
  { module: 'auth.two-factor', displayName: '2 Step Verification', category: 'auth', sortOrder: 6 },
  { module: 'auth.lock-screen', displayName: 'Lock Screen', category: 'auth', sortOrder: 7 },
  { module: 'auth.404', displayName: '404 Error', category: 'auth', sortOrder: 8 },
  { module: 'auth.500', displayName: '500 Error', category: 'auth', sortOrder: 9 },

  // ============================================
  // XIII. UI INTERFACE
  // ============================================
  { module: 'ui.base', displayName: 'Base UI', category: 'ui', sortOrder: 1 },
  { module: 'ui.advanced', displayName: 'Advanced UI', category: 'ui', sortOrder: 2 },
  { module: 'ui.charts', displayName: 'Charts', category: 'ui', sortOrder: 3 },
  { module: 'ui.icons', displayName: 'Icons', category: 'ui', sortOrder: 4 },
  { module: 'ui.forms', displayName: 'Forms', category: 'ui', sortOrder: 5 },
  { module: 'ui.tables', displayName: 'Tables', category: 'ui', sortOrder: 6 },
  { module: 'ui.maps', displayName: 'Maps', category: 'ui', sortOrder: 7 },

  // ============================================
  // XIV. EXTRAS
  // ============================================
  { module: 'extras.documentation', displayName: 'Documentation', category: 'extras', sortOrder: 1 },
  { module: 'extras.change-log', displayName: 'Change Log', category: 'extras', sortOrder: 2 },

  // ============================================
  // XV. DASHBOARDS
  // ============================================
  { module: 'dashboards.hr', displayName: 'HR Dashboard', category: 'dashboards', sortOrder: 1 },
  { module: 'dashboards.employee', displayName: 'Employee Dashboard', category: 'dashboards', sortOrder: 2 },
  { module: 'dashboards.deals', displayName: 'Deals Dashboard', category: 'dashboards', sortOrder: 3 },
  { module: 'dashboards.leads', displayName: 'Leads Dashboard', category: 'dashboards', sortOrder: 4 },
  { module: 'dashboards.admin', displayName: 'Admin Dashboard', category: 'dashboards', sortOrder: 5 },
];

// System Role definitions
const systemRoleDefinitions = [
  {
    name: 'superadmin',
    displayName: 'Super Admin',
    description: 'Platform administrator with full access to all features',
    type: 'system',
    level: 1,
    isDefault: false,
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Company administrator with full access',
    type: 'system',
    level: 10,
    isDefault: true,
  },
  {
    name: 'hr',
    displayName: 'HR Manager',
    description: 'Human Resources manager with HR module access',
    type: 'system',
    level: 20,
    isDefault: false,
  },
  {
    name: 'manager',
    displayName: 'Manager',
    description: 'Team/Project manager with limited access',
    type: 'system',
    level: 30,
    isDefault: false,
  },
  {
    name: 'employee',
    displayName: 'Employee',
    description: 'Standard employee with basic access',
    type: 'system',
    level: 50,
    isDefault: true,
  },
  {
    name: 'client',
    displayName: 'Client',
    description: 'External client with limited access',
    type: 'system',
    level: 60,
    isDefault: false,
  },
];

/**
 * Seed permissions
 */
async function seedPermissions() {
  console.log('📝 Seeding permissions...');

  const count = await Permission.countDocuments();
  if (count > 0) {
    console.log(`✓ Found ${count} existing permissions, skipping seed`);
    return await Permission.find({}).sort({ sortOrder: 1 });
  }

  const permissions = await Permission.insertMany(permissionDefinitions);
  console.log(`✓ Created ${permissions.length} permissions`);

  return permissions;
}

/**
 * Seed system roles
 */
async function seedRoles() {
  console.log('👥 Seeding system roles...');

  const count = await Role.countDocuments({ type: 'system' });
  if (count > 0) {
    console.log(`✓ Found ${count} existing system roles, skipping seed`);
    return await Role.find({ type: 'system' }).sort({ level: 1 });
  }

  const roles = await Role.insertMany(systemRoleDefinitions);
  console.log(`✓ Created ${roles.length} system roles`);

  return roles;
}

/**
 * Seed default permissions for Super Admin (all permissions)
 */
async function seedSuperAdminPermissions() {
  console.log('🔑 Seeding Super Admin permissions...');

  const superAdminRole = await Role.findOne({ name: 'superadmin' });
  if (!superAdminRole) {
    console.log('✗ Super Admin role not found');
    return;
  }

  const existingCount = await RolePermission.countDocuments({ roleId: superAdminRole._id });
  if (existingCount > 0) {
    console.log(`✓ Found ${existingCount} existing Super Admin permissions, skipping`);
    return;
  }

  const permissions = await Permission.find({});
  const rolePermissions = permissions.map(p => ({
    roleId: superAdminRole._id,
    permissionId: p._id,
    actions: { all: true },
  }));

  await RolePermission.insertMany(rolePermissions);
  console.log(`✓ Granted ${rolePermissions.length} permissions to Super Admin`);
}

/**
 * Main seed function
 */
async function seed() {
  try {
    console.log('\n🌱 Starting RBAC seed...\n');

    await seedPermissions();
    await seedRoles();
    await seedSuperAdminPermissions();

    console.log('\n✅ RBAC seed completed successfully!\n');
  } catch (error) {
    console.error('\n❌ RBAC seed failed:', error);
    throw error;
  }
}

// Run seed if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';
  mongoose.connect(uri, { dbName })
    .then(() => seed())
    .then(() => mongoose.disconnect())
    .catch(console.error);
}

export { seed, seedPermissions, seedRoles, seedSuperAdminPermissions };
