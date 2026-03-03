/**
 * Time Tracking REST API Hook
 * Provides time tracking functionality via REST API
 * Pure REST - No Socket.IO dependency
 */

import { useState, useCallback, useRef } from 'react';
import { message } from 'antd';
import { get, post, put, del, buildParams, ApiResponse } from '../services/api';

export interface TimeEntry {
  _id: string;
  timeEntryId: string;
  projectId: string;
  taskId?: string;
  milestoneId?: string;
  userId: string;
  description: string;
  duration: number;
  billable: boolean;
  billRate: number;
  date: string;
  startTime?: string;
  endTime?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  approvedBy?: string;
  approvedDate?: string;
  rejectionReason?: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
  isEditable?: boolean;
  isOverdue?: boolean;
  billedAmount?: number;
  projectDetails?: {
    projectId: string;
    name: string;
  };
  taskDetails?: {
    title: string;
    status: string;
  };
  userDetails?: {
    firstName?: string;
    lastName?: string;
    employeeId?: string;
    userId?: string;
    avatar?: string | null;
  };
}

export interface TimeEntryFilters {
  page?: number;
  limit?: number;
  userId?: string;
  projectId?: string;
  taskId?: string;
  status?: string;
  billable?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  startDate?: string;
  endDate?: string;
}

export interface TimesheetData {
  entries: TimeEntry[];
  groupedByDate: Record<string, TimeEntry[]>;
  totals: {
    totalHours: number;
    billableHours: number;
    totalEntries: number;
    billedAmount: number;
  };
}

export interface TimeTrackingStats {
  totalHours: number;
  billableHours: number;
  totalEntries: number;
  draftEntries: number;
  submittedEntries: number;
  approvedEntries: number;
  rejectedEntries: number;
  totalBilledAmount: number;
  topUsers: Array<{
    _id: string;
    totalHours: number;
    entryCount: number;
  }>;
}

/**
 * Time Tracking REST API Hook
 */
export const useTimeTrackingREST = () => {
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [stats, setStats] = useState<TimeTrackingStats | null>(null);
  const [timesheet, setTimesheet] = useState<TimesheetData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store current filters for re-fetching after mutations (ref avoids causing re-renders/loop)
  const currentFiltersRef = useRef<TimeEntryFilters>({ page: 1, limit: 50 });

  /**
   * Fetch time entries with optional filters
   */
  const fetchTimeEntries = useCallback(async (filters: TimeEntryFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<TimeEntry[]> = await get('/timetracking', { params });

      if (response.success && response.data) {
        setTimeEntries(response.data);
        currentFiltersRef.current = { ...currentFiltersRef.current, ...filters };
      } else {
        throw new Error(response.error?.message || 'Failed to fetch time entries');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch time entries';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch time entries for Project Managers / Team Leaders
   * Hits the same GET /timetracking endpoint — backend scopes results to PM/TL's managed projects automatically.
   * Use instead of fetchTimeEntries when the caller is a PM or TL (not admin/hr).
   */
  const fetchManagedTimeEntries = useCallback(async (filters: TimeEntryFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<TimeEntry[]> = await get('/timetracking', { params });

      if (response.success && response.data) {
        setTimeEntries(response.data);
        currentFiltersRef.current = { ...currentFiltersRef.current, ...filters };
      } else {
        throw new Error(response.error?.message || 'Failed to fetch managed time entries');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch managed time entries';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch statistics
   */
  const fetchStats = useCallback(async (filters: Omit<TimeEntryFilters, 'page' | 'limit' | 'sortBy' | 'sortOrder'> = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<TimeTrackingStats> = await get('/timetracking/stats', { params });

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[useTimeTrackingREST] Failed to fetch stats:', err);
    }
  }, []);

  /**
   * Get time entry by ID
   */
  const getTimeEntryById = useCallback(async (timeEntryId: string): Promise<TimeEntry | null> => {
    try {
      const response: ApiResponse<TimeEntry> = await get(`/timetracking/${timeEntryId}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch time entry');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch time entry';
      message.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Get time entries by user
   */
  const getTimeEntriesByUser = useCallback(async (userId: string, filters: Omit<TimeEntryFilters, 'userId'> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<TimeEntry[]> = await get(`/timetracking/user/${userId}`, { params });

      if (response.success && response.data) {
        setTimeEntries(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch user time entries');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch user time entries';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get time entries by project
   */
  const getTimeEntriesByProject = useCallback(async (projectId: string, filters: Omit<TimeEntryFilters, 'projectId'> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<TimeEntry[]> = await get(`/timetracking/project/${projectId}`, { params });

      if (response.success && response.data) {
        setTimeEntries(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch project time entries');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch project time entries';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get time entries by task
   */
  const getTimeEntriesByTask = useCallback(async (taskId: string, filters: Omit<TimeEntryFilters, 'taskId'> = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<TimeEntry[]> = await get(`/timetracking/task/${taskId}`, { params });

      if (response.success && response.data) {
        setTimeEntries(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch task time entries');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch task time entries';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get timesheet
   */
  const getTimesheet = useCallback(async (userId: string, startDate?: string, endDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response: ApiResponse<TimesheetData> = await get(`/timetracking/timesheet/${userId}`, { params });

      if (response.success && response.data) {
        setTimesheet(response.data);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch timesheet');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch timesheet';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create time entry
   */
  const createTimeEntry = useCallback(async (timeEntryData: Partial<TimeEntry>): Promise<boolean> => {
    try {
      const response: ApiResponse<TimeEntry> = await post('/timetracking', timeEntryData);

      if (response.success && response.data) {
        message.success('Time entry created successfully!');
        // Manually add to state since we don't use Socket.IO
        setTimeEntries(prev => [...prev, response.data!]);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to create time entry');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to create time entry';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Update time entry
   */
  const updateTimeEntry = useCallback(async (timeEntryId: string, updateData: Partial<TimeEntry>): Promise<boolean> => {
    try {
      const response: ApiResponse<TimeEntry> = await put(`/timetracking/${timeEntryId}`, updateData);

      if (response.success && response.data) {
        message.success('Time entry updated successfully!');
        // Manually update state since we don't use Socket.IO
        setTimeEntries(prev =>
          prev.map(entry => (entry._id === timeEntryId ? { ...entry, ...response.data! } : entry))
        );
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update time entry');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update time entry';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Delete time entry
   */
  const deleteTimeEntry = useCallback(async (timeEntryId: string): Promise<boolean> => {
    try {
      const response: ApiResponse = await del(`/timetracking/${timeEntryId}`);

      if (response.success) {
        message.success('Time entry deleted successfully!');
        // Manually remove from state since we don't use Socket.IO
        setTimeEntries(prev => prev.filter(entry => entry._id !== timeEntryId));
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete time entry');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete time entry';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Submit timesheet
   */
  const submitTimesheet = useCallback(async (timeEntryIds?: string[]): Promise<boolean> => {
    try {
      const response: ApiResponse<{ submittedCount: number }> = await post('/timetracking/submit', { timeEntryIds });

      if (response.success) {
        message.success(`Timesheet submitted successfully! (${response.data?.submittedCount || 0} entries)`);
        // Update the status of submitted entries
        if (timeEntryIds && timeEntryIds.length > 0) {
          setTimeEntries(prev =>
            prev.map(entry =>
              timeEntryIds.includes(entry._id) ? { ...entry, status: 'Submitted' as const } : entry
            )
          );
        } else {
          // All entries were submitted
          setTimeEntries(prev =>
            prev.map(entry => ({ ...entry, status: 'Submitted' as const }))
          );
        }
        return true;
      }
      throw new Error(response.error?.message || 'Failed to submit timesheet');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to submit timesheet';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Approve timesheet (admin only)
   */
  const approveTimesheet = useCallback(async (userId: string, timeEntryIds?: string[]): Promise<boolean> => {
    try {
      const response: ApiResponse<{ approvedCount: number }> = await post('/timetracking/approve', { userId, timeEntryIds });

      if (response.success) {
        message.success(`Timesheet approved successfully! (${response.data?.approvedCount || 0} entries)`);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to approve timesheet');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to approve timesheet';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Reject timesheet (admin only)
   */
  const rejectTimesheet = useCallback(async (userId: string, timeEntryIds?: string[], reason?: string): Promise<boolean> => {
    try {
      const response: ApiResponse<{ rejectedCount: number }> = await post('/timetracking/reject', { userId, timeEntryIds, reason });

      if (response.success) {
        message.success(`Timesheet rejected successfully! (${response.data?.rejectedCount || 0} entries)`);
        return true;
      }
      throw new Error(response.error?.message || 'Failed to reject timesheet');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to reject timesheet';
      message.error(errorMessage);
      return false;
    }
  }, []);

  // No Socket.IO listeners - using pure REST with manual state updates

  return {
    timeEntries,
    stats,
    timesheet,
    loading,
    error,
    fetchTimeEntries,
    fetchManagedTimeEntries,
    fetchStats,
    getTimeEntryById,
    getTimeEntriesByUser,
    getTimeEntriesByProject,
    getTimeEntriesByTask,
    getTimesheet,
    createTimeEntry,
    updateTimeEntry,
    deleteTimeEntry,
    submitTimesheet,
    approveTimesheet,
    rejectTimesheet
  };
};

export default useTimeTrackingREST;
