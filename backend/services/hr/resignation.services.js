import { DateTime } from "luxon";
import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";
import { validateEmployeeLifecycle } from "../../utils/employeeLifecycleValidator.js";

const normalizeStatus = (status) => {
  if (!status) return "Active";
  const normalized = status.toLowerCase();
  return normalized === "inactive" ? "Inactive" : "Active";
};


const parseDateInput = (input) => {
  if (!input) return null;
  if (input instanceof Date) {
    return DateTime.fromJSDate(input, { zone: "utc" });
  }

  if (typeof input === "string") {
    const trimmed = input.trim();
    const ddmmyyyy = DateTime.fromFormat(trimmed, "dd-MM-yyyy", { zone: "utc" });
    if (ddmmyyyy.isValid) return ddmmyyyy;

    const iso = DateTime.fromISO(trimmed, { zone: "utc" });
    if (iso.isValid) return iso;

    const fallback = new Date(trimmed);
    if (!Number.isNaN(fallback.getTime())) {
      return DateTime.fromJSDate(fallback, { zone: "utc" });
    }
  }

  return null;
};

const toYMDStr = (input) => {
  const dt = parseDateInput(input);
  if (!dt || !dt.isValid) return null;
  return dt.toUTC().toFormat("yyyy-MM-dd");
};

const addDaysStr = (ymdStr, days) => {
      const [y, m, d] = ymdStr.split("-").map(Number);
      const dt = new Date(Date.UTC(y, m - 1, d));
      dt.setUTCDate(dt.getUTCDate() + days);
      return toYMDStr(dt);
    };

const cancelPendingPromotionsForResignation = async (collections, employeeId, actor) => {
  const update = {
    status: "cancelled",
    updatedAt: new Date(),
    notes: "Auto-cancelled due to resignation request"
  };

  if (actor && (actor.userId || actor.userName)) {
    update.updatedBy = {
      userId: actor.userId || "",
      userName: actor.userName || ""
    };
  }

  const result = await collections.promotions.updateMany(
    {
      employeeId: employeeId.toString(),
      status: "pending",
      isDeleted: { $ne: true }
    },
    { $set: update }
  );

  return result?.modifiedCount || 0;
};

const createNotification = async (collections, payload) => {
  const notification = {
    ...payload,
    createdAt: new Date(),
  };

  await collections.notifications.insertOne(notification);
  return notification;
};

// 1. Stats - total, recent
const getResignationStats = async (companyId) => {
  try {
    const collection = getTenantCollections(companyId);

    const today = toYMDStr(new Date());
    const last30 = addDaysStr(today, -30);
    const tomorrow = addDaysStr(today, 1);

    const [
      totalResignations,
      pending,
      onNotice,
      resigned,
      last30days
    ] = await Promise.all([
      collection.resignation.countDocuments().catch(() => 0),
      collection.resignation.countDocuments({ resignationStatus: "pending" }).catch(() => 0),
      collection.resignation.countDocuments({ resignationStatus: { $in: ["on_notice", "approved"] } }).catch(() => 0),
      collection.resignation.countDocuments({ resignationStatus: "resigned" }).catch(() => 0),
      collection.resignation.countDocuments({ noticeDate: { $gte: last30, $lt: tomorrow } }).catch(() => 0)
    ]);

    return {
      done: true,
      message: "success",
      data: {
        totalResignations: String(totalResignations || 0),
        recentResignations: String(last30days || 0),
        pending: Number(pending || 0),
        onNotice: Number(onNotice || 0),
        resigned: Number(resigned || 0),
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

      {
        $addFields: {
          reportingManagerObjId: {
            $cond: {
              if: {
                $and: [
                  { $eq: [{ $type: "$reportingManagerId" }, "string"] },
                  {
                    $regexMatch: {
                      input: "$reportingManagerId",
                      regex: "^[0-9a-fA-F]{24}$",
                    },
                  },
                ],
              },
              then: { $toObjectId: "$reportingManagerId" },
              else: null,
            },
          },
        },
      },

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

      // Lookup reporting manager (if provided)
      {
        $lookup: {
          from: "employees",
          let: { rmId: "$reportingManagerObjId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$rmId"] } } },
            { $project: { _id: 1, firstName: 1, lastName: 1, employeeId: 1 } },
          ],
          as: "reportingManagerData",
        },
      },
      { $unwind: { path: "$reportingManagerData", preserveNullAndEmptyArrays: true } },

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

          reportingManagerId: {
            $cond: {
              if: { $ne: ["$reportingManagerData._id", null] },
              then: { $toString: "$reportingManagerData._id" },
              else: "$reportingManagerId",
            },
          },
          reportingManagerName: {
            $cond: {
              if: { $ne: ["$reportingManagerData.firstName", null] },
              then: {
                $concat: [
                  "$reportingManagerData.firstName",
                  " ",
                  { $ifNull: ["$reportingManagerData.lastName", ""] },
                ],
              },
              else: "$reportingManagerName",
            },
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
          reportingManagerId: 1,
          reportingManagerName: 1,
          resignationStatus: 1,
          status: 1,
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
const addResignation = async (companyId, form, actor) => {
  try {
    const collection = getTenantCollections(companyId);

    // Validate required fields (ONLY employeeId and resignation-specific data)
    const required = [
      "employeeId",
      "departmentId",
      "reportingManagerId",
      "reason",
      "resignationDate",
      "noticeDate"
    ];
    for (const k of required) {
      if (!form[k]) throw new Error(`Missing field: ${k}`);
    }

    if (!form.reason || !String(form.reason).trim()) {
      throw new Error("Reason is required");
    }

    if (String(form.reason).trim().length > 500) {
      throw new Error("Reason cannot exceed 500 characters");
    }

    const resignationDateYmd = toYMDStr(form.resignationDate);
    const noticeDateYmd = toYMDStr(form.noticeDate);

    if (!resignationDateYmd) {
      throw new Error("Invalid resignation date format");
    }

    if (!noticeDateYmd) {
      throw new Error("Invalid notice date format");
    }

    const resignationDate = DateTime.fromFormat(resignationDateYmd, "yyyy-MM-dd", { zone: "utc" });
    const noticeDate = DateTime.fromFormat(noticeDateYmd, "yyyy-MM-dd", { zone: "utc" });

    if (resignationDate < noticeDate) {
      throw new Error("Resignation date must be on or after notice date");
    }

    const today = DateTime.utc().startOf("day");
    if (resignationDate < today) {
      throw new Error("Resignation date cannot be before today");
    }

    // Validate that employeeId is a valid ObjectId string
    if (!ObjectId.isValid(form.employeeId)) {
      throw new Error("Invalid employee ID format");
    }

    if (!ObjectId.isValid(form.departmentId)) {
      throw new Error("Invalid department ID format");
    }

    if (!ObjectId.isValid(form.reportingManagerId)) {
      throw new Error("Invalid reporting manager ID format");
    }

    if (actor?.role?.toLowerCase() === "employee") {
      const currentEmployee = await collection.employees.findOne({
        isDeleted: { $ne: true },
        $or: [
          { clerkUserId: actor.userId },
          { "account.userId": actor.userId }
        ]
      });

      if (!currentEmployee) {
        throw new Error("Employee profile not found for current user");
      }

      if (currentEmployee._id.toString() !== form.employeeId) {
        throw new Error("Employees can only submit their own resignation");
      }
    }

    // Verify employee exists
    const employee = await collection.employees.findOne({
      _id: new ObjectId(form.employeeId),
      isDeleted: { $ne: true }
    });

    if (!employee) {
      throw new Error("Employee not found");
    }

    const employeeDepartmentId = employee.departmentId?.toString?.() || String(employee.departmentId || "");
    if (!employeeDepartmentId || employeeDepartmentId !== form.departmentId) {
      throw new Error("Employee does not belong to selected department");
    }

    if (form.reportingManagerId === form.employeeId) {
      throw new Error("Reporting manager cannot be the same as the resigning employee");
    }

    const reportingManager = await collection.employees.findOne({
      _id: new ObjectId(form.reportingManagerId),
      isDeleted: { $ne: true },
      status: "Active"
    });

    if (!reportingManager) {
      throw new Error("Reporting manager not found");
    }

    const cancelledPromotions = await cancelPendingPromotionsForResignation(
      collection,
      form.employeeId,
      form.created_by
    );

    if (cancelledPromotions > 0) {
      console.log(
        `[Resignation Service] Cancelled ${cancelledPromotions} pending promotion(s) for employee ${form.employeeId}`
      );
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

    // Create normalized resignation record (ONLY employeeId + resignation data)
    const newResignation = {
      companyId: companyId,
      employeeId: form.employeeId, // Store as ObjectId string
      departmentId: form.departmentId,
      reportingManagerId: form.reportingManagerId,
      reportingManagerName: `${reportingManager.firstName || ""} ${reportingManager.lastName || ""}`.trim(),
      resignationDate: resignationDateYmd,
      noticeDate: noticeDateYmd,
      reason: String(form.reason).trim(),
      status: "pending",
      resignationStatus: "pending", // Workflow status: pending, on_notice, rejected, resigned
      effectiveDate: resignationDateYmd,
      approvedBy: null,
      approvedAt: null,
      resignationId: new ObjectId().toHexString(),
      created_by: form.created_by || null,
      created_at: new Date(),
    };

    console.log("[Resignation Service] Creating normalized resignation:", newResignation);

    await collection.resignation.insertOne(newResignation);

    const employeeName = `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || employee.employeeId;
    const notifications = [];

    notifications.push(await createNotification(collection, {
      title: "Resignation Submitted",
      message: `${employeeName} submitted a resignation request.`,
      type: "resignation_submitted",
      createdBy: new ObjectId(form.employeeId),
      targetEmployeeId: form.reportingManagerId,
      targetRoles: ["manager"],
      metadata: { resignationId: newResignation.resignationId }
    }));

    notifications.push(await createNotification(collection, {
      title: "Resignation Submitted",
      message: `${employeeName} submitted a resignation request.`,
      type: "resignation_submitted",
      createdBy: new ObjectId(form.employeeId),
      targetRoles: ["hr", "admin", "superadmin"],
      metadata: { resignationId: newResignation.resignationId }
    }));

    // Note: Employee status is NOT automatically updated to "Resigned"
    // Status should be manually updated by HR when resignation is approved/processed

    return { done: true, message: "Resignation added successfully", data: newResignation, notifications };
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

    if (existing.resignationStatus && existing.resignationStatus !== "pending") {
      throw new Error("Resignation cannot be updated after approval");
    }

    if (form.reason && String(form.reason).trim().length > 500) {
      throw new Error("Reason cannot exceed 500 characters");
    }

    const nextNoticeDate = form.noticeDate ? toYMDStr(form.noticeDate) : existing.noticeDate;
    const nextResignationDate = form.resignationDate ? toYMDStr(form.resignationDate) : existing.resignationDate;

    if (form.noticeDate && !nextNoticeDate) {
      throw new Error("Invalid notice date format");
    }

    if (form.resignationDate && !nextResignationDate) {
      throw new Error("Invalid resignation date format");
    }

    if (nextNoticeDate && nextResignationDate) {
      const noticeDate = DateTime.fromFormat(nextNoticeDate, "yyyy-MM-dd", { zone: "utc" });
      const resignationDate = DateTime.fromFormat(nextResignationDate, "yyyy-MM-dd", { zone: "utc" });

      if (resignationDate < noticeDate) {
        throw new Error("Resignation date must be on or after notice date");
      }

      const today = DateTime.utc().startOf("day");
      if (resignationDate < today) {
        throw new Error("Resignation date cannot be before today");
      }
    }

    // Build update data (ONLY resignation-specific fields)
    const updateData = {
      resignationDate: nextResignationDate,
      noticeDate: nextNoticeDate,
      reason: form.reason ? String(form.reason).trim() : existing.reason,
      status: form.status ?? existing.status,
    };

    if (form.reportingManagerId) {
      if (!ObjectId.isValid(form.reportingManagerId)) {
        throw new Error("Invalid reporting manager ID format");
      }
      if (form.reportingManagerId === existing.employeeId) {
        throw new Error("Reporting manager cannot be the same as the resigning employee");
      }

      const reportingManager = await collection.employees.findOne({
        _id: new ObjectId(form.reportingManagerId),
        isDeleted: { $ne: true },
        status: "Active"
      });
      if (!reportingManager) {
        throw new Error("Reporting manager not found");
      }

      updateData.reportingManagerId = form.reportingManagerId;
      updateData.reportingManagerName = `${reportingManager.firstName || ""} ${reportingManager.lastName || ""}`.trim();
    }

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

    const nonPending = resignationsToDelete.filter(r => r.resignationStatus && r.resignationStatus !== "pending");
    if (nonPending.length > 0) {
      return {
        done: false,
        message: "Only pending resignations can be deleted",
        data: null,
      };
    }

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
const approveResignation = async (companyId, resignationId, actor) => {
  try {
    const collection = getTenantCollections(companyId);

    // Get resignation details
    const resignation = await collection.resignation.findOne({ resignationId });
    if (!resignation) {
      return { done: false, message: "Resignation not found" };
    }

    if (resignation.resignationStatus && resignation.resignationStatus !== "pending") {
      return { done: false, message: "Only pending resignations can be approved" };
    }

    if (actor?.role?.toLowerCase() === "manager") {
      const manager = await collection.employees.findOne({
        isDeleted: { $ne: true },
        $or: [
          { clerkUserId: actor.userId },
          { "account.userId": actor.userId }
        ]
      });

      if (!manager) {
        return { done: false, message: "Reporting manager profile not found" };
      }

      if (resignation.reportingManagerId) {
        if (manager._id.toString() !== resignation.reportingManagerId) {
          return { done: false, message: "Only the assigned reporting manager can approve" };
        }
      } else {
        const employee = await collection.employees.findOne({ _id: new ObjectId(resignation.employeeId) });
        if (!employee?.reportingTo || employee.reportingTo.toString() !== manager._id.toString()) {
          return { done: false, message: "Only the assigned reporting manager can approve" };
        }
      }
    }

    // Update resignation status to approved
    await collection.resignation.updateOne(
      { resignationId },
      {
        $set: {
          resignationStatus: "on_notice",
          status: "on_notice",
          approvedBy: actor?.userId || null,
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

    const updated = await collection.resignation.findOne({ resignationId });
    const employee = await collection.employees.findOne({ _id: new ObjectId(resignation.employeeId) });
    const employeeName = employee
      ? `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || employee.employeeId
      : "Employee";

    const notifications = [];
    notifications.push(await createNotification(collection, {
      title: "Resignation Approved",
      message: `Your resignation has been approved.`,
      type: "resignation_approved",
      createdBy: employee?._id || new ObjectId(resignation.employeeId),
      targetEmployeeId: resignation.employeeId,
      metadata: { resignationId: resignation.resignationId || resignationId }
    }));

    notifications.push(await createNotification(collection, {
      title: "Resignation Approved",
      message: `${employeeName}'s resignation has been approved.`,
      type: "resignation_approved",
      createdBy: employee?._id || new ObjectId(resignation.employeeId),
      targetRoles: ["hr", "admin", "superadmin"],
      metadata: { resignationId: resignation.resignationId || resignationId }
    }));

    return { done: true, message: "Resignation approved successfully", data: updated, notifications };
  } catch (error) {
    console.error("Error approving resignation:", error);
    return { done: false, message: error.message || "Error approving resignation" };
  }
};

// 10. Reject Resignation
const rejectResignation = async (companyId, resignationId, actor, reason) => {
  try {
    const collection = getTenantCollections(companyId);

    // Get resignation details
    const resignation = await collection.resignation.findOne({ resignationId });
    if (!resignation) {
      return { done: false, message: "Resignation not found" };
    }

    if (resignation.resignationStatus && resignation.resignationStatus !== "pending") {
      return { done: false, message: "Only pending resignations can be rejected" };
    }

    if (actor?.role?.toLowerCase() === "manager") {
      const manager = await collection.employees.findOne({
        isDeleted: { $ne: true },
        $or: [
          { clerkUserId: actor.userId },
          { "account.userId": actor.userId }
        ]
      });

      if (!manager) {
        return { done: false, message: "Reporting manager profile not found" };
      }

      if (resignation.reportingManagerId) {
        if (manager._id.toString() !== resignation.reportingManagerId) {
          return { done: false, message: "Only the assigned reporting manager can reject" };
        }
      } else {
        const employee = await collection.employees.findOne({ _id: new ObjectId(resignation.employeeId) });
        if (!employee?.reportingTo || employee.reportingTo.toString() !== manager._id.toString()) {
          return { done: false, message: "Only the assigned reporting manager can reject" };
        }
      }
    }

    // Update resignation status to rejected
    await collection.resignation.updateOne(
      { resignationId },
      {
        $set: {
          resignationStatus: "rejected",
          status: "rejected",
          rejectedBy: actor?.userId || null,
          rejectedAt: new Date(),
          rejectionReason: reason || "Not specified"
        }
      }
    );

    console.log(`[Resignation Service] Rejected resignation ${resignationId}`);

    const updated = await collection.resignation.findOne({ resignationId });
    const employee = await collection.employees.findOne({ _id: new ObjectId(resignation.employeeId) });
    const notifications = [];

    notifications.push(await createNotification(collection, {
      title: "Resignation Rejected",
      message: reason ? `Your resignation was rejected: ${reason}` : "Your resignation was rejected.",
      type: "resignation_rejected",
      createdBy: employee?._id || new ObjectId(resignation.employeeId),
      targetEmployeeId: resignation.employeeId,
      metadata: { resignationId: resignation.resignationId || resignationId }
    }));

    return { done: true, message: "Resignation rejected successfully", data: updated, notifications };
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

    if (!resignation.resignationStatus || !["on_notice", "approved"].includes(resignation.resignationStatus)) {
      return { done: false, message: "Only on-notice resignations can be processed" };
    }

    const effectiveDate = DateTime.fromFormat(resignation.resignationDate, "yyyy-MM-dd", { zone: "utc" });
    if (!effectiveDate.isValid) {
      return { done: false, message: "Invalid resignation date" };
    }

    const today = DateTime.utc().startOf("day");
    if (effectiveDate > today) {
      return { done: false, message: "Resignation date has not been reached yet" };
    }

    // Update employee status to "Resigned"
    await collection.employees.updateOne(
      { _id: new ObjectId(resignation.employeeId) },
      {
        $set: {
          status: "Resigned",
          lastWorkingDate: effectiveDate.toJSDate()
        }
      }
    );

    // Update resignation status to processed
    await collection.resignation.updateOne(
      { resignationId },
      { $set: { processedAt: new Date(), resignationStatus: "resigned", status: "resigned" } }
    );

    console.log(`[Resignation Service] Processed resignation ${resignationId}, employee status updated to 'Resigned'`);

    return { done: true, message: "Resignation processed successfully" };
  } catch (error) {
    console.error("Error processing resignation:", error);
    return { done: false, message: error.message || "Error processing resignation" };
  }
};

// 12. Process all due resignations for a company (used by scheduler)
const processDueResignations = async (companyId) => {
  try {
    const collection = getTenantCollections(companyId);
    const todayYmd = toYMDStr(new Date());

    const dueResignations = await collection.resignation
      .find({ resignationStatus: { $in: ["on_notice", "approved"] }, resignationDate: { $lte: todayYmd } })
      .toArray();

    let processed = 0;

    for (const resignation of dueResignations) {
      await collection.employees.updateOne(
        { _id: new ObjectId(resignation.employeeId) },
        {
          $set: {
            status: "Resigned",
            lastWorkingDate: new Date(resignation.resignationDate)
          }
        }
      );

      await collection.resignation.updateOne(
        { resignationId: resignation.resignationId },
        { $set: { processedAt: new Date(), resignationStatus: "resigned", status: "resigned" } }
      );

      processed += 1;
    }

    return { done: true, processed };
  } catch (error) {
    console.error("Error processing due resignations:", error);
    return { done: false, processed: 0, message: error.message || "Error processing due resignations" };
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
    processDueResignations,
};

