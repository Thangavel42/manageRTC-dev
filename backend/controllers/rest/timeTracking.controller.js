/**
 * Time Tracking REST Controller
 * Handles all Time Entry CRUD operations via REST API
 *
 * Role-based access:
 *  - admin / hr / superadmin  → full access to all entries
 *  - Project Manager / Team Leader (project-level) → scoped to their managed projects
 *  - employee / manager / leads  → own entries only (via /user/:userId)
 */

import mongoose from 'mongoose';
import { getTenantCollections } from '../../config/db.js';
import {
  buildNotFoundError,
  buildValidationError,
  asyncHandler
} from '../../middleware/errorHandler.js';
import {
  sendSuccess,
  sendCreated,
  extractUser
} from '../../utils/apiResponse.js';
import { getSocketIO, broadcastTimeTrackingEvents } from '../../utils/socketBroadcaster.js';
import * as timeTrackingService from '../../services/timeTracking/timeTracking.service.js';
import { ObjectId } from 'mongodb';

/**
 * Determine whether the requesting user is admin/HR/superadmin,
 * and if not, which projects they manage as Project Manager or Team Leader.
 *
 * Returns:
 *   { isAdmin, isPMorTL, projectIds: ObjectId[], employeeMongoId: ObjectId|null }
 */
const getUserProjectScope = async (user, collections) => {
  const isAdmin = ['admin', 'hr', 'superadmin'].includes(user.role?.toLowerCase());

  if (isAdmin) {
    return { isAdmin: true, isPMorTL: false, projectIds: [], employeeMongoId: null };
  }

  // Find the employee document for this Clerk user
  const employee = await collections.employees.findOne(
    {
      $or: [
        { clerkUserId: user.userId },
        { 'account.userId': user.userId }
      ],
      isDeleted: { $ne: true }
    },
    { projection: { _id: 1 } }
  );

  if (!employee) {
    return { isAdmin: false, isPMorTL: false, projectIds: [], employeeMongoId: null };
  }

  const empId = employee._id;
  const empIdStr = empId.toString();

  // Find all projects where this employee is PM or TL
  const managedProjects = await collections.projects.find(
    {
      $and: [
        { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] },
        {
          $or: [
            { projectManager: empId },
            { projectManager: empIdStr },
            { teamLeader: empId },
            { teamLeader: empIdStr }
          ]
        }
      ]
    },
    { projection: { _id: 1 } }
  ).toArray();

  const projectIds = managedProjects.map(p => p._id);

  return {
    isAdmin: false,
    isPMorTL: projectIds.length > 0,
    projectIds,
    employeeMongoId: empId
  };
};

/**
 * @desc    Get all time entries with pagination and filtering
 * @route   GET /api/timetracking
 * @access  Private (Admin, HR, Superadmin, Project Managers, Team Leaders)
 */
export const getTimeEntries = asyncHandler(async (req, res) => {
  const { page, limit, userId, projectId, taskId, status, billable, search, sortBy, order, startDate, endDate } = req.query;
  const user = extractUser(req);
  const collections = getTenantCollections(user.companyId);

  // Determine access scope
  const scope = await getUserProjectScope(user, collections);

  if (!scope.isAdmin && !scope.isPMorTL) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied. Use /timetracking/user/:userId to fetch your own entries.'
      }
    });
  }

  // Build filters object
  const filters = {};
  if (userId) filters.userId = userId;
  if (taskId) filters.taskId = taskId;
  if (status) filters.status = status;
  if (billable !== undefined) filters.billable = billable;
  if (search) filters.search = search;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;
  if (sortBy) {
    filters.sortBy = sortBy;
    filters.sortOrder = order || 'desc';
  }

  if (!scope.isAdmin && scope.isPMorTL) {
    // PM/TL: scope to their managed projects only
    if (projectId) {
      // Validate the requested projectId is in their scope
      const isAuthorized = scope.projectIds.some(
        pid => pid.toString() === projectId
      );
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have access to this project\'s time entries.'
          }
        });
      }
      filters.projectId = projectId;
    } else {
      // No specific project requested — return entries for all managed projects
      filters.projectIds = scope.projectIds.map(id => id.toString());
    }
  } else {
    // Admin/HR: honour incoming projectId filter as-is
    if (projectId) filters.projectId = projectId;
  }

  const result = await timeTrackingService.getTimeEntries(user.companyId, filters);

  if (!result.done) {
    throw new Error(result.error || 'Failed to fetch time entries');
  }

  // Apply pagination if specified
  let data = result.data;
  let pagination = null;

  if (page || limit) {
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    const paginatedData = data.slice(startIndex, endIndex);

    pagination = {
      page: pageNum,
      limit: limitNum,
      total: data.length,
      totalPages: Math.ceil(data.length / limitNum)
    };

    data = paginatedData;
  }

  return sendSuccess(res, data, 'Time entries retrieved successfully', 200, pagination);
});

/**
 * @desc    Get single time entry by ID
 * @route   GET /api/timetracking/:id
 * @access  Private (All authenticated users)
 */
export const getTimeEntryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid time entry ID format');
  }

  const result = await timeTrackingService.getTimeEntryById(user.companyId, id);

  if (!result.done) {
    throw buildNotFoundError('Time entry', id);
  }

  return sendSuccess(res, result.data, 'Time entry retrieved successfully');
});

/**
 * @desc    Get time entries by user
 * @route   GET /api/timetracking/user/:userId
 * @access  Private (Admin, HR, Superadmin, or own user)
 */
export const getTimeEntriesByUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { status, projectId, taskId, startDate, endDate, sortBy, order } = req.query;
  const user = extractUser(req);

  // Build filters
  const filters = {};
  if (status) filters.status = status;
  if (projectId) filters.projectId = projectId;
  if (taskId) filters.taskId = taskId;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;
  if (sortBy) {
    filters.sortBy = sortBy;
    filters.sortOrder = order || 'desc';
  }

  const result = await timeTrackingService.getTimeEntriesByUser(user.companyId, userId, filters);

  if (!result.done) {
    throw new Error(result.error || 'Failed to fetch user time entries');
  }

  return sendSuccess(res, result.data, 'User time entries retrieved successfully');
});

/**
 * @desc    Get time entries by project
 * @route   GET /api/timetracking/project/:projectId
 * @access  Private (All authenticated users)
 */
export const getTimeEntriesByProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { status, userId, startDate, endDate } = req.query;
  const user = extractUser(req);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    throw buildValidationError('projectId', 'Invalid project ID format');
  }

  // Build filters
  const filters = {};
  if (status) filters.status = status;
  if (userId) filters.userId = userId;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const result = await timeTrackingService.getTimeEntriesByProject(user.companyId, projectId, filters);

  if (!result.done) {
    throw new Error(result.error || 'Failed to fetch project time entries');
  }

  return sendSuccess(res, result.data, 'Project time entries retrieved successfully');
});

/**
 * @desc    Get time entries by task
 * @route   GET /api/timetracking/task/:taskId
 * @access  Private (All authenticated users)
 */
export const getTimeEntriesByTask = asyncHandler(async (req, res) => {
  const { taskId } = req.params;
  const { status } = req.query;
  const user = extractUser(req);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(taskId)) {
    throw buildValidationError('taskId', 'Invalid task ID format');
  }

  // Build filters
  const filters = {};
  if (status) filters.status = status;

  const result = await timeTrackingService.getTimeEntriesByTask(user.companyId, taskId, filters);

  if (!result.done) {
    throw new Error(result.error || 'Failed to fetch task time entries');
  }

  return sendSuccess(res, result.data, 'Task time entries retrieved successfully');
});

/**
 * @desc    Get timesheet for a user
 * @route   GET /api/timetracking/timesheet/:userId
 * @access  Private (Admin, HR, Superadmin, or own user)
 */
export const getTimesheet = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { startDate, endDate } = req.query;
  const user = extractUser(req);

  const result = await timeTrackingService.getTimesheet(user.companyId, userId, startDate, endDate);

  if (!result.done) {
    throw new Error(result.error || 'Failed to fetch timesheet');
  }

  return sendSuccess(res, result.data, 'Timesheet retrieved successfully');
});

/**
 * @desc    Create new time entry
 * @route   POST /api/timetracking
 * @access  Private (All authenticated users)
 *
 * Non-admin users must be assigned to the project (teamMember, teamLeader, or projectManager).
 */
export const createTimeEntry = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const timeEntryData = req.body;
  const collections = getTenantCollections(user.companyId);

  const isAdmin = ['admin', 'hr', 'superadmin'].includes(user.role?.toLowerCase());

  // For non-admin users: validate they are assigned to the project
  if (!isAdmin && timeEntryData.projectId) {
    if (!mongoose.Types.ObjectId.isValid(timeEntryData.projectId)) {
      throw buildValidationError('projectId', 'Invalid project ID format');
    }

    // Find the employee document
    const employee = await collections.employees.findOne(
      {
        $or: [
          { clerkUserId: user.userId },
          { 'account.userId': user.userId }
        ],
        isDeleted: { $ne: true }
      },
      { projection: { _id: 1 } }
    );

    if (employee) {
      const empId = employee._id;
      const empIdStr = empId.toString();

      // Check that this employee is assigned to the project
      const assignedProject = await collections.projects.findOne({
        _id: new ObjectId(timeEntryData.projectId),
        $or: [
          { isDeleted: false },
          { isDeleted: { $exists: false } }
        ],
        $and: [
          {
            $or: [
              { teamMembers: empId },
              { teamMembers: empIdStr },
              { teamLeader: empId },
              { teamLeader: empIdStr },
              { projectManager: empId },
              { projectManager: empIdStr }
            ]
          }
        ]
      });

      if (!assignedProject) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You are not assigned to this project. Only assigned team members can log time against a project.'
          }
        });
      }
    }
  }

  // Add audit fields
  timeEntryData.createdBy = user.userId;
  timeEntryData.userId = user.userId;
  timeEntryData.updatedBy = user.userId;

  const result = await timeTrackingService.createTimeEntry(user.companyId, timeEntryData);

  if (!result.done) {
    throw new Error(result.error || 'Failed to create time entry');
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastTimeTrackingEvents.created(io, user.companyId, result.data);
  }

  return sendCreated(res, result.data, 'Time entry created successfully');
});

/**
 * @desc    Update time entry
 * @route   PUT /api/timetracking/:id
 * @access  Private (All authenticated users - own entries only)
 */
export const updateTimeEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid time entry ID format');
  }

  const companyId = user.companyId;
  const collections = getTenantCollections(companyId);

  // Fetch the entry to check ownership / project scope
  const existingEntry = await collections.timeEntries.findOne({ _id: new ObjectId(id) });
  if (!existingEntry) {
    throw buildNotFoundError('Time entry', id);
  }

  // Determine scope
  const scope = await getUserProjectScope(user, collections);

  if (!scope.isAdmin) {
    // PM/TL: can edit entries in their managed projects
    if (scope.isPMorTL) {
      const entryProjectId = existingEntry.projectId?.toString();
      const inScope = scope.projectIds.some(pid => pid.toString() === entryProjectId);
      if (!inScope) {
        return res.status(403).json({
          success: false,
          error: { message: 'You can only edit time entries for your assigned projects' }
        });
      }
    } else {
      // Regular employees: can only edit their own entries
      if (existingEntry.userId !== user.userId) {
        return res.status(403).json({
          success: false,
          error: { message: 'You can only edit your own time entries' }
        });
      }
    }
  }

  // Update audit fields
  updateData.updatedBy = user.userId;

  const result = await timeTrackingService.updateTimeEntry(user.companyId, id, updateData);

  if (!result.done) {
    if (result.error && result.error.includes('Cannot edit')) {
      throw buildValidationError('timeEntry', result.error);
    }
    throw buildNotFoundError('Time entry', id);
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastTimeTrackingEvents.updated(io, user.companyId, result.data);
  }

  return sendSuccess(res, result.data, 'Time entry updated successfully');
});

/**
 * @desc    Delete time entry (soft delete)
 * @route   DELETE /api/timetracking/:id
 * @access  Private (All authenticated users - own entries only)
 */
export const deleteTimeEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  // Validate ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid time entry ID format');
  }

  const companyId = user.companyId;
  const collections = getTenantCollections(companyId);

  // Fetch the entry to check ownership / project scope
  const existingEntry = await collections.timeEntries.findOne({ _id: new ObjectId(id) });
  if (!existingEntry) {
    throw buildNotFoundError('Time entry', id);
  }

  const scope = await getUserProjectScope(user, collections);

  if (!scope.isAdmin) {
    if (scope.isPMorTL) {
      const entryProjectId = existingEntry.projectId?.toString();
      const inScope = scope.projectIds.some(pid => pid.toString() === entryProjectId);
      if (!inScope) {
        return res.status(403).json({
          success: false,
          error: { message: 'You can only delete time entries for your assigned projects' }
        });
      }
    } else {
      if (existingEntry.userId !== user.userId) {
        return res.status(403).json({
          success: false,
          error: { message: 'You can only delete your own time entries' }
        });
      }
    }
  }

  const result = await timeTrackingService.deleteTimeEntry(user.companyId, id);

  if (!result.done) {
    if (result.error && result.error.includes('Cannot delete')) {
      throw buildValidationError('timeEntry', result.error);
    }
    throw buildNotFoundError('Time entry', id);
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io && result.data) {
    broadcastTimeTrackingEvents.deleted(io, user.companyId, result.data.timeEntryId, result.data.userId, result.data.projectId);
  }

  return sendSuccess(res, {
    _id: result.data._id,
    timeEntryId: result.data.timeEntryId,
    isDeleted: true
  }, 'Time entry deleted successfully');
});

/**
 * @desc    Submit timesheet for approval
 * @route   POST /api/timetracking/submit
 * @access  Private (All authenticated users)
 */
export const submitTimesheet = asyncHandler(async (req, res) => {
  const { timeEntryIds } = req.body;
  const user = extractUser(req);

  const result = await timeTrackingService.submitTimesheet(user.companyId, user.userId, timeEntryIds);

  if (!result.done) {
    throw new Error(result.error || 'Failed to submit timesheet');
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastTimeTrackingEvents.timesheetSubmitted(io, user.companyId, user.userId, result.data.submittedCount);
  }

  return sendSuccess(res, result.data, result.message || 'Timesheet submitted successfully');
});

/**
 * @desc    Approve timesheet
 * @route   POST /api/timetracking/approve
 * @access  Private (Admin, HR, Superadmin, Project Managers, Team Leaders)
 *
 * PM/TL can only approve entries for their managed projects.
 */
export const approveTimesheet = asyncHandler(async (req, res) => {
  const { userId, timeEntryIds } = req.body;
  const user = extractUser(req);
  const collections = getTenantCollections(user.companyId);

  if (!userId) {
    throw buildValidationError('userId', 'User ID is required');
  }

  // Determine approver scope
  const scope = await getUserProjectScope(user, collections);

  if (!scope.isAdmin && !scope.isPMorTL) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Only admins, HR, Project Managers, or Team Leaders can approve timesheets.'
      }
    });
  }

  // For PM/TL: validate all entries belong to their managed projects
  if (!scope.isAdmin && scope.isPMorTL && timeEntryIds && timeEntryIds.length > 0) {
    const authorizedProjectIds = new Set(scope.projectIds.map(id => id.toString()));

    const entriesToCheck = await collections.timeEntries
      .find(
        {
          _id: { $in: timeEntryIds.map(id => new ObjectId(id)) },
          isDeleted: { $ne: true }
        },
        { projection: { _id: 1, projectId: 1 } }
      )
      .toArray();

    const unauthorized = entriesToCheck.filter(
      e => !authorizedProjectIds.has(e.projectId?.toString())
    );

    if (unauthorized.length > 0) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `You do not have permission to approve ${unauthorized.length} of the selected entries (project not in your managed projects).`
        }
      });
    }
  }

  const result = await timeTrackingService.approveTimesheet(user.companyId, userId, timeEntryIds, user.userId);

  if (!result.done) {
    throw new Error(result.error || 'Failed to approve timesheet');
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastTimeTrackingEvents.timesheetApproved(io, user.companyId, userId, result.data.approvedCount);
  }

  return sendSuccess(res, result.data, result.message || 'Timesheet approved successfully');
});

/**
 * @desc    Reject timesheet
 * @route   POST /api/timetracking/reject
 * @access  Private (Admin, HR, Superadmin, Project Managers, Team Leaders)
 *
 * PM/TL can only reject entries for their managed projects.
 */
export const rejectTimesheet = asyncHandler(async (req, res) => {
  const { userId, timeEntryIds, reason } = req.body;
  const user = extractUser(req);
  const collections = getTenantCollections(user.companyId);

  if (!userId) {
    throw buildValidationError('userId', 'User ID is required');
  }

  // Determine approver scope
  const scope = await getUserProjectScope(user, collections);

  if (!scope.isAdmin && !scope.isPMorTL) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Only admins, HR, Project Managers, or Team Leaders can reject timesheets.'
      }
    });
  }

  // For PM/TL: validate all entries belong to their managed projects
  if (!scope.isAdmin && scope.isPMorTL && timeEntryIds && timeEntryIds.length > 0) {
    const authorizedProjectIds = new Set(scope.projectIds.map(id => id.toString()));

    const entriesToCheck = await collections.timeEntries
      .find(
        {
          _id: { $in: timeEntryIds.map(id => new ObjectId(id)) },
          isDeleted: { $ne: true }
        },
        { projection: { _id: 1, projectId: 1 } }
      )
      .toArray();

    const unauthorized = entriesToCheck.filter(
      e => !authorizedProjectIds.has(e.projectId?.toString())
    );

    if (unauthorized.length > 0) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `You do not have permission to reject ${unauthorized.length} of the selected entries (project not in your managed projects).`
        }
      });
    }
  }

  const result = await timeTrackingService.rejectTimesheet(user.companyId, userId, timeEntryIds, user.userId, reason);

  if (!result.done) {
    throw new Error(result.error || 'Failed to reject timesheet');
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastTimeTrackingEvents.timesheetRejected(io, user.companyId, userId, result.data.rejectedCount, reason);
  }

  return sendSuccess(res, result.data, result.message || 'Timesheet rejected successfully');
});

/**
 * @desc    Get time tracking statistics
 * @route   GET /api/timetracking/stats
 * @access  Private (Admin, HR, Superadmin, Project Managers, Team Leaders)
 *
 * PM/TL stats are automatically scoped to their managed projects.
 */
export const getTimeTrackingStats = asyncHandler(async (req, res) => {
  const { userId, projectId, startDate, endDate } = req.query;
  const user = extractUser(req);
  const collections = getTenantCollections(user.companyId);

  // Determine scope
  const scope = await getUserProjectScope(user, collections);

  if (!scope.isAdmin && !scope.isPMorTL) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied.'
      }
    });
  }

  // Build filters
  const filters = {};
  if (userId) filters.userId = userId;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  if (!scope.isAdmin && scope.isPMorTL) {
    if (projectId) {
      const isAuthorized = scope.projectIds.some(pid => pid.toString() === projectId);
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to stats for this project.' }
        });
      }
      filters.projectId = projectId;
    } else {
      filters.projectIds = scope.projectIds.map(id => id.toString());
    }
  } else {
    if (projectId) filters.projectId = projectId;
  }

  const result = await timeTrackingService.getTimeTrackingStats(user.companyId, filters);

  if (!result.done) {
    throw new Error(result.error || 'Failed to fetch time tracking statistics');
  }

  return sendSuccess(res, result.data, 'Time tracking statistics retrieved successfully');
});

export default {
  getTimeEntries,
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
  rejectTimesheet,
  getTimeTrackingStats
};
