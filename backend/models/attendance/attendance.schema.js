/**
 * Attendance Schema
 * Tracks employee clock in/out, work hours, overtime, and attendance status
 */

import mongoose from 'mongoose';
import { generateAttendanceId } from '../../utils/idGenerator.js';

const attendanceSchema = new mongoose.Schema({
  attendanceId: {
    type: String,
    unique: true,
    sparse: true
  },

  // Reference to employee
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee is required'],
    index: true
  },

  // Employee ID (string) - stored alongside ObjectId for efficient querying
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    index: true
  },

  // Employee name for quick reference (denormalized)
  employeeName: {
    type: String,
    trim: true
  },

  // Company for multi-tenant isolation
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Date of attendance
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },

  // Clock in details
  clockIn: {
    time: {
      type: Date,
      default: Date.now
    },
    location: {
      type: {
        type: String,
        enum: ['office', 'remote', 'client-site', 'other']
      },
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      ipAddress: String,
      deviceId: String
    },
    notes: String
  },

  // Clock out details
  clockOut: {
    time: {
      type: Date,
      validate: {
        validator: function(v) {
          // If clock-in exists and clock-out is set, validate clock-out is after clock-in
          if (this.clockIn?.time && v) {
            return v > this.clockIn.time;
          }
          return true;
        },
        message: 'Clock out time must be after clock in time'
      }
    },
    location: {
      type: {
        type: String,
        enum: ['office', 'remote', 'client-site', 'other']
      },
      coordinates: {
        latitude: Number,
        longitude: Number
      },
      ipAddress: String,
      deviceId: String
    },
    notes: String
  },

  // Work hours calculation
  hoursWorked: {
    type: Number,
    default: 0,
    min: 0
  },

  regularHours: {
    type: Number,
    default: 0
  },

  overtimeHours: {
    type: Number,
    default: 0
  },

  // Attendance status
  status: {
    type: String,
    enum: ['present', 'absent', 'half-day', 'late', 'early-departure', 'on-leave', 'holiday', 'weekend'],
    default: 'present',
    index: true
  },

  // Late/Early tracking
  isLate: {
    type: Boolean,
    default: false
  },

  lateMinutes: {
    type: Number,
    default: 0
  },

  isEarlyDeparture: {
    type: Boolean,
    default: false
  },

  earlyDepartureMinutes: {
    type: Number,
    default: 0
  },

  // Break time tracking
  breakDuration: {
    type: Number,
    default: 0,
    min: [0, 'Break duration cannot be negative'],
    max: [480, 'Break duration cannot exceed 8 hours (480 minutes)']
  },

  breakStartTime: Date,
  breakEndTime: Date,

  // Validate break end time is after break start time
  breakEndTime: {
    type: Date,
    validate: {
      validator: function(v) {
        // If both break start and end are set, end must be after start
        if (this.breakStartTime && v) {
          return v > this.breakStartTime;
        }
        return true;
      },
      message: 'Break end time must be after break start time'
    }
  },

  // Shift information
  shift: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shift'
  },

  // PHASE 2 FIX: Timezone support for accurate time calculations
  timezone: {
    type: String,
    default: 'UTC',
    enum: [
      'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
      'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Dubai',
      'Australia/Sydney', 'Pacific/Auckland'
    ]
  },

  // Schedule details
  scheduledStart: Date,
  scheduledEnd: Date,

  // Approval/Regularization
  isRegularized: {
    type: Boolean,
    default: false
  },

  regularizationRequest: {
    requested: {
      type: Boolean,
      default: false
    },
    reason: String,
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    requestedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    approvedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    rejectionReason: String
  },

  // Notes and comments
  notes: {
    type: String,
    maxlength: 500
  },

  managerNotes: {
    type: String,
    maxlength: 500
  },

  // Audit fields
  isActive: {
    type: Boolean,
    default: true
  },

  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },

  // Version for optimistic locking (concurrent edit prevention)
  version: {
    type: Number,
    default: 0,
    required: true
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  deletedAt: Date
}, {
  timestamps: true,

  // Optimistic concurrency control
  optimisticConcurrency: true,

  // Version key configuration
  versionKey: 'version'
});

// Compound indexes for efficient queries
attendanceSchema.index({ employee: 1, date: -1 });
attendanceSchema.index({ companyId: 1, date: -1 });
attendanceSchema.index({ companyId: 1, status: 1 });
attendanceSchema.index({ employee: 1, isDeleted: 1 });
attendanceSchema.index({ date: 1, status: 1, isDeleted: 1 });
// Phase 2.1: Added missing compound indexes for better query performance
attendanceSchema.index({ employee: 1, date: 1, isDeleted: 1 });
attendanceSchema.index({ companyId: 1, status: 1, isDeleted: 1 });
// Phase 2: Additional indexes for attendance sync queries and lookups
attendanceSchema.index({ companyId: 1, employeeId: 1, status: 1 });
attendanceSchema.index({ companyId: 1, employeeId: 1, date: 1 });
attendanceSchema.index({ companyId: 1, employeeId: 1, isDeleted: 1 });
attendanceSchema.index({ companyId: 1, leaveId: 1 });
attendanceSchema.index({ leaveId: 1, isDeleted: 1 });
// Unique index to prevent duplicate attendance per employee per day (Phase 2 - High Priority Fix)
attendanceSchema.index({ companyId: 1, employeeId: 1, date: 1 }, { unique: true, sparse: true });

// Virtual for total duration
attendanceSchema.virtual('totalDuration').get(function() {
  if (this.clockIn.time && this.clockOut.time) {
    return (this.clockOut.time - this.clockIn.time) / (1000 * 60 * 60); // Convert to hours
  }
  return 0;
});

// Virtual for work session
attendanceSchema.virtual('workSession').get(function() {
  return {
    start: this.clockIn?.time,
    end: this.clockOut?.time,
    duration: this.hoursWorked,
    breakDuration: this.breakDuration
  };
});

// Pre-save middleware to calculate hours worked
attendanceSchema.pre('save', async function(next) {
  // Calculate hours worked if both clock in and clock out are present
  if (this.clockIn?.time && this.clockOut?.time) {
    const clockInTime = new Date(this.clockIn.time);
    const clockOutTime = new Date(this.clockOut.time);

    // PHASE 2 FIX: Handle overnight shifts
    let totalMs = clockOutTime - clockInTime;

    // If clockOut is before clockIn, it's an overnight shift
    // Add 24 hours to get the correct duration
    if (totalMs < 0) {
      totalMs += 24 * 60 * 60 * 1000; // Add 24 hours in milliseconds
    }

    const totalHours = totalMs / (1000 * 60 * 60);

    // Subtract break duration
    const breakHours = (this.breakDuration || 0) / 60; // Convert minutes to hours
    const workHours = totalHours - breakHours;

    this.hoursWorked = Math.max(0, workHours);

    // Use shift-based calculations if shift is assigned, otherwise use defaults
    let regularHoursLimit = 8;
    let overtimeThreshold = 8;
    let lateThreshold = 9.5; // 9:30 AM (default)
    let earlyThreshold = 18; // 6:00 PM (default)
    let gracePeriod = 0; // Grace period in minutes
    let earlyDepartureAllowance = 0; // Early departure allowance in minutes

    // If shift is assigned, get shift settings
    if (this.shift) {
      try {
        const Shift = mongoose.model('Shift');
        const shift = await Shift.findById(this.shift);

        if (shift) {
          regularHoursLimit = shift.minHoursForFullDay || 8;
          overtimeThreshold = shift.overtime?.threshold || 8;

          // Parse shift start time for late calculation
          if (shift.startTime) {
            const [shiftHour, shiftMin] = shift.startTime.split(':').map(Number);
            lateThreshold = shiftHour + (shiftMin / 60);
            gracePeriod = (shift.gracePeriod || 0) / 60; // Convert to hours
          }

          // Parse shift end time for early departure calculation
          if (shift.endTime) {
            const [shiftEndHour, shiftEndMin] = shift.endTime.split(':').map(Number);
            earlyThreshold = shiftEndHour + (shiftEndMin / 60);
            earlyDepartureAllowance = (shift.earlyDepartureAllowance || 0) / 60; // Convert to hours
          }

          // Store scheduled times for reference
          this.scheduledStart = new Date(this.clockIn.time);
          this.scheduledStart.setHours(shift.startTime.split(':')[0], shift.startTime.split(':')[1], 0, 0);
          this.scheduledEnd = new Date(this.clockIn.time);
          this.scheduledEnd.setHours(shift.endTime.split(':')[0], shift.endTime.split(':')[1], 0, 0);
        }
      } catch (error) {
        console.error('[Attendance Schema] Error fetching shift:', error);
        // Continue with default values if shift fetch fails
      }
    }

    // Calculate regular and overtime hours
    if (this.hoursWorked > regularHoursLimit) {
      this.regularHours = regularHoursLimit;
      this.overtimeHours = this.hoursWorked - regularHoursLimit;
    } else {
      this.regularHours = this.hoursWorked;
      this.overtimeHours = 0;
    }

    // Determine if late (using shift-based threshold with grace period)
    if (this.clockIn.time) {
      const clockInHour = this.clockIn.time.getHours();
      const clockInMinute = this.clockIn.time.getMinutes();
      const clockInDecimal = clockInHour + (clockInMinute / 60);

      if (clockInDecimal > (lateThreshold + gracePeriod)) {
        this.isLate = true;
        this.lateMinutes = Math.round((clockInDecimal - lateThreshold) * 60);
      } else {
        this.isLate = false;
        this.lateMinutes = 0;
      }
    }

    // Determine if early departure (using shift-based threshold with allowance)
    if (this.clockOut.time) {
      const clockOutHour = this.clockOut.time.getHours();
      const clockOutMinute = this.clockOut.time.getMinutes();
      const clockOutDecimal = clockOutHour + (clockOutMinute / 60);

      if (clockOutDecimal < (earlyThreshold - earlyDepartureAllowance) && !this.isLate) {
        this.isEarlyDeparture = true;
        this.earlyDepartureMinutes = Math.round((earlyThreshold - clockOutDecimal) * 60);
      } else {
        this.isEarlyDeparture = false;
        this.earlyDepartureMinutes = 0;
      }
    }

    // Determine attendance status based on hours worked
    if (this.hoursWorked < 4) {
      this.status = 'half-day';
    } else if (this.isLate) {
      this.status = 'late';
    } else if (this.isEarlyDeparture) {
      this.status = 'early-departure';
    } else {
      this.status = 'present';
    }
  }

  // Generate attendance ID if not present
  if (!this.attendanceId) {
    generateAttendanceId(this.companyId).then(id => {
      this.attendanceId = id;
      next();
    }).catch(next);
  } else {
    next();
  }
});

// Method to clock in
attendanceSchema.methods.performClockIn = function(locationData, notes) {
  this.clockIn = {
    time: new Date(),
    location: locationData?.type || 'office',
    coordinates: locationData?.coordinates,
    ipAddress: locationData?.ipAddress,
    deviceId: locationData?.deviceId,
    notes: notes || ''
  };
  this.status = 'present';
  return this.save();
};

// Method to clock out
attendanceSchema.methods.performClockOut = function(locationData, notes) {
  this.clockOut = {
    time: new Date(),
    location: locationData?.type || 'office',
    coordinates: locationData?.coordinates,
    ipAddress: locationData?.ipAddress,
    deviceId: locationData?.deviceId,
    notes: notes || ''
  };
  return this.save();
};

// Method to start break
attendanceSchema.methods.startBreak = function() {
  this.breakStartTime = new Date();
  return this.save();
};

// Method to end break
attendanceSchema.methods.endBreak = function() {
  if (this.breakStartTime) {
    this.breakEndTime = new Date();
    const breakMs = this.breakEndTime - this.breakStartTime;
    this.breakDuration = Math.round(breakMs / (1000 * 60)); // Convert to minutes
  }
  return this.save();
};

// Method to request regularization
attendanceSchema.methods.requestRegularization = function(reason, requestedBy) {
  this.regularizationRequest = {
    requested: true,
    reason,
    requestedBy,
    requestedAt: new Date(),
    status: 'pending'
  };
  return this.save();
};

// Static method to check if employee is already clocked in today
attendanceSchema.statics.isClockedIn = async function(employeeId, date = new Date()) {
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const attendance = await this.findOne({
    employee: employeeId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    },
    clockIn: { $exists: true },
    clockOut: { $exists: false },
    isDeleted: false
  });

  return !!attendance;
};

// Static method to get monthly attendance
attendanceSchema.statics.getMonthlyAttendance = async function(employeeId, year, month) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59);

  return this.find({
    employee: employeeId,
    date: { $gte: startDate, $lte: endDate },
    isDeleted: false
  }).sort({ date: 1 });
};

// Static method to get attendance stats
attendanceSchema.statics.getStats = async function(companyId, filters = {}) {
  const matchQuery = {
    companyId,
    isDeleted: false,
    ...filters
  };

  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        present: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        absent: {
          $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] }
        },
        halfDay: {
          $sum: { $cond: [{ $eq: ['$status', 'half-day'] }, 1, 0] }
        },
        late: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        onLeave: {
          $sum: { $cond: [{ $eq: ['$status', 'on-leave'] }, 1, 0] }
        },
        totalHoursWorked: { $sum: '$hoursWorked' },
        totalOvertimeHours: { $sum: '$overtimeHours' }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    present: 0,
    absent: 0,
    halfDay: 0,
    late: 0,
    onLeave: 0,
    totalHoursWorked: 0,
    totalOvertimeHours: 0
  };
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
