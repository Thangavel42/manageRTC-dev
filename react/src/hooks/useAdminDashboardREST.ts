/**
 * Admin Dashboard REST API Hook
 * Replaces Socket.IO-based Admin Dashboard operations with REST API calls
 * Real-time updates still use Socket.IO listeners for broadcasts
 */

import { message } from 'antd';
import { useCallback, useState } from 'react';
import { ApiResponse, buildParams, get } from '../services/api';

// Admin Dashboard Data Types (matching backend response structure)
export interface PendingItems {
  approvals: number;
  leaveRequests: number;
}

export interface EmployeeGrowth {
  currentWeek: number;
  lastWeek: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DashboardStats {
  attendance?: { present: number; total: number; percentage: number };
  projects?: { total: number; completed: number; percentage: number };
  clients?: number;
  tasks?: { total: number; completed: number };
  earnings?: number;
  weeklyProfit?: number;
  employees?: number;
  jobApplications?: number;
  clientsGrowth?: number;
  tasksGrowth?: number;
  earningsGrowth?: number;
  profitGrowth?: number;
  applicationsGrowth?: number;
  employeesGrowth?: number;
}

export interface EmployeeByDepartment {
  department: string;
  count: number;
}

export interface EmployeeStatus {
  total: number;
  distribution: Record<string, number>;
  topPerformer?: {
    name: string;
    position: string;
    performance: number;
    avatar: string;
  };
}

export interface AttendanceOverview {
  total: number;
  present: number;
  late: number;
  permission: number;
  absent: number;
  absentees?: Array<{
    _id: string;
    name: string;
    avatar: string;
    position: string;
  }>;
}

export interface ClockInOutData {
  _id: string;
  name: string;
  position: string;
  avatar: string;
  clockIn: string;
  clockOut: string;
  status: string;
  hoursWorked: number;
}

export interface SalesOverview {
  income: number[];
  expenses: number[];
  lastUpdated: string;
}

export interface RecentInvoice {
  _id: string;
  invoiceNumber: string;
  title: string;
  amount: number;
  status: string;
  clientName: string;
  clientLogo: string;
}

export interface EmployeeListItem {
  _id: string;
  name: string;
  position: string;
  department: string;
  avatar: string;
}

export interface JobApplicants {
  openings?: Array<{ _id: string; count: number }>;
  applicants?: Array<{
    _id: string;
    name: string;
    position: string;
    experience: string;
    location: string;
    avatar: string;
  }>;
}

export interface RecentActivity {
  _id: string;
  action: string;
  description: string;
  createdAt: string;
  employeeName: string;
  employeeAvatar: string;
}

export interface Birthdays {
  today?: Array<{ name: string; position: string; avatar: string }>;
  tomorrow?: Array<{ name: string; position: string; avatar: string }>;
  upcoming?: Array<{
    name: string;
    position: string;
    avatar: string;
    date: string;
  }>;
}

export interface TodoItem {
  _id: string;
  title: string;
  description?: string;
  completed: boolean;
  userId: string;
  createdAt: string;
  tag?: string;
  priority?: 'Low' | 'Medium' | 'High';
  dueDate?: string;
  assignedTo?: string;
}

export interface ProjectData {
  id: string;
  projectId?: string;
  name: string;
  hours: number;
  totalHours: number;
  deadline: string;
  priority: string;
  progress: number;
  team: Array<{ name: string; avatar: string }>;
}

export interface TaskStatistics {
  total: number;
  distribution: Record<string, { count: number; percentage: number }>;
  hoursSpent: number;
  targetHours: number;
}

export interface Schedule {
  _id: string;
  title: string;
  type: string;
  date: string;
  startTime: string;
  endTime: string;
  participants: Array<{ name: string; avatar: string }>;
}

export interface AdminDashboardData {
  pendingItems?: PendingItems;
  employeeGrowth?: EmployeeGrowth;
  stats?: DashboardStats;
  employeesByDepartment?: EmployeeByDepartment[];
  employeeStatus?: EmployeeStatus;
  attendanceOverview?: AttendanceOverview;
  clockInOutData?: ClockInOutData[];
  salesOverview?: SalesOverview;
  recentInvoices?: RecentInvoice[];
  employeesList?: EmployeeListItem[];
  jobApplicants?: JobApplicants;
  recentActivities?: RecentActivity[];
  birthdays?: Birthdays;
  todos?: TodoItem[];
  projectsData?: ProjectData[];
  taskStatistics?: TaskStatistics;
  schedules?: Schedule[];
}

export interface AdminDashboardFilters {
  year?: number;
  filter?: 'all' | 'today' | 'week' | 'month';
  department?: string;
  invoiceType?: 'all' | 'paid' | 'pending' | 'overdue' | 'unpaid';
}

/**
 * Admin Dashboard REST API Hook
 */
export const useAdminDashboardREST = () => {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all Admin Dashboard data at once
   * REST API: GET /api/admin-dashboard/all
   */
  const fetchAllDashboardData = useCallback(async (filters: AdminDashboardFilters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = buildParams(filters);
      const response: ApiResponse<AdminDashboardData> = await get('/admin-dashboard/all', { params });

      if (response.success && response.data) {
        setDashboardData(response.data);
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Failed to fetch dashboard data');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch dashboard data';
      setError(errorMessage);
      message.error(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch Admin Dashboard summary (quick stats only)
   * REST API: GET /api/admin-dashboard/summary
   */
  const fetchDashboardSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response: ApiResponse<Partial<AdminDashboardData>> = await get('/admin-dashboard/summary');

      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.error?.message || 'Failed to fetch dashboard summary');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch dashboard summary';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch employees by department
   * REST API: GET /api/admin-dashboard/employees-by-department
   */
  const fetchEmployeesByDepartment = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<EmployeeByDepartment[]> = await get('/admin-dashboard/employees-by-department', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employees by department';
      console.error(errorMessage);
      return [];
    }
  }, []);

  /**
   * Fetch employee status
   * REST API: GET /api/admin-dashboard/employee-status
   */
  const fetchEmployeeStatus = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<EmployeeStatus> = await get('/admin-dashboard/employee-status', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employee status';
      console.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Fetch attendance overview
   * REST API: GET /api/admin-dashboard/attendance-overview
   */
  const fetchAttendanceOverview = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<AttendanceOverview> = await get('/admin-dashboard/attendance-overview', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch attendance overview';
      console.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Fetch clock in/out data
   * REST API: GET /api/admin-dashboard/clock-inout
   */
  const fetchClockInOutData = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<ClockInOutData[]> = await get('/admin-dashboard/clock-inout', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch clock in/out data';
      console.error(errorMessage);
      return [];
    }
  }, []);

  /**
   * Fetch sales overview
   * REST API: GET /api/admin-dashboard/sales-overview
   */
  const fetchSalesOverview = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<SalesOverview> = await get('/admin-dashboard/sales-overview', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch sales overview';
      console.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Fetch recent invoices
   * REST API: GET /api/admin-dashboard/recent-invoices
   */
  const fetchRecentInvoices = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<RecentInvoice[]> = await get('/admin-dashboard/recent-invoices', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch recent invoices';
      console.error(errorMessage);
      return [];
    }
  }, []);

  /**
   * Fetch projects data
   * REST API: GET /api/admin-dashboard/projects
   */
  const fetchProjectsData = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<ProjectData[]> = await get('/admin-dashboard/projects', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch projects data';
      console.error(errorMessage);
      return [];
    }
  }, []);

  /**
   * Fetch task statistics
   * REST API: GET /api/admin-dashboard/task-statistics
   */
  const fetchTaskStatistics = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<TaskStatistics> = await get('/admin-dashboard/task-statistics', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch task statistics';
      console.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Fetch todos
   * REST API: GET /api/admin-dashboard/todos
   */
  const fetchTodos = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<TodoItem[]> = await get('/admin-dashboard/todos', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return [];
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch todos';
      console.error(errorMessage);
      return [];
    }
  }, []);

  /**
   * Fetch birthdays
   * REST API: GET /api/admin-dashboard/birthdays
   */
  const fetchBirthdays = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<Birthdays> = await get('/admin-dashboard/birthdays', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch birthdays';
      console.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Fetch pending items
   * REST API: GET /api/admin-dashboard/pending-items
   */
  const fetchPendingItems = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<PendingItems> = await get('/admin-dashboard/pending-items', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch pending items';
      console.error(errorMessage);
      return null;
    }
  }, []);

  /**
   * Fetch employee growth
   * REST API: GET /api/admin-dashboard/employee-growth
   */
  const fetchEmployeeGrowth = useCallback(async (filters: AdminDashboardFilters = {}) => {
    try {
      const params = buildParams(filters);
      const response: ApiResponse<EmployeeGrowth> = await get('/admin-dashboard/employee-growth', { params });

      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || err.message || 'Failed to fetch employee growth';
      console.error(errorMessage);
      return null;
    }
  }, []);

  return {
    dashboardData,
    loading,
    error,
    fetchAllDashboardData,
    fetchDashboardSummary,
    fetchEmployeesByDepartment,
    fetchEmployeeStatus,
    fetchAttendanceOverview,
    fetchClockInOutData,
    fetchSalesOverview,
    fetchRecentInvoices,
    fetchProjectsData,
    fetchTaskStatistics,
    fetchTodos,
    fetchBirthdays,
    fetchPendingItems,
    fetchEmployeeGrowth,
  };
};

export default useAdminDashboardREST;
