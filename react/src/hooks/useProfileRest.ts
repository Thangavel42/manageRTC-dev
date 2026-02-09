import { useState, useCallback } from 'react';
import { get, post, put, handleApiError } from '../services/api';
import { message } from 'antd';

export interface Profile {
  _id: string;
  userId?: string;
  companyId: string;
  // Personal information
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: string | null;
  gender?: string;
  profilePhoto?: string;
  profileImage?: string;
  avatarUrl?: string;

  // Personal Information (Passport, Nationality, etc.)
  personal?: {
    passport?: {
      number?: string;
      expiryDate?: string | null;
      country?: string;
    };
    nationality?: string;
    religion?: string;
    maritalStatus?: string;
    employmentOfSpouse?: string;
    noOfChildren?: number;
    birthday?: string | null; // Alternative to dateOfBirth
  };

  // Address information
  address?: {
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };

  // Professional information
  employeeId?: string;
  department?: string;
  designation?: string;
  joiningDate?: string | null;
  dateOfJoining?: string | null; // Alternative to joiningDate
  salary?: number;
  role: string;
  employmentType?: string;
  status: 'Active' | 'Inactive' | 'Probation' | 'Resigned' | 'Terminated' | 'On Leave';
  employmentStatus?: string; // Alternative to status
  reportingManager?: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    employeeId: string;
    email: string;
  } | null;
  reportingTo?: any; // ObjectId reference
  about?: string;
  notes?: string; // Alternative to about

  // Bank Information
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branch?: string;
    accountType?: 'Savings' | 'Current';
  };

  // Contact information
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  emergencyContacts?: Array<{ // Alternative format
    name: string;
    phone: string | string[];
    relationship: string;
  }>;

  // Social links
  socialLinks?: {
    linkedin: string;
    twitter: string;
    facebook: string;
    instagram: string;
  };
  socialProfiles?: { // Alternative format
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };

  // Skills and bio
  skills?: string[];
  bio?: string;

  // Education / Qualifications
  qualifications?: Array<{
    degree?: string;
    institution?: string;
    year?: number;
    field?: string;
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
    year?: number;
    field?: string;
  }>;

  // Experience
  experience?: Array<{
    company?: string;
    position?: string;
    startDate?: string | Date;
    endDate?: string | Date;
    current?: boolean;
  }>;

  // Family
  family?: Array<{
    name?: string;
    relationship?: string;
    phone?: string;
    contact?: string; // Alternative
  }>;

  // Documents
  documents?: any[];

  // Timestamps
  createdAt: string | Date;
  updatedAt: string | Date;
  isDeleted?: boolean;
}

export interface ProfileStats {
  totalProfiles: number;
  activeProfiles: number;
  inactiveProfiles: number;
  newProfiles: number;
  byDepartment: Array<{
    _id: string;
    count: number;
  }>;
  byRole: Array<{
    _id: string;
    count: number;
  }>;
}

export interface ProfileFilters {
  status?: string;
  department?: string;
  role?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * REST API based Profile Hook
 * Uses standard HTTP requests instead of Socket.IO
 */
export const useProfileRest = () => {
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user profile
  const fetchCurrentUserProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useProfileRest] Fetching current user profile');
      const response = await get<Profile>('/user-profile/current');

      if (response.success && response.data) {
        console.log('[useProfileRest] Profile data received:', response.data);
        setCurrentUserProfile(response.data);
        setError(null);
      } else {
        const errorMsg = response.error?.message || 'Failed to get profile';
        console.error('[useProfileRest] Failed to get profile:', errorMsg);
        setError(errorMsg);
        setCurrentUserProfile(null);
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      console.error('[useProfileRest] Error fetching profile:', err);
      setError(errorMsg);
      setCurrentUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update current user profile
  const updateCurrentUserProfile = useCallback(async (updateData: Partial<Profile>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useProfileRest] Updating profile:', updateData);
      const response = await put<Profile>('/user-profile/current', updateData);

      if (response.success && response.data) {
        console.log('[useProfileRest] Profile updated successfully:', response.data);
        message.success('Profile updated successfully!');
        setCurrentUserProfile(response.data);
        setError(null);
        return true;
      } else {
        const errorMsg = response.error?.message || 'Failed to update profile';
        console.error('[useProfileRest] Failed to update profile:', errorMsg);
        message.error(`Failed to update profile: ${errorMsg}`);
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      console.error('[useProfileRest] Error updating profile:', err);
      message.error(`Failed to update profile: ${errorMsg}`);
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (passwordData: PasswordData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useProfileRest] Changing password');

      // Validate input
      if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
        message.error('All password fields are required');
        return false;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        message.error('New password and confirm password do not match');
        return false;
      }

      if (passwordData.newPassword.length < 6) {
        message.error('New password must be at least 6 characters long');
        return false;
      }

      const response = await post<{ message: string }>('/user-profile/change-password', passwordData);

      if (response.success) {
        console.log('[useProfileRest] Password changed successfully');
        message.success('Password changed successfully!');
        setError(null);
        return true;
      } else {
        const errorMsg = response.error?.message || 'Failed to change password';
        console.error('[useProfileRest] Failed to change password:', errorMsg);
        message.error(`Failed to change password: ${errorMsg}`);
        setError(errorMsg);
        return false;
      }
    } catch (err) {
      const errorMsg = handleApiError(err);
      console.error('[useProfileRest] Error changing password:', err);
      message.error(`Failed to change password: ${errorMsg}`);
      setError(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // Data
    currentUserProfile,
    loading,
    error,

    // Core operations
    fetchCurrentUserProfile,
    updateCurrentUserProfile,
    changePassword,
  };
};
