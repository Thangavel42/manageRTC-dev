/**
 * Employee Dashboard REST Controller
 * Replaces all socket-based employee/dashboard/* events with clean REST endpoints.
 * Reuses the existing dashboard.services.js functions directly.
 */

import { ObjectId } from 'mongodb';
import { asyncHandler } from '../../middleware/errorHandler.js';
import { sendSuccess, sendCreated } from '../../utils/apiResponse.js';
import * as employeeService from '../../services/employee/dashboard.services.js';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extract companyId + clerkUserId (used as employeeId in services) from req */
const getCtx = (req) => ({
  companyId: req.user.companyId,
  employeeId: req.user.userId, // services query { clerkUserId: employeeId }
});

const parseYear = (raw) => {
  const y = parseInt(raw, 10);
  return !isNaN(y) && String(y).length === 4 ? y : new Date().getFullYear();
};

const serviceResult = (res, result) => {
  if (!result.done) {
    return res.status(400).json({ success: false, error: result.error || 'Operation failed' });
  }
  return sendSuccess(res, result.data);
};

// ── controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/employee/dashboard
 * All dashboard data in one request (replaces employee/dashboard/get-all-data)
 */
export const getDashboardData = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  const year = parseYear(req.query.year);

  const [
    employeeDetails,
    attendanceStats,
    leaveStats,
    workingHoursStats,
    projects,
    tasks,
    performance,
    skills,
    teamMembers,
    notifications,
    meetings,
    birthdays,
    lastDayTimmings,
    nextHoliday,
    leavePolicy,
  ] = await Promise.all([
    employeeService.getEmployeeDetails(companyId, employeeId),
    employeeService.getAttendanceStats(companyId, employeeId, year),
    employeeService.getLeaveStats(companyId, employeeId, year),
    employeeService.getWorkingHoursStats(companyId, employeeId),
    employeeService.getProjects(companyId, employeeId, 'ongoing'),
    employeeService.getTasks(companyId, employeeId, 'ongoing'),
    employeeService.getPerformance(companyId, employeeId, year),
    employeeService.getSkills(companyId, employeeId, year),
    employeeService.getTeamMembers(companyId, employeeId),
    employeeService.getTodaysNotifications(companyId, employeeId),
    employeeService.getMeetings(companyId, employeeId, 'today'),
    employeeService.getTodaysBirthday(companyId, employeeId),
    employeeService.getLastDayTimmings(companyId, employeeId),
    employeeService.getNextHoliday(companyId),
    employeeService.getLeavePolicy(companyId, employeeId),
  ]);

  if (!employeeDetails.done) {
    return res.status(404).json({ success: false, error: employeeDetails.error || 'Employee not found' });
  }

  return sendSuccess(res, {
    employeeDetails: employeeDetails.data,
    attendanceStats: attendanceStats.data,
    leaveStats: leaveStats.data,
    workingHoursStats: workingHoursStats.data,
    projects: projects.data,
    tasks: tasks.data,
    performance: performance.data,
    skills: skills.data,
    teamMembers: teamMembers.data,
    notifications: notifications.data,
    meetings: meetings.data,
    birthdays: birthdays.data,
    lastDayTimmings: lastDayTimmings.data,
    nextHoliday: nextHoliday.data,
    leavePolicy: leavePolicy.data,
  });
});

/** GET /api/employee/dashboard/attendance-stats?year=2026 */
export const getAttendanceStats = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  return serviceResult(res, await employeeService.getAttendanceStats(companyId, employeeId, parseYear(req.query.year)));
});

/** GET /api/employee/dashboard/leave-stats?year=2026 */
export const getLeaveStats = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  return serviceResult(res, await employeeService.getLeaveStats(companyId, employeeId, parseYear(req.query.year)));
});

/** GET /api/employee/dashboard/working-hours */
export const getWorkingHoursStats = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  return serviceResult(res, await employeeService.getWorkingHoursStats(companyId, employeeId));
});

/** GET /api/employee/dashboard/projects?filter=ongoing */
export const getProjects = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  const allowed = ['ongoing', 'all'];
  const filter = allowed.includes(req.query.filter) ? req.query.filter : 'all';
  return serviceResult(res, await employeeService.getProjects(companyId, employeeId, filter));
});

/** GET /api/employee/dashboard/tasks?filter=ongoing */
export const getTasks = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  const allowed = ['ongoing', 'all'];
  const filter = allowed.includes(req.query.filter) ? req.query.filter : 'all';
  return serviceResult(res, await employeeService.getTasks(companyId, employeeId, filter));
});

/** PATCH /api/employee/dashboard/tasks/:taskId */
export const updateTask = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  const { taskId } = req.params;
  if (!taskId || !ObjectId.isValid(taskId)) {
    return res.status(400).json({ success: false, error: 'Invalid task ID' });
  }
  const { status, starred, checked } = req.body;
  const allowedStatuses = ['onHold', 'ongoing', 'completed', 'pending'];
  const updateData = {};
  if (typeof status === 'string' && allowedStatuses.includes(status)) updateData.status = status;
  if (typeof starred === 'boolean') updateData.starred = starred;
  if (typeof checked === 'boolean') updateData.checked = checked;
  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ success: false, error: 'No valid fields to update' });
  }
  return serviceResult(res, await employeeService.updateTask({ companyId, employeeId, taskData: { taskId: new ObjectId(taskId), updateData } }));
});

/** GET /api/employee/dashboard/performance?year=2026 */
export const getPerformance = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  return serviceResult(res, await employeeService.getPerformance(companyId, employeeId, parseYear(req.query.year)));
});

/** GET /api/employee/dashboard/skills?year=2026 */
export const getSkills = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  return serviceResult(res, await employeeService.getSkills(companyId, employeeId, parseYear(req.query.year)));
});

/** GET /api/employee/dashboard/meetings?filter=today */
export const getMeetings = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  const valid = ['today', 'month', 'year'];
  const filter = valid.includes(req.query.filter) ? req.query.filter : 'today';
  return serviceResult(res, await employeeService.getMeetings(companyId, employeeId, filter));
});

/** POST /api/employee/dashboard/punch-in */
export const punchIn = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  return serviceResult(res, await employeeService.punchIn(companyId, employeeId));
});

/** POST /api/employee/dashboard/punch-out */
export const punchOut = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  return serviceResult(res, await employeeService.punchOut(companyId, employeeId));
});

/** POST /api/employee/dashboard/start-break */
export const startBreak = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  return serviceResult(res, await employeeService.startBreak(companyId, employeeId));
});

/** POST /api/employee/dashboard/end-break */
export const endBreak = asyncHandler(async (req, res) => {
  const { companyId, employeeId } = getCtx(req);
  return serviceResult(res, await employeeService.resumeBreak(companyId, employeeId));
});
