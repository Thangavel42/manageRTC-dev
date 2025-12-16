import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";

const ALLOWED_STATUSES = ["Active", "Inactive", "Draft"];

const parseDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const normalizePerformanceIndicatorInput = (input = {}) => {
  const now = new Date();
  
  return {
    designation: (input.designation || "").trim(),
    department: (input.department || "").trim(),
    approvedBy: (input.approvedBy || "").trim(),
    role: (input.role || "").trim(),
    image: (input.image || "").trim(),
    createdDate: parseDate(input.createdDate) || now,
    status: ALLOWED_STATUSES.includes(input.status) ? input.status : "Active",
    indicators: Array.isArray(input.indicators) ? input.indicators.map(indicator => ({
      name: (indicator.name || "").trim(),
      description: (indicator.description || "").trim(),
      weight: typeof indicator.weight === "number" ? Math.max(0, Math.min(100, indicator.weight)) : 0,
      target: (indicator.target || "").trim()
    })) : [],
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
};

const validateCreate = (performanceIndicator) => {
  if (!performanceIndicator.designation) return "Designation is required";
  if (!performanceIndicator.department) return "Department is required";
  if (!performanceIndicator.approvedBy) return "Approved by is required";
  if (!ALLOWED_STATUSES.includes(performanceIndicator.status)) return "Invalid status";
  
  return null;
};

export const createPerformanceIndicator = async (companyId, data) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[PerformanceIndicatorService] createPerformanceIndicator", { companyId, data });
    const toInsert = normalizePerformanceIndicatorInput(data);
    toInsert.companyId = companyId;

    const validationError = validateCreate(toInsert);
    if (validationError) {
      console.error("[PerformanceIndicatorService] Validation error", { validationError });
      return { done: false, error: validationError };
    }

    const result = await collections.performanceIndicators.insertOne(toInsert);
    if (!result.insertedId) {
      console.error("[PerformanceIndicatorService] Failed to insert performance indicator");
      return { done: false, error: "Failed to create performance indicator" };
    }
    const created = await collections.performanceIndicators.findOne({ _id: result.insertedId });
    return { done: true, data: created };
  } catch (error) {
    console.error("[PerformanceIndicatorService] Error in createPerformanceIndicator", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getAllPerformanceIndicators = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[PerformanceIndicatorService] getAllPerformanceIndicators", { companyId, filters });
    const query = { companyId, isDeleted: { $ne: true } };

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status.filter((s) => ALLOWED_STATUSES.includes(s)) };
      } else if (ALLOWED_STATUSES.includes(filters.status)) {
        query.status = filters.status;
      }
    }

    if (filters.designation) {
      query.designation = { $regex: filters.designation, $options: 'i' };
    }

    if (filters.department) {
      query.department = { $regex: filters.department, $options: 'i' };
    }

    // Date range filters
    const startDate = parseDate(filters.startDate);
    const endDate = parseDate(filters.endDate);
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const sort = { createdAt: -1 };
    const performanceIndicators = await collections.performanceIndicators.find(query).sort(sort).toArray();
    console.log("[PerformanceIndicatorService] found performance indicators", { count: performanceIndicators.length });
    return { done: true, data: performanceIndicators };
  } catch (error) {
    console.error("[PerformanceIndicatorService] Error in getAllPerformanceIndicators", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getPerformanceIndicatorById = async (companyId, id) => {
  try {
    console.log("[PerformanceIndicatorService] getPerformanceIndicatorById", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid performance indicator ID format" };
    const collections = getTenantCollections(companyId);
    const performanceIndicator = await collections.performanceIndicators.findOne({ _id: new ObjectId(id), companyId, isDeleted: { $ne: true } });
    if (!performanceIndicator) return { done: false, error: "Performance indicator not found" };
    return { done: true, data: performanceIndicator };
  } catch (error) {
    console.error("[PerformanceIndicatorService] Error in getPerformanceIndicatorById", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const updatePerformanceIndicator = async (companyId, id, updates = {}) => {
  try {
    console.log("[PerformanceIndicatorService] updatePerformanceIndicator", { companyId, id, updates });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid performance indicator ID format" };
    const collections = getTenantCollections(companyId);

    // Validate status if present
    if (typeof updates.status !== "undefined" && !ALLOWED_STATUSES.includes(updates.status)) {
      return { done: false, error: "Invalid status" };
    }

    const set = { ...updates };

    // Normalize indicators if present
    if (set.indicators && Array.isArray(set.indicators)) {
      set.indicators = set.indicators.map(indicator => ({
        name: (indicator.name || "").trim(),
        description: (indicator.description || "").trim(),
        weight: typeof indicator.weight === "number" ? Math.max(0, Math.min(100, indicator.weight)) : 0,
        target: (indicator.target || "").trim()
      }));
    }

    // Normalize createdDate if present
    if (set.createdDate) {
      const dt = parseDate(set.createdDate);
      if (!dt) delete set.createdDate; else set.createdDate = dt;
    }

    set.updatedAt = new Date();

    const result = await collections.performanceIndicators.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: set }
    );

    if (result.matchedCount === 0) return { done: false, error: "Performance indicator not found" };
    const updated = await collections.performanceIndicators.findOne({ _id: new ObjectId(id) });
    return { done: true, data: updated };
  } catch (error) {
    console.error("[PerformanceIndicatorService] Error in updatePerformanceIndicator", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const deletePerformanceIndicator = async (companyId, id) => {
  try {
    console.log("[PerformanceIndicatorService] deletePerformanceIndicator", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid performance indicator ID format" };
    const collections = getTenantCollections(companyId);

    const result = await collections.performanceIndicators.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: { status: "Inactive", isDeleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return { done: false, error: "Performance indicator not found" };
    const doc = await collections.performanceIndicators.findOne({ _id: new ObjectId(id) });
    return { done: true, data: doc };
  } catch (error) {
    console.error("[PerformanceIndicatorService] Error in deletePerformanceIndicator", { error: error.message });
    return { done: false, error: error.message };
  }
};