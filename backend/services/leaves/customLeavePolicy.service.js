/**
 * Custom Leave Policy Service
 *
 * Business logic for custom leave policy operations
 * Uses native MongoDB driver for multi-tenant support
 *
 * SCHEMA:
 * - name: String (policy name)
 * - leaveTypeId: ObjectId reference to leaveTypes collection
 * - annualQuota: Number (custom annual leave days for employees - OVERWRITES leaveType.annualQuota)
 * - employeeIds: Array of employee ObjectIds
 * - settings: Object (carryForward, maxCarryForwardDays, isEarnedLeave)
 * - createdBy: ObjectId reference to employees collection
 * - updatedBy: ObjectId reference to employees collection
 * - isActive: Boolean
 * - isDeleted: Boolean
 * - createdAt: Date
 * - updatedAt: Date
 */

import { getTenantCollections } from '../../config/db.js';
import { ObjectId } from 'mongodb';
import leaveLedgerService from './leaveLedger.service.js';

/**
 * Helper: Safely convert value to ObjectId if valid, otherwise return null
 */
function toObjectId(value) {
  if (!value) return null;
  if (ObjectId.isValid(value)) {
    return new ObjectId(value);
  }
  return null;
}

/**
 * Create a new custom leave policy
 */
export const createCustomPolicy = async (companyId, policyData, userId) => {
  const { name, leaveTypeId, annualQuota, employeeIds, settings } = policyData;

  // Validate: at least one employee must be assigned
  if (!employeeIds || employeeIds.length === 0) {
    throw new Error('At least one employee must be assigned to the policy');
  }

  // Validate: annualQuota must be positive
  if (!annualQuota || annualQuota <= 0) {
    throw new Error('Annual quota must be greater than 0');
  }

  // Validate: leaveTypeId must be valid ObjectId
  if (!leaveTypeId || !ObjectId.isValid(leaveTypeId)) {
    throw new Error('Invalid leave type ID');
  }

  const { customLeavePolicies, leaveTypes } = getTenantCollections(companyId);

  // Verify that the leaveType exists
  const leaveType = await leaveTypes.findOne({
    _id: new ObjectId(leaveTypeId),
    isDeleted: { $ne: true }
  });

  if (!leaveType) {
    throw new Error('Leave type not found');
  }

  const now = new Date();
  const userObjectId = toObjectId(userId);

  const policy = {
    name,
    leaveTypeId: new ObjectId(leaveTypeId), // ObjectId reference to leaveTypes
    annualQuota, // Custom annual quota (OVERWRITES leaveType.annualQuota)
    employeeIds,
    settings: settings || {},
    createdBy: userObjectId, // ObjectId reference to employees (or null if not a valid ObjectId)
    updatedBy: userObjectId,
    isActive: true,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  };

  const result = await customLeavePolicies.insertOne(policy);

  // Create ledger entries for each employee to track the custom policy adjustment
  const policyId = result.insertedId.toString();
  const leaveTypeCode = leaveType.code.toLowerCase();
  const defaultQuota = leaveType.annualQuota || 0;

  // Create adjustment entries for all employees
  for (const empId of employeeIds) {
    try {
      await leaveLedgerService.recordCustomPolicyAdjustment(
        companyId,
        empId,
        leaveTypeCode,
        annualQuota,
        defaultQuota,
        name,
        policyId
      );
    } catch (ledgerError) {
      console.error(`[Custom Policy] Failed to create ledger entry for employee ${empId}:`, ledgerError);
      // Continue with other employees even if one fails
    }
  }

  // Enrich with leaveType details before returning
  const enrichedPolicy = {
    ...policy,
    _id: result.insertedId.toString(),
    leaveTypeId: policy.leaveTypeId.toString(),
    createdBy: policy.createdBy?.toString(),
    updatedBy: policy.updatedBy?.toString(),
    leaveType: {
      _id: leaveType._id.toString(),
      name: leaveType.name,
      code: leaveType.code,
      color: leaveType.color,
      annualQuota: leaveType.annualQuota // Default annual quota from leave type
    }
  };

  return enrichedPolicy;
};

/**
 * Get all custom policies for a company
 */
export const getCustomPolicies = async (companyId, filters = {}) => {
  const { customLeavePolicies } = getTenantCollections(companyId);

  const query = { isActive: true, isDeleted: { $ne: true } };

  // Only add leaveTypeId filter if it's a valid ObjectId
  if (filters.leaveTypeId && ObjectId.isValid(filters.leaveTypeId)) {
    query.leaveTypeId = new ObjectId(filters.leaveTypeId);
  }

  if (filters.employeeId) {
    query.employeeIds = filters.employeeId;
  }

  const policies = await customLeavePolicies.find(query).sort({ createdAt: -1 }).toArray();

  // Enrich with leaveType details
  const { leaveTypes } = getTenantCollections(companyId);
  const enrichedPolicies = await Promise.all(policies.map(async (policy) => {
    let leaveType = null;

    // Only fetch leaveType if leaveTypeId exists
    if (policy.leaveTypeId) {
      leaveType = await leaveTypes.findOne({
        _id: policy.leaveTypeId,
        isDeleted: { $ne: true }
      });
    }

    return {
      _id: policy._id?.toString() || policy._id,
      name: policy.name || '',
      leaveTypeId: policy.leaveTypeId?.toString() || policy.leaveTypeId,
      leaveType: leaveType ? {
        _id: leaveType._id?.toString() || leaveType._id,
        name: leaveType.name || '',
        code: leaveType.code || '',
        color: leaveType.color
      } : null,
      annualQuota: policy.annualQuota || 0,
      employeeIds: policy.employeeIds || [],
      settings: policy.settings || {},
      isActive: policy.isActive ?? true,
      createdAt: policy.createdAt || new Date(),
      updatedAt: policy.updatedAt || new Date(),
      createdBy: policy.createdBy?.toString() || null,
      updatedBy: policy.updatedBy?.toString() || null,
    };
  }));

  return enrichedPolicies;
};

/**
 * Get a single custom policy by ID
 */
export const getCustomPolicyById = async (companyId, policyId) => {
  const { customLeavePolicies, leaveTypes } = getTenantCollections(companyId);

  const policy = await customLeavePolicies.findOne({
    _id: new ObjectId(policyId),
    isActive: true,
    isDeleted: { $ne: true }
  });

  if (!policy) {
    throw new Error('Custom policy not found');
  }

  // Enrich with leaveType details
  let leaveType = null;
  if (policy.leaveTypeId) {
    leaveType = await leaveTypes.findOne({
      _id: policy.leaveTypeId,
      isDeleted: { $ne: true }
    });
  }

  return {
    _id: policy._id?.toString() || policy._id,
    name: policy.name || '',
    leaveTypeId: policy.leaveTypeId?.toString() || policy.leaveTypeId,
    leaveType: leaveType ? {
      _id: leaveType._id?.toString() || leaveType._id,
      name: leaveType.name || '',
      code: leaveType.code || '',
      color: leaveType.color
    } : null,
    annualQuota: policy.annualQuota || policy.days || 0,
    days: policy.annualQuota || policy.days || 0, // backward-compat alias
    employeeIds: policy.employeeIds || [],
    settings: policy.settings || {},
    isActive: policy.isActive ?? true,
    createdAt: policy.createdAt || new Date(),
    updatedAt: policy.updatedAt || new Date(),
    createdBy: policy.createdBy?.toString() || null,
    updatedBy: policy.updatedBy?.toString() || null,
  };
};

/**
 * Update a custom policy
 */
export const updateCustomPolicy = async (companyId, policyId, updateData, userId) => {
  const { customLeavePolicies, leaveTypes } = getTenantCollections(companyId);

  const existing = await customLeavePolicies.findOne({
    _id: new ObjectId(policyId)
  });

  if (!existing) {
    throw new Error('Custom policy not found');
  }

  // Update allowed fields
  const allowedUpdates = ['name', 'leaveTypeId', 'annualQuota', 'employeeIds', 'settings', 'isActive'];
  const userObjectId = toObjectId(userId);
  const updates = {
    updatedAt: new Date(),
    ...(userObjectId && { updatedBy: userObjectId })
  };

  // Verify leaveTypeId if provided
  if (updateData.leaveTypeId) {
    if (!ObjectId.isValid(updateData.leaveTypeId)) {
      throw new Error('Invalid leave type ID');
    }

    const leaveType = await leaveTypes.findOne({
      _id: new ObjectId(updateData.leaveTypeId),
      isDeleted: { $ne: true }
    });

    if (!leaveType) {
      throw new Error('Leave type not found');
    }

    updates.leaveTypeId = new ObjectId(updateData.leaveTypeId);
  }

  allowedUpdates.forEach(field => {
    if (updateData[field] !== undefined) {
      updates[field] = updateData[field];
    }
  });

  // Validate employeeIds if provided
  if (updates.employeeIds && updates.employeeIds.length === 0) {
    throw new Error('At least one employee must be assigned to the policy');
  }

  // Validate annualQuota if provided
  if (updates.annualQuota !== undefined && updates.annualQuota <= 0) {
    throw new Error('Annual quota must be greater than 0');
  }

  // Store old values for comparison
  const oldQuota = existing.annualQuota || 0;
  const oldEmployeeIds = existing.employeeIds || [];
  const quotaChanged = updates.annualQuota !== undefined && updates.annualQuota !== oldQuota;

  await customLeavePolicies.updateOne(
    { _id: new ObjectId(policyId) },
    { $set: updates }
  );

  // Return updated policy enriched with leaveType details
  const updated = await customLeavePolicies.findOne({ _id: new ObjectId(policyId) });

  // Enrich with leaveType details
  let enrichedLeaveType = null;
  if (updated.leaveTypeId) {
    enrichedLeaveType = await leaveTypes.findOne({
      _id: updated.leaveTypeId,
      isDeleted: { $ne: true }
    });
  }

  // Handle ledger entries for quota changes or new employees
  if (quotaChanged || (updates.employeeIds && updates.employeeIds.length > 0)) {
    const leaveTypeCode = enrichedLeaveType?.code.toLowerCase() || 'earned';
    const defaultQuota = enrichedLeaveType?.annualQuota || 0;
    const newQuota = updated.annualQuota || 0;
    const policyName = updated.name || 'Custom Policy';
    const newEmployeeIds = updates.employeeIds || updated.employeeIds || [];

    // Find employees who need new adjustment entries:
    // 1. All employees if quota changed
    // 2. New employees added to the policy
    const employeesToProcess = quotaChanged
      ? newEmployeeIds  // All employees when quota changes
      : newEmployeeIds.filter(id => !oldEmployeeIds.includes(id));  // Only new employees

    for (const empId of employeesToProcess) {
      try {
        await leaveLedgerService.recordCustomPolicyAdjustment(
          companyId,
          empId,
          leaveTypeCode,
          newQuota,
          defaultQuota,
          policyName,
          policyId
        );
      } catch (ledgerError) {
        console.error(`[Custom Policy] Failed to create ledger entry for employee ${empId}:`, ledgerError);
      }
    }
  }

  return {
    _id: updated._id?.toString() || updated._id,
    name: updated.name || '',
    leaveTypeId: updated.leaveTypeId?.toString() || updated.leaveTypeId,
    leaveType: enrichedLeaveType ? {
      _id: enrichedLeaveType._id?.toString() || enrichedLeaveType._id,
      name: enrichedLeaveType.name || '',
      code: enrichedLeaveType.code || '',
      color: enrichedLeaveType.color
    } : null,
    annualQuota: updated.annualQuota || 0,
    employeeIds: updated.employeeIds || [],
    settings: updated.settings || {},
    isActive: updated.isActive ?? true,
    createdAt: updated.createdAt || new Date(),
    updatedAt: updated.updatedAt || new Date(),
    createdBy: updated.createdBy?.toString() || null,
    updatedBy: updated.updatedBy?.toString() || null,
  };
};

/**
 * Delete (soft delete) a custom policy
 * Creates reversal ledger entries for all affected employees
 */
export const deleteCustomPolicy = async (companyId, policyId, userId) => {
  const { customLeavePolicies, leaveTypes } = getTenantCollections(companyId);

  const existing = await customLeavePolicies.findOne({
    _id: new ObjectId(policyId)
  });

  if (!existing) {
    throw new Error('Custom policy not found');
  }

  // Store details for ledger entries before deleting
  const employeeIds = existing.employeeIds || [];
  const annualQuota = existing.annualQuota || 0;
  const policyName = existing.name || 'Custom Policy';

  // Get leave type details
  let leaveType = null;
  if (existing.leaveTypeId) {
    leaveType = await leaveTypes.findOne({
      _id: existing.leaveTypeId,
      isDeleted: { $ne: true }
    });
  }

  const leaveTypeCode = leaveType?.code.toLowerCase() || 'earned';
  const defaultQuota = leaveType?.annualQuota || 0;

  // Soft delete - set isActive to false and isDeleted to true
  const userObjectId = toObjectId(userId);
  await customLeavePolicies.updateOne(
    { _id: new ObjectId(policyId) },
    {
      $set: {
        isActive: false,
        isDeleted: true,
        ...(userObjectId && { updatedBy: userObjectId }),
        updatedAt: new Date()
      }
    }
  );

  // Create reversal ledger entries for all affected employees
  for (const empId of employeeIds) {
    try {
      await leaveLedgerService.recordCustomPolicyReversal(
        companyId,
        empId,
        leaveTypeCode,
        annualQuota,
        defaultQuota,
        policyName
      );
    } catch (ledgerError) {
      console.error(`[Custom Policy] Failed to create reversal entry for employee ${empId}:`, ledgerError);
    }
  }

  return { message: 'Policy deleted successfully', policyId };
};

/**
 * Get custom policy for a specific employee and leave type
 * Used when calculating leave balance
 *
 * @param {string} leaveType - Leave type code (e.g., 'earned', 'sick') to match against leaveType.code
 */
export const getEmployeePolicy = async (companyId, employeeId, leaveType) => {
  const { customLeavePolicies, leaveTypes } = getTenantCollections(companyId);

  // First, find all active leaveTypes that match the code
  const matchingLeaveTypes = await leaveTypes.find({
    code: leaveType.toUpperCase(), // Match code field (e.g., 'EARNED', 'SICK')
    isActive: true,
    isDeleted: { $ne: true }
  }).toArray();

  if (matchingLeaveTypes.length === 0) {
    return null; // No matching leave type found
  }

  // Use the first matching leave type's ID
  const leaveTypeId = matchingLeaveTypes[0]._id;

  // Find policy that references this leave type
  const policy = await customLeavePolicies.findOne({
    leaveTypeId,
    employeeIds: employeeId,
    isActive: true,
    isDeleted: { $ne: true }
  });

  return policy;
};

/**
 * Get all policies for a specific employee
 */
export const getEmployeePolicies = async (companyId, employeeId) => {
  const { customLeavePolicies } = getTenantCollections(companyId);

  const policies = await customLeavePolicies.find({
    employeeIds: employeeId,
    isActive: true,
    isDeleted: { $ne: true }
  }).sort({ createdAt: 1 }).toArray();

  return policies;
};

/**
 * Get employees with custom policies for a specific leave type
 */
export const getEmployeesWithCustomPolicies = async (companyId, leaveTypeCode) => {
  const { customLeavePolicies, leaveTypes } = getTenantCollections(companyId);

  // Find leaveType by code
  const leaveType = await leaveTypes.findOne({
    code: leaveTypeCode.toUpperCase(),
    isActive: true,
    isDeleted: { $ne: true }
  });

  if (!leaveType) {
    return [];
  }

  const policies = await customLeavePolicies.find({
    leaveTypeId: leaveType._id,
    isActive: true,
    isDeleted: { $ne: true }
  }).toArray();

  // Collect all unique employee IDs
  const employeeIds = new Set();
  policies.forEach(policy => {
    policy.employeeIds.forEach(empId => employeeIds.add(empId));
  });

  return Array.from(employeeIds);
};

export default {
  createCustomPolicy,
  getCustomPolicies,
  getCustomPolicyById,
  updateCustomPolicy,
  deleteCustomPolicy,
  getEmployeePolicy,
  getEmployeePolicies,
  getEmployeesWithCustomPolicies
};
