import { getTenantCollections } from "../../config/db.js";
import { ObjectId } from "mongodb";

const ALLOWED_STATUSES = ["Active", "Inactive"];

const parseDate = (d) => {
  if (!d) return null;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
};

const normalizeGoalTypeInput = (input = {}) => {
  const now = new Date();
  
  return {
    type: (input.type || "").trim(),
    description: (input.description || "").trim(),
    status: ALLOWED_STATUSES.includes(input.status) ? input.status : "Active",
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };
};

const validateCreate = (goalType) => {
  if (!goalType.type) return "Goal type is required";
  if (!ALLOWED_STATUSES.includes(goalType.status)) return "Invalid status";
  
  return null;
};

export const createGoalType = async (companyId, data) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[GoalTypeService] createGoalType", { companyId, data });
    const toInsert = normalizeGoalTypeInput(data);
    toInsert.companyId = companyId;

    const validationError = validateCreate(toInsert);
    if (validationError) {
      console.error("[GoalTypeService] Validation error", { validationError });
      return { done: false, error: validationError };
    }

    const result = await collections.goalTypes.insertOne(toInsert);
    if (!result.insertedId) {
      console.error("[GoalTypeService] Failed to insert goal type");
      return { done: false, error: "Failed to create goal type" };
    }
    const created = await collections.goalTypes.findOne({ _id: result.insertedId });
    return { done: true, data: created };
  } catch (error) {
    console.error("[GoalTypeService] Error in createGoalType", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getAllGoalTypes = async (companyId, filters = {}) => {
  try {
    const collections = getTenantCollections(companyId);
    console.log("[GoalTypeService] getAllGoalTypes", { companyId, filters });
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

    const sort = { createdAt: -1 };
    const goalTypes = await collections.goalTypes.find(query).sort(sort).toArray();
    console.log("[GoalTypeService] found goal types", { count: goalTypes.length });
    return { done: true, data: goalTypes };
  } catch (error) {
    console.error("[GoalTypeService] Error in getAllGoalTypes", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const getGoalTypeById = async (companyId, id) => {
  try {
    console.log("[GoalTypeService] getGoalTypeById", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid goal type ID format" };
    const collections = getTenantCollections(companyId);
    const goalType = await collections.goalTypes.findOne({ _id: new ObjectId(id), companyId, isDeleted: { $ne: true } });
    if (!goalType) return { done: false, error: "Goal type not found" };
    return { done: true, data: goalType };
  } catch (error) {
    console.error("[GoalTypeService] Error in getGoalTypeById", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const updateGoalType = async (companyId, id, updates = {}) => {
  try {
    console.log("[GoalTypeService] updateGoalType", { companyId, id, updates });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid goal type ID format" };
    const collections = getTenantCollections(companyId);

    // Validate status if present
    if (typeof updates.status !== "undefined" && !ALLOWED_STATUSES.includes(updates.status)) {
      return { done: false, error: "Invalid status" };
    }

    const set = { ...updates };
    set.updatedAt = new Date();

    const result = await collections.goalTypes.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: set }
    );

    if (result.matchedCount === 0) return { done: false, error: "Goal type not found" };
    const updated = await collections.goalTypes.findOne({ _id: new ObjectId(id) });
    return { done: true, data: updated };
  } catch (error) {
    console.error("[GoalTypeService] Error in updateGoalType", { error: error.message });
    return { done: false, error: error.message };
  }
};

export const deleteGoalType = async (companyId, id) => {
  try {
    console.log("[GoalTypeService] deleteGoalType", { companyId, id });
    if (!ObjectId.isValid(id)) return { done: false, error: "Invalid goal type ID format" };
    const collections = getTenantCollections(companyId);

    const result = await collections.goalTypes.updateOne(
      { _id: new ObjectId(id), companyId, isDeleted: { $ne: true } },
      { $set: { status: "Inactive", isDeleted: true, deletedAt: new Date(), updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) return { done: false, error: "Goal type not found" };
    const doc = await collections.goalTypes.findOne({ _id: new ObjectId(id) });
    return { done: true, data: doc };
  } catch (error) {
    console.error("[GoalTypeService] Error in deleteGoalType", { error: error.message });
    return { done: false, error: error.message };
  }
};
