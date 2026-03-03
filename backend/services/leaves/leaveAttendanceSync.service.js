/**
 * Leave - Attendance Synchronization Service
 *
 * Handles bidirectional sync between leave and attendance systems:
 * 1. Creates attendance records when leaves are approved
 * 2. Updates attendance records when leave dates are modified
 * 3. Cleans up attendance records when leaves are cancelled
 *
 * Attendance Status Rules:
 * - "on-leave" → Employee is on approved leave
 * - "present" → Employee clocked in
 * - "absent" → Employee did not clock in and is not on leave
 * - "half-day" → Employee worked partial day
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import logger from '../../utils/logger.js';

/**
 * Generate a unique attendance ID
 */
const generateAttendanceId = () => {
  return `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Create attendance records for each day of approved leave
 *
 * @param {string} companyId - Company ID (database name)
 * @param {object} leave - Leave document object
 * @returns {object} Result with success status and details
 */
export const createAttendanceForLeave = async (companyId, leave) => {
  try {
    const { attendance } = getTenantCollections(companyId);

    if (!leave || !leave.startDate || !leave.endDate) {
      return { success: false, error: 'Invalid leave data' };
    }

    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    // Iterate through each day of the leave period
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      try {
        // Normalize date to start of day for consistent querying
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Check if attendance already exists for this day
        const existing = await attendance.findOne({
          companyId,
          employeeId: leave.employeeId,
          date: {
            $gte: dayStart,
            $lte: dayEnd
          },
          isDeleted: { $ne: true }
        });

        if (existing) {
          // Update existing attendance record
          // Only update if it's not already marked with clock-in/clock-out
          if (!existing.clockIn?.time && !existing.clockOut?.time) {
            await attendance.updateOne(
              { _id: existing._id },
              {
                $set: {
                  status: 'on-leave',
                  leaveId: leave._id.toString(),
                  leaveType: leave.leaveType,
                  updatedAt: new Date()
                }
              }
            );
            results.updated++;
          } else {
            // Employee has clocked in, add a note about leave
            await attendance.updateOne(
              { _id: existing._id },
              {
                $set: {
                  leaveId: leave._id.toString(),
                  leaveType: leave.leaveType,
                  notes: existing.notes ?
                    `${existing.notes} | Leave: ${leave.leaveType}` :
                    `Leave: ${leave.leaveType}`,
                  updatedAt: new Date()
                }
              }
            );
            results.skipped++;
          }
        } else {
          // Create new attendance record
          const attendanceRecord = {
            attendanceId: generateAttendanceId(),
            companyId,
            employeeId: leave.employeeId,
            employeeName: leave.employeeName || '',
            date: new Date(dayStart),
            status: 'on-leave',
            leaveId: leave._id.toString(),
            leaveType: leave.leaveType,
            clockIn: { time: null },
            clockOut: { time: null },
            hoursWorked: 0,
            regularHours: 0,
            overtimeHours: 0,
            breakDuration: 0,
            isLate: false,
            isEarlyDeparture: false,
            isRegularized: false,
            isActive: true,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          await attendance.insertOne(attendanceRecord);
          results.created++;
        }
      } catch (dayError) {
        logger.error(`[Attendance Sync] Error processing day ${date.toISOString()}:`, dayError);
        results.errors.push({
          date: date.toISOString(),
          error: dayError.message
        });
      }
    }

    logger.info(`[Attendance Sync] Created attendance for leave ${leave._id}:`, results);
    return { success: true, results };

  } catch (error) {
    logger.error('[Attendance Sync] Error creating attendance for leave:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update attendance records when leave dates are modified
 *
 * @param {string} companyId - Company ID (database name)
 * @param {object} leave - Updated leave document object
 * @param {object} oldDates - Old leave dates { startDate, endDate }
 * @returns {object} Result with success status and details
 */
export const updateAttendanceForLeave = async (companyId, leave, oldDates) => {
  try {
    const { attendance } = getTenantCollections(companyId);

    if (!leave || !oldDates) {
      return { success: false, error: 'Invalid parameters' };
    }

    const results = {
      created: 0,
      updated: 0,
      removed: 0,
      errors: []
    };

    // Remove attendance records for old dates that are no longer part of leave
    if (oldDates.startDate && oldDates.endDate) {
      const oldStart = new Date(oldDates.startDate);
      const oldEnd = new Date(oldDates.endDate);
      const newStart = new Date(leave.startDate);
      const newEnd = new Date(leave.endDate);

      // Clean up dates that are no longer in the leave period
      for (let date = new Date(oldStart); date <= oldEnd; date.setDate(date.getDate() + 1)) {
        if (date < newStart || date > newEnd) {
          // This date is no longer part of the leave
          const dayStart = new Date(date);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setHours(23, 59, 59, 999);

          const existing = await attendance.findOne({
            companyId,
            employeeId: leave.employeeId,
            date: { $gte: dayStart, $lte: dayEnd },
            status: 'on-leave',
            leaveId: leave._id.toString(),
            isDeleted: { $ne: true }
          });

          if (existing && !existing.clockIn?.time && !existing.clockOut?.time) {
            // No clock-in/clock-out, safe to remove or change to absent
            await attendance.updateOne(
              { _id: existing._id },
              {
                $set: {
                  status: 'absent',
                  leaveId: null,
                  leaveType: null,
                  updatedAt: new Date()
                }
              }
            );
            results.removed++;
          } else if (existing) {
            // Has clock-in, just remove leave reference
            await attendance.updateOne(
              { _id: existing._id },
              {
                $set: {
                  leaveId: null,
                  leaveType: null,
                  updatedAt: new Date()
                }
              }
            );
            results.removed++;
          }
        }
      }
    }

    // Create/update attendance for new dates
    const newResult = await createAttendanceForLeave(companyId, leave);
    if (newResult.success) {
      results.created += newResult.results.created;
      results.updated += newResult.results.updated;
      results.errors.push(...newResult.results.errors);
    }

    logger.info(`[Attendance Sync] Updated attendance for modified leave ${leave._id}:`, results);
    return { success: true, results };

  } catch (error) {
    logger.error('[Attendance Sync] Error updating attendance for leave:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove/cleanup attendance records when leave is cancelled
 *
 * @param {string} companyId - Company ID (database name)
 * @param {object} leave - Leave document object being cancelled
 * @returns {object} Result with success status and details
 */
export const removeAttendanceForLeave = async (companyId, leave) => {
  try {
    const { attendance } = getTenantCollections(companyId);

    if (!leave || !leave.startDate || !leave.endDate) {
      return { success: false, error: 'Invalid leave data' };
    }

    const startDate = new Date(leave.startDate);
    const endDate = new Date(leave.endDate);
    const results = {
      removed: 0,
      skipped: 0,
      errors: []
    };

    // Process each day of the leave period
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      try {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const existing = await attendance.findOne({
          companyId,
          employeeId: leave.employeeId,
          date: { $gte: dayStart, $lte: dayEnd },
          isDeleted: { $ne: true }
        });

        if (existing) {
          if (existing.clockIn?.time || existing.clockOut?.time) {
            // Employee has clocked in, just remove leave reference
            await attendance.updateOne(
              { _id: existing._id },
              {
                $unset: { leaveId: '', leaveType: '' },
                $set: {
                  updatedAt: new Date()
                }
              }
            );
            results.skipped++;
          } else if (existing.status === 'on-leave' && existing.leaveId === leave._id.toString()) {
            // Pure on-leave record without clock-in, change to absent
            await attendance.updateOne(
              { _id: existing._id },
              {
                $set: {
                  status: 'absent',
                  leaveId: null,
                  leaveType: null,
                  updatedAt: new Date()
                }
              }
            );
            results.removed++;
          }
        }
      } catch (dayError) {
        logger.error(`[Attendance Sync] Error processing day ${date.toISOString()}:`, dayError);
        results.errors.push({
          date: date.toISOString(),
          error: dayError.message
        });
      }
    }

    logger.info(`[Attendance Sync] Removed attendance for cancelled leave ${leave._id}:`, results);
    return { success: true, results };

  } catch (error) {
    logger.error('[Attendance Sync] Error removing attendance for leave:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if attendance record exists for a specific date
 *
 * @param {string} companyId - Company ID (database name)
 * @param {string} employeeId - Employee ID
 * @param {Date} date - Date to check
 * @returns {Promise<object|null>} Attendance record or null
 */
export const checkExistingAttendance = async (companyId, employeeId, date) => {
  try {
    const { attendance } = getTenantCollections(companyId);

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await attendance.findOne({
      companyId,
      employeeId,
      date: { $gte: dayStart, $lte: dayEnd },
      isDeleted: { $ne: true }
    });

    return existing;

  } catch (error) {
    logger.error('[Attendance Sync] Error checking existing attendance:', error);
    return null;
  }
};

/**
 * Sync all approved leaves to attendance records (backfill)
 *
 * @param {string} companyId - Company ID (database name)
 * @returns {object} Result with success status and details
 */
export const syncApprovedLeavesToAttendance = async (companyId) => {
  try {
    const { leaves } = getTenantCollections(companyId);

    // Find all approved leaves
    const approvedLeaves = await leaves.find({
      status: 'approved',
      isDeleted: { $ne: true }
    }).toArray();

    logger.info(`[Attendance Sync] Backfilling ${approvedLeaves.length} approved leaves to attendance`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: []
    };

    for (const leave of approvedLeaves) {
      results.processed++;
      try {
        const result = await createAttendanceForLeave(companyId, leave);
        if (result.success) {
          results.succeeded++;
        } else {
          results.failed++;
          results.errors.push({
            leaveId: leave._id.toString(),
            employeeId: leave.employeeId,
            error: result.error
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          leaveId: leave._id.toString(),
          employeeId: leave.employeeId,
          error: error.message
        });
      }
    }

    logger.info(`[Attendance Sync] Backfill completed:`, results);
    return { success: true, results };

  } catch (error) {
    logger.error('[Attendance Sync] Error backfilling leaves:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get attendance records linked to a specific leave
 *
 * @param {string} companyId - Company ID (database name)
 * @param {string} leaveId - Leave ID
 * @returns {Promise<Array>} Array of attendance records
 */
export const getAttendanceByLeaveId = async (companyId, leaveId) => {
  try {
    const { attendance } = getTenantCollections(companyId);

    const records = await attendance.find({
      companyId,
      leaveId,
      isDeleted: { $ne: true }
    }).toArray();

    return records;

  } catch (error) {
    logger.error('[Attendance Sync] Error fetching attendance by leave ID:', error);
    return [];
  }
};

export default {
  createAttendanceForLeave,
  updateAttendanceForLeave,
  removeAttendanceForLeave,
  checkExistingAttendance,
  syncApprovedLeavesToAttendance,
  getAttendanceByLeaveId
};
