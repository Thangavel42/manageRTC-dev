/**
 * Attendance Audit Logging Service
 *
 * Tracks all modifications to attendance records for accountability and compliance
 * Phase 3 - Medium Priority Security Fix
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import logger from '../../utils/logger.js';

/**
 * Log attendance creation event
 *
 * @param {string} companyId - Company ID
 * @param {string} attendanceId - Attendance record ID
 * @param {string} userId - User who created the record
 * @param {object} details - Additional details
 * @returns {Promise<object>} Audit log entry
 */
export const logAttendanceCreation = async (companyId, attendanceId, userId, details = {}) => {
  try {
    const { attendanceAudit } = getTenantCollections(companyId);

    const auditEntry = {
      auditId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId,
      attendanceId,
      action: 'create',
      userId,
      employeeId: details.employeeId,
      changes: {
        before: null,
        after: details.record || {}
      },
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null,
      timestamp: new Date(),
      createdAt: new Date()
    };

    const result = await attendanceAudit.insertOne(auditEntry);
    logger.debug(`[Audit Log] Attendance creation logged: ${attendanceId}`);

    return { success: true, auditId: auditEntry.auditId, _id: result.insertedId };
  } catch (error) {
    logger.error('[Audit Log] Error logging attendance creation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Log attendance update event
 *
 * @param {string} companyId - Company ID
 * @param {string} attendanceId - Attendance record ID
 * @param {string} userId - User who made the change
 * @param {object} before - State before changes
 * @param {object} after - State after changes
 * @param {object} metadata - Additional metadata (IP, user agent, etc.)
 * @returns {Promise<object>} Audit log entry
 */
export const logAttendanceUpdate = async (companyId, attendanceId, userId, before, after, metadata = {}) => {
  try {
    const { attendanceAudit } = getTenantCollections(companyId);

    // Calculate what actually changed
    const changes = {};
    for (const key of Object.keys(after)) {
      if (key !== 'updatedAt' && key !== 'version' && JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changes[key] = {
          before: before[key],
          after: after[key]
        };
      }
    }

    const auditEntry = {
      auditId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId,
      attendanceId,
      action: 'update',
      userId,
      employeeId: after.employeeId || before.employeeId,
      changes: {
        before,
        after,
        delta: changes
      },
      ipAddress: metadata.ipAddress || null,
      userAgent: metadata.userAgent || null,
      reason: metadata.reason || null,
      timestamp: new Date(),
      createdAt: new Date()
    };

    const result = await attendanceAudit.insertOne(auditEntry);
    logger.debug(`[Audit Log] Attendance update logged: ${attendanceId}`);

    return { success: true, auditId: auditEntry.auditId, _id: result.insertedId };
  } catch (error) {
    logger.error('[Audit Log] Error logging attendance update:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Log attendance deletion event
 *
 * @param {string} companyId - Company ID
 * @param {string} attendanceId - Attendance record ID
 * @param {string} userId - User who deleted the record
 * @param {object} before - State before deletion
 * @param {string} reason - Reason for deletion
 * @returns {Promise<object>} Audit log entry
 */
export const logAttendanceDeletion = async (companyId, attendanceId, userId, before, reason = '') => {
  try {
    const { attendanceAudit } = getTenantCollections(companyId);

    const auditEntry = {
      auditId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      companyId,
      attendanceId,
      action: 'delete',
      userId,
      employeeId: before.employeeId,
      changes: {
        before,
        after: null
      },
      reason,
      timestamp: new Date(),
      createdAt: new Date()
    };

    const result = await attendanceAudit.insertOne(auditEntry);
    logger.debug(`[Audit Log] Attendance deletion logged: ${attendanceId}`);

    return { success: true, auditId: auditEntry.auditId, _id: result.insertedId };
  } catch (error) {
    logger.error('[Audit Log] Error logging attendance deletion:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get audit log for a specific attendance record
 *
 * @param {string} companyId - Company ID
 * @param {string} attendanceId - Attendance record ID
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<Array>} Audit log entries
 */
export const getAttendanceAuditLog = async (companyId, attendanceId, limit = 100) => {
  try {
    const { attendanceAudit } = getTenantCollections(companyId);

    const entries = await attendanceAudit
      .find({ companyId, attendanceId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return { success: true, entries };
  } catch (error) {
    logger.error('[Audit Log] Error fetching audit log:', error);
    return { success: false, error: error.message, entries: [] };
  }
};

/**
 * Get audit log for a specific employee
 *
 * @param {string} companyId - Company ID
 * @param {string} employeeId - Employee ID
 * @param {object} filters - Filters { startDate, endDate, action }
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<Array>} Audit log entries
 */
export const getEmployeeAuditLog = async (companyId, employeeId, filters = {}, limit = 100) => {
  try {
    const { attendanceAudit } = getTenantCollections(companyId);

    const query = { companyId, employeeId };

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }

    if (filters.action) {
      query.action = filters.action;
    }

    const entries = await attendanceAudit
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return { success: true, entries };
  } catch (error) {
    logger.error('[Audit Log] Error fetching employee audit log:', error);
    return { success: false, error: error.message, entries: [] };
  }
};

/**
 * Get all audit logs for a company (admin only)
 *
 * @param {string} companyId - Company ID
 * @param {object} filters - Filters { startDate, endDate, action, employeeId }
 * @param {number} limit - Maximum number of entries to return
 * @returns {Promise<Array>} Audit log entries
 */
export const getCompanyAuditLog = async (companyId, filters = {}, limit = 1000) => {
  try {
    const { attendanceAudit } = getTenantCollections(companyId);

    const query = { companyId };

    if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }

    if (filters.action) {
      query.action = filters.action;
    }

    if (filters.startDate || filters.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.timestamp.$lte = new Date(filters.endDate);
      }
    }

    const entries = await attendanceAudit
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return { success: true, entries };
  } catch (error) {
    logger.error('[Audit Log] Error fetching company audit log:', error);
    return { success: false, error: error.message, entries: [] };
  }
};

/**
 * Initialize audit log collection indexes
 *
 * @param {string} companyId - Company ID
 * @returns {Promise<boolean>} Success status
 */
export const initializeAuditIndexes = async (companyId) => {
  try {
    const { attendanceAudit } = getTenantCollections(companyId);

    await attendanceAudit.createIndex({ companyId: 1, attendanceId: 1, timestamp: -1 });
    await attendanceAudit.createIndex({ companyId: 1, employeeId: 1, timestamp: -1 });
    await attendanceAudit.createIndex({ companyId: 1, timestamp: -1 });
    await attendanceAudit.createIndex({ companyId: 1, action: 1, timestamp: -1 });

    logger.info(`[Audit Log] Indexes initialized for company: ${companyId}`);
    return true;
  } catch (error) {
    logger.error('[Audit Log] Error initializing indexes:', error);
    return false;
  }
};

export default {
  logAttendanceCreation,
  logAttendanceUpdate,
  logAttendanceDeletion,
  getAttendanceAuditLog,
  getEmployeeAuditLog,
  getCompanyAuditLog,
  initializeAuditIndexes
};
