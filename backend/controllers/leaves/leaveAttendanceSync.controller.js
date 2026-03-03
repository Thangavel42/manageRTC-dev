/**
 * Leave Attendance Sync Controller
 * Admin endpoints for syncing leaves to attendance records
 */

import leaveAttendanceSyncService from '../../services/leaves/leaveAttendanceSync.service.js';
import logger from '../../utils/logger.js';

/**
 * Trigger backfill of all approved leaves to attendance records
 * POST /api/leaves/sync-attendance
 * Access: Admin, Superadmin
 */
export const syncAttendanceForApprovedLeaves = async (req, res) => {
  try {
    const { user } = req;
    const { companyId, employeeId } = req.body;

    // Use user's company if not specified
    const targetCompanyId = companyId || user.companyId;

    logger.info('[Attendance Sync] Manual sync triggered by', {
      userId: user.userId,
      companyId: targetCompanyId,
      employeeId: employeeId || 'all'
    });

    const result = await leaveAttendanceSyncService.syncApprovedLeavesToAttendance(
      targetCompanyId
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Attendance sync completed successfully',
        data: {
          processed: result.results.processed,
          succeeded: result.results.succeeded,
          failed: result.results.failed,
          errors: result.results.errors
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('[Attendance Sync] Error in manual sync:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Get attendance records for a specific leave
 * GET /api/leaves/:leaveId/attendance
 * Access: Admin, HR, Superadmin, or own leave
 */
export const getAttendanceForLeave = async (req, res) => {
  try {
    const { user } = req;
    const { leaveId } = req.params;

    const { leaves, attendance } = req.collections;

    // Get leave to verify access
    const leave = await leaves.findOne({
      _id: new ObjectId(leaveId),
      isDeleted: { $ne: true }
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave not found'
      });
    }

    // Check access permissions
    const userRole = user.role?.toLowerCase();
    const isPrivileged = ['admin', 'hr', 'superadmin'].includes(userRole);
    const isOwnLeave = leave.employeeId === user.employeeId || leave.clerkUserId === user.userId;

    if (!isPrivileged && !isOwnLeave) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to view attendance for this leave'
      });
    }

    // Get attendance records
    const attendanceRecords = await leaveAttendanceSyncService.getAttendanceByLeaveId(
      user.companyId,
      leaveId
    );

    res.json({
      success: true,
      data: {
        leaveId,
        attendanceRecords,
        count: attendanceRecords.length
      }
    });
  } catch (error) {
    logger.error('[Attendance Sync] Error getting attendance for leave:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Sync attendance for a specific leave (single)
 * POST /api/leaves/:leaveId/sync-attendance
 * Access: Admin, HR, Superadmin
 */
export const syncSingleLeaveToAttendance = async (req, res) => {
  try {
    const { user } = req;
    const { leaveId } = req.params;

    const { leaves } = req.collections;

    // Get leave
    const leave = await leaves.findOne({
      _id: new ObjectId(leaveId),
      isDeleted: { $ne: true }
    });

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave not found'
      });
    }

    // Only sync approved leaves
    if (leave.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Only approved leaves can be synced to attendance'
      });
    }

    logger.info('[Attendance Sync] Single leave sync triggered', {
      leaveId,
      employeeId: leave.employeeId,
      userId: user.userId
    });

    const result = await leaveAttendanceSyncService.createAttendanceForLeave(
      user.companyId,
      leave
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Attendance sync completed for this leave',
        data: result.results
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    logger.error('[Attendance Sync] Error syncing single leave:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export default {
  syncAttendanceForApprovedLeaves,
  getAttendanceForLeave,
  syncSingleLeaveToAttendance
};
