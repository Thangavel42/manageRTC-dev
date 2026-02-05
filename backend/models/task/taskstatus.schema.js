import mongoose from 'mongoose';

/**
 * TaskStatus Schema
 * Defines the structure for task status boards (e.g., "To Do", "In Progress", "Completed")
 */
const taskStatusSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    colorName: {
      type: String,
      required: true,
      trim: true,
    },
    colorHex: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    companyId: {
      type: String,
      required: true,
      index: true,
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
    collection: 'taskstatus', // Explicitly set collection name to match database
  }
);

// Index for efficient queries
taskStatusSchema.index({ companyId: 1, order: 1 });
taskStatusSchema.index({ companyId: 1, active: 1 });

// Register the model
const TaskStatus = mongoose.model('TaskStatus', taskStatusSchema);

export default TaskStatus;
