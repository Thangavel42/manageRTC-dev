/**
 * HR Dashboard REST Controller
 * Handles HR Dashboard statistics via REST API
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
import { getDashboardStats } from '../../services/hr/hrm.dashboard.js';
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

/**
 * @desc    Get HR Dashboard statistics
 * @route   GET /api/hr-dashboard/stats
 * @access  Private (Admin, HR)
 */
export const getHRDashboardStats = asyncHandler(async (req, res) => {
  const { year } = req.query;
  const user = extractUser(req);

  devLog('[HR Dashboard Controller] getHRDashboardStats - companyId:', user.companyId, 'year:', year);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  // Call the service function
  const result = await getDashboardStats(user.companyId, year ? parseInt(year) : null);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch dashboard data');
  }

  return sendSuccess(res, result.data, 'HR Dashboard data retrieved successfully');
});

/**
 * @desc    Get HR Dashboard summary (quick stats)
 * @route   GET /api/hr-dashboard/summary
 * @access  Private (Admin, HR)
 */
export const getHRDashboardSummary = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[HR Dashboard Controller] getHRDashboardSummary - companyId:', user.companyId);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  // Get current year stats
  const result = await getDashboardStats(user.companyId, null);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch dashboard summary');
  }

  // Return only summary stats
  const summary = {
    totalEmployees: result.data.stats?.totalEmployees || 0,
    activeEmployees: result.data.stats?.activeEmployees || 0,
    totalDepartments: result.data.departmentStats?.totalDepartments || 0,
    totalDesignations: result.data.designationStats?.totalDesignations || 0,
    activePolicies: result.data.policyStats?.totalActivePolicies || 0,
    upcomingHolidays: result.data.upcomingHolidays?.length || 0,
    totalProjects: result.data.projectStats?.totalProjects || 0,
    activeProjects: result.data.projectStats?.activeProjects || 0
  };

  return sendSuccess(res, summary, 'HR Dashboard summary retrieved successfully');
});

/**
 * @desc    Get upcoming holidays for HR Dashboard
 * @route   GET /api/hr-dashboard/holidays/upcoming
 * @access  Private (Admin, HR)
 */
export const getUpcomingHolidays = asyncHandler(async (req, res) => {
  const { limit = 7 } = req.query;
  const user = extractUser(req);

  devLog('[HR Dashboard Controller] getUpcomingHolidays - companyId:', user.companyId);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const result = await getDashboardStats(user.companyId, null);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch holidays');
  }

  // Return only upcoming holidays (limit)
  const holidays = (result.data.upcomingHolidays || []).slice(0, parseInt(limit));

  return sendSuccess(res, holidays, 'Upcoming holidays retrieved successfully');
});

/**
 * @desc    Get employee birthdays for current month
 * @route   GET /api/hr-dashboard/birthdays
 * @access  Private (Admin, HR)
 */
export const getEmployeeBirthdays = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const user = extractUser(req);

  devLog('[HR Dashboard Controller] getEmployeeBirthdays - companyId:', user.companyId);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const result = await getDashboardStats(user.companyId, year ? parseInt(year) : null);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch birthdays');
  }

  // Filter birthdays by month if specified
  let birthdays = result.data.employeeBirthdays || [];

  if (month !== undefined) {
    const targetMonth = parseInt(month);
    birthdays = birthdays.filter(b => {
      const birthDate = new Date(b.date);
      return birthDate.getMonth() === targetMonth;
    });
  }

  return sendSuccess(res, birthdays, 'Employee birthdays retrieved successfully');
});

/**
 * @desc    Get employee work anniversaries
 * @route   GET /api/hr-dashboard/anniversaries
 * @access  Private (Admin, HR)
 */
export const getEmployeeAnniversaries = asyncHandler(async (req, res) => {
  const { month, year } = req.query;
  const user = extractUser(req);

  devLog('[HR Dashboard Controller] getEmployeeAnniversaries - companyId:', user.companyId);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const result = await getDashboardStats(user.companyId, year ? parseInt(year) : null);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch anniversaries');
  }

  // Filter anniversaries by month if specified
  let anniversaries = result.data.employeeAnniversaries || [];

  if (month !== undefined) {
    const targetMonth = parseInt(month);
    anniversaries = anniversaries.filter(a => {
      const annDate = new Date(a.date);
      return annDate.getMonth() === targetMonth;
    });
  }

  return sendSuccess(res, anniversaries, 'Employee anniversaries retrieved successfully');
});

/**
 * @desc    Get all calendar events (holidays, birthdays, anniversaries)
 * @route   GET /api/hr-dashboard/calendar-events
 * @access  Private (Admin, HR)
 */
export const getCalendarEvents = asyncHandler(async (req, res) => {
  const { start, end } = req.query;
  const user = extractUser(req);

  devLog('[HR Dashboard Controller] getCalendarEvents - companyId:', user.companyId);

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required');
  }

  const result = await getDashboardStats(user.companyId, null);

  if (!result.done) {
    throw buildConflictError(result.error || 'Failed to fetch calendar events');
  }

  // Combine all events
  const events = [
    ...(result.data.upcomingHolidays || []).map(h => ({
      id: h._id,
      title: h.title,
      start: h.date,
      allDay: true,
      backgroundColor: '#ff6b6b',
      borderColor: '#ff6b6b',
      type: 'holiday'
    })),
    ...(result.data.employeeBirthdays || []).map(b => ({
      id: b._id,
      title: `${b.firstName} ${b.lastName}'s Birthday`,
      start: b.date,
      allDay: true,
      backgroundColor: '#4ecdc4',
      borderColor: '#4ecdc4',
      type: 'birthday',
      meta: { employeeId: b.employeeId }
    })),
    ...(result.data.employeeAnniversaries || []).map(a => ({
      id: a._id,
      title: `${a.firstName} ${a.lastName}'s Work Anniversary`,
      start: a.date,
      allDay: true,
      backgroundColor: '#45b7d1',
      borderColor: '#45b7d1',
      type: 'anniversary',
      meta: {
        employeeId: a.employeeId,
        yearsWithCompany: a.yearsWithCompany
      }
    }))
  ];

  // Filter by date range if provided
  if (start || end) {
    const startDate = start ? new Date(start) : new Date('1900-01-01');
    const endDate = end ? new Date(end) : new Date('2100-12-31');

    events = events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate >= startDate && eventDate <= endDate;
    });
  }

  return sendSuccess(res, events, 'Calendar events retrieved successfully');
});

export default {
  getHRDashboardStats,
  getHRDashboardSummary,
  getUpcomingHolidays,
  getEmployeeBirthdays,
  getEmployeeAnniversaries,
  getCalendarEvents
};
