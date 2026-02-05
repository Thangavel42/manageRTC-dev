/**
 * Employee REST Controller
 * Handles all Employee CRUD operations via REST API
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import { clerkClient } from '@clerk/clerk-sdk-node';
import { ObjectId } from 'mongodb';
import { client, getTenantCollections } from '../../config/db.js';
import {
    asyncHandler,
    buildConflictError,
    buildNotFoundError,
    buildValidationError
} from '../../middleware/errorHandler.js';
import { checkEmployeeLifecycleStatus } from '../../services/hr/hrm.employee.js';
import {
    buildPagination,
    extractUser,
    getRequestId,
    sendCreated,
    sendSuccess
} from '../../utils/apiResponse.js';
import { sendEmployeeCredentialsEmail } from '../../utils/emailer.js';
import { broadcastEmployeeEvents, getSocketIO } from '../../utils/socketBroadcaster.js';

/**
 * Generate secure random password for new employees
 */
function generateSecurePassword(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (v) => chars[v % chars.length]).join('');
}

/**
 * Normalize status to ensure correct case
 */
const normalizeStatus = (status) => {
  if (!status) return 'Active';
  const normalized = status.toLowerCase();
  if (normalized === 'active') return 'Active';
  if (normalized === 'inactive') return 'Inactive';
  if (normalized === 'on notice') return 'On Notice';
  if (normalized === 'resigned') return 'Resigned';
  if (normalized === 'terminated') return 'Terminated';
  if (normalized === 'on leave') return 'On Leave';
  return 'Active';
};

/**
 * @desc    Get all employees with pagination and filtering
 * @route   GET /api/employees
 * @access  Private (Admin, HR, Superadmin)
 */
export const getEmployees = asyncHandler(async (req, res) => {
  // Use validated query if available, otherwise use original query (for non-validated routes)
  const query = req.validatedQuery || req.query;
  const { page, limit, search, department, designation, status, sortBy, order } = query;
  const user = extractUser(req);

  console.log('[Employee Controller] getEmployees - companyId:', user.companyId, 'filters:', { page, limit, search, department, designation, status });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build filter - always exclude soft-deleted records
  let filter = { isDeleted: { $ne: true } };

  // Apply status filter
  if (status) {
    filter.status = status;
  }

  // Apply department filter
  if (department) {
    filter.departmentId = department;
  }

  // Apply designation filter
  if (designation) {
    filter.designationId = designation;
  }

  // Apply search filter
  if (search && search.trim()) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { fullName: { $regex: search, $options: 'i' } },
      { 'contact.email': { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } }
    ];
  }

  console.log('[Employee Controller] MongoDB filter:', filter);

  // Get total count
  const total = await collections.employees.countDocuments(filter);

  // Build sort option
  const sortObj = {};
  if (sortBy) {
    sortObj[sortBy] = order === 'asc' ? 1 : -1;
  } else {
    sortObj.createdAt = -1;
  }

  // Get paginated results with aggregation for department/designation lookup
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;
  const skip = (pageNum - 1) * limitNum;

  const pipeline = [
    { $match: filter },
    {
      $addFields: {
        departmentObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$departmentId', null] }, { $ne: ['$departmentId', ''] }] },
            then: { $toObjectId: '$departmentId' },
            else: null
          }
        },
        designationObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$designationId', null] }, { $ne: ['$designationId', ''] }] },
            then: { $toObjectId: '$designationId' },
            else: null
          }
        }
      }
    },
    {
      $lookup: {
        from: 'departments',
        localField: 'departmentObjId',
        foreignField: '_id',
        as: 'departmentInfo'
      }
    },
    {
      $lookup: {
        from: 'designations',
        localField: 'designationObjId',
        foreignField: '_id',
        as: 'designationInfo'
      }
    },
    {
      $addFields: {
        department: { $arrayElemAt: ['$departmentInfo', 0] },
        designation: { $arrayElemAt: ['$designationInfo', 0] }
      }
    },
    {
      $project: {
        departmentObjId: 0,
        designationObjId: 0,
        departmentInfo: 0,
        designationInfo: 0,
        salary: 0,
        bank: 0,
        emergencyContacts: 0,
        'account.password': 0
      }
    },
    { $sort: sortObj },
    { $skip: skip },
    { $limit: limitNum }
  ];

  const employees = await collections.employees.aggregate(pipeline).toArray();

  // Build pagination metadata
  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, employees, 'Employees retrieved successfully', 200, pagination);
});

/**
 * @desc    Check employee lifecycle status (resignation/termination)
 * @route   POST /api/employees/check-lifecycle-status
 * @access  Private (Admin, HR, Superadmin)
 */
export const checkLifecycleStatus = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { employeeId } = req.body || {};

  if (!employeeId || typeof employeeId !== 'string') {
    throw buildValidationError('employeeId', 'Employee ID is required');
  }

  const result = await checkEmployeeLifecycleStatus(user.companyId, employeeId);

  return sendSuccess(res, result, 'Lifecycle status retrieved successfully');
});

/**
 * @desc    Get single employee by ID
 * @route   GET /api/employees/:id
 * @access  Private (All roles can view their own profile)
 */
export const getEmployeeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  console.log('[Employee Controller] getEmployeeById - id:', id, 'companyId:', user.companyId);

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID format');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find employee with aggregation for lookups
  const pipeline = [
    { $match: { _id: new ObjectId(id) } },
    {
      $addFields: {
        departmentObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$departmentId', null] }, { $ne: ['$departmentId', ''] }] },
            then: { $toObjectId: '$departmentId' },
            else: null
          }
        },
        designationObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$designationId', null] }, { $ne: ['$designationId', ''] }] },
            then: { $toObjectId: '$designationId' },
            else: null
          }
        },
        reportingToObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$reportingTo', null] }, { $ne: ['$reportingTo', ''] }] },
            then: { $toObjectId: '$reportingTo' },
            else: null
          }
        }
      }
    },
    {
      $lookup: {
        from: 'departments',
        localField: 'departmentObjId',
        foreignField: '_id',
        as: 'departmentInfo'
      }
    },
    {
      $lookup: {
        from: 'designations',
        localField: 'designationObjId',
        foreignField: '_id',
        as: 'designationInfo'
      }
    },
    {
      $lookup: {
        from: 'employees',
        let: { reportingToObjId: '$reportingToObjId' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$_id', '$$reportingToObjId'] },
              isDeleted: { $ne: true }  // Exclude deleted managers
            }
          }
        ],
        as: 'reportingToInfo'
      }
    },
    {
      $addFields: {
        department: { $arrayElemAt: ['$departmentInfo', 0] },
        designation: { $arrayElemAt: ['$designationInfo', 0] },
        reportingTo: { $arrayElemAt: ['$reportingToInfo', 0] }
      }
    },
    {
      $project: {
        departmentObjId: 0,
        designationObjId: 0,
        reportingToObjId: 0,
        departmentInfo: 0,
        designationInfo: 0,
        reportingToInfo: 0
      }
    }
  ];

  const results = await collections.employees.aggregate(pipeline).toArray();
  const employee = results[0];

  if (!employee) {
    throw buildNotFoundError('Employee', id);
  }

  // Remove sensitive fields for non-admin users
  if (user.role !== 'admin' && user.role !== 'hr' && user.role !== 'superadmin') {
    const { salary, bank, emergencyContacts, ...sanitizedEmployee } = employee;
    return sendSuccess(res, sanitizedEmployee);
  }

  return sendSuccess(res, employee);
});

/**
 * @desc    Create new employee
 * @route   POST /api/employees
 * @access  Private (Admin, HR, Superadmin)
 */
export const createEmployee = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const employeeData = req.body;

  console.log('[Employee Controller] createEmployee - companyId:', user.companyId);
  console.log('[Employee Controller] employeeData:', JSON.stringify(employeeData, null, 2));

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Extract permissions data if present
  const { permissionsData, ...restEmployeeData } = employeeData;

  // Normalize data - handle both flat and nested structures from frontend
  const normalizedData = {
    ...restEmployeeData,
    // Extract email from either root level or contact object
    email: restEmployeeData.email || restEmployeeData.contact?.email,
    // Extract phone from either root level or contact object
    phone: restEmployeeData.phone || restEmployeeData.contact?.phone,
    // Build contact object if not provided
    contact: restEmployeeData.contact || {
      email: restEmployeeData.email,
      phone: restEmployeeData.phone || '',
    },
    // Handle nested personal structure
    dateOfBirth: restEmployeeData.dateOfBirth || restEmployeeData.personal?.birthday,
    gender: restEmployeeData.gender || restEmployeeData.personal?.gender,
    address: restEmployeeData.address || restEmployeeData.personal?.address,
  };

  // Check if email already exists
  const existingEmployee = await collections.employees.findOne({
    'contact.email': normalizedData.email
  });

  if (existingEmployee) {
    throw buildConflictError('Employee', `email: ${normalizedData.email}`);
  }

  // Check if employee code already exists (if provided)
  if (normalizedData.employeeId) {
    const existingCode = await collections.employees.findOne({
      employeeId: normalizedData.employeeId
    });

    if (existingCode) {
      throw buildConflictError('Employee', `employee code: ${normalizedData.employeeId}`);
    }
  }

  // Generate secure password
  const password = generateSecurePassword(12);
  console.log('[Employee Controller] Generated password for employee');

  // Determine role for Clerk
  let clerkRole = 'employee';
  if (normalizedData.account?.role === 'HR' || normalizedData.account?.role === 'hr') {
    clerkRole = 'hr';
  } else if (normalizedData.account?.role === 'Admin' || normalizedData.account?.role === 'admin') {
    clerkRole = 'admin';
  }

  // Generate username from email if not provided
  const username = normalizedData.account?.userName || normalizedData.email.split('@')[0];

  // Create Clerk user
  let clerkUserId;
  try {
    console.log('[Employee Controller] Creating Clerk user with username:', username);
    const createdUser = await clerkClient.users.createUser({
      emailAddress: [normalizedData.email],
      username: username,
      password: password,
      publicMetadata: {
        role: clerkRole,
        companyId: user.companyId,
      },
    });
    clerkUserId = createdUser.id;
    console.log('[Employee Controller] Clerk user created:', clerkUserId);
  } catch (clerkError) {
    console.error('[Employee Controller] Failed to create Clerk user:', clerkError);
    console.error('[Employee Controller] Clerk error details:', {
      code: clerkError.code,
      message: clerkError.message,
      errors: clerkError.errors,
      clerkTraceId: clerkError.clerkTraceId
    });

    // Parse Clerk errors and return field-specific errors
    if (clerkError.errors && Array.isArray(clerkError.errors)) {
      for (const error of clerkError.errors) {
        console.error('[Employee Controller] Clerk error code:', error.code, 'message:', error.message);

        // Username already taken
        if (error.code === 'form_identifier_exists' || error.code === 'username_taken') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'USERNAME_TAKEN',
              message: 'Username is already taken. Please choose another.',
              field: 'userName',
              details: error.message,
              requestId: getRequestId(req)
            }
          });
        }

        // Email already exists in Clerk
        if (error.code === 'form_identifier_exists' && error.message.toLowerCase().includes('email')) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'EMAIL_EXISTS_IN_CLERK',
              message: 'This email is already registered in the system.',
              field: 'email',
              details: error.message,
              requestId: getRequestId(req)
            }
          });
        }

        // Password validation errors
        if (error.code === 'form_password_pwned' || error.code === 'password_too_weak') {
          return res.status(400).json({
            success: false,
            error: {
              code: 'PASSWORD_TOO_WEAK',
              message: 'Password is too weak or has been compromised. Please use a stronger password.',
              field: 'password',
              details: error.message,
              requestId: getRequestId(req)
            }
          });
        }
      }
    }

    // Generic Clerk error
    return res.status(500).json({
      success: false,
      error: {
        code: 'CLERK_USER_CREATION_FAILED',
        message: 'Failed to create user account. Please try again.',
        details: clerkError.message,
        requestId: getRequestId(req),
        clerkTraceId: clerkError.clerkTraceId
      }
    });
  }

  // Add audit fields and clerkUserId
  const employeeToInsert = {
    ...normalizedData,
    clerkUserId: clerkUserId,
    account: {
      ...normalizedData.account,
      password: password, // Store password (for reference)
      role: normalizedData.account?.role || 'Employee',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: user.userId,
    updatedBy: user.userId,
    status: normalizeStatus(normalizedData.status || 'Active')
  };

  // Create employee
  const result = await collections.employees.insertOne(employeeToInsert);

  if (!result.insertedId) {
    // Rollback: Delete Clerk user if database insert fails
    try {
      await clerkClient.users.deleteUser(clerkUserId);
      console.log('[Employee Controller] Rolled back Clerk user creation');
    } catch (rollbackError) {
      console.error('[Employee Controller] Failed to rollback Clerk user:', rollbackError);
    }
    throw new Error('Failed to create employee');
  }

  // Create permissions record if provided
  if (permissionsData && (permissionsData.permissions || permissionsData.enabledModules)) {
    try {
      await collections.permissions.insertOne({
        employeeId: result.insertedId,
        enabledModules: permissionsData.enabledModules || {},
        permissions: permissionsData.permissions || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log('[Employee Controller] Permissions created for employee');
    } catch (permError) {
      console.error('[Employee Controller] Failed to create permissions:', permError);
      // Continue anyway - permissions can be added later
    }
  }

  // Get the created employee
  const employee = await collections.employees.findOne({ _id: result.insertedId });

  // Send email with credentials
  try {
    const loginLink = process.env.DOMAIN
      ? `https://${process.env.DOMAIN}/login`
      : 'http://localhost:3000/login';

    await sendEmployeeCredentialsEmail({
      to: normalizedData.email,
      password: password,
      userName: username,
      loginLink: loginLink,
      firstName: normalizedData.firstName,
      lastName: normalizedData.lastName,
      companyName: normalizedData.companyName || 'Your Company',
    });
    console.log('[Employee Controller] Credentials email sent to:', normalizedData.email);
  } catch (emailError) {
    console.error('[Employee Controller] Failed to send email:', emailError);
    // Continue anyway - employee is created
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastEmployeeEvents.created(io, user.companyId, employee);
  }

  return sendCreated(res, employee, 'Employee created successfully. Credentials email sent.');
});

/**
 * @desc    Update employee
 * @route   PUT /api/employees/:id
 * @access  Private (Admin, HR, Superadmin)
 */
export const updateEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const updateData = req.body;

  console.log('[Employee Controller] updateEmployee - id:', id, 'companyId:', user.companyId);

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID format');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find employee
  const employee = await collections.employees.findOne({ _id: new ObjectId(id) });

  if (!employee) {
    throw buildNotFoundError('Employee', id);
  }

  // Check email uniqueness if email is being updated
  if (updateData.contact?.email && updateData.contact.email !== employee.contact?.email) {
    const existingEmployee = await collections.employees.findOne({
      'contact.email': updateData.contact.email,
      _id: { $ne: new ObjectId(id) }
    });

    if (existingEmployee) {
      throw buildConflictError('Employee', `email: ${updateData.contact.email}`);
    }
  }

  // Check employee code uniqueness if being updated
  if (updateData.employeeId && updateData.employeeId !== employee.employeeId) {
    const existingCode = await collections.employees.findOne({
      employeeId: updateData.employeeId,
      _id: { $ne: new ObjectId(id) }
    });

    if (existingCode) {
      throw buildConflictError('Employee', `employee code: ${updateData.employeeId}`);
    }
  }

  // Update audit fields
  updateData.updatedAt = new Date();
  updateData.updatedBy = user.userId;

  // Update employee
  const result = await collections.employees.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Employee', id);
  }

  // Get updated employee
  const updatedEmployee = await collections.employees.findOne({ _id: new ObjectId(id) });

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastEmployeeEvents.updated(io, user.companyId, updatedEmployee);
  }

  return sendSuccess(res, updatedEmployee, 'Employee updated successfully');
});

/**
 * @desc    Delete employee (soft delete)
 * @route   DELETE /api/employees/:id
 * @access  Private (Admin, Superadmin only)
 */
export const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  console.log('[Employee Controller] deleteEmployee - id:', id, 'companyId:', user.companyId);

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID format');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find employee
  const employee = await collections.employees.findOne({ _id: new ObjectId(id) });

  if (!employee) {
    throw buildNotFoundError('Employee', id);
  }

  // Soft delete - set isDeleted flag
  const result = await collections.employees.updateOne(
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
    throw buildNotFoundError('Employee', id);
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastEmployeeEvents.deleted(io, user.companyId, employee.employeeId, user.userId);
  }

  return sendSuccess(res, {
    _id: employee._id,
    employeeId: employee.employeeId,
    isDeleted: true,
    deletedAt: new Date()
  }, 'Employee deleted successfully');
});

/**
 * @desc    Reassign employee-owned records and delete employee (soft delete)
 * @route   POST /api/employees/:id/reassign-delete
 * @access  Private (Admin, Superadmin only)
 */
export const reassignAndDeleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reassignTo } = req.body;
  const user = extractUser(req);

  console.log('[Employee Controller] reassignAndDeleteEmployee - id:', id, 'reassignTo:', reassignTo, 'companyId:', user.companyId);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID format');
  }

  if (!ObjectId.isValid(reassignTo)) {
    throw buildValidationError('reassignTo', 'Invalid reassignment employee ID format');
  }

  if (id === reassignTo) {
    throw buildValidationError('reassignTo', 'Reassignment employee must be different from the employee being deleted');
  }

  const collections = getTenantCollections(user.companyId);
  const oldEmployeeId = new ObjectId(id);
  const newEmployeeId = new ObjectId(reassignTo);

  const employee = await collections.employees.findOne({ _id: oldEmployeeId });
  if (!employee) {
    throw buildNotFoundError('Employee', id);
  }

  const reassignee = await collections.employees.findOne({ _id: newEmployeeId, isDeleted: { $ne: true } });
  if (!reassignee) {
    throw buildValidationError('reassignTo', 'Reassignment employee not found or inactive');
  }

  // Validate same department and designation
  if (reassignee.departmentId?.toString() !== employee.departmentId?.toString()) {
    throw buildValidationError('reassignTo', 'Reassignment employee must be from the same department');
  }

  if (reassignee.designationId?.toString() !== employee.designationId?.toString()) {
    throw buildValidationError('reassignTo', 'Reassignment employee must have the same designation');
  }

  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      // Tasks: reassign assignee array entries
      await collections.tasks.updateMany(
        { assignee: oldEmployeeId },
        { $set: { 'assignee.$[elem]': newEmployeeId } },
        { arrayFilters: [{ elem: oldEmployeeId }], session }
      );

      // Projects: reassign team members, leaders, managers
      await collections.projects.updateMany(
        { teamMembers: oldEmployeeId },
        { $set: { 'teamMembers.$[elem]': newEmployeeId } },
        { arrayFilters: [{ elem: oldEmployeeId }], session }
      );
      await collections.projects.updateMany(
        { teamLeader: oldEmployeeId },
        { $set: { 'teamLeader.$[elem]': newEmployeeId } },
        { arrayFilters: [{ elem: oldEmployeeId }], session }
      );
      await collections.projects.updateMany(
        { projectManager: oldEmployeeId },
        { $set: { 'projectManager.$[elem]': newEmployeeId } },
        { arrayFilters: [{ elem: oldEmployeeId }], session }
      );

      // Tickets: reassign assignedTo with full reassignee details
      const reassignedToPayload = {
        _id: newEmployeeId,
        firstName: reassignee.firstName || '',
        lastName: reassignee.lastName || '',
        avatar: reassignee.avatar || reassignee.avatarUrl || 'assets/img/profiles/avatar-01.jpg',
        email: reassignee.contact?.email || reassignee.email || '',
        role: reassignee.role || 'IT Support Specialist'
      };

      await collections.tickets.updateMany(
        { 'assignedTo._id': oldEmployeeId },
        { $set: { assignedTo: reassignedToPayload } },
        { session }
      );

      // Leads: reassign owner/assignee
      await collections.leads.updateMany(
        { owner: oldEmployeeId },
        { $set: { owner: newEmployeeId } },
        { session }
      );
      await collections.leads.updateMany(
        { assignee: oldEmployeeId },
        { $set: { assignee: newEmployeeId } },
        { session }
      );

      // Soft delete employee
      const deleteResult = await collections.employees.updateOne(
        { _id: oldEmployeeId },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: user.userId,
            updatedAt: new Date()
          }
        },
        { session }
      );

      if (deleteResult.matchedCount === 0) {
        throw new Error('Employee delete failed');
      }
    });
  } finally {
    await session.endSession();
  }

  const io = getSocketIO(req);
  if (io) {
    broadcastEmployeeEvents.deleted(io, user.companyId, employee.employeeId, user.userId);
  }

  return sendSuccess(res, {
    _id: employee._id,
    employeeId: employee.employeeId,
    isDeleted: true,
    deletedAt: new Date(),
    reassignedTo: reassignTo
  }, 'Employee reassigned and deleted successfully');
});

/**
 * @desc    Get employee profile (current user)
 * @route   GET /api/employees/me
 * @access  Private (All authenticated users)
 */
export const getMyProfile = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  console.log('[Employee Controller] getMyProfile - userId:', user.userId, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find employee by clerk user ID (stored in clerkUserId field)
  const employee = await collections.employees.findOne({
    clerkUserId: user.userId
  });

  if (!employee) {
    throw buildNotFoundError('Employee profile');
  }

  // Remove sensitive fields
  const { salary, bank, emergencyContacts, ...sanitizedEmployee } = employee;

  return sendSuccess(res, sanitizedEmployee);
});

/**
 * @desc    Update my profile
 * @route   PUT /api/employees/me
 * @access  Private (All authenticated users)
 */
export const updateMyProfile = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const updateData = req.body;

  console.log('[Employee Controller] updateMyProfile - userId:', user.userId, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find employee by clerk user ID (stored in clerkUserId field)
  const employee = await collections.employees.findOne({
    clerkUserId: user.userId
  });

  if (!employee) {
    throw buildNotFoundError('Employee profile');
  }

  // Restrict what fields can be updated by users themselves
  const allowedFields = [
    'phone',
    'dateOfBirth',
    'gender',
    'address',
    'emergencyContact',
    'socialProfiles',
    'profileImage'
  ];

  const sanitizedUpdate = {};
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      sanitizedUpdate[field] = updateData[field];
    }
  });

  // Update audit fields
  sanitizedUpdate.updatedAt = new Date();
  sanitizedUpdate.updatedBy = user.userId;

  // Update employee
  const result = await collections.employees.updateOne(
    { _id: employee._id },
    { $set: sanitizedUpdate }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Employee profile');
  }

  // Get updated employee
  const updatedEmployee = await collections.employees.findOne({ _id: employee._id });

  return sendSuccess(res, updatedEmployee, 'Profile updated successfully');
});

/**
 * @desc    Get employee reportees (subordinates)
 * @route   GET /api/employees/:id/reportees
 * @access  Private (Admin, HR, Superadmin, or the manager themselves)
 */
export const getEmployeeReportees = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  console.log('[Employee Controller] getEmployeeReportees - id:', id, 'companyId:', user.companyId);

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID format');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find employee
  const employee = await collections.employees.findOne({ _id: new ObjectId(id) });

  if (!employee) {
    throw buildNotFoundError('Employee', id);
  }

  // Get all reportees (excluding deleted records)
  const reportees = await collections.employees.find({
    reportingTo: id,
    isDeleted: { $ne: true },  // Exclude soft-deleted records
    status: 'Active'
  }).toArray();

  return sendSuccess(res, reportees, 'Reportees retrieved successfully');
});

/**
 * @desc    Get employee count by department
 * @route   GET /api/employees/stats/by-department
 * @access  Private (Admin, HR, Superadmin)
 */
export const getEmployeeStatsByDepartment = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  console.log('[Employee Controller] getEmployeeStatsByDepartment - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const stats = await collections.employees.aggregate([
    {
      $match: {
        isDeleted: { $ne: true },  // Exclude soft-deleted records
        status: 'Active'
      }
    },
    {
      $addFields: {
        departmentObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$departmentId', null] }, { $ne: ['$departmentId', ''] }] },
            then: { $toObjectId: '$departmentId' },
            else: null
          }
        }
      }
    },
    {
      $lookup: {
        from: 'departments',
        localField: 'departmentObjId',
        foreignField: '_id',
        as: 'departmentInfo'
      }
    },
    {
      $unwind: {
        path: '$departmentInfo',
        preserveNullAndEmptyArrays: true
      }
    },
    {
      $group: {
        _id: '$departmentId',
        departmentName: { $first: '$departmentInfo.department' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]).toArray();

  return sendSuccess(res, stats, 'Employee statistics by department retrieved successfully');
});

/**
 * @desc    Search employees
 * @route   GET /api/employees/search
 * @access  Private (Admin, HR, Superadmin)
 */
export const searchEmployees = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const user = extractUser(req);

  console.log('[Employee Controller] searchEmployees - query:', q, 'companyId:', user.companyId);

  if (!q || q.trim().length < 2) {
    throw buildValidationError('q', 'Search query must be at least 2 characters');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const employees = await collections.employees.find({
    isDeleted: { $ne: true },  // Exclude soft-deleted records
    status: 'Active',
    $or: [
      { firstName: { $regex: q, $options: 'i' } },
      { lastName: { $regex: q, $options: 'i' } },
      { fullName: { $regex: q, $options: 'i' } },
      { 'contact.email': { $regex: q, $options: 'i' } },
      { employeeId: { $regex: q, $options: 'i' } }
    ]
  })
    .limit(20)
    .project({
      salary: 0,
      bank: 0,
      emergencyContacts: 0,
      'account.password': 0
    })
    .toArray();

  return sendSuccess(res, employees, 'Search results retrieved successfully');
});

/**
 * @desc    Check for duplicate email and phone
 * @route   POST /api/employees/check-duplicates
 * @access  Private (Admin, HR, Superadmin)
 */
export const checkDuplicates = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { email, phone, userName } = req.body;

  console.log('[Employee Controller] checkDuplicates - email:', email, 'phone:', phone, 'userName:', userName, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Check for duplicate email
  if (email) {
    const emailExists = await collections.employees.countDocuments({
      'contact.email': email,
      isDeleted: { $ne: true }  // Exclude soft-deleted records
    });

    if (emailExists > 0) {
      console.log('[Employee Controller] checkDuplicates - email already exists');
      return res.status(409).json({
        done: false,
        error: 'Email already registered',
        field: 'email',
        message: 'This email is already registered in the system'
      });
    }
  }

  // Check for duplicate phone if provided
  if (phone) {
    const phoneExists = await collections.employees.countDocuments({
      'contact.phone': phone,
      isDeleted: { $ne: true }  // Exclude soft-deleted records
    });

    if (phoneExists > 0) {
      console.log('[Employee Controller] checkDuplicates - phone already exists');
      return res.status(409).json({
        done: false,
        error: 'Phone number already registered',
        field: 'phone',
        message: 'This phone number is already registered in the system'
      });
    }
  }

  // Check for duplicate username in Clerk
  if (userName) {
    try {
      console.log('[Employee Controller] checkDuplicates - checking Clerk username:', userName);
      const existingUsers = await clerkClient.users.getUserList({
        username: [userName]
      });

      if (existingUsers && existingUsers.data && existingUsers.data.length > 0) {
        console.log('[Employee Controller] checkDuplicates - username already exists in Clerk');
        return res.status(409).json({
          done: false,
          error: 'Username is already taken',
          field: 'userName',
          message: 'This username is already taken. Please choose another.'
        });
      }
    } catch (clerkError) {
      // Log but don't fail - Clerk check is optional
      console.error('[Employee Controller] checkDuplicates - Clerk username check failed:', clerkError.message);
    }
  }

  return sendSuccess(res, { done: true }, 'No duplicates found');
});

/**
 * @desc    Bulk upload employees
 * @route   POST /api/employees/bulk-upload
 * @access  Private (Admin, HR, Superadmin)
 */
export const bulkUploadEmployees = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { employees } = req.body;

  console.log('[Employee Controller] bulkUploadEmployees - count:', employees?.length, 'companyId:', user.companyId);

  if (!employees || !Array.isArray(employees) || employees.length === 0) {
    throw buildValidationError('employees', 'At least one employee is required');
  }

  if (employees.length > 100) {
    throw buildValidationError('employees', 'Maximum 100 employees can be uploaded at once');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const results = {
    success: [],
    failed: [],
    duplicate: []
  };

  const loginLink = process.env.DOMAIN
    ? `https://${process.env.DOMAIN}/login`
    : 'http://localhost:3000/login';

  for (const empData of employees) {
    try {
      // Normalize email from contact or root level
      const email = empData.email || empData.contact?.email;

      if (!email) {
        results.failed.push({
          email: 'N/A',
          reason: 'Email is required'
        });
        continue;
      }

      // Check for duplicate email
      const existing = await collections.employees.findOne({
        'contact.email': email
      });

      if (existing) {
        results.duplicate.push({
          email: email,
          reason: 'Email already exists'
        });
        continue;
      }

      // Generate secure password
      const password = generateSecurePassword(12);

      // Determine role for Clerk
      let clerkRole = 'employee';
      const role = empData.account?.role || empData.role || 'Employee';
      if (role.toLowerCase() === 'hr') {
        clerkRole = 'hr';
      } else if (role.toLowerCase() === 'admin') {
        clerkRole = 'admin';
      }

      // Generate username from email if not provided
      const username = empData.account?.userName || empData.userName || email.split('@')[0];

      // Create Clerk user
      let clerkUserId;
      try {
        const createdUser = await clerkClient.users.createUser({
          emailAddress: [email],
          username: username,
          password: password,
          publicMetadata: {
            role: clerkRole,
            companyId: user.companyId,
          },
        });
        clerkUserId = createdUser.id;
        console.log('[Employee Controller] Bulk upload - Clerk user created for:', email);
      } catch (clerkError) {
        console.error('[Employee Controller] Bulk upload - Failed to create Clerk user for:', email, clerkError);
        results.failed.push({
          email: email,
          reason: `Clerk user creation failed: ${clerkError.message}`
        });
        continue;
      }

      // Normalize contact object
      const contact = empData.contact || {
        email: email,
        phone: empData.phone || '',
      };

      // Create employee
      const employeeToInsert = {
        ...empData,
        clerkUserId: clerkUserId,
        email: email,
        contact: contact,
        account: {
          ...empData.account,
          password: password,
          role: role,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.userId,
        updatedBy: user.userId,
        status: normalizeStatus(empData.status || 'Active')
      };

      const result = await collections.employees.insertOne(employeeToInsert);

      // Send email with credentials (non-blocking)
      sendEmployeeCredentialsEmail({
        to: email,
        password: password,
        userName: username,
        loginLink: loginLink,
        firstName: empData.firstName,
        lastName: empData.lastName,
        companyName: empData.companyName || 'Your Company',
      }).catch(emailError => {
        console.error('[Employee Controller] Bulk upload - Failed to send email to:', email, emailError);
      });

      results.success.push({
        _id: result.insertedId,
        email: email,
        name: `${empData.firstName} ${empData.lastName}`,
        passwordSent: true
      });
    } catch (error) {
      results.failed.push({
        email: empData.email || empData.contact?.email || 'N/A',
        reason: error.message
      });
    }
  }

  return sendSuccess(res, results, `Bulk upload completed: ${results.success.length} created, ${results.duplicate.length} duplicates, ${results.failed.length} failed`);
});

export default {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  reassignAndDeleteEmployee,
  deleteEmployee,
  getMyProfile,
  updateMyProfile,
  getEmployeeReportees,
  getEmployeeStatsByDepartment,
  searchEmployees,
  checkDuplicates,
  bulkUploadEmployees
};
