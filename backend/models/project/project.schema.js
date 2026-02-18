import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    client: {
      type: String,
      required: true,
      trim: true,
    },
    companyId: {
      type: String,
      required: true,
      index: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium',
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'On Hold', 'Cancelled'],
      default: 'Active',
    },
    projectValue: {
      type: Number,
      default: 0,
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    teamMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
    ],
    teamLeader: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
    ],
    projectManager: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Employee',
      },
    ],
    milestones: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Milestone',
      },
    ],
    budgetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Budget',
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    logo: {
      type: String,
      default: null,
    },
    // Sub-Contract references (stores ObjectIds from SubContract collection)
    subContracts: [
      {
        subContractId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'SubContract',
        },
        contractDate: {
          type: Date,
        },
        numberOfMembers: {
          type: Number,
          default: 0,
        },
        totalAmount: {
          type: Number,
          default: 0,
        },
        currency: {
          type: String,
          default: '$',
        },
        description: {
          type: String,
          trim: true,
          default: '',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
        isDeleted: {
          type: Boolean,
          default: false,
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
projectSchema.index({ companyId: 1, projectId: 1 });
projectSchema.index({ companyId: 1, status: 1 });
projectSchema.index({ companyId: 1, priority: 1 });
projectSchema.index({ companyId: 1, client: 1 });
projectSchema.index({ companyId: 1, isDeleted: 1 });
projectSchema.index({ startDate: 1 });
projectSchema.index({ dueDate: 1 });
projectSchema.index({ companyId: 1, budgetId: 1 });

// Pre-save middleware to update the updatedAt timestamp
projectSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// Virtual for checking if project is overdue
projectSchema.virtual('isOverdue').get(function () {
  if (this.status === 'Completed') return false;
  return this.dueDate && new Date() > this.dueDate;
});

// Virtual for calculating completion percentage based on tasks
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: 'projectId',
  foreignField: 'projectId',
  count: true,
});

const Project = mongoose.model('Project', projectSchema);

export default Project;
