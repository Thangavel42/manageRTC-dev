/**
 * Policy REST Controller
 * Handles all policy-related CRUD operations
 * Uses multi-tenant database architecture with getTenantCollections()
 */

import { ObjectId } from 'mongodb';
import { getTenantCollections } from '../../config/db.js';
import { extractUser } from '../../utils/apiResponse.js';
import {
  buildNotFoundError,
  buildConflictError,
  buildValidationError,
  asyncHandler
} from '../../middleware/errorHandler.js';
import {
  sendSuccess,
  sendCreated,
  buildPagination
} from '../../utils/apiResponse.js';
import { formatDDMMYYYY, isValidDDMMYYYY, parseDDMMYYYY } from '../../utils/dateFormat.js';
import { devLog, devDebug, devWarn, devError } from '../../utils/logger.js';

const parseDateField = (value, fieldName) => {
  if (value === undefined || value === null || value === '') return null;
  if (value instanceof Date) return value;
  if (typeof value === 'string' && !isValidDDMMYYYY(value)) {
    throw buildValidationError(fieldName, 'Date must be in DD-MM-YYYY format');
  }
  const parsed = parseDDMMYYYY(value);
  if (!parsed) {
    throw buildValidationError(fieldName, 'Date must be in DD-MM-YYYY format');
  }
  return parsed;
};

const formatPolicyDates = (policy) => {
  if (!policy) return policy;
  return {
    ...policy,
    effectiveDate: formatDDMMYYYY(policy.effectiveDate)
  };
};

/**
 * Get all policies with optional filtering
 * REST API: GET /api/policies
 */
export const getAllPolicies = asyncHandler(async (req, res) => {
  const {
    department,
    startDate,
    endDate,
    sortBy = 'effectiveDate',
    sortOrder = 'desc',
    page = 1,
    limit = 50
  } = req.query;

  const user = extractUser(req);

  devLog('[Policy Controller] getAllPolicies - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Build query
  const filter = {
    isDeleted: { $ne: true }
  };

  // Filter by department if specified
  if (department) {
    filter['assignTo.departmentId'] = department;
  }

  // Filter by date range
  if (startDate || endDate) {
    filter.effectiveDate = {};
    if (startDate) {
      filter.effectiveDate.$gte = parseDateField(startDate, 'startDate');
    }
    if (endDate) {
      filter.effectiveDate.$lte = parseDateField(endDate, 'endDate');
    }
  }

  // Get total count
  const total = await collections.policies.countDocuments(filter);

  // Execute query with sorting and pagination
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 50;
  const skip = (pageNum - 1) * limitNum;

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

  const policies = await collections.policies
    .find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum)
    .toArray();

  const pagination = buildPagination(pageNum, limitNum, total);

  const formattedPolicies = policies.map(formatPolicyDates);

  return sendSuccess(res, formattedPolicies, 'Policies retrieved successfully', 200, pagination);
});

/**
 * Get policy stats
 * REST API: GET /api/policies/stats
 */
export const getPolicyStats = asyncHandler(async (req, res) => {
  const user = extractUser(req);

  devLog('[Policy Controller] getPolicyStats - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const allPolicies = await collections.policies.find({
    isDeleted: { $ne: true }
  }).toArray();

  const activePolicies = allPolicies.filter(p => {
    if (!p.effectiveDate) return false;
    const effectiveDate = new Date(p.effectiveDate);
    return effectiveDate <= new Date();
  });

  const stats = {
    totalPolicies: allPolicies.length,
    activePolicies: activePolicies.length,
    pendingPolicies: allPolicies.length - activePolicies.length,
    applyToAllCount: allPolicies.filter(p => p.applyToAll).length,
    departmentSpecificCount: allPolicies.filter(p => !p.applyToAll && p.assignTo?.length > 0).length
  };

  return sendSuccess(res, stats, 'Policy statistics retrieved successfully');
});

/**
 * Get policy by ID
 * REST API: GET /api/policies/:id
 */
export const getPolicyById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[Policy Controller] getPolicyById - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const policy = await collections.policies.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!policy) {
    throw buildNotFoundError('Policy', id);
  }

  const formattedPolicy = formatPolicyDates(policy);
  return sendSuccess(res, formattedPolicy, 'Policy retrieved successfully');
});

/**
 * Create new policy
 * REST API: POST /api/policies
 */
export const createPolicy = asyncHandler(async (req, res) => {
  const user = extractUser(req);
  const { policyName, policyDescription, effectiveDate, applyToAll, assignTo } = req.body;

  devLog('[Policy Controller] createPolicy - companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Validation
  if (!policyName || !policyName.trim()) {
    throw buildValidationError('policyName', 'Policy Name is required');
  }

  if (!policyDescription || !policyDescription.trim()) {
    throw buildValidationError('policyDescription', 'Policy Description is required');
  }

  if (!effectiveDate) {
    throw buildValidationError('effectiveDate', 'Effective Date is required');
  }

  const parsedEffectiveDate = parseDateField(effectiveDate, 'effectiveDate');
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (parsedEffectiveDate < todayStart) {
    throw buildValidationError('effectiveDate', 'Effective Date must be today or later');
  }

  // Validate applyToAll and assignTo combination
  if (!applyToAll && (!assignTo || assignTo.length === 0)) {
    throw buildValidationError('assignTo', 'Either apply to all employees or assign to specific departments/designations');
  }

  // Verify department assignments exist
  if (assignTo && assignTo.length > 0) {
    const departmentIds = assignTo.map(a => new ObjectId(a.departmentId));
    const departments = await collections.departments.find({
      _id: { $in: departmentIds }
    }).toArray();

    if (departments.length !== departmentIds.length) {
      throw buildConflictError('One or more departments not found');
    }
  }

  // Create policy
  const policyToInsert = {
    policyName: policyName.trim(),
    policyDescription: policyDescription.trim(),
    effectiveDate: parsedEffectiveDate,
    applyToAll: applyToAll || false,
    assignTo: assignTo || [],
    createdBy: user.userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false
  };

  const result = await collections.policies.insertOne(policyToInsert);

  if (!result.insertedId) {
    throw new Error('Failed to create policy');
  }

  // Get created policy
  const policy = await collections.policies.findOne({ _id: result.insertedId });
  const formattedPolicy = formatPolicyDates(policy);

  return sendCreated(res, formattedPolicy, 'Policy created successfully');
});

/**
 * Update policy
 * REST API: PUT /api/policies/:id
 */
export const updatePolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);
  const { policyName, policyDescription, effectiveDate, applyToAll, assignTo } = req.body;

  devLog('[Policy Controller] updatePolicy - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  // Find existing policy
  const policy = await collections.policies.findOne({
    _id: new ObjectId(id),
    isDeleted: { $ne: true }
  });

  if (!policy) {
    throw buildNotFoundError('Policy', id);
  }

  // Validation
  if (policyName !== undefined && !policyName.trim()) {
    throw buildValidationError('policyName', 'Policy Name is required');
  }

  if (policyDescription !== undefined && !policyDescription.trim()) {
    throw buildValidationError('policyDescription', 'Policy Description is required');
  }

  // Validate applyToAll and assignTo combination
  const newApplyToAll = applyToAll !== undefined ? applyToAll : policy.applyToAll;
  const newAssignTo = assignTo !== undefined ? assignTo : policy.assignTo;

  if (!newApplyToAll && (!newAssignTo || newAssignTo.length === 0)) {
    throw buildValidationError('assignTo', 'Either apply to all employees or assign to specific departments/designations');
  }

  // Verify department assignments exist if provided
  if (newAssignTo && newAssignTo.length > 0) {
    const departmentIds = newAssignTo.map(a => new ObjectId(a.departmentId));
    const departments = await collections.departments.find({
      _id: { $in: departmentIds }
    }).toArray();

    if (departments.length !== departmentIds.length) {
      throw buildConflictError('One or more departments not found');
    }
  }

  // Build update object
  const updateData = {
    updatedAt: new Date()
  };

  if (policyName !== undefined) updateData.policyName = policyName.trim();
  if (policyDescription !== undefined) updateData.policyDescription = policyDescription.trim();
  if (effectiveDate !== undefined) {
    const parsedEffectiveDate = parseDateField(effectiveDate, 'effectiveDate');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (parsedEffectiveDate < todayStart) {
      throw buildValidationError('effectiveDate', 'Effective Date must be today or later');
    }
    updateData.effectiveDate = parsedEffectiveDate;
  }
  if (applyToAll !== undefined) updateData.applyToAll = applyToAll;
  if (assignTo !== undefined) updateData.assignTo = assignTo;

  // Update policy
  const result = await collections.policies.updateOne(
    { _id: new ObjectId(id) },
    { $set: updateData }
  );

  if (result.matchedCount === 0) {
    throw buildNotFoundError('Policy', id);
  }

  // Get updated policy
  const updatedPolicy = await collections.policies.findOne({ _id: new ObjectId(id) });
  const formattedPolicy = formatPolicyDates(updatedPolicy);

  return sendSuccess(res, formattedPolicy, 'Policy updated successfully');
});

/**
 * Delete policy (hard delete)
 * REST API: DELETE /api/policies/:id
 */
export const deletePolicy = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = extractUser(req);

  devLog('[Policy Controller] deletePolicy - id:', id, 'companyId:', user.companyId);

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const policy = await collections.policies.findOne({
    _id: new ObjectId(id)
  });

  if (!policy) {
    throw buildNotFoundError('Policy', id);
  }

  const result = await collections.policies.deleteOne({ _id: new ObjectId(id) });

  if (result.deletedCount === 0) {
    throw buildNotFoundError('Policy', id);
  }

  return sendSuccess(res, { _id: id }, 'Policy deleted successfully');
});

/**
 * Search policies
 * REST API: GET /api/policies/search
 */
export const searchPolicies = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const user = extractUser(req);

  devLog('[Policy Controller] searchPolicies - query:', q, 'companyId:', user.companyId);

  if (!q || !q.trim()) {
    throw buildValidationError('q', 'Search query is required');
  }

  // Get tenant collections
  const collections = getTenantCollections(user.companyId);

  const policies = await collections.policies.find({
    isDeleted: { $ne: true },
    $or: [
      { policyName: { $regex: q, $options: 'i' } },
      { policyDescription: { $regex: q, $options: 'i' } }
    ]
  })
    .sort({ effectiveDate: -1 })
    .limit(20)
    .toArray();

  const formattedPolicies = policies.map(formatPolicyDates);

  return sendSuccess(res, formattedPolicies, 'Search results retrieved successfully');
});

export default {
  getAllPolicies,
  getPolicyStats,
  getPolicyById,
  createPolicy,
  updatePolicy,
  deletePolicy,
  searchPolicies
};
