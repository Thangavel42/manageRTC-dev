/**
 * Validation Middleware for REST APIs
 * Validates request data using Joi schemas
 */

import Joi from 'joi';
import { DateTime } from 'luxon';

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
      'string.email': 'Please enter a valid email address',
      'string.empty': 'Email address is required',
      'any.required': 'Email address is required',
    }),

  // Phone number validation (international format)
  phone: Joi.string()
    .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .messages({
      'string.pattern.base': 'Please enter a valid phone number',
      'string.empty': 'Phone number is required',
    }),

  // Date validation (ISO 8601)
  isoDate: Joi.date().iso().messages({
    'date.format': 'Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)',
  }),

  // Date validation (DD-MM-YYYY)
  ddmmyyyy: Joi.string()
    .custom((value, helpers) => {
      if (value === '' || value === null) return value;
      const dt = DateTime.fromFormat(value, 'dd-MM-yyyy', { zone: 'utc' });
      if (!dt.isValid) {
        return helpers.message('Date must be in DD-MM-YYYY format');
      }
      return value;
    })
    .messages({
      'string.base': 'Date must be a string in DD-MM-YYYY format',
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
    dateOfBirth: commonSchemas.ddmmyyyy.optional().allow('', null).custom((value, helpers) => {
      if (value === '' || value === null) return value;
      const dt = DateTime.fromFormat(value, 'dd-MM-yyyy', { zone: 'utc' });
      if (dt.isValid && dt > DateTime.utc().startOf('day')) {
        return helpers.message('Date of birth cannot be in the future');
      }
      return value;
    }),

    dateOfJoining: commonSchemas.ddmmyyyy.optional().allow('', null),

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
      birthday: commonSchemas.ddmmyyyy.optional().allow('', null),
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
    }).optional(),

    // Support contact object from frontend
    contact: Joi.object({
      email: Joi.string().email().optional(),
      phone: commonSchemas.phone.optional(),
    }).optional(),

    // Other fields from frontend
    employeeId: Joi.string().optional(),
    avatarUrl: Joi.string().allow('', 'assets/img/profiles/profile.png').optional(),
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
    dateOfBirth: commonSchemas.ddmmyyyy.optional().allow('', null).custom((value, helpers) => {
      if (value === '' || value === null) return value;
      const dt = DateTime.fromFormat(value, 'dd-MM-yyyy', { zone: 'utc' });
      if (dt.isValid && dt > DateTime.utc().startOf('day')) {
        return helpers.message('Date of birth cannot be in the future');
      }
      return value;
    }),
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
      .valid('Active', 'Inactive', 'On Notice', 'Probation', 'Resigned', 'Terminated', 'On Leave')
      .optional(),
    salary: Joi.object({
      basic: Joi.number().min(0).optional(),
      hra: Joi.number().min(0).optional(),
      allowances: Joi.number().min(0).optional(),
      currency: Joi.string().valid('USD', 'EUR', 'GBP', 'INR').optional(),
    }).optional(),
    // Profile image fields - allow any string (validation happens in controller)
    profileImage: Joi.string().allow('', 'assets/img/profiles/profile.png').optional(),
    avatarUrl: Joi.string().allow('', 'assets/img/profiles/profile.png').optional(),
    // Contact information
    contact: Joi.object({
      email: commonSchemas.email.optional(),
      phone: commonSchemas.phone.optional(),
    }).optional(),
    // Personal information
    personal: Joi.object({
      gender: Joi.string().optional(),
      birthday: commonSchemas.ddmmyyyy.optional().allow('', null),
      maritalStatus: Joi.string().optional(),
      religion: Joi.string().allow('').optional(),
      employmentOfSpouse: Joi.boolean().optional(),
      noOfChildren: Joi.number().min(0).optional(),
      passport: Joi.object({
        number: Joi.string().optional(),
        issueDate: commonSchemas.ddmmyyyy.optional().allow('', null),
        expiryDate: commonSchemas.ddmmyyyy.optional().allow('', null),
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
    // Bank information
    bank: Joi.object({
      accountHolderName: Joi.string().allow('').optional(),
      accountNumber: Joi.string().allow('').optional(),
      bankName: Joi.string().allow('').optional(),
      branch: Joi.string().allow('').optional(),
      ifscCode: Joi.string().allow('').optional(),
    }).optional(),
    // Emergency contacts
    emergencyContacts: Joi.array().items(
      Joi.object({
        name: Joi.string().allow('').optional(),
        relationship: Joi.string().allow('').optional(),
        phone: Joi.array().items(Joi.string().allow('')).optional(),
      }).unknown(true)
    ).optional(),
    // Family information
    family: Joi.array().items(
      Joi.object({
        Name: Joi.string().allow('').optional(),
        relationship: Joi.string().allow('').optional(),
        phone: Joi.string().allow('').optional(),
      }).unknown(true)
    ).optional(),
    // Education information
    education: Joi.array().items(
      Joi.object({
        degree: Joi.string().allow('').optional(),
        institution: Joi.string().allow('').optional(),
        startDate: commonSchemas.ddmmyyyy.optional().allow('', null),
        endDate: commonSchemas.ddmmyyyy.optional().allow('', null),
        grade: Joi.string().allow('').optional(),
      }).unknown(true)
    ).optional(),
    // Experience information
    experience: Joi.array().items(
      Joi.object({
        previousCompany: Joi.string().allow('').optional(),
        designation: Joi.string().allow('').optional(),
        startDate: commonSchemas.ddmmyyyy.optional().allow('', null),
        endDate: commonSchemas.ddmmyyyy.optional().allow('', null),
        currentlyWorking: Joi.boolean().optional(),
      }).unknown(true)
    ).optional(),
    // Account information
    account: Joi.object({
      role: Joi.string().allow('').optional(),
      userName: Joi.string().allow('').optional(),
    }).optional(),
    // Additional employee fields
    about: Joi.string().max(2000).allow('').optional(),
    dateOfJoining: commonSchemas.ddmmyyyy.optional().allow('', null),
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
    role: Joi.string()
      .valid('employee', 'manager', 'hr', 'admin', 'superadmin')
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
 * Weekly Timesheet validation schemas (new structure)
 */
export const weeklyTimesheetSchemas = {
  create: Joi.object({
    weekStart: commonSchemas.isoDate.required().messages({
      'any.required': 'Week start date is required',
    }),
    entries: Joi.array().items(
      Joi.object({
        date: commonSchemas.isoDate.required(),
        project: commonSchemas.objectId.optional(),
        task: Joi.string().max(200).optional(),
        description: Joi.string().min(5).max(500).required(),
        hours: Joi.number().min(0.25).max(24).required(),
        isBillable: Joi.boolean().default(false),
      })
    ).min(1).required().messages({
      'array.min': 'At least one entry is required',
      'any.required': 'Entries are required',
    }),
    notes: Joi.string().max(1000).allow('').optional(),
  }),

  update: Joi.object({
    entries: Joi.array().items(
      Joi.object({
        date: commonSchemas.isoDate.required(),
        project: commonSchemas.objectId.optional(),
        task: Joi.string().max(200).optional(),
        description: Joi.string().min(5).max(500).required(),
        hours: Joi.number().min(0.25).max(24).required(),
        isBillable: Joi.boolean().default(false),
      })
    ).min(1).required(),
    notes: Joi.string().max(1000).allow('').optional(),
  }),

  approveReject: Joi.object({
    comments: Joi.string().max(1000).allow('').optional(),
    reason: Joi.string().min(5).max(1000).optional(),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    status: Joi.string().valid('draft', 'submitted', 'approved', 'rejected', 'cancelled').optional(),
    employee: Joi.string().optional(),
    weekStart: commonSchemas.isoDate.optional(),
    weekEnd: commonSchemas.isoDate.optional(),
  }),
};

/**
 * Department validation schemas
 */
export const departmentSchemas = {
  create: Joi.object({
    departmentId: Joi.string().min(2).max(50).trim().required().messages({
      'string.min': 'Department ID must be at least 2 characters',
      'string.max': 'Department ID cannot exceed 50 characters',
      'any.required': 'Department ID is required',
    }),
    name: Joi.string().min(2).max(100).trim().required().messages({
      'string.min': 'Department name must be at least 2 characters',
      'string.max': 'Department name cannot exceed 100 characters',
      'any.required': 'Department name is required',
    }),
    code: Joi.string().min(1).max(20).trim().uppercase().optional().messages({
      'string.min': 'Department code must be at least 1 character',
      'string.max': 'Department code cannot exceed 20 characters',
    }),
    description: Joi.string().max(1000).allow('').optional(),
    managerId: commonSchemas.objectId.optional(),
    parentDepartmentId: commonSchemas.objectId.optional().messages({
      'string.pattern.name': 'Invalid parent department ID format',
    }),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional().messages({
      'string.pattern.base': 'Color must be a valid hex code (e.g., #FF5733)',
    }),
    location: Joi.string().max(200).allow('').optional(),
    budget: Joi.number().min(0).optional(),
    status: Joi.string().valid('Active', 'Inactive').default('Active').optional(),
  }).custom((value, helpers) => {
    // Validate parentDepartmentId is not same as department being created
    // Note: This validation happens after creation, so we just check format here
    return value;
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).trim().optional(),
    code: Joi.string().min(1).max(20).trim().uppercase().optional(),
    description: Joi.string().max(1000).allow('').optional(),
    managerId: commonSchemas.objectId.optional(),
    parentDepartmentId: commonSchemas.objectId.optional(),
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
    location: Joi.string().max(200).allow('').optional(),
    budget: Joi.number().min(0).optional(),
    status: Joi.string().valid('Active', 'Inactive').optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    status: Joi.string().valid('Active', 'Inactive').optional(),
    managerId: commonSchemas.objectId.optional(),
    parentDepartmentId: commonSchemas.objectId.optional(),
    sortBy: Joi.string().valid('name', 'code', 'createdAt', 'status').default('name'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

/**
 * Designation validation schemas
 */
export const designationSchemas = {
  create: Joi.object({
    designationId: Joi.string().min(2).max(50).trim().required().messages({
      'string.min': 'Designation ID must be at least 2 characters',
      'string.max': 'Designation ID cannot exceed 50 characters',
      'any.required': 'Designation ID is required',
    }),
    title: Joi.string().min(2).max(100).trim().required().messages({
      'string.min': 'Designation title must be at least 2 characters',
      'string.max': 'Designation title cannot exceed 100 characters',
      'any.required': 'Designation title is required',
    }),
    code: Joi.string().min(1).max(20).trim().uppercase().optional(),
    description: Joi.string().max(1000).allow('').optional(),
    level: Joi.string()
      .valid('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Senior Manager', 'Director', 'VP', 'C-Level', 'Executive')
      .required()
      .messages({
        'any.required': 'Designation level is required',
      }),
    levelNumber: Joi.number().integer().min(1).max(12).default(1).optional(),
    rank: Joi.number().min(0).default(0).optional(),
    departmentId: commonSchemas.objectId.optional(),
    isDepartmentSpecific: Joi.boolean().default(true).optional(),
    reportsTo: commonSchemas.objectId.optional(),
    manages: Joi.array().items(commonSchemas.objectId).optional(),
    compensationRange: Joi.object({
      currency: Joi.string().default('USD').optional(),
      min: Joi.number().min(0).default(0).optional(),
      max: Joi.number().min(0).default(0).optional(),
      median: Joi.number().min(0).default(0).optional(),
    }).optional(),
  }).custom((value, helpers) => {
    // Validate compensation range min <= median <= max
    if (value.compensationRange) {
      const { min, max, median } = value.compensationRange;
      if (min > max) {
        return helpers.error('any.invalid', {
          message: 'Minimum compensation cannot exceed maximum',
        });
      }
      if (median < min || median > max) {
        return helpers.error('any.invalid', {
          message: 'Median compensation must be between minimum and maximum',
        });
      }
    }
    return value;
  }),

  update: Joi.object({
    title: Joi.string().min(2).max(100).trim().optional(),
    code: Joi.string().min(1).max(20).trim().uppercase().optional(),
    description: Joi.string().max(1000).allow('').optional(),
    level: Joi.string()
      .valid('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Senior Manager', 'Director', 'VP', 'C-Level', 'Executive')
      .optional(),
    levelNumber: Joi.number().integer().min(1).max(12).optional(),
    rank: Joi.number().min(0).optional(),
    departmentId: commonSchemas.objectId.optional(),
    isDepartmentSpecific: Joi.boolean().optional(),
    reportsTo: commonSchemas.objectId.optional(),
    manages: Joi.array().items(commonSchemas.objectId).optional(),
    compensationRange: Joi.object({
      currency: Joi.string().optional(),
      min: Joi.number().min(0).optional(),
      max: Joi.number().min(0).optional(),
      median: Joi.number().min(0).optional(),
    }).optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    level: Joi.string()
      .valid('Entry', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager', 'Senior Manager', 'Director', 'VP', 'C-Level', 'Executive')
      .optional(),
    departmentId: commonSchemas.objectId.optional(),
    sortBy: Joi.string().valid('title', 'code', 'level', 'levelNumber', 'createdAt').default('levelNumber'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

/**
 * Policy validation schemas
 */
export const policySchemas = {
  create: Joi.object({
    policyName: Joi.string().min(3).max(200).trim().required().messages({
      'string.min': 'Policy name must be at least 3 characters',
      'string.max': 'Policy name cannot exceed 200 characters',
      'any.required': 'Policy name is required',
    }),
    policyDescription: Joi.string().min(10).max(5000).trim().required().messages({
      'string.min': 'Policy description must be at least 10 characters',
      'string.max': 'Policy description cannot exceed 5000 characters',
      'any.required': 'Policy description is required',
    }),
    effectiveDate: commonSchemas.isoDate.required().messages({
      'any.required': 'Effective date is required',
    }),
    applyToAll: Joi.boolean().default(false).optional(),
    assignTo: Joi.array().items(
      Joi.object({
        departmentId: commonSchemas.objectId.required(),
        designationIds: Joi.array().items(commonSchemas.objectId).optional(),
      })
    ).optional(),
  }).custom((value, helpers) => {
    // If not applyToAll, must have at least one assignment
    if (!value.applyToAll && (!value.assignTo || value.assignTo.length === 0)) {
      return helpers.error('any.invalid', {
        message: 'Either applyToAll must be true or at least one assignment must be provided',
      });
    }
    // Validate effectiveDate is not in the past (more than 30 days)
    const effectiveDate = new Date(value.effectiveDate);
    const today = new Date();
    const daysDiff = Math.ceil((today - effectiveDate) / (1000 * 60 * 60 * 24));
    if (daysDiff > 30) {
      return helpers.error('any.invalid', {
        message: 'Effective date cannot be more than 30 days in the past',
      });
    }
    return value;
  }),

  update: Joi.object({
    policyName: Joi.string().min(3).max(200).trim().optional(),
    policyDescription: Joi.string().min(10).max(5000).trim().optional(),
    effectiveDate: commonSchemas.isoDate.optional(),
    applyToAll: Joi.boolean().optional(),
    assignTo: Joi.array().items(
      Joi.object({
        departmentId: commonSchemas.objectId.required(),
        designationIds: Joi.array().items(commonSchemas.objectId).optional(),
      })
    ).optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    applyToAll: Joi.boolean().optional(),
    effectiveDateFrom: commonSchemas.isoDate.optional(),
    effectiveDateTo: commonSchemas.isoDate.optional(),
    sortBy: Joi.string().valid('policyName', 'effectiveDate', 'createdAt').default('effectiveDate'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

/**
 * Holiday validation schemas
 */
export const holidaySchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).trim().required().messages({
      'string.min': 'Holiday name must be at least 2 characters',
      'string.max': 'Holiday name cannot exceed 100 characters',
      'any.required': 'Holiday name is required',
    }),
    date: commonSchemas.isoDate.required().messages({
      'any.required': 'Holiday date is required',
    }),
    year: Joi.number().integer().min(2020).max(2100).required().messages({
      'number.min': 'Year must be 2020 or later',
      'number.max': 'Year cannot exceed 2100',
      'any.required': 'Year is required',
    }),
    isRecurring: Joi.boolean().default(false).optional(),
    type: Joi.string().valid('Public', 'Bank', 'Optional', 'Company').default('Public').optional(),
    description: Joi.string().max(500).allow('').optional(),
  }).custom((value, helpers) => {
    // Validate year matches date
    const dateYear = new Date(value.date).getFullYear();
    if (dateYear !== value.year) {
      return helpers.error('any.invalid', {
        message: `Year must match the date year (${dateYear})`,
      });
    }
    return value;
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).trim().optional(),
    date: commonSchemas.isoDate.optional(),
    year: Joi.number().integer().min(2020).max(2100).optional(),
    isRecurring: Joi.boolean().optional(),
    type: Joi.string().valid('Public', 'Bank', 'Optional', 'Company').optional(),
    description: Joi.string().max(500).allow('').optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  bulkImport: Joi.object({
    holidays: Joi.array().items(
      Joi.object({
        name: Joi.string().min(2).max(100).trim().required(),
        date: commonSchemas.isoDate.required(),
        year: Joi.number().integer().min(2020).max(2100).required(),
        isRecurring: Joi.boolean().default(false).optional(),
        type: Joi.string().valid('Public', 'Bank', 'Optional', 'Company').default('Public').optional(),
        description: Joi.string().max(500).allow('').optional(),
      })
    ).min(1).max(50).required().messages({
      'array.min': 'At least one holiday is required',
      'array.max': 'Cannot import more than 50 holidays at once',
      'any.required': 'Holidays array is required',
    }),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    year: Joi.number().integer().min(2020).max(2100).optional(),
    type: Joi.string().valid('Public', 'Bank', 'Optional', 'Company').optional(),
    dateFrom: commonSchemas.isoDate.optional(),
    dateTo: commonSchemas.isoDate.optional(),
    sortBy: Joi.string().valid('name', 'date', 'year', 'createdAt').default('date'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

/**
 * Promotion validation schemas
 */
export const promotionSchemas = {
  create: Joi.object({
    employeeId: commonSchemas.objectId.required().messages({
      'any.required': 'Employee ID is required',
    }),
    promotionTo: Joi.object({
      departmentId: commonSchemas.objectId.required().messages({
        'any.required': 'Target department is required',
      }),
      designationId: commonSchemas.objectId.required().messages({
        'any.required': 'Target designation is required',
      }),
    }).required(),
    promotionDate: commonSchemas.isoDate.required().messages({
      'any.required': 'Promotion date is required',
    }),
    promotionType: Joi.string()
      .valid('Regular', 'Acting', 'Charge', 'Transfer', 'Other')
      .default('Regular')
      .optional(),
    salaryChange: Joi.object({
      previousSalary: Joi.number().min(0).optional(),
      newSalary: Joi.number().min(0).optional(),
      increment: Joi.number().min(0).optional(),
      incrementPercentage: Joi.number().min(0).max(100).optional(),
    }).optional(),
    reason: Joi.string().max(500).allow('').optional(),
    notes: Joi.string().max(1000).allow('').optional(),
  }).custom((value, helpers) => {
    // Validate salary change
    if (value.salaryChange) {
      const { previousSalary, newSalary, increment, incrementPercentage } = value.salaryChange;

      // If both salaries provided, validate new > previous
      if (previousSalary && newSalary && newSalary <= previousSalary) {
        return helpers.error('any.invalid', {
          message: 'New salary must be greater than previous salary',
        });
      }

      // Validate increment calculation
      if (previousSalary && newSalary && increment) {
        const calculatedIncrement = newSalary - previousSalary;
        if (Math.abs(calculatedIncrement - increment) > 0.01) {
          return helpers.error('any.invalid', {
            message: 'Increment value does not match salary difference',
          });
        }
      }

      // Validate increment percentage
      if (previousSalary && newSalary && incrementPercentage) {
        const calculatedPercentage = ((newSalary - previousSalary) / previousSalary) * 100;
        if (Math.abs(calculatedPercentage - incrementPercentage) > 0.1) {
          return helpers.error('any.invalid', {
            message: 'Increment percentage does not match salary change',
          });
        }
      }
    }

    // Validate promotionDate is not in the past
    const promotionDate = new Date(value.promotionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (promotionDate < today) {
      return helpers.error('any.invalid', {
        message: 'Promotion date cannot be in the past',
      });
    }

    return value;
  }),

  update: Joi.object({
    promotionTo: Joi.object({
      departmentId: commonSchemas.objectId.optional(),
      designationId: commonSchemas.objectId.optional(),
    }).optional(),
    promotionDate: commonSchemas.isoDate.optional(),
    promotionType: Joi.string().valid('Regular', 'Acting', 'Charge', 'Transfer', 'Other').optional(),
    salaryChange: Joi.object({
      previousSalary: Joi.number().min(0).optional(),
      newSalary: Joi.number().min(0).optional(),
      increment: Joi.number().min(0).optional(),
      incrementPercentage: Joi.number().min(0).max(100).optional(),
    }).optional(),
    reason: Joi.string().max(500).allow('').optional(),
    notes: Joi.string().max(1000).allow('').optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  approve: Joi.object({
    comments: Joi.string().max(500).allow('').optional(),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    employeeId: commonSchemas.objectId.optional(),
    status: Joi.string().valid('pending', 'applied', 'cancelled').optional(),
    dateFrom: commonSchemas.isoDate.optional(),
    dateTo: commonSchemas.isoDate.optional(),
    sortBy: Joi.string().valid('promotionDate', 'createdAt', 'employeeId').default('promotionDate'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

/**
 * Resignation validation schemas
 */
export const resignationSchemas = {
  create: Joi.object({
    employeeId: commonSchemas.objectId.required().messages({
      'any.required': 'Employee ID is required',
    }),
    resignationDate: commonSchemas.isoDate.required().messages({
      'any.required': 'Resignation date is required',
    }),
    noticePeriodDays: Joi.number().integer().min(0).max(180).default(30).optional().messages({
      'number.min': 'Notice period cannot be negative',
      'number.max': 'Notice period cannot exceed 180 days',
    }),
    reason: Joi.string().min(10).max(1000).trim().required().messages({
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason cannot exceed 1000 characters',
      'any.required': 'Reason is required',
    }),
    notes: Joi.string().max(2000).allow('').optional(),
    isNoticePeriodServed: Joi.boolean().default(true).optional(),
    lastWorkingDate: commonSchemas.isoDate.optional().messages({
      'any.invalid': 'Last working date must be after resignation date',
    }),
  }).custom((value, helpers) => {
    // Validate lastWorkingDate is after resignationDate
    if (value.lastWorkingDate) {
      const resignationDate = new Date(value.resignationDate);
      const lastWorkingDate = new Date(value.lastWorkingDate);
      if (lastWorkingDate <= resignationDate) {
        return helpers.error('any.invalid', {
          message: 'Last working date must be after resignation date',
        });
      }

      // Validate against notice period
      const noticePeriodDays = value.noticePeriodDays || 30;
      const expectedLastWorkingDate = new Date(resignationDate);
      expectedLastWorkingDate.setDate(expectedLastWorkingDate.getDate() + noticePeriodDays);

      const daysDiff = Math.ceil((lastWorkingDate - resignationDate) / (1000 * 60 * 60 * 24));
      if (value.isNoticePeriodServed && daysDiff < noticePeriodDays) {
        return helpers.error('any.invalid', {
          message: `Last working date must be at least ${noticePeriodDays} days after resignation date when notice period is served`,
        });
      }
    }

    // Validate resignationDate is not in the future
    const resignationDate = new Date(value.resignationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (resignationDate > today) {
      return helpers.error('any.invalid', {
        message: 'Resignation date cannot be in the future',
      });
    }

    return value;
  }),

  update: Joi.object({
    resignationDate: commonSchemas.isoDate.optional(),
    noticePeriodDays: Joi.number().integer().min(0).max(180).optional(),
    reason: Joi.string().min(10).max(1000).trim().optional(),
    notes: Joi.string().max(2000).allow('').optional(),
    isNoticePeriodServed: Joi.boolean().optional(),
    lastWorkingDate: commonSchemas.isoDate.optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  approve: Joi.object({
    comments: Joi.string().max(500).allow('').optional(),
    exitInterviewDate: commonSchemas.isoDate.optional(),
    exitInterviewNotes: Joi.string().max(2000).allow('').optional(),
  }),

  reject: Joi.object({
    reason: Joi.string().min(10).max(500).required().messages({
      'string.min': 'Rejection reason must be at least 10 characters',
      'string.max': 'Rejection reason cannot exceed 500 characters',
      'any.required': 'Rejection reason is required',
    }),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    status: Joi.string().valid('pending', 'approved', 'rejected').optional(),
    dateFrom: commonSchemas.isoDate.optional(),
    dateTo: commonSchemas.isoDate.optional(),
    sortBy: Joi.string().valid('resignationDate', 'createdAt', 'lastWorkingDate').default('resignationDate'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

/**
 * Termination validation schemas
 */
export const terminationSchemas = {
  create: Joi.object({
    employeeId: commonSchemas.objectId.required().messages({
      'any.required': 'Employee ID is required',
    }),
    terminationDate: commonSchemas.isoDate.required().messages({
      'any.required': 'Termination date is required',
    }),
    terminationType: Joi.string()
      .valid('Voluntary', 'Involuntary', 'Mutual Agreement', 'Contract End', 'Retirement')
      .required()
      .messages({
        'any.required': 'Termination type is required',
      }),
    reason: Joi.string().min(10).max(1000).trim().required().messages({
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason cannot exceed 1000 characters',
      'any.required': 'Reason is required',
    }),
    reasonCategory: Joi.string()
      .valid('Performance', 'Misconduct', 'Attendance', 'Restructuring', 'Financial', 'Other')
      .optional(),
    notes: Joi.string().max(2000).allow('').optional(),
    isEligibleForRehire: Joi.boolean().default(false).optional(),
    severancePackage: Joi.object({
      amount: Joi.number().min(0).optional(),
      description: Joi.string().max(1000).allow('').optional(),
      includesBenefits: Joi.boolean().default(false).optional(),
    }).optional(),
    exitInterviewCompleted: Joi.boolean().default(false).optional(),
    exitInterviewNotes: Joi.string().max(2000).allow('').optional(),
  }).custom((value, helpers) => {
    // Validate terminationDate is not in the future
    const terminationDate = new Date(value.terminationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (terminationDate > today) {
      return helpers.error('any.invalid', {
        message: 'Termination date cannot be in the future',
      });
    }

    return value;
  }),

  update: Joi.object({
    terminationDate: commonSchemas.isoDate.optional(),
    terminationType: Joi.string()
      .valid('Voluntary', 'Involuntary', 'Mutual Agreement', 'Contract End', 'Retirement')
      .optional(),
    reason: Joi.string().min(10).max(1000).trim().optional(),
    reasonCategory: Joi.string()
      .valid('Performance', 'Misconduct', 'Attendance', 'Restructuring', 'Financial', 'Other')
      .optional(),
    notes: Joi.string().max(2000).allow('').optional(),
    isEligibleForRehire: Joi.boolean().optional(),
    severancePackage: Joi.object({
      amount: Joi.number().min(0).optional(),
      description: Joi.string().max(1000).allow('').optional(),
      includesBenefits: Joi.boolean().optional(),
    }).optional(),
    exitInterviewCompleted: Joi.boolean().optional(),
    exitInterviewNotes: Joi.string().max(2000).allow('').optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  approve: Joi.object({
    comments: Joi.string().max(500).allow('').optional(),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    terminationType: Joi.string()
      .valid('Voluntary', 'Involuntary', 'Mutual Agreement', 'Contract End', 'Retirement')
      .optional(),
    reasonCategory: Joi.string()
      .valid('Performance', 'Misconduct', 'Attendance', 'Restructuring', 'Financial', 'Other')
      .optional(),
    isEligibleForRehire: Joi.boolean().optional(),
    dateFrom: commonSchemas.isoDate.optional(),
    dateTo: commonSchemas.isoDate.optional(),
    sortBy: Joi.string().valid('terminationDate', 'createdAt', 'terminationType').default('terminationDate'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),
};

/**
 * Training validation schemas
 */
export const trainingSchemas = {
  create: Joi.object({
    name: Joi.string().min(3).max(200).trim().required().messages({
      'string.min': 'Training name must be at least 3 characters',
      'string.max': 'Training name cannot exceed 200 characters',
      'any.required': 'Training name is required',
    }),
    description: Joi.string().max(2000).allow('').optional(),
    trainingTypeId: commonSchemas.objectId.optional(),
    trainerId: commonSchemas.objectId.optional(),
    startDate: commonSchemas.isoDate.required().messages({
      'any.required': 'Start date is required',
    }),
    endDate: commonSchemas.isoDate.required().messages({
      'any.required': 'End date is required',
    }),
    location: Joi.string().max(200).allow('').optional(),
    isOnline: Joi.boolean().default(false).optional(),
    meetingLink: Joi.string().uri().allow('').optional().messages({
      'string.uri': 'Meeting link must be a valid URL',
    }),
    maxParticipants: Joi.number().integer().min(1).default(50).optional(),
    budget: Joi.number().min(0).optional(),
    status: Joi.string().valid('Draft', 'Scheduled', 'In Progress', 'Completed', 'Cancelled').default('Draft').optional(),
  }).custom((value, helpers) => {
    // Validate endDate is after startDate
    if (new Date(value.startDate) >= new Date(value.endDate)) {
      return helpers.error('any.invalid', {
        message: 'End date must be after start date',
      });
    }

    // Validate startDate is not in the past
    const startDate = new Date(value.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (startDate < today) {
      return helpers.error('any.invalid', {
        message: 'Start date cannot be in the past',
      });
    }

    // Validate meeting link if isOnline is true
    if (value.isOnline && !value.meetingLink) {
      return helpers.error('any.invalid', {
        message: 'Meeting link is required when training is online',
      });
    }

    return value;
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(200).trim().optional(),
    description: Joi.string().max(2000).allow('').optional(),
    trainingTypeId: commonSchemas.objectId.optional(),
    trainerId: commonSchemas.objectId.optional(),
    startDate: commonSchemas.isoDate.optional(),
    endDate: commonSchemas.isoDate.optional(),
    location: Joi.string().max(200).allow('').optional(),
    isOnline: Joi.boolean().optional(),
    meetingLink: Joi.string().uri().allow('').optional(),
    maxParticipants: Joi.number().integer().min(1).optional(),
    budget: Joi.number().min(0).optional(),
    status: Joi.string().valid('Draft', 'Scheduled', 'In Progress', 'Completed', 'Cancelled').optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  enroll: Joi.object({
    employeeIds: Joi.array().items(commonSchemas.objectId).min(1).max(100).required().messages({
      'array.min': 'At least one employee must be enrolled',
      'array.max': 'Cannot enroll more than 100 employees at once',
      'any.required': 'Employee IDs array is required',
    }),
  }),

  complete: Joi.object({
    employeeId: commonSchemas.objectId.required().messages({
      'any.required': 'Employee ID is required',
    }),
    score: Joi.number().min(0).max(100).optional(),
    feedback: Joi.string().max(1000).allow('').optional(),
    certificateUrl: Joi.string().uri().allow('').optional(),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    trainingTypeId: commonSchemas.objectId.optional(),
    trainerId: commonSchemas.objectId.optional(),
    status: Joi.string().valid('Draft', 'Scheduled', 'In Progress', 'Completed', 'Cancelled').optional(),
    dateFrom: commonSchemas.isoDate.optional(),
    dateTo: commonSchemas.isoDate.optional(),
    sortBy: Joi.string().valid('name', 'startDate', 'endDate', 'status', 'createdAt').default('startDate'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

/**
 * Training Type validation schemas
 */
export const trainingTypeSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).trim().required().messages({
      'string.min': 'Training type name must be at least 2 characters',
      'string.max': 'Training type name cannot exceed 100 characters',
      'any.required': 'Training type name is required',
    }),
    code: Joi.string().min(1).max(20).trim().uppercase().optional(),
    description: Joi.string().max(1000).allow('').optional(),
    duration: Joi.number().min(0).optional().messages({
      'number.min': 'Duration cannot be negative',
    }),
    isActive: Joi.boolean().default(true).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).trim().optional(),
    code: Joi.string().min(1).max(20).trim().uppercase().optional(),
    description: Joi.string().max(1000).allow('').optional(),
    duration: Joi.number().min(0).optional(),
    isActive: Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().valid('name', 'code', 'createdAt').default('name'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

/**
 * Trainer validation schemas
 */
export const trainerSchemas = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).trim().required().messages({
      'string.min': 'Trainer name must be at least 2 characters',
      'string.max': 'Trainer name cannot exceed 100 characters',
      'any.required': 'Trainer name is required',
    }),
    email: Joi.string().email().optional(),
    phone: commonSchemas.phone.optional(),
    expertise: Joi.array().items(Joi.string().max(50)).min(1).required().messages({
      'array.min': 'At least one area of expertise is required',
      'any.required': 'Expertise is required',
    }),
    bio: Joi.string().max(2000).allow('').optional(),
    certification: Joi.string().max(500).allow('').optional(),
    hourlyRate: Joi.number().min(0).optional(),
    isExternal: Joi.boolean().default(false).optional(),
    organization: Joi.string().max(200).allow('').optional(),
    isActive: Joi.boolean().default(true).optional(),
  }),

  update: Joi.object({
    name: Joi.string().min(2).max(100).trim().optional(),
    email: Joi.string().email().optional(),
    phone: commonSchemas.phone.optional(),
    expertise: Joi.array().items(Joi.string().max(50)).min(1).optional(),
    bio: Joi.string().max(2000).allow('').optional(),
    certification: Joi.string().max(500).allow('').optional(),
    hourlyRate: Joi.number().min(0).optional(),
    isExternal: Joi.boolean().optional(),
    organization: Joi.string().max(200).allow('').optional(),
    isActive: Joi.boolean().optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    expertise: Joi.string().max(50).optional(),
    isExternal: Joi.boolean().optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().valid('name', 'createdAt', 'hourlyRate').default('name'),
    order: Joi.string().valid('asc', 'desc').default('asc'),
  }),
};

/**
 * Overtime Request validation schemas
 */
export const overtimeSchemas = {
  create: Joi.object({
    date: commonSchemas.isoDate.required().messages({
      'any.required': 'Overtime date is required',
    }),
    startTime: commonSchemas.isoDate.required().messages({
      'any.required': 'Start time is required',
    }),
    endTime: commonSchemas.isoDate.required().messages({
      'any.required': 'End time is required',
    }),
    requestedHours: Joi.number().min(0.25).max(12).required().messages({
      'number.min': 'Minimum overtime is 15 minutes (0.25 hours)',
      'number.max': 'Maximum overtime per day is 12 hours',
      'any.required': 'Requested hours is required',
    }),
    reason: Joi.string().min(10).max(500).trim().required().messages({
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason cannot exceed 500 characters',
      'any.required': 'Reason is required',
    }),
    project: Joi.string().max(200).allow('').optional(),
    taskDescription: Joi.string().max(1000).allow('').optional(),
    attachments: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('document', 'image', 'link').required(),
        url: Joi.string().uri().required(),
      })
    ).max(10).optional(),
  }).custom((value, helpers) => {
    // Validate end time is after start time
    if (new Date(value.endTime) <= new Date(value.startTime)) {
      return helpers.error('any.invalid', {
        message: 'End time must be after start time',
      });
    }

    // Calculate duration and validate against requested hours
    const durationMs = new Date(value.endTime) - new Date(value.startTime);
    const durationHours = durationMs / (1000 * 60 * 60);

    if (Math.abs(durationHours - value.requestedHours) > 0.5) {
      return helpers.error('any.invalid', {
        message: 'Requested hours must match the duration between start and end time (within 30 minutes)',
      });
    }

    // Validate date is not in the past (more than 7 days)
    const overtimeDate = new Date(value.date);
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (overtimeDate < sevenDaysAgo) {
      return helpers.error('any.invalid', {
        message: 'Cannot create overtime request for dates more than 7 days in the past',
      });
    }

    return value;
  }),

  update: Joi.object({
    date: commonSchemas.isoDate.optional(),
    startTime: commonSchemas.isoDate.optional(),
    endTime: commonSchemas.isoDate.optional(),
    requestedHours: Joi.number().min(0.25).max(12).optional(),
    reason: Joi.string().min(10).max(500).trim().optional(),
    project: Joi.string().max(200).allow('').optional(),
    taskDescription: Joi.string().max(1000).allow('').optional(),
    attachments: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('document', 'image', 'link').required(),
        url: Joi.string().uri().required(),
      })
    ).max(10).optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update',
  }).custom((value, helpers) => {
    // Validate end time is after start time if both are provided
    if (value.startTime && value.endTime) {
      if (new Date(value.endTime) <= new Date(value.startTime)) {
        return helpers.error('any.invalid', {
          message: 'End time must be after start time',
        });
      }

      // Calculate duration and validate against requested hours if provided
      const durationMs = new Date(value.endTime) - new Date(value.startTime);
      const durationHours = durationMs / (1000 * 60 * 60);

      if (value.requestedHours && Math.abs(durationHours - value.requestedHours) > 0.5) {
        return helpers.error('any.invalid', {
          message: 'Requested hours must match the duration between start and end time (within 30 minutes)',
        });
      }
    }

    return value;
  }),

  approveReject: Joi.object({
    comments: Joi.string().max(500).allow('').optional().messages({
      'string.max': 'Comments cannot exceed 500 characters',
    }),
    approvedHours: Joi.number().min(0.25).max(12).optional().messages({
      'number.min': 'Approved hours must be at least 0.25',
      'number.max': 'Approved hours cannot exceed 12',
    }),
    reason: Joi.string().min(5).max(500).allow('').optional().messages({
      'string.min': 'Reason must be at least 5 characters',
      'string.max': 'Reason cannot exceed 500 characters',
    }),
  }),

  rejectOnly: Joi.object({
    reason: Joi.string().min(5).max(500).trim().required().messages({
      'string.min': 'Rejection reason must be at least 5 characters',
      'string.max': 'Reason cannot exceed 500 characters',
      'any.required': 'Rejection reason is required',
    }),
  }),

  cancel: Joi.object({
    reason: Joi.string().max(500).allow('').optional().messages({
      'string.max': 'Cancellation reason cannot exceed 500 characters',
    }),
  }),

  list: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().max(100).allow('').optional(),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'cancelled').optional(),
    employee: Joi.string().optional(),
    startDate: commonSchemas.isoDate.optional(),
    endDate: commonSchemas.isoDate.optional(),
    sortBy: Joi.string().valid('date', 'createdAt', 'employeeName', 'status', 'requestedHours').default('date'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }).custom((value, helpers) => {
    // Validate date range
    if (value.startDate && value.endDate) {
      if (new Date(value.startDate) > new Date(value.endDate)) {
        return helpers.error('any.invalid', {
          message: 'Start date must be before end date',
        });
      }
    }

    return value;
  }),

  stats: Joi.object({
    startDate: commonSchemas.isoDate.optional(),
    endDate: commonSchemas.isoDate.optional(),
    employee: Joi.string().optional(),
  }).custom((value, helpers) => {
    // Validate date range
    if (value.startDate && value.endDate) {
      if (new Date(value.startDate) > new Date(value.endDate)) {
        return helpers.error('any.invalid', {
          message: 'Start date must be before end date',
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
  departmentSchemas,
  designationSchemas,
  policySchemas,
  holidaySchemas,
  overtimeSchemas,
  promotionSchemas,
  resignationSchemas,
  terminationSchemas,
  trainingSchemas,
  trainingTypeSchemas,
  trainerSchemas,
  sanitizeMongoQuery,
};
