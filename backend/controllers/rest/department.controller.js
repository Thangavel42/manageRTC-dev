/**
 * Department REST Controller
 * REST API endpoints for department management
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import {
    asyncHandler,
    buildNotFoundError
} from '../../middleware/errorHandler.js';
import { deleteDepartment as deleteDepartmentService } from '../../services/hr/hrm.department.js';
import { extractUser, sendCreated, sendSuccess } from '../../utils/apiResponse.js';
import { devError, devLog } from '../../utils/logger.js';

/**
 * Helper function to check if user has required role
 * @param {Object} user - User object from extractUser
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {boolean} - True if user has access
 */
const ensureRole = (user, allowedRoles = []) => {
  const role = user?.role?.toLowerCase();
  return allowedRoles.includes(role);
};

/**
 * Helper function to send 403 Forbidden response
 */
const sendForbidden = (res, message = 'You do not have permission to access this resource') => {
  return res.status(403).json({
    success: false,
    error: { message }
  });
};

/**
 * Get all departments with optional filters
 * @route GET /api/departments
 */
export const getAllDepartments = asyncHandler(async (req, res) => {
  try {
    // Use validated query if available, otherwise use original query (for non-validated routes)
    const query = req.validatedQuery || req.query;
    const { status, search, sortBy = 'department', sortOrder = 'asc', page = 1, limit = 100 } = query;

    devLog('[Department Controller] Fetching departments with query:', { status, search, sortBy, sortOrder, page, limit });

    // Get user info
    const user = extractUser(req);
    devLog('[Department Controller] User info:', { userId: user.userId, companyId: user.companyId, role: user.role });

    // Get tenant collections using companyId
    const collections = getTenantCollections(user.companyId);

    // Build MongoDB query filter
    const mongoQuery = {};
    if (status) mongoQuery.status = status;
    if (search) {
      mongoQuery.$or = [
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    devLog('[Department Controller] MongoDB query:', mongoQuery);

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get total count
    const total = await collections.departments.countDocuments(mongoQuery);

    // Execute query with pagination
    const pageNum = parseInt(page) || 1;
    const limitNum = Math.min(parseInt(limit) || 100, 500); // Max 500
    const skip = (pageNum - 1) * limitNum;

    const departments = await collections.departments
      .aggregate([
        { $match: mongoQuery },
        { $sort: sort },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: 'designations',
            let: { deptId: '$_id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$departmentId', '$$deptId'] } } },
              { $project: { _id: 1 } }
            ],
            as: 'designations'
          }
        },
        {
          $lookup: {
            from: 'employees',
            let: { deptIdStr: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: [{ $toString: '$departmentId' }, '$$deptIdStr'] },
                      { $ne: ['$isDeleted', true] }
                    ]
                  }
                }
              },
              { $project: { _id: 1 } }
            ],
            as: 'employees'
          }
        },
        {
          $lookup: {
            from: 'policy',
            let: { deptId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$applyToAll', false] },
                      {
                        $gt: [
                          {
                            $size: {
                              $filter: {
                                input: { $ifNull: ['$assignTo', []] },
                                as: 'assign',
                                cond: { $eq: ['$$assign.departmentId', '$$deptId'] }
                              }
                            }
                          },
                          0
                        ]
                      }
                    ]
                  }
                }
              },
              { $project: { _id: 1 } }
            ],
            as: 'policies'
          }
        },
        {
          $addFields: {
            employeeCount: { $size: '$employees' },
            designationCount: { $size: '$designations' },
            policyCount: { $size: '$policies' }
          }
        },
        {
          $project: {
            employees: 0,
            designations: 0,
            policies: 0
          }
        }
      ])
      .toArray();

    devLog('[Department Controller] Found', departments.length, 'departments out of', total, 'total');

    // Get stats
    const allDepartments = await collections.departments.find({}).toArray();
    const stats = {
      totalDepartments: allDepartments.length,
      activeCount: allDepartments.filter(d => d.status === 'Active').length,
      inactiveCount: allDepartments.filter(d => d.status === 'Inactive').length,
      recentCount: allDepartments.filter(d => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(d.createdAt) >= thirtyDaysAgo;
      }).length
    };

    // Build pagination metadata
    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
      hasNext: pageNum < Math.ceil(total / limitNum),
      hasPrev: pageNum > 1
    };

    res.json({
      success: true,
      data: departments,
      stats,
      pagination,
      count: departments.length
    });

  } catch (error) {
    devError('[Department Controller] Error fetching departments:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch departments', details: error.message }
    });
  }
});

/**
 * Get department by ID
 * @route GET /api/departments/:id
 */
export const getDepartmentById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const user = extractUser(req);

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    const department = await collections.departments.findOne({ _id: new ObjectId(id) });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: { message: 'Department not found' }
      });
    }

    return sendSuccess(res, department, 'Department retrieved successfully');

  } catch (error) {
    devError('[Department Controller] Error fetching department:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch department' }
    });
  }
});

/**
 * Create new department
 * @route POST /api/departments
 */
export const createDepartment = asyncHandler(async (req, res) => {
  try {
    const departmentData = req.body;
    const user = extractUser(req);

    // Role check: Only admin, hr, superadmin can create departments
    if (!ensureRole(user, ['admin', 'hr', 'superadmin'])) {
      return sendForbidden(res, 'Only Admin and HR can create departments');
    }

    devLog('[Department Controller] createDepartment - companyId:', user.companyId);

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    // Validate required fields
    if (!departmentData.department || typeof departmentData.department !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Department name is required and must be a string' }
      });
    }

    // Check if department with same name already exists for this company
    const existingDept = await collections.departments.findOne({
      department: departmentData.department
    });

    if (existingDept) {
      return res.status(409).json({
        success: false,
        error: { message: 'Department with this name already exists' }
      });
    }

    // Set defaults
    const departmentToInsert = {
      ...departmentData,
      status: departmentData.status || 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: user.userId,
      updatedBy: user.userId,
      employeeCount: 0,
      designationCount: 0,
      policyCount: 0
    };

    // Create department
    const result = await collections.departments.insertOne(departmentToInsert);

    if (!result.insertedId) {
      throw new Error('Failed to create department');
    }

    // Get created department
    const department = await collections.departments.findOne({ _id: result.insertedId });

    return sendCreated(res, department, 'Department created successfully');

  } catch (error) {
    devError('[Department Controller] Error creating department:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create department' }
    });
  }
});

/**
 * Update department
 * @route PUT /api/departments/:id
 */
export const updateDepartment = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const user = extractUser(req);

    // Role check: Only admin, hr, superadmin can update departments
    if (!ensureRole(user, ['admin', 'hr', 'superadmin'])) {
      return sendForbidden(res, 'Only Admin and HR can update departments');
    }

    devLog('[Department Controller] updateDepartment - id:', id, 'companyId:', user.companyId);

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    // Check if department exists
    const department = await collections.departments.findOne({ _id: new ObjectId(id) });

    if (!department) {
      return res.status(404).json({
        success: false,
        error: { message: 'Department not found' }
      });
    }

    // Check if updating name and if new name already exists
    if (updateData.department && updateData.department !== department.department) {
      const existingDept = await collections.departments.findOne({
        department: updateData.department,
        _id: { $ne: new ObjectId(id) }
      });

      if (existingDept) {
        return res.status(409).json({
          success: false,
          error: { message: 'Department with this name already exists' }
        });
      }
    }

    // Update department
    updateData.updatedAt = new Date();
    updateData.updatedBy = user.userId;

    const result = await collections.departments.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw buildNotFoundError('Department', id);
    }

    // Get updated department
    const updatedDepartment = await collections.departments.findOne({ _id: new ObjectId(id) });

    return sendSuccess(res, updatedDepartment, 'Department updated successfully');

  } catch (error) {
    devError('[Department Controller] Error updating department:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update department' }
    });
  }
});

/**
 * Delete department
 * @route DELETE /api/departments/:id
 */
export const deleteDepartment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reassignTo } = req.body || {};
  const user = extractUser(req);

  // Role check: Only admin and superadmin can delete departments
  if (!ensureRole(user, ['admin', 'superadmin'])) {
    return sendForbidden(res, 'Only Admin can delete departments');
  }

  devLog('[Department Controller] deleteDepartment - id:', id, 'companyId:', user.companyId);

  const result = await deleteDepartmentService(user.companyId, user.userId, id, reassignTo);

  return sendSuccess(
    res,
    { _id: id, reassignedTo: reassignTo || null },
    result.message || 'Department deleted successfully'
  );
});

/**
 * Update department status
 * @route PUT /api/departments/:id/status
 */
export const updateDepartmentStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const user = extractUser(req);

    // Role check: Only admin, hr, superadmin can update department status
    if (!ensureRole(user, ['admin', 'hr', 'superadmin'])) {
      return sendForbidden(res, 'Only Admin and HR can update department status');
    }

    devLog('[Department Controller] updateDepartmentStatus - id:', id, 'status:', status, 'companyId:', user.companyId);

    if (!status || !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: { message: 'Invalid status value. Must be Active or Inactive' }
      });
    }

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    const result = await collections.departments.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
          updatedBy: user.userId
        }
      }
    );

    if (result.matchedCount === 0) {
      throw buildNotFoundError('Department', id);
    }

    // Get updated department
    const department = await collections.departments.findOne({ _id: new ObjectId(id) });

    return sendSuccess(res, department, `Department status updated to ${status}`);

  } catch (error) {
    devError('[Department Controller] Error updating department status:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update department status' }
    });
  }
});

/**
 * Search departments
 * @route GET /api/departments/search
 */
export const searchDepartments = asyncHandler(async (req, res) => {
  try {
    const { q } = req.query;
    const user = extractUser(req);

    devLog('[Department Controller] searchDepartments - query:', q, 'companyId:', user.companyId);

    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        success: false,
        error: { message: 'Search query is required' }
      });
    }

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    const departments = await collections.departments.find({
      $or: [
        { department: { $regex: q, $options: 'i' } }
      ]
    })
      .sort({ department: 1 })
      .limit(20)
      .toArray();

    res.json({
      success: true,
      data: departments,
      count: departments.length
    });

  } catch (error) {
    devError('[Department Controller] Error searching departments:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to search departments' }
    });
  }
});

/**
 * Get departments statistics
 * @route GET /api/departments/stats
 */
export const getDepartmentStats = asyncHandler(async (req, res) => {
  try {
    const user = extractUser(req);

    devLog('[Department Controller] getDepartmentStats - companyId:', user.companyId);

    // Get tenant collections
    const collections = getTenantCollections(user.companyId);

    const allDepartments = await collections.departments.find({}).toArray();

    const stats = {
      totalDepartments: allDepartments.length,
      activeCount: allDepartments.filter(d => d.status === 'Active').length,
      inactiveCount: allDepartments.filter(d => d.status === 'Inactive').length,
      recentCount: allDepartments.filter(d => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(d.createdAt) >= thirtyDaysAgo;
      }).length
    };

    return sendSuccess(res, stats, 'Department statistics retrieved successfully');

  } catch (error) {
    devError('[Department Controller] Error fetching department stats:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch department statistics' }
    });
  }
});

export default {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  updateDepartmentStatus,
  searchDepartments,
  getDepartmentStats
};
