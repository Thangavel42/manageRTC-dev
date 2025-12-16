import mongoose from 'mongoose';

const invoiceSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    default: () => `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  clientId: {
    type: String,
    ref: 'Client'
  },
  projectId: {
    type: String,
    ref: 'Project'
  },
  amount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid', 'Pending', 'Draft', 'Overdue'],
    default: 'Unpaid'
  },
  dueDate: {
    type: String, 
  },
  companyId: {
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


invoiceSchema.index({ companyId: 1, projectId: 1 });
invoiceSchema.index({ companyId: 1, clientId: 1 });
invoiceSchema.index({ companyId: 1, status: 1 });
invoiceSchema.index({ companyId: 1, createdAt: -1 });
invoiceSchema.index({ companyId: 1, dueDate: 1 });


invoiceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
