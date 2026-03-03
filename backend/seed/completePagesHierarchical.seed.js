/**
 * Complete Hierarchical Pages Seed
 * Based on .ferb/docs/page.md and PAGES_HIERARCHY_MAPPING.md
 *
 * Run: node backend/seed/completePagesHierarchical.seed.js
 */

import { config } from 'dotenv';
config();

import mongoose from 'mongoose';
import Page from '../models/rbac/page.schema.js';
import PageCategory from '../models/rbac/pageCategory.schema.js';

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DATABASE || 'AmasQIS';

// ============================================================================
// CATEGORY MAPPINGS
// ============================================================================

const CATEGORIES = {
  'main-menu': 'I',
  'users-permissions': 'II',
  'dashboards': 'III',
  'hrm': 'IV',
  'recruitment': 'V',
  'projects': 'VI',
  'crm': 'VII',
  'applications': 'VIII',
  'finance-accounts': 'IX',
  'administration': 'X',
  'pages': 'XI',
  'extras': 'XII',
  'authentication': 'XIII',
};

// ============================================================================
// COMPLETE PAGE DEFINITIONS
// ============================================================================

const PAGE_DEFINITIONS = {
  // ========================================================================
  // I. MAIN MENU
  // ========================================================================
  'main-menu': [
    { name: 'super-admin.dashboard', displayName: 'Dashboard', route: 'super-admin/dashboard', icon: 'ti ti-smart-home', sortOrder: 10 },
    { name: 'super-admin.companies', displayName: 'Companies', route: 'super-admin/companies', icon: 'ti ti-building', sortOrder: 20 },
    { name: 'super-admin.subscriptions', displayName: 'Subscriptions', route: 'super-admin/subscription', icon: 'ti ti-crown', sortOrder: 30 },
    { name: 'super-admin.packages', displayName: 'Packages', route: 'super-admin/package', icon: 'ti ti-package', sortOrder: 40 },
    { name: 'super-admin.modules', displayName: 'Modules', route: 'super-admin/modules', icon: 'ti ti-stack', sortOrder: 50 },
    { name: 'super-admin.pages', displayName: 'Pages', route: 'super-admin/pages', icon: 'ti ti-file', sortOrder: 60 },
  ],

  // ========================================================================
  // II. USERS & PERMISSIONS
  // ========================================================================
  'users-permissions': [
    { name: 'users', displayName: 'Users', route: 'users', icon: 'ti ti-users', sortOrder: 10 },
    { name: 'roles-permissions', displayName: 'Roles & Permissions', route: 'roles-permissions', icon: 'ti ti-shield', sortOrder: 20 },
    { name: 'permission', displayName: 'Permission', route: 'permission', icon: 'ti ti-key', sortOrder: 30 },
  ],

  // ========================================================================
  // III. DASHBOARDS
  // ========================================================================
  'dashboards': [
    { name: 'admin.dashboard', displayName: 'Admin Dashboard', route: 'admin-dashboard', icon: 'ti ti-dashboard', sortOrder: 10 },
    { name: 'hr.dashboard', displayName: 'HR Dashboard', route: 'hr-dashboard', icon: 'ti ti-chart-bar', sortOrder: 20 },
    { name: 'employee.dashboard', displayName: 'Employee Dashboard', route: 'employee-dashboard', icon: 'ti ti-user', sortOrder: 30 },
    { name: 'deals.dashboard', displayName: 'Deals Dashboard', route: 'deals-dashboard', icon: 'ti ti-handshake', sortOrder: 40 },
    { name: 'leads.dashboard', displayName: 'Leads Dashboard', route: 'leads-dashboard', icon: 'ti ti-chart-line', sortOrder: 50 },
  ],

  // ========================================================================
  // IV. HRM (Complex with L1 and L2 menus)
  // ========================================================================
  'hrm': [
    // L1: Employees (with children)
    {
      name: 'hrm.employees-menu',
      displayName: 'Employees',
      route: null,
      icon: 'ti ti-users',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 10,
      children: [
        { name: 'hrm.employees-list', displayName: 'Employees List', route: 'employees', icon: 'ti ti-users', sortOrder: 10 },
        { name: 'hrm.departments', displayName: 'Department', route: 'departments', icon: 'ti ti-building-arch', sortOrder: 20 },
        { name: 'hrm.designations', displayName: 'Designation', route: 'designations', icon: 'ti ti-badge', sortOrder: 30 },
        { name: 'hrm.policies', displayName: 'Policies', route: 'policy', icon: 'ti ti-file-description', sortOrder: 40 },
      ]
    },
    // Direct page: Tickets
    { name: 'hrm.tickets', displayName: 'Tickets', route: 'tickets/ticket-list', icon: 'ti ti-ticket', sortOrder: 20 },
    // Direct page: Holidays
    { name: 'hrm.holidays', displayName: 'Holidays', route: 'hrm/holidays', icon: 'ti ti-sun', sortOrder: 30 },
    // L1: Attendance & Leave (with L2 groups) ⭐
    {
      name: 'hrm.attendance-leave-menu',
      displayName: 'Attendance & Leave',
      route: null,
      icon: 'ti ti-calendar-check',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 40,
      l2Groups: [
        {
          name: 'hrm.leaves-menu',
          displayName: 'Leaves',
          route: null,
          icon: 'ti ti-calendar-off',
          isMenuGroup: true,
          menuGroupLevel: 2,
          sortOrder: 10,
          children: [
            { name: 'hrm.leaves-admin', displayName: 'Leaves (Admin)', route: 'leaves', icon: 'ti ti-calendar-off', sortOrder: 10 },
            { name: 'hrm.leaves-employee', displayName: 'Leaves (Employee)', route: 'leaves-employee', icon: 'ti ti-calendar-off', sortOrder: 20 },
            { name: 'hrm.leave-settings', displayName: 'Leave Settings', route: 'leave-settings', icon: 'ti ti-settings', sortOrder: 30 },
          ]
        },
        {
          name: 'hrm.attendance-menu',
          displayName: 'Attendance',
          route: null,
          icon: 'ti ti-calendar-check',
          isMenuGroup: true,
          menuGroupLevel: 2,
          sortOrder: 20,
          children: [
            { name: 'hrm.attendance-admin', displayName: 'Attendance (Admin)', route: 'attendance-admin', icon: 'ti ti-calendar-check', sortOrder: 10 },
            { name: 'hrm.attendance-employee', displayName: 'Attendance (Employee)', route: 'attendance-employee', icon: 'ti ti-calendar-check', sortOrder: 20 },
          ]
        },
        {
          name: 'hrm.shift-schedule-menu',
          displayName: 'Shift & Schedule',
          route: null,
          icon: 'ti ti-calendar-time',
          isMenuGroup: true,
          menuGroupLevel: 2,
          sortOrder: 30,
          children: [
            { name: 'hrm.schedule-timing', displayName: 'Schedule Timing', route: 'schedule-timing', icon: 'ti ti-calendar-time', sortOrder: 10 },
            { name: 'hrm.shifts-management', displayName: 'Shift Management', route: 'shifts-management', icon: 'ti ti-clock-hour-4', sortOrder: 20 },
            { name: 'hrm.batches-management', displayName: 'Shift Batches', route: 'batches-management', icon: 'ti ti-stack', sortOrder: 30 },
            { name: 'hrm.overtime', displayName: 'Overtime', route: 'overtime', icon: 'ti ti-clock-hour-12', sortOrder: 40 },
          ]
        },
      ]
    },
    // L1: Performance (with children)
    {
      name: 'hrm.performance-menu',
      displayName: 'Performance',
      route: null,
      icon: 'ti ti-chart-bar',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 50,
      children: [
        { name: 'hrm.performance-indicator', displayName: 'Performance Indicator', route: 'performance/performance-indicator', icon: 'ti ti-chart-bar', sortOrder: 10 },
        { name: 'hrm.performance-review', displayName: 'Performance Review', route: 'performance/performance-review', icon: 'ti ti-star', sortOrder: 20 },
        { name: 'hrm.performance-appraisal', displayName: 'Performance Appraisal', route: 'preformance/performance-appraisal', icon: 'ti ti-award', sortOrder: 30 },
        { name: 'hrm.goal-tracking', displayName: 'Goal List', route: 'performance/goal-tracking', icon: 'ti ti-target', sortOrder: 40 },
        { name: 'hrm.goal-type', displayName: 'Goal Type', route: 'performance/goal-type', icon: 'ti ti-flag', sortOrder: 50 },
      ]
    },
    // L1: Training (with children - routes)
    {
      name: 'hrm.training-menu',
      displayName: 'Training',
      route: null,
      icon: 'ti ti-school',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 60,
      children: [
        { name: 'hrm.training-list', displayName: 'Training List', route: 'training/training-list', icon: 'ti ti-list', sortOrder: 10 },
        { name: 'hrm.trainers', displayName: 'Trainers', route: 'training/trainers', icon: 'ti ti-user', sortOrder: 20 },
        { name: 'hrm.training-type', displayName: 'Training Type', route: 'training/training-type', icon: 'ti ti-tag', sortOrder: 30 },
      ]
    },
    // L1: Employee Lifecycle (with children - routes)
    {
      name: 'hrm.employee-lifecycle-menu',
      displayName: 'Employee Lifecycle',
      route: null,
      icon: 'ti ti-refresh',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 70,
      children: [
        { name: 'hrm.promotions', displayName: 'Promotions', route: 'promotion', icon: 'ti ti-arrow-up', sortOrder: 10 },
        { name: 'hrm.resignation', displayName: 'Resignation', route: 'resignation', icon: 'ti ti-logout', sortOrder: 20 },
        { name: 'hrm.termination', displayName: 'Termination', route: 'termination', icon: 'ti ti-user-x', sortOrder: 30 },
      ]
    },
  ],

  // ========================================================================
  // V. RECRUITMENT (with routes)
  // ========================================================================
  'recruitment': [
    { name: 'recruitment.jobs', displayName: 'Jobs', route: 'job-grid', icon: 'ti ti-briefcase', sortOrder: 10 },
    { name: 'recruitment.candidates', displayName: 'Candidates', route: 'candidates-grid', icon: 'ti ti-users', sortOrder: 20 },
    { name: 'recruitment.referrals', displayName: 'Referrals', route: 'refferals', icon: 'ti ti-share', sortOrder: 30 },
  ],

  // ========================================================================
  // VI. PROJECTS
  // ========================================================================
  'projects': [
    // Direct page: Clients
    { name: 'projects.clients', displayName: 'Clients', route: 'clients-grid', icon: 'ti ti-building', sortOrder: 10 },
    // L1: Projects (with children)
    {
      name: 'projects.projects-menu',
      displayName: 'Projects',
      route: null,
      icon: 'ti ti-folder',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 20,
      children: [
        { name: 'projects.projects-grid', displayName: 'Projects Grid', route: 'projects-grid', icon: 'ti ti-folder', sortOrder: 10 },
        { name: 'projects.tasks', displayName: 'Tasks', route: 'tasks', icon: 'ti ti-checklist', sortOrder: 20 },
        { name: 'projects.task-board', displayName: 'Task Board', route: 'task-board', icon: 'ti ti-columns', sortOrder: 30 },
        { name: 'projects.timesheet', displayName: 'Timesheet', route: 'timesheets', icon: 'ti ti-clock', sortOrder: 40 },
      ]
    },
  ],

  // ========================================================================
  // VII. CRM (with routes)
  // ========================================================================
  'crm': [
    { name: 'crm.contacts', displayName: 'Contacts', route: 'contact-grid', icon: 'ti ti-users', sortOrder: 10 },
    { name: 'crm.companies', displayName: 'Companies', route: 'companies-grid', icon: 'ti ti-building', sortOrder: 20 },
    { name: 'crm.deals', displayName: 'Deals', route: 'deals-grid', icon: 'ti ti-handshake', sortOrder: 30 },
    { name: 'crm.leads', displayName: 'Leads', route: 'leads-grid', icon: 'ti ti-chart-line', sortOrder: 40 },
    { name: 'crm.pipeline', displayName: 'Pipeline', route: 'pipeline', icon: 'ti ti-chart-dots', sortOrder: 50 },
    { name: 'crm.analytics', displayName: 'Analytics', route: 'analytics', icon: 'ti ti-chart-bar', sortOrder: 60 },
    { name: 'crm.activities', displayName: 'Activities', route: '/', icon: 'ti ti-activity', sortOrder: 70 },
  ],

  // ========================================================================
  // VIII. APPLICATIONS
  // ========================================================================
  'applications': [
    { name: 'apps.chat', displayName: 'Chat', route: 'application/chat', icon: 'ti ti-message-circle', sortOrder: 10 },
    // L1: Call (with children)
    {
      name: 'apps.call-menu',
      displayName: 'Call',
      route: null,
      icon: 'ti ti-phone',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 20,
      children: [
        { name: 'apps.voice-call', displayName: 'Voice Call', route: 'application/voice-call', icon: 'ti ti-phone', sortOrder: 10 },
        { name: 'apps.video-call', displayName: 'Video Call', route: 'application/video-call', icon: 'ti ti-video', sortOrder: 20 },
        { name: 'apps.outgoing-call', displayName: 'Outgoing Call', route: 'application/outgoing-call', icon: 'ti ti-phone-outgoing', sortOrder: 30 },
        { name: 'apps.incoming-call', displayName: 'Incoming Call', route: 'application/incoming-call', icon: 'ti ti-phone-incoming', sortOrder: 40 },
        { name: 'apps.call-history', displayName: 'Call History', route: 'application/call-history', icon: 'ti ti-history', sortOrder: 50 },
      ]
    },
    { name: 'apps.calendar', displayName: 'Calendar', route: 'calendar', icon: 'ti ti-calendar', sortOrder: 30 },
    { name: 'apps.email', displayName: 'Email', route: 'application/email', icon: 'ti ti-mail', sortOrder: 40 },
    { name: 'apps.todo', displayName: 'To Do', route: 'application/todo', icon: 'ti ti-checklist', sortOrder: 50 },
    { name: 'apps.notes', displayName: 'Notes', route: 'notes', icon: 'ti ti-note', sortOrder: 60 },
    { name: 'apps.social-feed', displayName: 'Social Feed', route: 'application/social-feed', icon: 'ti ti-brand-twitter', sortOrder: 70 },
    { name: 'apps.file-manager', displayName: 'File Manager', route: 'application/file-manager', icon: 'ti ti-folder', sortOrder: 80 },
    { name: 'apps.kanban', displayName: 'Kanban', route: 'application/kanban-view', icon: 'ti ti-columns', sortOrder: 90 },
    { name: 'apps.invoices', displayName: 'Invoices', route: 'application/invoices', icon: 'ti ti-receipt', sortOrder: 100 },
  ],

  // ========================================================================
  // IX. FINANCE & ACCOUNTS (with routes)
  // ========================================================================
  'finance-accounts': [
    // L1: Sales (with children - routes)
    {
      name: 'finance.sales-menu',
      displayName: 'Sales',
      route: null,
      icon: 'ti ti-chart-dots',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 10,
      children: [
        { name: 'finance.estimates', displayName: 'Estimates', route: 'estimates', icon: 'ti ti-file-text', sortOrder: 10 },
        { name: 'finance.invoices', displayName: 'Invoices', route: 'invoices', icon: 'ti ti-receipt', sortOrder: 20 },
        { name: 'finance.payments', displayName: 'Payments', route: 'payments', icon: 'ti ti-credit-card', sortOrder: 30 },
        { name: 'finance.expenses', displayName: 'Expenses', route: 'expenses', icon: 'ti ti-receipt-2', sortOrder: 40 },
        { name: 'finance.provident-fund', displayName: 'Provident Fund', route: 'provident-fund', icon: 'ti ti-pig', sortOrder: 50 },
        { name: 'finance.taxes', displayName: 'Taxes', route: 'taxes', icon: 'ti ti-percentage', sortOrder: 60 },
      ]
    },
    // L1: Accounting (with children - routes)
    {
      name: 'finance.accounting-menu',
      displayName: 'Accounting',
      route: null,
      icon: 'ti ti-calculator',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 20,
      children: [
        { name: 'finance.categories', displayName: 'Categories', route: 'accounting/categories', icon: 'ti ti-category', sortOrder: 10 },
        { name: 'finance.budgets', displayName: 'Budgets', route: 'accounting/budgets', icon: 'ti ti-chart-pie', sortOrder: 20 },
        { name: 'finance.budget-expenses', displayName: 'Budget Expenses', route: 'accounting/budgets-expenses', icon: 'ti ti-trending-down', sortOrder: 30 },
        { name: 'finance.budget-revenues', displayName: 'Budget Revenues', route: 'accounting/budget-revenues', icon: 'ti ti-trending-up', sortOrder: 40 },
      ]
    },
    // L1: Payroll (with children - routes)
    {
      name: 'finance.payroll-menu',
      displayName: 'Payroll',
      route: null,
      icon: 'ti ti-money',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 30,
      children: [
        { name: 'finance.employee-salary', displayName: 'Employee Salary', route: 'employee-salary', icon: 'ti ti-user-dollar', sortOrder: 10 },
        { name: 'finance.payslip', displayName: 'Payslip', route: 'payslip', icon: 'ti ti-receipt', sortOrder: 20 },
        { name: 'finance.payroll-items', displayName: 'Payroll Items', route: 'payroll', icon: 'ti ti-list', sortOrder: 30 },
      ]
    },
  ],

  // ========================================================================
  // X. ADMINISTRATION (with routes)
  // ========================================================================
  'administration': [
    // L1: Assets (with children - routes)
    {
      name: 'admin.assets-menu',
      displayName: 'Assets',
      route: null,
      icon: 'ti ti-box',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 10,
      children: [
        { name: 'admin.assets', displayName: 'Assets', route: 'assets', icon: 'ti ti-box', sortOrder: 10 },
        { name: 'admin.asset-categories', displayName: 'Asset Categories', route: 'asset-categories', icon: 'ti ti-category', sortOrder: 20 },
      ]
    },
    // L1: Help & Support (with children - routes)
    {
      name: 'admin.help-support-menu',
      displayName: 'Help & Support',
      route: null,
      icon: 'ti ti-help',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 20,
      children: [
        { name: 'admin.knowledge-base', displayName: 'Knowledge Base', route: 'knowledgebase', icon: 'ti ti-book', sortOrder: 10 },
        { name: 'admin.activities', displayName: 'Activities', route: 'activity', icon: 'ti ti-activity', sortOrder: 20 },
      ]
    },
    // L1: User Management (with children - routes)
    {
      name: 'admin.user-management-menu',
      displayName: 'User Management',
      route: null,
      icon: 'ti ti-users',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 30,
      children: [
        { name: 'admin.users', displayName: 'Users', route: 'users', icon: 'ti ti-user', sortOrder: 10 },
        { name: 'admin.roles-permissions', displayName: 'Roles & Permissions', route: 'roles-permissions', icon: 'ti ti-shield', sortOrder: 20 },
      ]
    },
    // L1: Reports (with children - routes)
    {
      name: 'admin.reports-menu',
      displayName: 'Reports',
      route: null,
      icon: 'ti ti-chart-bar',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 40,
      children: [
        { name: 'admin.expense-report', displayName: 'Expense Report', route: 'expenses-report', icon: 'ti ti-receipt', sortOrder: 10 },
        { name: 'admin.invoice-report', displayName: 'Invoice Report', route: 'invoice-report', icon: 'ti ti-file-invoice', sortOrder: 20 },
        { name: 'admin.payment-report', displayName: 'Payment Report', route: 'payment-report', icon: 'ti ti-credit-card', sortOrder: 30 },
        { name: 'admin.project-report', displayName: 'Project Report', route: 'project-report', icon: 'ti ti-folder', sortOrder: 40 },
        { name: 'admin.task-report', displayName: 'Task Report', route: 'task-report', icon: 'ti ti-checklist', sortOrder: 50 },
        { name: 'admin.user-report', displayName: 'User Report', route: 'user-report', icon: 'ti ti-user', sortOrder: 60 },
        { name: 'admin.employee-report', displayName: 'Employee Report', route: 'employee-report', icon: 'ti ti-users', sortOrder: 70 },
        { name: 'admin.payslip-report', displayName: 'Payslip Report', route: 'payslip-report', icon: 'ti ti-receipt', sortOrder: 80 },
        { name: 'admin.attendance-report', displayName: 'Attendance Report', route: 'attendance-report', icon: 'ti ti-calendar-check', sortOrder: 90 },
        { name: 'admin.leave-report', displayName: 'Leave Report', route: 'leave-report', icon: 'ti ti-calendar-off', sortOrder: 100 },
        { name: 'admin.daily-report', displayName: 'Daily Report', route: 'daily-report', icon: 'ti ti-calendar', sortOrder: 110 },
      ]
    },
    // L1: Settings (with L2 sub-groups, each containing assignable sub-pages)
    {
      name: 'admin.settings-menu',
      displayName: 'Settings',
      route: null,
      icon: 'ti ti-settings',
      isMenuGroup: true,
      menuGroupLevel: 1,
      sortOrder: 50,
      l2Groups: [
        { name: 'admin.general-settings', displayName: 'General Settings', route: 'general-settings/connected-apps', icon: 'ti ti-settings', sortOrder: 10, isMenuGroup: true, menuGroupLevel: 2 },
        { name: 'admin.website-settings', displayName: 'Website Settings', route: 'website-settings/bussiness-settings', icon: 'ti ti-world', sortOrder: 20, isMenuGroup: true, menuGroupLevel: 2 },
        { name: 'admin.app-settings', displayName: 'App Settings', route: 'app-settings/custom-fields', icon: 'ti ti-apps', sortOrder: 30, isMenuGroup: true, menuGroupLevel: 2 },
        { name: 'admin.system-settings', displayName: 'System Settings', route: 'system-settings/email-settings', icon: 'ti ti-server', sortOrder: 40, isMenuGroup: true, menuGroupLevel: 2 },
        { name: 'admin.financial-settings', displayName: 'Financial Settings', route: 'financial-settings/currencies', icon: 'ti ti-currency', sortOrder: 50, isMenuGroup: true, menuGroupLevel: 2 },
        { name: 'admin.other-settings', displayName: 'Other Settings', route: 'other-settings/ban-ip-address', icon: 'ti ti-settings-2', sortOrder: 60, isMenuGroup: true, menuGroupLevel: 2 },
      ]
    },
  ],

  // ========================================================================
  // XI. PAGES (with routes)
  // ========================================================================
  'pages': [
    { name: 'pages.starter', displayName: 'Starter', route: 'starter', icon: 'ti ti-point', sortOrder: 10 },
    { name: 'pages.profile', displayName: 'Profile', route: 'pages/profile', icon: 'ti ti-user', sortOrder: 20 },
    { name: 'pages.gallery', displayName: 'Gallery', route: 'gallery', icon: 'ti ti-photo', sortOrder: 30 },
    { name: 'pages.search-results', displayName: 'Search Results', route: 'search-result', icon: 'ti ti-search', sortOrder: 40 },
    { name: 'pages.timeline', displayName: 'Timeline', route: 'timeline', icon: 'ti ti-timeline', sortOrder: 50 },
    { name: 'pages.pricing', displayName: 'Pricing', route: 'pricing', icon: 'ti ti-tag', sortOrder: 60 },
    { name: 'pages.coming-soon', displayName: 'Coming Soon', route: 'coming-soon', icon: 'ti ti-clock', sortOrder: 70 },
    { name: 'pages.under-maintenance', displayName: 'Under Maintenance', route: 'under-maintenance', icon: 'ti ti-tools', sortOrder: 80 },
    { name: 'pages.under-construction', displayName: 'Under Construction', route: 'under-construction', icon: 'ti ti-hammer', sortOrder: 90 },
    { name: 'pages.api-keys', displayName: 'API Keys', route: 'api-keys', icon: 'ti ti-key', sortOrder: 100 },
    { name: 'pages.privacy-policy', displayName: 'Privacy Policy', route: 'privacy-policy', icon: 'ti ti-shield', sortOrder: 110 },
    { name: 'pages.terms-conditions', displayName: 'Terms & Conditions', route: 'terms-condition', icon: 'ti ti-file-text', sortOrder: 120 },
  ],

  // ========================================================================
  // XII. EXTRAS (no routes yet)
  // ========================================================================
  'extras': [
    { name: 'extras.documentation', displayName: 'Documentation', route: null, icon: 'ti ti-book', sortOrder: 10 },
  ],

  // ========================================================================
  // XIII. AUTHENTICATION (always accessible — featureFlags.enabledForAll: true)
  // These pages are never restricted by company plan or module assignments.
  // ========================================================================
  'authentication': [
    { name: 'auth.login',                 displayName: 'Login',                  route: 'login',                  icon: 'ti ti-login',         sortOrder: 10,  featureFlags: { enabledForAll: true } },
    { name: 'auth.register',              displayName: 'Register',               route: 'register',               icon: 'ti ti-user-plus',     sortOrder: 20,  featureFlags: { enabledForAll: true } },
    { name: 'auth.forgot-password',       displayName: 'Forgot Password',        route: 'forgot-password',        icon: 'ti ti-lock-question', sortOrder: 30,  featureFlags: { enabledForAll: true } },
    { name: 'auth.two-step-verification', displayName: 'Two-Step Verification',  route: 'two-step-verification',  icon: 'ti ti-shield-check',  sortOrder: 40,  featureFlags: { enabledForAll: true } },
    { name: 'auth.email-verification',    displayName: 'Email Verification',     route: 'email-verification',     icon: 'ti ti-mail-check',    sortOrder: 50,  featureFlags: { enabledForAll: true } },
    { name: 'auth.lock-screen',           displayName: 'Lock Screen',            route: 'lock-screen',            icon: 'ti ti-device-desktop-off', sortOrder: 60, featureFlags: { enabledForAll: true } },
    { name: 'auth.reset-password',        displayName: 'Reset Password',         route: 'reset-password',         icon: 'ti ti-lock-open',     sortOrder: 70,  featureFlags: { enabledForAll: true } },
    { name: 'auth.reset-password-success',displayName: 'Reset Password Success', route: 'success',                icon: 'ti ti-check',         sortOrder: 80,  featureFlags: { enabledForAll: true } },
  ],
};

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function seedPages() {
  await mongoose.connect(uri, { dbName });

  console.log('🌱 Seeding Complete Hierarchical Pages...\n');

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  // Ensure Authentication category (XIII) exists — it is not part of the base categories seed
  const authCatExists = await PageCategory.findOne({ label: 'authentication' });
  if (!authCatExists) {
    await PageCategory.create({
      identifier: 'XIII', displayName: 'Authentication', label: 'authentication',
      description: 'Login, register, and authentication-related pages (always accessible)',
      icon: 'ti ti-lock', sortOrder: 130, isSystem: true, isActive: true,
    });
    console.log('  ✅ Created category XIII — Authentication');
  }

  // Process each category
  for (const [categoryLabel, pages] of Object.entries(PAGE_DEFINITIONS)) {
    const category = await PageCategory.findOne({ label: categoryLabel });
    if (!category) {
      console.log(`⚠️  Category not found: ${categoryLabel} - skipping`);
      totalSkipped += pages.length;
      continue;
    }

    console.log(`\n📁 Processing: ${category.displayName} (${category.identifier})`);

    // Process each page/group in category
    for (const pageDef of pages) {
      await processPageDefinition(pageDef, category, null, 0);
    }
  }

  console.log('\n✅ Seeding complete!');
  console.log(`   Created: ${totalCreated}`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Skipped: ${totalSkipped}`);

  await mongoose.disconnect();
}

async function processPageDefinition(pageDef, category, parentPage, depth) {
  let page = await Page.findOne({ name: pageDef.name });

  const baseData = {
    name: pageDef.name,
    displayName: pageDef.displayName,
    route: pageDef.route,
    icon: pageDef.icon,
    category: category._id,
    parentPage: parentPage,
    isMenuGroup: pageDef.isMenuGroup || false,
    menuGroupLevel: pageDef.menuGroupLevel || null,
    sortOrder: pageDef.sortOrder,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export'],
    isSystem: true,
    isActive: true,
    ...(pageDef.featureFlags ? { featureFlags: pageDef.featureFlags } : {}),
  };

  if (page) {
    Object.assign(page, baseData);
    await page.save();
    console.log(`  ${'  '.repeat(depth)}✏️  Updated: ${pageDef.displayName}`);
  } else {
    page = new Page(baseData);
    await page.save();
    console.log(`  ${'  '.repeat(depth)}✅ Created: ${pageDef.displayName}`);
  }

  // Process children (direct or L2 groups)
  if (pageDef.children) {
    for (const childDef of pageDef.children) {
      await processPageDefinition(childDef, category, page._id, depth + 1);
    }
  }

  // Process L2 groups
  if (pageDef.l2Groups) {
    for (const l2Def of pageDef.l2Groups) {
      await processPageDefinition(l2Def, category, page._id, depth + 1);
    }
  }
}

// Run the seed
seedPages().catch(console.error);
