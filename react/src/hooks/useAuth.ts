/**
 * Custom useAuth Hook
 * Wraps Clerk authentication and provides user role for permission checks
 */

import { useUser } from '@clerk/clerk-react';

export interface UseAuthReturn {
  role: string;
  isSignedIn: boolean;
  isLoaded: boolean;
  userId: string | null;
}

/**
 * useAuth - Custom hook for authentication and role-based access
 *
 * Returns the user's role from Clerk user metadata for permission checking
 * Role is stored in user.publicMetadata.role by the backend
 *
 * @example
 * const { role, isSignedIn } = useAuth();
 * if (role === 'admin') { ... }
 */
export const useAuth = (): UseAuthReturn => {
  const { user, isLoaded, isSignedIn } = useUser();

  // Get role from Clerk user metadata (set by backend during authentication)
  const getRole = (): string => {
    if (!user) return 'guest';

    // Role is stored in publicMetadata by the backend
    const role = (user.publicMetadata?.role as string) || 'employee';
    return role.toLowerCase();
  };

  return {
    role: getRole(),
    isSignedIn: isSignedIn ?? false,
    isLoaded,
    userId: user?.id ?? null,
  };
};

export default useAuth;
