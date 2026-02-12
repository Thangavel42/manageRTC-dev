/**
 * AssetUser Schema
 * Tracks asset assignments to employees with assignment dates
 */

import mongoose from 'mongoose';

const assetUserSchema = new mongoose.Schema(
  {
    // Asset reference
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Asset ID is required'],
      index: true,
    },

    // Employee reference
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Employee ID is required'],
      index: true,
    },

    // Assignment date
    assignedDate: {
      type: Date,
      required: [true, 'Assignment date is required'],
      default: Date.now,
    },

    // Return date (null if still assigned)
    returnedDate: {
      type: Date,
      default: null,
    },

    // Status of assignment
    status: {
      type: String,
      enum: ['assigned', 'returned', 'damaged', 'lost'],
      default: 'assigned',
      index: true,
    },

    // Notes about the assignment
    notes: {
      type: String,
      trim: true,
    },

    // Company for multi-tenant isolation
    companyId: {
      type: String,
      required: [true, 'Company ID is required'],
      index: true,
    },

    // Audit fields - store Clerk user IDs as strings
    createdBy: {
      type: String,
      required: true,
    },

    updatedBy: {
      type: String,
    },

    deletedBy: {
      type: String,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
assetUserSchema.index({ assetId: 1, companyId: 1 });
assetUserSchema.index({ employeeId: 1, companyId: 1 });
assetUserSchema.index({ status: 1, companyId: 1 });
assetUserSchema.index({ isDeleted: 1, companyId: 1 });

// Pre-save middleware
assetUserSchema.pre('save', function (next) {
  // Set updatedBy on updates
  if (this.isModified() && !this.isNew) {
    this.updatedBy = this.createdBy;
  }
  next();
});

const AssetUser = mongoose.model('AssetUser', assetUserSchema, 'assetusers');

export default AssetUser;
