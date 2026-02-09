/**
 * Dashboard Role Filter Utility
 *
 * Provides functions to filter dashboard content based on user role
 * Helps determine which dashboard cards, sections, and metrics should be visible
 */

import { UserRole } from '../components/RoleBasedRenderer';

/**
 * Dashboard card configuration
 * Defines which roles can see each dashboard card/section
 */
export interface DashboardCardConfig {
  id: string;
  title: string;
  allowedRoles: UserRole[];
  includeHigherPrivileges?: boolean;
  category: 'statistics' | 'charts' | 'actions' | 'personal';
}

/**
 * All dashboard cards with their role visibility rules
 */
export const DASHBOARD_CARDS: Record<string, DashboardCardConfig> = {
  // ============================================
  // COMPANY-WIDE STATISTICS (Admin/HR only)
  // ============================================
  totalEmployees: {
    id: 'totalEmployees',
    title: 'Total Employees',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  activeEmployees: {
    id: 'activeEmployees',
    title: 'Active Employees',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  inactiveEmployees: {
    id: 'inactiveEmployees',
    title: 'Inactive Employees',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  newJoiners: {
    id: 'newJoiners',
    title: 'New Joiners (Last 30 Days)',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },

  // ============================================
  // DEPARTMENT STATISTICS (Admin/HR only)
  // ============================================
  totalDepartments: {
    id: 'totalDepartments',
    title: 'Total Departments',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  activeDepartments: {
    id: 'activeDepartments',
    title: 'Active Departments',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },

  // ============================================
  // LEAVE STATISTICS (Admin/HR/Manager)
  // ============================================
  totalLeaveRequests: {
    id: 'totalLeaveRequests',
    title: 'Total Leave Requests',
    allowedRoles: ['admin', 'hr', 'manager'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  pendingLeaves: {
    id: 'pendingLeaves',
    title: 'Pending Leave Requests',
    allowedRoles: ['admin', 'hr', 'manager'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  approvedLeaves: {
    id: 'approvedLeaves',
    title: 'Approved Leaves',
    allowedRoles: ['admin', 'hr', 'manager'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },

  // ============================================
  // ATTENDANCE STATISTICS (Admin/HR only)
  // ============================================
  attendanceRate: {
    id: 'attendanceRate',
    title: 'Attendance Rate',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  lateArrivals: {
    id: 'lateArrivals',
    title: 'Late Arrivals Today',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  absentToday: {
    id: 'absentToday',
    title: 'Absent Today',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },

  // ============================================
  // LIFECYCLE STATISTICS (Admin/HR only)
  // ============================================
  totalResignations: {
    id: 'totalResignations',
    title: 'Total Resignations',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  pendingResignations: {
    id: 'pendingResignations',
    title: 'Pending Resignations',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  totalTerminations: {
    id: 'totalTerminations',
    title: 'Total Terminations',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  pendingPromotions: {
    id: 'pendingPromotions',
    title: 'Pending Promotions',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },

  // ============================================
  // TRAINING STATISTICS (Admin/HR only)
  // ============================================
  upcomingTraining: {
    id: 'upcomingTraining',
    title: 'Upcoming Training',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },
  trainingCompletion: {
    id: 'trainingCompletion',
    title: 'Training Completion Rate',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'statistics',
  },

  // ============================================
  // PERSONAL STATISTICS (All authenticated users)
  // ============================================
  myLeaveBalance: {
    id: 'myLeaveBalance',
    title: 'My Leave Balance',
    allowedRoles: ['employee', 'hr', 'admin', 'manager'],
    includeHigherPrivileges: true,
    category: 'personal',
  },
  myAttendance: {
    id: 'myAttendance',
    title: 'My Attendance',
    allowedRoles: ['employee', 'hr', 'admin', 'manager'],
    includeHigherPrivileges: true,
    category: 'personal',
  },
  myUpcomingLeaves: {
    id: 'myUpcomingLeaves',
    title: 'My Upcoming Leaves',
    allowedRoles: ['employee', 'hr', 'admin', 'manager'],
    includeHigherPrivileges: true,
    category: 'personal',
  },
  myPunchTimes: {
    id: 'myPunchTimes',
    title: 'Today\'s Punch Times',
    allowedRoles: ['employee', 'hr', 'admin', 'manager'],
    includeHigherPrivileges: true,
    category: 'personal',
  },

  // ============================================
  // CHARTS (Admin/HR only - company-wide)
  // ============================================
  employeeDistributionChart: {
    id: 'employeeDistributionChart',
    title: 'Employee Distribution by Department',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'charts',
  },
  attendanceTrendChart: {
    id: 'attendanceTrendChart',
    title: 'Attendance Trend',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'charts',
  },
  leaveTrendChart: {
    id: 'leaveTrendChart',
    title: 'Leave Trend',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'charts',
  },
  recruitmentChart: {
    id: 'recruitmentChart',
    title: 'Recruitment Overview',
    allowedRoles: ['admin', 'hr'],
    includeHigherPrivileges: true,
    category: 'charts',
  },

  // ============================================
  // ACTION CARDS (All authenticated users)
  // ============================================
  manageLeaves: {
    id: 'manageLeaves',
    title: 'Manage Leaves',
    allowedRoles: ['employee', 'hr', 'admin', 'manager'],
    includeHigherPrivileges: true,
    category: 'actions',
  },
  applyLeave: {
    id: 'applyLeave',
    title: 'Apply for Leave',
    allowedRoles: ['employee', 'hr', 'admin', 'manager'],
    includeHigherPrivileges: true,
    category: 'actions',
  },
  markAttendance: {
    id: 'markAttendance',
    title: 'Mark Attendance',
    allowedRoles: ['employee', 'hr', 'admin', 'manager'],
    includeHigherPrivileges: true,
    category: 'actions',
  },
};

/**
 * Get visible dashboard cards for a given role
 */
export const getVisibleCards = (userRole: UserRole, category?: DashboardCardConfig['category']): DashboardCardConfig[] => {
  return Object.values(DASHBOARD_CARDS).filter(card => {
    // Filter by category if specified
    if (category && card.category !== category) {
      return false;
    }

    // Check role permissions
    const roleHierarchy: Record<UserRole, number> = {
      superadmin: 100,
      admin: 80,
      hr: 60,
      manager: 50,
      leads: 40,
      employee: 20,
      guest: 0,
    };

    const userLevel = roleHierarchy[userRole] ?? 0;

    return card.allowedRoles.some(allowedRole => {
      if (card.includeHigherPrivileges !== false) {
        return userLevel >= (roleHierarchy[allowedRole] ?? 0);
      }
      return userRole === allowedRole;
    });
  });
};

/**
 * Check if a specific card is visible to the given role
 */
export const isCardVisible = (cardId: string, userRole: UserRole): boolean => {
  const card = DASHBOARD_CARDS[cardId];
  if (!card) return false;

  const roleHierarchy: Record<UserRole, number> = {
    superadmin: 100,
    admin: 80,
    hr: 60,
    manager: 50,
    leads: 40,
    employee: 20,
    guest: 0,
  };

  const userLevel = roleHierarchy[userRole] ?? 0;

  return card.allowedRoles.some(allowedRole => {
    if (card.includeHigherPrivileges !== false) {
      return userLevel >= (roleHierarchy[allowedRole] ?? 0);
    }
    return userRole === allowedRole;
  });
};

/**
 * Get dashboard statistics cards for a role
 */
export const getStatisticsCards = (userRole: UserRole): DashboardCardConfig[] => {
  return getVisibleCards(userRole, 'statistics');
};

/**
 * Get dashboard chart cards for a role
 */
export const getChartCards = (userRole: UserRole): DashboardCardConfig[] => {
  return getVisibleCards(userRole, 'charts');
};

/**
 * Get personal data cards for a role
 */
export const getPersonalCards = (userRole: UserRole): DashboardCardConfig[] => {
  return getVisibleCards(userRole, 'personal');
};

/**
 * Get action cards for a role
 */
export const getActionCards = (userRole: UserRole): DashboardCardConfig[] => {
  return getVisibleCards(userRole, 'actions');
};

export default {
  DASHBOARD_CARDS,
  getVisibleCards,
  isCardVisible,
  getStatisticsCards,
  getChartCards,
  getPersonalCards,
  getActionCards,
};
