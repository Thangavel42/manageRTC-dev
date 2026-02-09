/**
 * Custom useTimesheetsREST Hook
 * Provides REST API functions for timesheet management
 * Note: This is a minimal implementation without React Query caching
 * To enable full caching features, install @tanstack/react-query
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { handleApiError } from '../utils/errorHandler';

const API_BASE = '/api/timesheets';

/**
 * Timesheet data types
 */
export interface TimesheetEntry {
  date: string;
  project?: string;
  task?: string;
  description: string;
  hours: number;
  regularHours?: number;
  overtimeHours?: number;
  isBillable?: boolean;
}

export interface Timesheet {
  _id: string;
  timesheetId: string;
  employeeId: string;
  employee?: string;
  weekStartDate: string;
  weekEndDate: string;
  entries: TimesheetEntry[];
  totalHours: number;
  totalRegularHours: number;
  totalOvertimeHours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
  submittedBy?: string;
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalComments?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetListResponse {
  success: boolean;
  data: Timesheet[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  count: number;
}

export interface TimesheetStats {
  total: number;
  pending: number;
  byStatus: Record<string, {
    count: number;
    totalHours: number;
    totalRegularHours: number;
    totalOvertimeHours: number;
  }>;
}

/**
 * Custom hook for timesheet operations
 * Minimal implementation without React Query
 */
export const useTimesheetsREST = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get all timesheets (Admin/HR/Manager)
   */
  const getTimesheets = useCallback(async (params = {}): Promise<TimesheetListResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_BASE, { params });
      return response.data;
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get timesheet by ID
   */
  const getTimesheetById = useCallback(async (id: string): Promise<{ success: boolean; data: Timesheet }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/${id}`);
      return response.data;
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get current user's timesheets
   */
  const getMyTimesheets = useCallback(async (params = {}): Promise<{ success: boolean; data: Timesheet[]; count: number }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/my`, { params });
      return response.data;
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get timesheet statistics
   */
  const getTimesheetStats = useCallback(async (params = {}): Promise<{ success: boolean; data: TimesheetStats }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${API_BASE}/stats`, { params });
      return response.data;
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new timesheet
   */
  const createTimesheet = useCallback(async (data: {
    weekStart: string;
    entries: TimesheetEntry[];
    notes?: string;
  }): Promise<{ success: boolean; data: Timesheet }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(API_BASE, data);
      toast.success('Timesheet created successfully');
      return response.data;
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Update timesheet
   */
  const updateTimesheet = useCallback(async (id: string, data: {
    entries: TimesheetEntry[];
    notes?: string;
  }): Promise<{ success: boolean; data: Timesheet }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.put(`${API_BASE}/${id}`, data);
      toast.success('Timesheet updated successfully');
      return response.data;
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Submit timesheet for approval
   */
  const submitTimesheet = useCallback(async (id: string): Promise<{ success: boolean }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/${id}/submit`);
      toast.success('Timesheet submitted successfully');
      return response.data;
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Approve timesheet
   */
  const approveTimesheet = useCallback(async (id: string, comments?: string): Promise<{ success: boolean }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/${id}/approve`, { comments });
      toast.success('Timesheet approved successfully');
      return response.data;
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reject timesheet
   */
  const rejectTimesheet = useCallback(async (id: string, reason: string): Promise<{ success: boolean }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/${id}/reject`, { reason });
      toast.success('Timesheet rejected successfully');
      return response.data;
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Delete timesheet
   */
  const deleteTimesheet = useCallback(async (id: string): Promise<{ success: boolean }> => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.delete(`${API_BASE}/${id}`);
      toast.success('Timesheet deleted successfully');
      return response.data;
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
      toast.error(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Helper: Calculate week start and end dates from a date
   */
  const getWeekDates = (date: Date = new Date()) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday start

    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
    };
  };

  /**
   * Helper: Check if timesheet can be submitted
   */
  const canSubmit = (timesheet: Timesheet): boolean => {
    return timesheet.status === 'draft' && timesheet.entries.length > 0;
  };

  /**
   * Helper: Check if timesheet can be edited
   */
  const canEdit = (timesheet: Timesheet): boolean => {
    return ['draft', 'rejected'].includes(timesheet.status);
  };

  /**
   * Helper: Get status badge color
   */
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      draft: 'secondary',
      submitted: 'primary',
      approved: 'success',
      rejected: 'danger',
      cancelled: 'dark',
    };
    return colors[status] || 'secondary';
  };

  return {
    // State
    loading,
    error,

    // API functions
    getTimesheets,
    getTimesheetById,
    getMyTimesheets,
    getTimesheetStats,
    createTimesheet,
    updateTimesheet,
    submitTimesheet,
    approveTimesheet,
    rejectTimesheet,
    deleteTimesheet,

    // Helpers
    getWeekDates,
    canSubmit,
    canEdit,
    getStatusColor,
  };
};

export default useTimesheetsREST;
