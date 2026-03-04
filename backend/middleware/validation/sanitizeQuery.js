/**
 * Global Query Parameter Sanitization Middleware
 *
 * Automatically sanitizes and validates common query parameters across all GET routes.
 * This middleware runs BEFORE route-specific validation and provides baseline security.
 *
 * Features:
 * - Strips MongoDB operators ($where, $ne, $gt, etc.)
 * - Validates and sanitizes pagination parameters
 * - Limits string lengths to prevent ReDoS
 * - Converts string booleans to actual booleans
 * - Removes null/undefined values
 * - Validates ObjectId format in common ID fields
 */

import Joi from 'joi';
import { buildValidationError } from '../errorHandler.js';

/**
 * MongoDB operators that should be blocked in query parameters
 */
const BLOCKED_OPERATORS = [
  '$where', '$ne', '$gt', '$gte', '$lt', '$lte',
  '$in', '$nin', '$and', '$or', '$not', '$nor',
  '$exists', '$type', '$expr', '$jsonSchema',
  '$mod', '$regex', '$text', '$elemMatch'
];

/**
 * Common query parameter schema for all GET routes
 * Provides baseline validation without being too restrictive
 */
const baseQuerySchema = Joi.object({
  // Pagination
  page: Joi.number().integer().min(1).max(10000).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  skip: Joi.number().integer().min(0).max(100000).optional(),

  // Search
  search: Joi.string().trim().max(200).pattern(/^[a-zA-Z0-9\s\-_.@]+$/).optional(),
  q: Joi.string().trim().max(200).pattern(/^[a-zA-Z0-9\s\-_.@]+$/).optional(),

  // Sorting
  sort: Joi.string().trim().max(100).optional(),
  sortBy: Joi.string().trim().max(100).optional(),
  sortOrder: Joi.string().valid('asc', 'desc', 'ascending', 'descending', '1', '-1').optional(),
  order: Joi.string().valid('asc', 'desc', 'ascending', 'descending', '1', '-1').optional(),

  // Status filters
  status: Joi.string().trim().max(50).optional(),
  isActive: Joi.boolean().optional(),
  active: Joi.boolean().optional(),

  // Date filters
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  fromDate: Joi.date().iso().optional(),
  toDate: Joi.date().iso().min(Joi.ref('fromDate')).optional(),
  date: Joi.date().iso().optional(),

  // Common ID fields (will validate ObjectId format)
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  employeeId: Joi.string().trim().max(50).optional(),
  departmentId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  designationId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  managerId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),
  companyId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).optional(),

  // Time filters
  year: Joi.number().integer().min(2020).max(2050).optional(),
  month: Joi.number().integer().min(1).max(12).optional(),
  week: Joi.number().integer().min(1).max(53).optional(),

  // Response format
  format: Joi.string().valid('json', 'csv', 'pdf', 'excel').default('json').optional(),
  fields: Joi.string().trim().max(500).optional(),

  // Filtering
  filter: Joi.string().trim().max(500).optional(),
  type: Joi.string().trim().max(50).optional(),
  category: Joi.string().trim().max(50).optional()
})
  .unknown(true) // Allow route-specific parameters
  .options({
    stripUnknown: false, // Keep unknown fields for route-specific validation
    abortEarly: false,
    convert: true
  });

/**
 * Check if query parameter contains MongoDB operators
 */
const containsMongoOperator = (value) => {
  if (typeof value !== 'string') return false;

  return BLOCKED_OPERATORS.some(op => {
    return value.includes(op);
  });
};

/**
 * Recursively sanitize object to remove MongoDB operators
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    // Block keys that are MongoDB operators
    if (key.startsWith('$')) {
      continue; // Skip this field
    }

    const value = obj[key];

    // Recursively sanitize nested objects
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    }
    // Block string values containing operators
    else if (typeof value === 'string' && containsMongoOperator(value)) {
      // Replace with safe empty string
      sanitized[key] = '';
    }
    else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Convert string booleans to actual booleans
 */
export const convertBooleans = (obj) => {
  const converted = { ...obj };

  for (const key in converted) {
    const value = converted[key];

    if (value === 'true' || value === '1') {
      converted[key] = true;
    } else if (value === 'false' || value === '0') {
      converted[key] = false;
    }
  }

  return converted;
};

/**
 * Remove empty/null/undefined values from query
 */
export const removeEmpty = (obj) => {
  const cleaned = {};

  for (const key in obj) {
    const value = obj[key];

    if (value !== null && value !== undefined && value !== '') {
      cleaned[key] = value;
    }
  }

  return cleaned;
};

/**
 * Global Query Sanitization Middleware
 *
 * Usage:
 *   import { sanitizeQuery } from './middleware/validation/sanitizeQuery.js';
 *   router.get('/api/resource', sanitizeQuery(), controller.getAll);
 *
 * Options:
 *   - strict: If true, throw error on validation failure. If false, just sanitize. (default: false)
 *   - schema: Custom Joi schema to merge with base schema (default: null)
 */
export const sanitizeQuery = (options = {}) => {
  const { strict = false, schema = null } = options;

  return async (req, res, next) => {
    try {
      // Step 1: Remove MongoDB operators
      let sanitized = sanitizeObject(req.query);

      // Step 2: Convert string booleans
      sanitized = convertBooleans(sanitized);

      // Step 3: Remove empty values
      sanitized = removeEmpty(sanitized);

      // Step 4: Validate with Joi schema
      const validationSchema = schema
        ? baseQuerySchema.concat(schema)
        : baseQuerySchema;

      const { error, value } = validationSchema.validate(sanitized, {
        abortEarly: false,
        stripUnknown: false,
        convert: true
      });

      if (error) {
        if (strict) {
          // In strict mode, throw validation error
          const details = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            type: detail.type
          }));

          throw buildValidationError(
            'request.query',
            `Query validation failed: ${details.map(d => d.message).join(', ')}`,
            { details }
          );
        } else {
          // In non-strict mode, just log warning and use sanitized values
          console.warn('[Query Sanitization] Validation warnings:', error.details.map(d => d.message));
        }
      }

      // Step 5: Update req.query with sanitized values
      req.query = value || sanitized;

      // Step 6: Add sanitization metadata to request
      req.querySanitized = true;
      req.queryOriginal = req.query; // Keep original for debugging

      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Strict Query Validation Middleware
 * Same as sanitizeQuery but throws error on validation failure
 */
export const validateQueryStrict = (schema = null) => {
  return sanitizeQuery({ strict: true, schema });
};

/**
 * MongoDB Operator Detection Middleware
 * Blocks requests containing MongoDB operators in query
 */
export const blockMongoOperators = (req, res, next) => {
  const queryString = JSON.stringify(req.query);

  for (const operator of BLOCKED_OPERATORS) {
    if (queryString.includes(operator)) {
      const error = buildValidationError(
        'request.query',
        `Query contains blocked MongoDB operator: ${operator}`,
        { operator, query: req.query }
      );
      return next(error);
    }
  }

  next();
};

/**
 * ObjectId Validation Middleware for URL params
 * Validates :id, :employeeId, etc. in route params
 */
export const validateObjectIdParams = (...paramNames) => {
  const schema = Joi.object(
    paramNames.reduce((acc, name) => {
      acc[name] = Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
          'string.pattern.base': `Invalid ObjectId format for ${name}`
        });
      return acc;
    }, {})
  ).unknown(true);

  return (req, res, next) => {
    const { error } = schema.validate(req.params);

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return next(buildValidationError(
        'request.params',
        `URL parameter validation failed: ${details.map(d => d.message).join(', ')}`,
        { details }
      ));
    }

    next();
  };
};

/**
 * Export all sanitization utilities
 */
export default {
  sanitizeQuery,
  validateQueryStrict,
  blockMongoOperators,
  validateObjectIdParams,
  sanitizeObject,
  convertBooleans,
  removeEmpty
};
