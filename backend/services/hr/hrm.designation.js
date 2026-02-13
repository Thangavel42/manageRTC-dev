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

const countDesignationDependencies = async (collections, sourceId, sourceIdStr) => {
  const [employees, policies, promotions] = await Promise.all([
    collections.employees.countDocuments({ designationId: sourceIdStr }),
    collections.policy.countDocuments({
      "assignTo.designationIds": sourceId,
      applyToAll: false,
    }),
    collections.promotions.countDocuments({
      $or: [
        { "promotionTo.designationId": sourceIdStr },
        { "promotionFrom.designationId": sourceIdStr },
      ],
    }),
  ]);

  return { employees, policies, promotions };
};

export const addDesignation = async (companyId, hrId, payload) => {
  try {
    if (!companyId || !hrId || !payload) {
      return { done: false, error: "Missing required parameters" };
    }
    const collections = getTenantCollections(companyId);
    // const hrExists = await collections.hr.countDocuments({
    //      userId: hrId
    // });
    // if (!hrExists) return { done: false, error: "HR not found" };
    if (!payload.designation || !payload.departmentId) {
      return { done: false, error: "Designation and department are required" };
    }
    // Convert departmentId to ObjectId for proper storage
    const departmentObjId = new ObjectId(payload.departmentId);

    const existingDesignation = await collections.designations.findOne({
      designation: { $regex: `^${payload.designation}$`, $options: "i" },
      departmentId: departmentObjId,
    });

    if (existingDesignation) {
      logger.warn('[addDesignation] Duplicate designation', { companyId, designation: payload.designation, departmentId: payload.departmentId });
      return {
        done: false,
        error: "Designation already exists in this department",
      };
    }

    const result = await collections.designations.insertOne({
      designation: payload.designation,
      departmentId: departmentObjId,
      status: normalizeStatus(payload.status || "Active"),
      createdBy: hrId,
      createdAt: new Date(),
    });

    // Invalidate designation cache for this company
    cacheManager.invalidateCompanyCache(companyId, 'designations');
    logger.info('[addDesignation] Cache invalidated', { companyId });

    return {
      done: true,
      data: {
        _id: result.insertedId,
        createdBy: hrId,
      },
      message: "Designation added successfully",
    };
  } catch (error) {
    logger.error('[addDesignation] Error', { error: error.message });
    return {
      done: false,
      error: `Failed to add designation: ${error.message}`,
    };
  }
};

export const deleteDesignation = async (companyId, hrId, designationId, reassignTo = null) => {
  if (!companyId || !designationId) {
    throw buildValidationError("designationId", "Missing required fields");
  }

  const collections = getTenantCollections(companyId);
  const designationObjId = new ObjectId(designationId);

  const designation = await collections.designations.findOne({ _id: designationObjId });
  if (!designation) {
    throw new AppError("Designation not found", 404, "NOT_FOUND");
  }

  const dependencyCounts = await countDesignationDependencies(
    collections,
    designationObjId,
    designationObjId.toString()
  );

  const hasDependencies = Object.values(dependencyCounts).some((count) => count > 0);
  if (hasDependencies && !reassignTo) {
    throw buildDependentRecordsError(dependencyCounts);
  }

  if (reassignTo) {
    if (!ObjectId.isValid(reassignTo)) {
      throw buildValidationError("reassignTo", "Invalid target designation ID format");
    }
    if (reassignTo === designationObjId.toString()) {
      throw buildValidationError("reassignTo", "Target designation must be different");
    }
  }

  const targetDesignation = reassignTo
    ? await collections.designations.findOne({ _id: new ObjectId(reassignTo) })
    : null;

  if (reassignTo && !targetDesignation) {
    throw buildValidationError("reassignTo", "Target designation not found");
  }

  if (reassignTo && targetDesignation) {
    if (!designation.departmentId.equals(targetDesignation.departmentId)) {
      throw buildValidationError("reassignTo", "Target designation must be in the same department");
    }
  }

  const session = client.startSession();
  try {
    await session.withTransaction(async () => {
      if (reassignTo && targetDesignation) {
        const targetId = new ObjectId(reassignTo);
        const sourceIdStr = designationObjId.toString();
        const targetIdStr = targetId.toString();

        await collections.employees.updateMany(
          { designationId: sourceIdStr },
          {
            $set: {
              designationId: targetIdStr,
              designation: targetDesignation.designation
            }
          },
          { session }
        );

        await collections.policy.updateMany(
          { "assignTo.designationIds": designationObjId, applyToAll: false },
          { $set: { "assignTo.$[dept].designationIds.$[desig]": targetId } },
          {
            arrayFilters: [
              { "dept.departmentId": designation.departmentId },
              { "desig": designationObjId }
            ],
            session
          }
        );

        await collections.promotions.updateMany(
          { "promotionTo.designationId": sourceIdStr },
          { $set: { "promotionTo.designationId": targetIdStr } },
          { session }
        );
        await collections.promotions.updateMany(
          { "promotionFrom.designationId": sourceIdStr },
          { $set: { "promotionFrom.designationId": targetIdStr } },
          { session }
        );
      }

      const deleteResult = await collections.designations.deleteOne(
        { _id: designationObjId },
        { session }
      );

      if (deleteResult.deletedCount === 0) {
        throw new AppError("Failed to delete designation", 500, "DELETE_FAILED");
      }
    });
  } finally {
    await session.endSession();
  }

  // Invalidate designation cache for this company
  cacheManager.invalidateCompanyCache(companyId, 'designations');
  logger.info('[deleteDesignation] Cache invalidated', { companyId, designationId });

  return {
    done: true,
    data: { deletedDesignation: designation.designation },
    message: `'${designation.designation}' deleted successfully`,
  };
};

export const reassignAndDeleteDesignation = async (companyId, hrId, payload) => {
  if (!companyId || !payload || !payload.sourceDesignationId || !payload.targetDesignationId) {
    throw buildValidationError("designationId", "Missing required fields");
  }

  return deleteDesignation(companyId, hrId, payload.sourceDesignationId, payload.targetDesignationId);
};

export const displayDesignations = async (companyId, hrId, filters) => {
  try {
    // if (!companyId || !hrId) {
    //   return { done: false, error: "Missing companyId or hrId" };
    // }
    if (!companyId) {
      return { done: false, error: "Missing companyId or hrId" };
    }

    const collections = getTenantCollections(companyId);
    // const hrExists = await collections.hr.countDocuments({ userId: hrId });
    // if (!hrExists) return { done: false, error: "HR not found" };

    const query = {};
    if (filters.status && filters.status !== "all")
      query.status = filters.status;

    // Handle departmentId filtering - convert string to ObjectId for matching
    if (filters.departmentId) {
      try {
        query.departmentId = new ObjectId(filters.departmentId);
      } catch (err) {
        logger.error('[displayDesignations] Invalid departmentId format', { departmentId: filters.departmentId });
        return { done: false, error: "Invalid department ID format" };
      }
    }

    logger.debug('[displayDesignations] Query and filters', { query, filters });

    const pipeline = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      // Convert IDs to strings for matching with employees collection
      {
        $addFields: {
          // Convert designation _id (ObjectId) to string for matching with employee.designationId
          designationIdString: { $toString: "$_id" },
          // Convert designation departmentId to string for matching with employee.departmentId
          departmentIdString: {
            $cond: {
              if: { $eq: [{ $type: "$departmentId" }, "string"] },
              then: "$departmentId",
              else: { $toString: "$departmentId" },
            },
          },
          // Keep ObjectId version for department lookup
          departmentObjId: {
            $cond: {
              if: { $eq: [{ $type: "$departmentId" }, "string"] },
              then: { $toObjectId: "$departmentId" },
              else: "$departmentId",
            },
          },
        },
      },
      {
        $lookup: {
          from: "employees",
          let: { designationIdStr: "$designationIdString" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    // Match employee.designationId (string) with designation._id (converted to string)
                    {
                      $eq: [
                        { $ifNull: ["$designationId", ""] },
                        "$$designationIdStr"
                      ]
                    },
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
          from: "departments",
          localField: "departmentObjId",
          foreignField: "_id",
          as: "department",
        },
      },
      {
        $addFields: {
          employeeCount: { $size: "$employees" },
          department: {
            $ifNull: [
              { $arrayElemAt: ["$department.department", 0] },
              "Unknown Department",
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          designation: 1,
          status: 1,
          departmentId: { $toString: "$departmentId" },  // Convert ObjectId to string for frontend
          department: 1,
          employeeCount: 1,
          createdAt: 1,
        },
      },
    ];

    const designations = await collections.designations
      .aggregate(pipeline)
      .toArray();

    logger.debug('[displayDesignations] Found designations', { companyId, count: designations.length });

    return {
      done: true,
      data: designations,
      message: designations.length
        ? "Designations retrieved successfully"
        : "No designations found matching filters",
    };
  } catch (error) {
    logger.error('[displayDesignations] Error', { error: error.message });
    return {
      done: false,
      error: `Failed to fetch designations: ${error.message}`,
    };
  }
};

export const updateDesignation = async (companyId, hrId, payload) => {
  try {
    if (!companyId || !hrId || !payload) {
      return { done: false, error: "Missing required fields" };
    }

    if (!payload?.designationId) {
      return { done: false, error: "Designation ID required" };
    }

    const collections = getTenantCollections(companyId);

    // const hrExists = await collections.hr.countDocuments({
    //   userId: hrId,
    // });
    // if (!hrExists) {
    //   return { done: false, error: "HR doesn't exist" };
    // }

    const designationExists = await collections.designations.findOne({
      _id: new ObjectId(payload.designationId),
    });
    if (!designationExists) {
      return { done: false, error: "Designation doesn't exist" };
    }

    if (
      payload.departmentId &&
      payload.departmentId !== designationExists.departmentId.toString()
    ) {
      const departmentExists = await collections.departments.countDocuments({
        _id: new ObjectId(payload.departmentId),
      });
      if (!departmentExists) {
        return { done: false, error: "New department doesn't exist" };
      }

      const duplicateExists = await collections.designations.countDocuments({
        _id: { $ne: new ObjectId(payload.designationId) },
        departmentId: new ObjectId(payload.departmentId),
        designation: payload.designation,
      });

      if (duplicateExists > 0) {
        return {
          done: false,
          error:
            "Designation with this name already exists in the selected department",
        };
      }
    } else if (
      payload.designation &&
      payload.designation !== designationExists.designation
    ) {
      const duplicateExists = await collections.designations.countDocuments({
        _id: { $ne: new ObjectId(payload.designationId) },
        departmentId: designationExists.departmentId,
        designation: payload.designation,
      });

      if (duplicateExists > 0) {
        return {
          done: false,
          error: "Designation with this name already exists in the department",
        };
      }
    }

    const result = await collections.designations.updateOne(
      { _id: new ObjectId(payload.designationId) },
      {
        $set: {
          designation: payload.designation || designationExists.designation,
          departmentId: payload.departmentId
            ? new ObjectId(payload.departmentId)
            : designationExists.departmentId,
          status: normalizeStatus(payload.status || designationExists.status),
          updatedBy: hrId,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return { done: false, error: "No changes made to designation" };
    }

    // Invalidate designation cache for this company
    cacheManager.invalidateCompanyCache(companyId, 'designations');
    logger.info('[updateDesignation] Cache invalidated', { companyId, designationId: payload.designationId });

    return {
      done: true,
      message: "Designation updated successfully",
    };
  } catch (error) {
    logger.error('[updateDesignation] Error', { error: error.message });
    return {
      done: false,
      error: "Internal server error",
      systemError: error.message,
    };
  }
};
