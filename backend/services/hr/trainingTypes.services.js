import { getTenantCollections } from "../../config/db.js";
import { startOfToday, subDays, startOfMonth, subMonths } from "date-fns";
import { ObjectId } from "mongodb";

const toYMDStr = (input) => {
  const d = new Date(input);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addDaysStr = (ymdStr, days) => {
      const [y, m, d] = ymdStr.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() + days);
      return toYMDStr(dt);
    };


// 1. Stats - total, recent
const getTrainingTypesStats = async (companyId) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    const pipeline = [
      { $facet: { totalTrainingTypes: [{ $count: "count" }] } },
      { $project: { totalTrainingTypes: { $ifNull: [{ $arrayElemAt: ["$totalTrainingTypes.count", 0] }, 0] } } },
    ];
    const [result = { totalTrainingTypes: 0 }] = await collection.trainingtypes.aggregate(pipeline).toArray();
    return { done: true, message: "success", data: { totalTrainingTypes: String(result.totalTrainingTypes || 0) } };
  } catch (error) {
    console.error("Error fetching Training Types stats:", error);
    return { done: false, message: "Error fetching Training Types stats" };
  }
};

// 2. Get TrainingTypess by date filter
const getTrainingTypes = async (companyId, {type,startDate,endDate}={}) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);

    const dateFilter = {};
    const today = toYMDStr(new Date());

    switch (type) {
      case "last7days": {
        const end = new Date();
        const start = new Date();
        start.setUTCDate(end.getUTCDate() - 7);
        dateFilter.created_at = { $gte: start, $lt: end };
        break;
      }
      case "thismonth": {
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        dateFilter.created_at = { $gte: start, $lt: end };
        break;
      }
      case "lastmonth": {
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        dateFilter.created_at = { $gte: start, $lt: end };
        break;
      }
      case "custom": {
        if (startDate && endDate) {
          dateFilter.created_at = { $gte: new Date(startDate), $lt: new Date(endDate) };
        }
        break;
      }
      default:
        break;
    }

    const pipeline = [
      Object.keys(dateFilter).length ? { $match: dateFilter } : { $match: {} },
      { $sort: { created_at: -1, _id: -1 } },
      {
        $project: {
          _id: 0,
          trainingType: 1,
          desc: 1,
          status: 1,
          typeId: 1,
          created_at: 1,
        },
      },
    ];


    const results = await collection.trainingtypes.aggregate(pipeline).toArray();

    return {
      done: true,
      message: "success",
      data: results,
      count: results.length,
    };
  } catch (error) {
    console.error("Error fetching Training Types:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 3. Get a specific TrainingTypes record
const getSpecificTrainingTypes = async (companyId, typeId) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    const record = await collection.trainingtypes.findOne(
      { typeId: typeId },
      {
        projection: {
          _id: 0,
          trainingType: 1,
          desc: 1,
          status: 1,
          typeId: 1,
        },
      }
    );
    if (!record) throw new Error("training types record not found");
    return { done: true, message: "success", data: record };
  } catch (error) {
    console.error("Error fetching training types record:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 4. Add a TrainingTypes (single-arg signature: form)
const addTrainingTypes = async (companyId, form) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    // basic validation
    const required = ["trainingType", "desc", "status"];
    for (const k of required) {
      if (!form[k]) throw new Error(`Missing field: ${k}`);
    }


    const newType = {
      trainingType: form.trainingType,
      desc: form.desc,
      status: form.status,
      typeId: new ObjectId().toHexString(),
      created_by: form.created_by || null,
      created_at: new Date(),
    };
    console.log(newType);

    await collection.trainingtypes.insertOne(newType);
    return { done: true, message: "TrainingTypes added successfully" };
  } catch (error) {
    console.error("Error adding TrainingTypes:", error);
    return { done: false, message: error.message || "Error adding TrainingTypes" };
  }
};

// 5. Update a TrainingTypes
const updateTrainingTypes = async (companyId, form) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    if (!form.typeId) throw new Error("Missing typeId");

    const existing = await collection.trainingtypes.findOne({ typeId: form.typeId });
    if (!existing) throw new Error("TrainingTypes not found");

    const updateData = {
      trainingType: form.trainingType ?? existing.trainingType,
      desc: form.desc ?? existing.desc,
      status: form.status ?? existing.status,
      // keep identifiers and created metadata
      typeId: existing.typeId,
      created_by: existing.created_by,
      created_at: existing.created_at,
    };

    const result = await collection.trainingtypes.updateOne(
      { typeId: form.typeId },
      { $set: updateData }
    );
    if (result.matchedCount === 0) throw new Error("training type not found");
    if (result.modifiedCount === 0) {
      return { done: true, message: "No changes made", data: { ...updateData } };
    }
    return { done: true, message: "training type updated successfully", data: { ...updateData } };
  } catch (error) {
    console.error("Error updating training type:", error);
    return { done: false, message: error.message, data: null };
  }
};

// 6. Delete multiple TrainingTypess
const deleteTrainingTypes = async (companyId, typeIds) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    const result = await collection.trainingtypes.deleteMany({
      typeId: { $in: typeIds },
    });
    return {
      done: true,
      message: `${result.deletedCount} training type(s) deleted successfully`,
      data: null,
    };
  } catch (error) {
    console.error("Error deleting training types:", error);
    return { done: false, message: error.message, data: null };
  }
};

export {
  getTrainingTypesStats,
  getTrainingTypes,
  getSpecificTrainingTypes,
  addTrainingTypes,
  updateTrainingTypes,
  deleteTrainingTypes,
};

