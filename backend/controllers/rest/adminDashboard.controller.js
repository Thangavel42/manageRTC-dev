/**
 * Admin Dashboard REST Controller
 * Handles Admin Dashboard statistics via REST API
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import {
  asyncHandler,
  buildConflictError,
  buildNotFoundError,
  buildValidationError
} from '../../middleware/errorHandler.js';
import {
  extractUser,
  sendSuccess
} from '../../utils/apiResponse.js';
import * as adminService from '../../services/admin/admin.services.js';
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

/**
 * @desc    Get full Admin Dashboard data (all sections)
 * @route   GET /api/admin-dashboard/all
 * @access  Private (Admin)
 */
export const getAdminDashboardAll = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const user = extractUser(req);

  devLog('[Admin Dashboard Controller] getAdminDashboardAll - companyId:', user.companyId, 'year:', year);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  // Helper to wrap service calls with individual error handling
  const safeServiceCall = async (serviceName, serviceCall) => {
    try {
      const result = await serviceCall;
      return { success: true, data: result.data };
    } catch (error) {
      devError(`[Admin Dashboard] ${serviceName} failed:`, error.message);
      return { success: false, error: error.message, data: null };
    }
  };

  const targetYear = year ? parseInt(year) : new Date().getFullYear();
  const userId = user.userId;

  // Execute all service calls in parallel but with individual error handling
  const results = await Promise.all([
    safeServiceCall('pendingItems', adminService.getPendingItems(user.companyId, userId, targetYear)),
    safeServiceCall('employeeGrowth', adminService.getEmployeeGrowth(user.companyId, targetYear)),
    safeServiceCall('stats', adminService.getDashboardStats(user.companyId, targetYear)),
    safeServiceCall('employeesByDepartment', adminService.getEmployeesByDepartment(user.companyId, "all", targetYear)),
    safeServiceCall('employeeStatus', adminService.getEmployeeStatus(user.companyId, "all", targetYear)),
    safeServiceCall('attendanceOverview', adminService.getAttendanceOverview(user.companyId, "all", targetYear)),
    safeServiceCall('clockInOutData', adminService.getClockInOutData(user.companyId, "all", targetYear, null)),
    safeServiceCall('salesOverview', adminService.getSalesOverview(user.companyId, "all", targetYear, null)),
    safeServiceCall('recentInvoices', adminService.getRecentInvoices(user.companyId, "all", targetYear, "all")),
    safeServiceCall('employeesList', adminService.getEmployeesList(user.companyId, targetYear)),
    safeServiceCall('jobApplicants', adminService.getJobApplicants(user.companyId, targetYear)),
    safeServiceCall('recentActivities', adminService.getRecentActivities(user.companyId, targetYear)),
    safeServiceCall('birthdays', adminService.getBirthdays(user.companyId, targetYear)),
    safeServiceCall('todos', adminService.getTodos(user.companyId, userId, "all", targetYear)),
    safeServiceCall('projectsData', adminService.getProjectsData(user.companyId, "all", targetYear)),
    safeServiceCall('taskStatistics', adminService.getTaskStatistics(user.companyId, "all", targetYear)),
    safeServiceCall('schedules', adminService.getSchedules(user.companyId, targetYear)),
  ]);

  // Check which services failed
  const failedServices = results.filter(r => !r.success);
  if (failedServices.length > 0) {
    devWarn(`[Admin Dashboard] ${failedServices.length} services failed:`, failedServices.map(f => f.error));
  }

  // Build response with partial data even if some services failed
  const [
    pendingItems,
    employeeGrowth,
    stats,
    employeesByDepartment,
    employeeStatus,
    attendanceOverview,
    clockInOutData,
    salesOverview,
    recentInvoices,
    employeesList,
    jobApplicants,
    recentActivities,
    birthdays,
    todos,
    projectsData,
    taskStatistics,
    schedules,
  ] = results;

  return sendSuccess(res, {
    pendingItems: pendingItems.data,
    employeeGrowth: employeeGrowth.data,
    stats: stats.data,
    employeesByDepartment: employeesByDepartment.data,
    employeeStatus: employeeStatus.data,
    attendanceOverview: attendanceOverview.data,
    clockInOutData: clockInOutData.data,
    salesOverview: salesOverview.data,
    recentInvoices: recentInvoices.data,
    employeesList: employeesList.data,
    jobApplicants: jobApplicants.data,
    recentActivities: recentActivities.data,
    birthdays: birthdays.data,
    todos: todos.data,
    projectsData: projectsData.data,
    taskStatistics: taskStatistics.data,
    schedules: schedules.data,
  }, 'Admin Dashboard data retrieved successfully');
});

/**
 * @desc    Get Admin Dashboard summary (quick stats only)
 * @route   GET /api/admin-dashboard/summary
 * @access  Private (Admin)
 */
export const getAdminDashboardSummary = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[Admin Dashboard Controller] getAdminDashboardSummary - companyId:', user.companyId);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const result = await adminService.getDashboardStats(user.companyId, null);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch dashboard summary');
  }

  // Return only summary stats
  const summary = {
    employees: result.data.employees,
    projects: result.data.projects,
    clients: result.data.clients,
    tasks: result.data.tasks,
    earnings: result.data.earnings,
    jobApplications: result.data.jobApplications,
  };

  return sendSuccess(res, summary, 'Admin Dashboard summary retrieved successfully');
});

/**
 * @desc    Get employees by department
 * @route   GET /api/admin-dashboard/employees-by-department
 * @access  Private (Admin)
 */
export const getEmployeesByDepartment = asyncHandler(async (req, res) => {
  const { filter = 'all', year } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getEmployeesByDepartment(user.companyId, filter, targetYear);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch employees by department');
  }

  return sendSuccess(res, result.data, 'Employees by department retrieved successfully');
});

/**
 * @desc    Get employee status distribution
 * @route   GET /api/admin-dashboard/employee-status
 * @access  Private (Admin)
 */
export const getEmployeeStatus = asyncHandler(async (req, res) => {
  const { filter = 'all', year } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getEmployeeStatus(user.companyId, filter, targetYear);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch employee status');
  }

  return sendSuccess(res, result.data, 'Employee status retrieved successfully');
});

/**
 * @desc    Get attendance overview
 * @route   GET /api/admin-dashboard/attendance-overview
 * @access  Private (Admin)
 */
export const getAttendanceOverview = asyncHandler(async (req, res) => {
  const { filter = 'all', year } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getAttendanceOverview(user.companyId, filter, targetYear);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch attendance overview');
  }

  return sendSuccess(res, result.data, 'Attendance overview retrieved successfully');
});

/**
 * @desc    Get clock in/out data
 * @route   GET /api/admin-dashboard/clock-inout
 * @access  Private (Admin)
 */
export const getClockInOutData = asyncHandler(async (req, res) => {
  const { filter = 'all', year, department } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getClockInOutData(user.companyId, filter, targetYear, department);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch clock in/out data');
  }

  return sendSuccess(res, result.data, 'Clock in/out data retrieved successfully');
});

/**
 * @desc    Get sales overview
 * @route   GET /api/admin-dashboard/sales-overview
 * @access  Private (Admin)
 */
export const getSalesOverview = asyncHandler(async (req, res) => {
  const { filter = 'all', year, department } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getSalesOverview(user.companyId, filter, targetYear, department);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch sales overview');
  }

  return sendSuccess(res, result.data, 'Sales overview retrieved successfully');
});

/**
 * @desc    Get recent invoices
 * @route   GET /api/admin-dashboard/recent-invoices
 * @access  Private (Admin)
 */
export const getRecentInvoices = asyncHandler(async (req, res) => {
  const { filter = 'all', year, invoiceType = 'all' } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getRecentInvoices(user.companyId, filter, targetYear, invoiceType);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch recent invoices');
  }

  return sendSuccess(res, result.data, 'Recent invoices retrieved successfully');
});

/**
 * @desc    Get projects data
 * @route   GET /api/admin-dashboard/projects
 * @access  Private (Admin)
 */
export const getProjectsData = asyncHandler(async (req, res) => {
  const { filter = 'all', year } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getProjectsData(user.companyId, filter, targetYear);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch projects data');
  }

  return sendSuccess(res, result.data, 'Projects data retrieved successfully');
});

/**
 * @desc    Get task statistics
 * @route   GET /api/admin-dashboard/task-statistics
 * @access  Private (Admin)
 */
export const getTaskStatistics = asyncHandler(async (req, res) => {
  const { filter = 'all', year } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getTaskStatistics(user.companyId, filter, targetYear);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch task statistics');
  }

  return sendSuccess(res, result.data, 'Task statistics retrieved successfully');
});

/**
 * @desc    Get todos
 * @route   GET /api/admin-dashboard/todos
 * @access  Private (Admin)
 */
export const getTodos = asyncHandler(async (req, res) => {
  const { filter = 'all', year } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getTodos(user.companyId, user.userId, filter, targetYear);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch todos');
  }

  return sendSuccess(res, result.data, 'Todos retrieved successfully');
});

/**
 * @desc    Get birthdays
 * @route   GET /api/admin-dashboard/birthdays
 * @access  Private (Admin)
 */
export const getBirthdays = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getBirthdays(user.companyId, targetYear);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch birthdays');
  }

  return sendSuccess(res, result.data, 'Birthdays retrieved successfully');
});

/**
 * @desc    Get pending items
 * @route   GET /api/admin-dashboard/pending-items
 * @access  Private (Admin)
 */
export const getPendingItems = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getPendingItems(user.companyId, user.userId, targetYear);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch pending items');
  }

  return sendSuccess(res, result.data, 'Pending items retrieved successfully');
});

/**
 * @desc    Get employee growth data
 * @route   GET /api/admin-dashboard/employee-growth
 * @access  Private (Admin)
 */
export const getEmployeeGrowth = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const user = extractUser(req);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const targetYear = year ? parseInt(year) : null;
  const result = await adminService.getEmployeeGrowth(user.companyId, targetYear);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch employee growth');
  }

  return sendSuccess(res, result.data, 'Employee growth retrieved successfully');
});

export default {
  getAdminDashboardAll,
  getAdminDashboardSummary,
  getEmployeesByDepartment,
  getEmployeeStatus,
  getAttendanceOverview,
  getClockInOutData,
  getSalesOverview,
  getRecentInvoices,
  getProjectsData,
  getTaskStatistics,
  getTodos,
  getBirthdays,
  getPendingItems,
  getEmployeeGrowth,
};
