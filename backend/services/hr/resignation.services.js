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
      
      // Filter: Only process resignations with valid ObjectId format (24 hex chars)
      // This excludes old records with employeeId like "EMP-8984"
      {
        $match: {
          $expr: {
            $and: [
              { $eq: [{ $type: "$employeeId" }, "string"] },
              { $eq: [{ $strLenCP: "$employeeId" }, 24] },
              {
                $regexMatch: {
                  input: "$employeeId",
                  regex: "^[0-9a-fA-F]{24}$",
                },
              },
            ],
          },
        },
      },
      
      { $sort: { noticeDate: -1, _id: -1 } },
      
      // Lookup employee data using employeeId (stored as ObjectId string)
      {
        $lookup: {
          from: "employees",
          let: { empId: { $toObjectId: "$employeeId" } },
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
          resignationId: 1,
          resignationDate: 1,
          noticeDate: 1,
          reason: 1,
          status: 1,
          created_at: 1,
          
          // Workflow status fields
          resignationStatus: 1,
          effectiveDate: 1,
          approvedBy: 1,
          approvedAt: 1,
          rejectedBy: 1,
          rejectedAt: 1,
          rejectionReason: 1,
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
            $ifNull: ["$departmentData.name", "$departmentData.department"],
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
            $ifNull: ["$designationData.name", "$designationData.designation"],
          },
        },
      },
      
      // Filter out resignations with unresolved employee references
      {
        $match: {
          employee_id: { $ne: null },
          employeeId: { $ne: null },
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
          departmentId: 1,
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
const addResignation = async (companyId, form) => {
  try {
    const collection = getTenantCollections(companyId);
    
    // Validate required fields (ONLY employeeId and resignation-specific data)
    const required = ["employeeId", "reason", "resignationDate", "noticeDate"];
    for (const k of required) {
      if (!form[k]) throw new Error(`Missing field: ${k}`);
    }
    
    // Validate that employeeId is a valid ObjectId string
    if (!ObjectId.isValid(form.employeeId)) {
      throw new Error("Invalid employee ID format");
    }
    
    // Check if employee is in any active lifecycle process (promotion/resignation/termination)
    const lifecycleValidation = await validateEmployeeLifecycle(
      companyId,
      form.employeeId,
      'resignation',
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
    
    // Verify employee exists
    const employee = await collection.employees.findOne({
      _id: new ObjectId(form.employeeId),
    });
    
    if (!employee) {
      throw new Error("Employee not found");
    }
    
    // Create normalized resignation record (ONLY employeeId + resignation data)
    const newResignation = {
      companyId: companyId,
      employeeId: form.employeeId, // Store as ObjectId string
      resignationDate: toYMDStr(form.resignationDate),
      noticeDate: toYMDStr(form.noticeDate),
      reason: form.reason,
      status: "pending",
      resignationStatus: "pending", // Workflow status: pending, approved, rejected, withdrawn
      effectiveDate: toYMDStr(form.noticeDate), // Last working day
      approvedBy: null,
      approvedAt: null,
      resignationId: new ObjectId().toHexString(),
      created_by: form.created_by || null,
      created_at: new Date(),
    };
    
    console.log("[Resignation Service] Creating normalized resignation:", newResignation);
    
    await collection.resignation.insertOne(newResignation);
    
    // Note: Employee status is NOT automatically updated to "Resigned"
    // Status should be manually updated by HR when resignation is approved/processed
    
    return { done: true, message: "Resignation added successfully" };
  } catch (error) {
    console.error("Error adding Resignation:", error);
    return { done: false, message: error.message || "Error adding Resignation" };
  }
};

// 5. Update a Resignation
const updateResignation = async (companyId, form) => {
  try {
    const collection = getTenantCollections(companyId);
    
    if (!form.resignationId) throw new Error("Missing resignationId");
    
    const existing = await collection.resignation.findOne({ resignationId: form.resignationId });
    if (!existing) throw new Error("Resignation not found");
    
    // Build update data (ONLY resignation-specific fields)
    const updateData = {
      resignationDate: form.resignationDate ? toYMDStr(form.resignationDate) : existing.resignationDate,
      noticeDate: form.noticeDate ? toYMDStr(form.noticeDate) : existing.noticeDate,
      reason: form.reason ?? existing.reason,
      status: form.status ?? existing.status,
    };
    
    // If employeeId is being changed, validate it
    if (form.employeeId && form.employeeId !== existing.employeeId) {
      if (!ObjectId.isValid(form.employeeId)) {
        throw new Error("Invalid employee ID format");
      }
      
      const employee = await collection.employees.findOne({
        _id: new ObjectId(form.employeeId),
      });
      
      if (!employee) {
        throw new Error("Employee not found");
      }
      
      updateData.employeeId = form.employeeId;
    }
    
    console.log("[Resignation Service] Updating resignation with:", updateData);
    
    const result = await collection.resignation.updateOne(
      { resignationId: form.resignationId },
      { $set: updateData }
    );
    
    if (result.matchedCount === 0) throw new Error("Resignation not found");
    if (result.modifiedCount === 0) {
      return { done: true, message: "No changes made" };
    }
    
    return { done: true, message: "Resignation updated successfully" };
  } catch (error) {
    console.error("Error updating resignation:", error);
    return { done: false, message: error.message };
  }
};

// 6. Delete multiple resignations
const deleteResignation = async (companyId,resignationIds) => {
  try {
    const collection = getTenantCollections(companyId);
    
    // Get resignation records before deleting to update employee statuses
    const resignationsToDelete = await collection.resignation
      .find({ resignationId: { $in: resignationIds } })
      .toArray();
    
    // Extract employee IDs from resignations and convert to ObjectId
    const employeeIds = resignationsToDelete
      .map(r => r.employeeId)
      .filter(id => id) // Filter out any null/undefined
      .map(id => typeof id === 'string' ? new ObjectId(id) : id); // Convert string IDs to ObjectId
    
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
      console.log(`[Resignation Service] Updated ${employeeUpdateResult.modifiedCount} employee(s) to 'Active' and cleared lifecycle fields`);
    }
    
    // Now delete the resignation records
    const result = await collection.resignation.deleteMany({
      resignationId: { $in: resignationIds },
    });
    
    console.log(`[Resignation Service] Deleted ${result.deletedCount} resignation(s) and reverted employee status`);
    
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

// Get all departments
const getDepartments = async (companyId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    const results = await collection.departments
      .find({})
      .project({ _id: 1, department: 1 })
      .toArray();

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

// Get employees by department
const getEmployeesByDepartment = async (companyId, departmentId) => {
  try {
    if (!departmentId) {
      return { done: false, message: "Department ID is required", data: [] };
    }

    console.log("getEmployeesByDepartment - received departmentId:", departmentId, "type:", typeof departmentId);

    const collection = getTenantCollections(companyId);
    // Query employees by department ObjectId (employees store department as ObjectId reference)
    const query = {
      status: { $regex: "^Active$", $options: "i" },
      departmentId: departmentId,
    };
    console.log("MongoDB query to run in console:");
    console.log(`db.employees.find(${JSON.stringify(query, null, 2)})`);
    
    const results = await collection.employees
      .find(query)
      .project({ 
        _id: 1, 
        firstName: 1, 
        lastName: 1, 
        employeeId: 1, 
        employeeName: 1,
        department: 1, 
        departmentId: 1 
      })
      .sort({ firstName: 1, lastName: 1 })
      .toArray();

    console.log("getEmployeesByDepartment - found employees count:", results.length);
    console.log("Employees found:", results.map(emp => `${emp.employeeId} - ${emp.firstName}`).join(", "));
    
    if (results.length === 0) {
      console.log("getEmployeesByDepartment - NO EMPLOYEES FOUND for departmentId:", departmentId);
      // Debug: check what departments employees have
      const departmentCounts = await collection.employees
        .aggregate([
          { $match: { status: { $regex: "^Active$", $options: "i" } } },
          { $group: { _id: "$department", count: { $sum: 1 } } },
        ])
        .toArray();
      console.log("Active employees department distribution:", departmentCounts);
    }

    return {
      done: true,
      message: "success",
      data: results.map(emp => ({
        _id: emp._id,
        employeeId: emp.employeeId,
        employeeName: emp.employeeName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        firstName: emp.firstName,
        lastName: emp.lastName,
        department: emp.department,
        departmentId: emp.departmentId
      })),
      count: results.length,
    };
  } catch (error) {
    console.error("Error fetching employees by department:", error);
    return { done: false, message: error.message, data: [] };
  }
};

// 9. Approve Resignation
const approveResignation = async (companyId, resignationId, userId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    // Get resignation details
    const resignation = await collection.resignation.findOne({ resignationId });
    if (!resignation) {
      return { done: false, message: "Resignation not found" };
    }
    
    if (resignation.resignationStatus === "approved") {
      return { done: false, message: "Resignation already approved" };
    }
    
    // Update resignation status to approved
    await collection.resignation.updateOne(
      { resignationId },
      { 
        $set: { 
          resignationStatus: "approved",
          approvedBy: userId,
          approvedAt: new Date()
        } 
      }
    );
    
    // Update employee status to "On Notice"
    await collection.employees.updateOne(
      { _id: new ObjectId(resignation.employeeId) },
      { $set: { status: "On Notice" } }
    );
    
    console.log(`[Resignation Service] Approved resignation ${resignationId}, employee status updated to 'On Notice'`);
    
    return { done: true, message: "Resignation approved successfully" };
  } catch (error) {
    console.error("Error approving resignation:", error);
    return { done: false, message: error.message || "Error approving resignation" };
  }
};

// 10. Reject Resignation
const rejectResignation = async (companyId, resignationId, userId, reason) => {
  try {
    const collection = getTenantCollections(companyId);
    
    // Get resignation details
    const resignation = await collection.resignation.findOne({ resignationId });
    if (!resignation) {
      return { done: false, message: "Resignation not found" };
    }
    
    if (resignation.resignationStatus === "rejected") {
      return { done: false, message: "Resignation already rejected" };
    }
    
    // Update resignation status to rejected
    await collection.resignation.updateOne(
      { resignationId },
      { 
        $set: { 
          resignationStatus: "rejected",
          rejectedBy: userId,
          rejectedAt: new Date(),
          rejectionReason: reason || "Not specified"
        } 
      }
    );
    
    console.log(`[Resignation Service] Rejected resignation ${resignationId}`);
    
    return { done: true, message: "Resignation rejected successfully" };
  } catch (error) {
    console.error("Error rejecting resignation:", error);
    return { done: false, message: error.message || "Error rejecting resignation" };
  }
};

// 11. Process Resignation Effective Date (called manually or via cron)
const processResignationEffectiveDate = async (companyId, resignationId) => {
  try {
    const collection = getTenantCollections(companyId);
    
    const resignation = await collection.resignation.findOne({ resignationId });
    if (!resignation) {
      return { done: false, message: "Resignation not found" };
    }
    
    if (resignation.resignationStatus !== "approved") {
      return { done: false, message: "Only approved resignations can be processed" };
    }
    
    const effectiveDate = new Date(resignation.effectiveDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    effectiveDate.setHours(0, 0, 0, 0);
    
    if (effectiveDate > today) {
      return { done: false, message: "Effective date has not been reached yet" };
    }
    
    // Update employee status to "Resigned"
    await collection.employees.updateOne(
      { _id: new ObjectId(resignation.employeeId) },
      { 
        $set: { 
          status: "Resigned",
          lastWorkingDate: effectiveDate
        } 
      }
    );
    
    // Update resignation status to processed
    await collection.resignation.updateOne(
      { resignationId },
      { $set: { processedAt: new Date() } }
    );
    
    console.log(`[Resignation Service] Processed resignation ${resignationId}, employee status updated to 'Resigned'`);
    
    return { done: true, message: "Resignation processed successfully" };
  } catch (error) {
    console.error("Error processing resignation:", error);
    return { done: false, message: error.message || "Error processing resignation" };
  }
};

export {
  getResignationStats,
  getResignations,
  getSpecificResignation,
  addResignation,
  updateResignation,
  deleteResignation,
  getDepartments,
  getEmployeesByDepartment,
  approveResignation,
  rejectResignation,
  processResignationEffectiveDate,
};

