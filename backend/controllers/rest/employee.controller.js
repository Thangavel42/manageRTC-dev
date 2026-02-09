/**
 * Employee REST Controller
 * Handles all Employee CRUD operations via REST API
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import { clerkClient } from '@clerk/clerk-sdk-node';
import { ObjectId } from 'mongodb';
import { client, getTenantCollections } from '../../config/db.js';
import { deleteUploadedFile, getPublicUrl } from '../../config/multer.config.js';
import {
    asyncHandler,
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
import {
    canUserDeleteAvatar,
    getSystemDefaultAvatarUrl
} from '../../utils/avatarUtils.js';
import { formatDDMMYYYY, isValidDDMMYYYY, parseDDMMYYYY } from '../../utils/dateFormat.js';
import { sendEmployeeCredentialsEmail } from '../../utils/emailer.js';
import { devError, devLog } from '../../utils/logger.js';
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

const parseDateField = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' && !isValidDDMMYYYY(value)) {
    throw buildValidationError(fieldName, 'Date must be in DD-MM-YYYY format');
  }
  const parsed = parseDDMMYYYY(value);
  if (!parsed) {
    throw buildValidationError(fieldName, 'Date must be in DD-MM-YYYY format');
  }
  return parsed;
};

const normalizeEmployeeDates = (data) => {
  if (!data || typeof data !== 'object') return data;

  const normalized = { ...data };

  if ('dateOfBirth' in normalized) {
    normalized.dateOfBirth = parseDateField(normalized.dateOfBirth, 'dateOfBirth');
  }
  if ('dateOfJoining' in normalized) {
    normalized.dateOfJoining = parseDateField(normalized.dateOfJoining, 'dateOfJoining');
  }
  if ('joiningDate' in normalized) {
    normalized.joiningDate = parseDateField(normalized.joiningDate, 'joiningDate');
  }

  // Handle personal object (canonical fields only)
  if (normalized.personal && typeof normalized.personal === 'object') {
    normalized.personal = { ...normalized.personal };
    if (normalized.personal.passport && typeof normalized.personal.passport === 'object') {
      normalized.personal.passport = { ...normalized.personal.passport };
      if ('issueDate' in normalized.personal.passport) {
        normalized.personal.passport.issueDate = parseDateField(
          normalized.personal.passport.issueDate,
          'personal.passport.issueDate'
        );
      }
      if ('expiryDate' in normalized.personal.passport) {
        normalized.personal.passport.expiryDate = parseDateField(
          normalized.personal.passport.expiryDate,
          'personal.passport.expiryDate'
        );
      }
    }
  }

  if (Array.isArray(normalized.education)) {
    normalized.education = normalized.education.map((entry, index) => ({
      ...entry,
      startDate: parseDateField(entry?.startDate, `education.${index}.startDate`),
      endDate: parseDateField(entry?.endDate, `education.${index}.endDate`)
    }));
  }

  if (Array.isArray(normalized.experience)) {
    normalized.experience = normalized.experience.map((entry, index) => ({
      ...entry,
      startDate: parseDateField(entry?.startDate, `experience.${index}.startDate`),
      endDate: parseDateField(entry?.endDate, `experience.${index}.endDate`)
    }));
  }

  return normalized;
};

const ensureEmployeeDateLogic = (data, existingEmployee = null) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Use canonical dateOfBirth field (at root level)
  const dob =
    data?.dateOfBirth ||
    existingEmployee?.dateOfBirth ||
    null;

  if (dob instanceof Date && dob > todayStart) {
    throw buildValidationError('dateOfBirth', 'Date of birth cannot be in the future');
  }

  const joining =
    data?.dateOfJoining ||
    data?.joiningDate ||
    existingEmployee?.dateOfJoining ||
    existingEmployee?.joiningDate ||
    null;

  if (dob instanceof Date && joining instanceof Date && joining < dob) {
    throw buildValidationError('dateOfJoining', 'Joining date must be on or after date of birth');
  }
};

const formatEmployeeDates = (employee) => {
  if (!employee) return employee;
  const formatted = { ...employee };

  // Format canonical root level date fields
  formatted.dateOfBirth = formatDDMMYYYY(formatted.dateOfBirth);
  formatted.dateOfJoining = formatDDMMYYYY(formatted.dateOfJoining);
  formatted.joiningDate = formatDDMMYYYY(formatted.joiningDate);

  // Format personal object dates (canonical fields only: passport)
  if (formatted.personal && typeof formatted.personal === 'object') {
    formatted.personal = { ...formatted.personal };
    if (formatted.personal.passport && typeof formatted.personal.passport === 'object') {
      formatted.personal.passport = { ...formatted.personal.passport };
      formatted.personal.passport.issueDate = formatDDMMYYYY(formatted.personal.passport.issueDate);
      formatted.personal.passport.expiryDate = formatDDMMYYYY(formatted.personal.passport.expiryDate);
    }
  }

  if (Array.isArray(formatted.education)) {
    formatted.education = formatted.education.map((entry) => ({
      ...entry,
      startDate: formatDDMMYYYY(entry?.startDate),
      endDate: formatDDMMYYYY(entry?.endDate)
    }));
  }

  if (Array.isArray(formatted.experience)) {
    formatted.experience = formatted.experience.map((entry) => ({
      ...entry,
      startDate: formatDDMMYYYY(entry?.startDate),
      endDate: formatDDMMYYYY(entry?.endDate)
    }));
  }

  return formatted;
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

  devLog('[Employee Controller] getEmployees - companyId:', user.companyId, 'filters:', { page, limit, search, department, designation, status });

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

  devLog('[Employee Controller] MongoDB filter:', filter);

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
        },
        reportingToObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$reportingTo', null] }, { $ne: ['$reportingTo', ''] }] },
            then: { $toObjectId: '$reportingTo' },
            else: null
          }
        },
        shiftObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$shiftId', null] }, { $ne: ['$shiftId', ''] }] },
            then: { $toObjectId: '$shiftId' },
            else: null
          }
        },
        batchObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$batchId', null] }, { $ne: ['$batchId', ''] }] },
            then: { $toObjectId: '$batchId' },
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
              isDeleted: { $ne: true }
            }
          }
        ],
        as: 'reportingToInfo'
      }
    },
    {
      $lookup: {
        from: 'shifts',
        localField: 'shiftObjId',
        foreignField: '_id',
        as: 'shiftInfo'
      }
    },
    {
      $lookup: {
        from: 'batches',
        localField: 'batchObjId',
        foreignField: '_id',
        as: 'batchInfo'
      }
    },
    {
      $addFields: {
        department: { $arrayElemAt: ['$departmentInfo', 0] },
        designation: { $arrayElemAt: ['$designationInfo', 0] },
        reportingToManager: { $arrayElemAt: ['$reportingToInfo', 0] },
        shiftData: { $arrayElemAt: ['$shiftInfo', 0] },
        batchData: { $arrayElemAt: ['$batchInfo', 0] },
        // Assign default avatar for employees without profile image
        profileImage: {
          $cond: {
            if: { $and: [{ $ne: ['$profileImage', null] }, { $ne: ['$profileImage', ''] }] },
            then: '$profileImage',
            else: getSystemDefaultAvatarUrl()
          }
        },
        // Add avatarUrl field for frontend compatibility (same as profileImage)
        avatarUrl: {
          $cond: {
            if: { $and: [{ $ne: ['$profileImage', null] }, { $ne: ['$profileImage', ''] }] },
            then: '$profileImage',
            else: getSystemDefaultAvatarUrl()
          }
        }
      }
    },
    {
      $addFields: {
        // Reporting Manager Name from populated manager
        reportingManagerName: {
          $cond: {
            if: { $ne: ['$reportingToManager', null] },
            then: {
              $concat: [
                { $ifNull: ['$reportingToManager.firstName', ''] },
                ' ',
                { $ifNull: ['$reportingToManager.lastName', ''] }
              ]
            },
            else: null
          }
        },
        // Shift information from populated shift
        shiftName: { $ifNull: ['$shiftData.name', null] },
        shiftColor: { $ifNull: ['$shiftData.color', null] },
        shiftTiming: {
          $cond: {
            if: { $and: [{ $ne: ['$shiftData', null] }, { $ne: ['$shiftData.startTime', null] }, { $ne: ['$shiftData.endTime', null] }] },
            then: {
              $concat: [
                { $ifNull: ['$shiftData.startTime', ''] },
                ' - ',
                { $ifNull: ['$shiftData.endTime', ''] }
              ]
            },
            else: null
          }
        },
        // Batch information from populated batch
        batchName: { $ifNull: ['$batchData.name', null] },
        batchShiftName: { $ifNull: ['$batchData.currentShiftName', null] },
        batchShiftTiming: { $ifNull: ['$batchData.currentShiftTiming', null] },
        batchShiftColor: { $ifNull: ['$batchData.currentShiftColor', null] },
        // Flatten personal info to root level for frontend compatibility
        passport: '$personal.passport',
        religion: '$personal.religion',
        maritalStatus: '$personal.maritalStatus',
        employmentOfSpouse: '$personal.employmentOfSpouse',
        noOfChildren: '$personal.noOfChildren'
      }
    },
    {
      $project: {
        departmentObjId: 0,
        designationObjId: 0,
        reportingToObjId: 0,
        shiftObjId: 0,
        batchObjId: 0,
        departmentInfo: 0,
        designationInfo: 0,
        reportingToInfo: 0,
        reportingToManager: 0,
        shiftInfo: 0,
        batchInfo: 0,
        shiftData: 0,
        batchData: 0,
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
  const formattedEmployees = employees.map(formatEmployeeDates);

  // Build pagination metadata
  const pagination = buildPagination(pageNum, limitNum, total);

  return sendSuccess(res, formattedEmployees, 'Employees retrieved successfully', 200, pagination);
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

  devLog('[Employee Controller] getEmployeeById - id:', id, 'companyId:', user.companyId);

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
        shiftObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$shiftId', null] }, { $ne: ['$shiftId', ''] }] },
            then: { $toObjectId: '$shiftId' },
            else: null
          }
        },
        batchObjId: {
          $cond: {
            if: { $and: [{ $ne: ['$batchId', null] }, { $ne: ['$batchId', ''] }] },
            then: { $toObjectId: '$batchId' },
            else: null
          }
        }
      }
    },
    {
      $lookup: {
        from: 'shifts',
        localField: 'shiftObjId',
        foreignField: '_id',
        as: 'shiftInfo'
      }
    },
    {
      $lookup: {
        from: 'batches',
        localField: 'batchObjId',
        foreignField: '_id',
        as: 'batchInfo'
      }
    },
    {
      $addFields: {
        department: { $arrayElemAt: ['$departmentInfo', 0] },
        designation: { $arrayElemAt: ['$designationInfo', 0] },
        reportingToManager: { $arrayElemAt: ['$reportingToInfo', 0] },
        shiftData: { $arrayElemAt: ['$shiftInfo', 0] },
        batchData: { $arrayElemAt: ['$batchInfo', 0] },
        // Assign default avatar for employees without profile image
        profileImage: {
          $cond: {
            if: { $and: [{ $ne: ['$profileImage', null] }, { $ne: ['$profileImage', ''] }] },
            then: '$profileImage',
            else: getSystemDefaultAvatarUrl()
          }
        },
        // Add avatarUrl field for frontend compatibility (same as profileImage)
        avatarUrl: {
          $cond: {
            if: { $and: [{ $ne: ['$profileImage', null] }, { $ne: ['$profileImage', ''] }] },
            then: '$profileImage',
            else: getSystemDefaultAvatarUrl()
          }
        }
      }
    },
    {
      $addFields: {
        // Reporting Manager Name from populated manager
        reportingManagerName: {
          $cond: {
            if: { $ne: ['$reportingToManager', null] },
            then: {
              $concat: [
                { $ifNull: ['$reportingToManager.firstName', ''] },
                ' ',
                { $ifNull: ['$reportingToManager.lastName', ''] }
              ]
            },
            else: null
          }
        },
        // Shift information from populated shift
        shiftName: { $ifNull: ['$shiftData.name', null] },
        shiftColor: { $ifNull: ['$shiftData.color', null] },
        shiftTiming: {
          $cond: {
            if: { $and: [{ $ne: ['$shiftData', null] }, { $ne: ['$shiftData.startTime', null] }, { $ne: ['$shiftData.endTime', null] }] },
            then: {
              $concat: [
                { $ifNull: ['$shiftData.startTime', ''] },
                ' - ',
                { $ifNull: ['$shiftData.endTime', ''] }
              ]
            },
            else: null
          }
        },
        // Batch information from populated batch
        batchName: { $ifNull: ['$batchData.name', null] },
        batchShiftName: { $ifNull: ['$batchData.currentShiftName', null] },
        batchShiftTiming: { $ifNull: ['$batchData.currentShiftTiming', null] },
        batchShiftColor: { $ifNull: ['$batchData.currentShiftColor', null] },
        // Keep reportingTo as just the ID for consistency
        reportingTo: '$reportingTo',
        // Flatten personal info to root level for frontend compatibility
        passport: '$personal.passport',
        religion: '$personal.religion',
        maritalStatus: '$personal.maritalStatus',
        employmentOfSpouse: '$personal.employmentOfSpouse',
        noOfChildren: '$personal.noOfChildren'
      }
    },
    {
      $project: {
        departmentObjId: 0,
        designationObjId: 0,
        reportingToObjId: 0,
        shiftObjId: 0,
        batchObjId: 0,
        departmentInfo: 0,
        designationInfo: 0,
        reportingToInfo: 0,
        reportingToManager: 0,
        shiftInfo: 0,
        batchInfo: 0,
        shiftData: 0,
        batchData: 0
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
    const formattedEmployee = formatEmployeeDates(sanitizedEmployee);
    return sendSuccess(res, formattedEmployee);
  }

  const formattedEmployee = formatEmployeeDates(employee);
  return sendSuccess(res, formattedEmployee);
});

/**
 * @desc    Create new employee
 * @route   POST /api/employees
 * @access  Private (Admin, HR, Superadmin)
 */
export const createEmployee = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const employeeData = req.body;

  devLog('[Employee Controller] createEmployee - companyId:', user.companyId);
  devLog('[Employee Controller] employeeData:', JSON.stringify(employeeData, null, 2));

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Extract permissions data if present
  const { permissionsData, ...restEmployeeData } = employeeData;

  // Normalize data - use canonical schema structure (root level fields only)
  // Canonical schema: email, phone, dateOfBirth, gender, address at root level
  // personal object contains: passport, nationality, religion, maritalStatus, employmentOfSpouse, noOfChildren only
  const normalizedData = {
    ...restEmployeeData,
    // Extract email from root level or contact object (for backward compatibility)
    // Use ?? instead of || to preserve empty strings
    email: restEmployeeData.email ?? restEmployeeData.contact?.email,
    // Extract phone from root level or contact object (for backward compatibility)
    phone: restEmployeeData.phone ?? restEmployeeData.contact?.phone,
    // Extract dateOfBirth from root level or personal.birthday (for backward compatibility)
    dateOfBirth: restEmployeeData.dateOfBirth ?? restEmployeeData.personal?.birthday,
    // Extract gender from root level or personal.gender (for backward compatibility)
    gender: restEmployeeData.gender ?? restEmployeeData.personal?.gender,
    // Extract address from root level or personal.address (for backward compatibility)
    address: restEmployeeData.address ?? restEmployeeData.personal?.address,
  };

  const normalizedWithDates = normalizeEmployeeDates(normalizedData);
  ensureEmployeeDateLogic(normalizedWithDates);

  // Check if email already exists (use root level email field)
  const existingEmployee = await collections.employees.findOne({
    email: normalizedWithDates.email
  });

  if (existingEmployee) {
    throw buildValidationError('email', 'This email address is already registered. Please use a different email.');
  }

  // Check if employee code already exists (if provided)
  if (normalizedWithDates.employeeId) {
    const existingCode = await collections.employees.findOne({
      employeeId: normalizedWithDates.employeeId
    });

    if (existingCode) {
      throw buildValidationError('employeeId', 'This employee ID is already in use. Please use a different ID.');
    }
  }

  // Generate secure password
  const password = generateSecurePassword(12);
  devLog('[Employee Controller] Generated password for employee');

  // Determine role for Clerk (case-insensitive)
  let clerkRole = 'employee';
  const accountRole = normalizedWithDates.account?.role?.toLowerCase();
  if (accountRole === 'hr') {
    clerkRole = 'hr';
  } else if (accountRole === 'admin') {
    clerkRole = 'admin';
  }

  // Generate username from email (must be 4-64 characters for Clerk)
  let username = normalizedWithDates.email.split('@')[0];

  // Ensure username meets Clerk's minimum length requirement (4 characters)
  if (username.length < 4) {
    // Pad with first name or random characters to meet minimum length
    const firstName = normalizedWithDates.firstName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
    const lastName = normalizedWithDates.lastName?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

    // Try: email + first few chars of first name
    username = username + firstName.substring(0, 4 - username.length);

    // If still too short, add last name chars
    if (username.length < 4) {
      username = username + lastName.substring(0, 4 - username.length);
    }

    // If still too short, pad with random numbers
    if (username.length < 4) {
      username = username + Math.floor(1000 + Math.random() * 9000).toString().substring(0, 4 - username.length);
    }
  }

  // Ensure username doesn't exceed maximum length (64 characters)
  if (username.length > 64) {
    username = username.substring(0, 64);
  }

  // Create Clerk user
  let clerkUserId;
  try {
    devLog('[Employee Controller] Creating Clerk user with username:', username);
    const createdUser = await clerkClient.users.createUser({
      emailAddress: [normalizedWithDates.email],
      username: username,
      password: password,
      publicMetadata: {
        role: clerkRole,
        companyId: user.companyId,
      },
    });
    clerkUserId = createdUser.id;
    devLog('[Employee Controller] Clerk user created:', clerkUserId);
  } catch (clerkError) {
    devError('[Employee Controller] Failed to create Clerk user:', clerkError);
    devError('[Employee Controller] Clerk error details:', {
      code: clerkError.code,
      message: clerkError.message,
      errors: clerkError.errors,
      clerkTraceId: clerkError.clerkTraceId
    });

    // Parse Clerk errors and return field-specific errors
    if (clerkError.errors && Array.isArray(clerkError.errors)) {
      for (const error of clerkError.errors) {
        devError('[Employee Controller] Clerk error code:', error.code, 'message:', error.message);

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
    ...normalizedWithDates,
    clerkUserId: clerkUserId,
    account: {
      ...normalizedWithDates.account,
      password: password, // Store password (for reference)
      role: normalizedWithDates.account?.role || 'Employee',
    },
    // Assign default avatar if no profile image provided
    // Support both avatarUrl (from frontend) and profileImage (from API)
    profileImage: normalizedData.avatarUrl || normalizedData.profileImage || getSystemDefaultAvatarUrl(),
    profileImagePath: normalizedData.profileImagePath || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: user.userId,
    updatedBy: user.userId,
    status: normalizeStatus(normalizedWithDates.status || 'Active')
  };

  // ✅ CRITICAL: Handle nested objects correctly
  // Remove nested contact (email, phone already at root)
  delete employeeToInsert.contact;

  // Handle personal object: keep passport, religion, maritalStatus, employmentOfSpouse, noOfChildren
  // but remove duplicated fields (gender, birthday, address) that are now at root level
  if (employeeToInsert.personal && typeof employeeToInsert.personal === 'object') {
    const cleanPersonal = { ...employeeToInsert.personal };
    // Remove fields that have root-level equivalents
    delete cleanPersonal.gender;
    delete cleanPersonal.birthday;
    delete cleanPersonal.address;
    // Keep the cleaned personal object with passport, religion, maritalStatus, etc.
    employeeToInsert.personal = cleanPersonal;
  }

  // Create employee
  const result = await collections.employees.insertOne(employeeToInsert);

  if (!result.insertedId) {
    // Rollback: Delete Clerk user if database insert fails
    try {
      await clerkClient.users.deleteUser(clerkUserId);
      devLog('[Employee Controller] Rolled back Clerk user creation');
    } catch (rollbackError) {
      devError('[Employee Controller] Failed to rollback Clerk user:', rollbackError);
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
      devLog('[Employee Controller] Permissions created for employee');
    } catch (permError) {
      devError('[Employee Controller] Failed to create permissions:', permError);
      // Continue anyway - permissions can be added later
    }
  }

  // Get the created employee
  const employee = await collections.employees.findOne({ _id: result.insertedId });
  const formattedEmployee = formatEmployeeDates(employee);

  // Send email with credentials
  try {
    const loginLink = process.env.DOMAIN
      ? `https://${process.env.DOMAIN}/login`
      : 'http://localhost:3000/login';

    await sendEmployeeCredentialsEmail({
      to: normalizedWithDates.email,
      password: password,
      userName: username,
      loginLink: loginLink,
      firstName: normalizedWithDates.firstName,
      lastName: normalizedWithDates.lastName,
      companyName: normalizedWithDates.companyName || 'Your Company',
    });
    devLog('[Employee Controller] Credentials email sent to:', normalizedWithDates.email);
  } catch (emailError) {
    devError('[Employee Controller] Failed to send email:', emailError);
    // Continue anyway - employee is created
  }

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastEmployeeEvents.created(io, user.companyId, employee);
  }

  return sendCreated(res, formattedEmployee, 'Employee created successfully. Credentials email sent.');
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

  devLog('[Employee Controller] updateEmployee - id:', id, 'companyId:', user.companyId);

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

  // Check email uniqueness if email is being updated (use canonical email field)
  const newEmail = updateData.email || updateData.contact?.email;
  if (newEmail && newEmail !== employee.email) {
    const existingEmployee = await collections.employees.findOne({
      email: newEmail,
      _id: { $ne: new ObjectId(id) }
    });

    if (existingEmployee) {
      throw buildValidationError('email', 'This email address is already registered. Please use a different email.');
    }
  }

  // Check employee code uniqueness if being updated
  if (updateData.employeeId && updateData.employeeId !== employee.employeeId) {
    const existingCode = await collections.employees.findOne({
      employeeId: updateData.employeeId,
      _id: { $ne: new ObjectId(id) }
    });

    if (existingCode) {
      throw buildValidationError('employeeId', 'This employee ID is already in use. Please use a different ID.');
    }
  }

  // Normalize update data - extract nested fields to root level
  const normalizedData = {
    ...updateData,
    // Extract email from root level or contact object (for backward compatibility)
    // Use ?? instead of || to preserve empty strings
    email: updateData.email ?? updateData.contact?.email,
    // Extract phone from root level or contact object (for backward compatibility)
    phone: updateData.phone ?? updateData.contact?.phone,
    // Extract dateOfBirth from root level or personal.birthday (for backward compatibility)
    dateOfBirth: updateData.dateOfBirth ?? updateData.personal?.birthday,
    // Extract gender from root level or personal.gender (for backward compatibility)
    gender: updateData.gender ?? updateData.personal?.gender,
    // Extract address from root level or personal.address (for backward compatibility)
    address: updateData.address ?? updateData.personal?.address,
    // Map avatarUrl to profileImage for frontend compatibility
    profileImage: updateData.avatarUrl ?? updateData.profileImage,
  };

  const normalizedUpdateData = normalizeEmployeeDates(normalizedData);
  ensureEmployeeDateLogic(normalizedUpdateData, employee);

  // Update audit fields
  normalizedUpdateData.updatedAt = new Date();
  normalizedUpdateData.updatedBy = user.userId;

  // ✅ CRITICAL: Handle nested objects correctly
  // Remove nested contact (email, phone already at root)
  delete normalizedUpdateData.contact;

  // Handle personal object: keep passport, religion, maritalStatus, employmentOfSpouse, noOfChildren
  // but remove duplicated fields (gender, birthday, address) that are now at root level
  if (normalizedUpdateData.personal && typeof normalizedUpdateData.personal === 'object') {
    const cleanPersonal = { ...normalizedUpdateData.personal };
    // Remove fields that have root-level equivalents
    delete cleanPersonal.gender;
    delete cleanPersonal.birthday;
    delete cleanPersonal.address;
    // Keep the cleaned personal object with passport, religion, maritalStatus, etc.
    normalizedUpdateData.personal = cleanPersonal;
  }

  // Update employee
  const result = await collections.employees.updateOne(
    { _id: new ObjectId(id) },
    { $set: normalizedUpdateData }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Employee', id);
  }

  // Get updated employee
  const updatedEmployee = await collections.employees.findOne({ _id: new ObjectId(id) });
  const formattedEmployee = formatEmployeeDates(updatedEmployee);

  // Broadcast Socket.IO event
  const io = getSocketIO(req);
  if (io) {
    broadcastEmployeeEvents.updated(io, user.companyId, updatedEmployee);
  }

  return sendSuccess(res, formattedEmployee, 'Employee updated successfully');
});

/**
 * @desc    Delete employee (soft delete)
 * @route   DELETE /api/employees/:id
 * @access  Private (Admin, Superadmin only)
 */
export const deleteEmployee = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[Employee Controller] deleteEmployee - id:', id, 'companyId:', user.companyId);

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

  devLog('[Employee Controller] reassignAndDeleteEmployee - id:', id, 'reassignTo:', reassignTo, 'companyId:', user.companyId);

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

  devLog('[Employee Controller] getMyProfile - userId:', user.userId, 'companyId:', user.companyId);

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
  const formattedEmployee = formatEmployeeDates(sanitizedEmployee);

  // Assign default avatar if employee has no profile image
  if (!sanitizedEmployee.profileImage || sanitizedEmployee.profileImage.trim() === '') {
    sanitizedEmployee.profileImage = getSystemDefaultAvatarUrl();
  }

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

  devLog('[Employee Controller] updateMyProfile - userId:', user.userId, 'companyId:', user.companyId);

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
    'profileImage',
    'avatarUrl'  // Support frontend avatarUrl field
  ];

  const sanitizedUpdate = {};
  allowedFields.forEach(field => {
    if (updateData[field] !== undefined) {
      sanitizedUpdate[field] = updateData[field];
    }
  });

  // Map avatarUrl to profileImage for compatibility
  if (sanitizedUpdate.avatarUrl !== undefined) {
    sanitizedUpdate.profileImage = sanitizedUpdate.avatarUrl;
    delete sanitizedUpdate.avatarUrl;
  }

  const normalizedUpdate = normalizeEmployeeDates(sanitizedUpdate);
  ensureEmployeeDateLogic(normalizedUpdate, employee);

  // Update audit fields
  normalizedUpdate.updatedAt = new Date();
  normalizedUpdate.updatedBy = user.userId;

  // Update employee
  const result = await collections.employees.updateOne(
    { _id: employee._id },
    { $set: normalizedUpdate }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Employee profile');
  }

  // Get updated employee
  const updatedEmployee = await collections.employees.findOne({ _id: employee._id });

  const formattedEmployee = formatEmployeeDates(updatedEmployee);
  return sendSuccess(res, formattedEmployee, 'Profile updated successfully');
});

/**
 * @desc    Get employee reportees (subordinates)
 * @route   GET /api/employees/:id/reportees
 * @access  Private (Admin, HR, Superadmin, or the manager themselves)
 */
export const getEmployeeReportees = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[Employee Controller] getEmployeeReportees - id:', id, 'companyId:', user.companyId);

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

  devLog('[Employee Controller] getEmployeeStatsByDepartment - companyId:', user.companyId);

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

  devLog('[Employee Controller] searchEmployees - query:', q, 'companyId:', user.companyId);

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

  const formattedEmployees = employees.map(formatEmployeeDates);

  return sendSuccess(res, formattedEmployees, 'Search results retrieved successfully');
});

/**
 * @desc    Check for duplicate email and phone
 * @route   POST /api/employees/check-duplicates
 * @access  Private (Admin, HR, Superadmin)
 */
export const checkDuplicates = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { email, phone } = req.body;

  devLog('[Employee Controller] checkDuplicates - email:', email, 'phone:', phone, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Check for duplicate email
  if (email) {
    const emailExists = await collections.employees.countDocuments({
      'contact.email': email,
      isDeleted: { $ne: true }  // Exclude soft-deleted records
    });

    if (emailExists > 0) {
      devLog('[Employee Controller] checkDuplicates - email already exists');
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
      devLog('[Employee Controller] checkDuplicates - phone already exists');
      return res.status(409).json({
        done: false,
        error: 'Phone number already registered',
        field: 'phone',
        message: 'This phone number is already registered in the system'
      });
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

  devLog('[Employee Controller] bulkUploadEmployees - count:', employees?.length, 'companyId:', user.companyId);

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
        devLog('[Employee Controller] Bulk upload - Clerk user created for:', email);
      } catch (clerkError) {
        devError('[Employee Controller] Bulk upload - Failed to create Clerk user for:', email, clerkError);
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
        devError('[Employee Controller] Bulk upload - Failed to send email to:', email, emailError);
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

/**
 * @desc    Ensure employee record exists for current user (sync from Clerk)
 * @route   POST /api/employees/sync-my-employee
 * @access  Private (All authenticated users)
 */
export const syncMyEmployeeRecord = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[Employee Controller] syncMyEmployeeRecord - userId:', user.userId, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Check if employee already exists
  const existingEmployee = await collections.employees.findOne({
    clerkUserId: user.userId
  });

  if (existingEmployee) {
    return sendSuccess(res, existingEmployee, 'Employee record already exists');
  }

  // Get user data from Clerk
  let clerkUser;
  try {
    clerkUser = await clerkClient.users.getUser(user.userId);
  } catch (clerkError) {
    devError('[Employee Controller] Failed to fetch user from Clerk:', clerkError);
    throw buildNotFoundError('User profile in Clerk');
  }

  // Extract user data from Clerk
  const firstName = clerkUser.firstName || '';
  const lastName = clerkUser.lastName || '';
  const email = clerkUser.emailAddresses?.[0]?.emailAddress || '';
  const username = clerkUser.username || email.split('@')[0];

  if (!email) {
    throw buildValidationError('email', 'No email found in Clerk profile');
  }

  // Check if email already exists (link to existing employee)
  const emailExists = await collections.employees.findOne({
    email: email,
    isDeleted: { $ne: true }
  });

  if (emailExists) {
    // Update existing employee with clerkUserId
    await collections.employees.updateOne(
      { _id: emailExists._id },
      {
        $set: {
          clerkUserId: user.userId,
          updatedAt: new Date()
        }
      }
    );
    return sendSuccess(res, emailExists, 'Employee record linked to your account');
  }

  // Get department and designations (use first available as default)
  const departments = await collections.departments.find({}).limit(1).toArray();
  const designations = await collections.designations.find({}).limit(1).toArray();

  const departmentId = departments[0]?._id?.toString() || null;
  const designationId = designations[0]?._id?.toString() || null;

  // Determine role from metadata or default to employee
  const role = clerkUser.publicMetadata?.role || user.role || 'employee';

  // Create employee record
  const employeeToInsert = {
    clerkUserId: user.userId,
    employeeId: null, // Will be auto-generated by pre-save hook
    firstName: firstName || 'User',
    lastName: lastName || user.userId,
    fullName: `${firstName} ${lastName}`.trim() || `User ${user.userId.substring(0, 8)}`,
    email: email,
    phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
    departmentId: departmentId,
    designationId: designationId,
    employmentType: 'Full-time',
    employmentStatus: 'Active',
    joiningDate: new Date(),
    workLocation: 'Remote',
    companyId: user.companyId,
    role: role,
    account: {
      userName: username,
      role: role.charAt(0).toUpperCase() + role.slice(1)
    },
    profileImage: clerkUser.imageUrl || '',
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: user.userId,
    updatedBy: user.userId,
    status: 'Active',
    isActive: true,
    isDeleted: false
  };

  const result = await collections.employees.insertOne(employeeToInsert);

  if (!result.insertedId) {
    throw new Error('Failed to create employee record');
  }

  // Get the created employee
  const employee = await collections.employees.findOne({ _id: result.insertedId });

  return sendCreated(res, employee, 'Employee record created successfully');
});

/**
 * @desc    Upload employee profile image
 * @route   POST /api/employees/:id/image
 * @access  Private (Admin, HR, Superadmin, or the employee themselves)
 */
export const uploadEmployeeProfileImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[Employee Controller] uploadEmployeeProfileImage - id:', id, 'companyId:', user.companyId);

  // Check if file was uploaded
  if (!req.file) {
    throw buildValidationError('profileImage', 'No image file provided');
  }

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    // Delete uploaded file if ID is invalid
    deleteUploadedFile(req.file.filename);
    throw buildValidationError('id', 'Invalid employee ID format');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find employee
  const employee = await collections.employees.findOne({ _id: new ObjectId(id) });

  if (!employee) {
    // Delete uploaded file if employee not found
    deleteUploadedFile(req.file.filename);
    throw buildNotFoundError('Employee', id);
  }

  // Delete old image if exists
  if (employee.profileImagePath) {
    deleteUploadedFile(employee.profileImagePath);
  }

  // Update employee with new image path
  const imagePath = `employee-images/${req.file.filename}`;
  const imageUrl = getPublicUrl(imagePath);

  const result = await collections.employees.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        profileImagePath: imagePath,
        profileImage: imageUrl,
        updatedAt: new Date(),
        updatedBy: user.userId
      }
    }
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

  return sendSuccess(res, {
    profileImage: imageUrl,
    profileImagePath: imagePath
  }, 'Profile image uploaded successfully');
});

/**
 * @desc    Delete employee profile image
 * @route   DELETE /api/employees/:id/image
 * @access  Private (Admin, HR, Superadmin, or the employee themselves)
 */
export const deleteEmployeeProfileImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[Employee Controller] deleteEmployeeProfileImage - id:', id, 'companyId:', user.companyId);

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

  // Check if the current avatar is the system default - prevent deletion
  const currentAvatar = employee.profileImage || employee.profileImagePath;
  const deleteCheck = canUserDeleteAvatar(currentAvatar);

  if (!deleteCheck.canDelete) {
    throw buildError(
      400,
      deleteCheck.reason || 'Cannot delete this avatar',
      'CANNOT_DELETE_DEFAULT_AVATAR'
    );
  }

  // Delete old image if exists
  let deletedPath = null;
  if (employee.profileImagePath) {
    deletedPath = employee.profileImagePath;
    deleteUploadedFile(employee.profileImagePath);
  }

  // Assign system default avatar instead of null
  const defaultAvatarUrl = getSystemDefaultAvatarUrl();

  const result = await collections.employees.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        profileImagePath: null, // Default avatar is served as static, not uploaded
        profileImage: defaultAvatarUrl,
        updatedAt: new Date(),
        updatedBy: user.userId
      }
    }
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

  return sendSuccess(res, {
    deleted: !!deletedPath,
    previousPath: deletedPath,
    reassignedTo: defaultAvatarUrl
  }, 'Profile image deleted and reassigned to default avatar');
});

/**
 * @desc    Serve employee profile image
 * @route   GET /api/employees/:id/image
 * @access  Public (images are publicly accessible)
 */
export const serveEmployeeProfileImage = asyncHandler(async (req, res) => {
  const { id } = req.params;

  devLog('[Employee Controller] serveEmployeeProfileImage - id:', id);

  // Validate ObjectId
  if (!ObjectId.isValid(id)) {
    return res.status(404).json({
      success: false,
      error: 'Invalid employee ID'
    });
  }

  // For now, we'll use static file serving through Express static middleware
  // This endpoint can be used to track image views or add caching headers
  return res.status(200).json({
    success: true,
    message: 'Use /uploads/employee-images/:filename for direct file access'
  });
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
  bulkUploadEmployees,
  syncMyEmployeeRecord,
  uploadEmployeeProfileImage,
  deleteEmployeeProfileImage,
  serveEmployeeProfileImage
};
