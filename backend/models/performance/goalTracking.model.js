import mongoose from 'mongoose';

const goalTrackingSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  
  goalType: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  targetAchievement: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  startDate: {
    type: Date,
    required: true
  },
  
  endDate: {
    type: Date,
    required: true
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  
  status: {
    type: String,
    enum: ['Active', 'Completed', 'Cancelled', 'On Hold'],
    default: 'Active',
    required: true,
    index: true
  },
  
  progress: {
    type: String,
    trim: true,
    maxlength: 50
  },
  
  progressPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  
  assignedTo: {
    type: String,
    trim: true
  },
  
  assignedBy: {
    type: String,
    trim: true
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
      if (ret.startDate) ret.startDate = ret.startDate.toISOString().split('T')[0];
      if (ret.endDate) ret.endDate = ret.endDate.toISOString().split('T')[0];
      return ret;
    }
  }
});

// Ensure id is set if someone creates a doc with only _id
goalTrackingSchema.pre('validate', function (next) {
  if (!this.id && this._id) {
    this.id = this._id.toString();
  }
  next();
});

// Indexes for common queries
goalTrackingSchema.index({ companyId: 1, createdAt: -1 });
goalTrackingSchema.index({ companyId: 1, status: 1 });
goalTrackingSchema.index({ companyId: 1, goalType: 1 });
goalTrackingSchema.index({ companyId: 1, assignedTo: 1 });
goalTrackingSchema.index({ companyId: 1, isDeleted: 1 });

// Keep updatedAt in sync
goalTrackingSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});
goalTrackingSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.models.GoalTracking || mongoose.model('GoalTracking', goalTrackingSchema);
