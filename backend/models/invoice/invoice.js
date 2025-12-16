const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true },
    title: { type: String, required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: "Client" },
    amount: { type: Number, required: true },
    status: { type: String, default: "Draft" }, // Paid | Unpaid | Draft | Pending | Overdue
    dueDate: { type: Date },
    invoiceDate: { type: Date },
    referenceNo: { type: String },
    paymentType: { type: String },
    bankDetails: { type: String },
    description: { type: String },
    notes: { type: String },
    items: [
      {
        description: String,
        qty: Number,
        rate: Number,
        discount: Number,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", InvoiceSchema);
