/**
 * Leave Schema
 * Tracks employee leave requests, approvals, and leave balance
 */

import mongoose from 'mongoose';
import { generateLeaveId } from '../../utils/idGenerator.js';

const leaveSchema = new mongoose.Schema({
  leaveId: {
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

  // Employee identifier (string) for direct lookups
  employeeId: {
    type: String,
    required: true,
    index: true
  },

  // Company for multi-tenant isolation
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Department ownership for HR scoping
  departmentId: {
    type: String,
    index: true
  },

  // Leave type
  leaveType: {
    type: String,
    required: [true, 'Leave type is required'],
    enum: ['sick', 'casual', 'earned', 'maternity', 'paternity', 'bereavement', 'compensatory', 'unpaid', 'special'],
    index: true
  },

  // Date range
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    index: true
  },

  // Alias for startDate for consistency with consumers
  fromDate: {
    type: Date,
    index: true,
    default: function() {
      return this.startDate;
    }
  },

  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    index: true
  },

  // Alias for endDate for consistency with consumers
  toDate: {
    type: Date,
    index: true,
    default: function() {
      return this.endDate;
    }
  },

  // Duration calculation
  duration: {
    type: Number,
    required: true,
    min: 0.5
  },

  // Days breakdown
  totalDays: {
    type: Number,
    default: 0
  },

  workingDays: {
    type: Number,
    default: 0
  },

  nonWorkingDays: {
    type: Number,
    default: 0
  },

  // Is half day
  isHalfDay: {
    type: Boolean,
    default: false
  },

  halfDayType: {
    type: String,
    enum: ['first-half', 'second-half']
  },

  // Reason for leave
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    minlength: [3, 'Reason must be at least 3 characters long'],
    maxlength: [500, 'Reason cannot exceed 500 characters'],
    trim: true
  },

  // Detailed reason (for longer leaves)
  detailedReason: {
    type: String,
    maxlength: 2000
  },

  // Leave status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled', 'on-hold'],
    default: 'pending',
    index: true
  },

  // Employee-facing status
  employeeStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },

  // Reporting manager status
  managerStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },

  // HR notification status (view-only)
  hrStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },

  // Final status derived from manager action
  finalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },

  // Approval details
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  approvedAt: Date,

  approvalComments: {
    type: String,
    maxlength: 500
  },

  // Rejection details
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  rejectedAt: Date,

  rejectionReason: {
    type: String,
    maxlength: 500
  },

  // Cancellation details
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  cancelledAt: Date,

  cancellationReason: {
    type: String,
    maxlength: 500
  },

  // Attachments (medical certificates, etc.)
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Contact details during leave
  contactInfo: {
    phone: String,
    email: String,
    address: String
  },

  // Emergency contact during leave
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String
  },

  // Handover details
  handoverTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  handoverNotes: String,

  // Leave balance at time of request
  balanceAtRequest: {
    type: Number,
    default: 0
  },

  // Is this leave carried over from previous year
  isCarryForward: {
    type: Boolean,
    default: false
  },

  // Carry forward year
  carryForwardYear: Number,

  // Reporting manager (for approval workflow)
  reportingManager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  // Reporting manager (employeeId for REST workflow)
  reportingManagerId: {
    type: String,
    index: true
  },

  // Additional approvers (multi-level approval)
  additionalApprovers: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    comments: String,
    approvedAt: Date,
    rejectedAt: Date
  }],

  // HR review (for long leaves)
  hrReview: {
    required: {
      type: Boolean,
      default: false
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    },
    reviewedAt: Date,
    comments: String
  },

  // Notifications sent
  notificationsSent: {
    employee: {
      type: Boolean,
      default: false
    },
    manager: {
      type: Boolean,
      default: false
    },
    team: {
      type: Boolean,
      default: false
    }
  },

  // Auto-approval settings
  autoApproved: {
    type: Boolean,
    default: false
  },

  autoApprovalReason: String,

  // Notes and comments
  notes: {
    type: String,
    maxlength: 500
  },

  adminNotes: {
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
  timestamps: true
});

// Compound indexes for efficient queries
leaveSchema.index({ employee: 1, status: 1 });
leaveSchema.index({ companyId: 1, status: 1 });
leaveSchema.index({ companyId: 1, leaveType: 1 });
leaveSchema.index({ startDate: 1, endDate: 1 });
leaveSchema.index({ companyId: 1, departmentId: 1 });
leaveSchema.index({ employee: 1, isDeleted: 1 });
leaveSchema.index({ companyId: 1, startDate: -1 });

// Pre-save middleware to calculate duration
leaveSchema.pre('save', function(next) {
  // Calculate duration in days
  if (this.startDate && this.endDate) {
    // Keep alias fields in sync for consumers using fromDate/toDate
    if (!this.fromDate) {
      this.fromDate = this.startDate;
    }
    if (!this.toDate) {
      this.toDate = this.endDate;
    }

    const start = new Date(this.startDate);
    const end = new Date(this.endDate);

    // Calculate total days
    const diffTime = Math.abs(end - start);
    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    // Calculate working days (excluding weekends)
    let workingDays = 0;
    let nonWorkingDays = 0;

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) { // Sunday or Saturday
        nonWorkingDays++;
      } else {
        workingDays++;
      }
    }

    this.workingDays = workingDays;
    this.nonWorkingDays = nonWorkingDays;

    // Set duration (for half-day or full-day leaves)
    if (this.isHalfDay) {
      this.duration = 0.5;
    } else {
      this.duration = this.workingDays;
    }
  }

  // Generate leave ID if not present
  if (!this.leaveId) {
    generateLeaveId().then(id => {
      this.leaveId = id;
      next();
    }).catch(next);
  } else {
    next();
  }
});

// Method to approve leave
leaveSchema.methods.approve = function(approvedBy, comments) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.approvalComments = comments;
  return this.save();
};

// Method to reject leave
leaveSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'rejected';
  this.rejectedBy = rejectedBy;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

// Method to cancel leave
leaveSchema.methods.cancel = function(cancelledBy, reason) {
  this.status = 'cancelled';
  this.cancelledBy = cancelledBy;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;
  return this.save();
};

// Static method to check for overlapping leaves
leaveSchema.statics.checkOverlap = async function(employeeId, startDate, endDate, excludeLeaveId = null) {
  const query = {
    employee: employeeId,
    status: { $in: ['pending', 'approved'] },
    isDeleted: false,
    $or: [
      // New leave starts during existing leave
      { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(startDate) } },
      // New leave ends during existing leave
      { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(endDate) } },
      // New leave completely covers existing leave
      { startDate: { $gte: new Date(startDate) }, endDate: { $lte: new Date(endDate) } }
    ]
  };

  if (excludeLeaveId) {
    query._id = { $ne: excludeLeaveId };
  }

  return this.find(query);
};

// Static method to get leave balance
leaveSchema.statics.getLeaveBalance = async function(employeeId, leaveType) {
  const Employee = mongoose.model('Employee');
  const employee = await Employee.findOne({ _id: employeeId, isDeleted: false });

  if (!employee || !employee.leaveBalances) {
    return {
      total: 0,
      used: 0,
      balance: 0,
      pending: 0
    };
  }

  const balanceInfo = employee.leaveBalances.find(b => b.type === leaveType);

  if (!balanceInfo) {
    return {
      total: 0,
      used: 0,
      balance: 0,
      pending: 0
    };
  }

  // Calculate pending leaves
  const pendingLeaves = await this.aggregate([
    {
      $match: {
        employee: employeeId,
        leaveType,
        status: 'pending',
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalPending: { $sum: '$duration' }
      }
    }
  ]);

  const pending = pendingLeaves[0]?.totalPending || 0;

  return {
    total: balanceInfo.total,
    used: balanceInfo.used,
    balance: balanceInfo.balance,
    pending
  };
};

// Static method to get leave statistics
leaveSchema.statics.getStats = async function(companyId, filters = {}) {
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
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        approved: {
          $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
        },
        rejected: {
          $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        sick: {
          $sum: { $cond: [{ $eq: ['$leaveType', 'sick'] }, 1, 0] }
        },
        casual: {
          $sum: { $cond: [{ $eq: ['$leaveType', 'casual'] }, 1, 0] }
        },
        earned: {
          $sum: { $cond: [{ $eq: ['$leaveType', 'earned'] }, 1, 0] }
        },
        totalDaysTaken: { $sum: '$duration' }
      }
    }
  ]);

  return stats[0] || {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    sick: 0,
    casual: 0,
    earned: 0,
    totalDaysTaken: 0
  };
};

const Leave = mongoose.model('Leave', leaveSchema);

export default Leave;
