import { ObjectId } from "mongodb";
import { client, getTenantCollections } from "../../config/db.js";
import { AppError, buildValidationError } from "../../middleware/errorHandler.js";
import cacheManager from "../../utils/cacheManager.js";
import logger from "../../utils/logger.js";

const normalizeStatus = (status) => {
  if (!status) return "Active";
  const normalized = status.toLowerCase();
  if (normalized === "active") return "Active";
  if (normalized === "inactive") return "Inactive";
  if (normalized === "on notice") return "On Notice";
  if (normalized === "resigned") return "Resigned";
  if (normalized === "terminated") return "Terminated";
  if (normalized === "on leave") return "On Leave";
  return "Active";
};

const buildDependentRecordsError = (details) => {
  const err = new AppError(
    "Dependent records exist. Reassignment is required before deletion.",
    409,
    "DEPENDENT_RECORDS"
  );
  err.details = [{ requiresReassign: true, ...details }];
  return err;
};

const countDepartmentDependencies = async (collections, sourceId, sourceIdStr) => {
  const [employees, designations, policies, promotions] = await Promise.all([
    collections.employees.countDocuments({ departmentId: sourceIdStr }),
    collections.designations.countDocuments({ departmentId: sourceId }),
    collections.policy.countDocuments({
      "assignTo.departmentId": sourceId,
      applyToAll: false,
    }),
    collections.promotions.countDocuments({
      $or: [
        { "promotionTo.departmentId": sourceIdStr },
        { "promotionFrom.departmentId": sourceIdStr },
      ],
    }),
  ]);

  return { employees, designations, policies, promotions };
};

export const allDepartments = async (companyId, hrId) => {
  try {
    if (!companyId) {
      return {
        done: false,
        error: "All fields are required including file upload",
      };
    }

    // Try to get from cache first
    const cacheKey = `departments:active:${companyId}`;
    const cachedDepartments = cacheManager.get(cacheKey);
    if (cachedDepartments) {
      logger.debug('[allDepartments] Cache hit', { companyId });
      return {
        done: true,
        data: cachedDepartments,
        message: "Departments fetched successfully (cached)",
      };
    }

    const collections = getTenantCollections(companyId);
    // const hrExists = await collections.hr.countDocuments({ userId: hrId });
    // if (!hrExists) return { done: false, error: "HR not found" };

    const result = await collections.departments
      .find({ status: { $regex: "^Active$", $options: "i" } }, { projection: { department: 1, _id: 1, status: 1 } })
      .toArray();

    // Cache the results (15 minutes - MEDIUM TTL)
    cacheManager.set(cacheKey, result, cacheManager.TTL.MEDIUM);

    return {
      done: true,
      data: result,
      message: "Departments fetched successfully",
    };
  } catch (error) {
    logger.error('[allDepartments] Error', { error: error.message });
    return {
      done: false,
      error: `Failed to fetch departments: ${error.message}`,
    };
  }
};

export const addDepartment = async (companyId, hrId, payload) => {
  logger.debug('[addDepartment] Starting', { companyId });
  try {
    if (!companyId || !payload) {
      return { done: false, error: "Missing required fields" };
    }
    if (!payload.department) {
      return { done: false, error: "Department name is required" };
    }

    const collections = getTenantCollections(companyId);
    // const hrExists = await collections.hr.countDocuments({ userId: hrId });
    // if (!hrExists) return { done: false, message: "HR doesn't exist" };

    // Escape special regex characters and trim whitespace
    const departmentName = payload.department.trim();
    const escapedName = departmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const departmentExists = await collections.departments.countDocuments({
      department: { $regex: new RegExp(`^${escapedName}$`, "i") },
    });

    logger.debug('[addDepartment] Checking for duplicate', { departmentName, exists: departmentExists > 0 });

    if (departmentExists > 0) {
      return { done: false, error: "Department already exists" };
    }

    const newDepartment = {
      department: departmentName,
      status: normalizeStatus(payload.status || "Active"),
      createdBy: hrId,
      createdAt: new Date(),
    };

    const result = await collections.departments.insertOne(newDepartment);

    // Invalidate department cache for this company
    cacheManager.invalidateCompanyCache(companyId, 'departments');
    logger.info('[addDepartment] Cache invalidated', { companyId });

    return {
      done: true,
      data: { _id: result.insertedId, ...newDepartment },
      message: "Department added successfully",
    };
  } catch (error) {
    logger.error('[addDepartment] Error', { error: error.message });
    return {
      done: false,
      error: "Internal server error",
    };
  }
};

export const displayDepartment = async (companyId, hrId, filters = {}) => {
  try {
    if (!companyId) {
      return { done: false, error: "Missing required fields" };
    }

    const collections = getTenantCollections(companyId);
    logger.debug('[displayDepartment] Got collections', { companyId, keys: Object.keys(collections) });

    // const hrExists = await collections.hr.countDocuments({ userId: hrId });
    // if (!hrExists) return { done: false, message: "HR doesn't exist" };

    const query = {};

    if (filters.status && filters.status.toLowerCase() !== "none") {
      query.status = filters.status;
    }

    const pipeline = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      {
        $addFields: {
          departmentIdString: { $toString: "$_id" }
        }
      },
      {
        $lookup: {
          from: "designations",
          let: { deptId: "$_id" },  // Pass ObjectId directly
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$departmentId", "$$deptId"]  // Compare ObjectId with ObjectId
                },
              },
            },
            { $project: { _id: 1 } }
          ],
          as: "designations",
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { deptIdStr: "$departmentIdString" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [{ $toString: "$departmentId" }, "$$deptIdStr"] },
                    { $ne: ["$isDeleted", true] }
                  ],
                },
              },
            },
          ],
          as: "employees",
        },
      },
      {
        $lookup: {
          from: "policy",
          let: { deptId: "$_id" },  // Pass ObjectId directly
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$applyToAll", false] },  // Only count non-global policies
                    {
                      $gt: [
                        {
                          $size: {
                            $filter: {
                              input: { $ifNull: ["$assignTo", []] },
                              as: "assign",
                              cond: { $eq: ["$$assign.departmentId", "$$deptId"] }
                            }
                          }
                        },
                        0
                      ]
                    }
                  ]
                }
              }
            }
          ],
          as: "policies",
        },
      },
      {
        $addFields: {
          employeeCount: { $size: "$employees" },
          designationCount: { $size: "$designations" },
          policyCount: { $size: "$policies" },
        },
      },
      { $project: { employees: 0, designations: 0, policies: 0, departmentIdString: 0 } },
    ];

    const departments = await collections.departments
      .aggregate(pipeline)
      .toArray();

    logger.debug('[displayDepartment] Found departments', { companyId, count: departments.length });

    return {
      done: true,
      data: departments,
      message: "Departments retrieved successfully",
    };
  } catch (error) {
    logger.error('[displayDepartment] Error', { error: error.message });
    return {
      done: false,
      error: "Internal server error",
    };
  }
};

export const updateDepartment = async (companyId, hrId, payload) => {
  try {
    if (
      !companyId ||
      !payload?.departmentId ||
      !payload?.department ||
      !payload?.status
    ) {
      return { done: false, error: "Missing required fields" };
    }

    const collections = getTenantCollections(companyId);
    const departmentId = new ObjectId(payload.departmentId);

    // const hrExists = await collections.hr.countDocuments({ userId: hrId });
    // if (!hrExists) {
    //   return { done: false, message: "HR doesn't exist" };
    // }

    const currentDepartment = await collections.departments.findOne({
      _id: departmentId,
    });
    if (!currentDepartment) {
      return { done: false, error: "Department not found" };
    }

    if (
      payload.status?.toLowerCase() === "inactive" &&
      currentDepartment.status?.toLowerCase() !== "inactive"
    ) {
      const pipeline = [
        {
          $match: {
            department: currentDepartment.department,
            status: { $regex: "^active$", $options: "i" },
          },
        },
        { $count: "activeCount" },
      ];
      const [resultAgg] = await collections.employees
        .aggregate(pipeline)
        .toArray();
      const activeEmployees = resultAgg ? resultAgg.activeCount : 0;
      if (activeEmployees > 0) {
        return {
          done: false,
          error: "Cannot inactivate department with active employees",
          detail: `${activeEmployees} active employees found`,
        };
      }
    }

    if (payload.department !== currentDepartment.department) {
      // Check for duplicate department name (case-insensitive)
      const departmentName = payload.department.trim();
      const escapedName = departmentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const duplicateExists = await collections.departments.countDocuments({
        department: { $regex: new RegExp(`^${escapedName}$`, "i") },
        _id: { $ne: departmentId },
      });

      if (duplicateExists > 0) {
        return { done: false, error: "Department already exists" };
      }

      await collections.employees.updateMany(
        { department: currentDepartment.department },
        { $set: { department: payload.department } }
      );
    }

    const updateData = {
      department: payload.department,
      status: normalizeStatus(payload.status),
      updatedBy: hrId,
      updatedAt: new Date(),
    };

    const result = await collections.departments.updateOne(
      { _id: departmentId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Department not found" };
    }

    // Invalidate department cache for this company
    cacheManager.invalidateCompanyCache(companyId, 'departments');
    logger.info('[updateDepartment] Cache invalidated', { companyId, departmentId });

    return {
      done: true,
      message: "Department updated successfully",
      data: {
        departmentId: payload.departmentId,
        department: payload.department,
        status: payload.status,
      },
    };
  } catch (error) {
    return {
      done: false,
      error: "Internal server error",
    };
  }
};

export const deleteDepartment = async (companyId, hrId, departmentId, reassignTo = null) => {
  if (!companyId || !departmentId) {
    throw buildValidationError("departmentId", "Missing required fields");
  }

  const collections = getTenantCollections(companyId);
  const departmentObjId = new ObjectId(departmentId);

    // const hrExists = await collections.hr.countDocuments({ userId: hrId });
    // if (!hrExists) {
    //   return { done: false, message: "HR doesn't exist" };
    // }

  const department = await collections.departments.findOne({
    _id: departmentObjId,
  });
  if (!department) {
    throw new AppError("Department not found", 404, "NOT_FOUND");
  }

    const dependencyCounts = await countDepartmentDependencies(
      collections,
      departmentObjId,
      departmentObjId.toString()
    );

    const hasDependencies = Object.values(dependencyCounts).some((count) => count > 0);
    if (hasDependencies && !reassignTo) {
      throw buildDependentRecordsError(dependencyCounts);
    }

    if (reassignTo) {
      if (!ObjectId.isValid(reassignTo)) {
        throw buildValidationError("reassignTo", "Invalid target department ID format");
      }
      if (reassignTo === departmentObjId.toString()) {
        throw buildValidationError("reassignTo", "Target department must be different");
      }
    }

    const targetDepartment = reassignTo
      ? await collections.departments.findOne({ _id: new ObjectId(reassignTo) })
      : null;

    if (reassignTo && !targetDepartment) {
      throw buildValidationError("reassignTo", "Target department not found");
    }

    const session = client.startSession();
    try {
      await session.withTransaction(async () => {
        if (reassignTo && targetDepartment) {
          const targetId = new ObjectId(reassignTo);
          const sourceIdStr = departmentObjId.toString();
          const targetIdStr = targetId.toString();

          await collections.employees.updateMany(
            { departmentId: sourceIdStr },
            {
              $set: {
                departmentId: targetIdStr,
              },
            },
            { session }
          );

          await collections.designations.updateMany(
            { departmentId: departmentObjId },
            { $set: { departmentId: targetId } },
            { session }
          );

          await collections.policy.updateMany(
            { "assignTo.departmentId": departmentObjId, applyToAll: false },
            { $set: { "assignTo.$[elem].departmentId": targetId } },
            { arrayFilters: [{ "elem.departmentId": departmentObjId }], session }
          );

          await collections.promotions.updateMany(
            { "promotionTo.departmentId": sourceIdStr },
            { $set: { "promotionTo.departmentId": targetIdStr } },
            { session }
          );
          await collections.promotions.updateMany(
            { "promotionFrom.departmentId": sourceIdStr },
            { $set: { "promotionFrom.departmentId": targetIdStr } },
            { session }
          );
        }

        const result = await collections.departments.deleteOne(
          { _id: departmentObjId },
          { session }
        );

        if (result.deletedCount === 0) {
          throw new AppError("Department not found", 404, "NOT_FOUND");
        }
      });
    } finally {
      await session.endSession();
    }

  // Invalidate department cache for this company
  cacheManager.invalidateCompanyCache(companyId, 'departments');
  logger.info('[deleteDepartment] Cache invalidated', { companyId, departmentId });

  return {
    done: true,
    message: reassignTo
      ? "Department deleted and reassigned successfully"
      : "Department deleted successfully",
  };
};

export const reassignAndDeleteDepartment = async (companyId, hrId, payload) => {
  if (!companyId || !payload || !payload.sourceDepartmentId || !payload.targetDepartmentId) {
    throw buildValidationError("departmentId", "Missing required fields");
  }
  return deleteDepartment(
    companyId,
    hrId,
    payload.sourceDepartmentId,
    payload.targetDepartmentId
  );
};
