/**
 * Audit Log Controller
 * Handles audit log viewing and management
 */

import asyncHandler from 'express-async-handler';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';
import auditLogService from '../../services/audit/auditLog.service.js';
import logger from '../../utils/logger.js';

/**
 * @desc    Get audit logs with filters
 * @route   GET /api/audit/logs
 * @access  Private (Admin, HR, Superadmin)
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const user = req.user;

  // Validate access
  if (!['admin', 'hr', 'superadmin'].includes(user?.role)) {
    return sendError(res, 'ACCESS_DENIED', 'You do not have permission to view audit logs', 403);
  }

  const {
    action,
    entityType,
    entityId,
    userId,
    employeeId,
    severity,
    result,
    startDate,
    endDate,
    page,
    limit,
    sortBy
  } = req.query;

  const filters = {
    action,
    entityType,
    entityId,
    userId,
    employeeId,
    severity,
    result,
    startDate,
    endDate,
    page,
    limit,
    sortBy
  };

  const result_logs = await auditLogService.queryAuditLogs(user.companyId, filters);

  return sendSuccess(res, result_logs.logs, 'Audit logs retrieved successfully', {
    page: result_logs.pagination.page,
    limit: result_logs.pagination.limit,
    total: result_logs.pagination.total,
    totalPages: result_logs.pagination.totalPages
  });
});

/**
 * @desc    Get audit log statistics
 * @route   GET /api/audit/stats
 * @access  Private (Admin, HR, Superadmin)
 */
export const getAuditStats = asyncHandler(async (req, res) => {
  const user = req.user;

  // Validate access
  if (!['admin', 'hr', 'superadmin'].includes(user?.role)) {
    return sendError(res, 'ACCESS_DENIED', 'You do not have permission to view audit statistics', 403);
  }

  const { startDate, endDate } = req.query;
  const filters = { startDate, endDate };

  const stats = await auditLogService.getAuditStatistics(user.companyId, filters);

  return sendSuccess(res, stats, 'Audit statistics retrieved successfully');
});

/**
 * @desc    Get recent activity
 * @route   GET /api/audit/recent
 * @access  Private (Admin, HR, Superadmin)
 */
export const getRecentActivity = asyncHandler(async (req, res) => {
  const user = req.user;

  // Validate access
  if (!['admin', 'hr', 'superadmin'].includes(user?.role)) {
    return sendError(res, 'ACCESS_DENIED', 'You do not have permission to view recent activity', 403);
  }

  const limit = parseInt(req.query.limit) || 20;

  const activity = await auditLogService.getRecentActivity(user.companyId, limit);

  return sendSuccess(res, activity, 'Recent activity retrieved successfully');
});

/**
 * @desc    Get entity history
 * @route   GET /api/audit/entity/:entityType/:entityId
 * @access  Private (Admin, HR, Superadmin)
 */
export const getEntityHistory = asyncHandler(async (req, res) => {
  const user = req.user;

  // Validate access
  if (!['admin', 'hr', 'superadmin'].includes(user?.role)) {
    return sendError(res, 'ACCESS_DENIED', 'You do not have permission to view entity history', 403);
  }

  const { entityType, entityId } = req.params;

  const history = await auditLogService.getEntityHistory(user.companyId, entityType, entityId);

  return sendSuccess(res, history, 'Entity history retrieved successfully');
});

/**
 * @desc    Cleanup old audit logs
 * @route   POST /api/audit/cleanup
 * @access  Private (Superadmin only)
 */
export const cleanupLogs = asyncHandler(async (req, res) => {
  const user = req.user;

  // Validate access - only superadmin can cleanup logs
  if (user?.role !== 'superadmin') {
    return sendError(res, 'ACCESS_DENIED', 'Only superadmin can cleanup audit logs', 403);
  }

  const { retentionDays = 730 } = req.body; // Default 2 years

  const result = await auditLogService.cleanupOldLogs(user.companyId, retentionDays);

  return sendSuccess(res, result, `Cleaned up ${result.deletedCount} old audit logs`);
});

/**
 * @desc    Get my activity log
 * @route   GET /api/audit/my-activity
 * @access  Private (All authenticated users)
 */
export const getMyActivity = asyncHandler(async (req, res) => {
  const user = req.user;

  const { page, limit, startDate, endDate } = req.query;

  const filters = {
    userId: user.userId,
    employeeId: user.employeeId,
    page,
    limit,
    startDate,
    endDate
  };

  const result_logs = await auditLogService.queryAuditLogs(user.companyId, filters);

  return sendSuccess(res, result_logs.logs, 'Your activity retrieved successfully', {
    page: result_logs.pagination.page,
    limit: result_logs.pagination.limit,
    total: result_logs.pagination.total,
    totalPages: result_logs.pagination.totalPages
  });
});

/**
 * @desc    Get activity by employee
 * @route   GET /api/audit/employee/:employeeId
 * @access  Private (Admin, HR, Superadmin)
 */
export const getEmployeeActivity = asyncHandler(async (req, res) => {
  const user = req.user;

  // Validate access
  if (!['admin', 'hr', 'superadmin'].includes(user?.role)) {
    return sendError(res, 'ACCESS_DENIED', 'You do not have permission to view employee activity', 403);
  }

  const { employeeId } = req.params;
  const { page, limit, startDate, endDate } = req.query;

  const filters = {
    employeeId,
    page,
    limit,
    startDate,
    endDate
  };

  const result_logs = await auditLogService.queryAuditLogs(user.companyId, filters);

  return sendSuccess(res, result_logs.logs, 'Employee activity retrieved successfully', {
    page: result_logs.pagination.page,
    limit: result_logs.pagination.limit,
    total: result_logs.pagination.total,
    totalPages: result_logs.pagination.totalPages
  });
});

/**
 * @desc    Get security events
 * @route   GET /api/audit/security-events
 * @access  Private (Admin, Superadmin)
 */
export const getSecurityEvents = asyncHandler(async (req, res) => {
  const user = req.user;

  // Validate access
  if (!['admin', 'superadmin'].includes(user?.role)) {
    return sendError(res, 'ACCESS_DENIED', 'You do not have permission to view security events', 403);
  }

  const filters = {
    severity: req.query.severity || 'warning',
    action: ['FAILED_LOGIN_ATTEMPT', 'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED'],
    page: req.query.page,
    limit: req.query.limit,
    startDate: req.query.startDate,
    endDate: req.query.endDate
  };

  const result_logs = await auditLogService.queryAuditLogs(user.companyId, filters);

  return sendSuccess(res, result_logs.logs, 'Security events retrieved successfully', {
    page: result_logs.pagination.page,
    limit: result_logs.pagination.limit,
    total: result_logs.pagination.total,
    totalPages: result_logs.pagination.totalPages
  });
});

/**
 * @desc    Export audit logs
 * @route   GET /api/audit/export
 * @access  Private (Admin, Superadmin)
 */
export const exportAuditLogs = asyncHandler(async (req, res) => {
  const user = req.user;

  // Validate access
  if (!['admin', 'superadmin'].includes(user?.role)) {
    return sendError(res, 'ACCESS_DENIED', 'You do not have permission to export audit logs', 403);
  }

  const { startDate, endDate, format = 'json' } = req.query;

  const filters = {
    startDate,
    endDate,
    limit: 10000 // Export limit
  };

  const result_logs = await auditLogService.queryAuditLogs(user.companyId, filters);

  // Log the export
  await auditLogService.logDataExport(user.companyId, 'audit_logs', user, req, {
    recordCount: result_logs.logs.length,
    format
  });

  if (format === 'csv') {
    // Convert to CSV
    const csv = convertToCSV(result_logs.logs);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    return res.send(csv);
  }

  // Default JSON export
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.json`);
  return res.send(JSON.stringify(result_logs.logs, null, 2));
});

/**
 * Convert audit logs to CSV format
 */
const convertToCSV = (logs) => {
  if (!logs || logs.length === 0) {
    return 'No data available';
  }

  const headers = [
    'Timestamp',
    'Action',
    'Entity Type',
    'Entity ID',
    'User ID',
    'Employee ID',
    'User Name',
    'User Role',
    'IP Address',
    'Result',
    'Severity',
    'Message'
  ];

  const rows = logs.map(log => [
    log.createdAt,
    log.action,
    log.entityType,
    log.entityId || '',
    log.userId,
    log.employeeId || '',
    log.userSnapshot?.name || '',
    log.userSnapshot?.role || '',
    log.ipAddress || '',
    log.result,
    log.severity,
    log.errorMessage || ''
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
};

export default {
  getAuditLogs,
  getAuditStats,
  getRecentActivity,
  getEntityHistory,
  cleanupLogs,
  getMyActivity,
  getEmployeeActivity,
  getSecurityEvents,
  exportAuditLogs
};
