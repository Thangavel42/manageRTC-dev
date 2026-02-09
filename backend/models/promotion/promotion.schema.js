/**
 * Promotion Schema
 * Tracks employee promotions
 */

import mongoose from 'mongoose';

const promotionSchema = new mongoose.Schema({
  // Company for multi-tenant isolation
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Employee being promoted
  employeeId: {
    type: String,
    required: true,
    index: true
  },

  // Promotion details
  promotionTo: {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation',
      required: true
    }
  },

  // Current position (before promotion)
  promotionFrom: {
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
    },
    designationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Designation'
    }
  },

  // When the promotion takes effect
  promotionDate: {
    type: Date,
    required: true,
    index: true
  },

  // Type of promotion
  promotionType: {
    type: String,
    enum: ['Regular', 'Acting', 'Charge', 'Transfer', 'Other'],
    default: 'Regular'
  },

  // Salary change details
  salaryChange: {
    previousSalary: Number,
    newSalary: Number,
    increment: Number,
    incrementPercentage: Number
  },

  // Reason for promotion
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Additional notes
  notes: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  // Status: pending, applied, cancelled
  status: {
    type: String,
    enum: ['pending', 'applied', 'cancelled'],
    default: 'pending',
    index: true
  },

  // When promotion was applied
  appliedAt: {
    type: Date
  },

  // Audit fields
  createdBy: {
    userId: String,
    userName: String
  },
  updatedBy: {
    userId: String,
    userName: String
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    userId: String,
    userName: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
promotionSchema.index({ companyId: 1, isDeleted: 1, status: 1 });
promotionSchema.index({ companyId: 1, employeeId: 1, promotionDate: -1 });
promotionSchema.index({ companyId: 1, promotionDate: 1, status: 1 });

// Virtual: Is due (promotion date has arrived)
promotionSchema.virtual('isDue').get(function() {
  if (this.status === 'applied' || this.status === 'cancelled') {
    return false;
  }
  return new Date(this.promotionDate) <= new Date();
});

// Static method: Get pending promotions that are due
promotionSchema.statics.getDuePromotions = async function(companyId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.find({
    companyId,
    status: 'pending',
    isDeleted: false,
    promotionDate: { $lte: today }
  });
};

// Instance method: Apply promotion
promotionSchema.methods.apply = async function() {
  if (this.status !== 'pending') {
    throw new Error('Only pending promotions can be applied');
  }

  this.status = 'applied';
  this.appliedAt = new Date();
  return this.save();
};

// Instance method: Cancel promotion
promotionSchema.methods.cancel = async function(reason = '') {
  if (this.status === 'applied') {
    throw new Error('Cannot cancel an applied promotion');
  }

  this.status = 'cancelled';
  this.notes = reason || this.notes;
  return this.save();
};

const Promotion = mongoose.model('Promotion', promotionSchema);

export default Promotion;
