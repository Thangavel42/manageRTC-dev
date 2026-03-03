/**
 * useAdminProfileREST Hook
 *
 * React hook for admin profile management via REST API
 * Handles fetching admin profile (company info + subscription + admin details)
 * and updating Tier 1 (directly editable) fields
 */

import { useCallback, useState } from 'react';
import { get, put, handleApiError } from '../services/api';
import { message } from 'antd';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SubscriptionInfo {
  planId?: string;
  planName: string;
  userLimit: number;
  currentUsers: number;
  renewalDate?: string | null;
  status: string;
}

export interface AdminInfo {
  adminName: string;
  adminEmail: string;
  adminRole: string;
}

export interface AdminProfile {
  // Company Information
  companyId: string;
  companyName: string;
  companyLogo: string;
  domain: string | null;
  email: string;
  phone: string | null;
  phone2?: string | null;
  fax?: string | null;
  website: string | null;
  description: string;
  address?: string | null;
  structuredAddress?: {
    street?: string;
    street2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  } | null;
  status: string;
  createdAt?: string;

  // Registration & Legal (Read-Only)
  registrationNumber?: string | null;
  taxId?: string | null;
  taxIdType?: string | null;
  legalName?: string | null;
  legalEntityType?: string | null;
  incorporationCountry?: string | null;

  // Industry & Classification (Read-Only)
  industry?: string | null;
  subIndustry?: string | null;
  companySize?: string | null;
  companyType?: string | null;

  // Contact & Founder (Read-Only)
  contactPerson?: {
    name?: string;
    email?: string;
    phone?: string;
    designation?: string;
  } | null;
  founderName?: string | null;

  // Social Links (Direct Edit)
  social?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  } | null;

  // Billing (Request to Edit)
  billingEmail?: string | null;
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  } | null;

  // Subscription
  subscription: SubscriptionInfo | null;

  // Admin User
  admin: AdminInfo;

  // Stats
  employeeCount?: number;
  userCount?: number;

  // Compatibility fields
  _id: string;
  userId: string;
  role: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profilePhoto: string;
  profileImage: string;
  designation: string;
  joiningDate?: string | null;
  bio: string;
  about: string;
}

// Tier 1: Fields admin can directly update
export interface AdminProfileUpdateData {
  phone?: string;
  phone2?: string;
  fax?: string;
  website?: string;
  description?: string;
  bio?: string;
  about?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  companyLogo?: string;
  profilePhoto?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export const useAdminProfileREST = () => {
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch admin profile
  const fetchAdminProfile = useCallback(async (): Promise<AdminProfile | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await get<AdminProfile>('/user-profile/admin');

      if (response.success && response.data) {
        setProfile(response.data);
        return response.data;
      } else {
        const errorMsg = response.error?.message || 'Failed to fetch admin profile';
        setError(errorMsg);
        return null;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      console.error('[useAdminProfileREST] Error fetching profile:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update admin profile (Tier 1 fields only)
  const updateAdminProfile = useCallback(async (updateData: AdminProfileUpdateData): Promise<boolean> => {
    setUpdating(true);
    setError(null);
    try {
      const response = await put<{ message: string; data: Partial<AdminProfile> }>(
        '/user-profile/admin',
        updateData
      );

      if (response.success) {
        message.success('Profile updated successfully');
        // Refresh profile to get latest data
        await fetchAdminProfile();
        return true;
      } else {
        const errorMsg = response.error?.message || 'Failed to update profile';
        message.error(errorMsg);
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      message.error(`Failed to update profile: ${errorMsg}`);
      setError(errorMsg);
      console.error('[useAdminProfileREST] Error updating profile:', err);
      return false;
    } finally {
      setUpdating(false);
    }
  }, [fetchAdminProfile]);

  return {
    // Data
    profile,
    loading,
    updating,
    error,

    // Actions
    fetchAdminProfile,
    updateAdminProfile,
  };
};
