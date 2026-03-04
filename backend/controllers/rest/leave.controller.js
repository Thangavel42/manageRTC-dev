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
import auditLogService from '../../services/audit/auditLog.service.js';
import customLeavePolicyService from '../../services/leaves/customLeavePolicy.service.js';
import leaveAttendanceSyncService from '../../services/leaves/leaveAttendanceSync.service.js';
import leaveLedgerService from '../../services/leaves/leaveLedger.service.js';
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

/** Escape special regex characters to prevent ReDoS via user-supplied search strings */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function buildLeaveIdFilter(id) {
  if (ObjectId.isValid(id)) {
    return { $or: [{ _id: new ObjectId(id) }, { leaveId: id }] };
  }
  return { leaveId: id };
}

// SIMPLIFIED STATUS NORMALIZATION
// The main status field is the single source of truth
// Deprecated fields are populated for backward compatibility with frontend
// Phase 4: Added deprecation notice - this function will be removed in v2.0
// TODO: Frontend should be updated to use the main `status` field only
function normalizeLeaveStatuses(leave) {
  const mainStatus = leave.status || 'pending';

  // Log deprecation warning in development
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[DEPRECATION] normalizeLeaveStatuses is deprecated. Use leave.status directly. Will be removed in v2.0');
  }

  return {
    ...leave,
    status: mainStatus,
    // ========== DEPRECATED FIELDS (kept for backward compatibility) ==========
    // All deprecated fields now mirror the main status
    // Will be removed in v2.0 - Frontend should use `status` field only
    finalStatus: mainStatus,
    managerStatus: leave.managerStatus || mainStatus,
    employeeStatus: leave.employeeStatus || mainStatus,
    hrStatus: leave.hrStatus || mainStatus,
  };
}

/**
 * Helper: Get leave balance for an employee
 * Checks for custom policies first, then falls back to default balance
 * Phase 2: Added tenant isolation validation
 */
async function getEmployeeLeaveBalance(collections, employeeId, leaveType, companyId = null) {
  // Note: No need to filter by companyId here since collections are already from the tenant-specific database
  // Employee documents in tenant DB don't have a companyId field
  const employee = await collections.employees.findOne({
    employeeId,
    isDeleted: { $ne: true }
  });

  // Fetch leave type record for ObjectId and name (for ObjectId-based system)
  let leaveTypeRecord = null;
  if (companyId && leaveType) {
    try {
      leaveTypeRecord = await collections.leaveTypes.findOne({
        companyId,
        code: { $regex: new RegExp(`^${leaveType}$`, 'i') },
        isActive: true,
        isDeleted: { $ne: true }
      });
    } catch (ltErr) {
      logger.warn('[Leave Balance] Leave type lookup failed:', ltErr.message);
    }
  }

  // Helper to add leaveTypeId and leaveTypeName to balance response
  const enrichBalanceResponse = (balanceObj) => ({
    ...balanceObj,
    leaveTypeId: leaveTypeRecord?._id?.toString() || null,
    leaveTypeName: leaveTypeRecord?.name || balanceObj.type || ''
  });

  // Note: Tenant isolation is ensured by using getTenantCollections(companyId) to get the database
  // No need to check employee.companyId since employee documents are in the tenant-specific database

  // Check for custom policy first (before early return, so it can cover employees
  // whose leaveBalance.balances array may not yet include this leave type)
  let customPolicy = null;
  if (companyId) {
    try {
      customPolicy = await customLeavePolicyService.getEmployeePolicy(companyId, employeeId, leaveType);
    } catch (error) {
      logger.warn('[Leave Balance] Custom policy check failed:', error.message);
    }
  }

  if (!employee || !employee.leaveBalance?.balances) {
    // No embedded balance data — try custom policy first, then fall back to leave type defaults
    if (customPolicy) {
      // annualQuota is the canonical field; 'days' kept for legacy compatibility
      const totalDays = customPolicy.annualQuota ?? customPolicy.days ?? 0;
      return enrichBalanceResponse({
        type: leaveType,
        balance: totalDays,
        used: 0,
        total: totalDays,
        hasCustomPolicy: true,
        customPolicyId: customPolicy._id?.toString(),
        customPolicyName: customPolicy.name
      });
    }
    // Fallback: use the leave type's default annual quota if employee balance not yet initialized
    if (leaveTypeRecord && leaveTypeRecord.annualQuota > 0) {
      return enrichBalanceResponse({
        type: leaveType,
        balance: leaveTypeRecord.annualQuota,
        used: 0,
        total: leaveTypeRecord.annualQuota,
        hasCustomPolicy: false
      });
    }
    return enrichBalanceResponse({ type: leaveType, balance: 0, used: 0, total: 0, hasCustomPolicy: false });
  }

  // Get the base balance from the embedded employee record
  const balanceInfo = employee.leaveBalance.balances.find(b => b.type === leaveType);
  let totalDays = balanceInfo?.total || 0;
  let usedDays = balanceInfo?.used || 0;
  let balanceDays = balanceInfo?.balance || 0;

  // Check ledger for the actual current balance (ledger is source of truth)
  const leaveLedger = collections.leaveLedger;
  const latestLedgerEntry = await leaveLedger.findOne({
    employeeId,
    leaveType: leaveType,
    isDeleted: { $ne: true }
  }, { sort: { transactionDate: -1 } });

  // Use ledger balance if available, otherwise use embedded balance
  if (latestLedgerEntry) {
    balanceDays = latestLedgerEntry.balanceAfter;
  }

  if (customPolicy) {
    // Override total with custom policy quota.
    // The MongoDB document stores this as 'annualQuota'; 'days' is kept for backward compatibility.
    totalDays = customPolicy.annualQuota ?? customPolicy.days ?? totalDays;
    // Balance comes from ledger (prioritized above), not calculated

    return enrichBalanceResponse({
      type: leaveType,
      balance: balanceDays,
      used: usedDays,
      total: totalDays,
      hasCustomPolicy: true,
      customPolicyId: customPolicy._id?.toString(),
      customPolicyName: customPolicy.name
    });
  }

  return enrichBalanceResponse({
    type: leaveType,
    balance: balanceDays,
    used: usedDays,
    total: totalDays,
    hasCustomPolicy: false
  });
}

/**
 * Helper: Get employee by clerk user ID
 * Tries multiple lookup strategies for compatibility.
 * Order: clerkUserId → userId → employeeId (as clerkId) → metadataEmployeeId → email
 * Auto-links clerkUserId to employee document on first successful match.
 *
 * @param {Object} collections - Tenant DB collections
 * @param {string} clerkUserId - Clerk user ID (sub from JWT)
 * @param {string|null} metadataEmployeeId - employeeId from Clerk publicMetadata (e.g. 'EMP-0256')
 * @param {string|null} email - User email for last-resort lookup
 */
async function getEmployeeByClerkId(collections, clerkUserId, metadataEmployeeId = null, email = null) {
  // Build OR conditions - try all known linkage fields
  const orConditions = [
    { clerkUserId: clerkUserId },
    { userId: clerkUserId },
    { employeeId: clerkUserId }  // In case clerkUserId happens to be stored as employeeId
  ];

  // If Clerk metadata contains an employeeId (e.g. 'EMP-0256'), use it as extra lookup
  if (metadataEmployeeId && metadataEmployeeId !== clerkUserId) {
    orConditions.push({ employeeId: metadataEmployeeId });
  }

  // Last resort: look up by email (handles the case where neither clerkUserId nor employeeId are linked)
  if (email) {
    orConditions.push({ email: email.toLowerCase() });
    orConditions.push({ workEmail: email.toLowerCase() });
  }

  const employee = await collections.employees.findOne({
    $or: orConditions,
    isDeleted: { $ne: true }
  });

  // If found but clerkUserId not yet stored, persist it for future lookups
  if (employee && !employee.clerkUserId && clerkUserId) {
    try {
      await collections.employees.updateOne(
        { _id: employee._id },
        { $set: { clerkUserId: clerkUserId, updatedAt: new Date() } }
      );
      employee.clerkUserId = clerkUserId;
    } catch (linkErr) {
      logger.warn('[getEmployeeByClerkId] Failed to link clerkUserId to employee:', linkErr.message);
    }
  }

  return employee;
}

/**
 * @desc    Get all leave requests with pagination and filtering
 * @route   GET /api/leaves
 * @access  Private (Employee, Manager, HR, Admin, Superadmin)
 */
export const getLeaves = asyncHandler(async (req, res) => {
  const { page, limit, search, status, leaveType, leaveTypeId, employee, startDate, endDate, sortBy, order } = req.query;
  const user = extractUser(req);
  const userRole = user.role?.toLowerCase();

  logger.debug('[Leave Controller] getLeaves', { companyId: user.companyId });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Resolve current employee for scoped roles
  const scopedRoles = ['employee', 'manager', 'hr'];
  const needsEmployeeLookup = scopedRoles.includes(userRole || '');
  const currentEmployee = needsEmployeeLookup
    ? await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email)
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
    case 'hr':
      // HR can see ALL leaves in the company (both HR-fallback and manager-assigned)
      // Approval authority remains restricted by isHRFallback check in approveLeave/rejectLeave
      break;
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

  // Support both legacy code-based filtering and new ObjectId-based filtering
  if (leaveType) {
    // Legacy: filter by leaveType code (e.g., 'earned')
    baseFilter.leaveType = leaveType;
  } else if (leaveTypeId) {
    // New ObjectId-based filtering
    if (ObjectId.isValid(leaveTypeId)) {
      baseFilter.leaveTypeId = new ObjectId(leaveTypeId);
    }
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
    const safeSearch = escapeRegex(search.trim());
    andClauses.push({
      $or: [
        { reason: { $regex: safeSearch, $options: 'i' } },
        { detailedReason: { $regex: safeSearch, $options: 'i' } }
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
  const limitNum = Math.min(parseInt(limit) || 20, 200);
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

  // Fetch leave types to populate leaveTypeName for leaves that don't have it
  // (for backward compatibility with existing leaves)
  const leaveTypeIds = Array.from(
    new Set(leaves.map(leave => leave.leaveTypeId).filter(id => id && ObjectId.isValid(id)))
  );

  // Also collect leaveType codes for leaves that don't have leaveTypeId (backward compatibility)
  const leaveTypeCodes = Array.from(
    new Set(leaves.map(leave => leave.leaveType).filter(Boolean).map(code => code.toLowerCase()))
  );

  let leaveTypesById = new Map();
  let leaveTypesByCode = new Map();

  // Fetch by ObjectId
  if (leaveTypeIds.length > 0) {
    const leaveTypes = await collections.leaveTypes.find({
      _id: { $in: leaveTypeIds.map(id => new ObjectId(id)) },
      isDeleted: { $ne: true }
    }).toArray();

    leaveTypesById = new Map(
      leaveTypes.map(lt => [lt._id.toString(), { name: lt.name, code: lt.code.toLowerCase() }])
    );
  }

  // Fetch by code (for backward compatibility with old leaves)
  if (leaveTypeCodes.length > 0) {
    const leaveTypesByCodeData = await collections.leaveTypes.find({
      code: { $in: leaveTypeCodes },
      isDeleted: { $ne: true }
    }).toArray();

    leaveTypesByCode = new Map(
      leaveTypesByCodeData.map(lt => [lt.code.toLowerCase(), lt.name])
    );
  }

  const leavesWithEmployees = leaves.map(leave => {
    const employee = employeesById.get(leave.employeeId);
    const manager = managersById.get(leave.reportingManagerId);
    const employeeName = employee?.fullName || leave.employeeName || (leave.employeeId ? `User ${leave.employeeId}` : 'Unknown');
    const reportingManagerName = manager?.fullName || leave.reportingManagerName || '-';

    // Populate leaveTypeName if not present (backward compatibility)
    let leaveTypeName = leave.leaveTypeName;
    if (!leaveTypeName && leave.leaveTypeId) {
      // First try to look up by ObjectId (new system)
      const lt = leaveTypesById.get(leave.leaveTypeId.toString());
      leaveTypeName = lt?.name;
    }
    if (!leaveTypeName && leave.leaveType) {
      // Fallback: look up by code for old leaves
      const code = leave.leaveType.toLowerCase();
      leaveTypeName = leaveTypesByCode.get(code) || leave.leaveType;
    }

    return {
      ...normalizeLeaveStatuses(leave),
      leaveTypeName, // Ensure leaveTypeName is always populated
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

  // Populate leaveTypeName if not present (backward compatibility)
  if (!leave.leaveTypeName) {
    if (leave.leaveTypeId && ObjectId.isValid(leave.leaveTypeId)) {
      const leaveType = await collections.leaveTypes.findOne({
        _id: new ObjectId(leave.leaveTypeId),
        isDeleted: { $ne: true }
      });
      if (leaveType) {
        leave.leaveTypeName = leaveType.name;
      }
    }
    // Fallback: look up by code for old leaves
    if (!leave.leaveTypeName && leave.leaveType) {
      const leaveType = await collections.leaveTypes.findOne({
        code: leave.leaveType,
        isDeleted: { $ne: true }
      });
      leave.leaveTypeName = leaveType?.name || leave.leaveType;
    }
  }

  // Employees can only view their own leaves; privileged roles see all company leaves
  const userRole = user.role?.toLowerCase();
  const isPrivilegedRole = ['admin', 'superadmin', 'hr', 'manager'].includes(userRole);
  if (!isPrivilegedRole && leave.employeeId !== user.userId && leave.clerkUserId !== user.userId) {
    throw buildForbiddenError('You can only view your own leave requests');
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

  // Prevent non-privileged users from creating leaves on behalf of another employee
  const requestorRole = user.role?.toLowerCase();
  const isPrivilegedRequestor = ['admin', 'superadmin', 'hr'].includes(requestorRole);
  if (!isPrivilegedRequestor && leaveData.employeeId && leaveData.employeeId !== user.userId) {
    throw buildForbiddenError('Employees can only create leave requests for themselves');
  }

  // Resolve employee for this leave (admin can create for another employee)
  const employeeLookupId = leaveData.employeeId || user.userId;

  // Check if the lookup ID is an ObjectId (new frontend uses _id)
  const isObjectId = ObjectId.isValid(employeeLookupId);

  let employee;
  if (isObjectId) {
    // New: Lookup by MongoDB _id
    employee = await collections.employees.findOne({
      _id: new ObjectId(employeeLookupId),
      isDeleted: { $ne: true }
    });
  } else {
    // Legacy: Lookup by employeeId or clerkUserId
    employee = await collections.employees.findOne({
      $or: [
        { employeeId: employeeLookupId },
        { clerkUserId: employeeLookupId }
      ],
      isDeleted: { $ne: true }
    });
  }

  if (!employee) {
    throw buildNotFoundError('Employee', employeeLookupId);
  }

  // Validate leaveTypeId against this company's active leave types (ObjectId-based system)
  let leaveTypeRecord = null;
  const leaveTypeId = leaveData.leaveTypeId || leaveData.leaveType; // Support both for transition
  if (leaveTypeId) {
    // Check if it's an ObjectId or a code (backward compatibility)
    const isObjectId = ObjectId.isValid(leaveTypeId);

    if (isObjectId) {
      // New ObjectId-based validation
      leaveTypeRecord = await collections.leaveTypes.findOne({
        _id: new ObjectId(leaveTypeId),
        companyId: user.companyId,
        isActive: true,
        isDeleted: { $ne: true }
      });
    } else {
      // Backward compatibility: code-based validation (deprecated)
      leaveTypeRecord = await collections.leaveTypes.findOne({
        companyId: user.companyId,
        code: leaveTypeId.toUpperCase(),
        isActive: true,
        isDeleted: { $ne: true }
      });
    }

    if (!leaveTypeRecord) {
      throw buildValidationError('leaveTypeId', `Invalid leave type: ${leaveTypeId}`);
    }
  } else {
    throw buildValidationError('leaveTypeId', 'Leave type is required');
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
  // Route to HR when no reporting manager exists (applies to ALL roles — employee, hr, manager, etc.)
  // Any HR user can then approve the request from their dashboard
  const isHRFallback = !reportingManagerId;

  if (isHRFallback) {
    logger.info('[Leave Controller] No reporting manager — routing to HR pool for approval', {
      employeeId: employee.employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      userRole,
    });
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

  // Get current leave balance (use the code from leaveTypeRecord for compatibility)
  const leaveTypeCode = leaveTypeRecord.code.toLowerCase();
  const currentBalance = await getEmployeeLeaveBalance(collections, employee.employeeId, leaveTypeCode, user.companyId);

  // Calculate duration based on session type
  const isHalfDay = leaveData.session === 'First Half' || leaveData.session === 'Second Half';
  let duration;
  if (isHalfDay) {
    // Half-day: same-day leave = 0.5; multi-day range = totalCalendarDays - 0.5 (min 0.5)
    const diffTimeMs = Math.abs(endDate - startDate);
    const totalCalendarDays = Math.ceil(diffTimeMs / (1000 * 60 * 60 * 24)) + 1;
    duration = Math.max(0.5, totalCalendarDays - 0.5);
  } else {
    const diffTimeMs = Math.abs(endDate - startDate);
    duration = Math.ceil(diffTimeMs / (1000 * 60 * 60 * 24)) + 1;
  }

  // Prepare leave data
  // SIMPLIFIED APPROVAL WORKFLOW: Single status + isHRFallback flag determines who can approve
  // - If isHRFallback = false: Reporting manager approves (HR only views)
  // - If isHRFallback = true: HR approves (no reporting manager assigned)
  const leaveToInsert = {
    leaveId: `leave_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    companyId: user.companyId,
    employeeId: employee.employeeId,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    departmentId: leaveData.departmentId || employee.departmentId || employee.department || null,
    // ObjectId-based leave type system
    leaveTypeId: leaveTypeRecord._id,              // ObjectId reference
    leaveType: leaveTypeCode,                      // Code for balance compatibility (e.g., 'earned')
    leaveTypeName: leaveTypeRecord.name,           // Display name (e.g., 'Annual Leave')
    startDate: new Date(leaveData.startDate),
    endDate: new Date(leaveData.endDate),
    fromDate: new Date(leaveData.startDate),
    toDate: new Date(leaveData.endDate),
    session: leaveData.session || 'Full Day',
    isHalfDay,
    halfDayType: isHalfDay
      ? (leaveData.session === 'First Half' ? 'first-half' : 'second-half')
      : null,
    duration: duration,
    reason: leaveData.reason || '',
    detailedReason: leaveData.detailedReason || '',
    // Main status field (single source of truth)
    status: 'pending',
    // Determines who can approve this request
    isHRFallback,
    // Reporting manager (null if HR fallback)
    reportingManagerId: isHRFallback ? null : reportingManagerId,
    balanceAtRequest: currentBalance.balance,
    handoverToId: leaveData.handoverTo || null,
    attachments: leaveData.attachments || [],
    createdBy: user.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    // ========== DEPRECATED FIELDS (kept for backward compatibility) ==========
    employeeStatus: 'pending',
    managerStatus: 'pending',  // No longer set to 'approved' - use isHRFallback flag instead
    hrStatus: 'pending',
    finalStatus: 'pending',
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

  // Build update object — only allow safe, non-privileged fields
  const ALLOWED_UPDATE_FIELDS = [
    'reason', 'detailedReason', 'startDate', 'endDate', 'session',
    'handoverToId', 'attachments', 'departmentId', 'contactInfo',
    'emergencyContact', 'handoverNotes'
  ];
  const updateObj = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (updateData[field] !== undefined) updateObj[field] = updateData[field];
  }
  updateObj.updatedBy = user.userId;
  updateObj.updatedAt = new Date();

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

  // Get Employee record (tries clerkUserId, employeeId from metadata, and email as fallback)
  const employee = await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email);

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
  const limitNum = Math.min(parseInt(limit) || 20, 200);
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

  // Fetch leave types to populate leaveTypeName (backward compatibility)
  const leaveTypeIds = Array.from(
    new Set(leaves.map(leave => leave.leaveTypeId).filter(id => id && ObjectId.isValid(id)))
  );
  const leaveTypeCodes = Array.from(
    new Set(leaves.map(leave => leave.leaveType).filter(Boolean).map(code => code.toLowerCase()))
  );

  let leaveTypesById = new Map();
  let leaveTypesByCode = new Map();

  if (leaveTypeIds.length > 0) {
    const leaveTypes = await collections.leaveTypes.find({
      _id: { $in: leaveTypeIds.map(id => new ObjectId(id)) },
      isDeleted: { $ne: true }
    }).toArray();
    leaveTypesById = new Map(leaveTypes.map(lt => [lt._id.toString(), lt.name]));
  }

  if (leaveTypeCodes.length > 0) {
    const leaveTypesByCodeData = await collections.leaveTypes.find({
      code: { $in: leaveTypeCodes },
      isDeleted: { $ne: true }
    }).toArray();
    leaveTypesByCode = new Map(leaveTypesByCodeData.map(lt => [lt.code.toLowerCase(), lt.name]));
  }

  const leavesWithManagers = leaves.map(leave => {
    const manager = managersById.get(leave.reportingManagerId);

    // Populate leaveTypeName if not present (backward compatibility)
    let leaveTypeName = leave.leaveTypeName;
    if (!leaveTypeName && leave.leaveTypeId) {
      leaveTypeName = leaveTypesById.get(leave.leaveTypeId.toString());
    }
    if (!leaveTypeName && leave.leaveType) {
      leaveTypeName = leaveTypesByCode.get(leave.leaveType.toLowerCase()) || leave.leaveType;
    }

    return {
      ...normalizeLeaveStatuses(leave),
      leaveTypeName,
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
    ? await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email)
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
    case 'hr':
      // HR sees all leaves in the company that are routed to the HR pool (isHRFallback = true)
      filter.isHRFallback = true;
      break;
    case 'admin':
    case 'superadmin':
      break;
    default:
      throw buildForbiddenError('Unauthorized to view leave requests');
  }

  const total = await collections.leaves.countDocuments(filter);

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 200);
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
    try {
      // Find leave within transaction
      const leave = await collections.leaves.findOne(
        { ...buildLeaveIdFilter(id), isDeleted: { $ne: true } },
        { session }
      );

      if (!leave) {
        throw buildNotFoundError('Leave request', id);
      }

      let currentEmployee = await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email);

      // For HR users: if the standard multi-strategy lookup failed, try to resolve the employee
      // by matching the leave's reportingManagerId against the user's verified Clerk email.
      // This handles the common case where the HR user's Clerk account is not yet linked to
      // their employee record (clerkUserId not stored, publicMetadata.employeeId not set).
      if (!currentEmployee && isHR && leave.reportingManagerId && user.email) {
        const mgrByLeave = await collections.employees.findOne(
          { employeeId: leave.reportingManagerId, isDeleted: { $ne: true } },
          { session }
        );
        if (
          mgrByLeave &&
          (mgrByLeave.email?.toLowerCase() === user.email.toLowerCase() ||
            mgrByLeave.workEmail?.toLowerCase() === user.email.toLowerCase())
        ) {
          currentEmployee = mgrByLeave;
        }
      }

      if (!isAdmin && !currentEmployee) {
        // HR users are allowed to approve HR-fallback leaves without a linked employee record
        // (any HR can approve when no specific reporting manager is assigned)
        if (isHR && leave.isHRFallback) {
          // allowed — continue without employee record
        } else {
          throw buildForbiddenError('Not authorized to approve this leave request');
        }
      }

      const approverEmployeeId = currentEmployee?.employeeId;
      const approverDeptId = currentEmployee?.departmentId || user.departmentId;

      // Check authorization based on role
      // SIMPLIFIED APPROVAL WORKFLOW: Only ONE approval needed
      if (isManager) {
        // Managers can ONLY approve if they are the assigned reporting manager
        if (leave.isHRFallback) {
          throw buildForbiddenError('This leave request is routed to HR for approval (no reporting manager assigned)');
        }
        if (!leave.reportingManagerId || leave.reportingManagerId !== approverEmployeeId) {
          throw buildForbiddenError('Only the assigned reporting manager can approve this leave request');
        }
      } else if (isHR) {
        // HR can approve:
        // 1. Leaves routed to HR pool (isHRFallback = true), OR
        // 2. Leaves where the HR user is the assigned reporting manager
        const hrIsReportingManager = approverEmployeeId && leave.reportingManagerId === approverEmployeeId;
        if (!leave.isHRFallback && !hrIsReportingManager) {
          throw buildForbiddenError('This leave has an assigned reporting manager. Only they can approve it.');
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

      // Prepare update object (SIMPLIFIED: only update main status field)
      const updateObj = {
        status: 'approved',
        approvedBy: user.userId,
        approvedAt: new Date(),
        approvalComments: comments || '',
        updatedAt: new Date(),
        // ========== DEPRECATED FIELDS (kept for backward compatibility) ==========
        managerStatus: 'approved',
        finalStatus: 'approved',
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
      if (employee && employee.leaveBalance?.balances) {
        // Case-insensitive comparison: leave.leaveType may be stored as 'EARNED' (uppercase)
        // while employee.leaveBalance.balances[x].type is stored as 'earned' (lowercase)
        const leaveTypeLower = (leave.leaveType || '').toLowerCase();
        const balanceIndex = employee.leaveBalance.balances.findIndex(
          b => (b.type || '').toLowerCase() === leaveTypeLower
        );

        if (balanceIndex !== -1) {
          // Create a copy to avoid mutation
          updatedLeaveBalances = employee.leaveBalance.balances.map(b => ({ ...b }));

          // PHASE 1 FIX: Check balance before deducting
          const currentBalance = updatedLeaveBalances[balanceIndex].balance;
          if (currentBalance < leave.duration) {
            const error = new Error(
              `Insufficient leave balance. ` +
              `Available: ${currentBalance} days, Required: ${leave.duration} days`
            );
            error.code = 'INSUFFICIENT_BALANCE';
            error.details = {
              employeeId: leave.employeeId,
              leaveType: leave.leaveType,
              currentBalance,
              requestedDays: leave.duration,
              shortfall: leave.duration - currentBalance
            };
            throw error;
          }

          updatedLeaveBalances[balanceIndex].used += leave.duration;
          updatedLeaveBalances[balanceIndex].balance -= leave.duration;

          // Update employee leave balance
          await collections.employees.updateOne(
            { employeeId: leave.employeeId },
            { $set: { 'leaveBalance.balances': updatedLeaveBalances } },
            { session }
          );

          // Create ledger entry for leave usage (within transaction)
          // The session parameter ensures this is part of the atomic transaction
          const approverName = currentEmployee
            ? `${currentEmployee.firstName || ''} ${currentEmployee.lastName || ''}`.trim()
            : 'HR';

          // PHASE 1 FIX: recordLeaveUsage now also validates balance
          // This provides a second layer of protection
          leaveLedgerService.recordLeaveUsage(
            user.companyId,
            leave.employeeId,
            leaveTypeLower,
            leave.duration,
            leave._id.toString(),
            leave.startDate,
            leave.endDate,
            `Leave approved by ${approverName}`,
            session  // Pass session for transaction support
          );

          logger.info(`[Leave Approval] Ledger entry created for ${leave.employeeId}, ${leave.leaveType}, ${leave.duration} days`);
        }
      }

      // Get updated leave
      const updatedLeave = await collections.leaves.findOne(
        { _id: leave._id },
        { session }
      );

      return { leave: updatedLeave, employee, employeeLeaveBalances: updatedLeaveBalances };
    } catch (error) {
      // PHASE 1 FIX: Better error handling for insufficient balance
      if (error.code === 'INSUFFICIENT_BALANCE') {
        const conflictError = new ConflictError(
          `Cannot approve leave: ${error.message}`
        );
        conflictError.details = error.details;
        throw conflictError;
      }
      throw error; // Re-throw other errors
    }
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

  // Create attendance records for approved leave (Phase 1 - Critical Fix)
  // This runs outside transaction - attendance sync failure shouldn't fail leave approval
  try {
    const attendanceSyncResult = await leaveAttendanceSyncService.createAttendanceForLeave(
      user.companyId,
      result.leave
    );
    if (attendanceSyncResult.success) {
      logger.info(`[Leave Approval] Attendance sync completed:`, attendanceSyncResult.results);
    } else {
      logger.warn(`[Leave Approval] Attendance sync failed (non-critical):`, attendanceSyncResult.error);
    }
  } catch (attendanceError) {
    // Log error but don't fail the leave approval
    logger.error('[Leave Approval] Attendance sync error (non-critical):', attendanceError);
  }

  // Log to comprehensive audit service
  await auditLogService.logLeaveAction(
    user.companyId,
    'LEAVE_APPROVED',
    result.leave,
    user,
    req
  );

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

    let currentEmployee = await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email);

    // For HR users: if the standard lookup failed, try resolving via the leave's reportingManagerId
    // matched against the user's verified Clerk email (same pattern as approveLeave).
    if (!currentEmployee && isHR && leave.reportingManagerId && user.email) {
      const mgrByLeave = await collections.employees.findOne(
        { employeeId: leave.reportingManagerId, isDeleted: { $ne: true } },
        { session }
      );
      if (
        mgrByLeave &&
        (mgrByLeave.email?.toLowerCase() === user.email.toLowerCase() ||
          mgrByLeave.workEmail?.toLowerCase() === user.email.toLowerCase())
      ) {
        currentEmployee = mgrByLeave;
      }
    }

    if (!isAdmin && !currentEmployee) {
      // HR users are allowed to reject HR-fallback leaves without a linked employee record
      if (isHR && leave.isHRFallback) {
        // allowed — continue without employee record
      } else {
        throw buildForbiddenError('Not authorized to reject this leave request');
      }
    }

    const rejectorEmployeeId = currentEmployee?.employeeId;

    // Check authorization based on role
    // SIMPLIFIED APPROVAL WORKFLOW: Only ONE approval/rejection needed
    if (isManager) {
      // Managers can ONLY reject if they are the assigned reporting manager
      if (leave.isHRFallback) {
        throw buildForbiddenError('This leave request is routed to HR for rejection (no reporting manager assigned)');
      }
      if (!leave.reportingManagerId || leave.reportingManagerId !== rejectorEmployeeId) {
        throw buildForbiddenError('Only the assigned reporting manager can reject this leave request');
      }
    } else if (isHR) {
      // HR can reject:
      // 1. Leaves routed to HR pool (isHRFallback = true), OR
      // 2. Leaves where the HR user is the assigned reporting manager
      const hrIsReportingManager = rejectorEmployeeId && leave.reportingManagerId === rejectorEmployeeId;
      if (!leave.isHRFallback && !hrIsReportingManager) {
        throw buildForbiddenError('This leave has an assigned reporting manager. Only they can reject it.');
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

    // Prepare update object (SIMPLIFIED: only update main status field)
    const updateObj = {
      status: 'rejected',
      rejectedBy: user.userId,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date(),
      // ========== DEPRECATED FIELDS (kept for backward compatibility) ==========
      managerStatus: 'rejected',
      finalStatus: 'rejected',
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

  // Log to comprehensive audit service
  await auditLogService.logLeaveAction(
    user.companyId,
    'LEAVE_REJECTED',
    updatedLeave,
    user,
    req
  );

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
  // Initial employee lookup — may be null if the Clerk account is not yet linked to an employee record
  let currentEmployee = await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email);

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';
  const isManager = userRole === 'manager';
  const isHR = userRole === 'hr';

  const result = await withTransactionRetry(user.companyId, async (tenantCollections, session) => {
    const leave = await tenantCollections.leaves.findOne(
      { ...buildLeaveIdFilter(id), isDeleted: { $ne: true } },
      { session }
    );

    if (!leave) {
      throw buildNotFoundError('Leave request', id);
    }

    // For HR users: if the standard lookup failed, try resolving via the leave's
    // reportingManagerId matched against the user's verified Clerk email.
    if (!currentEmployee && isHR && leave.reportingManagerId && user.email) {
      const mgrByLeave = await tenantCollections.employees.findOne(
        { employeeId: leave.reportingManagerId, isDeleted: { $ne: true } },
        { session }
      );
      if (
        mgrByLeave &&
        (mgrByLeave.email?.toLowerCase() === user.email.toLowerCase() ||
          mgrByLeave.workEmail?.toLowerCase() === user.email.toLowerCase())
      ) {
        currentEmployee = mgrByLeave;
      }
    }

    if (!currentEmployee) {
      // HR users can act on HR-fallback leaves even without a linked employee record
      if (isHR && leave.isHRFallback) {
        // allowed — continue without employee record
      } else {
        throw buildForbiddenError('Employee record not found. Please ensure your account is linked to an employee profile.');
      }
    }

    if (leave.status && leave.status !== 'pending') {
      throw buildConflictError('This leave has already been processed');
    }

    if (!isAdmin) {
      // HR users who are the assigned reporting manager can also take action
      const hrIsReportingManager = isHR && currentEmployee?.employeeId && leave.reportingManagerId === currentEmployee.employeeId;

      if (!isManager && !hrIsReportingManager) {
        // HR can still handle HR-fallback leaves
        if (isHR && leave.isHRFallback) {
          // HR fallback — allowed, continue
        } else {
          throw buildForbiddenError('Not authorized to approve or reject this leave request');
        }
      }

      // For HR fallback leaves, regular managers (non-HR) cannot take action
      if (isManager && !isHR && leave.isHRFallback) {
        throw buildForbiddenError('This leave request is routed to HR for approval');
      }

      if (!hrIsReportingManager && leave.reportingManagerId && leave.reportingManagerId !== currentEmployee?.employeeId) {
        throw buildForbiddenError('Only the reporting manager can approve or reject this leave request');
      }

      if (currentEmployee && leave.employeeId === currentEmployee.employeeId) {
        throw buildForbiddenError('Employees cannot approve their own leave requests');
      }
    }

    // Update object (SIMPLIFIED: only update main status field)
    const updateObj = {
      status: normalizedAction,
      updatedAt: new Date(),
      // ========== DEPRECATED FIELDS (kept for backward compatibility) ==========
      managerStatus: normalizedAction,
      finalStatus: normalizedAction,
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

      if (employee && employee.leaveBalance?.balances) {
        // Case-insensitive comparison: leave.leaveType may be stored as 'EARNED' (uppercase)
        // while employee.leaveBalance.balances[x].type is stored as 'earned' (lowercase)
        const leaveTypeLower = (leave.leaveType || '').toLowerCase();
        const balanceIndex = employee.leaveBalance.balances.findIndex(
          b => (b.type || '').toLowerCase() === leaveTypeLower
        );

        if (balanceIndex !== -1) {
          updatedLeaveBalances = employee.leaveBalance.balances.map(b => ({ ...b }));
          updatedLeaveBalances[balanceIndex].used += leave.duration;
          updatedLeaveBalances[balanceIndex].balance -= leave.duration;

          await tenantCollections.employees.updateOne(
            { employeeId: leave.employeeId },
            { $set: { 'leaveBalance.balances': updatedLeaveBalances } },
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

  // Create attendance records for approved leave (Phase 1 - Critical Fix)
  if (normalizedAction === 'approved') {
    try {
      const attendanceSyncResult = await leaveAttendanceSyncService.createAttendanceForLeave(
        user.companyId,
        result.leave
      );
      if (attendanceSyncResult.success) {
        logger.info(`[Leave Manager Action] Attendance sync completed:`, attendanceSyncResult.results);
      } else {
        logger.warn(`[Leave Manager Action] Attendance sync failed (non-critical):`, attendanceSyncResult.error);
      }
    } catch (attendanceError) {
      logger.error('[Leave Manager Action] Attendance sync error (non-critical):', attendanceError);
    }
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
  const employee = await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email);

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

  // Wrap cancel + optional balance restoration in a transaction for atomicity
  const result = await withTransactionRetry(user.companyId, async (txCollections, session) => {
    const cancelUpdateObj = {
      status: 'cancelled',
      cancelledBy: user.userId,
      cancelledAt: new Date(),
      cancellationReason: reason || 'Cancelled by employee',
      updatedAt: new Date()
    };

    await txCollections.leaves.updateOne(
      { _id: new ObjectId(id) },
      { $set: cancelUpdateObj },
      { session }
    );

    let updatedEmployee = null;
    let restoredBalances = null;

    // Restore balance if leave was previously approved
    if (leave.status === 'approved') {
      const emp = await txCollections.employees.findOne(
        { employeeId: leave.employeeId },
        { session }
      );

      if (emp && emp.leaveBalance?.balances) {
        // Case-insensitive comparison: leave.leaveType may be uppercase ('EARNED')
        // while emp.leaveBalance.balances[x].type is lowercase ('earned')
        const leaveTypeLower = (leave.leaveType || '').toLowerCase();
        const balanceIndex = emp.leaveBalance.balances.findIndex(
          b => (b.type || '').toLowerCase() === leaveTypeLower
        );

        if (balanceIndex !== -1) {
          restoredBalances = emp.leaveBalance.balances.map(b => ({ ...b }));
          restoredBalances[balanceIndex].used -= leave.duration;
          restoredBalances[balanceIndex].balance += leave.duration;

          await txCollections.employees.updateOne(
            { employeeId: leave.employeeId },
            { $set: { 'leaveBalance.balances': restoredBalances } },
            { session }
          );

          updatedEmployee = emp;
        }
      }
    }

    // Get updated leave within transaction
    const updatedLeave = await txCollections.leaves.findOne(
      { _id: new ObjectId(id) },
      { session }
    );

    return { updatedLeave, updatedEmployee, restoredBalances };
  });

  // Create ledger entry outside transaction (non-critical, should not block cancellation)
  if (leave.status === 'approved' && result.restoredBalances) {
    const leaveTypeLower = (leave.leaveType || '').toLowerCase();
    await leaveLedgerService.recordLeaveRestoration(
      user.companyId,
      leave.employeeId,
      leaveTypeLower,
      leave.duration,
      leave._id.toString(),
      'Leave cancelled - balance restored'
    );
    logger.info(`[Leave Cancellation] Ledger entry created for ${leave.employeeId}, ${leave.leaveType}, ${leave.duration} days restored`);
  }

  // Cleanup attendance records for cancelled leave (Phase 1 - Critical Fix)
  if (leave.status === 'approved') {
    try {
      const attendanceCleanupResult = await leaveAttendanceSyncService.removeAttendanceForLeave(
        user.companyId,
        leave
      );
      if (attendanceCleanupResult.success) {
        logger.info(`[Leave Cancellation] Attendance cleanup completed:`, attendanceCleanupResult.results);
      } else {
        logger.warn(`[Leave Cancellation] Attendance cleanup failed (non-critical):`, attendanceCleanupResult.error);
      }
    } catch (attendanceError) {
      logger.error('[Leave Cancellation] Attendance cleanup error (non-critical):', attendanceError);
    }
  }

  // Broadcast Socket.IO events
  const io = getSocketIO(req);
  if (io) {
    broadcastLeaveEvents.cancelled(io, user.companyId, result.updatedLeave, user.userId);
    if (result.updatedEmployee && result.restoredBalances) {
      broadcastLeaveEvents.balanceUpdated(io, user.companyId, result.updatedEmployee._id, result.restoredBalances);
    }
  }

  return sendSuccess(res, result.updatedLeave, 'Leave request cancelled successfully');
});

/**
 * @desc    Get leave balance
 * @route   GET /api/leaves/balance
 * @access  Private (All authenticated users)
 * @query   employee - Optional: MongoDB ObjectId for HR/Admin to fetch balance for a specific employee
 */
export const getLeaveBalance = asyncHandler(async (req, res) => {
  const { leaveType, employee: queryEmployeeId } = req.query;
  const user = extractUser(req);

  logger.debug('[Leave Controller] getLeaveBalance called', {
    companyId: user.companyId,
    userId: user.userId,
    queryEmployeeId
  });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get Employee record
  // If employee _id (ObjectId) is provided in query, use it (for HR/Admin only)
  // Otherwise, get the current user's employee record
  let employee;
  if (queryEmployeeId) {
    // Verify the requesting user has permission to view other employees' balance
    const userRole = user.role?.toLowerCase();
    if (userRole !== 'admin' && userRole !== 'hr' && userRole !== 'superadmin') {
      throw buildForbiddenError('You do not have permission to view other employees\' leave balance');
    }
    // Find the employee by MongoDB _id (ObjectId)
    // NOTE: No need to filter by companyId here since collections are already from the tenant-specific database
    try {
      employee = await collections.employees.findOne({
        _id: new ObjectId(queryEmployeeId),
        isDeleted: { $ne: true }
      });
    } catch (error) {
      throw buildNotFoundError('Employee', String(queryEmployeeId));
    }
    if (!employee) {
      throw buildNotFoundError('Employee', String(queryEmployeeId));
    }
  } else {
    // Get current user's employee record (tries clerkUserId, employeeId from metadata, and email as fallback)
    employee = await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email);
  }

  // Fetch active leave types from company's database (dynamic, not hardcoded)
  const leaveTypeRecords = await collections.leaveTypes.find({
    companyId: user.companyId,
    isActive: true,
    isDeleted: { $ne: true }
  }).toArray();
  const activeLeaveTypeCodes = leaveTypeRecords.map(lt => lt.code.toLowerCase());

  if (!employee) {
    // Return zero balances gracefully instead of throwing an error
    const emptyBalances = {};
    for (const type of activeLeaveTypeCodes) {
      emptyBalances[type] = { type, balance: 0, used: 0, total: 0 };
    }
    if (leaveType) {
      return sendSuccess(res, { type: leaveType, balance: 0, used: 0, total: 0 }, 'Leave balance retrieved successfully');
    }
    return sendSuccess(res, emptyBalances, 'Leave balance retrieved successfully');
  }

  // Get balance for specific type or all types
  if (leaveType) {
    const balance = await getEmployeeLeaveBalance(collections, employee.employeeId, leaveType, user.companyId);
    return sendSuccess(res, balance, 'Leave balance retrieved successfully');
  }

  // Get all leave balances dynamically from DB leave types
  const balances = {};
  for (const type of activeLeaveTypeCodes) {
    balances[type] = await getEmployeeLeaveBalance(collections, employee.employeeId, type, user.companyId);
  }

  return sendSuccess(res, balances, 'All leave balances retrieved successfully');
});

/**
 * @desc    Get team leave requests (for reporting managers)
 * @route   GET /api/leaves/team
 * @access  Private (Reporting Managers, Admin, HR, Superadmin)
 *
 * Access Logic:
 * - Admin/HR/Superadmin: Can view all employees' leaves
 * - Reporting Managers: Can view leaves of employees who report to them (reportingTo === currentEmployee._id)
 * - Non-managers: Forbidden (must have at least one reportee to access this endpoint)
 */
export const getTeamLeaves = asyncHandler(async (req, res) => {
  const { page, limit, status, leaveType, department } = req.query;
  const user = extractUser(req);

  logger.debug('[Leave Controller] getTeamLeaves called', {
    companyId: user.companyId,
    userId: user.userId,
    role: user.role
  });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get current employee
  const currentEmployee = await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email);

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

  // Get team members based on role and reporting hierarchy (case-insensitive)
  let teamEmployeeIds = [];
  const userRole = user.role?.toLowerCase();

  if (userRole === 'admin' || userRole === 'hr' || userRole === 'superadmin') {
    // Admins/HR/Superadmin can see all employees
    logger.debug('[Leave Controller] Admin/HR/Superadmin access - fetching all employees');
    const allEmployees = await collections.employees.find({
      companyId: user.companyId,
      isDeleted: { $ne: true }
    }).toArray();
    teamEmployeeIds = allEmployees.map(emp => emp.employeeId);
  } else {
    // For all other roles: Check if user is a reporting manager
    // Find employees who report to current user (reportingTo === currentEmployee._id)
    logger.debug('[Leave Controller] Checking reporting manager status', {
      currentEmployeeId: currentEmployee._id,
      currentEmployeeEmpId: currentEmployee.employeeId
    });

    const reportees = await collections.employees.find({
      companyId: user.companyId,
      reportingTo: currentEmployee._id, // MongoDB ObjectId reference
      isDeleted: { $ne: true }
    }).toArray();

    logger.debug('[Leave Controller] Found reportees', {
      count: reportees.length,
      reporteeIds: reportees.map(r => r.employeeId)
    });

    if (reportees.length === 0) {
      // User is not a reporting manager - deny access
      throw buildForbiddenError(
        'Access denied. This page is only available for reporting managers. You must have at least one employee reporting to you to access team leave management.'
      );
    }

    // User is a reporting manager - show their reportees' leaves
    teamEmployeeIds = reportees.map(emp => emp.employeeId);
  }

  if (teamEmployeeIds.length === 0) {
    return sendSuccess(res, [], 'No team members found');
  }

  filter.employeeId = { $in: teamEmployeeIds };

  // Get total count
  const total = await collections.leaves.countDocuments(filter);

  const pageNum = parseInt(page) || 1;
  const limitNum = Math.min(parseInt(limit) || 20, 200);
  const skip = (pageNum - 1) * limitNum;

  // Get leave records
  const leaves = await collections.leaves
    .find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  logger.info('[Leave Controller] Team leaves retrieved', {
    userId: user.userId,
    role: user.role,
    teamSize: teamEmployeeIds.length,
    totalLeaves: total,
    returnedLeaves: leaves.length
  });

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
  const employee = await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email);

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
  const employee = await getEmployeeByClerkId(collections, user.userId, user.employeeId, user.email);

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

  // Delete file from filesystem (async, non-blocking)
  const { unlink } = await import('fs/promises');
  const path = await import('path');
  const filePath = path.join(process.cwd(), 'public', 'uploads', 'leave-attachments', attachment.filename);

  try {
    await unlink(filePath);
    logger.info('[Leave Controller] File deleted', { filePath });
  } catch (e) {
    // File may not exist on disk; continue regardless
    logger.warn('[Leave Controller] File not found on disk (continuing)', { filePath });
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

/**
 * @desc    Get leave statistics for admin dashboard
 * @route   GET /api/leaves/stats
 * @access  Private (Admin, HR, Superadmin)
 */
export const getLeaveStats = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  logger.debug('[Leave Controller] getLeaveStats called', { companyId: user.companyId });

  if (!user.companyId) {
    throw buildValidationError('companyId', 'Company ID is required. Please ensure your account is linked to a company.');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Get today's date range (start and end of today)
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

  // FIX 1: Remove companyId filter from employee query
  // In multi-tenant architecture, we're already in the correct company database
  // Employee documents don't have companyId field in tenant DB
  const totalEmployees = await collections.employees.countDocuments({
    // No companyId filter - already in tenant DB
    isActive: true,
    isDeleted: { $ne: true }
  });

  // FIX 2: Query actual attendance data for today
  // This provides real punch-in/out data instead of naive subtraction
  const todayAttendance = await collections.attendance.aggregate([
    {
      $match: {
        date: { $gte: startOfToday, $lt: endOfToday },
        isDeleted: { $ne: true }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]).toArray();

  // Transform to map for easy lookup
  const attendanceByStatus = {};
  todayAttendance.forEach(item => {
    attendanceByStatus[item._id] = item.count;
  });

  // Calculate actual present count based on real attendance data
  // Present includes: present, late, early-departure, half-day (all physically present)
  const actualPresent = (attendanceByStatus['present'] || 0) +
                        (attendanceByStatus['late'] || 0) +
                        (attendanceByStatus['early-departure'] || 0) +
                        (attendanceByStatus['half-day'] || 0);

  // On leave from attendance records (marked as 'on-leave')
  const onLeaveFromAttendance = attendanceByStatus['on-leave'] || 0;

  // Absent count (no leave, just absent)
  const absentCount = attendanceByStatus['absent'] || 0;

  // Weekend/Holiday counts (non-working days)
  const weekendCount = attendanceByStatus['weekend'] || 0;
  const holidayCount = attendanceByStatus['holiday'] || 0;

  // FIX 3: Also query approved leaves for planned/unplanned classification
  const approvedLeavesToday = await collections.leaves.find({
    // No companyId filter - already in tenant DB
    status: 'approved',
    isDeleted: { $ne: true },
    $or: [
      // Leave starts today
      { startDate: { $gte: startOfToday, $lt: endOfToday } },
      // Leave spans today (started before, ends after)
      { startDate: { $lt: startOfToday }, endDate: { $gt: startOfToday } }
    ]
  }).toArray();

  // Count unique employees on leave today
  const employeesOnLeaveToday = new Set(approvedLeavesToday.map(l => l.employeeId)).size;

  // Use actual present from attendance, fallback to calculation if no attendance data exists
  // Only use actual attendance if we have meaningful records (present, absent, on-leave)
  // NOT just weekend/holiday records
  const hasMeaningfulAttendanceData = (actualPresent > 0 || onLeaveFromAttendance > 0 || absentCount > 0);
  const totalPresent = hasMeaningfulAttendanceData ? actualPresent : Math.max(0, totalEmployees - employeesOnLeaveToday);

  // FIX 5: Fetch leave types and use leaveTypeId for modern ObjectId-based detection
  const leaveTypesList = await collections.leaveTypes.find({
    isActive: true,
    isDeleted: { $ne: true }
  }).toArray();

  // Create ObjectId maps for planned and unplanned leave types
  const plannedTypeIds = new Set(
    leaveTypesList
      .filter(lt => ['casual', 'earned', 'maternity', 'paternity', 'bereavement', 'special'].includes(lt.code.toLowerCase()))
      .map(lt => lt._id.toString())
  );

  const unplannedTypeIds = new Set(
    leaveTypesList
      .filter(lt => ['sick', 'compensatory', 'unpaid'].includes(lt.code.toLowerCase()))
      .map(lt => lt._id.toString())
  );

  // Count planned and unplanned leaves for today using leaveTypeId
  let plannedLeaves = 0;
  let unplannedLeaves = 0;

  approvedLeavesToday.forEach(leave => {
    // Prefer leaveTypeId (modern), fallback to leaveType (legacy)
    const leaveTypeId = leave.leaveTypeId?.toString();
    const leaveTypeCode = leave.leaveType;

    if (leaveTypeId) {
      // Modern ObjectId-based detection
      if (plannedTypeIds.has(leaveTypeId)) {
        plannedLeaves++;
      } else if (unplannedTypeIds.has(leaveTypeId)) {
        unplannedLeaves++;
      }
    } else if (leaveTypeCode) {
      // Legacy string-based detection (for backward compatibility)
      if (plannedTypeIds.has(leaveTypeCode) || ['casual', 'earned', 'maternity', 'paternity', 'bereavement', 'special'].includes(leaveTypeCode)) {
        plannedLeaves++;
      } else if (unplannedTypeIds.has(leaveTypeCode) || ['sick', 'compensatory', 'unpaid'].includes(leaveTypeCode)) {
        unplannedLeaves++;
      }
    }
  });

  // FIX 4: Remove companyId filter from pending requests query
  const pendingRequests = await collections.leaves.countDocuments({
    // No companyId filter - already in tenant DB
    status: 'pending',
    isDeleted: { $ne: true }
  });

  const stats = {
    totalPresent,
    plannedLeaves,
    unplannedLeaves,
    pendingRequests,
    totalEmployees,
    employeesOnLeaveToday,
    approvedLeavesToday: approvedLeavesToday.length,
    asOfDate: startOfToday,
    // Additional breakdown from attendance data
    attendanceBreakdown: {
      actualPresent,
      absent: absentCount,
      onLeave: onLeaveFromAttendance,
      halfDay: attendanceByStatus['half-day'] || 0,
      late: attendanceByStatus['late'] || 0,
      earlyDeparture: attendanceByStatus['early-departure'] || 0,
      weekend: weekendCount,
      holiday: holidayCount,
      hasAttendanceData: hasMeaningfulAttendanceData
    }
  };

  logger.debug('[Leave Controller] getLeaveStats result', stats);

  return sendSuccess(res, stats, 'Leave statistics retrieved successfully');
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
  getAttachments,
  getLeaveStats
};
