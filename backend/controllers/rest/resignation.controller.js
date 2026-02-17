/**
 * Resignation REST Controller
 * Handles all Resignation CRUD operations via REST API
 */

import { getTenantCollections } from '../../config/db.js';
import {
    asyncHandler, buildConflictError, buildNotFoundError, buildValidationError
} from '../../middleware/errorHandler.js';
import {
    addResignation, approveResignation, deleteResignation,
    getDepartments,
    getEmployeesByDepartment, getResignations, getResignationStats, getSpecificResignation, processResignationEffectiveDate, rejectResignation, updateResignation
} from '../../services/hr/resignation.services.js';
import {
    extractUser, sendCreated, sendSuccess
} from '../../utils/apiResponse.js';
import { broadcastDashboardEvents, broadcastResignationEvents, getSocketIO } from '../../utils/socketBroadcaster.js';

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
 * @desc    Get all resignations with optional filters (role-based access)
 * @route   GET /api/resignations
 * @access  Private (Admin, HR, Manager, Employee)
 */
export const getAllResignations = asyncHandler(async (req, res) => {
  const { type, startDate, endDate } = req.query;
  const user = extractUser(req);

  const result = await getResignations(user.companyId, { type, startDate, endDate });

  if (!result.done) {
    throw buildConflictError(result.message || 'Failed to fetch resignations');
  }

  let filteredData = result.data || [];
  const userRole = user.role?.toLowerCase();
  const userId = user.userId || user._id?.toString();
  const employeeId = user.employeeId || '';
  let employeeRecordId = '';

  if (userRole === 'employee' || userRole === 'manager') {
    const collections = getTenantCollections(user.companyId);
    const employeeRecord = await collections.employees.findOne({
      isDeleted: { $ne: true },
      $or: [
        { clerkUserId: userId },
        { 'account.userId': userId }
      ]
    }, { projection: { _id: 1 } });
    employeeRecordId = employeeRecord?._id?.toString() || '';
  }

  const allowedIds = new Set([userId, employeeId, employeeRecordId].filter(Boolean));

  if (userRole === 'employee') {
    filteredData = filteredData.filter(resignation => {
      const matchesEmployee = allowedIds.has(resignation.employeeId);
      const matchesCreator = allowedIds.has(resignation.created_by?.userId);
      const matchesEmpId = allowedIds.has(resignation.employee_id || resignation.employeeId);
      return matchesEmployee || matchesCreator || matchesEmpId;
    });
  } else if (userRole === 'manager') {
    filteredData = filteredData.filter(resignation => {
      const isOwn = allowedIds.has(resignation.employeeId) || allowedIds.has(resignation.employee_id);
      const isTeam = allowedIds.has(resignation.reportingManagerId);
      const matchesCreator = allowedIds.has(resignation.created_by?.userId);
      return isOwn || isTeam || matchesCreator;
    });
  }

  return sendSuccess(res, filteredData, 'Resignations retrieved successfully', 200, {
    total: filteredData.length || 0
  });
});

/**
 * @desc    Get single resignation by ID (role-based)
 * @route   GET /api/resignations/:id
 * @access  Private (Admin, HR, Manager, Employee)
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

  const resignation = result.data;
  const userRole = user.role?.toLowerCase();
  const userId = user.userId || user._id?.toString();
  const employeeId = user.employeeId || '';
  let employeeRecordId = '';

  if (userRole === 'employee' || userRole === 'manager') {
    const collections = getTenantCollections(user.companyId);
    const employeeRecord = await collections.employees.findOne({
      isDeleted: { $ne: true },
      $or: [
        { clerkUserId: userId },
        { 'account.userId': userId }
      ]
    }, { projection: { _id: 1 } });
    employeeRecordId = employeeRecord?._id?.toString() || '';
  }

  const allowedIds = new Set([userId, employeeId, employeeRecordId].filter(Boolean));

  if (userRole === 'employee') {
    const matchesEmployee = allowedIds.has(resignation.employeeId) || allowedIds.has(resignation.employee_id);
    const matchesCreator = allowedIds.has(resignation.created_by?.userId);
    if (!matchesEmployee && !matchesCreator) {
      throw buildValidationError('id', 'You do not have permission to view this resignation');
    }
  } else if (userRole === 'manager') {
    const isOwn = allowedIds.has(resignation.employeeId) || allowedIds.has(resignation.employee_id);
    const isTeam = allowedIds.has(resignation.reportingManagerId);
    const matchesCreator = allowedIds.has(resignation.created_by?.userId);
    if (!isOwn && !isTeam && !matchesCreator) {
      throw buildValidationError('id', 'You do not have permission to view this resignation');
    }
  }

  return sendSuccess(res, resignation, 'Resignation retrieved successfully');
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

  const result = await addResignation(user.companyId, resignationData, user);

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

  if (io && Array.isArray(result.notifications)) {
    result.notifications.forEach((notification) => {
      broadcastDashboardEvents.newNotification(io, user.companyId, notification);
    });
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

  const result = await approveResignation(user.companyId, id, user);

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

  if (io && Array.isArray(result.notifications)) {
    result.notifications.forEach((notification) => {
      broadcastDashboardEvents.newNotification(io, user.companyId, notification);
    });
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

  const result = await rejectResignation(user.companyId, id, user, reason);

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

  if (io && Array.isArray(result.notifications)) {
    result.notifications.forEach((notification) => {
      broadcastDashboardEvents.newNotification(io, user.companyId, notification);
    });
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
