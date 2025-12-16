import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";

const buildQueryAndSort = (filters = {}) => {
  const { createdDate, dueDate, status, sortBy, projectId } = filters;

  
  const query = { isDeleted: { $ne: true } };

  
  if (projectId) {
    query.projectId = projectId;
  }

  
  if (createdDate?.from || createdDate?.to) {
    query.createdAt = {};
    if (createdDate.from) query.createdAt.$gte = new Date(createdDate.from);
    if (createdDate.to) query.createdAt.$lte = new Date(createdDate.to);
  }

  
  if (dueDate?.from || dueDate?.to) {
    query.dueDate = {};
    if (dueDate.from) query.dueDate.$gte = dueDate.from; 
    if (dueDate.to) query.dueDate.$lte = dueDate.to;
  }

  
  if (status && status !== "All") {
    query.status = status;
  }

  
  const sort = {};
  switch (sortBy) {
    case "created_asc":  sort.createdAt = 1; break;
    case "created_desc": sort.createdAt = -1; break;
    case "due_asc":      sort.dueDate   = 1; break;
    case "due_desc":     sort.dueDate   = -1; break;
    default:             sort.createdAt = -1; 
  }

  return { query, sort };
};

export const getInvoices = async (companyId, filters = {}) => {
  try {
    const { invoices } = getTenantCollections(companyId);
    const { query, sort } = buildQueryAndSort(filters);
    const docs = await invoices.find(query).sort(sort).toArray();
    return docs.map(d => ({ ...d, _id: d._id.toString() }));
  } catch (error) {
    console.error('Error getting invoices:', error);

    
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Invoices collection does not exist yet, returning empty results');
      return [];
    }

    throw error;
  }
};

export const createInvoice = async (companyId, payload) => {
  const { invoices } = getTenantCollections(companyId);

  const doc = {
    invoiceNumber: payload.invoiceNumber,
    title: payload.title,
    clientId: payload.clientId ? new ObjectId(payload.clientId) : null,
    projectId: payload.projectId ? new ObjectId(payload.projectId) : null,
    amount: Number(payload.amount) || 0,
    status: payload.status || "Unpaid", 
    dueDate: payload.dueDate,           
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
    companyId: new ObjectId(companyId)
  };

  const res = await invoices.insertOne(doc);
  return { ...doc, _id: res.insertedId.toString() };
};

export const updateInvoice = async (companyId, invoiceId, updatedData) => {
  const { invoices } = getTenantCollections(companyId);

  const { _id, companyId: _cid, ...update } = updatedData;
  if (update.clientId) update.clientId = new ObjectId(update.clientId);
  if (update.projectId) update.projectId = new ObjectId(update.projectId);
  if ("amount" in update) update.amount = Number(update.amount);

  update.updatedAt = new Date();

  const res = await invoices.updateOne(
    { _id: new ObjectId(invoiceId), isDeleted: { $ne: true } },
    { $set: update }
  );

  if (!res.matchedCount) throw new Error("Invoice not found");
  return res;
};

export const deleteInvoice = async (companyId, invoiceId) => {
  const { invoices } = getTenantCollections(companyId);
  const res = await invoices.updateOne(
    { _id: new ObjectId(invoiceId), isDeleted: { $ne: true } },
    { $set: { isDeleted: true, updatedAt: new Date() } }
  );
  if (!res.matchedCount) throw new Error("Invoice not found");
  return res;
};

export const getInvoiceStats = async (companyId) => {
  try {
    if (!companyId) throw new Error("companyId is required for stats");

    const { invoices } = getTenantCollections(companyId);

    
    const agg = await invoices.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      {
        $facet: {
          total: [
            {
              $group: {
                _id: null,
                count: { $sum: 1 },
                amount: { $sum: "$amount" }
              }
            }
          ],
          byStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
                amount: { $sum: "$amount" }
              }
            }
          ]
        }
      }
    ]).toArray();

    const totals = agg[0]?.total[0] || { count: 0, amount: 0 };
    const statusGroups = agg[0]?.byStatus || [];

    let outstanding = 0, draft = 0, overdue = 0;

    statusGroups.forEach(s => {
      const status = String(s._id);
      
      if (status === "Unpaid" || status === "Pending") outstanding = s.amount;
      if (status === "Draft") draft = s.amount;
      if (status === "Overdue") overdue = s.amount;
    });

    return {
      totalInvoiceCount: totals.count,   
      totalInvoiceAmount: totals.amount, 
      outstanding,
      draft,
      overdue
    };
  } catch (error) {
    console.error('Error getting invoice stats:', error);

    
    if (error.message && error.message.includes('buffering timed out')) {
      console.log('Invoices collection does not exist yet, returning empty stats');
      return {
        totalInvoiceCount: 0,
        totalInvoiceAmount: 0,
        outstanding: 0,
        draft: 0,
        overdue: 0
      };
    }

    throw error;
  }
};