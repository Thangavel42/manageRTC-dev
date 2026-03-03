/**
 * Leave Type REST API Hook
 * Provides CRUD operations for leave type management
 * Fully integrated with backend Leave Type API
 * Real-time updates via Socket.IO event listeners
 */

import { message } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { ApiResponse, buildParams, del, get, patch, post, put } from '../services/api';
import { useSocket } from '../SocketContext';

/**
 * Leave Type interface matching backend schema
 */
export interface LeaveType {
  _id?: string;
  leaveTypeId: string;
  companyId: string;
  name: string;
  code: string;
  // Quota configuration
  annualQuota: number;
  isPaid: boolean;
  requiresApproval: boolean;
  // Carry forward configuration
  carryForwardAllowed: boolean;
  maxCarryForwardDays: number;
  carryForwardExpiry: number;
  // Encashment configuration
  encashmentAllowed: boolean;
  maxEncashmentDays: number;
  encashmentRatio: number;
  // Restriction configuration
  minNoticeDays: number;
  maxConsecutiveDays: number;
  requiresDocument: boolean;
  acceptableDocuments: string[];
  // Accrual rules
  accrualRate: number;
  accrualMonth: number;
  accrualWaitingPeriod: number;
  // Display configuration
  color: string;
  icon: string;
  description: string;
  // System fields
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Leave Type dropdown option for selects
 */
export interface LeaveTypeOption {
  value: string;   // ObjectId (as string) for the leave type reference
  label: string;   // Display name (e.g., "Annual Leave")
  code?: string;   // Backend code (e.g., "EARNED") - for backward compatibility
  color: string;
  icon: string;
  requiresApproval: boolean;
  isPaid: boolean;
}

/**
 * Leave Type Statistics
 */
export interface LeaveTypeStats {
  total: number;
  active: number;
  inactive: number;
  paid: number;
  unpaid: number;
  requireApproval: number;
  allowCarryForward: number;
  allowEncashment: number;
  requireDocument: number;
}

/**
 * Transform backend leave type data to frontend format
 */
const transformLeaveTypeData = (backendLeaveType: any): LeaveType => {
  return {
    ...backendLeaveType,
    code: backendLeaveType.code || backendLeaveType.name?.toUpperCase().replace(/\s+/g, '_'),
  };
};

/**
 * Leave Type REST API Hook
 */
export const useLeaveTypesREST = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [activeOptions, setActiveOptions] = useState<LeaveTypeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  /**
   * Fetch all leave types with pagination and filtering
   */
  const fetchLeaveTypes = useCallback(async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'all';
    sortBy?: string;
    order?: 'asc' | 'desc';
  } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildParams({
        page: params.page || pagination.page,
        limit: params.limit || pagination.limit,
        ...params,
      });

      const response: ApiResponse<LeaveType[]> = await get('/leave-types', { params: queryParams });

      if (response.success && response.data) {
        const transformedLeaveTypes = response.data.map(transformLeaveTypeData);
        setLeaveTypes(transformedLeaveTypes);
        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            limit: response.pagination.limit,
            total: response.pagination.total,
            pages: response.pagination.totalPages || 0,
          });
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch leave types');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch leave types';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  /**
   * Fetch active leave types for dropdowns/selects
   */
  const fetchActiveLeaveTypes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<LeaveTypeOption[]> = await get('/leave-types/active');

      if (response.success && response.data) {
        setActiveOptions(response.data);
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch active leave types');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch active leave types';
      setError(errorMessage);
      message.error(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch leave type by ID
   */
  const fetchLeaveTypeById = useCallback(async (id: string): Promise<LeaveType | null> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<LeaveType> = await get(`/leave-types/${id}`);

      if (response.success && response.data) {
        return transformLeaveTypeData(response.data);
      }
      throw new Error(response.error?.message || 'Failed to fetch leave type');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch leave type';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new leave type
   */
  const createLeaveType = useCallback(async (leaveTypeData: Partial<LeaveType>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<LeaveType> = await post('/leave-types', leaveTypeData);

      if (response.success && response.data) {
        message.success('Leave type created successfully!');
        setLeaveTypes(prev => [...prev, transformLeaveTypeData(response.data!)]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create leave type');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create leave type';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update leave type
   */
  const updateLeaveType = useCallback(async (leaveTypeId: string, updateData: Partial<LeaveType>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<LeaveType> = await put(`/leave-types/${leaveTypeId}`, updateData);

      if (response.success && response.data) {
        message.success('Leave type updated successfully!');
        setLeaveTypes(prev =>
          prev.map(lt => (lt._id === leaveTypeId || lt.leaveTypeId === leaveTypeId) ? { ...lt, ...transformLeaveTypeData(response.data!) } : lt)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update leave type');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update leave type';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Toggle leave type active status
   */
  const toggleLeaveTypeStatus = useCallback(async (leaveTypeId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<LeaveType> = await patch(`/leave-types/${leaveTypeId}/toggle`, {});

      if (response.success && response.data) {
        message.success(`Leave type ${response.data.isActive ? 'activated' : 'deactivated'} successfully!`);
        setLeaveTypes(prev =>
          prev.map(lt => (lt._id === leaveTypeId || lt.leaveTypeId === leaveTypeId) ? { ...lt, ...transformLeaveTypeData(response.data!) } : lt)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to toggle leave type status');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to toggle leave type status';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete leave type (soft delete)
   */
  const deleteLeaveType = useCallback(async (leaveTypeId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<{ leaveTypeId: string; isDeleted: boolean }> = await del(`/leave-types/${leaveTypeId}`);

      if (response.success) {
        message.success('Leave type deleted successfully');
        setLeaveTypes(prev => prev.filter(lt => lt.leaveTypeId !== leaveTypeId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete leave type');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete leave type';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch leave type statistics
   */
  const fetchStats = useCallback(async (): Promise<LeaveTypeStats | null> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<LeaveTypeStats> = await get('/leave-types/stats');

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      console.error('[useLeaveTypesREST] Failed to fetch stats:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh leave types (re-fetch with current filters)
   */
  const refresh = useCallback(() => {
    fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  // Socket.IO event listeners for real-time updates
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;

    console.log('[useLeaveTypesREST] Setting up Socket.IO listeners for leave type events');

    /**
     * Handle leave type created event
     */
    const handleLeaveTypeCreated = (data: any) => {
      console.log('[useLeaveTypesREST] Leave type created via broadcast:', data);
      // Add new leave type to the list
      setLeaveTypes(prev => [...prev, transformLeaveTypeData(data)]);
      // Refresh active options
      fetchActiveLeaveTypes();
      // Show notification
      message.success(`New leave type created: ${data.name}`);
    };

    /**
     * Handle leave type updated event
     */
    const handleLeaveTypeUpdated = (data: any) => {
      console.log('[useLeaveTypesREST] Leave type updated via broadcast:', data);
      // Update existing leave type in the list
      setLeaveTypes(prev =>
        prev.map(lt => lt.leaveTypeId === data.leaveTypeId ? { ...lt, ...transformLeaveTypeData(data) } : lt)
      );
      // Refresh active options
      fetchActiveLeaveTypes();
      // Show notification
      message.info(`Leave type updated: ${data.name}`);
    };

    /**
     * Handle leave type status toggled event
     */
    const handleLeaveTypeStatusToggled = (data: any) => {
      console.log('[useLeaveTypesREST] Leave type status toggled via broadcast:', data);
      // Update existing leave type in the list
      setLeaveTypes(prev =>
        prev.map(lt => lt.leaveTypeId === data.leaveTypeId ? { ...lt, isActive: data.isActive, updatedAt: data.timestamp } : lt)
      );
      // Refresh active options
      fetchActiveLeaveTypes();
      // Show notification
      message.info(`Leave type ${data.isActive ? 'activated' : 'deactivated'}: ${data.name}`);
    };

    /**
     * Handle leave type deleted event
     */
    const handleLeaveTypeDeleted = (data: any) => {
      console.log('[useLeaveTypesREST] Leave type deleted via broadcast:', data);
      // Remove from list
      setLeaveTypes(prev => prev.filter(lt => lt.leaveTypeId !== data.leaveTypeId));
      // Refresh active options
      fetchActiveLeaveTypes();
      // Show notification
      message.info(`Leave type deleted: ${data.name}`);
    };

    // Listen for Socket.IO broadcast events
    socket.on('leaveType:created', handleLeaveTypeCreated);
    socket.on('leaveType:updated', handleLeaveTypeUpdated);
    socket.on('leaveType:status_toggled', handleLeaveTypeStatusToggled);
    socket.on('leaveType:deleted', handleLeaveTypeDeleted);

    return () => {
      console.log('[useLeaveTypesREST] Cleaning up Socket.IO listeners');
      socket.off('leaveType:created', handleLeaveTypeCreated);
      socket.off('leaveType:updated', handleLeaveTypeUpdated);
      socket.off('leaveType:status_toggled', handleLeaveTypeStatusToggled);
      socket.off('leaveType:deleted', handleLeaveTypeDeleted);
    };
  }, [socket, fetchActiveLeaveTypes]);

  return {
    leaveTypes,
    activeOptions,
    loading,
    error,
    pagination,
    fetchLeaveTypes,
    fetchActiveLeaveTypes,
    fetchLeaveTypeById,
    createLeaveType,
    updateLeaveType,
    toggleLeaveTypeStatus,
    deleteLeaveType,
    fetchStats,
    refresh,
  };
};

export default useLeaveTypesREST;
