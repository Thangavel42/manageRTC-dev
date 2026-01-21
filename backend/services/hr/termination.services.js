import { getTenantCollections } from "../../config/db.js";
import { startOfToday, subDays, startOfMonth, subMonths } from "date-fns";
import { ObjectId } from "mongodb";
import { validateEmployeeLifecycle } from "../../utils/employeeLifecycleValidator.js";

const normalizeStatus = (status) => {
  if (!status) return "Active";
  const normalized = status.toLowerCase();
  return normalized === "inactive" ? "Inactive" : "Active";
};

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
const getTerminationStats = async (companyId) => {
  try {
    const collection = getTenantCollections(companyId);

    const today = toYMDStr(new Date());
    const last30 = addDaysStr(today, -30);
    const tomorrow = addDaysStr(today, 1);

    const pipeline = [
      {
        $facet: {
          totalTerminations: [{ $count: "count" }],
          last30days: [
            { $match: { noticeDate: { $gte: last30, $lt: tomorrow } } },
            { $count: "count" },
          ],
        },
      },
      {
        $project: {
          totalTerminations: {
            $ifNull: [{ $arrayElemAt: ["$totalTerminations.count", 0] }, 0],
          },
          last30days: {
            $ifNull: [{ $arrayElemAt: ["$last30days.count", 0] }, 0],
          },
        },
      },
    ];

    const [result = { totalTerminations: 0, last30days: 0 }] =
      await collection.termination.aggregate(pipeline).toArray();
    console.log(result);

    return {
      done: true,
      message: "success",
      data: {
        totalTerminations: String(result.totalTerminations || 0),
        recentTerminations: String(result.last30days || 0),
      },
    };
  } catch (error) {
    console.error("Error fetching termination stats:", error);
    return { done: false, message: "Error fetching termination stats" };
  }
};

// 2. Get terminations by date filter
const getTerminations = async (
  companyId,
  { type, startDate, endDate } = {}
) => {
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
        const start = toYMDStr(
          new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        );
        const end = toYMDStr(
          new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
        );
        dateFilter.noticeDate = { $gte: start, $lt: end };
        break;
      }
      case "lastmonth": {
        const now = new Date();
        const start = toYMDStr(
          new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
        );
        const end = toYMDStr(
          new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
        );
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
      
      // Lookup employee data using employeeId (stored as ObjectId)
      {
        $lookup: {
          from: "employees",
          let: { empId: "$employeeId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$empId"] } } },
            {
              $project: {
                _id: 1,
                employeeId: 1,
                firstName: 1,
                lastName: 1,
                avatarUrl: 1,
                departmentId: 1,
                designationId: 1,
              },
            },
          ],
          as: "employeeData",
        },
      },
      { $unwind: { path: "$employeeData", preserveNullAndEmptyArrays: true } },
      
      // Lookup department using employee's departmentId
      {
        $lookup: {
          from: "departments",
          let: { deptId: { $toObjectId: "$employeeData.departmentId" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$deptId"] } } },
            { $project: { _id: 1, name: 1, department: 1 } },
          ],
          as: "departmentData",
        },
      },
      { $unwind: { path: "$departmentData", preserveNullAndEmptyArrays: true } },
      
      // Lookup designation using employee's designationId
      {
        $lookup: {
          from: "designations",
          let: { desigId: { $toObjectId: "$employeeData.designationId" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$desigId"] } } },
            { $project: { _id: 1, name: 1, designation: 1 } },
          ],
          as: "designationData",
        },
      },
      { $unwind: { path: "$designationData", preserveNullAndEmptyArrays: true } },
      
      // Project final structure with null safety
      {
        $project: {
          _id: 0,
          terminationId: 1,
          terminationDate: 1,
          noticeDate: 1,
          reason: 1,
          terminationType: 1,
          status: 1,
          created_at: 1,
          
          // Workflow status fields
          lastWorkingDate: 1,
          processedBy: 1,
          processedAt: 1,
          
          // Employee data (resolved)
          employeeId: {
            $cond: {
              if: { $ne: ["$employeeData.employeeId", null] },
              then: "$employeeData.employeeId",
              else: null,
            },
          },
          employeeName: {
            $cond: {
              if: { $ne: ["$employeeData.firstName", null] },
              then: {
                $concat: [
                  "$employeeData.firstName",
                  " ",
                  { $ifNull: ["$employeeData.lastName", ""] },
                ],
              },
              else: null,
            },
          },
          employee_id: {
            $cond: {
              if: { $ne: ["$employeeData._id", null] },
              then: { $toString: "$employeeData._id" },
              else: null,
            },
          },
          employeeImage: "$employeeData.avatarUrl",
          
          // Department data (resolved)
          department: {
            $cond: {
              if: { $ne: ["$departmentData.department", null] },
              then: "$departmentData.department",
              else: { $ifNull: ["$departmentData.name", null] },
            },
          },
          departmentId: {
            $cond: {
              if: { $ne: ["$departmentData._id", null] },
              then: { $toString: "$departmentData._id" },
              else: null,
            },
          },
          
          // Designation data (resolved)
          designation: {
            $cond: {
              if: { $ne: ["$designationData.designation", null] },
              then: "$designationData.designation",
              else: { $ifNull: ["$designationData.name", null] },
            },
          },
        },
      },
    ];

    const results = await collection.termination.aggregate(pipeline).toArray();

    console.log("retreval Resule : ", results);

    return {
      done: true,
      message: "success",
      data: results,
      count: results.length,
    };
  } catch (error) {
    console.error("Error fetching terminations:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 3. Get a specific termination record with employee details
const getSpecificTermination = async (companyId, terminationId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    // Use aggregation to fetch employee details dynamically
    const pipeline = [
      { $match: { terminationId: terminationId } },
      
      // Lookup employee data
      {
        $lookup: {
          from: "employees",
          let: { empId: "$employeeId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$empId"] } } },
            {
              $project: {
                _id: 1,
                employeeId: 1,
                firstName: 1,
                lastName: 1,
                avatarUrl: 1,
                departmentId: 1,
              },
            },
          ],
          as: "employeeData",
        },
      },
      { $unwind: { path: "$employeeData", preserveNullAndEmptyArrays: true } },
      
      // Lookup department
      {
        $lookup: {
          from: "departments",
          let: { deptId: { $toObjectId: "$employeeData.departmentId" } },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$deptId"] } } },
            { $project: { _id: 1, name: 1, department: 1 } },
          ],
          as: "departmentData",
        },
      },
      { $unwind: { path: "$departmentData", preserveNullAndEmptyArrays: true } },
      
      // Project final structure
      {
        $project: {
          _id: 0,
          terminationId: 1,
          terminationDate: 1,
          noticeDate: 1,
          reason: 1,
          terminationType: 1,
          status: 1,
          
          // Resolved employee data
          employeeId: {
            $cond: {
              if: { $ne: ["$employeeData.employeeId", null] },
              then: "$employeeData.employeeId",
              else: null,
            },
          },
          employeeName: {
            $cond: {
              if: { $ne: ["$employeeData.firstName", null] },
              then: {
                $concat: [
                  "$employeeData.firstName",
                  " ",
                  { $ifNull: ["$employeeData.lastName", ""] },
                ],
              },
              else: null,
            },
          },
          employee_id: {
            $cond: {
              if: { $ne: ["$employeeData._id", null] },
              then: { $toString: "$employeeData._id" },
              else: null,
            },
          },
          employeeImage: "$employeeData.avatarUrl",
          
          // Resolved department data
          department: {
            $cond: {
              if: { $ne: ["$departmentData.department", null] },
              then: "$departmentData.department",
              else: { $ifNull: ["$departmentData.name", null] },
            },
          },
          departmentId: {
            $cond: {
              if: { $ne: ["$departmentData._id", null] },
              then: { $toString: "$departmentData._id" },
              else: null,
            },
          },
        },
      },
    ];
    
    const records = await collection.termination.aggregate(pipeline).toArray();
    if (!records || records.length === 0) {
      throw new Error("Termination record not found");
    }
    
    return { done: true, message: "success", data: records[0] };
  } catch (error) {
    console.error("Error fetching termination record:", error);
    return { done: false, message: error.message, data: null };
  }
};

// 4. Add a termination (single-arg signature: form)
const addTermination = async (companyId, form, useriD) => {
  try {
    const collection = getTenantCollections(companyId);
    // basic validation
    // Validate required fields - employee data will be fetched via aggregation
    const required = [
      "employeeId",
      "reason",
      "terminationDate",
      "terminationType",
      "noticeDate",
    ];
    for (const k of required) {
      if (!form[k]) throw new Error(`Missing field: ${k}`);
    }
    
    // Validate employeeId is valid ObjectId
    if (!ObjectId.isValid(form.employeeId)) {
      throw new Error("Invalid employeeId");
    }
    
    // Check if employee is in any active lifecycle process (promotion/resignation/termination)
    const lifecycleValidation = await validateEmployeeLifecycle(
      companyId,
      form.employeeId,
      'termination',
      null
    );
    
    if (!lifecycleValidation.isValid) {
      return {
        done: false,
        message: lifecycleValidation.message,
        errors: {
          employeeId: lifecycleValidation.message
        }
      };
    }

    // Store only termination-specific data and employee reference
    // Employee details (name, department, avatar) fetched via aggregation
    const newTermination = {
      employeeId: new ObjectId(form.employeeId), // Store as ObjectId reference
      reason: form.reason,
      terminationDate: toYMDStr(form.terminationDate),
      terminationType: form.terminationType,
      noticeDate: toYMDStr(form.noticeDate),
      status: "pending", // Workflow status: pending, processed, cancelled
      lastWorkingDate: toYMDStr(form.terminationDate),
      processedBy: null,
      processedAt: null,
      terminationId: new ObjectId().toHexString(),
      created_by: useriD,
      created_at: new Date(),
    };
    console.log(newTermination);

    await collection.termination.insertOne(newTermination);
    
    // Update employee status to "On Notice" when termination is added
    if (form.employeeId && ObjectId.isValid(form.employeeId)) {
      await collection.employees.updateOne(
        { _id: new ObjectId(form.employeeId) },
        { 
          $set: { 
            status: "On Notice",
            noticeDate: toYMDStr(form.noticeDate),
            lastWorkingDate: toYMDStr(form.terminationDate)
          } 
        }
      );
      console.log(`[Termination Service] Added termination, employee status updated to 'On Notice'`);
    }
    
    return { done: true, message: "Termination added successfully" };
  } catch (error) {
    console.error("Error adding termination:", error);
    return {
      done: false,
      message: error.message || "Error adding termination",
    };
  }
};

// 5. Update a termination
const updateTermination = async (companyId, form) => {
  try {
    const collection = getTenantCollections(companyId);
    if (!form.terminationId) throw new Error("Missing terminationId");

    const existing = await collection.termination.findOne({
      terminationId: form.terminationId,
    });
    if (!existing) throw new Error("Termination not found");

    // Update only termination-specific fields
    // Employee data is fetched dynamically via aggregation
    const updateData = {
      reason: form.reason ?? existing.reason,
      terminationDate: form.terminationDate
        ? toYMDStr(form.terminationDate)
        : existing.terminationDate,
      terminationType: form.terminationType ?? existing.terminationType,
      noticeDate: form.noticeDate
        ? toYMDStr(form.noticeDate)
        : existing.noticeDate,
      // keep identifiers and created metadata
      terminationId: existing.terminationId,
      created_by: existing.created_by,
      created_at: existing.created_at,
    };

    const result = await collection.termination.updateOne(
      { terminationId: form.terminationId },
      { $set: updateData }
    );
    if (result.matchedCount === 0) throw new Error("Termination not found");
    if (result.modifiedCount === 0) {
      return {
        done: true,
        message: "No changes made",
        data: { ...updateData },
      };
    }
    return {
      done: true,
      message: "Termination updated successfully",
      data: { ...updateData },
    };
  } catch (error) {
    console.error("Error updating termination:", error);
    return { done: false, message: error.message, data: null };
  }
};

// 6. Delete multiple terminations
const deleteTermination = async (companyId, terminationIds) => {
  try {
    const collection = getTenantCollections(companyId);
    
    // Get termination records before deleting to update employee statuses
    const terminationsToDelete = await collection.termination
      .find({ terminationId: { $in: terminationIds } })
      .toArray();
    
    // Extract employee IDs from terminations
    const employeeIds = terminationsToDelete
      .map(t => t.employeeId)
      .filter(id => id); // Filter out any null/undefined
    
    // Update employee statuses to "Active" and clear lifecycle fields for all affected employees
    if (employeeIds.length > 0) {
      const employeeUpdateResult = await collection.employees.updateMany(
        { _id: { $in: employeeIds } },
        { 
          $set: { 
            status: "Active",
            updatedAt: new Date()
          },
          $unset: {
            noticeDate: "",
            lastWorkingDate: ""
          }
        }
      );
      console.log(`[Termination Service] Updated ${employeeUpdateResult.modifiedCount} employee(s) to 'Active' and cleared lifecycle fields`);
    }
    
    // Now delete the termination records
    const result = await collection.termination.deleteMany({
      terminationId: { $in: terminationIds },
    });
    
    console.log(`[Termination Service] Deleted ${result.deletedCount} termination(s) and reverted employee status`);
    
    return {
      done: true,
      message: `${result.deletedCount} termination(s) deleted successfully`,
      data: null,
    };
  } catch (error) {
    console.error("Error deleting terminations:", error);
    return { done: false, message: error.message, data: null };
  }
};

// 7. Process Termination (mark as complete and update employee status)
const processTermination = async (companyId, terminationId, userId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    // Get termination details
    const termination = await collection.termination.findOne({ terminationId });
    if (!termination) {
      return { done: false, message: "Termination not found" };
    }
    
    if (termination.status === "processed") {
      return { done: false, message: "Termination already processed" };
    }
    
    if (termination.status === "cancelled") {
      return { done: false, message: "Cannot process a cancelled termination" };
    }
    
    // Update termination status to processed
    await collection.termination.updateOne(
      { terminationId },
      { 
        $set: { 
          status: "processed",
          processedBy: userId,
          processedAt: new Date()
        } 
      }
    );
    
    // Update employee status to "Terminated" using the stored employeeId (ObjectId)
    if (termination.employeeId) {
      await collection.employees.updateOne(
        { _id: termination.employeeId },
        { 
          $set: { 
            status: "Terminated",
            lastWorkingDate: new Date(termination.lastWorkingDate)
          } 
        }
      );
      
      console.log(`[Termination Service] Processed termination ${terminationId}, employee status updated to 'Terminated'`);
    } else {
      console.warn(`[Termination Service] Employee ID not found for termination ${terminationId}`);
    }
    
    return { done: true, message: "Termination processed successfully" };
  } catch (error) {
    console.error("Error processing termination:", error);
    return { done: false, message: error.message || "Error processing termination" };
  }
};

// 8. Cancel Termination
const cancelTermination = async (companyId, terminationId, userId, reason) => {
  try {
    const collection = getTenantCollections(companyId);
    
    // Get termination details
    const termination = await collection.termination.findOne({ terminationId });
    if (!termination) {
      return { done: false, message: "Termination not found" };
    }
    
    if (termination.status === "cancelled") {
      return { done: false, message: "Termination already cancelled" };
    }
    
    if (termination.status === "processed") {
      return { done: false, message: "Cannot cancel a processed termination" };
    }
    
    // Update termination status to cancelled
    await collection.termination.updateOne(
      { terminationId },
      { 
        $set: { 
          status: "cancelled",
          cancelledBy: userId,
          cancelledAt: new Date(),
          cancellationReason: reason || "Not specified"
        } 
      }
    );
    
    // Revert employee status back to "Active" when termination is cancelled
    if (termination.employeeId) {
      await collection.employees.updateOne(
        { _id: termination.employeeId },
        { 
          $set: { 
            status: "Active"
          },
          $unset: {
            noticeDate: "",
            lastWorkingDate: ""
          }
        }
      );
      console.log(`[Termination Service] Cancelled termination ${terminationId}, employee status reverted to 'Active'`);
    }
    
    console.log(`[Termination Service] Cancelled termination ${terminationId}`);
    
    return { done: true, message: "Termination cancelled successfully" };
  } catch (error) {
    console.error("Error cancelling termination:", error);
    return { done: false, message: error.message || "Error cancelling termination" };
  }
};

export {
  getTerminationStats,
  getTerminations,
  getSpecificTermination,
  addTermination,
  updateTermination,
  deleteTermination,
  processTermination,
  cancelTermination,
};
