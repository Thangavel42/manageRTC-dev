/**
 * Timesheet REST Controller
 * REST API endpoints for timesheet management
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import { asyncHandler, buildNotFoundError, buildForbiddenError } from '../../middleware/errorHandler.js';
import { extractUser, sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import logger from '../../utils/logger.js';
import { getSocketIO, broadcastTimesheetEvents } from '../../utils/socketBroadcaster.js';
import { withTransactionRetry } from '../../utils/transactionHelper.js';

/**
 * Helper function to check if user has required role
 */
const ensureRole = (user, allowedRoles = []) => {
  const role = user?.role?.toLowerCase();
  return allowedRoles.includes(role);
};

/**
 * Helper function to send 403 Forbidden response
 */
const sendForbidden = (res, message = 'You do not have permission to access this resource') => {
  return res.status(403).json({
    success: false,
    error: { message }
  });
};

/**
 * Helper function to check if user is the timesheet owner or has elevated role
 */
const isOwnerOrElevatedRole = (userId, timesheet, userRole) => {
  if (userId === timesheet.employeeId?.toString()) {
    return true;
  }
  return ['admin', 'hr', 'manager', 'superadmin'].includes(userRole);
};

/**
 * Get all timesheets with optional filters
 * @route GET /api/timesheets
 */
export const getAllTimesheets = asyncHandler(async (req, res) => {
  try {
    const query = req.validatedQuery || req.query;
    const { status, employee, weekStart, weekEnd, page = 1, limit = 50 } = query;
    const user = extractUser(req);

    logger.debug('[Timesheet Controller] Fetching timesheets with query', { status, employee, weekStart, weekEnd, companyId: user.companyId });

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    // Build MongoDB query filter
    const mongoQuery = { isDeleted: { $ne: true } };

    if (status) mongoQuery.status = status;
    if (employee) mongoQuery.employeeId = employee;

    // Date range filter
    if (weekStart && weekEnd) {
      mongoQuery.weekStartDate = {
        $gte: new Date(weekStart),
        $lte: new Date(weekEnd)
      };
    } else if (weekStart) {
      mongoQuery.weekStartDate = { $gte: new Date(weekStart) };
    }

    logger.debug('[Timesheet Controller] MongoDB query', mongoQuery);

    // Get total count
    const total = await collections.timesheets.countDocuments(mongoQuery);

    // Execute query with pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 50, 200);
    const skip = (pageNum - 1) * limitNum;

    const timesheets = await collections.timesheets
      .find(mongoQuery)
      .sort({ weekStartDate: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    // Populate employee data if needed
    for (const timesheet of timesheets) {
      if (timesheet.employee) {
        const employee = await collections.employees.findOne({ _id: timesheet.employee });
        timesheet.employeeDetails = employee ? {
          _id: employee._id,
          employeeId: employee.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.employmentInfo?.email
        } : null;
      }
    }

    logger.info('[Timesheet Controller] Found timesheets', { count: timesheets.length, total });

    // Build pagination metadata
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    res.json({
      success: true,
      data: timesheets,
      pagination,
      count: timesheets.length
    });

  } catch (error) {
    logger.error('[Timesheet Controller] Error fetching timesheets:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch timesheets', details: error.message }
    });
  }
});

/**
 * Get timesheet by ID
 * @route GET /api/timesheets/:id
 */
export const getTimesheetById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const user = extractUser(req);

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    const timesheet = await collections.timesheets.findOne({ _id: new ObjectId(id) });

    if (!timesheet || timesheet.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Timesheet not found' }
      });
    }

    // Check permission - employee can only see own timesheets unless admin/hr
    if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin']) && timesheet.employeeId !== user.userId) {
      return sendForbidden(res, 'You can only view your own timesheets');
    }

    // Populate employee data
    if (timesheet.employee) {
      const employee = await collections.employees.findOne({ _id: timesheet.employee });
      timesheet.employeeDetails = employee ? {
        _id: employee._id,
        employeeId: employee.employeeId,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.employmentInfo?.email,
        department: employee.department,
        designation: employee.designation
      } : null;
    }

    return sendSuccess(res, timesheet, 'Timesheet retrieved successfully');

  } catch (error) {
    logger.error('[Timesheet Controller] Error fetching timesheet:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch timesheet' }
    });
  }
});

/**
 * Get current user's timesheets
 * @route GET /api/timesheets/my
 */
export const getMyTimesheets = asyncHandler(async (req, res) => {
  try {
    const query = req.validatedQuery || req.query;
    const { status, weekStart, limit = 20 } = query;
    const user = extractUser(req);

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    // Build filter
    const mongoQuery = {
      employeeId: user.userId,
      isDeleted: { $ne: true }
    };

    if (status) mongoQuery.status = status;
    if (weekStart) {
      const startDate = new Date(weekStart);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);
      mongoQuery.weekStartDate = { $gte: startDate, $lte: endDate };
    }

    const timesheets = await collections.timesheets
      .find(mongoQuery)
      .sort({ weekStartDate: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json({
      success: true,
      data: timesheets,
      count: timesheets.length
    });

  } catch (error) {
    logger.error('[Timesheet Controller] Error fetching my timesheets:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch timesheets' }
    });
  }
});

/**
 * Create new timesheet
 * @route POST /api/timesheets
 */
export const createTimesheet = asyncHandler(async (req, res) => {
  try {
    const { weekStart, entries, notes } = req.body;
    const user = extractUser(req);

    // Role check: Employees can create own timesheet, admin/hr can create for others
    if (!ensureRole(user, ['admin', 'hr', 'employee', 'manager', 'superadmin'])) {
      return sendForbidden(res, 'You do not have permission to create timesheets');
    }

    logger.debug('[Timesheet Controller] createTimesheet called', { companyId: user.companyId, userId: user.userId });

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    // Get employee record
    const employee = await collections.employees.findOne({ clerkId: user.userId });
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { message: 'Employee record not found' }
      });
    }

    // Validate dates
    const startDate = new Date(weekStart);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);

    // Check if timesheet already exists for this week
    const existing = await collections.timesheets.findOne({
      employeeId: employee.employeeId,
      weekStartDate: startDate,
      isDeleted: { $ne: true }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        error: { message: 'Timesheet for this week already exists' }
      });
    }

    // Calculate hours breakdown
    let totalHours = 0;
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;

    const processedEntries = entries.map(entry => {
      const hours = entry.hours || 0;
      const regularHours = Math.min(hours, 8);
      const overtimeHours = Math.max(0, hours - 8);

      totalHours += hours;
      totalRegularHours += regularHours;
      totalOvertimeHours += overtimeHours;

      return {
        ...entry,
        regularHours,
        overtimeHours
      };
    });

    // Create timesheet
    const timesheet = {
      timesheetId: `TS_${Date.now()}_${employee.employeeId}`,
      employeeId: employee.employeeId,
      employee: employee._id,
      weekStartDate: startDate,
      weekEndDate: endDate,
      entries: processedEntries,
      totalHours,
      totalRegularHours,
      totalOvertimeHours,
      status: 'draft',
      notes: notes || '',
      companyId: user.companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
      updatedBy: user.userId
    };

    const result = await collections.timesheets.insertOne(timesheet);

    if (!result.insertedId) {
      throw new Error('Failed to create timesheet');
    }

    // Get created timesheet
    const createdTimesheet = await collections.timesheets.findOne({ _id: result.insertedId });

    // Broadcast Socket.IO event
    const io = getSocketIO(req);
    if (io) {
      broadcastTimesheetEvents.created(io, user.companyId, createdTimesheet);
    }

    return sendCreated(res, createdTimesheet, 'Timesheet created successfully');

  } catch (error) {
    logger.error('[Timesheet Controller] Error creating timesheet:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create timesheet' }
    });
  }
});

/**
 * Update timesheet
 * @route PUT /api/timesheets/:id
 */
export const updateTimesheet = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { entries, notes } = req.body;
    const user = extractUser(req);

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    // Check if timesheet exists
    const timesheet = await collections.timesheets.findOne({ _id: new ObjectId(id) });

    if (!timesheet || timesheet.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Timesheet not found' }
      });
    }

    // Check permission - only owner can edit draft timesheets, or admin/hr can edit any draft/rejected timesheet
    const canEdit = ensureRole(user, ['admin', 'hr', 'superadmin'])
      ? ['draft', 'rejected'].includes(timesheet.status)
      : timesheet.employeeId === user.userId && ['draft', 'rejected'].includes(timesheet.status);

    if (!canEdit) {
      return sendForbidden(res, 'Timesheet cannot be edited in current state or you lack permission');
    }

    // Recalculate hours
    let totalHours = 0;
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;

    const processedEntries = entries.map(entry => {
      const hours = entry.hours || 0;
      const regularHours = Math.min(hours, 8);
      const overtimeHours = Math.max(0, hours - 8);

      totalHours += hours;
      totalRegularHours += regularHours;
      totalOvertimeHours += overtimeHours;

      return {
        ...entry,
        regularHours,
        overtimeHours
      };
    });

    // Update timesheet
    const updateData = {
      entries: processedEntries,
      totalHours,
      totalRegularHours,
      totalOvertimeHours,
      notes: notes || timesheet.notes,
      updatedAt: new Date(),
      updatedBy: user.userId
    };

    const result = await collections.timesheets.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw buildNotFoundError('Timesheet', id);
    }

    // Get updated timesheet
    const updatedTimesheet = await collections.timesheets.findOne({ _id: new ObjectId(id) });

    // Broadcast Socket.IO event
    const io = getSocketIO(req);
    if (io) {
      broadcastTimesheetEvents.updated(io, user.companyId, updatedTimesheet);
    }

    return sendSuccess(res, updatedTimesheet, 'Timesheet updated successfully');

  } catch (error) {
    logger.error('[Timesheet Controller] Error updating timesheet:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update timesheet' }
    });
  }
});

/**
 * Submit timesheet for approval
 * @route POST /api/timesheets/:id/submit
 */
export const submitTimesheet = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const user = extractUser(req);

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    // Check if timesheet exists
    const timesheet = await collections.timesheets.findOne({ _id: new ObjectId(id) });

    if (!timesheet || timesheet.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Timesheet not found' }
      });
    }

    // Check permission - only owner can submit
    if (timesheet.employeeId !== user.userId && !ensureRole(user, ['admin', 'hr', 'superadmin'])) {
      return sendForbidden(res, 'You can only submit your own timesheets');
    }

    // Check if timesheet can be submitted
    if (timesheet.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: { message: `Timesheet cannot be submitted in current state: ${timesheet.status}` }
      });
    }

    // Check if timesheet has entries
    if (!timesheet.entries || timesheet.entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot submit timesheet with no entries' }
      });
    }

    // Update timesheet
    const updateData = {
      status: 'submitted',
      submittedBy: user.userId,
      submittedAt: new Date(),
      updatedAt: new Date(),
      updatedBy: user.userId
    };

    await collections.timesheets.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    // Broadcast Socket.IO event
    const io = getSocketIO(req);
    if (io) {
      io.to(`company_${user.companyId}`).emit('timesheet:submitted', {
        timesheetId: id,
        employeeId: timesheet.employeeId
      });
    }

    return sendSuccess(res, null, 'Timesheet submitted successfully');

  } catch (error) {
    logger.error('[Timesheet Controller] Error submitting timesheet:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to submit timesheet' }
    });
  }
});

/**
 * Approve timesheet
 * @route POST /api/timesheets/:id/approve
 */
export const approveTimesheet = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { comments } = req.body;
    const user = extractUser(req);

    // Role check: Only admin, hr, manager can approve
    if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin'])) {
      return sendForbidden(res, 'You do not have permission to approve timesheets');
    }

    // Use transaction for atomic timesheet approval
    const result = await withTransactionRetry(user.companyId, async (collections, session) => {
      // Check if timesheet exists within transaction
      const timesheet = await collections.timesheets.findOne(
        { _id: new ObjectId(id) },
        { session }
      );

      if (!timesheet || timesheet.isDeleted) {
        throw buildNotFoundError('Timesheet', id);
      }

      // Check if timesheet can be approved
      if (timesheet.status !== 'submitted') {
        throw new Error(`Cannot approve timesheet in current state: ${timesheet.status}`);
      }

      // Update timesheet within transaction
      const updateData = {
        status: 'approved',
        approvedBy: user.userId,
        approvedAt: new Date(),
        approvalComments: comments || '',
        updatedAt: new Date(),
        updatedBy: user.userId
      };

      await collections.timesheets.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { session }
      );

      // Get updated timesheet
      return await collections.timesheets.findOne(
        { _id: new ObjectId(id) },
        { session }
      );
    });

    // Broadcast Socket.IO event outside transaction
    const io = getSocketIO(req);
    if (io) {
      broadcastTimesheetEvents.approved(io, user.companyId, result);
    }

    return sendSuccess(res, null, 'Timesheet approved successfully');

  } catch (error) {
    logger.error('[Timesheet Controller] Error approving timesheet:', error);

    // Handle different error types
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: { message: error.message || 'Timesheet not found' }
      });
    }

    return res.status(500).json({
      success: false,
      error: { message: 'Failed to approve timesheet' }
    });
  }
});

/**
 * Reject timesheet
 * @route POST /api/timesheets/:id/reject
 */
export const rejectTimesheet = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const user = extractUser(req);

    // Role check: Only admin, hr, manager can reject
    if (!ensureRole(user, ['admin', 'hr', 'manager', 'superadmin'])) {
      return sendForbidden(res, 'You do not have permission to reject timesheets');
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Rejection reason is required' }
      });
    }

    // Use transaction for atomic timesheet rejection
    const result = await withTransactionRetry(user.companyId, async (collections, session) => {
      // Check if timesheet exists within transaction
      const timesheet = await collections.timesheets.findOne(
        { _id: new ObjectId(id) },
        { session }
      );

      if (!timesheet || timesheet.isDeleted) {
        throw buildNotFoundError('Timesheet', id);
      }

      // Check if timesheet can be rejected
      if (timesheet.status !== 'submitted') {
        throw new Error(`Cannot reject timesheet in current state: ${timesheet.status}`);
      }

      // Update timesheet within transaction
      const updateData = {
        status: 'rejected',
        rejectedBy: user.userId,
        rejectedAt: new Date(),
        rejectionReason: reason.trim(),
        updatedAt: new Date(),
        updatedBy: user.userId
      };

      await collections.timesheets.updateOne(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { session }
      );

      // Get updated timesheet
      return await collections.timesheets.findOne(
        { _id: new ObjectId(id) },
        { session }
      );
    });

    // Broadcast Socket.IO event outside transaction
    const io = getSocketIO(req);
    if (io) {
      broadcastTimesheetEvents.rejected(io, user.companyId, result);
    }

    return sendSuccess(res, null, 'Timesheet rejected successfully');

  } catch (error) {
    logger.error('[Timesheet Controller] Error rejecting timesheet:', error);

    // Handle different error types
    if (error.name === 'NotFoundError') {
      return res.status(404).json({
        success: false,
        error: { message: error.message || 'Timesheet not found' }
      });
    }

    return res.status(500).json({
      success: false,
      error: { message: 'Failed to reject timesheet' }
    });
  }
});

/**
 * Delete timesheet (soft delete)
 * @route DELETE /api/timesheets/:id
 */
export const deleteTimesheet = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const user = extractUser(req);

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    // Check if timesheet exists
    const timesheet = await collections.timesheets.findOne({ _id: new ObjectId(id) });

    if (!timesheet || timesheet.isDeleted) {
      return res.status(404).json({
        success: false,
        error: { message: 'Timesheet not found' }
      });
    }

    // Check permission - only owner can delete draft timesheets, admin can delete any draft timesheet
    const canDelete = ensureRole(user, ['admin', 'hr', 'superadmin'])
      ? timesheet.status === 'draft'
      : timesheet.employeeId === user.userId && timesheet.status === 'draft';

    if (!canDelete) {
      return sendForbidden(res, 'Timesheet cannot be deleted in current state or you lack permission');
    }

    // Soft delete
    await collections.timesheets.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: user.userId,
          updatedAt: new Date()
        }
      }
    );

    // Broadcast Socket.IO event
    const io = getSocketIO(req);
    if (io) {
      broadcastTimesheetEvents.deleted(io, user.companyId, id);
    }

    return sendSuccess(res, { _id: id }, 'Timesheet deleted successfully');

  } catch (error) {
    logger.error('[Timesheet Controller] Error deleting timesheet:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete timesheet' }
    });
  }
});

/**
 * Get timesheet statistics
 * @route GET /api/timesheets/stats
 */
export const getTimesheetStats = asyncHandler(async (req, res) => {
  try {
    const { weekStart, weekEnd } = req.query;
    const user = extractUser(req);

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    // Build match filter
    const matchFilter = {
      companyId: user.companyId,
      isDeleted: { $ne: true }
    };

    if (weekStart && weekEnd) {
      matchFilter.weekStartDate = {
        $gte: new Date(weekStart),
        $lte: new Date(weekEnd)
      };
    }

    // Get stats by status
    const statusStats = await collections.timesheets.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$totalHours' },
          totalRegularHours: { $sum: '$totalRegularHours' },
          totalOvertimeHours: { $sum: '$totalOvertimeHours' }
        }
      }
    ]).toArray();

    // Get overall stats
    const totalCount = await collections.timesheets.countDocuments(matchFilter);
    const pendingCount = await collections.timesheets.countDocuments({
      ...matchFilter,
      status: 'submitted'
    });

    const stats = {
      total: totalCount,
      pending: pendingCount,
      byStatus: statusStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalHours: stat.totalHours,
          totalRegularHours: stat.totalRegularHours,
          totalOvertimeHours: stat.totalOvertimeHours
        };
        return acc;
      }, {})
    };

    return sendSuccess(res, stats, 'Timesheet statistics retrieved successfully');

  } catch (error) {
    logger.error('[Timesheet Controller] Error fetching timesheet stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch timesheet statistics' }
    });
  }
});

export default {
  getAllTimesheets,
  getTimesheetById,
  getMyTimesheets,
  createTimesheet,
  updateTimesheet,
  submitTimesheet,
  approveTimesheet,
  rejectTimesheet,
  deleteTimesheet,
  getTimesheetStats
};
