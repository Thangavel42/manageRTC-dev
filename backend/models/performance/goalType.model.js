import mongoose from 'mongoose';

const goalTypeSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true
  },
  
  type: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
    required: true,
    index: true
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
      return ret;
    }
  }
});

// Ensure id is set if someone creates a doc with only _id
goalTypeSchema.pre('validate', function (next) {
  if (!this.id && this._id) {
    this.id = this._id.toString();
  }
  next();
});

// Indexes for common queries
goalTypeSchema.index({ companyId: 1, createdAt: -1 });
goalTypeSchema.index({ companyId: 1, status: 1 });
goalTypeSchema.index({ companyId: 1, isDeleted: 1 });

// Keep updatedAt in sync
goalTypeSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});
goalTypeSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

export default mongoose.models.GoalType || mongoose.model('GoalType', goalTypeSchema);
