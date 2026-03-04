/**
 * Common Joi Validation Schemas
 * Reusable schemas for pagination, ObjectIds, dates, etc.
 *
 * SECURITY FIX - Phase 3, Task 3.2
 * Created: 2026-03-02
 */

import Joi from 'joi';

/**
 * MongoDB ObjectId validation
 * - Exactly 24 hex characters
 * - Case-insensitive
 */
export const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ObjectId format');

/**
 * Pagination schema for query parameters
 */
export const paginationSchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .max(10000)
    .default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
      'number.max': 'Page cannot exceed 10000'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  skip: Joi.number()
    .integer()
    .min(0)
    .max(100000)
    .optional()
    .messages({
      'number.base': 'Skip must be a number',
      'number.integer': 'Skip must be an integer',
      'number.min': 'Skip cannot be negative'
    })
});

/**
 * Date range schema
 */
export const dateRangeSchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .max('now')
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format',
      'date.max': 'Start date cannot be in the future'
    }),

  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    })
});

/**
 * Date range with future dates allowed
 */
export const futureDateRangeSchema = Joi.object({
  startDate: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format'
    }),

  endDate: Joi.date()
    .iso()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format',
      'date.min': 'End date must be after start date'
    })
});

/**
 * Search query schema
 * - Prevents NoSQL injection
 * - Limits length
 * - Strips dangerous characters
 */
export const searchSchema = Joi.object({
  search: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .pattern(/^[a-zA-Z0-9\s\-_.@]+$/)
    .optional()
    .messages({
      'string.base': 'Search query must be a string',
      'string.min': 'Search query cannot be empty',
      'string.max': 'Search query is too long (max 200 characters)',
      'string.pattern.base': 'Search query contains invalid characters'
    }),

  q: Joi.string()
    .trim()
    .min(1)
    .max(200)
    .pattern(/^[a-zA-Z0-9\s\-_.@]+$/)
    .optional()
    .messages({
      'string.base': 'Search query must be a string',
      'string.min': 'Search query cannot be empty',
      'string.max': 'Search query is too long (max 200 characters)',
      'string.pattern.base': 'Search query contains invalid characters'
    })
});

/**
 * Sort schema
 */
export const sortSchema = Joi.object({
  sort: Joi.string()
    .valid('asc', 'desc', '1', '-1', 'ascending', 'descending')
    .default('asc')
    .optional()
    .messages({
      'string.base': 'Sort must be a string',
      'any.only': 'Sort must be one of: asc, desc, 1, -1, ascending, descending'
    }),

  sortBy: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z0-9_.]+$/)
    .optional()
    .messages({
      'string.base': 'SortBy must be a string',
      'string.pattern.base': 'SortBy contains invalid characters',
      'string.max': 'SortBy field name is too long'
    })
});

/**
 * Status filter schema
 */
export const statusSchema = Joi.object({
  status: Joi.string()
    .valid('active', 'inactive', 'pending', 'approved', 'rejected', 'cancelled', 'completed', 'all')
    .optional()
    .messages({
      'string.base': 'Status must be a string',
      'any.only': 'Invalid status value'
    })
});

/**
 * Email schema
 */
export const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .max(100)
  .lowercase()
  .trim()
  .messages({
    'string.email': 'Invalid email format',
    'string.max': 'Email is too long (max 100 characters)'
  });

/**
 * Phone number schema (international format)
 */
export const phoneSchema = Joi.string()
  .pattern(/^\+?[1-9]\d{1,14}$/)
  .min(10)
  .max(15)
  .optional()
  .messages({
    'string.pattern.base': 'Invalid phone number format',
    'string.min': 'Phone number is too short',
    'string.max': 'Phone number is too long'
  });

/**
 * Name schema (first/last name)
 */
export const nameSchema = Joi.string()
  .trim()
  .min(1)
  .max(50)
  .pattern(/^[a-zA-Z\s'-]+$/)
  .messages({
    'string.base': 'Name must be a string',
    'string.min': 'Name cannot be empty',
    'string.max': 'Name is too long (max 50 characters)',
    'string.pattern.base': 'Name contains invalid characters'
  });

/**
 * Description schema
 */
export const descriptionSchema = Joi.string()
  .trim()
  .max(2000)
  .optional()
  .messages({
    'string.base': 'Description must be a string',
    'string.max': 'Description is too long (max 2000 characters)'
  });

/**
 * URL schema
 */
export const urlSchema = Joi.string()
  .uri()
  .max(500)
  .optional()
  .messages({
    'string.uri': 'Invalid URL format',
    'string.max': 'URL is too long (max 500 characters)'
  });

/**
 * File path schema
 */
export const filePathSchema = Joi.string()
  .trim()
  .max(500)
  .pattern(/^[a-zA-Z0-9\-_./]+$/)
  .optional()
  .messages({
    'string.pattern.base': 'File path contains invalid characters',
    'string.max': 'File path is too long (max 500 characters)'
  });

/**
 * Positive number schema
 */
export const positiveNumberSchema = Joi.number()
  .positive()
  .messages({
    'number.base': 'Must be a number',
    'number.positive': 'Must be a positive number'
  });

/**
 * Percentage schema (0-100)
 */
export const percentageSchema = Joi.number()
  .min(0)
  .max(100)
  .messages({
    'number.base': 'Must be a number',
    'number.min': 'Percentage cannot be negative',
    'number.max': 'Percentage cannot exceed 100'
  });

/**
 * Boolean schema with string coercion
 */
export const booleanSchema = Joi.alternatives()
  .try(
    Joi.boolean(),
    Joi.string().valid('true', 'false', '1', '0', 'yes', 'no')
  )
  .messages({
    'alternatives.match': 'Must be a boolean value'
  });

/**
 * Address schema
 */
export const addressSchema = Joi.object({
  street: Joi.string().trim().max(200).optional(),
  city: Joi.string().trim().max(100).optional(),
  state: Joi.string().trim().max(100).optional(),
  country: Joi.string().trim().max(100).optional(),
  zipCode: Joi.string().trim().max(20).optional()
});

/**
 * Combined query parameters schema (pagination + search + sort + status)
 */
export const queryParamsSchema = paginationSchema
  .concat(searchSchema)
  .concat(sortSchema)
  .concat(statusSchema);
