/**
 * Leave Ledger Schema
 * Tracks all balance changes for employee leave accounts
 * Provides complete audit trail of leave balance transactions
 */

import mongoose from 'mongoose';

/**
 * Transaction Types:
 * - opening: Opening balance at period start
 * - allocated: Leave allocated (earned/accrued)
 * - used: Leave used (approved leave request)
 * - restored: Leave restored (cancelled leave request)
 * - carry_forward: Balance carried from previous year
 * - encashed: Leave encashed (converted to salary)
 * - adjustment: Manual adjustment by HR/Admin
 * - expired: Leave expired (not used within validity period)
 */
const leaveLedgerEntrySchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: true,
    index: true
  },

  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Leave type for this transaction (legacy string code for backward compatibility)
  leaveType: {
    type: String,
    required: true,
    enum: ['casual', 'sick', 'earned', 'compensatory', 'maternity', 'paternity', 'bereavement', 'unpaid', 'special'],
    index: true
  },

  // Leave type ObjectId reference (modern approach - primary key for lookups)
  leaveTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LeaveType',
    index: true
  },

  // Transaction type
  transactionType: {
    type: String,
    required: true,
    enum: ['opening', 'allocated', 'used', 'restored', 'carry_forward', 'encashed', 'adjustment', 'expired'],
    index: true
  },

  // Transaction amount (positive for credit, negative for debit)
  amount: {
    type: Number,
    required: true
  },

  // Balance before this transaction
  balanceBefore: {
    type: Number,
    required: true
  },

  // Balance after this transaction
  balanceAfter: {
    type: Number,
    required: true
  },

  // Reference to related leave request (if applicable)
  leaveId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Leave'
  },

  // Reference to related leave request string ID
  leaveRequestId: {
    type: String
  },

  // Transaction date
  transactionDate: {
    type: Date,
    required: true,
    index: true
  },

  // Financial year (for carry forward calculations)
  financialYear: {
    type: String,
    // Format: FY2024-2025
    index: true
  },

  // Period/Year for this transaction
  year: {
    type: Number,
    index: true
  },

  month: {
    type: Number,
    index: true
  },

  // Description/Notes
  description: {
    type: String,
    maxlength: 500
  },

  // Additional details
  details: {
    startDate: Date,
    endDate: Date,
    duration: Number,
    reason: String
  },

  // Who made this change (for adjustments)
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },

  changedByUserId: {
    type: String
  },

  // Adjustment reason (for manual adjustments)
  adjustmentReason: {
    type: String,
    maxlength: 500
  },

  // Attachments (for medical leaves, etc.)
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: Date
  }],

  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },

  // Soft delete
  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedAt: Date,

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
leaveLedgerEntrySchema.index({ employeeId: 1, leaveType: 1, transactionDate: -1 });
leaveLedgerEntrySchema.index({ employeeId: 1, leaveTypeId: 1, transactionDate: -1 });
leaveLedgerEntrySchema.index({ companyId: 1, transactionDate: -1 });
leaveLedgerEntrySchema.index({ employeeId: 1, financialYear: 1, leaveType: 1 });
leaveLedgerEntrySchema.index({ employeeId: 1, financialYear: 1, leaveTypeId: 1 });
leaveLedgerEntrySchema.index({ employeeId: 1, year: 1, month: 1, leaveType: 1 });
leaveLedgerEntrySchema.index({ employeeId: 1, year: 1, month: 1, leaveTypeId: 1 });

// Static method to create opening balance entry
leaveLedgerEntrySchema.statics.createOpeningBalance = async function(employeeId, companyId, leaveType, balance, year, month) {
  return this.create({
    employeeId,
    companyId,
    leaveType,
    transactionType: 'opening',
    amount: 0,
    balanceBefore: 0,
    balanceAfter: balance,
    transactionDate: new Date(year, month - 1, 1),
    financialYear: `FY${year}-${year + 1}`,
    year,
    month,
    description: 'Opening balance'
  });
};

// Static method to record leave usage
leaveLedgerEntrySchema.statics.recordLeaveUsage = async function(employeeId, companyId, leaveType, amount, leaveId, startDate, endDate, description) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get current balance
  const latestEntry = await this.findOne({
    employeeId,
    leaveType,
    isDeleted: false
  }).sort({ transactionDate: -1 });

  const balanceBefore = latestEntry ? latestEntry.balanceAfter : 0;
  const balanceAfter = balanceBefore - amount;

  return this.create({
    employeeId,
    companyId,
    leaveType,
    transactionType: 'used',
    amount: -amount,
    balanceBefore,
    balanceAfter,
    leaveId,
    transactionDate: now,
    financialYear: `FY${year}-${year + 1}`,
    year,
    month,
    description: description || 'Leave used',
    details: {
      startDate,
      endDate,
      duration: amount
    }
  });
};

// Static method to record leave restoration
leaveLedgerEntrySchema.statics.recordLeaveRestoration = async function(employeeId, companyId, leaveType, amount, leaveId, description) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get current balance
  const latestEntry = await this.findOne({
    employeeId,
    leaveType,
    isDeleted: false
  }).sort({ transactionDate: -1 });

  const balanceBefore = latestEntry ? latestEntry.balanceAfter : 0;
  const balanceAfter = balanceBefore + amount;

  return this.create({
    employeeId,
    companyId,
    leaveType,
    transactionType: 'restored',
    amount: amount,
    balanceBefore,
    balanceAfter,
    leaveId,
    transactionDate: now,
    financialYear: `FY${year}-${year + 1}`,
    year,
    month,
    description: description || 'Leave restored after cancellation'
  });
};

// Static method to record leave allocation
leaveLedgerEntrySchema.statics.recordLeaveAllocation = async function(employeeId, companyId, leaveType, amount, description) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get current balance
  const latestEntry = await this.findOne({
    employeeId,
    leaveType,
    isDeleted: false
  }).sort({ transactionDate: -1 });

  const balanceBefore = latestEntry ? latestEntry.balanceAfter : 0;
  const balanceAfter = balanceBefore + amount;

  return this.create({
    employeeId,
    companyId,
    leaveType,
    transactionType: 'allocated',
    amount: amount,
    balanceBefore,
    balanceAfter,
    transactionDate: now,
    financialYear: `FY${year}-${year + 1}`,
    year,
    month,
    description: description || 'Leave allocated'
  });
};

// Static method to record carry forward
leaveLedgerEntrySchema.statics.recordCarryForward = async function(employeeId, companyId, leaveType, amount, fromYear, toYear) {
  const now = new Date();
  const month = now.getMonth() + 1;

  // Get current balance
  const latestEntry = await this.findOne({
    employeeId,
    leaveType,
    isDeleted: false
  }).sort({ transactionDate: -1 });

  const balanceBefore = latestEntry ? latestEntry.balanceAfter : 0;
  const balanceAfter = balanceBefore + amount;

  return this.create({
    employeeId,
    companyId,
    leaveType,
    transactionType: 'carry_forward',
    amount: amount,
    balanceBefore,
    balanceAfter,
    transactionDate: now,
    financialYear: `FY${toYear}-${toYear + 1}`,
    year: toYear,
    month,
    description: `Leave carried forward from FY${fromYear}-${fromYear + 1}`
  });
};

// Static method to get balance history for an employee
leaveLedgerEntrySchema.statics.getBalanceHistory = async function(employeeId, filters = {}) {
  const { leaveType, startDate, endDate, limit = 100 } = filters;

  const query = {
    employeeId,
    isDeleted: false,
    ...filters
  };

  if (leaveType) {
    query.leaveType = leaveType;
  }

  if (startDate || endDate) {
    query.transactionDate = {};
    if (startDate) query.transactionDate.$gte = new Date(startDate);
    if (endDate) query.transactionDate.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ transactionDate: -1 })
    .limit(limit)
    .populate('leaveId', 'leaveId startDate endDate status')
    .populate('changedBy', 'firstName lastName employeeId');
};

// Static method to get current balance
leaveLedgerEntrySchema.statics.getCurrentBalance = async function(employeeId, leaveType) {
  const latestEntry = await this.findOne({
    employeeId,
    leaveType,
    isDeleted: false
  }).sort({ transactionDate: -1 });

  return latestEntry ? latestEntry.balanceAfter : 0;
};

// Static method to get balance summary for all leave types
leaveLedgerEntrySchema.statics.getBalanceSummary = async function(employeeId) {
  const leaveTypes = ['casual', 'sick', 'earned', 'compensatory', 'maternity', 'paternity', 'bereavement', 'unpaid', 'special'];

  const summary = {};

  for (const leaveType of leaveTypes) {
    const latestEntry = await this.findOne({
      employeeId,
      leaveType,
      isDeleted: false
    }).sort({ transactionDate: -1 });

    summary[leaveType] = {
      currentBalance: latestEntry ? latestEntry.balanceAfter : 0,
      lastTransaction: latestEntry ? latestEntry.transactionDate : null
    };
  }

  return summary;
};

const LeaveLedger = mongoose.model('LeaveLedger', leaveLedgerEntrySchema);

export default LeaveLedger;
