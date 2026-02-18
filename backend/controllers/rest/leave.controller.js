/**
 * Leave REST Controller
 * Handles all Leave CRUD operations via REST API
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import {
  asyncHandler,
  buildConflictError, buildForbiddenError, buildNotFoundError,
  buildValidationError,
  ConflictError
} from '../../middleware/errorHandler.js';
import {
  buildPagination,
  extractUser,
  sendCreated,
  sendSuccess
} from '../../utils/apiResponse.js';
import { generateId } from '../../utils/idGenerator.js';
import logger, { logLeaveEvent } from '../../utils/logger.js';
import { broadcastLeaveEvents, broadcastToCompany, getSocketIO } from '../../utils/socketBroadcaster.js';
import { withTransactionRetry } from '../../utils/transactionHelper.js';

/**
 * Helper: Check for overlapping leave requests
 */
async function checkOverlap(collections, employeeId, startDate, endDate, excludeId = null) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const filter = {
    employeeId,
    status: { $in: ['pending', 'approved'] },
    isDeleted: { $ne: true },
    $or: [
      // Overlap cases
      {
        startDate: { $lte: start },
        endDate: { $gte: start }
      },
      {
        startDate: { $lte: end },
        endDate: { $gte: end }
      },
      {
        startDate: { $gte: start },
        endDate: { $lte: end }
      }
    ]
  };

  if (excludeId) {
    filter._id = { $ne: new ObjectId(excludeId) };
  }

  const overlapping = await collections.leaves.find(filter).toArray();
  return overlapping;
}

function buildLeaveIdFilter(id) {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { leaveId: id }] };
  }
  return { leaveId: id };
}

function normalizeLeaveStatuses(leave) {
  const finalStatus = leave.finalStatus || leave.status || 'pending';
  const managerStatus = leave.managerStatus ||
    (leave.status === 'approved' || leave.status === 'rejected' ? leave.status : 'pending');

  return {
    ...leave,
    status: finalStatus,
    finalStatus,
    managerStatus,
    employeeStatus: leave.employeeStatus || 'pending',
    hrStatus: leave.hrStatus || 'pending'
  };
}

/**
 * Helper: Get leave balance for an employee
 */
async function getEmployeeLeaveBalance(collections, employeeId, leaveType) {
  const employee = await collections.employees.findOne({
    employeeId
  });

  if (!employee || !employee.leaveBalances) {
    return { type: leaveType, balance: 0, used: 0, total: 0 };
  }

  const balanceInfo = employee.leaveBalances.find(b => b.type === leaveType);

  return {
    type: leaveType,
    balance: balanceInfo?.balance || 0,
    used: balanceInfo?.used || 0,
    total: balanceInfo?.total || 0
  };
}

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
 * @desc    Get all leave requests with pagination and filtering
 * @route   GET /api/leaves
 * @access  Private (Employee, Manager, HR, Admin, Superadmin)
 */
export const getLeaves = asyncHandler(async (req, res) => {
  const { page, limit, search, status, leaveType, employee, startDate, endDate, sortBy, order } = req.query;
  const user = extractUser(req);
  const userRole = user.role?.toLowerCase();

  logger.debug('[Leave Controller] getLeaves', { companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Resolve current employee for scoped roles
  const scopedRoles = ['employee', 'manager', 'hr'];
  const needsEmployeeLookup = scopedRoles.includes(userRole || '');
  const currentEmployee = needsEmployeeLookup
    ? await getEmployeeByClerkId(collections, user.userId)
    : null;

  if (needsEmployeeLookup && !currentEmployee) {
    throw buildForbiddenError('Employee record not found for current user');
  }

  // Base filter with tenant isolation
  const baseFilter = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  // Role-based visibility
  switch (userRole) {
    case 'employee':
      baseFilter.employeeId = currentEmployee?.employeeId;
      break;
    case 'manager':
      baseFilter.reportingManagerId = currentEmployee?.employeeId;
      break;
    case 'hr': {
      const deptId = currentEmployee?.departmentId || user.departmentId;
      if (!deptId) {
        throw buildForbiddenError('Department is required to view leaves');
      }
      baseFilter.departmentId = deptId;
      break;
    }
    case 'admin':
    case 'superadmin':
      // Full visibility within company
      break;
    default:
      throw buildForbiddenError('Unauthorized to view leave requests');
  }

  // Optional filters
  if (status) {
    baseFilter.status = status;
  }

  if (leaveType) {
    baseFilter.leaveType = leaveType;
  }

  if (employee) {
    baseFilter.employeeId = employee;
  }

  const andClauses = [];

  if (startDate || endDate) {
    andClauses.push({
      $or: [
        {
          startDate: {
            $gte: new Date(startDate || '1900-01-01'),
            $lte: new Date(endDate || '2100-12-31')
          }
        },
        {
          endDate: {
            $gte: new Date(startDate || '1900-01-01'),
            $lte: new Date(endDate || '2100-12-31')
          }
        }
      ]
    });
  }

  if (search && search.trim()) {
    andClauses.push({
      $or: [
        { reason: { $regex: search, $options: 'i' } },
        { detailedReason: { $regex: search, $options: 'i' } }
      ]
    });
  }

  const filter = andClauses.length > 0 ? { ...baseFilter, $and: andClauses } : baseFilter;

  // Get total count
  const total = await collections.leaves.countDocuments(filter);

  // Build sort option
  const sort = {};
  if (sortBy) {
    sort[sortBy] = order === 'asc' ? 1 : -1;
  } else {
    sort.createdAt = -1;
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const leaves = await collections.leaves
    .find(filter)
    .sort(sort)
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const employeeIds = Array.from(
    new Set(leaves.map(leave => leave.employeeId).filter(Boolean))
  );
  let employeesById = new Map();
  if (employeeIds.length > 0) {
    const employees = await collections.employees.find({
      $or: [
        { employeeId: { $in: employeeIds } },
        { clerkUserId: { $in: employeeIds } }
      ],
      isDeleted: { $ne: true }
    }).toArray();

    employeesById = new Map(
      employees.flatMap(emp => {
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        const designation = emp.designation || emp.jobTitle || emp.designationName || '';
        const record = { fullName, designation };
        const entries = [];
        if (emp.employeeId) entries.push([emp.employeeId, record]);
        if (emp.clerkUserId) entries.push([emp.clerkUserId, record]);
        return entries;
      })
    );
  }

  const managerIds = Array.from(
    new Set(leaves.map(leave => leave.reportingManagerId).filter(Boolean))
  );
  let managersById = new Map();
  if (managerIds.length > 0) {
    const managers = await collections.employees.find({
      $or: [
        { employeeId: { $in: managerIds } },
        { clerkUserId: { $in: managerIds } }
      ],
      isDeleted: { $ne: true }
    }).toArray();

    managersById = new Map(
      managers.flatMap(emp => {
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        const entries = [];
        if (emp.employeeId) entries.push([emp.employeeId, { fullName }]);
        if (emp.clerkUserId) entries.push([emp.clerkUserId, { fullName }]);
        return entries;
      })
    );
  }

  const leavesWithEmployees = leaves.map(leave => {
    const employee = employeesById.get(leave.employeeId);
    const manager = managersById.get(leave.reportingManagerId);
    const employeeName = employee?.fullName || leave.employeeName || (leave.employeeId ? `User ${leave.employeeId}` : 'Unknown');
    const reportingManagerName = manager?.fullName || leave.reportingManagerName || '-';
    return {
      ...normalizeLeaveStatuses(leave),
      employeeName,
      employeeDesignation: employee?.designation || leave.employeeDesignation || '',
      reportingManagerName
    };
  });

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, leavesWithEmployees, 'Leave requests retrieved successfully', 200, pagination);
});

/**
 * @desc    Get single leave request by ID
 * @route   GET /api/leaves/:id
 * @access  Private (All authenticated users)
 */
export const getLeaveById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid leave ID format');
  }

  logger.debug('[Leave Controller] getLeaveById', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const leave = await collections.leaves.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!leave) {
    throw buildNotFoundError('Leave request', id);
  }

  const userRole = user.role?.toLowerCase();
  if (userRole === 'employee') {
    throw buildForbiddenError('Employees cannot edit leave requests after submission');
  }

  return sendSuccess(res, leave);
});

/**
 * @desc    Create new leave request
 * @route   POST /api/leaves
 * @access  Private (All authenticated users)
 */
export const createLeave = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const leaveData = req.body;

  logger.info('[Leave Controller] createLeave', { companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Resolve employee for this leave (admin can create for another employee)
  const employeeLookupId = leaveData.employeeId || user.userId;
  const employee = await collections.employees.findOne({
    $or: [
      { employeeId: employeeLookupId },
      { clerkUserId: employeeLookupId }
    ],
    isDeleted: { $ne: true }
  });

  if (!employee) {
    throw buildNotFoundError('Employee', employeeLookupId);
  }

  // Resolve reporting manager (employeeId)
  let reportingManagerId = leaveData.reportingManagerId || null;

  if (!reportingManagerId && employee.reportingTo && ObjectId.isValid(employee.reportingTo)) {
    const manager = await collections.employees.findOne({
      _id: new ObjectId(employee.reportingTo),
      isDeleted: { $ne: true }
    });
    reportingManagerId = manager?.employeeId || null;
  }

  if (reportingManagerId) {
    const managerExists = await collections.employees.findOne({
      $or: [
        { employeeId: reportingManagerId },
        { clerkUserId: reportingManagerId }
      ],
      isDeleted: { $ne: true }
    });

    if (!managerExists) {
      throw buildValidationError('reportingManagerId', 'Reporting manager not found');
    }
  }

  const userRole = user.role?.toLowerCase();
  if (userRole === 'employee' && !reportingManagerId) {
    throw buildValidationError('reportingManagerId', 'Reporting manager is required');
  }

  if (reportingManagerId && reportingManagerId === employee.employeeId) {
    throw buildValidationError('reportingManagerId', 'Reporting manager cannot be the employee');
  }

  // Validate dates
  const startDate = new Date(leaveData.startDate);
  const endDate = new Date(leaveData.endDate);

  if (endDate < startDate) {
    throw buildValidationError('endDate', 'End date must be after start date');
  }

  const shouldEnforceOverlap = user.role?.toLowerCase() === 'employee';
  if (shouldEnforceOverlap) {
    const overlappingLeaves = await checkOverlap(
      collections,
      employee.employeeId,
      leaveData.startDate,
      leaveData.endDate
    );

    if (overlappingLeaves && overlappingLeaves.length > 0) {
      throw new ConflictError('You have overlapping leave requests for the same period');
    }
  }

  // Get current leave balance
  const currentBalance = await getEmployeeLeaveBalance(collections, employee.employeeId, leaveData.leaveType);

  // Calculate duration in days
  const diffTime = Math.abs(endDate - startDate);
  const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

  // Prepare leave data
  const leaveToInsert = {
    leaveId: `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    companyId: user.companyId,
    employeeId: employee.employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    departmentId: leaveData.departmentId || employee.departmentId || employee.department || null,
    leaveType: leaveData.leaveType,
    startDate: new Date(leaveData.startDate),
    endDate: new Date(leaveData.endDate),
    fromDate: new Date(leaveData.startDate),
    toDate: new Date(leaveData.endDate),
    duration: duration,
    reason: leaveData.reason || '',
    detailedReason: leaveData.detailedReason || '',
    status: 'pending',
    employeeStatus: 'pending',
    managerStatus: 'pending',
    hrStatus: 'pending',
    finalStatus: 'pending',
    balanceAtRequest: currentBalance.balance,
    reportingManagerId,
    handoverToId: leaveData.handoverTo || null,
    attachments: leaveData.attachments || [],
    createdBy: user.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false
  };

  const result = await collections.leaves.insertOne(leaveToInsert);

  if (!result.insertedId) {
    throw new Error('Failed to create leave request');
  }

  // Get created leave
  const leave = await collections.leaves.findOne({ _id: result.insertedId });

  if (leave) {
    logLeaveEvent('create', leave, user);
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastLeaveEvents.created(io, user.companyId, leave);
  }

  return sendCreated(res, leave, 'Leave request created successfully');
});

/**
 * @desc    Update leave request
 * @route   PUT /api/leaves/:id
 * @access  Private (Admin, HR, Owner)
 */
export const updateLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid leave ID format');
  }

  logger.info('[Leave Controller] updateLeave', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const leave = await collections.leaves.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!leave) {
    throw buildNotFoundError('Leave request', id);
  }

  // Check if leave can be updated
  if (leave.status === 'approved' || leave.status === 'rejected') {
    throw buildConflictError('Cannot update ' + leave.status + ' leave request');
  }

  // Check for overlapping leaves if dates are being updated
  if (updateData.startDate || updateData.endDate) {
    const newStartDate = updateData.startDate || leave.startDate;
    const newEndDate = updateData.endDate || leave.endDate;
    const shouldEnforceOverlap = user.role?.toLowerCase() === 'employee';

    if (shouldEnforceOverlap) {
      const overlappingLeaves = await checkOverlap(
        collections,
        leave.employeeId,
        newStartDate,
        newEndDate,
        id
      );

      if (overlappingLeaves && overlappingLeaves.length > 0) {
        throw new ConflictError('Overlapping leave requests exist for the new dates');
      }
    }
  }

  // Build update object
  const updateObj = {
    ...updateData,
    updatedBy: user.userId,
    updatedAt: new Date()
  };

  if (updateData.startDate) {
    updateObj.fromDate = new Date(updateData.startDate);
  }
  if (updateData.endDate) {
    updateObj.toDate = new Date(updateData.endDate);
  }

  const result = await collections.leaves.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Leave request', id);
  }

  // Get updated leave
  const updatedLeave = await collections.leaves.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastLeaveEvents.updated(io, user.companyId, updatedLeave);
  }

  return sendSuccess(res, updatedLeave, 'Leave request updated successfully');
});

/**
 * @desc    Delete leave request (soft delete)
 * @route   DELETE /api/leaves/:id
 * @access  Private (Admin, Superadmin, Owner)
 */
export const deleteLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid leave ID format');
  }

  logger.info('[Leave Controller] deleteLeave', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const leave = await collections.leaves.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!leave) {
    throw buildNotFoundError('Leave request', id);
  }

  // Check if leave can be deleted
  if (leave.status === 'approved') {
    throw buildConflictError('Cannot delete approved leave request. Cancel it instead.');
  }

  // Soft delete
  const result = await collections.leaves.updateOne(
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
    throw buildNotFoundError('Leave request', id);
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastLeaveEvents.deleted(io, user.companyId, leave.leaveId, user.userId);
  }

  return sendSuccess(res, {
    _id: leave._id,
    leaveId: leave.leaveId,
    isDeleted: true
  }, 'Leave request deleted successfully');
});

/**
 * @desc    Get my leave requests
 * @route   GET /api/leaves/my
 * @access  Private (All authenticated users)
 */
export const getMyLeaves = asyncHandler(async (req, res) => {
  const { page, limit, status, leaveType } = req.query;
  const user = extractUser(req);

  logger.debug('[Leave Controller] getMyLeaves', { companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get Employee record
  const employee = await getEmployeeByClerkId(collections, user.userId);

  if (!employee) {
    return sendSuccess(res, [], 'No leave requests found');
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

  // Apply leave type filter
  if (leaveType) {
    filter.leaveType = leaveType;
  }

  // Get total count
  const total = await collections.leaves.countDocuments(filter);

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const leaves = await collections.leaves
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const managerIds = Array.from(
    new Set(leaves.map(leave => leave.reportingManagerId).filter(Boolean))
  );
  let managersById = new Map();
  if (managerIds.length > 0) {
    const managers = await collections.employees.find({
      $or: [
        { employeeId: { $in: managerIds } },
        { clerkUserId: { $in: managerIds } }
      ],
      isDeleted: { $ne: true }
    }).toArray();

    managersById = new Map(
      managers.flatMap(emp => {
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
        const entries = [];
        if (emp.employeeId) entries.push([emp.employeeId, { fullName }]);
        if (emp.clerkUserId) entries.push([emp.clerkUserId, { fullName }]);
        return entries;
      })
    );
  }

  const leavesWithManagers = leaves.map(leave => {
    const manager = managersById.get(leave.reportingManagerId);
    return {
      ...normalizeLeaveStatuses(leave),
      reportingManagerName: manager?.fullName || leave.reportingManagerName || '-'
    };
  });

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, leavesWithManagers, 'My leave requests retrieved successfully', 200, pagination);
});

/**
 * @desc    Get leaves by status
 * @route   GET /api/leaves/status/:status
 * @access  Private (Employee, Manager, HR, Admin, Superadmin)
 */
export const getLeavesByStatus = asyncHandler(async (req, res) => {
  const { status } = req.params;
  const { page, limit } = req.query;
  const user = extractUser(req);
  const userRole = user.role?.toLowerCase();

  // Validate status
  const validStatuses = ['pending', 'approved', 'rejected', 'cancelled', 'on-hold'];
  if (!validStatuses.includes(status)) {
    throw buildValidationError('status', `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
  }

  logger.debug('[Leave Controller] getLeavesByStatus called', { status, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const scopedRoles = ['employee', 'manager', 'hr'];
  const needsEmployeeLookup = scopedRoles.includes(userRole || '');
  const currentEmployee = needsEmployeeLookup
    ? await getEmployeeByClerkId(collections, user.userId)
    : null;

  if (needsEmployeeLookup && !currentEmployee) {
    throw buildForbiddenError('Employee record not found for current user');
  }

  const filter = {
    companyId: user.companyId,
    status,
    isDeleted: { $ne: true }
  };

  switch (userRole) {
    case 'employee':
      filter.employeeId = currentEmployee?.employeeId;
      break;
    case 'manager':
      filter.reportingManagerId = currentEmployee?.employeeId;
      break;
    case 'hr': {
      const deptId = currentEmployee?.departmentId || user.departmentId;
      if (!deptId) {
        throw buildForbiddenError('Department is required to view leaves');
      }
      filter.departmentId = deptId;
      break;
    }
    case 'admin':
    case 'superadmin':
      break;
    default:
      throw buildForbiddenError('Unauthorized to view leave requests');
  }

  const total = await collections.leaves.countDocuments(filter);

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const leaves = await collections.leaves
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, leaves, `Leave requests with status '${status}' retrieved successfully`, 200, pagination);
});

/**
 * @desc    Approve leave request
 * @route   POST /api/leaves/:id/approve
 * @access  Private (Admin, HR, Manager)
 */
export const approveLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { comments } = req.body;
  const user = extractUser(req);
  const userRole = user.role?.toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isManager = userRole === 'manager';
  const isHR = userRole === 'hr';

  if (!id) {
    throw buildValidationError('id', 'Leave ID is required');
  }

  logger.info('[Leave Controller] approveLeave', { id, companyId: user.companyId });

  // Use transaction for atomic leave approval and balance update
  const result = await withTransactionRetry(user.companyId, async (collections, session) => {
    // Find leave within transaction
    const leave = await collections.leaves.findOne(
      { ...buildLeaveIdFilter(id), isDeleted: { $ne: true } },
      { session }
    );

    if (!leave) {
      throw buildNotFoundError('Leave request', id);
    }

    const currentEmployee = await getEmployeeByClerkId(collections, user.userId);

    if (!isAdmin && !currentEmployee) {
      throw buildForbiddenError('Not authorized to approve this leave request');
    }

    const approverEmployeeId = currentEmployee?.employeeId;
    const approverDeptId = currentEmployee?.departmentId || user.departmentId;

    if (isManager) {
      if (!leave.reportingManagerId || leave.reportingManagerId !== approverEmployeeId) {
        throw buildForbiddenError('Only the assigned reporting manager can approve this leave request');
      }
    } else if (isHR) {
      if (!approverDeptId || !leave.departmentId || leave.departmentId !== approverDeptId) {
        throw buildForbiddenError('Department mismatch for HR approval');
      }
    } else if (!isAdmin) {
      throw buildForbiddenError('Not authorized to approve this leave request');
    }

    if (!isAdmin && leave.employeeId === approverEmployeeId) {
      throw buildForbiddenError('Employees cannot approve their own leave requests');
    }

    // Check if leave can be approved
    if (leave.status !== 'pending') {
      throw buildConflictError('Can only approve pending leave requests');
    }

    // Prepare update object
    const updateObj = {
      status: 'approved',
      managerStatus: 'approved',
      finalStatus: 'approved',
      approvedBy: user.userId,
      approvedAt: new Date(),
      approvalComments: comments || '',
      updatedAt: new Date()
    };

    // Update leave status within transaction
    await collections.leaves.updateOne(
      { _id: leave._id },
      { $set: updateObj },
      { session }
    );

    // Update employee leave balance within transaction
    const employee = await collections.employees.findOne(
      { employeeId: leave.employeeId },
      { session }
    );

    let updatedLeaveBalances = null;
    if (employee && employee.leaveBalances) {
      const balanceIndex = employee.leaveBalances.findIndex(
        b => b.type === leave.leaveType
      );

      if (balanceIndex !== -1) {
        // Create a copy to avoid mutation
        updatedLeaveBalances = employee.leaveBalances.map(b => ({ ...b }));
        updatedLeaveBalances[balanceIndex].used += leave.duration;
        updatedLeaveBalances[balanceIndex].balance -= leave.duration;

        // Update employee leave balance
        await collections.employees.updateOne(
          { employeeId: leave.employeeId },
          { $set: { leaveBalances: updatedLeaveBalances } },
          { session }
        );
      }
    }

    // Get updated leave
    const updatedLeave = await collections.leaves.findOne(
      { _id: leave._id },
      { session }
    );

    return { leave: updatedLeave, employee, employeeLeaveBalances: updatedLeaveBalances };
  });

  // Broadcast events outside transaction (after commit)
  const io = getSocketIO(req);
  if (io) {
    // Broadcast leave approval
    broadcastLeaveEvents.approved(io, user.companyId, result.leave, user.userId);

    // Broadcast balance update if changed
    if (result.employeeLeaveBalances) {
      broadcastLeaveEvents.balanceUpdated(io, user.companyId, result.employee._id, result.employeeLeaveBalances);
    }
  }

  if (result?.leave) {
    logLeaveEvent('approve', result.leave, user);
  }

  return sendSuccess(res, result.leave, 'Leave request approved successfully');
});

/**
 * @desc    Reject leave request
 * @route   POST /api/leaves/:id/reject
 * @access  Private (Admin, HR, Manager)
 */
export const rejectLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = extractUser(req);
  const userRole = user.role?.toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isManager = userRole === 'manager';
  const isHR = userRole === 'hr';

  if (!reason || !reason.trim()) {
    throw buildValidationError('reason', 'Rejection reason is required');
  }

  if (!id) {
    throw buildValidationError('id', 'Leave ID is required');
  }

  logger.info('[Leave Controller] rejectLeave', { id, companyId: user.companyId });

  // Use transaction for consistent leave rejection
  const updatedLeave = await withTransactionRetry(user.companyId, async (collections, session) => {
    // Find leave within transaction
    const leave = await collections.leaves.findOne(
      { ...buildLeaveIdFilter(id), isDeleted: { $ne: true } },
      { session }
    );

    if (!leave) {
      throw buildNotFoundError('Leave request', id);
    }

    const currentEmployee = await getEmployeeByClerkId(collections, user.userId);

    if (!isAdmin && !currentEmployee) {
      throw buildForbiddenError('Not authorized to reject this leave request');
    }

    const rejectorEmployeeId = currentEmployee?.employeeId;
    const rejectorDeptId = currentEmployee?.departmentId || user.departmentId;

    if (isManager) {
      if (!leave.reportingManagerId || leave.reportingManagerId !== rejectorEmployeeId) {
        throw buildForbiddenError('Only the assigned reporting manager can reject this leave request');
      }
    } else if (isHR) {
      if (!rejectorDeptId || !leave.departmentId || leave.departmentId !== rejectorDeptId) {
        throw buildForbiddenError('Department mismatch for HR rejection');
      }
    } else if (!isAdmin) {
      throw buildForbiddenError('Not authorized to reject this leave request');
    }

    if (!isAdmin && leave.employeeId === rejectorEmployeeId) {
      throw buildForbiddenError('Employees cannot reject their own leave requests');
    }

    // Check if leave can be rejected
    if (leave.status !== 'pending') {
      throw buildConflictError('Can only reject pending leave requests');
    }

    // Prepare update object
    const updateObj = {
      status: 'rejected',
      managerStatus: 'rejected',
      finalStatus: 'rejected',
      rejectedBy: user.userId,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date()
    };

    // Update leave status within transaction
    await collections.leaves.updateOne(
      { _id: leave._id },
      { $set: updateObj },
      { session }
    );

    // Get updated leave
    return await collections.leaves.findOne(
      { _id: leave._id },
      { session }
    );
  });

  // Broadcast event outside transaction (after commit)
  const io = getSocketIO(req);
  if (io) {
    broadcastLeaveEvents.rejected(io, user.companyId, updatedLeave, user.userId, reason);
  }

  if (updatedLeave) {
    logLeaveEvent('reject', updatedLeave, user);
  }

  return sendSuccess(res, updatedLeave, 'Leave request rejected successfully');
});

/**
 * @desc    Manager approval/rejection action
 * @route   PATCH /api/leaves/:id/manager-action
 * @access  Private (Manager, Admin, Superadmin)
 */
export const managerActionLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, reason, comments } = req.body || {};
  const user = extractUser(req);
  const userRole = user.role?.toLowerCase();

  if (!id) {
    throw buildValidationError('id', 'Leave ID is required');
  }

  const normalizedAction = (action || '').toString().toLowerCase();
  if (!['approved', 'rejected'].includes(normalizedAction)) {
    throw buildValidationError('action', 'Action must be approved or rejected');
  }

  if (normalizedAction === 'rejected' && (!reason || !reason.trim())) {
    throw buildValidationError('reason', 'Rejection reason is required');
  }

  const collections = getTenantCollections(user.companyId);
  const currentEmployee = await getEmployeeByClerkId(collections, user.userId);

  if (!currentEmployee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isManager = userRole === 'manager';

  const result = await withTransactionRetry(user.companyId, async (tenantCollections, session) => {
    const leave = await tenantCollections.leaves.findOne(
      { ...buildLeaveIdFilter(id), isDeleted: { $ne: true } },
      { session }
    );

    if (!leave) {
      throw buildNotFoundError('Leave request', id);
    }

    if (leave.managerStatus && leave.managerStatus !== 'pending') {
      throw buildConflictError('Manager action already taken for this leave');
    }

    if (!isAdmin) {
      if (!isManager) {
        throw buildForbiddenError('Not authorized to approve or reject this leave request');
      }

      if (leave.reportingManagerId && leave.reportingManagerId !== currentEmployee.employeeId) {
        throw buildForbiddenError('Only the reporting manager can approve or reject this leave request');
      }

      if (leave.employeeId === currentEmployee.employeeId) {
        throw buildForbiddenError('Employees cannot approve their own leave requests');
      }
    }

    const updateObj = {
      status: normalizedAction,
      managerStatus: normalizedAction,
      finalStatus: normalizedAction,
      updatedAt: new Date()
    };

    if (normalizedAction === 'approved') {
      updateObj.approvedBy = user.userId;
      updateObj.approvedAt = new Date();
      updateObj.approvalComments = comments || '';
    } else {
      updateObj.rejectedBy = user.userId;
      updateObj.rejectedAt = new Date();
      updateObj.rejectionReason = reason;
    }

    await tenantCollections.leaves.updateOne(
      { _id: leave._id },
      { $set: updateObj },
      { session }
    );

    let updatedLeaveBalances = null;
    let employee = null;

    if (normalizedAction === 'approved') {
      employee = await tenantCollections.employees.findOne(
        { employeeId: leave.employeeId },
        { session }
      );

      if (employee && employee.leaveBalances) {
        const balanceIndex = employee.leaveBalances.findIndex(
          b => b.type === leave.leaveType
        );

        if (balanceIndex !== -1) {
          updatedLeaveBalances = employee.leaveBalances.map(b => ({ ...b }));
          updatedLeaveBalances[balanceIndex].used += leave.duration;
          updatedLeaveBalances[balanceIndex].balance -= leave.duration;

          await tenantCollections.employees.updateOne(
            { employeeId: leave.employeeId },
            { $set: { leaveBalances: updatedLeaveBalances } },
            { session }
          );
        }
      }
    }

    const updatedLeave = await tenantCollections.leaves.findOne(
      { _id: leave._id },
      { session }
    );

    return { leave: updatedLeave, employee, employeeLeaveBalances: updatedLeaveBalances };
  });

  const io = getSocketIO(req);
  if (io) {
    if (normalizedAction === 'approved') {
      broadcastLeaveEvents.approved(io, user.companyId, result.leave, user.userId);
    } else {
      broadcastLeaveEvents.rejected(io, user.companyId, result.leave, user.userId, reason);
    }

    if (result.employeeLeaveBalances) {
      broadcastLeaveEvents.balanceUpdated(io, user.companyId, result.employee._id, result.employeeLeaveBalances);
    }
  }

  if (result?.leave) {
    logLeaveEvent(normalizedAction, result.leave, user);
  }

  return sendSuccess(res, result.leave, `Leave request ${normalizedAction} successfully`);
});

/**
 * @desc    Cancel leave request
 * @route   POST /api/leaves/:id/cancel
 * @access  Private (All authenticated users)
 */
export const cancelLeave = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const user = extractUser(req);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid leave ID format');
  }

  logger.debug('[Leave Controller] cancelLeave called', { id, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const leave = await collections.leaves.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!leave) {
    throw buildNotFoundError('Leave request', id);
  }

  // Get Employee record to verify ownership
  const employee = await getEmployeeByClerkId(collections, user.userId);

  if (!employee || employee.employeeId !== leave.employeeId) {
    // Allow admins to cancel any leave (case-insensitive)
    const userRole = user.role?.toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';
    if (!isAdmin) {
      throw buildConflictError('You can only cancel your own leave requests');
    }
  }

  // Check if leave can be cancelled
  if (leave.status === 'cancelled') {
    throw buildConflictError('Leave is already cancelled');
  }

  if (leave.status === 'rejected') {
    throw buildConflictError('Cannot cancel a rejected leave request');
  }

  // Check if leave has already started
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const leaveStartDate = new Date(leave.startDate);
  leaveStartDate.setHours(0, 0, 0, 0);

  if (leaveStartDate <= today && leave.status === 'approved') {
    throw buildConflictError('Cannot cancel leave that has already started. Please contact HR.');
  }

  // Cancel leave
  const updateObj = {
    status: 'cancelled',
    cancelledBy: user.userId,
    cancelledAt: new Date(),
    cancellationReason: reason || 'Cancelled by employee',
    updatedAt: new Date()
  };

  await collections.leaves.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateObj }
  );

  // Restore balance if leave was previously approved
  if (leave.status === 'approved') {
    const employee = await collections.employees.findOne({
      employeeId: leave.employeeId
    });

    if (employee && employee.leaveBalances) {
      const balanceIndex = employee.leaveBalances.findIndex(
        b => b.type === leave.leaveType
      );

      if (balanceIndex !== -1) {
        // Restore the deducted balance
        employee.leaveBalances[balanceIndex].used -= leave.duration;
        employee.leaveBalances[balanceIndex].balance += leave.duration;

        await collections.employees.updateOne(
          { employeeId: leave.employeeId },
          { $set: { leaveBalances: employee.leaveBalances } }
        );

        // Broadcast balance update
        const io = getSocketIO(req);
        if (io) {
          broadcastLeaveEvents.balanceUpdated(io, user.companyId, employee._id, employee.leaveBalances);
        }
      }
    }
  }

  // Get updated leave
  const updatedLeave = await collections.leaves.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastLeaveEvents.cancelled(io, user.companyId, updatedLeave, user.userId);
  }

  return sendSuccess(res, updatedLeave, 'Leave request cancelled successfully');
});

/**
 * @desc    Get leave balance
 * @route   GET /api/leaves/balance
 * @access  Private (All authenticated users)
 */
export const getLeaveBalance = asyncHandler(async (req, res) => {
  const { leaveType } = req.query;
  const user = extractUser(req);

  logger.debug('[Leave Controller] getLeaveBalance called', { companyId: user.companyId, userId: user.userId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get Employee record
  const employee = await getEmployeeByClerkId(collections, user.userId);

  if (!employee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  // Get balance for specific type or all types
  if (leaveType) {
    const balance = await getEmployeeLeaveBalance(collections, employee.employeeId, leaveType);
    return sendSuccess(res, balance, 'Leave balance retrieved successfully');
  }

  // Get all leave balances
  const balances = {};
  const leaveTypes = ['sick', 'casual', 'earned', 'maternity', 'paternity', 'bereavement', 'compensatory', 'unpaid', 'special'];

  for (const type of leaveTypes) {
    balances[type] = await getEmployeeLeaveBalance(collections, employee.employeeId, type);
  }

  return sendSuccess(res, balances, 'All leave balances retrieved successfully');
});

/**
 * @desc    Get team leave requests (for managers)
 * @route   GET /api/leaves/team
 * @access  Private (Manager, Admin, HR, Superadmin)
 */
export const getTeamLeaves = asyncHandler(async (req, res) => {
  const { page, limit, status, leaveType, department } = req.query;
  const user = extractUser(req);

  logger.debug('[Leave Controller] getTeamLeaves called', { companyId: user.companyId, userId: user.userId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get current employee (manager)
  const currentEmployee = await getEmployeeByClerkId(collections, user.userId);

  if (!currentEmployee) {
    throw buildNotFoundError('Employee', user.userId);
  }

  // Build filter for team leaves
  const filter = {
    companyId: user.companyId,
    isDeleted: { $ne: true }
  };

  // Apply status filter
  if (status) {
    filter.status = status;
  }

  // Apply leave type filter
  if (leaveType) {
    filter.leaveType = leaveType;
  }

  // Get team members based on role (case-insensitive)
  let teamEmployeeIds = [];
  const userRole = user.role?.toLowerCase();

  if (userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin') {
    // Admins/HR can see all employees
    const allEmployees = await collections.employees.find({
      companyId: user.companyId,
      isDeleted: { $ne: true }
    }).toArray();
    teamEmployeeIds = allEmployees.map(emp => emp.employeeId);
  } else if (userRole === 'manager') {
    // Managers can see their department employees
    const deptFilter = {
      companyId: user.companyId,
      isDeleted: { $ne: true }
    };

    // Filter by department if specified, or use manager's department
    if (department) {
      deptFilter.departmentId = department;
    } else if (currentEmployee.departmentId) {
      deptFilter.departmentId = currentEmployee.departmentId;
    }

    const teamEmployees = await collections.employees.find(deptFilter).toArray();
    teamEmployeeIds = teamEmployees.map(emp => emp.employeeId);
  } else {
    // Other roles can only see their own leaves
    teamEmployeeIds = [currentEmployee.employeeId];
  }

  if (teamEmployeeIds.length === 0) {
    return sendSuccess(res, [], 'No team members found');
  }

  filter.employeeId = { $in: teamEmployeeIds };

  // Get total count
  const total = await collections.leaves.countDocuments(filter);

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  // Get leave records
  const leaves = await collections.leaves
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, leaves, 'Team leave requests retrieved successfully', 200, pagination);
});

/**
 * @desc    Upload attachment for leave request
 * @route   POST /api/leaves/:leaveId/attachments
 * @access  Private
 */
export const uploadAttachment = asyncHandler(async (req, res) => {
  const { leaveId } = req.params;
  const user = extractUser(req);

  logger.debug('[Leave Controller] uploadAttachment called', { leaveId, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find leave request
  const leave = await collections.leaves.findOne({
    leaveId: leaveId,
    companyId: user.companyId,
    isDeleted: false
  });

  if (!leave) {
    throw buildNotFoundError('Leave request', leaveId);
  }

  // Get Employee record
  const employee = await getEmployeeByClerkId(collections, user.userId);

  // Check authorization - employee can only upload to their own leaves, admins can upload to any (case-insensitive)
  const userRole = user.role?.toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';
  if (leave.employeeId !== employee?.employeeId && !isAdmin) {
    throw buildForbiddenError('Not authorized to upload attachments for this leave');
  }

  if (!req.file) {
    throw buildValidationError('file', 'No file uploaded');
  }

  // Phase 2.3: Add file size and type validation
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  // Check file size
  if (req.file.size > MAX_FILE_SIZE) {
    throw buildValidationError('file', `File size exceeds maximum allowed size of 5MB. Your file is ${(req.file.size / (1024 * 1024)).toFixed(2)}MB`);
  }

  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
    throw buildValidationError('file', `File type not allowed. Allowed types: PDF, JPEG, PNG, DOC, DOCX, XLS, XLSX`);
  }

  const attachment = {
    attachmentId: generateId('ATT', user.companyId),
    filename: req.file.filename,
    originalName: req.file.originalname,
    url: `/uploads/leave-attachments/${req.file.filename}`,
    mimeType: req.file.mimetype,
    size: req.file.size,
    uploadedAt: new Date(),
    uploadedBy: user.userId
  };

  // Initialize attachments array if it doesn't exist
  const currentAttachments = leave.attachments || [];
  const maxAttachments = 5;

  if (currentAttachments.length >= maxAttachments) {
    throw buildValidationError(`Maximum ${maxAttachments} attachments allowed per leave request`);
  }

  // Add attachment
  await collections.leaves.updateOne(
    { _id: leave._id },
    {
      $push: { attachments: attachment },
      $set: { updatedAt: new Date() }
    }
  );

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastToCompany(io, user.companyId, 'leave:attachment_uploaded', {
      leaveId: leave.leaveId,
      attachment,
      uploadedBy: user.userId
    });
  }

  return sendSuccess(res, attachment, 'Attachment uploaded successfully');
});

/**
 * @desc    Delete attachment from leave request
 * @route   DELETE /api/leaves/:leaveId/attachments/:attachmentId
 * @access  Private
 */
export const deleteAttachment = asyncHandler(async (req, res) => {
  const { leaveId, attachmentId } = req.params;
  const user = extractUser(req);

  logger.debug('[Leave Controller] deleteAttachment called', { leaveId, attachmentId, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find leave request
  const leave = await collections.leaves.findOne({
    leaveId: leaveId,
    companyId: user.companyId,
    isDeleted: false
  });

  if (!leave) {
    throw buildNotFoundError('Leave request', leaveId);
  }

  // Get Employee record
  const employee = await getEmployeeByClerkId(collections, user.userId);

  // Check authorization (case-insensitive)
  const userRole = user.role?.toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin';
  if (leave.employeeId !== employee?.employeeId && !isAdmin) {
    throw buildForbiddenError('Not authorized to delete attachments from this leave');
  }

  // Find the attachment
  const attachments = leave.attachments || [];
  const attachmentIndex = attachments.findIndex(a => a.attachmentId === attachmentId);

  if (attachmentIndex === -1) {
    throw buildNotFoundError('Attachment', attachmentId);
  }

  const attachment = attachments[attachmentIndex];

  // Delete file from filesystem
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'leave-attachments', attachment.filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    logger.info('[Leave Controller] File deleted', { filePath });
  }

  // Remove attachment from database
  await collections.leaves.updateOne(
    { _id: leave._id },
    {
      $pull: { attachments: { attachmentId: attachmentId } },
      $set: { updatedAt: new Date() }
    }
  );

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastToCompany(io, user.companyId, 'leave:attachment_deleted', {
      leaveId: leave.leaveId,
      attachmentId,
      deletedBy: user.userId
    });
  }

  return sendSuccess(res, { attachmentId }, 'Attachment deleted successfully');
});

/**
 * @desc    Get attachments for leave request
 * @route   GET /api/leaves/:leaveId/attachments
 * @access  Private
 */
export const getAttachments = asyncHandler(async (req, res) => {
  const { leaveId } = req.params;
  const user = extractUser(req);

  logger.debug('[Leave Controller] getAttachments called', { leaveId, companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find leave request
  const leave = await collections.leaves.findOne({
    leaveId: leaveId,
    companyId: user.companyId,
    isDeleted: false
  });

  if (!leave) {
    throw buildNotFoundError('Leave request', leaveId);
  }

  return sendSuccess(res, leave.attachments || [], 'Attachments retrieved successfully');
});

export default {
  getLeaves,
  getLeaveById,
  createLeave,
  updateLeave,
  deleteLeave,
  getMyLeaves,
  getLeavesByStatus,
  approveLeave,
  rejectLeave,
  managerActionLeave,
  cancelLeave,
  getLeaveBalance,
  getTeamLeaves,
  uploadAttachment,
  deleteAttachment,
  getAttachments
};
