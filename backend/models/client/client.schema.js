/**
 * Client Schema - Mongoose Model
 * Simplified CRM Client management
 */

import mongoose from 'mongoose';
import { generateClientId } from '../../utils/idGenerator.js';

/**
 * Client Schema - Matches actual database structure
 */
const clientSchema = new mongoose.Schema(
  {
    // Auto-generated client ID (e.g., CLIT-0012)
    clientId: {
      type: String,
      unique: true,
      index: true,
    },

    // Client name
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      maxlength: [200, 'Client name cannot exceed 200 characters'],
    },

    // Company name (mandatory)
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
      index: true,
    },

    // Contact email
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },

    // Phone number
    phone: {
      type: String,
      trim: true,
    },

    // Address (stored as string)
    address: {
      type: String,
      trim: true,
      default: '',
    },

    // Logo URL
    logo: {
      type: String,
      trim: true,
      default: '',
    },

    // Contract value
    contractValue: {
      type: Number,
      default: 0,
      min: [0, 'Contract value cannot be negative'],
    },

    // Client status
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },

    // Social media links
    socialLinks: {
      instagram: {
        type: String,
        trim: true,
        default: '',
        validate: {
          validator: function (v) {
            if (!v || v === '') return true; // Allow empty string
            // Check if URL contains instagram.com or instagr.am
            return /instagram\.com|instagr\.am/i.test(v);
          },
          message: 'Instagram URL must contain "instagram.com"',
        },
      },
      facebook: {
        type: String,
        trim: true,
        default: '',
        validate: {
          validator: function (v) {
            if (!v || v === '') return true; // Allow empty string
            // Check if URL contains facebook.com or fb.com or fb.me
            return /facebook\.com|fb\.com|fb\.me/i.test(v);
          },
          message: 'Facebook URL must contain "facebook.com"',
        },
      },
      linkedin: {
        type: String,
        trim: true,
        default: '',
        validate: {
          validator: function (v) {
            if (!v || v === '') return true; // Allow empty string
            // Check if URL contains linkedin.com
            return /linkedin\.com/i.test(v);
          },
          message: 'LinkedIn URL must contain "linkedin.com"',
        },
      },
      whatsapp: {
        type: String,
        trim: true,
        default: '',
        validate: {
          validator: function (v) {
            if (!v || v === '') return true; // Allow empty string
            // Check if it's a WhatsApp URL (wa.me, api.whatsapp.com, whatsapp.com) or just a phone number
            return /wa\.me|whatsapp\.com|^\+?\d{10,15}$/i.test(v);
          },
          message: 'WhatsApp must be a valid phone number or WhatsApp URL',
        },
      },
    },

    // Projects count (for tracking)
    projects: {
      type: Number,
      default: 0,
      min: [0, 'Projects count cannot be negative'],
    },

    // Soft delete flag
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Indexes
 */
clientSchema.index({ company: 1, isDeleted: 1 });
clientSchema.index({ status: 1, isDeleted: 1 });
clientSchema.index({ createdAt: -1 });

// Text search index
clientSchema.index({
  name: 'text',
  company: 'text',
  email: 'text',
});

/**
 * Pre-save Middleware
 */
// Generate clientId before saving if not exists
clientSchema.pre('save', async function (next) {
  if (!this.clientId) {
    this.clientId = await generateClientId();
  }
  next();
});

/**
 * Static Methods
 */

// Get active clients only
clientSchema.statics.getActiveClients = function () {
  return this.find({
    isDeleted: false,
  });
};

// Get clients by status
clientSchema.statics.getByStatus = function (status) {
  return this.find({
    status,
    isDeleted: false,
  });
};

// Search clients
clientSchema.statics.searchClients = function (searchTerm) {
  return this.find({
    isDeleted: false,
    $or: [
      { name: { $regex: searchTerm, $options: 'i' } },
      { company: { $regex: searchTerm, $options: 'i' } },
      { email: { $regex: searchTerm, $options: 'i' } },
    ],
  });
};

/**
 * Instance Methods
 */

// Soft delete client
clientSchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.status = 'Inactive';
  return this.save();
};

/**
 * Create and export model
 */
const Client = mongoose.model('Client', clientSchema);

export default Client;
