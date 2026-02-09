import mongoose from "mongoose";
import { ObjectId } from "mongodb";
import { getTenantCollections } from "../../config/db.js";
import cacheManager from "../../utils/cacheManager.js";
import logger from "../../utils/logger.js";

export const addPolicy = async (companyId, hrId, policyData) => {
  try {
    if (!companyId || !policyData) {
      return {
        done: false,
        error: "All fields are required including file upload",
      };
    }

    const collections = getTenantCollections(companyId);
    // const hrExists = await collections.hr.countDocuments({ userId: hrId });
    // if (!hrExists) return { done: false, error: "HR not found" };

    // Validate required fields
    // applyToAll=true means policy applies to all employees (current and future)
    // applyToAll=false or undefined requires assignTo with department/designation mappings
    const isApplyToAll = policyData.applyToAll === true;
    
    if (
      !policyData.policyName ||
      (!isApplyToAll && (!policyData.assignTo || policyData.assignTo.length === 0)) ||
      !policyData.effectiveDate ||
      !policyData.policyDescription
    ) {
      return {
        done: false,
        error: isApplyToAll 
          ? "Policy name, description and effective date are required"
          : "Policy name, assign to (departments/designations), description and effective date are required",
      };
    }
    if (new Date(policyData.effectiveDate) < new Date()) {
      return { done: false, error: "Effective date must be in the future" };
    }

    // VALIDATION: assignTo cannot have data when applyToAll is true
    if (isApplyToAll && policyData.assignTo && policyData.assignTo.length > 0) {
      return { done: false, error: "Cannot assign to specific departments when 'Apply to All' is enabled" };
    }

    // Convert assignTo to proper ObjectId structure
    let normalizedAssignTo = [];
    if (!isApplyToAll && policyData.assignTo && policyData.assignTo.length > 0) {
      try {
        normalizedAssignTo = policyData.assignTo.map(item => {
          if (!item.departmentId) {
            throw new Error("Each assignment must have a departmentId");
          }
          
          const normalized = {
            departmentId: new ObjectId(item.departmentId),
            designationIds: []
          };
          
          // If designationIds provided, convert to ObjectId array
          if (item.designationIds && Array.isArray(item.designationIds) && item.designationIds.length > 0) {
            normalized.designationIds = item.designationIds.map(id => new ObjectId(id));
          }
          
          return normalized;
        });
      } catch (error) {
        return { done: false, error: `Invalid ID format in assignTo: ${error.message}` };
      }
    }

    const result = await collections.policy.insertOne({
      policyName: policyData.policyName,
      applyToAll: isApplyToAll,
      assignTo: normalizedAssignTo,  // ONLY ObjectIds, no names
      policyDescription: policyData.policyDescription,
      effectiveDate: new Date(policyData.effectiveDate),
      createdBy: hrId,
      createdAt: new Date(),
    });

    // Invalidate policy cache for this company
    cacheManager.invalidateCompanyCache(companyId, 'policies');
    logger.info('[addPolicy] Cache invalidated', { companyId });

    return {
      done: true,
      data: {
        _id: result.insertedId,
        ...policyData,
        applyToAll: isApplyToAll,
      },
      message: "Policy created successfully",
    };
  } catch (error) {
    return {
      done: false,
      error: `Failed to create policy: ${error.message}`,
    };
  }
};

export const displayPolicy = async (companyId, hrId = 1, filters = {}) => {
  try {
    if (!companyId || !hrId) {
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);

    const matchQuery = {};

    // Filter by department if provided
    if (filters.department) {
      try {
        matchQuery["assignTo.departmentId"] = new ObjectId(filters.department);
      } catch (err) {
        return { done: false, error: "Invalid department ID format" };
      }
    }

    // Filter by date range if provided
    if (filters.startDate && filters.endDate) {
      matchQuery.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    // Use aggregation to populate department names for frontend display
    const pipeline = [
      { $match: matchQuery },
      { $sort: { effectiveDate: -1 } },
      {
        $addFields: {
          // Convert assignTo for lookup - keep structure intact
          assignToWithLookup: {
            $map: {
              input: "$assignTo",
              as: "assignment",
              in: {
                departmentId: "$$assignment.departmentId",
                designationIds: "$$assignment.designationIds",
                departmentIdStr: { $toString: "$$assignment.departmentId" }
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: "departments",
          let: { assignments: "$assignToWithLookup" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: [
                    "$_id",
                    {
                      $map: {
                        input: "$$assignments",
                        as: "a",
                        in: "$$a.departmentId"
                      }
                    }
                  ]
                }
              }
            },
            {
              $project: {
                _id: 1,
                department: 1
              }
            }
          ],
          as: "departmentDetails"
        }
      },
      {
        $addFields: {
          // Add department names to assignTo for frontend display only
          assignToWithNames: {
            $map: {
              input: "$assignTo",
              as: "assignment",
              in: {
                departmentId: { $toString: "$$assignment.departmentId" },
                departmentName: {
                  $let: {
                    vars: {
                      dept: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$departmentDetails",
                              as: "d",
                              cond: { $eq: ["$$d._id", "$$assignment.departmentId"] }
                            }
                          },
                          0
                        ]
                      }
                    },
                    in: { $ifNull: ["$$dept.department", "Unknown"] }
                  }
                },
                designationIds: {
                  $map: {
                    input: "$$assignment.designationIds",
                    as: "desigId",
                    in: { $toString: "$$desigId" }
                  }
                }
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          policyName: 1,
          applyToAll: 1,
          assignTo: "$assignToWithNames",  // Return with names for frontend
          policyDescription: 1,
          effectiveDate: 1,
          createdBy: 1,
          createdAt: 1,
          updatedBy: 1,
          updatedAt: 1
        }
      }
    ];

    const policies = await collections.policy.aggregate(pipeline).toArray();

    logger.debug('[displayPolicy] Found policies', { companyId, count: policies.length });

    return {
      done: true,
      filters: filters,
      data: policies,
      message: policies.length
        ? "Policies fetched successfully"
        : "No policies found matching criteria",
    };
  } catch (error) {
    logger.error('[displayPolicy] Error', { error: error.message });
    return {
      done: false,
      error: `Failed to fetch policies: ${error.message}`,
    };
  }
};

export const updatePolicy = async (companyId, hrId = 1, payload) => {
  try {
    if (!companyId || !payload) {
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    // const hrExists = await collections.hr.countDocuments({ userId: hrId });
    // if (!hrExists) return { done: false, error: "HR not found" };

    if (!payload.policyId) {
      return { done: false, error: "Policy ID not found" };
    }
    
    // Validate required fields
    // applyToAll=true means policy applies to all employees (current and future)
    const isApplyToAll = payload.applyToAll === true;
    
    if (
      !payload.policyName ||
      (!isApplyToAll && (!payload.assignTo || payload.assignTo.length === 0)) ||
      !payload.effectiveDate ||
      !payload.policyDescription
    ) {
      return {
        done: false,
        error: isApplyToAll
          ? "Policy name, description and effective date are required"
          : "Policy name, assign to (departments/designations), description and effective date are required",
      };
    }

    // VALIDATION: assignTo cannot have data when applyToAll is true
    if (isApplyToAll && payload.assignTo && payload.assignTo.length > 0) {
      return { done: false, error: "Cannot assign to specific departments when 'Apply to All' is enabled" };
    }

    // Convert assignTo to proper ObjectId structure
    let normalizedAssignTo = [];
    if (!isApplyToAll && payload.assignTo && payload.assignTo.length > 0) {
      try {
        normalizedAssignTo = payload.assignTo.map(item => {
          if (!item.departmentId) {
            throw new Error("Each assignment must have a departmentId");
          }
          
          const normalized = {
            departmentId: new ObjectId(item.departmentId),
            designationIds: []
          };
          
          // If designationIds provided, convert to ObjectId array
          if (item.designationIds && Array.isArray(item.designationIds) && item.designationIds.length > 0) {
            normalized.designationIds = item.designationIds.map(id => new ObjectId(id));
          }
          
          return normalized;
        });
      } catch (error) {
        return { done: false, error: `Invalid ID format in assignTo: ${error.message}` };
      }
    }

    const result = await collections.policy.updateOne(
      { _id: new ObjectId(payload.policyId) },
      {
        $set: {
          policyName: payload.policyName,
          applyToAll: isApplyToAll,
          assignTo: normalizedAssignTo,  // ONLY ObjectIds, no names
          effectiveDate: payload.effectiveDate,
          policyDescription: payload.policyDescription,
          updatedBy: hrId,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return { done: false, error: "Policy not found" };
    }

    // Invalidate policy cache for this company
    cacheManager.invalidateCompanyCache(companyId, 'policies');
    logger.info('[updatePolicy] Cache invalidated', { companyId, policyId: payload.policyId });

    return {
      done: true,
      data: { policyId: payload.policyId, ...payload.updateData },
      message: "Policy updated successfully",
    };
  } catch (error) {
    return {
      done: false,
      error: `Failed to update policy: ${error.message}`,
    };
  }
};

export const deletePolicy = async (companyId, hrId = 1, policyId) => {
  try {
    if (!companyId || !hrId || !policyId) {
      return { done: false, error: "Missing required parameters" };
    }

    const collections = getTenantCollections(companyId);
    // const hrExists = await collections.hr.countDocuments({ userId: hrId });
    // if (!hrExists) return { done: false, error: "HR not found" };

    const result = await collections.policy.deleteOne({
      _id: new ObjectId(policyId),
    });

    if (result.deletedCount === 0) {
      return { done: false, error: "Policy not found" };
    }

    // Invalidate policy cache for this company
    cacheManager.invalidateCompanyCache(companyId, 'policies');
    logger.info('[deletePolicy] Cache invalidated', { companyId, policyId });

    return {
      done: true,
      data: { policyId },
      message: "Policy deleted successfully",
    };
  } catch (error) {
    return {
      done: false,
      error: `Failed to delete policy: ${error.message}`,
    };
  }
};
