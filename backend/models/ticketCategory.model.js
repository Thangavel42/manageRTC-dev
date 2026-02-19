import mongoose from 'mongoose';

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { _id: false });

const ticketCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  subCategories: [subCategorySchema],
  isActive: {
    type: Boolean,
    default: true
  },
  icon: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes
ticketCategorySchema.index({ name: 1 });
ticketCategorySchema.index({ isActive: 1 });

export default mongoose.model('TicketCategory', ticketCategorySchema);
