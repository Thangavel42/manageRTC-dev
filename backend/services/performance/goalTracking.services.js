import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";

const ALLOWED_STATUSES = ["Active", "Completed", "Cancelled", "On Hold"];

const parseDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const normalizeGoalTrackingInput = (input = {}) => {
  const now = new Date();
  
  return {
    goalType: (input.goalType || "").trim(),
    subject: (input.subject || "").trim(),
    targetAchievement: (input.targetAchievement || "").trim(),
    startDate: parseDate(input.startDate),
    endDate: parseDate(input.endDate),
    description: (input.description || "").trim(),
    status: ALLOWED_STATUSES.includes(input.status) ? input.status : "Active",
    progress: (input.progress || "").trim(),
    progressPercentage: typeof input.progressPercentage === "number" ? Math.max(0, Math.min(100, input.progressPercentage)) : 0,
    assignedTo: (input.assignedTo || "").trim(),
    assignedBy: (input.assignedBy || "").trim(),
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
};

const validateCreate = (goalTracking) => {
  if (!goalTracking.goalType) return "Goal type is required";
  if (!goalTracking.subject) return "Subject is required";
  if (!goalTracking.startDate) return "Start date is required";
  if (!goalTracking.endDate) return "End date is required";
  if (!ALLOWED_STATUSES.includes(goalTracking.status)) return "Invalid status";
  
  // Date validation
  if (goalTracking.startDate && goalTracking.endDate && goalTracking.endDate < goalTracking.startDate) {
    return "End date must be after start date";
  }
  
  return null;
};

export const createGoalTracking = async (companyId, data) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[GoalTrackingService] createGoalTracking", { companyId, data });
    const toInsert = normalizeGoalTrackingInput(data);
    toInsert.companyId = companyId;

    const validationError = validateCreate(toInsert);
    if (validationError) {
      console.error("[GoalTrackingService] Validation error", { validationError });
      return { done: false, error: validationError };
    }

    const result = await collections.goalTrackings.insertOne(toInsert);
    if (!result.insertedId) {
      console.error("[GoalTrackingService] Failed to insert goal tracking");
      return { done: false, error: "Failed to create goal tracking" };
    }
    const created = await collections.goalTrackings.findOne({ _id: result.insertedId });
    return { done: true, data: created };
  } catch (error) {
    console.error("[GoalTrackingService] Error in createGoalTracking", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getAllGoalTrackings = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[GoalTrackingService] getAllGoalTrackings", { companyId, filters });
    const query = { companyId, isDeleted: { $ne: true } };

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query.status = { $in: filters.status.filter((s) => ALLOWED_STATUSES.includes(s)) };
      } else if (ALLOWED_STATUSES.includes(filters.status)) {
        query.status = filters.status;
      }
    }

    if (filters.goalType) {
      query.goalType = { $regex: filters.goalType, $options: 'i' };
    }

    if (filters.assignedTo) {
      query.assignedTo = { $regex: filters.assignedTo, $options: 'i' };
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
    const goalTrackings = await collections.goalTrackings.find(query).sort(sort).toArray();
    console.log("[GoalTrackingService] found goal trackings", { count: goalTrackings.length });
    return { done: true, data: goalTrackings };
  } catch (error) {
    console.error("[GoalTrackingService] Error in getAllGoalTrackings", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getGoalTrackingById = async (companyId, id) => {
  try {
    console.log("[GoalTrackingService] getGoalTrackingById", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid goal tracking ID format" };
    const collections = getTenantCollections(companyId);
    const goalTracking = await collections.goalTrackings.findOne({ _id: new ObjectId(id), companyId, isDeleted: { $ne: true } });
    if (!goalTracking) return { done: false, error: "Goal tracking not found" };
    return { done: true, data: goalTracking };
  } catch (error) {
    console.error("[GoalTrackingService] Error in getGoalTrackingById", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const updateGoalTracking = async (companyId, id, updates = {}) => {
  try {
    console.log("[GoalTrackingService] updateGoalTracking", { companyId, id, updates });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid goal tracking ID format" };
    const collections = getTenantCollections(companyId);

    // Validate status if present
    if (typeof updates.status !== "undefined" && !ALLOWED_STATUSES.includes(updates.status)) {
      return { done: false, error: "Invalid status" };
    }

    const set = { ...updates };

    // Normalize dates
    ["startDate", "endDate"].forEach((k) => {
      if (set[k]) {
        const dt = parseDate(set[k]);
        if (!dt) delete set[k]; else set[k] = dt;
      }
    });

    // Date validation
    if (set.startDate && set.endDate && set.endDate < set.startDate) {
      return { done: false, error: "End date must be after start date" };
    }

    set.updatedAt = new Date();

    const result = await collections.goalTrackings.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: set }
    );

    if (result.matchedCount === 0) return { done: false, error: "Goal tracking not found" };
    const updated = await collections.goalTrackings.findOne({ _id: new ObjectId(id) });
    return { done: true, data: updated };
  } catch (error) {
    console.error("[GoalTrackingService] Error in updateGoalTracking", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const deleteGoalTracking = async (companyId, id) => {
  try {
    console.log("[GoalTrackingService] deleteGoalTracking", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid goal tracking ID format" };
    const collections = getTenantCollections(companyId);

    const result = await collections.goalTrackings.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: { status: "Cancelled", isDeleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return { done: false, error: "Goal tracking not found" };
    const doc = await collections.goalTrackings.findOne({ _id: new ObjectId(id) });
    return { done: true, data: doc };
  } catch (error) {
    console.error("[GoalTrackingService] Error in deleteGoalTracking", { error: error.message });
    return { done: false, error: error.message };
  }
};
