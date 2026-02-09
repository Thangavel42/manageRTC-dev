/**
 * Timesheet Schema
 *
 * Tracks employee work hours on a weekly basis
 * Supports approval workflow and billing tracking
 */

import mongoose from 'mongoose';

/**
 * Individual timesheet entry (one day)
 */
const timesheetEntrySchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: false
  },
  task: {
    type: String,
    required: false,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  hours: {
    type: Number,
    required: true,
    min: 0,
    max: 24
  },
  isBillable: {
    type: Boolean,
    default: false
  },
  regularHours: {
    type: Number,
    default: 0,
    min: 0,
    max: 8
  },
  overtimeHours: {
    type: Number,
    default: 0,
    min: 0,
    max: 16
  }
}, { _id: false });

/**
 * Main timesheet schema (weekly)
 */
const timesheetSchema = new mongoose.Schema({
  timesheetId: {
    type: String,
    unique: true,
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: false
  },
  weekStartDate: {
    type: Date,
    required: true
  },
  weekEndDate: {
    type: Date,
    required: true
  },
  entries: {
    type: [timesheetEntrySchema],
    default: []
  },
  totalHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalRegularHours: {
    type: Number,
    default: 0,
    min: 0
  },
  totalOvertimeHours: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected', 'cancelled'],
    default: 'draft'
  },

  // Submission tracking
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedAt: {
    type: Date
  },

  // Approval tracking
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  approvalComments: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Rejection tracking
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Company tracking
  companyId: {
    type: String,
    required: true
  },

  // Metadata
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

/**
 * Indexes for performance
 */
timesheetSchema.index({ companyId: 1, isDeleted: 1 });
timesheetSchema.index({ employeeId: 1, weekStartDate: -1 });
timesheetSchema.index({ status: 1 });
timesheetSchema.index({ companyId: 1, status: 1, weekStartDate: -1 });
timesheetSchema.index({ timesheetId: 1 }, { unique: true });

// Additional performance indexes
timesheetSchema.index({ employeeId: 1, status: 1 });
timesheetSchema.index({ companyId: 1, employeeId: 1, weekStartDate: -1 });
timesheetSchema.index({ weekStartDate: -1 }); // For finding timesheets by week
timesheetSchema.index({ submittedBy: 1 }); // For approval queries
timesheetSchema.index({ approvedBy: 1 }); // For approval history
timesheetSchema.index({ createdAt: -1 }); // For recent timesheets
timesheetSchema.index({ updatedAt: -1 }); // For recently modified

/**
 * Pre-save middleware to calculate total hours
 */
timesheetSchema.pre('save', function(next) {
  if (this.entries && this.entries.length > 0) {
    this.totalHours = this.entries.reduce((sum, entry) => sum + (entry.hours || 0), 0);
    this.totalRegularHours = this.entries.reduce((sum, entry) => sum + (entry.regularHours || 0), 0);
    this.totalOvertimeHours = this.entries.reduce((sum, entry) => sum + (entry.overtimeHours || 0), 0);
  }
  this.updatedAt = new Date();
  next();
});

/**
 * Instance methods
 */

/**
 * Check if timesheet can be submitted
 */
timesheetSchema.methods.canSubmit = function() {
  return this.status === 'draft' && this.entries.length > 0;
};

/**
 * Check if timesheet can be approved
 */
timesheetSchema.methods.canApprove = function() {
  return this.status === 'submitted';
};

/**
 * Check if timesheet can be rejected
 */
timesheetSchema.methods.canReject = function() {
  return this.status === 'submitted';
};

/**
 * Check if timesheet can be edited
 */
timesheetSchema.methods.canEdit = function() {
  return ['draft', 'rejected'].includes(this.status);
};

/**
 * Submit timesheet for approval
 */
timesheetSchema.methods.submit = function(userId) {
  if (!this.canSubmit()) {
    throw new Error('Timesheet cannot be submitted in current state');
  }
  this.status = 'submitted';
  this.submittedBy = userId;
  this.submittedAt = new Date();
  return this.save();
};

/**
 * Approve timesheet
 */
timesheetSchema.methods.approve = function(userId, comments) {
  if (!this.canApprove()) {
    throw new Error('Timesheet cannot be approved in current state');
  }
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalComments = comments;
  return this.save();
};

/**
 * Reject timesheet
 */
timesheetSchema.methods.reject = function(userId, reason) {
  if (!this.canReject()) {
    throw new Error('Timesheet cannot be rejected in current state');
  }
  this.status = 'rejected';
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

/**
 * Static methods
 */

/**
 * Find timesheets by date range
 */
timesheetSchema.statics.findByDateRange = function(companyId, startDate, endDate) {
  return this.find({
    companyId,
    isDeleted: { $ne: true },
    weekStartDate: { $gte: startDate },
    weekEndDate: { $lte: endDate }
  }).sort({ weekStartDate: -1 });
};

/**
 * Find pending timesheets
 */
timesheetSchema.statics.findPending = function(companyId) {
  return this.find({
    companyId,
    isDeleted: { $ne: true },
    status: 'submitted'
  }).sort({ weekStartDate: -1 });
};

/**
 * Get timesheet stats for a period
 */
timesheetSchema.statics.getStats = function(companyId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        companyId,
        isDeleted: { $ne: true },
        weekStartDate: { $gte: startDate },
        weekEndDate: { $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: '$totalHours' },
        totalRegularHours: { $sum: '$totalRegularHours' },
        totalOvertimeHours: { $sum: '$totalOvertimeHours' }
      }
    }
  ]);
};

export default timesheetSchema;
