import mongoose from 'mongoose';

const performanceAppraisalSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  
  employeeId: {
    type: String,
    required: true,
    trim: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
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
  
  image: {
    type: String,
    trim: true
  },
  
  appraisalDate: {
    type: Date,
    required: true
  },
  
  appraisalPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  
  status: {
    type: String,
    enum: ['Draft', 'In Progress', 'Completed', 'Cancelled'],
    default: 'Draft',
    required: true,
    index: true
  },
  
  reviewer: {
    name: {
      type: String,
      trim: true
    },
    designation: {
      type: String,
      trim: true
    },
    department: {
      type: String,
      trim: true
    }
  },
  
  scores: {
    overall: {
      type: Number,
      min: 0,
      max: 100
    },
    professional: {
      type: Number,
      min: 0,
      max: 100
    },
    personal: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  
  comments: {
    employee: {
      type: String,
      trim: true
    },
    reviewer: {
      type: String,
      trim: true
    },
    hr: {
      type: String,
      trim: true
    }
  },
  
  goals: {
    achieved: [{
      goal: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      }
    }],
    future: [{
      goal: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      }
    }]
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
      ret.id = ret._id?.toString();
      if (ret.appraisalDate) ret.appraisalDate = ret.appraisalDate.toISOString().split('T')[0];
      if (ret.appraisalPeriod?.startDate) ret.appraisalPeriod.startDate = ret.appraisalPeriod.startDate.toISOString().split('T')[0];
      if (ret.appraisalPeriod?.endDate) ret.appraisalPeriod.endDate = ret.appraisalPeriod.endDate.toISOString().split('T')[0];
      return ret;
    }
  }
});

// Ensure id is set if someone creates a doc with only _id
performanceAppraisalSchema.pre('validate', function (next) {
  if (!this.id && this._id) {
    this.id = this._id.toString();
  }
  next();
});

// Indexes for common queries
performanceAppraisalSchema.index({ companyId: 1, createdAt: -1 });
performanceAppraisalSchema.index({ companyId: 1, status: 1 });
performanceAppraisalSchema.index({ companyId: 1, employeeId: 1 });
performanceAppraisalSchema.index({ companyId: 1, department: 1 });
performanceAppraisalSchema.index({ companyId: 1, isDeleted: 1 });

// Keep updatedAt in sync
performanceAppraisalSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});
performanceAppraisalSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.models.PerformanceAppraisal || mongoose.model('PerformanceAppraisal', performanceAppraisalSchema);