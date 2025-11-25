import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";

const ALLOWED_STATUSES = ["Open", "Won", "Lost", "deleted"];
const ALLOWED_STAGES = ["New", "Prospect", "Proposal", "Won", "Lost"];

const parseDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const normalizeDealInput = (input = {}) => {
  const now = new Date();
  
  // Handle both old and new field names for backward compatibility
  const dealValue = typeof input.dealValue === "number" ? input.dealValue : 
                   (typeof input.value === "number" ? input.value : 
                   (typeof input.price === "number" ? input.price : 0));

  // Normalize owner - handle both string and object formats
  let owner = input.owner;
  if (typeof owner === "string") {
    owner = { name: owner.trim() };
  } else if (!owner || typeof owner !== "object") {
    owner = { name: "" };
  }

  // Normalize contact - ensure it's an object
  let contact = input.contact;
  if (!contact || typeof contact !== "object") {
    contact = {};
  }

  return {
    name: (input.name || input.dealName || "").trim(),
    initials: (input.initials || "").trim(),
    stage: ALLOWED_STAGES.includes(input.stage) ? input.stage : "New",
    status: ALLOWED_STATUSES.includes(input.status) ? input.status : "Open",
    probability: typeof input.probability === "number" ? Math.max(0, Math.min(100, input.probability)) : 0,
    dealValue,
    address: (input.address || "").trim(),
    contact,
    owner,
    tags: Array.isArray(input.tags) ? input.tags.filter(tag => typeof tag === "string") : [],
    expectedClosedDate: parseDate(input.expectedClosedDate || input.expectedClosingDate),
    
    // Legacy fields for backward compatibility
    pipeline: (input.pipeline || "").trim(),
    currency: (input.currency || "USD").trim(),
    period: (input.period || "").trim(),
    periodValue: typeof input.periodValue === "number" ? input.periodValue : undefined,
    contacts: Array.isArray(input.contacts) ? input.contacts : [],
    projects: Array.isArray(input.projects) ? input.projects : [],
    assignees: Array.isArray(input.assignees) ? input.assignees : [],
    dueDate: parseDate(input.dueDate),
    followupDate: parseDate(input.followupDate),
    source: (input.source || "").trim(),
    priority: input.priority && ["High","Medium","Low"].includes(input.priority) ? input.priority : "Medium",
    isPrivate: Boolean(input.isPrivate),
    description: (input.description || "").toString(),
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
};

const validateCreate = (deal) => {
  // Required fields validation
  if (!deal.name) return "Deal name is required";
  if (!deal.owner || !deal.owner.name) return "Deal owner is required";
  if (typeof deal.dealValue !== "number" || deal.dealValue < 0) return "Deal value must be a number greater than or equal to 0";
  if (typeof deal.probability !== "number" || deal.probability < 0 || deal.probability > 100) return "Probability must be between 0 and 100";
  if (!deal.expectedClosedDate) return "Expected closed date is required";
  if (!ALLOWED_STAGES.includes(deal.stage)) return "Invalid stage";
  if (!ALLOWED_STATUSES.includes(deal.status)) return "Invalid status";
  
  // Date validation
  if (deal.dueDate && deal.expectedClosedDate && deal.expectedClosedDate < deal.dueDate) {
    return "Expected closed date must be after due date";
  }
  
  return null;
};

export const createDeal = async (companyId, data) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[DealService] createDeal", { companyId, data });
    const toInsert = normalizeDealInput(data);
    toInsert.companyId = companyId;

    const validationError = validateCreate(toInsert);
    if (validationError) {
      console.error("[DealService] Validation error", { validationError });
      return { done: false, error: validationError };
    }

    const result = await collections.deals.insertOne(toInsert);
    if (!result.insertedId) {
      console.error("[DealService] Failed to insert deal");
      return { done: false, error: "Failed to create deal" };
    }
    const created = await collections.deals.findOne({ _id: result.insertedId });
    // Ensure dates are Date objects
    const processed = created ? {
      ...created,
      createdAt: created.createdAt ? new Date(created.createdAt) : null,
      updatedAt: created.updatedAt ? new Date(created.updatedAt) : null,
      dueDate: created.dueDate ? new Date(created.dueDate) : null,
      expectedClosedDate: created.expectedClosedDate ? new Date(created.expectedClosedDate) : null,
      followupDate: created.followupDate ? new Date(created.followupDate) : null,
    } : null;
    return { done: true, data: processed };
  } catch (error) {
    console.error("[DealService] Error in createDeal", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getAllDeals = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[DealService] getAllDeals", { companyId, filters });
    const query = { companyId, isDeleted: { $ne: true } };

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status.filter((s) => ALLOWED_STATUSES.includes(s)) };
      } else if (ALLOWED_STATUSES.includes(filters.status)) {
        query.status = filters.status;
      }
    }

    // createdAt range
    const start = parseDate(filters.startDate);
    const end = parseDate(filters.endDate);
    if (start || end) {
      query.createdAt = {};
      if (start) query.createdAt.$gte = start;
      if (end) query.createdAt.$lte = end;
    }

    // dueDate range (optional)
    const dueStart = parseDate(filters.dueStartDate || filters.dueStart);
    const dueEnd = parseDate(filters.dueEndDate || filters.dueEnd);
    if (dueStart || dueEnd) {
      query.dueDate = {};
      if (dueStart) query.dueDate.$gte = dueStart;
      if (dueEnd) query.dueDate.$lte = dueEnd;
    }

    const sort = { createdAt: -1 };
    const deals = await collections.deals.find(query).sort(sort).toArray();
    console.log("[DealService] found deals", { count: deals.length });
    const processedDeals = deals.map((d) => ({
      ...d,
      createdAt: d.createdAt ? new Date(d.createdAt) : null,
      updatedAt: d.updatedAt ? new Date(d.updatedAt) : null,
      dueDate: d.dueDate ? new Date(d.dueDate) : null,
      expectedClosedDate: d.expectedClosedDate ? new Date(d.expectedClosedDate) : null,
      followupDate: d.followupDate ? new Date(d.followupDate) : null,
    }));
    return { done: true, data: processedDeals };
  } catch (error) {
    console.error("[DealService] Error in getAllDeals", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getDealById = async (companyId, id) => {
  try {
    console.log("[DealService] getDealById", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid deal ID format" };
    const collections = getTenantCollections(companyId);
    const deal = await collections.deals.findOne({ _id: new ObjectId(id), companyId, isDeleted: { $ne: true } });
    if (!deal) return { done: false, error: "Deal not found" };
    const processed = {
      ...deal,
      createdAt: deal.createdAt ? new Date(deal.createdAt) : null,
      updatedAt: deal.updatedAt ? new Date(deal.updatedAt) : null,
      dueDate: deal.dueDate ? new Date(deal.dueDate) : null,
      expectedClosedDate: deal.expectedClosedDate ? new Date(deal.expectedClosedDate) : null,
      followupDate: deal.followupDate ? new Date(deal.followupDate) : null,
    };
    return { done: true, data: processed };
  } catch (error) {
    console.error("[DealService] Error in getDealById", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const updateDeal = async (companyId, id, updates = {}) => {
  try {
    console.log("[DealService] updateDeal", { companyId, id, updates });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid deal ID format" };
    const collections = getTenantCollections(companyId);

    // Validate status if present
    if (typeof updates.status !== "undefined" && !ALLOWED_STATUSES.includes(updates.status)) {
      return { done: false, error: "Invalid status" };
    }

    const set = { ...updates };

    // Normalize dealValue - handle both old and new field names
    if (typeof set.price === "number" && typeof set.dealValue !== "number") {
      set.dealValue = set.price;
      delete set.price;
    }
    if (typeof set.value === "number" && typeof set.dealValue !== "number") {
      set.dealValue = set.value;
      delete set.value;
    }
    if (typeof set.dealValue === "number" && set.dealValue < 0) {
      return { done: false, error: "Deal value must be greater than or equal to 0" };
    }

    // Normalize owner - handle both string and object formats
    if (set.owner && typeof set.owner === "string") {
      set.owner = { name: set.owner.trim() };
    }

    // Normalize contact - ensure it's an object
    if (set.contact && typeof set.contact !== "object") {
      set.contact = {};
    }

    // Normalize dates
    ["dueDate", "expectedClosedDate", "followupDate"].forEach((k) => {
      if (set[k]) {
        const dt = parseDate(set[k]);
        if (!dt) delete set[k]; else set[k] = dt;
      }
    });

    // Date logic if both present
    if (set.dueDate && set.expectedClosedDate && set.expectedClosedDate < set.dueDate) {
      return { done: false, error: "Expected closed date must be after due date" };
    }

    set.updatedAt = new Date();

    const result = await collections.deals.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: set }
    );

    if (result.matchedCount === 0) return { done: false, error: "Deal not found" };
    const updated = await collections.deals.findOne({ _id: new ObjectId(id) });
    const processed = updated ? {
      ...updated,
      createdAt: updated.createdAt ? new Date(updated.createdAt) : null,
      updatedAt: updated.updatedAt ? new Date(updated.updatedAt) : null,
      dueDate: updated.dueDate ? new Date(updated.dueDate) : null,
      expectedClosedDate: updated.expectedClosedDate ? new Date(updated.expectedClosedDate) : null,
      followupDate: updated.followupDate ? new Date(updated.followupDate) : null,
    } : null;
    return { done: true, data: processed };
  } catch (error) {
    console.error("[DealService] Error in updateDeal", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const deleteDeal = async (companyId, id) => {
  try {
    console.log("[DealService] deleteDeal", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid deal ID format" };
    const collections = getTenantCollections(companyId);

    const result = await collections.deals.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: { status: "deleted", isDeleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return { done: false, error: "Deal not found" };
    const doc = await collections.deals.findOne({ _id: new ObjectId(id) });
    return { done: true, data: doc };
  } catch (error) {
    console.error("[DealService] Error in deleteDeal", { error: error.message });
    return { done: false, error: error.message };
  }
};


