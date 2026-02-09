/**
 * Attendance REST Controller
 * Handles all Attendance CRUD operations via REST API
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import {
  buildNotFoundError,
  buildConflictError,
  buildValidationError,
  asyncHandler
} from '../../middleware/errorHandler.js';
import {
  sendSuccess,
  sendCreated,
  buildPagination,
  extractUser
} from '../../utils/apiResponse.js';
import { getSocketIO, broadcastAttendanceEvents } from '../../utils/socketBroadcaster.js';
import {
  generateAttendanceReport,
  generateEmployeeAttendanceReport,
  convertToCSV,
  convertToExcel,
  convertToPDF
} from '../../utils/attendanceReportGenerator.js';
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

/**
 * Helper: Get employee by clerk user ID
 */
async function getEmployeeByClerkId(collections, clerkUserId) {
  return await collections.employees.findOne({
    clerkUserId: clerkUserId,
    isDeleted: { $ne: true }
  });
}

/**
 * @desc    Get all attendance records with pagination and filtering
 * @route   GET /api/attendance
 * @access  Private (Admin, HR, Superadmin)
 */
export const getAttendances = asyncHandler(async (req, res) => {
  const { page, limit, search, status, employee, startDate, endDate, sortBy, order } = req.query;
  const user = extractUser(req);

  devLog('[Attendance Controller] getAttendances - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build filter
  const filter = {
    isDeleted: { $ne: true }
  };

  // Apply status filter
  if (status) {
    filter.status = status;
  }

  // Apply employee filter
  if (employee) {
    filter.employeeId = employee;
  }

  // Apply date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.date.$lte = new Date(endDate);
    }
  }

  // Apply search filter
  if (search && search.trim()) {
    filter.$or = [
      { notes: { $regex: search, $options: 'i' } },
      { managerNotes: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await collections.attendance.countDocuments(filter);

  // Build sort option
  const sort = {};
  if (sortBy) {
    sort[sortBy] = order === 'asc' ? 1 : -1;
  } else {
    sort.date = -1;
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const attendance = await collections.attendance
    .find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, attendance, 'Attendance records retrieved successfully', 200, pagination);
});

/**
 * @desc    Get single attendance record by ID
 * @route   GET /api/attendance/:id
 * @access  Private (All authenticated users)
 */
export const getAttendanceById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid attendance ID format');
  }

  devLog('[Attendance Controller] getAttendanceById - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const attendance = await collections.attendance.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!attendance) {
    throw buildNotFoundError('Attendance record', id);
  }

  return sendSuccess(res, attendance);
});

/**
 * @desc    Create new attendance record (clock in)
 * @route   POST /api/attendance
 * @access  Private (All authenticated users)
 */
export const createAttendance = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const attendanceData = req.body;

  devLog('[Attendance Controller] createAttendance - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get Employee record from Clerk user ID
  const employee = await getEmployeeByClerkId(collections, user.userId);

  if (!employee) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'EMPLOYEE_RECORD_NOT_FOUND',
        message: 'Employee record not found. Please sync your profile to create an employee record.',
        needsSync: true,
        syncEndpoint: '/api/employees/sync-my-employee'
      }
    });
  }

  // Check if already clocked in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const existingAttendance = await collections.attendance.findOne({
    employeeId: employee.employeeId,
    date: {
      $gte: today,
      $lt: tomorrow
    },
    isDeleted: { $ne: true }
  });

  if (existingAttendance && existingAttendance.clockIn?.time && !existingAttendance.clockOut?.time) {
    throw buildConflictError('Already clocked in today. Please clock out first.');
  }

  // Prepare attendance data
  const attendanceToInsert = {
    attendanceId: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    employee: employee._id, // ObjectId reference for Mongoose features
    employeeId: employee.employeeId, // String ID for efficient querying
    employeeName: `${employee.firstName} ${employee.lastName}`,
    date: new Date(),
    clockIn: {
      time: attendanceData.clockIn?.time || new Date(),
      location: attendanceData.clockIn?.location || { type: 'office' },
      notes: attendanceData.clockIn?.notes || ''
    },
    status: 'present',
    shiftId: attendanceData.shiftId || null,
    createdBy: user.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false
  };

  const result = await collections.attendance.insertOne(attendanceToInsert);

  if (!result.insertedId) {
    throw new Error('Failed to create attendance record');
  }

  // Get created attendance
  const attendance = await collections.attendance.findOne({ _id: result.insertedId });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastAttendanceEvents.created(io, user.companyId, attendance);
    broadcastAttendanceEvents.clockIn(io, user.companyId, attendance);
  }

  return sendCreated(res, attendance, 'Clocked in successfully');
});

/**
 * @desc    Update attendance record (clock out)
 * @route   PUT /api/attendance/:id
 * @access  Private (All authenticated users)
 */
export const updateAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid attendance ID format');
  }

  devLog('[Attendance Controller] updateAttendance - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const attendance = await collections.attendance.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!attendance) {
    throw buildNotFoundError('Attendance record', id);
  }

  // Check if clocked in
  if (!attendance.clockIn || !attendance.clockIn.time) {
    throw buildConflictError('Not clocked in yet');
  }

  // Check if already clocked out
  if (attendance.clockOut && attendance.clockOut.time) {
    throw buildConflictError('Already clocked out');
  }

  // If clock-out data provided, set it
  const updateObj = {
    updatedAt: new Date()
  };

  if (updateData.clockOut) {
    updateObj.clockOut = {
      time: updateData.clockOut.time || new Date(),
      location: updateData.clockOut.location || { type: 'office' },
      notes: updateData.clockOut.notes || ''
    };
  } else if (!updateData.clockOut) {
    updateObj.clockOut = {
      time: new Date(),
      location: { type: 'office' }
    };
  }

  // Update break duration if provided
  if (updateData.breakDuration !== undefined) {
    updateObj.breakDuration = updateData.breakDuration;
  }

  // Calculate work hours if both clock in and out exist
  if (updateObj.clockOut?.time && attendance.clockIn?.time) {
    const clockInTime = new Date(attendance.clockIn.time);
    const clockOutTime = new Date(updateObj.clockOut.time);
    const breakDuration = updateObj.breakDuration || 0;
    const workDuration = clockOutTime - clockInTime - (breakDuration * 60 * 1000);
    updateObj.workHours = Math.max(0, workDuration / (60 * 60 * 1000)); // in hours
  }

  const result = await collections.attendance.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Attendance record', id);
  }

  // Get updated attendance
  const updatedAttendance = await collections.attendance.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastAttendanceEvents.updated(io, user.companyId, updatedAttendance);
    broadcastAttendanceEvents.clockOut(io, user.companyId, updatedAttendance);
  }

  return sendSuccess(res, updatedAttendance, 'Clocked out successfully');
});

/**
 * @desc    Delete attendance record (soft delete)
 * @route   DELETE /api/attendance/:id
 * @access  Private (Admin, Superadmin)
 */
export const deleteAttendance = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid attendance ID format');
  }

  devLog('[Attendance Controller] deleteAttendance - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const attendance = await collections.attendance.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!attendance) {
    throw buildNotFoundError('Attendance record', id);
  }

  // Soft delete
  const result = await collections.attendance.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.userId
      }
    }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Attendance record', id);
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastAttendanceEvents.deleted(io, user.companyId, attendance.attendanceId, user.userId);
  }

  return sendSuccess(res, {
    _id: attendance._id,
    attendanceId: attendance.attendanceId,
    isDeleted: true
  }, 'Attendance record deleted successfully');
});

/**
 * @desc    Get my attendance records
 * @route   GET /api/attendance/my
 * @access  Private (All authenticated users)
 */
export const getMyAttendance = asyncHandler(async (req, res) => {
  const { page, limit, startDate, endDate, status } = req.query;
  const user = extractUser(req);

  devLog('[Attendance Controller] getMyAttendance - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get Employee record
  const employee = await getEmployeeByClerkId(collections, user.userId);

  if (!employee) {
    return sendSuccess(res, [], 'No attendance records found');
  }

  // Build filter
  const filter = {
    employeeId: employee.employeeId,
    isDeleted: { $ne: true }
  };

  // Apply date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.date.$lte = new Date(endDate);
    }
  }

  // Apply status filter
  if (status) {
    filter.status = status;
  }

  const attendances = await collections.attendance
    .find(filter)
    .sort({ date: -1 })
    .limit(parseInt(limit) || 31)
    .toArray();

  return sendSuccess(res, attendances, 'My attendance records retrieved successfully');
});

/**
 * @desc    Get attendance by date range
 * @route   GET /api/attendance/daterange
 * @access  Private (Admin, HR, Superadmin)
 */
export const getAttendanceByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate, page, limit } = req.query;
  const user = extractUser(req);

  if (!startDate || !endDate) {
    throw buildValidationError('startDate/endDate', 'Both startDate and endDate are required');
  }

  devLog('[Attendance Controller] getAttendanceByDateRange - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build filter
  const filter = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    isDeleted: { $ne: true }
  };

  const total = await collections.attendance.countDocuments(filter);

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 31;
  const skip = (pageNum - 1) * limitNum;

  const attendance = await collections.attendance
    .find(filter)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, attendance, 'Attendance records retrieved successfully', 200, pagination);
});

/**
 * @desc    Get attendance by employee
 * @route   GET /api/attendance/employee/:employeeId
 * @access  Private (Admin, HR, Superadmin)
 */
export const getAttendanceByEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { page, limit, startDate, endDate } = req.query;
  const user = extractUser(req);

  // Validate employeeId (it's a string like "EMP-2026-0001", not an ObjectId)
  if (!employeeId || typeof employeeId !== 'string' || !employeeId.trim()) {
    throw buildValidationError('employeeId', 'Employee ID is required and must be a string');
  }

  devLog('[Attendance Controller] getAttendanceByEmployee - employeeId:', employeeId, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build filter
  const filter = {
    employeeId,
    isDeleted: { $ne: true }
  };

  // Apply date range filter
  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.date.$lte = new Date(endDate);
    }
  }

  const total = await collections.attendance.countDocuments(filter);

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 31;
  const skip = (pageNum - 1) * limitNum;

  const attendance = await collections.attendance
    .find(filter)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, attendance, 'Employee attendance records retrieved successfully', 200, pagination);
});

/**
 * @desc    Get attendance statistics
 * @route   GET /api/attendance/stats
 * @access  Private (Admin, HR, Superadmin)
 */
export const getAttendanceStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, employee } = req.query;
  const user = extractUser(req);

  devLog('[Attendance Controller] getAttendanceStats - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build filters
  const filter = {
    isDeleted: { $ne: true }
  };

  if (employee) {
    filter.employeeId = employee;
  }

  if (startDate || endDate) {
    filter.date = {};
    if (startDate) {
      filter.date.$gte = new Date(startDate);
    }
    if (endDate) {
      filter.date.$lte = new Date(endDate);
    }
  }

  const allAttendance = await collections.attendance.find(filter).toArray();

  const present = allAttendance.filter(a => a.status === 'present').length;
  const absent = allAttendance.filter(a => a.status === 'absent').length;
  const late = allAttendance.filter(a => a.status === 'late').length;
  const halfDay = allAttendance.filter(a => a.status === 'half-day').length;
  const total = allAttendance.length;

  // Calculate total hours worked
  const totalHoursWorked = allAttendance.reduce((sum, a) => sum + (a.workHours || 0), 0);

  const stats = {
    total,
    present,
    absent,
    late,
    halfDay,
    totalHoursWorked: totalHoursWorked.toFixed(2),
    averageHoursPerDay: total > 0 ? (totalHoursWorked / total).toFixed(2) : 0,
    attendanceRate: total > 0 ? ((present / total) * 100).toFixed(2) : 0,
    lateRate: total > 0 ? ((late / total) * 100).toFixed(2) : 0
  };

  return sendSuccess(res, stats, 'Attendance statistics retrieved successfully');
});

/**
 * @desc    Bulk attendance action
 * @route   POST /api/attendance/bulk
 * @access  Private (Admin, HR, Superadmin)
 */
export const bulkAttendanceAction = asyncHandler(async (req, res) => {
  const { action, attendanceIds, data } = req.body;
  const user = extractUser(req);

  devLog('[Attendance Controller] bulkAttendanceAction - companyId:', user.companyId);

  if (!action || !attendanceIds || !Array.isArray(attendanceIds)) {
    throw buildValidationError('action/attendanceIds', 'Action and attendanceIds array are required');
  }

  const validActions = ['approve-regularization', 'reject-regularization', 'update-status', 'bulk-delete'];
  if (!validActions.includes(action)) {
    throw buildValidationError('action', `Invalid action. Must be one of: ${validActions.join(', ')}`);
  }

  // Convert IDs to ObjectIds
  const attendanceObjectIds = attendanceIds.map(id => new ObjectId(id));

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find all attendance records
  const attendances = await collections.attendance.find({
    _id: { $in: attendanceObjectIds },
    isDeleted: { $ne: true }
  }).toArray();

  if (attendances.length === 0) {
    throw buildNotFoundError('Attendance records', attendanceIds.join(', '));
  }

  let updatedCount = 0;
  const results = [];

  // Perform bulk action
  for (const attendance of attendances) {
    try {
      switch (action) {
        case 'approve-regularization':
          if (attendance.regularizationRequest?.requested) {
            await collections.attendance.updateOne(
              { _id: attendance._id },
              {
                $set: {
                  'regularizationRequest.status': 'approved',
                  'regularizationRequest.approvedBy': user.userId,
                  'regularizationRequest.approvedAt': new Date(),
                  isRegularized: true,
                  updatedAt: new Date()
                }
              }
            );
            updatedCount++;
          }
          break;

        case 'reject-regularization':
          if (attendance.regularizationRequest?.requested) {
            await collections.attendance.updateOne(
              { _id: attendance._id },
              {
                $set: {
                  'regularizationRequest.status': 'rejected',
                  'regularizationRequest.rejectionReason': data?.reason || 'Request rejected',
                  updatedAt: new Date()
                }
              }
            );
            updatedCount++;
          }
          break;

        case 'update-status':
          if (data?.status) {
            await collections.attendance.updateOne(
              { _id: attendance._id },
              {
                $set: {
                  status: data.status,
                  updatedAt: new Date()
                }
              }
            );
            updatedCount++;
          }
          break;

        case 'bulk-delete':
          await collections.attendance.updateOne(
            { _id: attendance._id },
            {
              $set: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: user.userId
              }
            }
          );
          updatedCount++;
          break;
      }

      results.push({
        attendanceId: attendance.attendanceId,
        _id: attendance._id,
        success: true
      });
    } catch (error) {
      results.push({
        attendanceId: attendance.attendanceId,
        _id: attendance._id,
        success: false,
        error: error.message
      });
    }
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastAttendanceEvents.bulkUpdated(io, user.companyId, {
      action,
      updatedCount,
      results
    });
  }

  return sendSuccess(res, {
    action,
    requested: attendanceIds.length,
    updated: updatedCount,
    results
  }, `Bulk action completed: ${updatedCount} of ${attendanceIds.length} attendance records updated`);
});

/**
 * @desc    Request attendance regularization
 * @route   POST /api/attendance/:id/request-regularization
 * @access  Private (All authenticated users)
 */
export const requestRegularization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid attendance ID format');
  }

  if (!reason || !reason.trim()) {
    throw buildValidationError('reason', 'Reason is required for regularization request');
  }

  devLog('[Attendance Controller] requestRegularization - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const attendance = await collections.attendance.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!attendance) {
    throw buildNotFoundError('Attendance record', id);
  }

  // Get Employee record
  const employee = await getEmployeeByClerkId(collections, user.userId);
  if (!employee || employee.employeeId !== attendance.employeeId) {
    const userRole = user.role?.toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';
    if (!isAdmin) {
      throw buildConflictError('You can only request regularization for your own attendance');
    }
  }

  // Check if regularization already requested
  if (attendance.regularizationRequest?.requested) {
    throw buildConflictError('Regularization already requested for this attendance');
  }

  // Create regularization request
  const updateObj = {
    'regularizationRequest.requested': true,
    'regularizationRequest.reason': reason,
    'regularizationRequest.requestedBy': user.userId,
    'regularizationRequest.requestedAt': new Date(),
    'regularizationRequest.status': 'pending',
    updatedAt: new Date()
  };

  const result = await collections.attendance.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Attendance record', id);
  }

  // Get updated attendance
  const updatedAttendance = await collections.attendance.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastAttendanceEvents.updated(io, user.companyId, updatedAttendance);
  }

  return sendSuccess(res, updatedAttendance, 'Regularization request submitted successfully');
});

/**
 * @desc    Approve attendance regularization
 * @route   POST /api/attendance/:id/approve-regularization
 * @access  Private (Admin, HR, Manager)
 */
export const approveRegularization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid attendance ID format');
  }

  devLog('[Attendance Controller] approveRegularization - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const attendance = await collections.attendance.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!attendance) {
    throw buildNotFoundError('Attendance record', id);
  }

  // Check if regularization is requested
  if (!attendance.regularizationRequest?.requested) {
    throw buildConflictError('No regularization request found for this attendance');
  }

  // Approve regularization
  const updateObj = {
    'regularizationRequest.status': 'approved',
    'regularizationRequest.approvedBy': user.userId,
    'regularizationRequest.approvedAt': new Date(),
    'regularizationRequest.comments': comments || '',
    isRegularized: true,
    updatedAt: new Date()
  };

  const result = await collections.attendance.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Attendance record', id);
  }

  // Get updated attendance
  const updatedAttendance = await collections.attendance.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastAttendanceEvents.updated(io, user.companyId, updatedAttendance);
  }

  return sendSuccess(res, updatedAttendance, 'Regularization approved successfully');
});

/**
 * @desc    Reject attendance regularization
 * @route   POST /api/attendance/:id/reject-regularization
 * @access  Private (Admin, HR, Manager)
 */
export const rejectRegularization = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid attendance ID format');
  }

  if (!reason || !reason.trim()) {
    throw buildValidationError('reason', 'Rejection reason is required');
  }

  devLog('[Attendance Controller] rejectRegularization - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const attendance = await collections.attendance.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!attendance) {
    throw buildNotFoundError('Attendance record', id);
  }

  // Check if regularization is requested
  if (!attendance.regularizationRequest?.requested) {
    throw buildConflictError('No regularization request found for this attendance');
  }

  // Reject regularization
  const updateObj = {
    'regularizationRequest.status': 'rejected',
    'regularizationRequest.rejectionReason': reason,
    'regularizationRequest.rejectedBy': user.userId,
    'regularizationRequest.rejectedAt': new Date(),
    updatedAt: new Date()
  };

  const result = await collections.attendance.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Attendance record', id);
  }

  // Get updated attendance
  const updatedAttendance = await collections.attendance.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastAttendanceEvents.updated(io, user.companyId, updatedAttendance);
  }

  return sendSuccess(res, updatedAttendance, 'Regularization rejected successfully');
});

/**
 * @desc    Get pending regularization requests
 * @route   GET /api/attendance/regularization/pending
 * @access  Private (Admin, HR, Manager)
 */
export const getPendingRegularizations = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const user = extractUser(req);

  devLog('[Attendance Controller] getPendingRegularizations - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build filter
  const filter = {
    'regularizationRequest.requested': true,
    'regularizationRequest.status': 'pending',
    isDeleted: { $ne: true }
  };

  const total = await collections.attendance.countDocuments(filter);

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const attendances = await collections.attendance
    .find(filter)
    .sort({ 'regularizationRequest.requestedAt': -1 })
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, attendances, 'Pending regularization requests retrieved successfully', 200, pagination);
});

/**
 * @desc    Generate attendance report
 * @route   POST /api/attendance/report
 * @access  Private (Admin, HR, Superadmin)
 */
export const generateReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, employeeId, status, format = 'json' } = req.body;
  const user = extractUser(req);

  if (!startDate || !endDate) {
    throw buildValidationError('startDate/endDate', 'Start date and end date are required');
  }

  devLog('[Attendance Controller] generateReport - companyId:', user.companyId);

  // Generate report data
  const reportData = await generateAttendanceReport(user.companyId, {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    employeeId,
    status
  });

  // Convert based on format
  switch (format) {
    case 'csv':
      const csvData = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${Date.now()}.csv"`);
      return res.send(csvData);

    case 'excel':
      const excelData = convertToExcel(reportData);
      return sendSuccess(res, excelData, 'Attendance report generated (Excel format)', 200);

    case 'pdf':
      const pdfData = convertToPDF(reportData);
      return sendSuccess(res, pdfData, 'Attendance report generated (PDF format)', 200);

    case 'json':
    default:
      return sendSuccess(res, reportData, 'Attendance report generated successfully');
  }
});

/**
 * @desc    Generate employee attendance report
 * @route   POST /api/attendance/report/employee/:employeeId
 * @access  Private (Admin, HR, Superadmin, Employee for own)
 */
export const generateEmployeeReport = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { startDate, endDate, format = 'json' } = req.body;
  const user = extractUser(req);

  // Validate employeeId (it's a string like "EMP-2026-0001", not an ObjectId)
  if (!employeeId || typeof employeeId !== 'string' || !employeeId.trim()) {
    throw buildValidationError('employeeId', 'Employee ID is required and must be a string');
  }

  if (!startDate || !endDate) {
    throw buildValidationError('startDate/endDate', 'Start date and end date are required');
  }

  devLog('[Attendance Controller] generateEmployeeReport - companyId:', user.companyId);

  // Generate employee report data
  const reportData = await generateEmployeeAttendanceReport(
    user.companyId,
    employeeId,
    new Date(startDate),
    new Date(endDate)
  );

  // Convert based on format
  switch (format) {
    case 'csv':
      const csvData = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${employeeId}-${Date.now()}.csv"`);
      return res.send(csvData);

    case 'excel':
      const excelData = convertToExcel(reportData);
      return sendSuccess(res, excelData, 'Employee attendance report generated (Excel format)', 200);

    case 'pdf':
      const pdfData = convertToPDF(reportData);
      return sendSuccess(res, pdfData, 'Employee attendance report generated (PDF format)', 200);

    case 'json':
    default:
      return sendSuccess(res, reportData, 'Employee attendance report generated successfully');
  }
});

/**
 * @desc    Export attendance data
 * @route   GET /api/attendance/export
 * @access  Private (Admin, HR, Superadmin)
 */
export const exportAttendance = asyncHandler(async (req, res) => {
  const { startDate, endDate, employeeId, format = 'csv' } = req.query;
  const user = extractUser(req);

  const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
  const end = endDate ? new Date(endDate) : new Date();

  devLog('[Attendance Controller] exportAttendance - companyId:', user.companyId);

  // Generate report data
  const reportData = await generateAttendanceReport(user.companyId, {
    startDate: start,
    endDate: end,
    employeeId
  });

  // Export based on format
  switch (format) {
    case 'csv':
      const csvData = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-export-${Date.now()}.csv"`);
      return res.send(csvData);

    case 'excel':
    case 'json':
    default:
      const excelData = convertToExcel(reportData);
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-export-${Date.now()}.json"`);
      return res.json(excelData);
  }
});

export default {
  getAttendances,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  getMyAttendance,
  getAttendanceByDateRange,
  getAttendanceByEmployee,
  getAttendanceStats,
  bulkAttendanceAction,
  requestRegularization,
  approveRegularization,
  rejectRegularization,
  getPendingRegularizations,
  generateReport,
  generateEmployeeReport,
  exportAttendance
};
