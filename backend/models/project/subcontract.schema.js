/**
 * Sub-Contract Schema - Mongoose Model
 * Track sub-contracts with client-like information
 */

import mongoose from 'mongoose';

const subContractSchema = new mongoose.Schema(
  {
    // Company Reference
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company ID is required'],
      index: true,
    },

    // Contract ID (auto-generated)
    contractId: {
      type: String,
      required: [true, 'Contract ID is required'],
      unique: true,
      trim: true,
      index: true,
    },

    // Sub-Contract Details
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters'],
      maxlength: [200, 'Company name cannot exceed 200 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/,
        'Please enter a valid email address',
      ],
      maxlength: [254, 'Email cannot exceed 254 characters'],
    },

    phone: {
      type: String,
      required: [true, 'Phone is required'],
      trim: true,
      minlength: [7, 'Phone must be at least 7 characters'],
      maxlength: [20, 'Phone cannot exceed 20 characters'],
    },

    address: {
      type: String,
      required: [true, 'Address is required'],
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },

    logo: {
      type: String,
      trim: true,
      default: '',
    },

    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },

    // Social Media Links
    socialLinks: {
      instagram: {
        type: String,
        trim: true,
        default: '',
      },
      facebook: {
        type: String,
        trim: true,
        default: '',
      },
      linkedin: {
        type: String,
        trim: true,
        default: '',
      },
      whatsapp: {
        type: String,
        trim: true,
        default: '',
      },
    },

    // Audit fields
    createdBy: {
      type: String,
      required: true,
    },

    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
subContractSchema.index({ companyId: 1, createdAt: -1 });
subContractSchema.index({ status: 1 });
subContractSchema.index({ email: 1 });

const SubContract = mongoose.model('SubContract', subContractSchema);

export default SubContract;
