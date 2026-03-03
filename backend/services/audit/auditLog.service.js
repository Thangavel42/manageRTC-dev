/**
 * Audit Log Service
 * Handles all audit logging operations for security and compliance
 * Uses MongoDB native driver for consistency
 */

import { getTenantCollections } from '../../config/db.js';
import logger from '../../utils/logger.js';
import { generateRequestId } from '../../utils/helpers.js';

/**
 * Get the audit logs collection for a company
 * @param {string} companyId - Company ID
 * @returns {Collection} MongoDB collection
 */
const getAuditCollection = async (companyId) => {
  const collections = await getTenantCollections(companyId);
  return collections.auditLogs;
};

/**
 * Create an audit log entry
 * @param {Object} data - Audit log data
 * @returns {Promise<Object>} Created log entry
 */
export const createAuditLog = async (data) => {
  try {
    const {
      companyId,
      action,
      entityType,
      entityId,
      userId,
      employeeId,
      userSnapshot,
      ipAddress,
      userAgent,
      changes,
      metadata,
      result = 'success',
      errorMessage,
      requestId,
      sessionId,
      severity = 'info'
    } = data;

    if (!companyId || !action || !entityType || !userId) {
      throw new Error('Missing required fields: companyId, action, entityType, userId');
    }

    const collection = await getAuditCollection(companyId);

    // Set default expiration (2 years)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 2);

    const logEntry = {
      companyId,
      action,
      entityType,
      entityId,
      userId,
      employeeId,
      userSnapshot: userSnapshot || {},
      ipAddress,
      userAgent,
      changes: changes || {},
      metadata: metadata || {},
      result,
      errorMessage,
      requestId: requestId || generateRequestId(),
      sessionId,
      severity,
      isDeleted: false,
      expiresAt,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result_insert = await collection.insertOne(logEntry);

    logger.debug('Audit log created', {
      companyId,
      action,
      entityType,
      entityId,
      logId: result_insert.insertedId
    });

    return { ...logEntry, _id: result_insert.insertedId };
  } catch (error) {
    // Don't throw - audit logging failures shouldn't break main operations
    logger.error('Failed to create audit log', {
      error: error.message,
      action: data?.action,
      entityType: data?.entityType
    });
    return null;
  }
};

/**
 * Query audit logs with filters
 * @param {string} companyId - Company ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} Query results with pagination
 */
export const queryAuditLogs = async (companyId, filters = {}) => {
  try {
    const collection = await getAuditCollection(companyId);
    const query = { companyId, isDeleted: false };

    // Apply filters
    if (filters.action) query.action = filters.action;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.userId) query.userId = filters.userId;
    if (filters.employeeId) query.employeeId = filters.employeeId;
    if (filters.severity) query.severity = filters.severity;
    if (filters.result) query.result = filters.result;

    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const skip = (page - 1) * limit;

    // Sorting
    let sort = { createdAt: -1 };
    if (filters.sortBy) {
      const [field, order] = filters.sortBy.split(':');
      sort = { [field]: order === 'asc' ? 1 : -1 };
    }

    const [logs, total] = await Promise.all([
      collection.find(query).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query)
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    logger.error('Failed to query audit logs', { error: error.message });
    throw error;
  }
};

/**
 * Get audit statistics
 * @param {string} companyId - Company ID
 * @param {Object} filters - Date filters
 * @returns {Promise<Object>} Statistics
 */
export const getAuditStatistics = async (companyId, filters = {}) => {
  try {
    const collection = await getAuditCollection(companyId);
    const matchQuery = { companyId, isDeleted: false };

    if (filters.startDate || filters.endDate) {
      matchQuery.createdAt = {};
      if (filters.startDate) matchQuery.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) matchQuery.createdAt.$lte = new Date(filters.endDate);
    }

    const pipeline = [
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalLogs: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$result', 'success'] }, 1, 0] }
          },
          failureCount: {
            $sum: { $cond: [{ $eq: ['$result', 'failure'] }, 1, 0] }
          },
          criticalCount: {
            $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
          },
          warningCount: {
            $sum: { $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0] }
          },
          uniqueUsers: { $addToSet: '$userId' }
        }
      },
      {
        $project: {
          _id: 0,
          totalLogs: 1,
          successCount: 1,
          failureCount: 1,
          criticalCount: 1,
          warningCount: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ];

    const result = await collection.aggregate(pipeline).toArray();

    // Get action breakdown
    const actionBreakdown = await collection.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$action',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]).toArray();

    return {
      ...(result[0] || {
        totalLogs: 0,
        successCount: 0,
        failureCount: 0,
        criticalCount: 0,
        warningCount: 0,
        uniqueUsers: 0
      }),
      topActions: actionBreakdown.map(item => ({
        action: item._id,
        count: item.count
      }))
    };
  } catch (error) {
    logger.error('Failed to get audit statistics', { error: error.message });
    throw error;
  }
};

/**
 * Get recent activity
 * @param {string} companyId - Company ID
 * @param {number} limit - Number of entries
 * @returns {Promise<Array>} Recent logs
 */
export const getRecentActivity = async (companyId, limit = 20) => {
  try {
    const collection = await getAuditCollection(companyId);

    return await collection
      .find({
        companyId,
        isDeleted: false,
        result: 'success'
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  } catch (error) {
    logger.error('Failed to get recent activity', { error: error.message });
    throw error;
  }
};

/**
 * Get entity history
 * @param {string} companyId - Company ID
 * @param {string} entityType - Entity type
 * @param {string} entityId - Entity ID
 * @returns {Promise<Array>} Entity history
 */
export const getEntityHistory = async (companyId, entityType, entityId) => {
  try {
    const collection = await getAuditCollection(companyId);

    return await collection
      .find({
        companyId,
        entityType,
        entityId,
        isDeleted: false
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();
  } catch (error) {
    logger.error('Failed to get entity history', { error: error.message });
    throw error;
  }
};

/**
 * Cleanup old audit logs
 * @param {string} companyId - Company ID
 * @param {number} retentionDays - Retention period in days (default 730 = 2 years)
 * @returns {Promise<Object>} Deletion result
 */
export const cleanupOldLogs = async (companyId, retentionDays = 730) => {
  try {
    const collection = await getAuditCollection(companyId);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await collection.deleteMany({
      companyId,
      createdAt: { $lt: cutoffDate }
    });

    logger.info('Audit logs cleaned up', {
      companyId,
      deletedCount: result.deletedCount,
      cutoffDate
    });

    return { deletedCount: result.deletedCount };
  } catch (error) {
    logger.error('Failed to cleanup audit logs', { error: error.message });
    throw error;
  }
};

/**
 * Create user snapshot for audit log
 * @param {Object} user - User object
 * @returns {Object} User snapshot
 */
export const createUserSnapshot = (user) => {
  return {
    employeeId: user?.employeeId || null,
    name: user?.name || user?.firstName && user?.lastName
      ? `${user.firstName} ${user.lastName}`
      : null,
    email: user?.email || null,
    role: user?.role || user?.publicMetadata?.role || null
  };
};

/**
 * Calculate changes between old and new values
 * @param {Object} oldData - Original data
 * @param {Object} newData - New data
 * @returns {Object} Changes object
 */
export const calculateChanges = (oldData, newData) => {
  const changes = {
    before: {},
    after: {},
    diff: []
  };

  if (!oldData || !newData) {
    return changes;
  }

  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

  for (const key of allKeys) {
    const oldValue = oldData?.[key];
    const newValue = newData?.[key];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes.before[key] = oldValue;
      changes.after[key] = newValue;
      changes.diff.push({
        field: key,
        from: oldValue,
        to: newValue
      });
    }
  }

  return changes;
};

// Convenience functions for common actions

/**
 * Log leave action
 */
export const logLeaveAction = async (companyId, action, leaveData, user, req, changes = null) => {
  return createAuditLog({
    companyId,
    action,
    entityType: 'leave',
    entityId: leaveData?._id || leaveData?.id,
    userId: user?.userId || user?.id,
    employeeId: user?.employeeId,
    userSnapshot: createUserSnapshot(user),
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
    changes: changes || calculateChanges(leaveData?.before, leaveData?.after),
    metadata: {
      leaveType: leaveData?.leaveType,
      startDate: leaveData?.startDate,
      endDate: leaveData?.endDate,
      days: leaveData?.days
    },
    requestId: req?.id,
    sessionId: req?.sessionID
  });
};

/**
 * Log attendance action
 */
export const logAttendanceAction = async (companyId, action, attendanceData, user, req, changes = null) => {
  return createAuditLog({
    companyId,
    action,
    entityType: 'attendance',
    entityId: attendanceData?._id || attendanceData?.id,
    userId: user?.userId || user?.id,
    employeeId: user?.employeeId,
    userSnapshot: createUserSnapshot(user),
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
    changes: changes || calculateChanges(attendanceData?.before, attendanceData?.after),
    metadata: {
      date: attendanceData?.date,
      clockIn: attendanceData?.clockIn?.time,
      clockOut: attendanceData?.clockOut?.time,
      hoursWorked: attendanceData?.hoursWorked
    },
    requestId: req?.id,
    sessionId: req?.sessionID
  });
};

/**
 * Log overtime action
 */
export const logOvertimeAction = async (companyId, action, overtimeData, user, req, changes = null) => {
  return createAuditLog({
    companyId,
    action,
    entityType: 'overtime',
    entityId: overtimeData?._id || overtimeData?.id,
    userId: user?.userId || user?.id,
    employeeId: user?.employeeId,
    userSnapshot: createUserSnapshot(user),
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
    changes: changes || calculateChanges(overtimeData?.before, overtimeData?.after),
    metadata: {
      date: overtimeData?.date,
      hours: overtimeData?.hours,
      startTime: overtimeData?.startTime,
      endTime: overtimeData?.endTime
    },
    requestId: req?.id,
    sessionId: req?.sessionID
  });
};

/**
 * Log timesheet action
 */
export const logTimesheetAction = async (companyId, action, timesheetData, user, req, changes = null) => {
  return createAuditLog({
    companyId,
    action,
    entityType: 'timesheet',
    entityId: timesheetData?._id || timesheetData?.id,
    userId: user?.userId || user?.id,
    employeeId: user?.employeeId,
    userSnapshot: createUserSnapshot(user),
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
    changes: changes || calculateChanges(timesheetData?.before, timesheetData?.after),
    metadata: {
      startDate: timesheetData?.startDate,
      endDate: timesheetData?.endDate,
      totalHours: timesheetData?.totalHours,
      status: timesheetData?.status
    },
    requestId: req?.id,
    sessionId: req?.sessionID
  });
};

/**
 * Log security event
 */
export const logSecurityEvent = async (companyId, action, severity, details, user, req) => {
  return createAuditLog({
    companyId,
    action,
    entityType: 'system',
    userId: user?.userId || user?.id || 'system',
    employeeId: user?.employeeId,
    userSnapshot: createUserSnapshot(user),
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
    severity,
    metadata: details,
    requestId: req?.id,
    sessionId: req?.sessionID
  });
};

/**
 * Log login event
 */
export const logLoginEvent = async (companyId, user, req, result = 'success') => {
  return createAuditLog({
    companyId,
    action: 'USER_LOGIN',
    entityType: 'user',
    entityId: user?.userId || user?.id,
    userId: user?.userId || user?.id,
    employeeId: user?.employeeId,
    userSnapshot: createUserSnapshot(user),
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
    result,
    severity: result === 'success' ? 'info' : 'warning',
    metadata: {
      loginMethod: user?.loginMethod || 'standard'
    },
    requestId: req?.id
  });
};

/**
 * Log failed login attempt
 */
export const logFailedLogin = async (companyId, email, req, reason = 'invalid_credentials') => {
  return createAuditLog({
    companyId,
    action: 'FAILED_LOGIN_ATTEMPT',
    entityType: 'user',
    userId: email,
    userSnapshot: { email },
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
    result: 'failure',
    severity: 'warning',
    metadata: { reason },
    requestId: req?.id
  });
};

/**
 * Log data export
 */
export const logDataExport = async (companyId, entityType, user, req, details) => {
  return createAuditLog({
    companyId,
    action: 'DATA_EXPORT',
    entityType,
    userId: user?.userId || user?.id,
    employeeId: user?.employeeId,
    userSnapshot: createUserSnapshot(user),
    ipAddress: req?.ip,
    userAgent: req?.get('user-agent'),
    severity: 'info',
    metadata: details,
    requestId: req?.id
  });
};

export default {
  createAuditLog,
  queryAuditLogs,
  getAuditStatistics,
  getRecentActivity,
  getEntityHistory,
  cleanupOldLogs,
  createUserSnapshot,
  calculateChanges,
  logLeaveAction,
  logAttendanceAction,
  logOvertimeAction,
  logTimesheetAction,
  logSecurityEvent,
  logLoginEvent,
  logFailedLogin,
  logDataExport
};
