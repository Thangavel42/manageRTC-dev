/**
 * Custom Leave Policies REST Hook
 *
 * Provides methods for CRUD operations on custom leave policies
 */

import { message } from 'antd';
import { useCallback, useState } from 'react';
import { del, get, post, put } from '../services/api';
import { useAuth } from './useAuth';

// API Base URL - Backend mounts at /api/leaves (plural)
const API_BASE = '/leaves/custom-policies';

// Types

// Leave type details (enriched from leaveTypes collection)
export interface LeaveTypeDetails {
  _id: string;
  name: string;
  code: string;
  color?: string;
}

export interface CustomPolicy {
  _id: string;
  name: string;
  leaveTypeId: string; // ObjectId reference to leaveTypes collection
  leaveType?: LeaveTypeDetails; // Enriched leave type details
  annualQuota: number; // Custom annual quota (OVERWRITES leaveType.annualQuota)
  employeeIds: string[];
  settings?: {
    carryForward?: boolean;
    maxCarryForwardDays?: number;
    isEarnedLeave?: boolean;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // ObjectId reference to employees collection
  updatedBy?: string; // ObjectId reference to employees collection
}

export interface CustomPolicyFormData {
  name: string;
  leaveTypeId: string; // ObjectId reference to leaveTypes collection
  annualQuota: number; // Custom annual quota
  employeeIds: string[];
  settings?: {
    carryForward?: boolean;
    maxCarryForwardDays?: number;
    isEarnedLeave?: boolean;
  };
}

export interface CustomPolicyStats {
  totalPolicies: number;
  policiesByType: Array<{
    _id: string;
    count: number;
  }>;
}

/**
 * Custom Policies Hook
 */
export const useCustomPolicies = () => {
  const [policies, setPolicies] = useState<CustomPolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<CustomPolicyStats | null>(null);
  const { userId: _userId } = useAuth();

  /**
   * Fetch all custom policies
   * @param filters - Optional filters: leaveTypeId (ObjectId), employeeId
   */
  const fetchPolicies = useCallback(async (filters?: { leaveTypeId?: string; employeeId?: string }) => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (filters?.leaveTypeId) params.leaveTypeId = filters.leaveTypeId;
      if (filters?.employeeId) params.employeeId = filters.employeeId;

      const response = await get<CustomPolicy[]>(API_BASE, params);

      if (response.success && response.data) {
        setPolicies(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch policies');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch policies';
      setError(errorMsg);
      message.error(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch policies for a specific employee
   */
  const fetchEmployeePolicies = useCallback(async (employeeId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await get<CustomPolicy[]>(`${API_BASE}/employee/${employeeId}`);

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch employee policies');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch employee policies';
      setError(errorMsg);
      message.error(errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch policy statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const response = await get<CustomPolicyStats>(`${API_BASE}/stats`);

      if (response.success && response.data) {
        setStats(response.data);
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to fetch stats');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to fetch stats';
      message.error(errorMsg);
      return null;
    }
  }, []);

  /**
   * Create a new custom policy
   */
  const createPolicy = useCallback(async (policyData: CustomPolicyFormData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await post<CustomPolicy>(API_BASE, policyData);

      if (response.success && response.data) {
        message.success(`Custom policy "${policyData.name}" created successfully`);
        await fetchPolicies();
        await fetchStats();
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to create custom policy');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to create custom policy';
      setError(errorMsg);
      message.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchPolicies, fetchStats]);

  /**
   * Update a custom policy
   */
  const updatePolicy = useCallback(async (id: string, policyData: Partial<CustomPolicyFormData>) => {
    try {
      setLoading(true);
      setError(null);

      const response = await put<CustomPolicy>(`${API_BASE}/${id}`, policyData);

      if (response.success && response.data) {
        message.success(`Custom policy updated successfully`);
        await fetchPolicies();
        return response.data;
      } else {
        throw new Error(response.message || 'Failed to update custom policy');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to update custom policy';
      setError(errorMsg);
      message.error(errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchPolicies]);

  /**
   * Delete a custom policy
   */
  const deletePolicy = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await del<void>(`${API_BASE}/${id}`);

      if (response.success) {
        message.success('Custom policy deleted successfully');
        await fetchPolicies();
        await fetchStats();
        return true;
      } else {
        throw new Error(response.message || 'Failed to delete custom policy');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to delete custom policy';
      setError(errorMsg);
      message.error(errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchPolicies, fetchStats]);

  return {
    // State
    policies,
    loading,
    error,
    stats,

    // Actions
    fetchPolicies,
    fetchEmployeePolicies,
    fetchStats,
    createPolicy,
    updatePolicy,
    deletePolicy
  };
};

export default useCustomPolicies;
