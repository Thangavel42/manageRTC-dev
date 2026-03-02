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
import employeeStatusService from '../../services/employee/employeeStatus.service.js';
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
import { sendEmployeeCredentialsEmail, sendPasswordChangedEmail } from '../../utils/emailer.js';
import { devError, devLog } from '../../utils/logger.js';
import { broadcastEmployeeEvents, getSocketIO } from '../../utils/socketBroadcaster.js';

/**
 * Generate secure random password for new employees
 */
export function generateSecurePassword(length = 12) {
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
  const {
    page,
    limit,
    search,
    department,
    designation,
    status,
    role,
    sortBy,
    order,
    reportingManagerList,
    excludeEmployeeId
  } = query;
  const user = extractUser(req);

  devLog('[Employee Controller] getEmployees - companyId:', user.companyId, 'filters:', { page, limit, search, department, designation, status, role });

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const isReportingManagerList = String(reportingManagerList).toLowerCase() === 'true';
  if (isReportingManagerList) {
    const limitNum = parseInt(limit) || 10;
    const filter = {
      isDeleted: { $ne: true },
      status: 'Active'
    };

    if (department) {
      filter.departmentId = department;
    }

    if (excludeEmployeeId && ObjectId.isValid(excludeEmployeeId)) {
      filter._id = { $ne: new ObjectId(excludeEmployeeId) };
    }

    if (search && search.trim()) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          // Handle both departmentId (string) and department (ObjectId) field names
          departmentObjId: {
            $switch: {
              branches: [
                {
                  case: { $and: [
                    { $ne: ['$departmentId', null] },
                    { $ne: ['$departmentId', ''] },
                    { $eq: [{ $type: '$departmentId' }, 'string'] }
                  ]},
                  then: { $toObjectId: '$departmentId' }
                },
                {
                  case: { $eq: [{ $type: '$department' }, 'objectId'] },
                  then: '$department'
                }
              ],
              default: null
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
        $addFields: {
          departmentName: { $ifNull: [{ $arrayElemAt: ['$departmentInfo.department', 0] }, null] }
        }
      },
      {
        $project: {
          _id: 1,
          employeeId: 1,
          firstName: 1,
          lastName: 1,
          fullName: 1,
          departmentName: 1
        }
      },
      { $sort: { firstName: 1, lastName: 1 } },
      { $limit: limitNum }
    ];

    const employees = await collections.employees.aggregate(pipeline).toArray();
    const results = employees.map((emp) => ({
      id: emp._id?.toString(),
      employeeId: emp.employeeId,
      name: emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
      department: emp.departmentName || ''
    }));

    return sendSuccess(res, results, 'Employees retrieved successfully');
  }

  // Build filter - always exclude soft-deleted records
  let filter = { isDeleted: { $ne: true } };

  // Apply status filter
  if (status) {
    filter.status = status;
  }

  // Apply role filter (case-insensitive)
  if (role) {
    const roleRegex = new RegExp(`^${role}$`, 'i');
    filter.$and = filter.$and || [];
    filter.$and.push({
      $or: [
        { role: roleRegex },
        { 'account.role': roleRegex }
      ]
    });
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
        // Handle both departmentId (string) and department (ObjectId) field names
        departmentObjId: {
          $switch: {
            branches: [
              {
                case: { $and: [
                  { $ne: ['$departmentId', null] },
                  { $ne: ['$departmentId', ''] },
                  { $eq: [{ $type: '$departmentId' }, 'string'] }
                ]},
                then: { $toObjectId: '$departmentId' }
              },
              {
                case: { $eq: [{ $type: '$department' }, 'objectId'] },
                then: '$department'
              }
            ],
            default: null
          }
        },
        // Handle both designationId (string) and designation (ObjectId) field names
        designationObjId: {
          $switch: {
            branches: [
              {
                case: { $and: [
                  { $ne: ['$designationId', null] },
                  { $ne: ['$designationId', ''] },
                  { $eq: [{ $type: '$designationId' }, 'string'] }
                ]},
                then: { $toObjectId: '$designationId' }
              },
              {
                case: { $eq: [{ $type: '$designation' }, 'objectId'] },
                then: '$designation'
              }
            ],
            default: null
          }
        },
        // Handle reportingTo as both string and ObjectId
        reportingToObjId: {
          $switch: {
            branches: [
              {
                case: { $and: [
                  { $ne: ['$reportingTo', null] },
                  { $ne: ['$reportingTo', ''] },
                  { $eq: [{ $type: '$reportingTo' }, 'string'] }
                ]},
                then: { $toObjectId: '$reportingTo' }
              },
              {
                case: { $eq: [{ $type: '$reportingTo' }, 'objectId'] },
                then: '$reportingTo'
              }
            ],
            default: null
          }
        },
        // Handle shiftId as both string and ObjectId
        shiftObjId: {
          $switch: {
            branches: [
              {
                case: { $and: [
                  { $ne: ['$shiftId', null] },
                  { $ne: ['$shiftId', ''] },
                  { $eq: [{ $type: '$shiftId' }, 'string'] }
                ]},
                then: { $toObjectId: '$shiftId' }
              },
              {
                case: { $eq: [{ $type: '$shift' }, 'objectId'] },
                then: '$shift'
              },
              {
                case: { $eq: [{ $type: '$shiftId' }, 'objectId'] },
                then: '$shiftId'
              }
            ],
            default: null
          }
        },
        // Handle batchId as both string and ObjectId
        batchObjId: {
          $switch: {
            branches: [
              {
                case: { $and: [
                  { $ne: ['$batchId', null] },
                  { $ne: ['$batchId', ''] },
                  { $eq: [{ $type: '$batchId' }, 'string'] }
                ]},
                then: { $toObjectId: '$batchId' }
              },
              {
                case: { $eq: [{ $type: '$batch' }, 'objectId'] },
                then: '$batch'
              },
              {
                case: { $eq: [{ $type: '$batchId' }, 'objectId'] },
                then: '$batchId'
              }
            ],
            default: null
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
        // Compute fullName if not already set (from firstName and lastName)
        fullName: {
          $ifNull: [
            '$fullName',
            {
              $concat: [
                { $ifNull: ['$firstName', ''] },
                ' ',
                { $ifNull: ['$lastName', ''] }
              ]
            }
          ]
        },
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
        // Reporting Manager Employee ID from populated manager (for frontend lookups)
        reportingToEmployeeId: {
          $cond: {
            if: { $ne: ['$reportingToManager', null] },
            then: '$reportingToManager.employeeId',
            else: null
          }
        },
        // Reporting To Name (alias for reportingManagerName for consistency)
        reportingToName: {
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
        nationality: '$personal.nationality',
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
        bankDetails: 0,
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
 * @desc    Get all active employees for dropdowns (no role restriction)
 * @route   GET /api/employees/active-list
 * @access  Private (Any authenticated user in company)
 */
export const getActiveEmployeesList = asyncHandler(async (req, res) => {
  const query = req.validatedQuery || req.query;
  const { search } = query;
  const user = extractUser(req);

  const collections = getTenantCollections(user.companyId);

  const filter = {
    isDeleted: { $ne: true },
    status: 'Active'
  };

  if (search && search.trim()) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { fullName: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } }
    ];
  }

  const pipeline = [
    { $match: filter },
    {
      $addFields: {
        // Handle both departmentId (string) and department (ObjectId) field names
        departmentObjId: {
          $switch: {
            branches: [
              {
                case: { $and: [
                  { $ne: ['$departmentId', null] },
                  { $ne: ['$departmentId', ''] },
                  { $eq: [{ $type: '$departmentId' }, 'string'] }
                ]},
                then: { $toObjectId: '$departmentId' }
              },
              {
                case: { $eq: [{ $type: '$department' }, 'objectId'] },
                then: '$department'
              }
            ],
            default: null
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
      $addFields: {
        department: { $arrayElemAt: ['$departmentInfo', 0] }
      }
    },
    {
      $project: {
        _id: 1,
        employeeId: 1,
        firstName: 1,
        lastName: 1,
        fullName: 1,
        departmentId: 1,
        department: '$department.department',
        status: 1
      }
    },
    { $sort: { firstName: 1, lastName: 1 } }
  ];

  const employees = await collections.employees.aggregate(pipeline).toArray();

  return sendSuccess(res, employees, 'Active employees retrieved successfully');
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
        // Handle both departmentId (string) and department (ObjectId) field names
        departmentObjId: {
          $switch: {
            branches: [
              // Case 1: departmentId is a non-empty string - convert to ObjectId
              {
                case: { $and: [
                  { $ne: ['$departmentId', null] },
                  { $ne: ['$departmentId', ''] },
                  { $eq: [{ $type: '$departmentId' }, 'string'] }
                ]},
                then: { $toObjectId: '$departmentId' }
              },
              // Case 2: department is already an ObjectId - use it directly
              {
                case: { $eq: [{ $type: '$department' }, 'objectId'] },
                then: '$department'
              }
            ],
            default: null
          }
        },
        // Handle both designationId (string) and designation (ObjectId) field names
        designationObjId: {
          $switch: {
            branches: [
              // Case 1: designationId is a non-empty string - convert to ObjectId
              {
                case: { $and: [
                  { $ne: ['$designationId', null] },
                  { $ne: ['$designationId', ''] },
                  { $eq: [{ $type: '$designationId' }, 'string'] }
                ]},
                then: { $toObjectId: '$designationId' }
              },
              // Case 2: designation is already an ObjectId - use it directly
              {
                case: { $eq: [{ $type: '$designation' }, 'objectId'] },
                then: '$designation'
              }
            ],
            default: null
          }
        },
        // Handle reportingTo as both string and ObjectId
        reportingToObjId: {
          $switch: {
            branches: [
              // Case 1: reportingTo is a non-empty string - convert to ObjectId
              {
                case: { $and: [
                  { $ne: ['$reportingTo', null] },
                  { $ne: ['$reportingTo', ''] },
                  { $eq: [{ $type: '$reportingTo' }, 'string'] }
                ]},
                then: { $toObjectId: '$reportingTo' }
              },
              // Case 2: reportingTo is already an ObjectId - use it directly
              {
                case: { $eq: [{ $type: '$reportingTo' }, 'objectId'] },
                then: '$reportingTo'
              }
            ],
            default: null
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
        // Handle shiftId as both string and ObjectId
        shiftObjId: {
          $switch: {
            branches: [
              // Case 1: shiftId is a non-empty string - convert to ObjectId
              {
                case: { $and: [
                  { $ne: ['$shiftId', null] },
                  { $ne: ['$shiftId', ''] },
                  { $eq: [{ $type: '$shiftId' }, 'string'] }
                ]},
                then: { $toObjectId: '$shiftId' }
              },
              // Case 2: shift is already an ObjectId - use it directly
              {
                case: { $eq: [{ $type: '$shift' }, 'objectId'] },
                then: '$shift'
              },
              // Case 3: shiftId is already an ObjectId - use it directly
              {
                case: { $eq: [{ $type: '$shiftId' }, 'objectId'] },
                then: '$shiftId'
              }
            ],
            default: null
          }
        },
        // Handle batchId as both string and ObjectId
        batchObjId: {
          $switch: {
            branches: [
              // Case 1: batchId is a non-empty string - convert to ObjectId
              {
                case: { $and: [
                  { $ne: ['$batchId', null] },
                  { $ne: ['$batchId', ''] },
                  { $eq: [{ $type: '$batchId' }, 'string'] }
                ]},
                then: { $toObjectId: '$batchId' }
              },
              // Case 2: batch is already an ObjectId - use it directly
              {
                case: { $eq: [{ $type: '$batch' }, 'objectId'] },
                then: '$batch'
              },
              // Case 3: batchId is already an ObjectId - use it directly
              {
                case: { $eq: [{ $type: '$batchId' }, 'objectId'] },
                then: '$batchId'
              }
            ],
            default: null
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
        // Compute fullName if not already set (from firstName and lastName)
        fullName: {
          $ifNull: [
            '$fullName',
            {
              $concat: [
                { $ifNull: ['$firstName', ''] },
                ' ',
                { $ifNull: ['$lastName', ''] }
              ]
            }
          ]
        },
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
        // Reporting Manager Employee ID from populated manager (for frontend lookups)
        reportingToEmployeeId: {
          $cond: {
            if: { $ne: ['$reportingToManager', null] },
            then: '$reportingToManager.employeeId',
            else: null
          }
        },
        // Reporting To Name (alias for reportingManagerName for consistency)
        reportingToName: {
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
        nationality: '$personal.nationality',
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
    const { salary, bankDetails, emergencyContacts, ...sanitizedEmployee } = employee;
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
  devLog('[Employee Controller] nationality value in request:', employeeData?.nationality);
  devLog('[Employee Controller] personal object in request:', JSON.stringify(employeeData?.personal));
  devLog('[Employee Controller] religion value in request:', employeeData?.religion);
  devLog('[Employee Controller] maritalStatus value in request:', employeeData?.maritalStatus);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Extract permissions data if present
  const { permissionsData, ...restEmployeeData } = employeeData;

  // Normalize data - use canonical schema structure (root level fields only)
  // Canonical schema: email, phone, phoneCode, dateOfBirth, gender, address at root level
  // personal object contains: passport, nationality, religion, maritalStatus, employmentOfSpouse, noOfChildren only
  const normalizedData = {
    ...restEmployeeData,
    // Extract email from root level or contact object (for backward compatibility)
    // Use ?? instead of || to preserve empty strings
    email: restEmployeeData.email ?? restEmployeeData.contact?.email,
    // Extract phone from root level or contact object (for backward compatibility)
    phone: restEmployeeData.phone ?? restEmployeeData.contact?.phone,
    // Extract phoneCode from request (country code for phone)
    phoneCode: restEmployeeData.phoneCode ?? restEmployeeData.contact?.phoneCode ?? '+1',
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

  // Create Clerk user with retry if username collides
  const createClerkUserWithFallback = async (baseUsername) => {
    let lastError = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      const candidate = attempt === 0
        ? baseUsername
        : `${baseUsername}-${Math.floor(1000 + Math.random() * 9000)}`.substring(0, 64);

      try {
        devLog('[Employee Controller] Creating Clerk user with username:', candidate);
        const createdUser = await clerkClient.users.createUser({
          emailAddress: [normalizedWithDates.email],
          username: candidate,
          password: password,
          publicMetadata: {
            role: clerkRole,
            companyId: user.companyId,
          },
        });
        return createdUser;
      } catch (error) {
        lastError = error;
        const isUsernameTaken = Array.isArray(error?.errors)
          && error.errors.some((e) => e.code === 'form_identifier_exists'
            && ((e.meta && e.meta.paramName === 'username')
              || (e.message || '').toLowerCase().includes('username')));
        if (isUsernameTaken) {
          devError('[Employee Controller] Username already taken in Clerk, retrying with suffix', { candidate });
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  };

  // Create Clerk user
  let clerkUserId;
  try {
    const createdUser = await createClerkUserWithFallback(username);
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
              message: 'This email is already registered.',
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
    // Remove the account object from normalizedWithDates before spreading to prevent conflicts
    // Then set account explicitly with password
    account: {
      userName: normalizedWithDates.account?.userName,
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

  // Remove account from normalizedWithDates to prevent it from overwriting our explicitly set account object
  delete normalizedWithDates.account;

  // ✅ CRITICAL: Handle nationality BEFORE spreading to ensure it's preserved
  // Extract nationality from root level or personal.nationality (frontend sends it in personal object)
  const nationalityValue = normalizedWithDates.nationality || normalizedData.nationality || restEmployeeData?.nationality || restEmployeeData?.personal?.nationality;

  // Extract other personal fields from root level or personal object (frontend sends them in personal object)
  const religionValue = normalizedWithDates.religion || normalizedData.religion || restEmployeeData?.religion || restEmployeeData?.personal?.religion;
  const maritalStatusValue = normalizedWithDates.maritalStatus || normalizedData.maritalStatus || restEmployeeData?.maritalStatus || restEmployeeData?.personal?.maritalStatus;
  const noOfChildrenValue = normalizedWithDates.noOfChildren || normalizedData.noOfChildren || restEmployeeData?.noOfChildren || restEmployeeData?.personal?.noOfChildren;
  const employmentOfSpouseValue = normalizedWithDates.employmentOfSpouse || normalizedData.employmentOfSpouse || restEmployeeData?.employmentOfSpouse || restEmployeeData?.personal?.employmentOfSpouse;
  const passportValue = normalizedWithDates.passport || normalizedData.passport || restEmployeeData?.passport || restEmployeeData?.personal?.passport;

  // ✅ CRITICAL: Extract and preserve passport from the request before any processing
  // The passport object might be in different locations depending on the frontend
  let extractedPassport = passportValue || null;

  // ✅ CRITICAL: Handle nested objects correctly
  // Remove nested contact (email, phone already at root)
  delete employeeToInsert.contact;

  // Remove nationality from root level after extracting (we'll add it to personal)
  delete employeeToInsert.nationality;
  delete normalizedWithDates.nationality;

  // Remove religion, maritalStatus, noOfChildren, employmentOfSpouse from root (they go in personal)
  delete employeeToInsert.religion;
  delete employeeToInsert.maritalStatus;
  delete employeeToInsert.noOfChildren;
  delete employeeToInsert.employmentOfSpouse;
  delete employeeToInsert.passport;

  // ✅ CRITICAL: Build personal object with all extracted values
  const personalData = {
    ...(extractedPassport ? { passport: extractedPassport } : {}),
    ...(nationalityValue ? { nationality: nationalityValue } : {}),
    ...(religionValue ? { religion: religionValue } : {}),
    ...(maritalStatusValue ? { maritalStatus: maritalStatusValue } : {}),
    ...(noOfChildrenValue !== undefined ? { noOfChildren: noOfChildrenValue } : {}),
    ...(employmentOfSpouseValue ? { employmentOfSpouse: employmentOfSpouseValue } : {})
  };

  // Merge with existing personal object if it has other fields (like from frontend)
  if (employeeToInsert.personal && typeof employeeToInsert.personal === 'object') {
    // Keep the personal object but ensure our extracted fields are set
    employeeToInsert.personal = {
      ...employeeToInsert.personal, // Keep any existing fields
      ...personalData  // Override with our extracted values
    };
  } else if (Object.keys(personalData).length > 0) {
    // Only set personal if we have data
    employeeToInsert.personal = personalData;
  }

  // Clean up the personal object - remove fields that are now at root level
  if (employeeToInsert.personal && typeof employeeToInsert.personal === 'object') {
    // Remove these from personal since they're kept at root level
    delete employeeToInsert.personal.gender;
    delete employeeToInsert.personal.birthday; // Old field name
    delete employeeToInsert.personal.address; // Address is at root
  }

  // Debug log to verify all personal fields
  devLog('[Employee Controller] Personal Data Check:', {
    extractedNationality: nationalityValue,
    extractedReligion: religionValue,
    extractedMaritalStatus: maritalStatusValue,
    extractedPassport: extractedPassport,
    finalPersonal: employeeToInsert.personal
  });

  // Debug log to verify password is being set
  devLog('[Employee Controller] Password check - Generated password exists:', !!password);
  devLog('[Employee Controller] Password check - employeeToInsert.account:', JSON.stringify(employeeToInsert.account));
  devLog('[Employee Controller] Password check - employeeToInsert.account.password exists:', !!employeeToInsert.account?.password);
  devLog('[Employee Controller] Password check - normalizedWithDates.account:', JSON.stringify(normalizedWithDates.account));

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

  // Handle Self Reporting: Update reportingTo to the employee's own _id
  if (restEmployeeData.selfReporting) {
    try {
      await collections.employees.updateOne(
        { _id: result.insertedId },
        { $set: { reportingTo: result.insertedId.toString() } }
      );
      devLog('[Employee Controller] Set self-reporting for employee:', result.insertedId);
    } catch (selfReportingError) {
      devError('[Employee Controller] Failed to set self-reporting:', selfReportingError);
      // Continue anyway - can be fixed later
    }
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

  // ⚠️ CRITICAL: Email is connected to Clerk authentication and cannot be updated
  // Remove email from updateData if provided to prevent accidental updates
  if (updateData.email) {
    devLog('[Employee Controller] Email update ignored - email is managed by Clerk');
    delete updateData.email;
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
  };

  // ⚠️ CRITICAL: Email is managed by Clerk and cannot be updated
  // Always exclude email from update data
  delete normalizedData.email;

  // Extract phone from root level or contact object (for backward compatibility)
  if (updateData.phone || updateData.contact?.phone) {
    normalizedData.phone = updateData.phone ?? updateData.contact?.phone;
  }

  // Extract phoneCode from root level or contact object (for backward compatibility)
  if (updateData.phoneCode !== undefined || updateData.contact?.phoneCode !== undefined) {
    normalizedData.phoneCode = updateData.phoneCode ?? updateData.contact?.phoneCode;
  }

  // Extract dateOfBirth from root level or personal.birthday (for backward compatibility)
  if (updateData.dateOfBirth || updateData.personal?.birthday) {
    normalizedData.dateOfBirth = updateData.dateOfBirth ?? updateData.personal?.birthday;
  }

  // Extract gender from root level or personal.gender (for backward compatibility)
  if (updateData.gender || updateData.personal?.gender) {
    normalizedData.gender = updateData.gender ?? updateData.personal?.gender;
  }

  // Extract address from root level or personal.address (for backward compatibility)
  if (updateData.address || updateData.personal?.address) {
    normalizedData.address = updateData.address ?? updateData.personal?.address;
  }

  // Map avatarUrl to profileImage for frontend compatibility
  if (updateData.avatarUrl || updateData.profileImage) {
    normalizedData.profileImage = updateData.avatarUrl ?? updateData.profileImage;
  }

  const normalizedUpdateData = normalizeEmployeeDates(normalizedData);
  ensureEmployeeDateLogic(normalizedUpdateData, employee);

  // ⚠️ CRITICAL: Email is managed by Clerk and cannot be updated
  // Always remove email from update data if somehow it got through
  delete normalizedUpdateData.email;

  // Update audit fields
  normalizedUpdateData.updatedAt = new Date();
  normalizedUpdateData.updatedBy = user.userId;

  // ✅ CRITICAL: Extract personal fields from all possible locations BEFORE any transformations
  // Extract nationality from root level or personal.nationality
  const nationalityValue = normalizedUpdateData.nationality ?? updateData.personal?.nationality;
  const religionValue = normalizedUpdateData.religion ?? updateData.personal?.religion;
  const maritalStatusValue = normalizedUpdateData.maritalStatus ?? updateData.personal?.maritalStatus;
  const noOfChildrenValue = normalizedUpdateData.noOfChildren ?? updateData.personal?.noOfChildren;
  const employmentOfSpouseValue = normalizedUpdateData.employmentOfSpouse ?? updateData.personal?.employmentOfSpouse;
  const passportValue = normalizedUpdateData.passport ?? updateData.personal?.passport;

  // ✅ CRITICAL: Handle nested objects correctly
  // Remove nested contact (email, phone already at root)
  delete normalizedUpdateData.contact;

  // Remove nationality, religion, maritalStatus, etc from root level (they go in personal)
  delete normalizedUpdateData.nationality;
  delete normalizedUpdateData.religion;
  delete normalizedUpdateData.maritalStatus;
  delete normalizedUpdateData.noOfChildren;
  delete normalizedUpdateData.employmentOfSpouse;
  delete normalizedUpdateData.passport;

  // ✅ CRITICAL: Build/merge personal object with extracted values
  if (nationalityValue || religionValue || maritalStatusValue || noOfChildrenValue !== undefined || employmentOfSpouseValue || passportValue) {
    if (!normalizedUpdateData.personal) {
      normalizedUpdateData.personal = {};
    }

    if (nationalityValue) normalizedUpdateData.personal.nationality = nationalityValue;
    if (religionValue) normalizedUpdateData.personal.religion = religionValue;
    if (maritalStatusValue) normalizedUpdateData.personal.maritalStatus = maritalStatusValue;
    if (noOfChildrenValue !== undefined) normalizedUpdateData.personal.noOfChildren = noOfChildrenValue;
    if (employmentOfSpouseValue) normalizedUpdateData.personal.employmentOfSpouse = employmentOfSpouseValue;
    if (passportValue) normalizedUpdateData.personal.passport = passportValue;
  }

  // Clean up the personal object - remove fields that are at root level
  if (normalizedUpdateData.personal && typeof normalizedUpdateData.personal === 'object') {
    // Remove these from personal since they're kept at root level
    delete normalizedUpdateData.personal.gender;
    delete normalizedUpdateData.personal.birthday; // Old field name
    delete normalizedUpdateData.personal.address; // Address is at root
  }

  // ✅ EMERGENCY CONTACT: Canonicalize to flat format (emergencyContact singular)
  // If emergencyContacts (plural array) was sent, convert to flat emergencyContact
  if (normalizedUpdateData.emergencyContacts !== undefined) {
    const src = Array.isArray(normalizedUpdateData.emergencyContacts)
      ? normalizedUpdateData.emergencyContacts[0]
      : normalizedUpdateData.emergencyContacts;
    if (src) {
      const phoneArr = Array.isArray(src.phone) ? src.phone : src.phone ? [src.phone] : [];
      normalizedUpdateData.emergencyContact = {
        name: src.name || '',
        relationship: src.relationship || '',
        phone: phoneArr[0] || '',
        phone2: phoneArr[1] || '',
      };
    }
    delete normalizedUpdateData.emergencyContacts; // Remove old array field
  }
  // If emergencyContact was sent with phone as array, convert to string
  if (normalizedUpdateData.emergencyContact && Array.isArray(normalizedUpdateData.emergencyContact.phone)) {
    const phoneArr = normalizedUpdateData.emergencyContact.phone;
    normalizedUpdateData.emergencyContact = {
      ...normalizedUpdateData.emergencyContact,
      phone: phoneArr[0] || '',
      phone2: normalizedUpdateData.emergencyContact.phone2 || phoneArr[1] || '',
    };
  }

  // ✅ BIO: Canonicalize to bio field only — stop writing to notes/about separately
  // If 'about' was sent, store as bio and clear the old 'about' and 'notes' fields
  if (normalizedUpdateData.about !== undefined) {
    normalizedUpdateData.bio = normalizedUpdateData.about;
    delete normalizedUpdateData.about;
    delete normalizedUpdateData.notes;
  }
  if (normalizedUpdateData.notes !== undefined && normalizedUpdateData.bio === undefined) {
    normalizedUpdateData.bio = normalizedUpdateData.notes;
    delete normalizedUpdateData.notes;
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

  // 🔐 CRITICAL: Sync Clerk lock status when employee status changes
  // Handle both employmentStatus and status field (for backward compatibility)

  // Get old status before update (prefer employmentStatus for consistency)
  const oldStatus = employee.employmentStatus || employee.status;

  // Determine which field was actually updated and use that for the new status
  // This ensures we detect the change even when only one field is updated
  let newStatus;
  if (normalizedUpdateData.employmentStatus !== undefined) {
    // employmentStatus was explicitly updated
    newStatus = normalizedUpdateData.employmentStatus;
  } else if (normalizedUpdateData.status !== undefined) {
    // Only status was updated
    newStatus = normalizedUpdateData.status;
  } else {
    // Neither status field was updated (edge case), use database value
    newStatus = updatedEmployee.employmentStatus || updatedEmployee.status;
  }

  // Check if status field was explicitly updated or if employmentStatus was updated
  const statusFieldUpdated = normalizedUpdateData.status !== undefined ||
                             normalizedUpdateData.employmentStatus !== undefined;

  // Also check if isActive changed to false - this should also lock the user
  const isActiveChanged = normalizedUpdateData.isActive !== undefined &&
                          employee.isActive !== updatedEmployee.isActive;

  if ((statusFieldUpdated && oldStatus !== newStatus) || isActiveChanged) {
    devLog('[Employee Controller] Status change detected - syncing with Clerk:', {
      clerkUserId: employee.clerkUserId,
      oldStatus,
      newStatus,
      oldIsActive: employee.isActive,
      newIsActive: updatedEmployee.isActive
    });

    // Sync with Clerk if clerkUserId exists
    // Pass the updated employee's isActive status so the function can make correct decision
    if (employee.clerkUserId) {
      try {
        const syncResult = await employeeStatusService.syncClerkLockStatus(
          employee.clerkUserId,
          newStatus,
          oldStatus,
          updatedEmployee.isActive  // Pass isActive to determine lock/unlock
        );

        devLog('[Employee Controller] Clerk lock sync result:', syncResult);

        if (!syncResult.success) {
          devError('[Employee Controller] Clerk lock sync failed:', syncResult.message);
          // Note: We continue with the update even if Clerk sync fails
          // The employee status is still updated in the database
        }
      } catch (clerkError) {
        devError('[Employee Controller] Error syncing Clerk lock status:', clerkError);
        // Continue with the update even if Clerk sync fails
      }
    }
  }

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

  // Lock user in Clerk if clerkUserId exists (prevent login while keeping account)
  if (employee.clerkUserId) {
    try {
      devLog('[Employee Controller] Locking Clerk user for soft delete:', employee.clerkUserId);
      const lockResult = await employeeStatusService.lockUserInClerk(employee.clerkUserId);
      devLog('[Employee Controller] Clerk lock result:', lockResult);

      // Note: We lock instead of delete to preserve the Clerk account
      // If the employee needs to be restored later, we can just unlock
    } catch (clerkError) {
      devError('[Employee Controller] Failed to lock Clerk user:', clerkError);
      // Continue with soft delete even if Clerk lock fails
      // The employee record will still be marked as deleted
    }
  }

  // Soft delete - set isDeleted flag
  const result = await collections.employees.updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        isDeleted: true,
        isActive: false,  // Also set isActive to false
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

      // Lock user in Clerk if clerkUserId exists (prevent login while keeping account)
      if (employee.clerkUserId) {
        try {
          devLog('[Employee Controller] Locking Clerk user for reassign-delete:', employee.clerkUserId);
          const lockResult = await employeeStatusService.lockUserInClerk(employee.clerkUserId);
          devLog('[Employee Controller] Clerk lock result:', lockResult);

          // Note: We lock instead of delete to preserve the Clerk account
          // If the employee needs to be restored later, we can just unlock
        } catch (clerkError) {
          devError('[Employee Controller] Failed to lock Clerk user:', clerkError);
          // Continue with soft delete even if Clerk lock fails
        }
      }

      // Soft delete employee
      const deleteResult = await collections.employees.updateOne(
        { _id: oldEmployeeId },
        {
          $set: {
            isDeleted: true,
            isActive: false,  // Also set isActive to false
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
  const { salary, bankDetails, emergencyContacts, ...sanitizedEmployee } = employee;
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
    'avatarUrl',  // Support frontend avatarUrl field
    'nationality',  // Personal information fields
    'religion',
    'maritalStatus',
    'noOfChildren',
    'passport'  // Passport information
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

  // ✅ Extract personal fields from root level and store in personal object
  // These fields are returned flattened by GET endpoints but stored in personal subdocument
  const nationalityValue = sanitizedUpdate.nationality;
  const religionValue = sanitizedUpdate.religion;
  const maritalStatusValue = sanitizedUpdate.maritalStatus;
  const noOfChildrenValue = sanitizedUpdate.noOfChildren;
  const passportValue = sanitizedUpdate.passport;

  // Remove from root level (they go in personal)
  delete sanitizedUpdate.nationality;
  delete sanitizedUpdate.religion;
  delete sanitizedUpdate.maritalStatus;
  delete sanitizedUpdate.noOfChildren;
  delete sanitizedUpdate.passport;

  // Build personal object with extracted values
  if (nationalityValue || religionValue || maritalStatusValue || noOfChildrenValue !== undefined || passportValue) {
    sanitizedUpdate.personal = {
      ...(employee.personal || {}), // Keep existing personal fields
      ...(nationalityValue && { nationality: nationalityValue }),
      ...(religionValue && { religion: religionValue }),
      ...(maritalStatusValue && { maritalStatus: maritalStatusValue }),
      ...(noOfChildrenValue !== undefined && { noOfChildren: noOfChildrenValue }),
      ...(passportValue && { passport: passportValue })
    };
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
        // Handle both departmentId (string) and department (ObjectId) field names
        departmentObjId: {
          $switch: {
            branches: [
              {
                case: { $and: [
                  { $ne: ['$departmentId', null] },
                  { $ne: ['$departmentId', ''] },
                  { $eq: [{ $type: '$departmentId' }, 'string'] }
                ]},
                then: { $toObjectId: '$departmentId' }
              },
              {
                case: { $eq: [{ $type: '$department' }, 'objectId'] },
                then: '$department'
              }
            ],
            default: null
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
          userName: empData.account?.userName,
          password: password,
          role: role,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: user.userId,
        updatedBy: user.userId,
        status: normalizeStatus(empData.status || 'Active')
      };

      // ✅ CRITICAL: Move nationality from root to personal.nationality for bulk upload
      if (employeeToInsert.nationality !== undefined) {
        if (!employeeToInsert.personal) {
          employeeToInsert.personal = {};
        }
        employeeToInsert.personal.nationality = employeeToInsert.nationality;
        delete employeeToInsert.nationality;
      }

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

/**
 * @desc    Send login credentials email to employee (generates a new password)
 * @route   POST /api/employees/:id/send-credentials
 * @access  Private (HR / Admin)
 */
export const sendEmployeeCredentials = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { id } = req.params;

  devLog('[Employee Controller] sendEmployeeCredentials - employeeId:', id);

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID');
  }

  const collections = getTenantCollections(user.companyId);
  const employee = await collections.employees.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!employee) {
    throw buildNotFoundError('Employee not found');
  }

  if (!employee.clerkUserId) {
    throw buildValidationError('clerkUserId', 'Employee has no linked Clerk account. Cannot update credentials.');
  }

  // Generate fresh secure password
  const newPassword = generateSecurePassword(12);

  // Update Clerk (primary auth)
  await clerkClient.users.updateUser(employee.clerkUserId, { password: newPassword });

  // Update DB (plaintext reference — Clerk is the auth source)
  await collections.employees.updateOne(
    { _id: employee._id },
    {
      $set: {
        'account.password': newPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  // Send credentials email
  const loginLink = process.env.FRONTEND_URL || 'https://app.manage-rtc.com';
  await sendEmployeeCredentialsEmail({
    to: employee.email,
    password: newPassword,
    userName: employee.email,
    loginLink,
    firstName: employee.firstName,
    lastName: employee.lastName,
    companyName: 'ManageRTC',
  });

  return sendSuccess(res, { email: employee.email }, `Credentials sent to ${employee.email} successfully`);
});

/**
 * @desc    HR changes employee password (no current password required)
 * @route   POST /api/employees/:id/change-password
 * @access  Private (HR / Admin)
 */
export const changeEmployeePassword = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { id } = req.params;
  const { newPassword, confirmPassword } = req.body;

  devLog('[Employee Controller] changeEmployeePassword - employeeId:', id);

  if (!newPassword || !confirmPassword) {
    throw buildValidationError('password', 'New password and confirm password are required');
  }

  if (newPassword !== confirmPassword) {
    throw buildValidationError('confirmPassword', 'Passwords do not match');
  }

  if (newPassword.length < 6) {
    throw buildValidationError('newPassword', 'Password must be at least 6 characters long');
  }

  if (!ObjectId.isValid(id)) {
    throw buildValidationError('id', 'Invalid employee ID');
  }

  const collections = getTenantCollections(user.companyId);
  const employee = await collections.employees.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!employee) {
    throw buildNotFoundError('Employee not found');
  }

  if (!employee.clerkUserId) {
    throw buildValidationError('clerkUserId', 'Employee has no linked Clerk account. Cannot update password.');
  }

  // Update Clerk
  try {
    await clerkClient.users.updateUser(employee.clerkUserId, { password: newPassword });
  } catch (clerkErr) {
    devError('[changeEmployeePassword] Clerk update failed:', clerkErr.message);
    throw buildValidationError('password', 'Failed to update password in authentication system. Please try again.');
  }

  // Update DB
  await collections.employees.updateOne(
    { _id: employee._id },
    {
      $set: {
        'account.password': newPassword,
        passwordChangedAt: new Date(),
        updatedAt: new Date()
      }
    }
  );

  // Notify employee via email (non-fatal)
  sendPasswordChangedEmail({
    to: employee.email,
    firstName: employee.firstName,
    lastName: employee.lastName,
    companyName: 'ManageRTC',
  }).catch(() => {});

  return sendSuccess(res, { email: employee.email }, `Password updated for ${employee.firstName} ${employee.lastName} and notification sent`);
});

export default {
  getEmployees,
  getActiveEmployeesList,
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
  serveEmployeeProfileImage,
  sendEmployeeCredentials,
  changeEmployeePassword,
};
