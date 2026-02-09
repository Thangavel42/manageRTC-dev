/**
 * Resignation REST Controller
 * Handles all Resignation CRUD operations via REST API
 */

import {
  buildNotFoundError,
  buildConflictError,
  buildValidationError,
  asyncHandler
} from '../../middleware/errorHandler.js';
import {
  sendSuccess,
  sendCreated,
  extractUser,
  getRequestId
} from '../../utils/apiResponse.js';
import { broadcastResignationEvents, getSocketIO } from '../../utils/socketBroadcaster.js';
import {
  getResignationStats,
  getResignations,
  getSpecificResignation,
  addResignation,
  updateResignation,
  deleteResignation,
  getDepartments,
  getEmployeesByDepartment,
  approveResignation,
  rejectResignation,
  processResignationEffectiveDate
} from '../../services/hr/resignation.services.js';

/**
 * @desc    Get resignation statistics
 * @route   GET /api/resignations/stats
 * @access  Private (Admin, HR)
 */
export const getStats = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  const result = await getResignationStats(user.companyId);

  if (!result.done) {
    throw buildConflictError(result.message);
  }

  return sendSuccess(res, result.data, 'Resignation statistics retrieved successfully');
});

/**
 * @desc    Get all resignations with optional filters
 * @route   GET /api/resignations
 * @access  Private (Admin, HR)
 */
export const getAllResignations = asyncHandler(async (req, res) => {
  const { type, startDate, endDate } = req.query;
  const user = extractUser(req);

  const result = await getResignations(user.companyId, { type, startDate, endDate });

  if (!result.done) {
    throw buildConflictError(result.message || 'Failed to fetch resignations');
  }

  return sendSuccess(res, result.data, 'Resignations retrieved successfully', 200, {
    total: result.count || 0
  });
});

/**
 * @desc    Get single resignation by ID
 * @route   GET /api/resignations/:id
 * @access  Private (Admin, HR)
 */
export const getResignationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!id) {
    throw buildValidationError('id', 'Resignation ID is required');
  }

  const result = await getSpecificResignation(user.companyId, id);

  if (!result.done) {
    throw buildNotFoundError('Resignation', id);
  }

  return sendSuccess(res, result.data, 'Resignation retrieved successfully');
});

/**
 * @desc    Create new resignation
 * @route   POST /api/resignations
 * @access  Private (Admin, HR)
 */
export const createResignation = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const resignationData = req.body;
  const io = getSocketIO(req);

  // Add creator info
  resignationData.created_by = {
    userId: user.userId,
    userName: user.userName || user.fullName || user.name || ''
  };

  const result = await addResignation(user.companyId, resignationData);

  if (!result.done) {
    if (result.errors) {
      throw buildValidationError('fields', result.message, result.errors);
    }
    throw buildConflictError(result.message);
  }

  // Broadcast resignation created event
  if (io && result.data) {
    broadcastResignationEvents.created(io, user.companyId, result.data);
  }

  return sendCreated(res, result.data || { message: 'Resignation created' }, 'Resignation created successfully');
});

/**
 * @desc    Update resignation
 * @route   PUT /api/resignations/:id
 * @access  Private (Admin, HR)
 */
export const updateResignationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;
  const io = getSocketIO(req);

  if (!id) {
    throw buildValidationError('id', 'Resignation ID is required');
  }

  // Add resignationId to updateData
  updateData.resignationId = id;

  const result = await updateResignation(user.companyId, updateData);

  if (!result.done) {
    if (result.message.includes('not found')) {
      throw buildNotFoundError('Resignation', id);
    }
    throw buildConflictError(result.message);
  }

  // Broadcast resignation updated event
  if (io && result.data) {
    broadcastResignationEvents.updated(io, user.companyId, result.data);
  }

  return sendSuccess(res, result.data || updateData, 'Resignation updated successfully');
});

/**
 * @desc    Delete resignation
 * @route   DELETE /api/resignations
 * @access  Private (Admin)
 */
export const deleteResignations = asyncHandler(async (req, res) => {
  const { resignationIds } = req.body;
  const user = extractUser(req);

  if (!resignationIds || !Array.isArray(resignationIds) || resignationIds.length === 0) {
    throw buildValidationError('resignationIds', 'Resignation IDs array is required');
  }

  const result = await deleteResignation(user.companyId, resignationIds);

  if (!result.done) {
    throw buildConflictError(result.message);
  }

  return sendSuccess(res, null, result.message);
});

/**
 * @desc    Approve resignation
 * @route   PUT /api/resignations/:id/approve
 * @access  Private (Admin, HR)
 */
export const approveResignationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const io = getSocketIO(req);

  if (!id) {
    throw buildValidationError('id', 'Resignation ID is required');
  }

  const result = await approveResignation(user.companyId, id, user.userId);

  if (!result.done) {
    if (result.message.includes('not found')) {
      throw buildNotFoundError('Resignation', id);
    }
    throw buildConflictError(result.message);
  }

  // Broadcast resignation approved event
  if (io && result.data) {
    broadcastResignationEvents.approved(io, user.companyId, result.data);
  }

  return sendSuccess(res, null, 'Resignation approved successfully');
});

/**
 * @desc    Reject resignation
 * @route   PUT /api/resignations/:id/reject
 * @access  Private (Admin, HR)
 */
export const rejectResignationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = extractUser(req);
  const io = getSocketIO(req);

  if (!id) {
    throw buildValidationError('id', 'Resignation ID is required');
  }

  const result = await rejectResignation(user.companyId, id, user.userId, reason);

  if (!result.done) {
    if (result.message.includes('not found')) {
      throw buildNotFoundError('Resignation', id);
    }
    throw buildConflictError(result.message);
  }

  // Broadcast resignation rejected event
  if (io && result.data) {
    broadcastResignationEvents.rejected(io, user.companyId, result.data, reason);
  }

  return sendSuccess(res, null, 'Resignation rejected successfully');
});

/**
 * @desc    Process resignation (mark as effective)
 * @route   PUT /api/resignations/:id/process
 * @access  Private (Admin, HR)
 */
export const processResignationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const io = getSocketIO(req);

  if (!id) {
    throw buildValidationError('id', 'Resignation ID is required');
  }

  const result = await processResignationEffectiveDate(user.companyId, id);

  if (!result.done) {
    if (result.message.includes('not found')) {
      throw buildNotFoundError('Resignation', id);
    }
    throw buildConflictError(result.message);
  }

  // Broadcast resignation processed/withdrawn event
  if (io && result.data) {
    broadcastResignationEvents.withdrawn(io, user.companyId, result.data);
  }

  return sendSuccess(res, null, 'Resignation processed successfully');
});

/**
 * @desc    Get departments for resignation filter
 * @route   GET /api/resignations/departments
 * @access  Private
 */
export const getResignationDepartments = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  const result = await getDepartments(user.companyId);

  if (!result.done) {
    throw buildConflictError(result.message);
  }

  return sendSuccess(res, result.data, 'Departments retrieved successfully');
});

/**
 * @desc    Get employees by department
 * @route   GET /api/resignations/employees/:departmentId
 * @access  Private
 */
export const getEmployeesByDepartmentId = asyncHandler(async (req, res) => {
  const { departmentId } = req.params;
  const user = extractUser(req);

  if (!departmentId) {
    throw buildValidationError('departmentId', 'Department ID is required');
  }

  const result = await getEmployeesByDepartment(user.companyId, departmentId);

  if (!result.done) {
    throw buildConflictError(result.message);
  }

  return sendSuccess(res, result.data, 'Employees retrieved successfully');
});

export default {
  getStats,
  getAllResignations,
  getResignationById,
  createResignation,
  updateResignationById,
  deleteResignations,
  approveResignationById,
  rejectResignationById,
  processResignationById,
  getResignationDepartments,
  getEmployeesByDepartmentId
};
