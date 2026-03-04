/**
 * Log Sanitization Utility
 * Removes sensitive data from logs
 *
 * SECURITY FIX - Phase 2, Task 2.5
 * Created: 2026-03-02
 */

// Fields to always redact
const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'currentPassword',
  'confirmPassword',
  'oldPassword',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'secretKey',
  'privateKey',
  'clerkSecret',
  'clerkPublishableKey',
  'clerkSecretKey',
  'bankDetails',
  'accountNumber',
  'ifscCode',
  'bankName',
  'branch',
  'aadhar',
  'aadharNumber',
  'pan',
  'panNumber',
  'passport',
  'passportNumber',
  'ssn',
  'creditCard',
  'cardNumber',
  'cvv',
  'pin',
  'otp',
  'sessionId',
  'sessionToken',
  'csrfToken',
  'authorization',
  'cookie',
  'cookies'
];

/**
 * Check if a field name indicates sensitive data
 * @param {string} fieldName - Name of the field to check
 * @returns {boolean} True if field is sensitive
 */
const isSensitiveField = (fieldName) => {
  const lowerFieldName = fieldName.toLowerCase();
  return SENSITIVE_FIELDS.some(sensitiveField =>
    lowerFieldName.includes(sensitiveField.toLowerCase())
  );
};

/**
 * Sanitize object by redacting sensitive fields
 * @param {*} obj - Object to sanitize
 * @param {Array<string>} additionalFields - Additional fields to redact
 * @param {number} depth - Current recursion depth (prevents infinite loops)
 * @returns {*} Sanitized object
 */
export const sanitizeForLogs = (obj, additionalFields = [], depth = 0) => {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[Max Depth Reached]';
  }

  // Handle null/undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle non-objects (primitives)
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects
  if (obj instanceof Date) {
    return obj;
  }

  // Handle Arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForLogs(item, additionalFields, depth + 1));
  }

  // Handle Objects
  const sanitized = {};
  const fieldsToRedact = [...SENSITIVE_FIELDS, ...additionalFields];

  for (const [key, value] of Object.entries(obj)) {
    // Check if field should be redacted
    const shouldRedact = fieldsToRedact.some(field =>
      key.toLowerCase().includes(field.toLowerCase())
    );

    if (shouldRedact) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeForLogs(value, additionalFields, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Sanitize error object for logging
 * @param {Error} error - Error object
 * @returns {Object} Sanitized error
 */
export const sanitizeError = (error) => {
  if (!error) return null;

  return {
    message: error.message,
    code: error.code,
    name: error.name,
    // Don't include stack trace in production
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    // Sanitize any error.data
    data: error.data ? sanitizeForLogs(error.data) : undefined,
    // Sanitize error response data (for axios errors)
    response: error.response ? {
      status: error.response.status,
      statusText: error.response.statusText,
      data: sanitizeForLogs(error.response.data)
    } : undefined
  };
};

/**
 * Sanitize request object for logging
 * @param {Object} req - Express request object
 * @returns {Object} Sanitized request info
 */
export const sanitizeRequest = (req) => {
  if (!req) return null;

  return {
    method: req.method,
    url: req.url,
    path: req.path,
    query: sanitizeForLogs(req.query),
    params: sanitizeForLogs(req.params),
    // Never log request body with sensitive data
    body: req.body ? sanitizeForLogs(req.body) : undefined,
    headers: {
      'user-agent': req.headers['user-agent'],
      'content-type': req.headers['content-type'],
      // Don't log authorization header
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      // Don't log cookies
      cookie: req.headers.cookie ? '[REDACTED]' : undefined
    },
    ip: req.ip,
    userId: req.user?.userId,
    role: req.user?.role,
    companyId: req.user?.companyId,
    requestId: req.id
  };
};

/**
 * Safe logger wrapper
 * Automatically sanitizes all logged objects
 */
export const safeLog = {
  /**
   * Log info message with sanitized data
   * @param {string} message - Log message
   * @param {*} data - Data to log (will be sanitized)
   */
  info: (message, data) => {
    if (data !== undefined) {
      console.log(`[INFO] ${message}`, sanitizeForLogs(data));
    } else {
      console.log(`[INFO] ${message}`);
    }
  },

  /**
   * Log warning message with sanitized data
   * @param {string} message - Log message
   * @param {*} data - Data to log (will be sanitized)
   */
  warn: (message, data) => {
    if (data !== undefined) {
      console.warn(`[WARN] ${message}`, sanitizeForLogs(data));
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  /**
   * Log error message with sanitized error
   * @param {string} message - Log message
   * @param {Error|*} error - Error to log (will be sanitized)
   */
  error: (message, error) => {
    if (error instanceof Error) {
      console.error(`[ERROR] ${message}`, sanitizeError(error));
    } else if (error !== undefined) {
      console.error(`[ERROR] ${message}`, sanitizeForLogs(error));
    } else {
      console.error(`[ERROR] ${message}`);
    }
  },

  /**
   * Log debug message with sanitized data (only in development)
   * @param {string} message - Log message
   * @param {*} data - Data to log (will be sanitized)
   */
  debug: (message, data) => {
    if (process.env.NODE_ENV !== 'production') {
      if (data !== undefined) {
        console.debug(`[DEBUG] ${message}`, sanitizeForLogs(data));
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  },

  /**
   * Log request with sanitized data
   * @param {string} message - Log message
   * @param {Object} req - Express request object
   */
  request: (message, req) => {
    console.log(`[REQUEST] ${message}`, sanitizeRequest(req));
  }
};

/**
 * Create a sanitized logger for a specific module
 * @param {string} moduleName - Name of the module
 * @returns {Object} Logger with module prefix
 */
export const createLogger = (moduleName) => {
  return {
    info: (message, data) => safeLog.info(`[${moduleName}] ${message}`, data),
    warn: (message, data) => safeLog.warn(`[${moduleName}] ${message}`, data),
    error: (message, error) => safeLog.error(`[${moduleName}] ${message}`, error),
    debug: (message, data) => safeLog.debug(`[${moduleName}] ${message}`, data),
    request: (message, req) => safeLog.request(`[${moduleName}] ${message}`, req)
  };
};

/**
 * Redact partial data (show only first/last few characters)
 * Useful for tokens, IDs, etc.
 * @param {string} str - String to redact
 * @param {number} showFirst - Number of characters to show at start
 * @param {number} showLast - Number of characters to show at end
 * @returns {string} Partially redacted string
 */
export const partialRedact = (str, showFirst = 4, showLast = 4) => {
  if (!str || typeof str !== 'string') return '[REDACTED]';
  if (str.length <= showFirst + showLast) return '[REDACTED]';

  const first = str.substring(0, showFirst);
  const last = str.substring(str.length - showLast);
  const middle = '*'.repeat(Math.max(8, str.length - showFirst - showLast));

  return `${first}${middle}${last}`;
};
