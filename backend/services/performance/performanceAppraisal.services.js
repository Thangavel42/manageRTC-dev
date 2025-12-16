import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";

const ALLOWED_STATUSES = ["Draft", "In Progress", "Completed", "Cancelled"];

const parseDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const normalizePerformanceAppraisalInput = (input = {}) => {
  const now = new Date();
  
  return {
    employeeId: (input.employeeId || "").trim(),
    name: (input.name || "").trim(),
    designation: (input.designation || "").trim(),
    department: (input.department || "").trim(),
    image: (input.image || "").trim(),
    appraisalDate: parseDate(input.appraisalDate) || now,
    appraisalPeriod: {
      startDate: parseDate(input.appraisalPeriod?.startDate) || now,
      endDate: parseDate(input.appraisalPeriod?.endDate) || now
    },
    status: ALLOWED_STATUSES.includes(input.status) ? input.status : "Draft",
    reviewer: {
      name: (input.reviewer?.name || "").trim(),
      designation: (input.reviewer?.designation || "").trim(),
      department: (input.reviewer?.department || "").trim()
    },
    scores: {
      overall: typeof input.scores?.overall === "number" ? Math.max(0, Math.min(100, input.scores.overall)) : 0,
      professional: typeof input.scores?.professional === "number" ? Math.max(0, Math.min(100, input.scores.professional)) : 0,
      personal: typeof input.scores?.personal === "number" ? Math.max(0, Math.min(100, input.scores.personal)) : 0
    },
    comments: {
      employee: (input.comments?.employee || "").trim(),
      reviewer: (input.comments?.reviewer || "").trim(),
      hr: (input.comments?.hr || "").trim()
    },
    goals: {
      achieved: Array.isArray(input.goals?.achieved) ? input.goals.achieved.map(goal => ({
        goal: (goal.goal || "").trim(),
        description: (goal.description || "").trim()
      })) : [],
      future: Array.isArray(input.goals?.future) ? input.goals.future.map(goal => ({
        goal: (goal.goal || "").trim(),
        description: (goal.description || "").trim()
      })) : []
    },
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
};

const validateCreate = (performanceAppraisal) => {
  if (!performanceAppraisal.employeeId) return "Employee ID is required";
  if (!performanceAppraisal.name) return "Employee name is required";
  if (!performanceAppraisal.designation) return "Designation is required";
  if (!performanceAppraisal.department) return "Department is required";
  if (!performanceAppraisal.appraisalDate) return "Appraisal date is required";
  if (!ALLOWED_STATUSES.includes(performanceAppraisal.status)) return "Invalid status";
  
  return null;
};

export const createPerformanceAppraisal = async (companyId, data) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[PerformanceAppraisalService] createPerformanceAppraisal", { companyId, data });
    const toInsert = normalizePerformanceAppraisalInput(data);
    toInsert.companyId = companyId;

    const validationError = validateCreate(toInsert);
    if (validationError) {
      console.error("[PerformanceAppraisalService] Validation error", { validationError });
      return { done: false, error: validationError };
    }

    const result = await collections.performanceAppraisals.insertOne(toInsert);
    if (!result.insertedId) {
      console.error("[PerformanceAppraisalService] Failed to insert performance appraisal");
      return { done: false, error: "Failed to create performance appraisal" };
    }
    const created = await collections.performanceAppraisals.findOne({ _id: result.insertedId });
    return { done: true, data: created };
  } catch (error) {
    console.error("[PerformanceAppraisalService] Error in createPerformanceAppraisal", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getAllPerformanceAppraisals = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[PerformanceAppraisalService] getAllPerformanceAppraisals", { companyId, filters });
    const query = { companyId, isDeleted: { $ne: true } };

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status.filter((s) => ALLOWED_STATUSES.includes(s)) };
      } else if (ALLOWED_STATUSES.includes(filters.status)) {
        query.status = filters.status;
      }
    }

    if (filters.employeeId) {
      query.employeeId = filters.employeeId;
    }

    if (filters.department) {
      query.department = { $regex: filters.department, $options: 'i' };
    }

    if (filters.designation) {
      query.designation = { $regex: filters.designation, $options: 'i' };
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
    const performanceAppraisals = await collections.performanceAppraisals.find(query).sort(sort).toArray();
    console.log("[PerformanceAppraisalService] found performance appraisals", { count: performanceAppraisals.length });
    return { done: true, data: performanceAppraisals };
  } catch (error) {
    console.error("[PerformanceAppraisalService] Error in getAllPerformanceAppraisals", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getPerformanceAppraisalById = async (companyId, id) => {
  try {
    console.log("[PerformanceAppraisalService] getPerformanceAppraisalById", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid performance appraisal ID format" };
    const collections = getTenantCollections(companyId);
    const performanceAppraisal = await collections.performanceAppraisals.findOne({ _id: new ObjectId(id), companyId, isDeleted: { $ne: true } });
    if (!performanceAppraisal) return { done: false, error: "Performance appraisal not found" };
    return { done: true, data: performanceAppraisal };
  } catch (error) {
    console.error("[PerformanceAppraisalService] Error in getPerformanceAppraisalById", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const updatePerformanceAppraisal = async (companyId, id, updates = {}) => {
  try {
    console.log("[PerformanceAppraisalService] updatePerformanceAppraisal", { companyId, id, updates });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid performance appraisal ID format" };
    const collections = getTenantCollections(companyId);

    // Validate status if present
    if (typeof updates.status !== "undefined" && !ALLOWED_STATUSES.includes(updates.status)) {
      return { done: false, error: "Invalid status" };
    }

    const set = { ...updates };

    // Normalize dates
    ["appraisalDate"].forEach((k) => {
      if (set[k]) {
        const dt = parseDate(set[k]);
        if (!dt) delete set[k]; else set[k] = dt;
      }
    });

    // Normalize appraisalPeriod
    if (set.appraisalPeriod) {
      if (set.appraisalPeriod.startDate) {
        const dt = parseDate(set.appraisalPeriod.startDate);
        if (dt) set.appraisalPeriod.startDate = dt;
      }
      if (set.appraisalPeriod.endDate) {
        const dt = parseDate(set.appraisalPeriod.endDate);
        if (dt) set.appraisalPeriod.endDate = dt;
      }
    }

    set.updatedAt = new Date();

    const result = await collections.performanceAppraisals.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: set }
    );

    if (result.matchedCount === 0) return { done: false, error: "Performance appraisal not found" };
    const updated = await collections.performanceAppraisals.findOne({ _id: new ObjectId(id) });
    return { done: true, data: updated };
  } catch (error) {
    console.error("[PerformanceAppraisalService] Error in updatePerformanceAppraisal", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const deletePerformanceAppraisal = async (companyId, id) => {
  try {
    console.log("[PerformanceAppraisalService] deletePerformanceAppraisal", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid performance appraisal ID format" };
    const collections = getTenantCollections(companyId);

    const result = await collections.performanceAppraisals.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: { status: "Cancelled", isDeleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return { done: false, error: "Performance appraisal not found" };
    const doc = await collections.performanceAppraisals.findOne({ _id: new ObjectId(id) });
    return { done: true, data: doc };
  } catch (error) {
    console.error("[PerformanceAppraisalService] Error in deletePerformanceAppraisal", { error: error.message });
    return { done: false, error: error.message };
  }
};