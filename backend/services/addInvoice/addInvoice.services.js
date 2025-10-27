import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";

// CREATE
export const createAddInvoice = async (companyId, payload) => {
  const { addInvoices } = getTenantCollections(companyId);

  const doc = {
  invoiceNumber: payload.invoiceNumber,
  title: payload.title,
  clientId: payload.clientId ? new ObjectId(payload.clientId) : null,
  clientName: payload.clientName || "",   // ✅ add this
  amount: Number(payload.amount) || 0,
  status: payload.status || "Draft",
  dueDate: payload.dueDate ? new Date(payload.dueDate) : null,  // ✅ ensure Date
  invoiceDate: payload.invoiceDate ? new Date(payload.invoiceDate) : new Date(),
  referenceNo: payload.referenceNo || "",
  paymentType: payload.paymentType || "",
  bankDetails: payload.bankDetails || "",
  description: payload.description || "",
  notes: payload.notes || "",
  items: payload.items || [],
  createdAt: new Date(),
  updatedAt: new Date(),
  isDeleted: false,
  companyId: new ObjectId(companyId)
};


  const res = await addInvoices.insertOne(doc);
  return { ...doc, _id: res.insertedId.toString() };
};

// GET
export const getAddInvoices = async (companyId) => {
  const { addInvoices } = getTenantCollections(companyId);
  const docs = await addInvoices.find({ isDeleted: { $ne: true } }).toArray();
  return docs.map(d => ({ ...d, _id: d._id.toString() }));
};

// UPDATE
export const updateAddInvoice = async (companyId, invoiceId, updatedData) => {
  const { addInvoices } = getTenantCollections(companyId);

  const { _id, companyId: _cid, ...update } = updatedData;
  if (update.clientId) update.clientId = new ObjectId(update.clientId);
  if ("amount" in update) update.amount = Number(update.amount);

  update.updatedAt = new Date();

  const res = await addInvoices.updateOne(
    { _id: new ObjectId(invoiceId), isDeleted: { $ne: true } },
    { $set: update }
  );

  if (!res.matchedCount) throw new Error("AddInvoice not found");
  return res;
};

// DELETE
export const deleteAddInvoice = async (companyId, invoiceId) => {
  const { addInvoices } = getTenantCollections(companyId);
  const res = await addInvoices.updateOne(
    { _id: new ObjectId(invoiceId), isDeleted: { $ne: true } },
    { $set: { isDeleted: true, updatedAt: new Date() } }
  );
  if (!res.matchedCount) throw new Error("AddInvoice not found");
  return res;
};
