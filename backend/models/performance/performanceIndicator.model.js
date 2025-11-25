import mongoose from 'mongoose';

const performanceIndicatorSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  
  designation: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  department: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  approvedBy: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  role: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  image: {
    type: String,
    trim: true
  },
  
  createdDate: {
    type: Date,
    required: true
  },
  
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Draft'],
    default: 'Active',
    required: true,
    index: true
  },
  
  indicators: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    weight: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    target: {
      type: String,
      trim: true
    }
  }],
  
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
      ret.id = ret._id?.toString();
      if (ret.createdDate) ret.createdDate = ret.createdDate.toISOString().split('T')[0];
      return ret;
    }
  }
});

// Ensure id is set if someone creates a doc with only _id
performanceIndicatorSchema.pre('validate', function (next) {
  if (!this.id && this._id) {
    this.id = this._id.toString();
  }
  next();
});

// Indexes for common queries
performanceIndicatorSchema.index({ companyId: 1, createdAt: -1 });
performanceIndicatorSchema.index({ companyId: 1, status: 1 });
performanceIndicatorSchema.index({ companyId: 1, designation: 1 });
performanceIndicatorSchema.index({ companyId: 1, department: 1 });
performanceIndicatorSchema.index({ companyId: 1, isDeleted: 1 });

// Keep updatedAt in sync
performanceIndicatorSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});
performanceIndicatorSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.models.PerformanceIndicator || mongoose.model('PerformanceIndicator', performanceIndicatorSchema);