/**
 * Error Handler Middleware for REST APIs
 * Centralized error handling with proper HTTP status codes and logging
 */

/**
 * Custom Error Classes
 */

export class AppError extends Error {
  constructor(message, statusCode, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Mongoose Error Handler
 * Converts Mongoose errors to AppErrors
 */
const handleMongooseError = (error) => {
  // Validation Error
  if (error.name === 'ValidationError') {
    const details = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));

    return new ValidationError('Validation failed', details);
  }

  // Duplicate Key Error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;

    return new ConflictError(message);
  }

  // Cast Error (Invalid ObjectId)
  if (error.name === 'CastError') {
    return new ValidationError(`Invalid ${error.path}: ${error.value}`);
  }

  // Default Mongoose Error
  return new AppError(error.message, 500, 'DATABASE_ERROR');
};

/**
 * JWT/Clerk Error Handler
 */
const handleAuthError = (error) => {
  if (error.name === 'TokenExpiredError') {
    return new UnauthorizedError('Token has expired');
  }

  if (error.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Invalid token');
  }

  return new UnauthorizedError(error.message);
};

/**
 * Development vs Production Error Response
 */
const sendErrorDev = (err, req, res) => {
  console.error('[Error Details]', {
    code: err.code,
    message: err.message,
    details: err.details || [],  // ✅ Now logging validation details!
    stack: err.stack,
    requestId: req.id
  });

  return res.status(err.statusCode).json({
    success: false,
    error: {
      code: err.code,
      message: err.message,
      details: err.details || [],
      stack: err.stack,
      requestId: req.id || 'no-id'
    }
  });
};

const sendErrorProd = (err, req, res) => {
  // Operational errors: trusted, send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details || [],
        requestId: req.id || 'no-id'
      }
    });
  }

  // Programming or unknown errors: don't leak details
  console.error('[Unexpected Error]', {
    error: err.message,
    stack: err.stack,
    requestId: req.id
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      requestId: req.id || 'no-id'
    }
  });
};

/**
 * Global Error Handler Middleware
 * Catches all errors and formats response
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.code = err.code || 'INTERNAL_ERROR';
  error.statusCode = err.statusCode || 500;

  // Set default values
  error.statusCode = error.statusCode || 500;
  error.code = error.code || 'INTERNAL_ERROR';

  // Handle specific error types
  if (err.name === 'ValidationError' || err.code === 11000 || err.name === 'CastError') {
    error = handleMongooseError(err);
  } else if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
    error = handleAuthError(err);
  } else if (err.name === 'BSONError') {
    error = new ValidationError('Invalid ID format');
  }

  // Log error for debugging
  console.error('[Error Logged]', {
    code: error.code,
    message: error.message,
    details: error.details || [],  // ✅ Now logging validation details!
    statusCode: error.statusCode,
    requestId: req.id,
    path: req.path,
    method: req.method
  });

  // Send appropriate response based on environment
  const isDevelopment = process.env.NODE_ENV !== 'production';

  if (isDevelopment) {
    return sendErrorDev(error, req, res);
  }

  return sendErrorProd(error, req, res);
};

/**
 * 404 Not Found Handler
 * Handles requests to undefined routes
 */
export const notFoundHandler = (req, res) => {
  console.warn('[Route Not Found]', {
    path: req.path,
    method: req.method,
    requestId: req.id
  });

  return res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: req.id || 'no-id'
    }
  });
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors automatically
 *
 * Usage:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation Error Builder
 * Helper to build validation errors from custom validation logic
 */
export const buildValidationError = (field, message) => {
  return new ValidationError('Validation failed', [{ field, message }]);
};

/**
 * Bad Request Error Builder
 * Helper to build bad request errors (400)
 */
export const buildBadRequestError = (message) => {
  return new AppError(message, 400, 'BAD_REQUEST');
};

/**
 * Duplicate Key Error Builder
 * Helper to build conflict errors for duplicate resources
 */
export const buildConflictError = (resource, identifier) => {
  return new ConflictError(`${resource} with ${identifier} already exists`);
};

/**
 * Not Found Error Builder
 * Helper to build not found errors
 */
export const buildNotFoundError = (resource, identifier = '') => {
  const message = identifier
    ? `${resource} with identifier '${identifier}' not found`
    : `${resource} not found`;

  return new NotFoundError(message);
};

/**
 * Forbidden Error Builder
 * Helper to build forbidden/authorization errors
 */
export const buildForbiddenError = (message = 'Access forbidden') => {
  return new ForbiddenError(message);
};

export default {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  buildValidationError,
  buildBadRequestError,
  buildConflictError,
  buildNotFoundError
};
