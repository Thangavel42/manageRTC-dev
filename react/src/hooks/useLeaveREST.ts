/**
 * Leave REST API Hook
 * Replaces Socket.IO-based leave operations with REST API calls
 * Fully integrated with backend Leave API
 * Real-time updates via Socket.IO event listeners
 */

import { message } from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiResponse, buildParams, del, get, patch, post, put } from '../services/api';
import { useSocket } from '../SocketContext';
import { useAuth } from './useAuth';
import { useLeaveTypesREST } from './useLeaveTypesREST';

// Leave Types matching backend schema
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'on-hold';
// @deprecated - Leave types now use ObjectId reference (leaveTypeId) instead of string codes
export type LeaveTypeCode = 'sick' | 'casual' | 'earned' | 'maternity' | 'paternity' | 'bereavement' | 'compensatory' | 'unpaid' | 'special';

export interface Leave {
  _id: string;
  leaveId: string;
  employeeId?: string;
  employeeName?: string;
  // ObjectId-based leave type system
  leaveTypeId?: string;        // ObjectId reference (new)
  leaveType?: LeaveTypeCode;    // Code for backward compatibility (legacy)
  leaveTypeName?: string;       // Display name (e.g., "Annual Leave")
  startDate: string;
  endDate: string;
  duration: number;
  totalDays?: number;
  workingDays?: number;
  reason: string;
  detailedReason?: string;
  status: LeaveStatus;
  employeeStatus?: LeaveStatus;
  managerStatus?: LeaveStatus;
  hrStatus?: LeaveStatus;
  finalStatus?: LeaveStatus;
  reportingManagerId?: string;
  reportingManagerName?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: string;
  approvalComments?: string;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  balanceAtRequest?: number;
  handoverToId?: string;
  handoverToName?: string;
  attachments?: Array<{
    filename: string;
    originalName: string;
    url: string;
  }>;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface LeaveBalance {
  type: string;
  balance: number;
  used: number;
  total: number;
  pending?: number;
  // ObjectId-based system additions
  leaveTypeId?: string;     // ObjectId reference
  leaveTypeName?: string;    // Display name (e.g., "Annual Leave")
  // Custom policy fields
  hasCustomPolicy?: boolean;
  customPolicyId?: string;
  customPolicyName?: string;
}

export interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
  totalPresent?: number;
  plannedLeaves?: number;
  unplannedLeaves?: number;
  pendingRequests?: number;
  totalEmployees?: number;
  employeesOnLeaveToday?: number;
  approvedLeavesToday?: number;
}

// Status display mapping for UI (exported for components that need it)
export const statusDisplayMap: Record<LeaveStatus, { label: string; color: string; badgeClass: string }> = {
  pending: { label: 'Pending', color: 'warning', badgeClass: 'leave-status-warning' },
  approved: { label: 'Approved', color: 'success', badgeClass: 'leave-status-success' },
  rejected: { label: 'Rejected', color: 'danger', badgeClass: 'leave-status-danger' },
  cancelled: { label: 'Cancelled', color: 'default', badgeClass: 'bg-transparent-secondary' },
  'on-hold': { label: 'On Hold', color: 'info', badgeClass: 'bg-transparent-info' },
};

// NOTE: Leave type display map is now created dynamically from database
// Use the getLeaveTypeDisplayMap() helper or import from useLeaveTypesREST

/**
 * Enhanced error message handler for leave operations
 * Provides user-friendly error messages based on error type and status
 */
const getErrorMessage = (err: any): string => {
  // Default error message
  let errorMessage = err.response?.data?.error?.message || err.message || 'An error occurred';

  // Add context-specific messages based on HTTP status
  if (err.response?.status) {
    switch (err.response.status) {
      case 400:
        errorMessage = err.response?.data?.error?.message || 'Invalid request. Please check your input.';
        break;
      case 403:
        errorMessage = 'You do not have permission to perform this action.';
        break;
      case 404:
        errorMessage = 'Leave request not found. It may have been deleted.';
        break;
      case 409:
        errorMessage = err.response?.data?.error?.message || 'A conflict occurred. Please refresh and try again.';
        // Check for overlapping leave errors
        if (errorMessage.toLowerCase().includes('overlap')) {
          errorMessage = 'You have overlapping leave requests for this period.';
        }
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
      default:
        // Use the server's error message if available
        if (err.response?.data?.error?.message) {
          errorMessage = err.response.data.error.message;
        }
    }
  }

  // Handle specific error keywords
  if (errorMessage.toLowerCase().includes('insufficient balance')) {
    errorMessage = 'You do not have sufficient leave balance for this request.';
  } else if (errorMessage.toLowerCase().includes('overlap')) {
    errorMessage = 'You have overlapping leave requests for this period.';
  } else if (errorMessage.toLowerCase().includes('leave type not found')) {
    errorMessage = 'Leave type not found. Please contact HR.';
  } else if (errorMessage.toLowerCase().includes('employee not found')) {
    errorMessage = 'Employee record not found. Please contact HR.';
  }

  return errorMessage;
};

/**
 * Transform backend leave data to frontend format
 */
const transformLeaveData = (backendLeave: any): Leave => {
  const finalStatus = backendLeave.finalStatus || backendLeave.status || 'pending';
  const managerStatus = backendLeave.managerStatus ||
    (backendLeave.status === 'approved' || backendLeave.status === 'rejected' ? backendLeave.status : 'pending');
  return {
    ...backendLeave,
    leaveType: backendLeave.leaveType || 'casual',
    status: finalStatus,
    finalStatus,
    managerStatus,
    employeeStatus: backendLeave.employeeStatus || 'pending',
    hrStatus: backendLeave.hrStatus || 'pending',
  };
};

/**
 * Leave REST API Hook
 */
export const useLeaveREST = () => {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  // Fetch leave types dynamically from database
  const { activeOptions } = useLeaveTypesREST();

  // Create dynamic leave type display map from database
  // Maps both ObjectId (new system) and code (legacy) to display name
  const leaveTypeDisplayMap = useMemo(() => {
    const map: Record<string, string> = {};
    activeOptions.forEach(option => {
      // Map by ObjectId (new system) - primary key
      map[option.value] = option.label;
      // Map by code (legacy) - fallback for backward compatibility
      if (option.code) {
        map[option.code.toLowerCase()] = option.label;
      }
    });
    return map;
  }, [activeOptions]);

  /**
   * Fetch all leaves with pagination and filtering (Admin/HR view)
   */
  const fetchLeaves = useCallback(async (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: LeaveStatus;
    leaveType?: LeaveTypeCode;
    employee?: string;
    startDate?: string;
    endDate?: string;
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

      const response: ApiResponse<Leave[]> = await get('/leaves', { params: queryParams });

      if (response.success && response.data) {
        const transformedLeaves = response.data.map(transformLeaveData);
        setLeaves(transformedLeaves);
        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            limit: response.pagination.limit,
            total: response.pagination.total,
            pages: response.pagination.totalPages || 0,
          });
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch leaves');
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  /**
   * Fetch current user's leaves (Employee view)
   */
  const fetchMyLeaves = useCallback(async (params: {
    page?: number;
    limit?: number;
    status?: LeaveStatus;
    leaveType?: LeaveTypeCode;
  } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildParams({
        page: params.page || 1,
        limit: params.limit || 20,
        ...params,
      });

      const response: ApiResponse<Leave[]> = await get('/leaves/my', { params: queryParams });

      if (response.success && response.data) {
        const transformedLeaves = response.data.map(transformLeaveData);
        setLeaves(transformedLeaves);
        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            limit: response.pagination.limit,
            total: response.pagination.total,
            pages: response.pagination.totalPages || 0,
          });
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch your leaves');
      }
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch leave by ID
   */
  const fetchLeaveById = useCallback(async (id: string): Promise<Leave | null> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Leave> = await get(`/leaves/${id}`);

      if (response.success && response.data) {
        return transformLeaveData(response.data);
      }
      throw new Error(response.error?.message || 'Failed to fetch leave');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new leave request
   */
  const createLeave = useCallback(async (leaveData: Partial<Leave>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Transform display values to backend values
      // Frontend sends leaveType as ObjectId (dropdown value), backend expects leaveTypeId
      const payload = {
        ...leaveData,
        leaveTypeId: leaveData.leaveType || leaveData.leaveTypeId, // ObjectId from dropdown
        startDate: leaveData.startDate ? new Date(leaveData.startDate).toISOString() : undefined,
        endDate: leaveData.endDate ? new Date(leaveData.endDate).toISOString() : undefined,
      };
      // Remove leaveType from payload (legacy field, not used by backend anymore)
      delete (payload as any).leaveType;

      const response: ApiResponse<Leave> = await post('/leaves', payload);

      if (response.success && response.data) {
        message.success('Leave request submitted successfully!');
        setLeaves(prev => [...prev, transformLeaveData(response.data!)]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create leave request');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update leave request
   */
  const updateLeave = useCallback(async (leaveId: string, updateData: Partial<Leave>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...updateData,
        startDate: updateData.startDate ? new Date(updateData.startDate).toISOString() : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate).toISOString() : undefined,
      };

      const response: ApiResponse<Leave> = await put(`/leaves/${leaveId}`, payload);

      if (response.success && response.data) {
        message.success('Leave request updated successfully!');
        setLeaves(prev =>
          prev.map(leave => leave._id === leaveId ? { ...leave, ...transformLeaveData(response.data!) } : leave)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update leave request');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Approve leave request
   */
  const approveLeave = useCallback(async (leaveId: string, comments?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Leave> = await post(`/leaves/${leaveId}/approve`, { comments });

      if (response.success && response.data) {
        setLeaves(prev =>
          prev.map(leave => leave._id === leaveId ? { ...leave, ...transformLeaveData(response.data!) } : leave)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to approve leave');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reject leave request
   */
  const rejectLeave = useCallback(async (leaveId: string, reason: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (!reason || !reason.trim()) {
        message.error('Rejection reason is required');
        return false;
      }

      const response: ApiResponse<Leave> = await post(`/leaves/${leaveId}/reject`, { reason });

      if (response.success && response.data) {
        setLeaves(prev =>
          prev.map(leave => leave._id === leaveId ? { ...leave, ...transformLeaveData(response.data!) } : leave)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to reject leave');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Manager approve/reject action
   */
  const managerActionLeave = useCallback(async (leaveId: string, action: 'approved' | 'rejected', reason?: string, comments?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      if (action === 'rejected' && (!reason || !reason.trim())) {
        message.error('Rejection reason is required');
        return false;
      }

      const response: ApiResponse<Leave> = await patch(`/leaves/${leaveId}/manager-action`, {
        action,
        reason,
        comments,
      });

      if (response.success && response.data) {
        setLeaves(prev =>
          prev.map(leave => leave._id === leaveId ? { ...leave, ...transformLeaveData(response.data!) } : leave)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update manager action');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Cancel leave request
   */
  const cancelLeave = useCallback(async (leaveId: string, reason?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      // Use the dedicated cancel endpoint which properly restores balance
      const response: ApiResponse<Leave> = await post(`/leaves/${leaveId}/cancel`, { reason });

      if (response.success && response.data) {
        message.info('Leave cancelled');
        setLeaves(prev =>
          prev.map(leave => leave._id === leaveId ? { ...leave, ...transformLeaveData(response.data!) } : leave)
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to cancel leave');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete leave request (soft delete)
   */
  const deleteLeave = useCallback(async (leaveId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<{ leaveId: string; isDeleted: boolean }> = await del(`/leaves/${leaveId}`);

      if (response.success) {
        message.success('Leave request deleted successfully');
        setLeaves(prev => prev.filter(leave => leave._id !== leaveId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete leave');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get leave balance
   */
  const getLeaveBalance = useCallback(async (leaveType?: LeaveTypeCode): Promise<LeaveBalance | Record<string, LeaveBalance> | null> => {
    setLoading(true);
    setError(null);
    try {
      const params = leaveType ? { leaveType } : {};
      console.log('[useLeaveREST] getLeaveBalance called with params:', params);

      const response: ApiResponse<any> = await get('/leaves/balance', { params });

      console.log('[useLeaveREST] getLeaveBalance response:', response);
      console.log('[useLeaveREST] response.success:', response.success);
      console.log('[useLeaveREST] response.data:', response.data);

      if (response.success && response.data) {
        console.log('[useLeaveREST] Returning balance data:', response.data);
        return response.data;
      }

      console.error('[useLeaveREST] API returned unsuccessful response:', response);
      throw new Error(response.error?.message || 'Failed to fetch leave balance');
    } catch (err: any) {
      const errorMessage = getErrorMessage(err);
      console.error('[useLeaveREST] Error fetching leave balance:', err);
      setError(errorMessage);
      // Only show error message if not a network/auth error (those are handled globally)
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        message.error(errorMessage);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get leave balance for a specific employee (by MongoDB ObjectId _id)
   * Used by HR/Admin when adding leave for other employees
   */
  const getLeaveBalanceByEmployeeId = useCallback(async (employeeId: string, leaveType?: LeaveTypeCode): Promise<LeaveBalance | Record<string, LeaveBalance> | null> => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { employee: employeeId };
      if (leaveType) {
        params.leaveType = leaveType;
      }
      console.log('[useLeaveREST] getLeaveBalanceByEmployeeId called with params:', params);

      const response: ApiResponse<any> = await get('/leaves/balance', { params });

      console.log('[useLeaveREST] getLeaveBalanceByEmployeeId response:', response);

      if (response.success && response.data) {
        return response.data;
      }

      throw new Error(response.error?.message || 'Failed to fetch leave balance');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch leave balance';
      console.error('[useLeaveREST] Error fetching balance by employeeId:', err);
      setError(errorMessage);
      // Only show error message if not a network/auth error
      if (err.response?.status !== 401 && err.response?.status !== 403) {
        message.error(errorMessage);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch leave statistics
   */
  const fetchStats = useCallback(async (): Promise<LeaveStats | null> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<any> = await get('/leaves/stats');

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      console.error('[useLeaveREST] Failed to fetch stats:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh leaves — increments a counter that callers can add to their useEffect deps
   * to trigger a re-fetch (e.g. useEffect(() => fetchMyLeaves(), [refreshKey]))
   */
  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  // Socket.IO event listeners for real-time updates
  const socket = useSocket();
  const { userId } = useAuth();

  useEffect(() => {
    if (!socket) return;

    console.log('[useLeaveREST] Setting up Socket.IO listeners for leave events');

    /**
     * Handle leave created event
     */
    const handleLeaveCreated = (data: any) => {
      console.log('[useLeaveREST] Leave created via broadcast:', data);
      const leave = transformLeaveData(data);
      // Add new leave if it is not already in the list (prevents duplicates for the creator)
      setLeaves(prev => {
        const exists = prev.some(item => item._id === leave._id || item.leaveId === leave.leaveId);
        return exists ? prev : [...prev, leave];
      });
      // Skip toast for the creator to avoid double notifications (API success + socket broadcast)
      if (data.createdBy !== userId) {
        message.info(`New leave request: ${data.employeeName || 'Employee'} - ${leaveTypeDisplayMap[data.leaveType] || data.leaveType}`);
      }
    };

    /**
     * Handle leave updated event
     */
    const handleLeaveUpdated = (data: any) => {
      console.log('[useLeaveREST] Leave updated via broadcast:', data);
      // Update existing leave in the list
      setLeaves(prev =>
        prev.map(leave => leave._id === data._id || leave.leaveId === data.leaveId ? { ...leave, ...transformLeaveData(data) } : leave)
      );
    };

    /**
     * Handle leave approved event
     */
    const handleLeaveApproved = (data: any) => {
      console.log('[useLeaveREST] Leave approved via broadcast:', data);
      // Update leave status
      setLeaves(prev =>
        prev.map(leave => leave._id === data._id || leave.leaveId === data.leaveId ? { ...leave, ...transformLeaveData(data) } : leave)
      );
      // Show notification
      message.success(`Leave approved: ${data.employeeName || 'Employee'} - ${leaveTypeDisplayMap[data.leaveType] || data.leaveType}`);
    };

    /**
     * Handle leave rejected event
     */
    const handleLeaveRejected = (data: any) => {
      console.log('[useLeaveREST] Leave rejected via broadcast:', data);
      // Update leave status
      setLeaves(prev =>
        prev.map(leave => leave._id === data._id || leave.leaveId === data.leaveId ? { ...leave, ...transformLeaveData(data) } : leave)
      );
      // Show notification
      message.warning(`Leave rejected: ${data.employeeName || 'Employee'} - ${leaveTypeDisplayMap[data.leaveType] || data.leaveType}${data.reason ? ` - ${data.reason}` : ''}`);
    };

    /**
     * Handle leave cancelled event
     */
    const handleLeaveCancelled = (data: any) => {
      console.log('[useLeaveREST] Leave cancelled via broadcast:', data);
      // Update leave status
      setLeaves(prev =>
        prev.map(leave => leave._id === data._id || leave.leaveId === data.leaveId ? { ...leave, ...transformLeaveData(data) } : leave)
      );
      // Show notification
      message.info(`Leave cancelled: ${data.employeeName || 'Employee'} - ${leaveTypeDisplayMap[data.leaveType] || data.leaveType}`);
    };

    /**
     * Handle leave deleted event
     */
    const handleLeaveDeleted = (data: any) => {
      console.log('[useLeaveREST] Leave deleted via broadcast:', data);
      // Remove from list
      setLeaves(prev => prev.filter(leave => leave._id !== data._id && leave.leaveId !== data.leaveId));
      // Show notification
      message.info('Leave request deleted');
    };

    /**
     * Handle leave balance updated event
     */
    const handleBalanceUpdated = (data: any) => {
      console.log('[useLeaveREST] Leave balance updated via broadcast:', data);
      // This could trigger a balance refresh if needed
      // For now, just log it
      message.info(`Leave balance updated for ${data.employeeName || 'Employee'}`);
    };

    /**
     * Handle employee-specific leave approved notification
     */
    const handleYourLeaveApproved = (data: any) => {
      console.log('[useLeaveREST] Your leave approved via broadcast:', data);
      message.success(`Your ${leaveTypeDisplayMap[data.leaveType] || data.leaveType} request has been approved!`);
    };

    /**
     * Handle employee-specific leave rejected notification
     */
    const handleYourLeaveRejected = (data: any) => {
      console.log('[useLeaveREST] Your leave rejected via broadcast:', data);
      message.error(`Your ${leaveTypeDisplayMap[data.leaveType] || data.leaveType} request has been rejected${data.reason ? `: ${data.reason}` : ''}`);
    };

    // Listen for Socket.IO broadcast events
    socket.on('leave:created', handleLeaveCreated);
    socket.on('leave:updated', handleLeaveUpdated);
    socket.on('leave:approved', handleLeaveApproved);
    socket.on('leave:rejected', handleLeaveRejected);
    socket.on('leave:cancelled', handleLeaveCancelled);
    socket.on('leave:deleted', handleLeaveDeleted);
    socket.on('leave:balance_updated', handleBalanceUpdated);
    socket.on('leave:your_leave_approved', handleYourLeaveApproved);
    socket.on('leave:your_leave_rejected', handleYourLeaveRejected);

    return () => {
      console.log('[useLeaveREST] Cleaning up Socket.IO listeners');
      socket.off('leave:created', handleLeaveCreated);
      socket.off('leave:updated', handleLeaveUpdated);
      socket.off('leave:approved', handleLeaveApproved);
      socket.off('leave:rejected', handleLeaveRejected);
      socket.off('leave:cancelled', handleLeaveCancelled);
      socket.off('leave:deleted', handleLeaveDeleted);
      socket.off('leave:balance_updated', handleBalanceUpdated);
      socket.off('leave:your_leave_approved', handleYourLeaveApproved);
      socket.off('leave:your_leave_rejected', handleYourLeaveRejected);
    };
  }, [socket, userId, leaveTypeDisplayMap]);

  return {
    leaves,
    loading,
    error,
    pagination,
    fetchLeaves,
    fetchMyLeaves,
    fetchLeaveById,
    createLeave,
    updateLeave,
    approveLeave,
    rejectLeave,
    managerActionLeave,
    cancelLeave,
    deleteLeave,
    getLeaveBalance,
    getLeaveBalanceByEmployeeId,
    fetchStats,
    refresh,
    refreshKey,
    leaveTypeDisplayMap,
  };
};

export default useLeaveREST;
