/**
 * Leave Type REST Controller
 * Handles all Leave Type CRUD operations via REST API
 * Uses Mongoose model with companyId for multi-tenancy
 */

import LeaveType from '../../models/leave/leaveType.schema.js';
import {
  asyncHandler,
  buildConflictError,
  buildNotFoundError,
  buildValidationError
} from '../../middleware/errorHandler.js';
import {
  buildPagination,
  extractUser,
  sendCreated,
  sendSuccess
} from '../../utils/apiResponse.js';
import { broadcastLeaveTypeEvents, getSocketIO } from '../../utils/socketBroadcaster.js';
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

/**
 * @desc    Get all leave types with pagination and filtering
 * @route   GET /api/leave-types
 * @access  Private (Admin, HR, Superadmin)
 */
export const getLeaveTypes = asyncHandler(async (req, res) => {
  const { page, limit, search, status, sortBy = 'name', order = 'asc' } = req.query;
  const user = extractUser(req);

  devLog('[LeaveType Controller] getLeaveTypes - companyId:', user.companyId, 'filters:', { page, limit, search, status });

  // Build filter - always exclude soft-deleted records
  let filter = {
    companyId: user.companyId,
    isDeleted: false
  };

  // Apply status filter (isActive)
  if (status === 'active') {
    filter.isActive = true;
  } else if (status === 'inactive') {
    filter.isActive = false;
  }

  // Apply search filter
  if (search && search.trim()) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  devLog('[LeaveType Controller] MongoDB filter:', filter);

  // Get total count
  const total = await LeaveType.countDocuments(filter);

  // Build sort option
  const sortObj = {};
  sortObj[sortBy] = order === 'asc' ? 1 : -1;

  // Get paginated results
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const leaveTypes = await LeaveType.find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum)
    .lean();

  devLog('[LeaveType Controller] Found', leaveTypes.length, 'leave types out of', total, 'total');

  // Build pagination
  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, leaveTypes, 'Leave types retrieved successfully', pagination);
});

/**
 * @desc    Get leave type by ID
 * @route   GET /api/leave-types/:id
 * @access  Private (Admin, HR, Superadmin)
 */
export const getLeaveTypeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[LeaveType Controller] getLeaveTypeById - id:', id, 'companyId:', user.companyId);

  const leaveType = await LeaveType.findOne({
    leaveTypeId: id,
    companyId: user.companyId,
    isDeleted: false
  }).lean();

  if (!leaveType) {
    throw buildNotFoundError('Leave type not found');
  }

  return sendSuccess(res, leaveType, 'Leave type retrieved successfully');
});

/**
 * @desc    Get active leave types (for dropdowns/selects)
 * @route   GET /api/leave-types/active
 * @access  Private (All authenticated users)
 */
export const getActiveLeaveTypes = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[LeaveType Controller] getActiveLeaveTypes - companyId:', user.companyId);

  // Use the static method from the schema
  const leaveTypes = await LeaveType.getActiveTypes(user.companyId);

  // Transform to a simpler format for dropdowns
  const dropdownData = leaveTypes.map(lt => ({
    value: lt.code,
    label: lt.name,
    color: lt.color,
    icon: lt.icon,
    requiresApproval: lt.requiresApproval,
    isPaid: lt.isPaid
  }));

  return sendSuccess(res, dropdownData, 'Active leave types retrieved successfully');
});

/**
 * @desc    Create new leave type
 * @route   POST /api/leave-types
 * @access  Private (Admin, Superadmin)
 */
export const createLeaveType = asyncHandler(async (req, res) => {
  const leaveTypeData = req.body;
  const user = extractUser(req);

  devLog('[LeaveType Controller] createLeaveType - companyId:', user.companyId, 'data:', leaveTypeData);

  // Validate required fields
  if (!leaveTypeData.name || !leaveTypeData.name.trim()) {
    throw buildValidationError('Leave type name is required');
  }

  if (!leaveTypeData.code || !leaveTypeData.code.trim()) {
    throw buildValidationError('Leave type code is required');
  }

  // Check if leave type with same code already exists for this company
  const existingByCode = await LeaveType.findOne({
    companyId: user.companyId,
    code: leaveTypeData.code.toUpperCase(),
    isDeleted: false
  });

  if (existingByCode) {
    throw buildConflictError('Leave type with this code already exists');
  }

  // Check if leave type with same name already exists for this company
  const existingByName = await LeaveType.findOne({
    companyId: user.companyId,
    name: leaveTypeData.name.trim(),
    isDeleted: false
  });

  if (existingByName) {
    throw buildConflictError('Leave type with this name already exists');
  }

  // Generate leaveTypeId
  const leaveTypeId = `LT-${leaveTypeData.code.toUpperCase()}-${Date.now()}`;

  // Create leave type
  const newLeaveType = new LeaveType({
    leaveTypeId,
    companyId: user.companyId,
    name: leaveTypeData.name.trim(),
    code: leaveTypeData.code.toUpperCase(),
    // Quota configuration
    annualQuota: leaveTypeData.annualQuota || 0,
    isPaid: leaveTypeData.isPaid !== undefined ? leaveTypeData.isPaid : true,
    requiresApproval: leaveTypeData.requiresApproval !== undefined ? leaveTypeData.requiresApproval : true,
    // Carry forward configuration
    carryForwardAllowed: leaveTypeData.carryForwardAllowed || false,
    maxCarryForwardDays: leaveTypeData.maxCarryForwardDays || 0,
    carryForwardExpiry: leaveTypeData.carryForwardExpiry || 90,
    // Encashment configuration
    encashmentAllowed: leaveTypeData.encashmentAllowed || false,
    maxEncashmentDays: leaveTypeData.maxEncashmentDays || 0,
    encashmentRatio: leaveTypeData.encashmentRatio || 0,
    // Restriction configuration
    minNoticeDays: leaveTypeData.minNoticeDays || 0,
    maxConsecutiveDays: leaveTypeData.maxConsecutiveDays || 0,
    requiresDocument: leaveTypeData.requiresDocument || false,
    acceptableDocuments: leaveTypeData.acceptableDocuments || [],
    // Accrual rules
    accrualRate: leaveTypeData.accrualRate || 0,
    accrualMonth: leaveTypeData.accrualMonth || 1,
    accrualWaitingPeriod: leaveTypeData.accrualWaitingPeriod || 0,
    // Display configuration
    color: leaveTypeData.color || '#808080',
    icon: leaveTypeData.icon || '',
    description: leaveTypeData.description || '',
    // System fields
    isActive: leaveTypeData.isActive !== undefined ? leaveTypeData.isActive : true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const savedLeaveType = await newLeaveType.save();
  devLog('[LeaveType Controller] Leave type created:', savedLeaveType.leaveTypeId);

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  broadcastLeaveTypeEvents.created(io, user.companyId, {
    leaveTypeId: savedLeaveType.leaveTypeId,
    name: savedLeaveType.name,
    code: savedLeaveType.code
  });

  return sendCreated(res, savedLeaveType, 'Leave type created successfully');
});

/**
 * @desc    Update leave type
 * @route   PUT /api/leave-types/:id
 * @access  Private (Admin, Superadmin)
 */
export const updateLeaveType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;
  const user = extractUser(req);

  devLog('[LeaveType Controller] updateLeaveType - id:', id, 'companyId:', user.companyId);

  // Find leave type
  const leaveType = await LeaveType.findOne({
    leaveTypeId: id,
    companyId: user.companyId,
    isDeleted: false
  });

  if (!leaveType) {
    throw buildNotFoundError('Leave type not found');
  }

  // Check for duplicate code if code is being changed
  if (updateData.code && updateData.code.toUpperCase() !== leaveType.code) {
    const existingByCode = await LeaveType.findOne({
      companyId: user.companyId,
      code: updateData.code.toUpperCase(),
      isDeleted: false,
      leaveTypeId: { $ne: id }
    });

    if (existingByCode) {
      throw buildConflictError('Leave type with this code already exists');
    }
  }

  // Check for duplicate name if name is being changed
  if (updateData.name && updateData.name.trim() !== leaveType.name) {
    const existingByName = await LeaveType.findOne({
      companyId: user.companyId,
      name: updateData.name.trim(),
      isDeleted: false,
      leaveTypeId: { $ne: id }
    });

    if (existingByName) {
      throw buildConflictError('Leave type with this name already exists');
    }
  }

  // Update fields
  if (updateData.name !== undefined) leaveType.name = updateData.name.trim();
  if (updateData.code !== undefined) leaveType.code = updateData.code.toUpperCase();
  if (updateData.annualQuota !== undefined) leaveType.annualQuota = updateData.annualQuota;
  if (updateData.isPaid !== undefined) leaveType.isPaid = updateData.isPaid;
  if (updateData.requiresApproval !== undefined) leaveType.requiresApproval = updateData.requiresApproval;
  if (updateData.carryForwardAllowed !== undefined) leaveType.carryForwardAllowed = updateData.carryForwardAllowed;
  if (updateData.maxCarryForwardDays !== undefined) leaveType.maxCarryForwardDays = updateData.maxCarryForwardDays;
  if (updateData.carryForwardExpiry !== undefined) leaveType.carryForwardExpiry = updateData.carryForwardExpiry;
  if (updateData.encashmentAllowed !== undefined) leaveType.encashmentAllowed = updateData.encashmentAllowed;
  if (updateData.maxEncashmentDays !== undefined) leaveType.maxEncashmentDays = updateData.maxEncashmentDays;
  if (updateData.encashmentRatio !== undefined) leaveType.encashmentRatio = updateData.encashmentRatio;
  if (updateData.minNoticeDays !== undefined) leaveType.minNoticeDays = updateData.minNoticeDays;
  if (updateData.maxConsecutiveDays !== undefined) leaveType.maxConsecutiveDays = updateData.maxConsecutiveDays;
  if (updateData.requiresDocument !== undefined) leaveType.requiresDocument = updateData.requiresDocument;
  if (updateData.acceptableDocuments !== undefined) leaveType.acceptableDocuments = updateData.acceptableDocuments;
  if (updateData.accrualRate !== undefined) leaveType.accrualRate = updateData.accrualRate;
  if (updateData.accrualMonth !== undefined) leaveType.accrualMonth = updateData.accrualMonth;
  if (updateData.accrualWaitingPeriod !== undefined) leaveType.accrualWaitingPeriod = updateData.accrualWaitingPeriod;
  if (updateData.color !== undefined) leaveType.color = updateData.color;
  if (updateData.icon !== undefined) leaveType.icon = updateData.icon;
  if (updateData.description !== undefined) leaveType.description = updateData.description;
  if (updateData.isActive !== undefined) leaveType.isActive = updateData.isActive;

  leaveType.updatedAt = new Date();
  const updatedLeaveType = await leaveType.save();

  devLog('[LeaveType Controller] Leave type updated:', updatedLeaveType.leaveTypeId);

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  broadcastLeaveTypeEvents.updated(io, user.companyId, {
    leaveTypeId: updatedLeaveType.leaveTypeId,
    name: updatedLeaveType.name,
    code: updatedLeaveType.code,
    isActive: updatedLeaveType.isActive
  });

  return sendSuccess(res, updatedLeaveType, 'Leave type updated successfully');
});

/**
 * @desc    Toggle leave type active status
 * @route   PATCH /api/leave-types/:id/toggle
 * @access  Private (Admin, Superadmin)
 */
export const toggleLeaveTypeStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[LeaveType Controller] toggleLeaveTypeStatus - id:', id, 'companyId:', user.companyId);

  const leaveType = await LeaveType.findOne({
    leaveTypeId: id,
    companyId: user.companyId,
    isDeleted: false
  });

  if (!leaveType) {
    throw buildNotFoundError('Leave type not found');
  }

  // Toggle status
  leaveType.isActive = !leaveType.isActive;
  leaveType.updatedAt = new Date();
  const updatedLeaveType = await leaveType.save();

  devLog('[LeaveType Controller] Leave type status toggled:', updatedLeaveType.leaveTypeId, 'isActive:', updatedLeaveType.isActive);

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  broadcastLeaveTypeEvents.status_toggled(io, user.companyId, {
    leaveTypeId: updatedLeaveType.leaveTypeId,
    name: updatedLeaveType.name,
    isActive: updatedLeaveType.isActive
  });

  return sendSuccess(res, updatedLeaveType, `Leave type ${updatedLeaveType.isActive ? 'activated' : 'deactivated'} successfully`);
});

/**
 * @desc    Delete leave type (soft delete)
 * @route   DELETE /api/leave-types/:id
 * @access  Private (Admin, Superadmin)
 */
export const deleteLeaveType = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[LeaveType Controller] deleteLeaveType - id:', id, 'companyId:', user.companyId);

  const leaveType = await LeaveType.findOne({
    leaveTypeId: id,
    companyId: user.companyId,
    isDeleted: false
  });

  if (!leaveType) {
    throw buildNotFoundError('Leave type not found');
  }

  // Soft delete
  leaveType.isDeleted = true;
  leaveType.isActive = false;
  leaveType.updatedAt = new Date();
  const deletedLeaveType = await leaveType.save();

  devLog('[LeaveType Controller] Leave type soft deleted:', deletedLeaveType.leaveTypeId);

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  broadcastLeaveTypeEvents.deleted(io, user.companyId, {
    leaveTypeId: deletedLeaveType.leaveTypeId,
    name: deletedLeaveType.name,
    code: deletedLeaveType.code
  });

  return sendSuccess(res, { leaveTypeId: id, isDeleted: true }, 'Leave type deleted successfully');
});

/**
 * @desc    Get leave type statistics
 * @route   GET /api/leave-types/stats
 * @access  Private (Admin, HR, Superadmin)
 */
export const getLeaveTypeStats = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[LeaveType Controller] getLeaveTypeStats - companyId:', user.companyId);

  const allTypes = await LeaveType.find({
    companyId: user.companyId,
    isDeleted: false
  }).lean();

  const stats = {
    total: allTypes.length,
    active: allTypes.filter(lt => lt.isActive).length,
    inactive: allTypes.filter(lt => !lt.isActive).length,
    paid: allTypes.filter(lt => lt.isPaid).length,
    unpaid: allTypes.filter(lt => !lt.isPaid).length,
    requireApproval: allTypes.filter(lt => lt.requiresApproval).length,
    allowCarryForward: allTypes.filter(lt => lt.carryForwardAllowed).length,
    allowEncashment: allTypes.filter(lt => lt.encashmentAllowed).length,
    requireDocument: allTypes.filter(lt => lt.requiresDocument).length
  };

  return sendSuccess(res, stats, 'Leave type statistics retrieved successfully');
});

export default {
  getLeaveTypes,
  getLeaveTypeById,
  getActiveLeaveTypes,
  createLeaveType,
  updateLeaveType,
  toggleLeaveTypeStatus,
  deleteLeaveType,
  getLeaveTypeStats
};
