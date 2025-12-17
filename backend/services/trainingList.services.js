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
const getTrainingListStats = async (companyId) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    const pipeline = [
      { $facet: { totalTrainingList: [{ $count: "count" }] } },
      { $project: { totalTrainingList: { $ifNull: [{ $arrayElemAt: ["$totalTrainingList.count", 0] }, 0] } } },
    ];
    const [result = { totalTrainingList: 0 }] = await collection.trainings.aggregate(pipeline).toArray();
    return { done: true, message: "success", data: { totalTrainingList: String(result.totalTrainingList || 0) } };
  } catch (error) {
    console.error("Error fetching trainingList stats:", error);
    return { done: false, message: "Error fetching trainingList stats" };
  }
};

const getEmployeeDetails = async(companyId) => {
  try {
    const collection = getTenantCollections(companyId);

    const pipeline = [
      {
        $project: {
          _id: 0,
          employeeId: 1,
          firstName: 1,
          lastName: 1,
        },
      },
    ];

    const record = await collection.employees.aggregate(pipeline).toArray();

    if (!record) throw new Error("employees not found");
    return { done: true, message: "success", data: record };
  } catch (error) {
    console.error("Error fetching trainingList record:", error);
    return { done: false, message: error.message, data: [] };
  }
}

// 2. Get TrainingLists by date filter
const getTrainingList = async (companyId, {type,startDate,endDate}={}) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);

    const dateFilter = {};
    const today = toYMDStr(new Date());

    switch (type) {
      case "today": {
        const start = today;
        const end = addDaysStr(today, 1);
        dateFilter.startDate = { $gte: start, $lt: end };
        break;
      }
      case "yesterday": {
        const end = today;
        const start = addDaysStr(today, -1);
        dateFilter.startDate = { $gte: start, $lt: end };
        break;
      }
      case "last7days": {
        const end = today;
        const start = addDaysStr(end, -7);
        dateFilter.startDate = { $gte: start, $lt: end };
        break;
      }
      case "last30days": {
        const end = today;
        const start = addDaysStr(end, -30);
        dateFilter.startDate = { $gte: start, $lt: end };
        break;
      }
      case "thismonth": {
        const now = new Date();
        const start = toYMDStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
        const end = toYMDStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));
        dateFilter.startDate = { $gte: start, $lt: end };
        break;
      }
      case "lastmonth": {
        const now = new Date();
        const start = toYMDStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
        const end = toYMDStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
        dateFilter.startDate = { $gte: start, $lt: end };
        break;
      }
      default:
        // no date filter
        break;
    }
    const pipeline = [
      { $match: dateFilter },
      { $sort: { startDate: -1, _id: -1 } },
      {
        $project: {
          _id: 0,
          trainingType: 1,
          trainer: 1,
          employee: 1,
          startDate: 1,
          endDate: 1,
          timeDuration: 1,
          desc: 1,
          cost: 1,
          status: 1,
          created_at: 1,
          trainingId:1,
        },
      },
    ];


    const results = await collection.trainings.aggregate(pipeline).toArray();

    return {
      done: true,
      message: "success",
      data: results,
      count: results.length,
    };
  } catch (error) {
    console.error("Error fetching trainingList:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 3. Get a specific TrainingList record
const getSpecificTrainingList = async (companyId, trainingId) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    const record = await collection.trainings.findOne(
      { trainingId: trainingId },
      {
        projection: {
          _id: 0,
          trainingType: 1,
          trainer: 1,
          employee: 1,
          startDate: 1,
          endDate: 1,
          timeDuration: 1,
          desc: 1,
          cost: 1,
          status: 1,
          trainingId: 1,
        },
      }
    );
    if (!record) throw new Error("trainingList record not found");
    return { done: true, message: "success", data: record };
  } catch (error) {
    console.error("Error fetching trainingList record:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 4. Add a TrainingList (single-arg signature: form)
const addTrainingList = async (companyId, form) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    // basic validation
    const required = ["trainingType", "trainer", "employee", "startDate", "timeDuration", "desc", "cost", "status"];
    for (const k of required) {
      if (!form[k]) throw new Error(`Missing field: ${k}`);
    }


    const newType = {
      trainingType: form.trainingType,
      trainer: form.trainer,
      employee: form.employee,
      startDate: form.startDate,
      endDate: form.endDate,
      timeDuration: form.timeDuration,
      desc: form.desc,
      cost: form.cost,
      status: form.status,
      trainingId: new ObjectId().toHexString(),
      created_by: form.created_by || null,
      created_at: new Date(),
    };

    console.log(newType);

    await collection.trainings.insertOne(newType);
    return { done: true, message: "TrainingList added successfully" };
  } catch (error) {
    console.error("Error adding TrainingList:", error);
    return { done: false, message: error.message || "Error adding TrainingList" };
  }
};

// 5. Update a TrainingList
const updateTrainingList = async (companyId, form) => {
    console.log(form);
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    if (!form.trainingId) throw new Error("Missing trainingId");

    const existing = await collection.trainings.findOne({ trainingId: form.trainingId });
    if (!existing) throw new Error("TrainingList not found");

    const updateData = {
      trainingType: form.trainingType ?? existing.trainingType,
      trainer: form.trainer ?? existing.trainer,
      employee: form.employee ?? existing.employee,
      startDate: form.startDate ?? existing.startDate,
      endDate: form.endDate ?? existing.endDate,
      timeDuration: form.timeDuration ?? exisiting.timeDuration,
      desc: form.desc ?? existing.desc,
      cost: form.cost ?? existing.cost,
      status: form.status ?? existing.status,
      trainingId: existing.trainingId,
      created_by: existing.created_by,
      created_at: existing.created_at,
    };

    const result = await collection.trainings.updateOne(
      { trainingId: form.trainingId },
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

// 6. Delete multiple TrainingList
const deleteTrainingList = async (companyId, trainingIds) => {
  try {
    if (!companyId) throw new Error("Company ID is required");
    const collection = getTenantCollections(companyId);
    const result = await collection.trainings.deleteMany({
      trainingId: { $in: trainingIds },
    });
    return {
      done: true,
      message: `${result.deletedCount} trainer(s) deleted successfully`,
      data: null,
    };
  } catch (error) {
    console.error("Error deleting TrainingList:", error);
    return { done: false, message: error.message, data: null };
  }
};

export {
  getTrainingListStats,
  getTrainingList,
  getEmployeeDetails,
  getSpecificTrainingList,
  addTrainingList,
  updateTrainingList,
  deleteTrainingList,
};

