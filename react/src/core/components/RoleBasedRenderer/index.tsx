/**
 * Role-Based Renderer Component
 *
 * Conditionally renders children based on user role
 * Used for dashboard cards, navigation items, and other role-specific UI elements
 */

import React from 'react';
import { useAuth } from '../../../hooks/useAuth';

export type UserRole = 'admin' | 'hr' | 'employee' | 'manager' | 'leads' | 'superadmin' | 'guest';

export interface RoleBasedRendererProps {
  /** Roles that should see this content */
  allowedRoles: UserRole[];
  /** Content to render if user has permission */
  children: React.ReactNode;
  /** Fallback content to render if user doesn't have permission (optional) */
  fallback?: React.ReactNode;
  /** Whether to show the component to higher privilege roles automatically */
  includeHigherPrivileges?: boolean;
}

/**
 * Role hierarchy (highest to lowest privilege):
 * superadmin > admin > hr > manager > leads > employee > guest
 */
const ROLE_HIERARCHY: Record<UserRole, number> = {
  superadmin: 100,
  admin: 80,
  hr: 60,
  manager: 50,
  leads: 40,
  employee: 20,
  guest: 0,
};

/**
 * Check if user's role has sufficient privilege
 */
const hasPermission = (userRole: UserRole, allowedRoles: UserRole[], includeHigherPrivileges: boolean): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole] ?? 0;

  return allowedRoles.some(allowedRole => {
    if (includeHigherPrivileges) {
      // User has permission if their level is >= required level
      return userLevel >= ROLE_HIERARCHY[allowedRole];
    } else {
      // Exact role match required
      return userRole === allowedRole;
    }
  });
};

/**
 * RoleBasedRenderer Component
 *
 * @example
 * // Show only to admin and hr
 * <RoleBasedRenderer allowedRoles={['admin', 'hr']}>
 *   <AdminOnlyContent />
 * </RoleBasedRenderer>
 *
 * @example
 * // Show to admin and all higher privilege roles (superadmin)
 * <RoleBasedRenderer allowedRoles={['admin']} includeHigherPrivileges>
 *   <SensitiveContent />
 * </RoleBasedRenderer>
 *
 * @example
 * // With fallback
 * <RoleBasedRenderer
 *   allowedRoles={['admin']}
 *   fallback={<AccessDeniedMessage />}
 * >
 *   <AdminContent />
 * </RoleBasedRenderer>
 */
export const RoleBasedRenderer: React.FC<RoleBasedRendererProps> = ({
  allowedRoles,
  children,
  fallback = null,
  includeHigherPrivileges = false,
}) => {
  const { role } = useAuth();
  const userRole = (role.toLowerCase() || 'guest') as UserRole;

  const canView = hasPermission(userRole, allowedRoles, includeHigherPrivileges);

  if (canView) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};

/**
 * HOC wrapper for easier role-based rendering
 */
export const withRoleCheck = <P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: UserRole[],
  options?: { fallback?: React.ReactNode; includeHigherPrivileges?: boolean }
) => {
  return (props: P) => (
    <RoleBasedRenderer
      allowedRoles={allowedRoles}
      fallback={options?.fallback}
      includeHigherPrivileges={options?.includeHigherPrivileges}
    >
      <Component {...props} />
    </RoleBasedRenderer>
  );
};

/**
 * Pre-configured renderers for common use cases
 */

// Admin and Superadmin only
export const AdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <RoleBasedRenderer allowedRoles={['admin']} includeHigherPrivileges fallback={fallback}>
    {children}
  </RoleBasedRenderer>
);

// HR and above
export const HROnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <RoleBasedRenderer allowedRoles={['hr']} includeHigherPrivileges fallback={fallback}>
    {children}
  </RoleBasedRenderer>
);

// Manager and above
export const ManagerOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <RoleBasedRenderer allowedRoles={['manager']} includeHigherPrivileges fallback={fallback}>
    {children}
  </RoleBasedRenderer>
);

// Employee and above (everyone except guest)
export const EmployeeOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <RoleBasedRenderer allowedRoles={['employee']} includeHigherPrivileges fallback={fallback}>
    {children}
  </RoleBasedRenderer>
);

// Superadmin only
export const SuperAdminOnly: React.FC<{ children: React.ReactNode; fallback?: React.ReactNode }> = ({
  children,
  fallback,
}) => (
  <RoleBasedRenderer allowedRoles={['superadmin']} fallback={fallback}>
    {children}
  </RoleBasedRenderer>
);

/**
 * Dashboard section visibility configuration
 */
export const DASHBOARD_SECTIONS = {
  // Company-wide statistics (admin/hr only)
  COMPANY_STATS: ['admin', 'hr'] as UserRole[],

  // Employee list and management (admin/hr only)
  EMPLOYEE_MANAGEMENT: ['admin', 'hr'] as UserRole[],

  // Department/Designation management (admin only)
  ORGANIZATION_MANAGEMENT: ['admin'] as UserRole[],

  // Leave management (admin/hr only - managers see team leaves)
  LEAVE_MANAGEMENT: ['admin', 'hr'] as UserRole[],

  // Attendance tracking and reports (admin/hr only)
  ATTENDANCE_MANAGEMENT: ['admin', 'hr'] as UserRole[],

  // Performance reviews (admin/hr/managers)
  PERFORMANCE_MANAGEMENT: ['admin', 'hr', 'manager'] as UserRole[],

  // Payroll access (admin only)
  PAYROLL: ['admin'] as UserRole[],

  // Reports and analytics (admin/hr)
  REPORTS: ['admin', 'hr'] as UserRole[],

  // Settings and configuration (admin only)
  SETTINGS: ['admin'] as UserRole[],

  // Personal data (all authenticated users)
  PERSONAL_DATA: ['employee'] as UserRole[],
};

export default RoleBasedRenderer;
