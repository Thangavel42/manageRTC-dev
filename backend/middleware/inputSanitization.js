/**
 * Input Sanitization Middleware
 * Protects against NoSQL injection and other input-based attacks
 *
 * SECURITY: Critical security middleware - any changes require security review
 */

import { isValidObjectId, sanitizePaginationParams, sanitizeQueryObject, validateSearchInput } from '../utils/sanitization.js';

/**
 * Sanitize query parameters
 * Validates and sanitizes common attack vectors in query strings
 *
 * Usage: Apply to all GET endpoints with search functionality
 *
 * @example
 * router.get('/api/projects', sanitizeQuery, getProjects);
 */
export const sanitizeQuery = (req, res, next) => {
  // 1. Sanitize search parameter
  if (req.query.search) {
    try {
      req.query.search = validateSearchInput(req.query.search);
    } catch (error) {
      console.warn(`[Security] Invalid search query from ${req.user?.userId || 'anonymous'}: ${error.message}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SEARCH_QUERY',
          message: error.message,
          requestId: req.id || 'no-id',
        },
      });
    }
  }

  // 2. Validate and sanitize pagination parameters
  if (req.query.page || req.query.limit) {
    try {
      const sanitized = sanitizePaginationParams(req.query);
      req.query.page = sanitized.page;
      req.query.limit = sanitized.limit;
    } catch (error) {
      console.warn(`[Security] Invalid pagination params from ${req.user?.userId || 'anonymous'}`);
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAGINATION',
          message: 'Invalid pagination parameters',
          requestId: req.id || 'no-id',
        },
      });
    }
  }

  // 3. Block object injection in query parameters
  Object.keys(req.query).forEach((key) => {
    const value = req.query[key];

    // Block object values (potential MongoDB operator injection)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      console.warn(`[Security] Blocked object injection in query param "${key}" from ${req.user?.userId || 'anonymous'}`);
      delete req.query[key];
    }

    // Block MongoDB operators in query keys
    if (key.startsWith('$')) {
      console.warn(`[Security] Blocked MongoDB operator in query key "${key}" from ${req.user?.userId || 'anonymous'}`);
      delete req.query[key];
    }
  });

  next();
};

/**
 * Sanitize request body
 * Removes MongoDB operators and dangerous patterns from request body
 *
 * Usage: Apply to POST/PUT endpoints
 *
 * @example
 * router.post('/api/employees', sanitizeBody, createEmployee);
 */
export const sanitizeBody = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object') {
    return next();
  }

  try {
    // Sanitize the body to remove MongoDB operators
    req.body = sanitizeQueryObject(req.body);
    next();
  } catch (error) {
    console.error(`[Security] Error sanitizing request body from ${req.user?.userId || 'anonymous'}:`, error);
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_REQUEST_BODY',
        message: 'Invalid request body',
        requestId: req.id || 'no-id',
      },
    });
  }
};

/**
 * Sanitize URL parameters
 * Validates ObjectId format and blocks injection attempts
 *
 * Usage: Apply to routes with :id parameter
 *
 * @example
 * router.get('/api/employees/:id', sanitizeParams, getEmployeeById);
 */
export const sanitizeParams = (req, res, next) => {
  // Check common ID parameters
  const idParams = ['id', 'employeeId', 'projectId', 'taskId', 'clientId'];

  for (const param of idParams) {
    if (req.params[param]) {
      // If it looks like an ObjectId, validate it
      if (req.params[param].length === 24) {
        if (!isValidObjectId(req.params[param])) {
          console.warn(`[Security] Invalid ObjectId format in param "${param}" from ${req.user?.userId || 'anonymous'}`);
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_ID_FORMAT',
              message: `Invalid ${param} format`,
              requestId: req.id || 'no-id',
            },
          });
        }
      }

      // Block MongoDB operators in params
      if (req.params[param].includes('$') || req.params[param].includes('{')) {
        console.warn(`[Security] Blocked injection attempt in param "${param}" from ${req.user?.userId || 'anonymous'}`);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `Invalid ${param}`,
            requestId: req.id || 'no-id',
          },
        });
      }
    }
  }

  next();
};

/**
 * Combined sanitization middleware
 * Applies all sanitization checks
 *
 * Usage: Apply to all routes for comprehensive protection
 *
 * @example
 * router.use('/api/', sanitizeAll);
 */
export const sanitizeAll = (req, res, next) => {
  // Apply query sanitization
  sanitizeQuery(req, res, (err) => {
    if (err) return next(err);

    // Apply body sanitization
    sanitizeBody(req, res, (err) => {
      if (err) return next(err);

      // Apply params sanitization
      sanitizeParams(req, res, next);
    });
  });
};

export default {
  sanitizeQuery,
  sanitizeBody,
  sanitizeParams,
  sanitizeAll,
};
