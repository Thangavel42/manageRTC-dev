/**
 * HR Management Validation Schemas
 * Departments, Designations, Holidays, Policies, etc.
 *
 * SECURITY FIX - Phase 3, Task 3.2
 * Created: 2026-03-02
 */

import Joi from 'joi';
import {
  objectIdSchema,
  paginationSchema,
  searchSchema,
  queryParamsSchema,
  descriptionSchema,
  statusSchema
} from './common.schema.js';

// ============================================================================
// DEPARTMENTS
// ============================================================================

/**
 * Create department schema
 */
export const createDepartmentSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'any.required': 'Department name is required',
      'string.min': 'Department name must be at least 2 characters',
      'string.max': 'Department name is too long (max 100 characters)'
    }),

  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9_-]+$/)
    .max(20)
    .optional()
    .messages({
      'string.pattern.base': 'Department code must contain only uppercase letters, numbers, hyphens, and underscores'
    }),

  description: descriptionSchema,

  headOfDepartment: objectIdSchema.optional(),

  parentDepartment: objectIdSchema.optional(),

  isActive: Joi.boolean().default(true)
});

/**
 * Update department schema
 */
export const updateDepartmentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  code: Joi.string().trim().uppercase().pattern(/^[A-Z0-9_-]+$/).max(20).optional(),
  description: descriptionSchema,
  headOfDepartment: objectIdSchema.optional(),
  parentDepartment: objectIdSchema.optional(),
  isActive: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Department query schema
 */
export const departmentQuerySchema = queryParamsSchema.concat(
  Joi.object({
    isActive: Joi.boolean().optional(),
    parentDepartment: objectIdSchema.optional()
  })
);

// ============================================================================
// DESIGNATIONS
// ============================================================================

/**
 * Create designation schema
 */
export const createDesignationSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'any.required': 'Designation name is required',
      'string.min': 'Designation name must be at least 2 characters',
      'string.max': 'Designation name is too long (max 100 characters)'
    }),

  code: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-Z0-9_-]+$/)
    .max(20)
    .optional()
    .messages({
      'string.pattern.base': 'Designation code must contain only uppercase letters, numbers, hyphens, and underscores'
    }),

  description: descriptionSchema,

  departmentId: objectIdSchema.optional(),

  level: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .optional()
    .messages({
      'number.min': 'Level must be at least 1',
      'number.max': 'Level cannot exceed 10'
    }),

  parentDesignation: objectIdSchema.optional(),

  isActive: Joi.boolean().default(true)
});

/**
 * Update designation schema
 */
export const updateDesignationSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  code: Joi.string().trim().uppercase().pattern(/^[A-Z0-9_-]+$/).max(20).optional(),
  description: descriptionSchema,
  departmentId: objectIdSchema.optional(),
  level: Joi.number().integer().min(1).max(10).optional(),
  parentDesignation: objectIdSchema.optional(),
  isActive: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Designation query schema
 */
export const designationQuerySchema = queryParamsSchema.concat(
  Joi.object({
    isActive: Joi.boolean().optional(),
    departmentId: objectIdSchema.optional(),
    level: Joi.number().integer().min(1).max(10).optional()
  })
);

// ============================================================================
// HOLIDAYS
// ============================================================================

/**
 * Holiday types
 */
const holidayTypes = [
  'public', 'national', 'regional', 'company', 'optional', 'restricted'
];

/**
 * Create holiday schema
 */
export const createHolidaySchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'any.required': 'Holiday name is required',
      'string.min': 'Holiday name must be at least 2 characters',
      'string.max': 'Holiday name is too long (max 100 characters)'
    }),

  date: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Holiday date is required',
      'date.base': 'Holiday date must be a valid date'
    }),

  type: Joi.string()
    .valid(...holidayTypes)
    .default('public')
    .messages({
      'any.only': 'Invalid holiday type'
    }),

  description: descriptionSchema,

  isOptional: Joi.boolean().default(false),

  applicableToDepartments: Joi.array()
    .items(objectIdSchema)
    .optional()
    .messages({
      'array.base': 'Applicable departments must be an array'
    }),

  applicableToLocations: Joi.array()
    .items(Joi.string().trim().max(100))
    .optional()
    .messages({
      'array.base': 'Applicable locations must be an array'
    }),

  year: Joi.number()
    .integer()
    .min(2020)
    .max(2050)
    .required()
    .messages({
      'any.required': 'Year is required',
      'number.min': 'Year must be 2020 or later',
      'number.max': 'Year cannot exceed 2050'
    })
});

/**
 * Update holiday schema
 */
export const updateHolidaySchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  date: Joi.date().iso().optional(),
  type: Joi.string().valid(...holidayTypes).optional(),
  description: descriptionSchema,
  isOptional: Joi.boolean().optional(),
  applicableToDepartments: Joi.array().items(objectIdSchema).optional(),
  applicableToLocations: Joi.array().items(Joi.string().trim().max(100)).optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Holiday query schema
 */
export const holidayQuerySchema = queryParamsSchema.concat(
  Joi.object({
    year: Joi.number().integer().min(2020).max(2050).optional(),
    month: Joi.number().integer().min(1).max(12).optional(),
    type: Joi.string().valid(...holidayTypes, 'all').optional(),
    departmentId: objectIdSchema.optional(),
    fromDate: Joi.date().iso().optional(),
    toDate: Joi.date().iso().min(Joi.ref('fromDate')).optional()
  })
);

/**
 * Validate holiday date schema
 */
export const validateHolidaySchema = Joi.object({
  date: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Date is required'
    }),
  departmentId: objectIdSchema.optional()
});

/**
 * Calculate working days schema
 */
export const calculateWorkingDaysSchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Start date is required'
    }),
  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .required()
    .messages({
      'any.required': 'End date is required',
      'date.min': 'End date must be on or after start date'
    }),
  departmentId: objectIdSchema.optional(),
  includeWeekends: Joi.boolean().default(false)
});

// ============================================================================
// POLICIES
// ============================================================================

/**
 * Policy categories
 */
const policyCategories = [
  'leave', 'attendance', 'code_of_conduct', 'data_security',
  'hr', 'it', 'safety', 'other'
];

/**
 * Create policy schema
 */
export const createPolicySchema = Joi.object({
  title: Joi.string()
    .trim()
    .min(5)
    .max(200)
    .required()
    .messages({
      'any.required': 'Policy title is required',
      'string.min': 'Policy title must be at least 5 characters',
      'string.max': 'Policy title is too long (max 200 characters)'
    }),

  category: Joi.string()
    .valid(...policyCategories)
    .required()
    .messages({
      'any.required': 'Policy category is required',
      'any.only': 'Invalid policy category'
    }),

  content: Joi.string()
    .trim()
    .min(50)
    .required()
    .messages({
      'any.required': 'Policy content is required',
      'string.min': 'Policy content must be at least 50 characters'
    }),

  version: Joi.string()
    .trim()
    .pattern(/^v?\d+\.\d+(\.\d+)?$/)
    .default('1.0')
    .messages({
      'string.pattern.base': 'Version must be in format 1.0 or v1.0.0'
    }),

  effectiveDate: Joi.date()
    .iso()
    .required()
    .messages({
      'any.required': 'Effective date is required'
    }),

  expiryDate: Joi.date()
    .iso()
    .min(Joi.ref('effectiveDate'))
    .optional()
    .messages({
      'date.min': 'Expiry date must be after effective date'
    }),

  attachments: Joi.array()
    .items(Joi.string().uri())
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot attach more than 10 files'
    }),

  applicableToDepartments: Joi.array().items(objectIdSchema).optional(),

  requiresAcknowledgment: Joi.boolean().default(false),

  isActive: Joi.boolean().default(true)
});

/**
 * Update policy schema
 */
export const updatePolicySchema = Joi.object({
  title: Joi.string().trim().min(5).max(200).optional(),
  category: Joi.string().valid(...policyCategories).optional(),
  content: Joi.string().trim().min(50).optional(),
  version: Joi.string().trim().pattern(/^v?\d+\.\d+(\.\d+)?$/).optional(),
  effectiveDate: Joi.date().iso().optional(),
  expiryDate: Joi.date().iso().optional(),
  attachments: Joi.array().items(Joi.string().uri()).max(10).optional(),
  applicableToDepartments: Joi.array().items(objectIdSchema).optional(),
  requiresAcknowledgment: Joi.boolean().optional(),
  isActive: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Policy query schema
 */
export const policyQuerySchema = queryParamsSchema.concat(
  Joi.object({
    category: Joi.string().valid(...policyCategories, 'all').optional(),
    isActive: Joi.boolean().optional(),
    departmentId: objectIdSchema.optional()
  })
);
