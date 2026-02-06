/**
 * useUserProfileREST Hook
 *
 * React hook for fetching and managing current user profile data via REST API
 * Returns role-based data:
 * - Admin: Company information (name, logo, domain, email)
 * - HR/Employee: Employee information (firstName, lastName, employeeId, email, designation)
 * - Superadmin: Basic user information
 */

import { useAuth } from '@clerk/clerk-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// API base URL
const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

// Type definitions for role-based profile data
export interface AdminProfileData {
  role: 'admin';
  companyId: string;
  companyName: string;
  companyLogo: string | null;
  companyDomain: string | null;
  email: string;
  status: string | null;
  website: string | null;
  phone: string | null;
}

export interface EmployeeProfileData {
  role: 'hr' | 'employee';
  _id: string;
  employeeId: string | null;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  designation: string | null;
  department: string | null;
  profileImage: string | null;
  employmentType: string | null;
  employmentStatus: string | null;
  joiningDate: string | null;
  companyId: string;
}

export interface SuperadminProfileData {
  role: 'superadmin';
  email: string | null;
  userId: string | null;
}

export interface DefaultProfileData {
  role: string;
  email: string | null;
  userId: string | null;
  companyId: string | null;
}

export type UserProfileData =
  | AdminProfileData
  | EmployeeProfileData
  | SuperadminProfileData
  | DefaultProfileData;

export interface UserProfileResponse {
  success: boolean;
  data?: UserProfileData;
  error?: string;
  message?: string;
}

interface UseUserProfileRESTReturn {
  profile: UserProfileData | null;
  loading: boolean;
  error: string | null;
  fetchProfile: () => Promise<UserProfileData | null>;
  updateProfile: (data: Record<string, any>) => Promise<UserProfileResponse>;
  refetch: () => Promise<void>;
  isAdmin: boolean;
  isHR: boolean;
  isEmployee: boolean;
  isSuperadmin: boolean;
}

/**
 * Hook for managing current user profile via REST API
 */
export const useUserProfileREST = (): UseUserProfileRESTReturn => {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Track if profile has been fetched to avoid repeated calls
  const hasFetchedRef = useRef(false);

  // Fetch current user profile
  const fetchProfile = useCallback(async (): Promise<UserProfileData | null> => {
    if (!isLoaded || !isSignedIn) {
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication token not available');
      }

      console.log('[useUserProfileREST] Fetching user profile...');

      const response = await fetch(`${API_BASE_URL}/api/user-profile/current`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result: UserProfileResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to fetch profile');
      }

      console.log('[useUserProfileREST] Profile fetched successfully:', result.data);
      setProfile(result.data || null);
      return result.data || null;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch profile';
      console.error('[useUserProfileREST] Error:', err);
      setError(errorMsg);
      // Don't throw - allow the app to continue even if profile fetch fails
      return null;
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, getToken]);

  // Update current user profile (HR/Employee only)
  const updateProfile = useCallback(
    async (data: Record<string, any>): Promise<UserProfileResponse> => {
      if (!isLoaded || !isSignedIn) {
        return { success: false, error: 'User not authenticated' };
      }

      try {
        const token = await getToken();
        if (!token) {
          throw new Error('Authentication token not available');
        }

        console.log('[useUserProfileREST] Updating profile...');

        const response = await fetch(`${API_BASE_URL}/api/user-profile/current`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        const result: UserProfileResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || result.message || 'Failed to update profile');
        }

        console.log('[useUserProfileREST] Profile updated successfully:', result.data);
        setProfile(result.data || null);
        return result;
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to update profile';
        console.error('[useUserProfileREST] Error:', err);
        return { success: false, error: errorMsg };
      }
    },
    [isLoaded, isSignedIn, getToken]
  );

  // Refetch profile data
  const refetch = useCallback(async (): Promise<void> => {
    await fetchProfile();
  }, [fetchProfile]);

  // Fetch profile on mount (only once)
  useEffect(() => {
    if (isLoaded && isSignedIn && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchProfile();
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  // Role helpers
  const isAdmin = profile?.role === 'admin';
  const isHR = profile?.role === 'hr';
  const isEmployee = profile?.role === 'employee';
  const isSuperadmin = profile?.role === 'superadmin';

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    refetch,
    isAdmin,
    isHR,
    isEmployee,
    isSuperadmin,
  };
};

export default useUserProfileREST;
