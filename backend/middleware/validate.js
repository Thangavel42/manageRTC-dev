/**
 * Validation Middleware for REST APIs
 * Validates request data using Joi schemas
 */

import Joi from 'joi';

/**
 * validate - Factory function to create validation middleware
 *
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Request property to validate ('body', 'query', 'params')
 * @returns {Function} Express middleware function
 */
export const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors, not just the first
      stripUnknown: true, // Remove unknown properties
      convert: true, // Attempt to convert types
    });

    if (error) {
      const validationErrors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      console.warn('[Validation Failed]', {
        requestId: req.id,
        property,
        errors: validationErrors,
      });

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: validationErrors,
          requestId: req.id || 'no-id',
        },
      });
    }

    // Replace request property with sanitized value
    // Note: Cannot directly assign to req.query in Express 4.17+ (read-only)
    // So we store the sanitized value in a custom property
    if (property === 'query') {
      req.validatedQuery = value;
    } else {
      req[property] = value;
    }

    next();
  };
};

/**
 * validateBody - Shortcut to validate request body
 */
export const validateBody = (schema) => validate(schema, 'body');

/**
 * validateQuery - Shortcut to validate query parameters
 */
export const validateQuery = (schema) => validate(schema, 'query');

/**
 * validateParams - Shortcut to validate URL parameters
 */
export const validateParams = (schema) => validate(schema, 'params');

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // MongoDB ObjectId validation
  objectId: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/, 'MongoDB ObjectId')
    .message('Invalid {{label}} format'),

  // Email validation
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),

  // Phone number validation (international format)
  phone: Joi.string()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .message('Invalid phone number format'),

  // Date validation (ISO 8601)
  isoDate: Joi.date().iso().messages({
    'date.format': 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
  }),

  // Pagination
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().max(100).allow('').empty('').default(''),
  },

  // Sorting
  sort: Joi.string()
    .pattern(/^[a-zA-Z0-9_.]+:(asc|desc)$/)
    .message('Invalid sort format. Use field:order (e.g., name:asc)'),
};

/**
 * Employee validation schemas
 */
export const employeeSchemas = {
  // Create employee
  create: Joi.object({
    firstName: Joi.string().min(2).max(50).trim().required().messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name cannot exceed 50 characters',
      'any.required': 'First name is required',
    }),

    lastName: Joi.string().min(1).max(50).trim().required().messages({
      'string.min': 'Last name must be at least 1 character',
      'string.max': 'Last name cannot exceed 50 characters',
      'any.required': 'Last name is required',
    }),

    email: commonSchemas.email,

    phone: commonSchemas.phone.optional(),

    // Support both flat and nested structures
    dateOfBirth: commonSchemas.isoDate.max('now').optional().messages({
      'date.max': 'Date of birth cannot be in the future',
    }),

    dateOfJoining: commonSchemas.isoDate.optional(),

    gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').optional(),

    address: Joi.object({
      street: Joi.string().max(200).allow('').optional(),
      city: Joi.string().max(100).allow('').optional(),
      state: Joi.string().max(100).allow('').optional(),
      country: Joi.string().max(100).allow('').optional(),
      postalCode: Joi.string().max(20).allow('').optional(),
      zipCode: Joi.string().max(20).allow('').optional(), // Support both naming conventions
    }).optional(),

    departmentId: commonSchemas.objectId.required().messages({
      'any.required': 'Department is required',
    }),

    designationId: commonSchemas.objectId.required().messages({
      'any.required': 'Designation is required',
    }),

    reportingTo: commonSchemas.objectId.optional(),

    employmentType: Joi.string()
      .valid('Full-time', 'Part-time', 'Contract', 'Intern')
      .required()
      .messages({
        'any.required': 'Employment type is required',
      }),

    salary: Joi.object({
      basic: Joi.number().min(0).optional(),
      hra: Joi.number().min(0).optional().default(0),
      allowances: Joi.number().min(0).optional().default(0),
      currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR').default('USD'),
    }).optional(),

    // Support nested personal object structure
    personal: Joi.object({
      gender: Joi.string()
        .valid('Male', 'Female', 'Other', 'Prefer not to say', 'male', 'female', 'other', '')
        .optional()
        .allow(''),
      birthday: Joi.date().optional().allow(null),
      address: Joi.object({
        street: Joi.string().allow('').optional(),
        city: Joi.string().allow('').optional(),
        state: Joi.string().allow('').optional(),
        postalCode: Joi.string().allow('').optional(),
        country: Joi.string().allow('').optional(),
      }).optional(),
    }).optional(),

    // Support nested account object structure
    account: Joi.object({
      role: Joi.string().allow('').optional(),
      userName: Joi.string().allow('').optional(),
    }).optional(),

    // Support contact object from frontend
    contact: Joi.object({
      email: Joi.string().email().optional(),
      phone: commonSchemas.phone.optional(),
    }).optional(),

    // Other fields from frontend
    employeeId: Joi.string().optional(),
    avatarUrl: Joi.string().uri().allow('').optional(),
    companyName: Joi.string().allow('').optional(),
    about: Joi.string().max(1000).allow('').optional(),
    status: Joi.string()
      .valid('Active', 'Inactive', 'On Notice', 'Resigned', 'Terminated', 'On Leave')
      .optional(),

    // Permissions data from frontend
    permissionsData: Joi.object({
      employeeId: Joi.string().optional(),
      permissions: Joi.object().optional(),
      enabledModules: Joi.object().optional(),
    }).optional(),
  }).options({ allowUnknown: false }),

  // Update employee
  update: Joi.object({
    firstName: Joi.string().min(1).max(50).trim().optional(),
    lastName: Joi.string().min(1).max(50).trim().optional(),
    email: commonSchemas.email.optional(),
    phone: commonSchemas.phone.optional(),
    dateOfBirth: commonSchemas.isoDate.max('now').optional(),
    gender: Joi.string().valid('Male', 'Female', 'Other', 'Prefer not to say').optional(),
    address: Joi.object({
      street: Joi.string().max(200).allow('').optional(),
      city: Joi.string().max(100).allow('').optional(),
      state: Joi.string().max(100).allow('').optional(),
      country: Joi.string().max(100).allow('').optional(),
      postalCode: Joi.string().max(20).allow('').optional(),
    }).optional(),
    departmentId: commonSchemas.objectId.optional(),
    designationId: commonSchemas.objectId.optional(),
    reportingTo: commonSchemas.objectId.optional(),
    employmentType: Joi.string().valid('Full-time', 'Part-time', 'Contract', 'Intern').optional(),
    status: Joi.string()
      .valid('Active', 'Probation', 'Resigned', 'Terminated', 'On Leave')
      .optional(),
    salary: Joi.object({
      basic: Joi.number().min(0).optional(),
      hra: Joi.number().min(0).optional(),
      allowances: Joi.number().min(0).optional(),
      currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR').optional(),
    }).optional(),
    // Profile image fields
    profileImage: Joi.string().uri().allow('').optional(),
    avatarUrl: Joi.string().uri().allow('').optional(),
    // Contact information
    contact: Joi.object({
      email: commonSchemas.email.optional(),
      phone: commonSchemas.phone.optional(),
    }).optional(),
    // Personal information
    personal: Joi.object({
      gender: Joi.string().optional(),
      birthday: commonSchemas.isoDate.optional(),
      maritalStatus: Joi.string().optional(),
      religion: Joi.string().optional(),
      employmentOfSpouse: Joi.boolean().optional(),
      noOfChildren: Joi.number().min(0).optional(),
      passport: Joi.object({
        number: Joi.string().optional(),
        issueDate: commonSchemas.isoDate.optional(),
        expiryDate: commonSchemas.isoDate.optional(),
        country: Joi.string().optional(),
      }).optional(),
      address: Joi.object({
        street: Joi.string().optional(),
        city: Joi.string().optional(),
        state: Joi.string().optional(),
        postalCode: Joi.string().optional(),
        country: Joi.string().optional(),
      }).optional(),
    }).optional(),
    // Account information
    account: Joi.object({
      role: Joi.string().allow('').optional(),
      userName: Joi.string().allow('').optional(),
    }).optional(),
    // Additional employee fields
    about: Joi.string().max(2000).allow('').optional(),
    dateOfJoining: commonSchemas.isoDate.optional(),
    notes: Joi.string().max(2000).allow('').optional(),
    // Permissions
    enabledModules: Joi.object().pattern(Joi.string(), Joi.boolean()).optional(),
    permissions: Joi.object()
      .pattern(
        Joi.string(),
        Joi.object({
          read: Joi.boolean().optional(),
          write: Joi.boolean().optional(),
          create: Joi.boolean().optional(),
          delete: Joi.boolean().optional(),
          import: Joi.boolean().optional(),
          export: Joi.boolean().optional(),
        })
      )
      .optional(),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update',
    })
    .unknown(true),

  // Reassign and delete employee
  reassignDelete: Joi.object({
    reassignTo: commonSchemas.objectId.required().messages({
      'any.required': 'Reassignment employee is required',
      'string.pattern.name': 'Invalid reassignment employee ID format',
    }),
  }).required(),

  // List employees (query params)
  list: Joi.object({
    ...commonSchemas.pagination,
    department: commonSchemas.objectId.optional(),
    designation: commonSchemas.objectId.optional(),
    status: Joi.string()
      .valid('Active', 'Probation', 'Resigned', 'Terminated', 'On Leave')
      .optional(),
    sortBy: Joi.string()
      .valid('firstName', 'lastName', 'email', 'employeeCode', 'joiningDate', 'createdAt')
      .default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

/**
 * Project validation schemas
 */
export const projectSchemas = {
  create: Joi.object({
    name: Joi.string().min(3).max(100).trim().required().messages({
      'string.min': 'Project name must be at least 3 characters',
      'string.max': 'Project name cannot exceed 100 characters',
      'any.required': 'Project name is required',
    }),

    description: Joi.string().max(500).allow('').optional(),

    client: Joi.string().required().trim().min(1).messages({
      'any.required': 'Client is required',
      'string.empty': 'Client cannot be empty',
    }),

    startDate: commonSchemas.isoDate.required().messages({
      'any.required': 'Start date is required',
    }),

    dueDate: commonSchemas.isoDate.required().messages({
      'any.required': 'Due date is required',
    }),

    priority: Joi.string().valid('High', 'Medium', 'Low').default('Medium'),

    teamLeader: Joi.array().items(commonSchemas.objectId).min(1).required().messages({
      'array.min': 'At least one team leader is required',
      'any.required': 'Team leader is required',
    }),

    teamMembers: Joi.array().items(commonSchemas.objectId).min(1).optional().messages({
      'array.min': 'At least one team member is required',
    }),

    projectManager: Joi.array().items(commonSchemas.objectId).optional(),

    projectValue: Joi.number().min(0).optional(),
  }).custom((value, helpers) => {
    // Validate startDate is before dueDate
    if (new Date(value.startDate) >= new Date(value.dueDate)) {
      return helpers.error('any.invalid', {
        message: 'Start date must be before due date',
      });
    }
    return value;
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(100).trim().optional(),
    description: Joi.string().max(500).allow('').optional(),
    client: Joi.string().trim().min(1).optional(),
    startDate: commonSchemas.isoDate.optional(),
    dueDate: commonSchemas.isoDate.optional(),
    priority: Joi.string().valid('High', 'Medium', 'Low').optional(),
    status: Joi.string().valid('Active', 'Completed', 'On Hold', 'Cancelled').optional(),
    teamLeader: Joi.array().items(commonSchemas.objectId).min(1).optional(),
    teamMembers: Joi.array().items(commonSchemas.objectId).min(1).optional(),
    projectManager: Joi.array().items(commonSchemas.objectId).optional(),
    projectValue: Joi.number().min(0).optional(),
    progress: Joi.number().min(0).max(100).optional(),
  }).min(1),

  list: Joi.object({
    ...commonSchemas.pagination,
    status: Joi.string().valid('Active', 'Completed', 'On Hold', 'Cancelled').optional(),
    priority: Joi.string().valid('High', 'Medium', 'Low').optional(),
    client: Joi.string().trim().optional(),
    sortBy: Joi.string()
      .valid('name', 'startDate', 'dueDate', 'priority', 'createdAt')
      .default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

/**
 * Task validation schemas
 */
export const taskSchemas = {
  create: Joi.object({
    title: Joi.string().min(3).max(200).trim().required().messages({
      'string.min': 'Task title must be at least 3 characters',
      'string.max': 'Task title cannot exceed 200 characters',
      'any.required': 'Task title is required',
    }),

    description: Joi.string().max(1000).allow('').optional(),

    projectId: commonSchemas.objectId.required().messages({
      'any.required': 'Project is required',
    }),

    assignee: Joi.array().items(commonSchemas.objectId).min(1).required().messages({
      'any.required': 'At least one assignee is required',
      'array.min': 'At least one assignee is required',
    }),

    status: Joi.string().trim().optional(), // Dynamic statuses from taskstatus collection

    priority: Joi.string().valid('High', 'Medium', 'Low').default('Medium'),

    startDate: commonSchemas.isoDate.optional(),
    dueDate: commonSchemas.isoDate.optional(),
    estimatedHours: Joi.number().min(0).optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
  }),

  update: Joi.object({
    title: Joi.string().min(3).max(200).trim().optional(),
    description: Joi.string().max(1000).allow('').optional(),
    assignee: Joi.array().items(commonSchemas.objectId).min(1).optional(),
    status: Joi.string().valid('To Do', 'In Progress', 'Review', 'Completed').optional(),
    priority: Joi.string().valid('High', 'Medium', 'Low').optional(),
    startDate: commonSchemas.isoDate.optional(),
    dueDate: commonSchemas.isoDate.optional(),
    estimatedHours: Joi.number().min(0).optional(),
    actualHours: Joi.number().min(0).optional(),
    progress: Joi.number().min(0).max(100).optional(),
    tags: Joi.array().items(Joi.string().max(50)).optional(),
  }).min(1),

  list: Joi.object({
    ...commonSchemas.pagination,
    project: commonSchemas.objectId.optional(),
    assignee: commonSchemas.objectId.optional(),
    status: Joi.string().valid('To Do', 'In Progress', 'Review', 'Completed').optional(),
    priority: Joi.string().valid('High', 'Medium', 'Low').optional(),
    sortBy: Joi.string().valid('title', 'dueDate', 'priority', 'createdAt').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

/**
 * Lead validation schemas
 */
export const leadSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(200).trim().required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 200 characters',
      'any.required': 'Name is required',
    }),

    company: Joi.string().max(200).allow('').optional(),

    email: Joi.string().email().allow('').optional(),

    phone: commonSchemas.phone.optional(),

    source: Joi.string()
      .valid('Website', 'Referral', 'Cold Call', 'Social Media', 'Email Campaign', 'Event', 'Other')
      .optional(),

    assigneeId: commonSchemas.objectId.optional(),

    estimatedValue: Joi.number().min(0).optional(),

    notes: Joi.string().max(1000).allow('').optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(200).trim().optional(),
    company: Joi.string().max(200).allow('').optional(),
    email: Joi.string().email().allow('').optional(),
    phone: commonSchemas.phone.optional(),
    status: Joi.string()
      .valid('New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost')
      .optional(),
    source: Joi.string()
      .valid('Website', 'Referral', 'Cold Call', 'Social Media', 'Email Campaign', 'Event', 'Other')
      .optional(),
    assigneeId: commonSchemas.objectId.optional(),
    estimatedValue: Joi.number().min(0).optional(),
    probability: Joi.number().min(0).max(100).optional(),
    notes: Joi.string().max(1000).allow('').optional(),
  }).min(1),

  list: Joi.object({
    ...commonSchemas.pagination,
    status: Joi.string()
      .valid('New', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost')
      .optional(),
    source: Joi.string()
      .valid('Website', 'Referral', 'Cold Call', 'Social Media', 'Email Campaign', 'Event', 'Other')
      .optional(),
    assignee: commonSchemas.objectId.optional(),
    sortBy: Joi.string().valid('name', 'createdAt', 'estimatedValue').default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

/**
 * Client validation schemas
 */
export const clientSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(200).trim().required().messages({
      'string.min': 'Client name must be at least 2 characters',
      'string.max': 'Client name cannot exceed 200 characters',
      'any.required': 'Client name is required',
    }),

    company: Joi.string().min(2).max(200).trim().required().messages({
      'string.min': 'Company name must be at least 2 characters',
      'string.max': 'Company name cannot exceed 200 characters',
      'any.required': 'Company name is required',
    }),

    email: Joi.string().email().allow('').optional(),

    phone: Joi.string().max(20).allow('').optional(),

    address: Joi.string().max(500).allow('').optional(),

    logo: Joi.string().allow('').optional(),

    contractValue: Joi.number().min(0).optional(),

    status: Joi.string().valid('Active', 'Inactive').optional(),

    projects: Joi.number().min(0).optional(),

    socialLinks: Joi.object({
      instagram: Joi.string().allow('').optional(),
      facebook: Joi.string().allow('').optional(),
      linkedin: Joi.string().allow('').optional(),
      whatsapp: Joi.string().allow('').optional(),
    }).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(200).trim().optional(),
    company: Joi.string().min(2).max(200).trim().optional(),
    email: Joi.string().email().allow('').optional(),
    phone: Joi.string().max(20).allow('').optional(),
    address: Joi.string().max(500).allow('').optional(),
    logo: Joi.string().allow('').optional(),
    contractValue: Joi.number().min(0).optional(),
    status: Joi.string().valid('Active', 'Inactive').optional(),
    projects: Joi.number().min(0).optional(),
    socialLinks: Joi.object({
      instagram: Joi.string().allow('').optional(),
      facebook: Joi.string().allow('').optional(),
      linkedin: Joi.string().allow('').optional(),
      whatsapp: Joi.string().allow('').optional(),
    }).optional(),
  }).min(1),

  list: Joi.object({
    ...commonSchemas.pagination,
    status: Joi.string().valid('Active', 'Inactive').optional(),
    sortBy: Joi.string()
      .valid('name', 'company', 'createdAt', 'contractValue')
      .default('createdAt'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

/**
 * Attendance validation schemas
 */
export const attendanceSchemas = {
  clockIn: Joi.object({
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      address: Joi.string().max(200).allow('').optional(),
    }).optional(),
  }),

  clockOut: Joi.object({
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      address: Joi.string().max(200).allow('').optional(),
    }).optional(),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    dateFrom: commonSchemas.isoDate.optional(),
    dateTo: commonSchemas.isoDate.optional(),
    employeeId: commonSchemas.objectId.optional(),
    status: Joi.string().valid('Present', 'Absent', 'Half Day', 'Late').optional(),
  }).custom((value, helpers) => {
    // Validate date range
    if (value.dateFrom && value.dateTo) {
      if (new Date(value.dateFrom) > new Date(value.dateTo)) {
        return helpers.error('any.invalid', {
          message: 'dateFrom must be before dateTo',
        });
      }
    }
    return value;
  }),
};

/**
 * Leave validation schemas
 */
export const leaveSchemas = {
  create: Joi.object({
    leaveTypeId: commonSchemas.objectId.required().messages({
      'any.required': 'Leave type is required',
    }),

    fromDate: commonSchemas.isoDate.required().messages({
      'any.required': 'From date is required',
    }),

    toDate: commonSchemas.isoDate.required().messages({
      'any.required': 'To date is required',
    }),

    numberOfDays: Joi.number().integer().min(0.5).max(365).required().messages({
      'any.required': 'Number of days is required',
    }),

    reason: Joi.string().max(500).required().messages({
      'any.required': 'Reason is required',
    }),

    isHalfDay: Joi.boolean().default(false),
  }).custom((value, helpers) => {
    // Validate date range
    if (new Date(value.fromDate) > new Date(value.toDate)) {
      return helpers.error('any.invalid', {
        message: 'From date must be before to date',
      });
    }
    return value;
  }),

  approve: Joi.object({
    comments: Joi.string().max(500).allow('').optional(),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    status: Joi.string().valid('Pending', 'Approved', 'Rejected', 'Cancelled').optional(),
    dateFrom: commonSchemas.isoDate.optional(),
    dateTo: commonSchemas.isoDate.optional(),
  }),
};

/**
 * Shift validation schemas
 */
export const shiftSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).trim().required().messages({
      'string.min': 'Shift name must be at least 2 characters',
      'string.max': 'Shift name cannot exceed 100 characters',
      'any.required': 'Shift name is required',
    }),

    code: Joi.string().min(1).max(20).trim().uppercase().optional().messages({
      'string.min': 'Shift code must be at least 1 character',
      'string.max': 'Shift code cannot exceed 20 characters',
    }),

    startTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required()
      .messages({
        'string.pattern.base': 'Start time must be in HH:MM format (24-hour)',
        'any.required': 'Start time is required',
      }),

    endTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .required()
      .messages({
        'string.pattern.base': 'End time must be in HH:MM format (24-hour)',
        'any.required': 'End time is required',
      }),

    duration: Joi.number().min(0.5).max(24).required().messages({
      'number.min': 'Duration must be at least 0.5 hours',
      'number.max': 'Duration cannot exceed 24 hours',
      'any.required': 'Duration is required',
    }),

    timezone: Joi.string().default('UTC').optional(),

    description: Joi.string().max(500).allow('').optional(),

    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Color must be a valid hex code (e.g., #FF5733)',
      }),

    isActive: Joi.boolean().default(true),

    isDefault: Joi.boolean().default(false),

    // Grace period settings
    gracePeriod: Joi.number().integer().min(0).max(120).default(0).optional().messages({
      'number.min': 'Grace period cannot be negative',
      'number.max': 'Grace period cannot exceed 120 minutes',
    }),

    earlyDepartureAllowance: Joi.number().integer().min(0).max(120).default(0).optional().messages({
      'number.min': 'Early departure allowance cannot be negative',
      'number.max': 'Early departure allowance cannot exceed 120 minutes',
    }),

    minHoursForFullDay: Joi.number().min(1).max(12).default(8).optional().messages({
      'number.min': 'Minimum hours must be at least 1',
      'number.max': 'Minimum hours cannot exceed 12',
    }),

    // Overtime settings
    overtime: Joi.object({
      enabled: Joi.boolean().default(false),
      threshold: Joi.number().min(0).max(24).default(8).optional(),
      multiplier: Joi.number().min(1).max(3).default(1.5).optional(),
    }).optional(),

    // Break settings
    breakSettings: Joi.object({
      enabled: Joi.boolean().default(false),
      duration: Joi.number().min(0).max(480).default(0).optional().messages({
        'number.max': 'Break duration cannot exceed 480 minutes (8 hours)',
      }),
      maxDuration: Joi.number().min(0).max(480).default(60).optional(),
    }).optional(),

    // Flexible hours
    flexibleHours: Joi.object({
      enabled: Joi.boolean().default(false),
      windowStart: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .optional(),
      windowEnd: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .optional(),
      minHours: Joi.number().min(1).max(12).default(8).optional(),
    }).optional(),

    // Working days
    workingDays: Joi.array()
      .items(
        Joi.string().valid(
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday'
        )
      )
      .min(1)
      .default(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'])
      .optional()
      .messages({
        'array.min': 'At least one working day is required',
      }),

    // Shift type
    shiftType: Joi.string()
      .valid('regular', 'night', 'rotating', 'flexible', 'custom')
      .default('regular')
      .optional(),

    // Rotation settings (for rotating shifts)
    rotation: Joi.object({
      enabled: Joi.boolean().default(false),
      cycleDays: Joi.number().integer().min(1).max(30).default(7).optional(),
      rotateShifts: Joi.array().items(commonSchemas.objectId).optional(),
    }).optional(),
  }).custom((value, helpers) => {
    // Validate endTime is after startTime
    const [startHour, startMin] = value.startTime.split(':').map(Number);
    const [endHour, endMin] = value.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      return helpers.error('any.invalid', {
        message: 'End time must be after start time',
      });
    }

    // Validate flexible hours window if enabled
    if (value.flexibleHours?.enabled) {
      if (value.flexibleHours.windowStart && value.flexibleHours.windowEnd) {
        const [flexStartHour, flexStartMin] = value.flexibleHours.windowStart
          .split(':')
          .map(Number);
        const [flexEndHour, flexEndMin] = value.flexibleHours.windowEnd.split(':').map(Number);
        const flexStartMinutes = flexStartHour * 60 + flexStartMin;
        const flexEndMinutes = flexEndHour * 60 + flexEndMin;

        if (flexEndMinutes <= flexStartMinutes) {
          return helpers.error('any.invalid', {
            message: 'Flexible hours window end must be after start',
          });
        }
      }
    }

    return value;
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).trim().optional(),
    code: Joi.string().min(1).max(20).trim().uppercase().optional(),
    startTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional(),
    endTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional(),
    duration: Joi.number().min(0.5).max(24).optional(),
    timezone: Joi.string().optional(),
    description: Joi.string().max(500).allow('').optional(),
    color: Joi.string()
      .pattern(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    isActive: Joi.boolean().optional(),
    isDefault: Joi.boolean().optional(),
    gracePeriod: Joi.number().integer().min(0).max(120).optional(),
    earlyDepartureAllowance: Joi.number().integer().min(0).max(120).optional(),
    minHoursForFullDay: Joi.number().min(1).max(12).optional(),
    overtime: Joi.object({
      enabled: Joi.boolean().optional(),
      threshold: Joi.number().min(0).max(24).optional(),
      multiplier: Joi.number().min(1).max(3).optional(),
    }).optional(),
    breakSettings: Joi.object({
      enabled: Joi.boolean().optional(),
      duration: Joi.number().min(0).max(480).optional(),
      maxDuration: Joi.number().min(0).max(480).optional(),
    }).optional(),
    flexibleHours: Joi.object({
      enabled: Joi.boolean().optional(),
      windowStart: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .optional(),
      windowEnd: Joi.string()
        .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
        .optional(),
      minHours: Joi.number().min(1).max(12).optional(),
    }).optional(),
    workingDays: Joi.array()
      .items(
        Joi.string().valid(
          'Sunday',
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday'
        )
      )
      .min(1)
      .optional(),
    shiftType: Joi.string().valid('regular', 'night', 'rotating', 'flexible', 'custom').optional(),
    rotation: Joi.object({
      enabled: Joi.boolean().optional(),
      cycleDays: Joi.number().integer().min(1).max(30).optional(),
      rotateShifts: Joi.array().items(commonSchemas.objectId).optional(),
    }).optional(),
  })
    .min(1)
    .message('At least one field must be provided for update'),

  assign: Joi.object({
    employeeId: Joi.string().required().messages({
      'any.required': 'Employee ID is required',
    }),
    shiftId: commonSchemas.objectId.required().messages({
      'any.required': 'Shift ID is required',
    }),
    effectiveDate: commonSchemas.isoDate.optional(),
  }),

  bulkAssign: Joi.object({
    employeeIds: Joi.array().items(Joi.string()).min(1).required().messages({
      'any.required': 'Employee IDs array is required',
      'array.min': 'At least one employee ID is required',
    }),
    shiftId: commonSchemas.objectId.required().messages({
      'any.required': 'Shift ID is required',
    }),
    effectiveDate: commonSchemas.isoDate.optional(),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().max(100).allow('').optional(),
    isActive: Joi.boolean().optional(),
    isDefault: Joi.boolean().optional(),
    sortBy: Joi.string().valid('name', 'code', 'startTime', 'endTime', 'createdAt').default('name'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

/**
 * Timesheet validation schemas
 */
export const timesheetSchemas = {
  createTimeEntry: Joi.object({
    projectId: commonSchemas.objectId.required().messages({
      'any.required': 'Project is required',
    }),

    taskId: commonSchemas.objectId.optional(),

    milestoneId: commonSchemas.objectId.optional(),

    description: Joi.string().min(5).max(1000).trim().required().messages({
      'string.min': 'Description must be at least 5 characters',
      'string.max': 'Description cannot exceed 1000 characters',
      'any.required': 'Description is required',
    }),

    duration: Joi.number().min(0.25).max(24).required().messages({
      'number.min': 'Duration must be at least 0.25 hours (15 minutes)',
      'number.max': 'Duration cannot exceed 24 hours',
      'any.required': 'Duration is required',
    }),

    date: commonSchemas.isoDate.required().messages({
      'any.required': 'Date is required',
    }),

    billable: Joi.boolean().default(false),

    billRate: Joi.number().min(0).optional().messages({
      'number.min': 'Bill rate cannot be negative',
    }),

    status: Joi.string()
      .valid('draft', 'submitted', 'approved', 'rejected')
      .default('draft')
      .optional(),
  }).custom((value, helpers) => {
    // Validate date is not in the future
    if (new Date(value.date) > new Date()) {
      return helpers.error('any.invalid', {
        message: 'Date cannot be in the future',
      });
    }
    return value;
  }),

  updateTimeEntry: Joi.object({
    projectId: commonSchemas.objectId.optional(),
    taskId: commonSchemas.objectId.optional(),
    milestoneId: commonSchemas.objectId.optional(),
    description: Joi.string().min(5).max(1000).trim().optional(),
    duration: Joi.number().min(0.25).max(24).optional(),
    date: commonSchemas.isoDate.optional(),
    billable: Joi.boolean().optional(),
    billRate: Joi.number().min(0).optional(),
    status: Joi.string().valid('draft', 'submitted', 'approved', 'rejected').optional(),
  })
    .min(1)
    .message('At least one field must be provided for update'),

  submitTimesheet: Joi.object({
    startDate: commonSchemas.isoDate.required().messages({
      'any.required': 'Start date is required',
    }),
    endDate: commonSchemas.isoDate.required().messages({
      'any.required': 'End date is required',
    }),
  }).custom((value, helpers) => {
    // Validate date range
    if (new Date(value.startDate) > new Date(value.endDate)) {
      return helpers.error('any.invalid', {
        message: 'Start date must be before end date',
      });
    }
    // Validate range is not more than 31 days
    const daysDiff = Math.ceil(
      (new Date(value.endDate) - new Date(value.startDate)) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 31) {
      return helpers.error('any.invalid', {
        message: 'Timesheet period cannot exceed 31 days',
      });
    }
    return value;
  }),

  approveTimesheet: Joi.object({
    timeEntryIds: Joi.array().items(commonSchemas.objectId).min(1).required().messages({
      'any.required': 'Time entry IDs array is required',
      'array.min': 'At least one time entry ID is required',
    }),
    comments: Joi.string().max(500).allow('').optional(),
  }),

  rejectTimesheet: Joi.object({
    timeEntryIds: Joi.array().items(commonSchemas.objectId).min(1).required().messages({
      'any.required': 'Time entry IDs array is required',
      'array.min': 'At least one time entry ID is required',
    }),
    reason: Joi.string().min(5).max(500).required().messages({
      'string.min': 'Rejection reason must be at least 5 characters',
      'string.max': 'Rejection reason cannot exceed 500 characters',
      'any.required': 'Rejection reason is required',
    }),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    projectId: commonSchemas.objectId.optional(),
    taskId: commonSchemas.objectId.optional(),
    employeeId: Joi.string().optional(),
    status: Joi.string().valid('draft', 'submitted', 'approved', 'rejected').optional(),
    dateFrom: commonSchemas.isoDate.optional(),
    dateTo: commonSchemas.isoDate.optional(),
    billable: Joi.boolean().optional(),
    sortBy: Joi.string().valid('date', 'duration', 'createdAt', 'status').default('date'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }).custom((value, helpers) => {
    // Validate date range
    if (value.dateFrom && value.dateTo) {
      if (new Date(value.dateFrom) > new Date(value.dateTo)) {
        return helpers.error('any.invalid', {
          message: 'dateFrom must be before dateTo',
        });
      }
    }
    return value;
  }),
};

/**
 * NoSQL injection protection
 * Sanitizes MongoDB operators from query objects
 */
export const sanitizeMongoQuery = (query) => {
  const dangerousKeys = [
    '$where',
    '$ne',
    '$in',
    '$nin',
    '$gt',
    '$gte',
    '$lt',
    '$lte',
    '$exists',
    '$type',
    '$mod',
    '$regex',
    '$or',
    '$and',
    '$not',
    '$nor',
  ];

  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }

    const sanitized = {};
    for (const key in obj) {
      if (dangerousKeys.some((dangerous) => key.startsWith(dangerous))) {
        console.warn('[Security] Blocked MongoDB operator in query:', key);
        continue;
      }
      sanitized[key] = sanitize(obj[key]);
    }
    return sanitized;
  };

  return sanitize(query);
};

export default {
  validate,
  validateBody,
  validateQuery,
  validateParams,
  commonSchemas,
  employeeSchemas,
  projectSchemas,
  taskSchemas,
  leadSchemas,
  clientSchemas,
  attendanceSchemas,
  leaveSchemas,
  shiftSchemas,
  timesheetSchemas,
  sanitizeMongoQuery,
};
