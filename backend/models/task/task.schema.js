import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    auto: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Project',
  },
  status: {
    type: String,
    default: 'Pending', // Statuses are managed in taskstatus collection
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  assignee: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
  ],
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  milestoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Milestone',
  },
  timeEntryIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TimeEntry',
    },
  ],
  startDate: {
    type: Date,
  },
  dueDate: {
    type: Date,
  },
  estimatedHours: {
    type: Number,
    default: 0,
  },
  actualHours: {
    type: Number,
    default: 0,
  },
  attachments: [
    {
      filename: String,
      url: String,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdBy: {
    type: String,
    required: true,
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
});

taskSchema.index({ projectId: 1, status: 1 });
taskSchema.index({ projectId: 1, assignee: 1 });
taskSchema.index({ milestoneId: 1 });
taskSchema.index({ createdAt: -1 });

taskSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
