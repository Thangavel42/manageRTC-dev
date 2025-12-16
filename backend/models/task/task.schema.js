import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    default: () => `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  projectId: {
    type: String,
    required: true,
    ref: 'Project'
  },
  companyId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Inprogress', 'Completed', 'Onhold'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  assignee: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true
  }],
  startDate: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  estimatedHours: {
    type: Number,
    default: 0
  },
  actualHours: {
    type: Number,
    default: 0
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
});


taskSchema.index({ companyId: 1, projectId: 1, status: 1 });
taskSchema.index({ companyId: 1, assignee: 1 });
taskSchema.index({ createdAt: -1 });


taskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Task = mongoose.model('Task', taskSchema);

export default Task;
