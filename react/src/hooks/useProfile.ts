import { useState, useCallback, useEffect } from 'react';
import { useSocket } from '../SocketContext';
import { message } from 'antd';
import { Socket } from 'socket.io-client';

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
  salary?: number;
  role: string;
  employmentType?: string;
  status: 'Active' | 'Inactive' | 'Probation' | 'Resigned' | 'Terminated' | 'On Leave';
  reportingManager?: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    employeeId: string;
    email: string;
  } | null;
  about?: string;
  // Contact information
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  // Social links
  socialLinks?: {
    linkedin: string;
    twitter: string;
    facebook: string;
    instagram: string;
  };
  // Skills and bio
  skills?: string[];
  bio?: string;
  // Education
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
    contact?: string;
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

export const useProfile = () => {
  const socket = useSocket() as Socket | null;
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Fetch all profile data (profiles + stats) - admin/HR only
  const fetchAllData = useCallback((filters: ProfileFilters = {}) => {
    if (!socket) {
      console.warn('[useProfile] Socket not available');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('[useProfile] Fetching all profile data with filters:', filters);
    socket.emit('profile:getAllData', filters);
  }, [socket]);

  // Fetch current user profile - accessible by all users
  const fetchCurrentUserProfile = useCallback(() => {
    if (!socket) {
      console.warn('[useProfile] Socket not available');
      return;
    }

    setLoading(true);
    setError(null);
    console.log('[useProfile] Fetching current user profile');
    socket.emit('profile:getCurrentUser');
  }, [socket]);

  // Create profile - admin/HR only
  const createProfile = useCallback(async (profileData: Partial<Profile>): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useProfile] Creating profile:', profileData);
      socket.emit('profile:create', profileData);

      const handleResponse = (response: any) => {
        console.log('[useProfile] Profile create response received:', response);
        if (response.done) {
          console.log('[useProfile] Profile created successfully:', response.data);
          message.success('Profile created successfully!');
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useProfile] Failed to create profile:', response.error);
          message.error(`Failed to create profile: ${response.error}`);
          resolve(false);
        }
        socket.off('profile:create-response', handleResponse);
      };

      socket.on('profile:create-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // Update profile - admin/HR only
  const updateProfile = useCallback(async (profileId: string, updateData: Partial<Profile>): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useProfile] Updating profile:', { profileId, updateData });
      socket.emit('profile:update', { _id: profileId, ...updateData });

      const handleResponse = (response: any) => {
        console.log('[useProfile] Profile update response received:', response);
        if (response.done) {
          console.log('[useProfile] Profile updated successfully:', response.data);
          message.success('Profile updated successfully!');
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useProfile] Failed to update profile:', response.error);
          message.error(`Failed to update profile: ${response.error}`);
          resolve(false);
        }
        socket.off('profile:update-response', handleResponse);
      };

      socket.on('profile:update-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // Update current user profile - accessible by all users
  const updateCurrentUserProfile = useCallback(async (updateData: Partial<Profile>): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useProfile] Updating current user profile:', updateData);
      socket.emit('profile:updateCurrentUser', updateData);

      const handleResponse = (response: any) => {
        console.log('[useProfile] Current user profile update response received:', response);
        if (response.done) {
          console.log('[useProfile] Current user profile updated successfully:', response.data);
          message.success('Profile updated successfully!');
          setCurrentUserProfile(response.data);
          resolve(true);
        } else {
          console.error('[useProfile] Failed to update current user profile:', response.error);
          message.error(`Failed to update profile: ${response.error}`);
          resolve(false);
        }
        socket.off('profile:updateCurrentUser-response', handleResponse);
      };

      socket.on('profile:updateCurrentUser-response', handleResponse);
    });
  }, [socket]);

  // Delete profile - admin only
  const deleteProfile = useCallback(async (profileId: string): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useProfile] Deleting profile:', profileId);
      socket.emit('profile:delete', profileId);

      const handleResponse = (response: any) => {
        console.log('[useProfile] Profile delete response received:', response);
        if (response.done) {
          console.log('[useProfile] Profile deleted successfully:', response.data);
          message.success('Profile deleted successfully!');
          fetchAllData(); // Refresh data
          resolve(true);
        } else {
          console.error('[useProfile] Failed to delete profile:', response.error);
          message.error(`Failed to delete profile: ${response.error}`);
          resolve(false);
        }
        socket.off('profile:delete-response', handleResponse);
      };

      socket.on('profile:delete-response', handleResponse);
    });
  }, [socket, fetchAllData]);

  // Get profile by ID - admin/HR only
  const getProfileById = useCallback(async (profileId: string): Promise<Profile | null> => {
    if (!socket) {
      message.error('Socket connection not available');
      return null;
    }

    return new Promise((resolve) => {
      console.log('[useProfile] Getting profile by ID:', profileId);
      socket.emit('profile:getById', profileId);

      const handleResponse = (response: any) => {
        console.log('[useProfile] Profile getById response received:', response);
        if (response.done) {
          console.log('[useProfile] Profile retrieved successfully:', response.data);
          resolve(response.data);
        } else {
          console.error('[useProfile] Failed to get profile:', response.error);
          message.error(`Failed to get profile: ${response.error}`);
          resolve(null);
        }
        socket.off('profile:getById-response', handleResponse);
      };

      socket.on('profile:getById-response', handleResponse);
    });
  }, [socket]);

  // Filter profiles - admin/HR only
  const filterProfiles = useCallback((filters: ProfileFilters) => {
    console.log('[useProfile] Filtering profiles with:', filters);
    fetchAllData(filters);
  }, [fetchAllData]);

  // Change password - accessible by all users
  const changePassword = useCallback(async (passwordData: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }): Promise<boolean> => {
    if (!socket) {
      message.error('Socket connection not available');
      return false;
    }

    return new Promise((resolve) => {
      console.log('[useProfile] Changing password');
      socket.emit('profile:changePassword', passwordData);

      const handleResponse = (response: any) => {
        console.log('[useProfile] Change password response received:', response);
        if (response.done) {
          console.log('[useProfile] Password changed successfully');
          message.success('Password changed successfully!');
          resolve(true);
        } else {
          console.error('[useProfile] Failed to change password:', response.error);
          message.error(`Failed to change password: ${response.error}`);
          resolve(false);
        }
        socket.off('profile:changePassword-response', handleResponse);
      };

      socket.on('profile:changePassword-response', handleResponse);
    });
  }, [socket]);

  // Set up socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleGetAllDataResponse = (response: any) => {
      console.log('[useProfile] getAllData response received:', response);
      setLoading(false);
      if (response.done) {
        console.log('[useProfile] Profiles data received:', response.data.profiles);
        console.log('[useProfile] Stats data received:', response.data.stats);
        setProfiles(response.data.profiles || []);
        setStats(response.data.stats || {});
        setError(null);
      } else {
        console.error('[useProfile] Failed to get profiles data:', response.error);
        setError(response.error);
        setProfiles([]);
        setStats(null);
      }
    };

    const handleGetCurrentUserResponse = (response: any) => {
      console.log('[useProfile] getCurrentUser response received:', response);
      setLoading(false);
      if (response.done) {
        console.log('[useProfile] Current user profile data received:', response.data);
        setCurrentUserProfile(response.data);
        setError(null);
      } else {
        console.error('[useProfile] Failed to get current user profile:', response.error);
        setError(response.error);
        setCurrentUserProfile(null);
      }
    };

    const handleGetAllResponse = (response: any) => {
      console.log('[useProfile] getAll response received:', response);
      setLoading(false);
      if (response.done) {
        console.log('[useProfile] Profiles data received:', response.data);
        setProfiles(response.data || []);
        setError(null);
      } else {
        console.error('[useProfile] Failed to get profiles:', response.error);
        setError(response.error);
        setProfiles([]);
      }
    };

    const handleGetStatsResponse = (response: any) => {
      console.log('[useProfile] getStats response received:', response);
      if (response.done) {
        console.log('[useProfile] Stats data received:', response.data);
        setStats(response.data || {});
      } else {
        console.error('[useProfile] Failed to get stats:', response.error);
      }
    };

    // Listen for real-time updates
    const handleProfileCreated = (response: any) => {
      if (response.done && response.data) {
        console.log('[useProfile] Profile created via broadcast:', response.data);
        fetchAllData();
      }
    };

    const handleProfileUpdated = (response: any) => {
      if (response.done && response.data) {
        console.log('[useProfile] Profile updated via broadcast:', response.data);
        fetchAllData();
        // Also update current user profile if it's the same user
        if (currentUserProfile && response.data.userId === currentUserProfile.userId) {
          setCurrentUserProfile(response.data);
        }
      }
    };

    const handleProfileDeleted = (response: any) => {
      if (response.done && response.data) {
        console.log('[useProfile] Profile deleted via broadcast:', response.data);
        fetchAllData();
      }
    };

    socket.on('profile:getAllData-response', handleGetAllDataResponse);
    socket.on('profile:getCurrentUser-response', handleGetCurrentUserResponse);
    socket.on('profile:getAll-response', handleGetAllResponse);
    socket.on('profile:getStats-response', handleGetStatsResponse);
    socket.on('profile:profile-created', handleProfileCreated);
    socket.on('profile:profile-updated', handleProfileUpdated);
    socket.on('profile:profile-deleted', handleProfileDeleted);

    return () => {
      socket.off('profile:getAllData-response', handleGetAllDataResponse);
      socket.off('profile:getCurrentUser-response', handleGetCurrentUserResponse);
      socket.off('profile:getAll-response', handleGetAllResponse);
      socket.off('profile:getStats-response', handleGetStatsResponse);
      socket.off('profile:profile-created', handleProfileCreated);
      socket.off('profile:profile-updated', handleProfileUpdated);
      socket.off('profile:profile-deleted', handleProfileDeleted);
    };
  }, [socket, fetchAllData, currentUserProfile]);

  // Export profiles as PDF - admin/HR only
  const exportPDF = useCallback(async () => {
    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setExporting(true);
    try {
      console.log("Starting PDF export...");
      socket.emit("profile:export-pdf");

      const handlePDFResponse = (response: any) => {
        if (response.done) {
          console.log("PDF generated successfully:", response.data.pdfUrl);
          const link = document.createElement('a');
          link.href = response.data.pdfUrl;
          link.download = `profiles_${Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success("PDF exported successfully!");
        } else {
          console.error("PDF export failed:", response.error);
          message.error(`PDF export failed: ${response.error}`);
        }
        setExporting(false);
        socket.off("profile:export-pdf-response", handlePDFResponse);
      };

      socket.on("profile:export-pdf-response", handlePDFResponse);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      message.error("Failed to export PDF");
      setExporting(false);
    }
  }, [socket]);

  // Export profiles as Excel - admin/HR only
  const exportExcel = useCallback(async () => {
    if (!socket) {
      message.error("Socket connection not available");
      return;
    }

    setExporting(true);
    try {
      console.log("Starting Excel export...");
      socket.emit("profile:export-excel");

      const handleExcelResponse = (response: any) => {
        if (response.done) {
          console.log("Excel generated successfully:", response.data.excelUrl);
          const link = document.createElement('a');
          link.href = response.data.excelUrl;
          link.download = `profiles_${Date.now()}.xlsx`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          message.success("Excel exported successfully!");
        } else {
          console.error("Excel export failed:", response.error);
          message.error(`Excel export failed: ${response.error}`);
        }
        setExporting(false);
        socket.off("profile:export-excel-response", handleExcelResponse);
      };

      socket.on("profile:export-excel-response", handleExcelResponse);
    } catch (error) {
      console.error("Error exporting Excel:", error);
      message.error("Failed to export Excel");
      setExporting(false);
    }
  }, [socket]);

  return {
    // Data
    profiles,
    stats,
    currentUserProfile,
    loading,
    error,
    exporting,
    
    // Core operations
    fetchAllData,
    fetchCurrentUserProfile,
    createProfile,
    updateProfile,
    updateCurrentUserProfile,
    deleteProfile,
    getProfileById,
    
    // Filtering and utilities
    filterProfiles,
    changePassword,
    
    // Export functionality
    exportPDF,
    exportExcel,
  };
};