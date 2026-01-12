import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";

export const allDepartments = async (companyId, hrId) => {
  try {
    if (!companyId) {
      return {
        done: false,
        error: "All fields are required including file upload",
      };
    }

    const collections = getTenantCollections(companyId);
    // const hrExists = await collections.hr.countDocuments({ userId: hrId });
    // if (!hrExists) return { done: false, error: "HR not found" };

    const result = await collections.departments
      .find({ status: "active" }, { projection: { department: 1, _id: 1, status: 1 } })
      .toArray();

    return {
      done: true,
      data: result,
      message: "Departments fetched successfully",
    };
  } catch (error) {
    return {
      done: false,
      error: `Failed to fetch departments: ${error.message}`,
    };
  }
};

export const addDepartment = async (companyId, hrId, payload) => {
  console.log("in add depart");
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
    
    console.log("Checking for duplicate department:", departmentName, "Found:", departmentExists);
    
    if (departmentExists > 0) {
      return { done: false, error: "Department already exists" };
    }

    const newDepartment = {
      department: departmentName,
      status: payload.status || "active",
      createdBy: hrId,
      createdAt: new Date(),
    };

    const result = await collections.departments.insertOne(newDepartment);
    return {
      done: true,
      data: { _id: result.insertedId, ...newDepartment },
      message: "Department added successfully",
    };
  } catch (error) {
    console.log(error);

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
    console.log(Object.keys(collections));

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
          from: "employees",
          let: { deptIdStr: "$departmentIdString" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentId", "$$deptIdStr"],
                    },
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
          from: "designations",
          let: { deptIdStr: "$departmentIdString" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $eq: ["$departmentId", "$$deptIdStr"],
                    },
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
          as: "designations",
        },
      },
      {
        $addFields: {
          employeeCount: { $size: "$employees" },
          designationCount: { $size: "$designations" },
        },
      },
      { $project: { employees: 0, designations: 0, departmentIdString: 0 } },
    ];

    const departments = await collections.departments
      .aggregate(pipeline)
      .toArray();
    console.log(departments);

    return {
      done: true,
      data: departments,
      message: "Departments retrieved successfully",
    };
  } catch (error) {
    console.log(error);

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
      payload.status === "inactive" &&
      currentDepartment.status !== "inactive"
    ) {
      const pipeline = [
        {
          $match: {
            department: currentDepartment.department,
            status: "active",
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
      status: payload.status,
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

export const deleteDepartment = async (companyId, hrId, departmentId) => {
  try {
    if (!companyId || !departmentId) {
      return { done: false, error: "Missing required fields" };
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
      return { done: false, message: "Department not found" };
    }

    const pipeline = [
      { $match: { department: department.department } },
      { $count: "employeeCount" },
    ];
    const [employeeCountResult] = await collections.employees
      .aggregate(pipeline)
      .toArray();
    const hasEmployees = employeeCountResult
      ? employeeCountResult.employeeCount
      : 0;

    if (hasEmployees > 0) {
      return {
        done: false,
        message: "Cannot delete department with assigned employees",
        detail: `${hasEmployees} employees found`,
      };
    }

    const result = await collections.departments.deleteOne({
      _id: departmentObjId,
    });

    if (result.deletedCount === 0) {
      return { done: false, message: "Department not found" };
    }

    return {
      done: true,
      message: "Department deleted successfully",
    };
  } catch (error) {
    return {
      done: false,
      error: "Internal server error",
    };
  }
};
