/**
 * Phase 6 - Error Handler Security Tests
 *
 * Verifies that error responses never leak sensitive information
 * (stack traces, internal details) to API consumers.
 */

import {
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
  buildNotFoundError,
  buildConflictError,
  buildBadRequestError,
  buildForbiddenError,
} from '../../../middleware/errorHandler.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockRequest = (overrides = {}) => ({
  id: 'req-test-123',
  path: '/api/test',
  method: 'GET',
  ip: '127.0.0.1',
  get: jest.fn(() => 'test-agent'),
  ...overrides,
});

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn();

// Suppress logger output in tests
jest.mock('../../../utils/logger.js', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
    devLog: jest.fn(),
    devError: jest.fn(),
  };
});

jest.mock('../../../utils/logSanitization.js', () => ({
  __esModule: true,
  sanitizeError: jest.fn((obj) => obj),
  sanitizeForLogs: jest.fn((obj) => obj),
}));

// ─── Custom Error Classes ───────────────────────────────────────────────────

describe('Custom Error Classes', () => {
  test('AppError sets correct properties', () => {
    const error = new AppError('Test error', 500, 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('TEST_CODE');
    expect(error.isOperational).toBe(true);
    expect(error.stack).toBeDefined();
  });

  test('ValidationError defaults to 400', () => {
    const error = new ValidationError('Invalid input', [{ field: 'name', message: 'Required' }]);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details).toHaveLength(1);
  });

  test('NotFoundError defaults to 404', () => {
    const error = new NotFoundError();
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Resource not found');
  });

  test('ConflictError defaults to 409', () => {
    const error = new ConflictError();
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  test('UnauthorizedError defaults to 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHORIZED');
  });

  test('ForbiddenError defaults to 403', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
  });
});

// ─── Error Handler - Stack Trace Prevention ─────────────────────────────────

describe('Error Handler - Stack Trace Prevention', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  test('NEVER includes stack trace in development response', () => {
    process.env.NODE_ENV = 'development';
    const req = mockRequest();
    const res = mockResponse();

    const error = new AppError('Dev error', 500, 'DEV_ERROR');

    errorHandler(error, req, res, mockNext);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.error).toBeDefined();
    expect(responseBody.error.stack).toBeUndefined();
    expect(responseBody.stack).toBeUndefined();
    expect(JSON.stringify(responseBody)).not.toContain('at ');
  });

  test('NEVER includes stack trace in production response', () => {
    process.env.NODE_ENV = 'production';
    const req = mockRequest();
    const res = mockResponse();

    const error = new AppError('Prod error', 500, 'PROD_ERROR');

    errorHandler(error, req, res, mockNext);

    const responseBody = res.json.mock.calls[0][0];
    expect(responseBody.error).toBeDefined();
    expect(responseBody.error.stack).toBeUndefined();
    expect(responseBody.stack).toBeUndefined();
  });

  test('production: non-operational errors return generic message', () => {
    process.env.NODE_ENV = 'production';
    const req = mockRequest();
    const res = mockResponse();

    // Non-operational error (e.g. a programming bug)
    const error = new Error('Some internal database connection string leaked');

    errorHandler(error, req, res, mockNext);

    const responseBody = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(500);
    expect(responseBody.error.message).toBe('An unexpected error occurred');
    expect(responseBody.error.code).toBe('INTERNAL_ERROR');
    // Must NOT contain the original message
    expect(JSON.stringify(responseBody)).not.toContain('database connection string');
  });

  test('production: operational errors return their message', () => {
    process.env.NODE_ENV = 'production';
    const req = mockRequest();
    const res = mockResponse();

    const error = new NotFoundError('Employee not found');

    errorHandler(error, req, res, mockNext);

    const responseBody = res.json.mock.calls[0][0];
    expect(res.status).toHaveBeenCalledWith(404);
    expect(responseBody.error.message).toBe('Employee not found');
    expect(responseBody.error.code).toBe('NOT_FOUND');
  });
});

// ─── Error Handler - Mongoose Error Mapping ─────────────────────────────────

describe('Error Handler - Mongoose Error Mapping', () => {
  test('maps Mongoose ValidationError to 400', () => {
    const req = mockRequest();
    const res = mockResponse();

    const error = new Error('Validation failed');
    error.name = 'ValidationError';
    error.errors = {
      email: { path: 'email', message: 'Email is required' },
    };

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('maps Mongoose duplicate key error (11000) to 409', () => {
    const req = mockRequest();
    const res = mockResponse();

    const error = new Error('Duplicate key');
    error.code = 11000;
    error.keyPattern = { email: 1 };

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(409);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('CONFLICT');
  });

  test('maps Mongoose CastError to 400', () => {
    const req = mockRequest();
    const res = mockResponse();

    const error = new Error('Cast error');
    error.name = 'CastError';
    error.path = '_id';
    error.value = 'not-an-objectid';

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('maps BSONError to 400', () => {
    const req = mockRequest();
    const res = mockResponse();

    const error = new Error('BSON error');
    error.name = 'BSONError';

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── Error Handler - Auth Error Mapping ─────────────────────────────────────

describe('Error Handler - Auth Error Mapping', () => {
  test('maps TokenExpiredError to 401', () => {
    const req = mockRequest();
    const res = mockResponse();

    const error = new Error('jwt expired');
    error.name = 'TokenExpiredError';

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = res.json.mock.calls[0][0];
    expect(body.error.message).toBe('Token has expired');
  });

  test('maps JsonWebTokenError to 401', () => {
    const req = mockRequest();
    const res = mockResponse();

    const error = new Error('invalid token');
    error.name = 'JsonWebTokenError';

    errorHandler(error, req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(401);
    const body = res.json.mock.calls[0][0];
    expect(body.error.message).toBe('Invalid token');
  });
});

// ─── Not Found Handler ──────────────────────────────────────────────────────

describe('Not Found Handler', () => {
  test('returns 404 with route info', () => {
    const req = mockRequest({ method: 'POST', path: '/api/nonexistent' });
    const res = mockResponse();

    notFoundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toContain('POST');
    expect(body.error.message).toContain('/api/nonexistent');
  });

  test('includes requestId in response', () => {
    const req = mockRequest({ id: 'req-abc-123' });
    const res = mockResponse();

    notFoundHandler(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.error.requestId).toBe('req-abc-123');
  });
});

// ─── Async Handler ──────────────────────────────────────────────────────────

describe('asyncHandler', () => {
  test('passes caught errors to next()', async () => {
    const error = new Error('Async failure');
    const handler = asyncHandler(async () => { throw error; });
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    await handler(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  test('does not call next on success', async () => {
    const handler = asyncHandler(async (req, res) => {
      res.json({ ok: true });
    });
    const req = mockRequest();
    const res = mockResponse();
    const next = jest.fn();

    await handler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});

// ─── Error Builder Helpers ──────────────────────────────────────────────────

describe('Error Builder Helpers', () => {
  test('buildValidationError creates proper error', () => {
    const error = buildValidationError('email', 'Invalid email');
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.statusCode).toBe(400);
    expect(error.details[0].field).toBe('email');
  });

  test('buildNotFoundError with identifier', () => {
    const error = buildNotFoundError('Employee', 'EMP-123');
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toContain('EMP-123');
  });

  test('buildNotFoundError without identifier', () => {
    const error = buildNotFoundError('Employee');
    expect(error).toBeInstanceOf(NotFoundError);
    expect(error.message).toBe('Employee not found');
  });

  test('buildConflictError', () => {
    const error = buildConflictError('Employee', 'email test@test.com');
    expect(error).toBeInstanceOf(ConflictError);
    expect(error.statusCode).toBe(409);
  });

  test('buildBadRequestError', () => {
    const error = buildBadRequestError('Bad input');
    expect(error).toBeInstanceOf(AppError);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('BAD_REQUEST');
  });

  test('buildForbiddenError', () => {
    const error = buildForbiddenError('No access');
    expect(error).toBeInstanceOf(ForbiddenError);
    expect(error.statusCode).toBe(403);
  });
});

// ─── Response Shape Consistency ─────────────────────────────────────────────

describe('Response Shape Consistency', () => {
  test('all error responses have success: false', () => {
    const req = mockRequest();
    const res = mockResponse();

    const errors = [
      new ValidationError('Test'),
      new NotFoundError(),
      new UnauthorizedError(),
      new ForbiddenError(),
      new AppError('Test', 500),
    ];

    errors.forEach(error => {
      jest.clearAllMocks();
      errorHandler(error, req, res, mockNext);
      const body = res.json.mock.calls[0][0];
      expect(body.success).toBe(false);
    });
  });

  test('all error responses have error.code and error.message', () => {
    const req = mockRequest();
    const res = mockResponse();

    const error = new AppError('Test error', 400, 'TEST');
    errorHandler(error, req, res, mockNext);

    const body = res.json.mock.calls[0][0];
    expect(body.error.code).toBeDefined();
    expect(body.error.message).toBeDefined();
    expect(body.error.requestId).toBeDefined();
  });
});
