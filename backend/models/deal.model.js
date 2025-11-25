import mongoose from 'mongoose';

const OwnerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  avatar: { type: String, trim: true }
}, { _id: false });

const ContactSchema = new mongoose.Schema({
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please fill a valid email address']
  },
  phone: { type: String, trim: true }
}, { _id: false });

// Deal schema updated to match new JSON schema
const dealSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },

  // Core identifiers - required fields from schema
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  initials: {
    type: String,
    trim: true,
    maxlength: 10
  },
  stage: {
    type: String,
    enum: ['New', 'Prospect', 'Proposal', 'Won', 'Lost'],
    default: 'New',
    required: true,
    index: true
  },

  // Status / probability - required fields from schema
  status: {
    type: String,
    enum: ['Won', 'Lost', 'Open'],
    default: 'Open',
    required: true,
    index: true
  },
  probability: {
    type: Number,
    min: 0,
    max: 100,
    required: true,
    default: 0
  },

  // Financials - required field from schema
  dealValue: {
    type: Number,
    min: 0,
    required: true,
    default: 0
  },

  // New fields from schema
  address: {
    type: String,
    trim: true,
    maxlength: 500
  },
  contact: {
    type: ContactSchema,
    default: {}
  },

  // Ownership - required field from schema
  owner: {
    type: OwnerSchema,
    required: true
  },

  // Tags from schema
  tags: [{ 
    type: String, 
    trim: true,
    maxlength: 50
  }],

  // Expected closed date - required field from schema
  expectedClosedDate: { 
    type: Date,
    required: true
  },

  // Legacy fields for backward compatibility (optional)
  pipeline: {
    type: String,
    trim: true
  },
  currency: {
    type: String,
    trim: true,
    default: 'USD'
  },
  period: {
    type: String,
    trim: true
  },
  periodValue: {
    type: Number,
    min: 0
  },
  contacts: [{ type: String, trim: true }],
  projects: [{ type: String, trim: true }],
  assignees: [{ type: String, trim: true }],
  dueDate: { type: Date },
  followupDate: { type: Date },
  source: { type: String, trim: true },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  isPrivate: { type: Boolean, default: false },
  description: {
    type: String,
    maxlength: 5000,
    default: ''
  },

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      // ensure API consumers get 'id' (string) and not Mongo _id confusion
      ret.id = ret._id?.toString();
      // expectedClosedDate as ISO string for frontend compatibility
      if (ret.expectedClosedDate) ret.expectedClosedDate = ret.expectedClosedDate.toISOString().split('T')[0];
      return ret;
    }
  }
});

// Ensure id is set if someone creates a doc with only _id
dealSchema.pre('validate', function (next) {
  if (!this.id && this._id) {
    this.id = this._id.toString();
  }
  next();
});

// Indexes for common queries
dealSchema.index({ companyId: 1, createdAt: -1 });
dealSchema.index({ companyId: 1, status: 1 });
dealSchema.index({ companyId: 1, stage: 1 });
dealSchema.index({ companyId: 1, owner: 1 });
dealSchema.index({ companyId: 1, isDeleted: 1 });

// Keep updatedAt in sync
dealSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});
dealSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.models.Deal || mongoose.model('Deal', dealSchema);


