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
const getTrainersStats = async (companyId) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    const pipeline = [
      { $facet: { totalTrainers: [{ $count: "count" }] } },
      { $project: { totalTrainers: { $ifNull: [{ $arrayElemAt: ["$totalTrainers.count", 0] }, 0] } } },
    ];
    const [result = { totalTrainers: 0 }] = await collection.trainers.aggregate(pipeline).toArray();
    return { done: true, message: "success", data: { totalTrainers: String(result.totalTrainers || 0) } };
  } catch (error) {
    console.error("Error fetching trainers stats:", error);
    return { done: false, message: "Error fetching trainers stats" };
  }
};

// 2. Get Trainerss by date filter
const getTrainers = async (companyId, {type,startDate,endDate}={}) => {
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
          trainer: 1,
          phone: 1,
          email: 1,
          desc: 1,
          status: 1,
          created_at: 1,
          trainerId:1,
        },
      },
    ];


    const results = await collection.trainers.aggregate(pipeline).toArray();

    return {
      done: true,
      message: "success",
      data: results,
      count: results.length,
    };
  } catch (error) {
    console.error("Error fetching trainers:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 3. Get a specific Trainers record
const getSpecificTrainers = async (companyId, trainerId) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    const record = await collection.trainers.findOne(
      { trainerId: trainerId },
      {
        projection: {
          _id: 0,
          trainer: 1,
          phone: 1,
          email: 1,
          desc: 1,
          status: 1,
          trainerId: 1,
        },
      }
    );
    if (!record) throw new Error("trainers record not found");
    return { done: true, message: "success", data: record };
  } catch (error) {
    console.error("Error fetching trainers record:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 4. Add a Trainers (single-arg signature: form)
const addTrainers = async (companyId, form) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    // basic validation
    const required = ["trainer", "phone", "email", "desc", "status"];
    for (const k of required) {
      if (!form[k]) throw new Error(`Missing field: ${k}`);
    }


    const newType = {
      trainer: form.trainer,
      phone: form.phone,
      email: form.email,
      desc: form.desc,
      status: form.status,
      trainerId: new ObjectId().toHexString(),
      created_by: form.created_by || null,
      created_at: new Date(),
    };

    console.log(newType);

    await collection.trainers.insertOne(newType);
    return { done: true, message: "Trainers added successfully" };
  } catch (error) {
    console.error("Error adding Trainers:", error);
    return { done: false, message: error.message || "Error adding Trainers" };
  }
};

// 5. Update a Trainers
const updateTrainers = async (companyId, form) => {
    console.log(form);
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    if (!form.trainerId) throw new Error("Missing trainerId");

    const existing = await collection.trainers.findOne({ trainerId: form.trainerId });
    if (!existing) throw new Error("Trainers not found");

    const updateData = {
      trainer: form.trainer ?? existing.trainer,
      phone: form.phone ?? existing.phone,
      email: form.email ?? existing.email,
      desc: form.desc ?? existing.desc,
      status: form.status ?? existing.status,
      // keep identifiers and created metadata
      trainerId: existing.trainerId,
      created_by: existing.created_by,
      created_at: existing.created_at,
    };

    const result = await collection.trainers.updateOne(
      { trainerId: form.trainerId },
      { $set: updateData }
    );
    if (result.matchedCount === 0) throw new Error("trainer not found");
    if (result.modifiedCount === 0) {
      return { done: true, message: "No changes made", data: { ...updateData } };
    }
    return { done: true, message: "trainer updated successfully", data: { ...updateData } };
  } catch (error) {
    console.error("Error updating trainer:", error);
    return { done: false, message: error.message, data: null };
  }
};

// 6. Delete multiple Trainers
const deleteTrainers = async (companyId, trainerIds) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    const result = await collection.trainers.deleteMany({
      trainerId: { $in: trainerIds },
    });
    return {
      done: true,
      message: `${result.deletedCount} trainer(s) deleted successfully`,
      data: null,
    };
  } catch (error) {
    console.error("Error deleting trainers:", error);
    return { done: false, message: error.message, data: null };
  }
};

export {
  getTrainersStats,
  getTrainers,
  getSpecificTrainers,
  addTrainers,
  updateTrainers,
  deleteTrainers,
};

