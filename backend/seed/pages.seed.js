/**
 * Pages Seed Data - SuperAdmin Pages
 * Initial seed data for the Pages collection
 * This file contains all SuperAdmin related pages
 */

export const superAdminPagesSeedData = [
  // ============================================
  // I. SUPER ADMIN (5 pages)
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

  // ============================================
  // II. USERS & PERMISSIONS (3 pages)
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

  // ============================================
  // III. DASHBOARDS (5 pages)
  // ============================================
  {
    name: 'dashboards.admin',
    displayName: 'Admin Dashboards',
    description: 'Main administration dashboard',
    route: '/admin-dashboard',
    icon: 'ti ti-dashboard',
    moduleCategory: 'dashboards',
    sortOrder: 1,
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
    availableActions: ['read']
  },

  // ============================================
  // NEW: PAGES MANAGEMENT PAGE (for SuperAdmin)
  // ============================================
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
];

/**
 * Function to seed pages to database
 * Run this after updating the page schema
 */
export async function seedSuperAdminPages(PageModel) {
  try {
    console.log('Seeding SuperAdmin Pages...');

    for (const pageData of superAdminPagesSeedData) {
      const existingPage = await PageModel.findOne({ name: pageData.name });

      if (!existingPage) {
        await PageModel.create(pageData);
        console.log(`Created page: ${pageData.displayName}`);
      } else {
        // Update existing page with new fields
        await PageModel.findByIdAndUpdate(existingPage._id, {
          availableActions: pageData.availableActions,
          moduleCategory: pageData.moduleCategory
        });
        console.log(`Updated page: ${pageData.displayName}`);
      }
    }

    console.log('SuperAdmin Pages seeding completed!');
    return { success: true, count: superAdminPagesSeedData.length };
  } catch (error) {
    console.error('Error seeding pages:', error);
    return { success: false, error: error.message };
  }
}

export default superAdminPagesSeedData;
