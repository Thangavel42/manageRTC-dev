/**
 * Attendance REST API Hook
 * Connects frontend attendance components to backend REST API
 * Provides comprehensive attendance management functionality
 */

import { message } from 'antd';
import { useCallback, useState } from 'react';
import { ApiResponse, buildParams, del as apiDel, get, post, put } from '../services/api';

// Attendance Types
export interface ClockInLocation {
  type: 'office' | 'remote' | 'client-site' | 'other';
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  ipAddress?: string;
  deviceId?: string;
}

export interface ClockInData {
  time?: string;
  location?: ClockInLocation;
  notes?: string;
}

export interface ClockOutData {
  time?: string;
  location?: ClockInLocation;
  notes?: string;
  breakDuration?: number;
}

export interface Attendance {
  _id: string;
  attendanceId?: string;
  employeeId?: string;
  employeeName?: string;
  date: string;
  clockIn?: {
    time: string;
    location?: ClockInLocation;
    notes?: string;
  };
  clockOut?: {
    time: string;
    location?: ClockInLocation;
    notes?: string;
  };
  hoursWorked?: number;
  workHours?: number;
  regularHours?: number;
  overtimeHours?: number;
  status: 'present' | 'absent' | 'half-day' | 'late' | 'early-departure' | 'on-leave' | 'holiday' | 'weekend';
  isLate?: boolean;
  lateMinutes?: number;
  isEarlyDeparture?: boolean;
  earlyDepartureMinutes?: number;
  breakDuration?: number;
  breakStartTime?: string;
  breakEndTime?: string;
  shiftId?: string;
  notes?: string;
  managerNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  onLeave?: number;
  totalHoursWorked: string;
  averageHoursPerDay: string;
  attendanceRate: string;
  lateRate: string;
}

export interface AttendanceFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  employee?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Format date for display
 */
export const formatAttendanceDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Format time for display
 */
export const formatAttendanceTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format hours for display
 */
export const formatHours = (hours: number): string => {
  if (isNaN(hours) || hours === 0) return '0.00';
  return hours.toFixed(2);
};

/**
 * Convert backend attendance to table format
 */
export const toTableFormat = (attendance: Attendance): any => {
  return {
    key: attendance._id,
    Employee: attendance.employeeName || 'Unknown',
    Image: 'user-49.jpg', // TODO: Get from employee data
    Role: 'Employee', // TODO: Get from employee data
    Status: attendance.status.charAt(0).toUpperCase() + attendance.status.slice(1).replace('-', ' '),
    CheckIn: attendance.clockIn?.time ? formatAttendanceTime(attendance.clockIn.time) : '-',
    CheckOut: attendance.clockOut?.time ? formatAttendanceTime(attendance.clockOut.time) : '-',
    Break: attendance.breakDuration ? `${attendance.breakDuration} Min` : '-',
    Late: attendance.lateMinutes ? `${attendance.lateMinutes} Min` : '-',
    ProductionHours: attendance.hoursWorked ? `${formatHours(attendance.hoursWorked)} Hrs` : '0.00 Hrs',
    _original: attendance
  };
};

/**
 * Attendance REST API Hook
 */
export const useAttendanceREST = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [myAttendance, setMyAttendance] = useState<Attendance[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [needsEmployeeSync, setNeedsEmployeeSync] = useState(false);

  /**
   * Sync employee record (create if not exists)
   */
  const syncEmployeeRecord = useCallback(async (): Promise<boolean> => {
    try {
      const response: ApiResponse<any> = await post('/employees/sync-my-employee', {});
      if (response.success) {
        message.success('Employee profile synced successfully!');
        setNeedsEmployeeSync(false);
        return true;
      }
      return false;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to sync employee record';
      message.error(errorMessage);
      return false;
    }
  }, []);

  /**
   * Fetch all attendance records (Admin/HR)
   */
  const fetchAttendance = useCallback(async (filters: AttendanceFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildParams(filters);
      const response: ApiResponse<Attendance[]> = await get('/attendance', { params: queryParams });

      if (response.success && response.data) {
        setAttendance(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch attendance');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch attendance';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get single attendance record by ID
   */
  const getAttendanceById = useCallback(async (id: string): Promise<Attendance | null> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Attendance> = await get(`/attendance/${id}`);

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch attendance');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch attendance';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Clock in (Create attendance record)
   */
  const clockIn = useCallback(async (clockInData?: ClockInData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = {};
      if (clockInData) {
        if (clockInData.time) payload.clockIn = { time: clockInData.time };
        if (clockInData.location) payload.clockIn = { ...payload.clockIn, location: clockInData.location };
        if (clockInData.notes) payload.clockIn = { ...payload.clockIn, notes: clockInData.notes };
      }

      const response: ApiResponse<Attendance> = await post('/attendance', payload);

      if (response.success && response.data) {
        message.success('Clocked in successfully!');
        // Refresh attendance list if we have one
        if (attendance.length > 0) {
          await fetchAttendance();
        }
        return true;
      }
      throw new Error(response.error?.message || 'Failed to clock in');
    } catch (err: any) {
      // Check if employee record doesn't exist
      if (err.response?.data?.error?.code === 'EMPLOYEE_RECORD_NOT_FOUND' && err.response?.data?.error?.needsSync) {
        setNeedsEmployeeSync(true);
        const syncSuccess = await syncEmployeeRecord();
        if (syncSuccess) {
          // Retry clock in after syncing
          return await clockIn(clockInData);
        }
      }

      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to clock in';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [attendance.length, fetchAttendance, syncEmployeeRecord]);

  /**
   * Clock out (Update attendance record)
   */
  const clockOut = useCallback(async (attendanceId: string, clockOutData?: ClockOutData): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = {};
      if (clockOutData) {
        if (clockOutData.time) payload.clockOut = { time: clockOutData.time };
        if (clockOutData.location) payload.clockOut = { ...payload.clockOut, location: clockOutData.location };
        if (clockOutData.notes) payload.clockOut = { ...payload.clockOut, notes: clockOutData.notes };
        if (clockOutData.breakDuration !== undefined) payload.breakDuration = clockOutData.breakDuration;
      }

      const response: ApiResponse<Attendance> = await put(`/attendance/${attendanceId}`, payload);

      if (response.success && response.data) {
        message.success('Clocked out successfully!');
        // Refresh attendance list
        await fetchAttendance();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to clock out');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to clock out';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAttendance]);

  /**
   * Update attendance record (Generic update for editing)
   */
  const updateAttendance = useCallback(async (attendanceId: string, updateData: Partial<Attendance>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const payload: any = { ...updateData };

      // Handle clockIn time - convert to ISO string if it's a dayjs object or date string
      if (updateData.clockIn?.time && typeof updateData.clockIn.time === 'string') {
        payload.clockIn = { ...updateData.clockIn, time: new Date(updateData.clockIn.time).toISOString() };
      }

      // Handle clockOut time - convert to ISO string if it's a dayjs object or date string
      if (updateData.clockOut?.time && typeof updateData.clockOut.time === 'string') {
        payload.clockOut = { ...updateData.clockOut, time: new Date(updateData.clockOut.time).toISOString() };
      }

      // Handle date
      if (updateData.date && typeof updateData.date === 'string') {
        payload.date = new Date(updateData.date).toISOString();
      }

      const response: ApiResponse<Attendance> = await put(`/attendance/${attendanceId}`, payload);

      if (response.success && response.data) {
        message.success('Attendance updated successfully!');
        // Refresh attendance list
        await fetchAttendance();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to update attendance');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to update attendance';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAttendance]);

  /**
   * Delete attendance record (Soft delete)
   */
  const deleteAttendance = useCallback(async (attendanceId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Attendance> = await apiDel(`/attendance/${attendanceId}`);

      if (response.success) {
        message.success('Attendance deleted successfully!');
        // Refresh attendance list
        await fetchAttendance();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to delete attendance');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to delete attendance';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAttendance]);

  /**
   * Get my attendance records (Current employee)
   */
  const fetchMyAttendance = useCallback(async (filters: AttendanceFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildParams(filters);
      const response: ApiResponse<Attendance[]> = await get('/attendance/my', { params: queryParams });

      if (response.success && response.data) {
        setMyAttendance(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch attendance');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch attendance';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get attendance by date range
   */
  const fetchAttendanceByDateRange = useCallback(async (startDate: string, endDate: string, filters: AttendanceFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildParams({ ...filters, startDate, endDate });
      const response: ApiResponse<Attendance[]> = await get('/attendance/daterange', { params: queryParams });

      if (response.success && response.data) {
        setAttendance(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch attendance');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch attendance';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get attendance by employee
   */
  const fetchEmployeeAttendance = useCallback(async (employeeId: string, filters: AttendanceFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = buildParams(filters);
      const response: ApiResponse<Attendance[]> = await get(`/attendance/employee/${employeeId}`, { params: queryParams });

      if (response.success && response.data) {
        setAttendance(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        throw new Error(response.error?.message || 'Failed to fetch attendance');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch attendance';
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch attendance statistics
   */
  const fetchStats = useCallback(async (filters: AttendanceFilters = {}) => {
    try {
      const queryParams = buildParams(filters);
      const response: ApiResponse<AttendanceStats> = await get('/attendance/stats', { params: queryParams });

      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (err: any) {
      console.error('[useAttendanceREST] Failed to fetch stats:', err);
    }
  }, []);

  /**
   * Bulk attendance action
   */
  const bulkAction = useCallback(async (action: string, attendanceIds: string[], data?: any): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const payload = { action, attendanceIds, data };
      const response: ApiResponse<any> = await post('/attendance/bulk', payload);

      if (response.success) {
        message.success(response.message || 'Bulk action completed successfully!');
        // Refresh attendance list
        await fetchAttendance();
        return true;
      }
      throw new Error(response.error?.message || 'Failed to perform bulk action');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to perform bulk action';
      setError(errorMessage);
      message.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchAttendance]);

  return {
    // Data
    attendance,
    myAttendance,
    stats,
    loading,
    error,
    pagination,
    needsEmployeeSync,

    // Methods
    fetchAttendance,
    getAttendanceById,
    clockIn,
    clockOut,
    updateAttendance,
    deleteAttendance,
    fetchMyAttendance,
    fetchAttendanceByDateRange,
    fetchEmployeeAttendance,
    fetchStats,
    bulkAction,
    syncEmployeeRecord
  };
};

export default useAttendanceREST;
