import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  createdAt: { type: Date, default: Date.now },
  attachments: [{ type: String }],
  isInternal: { type: Boolean, default: false }
});

const attachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  url: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  uploadedAt: { type: Date, default: Date.now }
});

const ticketSchema = new mongoose.Schema({
  ticketId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    required: true
  },
  subCategory: {
    type: String,
    required: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  status: {
    type: String,
    required: true,
    enum: ['Open', 'Assigned', 'In Progress', 'On Hold', 'Resolved', 'Closed', 'Reopened'],
    default: 'Open'
  },
  // assignedTo - Employee ObjectId reference only
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  assignedAt: { type: Date },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },

  // createdBy - Employee ObjectId reference only
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  dueDate: { type: Date },
  // Status history for milestone tracking
  statusHistory: [{
    status: { type: String, required: true },
    changedAt: { type: Date, required: true },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    note: String
  }],
  closedAt: { type: Date },
  comments: [commentSchema],
  attachments: [attachmentSchema],
  tags: [{ type: String }],
  estimatedHours: { type: Number, default: 0 },
  actualHours: { type: Number, default: 0 },
  resolution: { type: String },
  isPrivate: { type: Boolean, default: false },
  department: { type: String, default: 'IT Support' },
  location: { type: String, default: 'Office' },
  urgency: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  slaDeadline: { type: Date }
}, {
  timestamps: true
});

// Indexes for better performance
ticketSchema.index({ ticketId: 1 }, { unique: true });
ticketSchema.index({ status: 1 });
ticketSchema.index({ priority: 1 });
ticketSchema.index({ category: 1 });
ticketSchema.index({ subCategory: 1 });
ticketSchema.index({ assignedTo: 1 });
ticketSchema.index({ createdBy: 1 });
ticketSchema.index({ createdAt: -1 });
ticketSchema.index({ status: 1, createdBy: 1 }); // For user ticket filtering
ticketSchema.index({ status: 1, assignedTo: 1 }); // For assigned ticket filtering

export default mongoose.model('Ticket', ticketSchema);
