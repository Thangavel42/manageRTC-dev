import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";

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
      console.log("Hello");

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

    return {
      done: true,
      data: {
        _id: result.insertedId,
        createdBy: hrId,
      },
      message: "Designation added successfully",
    };
  } catch (error) {
    console.log("Error in addDesignation:", error);
    return {
      done: false,
      error: `Failed to add designation: ${error.message}`,
    };
  }
};

export const deleteDesignation = async (companyId, hrId, designationId) => {
  try {
    if (!companyId || !hrId || !designationId) {
      return { done: false, error: "Missing required fields" };
    }

    const collections = getTenantCollections(companyId);
    const designationObjId = new ObjectId(designationId);

    const [hrExists, designation] = await Promise.all([
      collections.hr.countDocuments({ userId: hrId }),
      collections.designations.findOne({ _id: designationObjId }),
    ]);

    // if (!hrExists) {
    //   return { done: false, error: "HR not found" };
    // }

    if (!designation) {
      return { done: false, error: "Designation not found" };
    }

    const employeeCount = await collections.employees.countDocuments({
      designation: designation.designation,
    });

    if (employeeCount > 0) {
      return {
        done: false,
        error: `${employeeCount} employee(s) use '${designation.designation}'`,
      };
    }

    const deleteResult = await collections.designations.deleteOne({
      _id: designationObjId,
    });

    if (deleteResult.deletedCount === 0) {
      return { done: false, error: "Failed to delete designation" };
    }

    return {
      done: true,
      data: { deletedDesignation: designation.designation },
      message: `'${designation.designation}' deleted successfully`,
    };
  } catch (error) {
    console.error("Delete designation failed:", error);
    return {
      done: false,
      error: `Operation failed: ${error.message}`,
    };
  }
};

export const reassignAndDeleteDesignation = async (companyId, hrId, payload) => {
  try {
    if (!companyId || !payload || !payload.sourceDesignationId || !payload.targetDesignationId) {
      return { done: false, error: "Missing required fields" };
    }

    const collections = getTenantCollections(companyId);
    const sourceId = new ObjectId(payload.sourceDesignationId);
    const targetId = new ObjectId(payload.targetDesignationId);

    // Verify source designation exists
    const sourceDesignation = await collections.designations.findOne({
      _id: sourceId,
    });
    if (!sourceDesignation) {
      return { done: false, error: "Source designation not found" };
    }

    // Verify target designation exists
    const targetDesignation = await collections.designations.findOne({
      _id: targetId,
    });
    if (!targetDesignation) {
      return { done: false, error: "Target designation not found" };
    }

    // Verify both designations are in the same department
    if (!sourceDesignation.departmentId.equals(targetDesignation.departmentId)) {
      return { done: false, error: "Target designation must be in the same department" };
    }

    // Reassign employees from source to target designation
    // Employees store designationId as string of ObjectId
    const employeeUpdateResult = await collections.employees.updateMany(
      { designationId: sourceId.toString() },
      { 
        $set: { 
          designationId: targetId.toString(),
          designation: targetDesignation.designation
        } 
      }
    );

    // Reassign policies from source to target designation
    // Policies have assignTo: [{departmentId: ObjectId, designationIds: [ObjectId]}]
    // We need to replace sourceId with targetId in designationIds arrays
    const policyUpdateResult = await collections.policy.updateMany(
      { 
        "assignTo.designationIds": sourceId,  // Find policies containing source designation
        applyToAll: false  // Only update policies that are not applied to all
      },
      { 
        $set: { 
          "assignTo.$[dept].designationIds.$[desig]": targetId  // Replace designation ObjectId
        }
      },
      { 
        arrayFilters: [
          { "dept.departmentId": sourceDesignation.departmentId },  // Match the department
          { "desig": sourceId }  // Match the specific designation to replace
        ]
      }
    );

    // Delete source designation
    const deleteResult = await collections.designations.deleteOne({
      _id: sourceId,
    });

    if (deleteResult.deletedCount === 0) {
      return { done: false, error: "Failed to delete designation" };
    }

    return {
      done: true,
      message: "Designation deleted and all employees and policies reassigned successfully",
      data: {
        employeesReassigned: employeeUpdateResult.modifiedCount,
        policiesReassigned: policyUpdateResult.modifiedCount,
        deletedDesignation: sourceDesignation.designation,
        targetDesignation: targetDesignation.designation,
      },
    };
  } catch (error) {
    console.error("Reassign and delete designation failed:", error);
    return {
      done: false,
      error: `Internal server error: ${error.message}`,
    };
  }
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
        console.error("Invalid departmentId format:", filters.departmentId);
        return { done: false, error: "Invalid department ID format" };
      }
    }

    console.log("Query from desingation", query);

    console.log("Filters from desingation", filters);

    const pipeline = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      // Convert IDs to strings for matching with employees collection
      // This ensures we match employees by BOTH designationId AND departmentId
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
          let: { 
            designationIdStr: "$designationIdString",
            departmentIdStr: "$departmentIdString"
          },
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
                    // Match employee.departmentId (string) with designation.departmentId (converted to string)
                    // This ensures we only count employees in THIS department with THIS designation
                    { 
                      $eq: [
                        { $ifNull: ["$departmentId", ""] }, 
                        "$$departmentIdStr"
                      ] 
                    },
                    // Only count active employees
                    {
                      $or: [
                        { $eq: ["$status", "active"] },
                        { $eq: ["$status", "Active"] }
                      ]
                    }
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

    console.log("Designations with employee count:", JSON.stringify(designations, null, 2));

    return {
      done: true,
      data: designations,
      message: designations.length
        ? "Designations retrieved successfully"
        : "No designations found matching filters",
    };
  } catch (error) {
    console.error("Error in displayDesignations:", error);
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

    return {
      done: true,
      message: "Designation updated successfully",
    };
  } catch (error) {
    console.error("Error updating designation:", error);
    return {
      done: false,
      error: "Internal server error",
      systemError: error.message,
    };
  }
};
