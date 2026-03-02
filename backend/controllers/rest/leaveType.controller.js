/**
 * Leave Type REST Controller
 * Handles all Leave Type CRUD operations via REST API
 * Uses multi-tenant database architecture with getTenantCollections()
 * Each company's leave types are stored in their own database
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
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
import { devLog } from '../../utils/logger.js';

/** Escape special regex characters to prevent ReDoS via user-supplied search strings */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Get all leave types with pagination and filtering
 * @route   GET /api/leave-types
 * @access  Private (Admin, HR, Superadmin)
 */
export const getLeaveTypes = asyncHandler(async (req, res) => {
  const { page, limit, search, status, sortBy = 'name', order = 'asc' } = req.query;
  const user = extractUser(req);

  devLog('[LeaveType Controller] getLeaveTypes - companyId:', user.companyId, 'filters:', { page, limit, search, status });

  // Get tenant collections (company's own database)
  const collections = getTenantCollections(user.companyId);
  const { leaveTypes } = collections;

  // Build filter - always exclude soft-deleted records
  let filter = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  // Apply status filter (isActive)
  if (status === 'active') {
    filter.isActive = true;
  } else if (status === 'inactive') {
    filter.isActive = false;
  }

  // Apply search filter (escape input to prevent ReDoS)
  if (search && search.trim()) {
    const safeSearch = escapeRegex(search.trim());
    filter.$or = [
      { name: { $regex: safeSearch, $options: 'i' } },
      { code: { $regex: safeSearch, $options: 'i' } },
      { description: { $regex: safeSearch, $options: 'i' } }
    ];
  }

  devLog('[LeaveType Controller] MongoDB filter:', filter);

  // Get total count
  const total = await leaveTypes.countDocuments(filter);

  // Build sort option
  const sortObj = {};
  sortObj[sortBy] = order === 'asc' ? 1 : -1;

  // Get paginated results
  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 200);
  const skip = (pageNum - 1) * limitNum;

  const leaveTypesData = await leaveTypes
    .find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum)
    .toArray();

  devLog('[LeaveType Controller] Found', leaveTypesData.length, 'leave types out of', total, 'total');

  // Build pagination
  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, leaveTypesData, 'Leave types retrieved successfully', 200, pagination);
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

  const collections = getTenantCollections(user.companyId);
  const { leaveTypes } = collections;

  // Build query to support both _id (ObjectId) and leaveTypeId lookup
  let query = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  if (ObjectId.isValid(id)) {
    query.$or = [
      { _id: new ObjectId(id) },
      { leaveTypeId: id }
    ];
  } else {
    query.leaveTypeId = id;
  }

  const leaveType = await leaveTypes.findOne(query);

  if (!leaveType) {
    throw buildNotFoundError('Leave type', id);
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

  const collections = getTenantCollections(user.companyId);
  const { leaveTypes } = collections;

  // Get active leave types
  const leaveTypesData = await leaveTypes.find({
    companyId: user.companyId,
    isActive: true,
    isDeleted: { $ne: true }
  }).toArray();

  // Transform to a simpler format for dropdowns
  // Use _id as value for ObjectId-based system, include code for backward compatibility
  const dropdownData = leaveTypesData.map(lt => ({
    value: lt._id.toString(),  // ObjectId as string
    label: lt.name,             // Display name (e.g., "Annual Leave")
    code: lt.code,              // Backend code (e.g., "EARNED") - for backward compatibility
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

  const collections = getTenantCollections(user.companyId);
  const { leaveTypes } = collections;

  // Check if leave type with same code already exists for this company
  const existingByCode = await leaveTypes.findOne({
    companyId: user.companyId,
    code: leaveTypeData.code.toUpperCase(),
    isDeleted: { $ne: true }
  });

  if (existingByCode) {
    throw buildConflictError('Leave type with this code already exists');
  }

  // Check if leave type with same name already exists for this company
  const existingByName = await leaveTypes.findOne({
    companyId: user.companyId,
    name: leaveTypeData.name.trim(),
    isDeleted: { $ne: true }
  });

  if (existingByName) {
    throw buildConflictError('Leave type with this name already exists');
  }

  // Generate leaveTypeId
  const leaveTypeId = `LT-${leaveTypeData.code.toUpperCase()}-${Date.now()}`;
  const now = new Date();

  // Create leave type document
  const newLeaveType = {
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
    isDeleted: { $ne: true },
    createdAt: now,
    updatedAt: now
  };

  await leaveTypes.insertOne(newLeaveType);
  devLog('[LeaveType Controller] Leave type created:', newLeaveType.leaveTypeId);

  return sendCreated(res, newLeaveType, 'Leave type created successfully');
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

  const collections = getTenantCollections(user.companyId);
  const { leaveTypes } = collections;

  // Build query to support both _id (ObjectId) and leaveTypeId lookup
  let query = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  // Check if id is a valid ObjectId, if so search by _id first
  if (ObjectId.isValid(id)) {
    query.$or = [
      { _id: new ObjectId(id) },
      { leaveTypeId: id }
    ];
  } else {
    query.leaveTypeId = id;
  }

  // Find leave type
  const leaveType = await leaveTypes.findOne(query);

  if (!leaveType) {
    throw buildNotFoundError('Leave type', id);
  }

  // Check for duplicate code if code is being changed
  if (updateData.code && updateData.code.toUpperCase() !== leaveType.code) {
    const existingByCode = await leaveTypes.findOne({
      companyId: user.companyId,
      code: updateData.code.toUpperCase(),
      isDeleted: { $ne: true },
      _id: { $ne: leaveType._id }
    });

    if (existingByCode) {
      throw buildConflictError('Leave type with this code already exists');
    }
  }

  // Check for duplicate name if name is being changed
  if (updateData.name && updateData.name.trim() !== leaveType.name) {
    const existingByName = await leaveTypes.findOne({
      companyId: user.companyId,
      name: updateData.name.trim(),
      isDeleted: { $ne: true },
      _id: { $ne: leaveType._id }
    });

    if (existingByName) {
      throw buildConflictError('Leave type with this name already exists');
    }
  }

  // Build update document
  const updateDoc = { $set: { updatedAt: new Date() } };

  if (updateData.name !== undefined) updateDoc.$set.name = updateData.name.trim();
  if (updateData.code !== undefined) updateDoc.$set.code = updateData.code.toUpperCase();
  if (updateData.annualQuota !== undefined) updateDoc.$set.annualQuota = updateData.annualQuota;
  if (updateData.isPaid !== undefined) updateDoc.$set.isPaid = updateData.isPaid;
  if (updateData.requiresApproval !== undefined) updateDoc.$set.requiresApproval = updateData.requiresApproval;
  if (updateData.carryForwardAllowed !== undefined) updateDoc.$set.carryForwardAllowed = updateData.carryForwardAllowed;
  if (updateData.maxCarryForwardDays !== undefined) updateDoc.$set.maxCarryForwardDays = updateData.maxCarryForwardDays;
  if (updateData.carryForwardExpiry !== undefined) updateDoc.$set.carryForwardExpiry = updateData.carryForwardExpiry;
  if (updateData.encashmentAllowed !== undefined) updateDoc.$set.encashmentAllowed = updateData.encashmentAllowed;
  if (updateData.maxEncashmentDays !== undefined) updateDoc.$set.maxEncashmentDays = updateData.maxEncashmentDays;
  if (updateData.encashmentRatio !== undefined) updateDoc.$set.encashmentRatio = updateData.encashmentRatio;
  if (updateData.minNoticeDays !== undefined) updateDoc.$set.minNoticeDays = updateData.minNoticeDays;
  if (updateData.maxConsecutiveDays !== undefined) updateDoc.$set.maxConsecutiveDays = updateData.maxConsecutiveDays;
  if (updateData.requiresDocument !== undefined) updateDoc.$set.requiresDocument = updateData.requiresDocument;
  if (updateData.acceptableDocuments !== undefined) updateDoc.$set.acceptableDocuments = updateData.acceptableDocuments;
  if (updateData.accrualRate !== undefined) updateDoc.$set.accrualRate = updateData.accrualRate;
  if (updateData.accrualMonth !== undefined) updateDoc.$set.accrualMonth = updateData.accrualMonth;
  if (updateData.accrualWaitingPeriod !== undefined) updateDoc.$set.accrualWaitingPeriod = updateData.accrualWaitingPeriod;
  if (updateData.color !== undefined) updateDoc.$set.color = updateData.color;
  if (updateData.icon !== undefined) updateDoc.$set.icon = updateData.icon;
  if (updateData.description !== undefined) updateDoc.$set.description = updateData.description;
  if (updateData.isActive !== undefined) updateDoc.$set.isActive = updateData.isActive;

  await leaveTypes.updateOne(
    { _id: leaveType._id },
    updateDoc
  );

  // Fetch the updated document
  const updatedLeaveType = await leaveTypes.findOne({
    _id: leaveType._id
  });

  devLog('[LeaveType Controller] Leave type updated:', updatedLeaveType.leaveTypeId);

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

  const collections = getTenantCollections(user.companyId);
  const { leaveTypes } = collections;

  // Build query to support both _id (ObjectId) and leaveTypeId lookup
  let query = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  // Check if id is a valid ObjectId, if so search by _id first
  if (ObjectId.isValid(id)) {
    query.$or = [
      { _id: new ObjectId(id) },
      { leaveTypeId: id }
    ];
  } else {
    query.leaveTypeId = id;
  }

  const leaveType = await leaveTypes.findOne(query);

  if (!leaveType) {
    throw buildNotFoundError('Leave type', id);
  }

  // Toggle status
  const newStatus = !leaveType.isActive;
  await leaveTypes.updateOne(
    { _id: leaveType._id },
    {
      $set: {
        isActive: newStatus,
        updatedAt: new Date()
      }
    }
  );

  // Fetch updated document
  const updatedLeaveType = await leaveTypes.findOne({
    _id: leaveType._id
  });

  devLog('[LeaveType Controller] Leave type status toggled:', updatedLeaveType.leaveTypeId, 'isActive:', newStatus);

  return sendSuccess(res, updatedLeaveType, `Leave type ${newStatus ? 'activated' : 'deactivated'} successfully`);
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

  const collections = getTenantCollections(user.companyId);
  const { leaveTypes } = collections;

  // Build query to support both _id (ObjectId) and leaveTypeId lookup
  let query = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  if (ObjectId.isValid(id)) {
    query.$or = [
      { _id: new ObjectId(id) },
      { leaveTypeId: id }
    ];
  } else {
    query.leaveTypeId = id;
  }

  const leaveType = await leaveTypes.findOne(query);

  if (!leaveType) {
    throw buildNotFoundError('Leave type', id);
  }

  // Soft delete
  await leaveTypes.updateOne(
    { _id: leaveType._id },
    {
      $set: {
        isDeleted: true,
        isActive: false,
        updatedAt: new Date()
      }
    }
  );

  devLog('[LeaveType Controller] Leave type soft deleted:', leaveType.leaveTypeId);

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

  const collections = getTenantCollections(user.companyId);
  const { leaveTypes } = collections;

  const allTypes = await leaveTypes.find({
    companyId: user.companyId,
    isDeleted: { $ne: true }
  }).toArray();

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
