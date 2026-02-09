/**
 * Overtime Request REST Controller
 * Handles all Overtime Request CRUD operations via REST API
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import {
  asyncHandler,
  buildConflictError,
  buildNotFoundError,
  buildValidationError,
  buildForbiddenError
} from '../../middleware/errorHandler.js';
import {
  buildPagination,
  extractUser,
  sendCreated,
  sendSuccess
} from '../../utils/apiResponse.js';
import { broadcastOvertimeEvents, getSocketIO } from '../../utils/socketBroadcaster.js';
import logger from '../../utils/logger.js';

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
 * @desc    Get all overtime requests with pagination and filtering
 * @route   GET /api/overtime
 * @access  Private (Admin, HR, Superadmin)
 */
export const getOvertimeRequests = asyncHandler(async (req, res) => {
  const { page, limit, search, status, employee, startDate, endDate, sortBy, order } = req.query;
  const user = extractUser(req);

  logger.debug('[Overtime Controller] getOvertimeRequests called', { companyId: user.companyId, userId: user.userId });

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
      { reason: { $regex: search, $options: 'i' } },
      { taskDescription: { $regex: search, $options: 'i' } },
      { employeeName: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await collections.overtimeRequests.countDocuments(filter);

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

  const overtimeRequests = await collections.overtimeRequests
    .find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, overtimeRequests, 'Overtime requests retrieved successfully', 200, pagination);
});

/**
 * @desc    Get single overtime request by ID
 * @route   GET /api/overtime/:id
 * @access  Private (All authenticated users)
 */
export const getOvertimeRequestById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid overtime request ID format');
  }

  logger.debug('[Overtime Controller] getOvertimeRequestById called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const overtimeRequest = await collections.overtimeRequests.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!overtimeRequest) {
    throw buildNotFoundError('Overtime request', id);
  }

  return sendSuccess(res, overtimeRequest);
});

/**
 * @desc    Get my overtime requests
 * @route   GET /api/overtime/my
 * @access  Private (All authenticated users)
 */
export const getMyOvertimeRequests = asyncHandler(async (req, res) => {
  const { page, limit, status, startDate, endDate } = req.query;
  const user = extractUser(req);

  logger.debug('[Overtime Controller] getMyOvertimeRequests called', { companyId: user.companyId, userId: user.userId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get Employee record
  const employee = await getEmployeeByClerkId(collections, user.userId);

  if (!employee) {
    return sendSuccess(res, [], 'No overtime requests found');
  }

  // Build filter
  const filter = {
    employeeId: employee.employeeId,
    isDeleted: { $ne: true }
  };

  // Apply status filter
  if (status) {
    filter.status = status;
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

  // Get total count
  const total = await collections.overtimeRequests.countDocuments(filter);

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const overtimeRequests = await collections.overtimeRequests
    .find(filter)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, overtimeRequests, 'My overtime requests retrieved successfully', 200, pagination);
});

/**
 * @desc    Create new overtime request
 * @route   POST /api/overtime
 * @access  Private (All authenticated users)
 */
export const createOvertimeRequest = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const overtimeData = req.body;

  logger.debug('[Overtime Controller] createOvertimeRequest called', { companyId: user.companyId, userId: user.userId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get Employee record from Clerk user ID
  const employee = await getEmployeeByClerkId(collections, user.userId);

  if (!employee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  // Validate dates
  const overtimeDate = new Date(overtimeData.date);
  const startTime = new Date(overtimeData.startTime);
  const endTime = new Date(overtimeData.endTime);

  if (endTime <= startTime) {
    throw buildValidationError('endTime', 'End time must be after start time');
  }

  // Calculate hours
  const durationMs = endTime - startTime;
  const durationHours = durationMs / (1000 * 60 * 60);

  if (durationHours < 0.25) {
    throw buildValidationError('duration', 'Minimum overtime is 15 minutes');
  }

  if (durationHours > 12) {
    throw buildValidationError('duration', 'Maximum overtime per day is 12 hours');
  }

  // Check for existing overtime on same date
  const existingOvertime = await collections.overtimeRequests.findOne({
    employeeId: employee.employeeId,
    date: overtimeDate,
    status: { $in: ['pending', 'approved'] },
    isDeleted: { $ne: true }
  });

  if (existingOvertime) {
    throw buildConflictError('You already have an overtime request for this date');
  }

  // Prepare overtime request data
  const overtimeToInsert = {
    overtimeId: `ot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    employee: employee._id,
    employeeId: employee.employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    companyId: user.companyId,
    date: overtimeDate,
    startTime: startTime,
    endTime: endTime,
    requestedHours: overtimeData.requestedHours || durationHours,
    approvedHours: 0,
    reason: overtimeData.reason || '',
    project: overtimeData.project || '',
    taskDescription: overtimeData.taskDescription || '',
    status: 'pending',
    attachments: overtimeData.attachments || [],
    createdBy: user.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false
  };

  const result = await collections.overtimeRequests.insertOne(overtimeToInsert);

  if (!result.insertedId) {
    throw new Error('Failed to create overtime request');
  }

  // Get created overtime request
  const overtimeRequest = await collections.overtimeRequests.findOne({ _id: result.insertedId });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastOvertimeEvents.created(io, user.companyId, overtimeRequest);
  }

  return sendCreated(res, overtimeRequest, 'Overtime request created successfully');
});

/**
 * @desc    Approve overtime request
 * @route   POST /api/overtime/:id/approve
 * @access  Private (Admin, HR, Manager)
 */
export const approveOvertimeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments, approvedHours } = req.body;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid overtime request ID format');
  }

  logger.debug('[Overtime Controller] approveOvertimeRequest called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const overtimeRequest = await collections.overtimeRequests.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!overtimeRequest) {
    throw buildNotFoundError('Overtime request', id);
  }

  // Check if overtime can be approved
  if (overtimeRequest.status !== 'pending') {
    throw buildConflictError('Can only approve pending overtime requests');
  }

  // Approve overtime
  const updateObj = {
    status: 'approved',
    approvedBy: user.userId,
    approvedAt: new Date(),
    approvalComments: comments || '',
    approvedHours: approvedHours || overtimeRequest.requestedHours,
    updatedAt: new Date()
  };

  const result = await collections.overtimeRequests.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Overtime request', id);
  }

  // Get updated overtime request
  const updatedRequest = await collections.overtimeRequests.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastOvertimeEvents.approved(io, user.companyId, updatedRequest, user.userId);
  }

  return sendSuccess(res, updatedRequest, 'Overtime request approved successfully');
});

/**
 * @desc    Reject overtime request
 * @route   POST /api/overtime/:id/reject
 * @access  Private (Admin, HR, Manager)
 */
export const rejectOvertimeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = extractUser(req);

  if (!reason || !reason.trim()) {
    throw buildValidationError('reason', 'Rejection reason is required');
  }

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid overtime request ID format');
  }

  logger.debug('[Overtime Controller] rejectOvertimeRequest called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const overtimeRequest = await collections.overtimeRequests.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!overtimeRequest) {
    throw buildNotFoundError('Overtime request', id);
  }

  // Check if overtime can be rejected
  if (overtimeRequest.status !== 'pending') {
    throw buildConflictError('Can only reject pending overtime requests');
  }

  // Reject overtime
  const updateObj = {
    status: 'rejected',
    rejectedBy: user.userId,
    rejectedAt: new Date(),
    rejectionReason: reason,
    updatedAt: new Date()
  };

  const result = await collections.overtimeRequests.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Overtime request', id);
  }

  // Get updated overtime request
  const updatedRequest = await collections.overtimeRequests.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastOvertimeEvents.rejected(io, user.companyId, updatedRequest, user.userId, reason);
  }

  return sendSuccess(res, updatedRequest, 'Overtime request rejected successfully');
});

/**
 * @desc    Update overtime request
 * @route   PUT /api/overtime/:id
 * @access  Private (Owner can edit pending requests)
 */
export const updateOvertimeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const overtimeData = req.body;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid overtime request ID format');
  }

  logger.debug('[Overtime Controller] updateOvertimeRequest called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const overtimeRequest = await collections.overtimeRequests.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!overtimeRequest) {
    throw buildNotFoundError('Overtime request', id);
  }

  // Get Employee record to verify ownership
  const employee = await getEmployeeByClerkId(collections, user.userId);

  if (!employee || employee.employeeId !== overtimeRequest.employeeId) {
    // Allow admins to edit any overtime (case-insensitive)
    const userRole = user.role?.toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';
    if (!isAdmin) {
      throw buildForbiddenError('You can only edit your own overtime requests');
    }
  }

  // Check if overtime can be edited
  if (overtimeRequest.status !== 'pending') {
    throw buildConflictError(`Cannot edit ${overtimeRequest.status} overtime requests. Only pending requests can be edited.`);
  }

  // Validate and prepare update data
  const updateData = {
    updatedAt: new Date()
  };

  if (overtimeData.reason !== undefined) {
    updateData.reason = overtimeData.reason;
  }

  if (overtimeData.project !== undefined) {
    updateData.project = overtimeData.project;
  }

  if (overtimeData.taskDescription !== undefined) {
    updateData.taskDescription = overtimeData.taskDescription;
  }

  if (overtimeData.attachments !== undefined) {
    updateData.attachments = overtimeData.attachments;
  }

  // If date/time is being updated, recalculate hours
  if (overtimeData.date || overtimeData.startTime || overtimeData.endTime) {
    const date = new Date(overtimeData.date || overtimeRequest.date);
    const startTime = new Date(overtimeData.startTime || overtimeRequest.startTime);
    const endTime = new Date(overtimeData.endTime || overtimeRequest.endTime);

    if (endTime <= startTime) {
      throw buildValidationError('endTime', 'End time must be after start time');
    }

    const durationMs = endTime - startTime;
    const durationHours = durationMs / (1000 * 60 * 60);

    if (durationHours < 0.25) {
      throw buildValidationError('duration', 'Minimum overtime is 15 minutes');
    }

    if (durationHours > 12) {
      throw buildValidationError('duration', 'Maximum overtime per day is 12 hours');
    }

    updateData.date = date;
    updateData.startTime = startTime;
    updateData.endTime = endTime;
    updateData.requestedHours = durationHours;
  }

  // Update overtime request
  const result = await collections.overtimeRequests.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Overtime request', id);
  }

  // Get updated overtime request
  const updatedRequest = await collections.overtimeRequests.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastOvertimeEvents.updated(io, user.companyId, updatedRequest, user.userId);
  }

  return sendSuccess(res, updatedRequest, 'Overtime request updated successfully');
});

/**
 * @desc    Cancel overtime request
 * @route   POST /api/overtime/:id/cancel
 * @access  Private (All authenticated users)
 */
export const cancelOvertimeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid overtime request ID format');
  }

  logger.debug('[Overtime Controller] cancelOvertimeRequest called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const overtimeRequest = await collections.overtimeRequests.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!overtimeRequest) {
    throw buildNotFoundError('Overtime request', id);
  }

  // Get Employee record to verify ownership
  const employee = await getEmployeeByClerkId(collections, user.userId);

  if (!employee || employee.employeeId !== overtimeRequest.employeeId) {
    // Allow admins to cancel any overtime (case-insensitive)
    const userRole = user.role?.toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';
    if (!isAdmin) {
      throw buildForbiddenError('You can only cancel your own overtime requests');
    }
  }

  // Check if overtime can be cancelled
  if (overtimeRequest.status === 'cancelled') {
    throw buildConflictError('Overtime request is already cancelled');
  }

  if (overtimeRequest.status === 'rejected') {
    throw buildConflictError('Cannot cancel a rejected overtime request');
  }

  if (overtimeRequest.status === 'approved') {
    throw buildConflictError('Cannot cancel an approved overtime request. Please contact HR.');
  }

  // Cancel overtime
  const updateObj = {
    status: 'cancelled',
    cancelledBy: user.userId,
    cancelledAt: new Date(),
    cancellationReason: reason || 'Cancelled by employee',
    updatedAt: new Date()
  };

  const result = await collections.overtimeRequests.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Overtime request', id);
  }

  // Get updated overtime request
  const updatedRequest = await collections.overtimeRequests.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastOvertimeEvents.cancelled(io, user.companyId, updatedRequest, user.userId);
  }

  return sendSuccess(res, updatedRequest, 'Overtime request cancelled successfully');
});

/**
 * @desc    Get pending overtime requests
 * @route   GET /api/overtime/pending
 * @access  Private (Admin, HR, Manager)
 */
export const getPendingOvertimeRequests = asyncHandler(async (req, res) => {
  const { page, limit } = req.query;
  const user = extractUser(req);

  logger.debug('[Overtime Controller] getPendingOvertimeRequests called', { companyId: user.companyId, userId: user.userId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build filter
  const filter = {
    status: 'pending',
    isDeleted: { $ne: true }
  };

  const total = await collections.overtimeRequests.countDocuments(filter);

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const overtimeRequests = await collections.overtimeRequests
    .find(filter)
    .sort({ date: -1 })
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, overtimeRequests, 'Pending overtime requests retrieved successfully', 200, pagination);
});

/**
 * @desc    Get overtime statistics
 * @route   GET /api/overtime/stats
 * @access  Private (Admin, HR, Superadmin)
 */
export const getOvertimeStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, employee } = req.query;
  const user = extractUser(req);

  logger.debug('[Overtime Controller] getOvertimeStats called', { companyId: user.companyId, userId: user.userId });

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

  const allRequests = await collections.overtimeRequests.find(filter).toArray();

  const pending = allRequests.filter(r => r.status === 'pending').length;
  const approved = allRequests.filter(r => r.status === 'approved').length;
  const rejected = allRequests.filter(r => r.status === 'rejected').length;
  const cancelled = allRequests.filter(r => r.status === 'cancelled').length;
  const total = allRequests.length;

  // Calculate total hours
  const totalRequestedHours = allRequests.reduce((sum, r) => sum + (r.requestedHours || 0), 0);
  const totalApprovedHours = allRequests
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + (r.approvedHours || 0), 0);

  const stats = {
    total,
    pending,
    approved,
    rejected,
    cancelled,
    totalRequestedHours: totalRequestedHours.toFixed(2),
    totalApprovedHours: totalApprovedHours.toFixed(2),
    averageHoursPerRequest: total > 0 ? (totalRequestedHours / total).toFixed(2) : 0,
    approvalRate: total > 0 ? ((approved / total) * 100).toFixed(2) : 0
  };

  return sendSuccess(res, stats, 'Overtime statistics retrieved successfully');
});

/**
 * @desc    Delete overtime request (soft delete)
 * @route   DELETE /api/overtime/:id
 * @access  Private (Admin, Superadmin)
 */
export const deleteOvertimeRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid overtime request ID format');
  }

  logger.debug('[Overtime Controller] deleteOvertimeRequest called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const overtimeRequest = await collections.overtimeRequests.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!overtimeRequest) {
    throw buildNotFoundError('Overtime request', id);
  }

  // Soft delete
  const result = await collections.overtimeRequests.updateOne(
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
    throw buildNotFoundError('Overtime request', id);
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastOvertimeEvents.deleted(io, user.companyId, overtimeRequest.overtimeId, user.userId);
  }

  return sendSuccess(res, {
    _id: overtimeRequest._id,
    overtimeId: overtimeRequest.overtimeId,
    isDeleted: true
  }, 'Overtime request deleted successfully');
});

export default {
  getOvertimeRequests,
  getOvertimeRequestById,
  getMyOvertimeRequests,
  createOvertimeRequest,
  updateOvertimeRequest,
  approveOvertimeRequest,
  rejectOvertimeRequest,
  cancelOvertimeRequest,
  getPendingOvertimeRequests,
  getOvertimeStats,
  deleteOvertimeRequest
};
