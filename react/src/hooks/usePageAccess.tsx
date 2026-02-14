/**
 * usePageAccess Hook
 * React hook for checking page-level permissions in the frontend
 *
 * Usage:
 *   const { hasAccess, canRead, canCreate, canEdit, canDelete } = usePageAccess('hrm.employees');
 *   if (!hasAccess) return <AccessDenied />;
 */

import React, { useMemo } from 'react';

// Types
interface PermissionActions {
  all?: boolean;
  read?: boolean;
  create?: boolean;
  write?: boolean;
  delete?: boolean;
  import?: boolean;
  export?: boolean;
  approve?: boolean;
  assign?: boolean;
}

interface PagePermission {
  pageId: string;
  module: string;
  displayName: string;
  actions: PermissionActions;
}

interface UserRole {
  _id: string;
  name: string;
  displayName: string;
  permissions?: PagePermission[];
}

interface User {
  id: string;
  role?: string;
  roleId?: string;
  roleData?: UserRole;
  permissions?: Record<string, PermissionActions>;
}

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Mock auth hook - replace with your actual auth implementation
declare function useAuth(): UseAuthReturn;

/**
 * Hook to check page-level access permissions
 *
 * @param pageName - The page identifier (e.g., 'hrm.employees')
 * @param action - Optional specific action to check
 * @returns Access check results
 */
export function usePageAccess(pageName: string, action?: string) {
  const { user, isLoading } = useAuth();

  const permissions = useMemo(() => {
    if (!user) return null;

    // Try to get permissions from roleData first
    if (user.roleData?.permissions) {
      const pagePermission = user.roleData.permissions.find(
        (p) => p.module === pageName || p.pageId === pageName
      );
      if (pagePermission) return pagePermission.actions;
    }

    // Fallback to direct permissions object
    if (user.permissions?.[pageName]) {
      return user.permissions[pageName];
    }

    return null;
  }, [user, pageName]);

  const hasAccess = useMemo(() => {
    if (isLoading) return false;
    if (!permissions) return false;
    if (permissions.all) return true;
    if (action) return !!permissions[action as keyof PermissionActions];
    return Object.values(permissions).some(Boolean);
  }, [permissions, isLoading, action]);

  const canRead = useMemo(() => {
    return permissions?.all || permissions?.read || false;
  }, [permissions]);

  const canCreate = useMemo(() => {
    return permissions?.all || permissions?.create || false;
  }, [permissions]);

  const canEdit = useMemo(() => {
    return permissions?.all || permissions?.write || false;
  }, [permissions]);

  const canDelete = useMemo(() => {
    return permissions?.all || permissions?.delete || false;
  }, [permissions]);

  const canImport = useMemo(() => {
    return permissions?.all || permissions?.import || false;
  }, [permissions]);

  const canExport = useMemo(() => {
    return permissions?.all || permissions?.export || false;
  }, [permissions]);

  const canApprove = useMemo(() => {
    return permissions?.all || permissions?.approve || false;
  }, [permissions]);

  const canAssign = useMemo(() => {
    return permissions?.all || permissions?.assign || false;
  }, [permissions]);

  return {
    // General access
    hasAccess,
    isLoading,
    permissions,

    // Action-specific checks
    canRead,
    canCreate,
    canEdit,
    canDelete,
    canImport,
    canExport,
    canApprove,
    canAssign,

    // Helper to check any action
    can: (actionName: string) => {
      if (permissions?.all) return true;
      return !!permissions?.[actionName as keyof PermissionActions];
    },
  };
}

/**
 * Hook to check multiple page permissions at once
 *
 * @param pageNames - Array of page identifiers
 * @returns Object with access checks for each page
 */
export function useMultiplePageAccess(pageNames: string[]) {
  const { user, isLoading } = useAuth();

  return useMemo(() => {
    const result: Record<string, ReturnType<typeof usePageAccess>> = {};

    for (const pageName of pageNames) {
      const permissions = user?.roleData?.permissions?.find(
        (p) => p.module === pageName || p.pageId === pageName
      )?.actions || user?.permissions?.[pageName] || null;

      result[pageName] = {
        hasAccess: permissions?.all || Object.values(permissions || {}).some(Boolean),
        isLoading,
        permissions,
        canRead: permissions?.all || permissions?.read || false,
        canCreate: permissions?.all || permissions?.create || false,
        canEdit: permissions?.all || permissions?.write || false,
        canDelete: permissions?.all || permissions?.delete || false,
        canImport: permissions?.all || permissions?.import || false,
        canExport: permissions?.all || permissions?.export || false,
        canApprove: permissions?.all || permissions?.approve || false,
        canAssign: permissions?.all || permissions?.assign || false,
        can: (actionName: string) => {
          if (permissions?.all) return true;
          return !!permissions?.[actionName as keyof PermissionActions];
        },
      };
    }

    return result;
  }, [user, pageNames, isLoading]);
}

/**
 * Component wrapper for page access control
 */
export function PageAccessGuard({
  pageName,
  action = 'read',
  fallback = null,
  children,
}: {
  pageName: string;
  action?: string;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { hasAccess, isLoading } = usePageAccess(pageName, action);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Button wrapper that hides/disables based on permission
 */
export function PermissionButton({
  pageName,
  action,
  children,
  fallback = null,
  disabled = false,
  ...props
}: {
  pageName: string;
  action: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { can } = usePageAccess(pageName);

  if (!can(action)) {
    return <>{fallback}</>;
  }

  return (
    <button disabled={disabled} {...props}>
      {children}
    </button>
  );
}

export default usePageAccess;
