import mongoose from 'mongoose';

const projectNoteSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    default: () => `project_note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium'
  },
  tags: [{
    type: String,
    trim: true
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


projectNoteSchema.index({ companyId: 1, projectId: 1 });
projectNoteSchema.index({ companyId: 1, createdBy: 1 });
projectNoteSchema.index({ createdAt: -1 });


projectNoteSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const ProjectNote = mongoose.model('ProjectNote', projectNoteSchema);

export default ProjectNote;
