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
const getResignationStats = async (companyId) => {
  try {
    const collection = getTenantCollections(companyId);

    const today = toYMDStr(new Date());
    const last30 = addDaysStr(today, -30);
    const tomorrow = addDaysStr(today, 1);

    const pipeline = [
      {
        $facet: {
          totalResignations: [{ $count: "count" }],
          last30days: [
            { $match: { noticeDate: { $gte: last30, $lt: tomorrow } } },
            { $count: "count" },
          ],
        },
      },
      {
        $project: {
          totalResignations: { $ifNull: [{ $arrayElemAt: ["$totalResignations.count", 0] }, 0] },
          last30days: { $ifNull: [{ $arrayElemAt: ["$last30days.count", 0] }, 0] },
        },
      },
    ];

    

    const [result = { totalResignations: 0, last30days: 0 }] = await collection.resignation.aggregate(pipeline).toArray();
    console.log(result);

    return {
      done: true,
      message: "success",
      data: {
        totalResignations: String(result.totalResignations || 0),
        recentResignations: String(result.last30days || 0),
      },
    };
  } catch (error) {
    console.error("Error fetching Resignation stats:", error);
    return { done: false, message: "Error fetching Resignation stats" };
  }
};

// 2. Get Resignations by date filter
const getResignations = async (companyId,{ type, startDate, endDate } = {}) => {
  try {
    const collection = getTenantCollections(companyId);
    const dateFilter = {};
    const today = toYMDStr(new Date());

    switch (type) {
      case "today": {
        const start = today;
        const end = addDaysStr(today, 1);
        dateFilter.noticeDate = { $gte: start, $lt: end };
        break;
      }
      case "yesterday": {
        const end = today;
        const start = addDaysStr(today, -1);
        dateFilter.noticeDate = { $gte: start, $lt: end };
        break;
      }
      case "last7days": {
        const end = today;
        const start = addDaysStr(end, -7);
        dateFilter.noticeDate = { $gte: start, $lt: end };
        break;
      }
      case "last30days": {
        const end = today;
        const start = addDaysStr(end, -30);
        dateFilter.noticeDate = { $gte: start, $lt: end };
        break;
      }
      case "thismonth": {
        const now = new Date();
        const start = toYMDStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
        const end = toYMDStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));
        dateFilter.noticeDate = { $gte: start, $lt: end };
        break;
      }
      case "lastmonth": {
        const now = new Date();
        const start = toYMDStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)));
        const end = toYMDStr(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
        dateFilter.noticeDate = { $gte: start, $lt: end };
        break;
      }
      case "thisyear": {
        const now = new Date();
        const start = toYMDStr(new Date(Date.UTC(now.getUTCFullYear(), 0, 1)));
        const end = toYMDStr(new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1)));
        dateFilter.noticeDate = { $gte: start, $lt: end };
        break;
      }
      default:
        // no date filter
        break;
    }
    const pipeline = [
      { $match: dateFilter },
      { $sort: { noticeDate: -1, _id: -1 } },
      {
        $project: {
          _id: 0,
          employeeName: 1,
          reason: 1,
          department: 1,
          resignationDate: 1, 
          noticeDate: 1,        // yyyy-mm-dd string
          resignationId: 1,
          created_at: 1,
        },
      },
    ];


    const results = await collection.resignation.aggregate(pipeline).toArray();

    return {
      done: true,
      message: "success",
      data: results,
      count: results.length,
    };
  } catch (error) {
    console.error("Error fetching Resignations:", error);
    return { done: false, message: error.message, data: [] };
  }
};

const getDepartments = async (companyId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    const pipeline = [
      {
        $project: {
          _id: 0,
          department: 1,
        },
      },
    ];


    const results = await collection.departments.aggregate(pipeline).toArray();

    return {
      done: true,
      message: "success",
      data: results,
      count: results.length,
    };
  } catch (error) {
    console.error("Error fetching departments:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 3. Get a specific Resignation record
const getSpecificResignation = async (companyId,resignationId) => {
  try {
    const collection = getTenantCollections(companyId);
    const record = await collection.resignation.findOne(
      { resignationId: resignationId },
      {
        projection: {
          _id: 0,
          employeeName: 1,
          reason: 1,
          department: 1,
          resignationDate: 1,
          noticeDate: 1,
          resignationId: 1,
        },
      }
    );
    if (!record) throw new Error("resignation record not found");
    return { done: true, message: "success", data: record };
  } catch (error) {
    console.error("Error fetching resignation record:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 4. Add a resignation (single-arg signature: form)
const addResignation = async (companyId,form) => {
  try {
    const collection = getTenantCollections(companyId);
    // basic validation
    const required = ["employeeName", "reason", "department", "resignationDate", "noticeDate"];
    for (const k of required) {
      if (!form[k]) throw new Error(`Missing field: ${k}`);
    }


    const newResignation = {
      employeeName: form.employeeName,
      reason: form.reason,
      department: form.department,
      resignationDate: toYMDStr(form.resignationDate), // store as Date
      noticeDate: toYMDStr(form.noticeDate), // store as Date
      resignationId: new ObjectId().toHexString(),
      created_by: form.created_by || null,
      created_at: new Date(),
    };
    console.log(newResignation);

    await collection.resignation.insertOne(newResignation);
    return { done: true, message: "Resignation added successfully" };
  } catch (error) {
    console.error("Error adding Resignation:", error);
    return { done: false, message: error.message || "Error adding Resignation" };
  }
};

// 5. Update a Resignation
const updateResignation = async (companyId,form) => {
  try {
    const collection = getTenantCollections(companyId);
    if (!form.resignationId) throw new Error("Missing resignationId");

    const existing = await collection.resignation.findOne({ resignationId: form.resignationId });
    if (!existing) throw new Error("resignation not found");

    const updateData = {
      employeeName: form.employeeName ?? existing.employeeName,
      reason: form.reason ?? existing.reason,
      department: form.department ?? existing.department,
      resignationDate: form.resignationDate ? toYMDStr(form.resignationDate) : existing.resignationDate,
      noticeDate: form.noticeDate ? toYMDStr(form.noticeDate) : existing.noticeDate,
      // keep identifiers and created metadata
      resignationId: existing.resignationId,
      created_by: existing.created_by,
      created_at: existing.created_at,
    };

    const result = await collection.resignation.updateOne(
      { resignationId: form.resignationId },
      { $set: updateData }
    );
    if (result.matchedCount === 0) throw new Error("resignation not found");
    if (result.modifiedCount === 0) {
      return { done: true, message: "No changes made", data: { ...updateData } };
    }
    return { done: true, message: "resignation updated successfully", data: { ...updateData } };
  } catch (error) {
    console.error("Error updating resignation:", error);
    return { done: false, message: error.message, data: null };
  }
};

// 6. Delete multiple resignations
const deleteResignation = async (companyId,resignationIds) => {
  try {
    const collection = getTenantCollections(companyId);
    const result = await collection.resignation.deleteMany({
      resignationId: { $in: resignationIds },
    });
    return {
      done: true,
      message: `${result.deletedCount} resignation(s) deleted successfully`,
      data: null,
    };
  } catch (error) {
    console.error("Error deleting resignations:", error);
    return { done: false, message: error.message, data: null };
  }
};

export {
  getResignationStats,
  getResignations,
  getDepartments,
  getSpecificResignation,
  addResignation,
  updateResignation,
  deleteResignation,
};

