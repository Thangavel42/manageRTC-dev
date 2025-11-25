import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  author: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: { type: String, default: 'assets/img/profiles/avatar-01.jpg' }
  },
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
  subject: { type: String, default: '' },
  description: { type: String, required: true },
  category: { 
    type: String, 
    required: true,
    enum: ['IT Support', 'Hardware Issues', 'Software Issues', 'Connectivity', 'Payment Issues', 'Account Issues']
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
    enum: ['New', 'Open', 'In Progress', 'On Hold', 'Reopened', 'Solved', 'Resolved', 'Closed'],
    default: 'New'
  },
  assignedTo: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: { type: String, default: 'assets/img/profiles/avatar-01.jpg' },
    email: { type: String, required: true },
    role: { type: String, default: 'IT Support Specialist' }
  },
  createdBy: {
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    avatar: { type: String, default: 'assets/img/profiles/avatar-01.jpg' },
    email: { type: String, required: true },
    department: { type: String, default: 'General' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  dueDate: { type: Date },
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
ticketSchema.index({ 'assignedTo._id': 1 });
ticketSchema.index({ 'createdBy._id': 1 });
ticketSchema.index({ createdAt: -1 });

export default mongoose.model('Ticket', ticketSchema);
