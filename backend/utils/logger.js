/**
 * Logger Configuration
 *
 * Centralized logging utility using Winston
 * Provides structured logging with multiple transports
 *
 * @module utils/logger
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Custom format for console output with colors
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      // Filter out unwanted properties
      const filteredMeta = Object.keys(meta).reduce((acc, key) => {
        if (key !== 'level' && key !== 'message' && key !== 'timestamp') {
          acc[key] = meta[key];
        }
        return acc;
      }, {});

      if (Object.keys(filteredMeta).length > 0) {
        msg += ' ' + JSON.stringify(filteredMeta, null, 2);
      }
    }

    return msg;
  })
);

// Custom format for file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  verbose: 5
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  verbose: 'cyan'
};

winston.addColors(colors);

/**
 * Create Winston logger
 */
const logger = winston.createLogger({
  levels,
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: {
    service: 'manageRTC-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Console transport (only in non-production)
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'production'
    }),

    // Error log file
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat
    }),

    // Combined log file
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: fileFormat
    }),

    // HTTP request log (for API logging)
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'http',
      maxSize: '20m',
      maxFiles: '7d',
      format: fileFormat
    })
  ],

  // Handle exceptions and rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d'
    })
  ]
});

/**
 * HTTP request logger middleware
 */
export const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'manageRTC-http'
  },
  transports: [
    new DailyRotateFile({
      filename: path.join(__dirname, '../../logs/http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d'
    })
  ]
});

/**
 * Request logging middleware for Express
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next function
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.http('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId || 'anonymous',
    companyId: req.user?.companyId || 'unknown'
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.userId || 'anonymous',
      companyId: req.user?.companyId || 'unknown'
    };

    if (res.statusCode >= 400) {
      logger.warn('Request completed with error', logData);
    } else {
      logger.http('Request completed', logData);
    }
  });

  next();
};

/**
 * Error logging helper
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export const logError = (error, context = {}) => {
  logger.error('Error occurred', {
    message: error.message,
    stack: error.stack,
    name: error.name,
    ...context
  });
};

/**
 * Security event logging
 * @param {string} event - Event type
 * @param {Object} data - Event data
 */
export const logSecurityEvent = (event, data = {}) => {
  logger.warn('Security event', {
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Audit logging for important actions
 * @param {string} action - Action performed
 * @param {string} userId - User ID
 * @param {string} companyId - Company ID
 * @param {Object} details - Action details
 */
export const logAudit = (action, userId, companyId, details = {}) => {
  logger.info('Audit log', {
    action,
    userId,
    companyId,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Performance logging
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in ms
 * @param {Object} metadata - Additional metadata
 */
export const logPerformance = (operation, duration, metadata = {}) => {
  logger.debug('Performance metric', {
    operation,
    duration: `${duration}ms`,
    ...metadata
  });
};

/**
 * Query logging for database operations
 * @param {string} model - Model name
 * @param {string} operation - Operation type
 * @param {number} duration - Duration in ms
 */
export const logQuery = (model, operation, duration) => {
  if (duration > 1000) {
    logger.warn('Slow query detected', {
      model,
      operation,
      duration: `${duration}ms`
    });
  } else {
    logger.debug('Query executed', {
      model,
      operation,
      duration: `${duration}ms`
    });
  }
};

/**
 * HRM Business event logging
 * @param {string} eventType - Event type (clock-in, clock-out, leave-request, etc.)
 * @param {Object} data - Event data
 */
export const logHRMEvent = (eventType, data = {}) => {
  logger.info('HRM Event', {
    eventType,
    ...data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Attendance specific logging
 */
export const logAttendanceEvent = (action, attendanceData, user) => {
  logHRMEvent('attendance', {
    action, // clock-in, clock-out, regularization, etc.
    attendanceId: attendanceData.attendanceId || attendanceData._id,
    employeeId: attendanceData.employeeId,
    employeeName: attendanceData.employeeName,
    performedBy: user?.userId,
    companyId: user?.companyId,
    details: attendanceData
  });
};

/**
 * Leave specific logging
 */
export const logLeaveEvent = (action, leaveData, user) => {
  logHRMEvent('leave', {
    action, // create, approve, reject, cancel, etc.
    leaveId: leaveData.leaveId || leaveData._id,
    employeeId: leaveData.employeeId,
    employeeName: leaveData.employeeName,
    leaveType: leaveData.leaveType,
    status: leaveData.status,
    duration: leaveData.duration,
    performedBy: user?.userId,
    companyId: user?.companyId,
    details: leaveData
  });
};

/**
 * Employee specific logging
 */
export const logEmployeeEvent = (action, employeeData, user) => {
  logHRMEvent('employee', {
    action, // create, update, delete, sync, etc.
    employeeId: employeeData.employeeId || employeeData._id,
    employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
    performedBy: user?.userId,
    companyId: user?.companyId,
    details: employeeData
  });
};

/**
 * Create a child logger with additional metadata
 * @param {Object} metadata - Additional metadata for child logger
 * @returns {Object} Child logger
 */
export const createChildLogger = (metadata) => {
  return logger.child(metadata);
};

/**
 * Development logger (verbose, with colors)
 */
export const devLogger = winston.createLogger({
  level: 'debug',
  format: consoleFormat,
  transports: [
    new winston.transports.Console()
  ]
});

/**
 * Check if current environment is development
 * @returns {boolean} True if in development mode
 */
export const isDevelopment = () => process.env.NODE_ENV === 'development';

/**
 * Check if current environment is production
 * @returns {boolean} True if in production mode
 */
export const isProduction = () => process.env.NODE_ENV === 'production';

/**
 * Check if current environment is test
 * @returns {boolean} True if in test mode
 */
export const isTest = () => process.env.NODE_ENV === 'test';

/**
 * Check if debug logging is enabled
 * @returns {boolean} True if debug output should be shown
 */
export const isDebug = () => isDevelopment() || process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug';

/**
 * Development-only console log helper
 * Only outputs in development or when DEBUG=true
 * Use this to replace direct console.log calls
 *
 * @param {string} message - Message to log
 * @param {...any} args - Additional arguments
 */
export const devLog = (message, ...args) => {
  if (isDebug()) {
    console.log(`[DEV] ${message}`, ...args);
  }
};

/**
 * Development-only console debug helper
 * Only outputs in development or when DEBUG=true
 *
 * @param {string} message - Message to log
 * @param {...any} args - Additional arguments
 */
export const devDebug = (message, ...args) => {
  if (isDebug()) {
    console.debug(`[DEBUG] ${message}`, ...args);
  }
};

/**
 * Development-only console warn helper
 * Outputs in all environments but marked as development
 *
 * @param {string} message - Message to log
 * @param {...any} args - Additional arguments
 */
export const devWarn = (message, ...args) => {
  if (isDebug()) {
    console.warn(`[DEV-WARN] ${message}`, ...args);
  } else {
    // In production, still log warnings but without the DEV prefix
    logger.warn(message, args);
  }
};

/**
 * Development-only console error helper
 * Always logs errors in all environments
 *
 * @param {string} message - Message to log
 * @param {...any} args - Additional arguments
 */
export const devError = (message, ...args) => {
  console.error(message, ...args);
  // Also log to winston for file storage
  logger.error(message, args);
};

// Development check
if (isDevelopment()) {
  logger.debug('Logging initialized at debug level');
  logger.debug('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    LOG_LEVEL: process.env.LOG_LEVEL,
    DEBUG: process.env.DEBUG
  });
}

export default logger;
