# RBAC SYSTEM - IMPLEMENTATION GUIDE

**Date:** 2026-02-10
**Project:** manageRTC-my
**Based on:** RBAC Brutal Validation Report

---

## TABLE OF CONTENTS

1. [Phase 1: Pages Collection Enhancement](#phase-1-pages-collection-enhancement)
2. [Phase 2: Roles Restructuring](#phase-2-roles-restructuring)
3. [Phase 3: Modules Restructuring](#phase-3-modules-restructuring)
4. [Phase 4: Plans & Companies Fix](#phase-4-plans--companies-fix)
5. [Phase 5: Permission Middleware](#phase-5-permission-middleware)
6. [Phase 6: Menu Generation & UI Updates](#phase-6-menu-generation--ui-updates)
7. [Phase 7: Testing & Documentation](#phase-7-testing--documentation)

---

## PHASE 1: PAGES COLLECTION ENHANCEMENT

**Priority:** CRITICAL
**Duration:** 2-3 days
**Dependencies:** None

### 1.1 Update Page Schema

**File:** `backend/models/rbac/page.schema.js`

```javascript
/**
 * Page Schema - Enhanced with availableActions
 * Defines individual pages/routes that can be assigned to modules and roles
 */

import mongoose from 'mongoose';

const pageSchema = new mongoose.Schema({
  // Unique page identifier (e.g., "hrm.employees", "projects.tasks")
  name: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  // Display name (e.g., "Employees", "Tasks")
  displayName: {
    type: String,
    required: true,
  },

  // Description
  description: {
    type: String,
  },

  // Route path (e.g., "/hrm/employees", "/projects/tasks")
  route: {
    type: String,
    required: true,
  },

  // Icon (Tabler icon class)
  icon: {
    type: String,
    default: 'ti ti-file',
  },

  // Module this page belongs to (for organization)
  moduleCategory: {
    type: String,
    enum: ['super-admin', 'users-permissions', 'applications', 'hrm', 'projects',
           'crm', 'recruitment', 'finance', 'administration', 'content',
           'pages', 'auth', 'ui', 'extras', 'dashboards', null],
  },

  // Parent page (for nested pages)
  parentPage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Page',
    default: null,
  },

  // Sort order for display
  sortOrder: {
    type: Number,
    default: 0,
  },

  // Is this a system page (cannot be deleted)
  isSystem: {
    type: Boolean,
    default: false,
  },

  // Active status
  isActive: {
    type: Boolean,
    default: true,
  },

  // ============================================
  // NEW FIELD: Available Actions
  // ============================================
  // Defines which actions can be performed on this page
  availableActions: {
    type: [String],
    default: ['read', 'create', 'write', 'delete', 'import', 'export'],
    enum: ['all', 'read', 'create', 'write', 'delete', 'import', 'export', 'approve', 'assign'],
  },

  // SEO / Display metadata
  meta: {
    title: String,
    keywords: [String],
    layout: {
      type: String,
      enum: ['default', 'full-width', 'no-sidebar', 'blank'],
      default: 'default',
    },
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
});

// Indexes
pageSchema.index({ name: 1 });
pageSchema.index({ moduleCategory: 1, sortOrder: 1 });
pageSchema.index({ isActive: 1 });
pageSchema.index({ parentPage: 1 });

// Static method to get pages by module category
pageSchema.statics.getByModule = function(moduleCategory) {
  return this.find({
    moduleCategory,
    isActive: true,
    parentPage: null
  }).sort({ sortOrder: 1 });
};

export default mongoose.models.Page || mongoose.model('Page', pageSchema);
```

### 1.2 Create Pages Seed Data

**File:** `backend/seed/pages.seed.js`

```javascript
/**
 * Pages Seed Data
 * All 181 pages with their routes, categories, and available actions
 */

export const pagesSeedData = [
  // ============================================
  // I. SUPER ADMIN
  // ============================================
  {
    name: 'super-admin.dashboard',
    displayName: 'Dashboard',
    description: 'Super Admin Dashboard',
    route: '/super-admin/dashboard',
    icon: 'ti ti-smart-home',
    moduleCategory: 'super-admin',
    sortOrder: 1,
    isSystem: true,
    availableActions: ['read']
  },
  {
    name: 'super-admin.companies',
    displayName: 'Companies',
    description: 'Manage Companies',
    route: '/super-admin/companies',
    icon: 'ti ti-building',
    moduleCategory: 'super-admin',
    sortOrder: 2,
    isSystem: true,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'super-admin.subscriptions',
    displayName: 'Subscriptions',
    description: 'Manage Subscriptions',
    route: '/super-admin/subscription',
    icon: 'ti ti-credit-card',
    moduleCategory: 'super-admin',
    sortOrder: 3,
    isSystem: true,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'super-admin.packages',
    displayName: 'Packages',
    description: 'Manage Packages',
    route: '/super-admin/package',
    icon: 'ti ti-package',
    moduleCategory: 'super-admin',
    sortOrder: 4,
    isSystem: true,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'super-admin.modules',
    displayName: 'Modules',
    description: 'Manage Modules',
    route: '/super-admin/modules',
    icon: 'ti ti-apps',
    moduleCategory: 'super-admin',
    sortOrder: 5,
    isSystem: true,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // II. USERS & PERMISSIONS
  // ============================================
  {
    name: 'users-permissions.users',
    displayName: 'Users',
    description: 'Manage Users',
    route: '/users',
    icon: 'ti ti-users',
    moduleCategory: 'users-permissions',
    sortOrder: 1,
    isSystem: true,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'users-permissions.roles',
    displayName: 'Roles & Permissions',
    description: 'Manage Roles and Permissions',
    route: '/roles-permissions',
    icon: 'ti ti-shield',
    moduleCategory: 'users-permissions',
    sortOrder: 2,
    isSystem: true,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'users-permissions.permission',
    displayName: 'Permission',
    description: 'Manage Permissions',
    route: '/permission',
    icon: 'ti ti-key',
    moduleCategory: 'users-permissions',
    sortOrder: 3,
    isSystem: true,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // III. DASHBOARDS
  // ============================================
  {
    name: 'dashboards.admin',
    displayName: 'Admin Dashboards',
    route: '/admin-dashboard',
    icon: 'ti ti-dashboard',
    moduleCategory: 'dashboards',
    sortOrder: 1,
    availableActions: ['read']
  },
  {
    name: 'dashboards.hr',
    displayName: 'HR Dashboard',
    route: '/hr-dashboard',
    icon: 'ti ti-chart-pie',
    moduleCategory: 'dashboards',
    sortOrder: 2,
    availableActions: ['read']
  },
  {
    name: 'dashboards.employee',
    displayName: 'Employee Dashboard',
    route: '/employee-dashboard',
    icon: 'ti ti-user',
    moduleCategory: 'dashboards',
    sortOrder: 3,
    availableActions: ['read']
  },
  {
    name: 'dashboards.deals',
    displayName: 'Deals Dashboard',
    route: '/deals-dashboard',
    icon: 'ti ti-currency-dollar',
    moduleCategory: 'dashboards',
    sortOrder: 4,
    availableActions: ['read']
  },
  {
    name: 'dashboards.leads',
    displayName: 'Leads Dashboard',
    route: '/leads-dashboard',
    icon: 'ti ti-chart-line',
    moduleCategory: 'dashboards',
    sortOrder: 5,
    availableActions: ['read']
  },

  // ============================================
  // IV. HRM - EMPLOYEES
  // ============================================
  {
    name: 'hrm.employees.list',
    displayName: 'Employees List',
    route: '/employees',
    icon: 'ti ti-users',
    moduleCategory: 'hrm',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.departments',
    displayName: 'Department',
    route: '/departments',
    icon: 'ti ti-building-arch',
    moduleCategory: 'hrm',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.designations',
    displayName: 'Designation',
    route: '/designations',
    icon: 'ti ti-badge',
    moduleCategory: 'hrm',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.policies',
    displayName: 'Policies',
    route: '/policy',
    icon: 'ti ti-file-text',
    moduleCategory: 'hrm',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.tickets.list',
    displayName: 'Tickets List',
    route: '/tickets/ticket-list',
    icon: 'ti ti-ticket',
    moduleCategory: 'hrm',
    sortOrder: 5,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.tickets.detail',
    displayName: 'Tickets Detail',
    route: '/tickets/ticket-details',
    icon: 'ti ti-ticket',
    moduleCategory: 'hrm',
    parentPage: 'hrm.tickets.list',
    sortOrder: 6,
    availableActions: ['read', 'write']
  },
  {
    name: 'hrm.holidays',
    displayName: 'Holidays',
    route: '/hrm/holidays',
    icon: 'ti ti-sun',
    moduleCategory: 'hrm',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },

  // ============================================
  // V. HRM - ATTENDANCE
  // ============================================
  {
    name: 'hrm.leaves.admin',
    displayName: 'Leaves (Admin)',
    route: '/leaves',
    icon: 'ti ti-calendar-minus',
    moduleCategory: 'hrm',
    sortOrder: 8,
    availableActions: ['read', 'create', 'write', 'delete', 'approve', 'import', 'export']
  },
  {
    name: 'hrm.leaves.employee',
    displayName: 'Leaves (Employee)',
    route: '/leaves-employee',
    icon: 'ti ti-calendar-minus',
    moduleCategory: 'hrm',
    sortOrder: 9,
    availableActions: ['read', 'create', 'write']
  },
  {
    name: 'hrm.leave-settings',
    displayName: 'Leave Settings',
    route: '/leave-settings',
    icon: 'ti ti-settings',
    moduleCategory: 'hrm',
    sortOrder: 10,
    availableActions: ['read', 'write']
  },
  {
    name: 'hrm.attendance.admin',
    displayName: 'Attendance (Admin)',
    route: '/attendance-admin',
    icon: 'ti ti-calendar-check',
    moduleCategory: 'hrm',
    sortOrder: 11,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.attendance.employee',
    displayName: 'Attendance (Employee)',
    route: '/attendance-employee',
    icon: 'ti ti-calendar-check',
    moduleCategory: 'hrm',
    sortOrder: 12,
    availableActions: ['read', 'create']
  },
  {
    name: 'hrm.timesheet',
    displayName: 'Timesheet',
    route: '/timesheets',
    icon: 'ti ti-clock',
    moduleCategory: 'hrm',
    sortOrder: 13,
    availableActions: ['read', 'create', 'write', 'delete', 'approve', 'import', 'export']
  },
  {
    name: 'hrm.shift-schedule',
    displayName: 'Shift & Schedule',
    route: '/schedule-timing',
    icon: 'ti ti-calendar-time',
    moduleCategory: 'hrm',
    sortOrder: 14,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.shift-management',
    displayName: 'Shift Management',
    route: '/shifts-management',
    icon: 'ti ti-clock-hour-4',
    moduleCategory: 'hrm',
    sortOrder: 15,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.shift-batches',
    displayName: 'Shift Batches',
    route: '/batches-management',
    icon: 'ti ti-stack',
    moduleCategory: 'hrm',
    sortOrder: 16,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.overtime',
    displayName: 'Overtime',
    route: '/overtime',
    icon: 'ti ti-clock-hour-12',
    moduleCategory: 'hrm',
    sortOrder: 17,
    availableActions: ['read', 'create', 'write', 'delete', 'approve', 'import', 'export']
  },

  // ============================================
  // VI. HRM - PERFORMANCE
  // ============================================
  {
    name: 'hrm.performance.indicator',
    displayName: 'Performance Indicator',
    route: '/performance/performance-indicator',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'hrm',
    sortOrder: 18,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.performance.review',
    displayName: 'Performance Review',
    route: '/performance/performance-review',
    icon: 'ti ti-star',
    moduleCategory: 'hrm',
    sortOrder: 19,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.performance.appraisal',
    displayName: 'Performance Appraisal',
    route: '/performance/performance-appraisal',
    icon: 'ti ti-award',
    moduleCategory: 'hrm',
    sortOrder: 20,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.performance.goals',
    displayName: 'Goal List',
    route: '/performance/goal-tracking',
    icon: 'ti ti-target',
    moduleCategory: 'hrm',
    sortOrder: 21,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.performance.goal-types',
    displayName: 'Goal Type',
    route: '/performance/goal-type',
    icon: 'ti ti-flag',
    moduleCategory: 'hrm',
    sortOrder: 22,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },

  // ============================================
  // VII. HRM - TRAINING
  // ============================================
  {
    name: 'hrm.training.list',
    displayName: 'Training List',
    route: '/training/training-list',
    icon: 'ti ti-presentation',
    moduleCategory: 'hrm',
    sortOrder: 23,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.training.trainers',
    displayName: 'Trainers',
    route: '/training/trainers',
    icon: 'ti ti-user-star',
    moduleCategory: 'hrm',
    sortOrder: 24,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.training.types',
    displayName: 'Training Type',
    route: '/training/training-type',
    icon: 'ti ti-tag',
    moduleCategory: 'hrm',
    sortOrder: 25,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },

  // ============================================
  // VIII. HRM - OTHER
  // ============================================
  {
    name: 'hrm.promotions',
    displayName: 'Promotions',
    route: '/promotions',
    icon: 'ti ti-rocket',
    moduleCategory: 'hrm',
    sortOrder: 26,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.resignation',
    displayName: 'Resignation',
    route: '/resignation',
    icon: 'ti ti-logout',
    moduleCategory: 'hrm',
    sortOrder: 27,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.termination',
    displayName: 'Termination',
    route: '/termination',
    icon: 'ti ti-user-x',
    moduleCategory: 'hrm',
    sortOrder: 28,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // IX. RECRUITMENT
  // ============================================
  {
    name: 'recruitment.jobs',
    displayName: 'Jobs',
    route: '/jobs',
    icon: 'ti ti-briefcase',
    moduleCategory: 'recruitment',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'recruitment.candidates',
    displayName: 'Candidates',
    route: '/candidates',
    icon: 'ti ti-users',
    moduleCategory: 'recruitment',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'recruitment.referrals',
    displayName: 'Referrals',
    route: '/referrals',
    icon: 'ti ti-user-plus',
    moduleCategory: 'recruitment',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },

  // ============================================
  // X. PROJECTS
  // ============================================
  {
    name: 'projects.clients',
    displayName: 'Clients',
    route: '/clients-grid',
    icon: 'ti ti-building',
    moduleCategory: 'projects',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'projects.projects',
    displayName: 'Projects',
    route: '/projects-grid',
    icon: 'ti ti-folder',
    moduleCategory: 'projects',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'projects.tasks',
    displayName: 'Task',
    route: '/tasks',
    icon: 'ti ti-checklist',
    moduleCategory: 'projects',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'projects.taskboard',
    displayName: 'Task Board',
    route: '/task-board',
    icon: 'ti ti-columns',
    moduleCategory: 'projects',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // XI. CRM
  // ============================================
  {
    name: 'crm.contacts',
    displayName: 'Contacts',
    route: '/contacts',
    icon: 'ti ti-address-book',
    moduleCategory: 'crm',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'crm.companies',
    displayName: 'Companies',
    route: '/companies',
    icon: 'ti ti-building',
    moduleCategory: 'crm',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'crm.deals',
    displayName: 'Deals',
    route: '/deals',
    icon: 'ti ti-handshake',
    moduleCategory: 'crm',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'crm.leads',
    displayName: 'Leads',
    route: '/leads',
    icon: 'ti ti-activity-heartbeat',
    moduleCategory: 'crm',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'crm.pipeline',
    displayName: 'Pipeline',
    route: '/pipeline',
    icon: 'ti ti-chart-dots',
    moduleCategory: 'crm',
    sortOrder: 5,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'crm.analytics',
    displayName: 'Analytics',
    route: '/analytics',
    icon: 'ti ti-chart-dots',
    moduleCategory: 'crm',
    sortOrder: 6,
    availableActions: ['read']
  },
  {
    name: 'crm.activities',
    displayName: 'Activities',
    route: '/activities',
    icon: 'ti ti-activity',
    moduleCategory: 'crm',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // XII. APPLICATIONS
  // ============================================
  {
    name: 'applications.chat',
    displayName: 'Chat',
    route: '/application/chat',
    icon: 'ti ti-message',
    moduleCategory: 'applications',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.voice-call',
    displayName: 'Voice Call',
    route: '/application/voice-call',
    icon: 'ti ti-phone-call',
    moduleCategory: 'applications',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write']
  },
  {
    name: 'applications.video-call',
    displayName: 'Video Call',
    route: '/application/video-call',
    icon: 'ti ti-video',
    moduleCategory: 'applications',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write']
  },
  {
    name: 'applications.outgoing-call',
    displayName: 'Outgoing Call',
    route: '/application/outgoing-call',
    icon: 'ti ti-phone-outgoing',
    moduleCategory: 'applications',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write']
  },
  {
    name: 'applications.incoming-call',
    displayName: 'Incoming Call',
    route: '/application/incoming-call',
    icon: 'ti ti-phone-incoming',
    moduleCategory: 'applications',
    sortOrder: 5,
    availableActions: ['read']
  },
  {
    name: 'applications.call-history',
    displayName: 'Call History',
    route: '/application/call-history',
    icon: 'ti ti-history',
    moduleCategory: 'applications',
    sortOrder: 6,
    availableActions: ['read', 'delete']
  },
  {
    name: 'applications.calendar',
    displayName: 'Calendar',
    route: '/calendar',
    icon: 'ti ti-calendar',
    moduleCategory: 'applications',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.email',
    displayName: 'Email',
    route: '/application/email',
    icon: 'ti ti-mail',
    moduleCategory: 'applications',
    sortOrder: 8,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.todo',
    displayName: 'To Do',
    route: '/application/todo',
    icon: 'ti ti-check',
    moduleCategory: 'applications',
    sortOrder: 9,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.notes',
    displayName: 'Notes',
    route: '/notes',
    icon: 'ti ti-note',
    moduleCategory: 'applications',
    sortOrder: 10,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.social-feed',
    displayName: 'Social Feed',
    route: '/application/social-feed',
    icon: 'ti ti-brand-facebook',
    moduleCategory: 'applications',
    sortOrder: 11,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.file-manager',
    displayName: 'File Manager',
    route: '/application/file-manager',
    icon: 'ti ti-folder',
    moduleCategory: 'applications',
    sortOrder: 12,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.kanban',
    displayName: 'Kanban',
    route: '/application/kanban-view',
    icon: 'ti ti-columns',
    moduleCategory: 'applications',
    sortOrder: 13,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.invoices',
    displayName: 'Invoices',
    route: '/application/invoices',
    icon: 'ti ti-receipt',
    moduleCategory: 'applications',
    sortOrder: 14,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },

  // ============================================
  // XIII. FINANCE
  // ============================================
  {
    name: 'finance.sales.estimates',
    displayName: 'Estimates',
    route: '/finance/sales/estimates',
    icon: 'ti ti-file-invoice',
    moduleCategory: 'finance',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.sales.invoices',
    displayName: 'Invoices',
    route: '/finance/sales/invoices',
    icon: 'ti ti-invoice',
    moduleCategory: 'finance',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.sales.payments',
    displayName: 'Payments',
    route: '/finance/sales/payments',
    icon: 'ti ti-credit-card',
    moduleCategory: 'finance',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.sales.expenses',
    displayName: 'Expenses',
    route: '/finance/sales/expenses',
    icon: 'ti ti-receipt',
    moduleCategory: 'finance',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.sales.provident-fund',
    displayName: 'Provident Fund',
    route: '/finance/sales/provident-fund',
    icon: 'ti ti-pig-money',
    moduleCategory: 'finance',
    sortOrder: 5,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'finance.sales.taxes',
    displayName: 'Taxes',
    route: '/finance/sales/taxes',
    icon: 'ti ti-percentage',
    moduleCategory: 'finance',
    sortOrder: 6,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'finance.accounting.categories',
    displayName: 'Categories',
    route: '/finance/accounting/categories',
    icon: 'ti ti-category',
    moduleCategory: 'finance',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'finance.accounting.budgets',
    displayName: 'Budgets',
    route: '/finance/accounting/budgets',
    icon: 'ti ti-chart-pie',
    moduleCategory: 'finance',
    sortOrder: 8,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.accounting.budget-expenses',
    displayName: 'Budget Expenses',
    route: '/finance/accounting/budget-expenses',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'finance',
    sortOrder: 9,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.accounting.budget-revenues',
    displayName: 'Budget Revenues',
    route: '/finance/accounting/budget-revenues',
    icon: 'ti ti-chart-line',
    moduleCategory: 'finance',
    sortOrder: 10,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.payroll.employee-salary',
    displayName: 'Employee Salary',
    route: '/finance/payroll/employee-salary',
    icon: 'ti ti-money',
    moduleCategory: 'finance',
    sortOrder: 11,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.payroll.payslip',
    displayName: 'Payslip',
    route: '/finance/payroll/payslip',
    icon: 'ti ti-receipt',
    moduleCategory: 'finance',
    sortOrder: 12,
    availableActions: ['read', 'create', 'delete']
  },
  {
    name: 'finance.payroll.payroll-items',
    displayName: 'Payroll Items',
    route: '/finance/payroll/payroll-items',
    icon: 'ti ti-list',
    moduleCategory: 'finance',
    sortOrder: 13,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // XIV. ADMINISTRATION
  // ============================================
  {
    name: 'administration.assets.assets',
    displayName: 'Assets',
    route: '/administration/assets/assets',
    icon: 'ti ti-box',
    moduleCategory: 'administration',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'administration.assets.categories',
    displayName: 'Asset Categories',
    route: '/administration/assets/asset-categories',
    icon: 'ti ti-category',
    moduleCategory: 'administration',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'administration.help.knowledge-base',
    displayName: 'Knowledge Base',
    route: '/administration/help/knowledge-base',
    icon: 'ti ti-book',
    moduleCategory: 'administration',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'administration.help.activities',
    displayName: 'Activities',
    route: '/administration/help/activities',
    icon: 'ti ti-activity',
    moduleCategory: 'administration',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'administration.user-management.users',
    displayName: 'Users',
    route: '/administration/user-management/users',
    icon: 'ti ti-users',
    moduleCategory: 'administration',
    sortOrder: 5,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'administration.user-management.roles',
    displayName: 'Roles & Permissions',
    route: '/administration/user-management/roles-permissions',
    icon: 'ti ti-shield',
    moduleCategory: 'administration',
    sortOrder: 6,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  // Reports...
  {
    name: 'administration.reports.expense',
    displayName: 'Expense Report',
    route: '/administration/reports/expense-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 7,
    availableActions: ['read', 'export']
  },
  {
    name: 'administration.reports.invoice',
    displayName: 'Invoice Report',
    route: '/administration/reports/invoice-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 8,
    availableActions: ['read', 'export']
  },
  {
    name: 'administration.reports.payment',
    displayName: 'Payment Report',
    route: '/administration/reports/payment-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 9,
    availableActions: ['read', 'export']
  },
  {
    name: 'administration.reports.project',
    displayName: 'Project Report',
    route: '/administration/reports/project-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 10,
    availableActions: ['read', 'export']
  },
  {
    name: 'administration.reports.task',
    displayName: 'Task Report',
    route: '/administration/reports/task-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 11,
    availableActions: ['read', 'export']
  },
  {
    name: 'administration.reports.user',
    displayName: 'User Report',
    route: '/administration/reports/user-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 12,
    availableActions: ['read', 'export']
  },
  {
    name: 'administration.reports.employee',
    displayName: 'Employee Report',
    route: '/administration/reports/employee-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 13,
    availableActions: ['read', 'export']
  },
  {
    name: 'administration.reports.payslip',
    displayName: 'Payslip Report',
    route: '/administration/reports/payslip-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 14,
    availableActions: ['read', 'export']
  },
  {
    name: 'administration.reports.attendance',
    displayName: 'Attendance Report',
    route: '/administration/reports/attendance-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 15,
    availableActions: ['read', 'export']
  },
  {
    name: 'administration.reports.leave',
    displayName: 'Leave Report',
    route: '/administration/reports/leave-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 16,
    availableActions: ['read', 'export']
  },
  {
    name: 'administration.reports.daily',
    displayName: 'Daily Report',
    route: '/administration/reports/daily-report',
    icon: 'ti ti-chart-bar',
    moduleCategory: 'administration',
    sortOrder: 17,
    availableActions: ['read', 'export']
  },
  // Settings...
  {
    name: 'administration.settings.general',
    displayName: 'General Settings',
    route: '/administration/settings/general-settings',
    icon: 'ti ti-settings',
    moduleCategory: 'administration',
    sortOrder: 18,
    availableActions: ['read', 'write']
  },
  {
    name: 'administration.settings.website',
    displayName: 'Website Settings',
    route: '/administration/settings/website-settings',
    icon: 'ti ti-world',
    moduleCategory: 'administration',
    sortOrder: 19,
    availableActions: ['read', 'write']
  },
  {
    name: 'administration.settings.app',
    displayName: 'App Settings',
    route: '/administration/settings/app-settings',
    icon: 'ti ti-device-mobile',
    moduleCategory: 'administration',
    sortOrder: 20,
    availableActions: ['read', 'write']
  },
  {
    name: 'administration.settings.system',
    displayName: 'System Settings',
    route: '/administration/settings/system-settings',
    icon: 'ti ti-server',
    moduleCategory: 'administration',
    sortOrder: 21,
    availableActions: ['read', 'write']
  },
  {
    name: 'administration.settings.financial',
    displayName: 'Financial Settings',
    route: '/administration/settings/financial-settings',
    icon: 'ti ti-currency',
    moduleCategory: 'administration',
    sortOrder: 22,
    availableActions: ['read', 'write']
  },
  {
    name: 'administration.settings.other',
    displayName: 'Other Settings',
    route: '/administration/settings/other-settings',
    icon: 'ti ti-settings',
    moduleCategory: 'administration',
    sortOrder: 23,
    availableActions: ['read', 'write']
  },

  // ============================================
  // XV. CONTENT
  // ============================================
  {
    name: 'content.pages',
    displayName: 'Pages',
    route: '/content/pages',
    icon: 'ti ti-file',
    moduleCategory: 'content',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.blogs.all',
    displayName: 'All Blogs',
    route: '/content/blogs/all-blogs',
    icon: 'ti ti-article',
    moduleCategory: 'content',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.blogs.categories',
    displayName: 'Categories',
    route: '/content/blogs/categories',
    icon: 'ti ti-category',
    moduleCategory: 'content',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.blogs.comments',
    displayName: 'Comments',
    route: '/content/blogs/comments',
    icon: 'ti ti-message',
    moduleCategory: 'content',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.blogs.tags',
    displayName: 'Blog Tags',
    route: '/content/blogs/blog-tags',
    icon: 'ti ti-tag',
    moduleCategory: 'content',
    sortOrder: 5,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.locations.countries',
    displayName: 'Countries',
    route: '/content/locations/countries',
    icon: 'ti ti-world',
    moduleCategory: 'content',
    sortOrder: 6,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'content.locations.states',
    displayName: 'States',
    route: '/content/locations/states',
    icon: 'ti ti-map',
    moduleCategory: 'content',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'content.locations.cities',
    displayName: 'Cities',
    route: '/content/locations/cities',
    icon: 'ti ti-building',
    moduleCategory: 'content',
    sortOrder: 8,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'content.testimonials',
    displayName: 'Testimonials',
    route: '/content/testimonials',
    icon: 'ti ti-quote',
    moduleCategory: 'content',
    sortOrder: 9,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'content.faqs',
    displayName: 'FAQs',
    route: '/content/faqs',
    icon: 'ti ti-help',
    moduleCategory: 'content',
    sortOrder: 10,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // XVI. PAGES
  // ============================================
  {
    name: 'pages.starter',
    displayName: 'Starter',
    route: '/starter',
    icon: 'ti ti-flag',
    moduleCategory: 'pages',
    sortOrder: 1,
    availableActions: ['read']
  },
  {
    name: 'pages.profile',
    displayName: 'Profile',
    route: '/profile',
    icon: 'ti ti-user',
    moduleCategory: 'pages',
    sortOrder: 2,
    availableActions: ['read', 'write']
  },
  {
    name: 'pages.gallery',
    displayName: 'Gallery',
    route: '/gallery',
    icon: 'ti ti-photo',
    moduleCategory: 'pages',
    sortOrder: 3,
    availableActions: ['read']
  },
  {
    name: 'pages.search-results',
    displayName: 'Search Results',
    route: '/search-results',
    icon: 'ti ti-search',
    moduleCategory: 'pages',
    sortOrder: 4,
    availableActions: ['read']
  },
  {
    name: 'pages.timeline',
    displayName: 'Timeline',
    route: '/timeline',
    icon: 'ti ti-timeline',
    moduleCategory: 'pages',
    sortOrder: 5,
    availableActions: ['read']
  },
  {
    name: 'pages.pricing',
    displayName: 'Pricing',
    route: '/pricing',
    icon: 'ti ti-tag',
    moduleCategory: 'pages',
    sortOrder: 6,
    availableActions: ['read']
  },
  {
    name: 'pages.coming-soon',
    displayName: 'Coming Soon',
    route: '/coming-soon',
    icon: 'ti ti-clock',
    moduleCategory: 'pages',
    sortOrder: 7,
    availableActions: ['read']
  },
  {
    name: 'pages.under-maintenance',
    displayName: 'Under Maintenance',
    route: '/under-maintenance',
    icon: 'ti ti-tools',
    moduleCategory: 'pages',
    sortOrder: 8,
    availableActions: ['read']
  },
  {
    name: 'pages.under-construction',
    displayName: 'Under Construction',
    route: '/under-construction',
    icon: 'ti ti-hammer',
    moduleCategory: 'pages',
    sortOrder: 9,
    availableActions: ['read']
  },
  {
    name: 'pages.api-keys',
    displayName: 'API Keys',
    route: '/api-keys',
    icon: 'ti ti-key',
    moduleCategory: 'pages',
    sortOrder: 10,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'pages.privacy-policy',
    displayName: 'Privacy Policy',
    route: '/privacy-policy',
    icon: 'ti ti-shield',
    moduleCategory: 'pages',
    sortOrder: 11,
    availableActions: ['read']
  },
  {
    name: 'pages.terms-conditions',
    displayName: 'Terms & Conditions',
    route: '/terms-conditions',
    icon: 'ti ti-file-text',
    moduleCategory: 'pages',
    sortOrder: 12,
    availableActions: ['read']
  },

  // ============================================
  // XVII. AUTHENTICATION
  // ============================================
  {
    name: 'auth.login',
    displayName: 'Login',
    route: '/auth/login',
    icon: 'ti ti-login',
    moduleCategory: 'auth',
    sortOrder: 1,
    availableActions: ['read']
  },
  {
    name: 'auth.register',
    displayName: 'Register',
    route: '/auth/register',
    icon: 'ti ti-user-plus',
    moduleCategory: 'auth',
    sortOrder: 2,
    availableActions: ['read']
  },
  {
    name: 'auth.forgot-password',
    displayName: 'Forgot Password',
    route: '/auth/forgot-password',
    icon: 'ti ti-key',
    moduleCategory: 'auth',
    sortOrder: 3,
    availableActions: ['read']
  },
  {
    name: 'auth.reset-password',
    displayName: 'Reset Password',
    route: '/auth/reset-password',
    icon: 'ti ti-lock',
    moduleCategory: 'auth',
    sortOrder: 4,
    availableActions: ['read']
  },
  {
    name: 'auth.email-verification',
    displayName: 'Email Verification',
    route: '/auth/email-verification',
    icon: 'ti ti-mail',
    moduleCategory: 'auth',
    sortOrder: 5,
    availableActions: ['read']
  },
  {
    name: 'auth.2-step-verification',
    displayName: '2 Step Verification',
    route: '/auth/2-step-verification',
    icon: 'ti ti-lock',
    moduleCategory: 'auth',
    sortOrder: 6,
    availableActions: ['read']
  },
  {
    name: 'auth.lock-screen',
    displayName: 'Lock Screen',
    route: '/auth/lock-screen',
    icon: 'ti ti-lock',
    moduleCategory: 'auth',
    sortOrder: 7,
    availableActions: ['read']
  },
  {
    name: 'auth.error-404',
    displayName: '404 Error',
    route: '/error-404',
    icon: 'ti ti-alert-triangle',
    moduleCategory: 'auth',
    sortOrder: 8,
    availableActions: ['read']
  },
  {
    name: 'auth.error-500',
    displayName: '500 Error',
    route: '/error-500',
    icon: 'ti ti-alert-circle',
    moduleCategory: 'auth',
    sortOrder: 9,
    availableActions: ['read']
  },

  // ============================================
  // XVIII. UI INTERFACE
  // ============================================
  {
    name: 'ui.base',
    displayName: 'Base UI',
    route: '/ui/base-ui',
    icon: 'ti ti-layout',
    moduleCategory: 'ui',
    sortOrder: 1,
    availableActions: ['read']
  },
  {
    name: 'ui.advanced',
    displayName: 'Advanced UI',
    route: '/ui/advanced-ui',
    icon: 'ti ti-components',
    moduleCategory: 'ui',
    sortOrder: 2,
    availableActions: ['read']
  },
  {
    name: 'ui.charts',
    displayName: 'Charts',
    route: '/ui/charts',
    icon: 'ti ti-chart-dots',
    moduleCategory: 'ui',
    sortOrder: 3,
    availableActions: ['read']
  },
  {
    name: 'ui.icons',
    displayName: 'Icons',
    route: '/ui/icons',
    icon: 'ti ti-icons',
    moduleCategory: 'ui',
    sortOrder: 4,
    availableActions: ['read']
  },
  {
    name: 'ui.forms',
    displayName: 'Forms',
    route: '/ui/forms',
    icon: 'ti ti-forms',
    moduleCategory: 'ui',
    sortOrder: 5,
    availableActions: ['read']
  },
  {
    name: 'ui.tables',
    displayName: 'Tables',
    route: '/ui/tables',
    icon: 'ti ti-table',
    moduleCategory: 'ui',
    sortOrder: 6,
    availableActions: ['read']
  },
  {
    name: 'ui.maps',
    displayName: 'Maps',
    route: '/ui/maps',
    icon: 'ti ti-map',
    moduleCategory: 'ui',
    sortOrder: 7,
    availableActions: ['read']
  },

  // ============================================
  // XIX. EXTRAS
  // ============================================
  {
    name: 'extras.documentation',
    displayName: 'Documentation',
    route: '/extras/documentation',
    icon: 'ti ti-book',
    moduleCategory: 'extras',
    sortOrder: 1,
    availableActions: ['read']
  },
  {
    name: 'extras.change-log',
    displayName: 'Change Log',
    route: '/extras/change-log',
    icon: 'ti ti-history',
    moduleCategory: 'extras',
    sortOrder: 2,
    availableActions: ['read']
  },
];

export default pagesSeedData;
```

### 1.3 Create Pages API Routes

**File:** `backend/routes/api/rbac/pages.js`

```javascript
/**
 * Pages API Routes
 */

import express from 'express';
import * as pageService from '../../services/rbac/page.service.js';

const router = express.Router();

// Get all pages
router.get('/', async (req, res) => {
  const result = await pageService.getAllPages(req.query);
  res.status(result.success ? 200 : 400).json(result);
});

// Get pages grouped by category
router.get('/grouped', async (req, res) => {
  const result = await pageService.getPagesGroupedByCategory();
  res.status(result.success ? 200 : 400).json(result);
});

// Get a single page
router.get('/:id', async (req, res) => {
  const result = await pageService.getPageById(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
});

// Create a new page
router.post('/', async (req, res) => {
  const result = await pageService.createPage(req.body, req.user?.id);
  res.status(result.success ? 201 : 400).json(result);
});

// Update a page
router.put('/:id', async (req, res) => {
  const result = await pageService.updatePage(req.params.id, req.body, req.user?.id);
  res.status(result.success ? 200 : 400).json(result);
});

// Delete a page
router.delete('/:id', async (req, res) => {
  const result = await pageService.deletePage(req.params.id);
  res.status(result.success ? 200 : 404).json(result);
});

// Toggle page status
router.patch('/:id/toggle-status', async (req, res) => {
  const result = await pageService.togglePageStatus(req.params.id);
  res.status(result.success ? 200 : 400).json(result);
});

export default router;
```

### 1.4 Create Pages Service

**File:** `backend/services/rbac/page.service.js`

```javascript
/**
 * Page Service
 * Handles page-related business logic
 */

import Page from '../../models/rbac/page.schema.js';

/**
 * Get all pages
 */
export async function getAllPages(filters = {}) {
  try {
    const { isActive, moduleCategory } = filters;
    const query = {};

    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (moduleCategory) query.moduleCategory = moduleCategory;

    const pages = await Page.find(query)
      .sort({ moduleCategory: 1, sortOrder: 1 })
      .lean();

    return {
      success: true,
      data: pages,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get pages grouped by category
 */
export async function getPagesGroupedByCategory() {
  try {
    const grouped = await Page.getGroupedByModule();

    return {
      success: true,
      data: grouped,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get page by ID
 */
export async function getPageById(pageId) {
  try {
    const page = await Page.findById(pageId).lean();

    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    return {
      success: true,
      data: page,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Create a new page
 */
export async function createPage(pageData, userId = null) {
  try {
    const page = new Page({
      ...pageData,
      createdBy: userId,
      updatedBy: userId,
    });
    await page.save();

    return {
      success: true,
      data: page,
      message: 'Page created successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Update a page
 */
export async function updatePage(pageId, updateData, userId = null) {
  try {
    const page = await Page.findByIdAndUpdate(
      pageId,
      {
        $set: {
          ...updateData,
          updatedBy: userId,
        },
      },
      { new: true, runValidators: true }
    );

    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    return {
      success: true,
      data: page,
      message: 'Page updated successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Delete a page
 */
export async function deletePage(pageId) {
  try {
    const page = await Page.findById(pageId);

    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    if (page.isSystem) {
      return {
        success: false,
        error: 'Cannot delete system pages',
      };
    }

    await Page.findByIdAndDelete(pageId);

    return {
      success: true,
      data: { _id: pageId },
      message: 'Page deleted successfully',
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Toggle page status
 */
export async function togglePageStatus(pageId) {
  try {
    const page = await Page.findById(pageId);

    if (!page) {
      return {
        success: false,
        error: 'Page not found',
      };
    }

    page.isActive = !page.isActive;
    await page.save();

    return {
      success: true,
      data: page,
      message: `Page ${page.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  getAllPages,
  getPagesGroupedByCategory,
  getPageById,
  createPage,
  updatePage,
  deletePage,
  togglePageStatus,
};
```

### 1.5 Create Pages Management UI

**File:** `react/src/feature-module/super-admin/pages.tsx`

```tsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { all_routes } from "../router/all_routes";
import CollapseHeader from "../../core/common/collapse-header/collapse-header";
import Footer from "../../core/common/footer";
import Table from "../../core/common/dataTable/index";

const API_BASE = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

interface Page {
  _id: string;
  name: string;
  displayName: string;
  description: string;
  route: string;
  icon: string;
  moduleCategory: string;
  sortOrder: number;
  isSystem: boolean;
  isActive: boolean;
  availableActions: string[];
}

interface GroupedPages {
  _id: string;
  pages: Page[];
  count: number;
}

const MODULE_CATEGORY_LABELS: Record<string, string> = {
  'super-admin': 'Super Admin',
  'users-permissions': 'Users & Permissions',
  'applications': 'Applications',
  'hrm': 'HRM',
  'projects': 'Projects',
  'crm': 'CRM',
  'recruitment': 'Recruitment',
  'finance': 'Finance & Accounts',
  'administration': 'Administration',
  'content': 'Content',
  'pages': 'Pages',
  'auth': 'Authentication',
  'ui': 'UI Interface',
  'extras': 'Extras',
  'dashboards': 'Dashboards',
};

const ACTION_LABELS: Record<string, string> = {
  'all': 'All',
  'read': 'Read',
  'create': 'Create',
  'write': 'Write',
  'delete': 'Delete',
  'import': 'Import',
  'export': 'Export',
  'approve': 'Approve',
  'assign': 'Assign',
};

const Pages = () => {
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<GroupedPages[]>([]);
  const [filteredPages, setFilteredPages] = useState<Page[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetchPages();
  }, []);

  useEffect(() => {
    filterPages();
  }, [pages, searchTerm, categoryFilter]);

  const fetchPages = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/pages/grouped`);
      const data = await response.json();
      if (data.success) {
        setPages(data.data);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPages = () => {
    let flatPages: Page[] = [];
    pages.forEach(group => {
      flatPages = [...flatPages, ...group.pages];
    });

    let filtered = flatPages;

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.moduleCategory === categoryFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.route.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPages(filtered);
  };

  const handleToggleStatus = async (pageId: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/rbac/pages/${pageId}/toggle-status`, {
        method: 'PATCH',
      });
      const data = await response.json();
      if (data.success) {
        await fetchPages();
      } else {
        alert(data.error || 'Failed to toggle status');
      }
    } catch (error) {
      console.error('Error toggling status:', error);
      alert('Failed to toggle status');
    }
  };

  const columns = [
    {
      title: "Page Name",
      dataIndex: "displayName",
      sorter: (a: Page, b: Page) => a.displayName.localeCompare(b.displayName),
      render: (text: string, record: Page) => (
        <div>
          <span className="fw-medium">{text}</span>
          {record.isSystem && (
            <span className="badge bg-info ms-2">System</span>
          )}
        </div>
      ),
    },
    {
      title: "Identifier",
      dataIndex: "name",
      render: (text: string) => <code className="small">{text}</code>,
    },
    {
      title: "Route",
      dataIndex: "route",
      render: (text: string) => <code className="small text-muted">{text}</code>,
    },
    {
      title: "Category",
      dataIndex: "moduleCategory",
      render: (category: string) => (
        <span className="badge bg-light text-dark">
          {MODULE_CATEGORY_LABELS[category] || category}
        </span>
      ),
    },
    {
      title: "Available Actions",
      dataIndex: "availableActions",
      render: (actions: string[]) => (
        <div className="d-flex flex-wrap gap-1">
          {actions.map(action => (
            <span key={action} className="badge bg-light text-dark" style={{ fontSize: '10px' }}>
              {ACTION_LABELS[action] || action}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "isActive",
      render: (isActive: boolean, record: Page) => (
        <div className="form-check form-switch">
          <input
            className="form-check-input"
            type="checkbox"
            checked={isActive}
            onChange={() => handleToggleStatus(record._id)}
            disabled={record.isSystem}
          />
        </div>
      ),
    },
  ];

  if (loading) {
    return <div className="page-wrapper"><div className="content"><div className="text-center p-5">Loading...</div></div></div>;
  }

  const categories = ['all', ...new Set(pages.map(p => p._id))];

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Pages</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={all_routes.adminDashboard}>
                      <i className="ti ti-smart-home" />
                    </Link>
                  </li>
                  <li className="breadcrumb-item">Super Admin</li>
                  <li className="breadcrumb-item active" aria-current="page">
                    Pages
                  </li>
                </ol>
              </nav>
            </div>
            <div className="head-icons">
              <CollapseHeader />
            </div>
          </div>

          {/* Stats */}
          <div className="row mb-3">
            <div className="col-md-3">
              <div className="card bg-primary">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <span className="text-white-50">Total Pages</span>
                      <h3 className="text-white mb-0">{filteredPages.length}</h3>
                    </div>
                    <div className="text-white">
                      <i className="ti ti-file fs-1 opacity-50"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-success">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <span className="text-white-50">Active Pages</span>
                      <h3 className="text-white mb-0">{filteredPages.filter(p => p.isActive).length}</h3>
                    </div>
                    <div className="text-white">
                      <i className="ti ti-check fs-1 opacity-50"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-info">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <span className="text-white-50">System Pages</span>
                      <h3 className="text-white mb-0">{filteredPages.filter(p => p.isSystem).length}</h3>
                    </div>
                    <div className="text-white">
                      <i className="ti ti-lock fs-1 opacity-50"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card bg-warning">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <span className="text-white-50">Categories</span>
                      <h3 className="text-white mb-0">{pages.length}</h3>
                    </div>
                    <div className="text-white">
                      <i className="ti ti-folders fs-1 opacity-50"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="card mb-3">
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search pages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {pages.filter(p => p._id).map(cat => (
                      <option key={cat._id} value={cat._id}>
                        {MODULE_CATEGORY_LABELS[cat._id] || cat._id}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Pages Table */}
          <div className="card">
            <div className="card-header">
              <h5>Pages List</h5>
            </div>
            <div className="card-body p-0">
              <Table dataSource={filteredPages} columns={columns} Selection={false} />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    </>
  );
};

export default Pages;
```

### 1.6 Update Route Configuration

**File:** `react/src/router/all_routes.ts`

Add the new pages route:

```typescript
pages: "/super-admin/pages",
```

---

**Phase 1 Complete!**

Next: [Phase 2: Roles Restructuring](#phase-2-roles-restructuring)
