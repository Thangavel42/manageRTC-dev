/**
 * Complete Pages Seed Data
 * Contains all pages for full RBAC implementation
 * Run with: node backend/seed/run-full-seed.js
 */

export const allPagesSeedData = [
  // ============================================
  // I. SUPER ADMIN (6 pages)
  // ============================================
  {
    name: 'super-admin.dashboard',
    displayName: 'Dashboard',
    description: 'Super Admin Dashboard with company statistics, revenue charts, and plan distribution',
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
    description: 'Manage all registered companies, their details, plans, and status',
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
    description: 'Manage company subscriptions, billing, and plan renewals',
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
    description: 'Manage subscription packages, pricing, and module assignments',
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
    description: 'Manage system modules, their pages, and configurations',
    route: '/super-admin/modules',
    icon: 'ti ti-apps',
    moduleCategory: 'super-admin',
    sortOrder: 5,
    isSystem: true,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'super-admin.pages',
    displayName: 'Pages',
    description: 'Manage all system pages, routes, and available actions',
    route: '/super-admin/pages',
    icon: 'ti ti-file-text',
    moduleCategory: 'super-admin',
    sortOrder: 6,
    isSystem: true,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // II. USERS & PERMISSIONS (4 pages)
  // ============================================
  {
    name: 'users-permissions.users',
    displayName: 'Users',
    description: 'Manage all users across the platform',
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
    description: 'Manage user roles and their associated permissions',
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
    description: 'Manage individual permissions',
    route: '/permission',
    icon: 'ti ti-key',
    moduleCategory: 'users-permissions',
    sortOrder: 3,
    isSystem: true,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'users-permissions.manage-users',
    displayName: 'Manage Users',
    description: 'Advanced user management',
    route: '/user-management/manage-users',
    icon: 'ti ti-user-cog',
    moduleCategory: 'users-permissions',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // III. DASHBOARDS (6 pages)
  // ============================================
  {
    name: 'dashboards.admin',
    displayName: 'Admin Dashboard',
    description: 'Main administration dashboard',
    route: '/admin-dashboard',
    icon: 'ti ti-dashboard',
    moduleCategory: 'dashboards',
    sortOrder: 1,
    isSystem: true,
    availableActions: ['read']
  },
  {
    name: 'dashboards.hr',
    displayName: 'HR Dashboard',
    description: 'Human Resources dashboard with HR metrics',
    route: '/hr-dashboard',
    icon: 'ti ti-chart-pie',
    moduleCategory: 'dashboards',
    sortOrder: 2,
    isSystem: true,
    availableActions: ['read']
  },
  {
    name: 'dashboards.employee',
    displayName: 'Employee Dashboard',
    description: 'Employee self-service dashboard',
    route: '/employee-dashboard',
    icon: 'ti ti-user',
    moduleCategory: 'dashboards',
    sortOrder: 3,
    isSystem: true,
    availableActions: ['read']
  },
  {
    name: 'dashboards.deals',
    displayName: 'Deals Dashboard',
    description: 'Sales deals dashboard',
    route: '/deals-dashboard',
    icon: 'ti ti-currency-dollar',
    moduleCategory: 'dashboards',
    sortOrder: 4,
    isSystem: true,
    availableActions: ['read']
  },
  {
    name: 'dashboards.leads',
    displayName: 'Leads Dashboard',
    description: 'Sales leads dashboard',
    route: '/leads-dashboard',
    icon: 'ti ti-chart-line',
    moduleCategory: 'dashboards',
    sortOrder: 5,
    isSystem: true,
    availableActions: ['read']
  },
  {
    name: 'dashboards.super-admin',
    displayName: 'Super Admin Dashboard',
    description: 'Super admin analytics dashboard',
    route: '/super-admin/dashboard',
    icon: 'ti ti-smart-home',
    moduleCategory: 'dashboards',
    sortOrder: 6,
    isSystem: true,
    availableActions: ['read']
  },

  // ============================================
  // IV. APPLICATIONS (12 pages)
  // ============================================
  {
    name: 'applications.chat',
    displayName: 'Chat',
    description: 'Real-time messaging and communication',
    route: '/application/chat',
    icon: 'ti ti-messages',
    moduleCategory: 'applications',
    sortOrder: 1,
    availableActions: ['read', 'write']
  },
  {
    name: 'applications.calendar',
    displayName: 'Calendar',
    description: 'Calendar and scheduling',
    route: '/calendar',
    icon: 'ti ti-calendar',
    moduleCategory: 'applications',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.email',
    displayName: 'Email',
    description: 'Email management',
    route: '/application/email',
    icon: 'ti ti-mail',
    moduleCategory: 'applications',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.todo',
    displayName: 'Todo',
    description: 'Task and todo management',
    route: '/application/todo',
    icon: 'ti ti-checkbox',
    moduleCategory: 'applications',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.todo-list',
    displayName: 'Todo List',
    description: 'Todo list view',
    route: '/application/todo-list',
    icon: 'ti ti-list-check',
    moduleCategory: 'applications',
    sortOrder: 5,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.notes',
    displayName: 'Notes',
    description: 'Notes and documentation',
    route: '/notes',
    icon: 'ti ti-note',
    moduleCategory: 'applications',
    sortOrder: 6,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.file-manager',
    displayName: 'File Manager',
    description: 'File and document management',
    route: '/application/file-manager',
    icon: 'ti ti-folder',
    moduleCategory: 'applications',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'applications.social-feed',
    displayName: 'Social Feed',
    description: 'Social media feed and activity',
    route: '/application/social-feed',
    icon: 'ti ti-social',
    moduleCategory: 'applications',
    sortOrder: 8,
    availableActions: ['read', 'write']
  },
  {
    name: 'applications.kanban',
    displayName: 'Kanban Board',
    description: 'Kanban board for task management',
    route: '/application/kanban-view',
    icon: 'ti ti-layout-columns',
    moduleCategory: 'applications',
    sortOrder: 9,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'applications.voice-call',
    displayName: 'Voice Call',
    description: 'Voice calling functionality',
    route: '/application/voice-call',
    icon: 'ti ti-phone',
    moduleCategory: 'applications',
    sortOrder: 10,
    availableActions: ['read']
  },
  {
    name: 'applications.video-call',
    displayName: 'Video Call',
    description: 'Video calling functionality',
    route: '/application/video-call',
    icon: 'ti ti-video',
    moduleCategory: 'applications',
    sortOrder: 11,
    availableActions: ['read']
  },
  {
    name: 'applications.call-history',
    displayName: 'Call History',
    description: 'Call history and logs',
    route: '/application/call-history',
    icon: 'ti ti-phone-calling',
    moduleCategory: 'applications',
    sortOrder: 12,
    availableActions: ['read', 'delete']
  },

  // ============================================
  // V. HRM (20 pages)
  // ============================================
  {
    name: 'hrm.employees',
    displayName: 'Employees',
    description: 'Employee management and directory',
    route: '/employees',
    icon: 'ti ti-users',
    moduleCategory: 'hrm',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.employees-grid',
    displayName: 'Employees Grid',
    description: 'Employee grid view',
    route: '/employees-grid',
    icon: 'ti ti-layout-grid',
    moduleCategory: 'hrm',
    sortOrder: 2,
    availableActions: ['read']
  },
  {
    name: 'hrm.departments',
    displayName: 'Departments',
    description: 'Department structure and management',
    route: '/departments',
    icon: 'ti ti-building-community',
    moduleCategory: 'hrm',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.designations',
    displayName: 'Designations',
    description: 'Job designations and titles',
    route: '/designations',
    icon: 'ti ti-badge',
    moduleCategory: 'hrm',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.policy',
    displayName: 'Company Policy',
    description: 'Company policies and documents',
    route: '/policy',
    icon: 'ti ti-file-text',
    moduleCategory: 'hrm',
    sortOrder: 5,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.holidays',
    displayName: 'Holidays',
    description: 'Holiday calendar management',
    route: '/hrm/holidays',
    icon: 'ti ti-calendar-event',
    moduleCategory: 'hrm',
    sortOrder: 6,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.leaves',
    displayName: 'Leaves Admin',
    description: 'Leave management and requests',
    route: '/leaves',
    icon: 'ti ti-calendar-off',
    moduleCategory: 'hrm',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.leaves-employee',
    displayName: 'Employee Leaves',
    description: 'Employee leave portal',
    route: '/leaves-employee',
    icon: 'ti ti-calendar-user',
    moduleCategory: 'hrm',
    sortOrder: 8,
    availableActions: ['read', 'create']
  },
  {
    name: 'hrm.leave-settings',
    displayName: 'Leave Settings',
    description: 'Leave types and configuration',
    route: '/leave-settings',
    icon: 'ti ti-settings',
    moduleCategory: 'hrm',
    sortOrder: 9,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.attendance',
    displayName: 'Attendance Admin',
    description: 'Attendance tracking and management',
    route: '/attendance-admin',
    icon: 'ti ti-clock',
    moduleCategory: 'hrm',
    sortOrder: 10,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'hrm.attendance-employee',
    displayName: 'Employee Attendance',
    description: 'Employee attendance portal',
    route: '/attendance-employee',
    icon: 'ti ti-clock-user',
    moduleCategory: 'hrm',
    sortOrder: 11,
    availableActions: ['read']
  },
  {
    name: 'hrm.timesheets',
    displayName: 'Timesheets',
    description: 'Timesheet management',
    route: '/timesheets',
    icon: 'ti ti-time-duration',
    moduleCategory: 'hrm',
    sortOrder: 12,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.shifts',
    displayName: 'Shifts Management',
    description: 'Work shift scheduling',
    route: '/shifts-management',
    icon: 'ti ti-clock-edit',
    moduleCategory: 'hrm',
    sortOrder: 13,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.schedule',
    displayName: 'Schedule Timing',
    description: 'Schedule and timing management',
    route: '/schedule-timing',
    icon: 'ti ti-calendar-time',
    moduleCategory: 'hrm',
    sortOrder: 14,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.batches',
    displayName: 'Batches Management',
    description: 'Employee batch management',
    route: '/batches-management',
    icon: 'ti ti-box-multiple',
    moduleCategory: 'hrm',
    sortOrder: 15,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.overtime',
    displayName: 'Overtime',
    description: 'Overtime tracking and management',
    route: '/overtime',
    icon: 'ti ti-clock-plus',
    moduleCategory: 'hrm',
    sortOrder: 16,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.promotion',
    displayName: 'Promotions',
    description: 'Employee promotions tracking',
    route: '/promotion',
    icon: 'ti ti-arrow-up-circle',
    moduleCategory: 'hrm',
    sortOrder: 17,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'hrm.resignation',
    displayName: 'Resignations',
    description: 'Resignation management',
    route: '/resignation',
    icon: 'ti ti-door-exit',
    moduleCategory: 'hrm',
    sortOrder: 18,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'hrm.termination',
    displayName: 'Terminations',
    description: 'Employee termination management',
    route: '/termination',
    icon: 'ti ti-user-minus',
    moduleCategory: 'hrm',
    sortOrder: 19,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // VI. PERFORMANCE & TRAINING (7 pages)
  // ============================================
  {
    name: 'performance.indicator',
    displayName: 'Performance Indicator',
    description: 'Performance indicators management',
    route: '/performance/performance-indicator',
    icon: 'ti ti-chart-arrows-vertical',
    moduleCategory: 'hrm',
    sortOrder: 20,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'performance.review',
    displayName: 'Performance Review',
    description: 'Performance reviews management',
    route: '/performance/performance-review',
    icon: 'ti ti-star',
    moduleCategory: 'hrm',
    sortOrder: 21,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'performance.appraisal',
    displayName: 'Performance Appraisal',
    description: 'Performance appraisals management',
    route: '/preformance/performance-appraisal',
    icon: 'ti ti-trophy',
    moduleCategory: 'hrm',
    sortOrder: 22,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'performance.goals',
    displayName: 'Goal Tracking',
    description: 'Goal tracking management',
    route: '/performance/goal-tracking',
    icon: 'ti ti-target',
    moduleCategory: 'hrm',
    sortOrder: 23,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'performance.goal-type',
    displayName: 'Goal Type',
    description: 'Goal type management',
    route: '/performance/goal-type',
    icon: 'ti ti-target-arrow',
    moduleCategory: 'hrm',
    sortOrder: 24,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'training.list',
    displayName: 'Training List',
    description: 'Training management',
    route: '/training/training-list',
    icon: 'ti ti-school',
    moduleCategory: 'hrm',
    sortOrder: 25,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'training.trainers',
    displayName: 'Trainers',
    description: 'Trainer management',
    route: '/training/trainers',
    icon: 'ti ti-user-cog',
    moduleCategory: 'hrm',
    sortOrder: 26,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'training.type',
    displayName: 'Training Type',
    description: 'Training type management',
    route: '/training/training-type',
    icon: 'ti ti-category',
    moduleCategory: 'hrm',
    sortOrder: 27,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // VII. CRM (17 pages)
  // ============================================
  {
    name: 'crm.clients',
    displayName: 'Clients',
    description: 'Client management',
    route: '/clients',
    icon: 'ti ti-user-heart',
    moduleCategory: 'crm',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'crm.clients-grid',
    displayName: 'Clients Grid',
    description: 'Client grid view',
    route: '/clients-grid',
    icon: 'ti ti-layout-grid',
    moduleCategory: 'crm',
    sortOrder: 2,
    availableActions: ['read']
  },
  {
    name: 'crm.contacts',
    displayName: 'Contacts',
    description: 'Contact management',
    route: '/contact-list',
    icon: 'ti ti-address-book',
    moduleCategory: 'crm',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'crm.contacts-grid',
    displayName: 'Contacts Grid',
    description: 'Contact grid view',
    route: '/contact-grid',
    icon: 'ti ti-layout-grid',
    moduleCategory: 'crm',
    sortOrder: 4,
    availableActions: ['read']
  },
  {
    name: 'crm.companies',
    displayName: 'Companies',
    description: 'CRM company management',
    route: '/companies-list',
    icon: 'ti ti-building',
    moduleCategory: 'crm',
    sortOrder: 5,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'crm.companies-grid',
    displayName: 'Companies Grid',
    description: 'Company grid view',
    route: '/companies-grid',
    icon: 'ti ti-layout-grid',
    moduleCategory: 'crm',
    sortOrder: 6,
    availableActions: ['read']
  },
  {
    name: 'crm.leads',
    displayName: 'Leads',
    description: 'Lead management and tracking',
    route: '/leads-list',
    icon: 'ti ti-target',
    moduleCategory: 'crm',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export', 'assign']
  },
  {
    name: 'crm.leads-grid',
    displayName: 'Leads Grid',
    description: 'Lead grid view',
    route: '/leads-grid',
    icon: 'ti ti-layout-grid',
    moduleCategory: 'crm',
    sortOrder: 8,
    availableActions: ['read']
  },
  {
    name: 'crm.deals',
    displayName: 'Deals',
    description: 'Deal management and tracking',
    route: '/deals-list',
    icon: 'ti ti-handshake',
    moduleCategory: 'crm',
    sortOrder: 9,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'crm.deals-grid',
    displayName: 'Deals Grid',
    description: 'Deal grid view',
    route: '/deals-grid',
    icon: 'ti ti-layout-grid',
    moduleCategory: 'crm',
    sortOrder: 10,
    availableActions: ['read']
  },
  {
    name: 'crm.pipeline',
    displayName: 'Pipeline',
    description: 'Sales pipeline management',
    route: '/pipeline',
    icon: 'ti ti-timeline',
    moduleCategory: 'crm',
    sortOrder: 11,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'crm.analytics',
    displayName: 'CRM Analytics',
    description: 'CRM analytics and reports',
    route: '/analytics',
    icon: 'ti ti-chart-dots',
    moduleCategory: 'crm',
    sortOrder: 12,
    availableActions: ['read', 'export']
  },
  {
    name: 'crm.activity',
    displayName: 'CRM Activity',
    description: 'CRM activity tracking',
    route: '/activity',
    icon: 'ti ti-activity',
    moduleCategory: 'crm',
    sortOrder: 13,
    availableActions: ['read']
  },

  // ============================================
  // VIII. PROJECTS (5 pages)
  // ============================================
  {
    name: 'projects.list',
    displayName: 'Projects',
    description: 'Project management',
    route: '/projects',
    icon: 'ti ti-folder',
    moduleCategory: 'projects',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'projects.grid',
    displayName: 'Projects Grid',
    description: 'Project grid view',
    route: '/projects-grid',
    icon: 'ti ti-layout-grid',
    moduleCategory: 'projects',
    sortOrder: 2,
    availableActions: ['read']
  },
  {
    name: 'projects.tasks',
    displayName: 'Tasks',
    description: 'Task management',
    route: '/tasks',
    icon: 'ti ti-checklist',
    moduleCategory: 'projects',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete', 'assign']
  },
  {
    name: 'projects.task-board',
    displayName: 'Task Board',
    description: 'Kanban task board',
    route: '/task-board',
    icon: 'ti ti-layout-columns',
    moduleCategory: 'projects',
    sortOrder: 4,
    availableActions: ['read', 'write']
  },

  // ============================================
  // IX. RECRUITMENT (7 pages)
  // ============================================
  {
    name: 'recruitment.jobs',
    displayName: 'Jobs',
    description: 'Job posting management',
    route: '/job-list',
    icon: 'ti ti-briefcase',
    moduleCategory: 'recruitment',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'recruitment.jobs-grid',
    displayName: 'Jobs Grid',
    description: 'Job grid view',
    route: '/job-grid',
    icon: 'ti ti-layout-grid',
    moduleCategory: 'recruitment',
    sortOrder: 2,
    availableActions: ['read']
  },
  {
    name: 'recruitment.candidates',
    displayName: 'Candidates',
    description: 'Candidate management',
    route: '/candidates',
    icon: 'ti ti-user-search',
    moduleCategory: 'recruitment',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'recruitment.candidates-grid',
    displayName: 'Candidates Grid',
    description: 'Candidate grid view',
    route: '/candidates-grid',
    icon: 'ti ti-layout-grid',
    moduleCategory: 'recruitment',
    sortOrder: 4,
    availableActions: ['read']
  },
  {
    name: 'recruitment.candidates-kanban',
    displayName: 'Candidates Kanban',
    description: 'Candidate kanban view',
    route: '/candidates-kanban',
    icon: 'ti ti-layout-columns',
    moduleCategory: 'recruitment',
    sortOrder: 5,
    availableActions: ['read', 'write']
  },
  {
    name: 'recruitment.referrals',
    displayName: 'Referrals',
    description: 'Employee referrals',
    route: '/refferals',
    icon: 'ti ti-users-group',
    moduleCategory: 'recruitment',
    sortOrder: 6,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // X. FINANCE (16 pages)
  // ============================================
  {
    name: 'finance.estimates',
    displayName: 'Estimates',
    description: 'Estimate management',
    route: '/estimates',
    icon: 'ti ti-file-analytics',
    moduleCategory: 'finance',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.invoices',
    displayName: 'Invoices',
    description: 'Invoice management',
    route: '/invoices',
    icon: 'ti ti-file-invoice',
    moduleCategory: 'finance',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export', 'approve']
  },
  {
    name: 'finance.invoices-add',
    displayName: 'Add Invoice',
    description: 'Create new invoice',
    route: '/add-invoices',
    icon: 'ti ti-plus',
    moduleCategory: 'finance',
    sortOrder: 3,
    availableActions: ['create']
  },
  {
    name: 'finance.invoices-edit',
    displayName: 'Edit Invoice',
    description: 'Edit invoice',
    route: '/edit-invoices',
    icon: 'ti ti-edit',
    moduleCategory: 'finance',
    sortOrder: 4,
    availableActions: ['write']
  },
  {
    name: 'finance.payments',
    displayName: 'Payments',
    description: 'Payment management',
    route: '/payments',
    icon: 'ti ti-credit-card-pay',
    moduleCategory: 'finance',
    sortOrder: 5,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'finance.expenses',
    displayName: 'Expenses',
    description: 'Expense management',
    route: '/expenses',
    icon: 'ti ti-receipt',
    moduleCategory: 'finance',
    sortOrder: 6,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export', 'approve']
  },
  {
    name: 'finance.taxes',
    displayName: 'Taxes',
    description: 'Tax management',
    route: '/taxes',
    icon: 'ti ti-receipt-tax',
    moduleCategory: 'finance',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'finance.provident-fund',
    displayName: 'Provident Fund',
    description: 'Provident fund management',
    route: '/provident-fund',
    icon: 'ti ti-pig-money',
    moduleCategory: 'finance',
    sortOrder: 8,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'finance.employee-salary',
    displayName: 'Employee Salary',
    description: 'Employee salary management',
    route: '/employee-salary',
    icon: 'ti ti-currency-dollar',
    moduleCategory: 'finance',
    sortOrder: 9,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'finance.payslip',
    displayName: 'Payslip',
    description: 'Payslip management',
    route: '/payslip',
    icon: 'ti ti-receipt-2',
    moduleCategory: 'finance',
    sortOrder: 10,
    availableActions: ['read', 'create', 'write', 'export']
  },
  {
    name: 'finance.payroll',
    displayName: 'Payroll',
    description: 'Payroll management',
    route: '/payroll',
    icon: 'ti ti-cash',
    moduleCategory: 'finance',
    sortOrder: 11,
    availableActions: ['read', 'create', 'write', 'delete', 'approve']
  },
  {
    name: 'finance.payroll-overtime',
    displayName: 'Payroll Overtime',
    description: 'Payroll overtime management',
    route: '/payroll-overtime',
    icon: 'ti ti-clock-plus',
    moduleCategory: 'finance',
    sortOrder: 12,
    availableActions: ['read', 'write']
  },
  {
    name: 'finance.payroll-deduction',
    displayName: 'Payroll Deduction',
    description: 'Payroll deduction management',
    route: '/payroll-deduction',
    icon: 'ti ti-minus',
    moduleCategory: 'finance',
    sortOrder: 13,
    availableActions: ['read', 'write']
  },

  // ============================================
  // XI. MEMBERSHIP (3 pages)
  // ============================================
  {
    name: 'membership.plans',
    displayName: 'Membership Plans',
    description: 'Membership plan management',
    route: '/membership-plans',
    icon: 'ti ti-crown',
    moduleCategory: 'finance',
    sortOrder: 14,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'membership.addons',
    displayName: 'Membership Addons',
    description: 'Membership addon management',
    route: '/membership-addons',
    icon: 'ti ti-plus',
    moduleCategory: 'finance',
    sortOrder: 15,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'membership.transactions',
    displayName: 'Membership Transactions',
    description: 'Membership transaction history',
    route: '/membership-transactions',
    icon: 'ti ti-receipt-refund',
    moduleCategory: 'finance',
    sortOrder: 16,
    availableActions: ['read', 'export']
  },

  // ============================================
  // XII. REPORTS (11 pages)
  // ============================================
  {
    name: 'reports.expenses',
    displayName: 'Expenses Report',
    description: 'Expense reports and analytics',
    route: '/expenses-report',
    icon: 'ti ti-report',
    moduleCategory: 'reports',
    sortOrder: 1,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.invoice',
    displayName: 'Invoice Report',
    description: 'Invoice reports and analytics',
    route: '/invoice-report',
    icon: 'ti ti-report-analytics',
    moduleCategory: 'reports',
    sortOrder: 2,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.payment',
    displayName: 'Payment Report',
    description: 'Payment reports and analytics',
    route: '/payment-report',
    icon: 'ti ti-report-money',
    moduleCategory: 'reports',
    sortOrder: 3,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.project',
    displayName: 'Project Report',
    description: 'Project reports and analytics',
    route: '/project-report',
    icon: 'ti ti-folder-search',
    moduleCategory: 'reports',
    sortOrder: 4,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.task',
    displayName: 'Task Report',
    description: 'Task reports and analytics',
    route: '/task-report',
    icon: 'ti ti-checkup-list',
    moduleCategory: 'reports',
    sortOrder: 5,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.user',
    displayName: 'User Report',
    description: 'User reports and analytics',
    route: '/user-report',
    icon: 'ti ti-user-search',
    moduleCategory: 'reports',
    sortOrder: 6,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.employee',
    displayName: 'Employee Report',
    description: 'Employee reports and analytics',
    route: '/employee-report',
    icon: 'ti ti-users-group',
    moduleCategory: 'reports',
    sortOrder: 7,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.payslip',
    displayName: 'Payslip Report',
    description: 'Payslip reports and analytics',
    route: '/payslip-report',
    icon: 'ti ti-file-dollar',
    moduleCategory: 'reports',
    sortOrder: 8,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.attendance',
    displayName: 'Attendance Report',
    description: 'Attendance reports and analytics',
    route: '/attendance-report',
    icon: 'ti ti-clock-check',
    moduleCategory: 'reports',
    sortOrder: 9,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.leave',
    displayName: 'Leave Report',
    description: 'Leave reports and analytics',
    route: '/leave-report',
    icon: 'ti ti-calendar-x',
    moduleCategory: 'reports',
    sortOrder: 10,
    availableActions: ['read', 'export']
  },
  {
    name: 'reports.daily',
    displayName: 'Daily Report',
    description: 'Daily reports and analytics',
    route: '/daily-report',
    icon: 'ti ti-calendar-stats',
    moduleCategory: 'reports',
    sortOrder: 11,
    availableActions: ['read', 'export']
  },

  // ============================================
  // XIII. ADMINISTRATION (8 pages)
  // ============================================
  {
    name: 'administration.knowledgebase',
    displayName: 'Knowledge Base',
    description: 'Knowledge base management',
    route: '/knowledgebase',
    icon: 'ti ti-book',
    moduleCategory: 'administration',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'administration.activity',
    displayName: 'Activity Log',
    description: 'System activity logs',
    route: '/activity',
    icon: 'ti ti-activity-heartbeat',
    moduleCategory: 'administration',
    sortOrder: 2,
    availableActions: ['read', 'delete']
  },
  {
    name: 'administration.assets',
    displayName: 'Assets',
    description: 'Asset management',
    route: '/assets',
    icon: 'ti ti-assets',
    moduleCategory: 'administration',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'administration.asset-categories',
    displayName: 'Asset Categories',
    description: 'Asset category management',
    route: '/asset-categories',
    icon: 'ti ti-category',
    moduleCategory: 'administration',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // XIV. SUPPORT (5 pages)
  // ============================================
  {
    name: 'support.contact-messages',
    displayName: 'Contact Messages',
    description: 'Contact form submissions',
    route: '/support/contact-messages',
    icon: 'ti ti-mail',
    moduleCategory: 'administration',
    sortOrder: 5,
    availableActions: ['read', 'delete']
  },
  {
    name: 'support.tickets',
    displayName: 'Support Tickets',
    description: 'Support ticket management',
    route: '/tickets/ticket-list',
    icon: 'ti ti-ticket',
    moduleCategory: 'administration',
    sortOrder: 6,
    availableActions: ['read', 'create', 'write', 'delete', 'assign']
  },
  {
    name: 'support.tickets-grid',
    displayName: 'Tickets Grid',
    description: 'Support ticket grid view',
    route: '/tickets/ticket-grid',
    icon: 'ti ti-layout-grid',
    moduleCategory: 'administration',
    sortOrder: 7,
    availableActions: ['read']
  },

  // ============================================
  // XV. CONTENT (10 pages)
  // ============================================
  {
    name: 'content.pages',
    displayName: 'Content Pages',
    description: 'CMS page management',
    route: '/content/pages',
    icon: 'ti ti-file-text',
    moduleCategory: 'content',
    sortOrder: 1,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.countries',
    displayName: 'Countries',
    description: 'Country management',
    route: '/countries',
    icon: 'ti ti-world',
    moduleCategory: 'content',
    sortOrder: 2,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'content.states',
    displayName: 'States',
    description: 'State management',
    route: '/content/states',
    icon: 'ti ti-map-2',
    moduleCategory: 'content',
    sortOrder: 3,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'content.cities',
    displayName: 'Cities',
    description: 'City management',
    route: '/content/cities',
    icon: 'ti ti-building-community',
    moduleCategory: 'content',
    sortOrder: 4,
    availableActions: ['read', 'create', 'write', 'delete', 'import', 'export']
  },
  {
    name: 'content.testimonials',
    displayName: 'Testimonials',
    description: 'Testimonial management',
    route: '/testimonials',
    icon: 'ti ti-quote',
    moduleCategory: 'content',
    sortOrder: 5,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.faq',
    displayName: 'FAQ',
    description: 'FAQ management',
    route: '/faq',
    icon: 'ti ti-help-circle',
    moduleCategory: 'content',
    sortOrder: 6,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.blogs',
    displayName: 'Blogs',
    description: 'Blog management',
    route: '/blogs',
    icon: 'ti ti-article',
    moduleCategory: 'content',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.blog-categories',
    displayName: 'Blog Categories',
    description: 'Blog category management',
    route: '/blog-categories',
    icon: 'ti ti-category-2',
    moduleCategory: 'content',
    sortOrder: 8,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'content.blog-comments',
    displayName: 'Blog Comments',
    description: 'Blog comment moderation',
    route: '/blog-comments',
    icon: 'ti ti-message-2',
    moduleCategory: 'content',
    sortOrder: 9,
    availableActions: ['read', 'write', 'delete', 'approve']
  },
  {
    name: 'content.blog-tags',
    displayName: 'Blog Tags',
    description: 'Blog tag management',
    route: '/blog-tags',
    icon: 'ti ti-tag',
    moduleCategory: 'content',
    sortOrder: 10,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // XVI. ACCOUNTING (8 pages)
  // ============================================
  {
    name: 'accounting.categories',
    displayName: 'Accounting Categories',
    description: 'Accounting category management',
    route: '/accounting/categories',
    icon: 'ti ti-category',
    moduleCategory: 'finance',
    sortOrder: 17,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'accounting.budgets',
    displayName: 'Budgets',
    description: 'Budget management',
    route: '/accounting/budgets',
    icon: 'ti ti-wallet',
    moduleCategory: 'finance',
    sortOrder: 18,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'accounting.budgets-expenses',
    displayName: 'Budget Expenses',
    description: 'Budget expense tracking',
    route: '/accounting/budgets-expenses',
    icon: 'ti ti-wallet-off',
    moduleCategory: 'finance',
    sortOrder: 19,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'accounting.budget-revenues',
    displayName: 'Budget Revenues',
    description: 'Budget revenue tracking',
    route: '/accounting/budget-revenues',
    icon: 'ti ti-wallet-plus',
    moduleCategory: 'finance',
    sortOrder: 20,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // XVII. USER MANAGEMENT (4 pages)
  // ============================================
  {
    name: 'user-management.delete-request',
    displayName: 'Delete Requests',
    description: 'Account deletion requests',
    route: '/user-management/delete-request',
    icon: 'ti ti-user-x',
    moduleCategory: 'users-permissions',
    sortOrder: 5,
    availableActions: ['read', 'write', 'delete']
  },
  {
    name: 'user-management.roles-permissions',
    displayName: 'User Roles & Permissions',
    description: 'User role and permission assignment',
    route: '/user-management/roles-permissions',
    icon: 'ti ti-shield-check',
    moduleCategory: 'users-permissions',
    sortOrder: 6,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'user-management.permissions',
    displayName: 'User Permissions',
    description: 'Individual permission management',
    route: '/user-management/permissions',
    icon: 'ti ti-key',
    moduleCategory: 'users-permissions',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // XVIII. APP SETTINGS (6 pages)
  // ============================================
  {
    name: 'settings.custom-fields',
    displayName: 'Custom Fields',
    description: 'Custom field management',
    route: '/app-settings/custom-fields',
    icon: 'ti ti-forms',
    moduleCategory: 'administration',
    sortOrder: 10,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'settings.invoice-settings',
    displayName: 'Invoice Settings',
    description: 'Invoice configuration',
    route: '/app-settings/invoice-settings',
    icon: 'ti ti-file-invoice',
    moduleCategory: 'administration',
    sortOrder: 11,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.salary-settings',
    displayName: 'Salary Settings',
    description: 'Salary configuration',
    route: '/app-settings/salary-settings',
    icon: 'ti ti-cash',
    moduleCategory: 'administration',
    sortOrder: 12,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.approval-settings',
    displayName: 'Approval Settings',
    description: 'Approval workflow configuration',
    route: '/app-settings/approval-settings',
    icon: 'ti ti-checkup-list',
    moduleCategory: 'administration',
    sortOrder: 13,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.leave-type',
    displayName: 'Leave Types',
    description: 'Leave type configuration',
    route: '/app-settings/leave-type',
    icon: 'ti ti-calendar-off',
    moduleCategory: 'administration',
    sortOrder: 14,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // XIX. GENERAL SETTINGS (4 pages)
  // ============================================
  {
    name: 'settings.connected-apps',
    displayName: 'Connected Apps',
    description: 'Third-party app integrations',
    route: '/general-settings/connected-apps',
    icon: 'ti ti-plug-connected',
    moduleCategory: 'administration',
    sortOrder: 15,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.notifications',
    displayName: 'Notification Settings',
    description: 'Notification preferences',
    route: '/general-settings/notifications-settings',
    icon: 'ti ti-bell',
    moduleCategory: 'administration',
    sortOrder: 16,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.profile',
    displayName: 'Profile Settings',
    description: 'User profile settings',
    route: '/general-settings/profile-settings',
    icon: 'ti ti-user-cog',
    moduleCategory: 'administration',
    sortOrder: 17,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.security',
    displayName: 'Security Settings',
    description: 'Security configuration',
    route: '/general-settings/security-settings',
    icon: 'ti ti-lock',
    moduleCategory: 'administration',
    sortOrder: 18,
    availableActions: ['read', 'write']
  },

  // ============================================
  // XX. WEBSITE SETTINGS (8 pages)
  // ============================================
  {
    name: 'settings.business',
    displayName: 'Business Settings',
    description: 'Business configuration',
    route: '/website-settings/bussiness-settings',
    icon: 'ti ti-building',
    moduleCategory: 'administration',
    sortOrder: 19,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.seo',
    displayName: 'SEO Settings',
    description: 'SEO configuration',
    route: '/website-settings/seo-settings',
    icon: 'ti ti-search',
    moduleCategory: 'administration',
    sortOrder: 20,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.localization',
    displayName: 'Localization',
    description: 'Language and locale settings',
    route: '/website-settings/localization-settings',
    icon: 'ti ti-world',
    moduleCategory: 'administration',
    sortOrder: 21,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.prefixes',
    displayName: 'Prefixes',
    description: 'ID prefix configuration',
    route: '/website-settings/prefixes',
    icon: 'ti ti-hash',
    moduleCategory: 'administration',
    sortOrder: 22,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.preferences',
    displayName: 'Preferences',
    description: 'System preferences',
    route: '/website-settings/preferences',
    icon: 'ti ti-settings',
    moduleCategory: 'administration',
    sortOrder: 23,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.appearance',
    displayName: 'Appearance',
    description: 'Theme and appearance settings',
    route: '/website-settings/appearance',
    icon: 'ti ti-palette',
    moduleCategory: 'administration',
    sortOrder: 24,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.authentication',
    displayName: 'Authentication Settings',
    description: 'Authentication configuration',
    route: '/website-settings/authentication-settings',
    icon: 'ti ti-login',
    moduleCategory: 'administration',
    sortOrder: 25,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.ai',
    displayName: 'AI Settings',
    description: 'AI feature configuration',
    route: '/website-settings/ai-settings',
    icon: 'ti ti-brain',
    moduleCategory: 'administration',
    sortOrder: 26,
    availableActions: ['read', 'write']
  },

  // ============================================
  // XXI. FINANCIAL SETTINGS (3 pages)
  // ============================================
  {
    name: 'settings.currencies',
    displayName: 'Currencies',
    description: 'Currency management',
    route: '/financial-settings/currencies',
    icon: 'ti ti-currency',
    moduleCategory: 'finance',
    sortOrder: 25,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'settings.payment-gateways',
    displayName: 'Payment Gateways',
    description: 'Payment gateway configuration',
    route: '/financial-settings/payment-gateways',
    icon: 'ti ti-credit-card',
    moduleCategory: 'finance',
    sortOrder: 26,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.tax-rates',
    displayName: 'Tax Rates',
    description: 'Tax rate management',
    route: '/financial-settings/tax-rates',
    icon: 'ti ti-receipt-tax',
    moduleCategory: 'finance',
    sortOrder: 27,
    availableActions: ['read', 'create', 'write', 'delete']
  },

  // ============================================
  // XXII. SYSTEM SETTINGS (6 pages)
  // ============================================
  {
    name: 'settings.email',
    displayName: 'Email Settings',
    description: 'Email configuration',
    route: '/system-settings/email-settings',
    icon: 'ti ti-mail',
    moduleCategory: 'administration',
    sortOrder: 30,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.email-templates',
    displayName: 'Email Templates',
    description: 'Email template management',
    route: '/system-settings/email-templates',
    icon: 'ti ti-template',
    moduleCategory: 'administration',
    sortOrder: 31,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'settings.sms',
    displayName: 'SMS Settings',
    description: 'SMS configuration',
    route: '/system-settings/sms-settings',
    icon: 'ti ti-message',
    moduleCategory: 'administration',
    sortOrder: 32,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.sms-templates',
    displayName: 'SMS Templates',
    description: 'SMS template management',
    route: '/system-settings/sms-template',
    icon: 'ti ti-message-2',
    moduleCategory: 'administration',
    sortOrder: 33,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'settings.otp',
    displayName: 'OTP Settings',
    description: 'OTP configuration',
    route: '/system-settings/otp-settings',
    icon: 'ti ti-password',
    moduleCategory: 'administration',
    sortOrder: 34,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.gdpr-cookies',
    displayName: 'GDPR & Cookies',
    description: 'GDPR compliance settings',
    route: '/system-settings/gdpr-cookies',
    icon: 'ti ti-cookie',
    moduleCategory: 'administration',
    sortOrder: 35,
    availableActions: ['read', 'write']
  },

  // ============================================
  // XXIII. OTHER SETTINGS (7 pages)
  // ============================================
  {
    name: 'settings.ban-ip',
    displayName: 'Ban IP Address',
    description: 'IP blocking management',
    route: '/other-settings/ban-ip-address',
    icon: 'ti ti-ban',
    moduleCategory: 'administration',
    sortOrder: 36,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'settings.custom-css',
    displayName: 'Custom CSS',
    description: 'Custom CSS management',
    route: '/other-settings/custom-css',
    icon: 'ti ti-code',
    moduleCategory: 'administration',
    sortOrder: 37,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.custom-js',
    displayName: 'Custom JS',
    description: 'Custom JavaScript management',
    route: '/other-settings/custom-js',
    icon: 'ti ti-code',
    moduleCategory: 'administration',
    sortOrder: 38,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.cronjob',
    displayName: 'Cronjob',
    description: 'Scheduled task management',
    route: '/other-settings/cronjob',
    icon: 'ti ti-clock',
    moduleCategory: 'administration',
    sortOrder: 39,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'settings.storage',
    displayName: 'Storage Settings',
    description: 'Storage configuration',
    route: '/other-settings/storage-settings',
    icon: 'ti ti-database',
    moduleCategory: 'administration',
    sortOrder: 40,
    availableActions: ['read', 'write']
  },
  {
    name: 'settings.backup',
    displayName: 'Backup',
    description: 'Backup management',
    route: '/other-settings/backup',
    icon: 'ti ti-download',
    moduleCategory: 'administration',
    sortOrder: 41,
    availableActions: ['read', 'create']
  },
  {
    name: 'settings.clear-cache',
    displayName: 'Clear Cache',
    description: 'Cache management',
    route: '/other-settings/clear-cache',
    icon: 'ti ti-trash',
    moduleCategory: 'administration',
    sortOrder: 42,
    availableActions: ['read', 'write']
  },

  // ============================================
  // XXIV. PAGES MODULE (9 pages)
  // ============================================
  {
    name: 'pages.profile',
    displayName: 'Profile',
    description: 'User profile page',
    route: '/pages/profile',
    icon: 'ti ti-user',
    moduleCategory: 'pages',
    sortOrder: 1,
    availableActions: ['read', 'write']
  },
  {
    name: 'pages.admin-profile',
    displayName: 'Admin Profile',
    description: 'Admin profile page',
    route: '/admin/profile',
    icon: 'ti ti-user-cog',
    moduleCategory: 'pages',
    sortOrder: 2,
    availableActions: ['read', 'write']
  },
  {
    name: 'pages.gallery',
    displayName: 'Gallery',
    description: 'Image gallery',
    route: '/gallery',
    icon: 'ti ti-photo',
    moduleCategory: 'pages',
    sortOrder: 3,
    availableActions: ['read']
  },
  {
    name: 'pages.search',
    displayName: 'Search Results',
    description: 'Search results page',
    route: '/search-result',
    icon: 'ti ti-search',
    moduleCategory: 'pages',
    sortOrder: 4,
    availableActions: ['read']
  },
  {
    name: 'pages.timeline',
    displayName: 'Timeline',
    description: 'Timeline page',
    route: '/timeline',
    icon: 'ti ti-timeline',
    moduleCategory: 'pages',
    sortOrder: 5,
    availableActions: ['read']
  },
  {
    name: 'pages.pricing',
    displayName: 'Pricing',
    description: 'Pricing plans page',
    route: '/pricing',
    icon: 'ti ti-currency-dollar',
    moduleCategory: 'pages',
    sortOrder: 6,
    availableActions: ['read']
  },
  {
    name: 'pages.api-keys',
    displayName: 'API Keys',
    description: 'API key management',
    route: '/api-keys',
    icon: 'ti ti-key',
    moduleCategory: 'pages',
    sortOrder: 7,
    availableActions: ['read', 'create', 'write', 'delete']
  },
  {
    name: 'pages.privacy-policy',
    displayName: 'Privacy Policy',
    description: 'Privacy policy page',
    route: '/privacy-policy',
    icon: 'ti ti-shield',
    moduleCategory: 'pages',
    sortOrder: 8,
    availableActions: ['read', 'write']
  },
  {
    name: 'pages.terms',
    displayName: 'Terms & Conditions',
    description: 'Terms and conditions page',
    route: '/terms-condition',
    icon: 'ti ti-file-text',
    moduleCategory: 'pages',
    sortOrder: 9,
    availableActions: ['read', 'write']
  },
];

/**
 * Function to seed all pages to database
 * @param {Model} PageModel - Mongoose Page model
 * @returns {Object} Seeding result
 */
export async function seedAllPages(PageModel) {
  try {
    console.log('Seeding All Pages...');
    console.log('='.repeat(50));

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const errors = [];

    for (const pageData of allPagesSeedData) {
      try {
        const existingPage = await PageModel.findOne({ name: pageData.name });

        if (!existingPage) {
          await PageModel.create(pageData);
          console.log(`  + Created: ${pageData.displayName} (${pageData.moduleCategory})`);
          created++;
        } else {
          // Check if update needed
          const updateFields = {};
          const fieldsToCheck = ['displayName', 'description', 'route', 'icon', 'sortOrder', 'availableActions', 'moduleCategory'];

          fieldsToCheck.forEach(field => {
            if (JSON.stringify(existingPage[field]) !== JSON.stringify(pageData[field])) {
              updateFields[field] = pageData[field];
            }
          });

          if (Object.keys(updateFields).length > 0) {
            await PageModel.findByIdAndUpdate(existingPage._id, updateFields);
            console.log(`  ~ Updated: ${pageData.displayName}`);
            updated++;
          } else {
            skipped++;
          }
        }
      } catch (error) {
        errors.push({ page: pageData.name, error: error.message });
        console.log(`  x Error: ${pageData.name} - ${error.message}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('Seeding Complete!');
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors:  ${errors.length}`);

    return { success: true, created, updated, skipped, errors };
  } catch (error) {
    console.error('Fatal error seeding pages:', error);
    return { success: false, error: error.message };
  }
}

export default allPagesSeedData;
