/**
 * Employee Dashboard REST API Hook
 * Replaces all socket-based employee/dashboard/* events with REST calls.
 */

import { useCallback, useState } from 'react';
import { get, post, patch } from '../services/api';

// ── Types (mirror the socket response shapes) ────────────────────────────────

export interface EmployeeDetails {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  designation: string;
  department: string;
  role: string;
  avatar: string;
  contact: { email: string; phone: string };
  reportOffice: string;
  managerId?: string;
  timeZone?: string;
  companyTimeZone?: string;
  dateOfJoining?: string;
}

export interface AttendanceStats {
  onTime: number;
  late: number;
  workFromHome: number;
  absent: number;
  workedDays: number;
  workingDays: number;
}

export interface LeaveStats {
  totalLeavesAllowed: number;
  takenLeaves: number;
  sickLeaves: number;
  lossOfPay: number;
  requestedLeaves: number;
}

export interface WorkingHoursStats {
  today: {
    expectedHours: number;
    workedHours: number;
    breakHours: number;
    overtimeHours: number;
    punchIn?: string;
    overtimeRequestStatus?: string;
    expectedOvertimeHours?: number;
  };
  thisWeek: { expectedHours: number; workedHours: number };
  thisMonth: {
    expectedHours: number;
    workedHours: number;
    overtimeHours: number;
    expectedOvertimeHours: number;
  };
}

export interface DashboardData {
  employeeDetails?: EmployeeDetails;
  attendanceStats?: AttendanceStats;
  leaveStats?: LeaveStats;
  workingHoursStats?: WorkingHoursStats;
  projects?: any[];
  tasks?: any[];
  performance?: any;
  skills?: any;
  teamMembers?: any[];
  notifications?: any[];
  meetings?: any[];
  birthdays?: any[];
  lastDayTimmings?: any;
  nextHoliday?: any;
  leavePolicy?: any;
}

export interface PunchInResult {
  punchIn: string;
  overtimeRequestStatus?: string;
  overtimeHours?: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useEmployeeDashboardREST = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── initial load ───────────────────────────────────────────────────────────

  const fetchDashboard = useCallback(async (year?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = year ? { year } : {};
      const response = await get('/employee/dashboard', { params });
      if (response.success && response.data) {
        setDashboardData(response.data);
      } else {
        setError(response.message || 'Failed to load dashboard');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── partial refreshes ──────────────────────────────────────────────────────

  const fetchAttendanceStats = useCallback(async (year?: number) => {
    try {
      const params = year ? { year } : {};
      const response = await get('/employee/dashboard/attendance-stats', { params });
      if (response.success && response.data) {
        setDashboardData(prev => ({ ...prev, attendanceStats: response.data }));
      }
    } catch (_) {}
  }, []);

  const fetchLeaveStats = useCallback(async (year?: number) => {
    try {
      const params = year ? { year } : {};
      const response = await get('/employee/dashboard/leave-stats', { params });
      if (response.success && response.data) {
        setDashboardData(prev => ({ ...prev, leaveStats: response.data }));
      }
    } catch (_) {}
  }, []);

  const fetchWorkingHours = useCallback(async () => {
    try {
      const response = await get('/employee/dashboard/working-hours');
      if (response.success && response.data) {
        setDashboardData(prev => ({ ...prev, workingHoursStats: response.data }));
      }
    } catch (_) {}
  }, []);

  const fetchProjects = useCallback(async (filter = 'all') => {
    try {
      const response = await get('/employee/dashboard/projects', { params: { filter } });
      if (response.success && response.data) {
        setDashboardData(prev => ({ ...prev, projects: response.data }));
      }
    } catch (_) {}
  }, []);

  const fetchTasks = useCallback(async (filter = 'all') => {
    try {
      const response = await get('/employee/dashboard/tasks', { params: { filter } });
      if (response.success && response.data) {
        setDashboardData(prev => ({ ...prev, tasks: response.data }));
      }
    } catch (_) {}
  }, []);

  const fetchPerformance = useCallback(async (year?: number) => {
    try {
      const params = year ? { year } : {};
      const response = await get('/employee/dashboard/performance', { params });
      if (response.success && response.data) {
        setDashboardData(prev => ({ ...prev, performance: response.data }));
      }
    } catch (_) {}
  }, []);

  const fetchSkills = useCallback(async (year?: number) => {
    try {
      const params = year ? { year } : {};
      const response = await get('/employee/dashboard/skills', { params });
      if (response.success && response.data) {
        setDashboardData(prev => ({ ...prev, skills: response.data }));
      }
    } catch (_) {}
  }, []);

  const fetchMeetings = useCallback(async (filter = 'today') => {
    try {
      const response = await get('/employee/dashboard/meetings', { params: { filter } });
      if (response.success && response.data) {
        setDashboardData(prev => ({ ...prev, meetings: response.data }));
      }
    } catch (_) {}
  }, []);

  // ── task mutation ──────────────────────────────────────────────────────────

  const updateTask = useCallback(async (taskId: string, updateData: { status?: string; starred?: boolean; checked?: boolean }) => {
    try {
      const response = await patch(`/employee/dashboard/tasks/${taskId}`, updateData);
      if (response.success) {
        await fetchTasks();
      }
      return response.success;
    } catch (_) {
      return false;
    }
  }, [fetchTasks]);

  // ── punch-in / punch-out / break ──────────────────────────────────────────

  const punchIn = useCallback(async (): Promise<{ success: boolean; data?: PunchInResult; error?: string }> => {
    try {
      const response = await post('/employee/dashboard/punch-in', {});
      return { success: response.success, data: response.data, error: response.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Punch-in failed' };
    }
  }, []);

  const punchOut = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await post('/employee/dashboard/punch-out', {});
      if (response.success) {
        await fetchWorkingHours();
      }
      return { success: response.success, error: response.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Punch-out failed' };
    }
  }, [fetchWorkingHours]);

  const startBreak = useCallback(async (): Promise<{ success: boolean; data?: any; error?: string }> => {
    try {
      const response = await post('/employee/dashboard/start-break', {});
      return { success: response.success, data: response.data, error: response.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Start break failed' };
    }
  }, []);

  const endBreak = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await post('/employee/dashboard/end-break', {});
      return { success: response.success, error: response.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'End break failed' };
    }
  }, []);

  return {
    dashboardData,
    setDashboardData,
    loading,
    error,
    fetchDashboard,
    fetchAttendanceStats,
    fetchLeaveStats,
    fetchWorkingHours,
    fetchProjects,
    fetchTasks,
    fetchPerformance,
    fetchSkills,
    fetchMeetings,
    updateTask,
    punchIn,
    punchOut,
    startBreak,
    endBreak,
  };
};
