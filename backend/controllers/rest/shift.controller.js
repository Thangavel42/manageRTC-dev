/**
 * Shift REST Controller
 * Handles all Shift CRUD operations via REST API
 * Uses multi-tenant database architecture with getTenantCollections()
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
import { broadcastShiftEvents, getSocketIO } from '../../utils/socketBroadcaster.js';
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

/**
 * @desc    Get all shifts with pagination and filtering
 * @route   GET /api/shifts
 * @access  Private (Admin, HR, Superadmin)
 */
export const getShifts = asyncHandler(async (req, res) => {
  const query = req.validatedQuery || req.query;
  const { page, limit, search, isActive, sortBy, order } = query;
  const user = extractUser(req);

  devLog('[Shift Controller] getShifts - companyId:', user.companyId, 'filters:', { page, limit, search, isActive });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build filter - always exclude soft-deleted records
  let filter = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  // Apply active filter
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true' || isActive === true;
  }

  // Apply search filter
  if (search && search.trim()) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { shiftId: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count
  const total = await collections.shifts.countDocuments(filter);

  // Build sort option
  const sortObj = {};
  if (sortBy) {
    sortObj[sortBy] = order === 'asc' ? 1 : -1;
  } else {
    sortObj.isDefault = -1;
    sortObj.name = 1;
  }

  // Get paginated results
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 50;
  const skip = (pageNum - 1) * limitNum;

  const shifts = await collections.shifts
    .find(filter)
    .sort(sortObj)
    .skip(skip)
    .limit(limitNum)
    .toArray();

  // Build pagination metadata
  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, shifts, 'Shifts retrieved successfully', 200, pagination);
});

/**
 * @desc    Get single shift by ID
 * @route   GET /api/shifts/:id
 * @access  Private (All authenticated users)
 */
export const getShiftById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[Shift Controller] getShiftById - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find shift
  const shift = await collections.shifts.findOne({
    _id: new ObjectId(id),
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    throw buildNotFoundError('Shift', id);
  }

  return sendSuccess(res, shift);
});

/**
 * @desc    Get default shift for company
 * @route   GET /api/shifts/default
 * @access  Private (All authenticated users)
 */
export const getDefaultShift = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[Shift Controller] getDefaultShift - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find default shift
  const shift = await collections.shifts.findOne({
    companyId: user.companyId,
    isDefault: true,
    isActive: true,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    // If no default shift, return the first active shift
    const firstShift = await collections.shifts.find({
      companyId: user.companyId,
      isActive: true,
      isDeleted: { $ne: true }
    })
      .sort({ name: 1 })
      .limit(1)
      .toArray();

    const result = firstShift.length > 0 ? firstShift[0] : null;
    return sendSuccess(res, result, result ? 'No default shift found, returning first active shift' : 'No shifts configured for company');
  }

  return sendSuccess(res, shift);
});

/**
 * @desc    Get all active shifts for company
 * @route   GET /api/shifts/active
 * @access  Private (All authenticated users)
 */
export const getActiveShifts = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[Shift Controller] getActiveShifts - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find all active shifts
  const shifts = await collections.shifts.find({
    companyId: user.companyId,
    isActive: true,
    isDeleted: { $ne: true }
  })
    .sort({ isDefault: -1, name: 1 })
    .toArray();

  return sendSuccess(res, shifts, 'Active shifts retrieved successfully');
});

/**
 * @desc    Create new shift
 * @route   POST /api/shifts
 * @access  Private (Admin, HR, Superadmin)
 */
export const createShift = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const shiftData = req.body;

  devLog('[Shift Controller] createShift - companyId:', user.companyId);
  devLog('[Shift Controller] shiftData:', JSON.stringify(shiftData, null, 2));

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Check if shift code already exists (if provided)
  if (shiftData.code) {
    const existingCode = await collections.shifts.findOne({
      code: shiftData.code.toUpperCase(),
      companyId: user.companyId,
      isDeleted: { $ne: true }
    });

    if (existingCode) {
      throw buildConflictError('Shift', `code: ${shiftData.code}`);
    }
  }

  // Check if this is being set as default - remove default from others
  if (shiftData.isDefault) {
    await collections.shifts.updateMany(
      {
        companyId: user.companyId,
        isDefault: true,
        isDeleted: { $ne: true }
      },
      { $set: { isDefault: false } }
    );
  }

  // Add audit fields
  const shiftToInsert = {
    ...shiftData,
    companyId: user.companyId,
    code: shiftData.code ? shiftData.code.toUpperCase() : null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: user.userId,
    updatedBy: user.userId
  };

  // Create shift
  const result = await collections.shifts.insertOne(shiftToInsert);

  if (!result.insertedId) {
    throw new Error('Failed to create shift');
  }

  // Get the created shift
  const shift = await collections.shifts.findOne({ _id: result.insertedId });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.created(io, user.companyId, shift);
  }

  return sendCreated(res, shift, 'Shift created successfully');
});

/**
 * @desc    Update shift
 * @route   PUT /api/shifts/:id
 * @access  Private (Admin, HR, Superadmin)
 */
export const updateShift = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  devLog('[Shift Controller] updateShift - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find shift
  const shift = await collections.shifts.findOne({
    _id: new ObjectId(id),
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    throw buildNotFoundError('Shift', id);
  }

  // Check code uniqueness if being updated
  if (updateData.code && updateData.code !== shift.code) {
    const existingCode = await collections.shifts.findOne({
      code: updateData.code.toUpperCase(),
      companyId: user.companyId,
      _id: { $ne: new ObjectId(id) },
      isDeleted: { $ne: true }
    });

    if (existingCode) {
      throw buildConflictError('Shift', `code: ${updateData.code}`);
    }
  }

  // Handle default shift changes
  if (updateData.isDefault && !shift.isDefault) {
    // Remove default from other shifts
    await collections.shifts.updateMany(
      {
        companyId: user.companyId,
        isDefault: true,
        _id: { $ne: new ObjectId(id) },
        isDeleted: { $ne: true }
      },
      { $set: { isDefault: false } }
    );
  }

  // Update audit fields
  updateData.updatedAt = new Date();
  updateData.updatedBy = user.userId;
  if (updateData.code) {
    updateData.code = updateData.code.toUpperCase();
  }

  // Update shift
  const result = await collections.shifts.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Shift', id);
  }

  // Get updated shift
  const updatedShift = await collections.shifts.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.updated(io, user.companyId, updatedShift);
  }

  return sendSuccess(res, updatedShift, 'Shift updated successfully');
});

/**
 * @desc    Delete shift (soft delete)
 * @route   DELETE /api/shifts/:id
 * @access  Private (Admin, Superadmin only)
 */
export const deleteShift = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[Shift Controller] deleteShift - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find shift
  const shift = await collections.shifts.findOne({
    _id: new ObjectId(id),
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    throw buildNotFoundError('Shift', id);
  }

  // Check if shift is being used by employees
  const employeesUsingShift = await collections.employees.countDocuments({
    companyId: user.companyId,
    shiftId: id,
    isDeleted: { $ne: true }
  });

  if (employeesUsingShift > 0) {
    throw buildValidationError('shift', `Cannot delete shift. ${employeesUsingShift} employee(s) are assigned to this shift.`);
  }

  // Soft delete - set isDeleted flag
  const result = await collections.shifts.updateOne(
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

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Shift', id);
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.deleted(io, user.companyId, shift.shiftId || id, user.userId);
  }

  return sendSuccess(res, {
    _id: shift._id,
    shiftId: shift.shiftId,
    isDeleted: true,
    deletedAt: new Date()
  }, 'Shift deleted successfully');
});

/**
 * @desc    Assign shift to employee
 * @route   POST /api/shifts/assign
 * @access  Private (Admin, HR, Superadmin)
 */
export const assignShiftToEmployee = asyncHandler(async (req, res) => {
  const { employeeId, shiftId, effectiveDate } = req.body;
  const user = extractUser(req);

  devLog('[Shift Controller] assignShiftToEmployee - companyId:', user.companyId);

  // Validate required fields
  if (!employeeId) {
    throw buildValidationError('employeeId', 'Employee ID is required');
  }
  if (!shiftId) {
    throw buildValidationError('shiftId', 'Shift ID is required');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Verify shift exists
  const shift = await collections.shifts.findOne({
    _id: { $oid: shiftId },
    companyId: user.companyId,
    isActive: true,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    throw buildNotFoundError('Shift', shiftId);
  }

  // Verify employee exists
  const employee = await collections.employees.findOne({
    employeeId: employeeId,
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!employee) {
    throw buildNotFoundError('Employee', employeeId);
  }

  // Update employee with shift assignment
  const updateObj = {
    shiftId: new ObjectId(shiftId),
    shiftEffectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(),
    updatedAt: new Date(),
    updatedBy: user.userId
  };

  const result = await collections.employees.updateOne(
    { employeeId: employeeId, companyId: user.companyId },
    { $set: updateObj }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Employee', employeeId);
  }

  // Get updated employee
  const updatedEmployee = await collections.employees.findOne({
    employeeId: employeeId,
    companyId: user.companyId
  });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.assigned(io, user.companyId, {
      employeeId: employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      shiftId: shiftId,
      shiftName: shift.name,
      effectiveDate: updateObj.shiftEffectiveDate
    });
  }

  return sendSuccess(res, {
    employeeId: employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    shiftId: shiftId,
    shiftName: shift.name,
    shiftCode: shift.code,
    effectiveDate: updateObj.shiftEffectiveDate
  }, 'Shift assigned to employee successfully');
});

/**
 * @desc    Bulk assign shifts to employees
 * @route   POST /api/shifts/bulk-assign
 * @access  Private (Admin, HR, Superadmin)
 */
export const bulkAssignShifts = asyncHandler(async (req, res) => {
  const { employeeIds, shiftId, effectiveDate } = req.body;
  const user = extractUser(req);

  devLog('[Shift Controller] bulkAssignShifts - companyId:', user.companyId);

  // Validate required fields
  if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    throw buildValidationError('employeeIds', 'Employee IDs array is required');
  }
  if (!shiftId) {
    throw buildValidationError('shiftId', 'Shift ID is required');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Verify shift exists
  const shift = await collections.shifts.findOne({
    _id: { $oid: shiftId },
    companyId: user.companyId,
    isActive: true,
    isDeleted: { $ne: true }
  });

  if (!shift) {
    throw buildNotFoundError('Shift', shiftId);
  }

  const effectiveShiftDate = effectiveDate ? new Date(effectiveDate) : new Date();
  const updateObj = {
    shiftId: new ObjectId(shiftId),
    shiftEffectiveDate: effectiveShiftDate,
    updatedAt: new Date(),
    updatedBy: user.userId
  };

  // Bulk update employees
  const result = await collections.employees.updateMany(
    {
      employeeId: { $in: employeeIds },
      companyId: user.companyId,
      isDeleted: { $ne: true }
    },
    { $set: updateObj }
  );

  // Get updated employees for response
  const updatedEmployees = await collections.employees.find({
    employeeId: { $in: employeeIds },
    companyId: user.companyId
  }).toArray();

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.bulkAssigned(io, user.companyId, {
      shiftId: shiftId,
      shiftName: shift.name,
      employeeCount: result.modifiedCount,
      effectiveDate: effectiveShiftDate
    });
  }

  return sendSuccess(res, {
    shiftId: shiftId,
    shiftName: shift.name,
    shiftCode: shift.code,
    effectiveDate: effectiveShiftDate,
    requested: employeeIds.length,
    updated: result.modifiedCount,
    employees: updatedEmployees.map(emp => ({
      employeeId: emp.employeeId,
      employeeName: `${emp.firstName} ${emp.lastName}`
    }))
  }, `Shift assigned to ${result.modifiedCount} employee(s) successfully`);
});

/**
 * @desc    Get employee's current shift assignment
 * @route   GET /api/shifts/employee/:employeeId
 * @access  Private (Admin, HR, Superadmin, Employee for own)
 */
export const getEmployeeShift = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const user = extractUser(req);

  devLog('[Shift Controller] getEmployeeShift - employeeId:', employeeId, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Verify employee exists
  const employee = await collections.employees.findOne({
    employeeId: employeeId,
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!employee) {
    throw buildNotFoundError('Employee', employeeId);
  }

  // If employee has no shift assigned, return default shift
  if (!employee.shiftId) {
    const defaultShift = await collections.shifts.findOne({
      companyId: user.companyId,
      isDefault: true,
      isActive: true,
      isDeleted: { $ne: true }
    });

    return sendSuccess(res, {
      employeeId: employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      assignedShift: null,
      defaultShift: defaultShift || null,
      effectiveDate: null
    }, 'No shift assigned to employee, returning default shift');
  }

  // Get assigned shift details
  const assignedShift = await collections.shifts.findOne({
    _id: employee.shiftId,
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  return sendSuccess(res, {
    employeeId: employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    assignedShift: assignedShift ? {
      _id: assignedShift._id,
      shiftId: assignedShift.shiftId,
      name: assignedShift.name,
      code: assignedShift.code,
      startTime: assignedShift.startTime,
      endTime: assignedShift.endTime,
      duration: assignedShift.duration,
      timezone: assignedShift.timezone
    } : null,
    effectiveDate: employee.shiftEffectiveDate
  });
});

/**
 * @desc    Remove shift assignment from employee
 * @route   DELETE /api/shifts/employee/:employeeId
 * @access  Private (Admin, HR, Superadmin)
 */
export const removeShiftAssignment = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const user = extractUser(req);

  devLog('[Shift Controller] removeShiftAssignment - employeeId:', employeeId, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Verify employee exists
  const employee = await collections.employees.findOne({
    employeeId: employeeId,
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!employee) {
    throw buildNotFoundError('Employee', employeeId);
  }

  if (!employee.shiftId) {
    throw buildConflictError('Employee does not have a shift assigned');
  }

  // Remove shift assignment
  const result = await collections.employees.updateOne(
    { employeeId: employeeId, companyId: user.companyId },
    {
      $unset: { shiftId: '', shiftEffectiveDate: '' },
      $set: { updatedAt: new Date(), updatedBy: user.userId }
    }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Employee', employeeId);
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.unassigned(io, user.companyId, {
      employeeId: employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`
    });
  }

  return sendSuccess(res, {
    employeeId: employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    unassignedAt: new Date()
  }, 'Shift assignment removed successfully');
});

/**
 * @desc    Set shift as default
 * @route   PUT /api/shifts/:id/set-default
 * @access  Private (Admin, HR, Superadmin)
 */
export const setDefaultShift = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[Shift Controller] setDefaultShift - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find the new default shift
  const newDefaultShift = await collections.shifts.findOne({
    _id: new ObjectId(id),
    companyId: user.companyId,
    isDeleted: { $ne: true }
  });

  if (!newDefaultShift) {
    throw buildNotFoundError('Shift', id);
  }

  // Find the old default shift before removing it
  const oldDefaultShift = await collections.shifts.findOne({
    companyId: user.companyId,
    isDefault: true,
    isDeleted: { $ne: true }
  });

  // Remove default from all shifts
  await collections.shifts.updateMany(
    {
      companyId: user.companyId,
      isDefault: true,
      isDeleted: { $ne: true }
    },
    { $set: { isDefault: false } }
  );

  // Set this shift as default
  await collections.shifts.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isDefault: true,
        updatedAt: new Date(),
        updatedBy: user.userId
      }
    }
  );

  // Update all employees who were assigned to the old default shift
  let updatedEmployeesCount = 0;
  if (oldDefaultShift && oldDefaultShift._id.toString() !== id) {
    const oldDefaultShiftId = oldDefaultShift._id.toString();
    const newDefaultShiftId = id;

    // Find and update employees assigned to the old default shift
    // Only update employees who have shiftId matching the old default shift
    const updateResult = await collections.employees.updateMany(
      {
        companyId: user.companyId,
        shiftId: new ObjectId(oldDefaultShiftId),
        isDeleted: { $ne: true }
      },
      {
        $set: {
          shiftId: new ObjectId(newDefaultShiftId),
          shiftEffectiveDate: new Date(),
          updatedAt: new Date(),
          updatedBy: user.userId
        }
      }
    );

    updatedEmployeesCount = updateResult.modifiedCount;

    devLog(`[Shift Controller] Updated ${updatedEmployeesCount} employees from old default shift to new default shift`);
  }

  // Get updated shift
  const updatedShift = await collections.shifts.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastShiftEvents.updated(io, user.companyId, updatedShift);
  }

  const message = updatedEmployeesCount > 0
    ? `Default shift updated successfully. ${updatedEmployeesCount} employee(s) reassigned to new default shift.`
    : 'Default shift updated successfully.';

  return sendSuccess(res, {
    ...updatedShift,
    updatedEmployeesCount
  }, message);
});

export default {
  getShifts,
  getShiftById,
  getDefaultShift,
  getActiveShifts,
  createShift,
  updateShift,
  deleteShift,
  setDefaultShift,
  assignShiftToEmployee,
  bulkAssignShifts,
  getEmployeeShift,
  removeShiftAssignment
};
