/**
 * Input Sanitization Utility
 * Provides secure sanitization for user inputs to prevent XSS, injection attacks
 */

import logger from './logger.js';

/**
 * Sanitize a string input to prevent XSS attacks
 * Removes or escapes dangerous HTML/JS characters
 * @param {string} input - Raw input string
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input, options = {}) => {
  if (typeof input !== 'string') {
    return input;
  }

  const {
    stripTags = true,
    escapeHtml = true,
    trim = true,
    maxLength = null,
    removeNullBytes = true
  } = options;

  let sanitized = input;

  // Remove null bytes
  if (removeNullBytes) {
    sanitized = sanitized.replace(/\0/g, '');
  }

  // Trim whitespace
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Strip HTML tags
  if (stripTags) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Escape HTML special characters
  if (escapeHtml) {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    sanitized = sanitized.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
  }

  // Enforce max length
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    logger.warn('Input truncated due to max length', { maxLength });
  }

  return sanitized;
};

/**
 * Sanitize notes/text fields with common options
 * @param {string} text - Input text
 * @returns {string} Sanitized text
 */
export const sanitizeNotes = (text) => {
  if (!text || typeof text !== 'string') {
    return text;
  }

  return sanitizeString(text, {
    stripTags: true,
    escapeHtml: true,
    trim: true,
    maxLength: 5000 // Reasonable limit for notes
  });
};

/**
 * Sanitize employee ID (alphanumeric and specific chars only)
 * @param {string} employeeId - Employee ID
 * @returns {string} Sanitized employee ID
 */
export const sanitizeEmployeeId = (employeeId) => {
  if (!employeeId || typeof employeeId !== 'string') {
    return employeeId;
  }

  // Only allow alphanumeric, hyphen, underscore
  return employeeId.replace(/[^a-zA-Z0-9-_]/g, '');
};

/**
 * Sanitize date string
 * @param {string} dateStr - Date string
 * @returns {string} Sanitized date string
 */
export const sanitizeDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') {
    return dateStr;
  }

  // Remove any non-date characters (keep digits, hyphen, T, Z, :)
  return dateStr.replace(/[^0-9\-T:Z.]/g, '');
};

/**
 * Sanitize numeric input
 * @param {*} value - Input value
 * @param {Object} options - Options
 * @returns {number|null} Sanitized number
 */
export const sanitizeNumber = (value, options = {}) => {
  const { min = null, max = null, defaultValue = null } = options;

  const num = Number(value);

  if (isNaN(num)) {
    return defaultValue;
  }

  if (min !== null && num < min) {
    logger.warn('Number below minimum', { value: num, min });
    return defaultValue;
  }

  if (max !== null && num > max) {
    logger.warn('Number above maximum', { value: num, max });
    return defaultValue;
  }

  return num;
};

/**
 * Sanitize object recursively
 * @param {Object} obj - Object to sanitize
 * @param {Object} fieldConfigs - Field-specific configurations
 * @returns {Object} Sanitized object
 */
export const sanitizeObject = (obj, fieldConfigs = {}) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = {};

  for (const [key, value] of Object.entries(obj)) {
    const config = fieldConfigs[key];

    if (config) {
      // Apply field-specific sanitization
      switch (config.type) {
        case 'string':
        case 'notes':
          sanitized[key] = sanitizeNotes(value);
          break;
        case 'employeeId':
          sanitized[key] = sanitizeEmployeeId(value);
          break;
        case 'date':
          sanitized[key] = sanitizeDate(value);
          break;
        case 'number':
          sanitized[key] = sanitizeNumber(value, config.options);
          break;
        case 'array':
          if (Array.isArray(value)) {
            sanitized[key] = value.map(item => {
              if (config.itemType === 'string') {
                return sanitizeString(item);
              }
              return item;
            });
          } else {
            sanitized[key] = value;
          }
          break;
        default:
          sanitized[key] = value;
      }
    } else if (typeof value === 'string') {
      // Default string sanitization
      sanitized[key] = sanitizeString(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

/**
 * Sanitize attendance data
 * @param {Object} data - Attendance data
 * @returns {Object} Sanitized attendance data
 */
export const sanitizeAttendanceData = (data) => {
  const config = {
    employeeId: { type: 'employeeId' },
    date: { type: 'date' },
    'clockIn.time': { type: 'date' },
    'clockIn.notes': { type: 'notes' },
    'clockIn.location': { type: 'string' },
    'clockOut.time': { type: 'date' },
    'clockOut.notes': { type: 'notes' },
    'clockOut.location': { type: 'string' },
    notes: { type: 'notes' },
    location: { type: 'string' },
    status: { type: 'string' },
    reason: { type: 'notes' }
  };

  return sanitizeObject(data, config);
};

/**
 * Sanitize overtime request data
 * @param {Object} data - Overtime request data
 * @returns {Object} Sanitized overtime data
 */
export const sanitizeOvertimeData = (data) => {
  const config = {
    employeeId: { type: 'employeeId' },
    date: { type: 'date' },
    startTime: { type: 'date' },
    endTime: { type: 'date' },
    reason: { type: 'notes' },
    description: { type: 'notes' },
    notes: { type: 'notes' },
    status: { type: 'string' },
    approvedBy: { type: 'employeeId' }
  };

  return sanitizeObject(data, config);
};

/**
 * Sanitize timesheet data
 * @param {Object} data - Timesheet data
 * @returns {Object} Sanitized timesheet data
 */
export const sanitizeTimesheetData = (data) => {
  const config = {
    employeeId: { type: 'employeeId' },
    startDate: { type: 'date' },
    endDate: { type: 'date' },
    notes: { type: 'notes' },
    status: { type: 'string' },
    submittedBy: { type: 'employeeId' },
    approvedBy: { type: 'employeeId' }
  };

  const sanitized = sanitizeObject(data, config);

  // Sanitize entries array
  if (Array.isArray(sanitized.entries)) {
    sanitized.entries = sanitized.entries.map(entry => ({
      date: sanitizeDate(entry.date),
      hours: sanitizeNumber(entry.hours, { min: 0, max: 24, defaultValue: 0 }),
      description: sanitizeNotes(entry.description),
      project: entry.project ? sanitizeString(entry.project) : entry.project,
      task: entry.task ? sanitizeString(entry.task) : entry.task
    }));
  }

  return sanitized;
};

/**
 * Sanitize leave request data
 * @param {Object} data - Leave request data
 * @returns {Object} Sanitized leave data
 */
export const sanitizeLeaveData = (data) => {
  const config = {
    employeeId: { type: 'employeeId' },
    leaveType: { type: 'string' },
    startDate: { type: 'date' },
    endDate: { type: 'date' },
    reason: { type: 'notes' },
    notes: { type: 'notes' },
    status: { type: 'string' },
    approvedBy: { type: 'employeeId' },
    rejectionReason: { type: 'notes' }
  };

  return sanitizeObject(data, config);
};

/**
 * Middleware to sanitize request body
 * @param {Object} configs - Sanitization configurations
 * @returns {Function} Express middleware
 */
export const sanitizeBody = (configs = {}) => {
  return (req, res, next) => {
    try {
      if (req.body && typeof req.body === 'object') {
        if (configs.type === 'attendance') {
          req.body = sanitizeAttendanceData(req.body);
        } else if (configs.type === 'overtime') {
          req.body = sanitizeOvertimeData(req.body);
        } else if (configs.type === 'timesheet') {
          req.body = sanitizeTimesheetData(req.body);
        } else if (configs.type === 'leave') {
          req.body = sanitizeLeaveData(req.body);
        } else if (configs.fields) {
          req.body = sanitizeObject(req.body, configs.fields);
        } else {
          // Basic sanitization for all string fields
          req.body = sanitizeObject(req.body);
        }
      }
      next();
    } catch (error) {
      logger.error('Error sanitizing request body', { error: error.message });
      return res.status(400).json({
        success: false,
        error: {
          code: 'SANITIZATION_ERROR',
          message: 'Invalid input data'
        }
      });
    }
  };
};

/**
 * Middleware to sanitize query parameters
 * @returns {Function} Express middleware
 */
export const sanitizeQuery = () => {
  return (req, res, next) => {
    try {
      if (req.query && typeof req.query === 'object') {
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === 'string') {
            // Be more lenient with query params - just escape dangerous chars
            req.query[key] = sanitizeString(value, {
              stripTags: false,
              escapeHtml: true,
              trim: true
            });
          }
          // Keep other types (numbers, arrays) as-is
        }
      }
      next();
    } catch (error) {
      console.error('[SanitizeQuery] Error:', error.message, error.stack);
      logger.error('Error sanitizing query params', { error: error.message, stack: error.stack });
      return res.status(400).json({
        success: false,
        error: {
          code: 'SANITIZATION_ERROR',
          message: 'Invalid query parameters'
        }
      });
    }
  };
};

/**
 * Validate and sanitize MongoDB ObjectId
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid ObjectId format
 */
export const isValidObjectId = (id) => {
  if (!id || typeof id !== 'string') {
    return false;
  }
  // MongoDB ObjectId hex string pattern (24 characters)
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Sanitize array of IDs
 * @param {Array} ids - Array of IDs
 * @returns {Array} Sanitized array
 */
export const sanitizeIdArray = (ids) => {
  if (!Array.isArray(ids)) {
    return [];
  }

  return ids
    .filter(id => typeof id === 'string' && isValidObjectId(id))
    .map(id => id.trim());
};

/**
 * SQL Injection prevention for MongoDB
 * Removes MongoDB operator injection attempts
 * @param {Object} query - Query object
 * @returns {Object} Safe query object
 */
export const sanitizeMongoQuery = (query) => {
  const dangerousOperators = [
    '$where', '$expr', '$jsonSchema', '$mod', '$ne',
    '$gt', '$lt', '$gte', '$lte', '$in', '$nin',
    '$and', '$or', '$not', '$nor', '$exists'
  ];

  const sanitizeValue = (value) => {
    if (value && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        if (dangerousOperators.includes(key)) {
          logger.warn('Detected MongoDB operator injection attempt', { key });
          delete value[key];
        } else {
          value[key] = sanitizeValue(value[key]);
        }
      }
    }
    return value;
  };

  return sanitizeValue({ ...query });
};

export default {
  sanitizeString,
  sanitizeNotes,
  sanitizeEmployeeId,
  sanitizeDate,
  sanitizeNumber,
  sanitizeObject,
  sanitizeAttendanceData,
  sanitizeOvertimeData,
  sanitizeTimesheetData,
  sanitizeLeaveData,
  sanitizeBody,
  sanitizeQuery,
  isValidObjectId,
  sanitizeIdArray,
  sanitizeMongoQuery
};
