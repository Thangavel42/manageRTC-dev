/**
 * Audit Log Schema
 * Tracks all critical operations for security and compliance
 * Multi-tenant: Each company has its own audit logs in their database
 */

import mongoose from 'mongoose';

/**
 * Audit Log Schema
 */
const auditLogSchema = new mongoose.Schema(
  {
    // Company identifier (for multi-tenant)
    companyId: {
      type: String,
      required: true,
      index: true
    },

    // Action performed (e.g., 'LEAVE_APPROVED', 'CLOCK_IN', 'OVERTIME_REQUESTED')
    action: {
      type: String,
      required: true,
      enum: [
        // Attendance Actions
        'CLOCK_IN',
        'CLOCK_OUT',
        'ATTENDANCE_CREATED',
        'ATTENDANCE_UPDATED',
        'ATTENDANCE_DELETED',
        'ATTENDANCE_REGULARIZATION_REQUESTED',
        'ATTENDANCE_REGULARIZATION_APPROVED',
        'ATTENDANCE_REGULARIZATION_REJECTED',

        // Leave Actions
        'LEAVE_REQUESTED',
        'LEAVE_APPROVED',
        'LEAVE_REJECTED',
        'LEAVE_CANCELLED',
        'LEAVE_DELETED',
        'LEAVE_UPDATED',
        'LEAVE_BALANCE_ADJUSTED',

        // Overtime Actions
        'OVERTIME_REQUESTED',
        'OVERTIME_APPROVED',
        'OVERTIME_REJECTED',
        'OVERTIME_CANCELLED',
        'OVERTIME_DELETED',

        // Timesheet Actions
        'TIMESHEET_CREATED',
        'TIMESHEET_SUBMITTED',
        'TIMESHEET_APPROVED',
        'TIMESHEET_REJECTED',
        'TIMESHEET_DELETED',
        'TIMESHEET_UPDATED',

        // Employee Actions
        'EMPLOYEE_CREATED',
        'EMPLOYEE_UPDATED',
        'EMPLOYEE_DELETED',
        'EMPLOYEE_TERMINATED',
        'EMPLOYEE_REINSTATED',

        // Admin Actions
        'SETTINGS_UPDATED',
        'COMPANY_UPDATED',
        'CUSTOM_POLICY_CREATED',
        'CUSTOM_POLICY_UPDATED',
        'CUSTOM_POLICY_DELETED',
        'USER_LOGIN',
        'USER_LOGOUT',
        'USER_PASSWORD_RESET',
        'PERMISSION_GRANTED',
        'PERMISSION_REVOKED',
        'ROLE_ASSIGNED',
        'ROLE_REVOKED',

        // Security Actions
        'FAILED_LOGIN_ATTEMPT',
        'SUSPICIOUS_ACTIVITY',
        'RATE_LIMIT_EXCEEDED',
        'DATA_EXPORT',
        'BULK_OPERATION',
        'SYSTEM_ERROR'
      ],
      index: true
    },

    // Entity affected (e.g., leave ID, employee ID)
    entityType: {
      type: String,
      required: true,
      enum: ['attendance', 'leave', 'overtime', 'timesheet', 'employee', 'company', 'policy', 'user', 'system', 'other']
    },

    // ID of the affected entity
    entityId: {
      type: String,
      index: true
    },

    // User who performed the action
    userId: {
      type: String,
      required: true,
      index: true
    },

    employeeId: {
      type: String,
      index: true
    },

    // User details at time of action (immutable snapshot)
    userSnapshot: {
      employeeId: String,
      name: String,
      email: String,
      role: String
    },

    // IP address of the request
    ipAddress: {
      type: String
    },

    // User agent
    userAgent: {
      type: String
    },

    // Changes made (for update/delete operations)
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
      diff: [mongoose.Schema.Types.Mixed]
    },

    // Additional context
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },

    // Operation result
    result: {
      type: String,
      enum: ['success', 'failure', 'partial'],
      default: 'success'
    },

    // Error message if operation failed
    errorMessage: {
      type: String
    },

    // Request ID for tracing
    requestId: {
      type: String,
      index: true
    },

    // Session ID
    sessionId: {
      type: String
    },

    // Severity level
    severity: {
      type: String,
      enum: ['info', 'warning', 'error', 'critical'],
      default: 'info'
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false
    },

    // Expiration date (for automatic cleanup)
    expiresAt: {
      type: Date,
      default: () => {
        // Default retention: 2 years
        const retention = new Date();
        retention.setFullYear(retention.getFullYear() + 2);
        return retention;
      },
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'auditLogs'
  }
);

// Indexes for efficient querying
auditLogSchema.index({ companyId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, userId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, entityType: 1, entityId: 1, createdAt: -1 });
auditLogSchema.index({ companyId: 1, severity: 1, createdAt: -1 });
auditLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Static method to create audit log entry
auditLogSchema.statics.createLog = async function(data) {
  try {
    const log = await this.create(data);
    return log;
  } catch (error) {
    // Don't throw errors from audit logging to avoid breaking main operations
    console.error('Failed to create audit log:', error);
    return null;
  }
};

// Static method to query logs with filters
auditLogSchema.statics.queryLogs = async function(companyId, filters = {}) {
  const query = { companyId, isDeleted: false };

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
  const sort = { createdAt: -1 };
  if (filters.sortBy) {
    const [field, order] = filters.sortBy.split(':');
    sort[field] = order === 'asc' ? 1 : -1;
  }

  const [logs, total] = await Promise.all([
    this.find(query).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(query)
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
};

// Static method to get statistics
auditLogSchema.statics.getStatistics = async function(companyId, filters = {}) {
  const matchQuery = { companyId, isDeleted: false };

  if (filters.startDate || filters.endDate) {
    matchQuery.createdAt = {};
    if (filters.startDate) matchQuery.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) matchQuery.createdAt.$lte = new Date(filters.endDate);
  }

  const stats = await this.aggregate([
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
        actionCounts: {
          $push: '$action'
        },
        userCounts: {
          $addToSet: '$userId'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalLogs: 1,
        successCount: 1,
        failureCount: 1,
        criticalCount: 1,
        uniqueUsers: { $size: '$userCounts' }
      }
    }
  ]);

  return stats[0] || {
    totalLogs: 0,
    successCount: 0,
    failureCount: 0,
    criticalCount: 0,
    uniqueUsers: 0
  };
};

// Static method to get recent activity
auditLogSchema.statics.getRecentActivity = async function(companyId, limit = 20) {
  return this.find({
    companyId,
    isDeleted: false,
    result: 'success'
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

// Static method to get activity by entity
auditLogSchema.statics.getEntityHistory = async function(companyId, entityType, entityId) {
  return this.find({
    companyId,
    entityType,
    entityId,
    isDeleted: false
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
};

// Static method to cleanup old logs
auditLogSchema.statics.cleanupOldLogs = async function(companyId, retentionDays = 730) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const result = await this.deleteMany({
    companyId,
    createdAt: { $lt: cutoffDate }
  });

  return { deletedCount: result.deletedCount };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
